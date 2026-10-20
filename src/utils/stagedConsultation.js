import { getTriggeredValidationCommittees } from './validationCommittee.js';
import { isTeamAutoValidated } from './complianceAutoValidation.js';

// Une demande d'avis préliminaire peut ne solliciter d'abord qu'une partie des périmètres
// détectés : le porteur consulte l'équipe (ou le comité) qui conditionne le reste, ajuste son
// projet, puis sollicite les autres sur un projet déjà corrigé. Les périmètres mis de côté ne
// sont ni notifiés ni visibles de leurs experts tant qu'ils ne sont pas sollicités — mais ils
// comptent comme des avis manquants : une consultation partielle ne passe jamais pour validée.
//
// Seuls les périmètres *sollicités* sont stockés, jamais les périmètres « à solliciter
// ensuite » : ceux-ci se déduisent des périmètres que le projet déclenche aujourd'hui. Une
// équipe qu'une modification fait apparaître en cours de route tombe donc d'elle-même dans
// « à solliciter ensuite », et une équipe qui n'est plus concernée disparaît sans avoir jamais
// été prévenue de rien. Stocké dans les réponses, comme tout marqueur de projet : pas de
// nouvelle colonne SharePoint.
export const STAGED_CONSULTATION_KEY = '__staged_consultation__';

export const PERIMETER_TYPE_TEAM = 'team';
export const PERIMETER_TYPE_COMMITTEE = 'committee';

// Écrit en dur plutôt qu'importé de `projectValidationStatus.js`, qui consomme ce module.
const COMPLIANCE_COMMENTS_KEY = '__compliance_team_comments__';

export const buildPerimeterKey = (type, id) => `${type}:${id}`;

const isPerimeterKey = (value) => typeof value === 'string'
  && (value.startsWith(`${PERIMETER_TYPE_TEAM}:`) || value.startsWith(`${PERIMETER_TYPE_COMMITTEE}:`))
  && value.indexOf(':') < value.length - 1;

const normalizeKeyList = (value) => (Array.isArray(value)
  ? Array.from(new Set(value.filter(isPerimeterKey)))
  : []);

export const normalizeStagedConsultation = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { isActive: false, solicited: [], waves: [] };
  }

  return {
    isActive: value.isActive === true,
    solicited: normalizeKeyList(value.solicited),
    waves: Array.isArray(value.waves)
      ? value.waves
        .map((wave) => ({
          at: typeof wave?.at === 'string' ? wave.at : '',
          by: typeof wave?.by === 'string' ? wave.by : '',
          perimeters: normalizeKeyList(wave?.perimeters)
        }))
        .filter((wave) => wave.perimeters.length > 0)
      : []
  };
};

export const getStagedConsultation = (answers) => normalizeStagedConsultation(
  answers && typeof answers === 'object' ? answers[STAGED_CONSULTATION_KEY] : null
);

// Les périmètres qu'une demande sollicite réellement : les équipes notifiées par le moteur de
// règles et les comités déclenchés. Une équipe auto-validée n'en fait pas partie — personne n'y
// écrira jamais, la mettre de côté la laisserait éternellement « à solliciter ».
export const getSolicitablePerimeters = (project, options = {}) => {
  const teams = Array.isArray(options.teams) ? options.teams : [];
  const answers = project?.answers && typeof project.answers === 'object' ? project.answers : {};
  const analysis = project?.analysis && typeof project.analysis === 'object' ? project.analysis : {};
  const analysisTeamIds = Array.isArray(analysis.teams) ? analysis.teams : [];
  const relevantTeams = teams.filter((team) => team?.id && analysisTeamIds.includes(team.id));
  const comments = answers[COMPLIANCE_COMMENTS_KEY];
  const forcedCommitteeIds = Array.isArray(comments?.forcedCommitteeIds) ? comments.forcedCommitteeIds : [];

  const committees = getTriggeredValidationCommittees(options.validationCommitteeConfig, {
    answers,
    analysis,
    relevantTeams,
    forcedCommitteeIds
  });

  return [
    ...relevantTeams
      .filter((team) => !isTeamAutoValidated(analysis, team.id))
      .map((team) => ({
        type: PERIMETER_TYPE_TEAM,
        id: team.id,
        key: buildPerimeterKey(PERIMETER_TYPE_TEAM, team.id),
        team
      })),
    ...committees.map((committee) => ({
      type: PERIMETER_TYPE_COMMITTEE,
      id: committee.id,
      key: buildPerimeterKey(PERIMETER_TYPE_COMMITTEE, committee.id),
      committee
    }))
  ];
};

export const getDeferredPerimeters = (project, options = {}) => {
  const staged = getStagedConsultation(project?.answers);
  if (!staged.isActive) {
    return [];
  }

  const solicited = new Set(staged.solicited);
  return getSolicitablePerimeters(project, options).filter((perimeter) => !solicited.has(perimeter.key));
};

export const getDeferredPerimeterKeys = (project, options = {}) => new Set(
  getDeferredPerimeters(project, options).map((perimeter) => perimeter.key)
);

export const isStagedConsultationActive = (project, options = {}) => getDeferredPerimeters(project, options).length > 0;

// Première vague : seuls les périmètres retenus sont sollicités. Sans périmètre mis de côté, il
// n'y a pas de consultation par vagues — le marqueur est alors refermé, pour qu'une équipe
// déclenchée plus tard soit notifiée normalement.
export const withStagedConsultationStart = (answers, { solicitedKeys = [], solicitableKeys = [], by = '', at } = {}) => {
  const base = answers && typeof answers === 'object' ? answers : {};
  const solicited = normalizeKeyList(solicitedKeys);
  const solicitedSet = new Set(solicited);
  const hasDeferred = normalizeKeyList(solicitableKeys).some((key) => !solicitedSet.has(key));

  if (!hasDeferred) {
    return withStagedConsultationClosed(base, { by, at });
  }

  return {
    ...base,
    [STAGED_CONSULTATION_KEY]: {
      isActive: true,
      solicited,
      waves: [{ at: at || new Date().toISOString(), by, perimeters: solicited }]
    }
  };
};

// Vague suivante. La consultation se referme d'elle-même quand plus rien n'attend.
export const withPerimetersSolicited = (answers, { keys = [], solicitableKeys = [], by = '', at } = {}) => {
  const base = answers && typeof answers === 'object' ? answers : {};
  const staged = getStagedConsultation(base);
  if (!staged.isActive) {
    return base;
  }

  const already = new Set(staged.solicited);
  const added = normalizeKeyList(keys).filter((key) => !already.has(key));
  if (added.length === 0) {
    return base;
  }

  const solicited = [...staged.solicited, ...added];
  const solicitedSet = new Set(solicited);
  const remaining = normalizeKeyList(solicitableKeys).filter((key) => !solicitedSet.has(key));

  return {
    ...base,
    [STAGED_CONSULTATION_KEY]: {
      isActive: remaining.length > 0,
      solicited,
      waves: [...staged.waves, { at: at || new Date().toISOString(), by, perimeters: added }]
    }
  };
};

// Une demande de validation sollicite tout le monde : rien ne peut rester « à solliciter
// ensuite » quand on demande un tampon. L'historique des vagues est conservé.
export const withStagedConsultationClosed = (answers, { solicitableKeys = [], by = '', at } = {}) => {
  const base = answers && typeof answers === 'object' ? answers : {};
  if (!base[STAGED_CONSULTATION_KEY]) {
    return base;
  }

  const staged = getStagedConsultation(base);
  const already = new Set(staged.solicited);
  const added = staged.isActive
    ? normalizeKeyList(solicitableKeys).filter((key) => !already.has(key))
    : [];

  return {
    ...base,
    [STAGED_CONSULTATION_KEY]: {
      isActive: false,
      solicited: [...staged.solicited, ...added],
      waves: added.length > 0
        ? [...staged.waves, { at: at || new Date().toISOString(), by, perimeters: added }]
        : staged.waves
    }
  };
};
