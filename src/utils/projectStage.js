// Il n'y a plus de stade de projet : ni déclaré par le porteur (se classer soi-même n'est pas une
// question sur le projet), ni stocké dans les réponses. Ce que la compliance peut faire d'un
// projet se lit uniquement dans les paliers dérivés des réponses (projectReadiness.js).
//
// Reste un réglage par question, `requiredFromStage`, qui dit à quel palier une question
// obligatoire devient exigible : dès l'orientation (le socle) ou seulement pour l'avis technique
// et la validation. Ses valeurs stockées sont les anciens identifiants de stade, gardés tels
// quels pour ne pas réécrire les référentiels déjà publiés ; `design`, qui n'a plus de palier à
// lui, se lit comme `pre_launch`.
export const PROJECT_STAGE_FRAMING = 'framing';
export const PROJECT_STAGE_DESIGN = 'design';
export const PROJECT_STAGE_PRE_LAUNCH = 'pre_launch';

// L'ordre du tableau EST la relation d'ordre entre valeurs (cf. getProjectStageRank).
export const PROJECT_STAGE_VALUES = [
  PROJECT_STAGE_FRAMING,
  PROJECT_STAGE_DESIGN,
  PROJECT_STAGE_PRE_LAUNCH
];

// Les deux choix offerts dans l'éditeur de questions.
export const REQUIRED_FOR_ORIENTATION = PROJECT_STAGE_FRAMING;
export const REQUIRED_FOR_ADVICE = PROJECT_STAGE_PRE_LAUNCH;

export const normalizeProjectStage = (value, fallback = PROJECT_STAGE_PRE_LAUNCH) => {
  const candidate = typeof value === 'string' ? value.trim() : '';
  return PROJECT_STAGE_VALUES.includes(candidate) ? candidate : fallback;
};

export const getProjectStageRank = (stage) => {
  const index = PROJECT_STAGE_VALUES.indexOf(normalizeProjectStage(stage));
  return index === -1 ? PROJECT_STAGE_VALUES.length - 1 : index;
};

export const isStageAtLeast = (stage, minimumStage) =>
  getProjectStageRank(stage) >= getProjectStageRank(minimumStage);

// L'absence de valeur vaut « exigée dès l'orientation » : c'est le comportement historique, donc
// une question que personne n'a requalifiée reste dans le socle.
export const getQuestionRequiredFromStage = (question) =>
  normalizeProjectStage(question?.requiredFromStage, PROJECT_STAGE_FRAMING);

export const getQuestionRequirementLevel = (question) =>
  getQuestionRequiredFromStage(question) === PROJECT_STAGE_FRAMING
    ? REQUIRED_FOR_ORIENTATION
    : REQUIRED_FOR_ADVICE;
