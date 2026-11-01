import { getSessionEndAt } from './committeeSessions.js';

// Description d'une séance dans les e-mails du calendrier des comités (en anglais, comme tous les
// e-mails de notification). Ni lien Teams ni salle, délibérément : un mail se transfère et son
// texte est conservé dans CN_NotificationsQueue. Le « comment rejoindre » ne vit que dans
// l'invitation Outlook (étapes 2 et 3) et dans l'application.
export const describeCommitteeSessionForEmail = (session, { withJoinHint = true } = {}) => {
  const start = new Date(session?.startAt || '');
  const end = new Date(getSessionEndAt(session) || '');
  if (Number.isNaN(start.getTime())) {
    return '';
  }
  const day = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(start);
  const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
  const slot = Number.isNaN(end.getTime()) ? time.format(start) : `${time.format(start)}–${time.format(end)}`;
  const hint = withJoinHint ? ' How to join is in your Outlook invitation for this session, and in Project Navigator.' : '';
  return `Session: ${day}, ${slot}.${hint}`;
};
