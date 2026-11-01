// Invitations Outlook des chefs de projet (docs/specs/calendrier-comites.md §11, étape 2).
// L'application n'envoie rien elle-même : pour chaque passage elle décrit, dans une ligne de
// CN_CommitteeInvitations, l'invitation telle qu'elle doit être (destinataires, créneau, texte,
// active ou annulée). Un flux Power Automate réconcilie Outlook avec cette ligne. Décrire un état
// plutôt qu'une suite d'ordres rend le flux rejouable sans dégât : rejouer « créer » sur une
// invitation déjà créée la met simplement à jour.
//
// L'invitation couvre toute la séance (le chef de projet bloque toute la séance, l'ordre de
// passage est indicatif) : ni l'ordre ni la durée d'un passage n'y figurent, si bien que
// réordonner l'ordre du jour ne renvoie aucune mise à jour Outlook.
import {
  PASSAGE_KIND_TOPIC,
  SESSION_STATUS_PUBLISHED,
  getCommitteeMemberEmails,
  getSessionEndAt,
  isSessionPast,
  normalizeSession
} from './committeeSessions.js';

export const INVITATION_STATUS_ACTIVE = 'active';
export const INVITATION_STATUS_CANCELLED = 'cancelled';

export const INVITATION_SYNC_PENDING = 'pending';
export const INVITATION_SYNC_DONE = 'done';
export const INVITATION_SYNC_ERROR = 'error';

export const buildInvitationId = (sessionId, passageId) => `${sessionId}::${passageId}`;

// Deux sortes d'invitations dans la même liste : celle d'un passage (chef de projet ou
// intervenants d'un sujet, étape 2) et celle des membres du comité pour la séance (étape 3), qui
// remplace la série récurrente corrigée à la main. Le flux ne crée une réunion Teams que pour
// l'invitation des membres, et seulement quand la séance n'a pas de lieu.
export const INVITATION_KIND_PRESENTATION = 'presentation';
export const INVITATION_KIND_MEMBERS = 'members';
export const MEMBERS_INVITATION_SUFFIX = 'members';

export const buildMembersInvitationId = (sessionId) => buildInvitationId(sessionId, MEMBERS_INVITATION_SUFFIX);

// Lieu réel d'une séance : celui saisi par le président, sinon le lien de la réunion Teams que
// le flux a créée avec l'invitation des membres (colonne OnlineMeetingUrl).
export const getEffectiveSessionLocation = (session, recordsById = {}) => {
  const location = typeof session?.location === 'string' ? session.location.trim() : '';
  if (location) {
    return location;
  }
  const record = recordsById?.[buildMembersInvitationId(session?.id)];
  return typeof record?.onlineMeetingUrl === 'string' ? record.onlineMeetingUrl : '';
};

const normalizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const isHttpUrl = (value) => /^https?:\/\//i.test(String(value || '').trim());

export const getInvitationAttendees = (project, passage) => {
  const seen = new Set();
  return [
    project?.ownerEmail,
    ...(Array.isArray(project?.sharedWith) ? project.sharedWith : []),
    ...(Array.isArray(passage?.guests) ? passage.guests : [])
  ]
    .map(normalizeEmail)
    .filter((email) => email.length > 0 && !seen.has(email) && seen.add(email));
};

// Une séance invite tant qu'elle est publiée et pas encore passée. Une séance repassée en
// brouillon ou annulée retire ses invitations ; une séance passée ne touche plus à rien.
export const isSessionInvitable = (session, now = new Date()) => {
  const normalized = normalizeSession(session);
  return normalized.status === SESSION_STATUS_PUBLISHED && !isSessionPast(normalized, now);
};

const formatEnglishWindow = (session) => {
  const start = new Date(session.startAt);
  const end = new Date(getSessionEndAt(session));
  if (Number.isNaN(start.getTime())) {
    return '';
  }
  const day = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(start);
  const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
  return Number.isNaN(end.getTime()) ? `${day}, ${time.format(start)}` : `${day}, ${time.format(start)}–${time.format(end)}`;
};

// Texte en anglais, comme les e-mails de notification (contrainte du flux Power Automate).
export const buildPassageInvitation = ({ session, passage, committee, project, projectUrl = '', location: effectiveLocation }) => {
  const normalizedSession = normalizeSession(session);
  const committeeName = committee?.name || normalizedSession.committeeId;
  const projectName = project?.projectName || passage.projectId;
  const location = effectiveLocation ?? normalizedSession.location;
  const lines = [
    `<p>Your project <strong>${escapeHtml(projectName)}</strong> is registered for a session of <strong>${escapeHtml(committeeName)}</strong>.</p>`,
    `<p>Session: ${escapeHtml(formatEnglishWindow(normalizedSession))}.</p>`,
    '<p>Please keep the whole session free: the running order may change until the last moment, and the chair will call you in.</p>',
    '<p>Your project showcase is the presentation support. Make sure it is up to date, and answer the questions still open in the questionnaire.</p>'
  ];
  if (isHttpUrl(location)) {
    lines.push(`<p><a href="${escapeHtml(location)}">Join the meeting</a></p>`);
  }
  if (projectUrl) {
    lines.push(`<p><a href="${escapeHtml(projectUrl)}">Open the project in Project Navigator</a></p>`);
  }

  return {
    id: buildInvitationId(normalizedSession.id, passage.id),
    sessionId: normalizedSession.id,
    passageId: passage.id,
    projectId: passage.projectId,
    committeeId: normalizedSession.committeeId,
    kind: INVITATION_KIND_PRESENTATION,
    status: INVITATION_STATUS_ACTIVE,
    subject: `[${committeeName}] Presentation of ${projectName}`,
    bodyHtml: lines.join(''),
    startAt: normalizedSession.startAt,
    endAt: getSessionEndAt(normalizedSession),
    location,
    attendees: getInvitationAttendees(project, passage)
  };
};

// Un sujet hors projet invite ses intervenants (pas de porteur, pas de lien vers un projet).
export const buildTopicInvitation = ({ session, passage, committee, location: effectiveLocation }) => {
  const normalizedSession = normalizeSession(session);
  const committeeName = committee?.name || normalizedSession.committeeId;
  const location = effectiveLocation ?? normalizedSession.location;
  const lines = [
    `<p>You are presenting the agenda item <strong>${escapeHtml(passage.title)}</strong> at a session of <strong>${escapeHtml(committeeName)}</strong>.</p>`,
    `<p>Session: ${escapeHtml(formatEnglishWindow(normalizedSession))}.</p>`,
    '<p>Please keep the whole session free: the running order may change until the last moment, and the chair will call you in.</p>'
  ];
  if (passage.note) {
    lines.push(`<p>${escapeHtml(passage.note)}</p>`);
  }
  if (isHttpUrl(location)) {
    lines.push(`<p><a href="${escapeHtml(location)}">Join the meeting</a></p>`);
  }
  return {
    id: buildInvitationId(normalizedSession.id, passage.id),
    sessionId: normalizedSession.id,
    passageId: passage.id,
    projectId: '',
    committeeId: normalizedSession.committeeId,
    kind: INVITATION_KIND_PRESENTATION,
    status: INVITATION_STATUS_ACTIVE,
    subject: `[${committeeName}] Agenda item: ${passage.title}`,
    bodyHtml: lines.join(''),
    startAt: normalizedSession.startAt,
    endAt: getSessionEndAt(normalizedSession),
    location,
    attendees: getInvitationAttendees(null, { guests: passage.presenterEmails })
  };
};

// Invitation des membres : toute la séance, tous les membres du comité, et le lien vers l'ordre
// du jour — jamais l'ordre du jour lui-même, pour qu'inscrire ou retirer un projet ne renvoie
// aucune mise à jour aux membres (spec §11, option A).
export const buildMembersInvitation = ({ session, committee, agendaUrl = '' }) => {
  const normalizedSession = normalizeSession(session);
  const committeeName = committee?.name || normalizedSession.committeeId;
  const location = normalizedSession.location;
  const lines = [
    `<p>Session of <strong>${escapeHtml(committeeName)}</strong>: ${escapeHtml(formatEnglishWindow(normalizedSession))}.</p>`,
    '<p>The agenda — projects, running order, project stakes and showcases — is kept up to date in Project Navigator. This invitation is not updated when a project is added or removed.</p>'
  ];
  if (agendaUrl) {
    lines.push(`<p><a href="${escapeHtml(agendaUrl)}">Open the agenda in Project Navigator</a></p>`);
  }
  if (isHttpUrl(location)) {
    lines.push(`<p><a href="${escapeHtml(location)}">Join the meeting</a></p>`);
  }
  return {
    id: buildMembersInvitationId(normalizedSession.id),
    sessionId: normalizedSession.id,
    passageId: '',
    projectId: '',
    committeeId: normalizedSession.committeeId,
    kind: INVITATION_KIND_MEMBERS,
    status: INVITATION_STATUS_ACTIVE,
    subject: `[${committeeName}] Committee session`,
    bodyHtml: lines.join(''),
    startAt: normalizedSession.startAt,
    endAt: getSessionEndAt(normalizedSession),
    location,
    attendees: getInvitationAttendees(null, { guests: getCommitteeMemberEmails(committee) })
  };
};

const isTopic = (passage) => passage.kind === PASSAGE_KIND_TOPIC;
const hasPresenters = (passage) => Array.isArray(passage.presenterEmails) && passage.presenterEmails.length > 0;

const cancelledFrom = (invitation) => ({ ...invitation, status: INVITATION_STATUS_CANCELLED });

// Ce qui change dans Outlook quand une séance passe de `before` à `after` : une invitation active
// par passage d'une séance invitable, une invitation annulée pour chaque passage qui a quitté la
// séance (désinscription, déplacement) ou pour toute la séance si elle n'invite plus (annulée,
// repassée en brouillon). Les passages d'une séance passée ne sont jamais touchés.
export const computeSessionInvitations = ({
  before = null,
  after = null,
  committee = null,
  projectsById = new Map(),
  buildProjectUrl = () => '',
  buildAgendaUrl = () => '',
  recordsById = {},
  now = new Date()
} = {}) => {
  const previous = before ? normalizeSession(before) : null;
  const next = after ? normalizeSession(after) : null;
  const reference = next || previous;
  if (!reference || isSessionPast(reference, now)) {
    return [];
  }

  const build = (session, passage) => {
    const location = getEffectiveSessionLocation(session, recordsById);
    return isTopic(passage)
      ? buildTopicInvitation({ session, passage, committee, location })
      : buildPassageInvitation({
        session,
        passage,
        committee,
        location,
        project: projectsById.get(passage.projectId) || null,
        projectUrl: buildProjectUrl(passage.projectId)
      });
  };

  const nextInvitable = next ? isSessionInvitable(next, now) : false;
  const activeIds = new Set();
  const invitations = [];

  const membersInvitation = committee && getCommitteeMemberEmails(committee).length > 0
    ? buildMembersInvitation({ session: reference, committee, agendaUrl: buildAgendaUrl(reference.id) })
    : null;
  if (membersInvitation) {
    invitations.push(nextInvitable ? membersInvitation : cancelledFrom(membersInvitation));
  }

  if (next && nextInvitable) {
    next.agenda.forEach((passage) => {
      if (isTopic(passage)) {
        // Un sujet n'invite que s'il a des intervenants ; sans eux, une invitation déjà envoyée
        // est annulée plus bas.
        if (hasPresenters(passage)) {
          const invitation = build(next, passage);
          activeIds.add(invitation.id);
          invitations.push(invitation);
        }
        return;
      }
      const invitation = build(next, passage);
      // Projet introuvable (pas encore chargé, supprimé) : on ne décide rien pour lui, ni
      // invitation ni annulation.
      activeIds.add(invitation.id);
      if (!projectsById.get(passage.projectId)) {
        return;
      }
      invitations.push(invitation);
    });
  }

  const formerPassages = [
    ...(previous ? previous.agenda.map((passage) => ({ session: previous, passage })) : []),
    ...(next && !nextInvitable ? next.agenda.map((passage) => ({ session: next, passage })) : [])
  ].filter(({ passage }) => !isTopic(passage) || hasPresenters(passage));
  const cancelled = new Set();
  formerPassages.forEach(({ session, passage }) => {
    const id = buildInvitationId(session.id, passage.id);
    if (activeIds.has(id) || cancelled.has(id)) {
      return;
    }
    cancelled.add(id);
    invitations.push(cancelledFrom(build(session, passage)));
  });

  return invitations;
};

// Seuls ces champs comptent : une invitation dont ils n'ont pas bougé n'est pas réécrite, donc
// le flux ne renvoie aucune mise à jour Outlook.
export const getInvitationFingerprint = (invitation) => JSON.stringify({
  kind: invitation?.kind || INVITATION_KIND_PRESENTATION,
  status: invitation?.status || '',
  subject: invitation?.subject || '',
  bodyHtml: invitation?.bodyHtml || '',
  startAt: invitation?.startAt || '',
  endAt: invitation?.endAt || '',
  location: invitation?.location || '',
  attendees: Array.isArray(invitation?.attendees) ? invitation.attendees.slice().sort() : []
});

// État vu par l'application : le flux a-t-il traité la dernière version demandée ?
export const getInvitationSyncState = (record) => {
  if (!record) {
    return '';
  }
  if (record.syncState === INVITATION_SYNC_ERROR) {
    return INVITATION_SYNC_ERROR;
  }
  return Number(record.processedRevision) >= Number(record.revision) && Number(record.revision) > 0
    ? INVITATION_SYNC_DONE
    : INVITATION_SYNC_PENDING;
};

// Ce qu'il reste à écrire pour qu'Outlook reflète les séances : on écarte ce qui est déjà à jour
// et les annulations d'invitations jamais créées (ou déjà annulées). C'est ce qui rend bon marché
// la passe de réconciliation lancée après le chargement : elle ne compare qu'à ce qui est en
// mémoire, sans relire la liste invitation par invitation.
export const selectInvitationsToSync = (invitations, recordsById = {}) =>
  (Array.isArray(invitations) ? invitations : []).filter((invitation) => {
    const record = recordsById[invitation.id];
    if (invitation.status !== INVITATION_STATUS_ACTIVE) {
      return Boolean(record) && record.status === INVITATION_STATUS_ACTIVE;
    }
    return !record || getInvitationFingerprint(record) !== getInvitationFingerprint(invitation);
  });
