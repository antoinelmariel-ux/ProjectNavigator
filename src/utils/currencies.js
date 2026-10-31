import { DEFAULT_LANGUAGE } from '../i18n/languages.js';
import { resolveLocalizedText } from './localizedContent.js';
import { SUBMISSION_HISTORY_KEY } from './submissionHistory.js';

// Devises : une entrée de la table donne une valeur chiffrée à un libellé d'unité proposé par le
// sélecteur d'une question « nombre » (ex. « K€ »). `rate` est la valeur d'UNE unité de base de la
// devise exprimée dans la devise pivot (EUR), `multiplier` le facteur de l'unité (K = 1000) :
// 1 « K$ » vaut donc `multiplier * rate` euros. Pas de pivot codé en dur dans le moteur : il ne
// manipule que cette valeur, ce qui permet de passer d'une unité à une autre quelle que soit la
// devise de départ.

const NUMBER_UNIT_CHOICE_SUFFIX = '__number_unit';

export const buildNumberUnitAnswerId = (questionId) => {
  if (!questionId || typeof questionId !== 'string') {
    return '';
  }

  return `${questionId}${NUMBER_UNIT_CHOICE_SUFFIX}`;
};

const toPositiveNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const normalizeCurrencyEntry = (entry) => {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const unit = typeof entry.unit === 'string' ? entry.unit.trim() : '';
  if (!unit) {
    return null;
  }

  return {
    unit,
    code: typeof entry.code === 'string' ? entry.code.trim() : '',
    multiplier: toPositiveNumber(entry.multiplier) ?? 1,
    rate: toPositiveNumber(entry.rate),
    updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : ''
  };
};

export const normalizeCurrencyTable = (table) => {
  if (!Array.isArray(table)) {
    return [];
  }

  const seen = new Set();
  return table.reduce((accumulator, raw) => {
    const entry = normalizeCurrencyEntry(raw);
    if (entry && !seen.has(entry.unit)) {
      seen.add(entry.unit);
      accumulator.push(entry);
    }
    return accumulator;
  }, []);
};

// Valeur d'une unité dans la devise pivot, ou null quand aucun taux n'est renseigné.
export const getUnitPivotValue = (entry) => {
  const normalized = normalizeCurrencyEntry(entry);
  if (!normalized || normalized.rate === null) {
    return null;
  }

  return normalized.multiplier * normalized.rate;
};

// Taux figés à l'envoi : { [unité]: valeur pivot }. Seules les unités chiffrées y figurent.
export const buildCurrencyRatesSnapshot = (table = currencyTable) =>
  normalizeCurrencyTable(table).reduce((accumulator, entry) => {
    const value = getUnitPivotValue(entry);
    if (value !== null) {
      accumulator[entry.unit] = value;
    }
    return accumulator;
  }, {});

// Contexte courant du moteur : table de taux et unité par défaut de chaque question « nombre ».
// Le moteur de règles ne reçoit que les réponses ; une unité jamais choisie dans le sélecteur
// n'est pas stockée (le questionnaire affiche la première), il faut donc la retrouver ici.
let currencyTable = [];
let defaultUnits = {};

export const getCurrencyTable = () => currencyTable;

export const setCurrencyTable = (table) => {
  currencyTable = normalizeCurrencyTable(table);
};

export const getDefaultNumberUnit = (question, language = DEFAULT_LANGUAGE) => {
  if (!question) {
    return '';
  }

  const primary = resolveLocalizedText(question.numberUnit, language).trim();
  if (primary) {
    return primary;
  }

  const extra = Array.isArray(question.numberUnitOptions)
    ? question.numberUnitOptions.find((entry) => typeof entry === 'string' && entry.trim().length > 0)
    : '';
  return extra ? extra.trim() : '';
};

export const setCurrencyQuestionDefaults = (questions) => {
  defaultUnits = {};
  if (!Array.isArray(questions)) {
    return;
  }

  questions.forEach((question) => {
    if (question && question.id && (question.type || 'choice') === 'number') {
      const unit = getDefaultNumberUnit(question);
      if (unit) {
        defaultUnits[question.id] = unit;
      }
    }
  });
};

export const resetCurrencyContext = () => {
  currencyTable = [];
  defaultUnits = {};
};

// Valeur pivot d'une unité pour ces réponses : les taux figés au dernier envoi priment (un projet
// soumis n'est pas réévalué quand un administrateur change un taux), la table courante sert pour
// un brouillon et pour une unité que l'instantané ne connaissait pas encore.
const resolveUnitValue = (answers, unit) => {
  const frozen = answers?.[SUBMISSION_HISTORY_KEY]?.currencyRates;
  if (frozen && typeof frozen === 'object' && frozen[unit] !== undefined) {
    return toPositiveNumber(frozen[unit]);
  }

  const entry = currencyTable.find((candidate) => candidate.unit === unit);
  return entry ? getUnitPivotValue(entry) : null;
};

// Convertit la réponse numérique d'une condition dans l'unité du seuil (`condition.valueUnit`).
// Renvoie null quand la conversion est impossible (unité de la réponse inconnue, taux manquant) :
// la condition n'est alors pas satisfaite.
export const convertAnswerToConditionUnit = (condition, answers, amount) => {
  const targetUnit = typeof condition?.valueUnit === 'string' ? condition.valueUnit.trim() : '';
  if (!targetUnit) {
    return amount;
  }

  const storedUnit = answers?.[buildNumberUnitAnswerId(condition.question)];
  const answerUnit = (typeof storedUnit === 'string' && storedUnit.trim())
    || defaultUnits[condition.question]
    || '';
  if (!answerUnit) {
    return null;
  }

  if (answerUnit === targetUnit) {
    return amount;
  }

  const from = resolveUnitValue(answers, answerUnit);
  const to = resolveUnitValue(answers, targetUnit);
  if (from === null || to === null) {
    return null;
  }

  return (amount * from) / to;
};

// Équivalent d'un seuil dans les autres unités, pour l'aperçu de l'éditeur de condition.
export const convertThresholdToUnits = (value, fromUnit, units, table = currencyTable) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || !fromUnit) {
    return [];
  }

  const normalized = normalizeCurrencyTable(table);
  const source = normalized.find((entry) => entry.unit === fromUnit);
  const sourceValue = source ? getUnitPivotValue(source) : null;
  if (sourceValue === null) {
    return [];
  }

  return (Array.isArray(units) ? units : [])
    .filter((unit) => unit && unit !== fromUnit)
    .map((unit) => {
      const target = normalized.find((entry) => entry.unit === unit);
      const targetValue = target ? getUnitPivotValue(target) : null;
      return targetValue === null ? null : { unit, amount: (amount * sourceValue) / targetValue };
    })
    .filter(Boolean);
};

// Libellés d'unité utilisés par des questions mais absents de la table ou sans taux : ils ne
// pourront jamais satisfaire une condition convertie.
export const findUnitsWithoutRate = (questions, table = currencyTable) => {
  const normalized = normalizeCurrencyTable(table);
  const missing = new Set();

  (Array.isArray(questions) ? questions : []).forEach((question) => {
    if (!question || (question.type || 'choice') !== 'number') {
      return;
    }

    const units = [getDefaultNumberUnit(question), ...(Array.isArray(question.numberUnitOptions) ? question.numberUnitOptions : [])]
      .map((unit) => (typeof unit === 'string' ? unit.trim() : ''))
      .filter(Boolean);
    units.forEach((unit) => {
      const entry = normalized.find((candidate) => candidate.unit === unit);
      if (!entry || getUnitPivotValue(entry) === null) {
        missing.add(unit);
      }
    });
  });

  return Array.from(missing);
};
