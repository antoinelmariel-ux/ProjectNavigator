import { normalizeEmail } from './normalizeEmail.js';
import { normalizeTeamContacts } from './teamContacts.js';
import { resolveTeamRecipients } from './teamMemberRules.js';
import { countBusinessDaysBetween } from './businessDays.js';
import { applyAbsenceSubstitution, wantsClaimCopyForTeam } from './teamMemberProfile.js';

// Prise en charge d'un projet par un membre d'une équipe experte déclenchée. L'unité n'est pas
// le projet mais le couple (projet × périmètre) : un projet peut déclencher plusieurs équipes,
// et une même personne peut être contact de deux d'entre elles. L'état vit donc à côté du statut
// de conformité, dans answers['__compliance_team_comments__'].teams[teamId].claim.
//
// Invariant reprenant celui de teamMemberRules.js : on restreint les destinataires, jamais les
// accès. Une prise en charge retire le projet de la file « À traiter » et des e-mails des autres
// membres ; elle ne retire à personne le droit d'ouvrir, de commenter ou de reprendre.
export const COMPLIANCE_COMMENTS_ANSWER_KEY = '__compliance_team_comments__';

export const CLAIM_ACTION_CLAIM = 'claim';
export const CLAIM_ACTION_IMPLICIT = 'implicit';
export const CLAIM_ACTION_TAKEOVER = 'takeover';
export const CLAIM_ACTION_RELEASE = 'release';
export const CLAIM_ACTION_REASSIGN = 'reassign';

export const CLAIM_REASON_ABSENCE = 'absence';
export const CLAIM_REASON_WORKLOAD = 'workload';
export const CLAIM_REASON_DEPARTURE = 'departure';
export const CLAIM_REASON_OTHER = 'other';
export const CLAIM_REASONS = [
  CLAIM_REASON_ABSENCE,
  CLAIM_REASON_WORKLOAD,
  CLAIM_REASON_DEPARTURE,
  CLAIM_REASON_OTHER
];

// Décisions produit : on signale un projet pris en charge mais sans action depuis 6 jours
// ouvrés, et on relance son référent par e-mail au bout de 3. 0 (ou vide) désactive.
export const DEFAULT_CLAIM_STALE_DAYS = 6;
export const DEFAULT_CLAIM_REMINDER_DAYS = 3;
export const CLAIM_HISTORY_LIMIT = 20;

const readDayCount = (value, fallback) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

export const resolveTeamClaimSettings = (team) => ({
  staleDays: readDayCount(team?.claimStaleDays, DEFAULT_CLAIM_STALE_DAYS),
  reminderDays: readDayCount(team?.claimReminderDays, DEFAULT_CLAIM_REMINDER_DAYS)
});

const toText = (value) => (typeof value === 'string' ? value.trim() : '');
const toIsoText = (value) => (typeof value === 'string' ? value : '');
const normalizeReason = (value) => (CLAIM_REASONS.includes(value) ? value : '');

export const normalizeClaimHistory = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((raw) => {
      if (!raw || typeof raw !== 'object') {
        return null;
      }
      const action = typeof raw.action === 'string' ? raw.action : '';
      const at = toIsoText(raw.at);
      if (!action || !at) {
        return null;
      }
      return {
        at,
        action,
        actorEmail: normalizeEmail(raw.actorEmail),
        assigneeEmail: normalizeEmail(raw.assigneeEmail),
        previousAssigneeEmail: normalizeEmail(raw.previousAssigneeEmail),
        reason: normalizeReason(raw.reason),
        note: toText(raw.note)
      };
    })
    .filter(Boolean)
    .slice(-CLAIM_HISTORY_LIMIT);
};

export const normalizeClaim = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const assigneeEmail = normalizeEmail(value.assigneeEmail);
  if (!assigneeEmail) {
    return null;
  }

  return {
    assigneeEmail,
    assigneeName: toText(value.assigneeName),
    assignedAt: toIsoText(value.assignedAt),
    assignedByEmail: normalizeEmail(value.assignedByEmail),
    reason: normalizeReason(value.reason),
    reasonNote: toText(value.reasonNote),
    reminderSentAt: toIsoText(value.reminderSentAt)
  };
};

export const getPerimeterClaim = (entry) => normalizeClaim(entry?.claim);

export const getPerimeterClaimHistory = (entry) => normalizeClaimHistory(entry?.claimHistory);

export const normalizeComplianceCommentsValue = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return {
      teams: value.teams && typeof value.teams === 'object' && !Array.isArray(value.teams) ? value.teams : {},
      committees:
        value.committees && typeof value.committees === 'object' && !Array.isArray(value.committees)
          ? value.committees
          : {}
    };
  }
  return { teams: {}, committees: {} };
};

export const getProjectComplianceComments = (project) =>
  normalizeComplianceCommentsValue(project?.answers?.[COMPLIANCE_COMMENTS_ANSWER_KEY]);

export const getTeamPerimeterEntry = (project, teamId) => {
  if (!teamId) {
    return null;
  }
  const entry = getProjectComplianceComments(project).teams[teamId];
  return entry && typeof entry === 'object' && !Array.isArray(entry) ? entry : null;
};

export const getTeamClaim = (project, teamId) => getPerimeterClaim(getTeamPerimeterEntry(project, teamId));

export const isClaimedBy = (claim, email) => {
  const key = normalizeEmail(email);
  return Boolean(key && normalizeClaim(claim)?.assigneeEmail === key);
};

export const isClaimedByOther = (claim, email) => {
  const normalized = normalizeClaim(claim);
  if (!normalized) {
    return false;
  }
  const key = normalizeEmail(email);
  return Boolean(key) && normalized.assigneeEmail !== key;
};

export const isTeamContact = (team, email) => {
  const key = normalizeEmail(email);
  if (!key) {
    return false;
  }
  return normalizeTeamContacts(team).some((contact) => normalizeEmail(contact) === key);
};

// Une prise en charge dont le référent n'est plus contact de l'équipe (départ, retrait) est
// orpheline : contrairement aux critères de routage d'un membre retiré — que
// normalizeTeamMemberRules supprime en silence — elle doit remonter, pas disparaître.
export const isOrphanClaim = (team, claim) => {
  const normalized = normalizeClaim(claim);
  return Boolean(normalized) && !isTeamContact(team, normalized.assigneeEmail);
};

export const applyClaimAction = (entry, {
  action = CLAIM_ACTION_CLAIM,
  assigneeEmail = '',
  assigneeName = '',
  actorEmail = '',
  reason = '',
  reasonNote = '',
  now = new Date().toISOString()
} = {}) => {
  const baseEntry = entry && typeof entry === 'object' && !Array.isArray(entry) ? entry : {};
  const previousClaim = getPerimeterClaim(baseEntry);
  const history = getPerimeterClaimHistory(baseEntry);

  const pushHistory = (nextAssigneeEmail) => normalizeClaimHistory([
    ...history,
    {
      at: now,
      action,
      actorEmail,
      assigneeEmail: nextAssigneeEmail,
      previousAssigneeEmail: previousClaim?.assigneeEmail || '',
      reason,
      note: reasonNote
    }
  ]);

  if (action === CLAIM_ACTION_RELEASE) {
    if (!previousClaim) {
      return baseEntry;
    }
    const { claim: _discardedClaim, ...rest } = baseEntry;
    return { ...rest, claimHistory: pushHistory('') };
  }

  const nextAssignee = normalizeEmail(assigneeEmail);
  if (!nextAssignee) {
    return baseEntry;
  }

  // Re-revendiquer ce qu'on suit déjà ne doit ni réinitialiser la date de prise en charge ni
  // gonfler l'historique : la revendication implicite repasse ici à chaque commentaire.
  if (previousClaim && previousClaim.assigneeEmail === nextAssignee) {
    return baseEntry;
  }

  return {
    ...baseEntry,
    claim: normalizeClaim({
      assigneeEmail: nextAssignee,
      assigneeName,
      assignedAt: now,
      assignedByEmail: actorEmail,
      reason,
      reasonNote,
      reminderSentAt: ''
    }),
    claimHistory: pushHistory(nextAssignee)
  };
};

export const markClaimReminderSent = (entry, now = new Date().toISOString()) => {
  const claim = getPerimeterClaim(entry);
  if (!claim) {
    return entry;
  }
  return { ...entry, claim: { ...claim, reminderSentAt: now } };
};

// Dernier signe de vie sur le périmètre : changement de statut, réponse dans le fil, ou à
// défaut la prise en charge elle-même.
export const getPerimeterLastActivityAt = (entry) => {
  const candidates = [];
  const statusUpdatedAt = toIsoText(entry?.statusUpdatedAt);
  if (statusUpdatedAt) {
    candidates.push(statusUpdatedAt);
  }
  (Array.isArray(entry?.replies) ? entry.replies : []).forEach((reply) => {
    const createdAt = toIsoText(reply?.createdAt);
    if (createdAt) {
      candidates.push(createdAt);
    }
  });
  const assignedAt = getPerimeterClaim(entry)?.assignedAt;
  if (assignedAt) {
    candidates.push(assignedAt);
  }

  return candidates.sort().pop() || '';
};

export const getClaimStaleness = (entry, { team, now = new Date().toISOString() } = {}) => {
  const claim = getPerimeterClaim(entry);
  const { staleDays, reminderDays } = resolveTeamClaimSettings(team);

  if (!claim) {
    return {
      claim: null,
      lastActivityAt: '',
      businessDaysSinceActivity: 0,
      isStale: false,
      isReminderDue: false,
      staleDays,
      reminderDays
    };
  }

  const lastActivityAt = getPerimeterLastActivityAt(entry) || claim.assignedAt;
  const businessDaysSinceActivity = countBusinessDaysBetween(lastActivityAt, now);
  // Une relance déjà envoyée ne se rejoue qu'après un nouveau signe de vie : c'est ce qui rend
  // la passe de relance idempotente alors que n'importe quelle session peut la déclencher.
  const alreadyReminded = Boolean(claim.reminderSentAt) && claim.reminderSentAt >= lastActivityAt;

  return {
    claim,
    lastActivityAt,
    businessDaysSinceActivity,
    isStale: staleDays > 0 && businessDaysSinceActivity >= staleDays,
    isReminderDue: reminderDays > 0 && businessDaysSinceActivity >= reminderDays && !alreadyReminded,
    staleDays,
    reminderDays
  };
};

// Destinataires des échanges postérieurs à la prise en charge : le référent seul. S'il n'est
// plus contact de l'équipe, on retombe sur toute l'équipe plutôt que d'écrire dans le vide.
export const resolveClaimAwareRecipients = (team, answers = {}, claim = null, options = {}) => {
  const routed = resolveTeamRecipients(team, answers);
  const normalized = normalizeClaim(claim);
  const withAbsence = options.profiles
    ? applyAbsenceSubstitution(routed, { team, profiles: options.profiles, now: options.now })
    : routed;

  if (!normalized) {
    return withAbsence;
  }

  const assignee = normalizeTeamContacts(team).find(
    (contact) => normalizeEmail(contact) === normalized.assigneeEmail
  );

  if (!assignee) {
    return withAbsence;
  }

  return options.profiles
    ? applyAbsenceSubstitution([assignee], { team, profiles: options.profiles, now: options.now })
    : [assignee];
};

// Copies volontaires de l'annonce de prise en charge. Deux garde-fous : la copie ne ressuscite
// jamais quelqu'un que le routage par membre a écarté du projet (intersection avec
// resolveTeamRecipients), et elle ne couvre que cet événement — pas les échanges suivants.
export const resolveClaimCopyRecipients = (team, answers = {}, { assigneeEmail = '', profiles = null } = {}) => {
  if (!profiles || !team?.id) {
    return [];
  }

  const assignee = normalizeEmail(assigneeEmail);

  return resolveTeamRecipients(team, answers).filter((contact) => {
    const key = normalizeEmail(contact);
    if (!key || key === assignee) {
      return false;
    }
    return wantsClaimCopyForTeam(profiles, key, team.id);
  });
};

// Toutes les prises en charge d'une équipe, pour la vue charge et l'alerte « référent qui n'est
// plus contact » du back-office.
export const collectTeamClaims = (projects, team, { now = new Date().toISOString() } = {}) => {
  if (!Array.isArray(projects) || !team?.id) {
    return [];
  }

  return projects
    // Une soumission annulée par son porteur est sortie du circuit compliance (voir le filtre
    // équivalent dans HomeScreen.jsx) : la compter dans la charge d'une équipe, la remonter dans
    // l'alerte des prises en charge orphelines ou la proposer à la réattribution ferait travailler
    // quelqu'un sur un projet retiré.
    .filter((project) => project?.status !== 'cancelled')
    .map((project) => {
      const entry = getTeamPerimeterEntry(project, team.id);
      const claim = getPerimeterClaim(entry);
      if (!claim) {
        return null;
      }
      const staleness = getClaimStaleness(entry, { team, now });
      return {
        projectId: project?.id || '',
        projectName: project?.projectName || '',
        projectStatus: project?.status || '',
        entry,
        claim,
        isOrphan: isOrphanClaim(team, claim),
        isStale: staleness.isStale,
        businessDaysSinceActivity: staleness.businessDaysSinceActivity,
        lastActivityAt: staleness.lastActivityAt
      };
    })
    .filter(Boolean);
};

export const summarizeTeamClaimLoad = (projects, team, options = {}) => {
  const claims = collectTeamClaims(projects, team, options);
  const byEmail = new Map();

  normalizeTeamContacts(team).forEach((contact) => {
    byEmail.set(normalizeEmail(contact), { email: contact, total: 0, stale: 0, orphan: false });
  });

  claims.forEach((claimEntry) => {
    const key = claimEntry.claim.assigneeEmail;
    if (!byEmail.has(key)) {
      byEmail.set(key, { email: claimEntry.claim.assigneeEmail, total: 0, stale: 0, orphan: true });
    }
    const row = byEmail.get(key);
    row.total += 1;
    if (claimEntry.isStale) {
      row.stale += 1;
    }
  });

  return {
    claims,
    orphanClaims: claims.filter((entry) => entry.isOrphan),
    staleClaims: claims.filter((entry) => entry.isStale),
    rows: Array.from(byEmail.values()).sort((a, b) => b.total - a.total || a.email.localeCompare(b.email))
  };
};
