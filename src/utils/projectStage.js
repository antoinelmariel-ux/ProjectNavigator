// Le stade déclaré par le porteur est la clé de voûte de l'entrée précoce : il ne décrit pas
// l'avancement administratif d'un dossier, il décide de ce que l'application exige avant de
// laisser interroger la compliance. Contrairement au périmètre d'activité (donnée de profil,
// jamais persistée dans un projet), il est stocké dans les réponses du projet : c'est ce qui
// le rend utilisable comme condition de visibilité d'une question ou de déclenchement d'une
// règle, sans aucune mécanique supplémentaire.
export const PROJECT_STAGE_ANSWER_KEY = '__project_stage__';

export const PROJECT_STAGE_FRAMING = 'framing';
export const PROJECT_STAGE_DESIGN = 'design';
export const PROJECT_STAGE_PRE_LAUNCH = 'pre_launch';

// L'ordre du tableau EST la relation d'ordre entre stades (cf. getProjectStageRank).
export const PROJECT_STAGE_VALUES = [
  PROJECT_STAGE_FRAMING,
  PROJECT_STAGE_DESIGN,
  PROJECT_STAGE_PRE_LAUNCH
];

// Un projet enregistré avant cette fonctionnalité n'a pas de stade : il est considéré au stade
// le plus avancé, jamais au plus précoce — sans quoi des questions qui étaient obligatoires
// pour lui cesseraient rétroactivement de l'être, et un projet déjà soumis apparaîtrait comme
// un simple projet de cadrage.
export const LEGACY_PROJECT_STAGE = PROJECT_STAGE_PRE_LAUNCH;

// Un projet créé maintenant part au contraire du cadrage : tout l'enjeu est qu'on puisse
// interroger la compliance avant d'avoir tout tranché.
export const DEFAULT_NEW_PROJECT_STAGE = PROJECT_STAGE_FRAMING;

export const normalizeProjectStage = (value, fallback = LEGACY_PROJECT_STAGE) => {
  const candidate = typeof value === 'string' ? value.trim() : '';
  return PROJECT_STAGE_VALUES.includes(candidate) ? candidate : fallback;
};

export const getProjectStage = (answers, fallback = LEGACY_PROJECT_STAGE) => {
  if (!answers || typeof answers !== 'object') {
    return fallback;
  }

  return normalizeProjectStage(answers[PROJECT_STAGE_ANSWER_KEY], fallback);
};

export const withProjectStage = (answers, stage) => ({
  ...(answers && typeof answers === 'object' ? answers : {}),
  [PROJECT_STAGE_ANSWER_KEY]: normalizeProjectStage(stage, DEFAULT_NEW_PROJECT_STAGE)
});

export const getProjectStageRank = (stage) => {
  const index = PROJECT_STAGE_VALUES.indexOf(normalizeProjectStage(stage));
  return index === -1 ? PROJECT_STAGE_VALUES.length - 1 : index;
};

export const isStageAtLeast = (stage, minimumStage) =>
  getProjectStageRank(stage) >= getProjectStageRank(minimumStage);

// Stade à partir duquel une question obligatoire le devient réellement. L'absence de valeur
// vaut « obligatoire dès le cadrage » : c'est le comportement historique, donc une question
// que personne n'a requalifiée ne change pas de régime.
export const getQuestionRequiredFromStage = (question) =>
  normalizeProjectStage(question?.requiredFromStage, PROJECT_STAGE_FRAMING);

// Libellés portés par le module (et non par le dictionnaire i18n) : ils alimentent aussi les
// listes de conditions du back-office et les exports, qui n'ont pas accès au contexte i18n —
// même convention que activityScope.js.
export const PROJECT_STAGE_LABELS = {
  [PROJECT_STAGE_FRAMING]: {
    en: 'Framing',
    fr: 'Cadrage',
    de: 'Rahmenphase',
    es: 'Encuadre'
  },
  [PROJECT_STAGE_DESIGN]: {
    en: 'Design',
    fr: 'Conception',
    de: 'Konzeption',
    es: 'Diseño'
  },
  [PROJECT_STAGE_PRE_LAUNCH]: {
    en: 'Before launch',
    fr: 'Avant déploiement',
    de: 'Vor dem Start',
    es: 'Antes del despliegue'
  }
};

export const PROJECT_STAGE_CONDITION_LABEL = {
  en: 'Project stage',
  fr: 'Stade du projet',
  de: 'Projektphase',
  es: 'Fase del proyecto'
};
