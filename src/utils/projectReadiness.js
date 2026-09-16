import { getMissingMandatoryQuestions } from './mandatoryQuestions.js';
import {
  PROJECT_STAGE_DESIGN,
  PROJECT_STAGE_FRAMING,
  PROJECT_STAGE_PRE_LAUNCH
} from './projectStage.js';

// Ce que la compliance peut faire de ce qui est déjà saisi — et non « 14/21 ». Un pourcentage
// dit au porteur qu'il lui manque du remplissage ; ces trois paliers lui disent ce qu'il peut
// obtenir maintenant, et ce qu'il doit trancher pour obtenir le palier suivant.
export const READINESS_INCOMPLETE = 'incomplete';
export const READINESS_ORIENTATION = 'orientation';
export const READINESS_ADVICE = 'advice';
export const READINESS_VALIDATION = 'validation';

// Chaque palier est exactement « toutes les questions obligatoires jusqu'à ce stade sont
// renseignées » : aucune donnée supplémentaire à saisir côté back-office, c'est le même
// `requiredFromStage` qui module l'obligatoire dans le questionnaire.
export const READINESS_LEVELS = [
  { id: READINESS_ORIENTATION, stage: PROJECT_STAGE_FRAMING, rejectUnknown: false },
  { id: READINESS_ADVICE, stage: PROJECT_STAGE_DESIGN, rejectUnknown: false },
  // On ne valide pas sur un « je ne sais pas encore » : le dernier palier est le seul à
  // exiger une réponse ferme.
  { id: READINESS_VALIDATION, stage: PROJECT_STAGE_PRE_LAUNCH, rejectUnknown: true }
];

export const getProjectReadiness = (questions = [], answers = {}) => {
  const levels = READINESS_LEVELS.map((level) => {
    const missing = getMissingMandatoryQuestions(questions, answers, {
      stage: level.stage,
      rejectUnknown: level.rejectUnknown
    });

    return { id: level.id, stage: level.stage, reached: missing.length === 0, missing };
  });

  // Un palier n'est atteint que si tous les précédents le sont : une question de cadrage
  // laissée vide ne doit pas être effacée par un questionnaire par ailleurs très rempli.
  let level = READINESS_INCOMPLETE;
  for (let index = 0; index < levels.length; index += 1) {
    if (!levels[index].reached) {
      break;
    }
    level = levels[index].id;
  }

  const nextLevel = levels.find((entry) => !entry.reached) || null;

  return {
    level,
    levels,
    nextLevel: nextLevel ? nextLevel.id : null,
    missingForNextLevel: nextLevel ? nextLevel.missing : []
  };
};
