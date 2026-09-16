import { getProjectStage, getQuestionRequiredFromStage, isStageAtLeast } from './projectStage.js';
import { isUnknownAnswer } from './unknownAnswer.js';

// Une seule définition de « cette réponse est renseignée » pour toute l'application : elle était
// dupliquée à l'identique dans App.jsx, QuestionnaireScreen.jsx, SynthesisReport.jsx et
// projectNormalization.js, et le caractère obligatoire d'une question dépend désormais du stade
// du projet — quatre copies qui divergent feraient quatre comptes différents du même projet.
export const isAnswerProvided = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return value !== null && value !== undefined;
};

// Obligatoire « ici et maintenant » : une question marquée obligatoire ne l'est qu'à partir du
// stade que l'administrateur lui a donné. C'est ce décalage qui permet d'interroger la
// compliance au cadrage sans avoir arrêté le budget ou l'hébergeur.
export const isQuestionMandatoryAtStage = (question, stage) => {
  if (!question?.required) {
    return false;
  }

  return isStageAtLeast(stage, getQuestionRequiredFromStage(question));
};

// Obligatoire pour une soumission finale : le stade ne dispense de rien à l'arrivée, il ne fait
// que décaler le moment où l'on doit répondre.
export const isQuestionMandatory = (question) => Boolean(question?.required);

// `rejectUnknown` distingue les deux portes d'entrée : un « je ne sais pas encore » est une
// réponse recevable pour demander un avis préliminaire (c'est même une information utile pour
// l'expert), jamais pour demander une validation.
const hasUsableAnswer = (answers, questionId, rejectUnknown) => {
  const value = answers?.[questionId];
  if (!isAnswerProvided(value)) {
    return false;
  }

  return !(rejectUnknown && isUnknownAnswer(value));
};

const filterMandatory = (questions, answers, { stage, ignoreStage = false } = {}) => {
  if (!Array.isArray(questions)) {
    return [];
  }

  if (ignoreStage) {
    return questions.filter(isQuestionMandatory);
  }

  const resolvedStage = stage || getProjectStage(answers);
  return questions.filter((question) => isQuestionMandatoryAtStage(question, resolvedStage));
};

export const getMissingMandatoryQuestions = (questions, answers = {}, options = {}) =>
  filterMandatory(questions, answers, options).filter(
    (question) => !question?.id || !hasUsableAnswer(answers, question.id, options.rejectUnknown)
  );

export const computeMandatoryProgress = (questions = [], answers = {}, options = {}) => {
  const mandatoryQuestions = filterMandatory(questions, answers, options);

  return {
    totalMandatoryQuestions: mandatoryQuestions.length,
    answeredMandatoryQuestions: mandatoryQuestions.filter(
      (question) => question?.id && hasUsableAnswer(answers, question.id, options.rejectUnknown)
    ).length
  };
};
