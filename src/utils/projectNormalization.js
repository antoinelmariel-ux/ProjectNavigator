import { initialQuestions } from '../data/questions.js';
import { shouldShowQuestion } from './questions.js';

const isAnswerProvided = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return value !== null && value !== undefined;
};

export const normalizeProjectEntry = (
  project = {},
  fallbackQuestionsLength = initialQuestions.length
) => {
  const answers = typeof project.answers === 'object' && project.answers !== null
    ? project.answers
    : {};

  const questionCatalog = Array.isArray(project.availableQuestions)
    ? project.availableQuestions
    : Array.isArray(project.questions)
      ? project.questions
      : initialQuestions;

  const visibleQuestions = questionCatalog.filter(question => {
    if (!question || typeof question !== 'object') {
      return false;
    }

    return shouldShowQuestion(question, answers);
  });
  const mandatoryVisibleQuestions = visibleQuestions.filter(question => question?.required);
  const derivedTotalQuestions = mandatoryVisibleQuestions.length;
  const derivedAnsweredQuestions = mandatoryVisibleQuestions.length > 0
    ? mandatoryVisibleQuestions.filter(question => {
      if (!question || typeof question.id === 'undefined') {
        return false;
      }

      return isAnswerProvided(answers[question.id]);
    }).length
    : 0;

  const computedTotalQuestions =
    typeof project.totalQuestions === 'number' && project.totalQuestions > 0
      ? project.totalQuestions
      : derivedTotalQuestions > 0
        ? derivedTotalQuestions
        : 0;

  const answeredQuestionsCount =
    typeof project.answeredQuestions === 'number'
      ? project.answeredQuestions
      : derivedAnsweredQuestions;

  let lastQuestionIndex =
    typeof project.lastQuestionIndex === 'number'
      ? project.lastQuestionIndex
      : computedTotalQuestions > 0
        ? computedTotalQuestions - 1
        : 0;

  if (computedTotalQuestions > 0) {
    lastQuestionIndex = Math.min(Math.max(lastQuestionIndex, 0), computedTotalQuestions - 1);
  }

  const lastUpdated = project.lastUpdated || project.submittedAt || null;
  const submittedAt = project.submittedAt || project.lastUpdated || null;

  return {
    ...project,
    status: project.status || 'submitted',
    lastUpdated,
    submittedAt,
    totalQuestions: computedTotalQuestions,
    answeredQuestions: Math.min(
      answeredQuestionsCount,
      computedTotalQuestions || answeredQuestionsCount
    ),
    lastQuestionIndex
  };
};

export const normalizeProjectsCollection = (
  projects,
  fallbackQuestionsLength = initialQuestions.length
) => {
  if (!Array.isArray(projects)) {
    return null;
  }

  return projects.map(project => normalizeProjectEntry(project, fallbackQuestionsLength));
};
