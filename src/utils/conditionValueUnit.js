import { getNumberUnitOptions } from './questions.js';

const COMPARISON_OPERATORS = new Set(['lt', 'lte', 'gt', 'gte']);

export const isComparisonOperator = (operator) => COMPARISON_OPERATORS.has(operator);

// Une devise de seuil n'a de sens que pour une question « nombre » dont le répondant choisit
// la devise dans un sélecteur (au moins deux unités).
export const getQuestionCurrencyChoices = (question, language) =>
  question && (question.type || 'choice') === 'number' ? getNumberUnitOptions(question, language) : [];

export const hasCurrencyChoice = (question, language) => getQuestionCurrencyChoices(question, language).length >= 2;

// Applique le changement d'un champ de condition. Choisir une question à devises fixe la devise
// du seuil sur la première devise de la question ; toute autre question n'en porte pas. Une
// condition existante qu'on ne touche pas garde son comparatif brut (pas de `valueUnit`).
export const applyConditionFieldChange = (condition, field, value, questionEntries, language) => {
  const next = { ...condition, [field]: value };
  if (field !== 'question') {
    return next;
  }

  const question = (Array.isArray(questionEntries) ? questionEntries : []).find((entry) => entry?.id === value);
  const { valueUnit: _previous, ...withoutUnit } = next;
  return hasCurrencyChoice(question, language)
    ? { ...withoutUnit, valueUnit: getQuestionCurrencyChoices(question, language)[0] }
    : withoutUnit;
};
