import React from '../../react.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import {
  INVITATION_STATUS_CANCELLED,
  INVITATION_SYNC_DONE,
  INVITATION_SYNC_ERROR,
  getInvitationSyncState
} from '../../utils/committeeInvitations.js';

const CLASSES = {
  pending: 'border-gray-200 bg-gray-50 text-gray-700',
  done: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-700'
};

// Ce que le flux Power Automate a fait de l'invitation Outlook d'un passage (étape 2). Rien hors
// mode SharePoint : aucune ligne n'y est écrite.
export const InvitationBadge = ({ record }) => {
  const { t } = useTranslation();
  if (!record || record.status === INVITATION_STATUS_CANCELLED) {
    return null;
  }
  const state = getInvitationSyncState(record);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${CLASSES[state] || CLASSES.pending}`}
      title={state === INVITATION_SYNC_ERROR && record.errorMessage ? record.errorMessage : undefined}
      data-testid="committee-invitation-badge"
    >
      {t(`committeeSessions.invitation.${state === INVITATION_SYNC_DONE || state === INVITATION_SYNC_ERROR ? state : 'pending'}`)}
    </span>
  );
};
