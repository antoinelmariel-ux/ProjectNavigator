import { PROJECT_STAGE_ANSWER_KEY, PROJECT_STAGE_LABELS, normalizeProjectStage } from './projectStage.js';
import { formatAnswer } from './questions.js';
import { resolveLocalizedText } from './localizedContent.js';
import { DEFAULT_LANGUAGE } from '../i18n/languages.js';

// Types dont le contenu ne se compare pas à une valeur : aucune règle ne les lit, donc aucune
// modification de ces champs ne peut déclencher une notification. Elles ne sont pas anodines
// pour autant — c'est précisément le trou qu'un dernier tour de validation doit rattraper —
// alors elles sont comptées et montrées, jamais silencieuses.
export const NARRATIVE_QUESTION_TYPES = ['text', 'long_text', 'file', 'milestone_list', 'ranking'];

export const isNarrativeQuestion = (question) =>
  NARRATIVE_QUESTION_TYPES.includes(question?.type || 'choice');

const serialize = (value) => {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const formatValue = (question, value, language) => {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (question?.id === PROJECT_STAGE_ANSWER_KEY) {
    return resolveLocalizedText(PROJECT_STAGE_LABELS[normalizeProjectStage(value)], language);
  }

  return formatAnswer(question, value, language);
};

// Le diff ne couvre que les vraies questions du référentiel : c'est ce qu'un porteur et un
// expert peuvent lire. La vérité pour le moteur (cases à cocher annexes, unités, périmètre
// d'activité) passe, elle, par une réévaluation complète des règles — voir perimeterImpact.js.
export const diffAnswers = (previousAnswers, currentAnswers, questions = [], language = DEFAULT_LANGUAGE) => {
  const previous = previousAnswers && typeof previousAnswers === 'object' ? previousAnswers : {};
  const current = currentAnswers && typeof currentAnswers === 'object' ? currentAnswers : {};

  const stagePseudoQuestion = {
    id: PROJECT_STAGE_ANSWER_KEY,
    type: 'choice',
    question: { en: 'Project stage', fr: 'Stade du projet', de: 'Projektphase', es: 'Fase del proyecto' }
  };

  const catalog = [...(Array.isArray(questions) ? questions : []), stagePseudoQuestion];

  return catalog.reduce((acc, question) => {
    if (!question?.id) {
      return acc;
    }

    const before = previous[question.id];
    const after = current[question.id];

    if (serialize(before) === serialize(after)) {
      return acc;
    }

    acc.push({
      questionId: question.id,
      question,
      narrative: question.id !== PROJECT_STAGE_ANSWER_KEY && isNarrativeQuestion(question),
      previousValue: before,
      currentValue: after,
      previousLabel: formatValue(question, before, language),
      currentLabel: formatValue(question, after, language)
    });

    return acc;
  }, []);
};

export const getNarrativeQuestionIds = (changes = []) =>
  changes.filter((change) => change?.narrative).map((change) => change.questionId);
