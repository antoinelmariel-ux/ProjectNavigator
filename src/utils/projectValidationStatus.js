import { getTriggeredValidationCommittees } from './validationCommittee.js';

export const COMPLIANCE_COMMENTS_KEY = '__compliance_team_comments__';

export const DEFAULT_COMMITTEE_ID = 'committee-default';

// Un périmètre (équipe experte ou comité) est considéré comme s'étant prononcé
// favorablement avec l'un de ces trois statuts. « pending_information » et
// l'absence de statut laissent le projet en attente.
export const APPROVING_COMPLIANCE_STATUSES = [
  'validated',
  'validated_with_conditions',
  'not_concerned'
];

export const PROJECT_VALIDATION_VALIDATED = 'validated';
export const PROJECT_VALIDATION_REJECTED = 'rejected';
export const PROJECT_VALIDATION_PENDING = 'pending';
export const PROJECT_VALIDATION_NONE = 'none';

const readStatus = (entry) => (typeof entry?.status === 'string' ? entry.status : '');

const normalizeComplianceComments = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { teams: {}, committees: {}, forcedCommitteeIds: [] };
  }

  const teams = value.teams && typeof value.teams === 'object' ? value.teams : {};
  const committees = value.committees && typeof value.committees === 'object' ? value.committees : {};
  const legacyCommittee = value.committee && typeof value.committee === 'object' ? value.committee : null;

  return {
    teams,
    committees: legacyCommittee && !committees[DEFAULT_COMMITTEE_ID]
      ? { ...committees, [DEFAULT_COMMITTEE_ID]: legacyCommittee }
      : committees,
    forcedCommitteeIds: Array.isArray(value.forcedCommitteeIds) ? value.forcedCommitteeIds : []
  };
};

export const getProjectCompliancePerimeters = (project, options = {}) => {
  const teams = Array.isArray(options.teams) ? options.teams : [];
  const comments = normalizeComplianceComments(project?.answers?.[COMPLIANCE_COMMENTS_KEY]);
  const analysis = project?.analysis || {};
  const analysisTeamIds = Array.isArray(analysis.teams) ? analysis.teams : [];
  const relevantTeams = teams.filter((team) => team?.id && analysisTeamIds.includes(team.id));

  const triggeredCommittees = getTriggeredValidationCommittees(options.validationCommitteeConfig, {
    answers: project?.answers || {},
    analysis,
    relevantTeams,
    forcedCommitteeIds: comments.forcedCommitteeIds
  });

  return [
    ...relevantTeams.map((team) => ({
      id: team.id,
      type: 'team',
      required: true,
      status: readStatus(comments.teams?.[team.id])
    })),
    ...triggeredCommittees.map((committee) => ({
      id: committee.id,
      type: 'committee',
      // Un comité dont la demande de commentaire est désactivée ne bloque pas la
      // validation, mais son refus éventuel compte quand même.
      required: committee?.commentRequired !== false,
      status: readStatus(comments.committees?.[committee.id])
    }))
  ];
};

export const computeProjectValidationStatus = (project, options = {}) => {
  const perimeters = getProjectCompliancePerimeters(project, options);
  const requiredPerimeters = perimeters.filter((perimeter) => perimeter.required);

  const rejectedCount = perimeters.filter((perimeter) => perimeter.status === 'rejected').length;
  const approvedCount = requiredPerimeters.filter((perimeter) =>
    APPROVING_COMPLIANCE_STATUSES.includes(perimeter.status)
  ).length;
  const conditionalCount = requiredPerimeters.filter(
    (perimeter) => perimeter.status === 'validated_with_conditions'
  ).length;

  let status = PROJECT_VALIDATION_PENDING;

  if (rejectedCount > 0) {
    status = PROJECT_VALIDATION_REJECTED;
  } else if (requiredPerimeters.length === 0) {
    status = PROJECT_VALIDATION_NONE;
  } else if (approvedCount === requiredPerimeters.length) {
    status = PROJECT_VALIDATION_VALIDATED;
  }

  return {
    status,
    requiredCount: requiredPerimeters.length,
    approvedCount,
    rejectedCount,
    conditionalCount
  };
};
