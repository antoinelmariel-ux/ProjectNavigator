import { getQuestionRequiredFromStage, isStageAtLeast } from './projectStage.js';
import { hasQuestionDoubt } from './questionDoubts.js';

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

// Exigible à un palier donné : une question marquée obligatoire ne compte qu'à partir du palier
// que l'administrateur lui a donné (`requiredFromStage`). C'est ce décalage qui permet de
// demander une orientation sans avoir arrêté le budget ou l'hébergeur.
export const isQuestionMandatoryAtStage = (question, stage) => {
  if (!question?.required) {
    return false;
  }

  return isStageAtLeast(stage, getQuestionRequiredFromStage(question));
};

// Obligatoire tout court : ce que le questionnaire signale et ce qu'exigent l'avis technique et
// la validation.
export const isQuestionMandatory = (question) => Boolean(question?.required);

// `rejectUnknown` distingue les deux portes d'entrée : un doute signalé sur la réponse est
// recevable pour demander un avis préliminaire (c'est même une information utile pour
// l'expert), jamais pour demander une validation.
const hasUsableAnswer = (answers, questionId, rejectUnknown) => {
  const value = answers?.[questionId];
  if (!isAnswerProvided(value)) {
    return false;
  }

  return !(rejectUnknown && hasQuestionDoubt(answers, questionId));
};

// Sans `stage`, toutes les questions obligatoires ; avec, celles exigibles à ce palier.
const filterMandatory = (questions, { stage } = {}) => {
  if (!Array.isArray(questions)) {
    return [];
  }

  if (!stage) {
    return questions.filter(isQuestionMandatory);
  }

  return questions.filter((question) => isQuestionMandatoryAtStage(question, stage));
};

export const getMissingMandatoryQuestions = (questions, answers = {}, options = {}) =>
  filterMandatory(questions, options).filter(
    (question) => !question?.id || !hasUsableAnswer(answers, question.id, options.rejectUnknown)
  );

export const computeMandatoryProgress = (questions = [], answers = {}, options = {}) => {
  const mandatoryQuestions = filterMandatory(questions, options);

  return {
    totalMandatoryQuestions: mandatoryQuestions.length,
    answeredMandatoryQuestions: mandatoryQuestions.filter(
      (question) => question?.id && hasUsableAnswer(answers, question.id, options.rejectUnknown)
    ).length
  };
};
