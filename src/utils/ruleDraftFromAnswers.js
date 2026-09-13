import { evaluateRule } from './rules.js';
import {
  buildExtraCheckboxQuestionId,
  getQuestionOptionEntries,
  normalizeAnswerForComparison
} from './questions.js';
import { getOperatorOptionsForType } from './operatorOptions.js';
import { resolveLocalizedText } from './localizedContent.js';
import { DEFAULT_LANGUAGE } from '../i18n/languages.js';

// Types de questions dont une réponse peut être transformée telle quelle en condition de
// règle. Les autres (texte libre, fichier, jalons, classement) produisent des valeurs trop
// singulières pour discriminer quoi que ce soit : les proposer noierait la liste.
const CANDIDATE_QUESTION_TYPES = new Set(['choice', 'multi_choice', 'boolean', 'number', 'date']);

export const CANDIDATE_TIERS = {
  DISCRIMINANT: 'discriminant',
  SPECIFIC: 'specific',
  UNIVERSAL: 'universal'
};

const TIER_RANK = {
  [CANDIDATE_TIERS.DISCRIMINANT]: 0,
  [CANDIDATE_TIERS.SPECIFIC]: 1,
  [CANDIDATE_TIERS.UNIVERSAL]: 2
};

const isAnswered = (value) => {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
};

const buildOptionLabelMap = (question, language) => {
  const map = new Map();
  getQuestionOptionEntries(question, { language }).forEach((entry) => {
    if (entry && typeof entry.value === 'string') {
      map.set(entry.value, entry.label || entry.value);
    }
  });

  const options = Array.isArray(question?.options) ? question.options : [];
  options.forEach((option) => {
    const subOptions = Array.isArray(option?.subOptions) ? option.subOptions : [];
    subOptions.forEach((subOption) => {
      const value = typeof subOption?.value === 'string' && subOption.value
        ? subOption.value
        : resolveLocalizedText(subOption?.label, language);
      const label = resolveLocalizedText(subOption?.label, language) || value;
      if (value) {
        map.set(value, label);
      }
    });
  });

  return map;
};

// Valeurs « sélectionnées » d'une réponse, sous-options comprises : normalizeAnswerForComparison
// aplatit déjà l'objet {values, children} du questionnaire en un tableau de valeurs, qui est
// exactement ce que le moteur compare (cf. matchesCondition).
const collectSelectedValues = (rawAnswer) => {
  const normalized = normalizeAnswerForComparison(rawAnswer);
  const values = Array.isArray(normalized) ? normalized : [normalized];
  return values
    .filter((value) => typeof value === 'string' && value.trim() !== '')
    .filter((value, index, all) => all.indexOf(value) === index);
};

const buildCandidateId = (questionId, value) => `${questionId}::${value}`;

export const buildConditionCandidates = (answers, questions, options = {}) => {
  const language = options.language || DEFAULT_LANGUAGE;
  const safeAnswers = answers && typeof answers === 'object' ? answers : {};
  const safeQuestions = Array.isArray(questions) ? questions : [];
  const candidates = [];

  safeQuestions.forEach((question, questionIndex) => {
    if (!question || typeof question.id !== 'string' || question.id === '') {
      return;
    }

    const questionLabel = resolveLocalizedText(question.question, language) || question.id;
    const questionType = question.type || 'choice';

    if (CANDIDATE_QUESTION_TYPES.has(questionType)) {
      const rawAnswer = safeAnswers[question.id];

      if (isAnswered(rawAnswer)) {
        if (questionType === 'choice' || questionType === 'multi_choice') {
          const labels = buildOptionLabelMap(question, language);
          collectSelectedValues(rawAnswer).forEach((value) => {
            candidates.push({
              id: buildCandidateId(question.id, value),
              questionId: question.id,
              questionIndex,
              questionLabel,
              questionType,
              operator: 'equals',
              operatorOptions: getOperatorOptionsForType(questionType),
              value,
              valueLabel: labels.get(value) || value
            });
          });
        } else if (questionType === 'boolean') {
          const value = rawAnswer === true || rawAnswer === 'true' ? 'true' : 'false';
          candidates.push({
            id: buildCandidateId(question.id, value),
            questionId: question.id,
            questionIndex,
            questionLabel,
            questionType,
            operator: 'equals',
            operatorOptions: getOperatorOptionsForType(questionType),
            value,
            valueLabel: value === 'true' ? '✓' : '✗'
          });
        } else {
          const value = String(rawAnswer);
          // Un nombre est proposé en seuil, pas en égalité : « budget = 120 » ne décrit aucune
          // politique, et le moteur compare `equals` strictement (120 !== '120'), donc une
          // égalité construite ici ne se déclencherait même pas sur le projet dont elle sort.
          const operator = questionType === 'number' ? 'gte' : 'equals';
          candidates.push({
            id: buildCandidateId(question.id, value),
            questionId: question.id,
            questionIndex,
            questionLabel,
            questionType,
            operator,
            operatorOptions: getOperatorOptionsForType(questionType),
            value,
            valueLabel: value
          });
        }
      }
    }

    // Case à cocher additionnelle : clé sœur de la question, sélectionnable comme condition
    // au même titre qu'une vraie question (cf. getConditionQuestionEntries).
    const extraCheckbox = question.extraCheckbox;
    const extraLabel = resolveLocalizedText(extraCheckbox?.label, language).trim();
    if (extraCheckbox?.enabled && extraLabel !== '') {
      const extraId = buildExtraCheckboxQuestionId(question.id);
      if (isAnswered(safeAnswers[extraId])) {
        const value = safeAnswers[extraId] === true || safeAnswers[extraId] === 'true' ? 'true' : 'false';
        candidates.push({
          id: buildCandidateId(extraId, value),
          questionId: extraId,
          questionIndex,
          questionLabel: `${questionLabel} · ${extraLabel}`,
          questionType: 'boolean',
          operator: 'equals',
          operatorOptions: getOperatorOptionsForType('boolean'),
          value,
          valueLabel: value === 'true' ? '✓' : '✗'
        });
      }
    }
  });

  return candidates;
};

export const buildDraftConditionGroups = (selectedCandidates, options = {}) => {
  const mode = options.mode === 'any' ? 'any' : 'all';
  const perQuestionLogic = options.perQuestionLogic || {};
  const safeCandidates = Array.isArray(selectedCandidates)
    ? selectedCandidates.filter((candidate) => candidate && candidate.questionId)
    : [];

  if (safeCandidates.length === 0) {
    return [];
  }

  const toCondition = (candidate) => ({
    type: 'question',
    question: candidate.questionId,
    operator: candidate.operator || 'equals',
    value: candidate.value
  });

  if (mode === 'any') {
    return [{ logic: 'any', conditions: safeCandidates.map(toCondition) }];
  }

  // Un groupe par question, combinés en ET : deux valeurs d'une même question ne peuvent pas
  // être vraies en même temps sur une question à choix unique, et sur un choix multiple c'est
  // « l'une de ces valeurs » que l'expert veut dans la quasi-totalité des cas. Un ET global
  // produirait une règle qui ne se déclenche jamais.
  const groupsByQuestion = new Map();
  safeCandidates.forEach((candidate) => {
    if (!groupsByQuestion.has(candidate.questionId)) {
      groupsByQuestion.set(candidate.questionId, []);
    }
    groupsByQuestion.get(candidate.questionId).push(toCondition(candidate));
  });

  return Array.from(groupsByQuestion.entries()).map(([questionId, conditions]) => ({
    logic: conditions.length > 1 && perQuestionLogic[questionId] === 'all' ? 'all' : 'any',
    conditions
  }));
};

export const matchesConditionGroups = (conditionGroups, answers) => {
  const groups = Array.isArray(conditionGroups) ? conditionGroups : [];
  if (groups.length === 0) {
    return true;
  }

  return Boolean(evaluateRule({ conditionGroups: groups }, answers || {}).triggered);
};

export const countMatchingSamples = (conditionGroups, samples) => {
  const safeSamples = Array.isArray(samples) ? samples : [];
  const matching = safeSamples.filter((sample) => matchesConditionGroups(conditionGroups, sample?.answers));

  return { matching, total: safeSamples.length, count: matching.length };
};

// Répartit chaque candidat dans l'une des trois classes qui disent à l'expert, sans score
// inventé, ce que la condition apporte : elle sépare le corpus (discriminante), elle ne vise
// que ce projet-là (spécifique) ou elle est vraie partout et n'apporte rien (universelle).
export const classifyCandidate = (candidate, samples) => {
  const groups = buildDraftConditionGroups([candidate], { mode: 'all' });
  const { count, total } = countMatchingSamples(groups, samples);

  if (total === 0) {
    return { tier: CANDIDATE_TIERS.DISCRIMINANT, count, total };
  }

  if (count >= total) {
    return { tier: CANDIDATE_TIERS.UNIVERSAL, count, total };
  }

  if (count <= 1) {
    return { tier: CANDIDATE_TIERS.SPECIFIC, count, total };
  }

  return { tier: CANDIDATE_TIERS.DISCRIMINANT, count, total };
};

export const annotateCandidates = (candidates, samples) => {
  const safeCandidates = Array.isArray(candidates) ? candidates : [];
  return safeCandidates.map((candidate) => ({ ...candidate, ...classifyCandidate(candidate, samples) }));
};

export const sortCandidates = (candidates, sortMode = 'questionnaire') => {
  const safeCandidates = Array.isArray(candidates) ? [...candidates] : [];

  if (sortMode !== 'relevance') {
    return safeCandidates.sort((a, b) => (a.questionIndex - b.questionIndex) || a.value.localeCompare(b.value));
  }

  return safeCandidates.sort((a, b) => {
    const tierDiff = (TIER_RANK[a.tier] ?? 0) - (TIER_RANK[b.tier] ?? 0);
    if (tierDiff !== 0) {
      return tierDiff;
    }
    return (a.questionIndex - b.questionIndex) || a.value.localeCompare(b.value);
  });
};

// Décrit les groupes réellement produits, pour que l'aperçu montre la structure que le moteur
// va évaluer — et non la liste à plat des cases cochées. Deux valeurs d'une même question
// forment un « ou » à l'intérieur d'un groupe : les afficher séparées par « et » (ce que faisait
// un rendu à plat) décrit une règle qui ne se déclencherait jamais sur une question à choix unique.
export const describeDraftGroups = (conditionGroups, candidates) => {
  const groups = Array.isArray(conditionGroups) ? conditionGroups : [];
  const byKey = new Map(
    (Array.isArray(candidates) ? candidates : []).map((candidate) => [
      buildCandidateId(candidate.questionId, candidate.value),
      candidate
    ])
  );

  return groups
    .map((group) => {
      const conditions = Array.isArray(group && group.conditions) ? group.conditions : [];
      const items = conditions.map((condition) => {
        const candidate = byKey.get(buildCandidateId(condition.question, condition.value));
        return {
          id: buildCandidateId(condition.question, condition.value),
          questionLabel: candidate?.questionLabel || condition.question,
          valueLabel: candidate?.valueLabel || String(condition.value),
          operator: condition.operator || 'equals'
        };
      });

      return { logic: group.logic === 'all' ? 'all' : 'any', items };
    })
    .filter((group) => group.items.length > 0);
};
