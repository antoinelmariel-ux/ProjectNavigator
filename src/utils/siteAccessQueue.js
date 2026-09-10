import { isSharePointMode } from '../config/sharepointConfig.js';
import { getRepository } from './listRepository.js';
import { normalizeEmail } from './normalizeEmail.js';
import { getCurrentUser } from './spContext.js';

// L'app ne peut pas ajouter quelqu'un comme membre du site depuis le navigateur : ça
// nécessite des droits (Gérer les permissions) que la session de l'utilisateur courant n'a
// presque jamais. Elle dépose donc une demande dans CN_SiteAccessRequests, qu'un flux Power
// Automate consomme (Status Pending -> Done), avec une connexion qui a ces droits — voir
// docs/migration-v2/MODE-OPERATOIRE-POWER-AUTOMATE.md.
export const queueSiteAccessRequest = async ({ email, displayName = '', context = '' } = {}) => {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return { queued: false, reason: 'no-email' };
  }

  if (!isSharePointMode()) {
    return { queued: false, reason: 'mock' };
  }

  await getRepository('siteAccessRequests').create({
    Title: normalized,
    TargetEmail: normalized,
    DisplayName: displayName || normalized,
    RequestedByEmail: getCurrentUser().mail || '',
    Context: context,
    Status: 'Pending'
  });

  return { queued: true };
};
