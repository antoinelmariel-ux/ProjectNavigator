import { isSharePointMode } from '../config/sharepointConfig.js';
import { spGet } from './spRestClient.js';
import { normalizeEmail } from './normalizeEmail.js';
import { emailFromLoginName } from './spContext.js';
import { mockOrgDirectory, mockOrgReports } from '../data/mockOrgDirectory.js';

// Au-delà, un parcours d'organigramme devient un aspirateur à requêtes pour un usage d'accueil :
// le résultat est alors marqué partiel, et l'interface le dit au lieu de se taire.
export const MAX_REPORTING_PEOPLE = 2000;
const MAX_DEPTH = 15;
const CONCURRENCY = 6;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_PREFIX = 'complianceNavigatorReportingHierarchy:';

const toAccountName = (email) => `i:0#.f|membership|${email}`;

const readArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && Array.isArray(value.results)) {
    return value.results;
  }
  return [];
};

// SP.UserProfiles.PersonProperties : `DirectReports` est un tableau de noms de compte
// (« i:0#.f|membership|prenom.nom@lfb.fr »), nu en nometadata, sous `results` en verbose.
export const parsePersonProperties = (payload) => {
  const record = payload && payload.d ? payload.d : payload;
  if (!record || typeof record !== 'object') {
    return null;
  }
  const email = normalizeEmail(record.Email) || emailFromLoginName(record.AccountName);
  const directReports = readArray(record.DirectReports)
    .map((entry) => emailFromLoginName(String(entry || '')) || normalizeEmail(entry))
    .filter((entry) => entry.includes('@'));
  return {
    email,
    displayName: String(record.DisplayName || '').trim() || email,
    directReports: Array.from(new Set(directReports))
  };
};

// Parcours en largeur, niveau par niveau, de tout ce qui est rattaché à `rootEmail`. Chaque
// personne garde la branche par laquelle elle remonte au manager (`branchEmail`, le rattachement
// direct tout en haut de sa sous-équipe) et son manager immédiat : c'est ce qui permet à l'accueil
// de dire « via Claire Dubreuil » plutôt qu'une liste plate de noms.
export const collectReportingHierarchy = async (rootEmail, fetchPerson, options = {}) => {
  const root = normalizeEmail(rootEmail);
  const maxPeople = options.maxPeople ?? MAX_REPORTING_PEOPLE;
  const maxDepth = options.maxDepth ?? MAX_DEPTH;
  const concurrency = Math.max(1, options.concurrency ?? CONCURRENCY);
  if (!root) {
    return { people: [], isPartial: false };
  }

  const rootProfile = await fetchPerson(root);
  const visited = new Set([root]);
  const people = [];
  let isPartial = false;
  let frontier = (rootProfile?.directReports || [])
    .filter((email) => !visited.has(email))
    .map((email) => ({ email, managerEmail: root, branchEmail: email, depth: 1 }));
  frontier.forEach((entry) => visited.add(entry.email));

  while (frontier.length > 0) {
    if (people.length + frontier.length > maxPeople) {
      frontier = frontier.slice(0, Math.max(0, maxPeople - people.length));
      isPartial = true;
    }

    const profiles = new Array(frontier.length);
    let cursor = 0;
    const worker = async () => {
      while (cursor < frontier.length) {
        const index = cursor;
        cursor += 1;
        try {
          profiles[index] = await fetchPerson(frontier[index].email);
        } catch {
          profiles[index] = null;
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, frontier.length) }, worker));

    const nextFrontier = [];
    frontier.forEach((entry, index) => {
      const profile = profiles[index];
      people.push({
        email: entry.email,
        displayName: profile?.displayName || entry.email,
        managerEmail: entry.managerEmail,
        branchEmail: entry.branchEmail,
        depth: entry.depth
      });
      if (entry.depth >= maxDepth) {
        if ((profile?.directReports || []).some((email) => !visited.has(email))) {
          isPartial = true;
        }
        return;
      }
      (profile?.directReports || []).forEach((email) => {
        if (visited.has(email)) {
          return;
        }
        visited.add(email);
        nextFrontier.push({ email, managerEmail: entry.email, branchEmail: entry.branchEmail, depth: entry.depth + 1 });
      });
    });

    if (isPartial && people.length >= maxPeople) {
      break;
    }
    frontier = nextFrontier;
  }

  return { people, isPartial };
};

const fetchSharePointPerson = async (email) => {
  const accountName = encodeURIComponent(`'${toAccountName(email).replace(/'/g, "''")}'`);
  const payload = await spGet(
    `/_api/SP.UserProfiles.PeopleManager/GetPropertiesFor(accountName=@v)?@v=${accountName}`
  );
  return parsePersonProperties(payload);
};

const fetchMockPerson = async (email) => {
  const person = mockOrgDirectory.find((entry) => normalizeEmail(entry.email) === email);
  return {
    email,
    displayName: person?.displayName || email,
    directReports: (mockOrgReports[email] || []).map(normalizeEmail)
  };
};

const getSessionStore = () => {
  try {
    return typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage : null;
  } catch {
    return null;
  }
};

const readCache = (email) => {
  const store = getSessionStore();
  if (!store) {
    return null;
  }
  try {
    const parsed = JSON.parse(store.getItem(`${CACHE_PREFIX}${email}`) || 'null');
    if (parsed && Array.isArray(parsed.people) && Date.now() - Number(parsed.fetchedAt || 0) < CACHE_TTL_MS) {
      return { people: parsed.people, isPartial: Boolean(parsed.isPartial) };
    }
  } catch {
    return null;
  }
  return null;
};

// sessionStorage et non localStorage : propre à l'onglet, il ne peut rien écraser dans l'onglet
// réel d'un administrateur en simulation « Voir en tant que », et la clé porte l'e-mail visé.
const writeCache = (email, result) => {
  const store = getSessionStore();
  if (!store) {
    return;
  }
  try {
    store.setItem(`${CACHE_PREFIX}${email}`, JSON.stringify({ ...result, fetchedAt: Date.now() }));
  } catch {
    // Quota plein : on recalculera au prochain chargement, rien de plus.
  }
};

// Toujours GetPropertiesFor sur l'identité courante, jamais GetMyProperties : en simulation
// « Voir en tant que », c'est l'organigramme de la personne simulée qu'il faut montrer.
export const loadReportingHierarchy = async (email, { force = false } = {}) => {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return { people: [], isPartial: false };
  }
  if (!force) {
    const cached = readCache(normalized);
    if (cached) {
      return cached;
    }
  }
  const fetchPerson = isSharePointMode() ? fetchSharePointPerson : fetchMockPerson;
  const result = await collectReportingHierarchy(normalized, fetchPerson);
  writeCache(normalized, result);
  return result;
};

// Un projet « de l'équipe » est un projet soumis, porté par une personne de l'organigramme, dont
// le manager n'est ni porteur ni co-porteur : ceux-là sont déjà dans « Mes projets », et un projet
// ne doit jamais apparaître à deux endroits de l'accueil. Les brouillons restent privés : consulter
// tôt n'a de sens que si un brouillon n'est pas lu par la hiérarchie avant d'être envoyé.
export const selectTeamProjects = (projects, people, currentUserEmail) => {
  const me = normalizeEmail(currentUserEmail);
  if (!Array.isArray(projects) || !Array.isArray(people) || people.length === 0) {
    return [];
  }
  const byEmail = new Map(people.map((person) => [normalizeEmail(person.email), person]));
  return projects
    .filter((project) => project?.status === 'submitted')
    .map((project) => {
      const ownerEmail = normalizeEmail(project?.ownerEmail);
      const owner = byEmail.get(ownerEmail);
      if (!owner || ownerEmail === me) {
        return null;
      }
      const sharedWith = Array.isArray(project?.sharedWith) ? project.sharedWith : [];
      if (sharedWith.some((entry) => normalizeEmail(entry) === me)) {
        return null;
      }
      const branch = byEmail.get(normalizeEmail(owner.branchEmail)) || owner;
      const manager = byEmail.get(normalizeEmail(owner.managerEmail)) || null;
      return {
        project,
        owner,
        branch,
        manager,
        isDirect: owner.depth === 1
      };
    })
    .filter(Boolean);
};

export const summarizeTeamBranches = (entries) => {
  const counts = new Map();
  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    const key = normalizeEmail(entry?.branch?.email);
    if (!key) {
      return;
    }
    const current = counts.get(key) || { email: key, displayName: entry.branch.displayName || key, count: 0 };
    current.count += 1;
    counts.set(key, current);
  });
  return Array.from(counts.values()).sort((a, b) => b.count - a.count || a.displayName.localeCompare(b.displayName));
};
