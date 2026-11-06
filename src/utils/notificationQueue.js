import { isSharePointMode } from '../config/sharepointConfig.js';
import { getRepository } from './listRepository.js';

const MAX_BODY_LENGTH = 30000;
const MAX_MOCK_LOG_ENTRIES = 50;

const toRecipientString = (emails) =>
  (Array.isArray(emails) ? emails : []).filter(Boolean).join(';');

// L’application n’envoie jamais d’e-mail elle-même : elle dépose une demande dans
// CN_NotificationsQueue, qu’un flux Power Automate consomme (Status Pending -> Sent).
// Voir docs/migration-v2/MODE-OPERATOIRE-POWER-AUTOMATE.md.
export const queueNotification = async ({
  subject,
  body,
  to = [],
  cc = [],
  projectId = '',
  actionType = ''
} = {}) => {
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [];
  const copies = Array.isArray(cc) ? cc.filter(Boolean) : [];

  if (recipients.length === 0 && copies.length === 0) {
    return { queued: false, reason: 'no-recipient' };
  }

  if (!isSharePointMode()) {
    if (typeof console !== 'undefined' && typeof console.info === 'function') {
      console.info('[Notification][mode simulé]', { subject, to: recipients, cc: copies, actionType });
    }
    // Hors SharePoint, aucun mail ne part : ce journal en mémoire (les derniers seulement) est
    // la seule trace de ce qui serait envoyé, et ce que lisent les tests de bout en bout.
    if (typeof window !== 'undefined') {
      const log = Array.isArray(window.__cnMockNotifications) ? window.__cnMockNotifications : [];
      log.push({ subject, body: String(body || ''), to: recipients, cc: copies, actionType, projectId });
      window.__cnMockNotifications = log.slice(-MAX_MOCK_LOG_ENTRIES);
    }
    return { queued: false, reason: 'mock' };
  }

  await getRepository('notificationsQueue').create({
    Title: subject,
    NotificationType: actionType,
    ToEmails: toRecipientString(recipients),
    CcEmails: toRecipientString(copies),
    Body: String(body || '').slice(0, MAX_BODY_LENGTH),
    ProjectId: projectId,
    Status: 'Pending'
  });

  return { queued: true };
};
