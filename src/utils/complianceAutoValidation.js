import { resolveLocalizedText } from './localizedContent.js';
import { DEFAULT_LANGUAGE } from '../i18n/languages.js';

export const AUTO_VALIDATION_STATUS = 'validated_with_conditions';

// Une équipe déclenchée par une règle dont « Notifier l'équipe concernée lorsque cette règle
// se déclenche » est décoché n'est jamais notifiée : elle reste dans `analysis.teams` (c'est
// un périmètre du projet) mais jamais dans `analysis.notifiedTeams` (cf. analyzeAnswers dans
// rules.js). Personne côté expert n'ouvrira donc jamais ce projet pour y donner un avis.
// `notifiedTeams` n'est un tableau que lorsqu'il vient réellement d'analyzeAnswers ; une valeur
// absente (fixture de test, donnée figée d'avant cette fonctionnalité) signifie « information
// inconnue », jamais « équipe non notifiée ».
export const isTeamAutoValidated = (analysis, teamId) => {
  if (!teamId) {
    return false;
  }

  const teamIds = Array.isArray(analysis?.teams) ? analysis.teams : [];
  if (!teamIds.includes(teamId)) {
    return false;
  }

  if (!Array.isArray(analysis?.notifiedTeams)) {
    return false;
  }

  return !analysis.notifiedTeams.includes(teamId);
};

// Les « questions à préparer » que la règle définit pour cette équipe (rule.questions[teamId],
// cf. RuleEditor.jsx) sont le seul message compliance jamais écrit pour un périmètre qui ne
// sera jamais notifié : c'est ce texte qui tient lieu d'avis expert une fois le statut mis
// automatiquement à « validé sous conditions ».
export const getAutoValidationMessage = (analysis, teamId, language = DEFAULT_LANGUAGE) => {
  const entries = analysis?.questions && typeof analysis.questions === 'object'
    ? analysis.questions[teamId]
    : null;

  if (!Array.isArray(entries)) {
    return '';
  }

  return entries
    .map((entry) => {
      const text = typeof entry === 'string' ? entry : resolveLocalizedText(entry?.text, language);
      return typeof text === 'string' ? text.trim() : '';
    })
    .filter(Boolean)
    .join('\n\n');
};

const hasRealComplianceEntry = (entry) => {
  const status = typeof entry?.status === 'string' ? entry.status.trim() : '';
  const comment = typeof entry?.comment === 'string' ? entry.comment.trim() : '';
  return status.length > 0 || comment.length > 0;
};

// Renvoie l'entrée de commentaire compliance « effective » d'une équipe pour un projet : un
// vrai statut/commentaire déjà enregistré prend toujours le pas (même une seule fois notifiée
// puis retirée de la règle, l'avis existant reste affiché) ; sinon, pour une équipe jamais
// notifiée, un statut « validé sous conditions » synthétique est renvoyé avec le message
// compliance de la règle en guise de commentaire.
export const resolveEffectiveTeamComplianceEntry = (rawEntry, analysis, teamId, language = DEFAULT_LANGUAGE) => {
  if (hasRealComplianceEntry(rawEntry) || !isTeamAutoValidated(analysis, teamId)) {
    return rawEntry || null;
  }

  return {
    ...(rawEntry && typeof rawEntry === 'object' ? rawEntry : {}),
    status: AUTO_VALIDATION_STATUS,
    comment: getAutoValidationMessage(analysis, teamId, language),
    isAutoValidated: true
  };
};
