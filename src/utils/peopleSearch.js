import { isSharePointMode } from '../config/sharepointConfig.js';
import { buildQuery, odataQuote, spGet, spPost } from './spRestClient.js';
import { normalizeEmail } from './normalizeEmail.js';
import { mockOrgDirectory } from '../data/mockOrgDirectory.js';

export const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 8;
// PrincipalType 1 = User only: excludes SharePoint groups and security groups from the
// results, since those resolve to a single opaque entry rather than their members (see
// docs/migration-v2/GUIDE-CLAUDE-MIGRATION-SHAREPOINT-REST.md, section "Recherche de
// personnes").
const PRINCIPAL_TYPE_USER = 1;
// PrincipalSource 15 = All: search directory + user info list, matching the native "Partager".
const PRINCIPAL_SOURCE_ALL = 15;

const normalize = (value) => String(value || '').trim().toLowerCase();

const searchMockDirectory = (queryText) => {
  const query = normalize(queryText);
  return mockOrgDirectory
    .filter(
      (person) => normalize(person.displayName).includes(query) || normalize(person.email).includes(query)
    )
    .slice(0, MAX_RESULTS)
    .map((person) => ({ displayName: person.displayName, email: person.email }));
};

// clientPeoplePickerSearchUser returns its matches as a JSON-encoded STRING nested inside the
// OData payload (SharePoint REST quirk, not a Graph-style array) — this needs a second
// JSON.parse on that field, not just the usual response parsing.
export const parsePeoplePickerResponse = (payload) => {
  const record = payload && payload.d ? payload.d : payload;
  const raw = record && record.ClientPeoplePickerSearchUser;
  if (typeof raw !== 'string' || !raw) {
    return [];
  }
  let entities;
  try {
    entities = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(entities)) {
    return [];
  }
  return entities
    .map((entity) => {
      const email = entity?.EntityData?.Email || (String(entity?.Key || '').includes('@') ? entity.Key : '');
      if (!email) {
        return null;
      }
      return { displayName: entity?.DisplayText || email, email };
    })
    .filter(Boolean);
};

const searchSharePointDirectory = async (queryText) => {
  const payload = await spPost(
    '/_api/SP.UI.ApplicationPages.ClientPeoplePickerWebServiceInterface.clientPeoplePickerSearchUser',
    {
      queryParams: {
        __metadata: { type: 'SP.UI.ApplicationPages.ClientPeoplePickerQueryParameters' },
        AllowEmailAddresses: true,
        AllowMultipleEntities: false,
        MaximumEntitySuggestions: MAX_RESULTS,
        PrincipalSource: PRINCIPAL_SOURCE_ALL,
        PrincipalType: PRINCIPAL_TYPE_USER,
        QueryString: queryText,
        Required: false
      }
    },
    { metadata: 'verbose' }
  );
  return parsePeoplePickerResponse(payload);
};

// Searches the organization's directory for a person picker (share dialogs, team/committee/
// admin contacts) instead of accepting a freely typed address. Runs entirely under the current
// user's own SharePoint session (no Graph, no service account) — see "Recherche de personnes"
// in docs/migration-v2/GUIDE-CLAUDE-MIGRATION-SHAREPOINT-REST.md. This lookup alone needs no
// Power Automate flow (read-only, not a privileged write) — unlike isKnownSiteUser below, whose
// negative result triggers one (src/utils/siteAccessQueue.js).
export const searchOrgPeople = async (queryText) => {
  const query = String(queryText || '').trim();
  if (query.length < MIN_QUERY_LENGTH) {
    return [];
  }
  if (!isSharePointMode()) {
    return searchMockDirectory(query);
  }
  return searchSharePointDirectory(query);
};

// Checks the site's User Information List (_api/web/siteusers) for a resolved individual entry.
// Used to decide whether to queue a "add as site member" request (see siteAccessQueue.js).
// Known imprecision, accepted deliberately (see GUIDE §13) : someone whose only access is via an
// Azure AD security group won't have an individual row here, so this can false-negative and
// queue a redundant request — that's the "par précaution" tradeoff the user chose, not a bug to
// fix by adding Graph group-membership resolution (excluded by this project's constraints).
export const isKnownSiteUser = async (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return false;
  }
  if (!isSharePointMode()) {
    return true;
  }
  const query = buildQuery({ filter: `Email eq '${odataQuote(normalized)}'`, select: 'Id,Email' });
  const payload = await spGet(`/_api/web/siteusers${query}`);
  const items = payload && payload.value;
  return Array.isArray(items) && items.length > 0;
};
