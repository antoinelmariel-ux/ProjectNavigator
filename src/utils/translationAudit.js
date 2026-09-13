import { SUPPORTED_LANGUAGES } from '../i18n/languages.js';
import { hasLocalizedContent, resolveLocalizedText } from './localizedContent.js';

// Un contenu est « traduit » pour une langue donnée dès que hasLocalizedContent() la trouve
// non vide — une chaîne héritée (pré-Phase 2, pas encore migrée en {en, fr, de, es}) ne compte
// donc comme traduite que pour le français, ce qui fait remonter les 3 autres langues comme
// manquantes : c'est le signal recherché (contenu jamais traduit).
export const getMissingLanguages = (value) =>
  SUPPORTED_LANGUAGES.filter((code) => !hasLocalizedContent(value, code));

const referenceLabel = (value) => {
  const text = resolveLocalizedText(value, 'fr') || resolveLocalizedText(value, 'en');
  if (!text) {
    return '';
  }
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
};

const pushItem = (items, { id, kind, refs, teamIds, contextLabel, value, multiline }) => {
  const missingLanguages = getMissingLanguages(value);
  if (missingLanguages.length === 0) {
    return;
  }
  items.push({
    id,
    kind,
    refs,
    teamIds: Array.isArray(teamIds) ? teamIds : [],
    contextLabel,
    referenceLabel: referenceLabel(value),
    value,
    multiline: Boolean(multiline),
    missingLanguages
  });
};

// Recense tous les champs {en, fr, de, es} du référentiel (questions, règles, équipes) et
// isole ceux auxquels il manque au moins une langue. `teamIds` vide signifie « contenu global »,
// visible uniquement des administrateurs dans l'onglet Traductions ; un tableau non vide
// signifie « concerne cette/ces équipe(s) », visible aussi par leurs contacts.
export const collectTranslationItems = ({ questions = [], rules = [], teams = [] } = {}) => {
  const items = [];

  questions.forEach((question) => {
    if (!question || typeof question !== 'object') {
      return;
    }
    const questionId = question.id;
    const questionLabel = referenceLabel(question.question) || questionId;

    pushItem(items, {
      id: `question:${questionId}:question`,
      kind: 'question',
      refs: { questionId },
      teamIds: [],
      contextLabel: questionLabel,
      value: question.question
    });

    (Array.isArray(question.options) ? question.options : []).forEach((option, optionIndex) => {
      pushItem(items, {
        id: `question:${questionId}:option:${optionIndex}`,
        kind: 'questionOption',
        refs: { questionId, optionIndex },
        teamIds: [],
        contextLabel: `${questionLabel} — option`,
        value: option?.label
      });
    });

    if (question.guidance) {
      pushItem(items, {
        id: `question:${questionId}:guidanceObjective`,
        kind: 'questionGuidanceObjective',
        refs: { questionId },
        teamIds: [],
        contextLabel: `${questionLabel} — objectif de l'aide`,
        value: question.guidance.objective,
        multiline: true
      });
      pushItem(items, {
        id: `question:${questionId}:guidanceDetails`,
        kind: 'questionGuidanceDetails',
        refs: { questionId },
        teamIds: [],
        contextLabel: `${questionLabel} — détail de l'aide`,
        value: question.guidance.details,
        multiline: true
      });
      (Array.isArray(question.guidance.tips) ? question.guidance.tips : []).forEach((tip, tipIndex) => {
        pushItem(items, {
          id: `question:${questionId}:guidanceTip:${tipIndex}`,
          kind: 'questionGuidanceTip',
          refs: { questionId, tipIndex },
          teamIds: [],
          contextLabel: `${questionLabel} — conseil`,
          value: tip,
          multiline: true
        });
      });
    }

    if (question.extraCheckbox) {
      pushItem(items, {
        id: `question:${questionId}:extraCheckbox`,
        kind: 'questionExtraCheckboxLabel',
        refs: { questionId },
        teamIds: [],
        contextLabel: `${questionLabel} — case complémentaire`,
        value: question.extraCheckbox.label
      });
    }

    if (question.otherOption) {
      pushItem(items, {
        id: `question:${questionId}:otherOption`,
        kind: 'questionOtherOptionLabel',
        refs: { questionId },
        teamIds: [],
        contextLabel: `${questionLabel} — option « Autre »`,
        value: question.otherOption.label
      });
    }

    if (question.rankingConfig) {
      pushItem(items, {
        id: `question:${questionId}:rankingTitle`,
        kind: 'questionRankingTitle',
        refs: { questionId },
        teamIds: [],
        contextLabel: `${questionLabel} — titre du classement`,
        value: question.rankingConfig.title
      });
      (Array.isArray(question.rankingConfig.criteria) ? question.rankingConfig.criteria : []).forEach(
        (criterion, criterionIndex) => {
          pushItem(items, {
            id: `question:${questionId}:rankingCriterion:${criterionIndex}`,
            kind: 'questionRankingCriterion',
            refs: { questionId, criterionIndex },
            teamIds: [],
            contextLabel: `${questionLabel} — critère de classement`,
            value: criterion?.label
          });
        }
      );
    }
  });

  rules.forEach((rule) => {
    if (!rule || typeof rule !== 'object') {
      return;
    }
    const ruleId = rule.id;
    const ruleTeamIds = Array.isArray(rule.teams) ? rule.teams : [];
    const ruleLabel = referenceLabel(rule.name) || ruleId;

    pushItem(items, {
      id: `rule:${ruleId}:name`,
      kind: 'ruleName',
      refs: { ruleId },
      teamIds: ruleTeamIds,
      contextLabel: `Règle « ${ruleLabel} » — nom`,
      value: rule.name
    });

    const questionsByTeam = rule.questions && typeof rule.questions === 'object' ? rule.questions : {};
    Object.entries(questionsByTeam).forEach(([teamId, teamQuestions]) => {
      (Array.isArray(teamQuestions) ? teamQuestions : []).forEach((teamQuestion, questionIndex) => {
        pushItem(items, {
          id: `rule:${ruleId}:question:${teamId}:${questionIndex}`,
          kind: 'ruleQuestion',
          refs: { ruleId, teamId, questionIndex },
          teamIds: [teamId],
          contextLabel: `Règle « ${ruleLabel} » — question pour l'équipe`,
          value: teamQuestion?.text,
          multiline: true
        });
      });
    });

    (Array.isArray(rule.risks) ? rule.risks : []).forEach((risk, riskIndex) => {
      const riskTeamIds = risk?.teamId ? [risk.teamId] : ruleTeamIds;
      pushItem(items, {
        id: `rule:${ruleId}:risk:${riskIndex}:description`,
        kind: 'risk',
        refs: { ruleId, riskIndex, field: 'description' },
        teamIds: riskTeamIds,
        contextLabel: `Règle « ${ruleLabel} » — description du risque`,
        value: risk?.description,
        multiline: true
      });
      pushItem(items, {
        id: `rule:${ruleId}:risk:${riskIndex}:mitigation`,
        kind: 'risk',
        refs: { ruleId, riskIndex, field: 'mitigation' },
        teamIds: riskTeamIds,
        contextLabel: `Règle « ${ruleLabel} » — mesure de mitigation`,
        value: risk?.mitigation,
        multiline: true
      });
    });
  });

  teams.forEach((team) => {
    if (!team || typeof team !== 'object') {
      return;
    }
    const teamLabel = referenceLabel(team.name) || team.id;
    pushItem(items, {
      id: `team:${team.id}:name`,
      kind: 'team',
      refs: { teamId: team.id, field: 'name' },
      teamIds: [team.id],
      contextLabel: `Équipe « ${teamLabel} » — nom`,
      value: team.name
    });
    pushItem(items, {
      id: `team:${team.id}:expertise`,
      kind: 'team',
      refs: { teamId: team.id, field: 'expertise' },
      teamIds: [team.id],
      contextLabel: `Équipe « ${teamLabel} » — domaine d'expertise`,
      value: team.expertise,
      multiline: true
    });
  });

  return items;
};

// Langues de réponse acceptées par une équipe/un comité : tableau vide ou absent = toutes les
// langues supportées sont acceptées (comportement historique, avant que quiconque ait renseigné
// ce réglage).
export const normalizeAcceptedLanguages = (value) => {
  const list = Array.isArray(value) ? value.filter((code) => SUPPORTED_LANGUAGES.includes(code)) : [];
  return list.length > 0 ? list : SUPPORTED_LANGUAGES.slice();
};

export const isLanguageAcceptedBy = (acceptedLanguages, language) =>
  normalizeAcceptedLanguages(acceptedLanguages).includes(language);
