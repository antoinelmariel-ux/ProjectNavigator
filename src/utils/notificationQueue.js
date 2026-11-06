import { isSharePointMode, sharepointConfig } from '../config/sharepointConfig.js';
import { ConflictError, ReadOnlySimulationError, SharePointError } from './errors.js';
import { getRepository } from './listRepository.js';
import {
  appendGroupedMessage,
  canJoinNotificationGroup,
  normalizeGroupedMessages
} from './notificationGrouping.js';
import { buildQuery, odataQuote, spGet, spMerge } from './spRestClient.js';

const MAX_BODY_LENGTH = 30000;
const MAX_MOCK_LOG_ENTRIES = 50;
const MAX_MERGE_ATTEMPTS = 3;

const toRecipientString = (emails) =>
  (Array.isArray(emails) ? emails : []).filter(Boolean).join(';');

const parseMessages = (value) => {
  if (Array.isArray(value)) {
    return normalizeGroupedMessages(value);
  }
  try {
    return normalizeGroupedMessages(JSON.parse(value || '[]'));
  } catch {
    return [];
  }
};

const queueItemsPath = () =>
  `/_api/web/lists/getbytitle('${odataQuote(sharepointConfig.lists.notificationsQueue)}')/items`;

// Dernière ligne encore en attente pour cette clé, avec son etag (écriture verrouillée ensuite) et
// sa date de création côté serveur — l'horloge du poste de l'auteur ne fait pas foi.
const findPendingGroupRow = async (groupKey) => {
  const payload = await spGet(
    `${queueItemsPath()}${buildQuery({
      select: 'Id,Created,MessagesJson',
      filter: `GroupKey eq '${odataQuote(groupKey)}' and Status eq 'Pending'`,
      orderby: 'Id desc',
      top: 1
    })}`,
    { metadata: 'minimal' }
  );
  const row = payload && Array.isArray(payload.value) ? payload.value[0] : null;
  return row ? { row, etag: row['odata.etag'] || '*' } : null;
};

// Ajoute le message à la ligne en attente quand c'est encore possible. Renvoie true si c'est fait,
// false s'il faut créer une ligne. Un conflit d'écriture (un autre message ajouté entre-temps)
// relit la ligne et recommence.
const mergeIntoPendingGroup = async (group) => {
  for (let attempt = 0; attempt < MAX_MERGE_ATTEMPTS; attempt += 1) {
    const found = await findPendingGroupRow(group.key);
    if (!found) {
      return false;
    }
    const existingMessages = parseMessages(found.row.MessagesJson);
    if (!canJoinNotificationGroup({ createdAt: found.row.Created, messages: existingMessages, message: group.message })) {
      return false;
    }
    const messages = appendGroupedMessage(existingMessages, group.message);
    const rendered = group.render(messages);
    try {
      await spMerge(
        `${queueItemsPath()}(${Number(found.row.Id)})`,
        {
          Title: rendered.subject,
          Body: String(rendered.body || '').slice(0, MAX_BODY_LENGTH),
          MessagesJson: JSON.stringify(messages)
        },
        { etag: found.etag }
      );
      return true;
    } catch (error) {
      if (!(error instanceof ConflictError)) {
        throw error;
      }
    }
  }
  return false;
};

const isMissingColumnError = (error) => error instanceof SharePointError && error.status === 400;

// L’application n’envoie jamais d’e-mail elle-même : elle dépose une demande dans
// CN_NotificationsQueue, qu’un flux Power Automate consomme (Status Pending -> Sent).
// Voir docs/migration-v2/MODE-OPERATOIRE-POWER-AUTOMATE.md.
// `group` ({ key, message, render(messages) => { subject, body } }) regroupe les mails de message
// écrits coup sur coup (notificationGrouping.js) ; sans lui, une ligne par appel, comme toujours.
export const queueNotification = async ({
  subject,
  body,
  to = [],
  cc = [],
  projectId = '',
  actionType = '',
  group = null
} = {}) => {
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [];
  const copies = Array.isArray(cc) ? cc.filter(Boolean) : [];

  if (recipients.length === 0 && copies.length === 0) {
    return { queued: false, reason: 'no-recipient' };
  }

  const isGroupable = Boolean(group && group.key && group.message && typeof group.render === 'function');

  if (!isSharePointMode()) {
    if (typeof console !== 'undefined' && typeof console.info === 'function') {
      console.info('[Notification][mode simulé]', { subject, to: recipients, cc: copies, actionType });
    }
    // Hors SharePoint, aucun mail ne part : ce journal en mémoire (les derniers seulement) est
    // la seule trace de ce qui serait envoyé, et ce que lisent les tests de bout en bout. Il
    // regroupe comme la file SharePoint, une entrée « en attente » tant qu'elle est assez récente.
    if (typeof window !== 'undefined') {
      const log = Array.isArray(window.__cnMockNotifications) ? window.__cnMockNotifications : [];
      const pending = isGroupable
        ? [...log].reverse().find((entry) => entry.groupKey === group.key)
        : null;
      if (pending && canJoinNotificationGroup({
        createdAt: pending.createdAt,
        messages: pending.messages,
        message: group.message
      })) {
        pending.messages = appendGroupedMessage(pending.messages, group.message);
        const rendered = group.render(pending.messages);
        pending.subject = rendered.subject;
        pending.body = String(rendered.body || '');
        return { queued: false, reason: 'mock', merged: true };
      }
      log.push({
        subject,
        body: String(body || ''),
        to: recipients,
        cc: copies,
        actionType,
        projectId,
        ...(isGroupable
          ? { groupKey: group.key, messages: [group.message], createdAt: new Date().toISOString() }
          : {})
      });
      window.__cnMockNotifications = log.slice(-MAX_MOCK_LOG_ENTRIES);
    }
    return { queued: false, reason: 'mock' };
  }

  if (isGroupable) {
    try {
      if (await mergeIntoPendingGroup(group)) {
        return { queued: true, merged: true };
      }
    } catch (error) {
      if (error instanceof ReadOnlySimulationError) {
        throw error;
      }
      // Lecture impossible (colonnes pas encore créées, réseau…) : le message part seul, plutôt
      // que pas du tout.
    }
  }

  const baseRecord = {
    Title: subject,
    NotificationType: actionType,
    ToEmails: toRecipientString(recipients),
    CcEmails: toRecipientString(copies),
    Body: String(body || '').slice(0, MAX_BODY_LENGTH),
    ProjectId: projectId,
    Status: 'Pending'
  };

  if (!isGroupable) {
    await getRepository('notificationsQueue').create(baseRecord);
    return { queued: true };
  }

  try {
    await getRepository('notificationsQueue').create({
      ...baseRecord,
      GroupKey: group.key,
      MessagesJson: [group.message]
    });
  } catch (error) {
    // Colonnes GroupKey/MessagesJson absentes de la liste (application déployée avant leur
    // création) : SharePoint refuse l'écriture entière. Le mail part alors sans regroupement.
    if (!isMissingColumnError(error)) {
      throw error;
    }
    await getRepository('notificationsQueue').create(baseRecord);
  }
  return { queued: true };
};
