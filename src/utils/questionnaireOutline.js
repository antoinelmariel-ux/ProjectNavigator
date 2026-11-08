import { isAnswerProvided, isQuestionMandatory } from './mandatoryQuestions.js';

export const OUTLINE_STATE_ANSWERED = 'answered';
export const OUTLINE_STATE_MISSED = 'missed';
export const OUTLINE_STATE_UNANSWERED = 'unanswered';
export const OUTLINE_STATE_UPCOMING = 'upcoming';

// Une question obligatoire n'est signalée comme manquante qu'une fois que la personne l'a
// dépassée : avant, elle ne l'a simplement pas encore vue, et un triangle d'alerte sur une
// question à venir transforme le sommaire en liste de reproches dès la première seconde.
// « Dépassée » = placée avant la question courante, ou déjà affichée (un saut en avant par
// le sommaire laisse derrière lui des questions jamais vues, qui restent « à venir »).
export const getOutlineQuestionState = ({ question, index, currentIndex, visitedIds, answers }) => {
  if (!question?.id) {
    return OUTLINE_STATE_UPCOMING;
  }
  if (isAnswerProvided(answers?.[question.id])) {
    return OUTLINE_STATE_ANSWERED;
  }
  const isPassed = index !== currentIndex
    && (index < currentIndex || Boolean(visitedIds?.has?.(question.id)));
  if (!isPassed) {
    return OUTLINE_STATE_UPCOMING;
  }
  return isQuestionMandatory(question) ? OUTLINE_STATE_MISSED : OUTLINE_STATE_UNANSWERED;
};

export const countMissedMandatoryQuestions = ({ questions, currentIndex, visitedIds, answers }) => (
  (Array.isArray(questions) ? questions : []).filter((question, index) => (
    getOutlineQuestionState({ question, index, currentIndex, visitedIds, answers }) === OUTLINE_STATE_MISSED
  )).length
);
