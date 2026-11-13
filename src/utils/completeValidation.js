import { computeProjectValidationStatus, PROJECT_VALIDATION_VALIDATED } from './projectValidationStatus.js';
import { getTeamClaim, isTeamContact } from './projectClaims.js';
import { wantsCompleteValidationCopyForTeam } from './teamMemberProfile.js';
import { normalizeEmail } from './normalizeEmail.js';

// « Validation complète » : le projet passe à `validated` (tous les périmètres requis se sont
// prononcés favorablement, sur la version courante, hors demande préliminaire). Le message n'est
// envoyé qu'à la transition — jamais parce qu'un projet *est* validé, sans quoi chaque ouverture de
// l'app ou chaque enregistrement d'un avis déjà favorable le renverrait.
export const isCompleteValidationReached = (previousProject, nextProject, options = {}) => {
  if (!previousProject || !nextProject) {
    return false;
  }
  const previous = computeProjectValidationStatus(previousProject, options).status;
  const next = computeProjectValidationStatus(nextProject, options).status;
  return previous !== PROJECT_VALIDATION_VALIDATED && next === PROJECT_VALIDATION_VALIDATED;
};

// Les référents qui ont demandé, dans leur profil, à être prévenus d'une validation complète. Deux
// garde-fous : seule la personne qui s'est saisie du périmètre est concernée (pas toute l'équipe),
// et elle doit être encore contact de l'équipe — une prise en charge orpheline ne notifie personne.
export const resolveCompleteValidationCopyRecipients = (project, { teams = [], profiles = null } = {}) => {
  if (!project || !profiles) {
    return [];
  }

  const analysisTeamIds = Array.isArray(project.analysis?.teams) ? project.analysis.teams : [];
  const seen = new Set();
  const recipients = [];

  teams.forEach((team) => {
    if (!team?.id || !analysisTeamIds.includes(team.id)) {
      return;
    }
    const assignee = normalizeEmail(getTeamClaim(project, team.id)?.assigneeEmail);
    if (!assignee || seen.has(assignee)) {
      return;
    }
    if (!isTeamContact(team, assignee) || !wantsCompleteValidationCopyForTeam(profiles, assignee, team.id)) {
      return;
    }
    seen.add(assignee);
    recipients.push({ email: assignee, teamId: team.id });
  });

  return recipients;
};
