import { normalizeEmail } from './normalizeEmail.js';
import { normalizeTeamContacts } from './teamContacts.js';

// Le parcours « Revoir et valider un projet » montre la synthèse telle qu'un expert la voit, sur
// le projet d'exemple. Rien ici n'est jamais persisté : l'équipe où l'utilisateur est ajouté comme
// contact n'existe que dans les props de l'écran, le temps des étapes `expert-*`.
export const EXPERT_TOUR_STEP_PREFIX = 'expert-';
export const EXPERT_TOUR_PROJECT_ID = 'onboarding-expert-demo';

export const EXPERT_TOUR_STAGE_OPEN = 'open';
export const EXPERT_TOUR_STAGE_CLAIMED = 'claimed';
export const EXPERT_TOUR_STAGE_REVIEW = 'review';

const COMPLIANCE_COMMENTS_KEY = '__compliance_team_comments__';

export const isExpertTourStep = (stepId) =>
  typeof stepId === 'string' && stepId.startsWith(EXPERT_TOUR_STEP_PREFIX);

// L'équipe déjà tenue par l'utilisateur si le projet d'exemple la déclenche, sinon la première :
// un expert reconnaît mieux sa propre carte.
export const pickExpertTourTeamId = (relevantTeams, userEmail) => {
  const list = Array.isArray(relevantTeams) ? relevantTeams.filter((team) => team?.id) : [];
  const email = normalizeEmail(userEmail);
  const own = email
    ? list.find((team) => normalizeTeamContacts(team).some((contact) => normalizeEmail(contact) === email))
    : null;
  return (own || list[0])?.id || '';
};

export const buildExpertTourTeams = (teams, teamId, userEmail) => {
  const email = normalizeEmail(userEmail);
  if (!Array.isArray(teams) || !teamId || !email) {
    return teams;
  }
  return teams.map((team) => {
    if (team?.id !== teamId) {
      return team;
    }
    const contacts = normalizeTeamContacts(team);
    if (contacts.some((contact) => normalizeEmail(contact) === email)) {
      return team;
    }
    return { ...team, contacts: [email, ...contacts] };
  });
};

const DEMO_FORM_URL = `data:text/plain;charset=utf-8,${encodeURIComponent('Questionnaire complémentaire — exemple')}`;

// `messages` porte les textes déjà traduits : { ownerName, ownerReply, expertQuestion,
// formName, opinion }.
export const buildExpertTourAnswers = (answers, {
  teamId,
  userEmail,
  userName = '',
  stage = EXPERT_TOUR_STAGE_OPEN,
  messages = {},
  now = new Date().toISOString()
} = {}) => {
  const base = answers && typeof answers === 'object' ? answers : {};
  if (!teamId) {
    return { ...base };
  }
  const email = normalizeEmail(userEmail);
  const comments = base[COMPLIANCE_COMMENTS_KEY] && typeof base[COMPLIANCE_COMMENTS_KEY] === 'object'
    ? base[COMPLIANCE_COMMENTS_KEY]
    : {};

  const replies = [
    {
      id: 'expert-tour-owner-reply',
      message: messages.ownerReply || '',
      authorName: messages.ownerName || '',
      authorEmail: '',
      createdAt: now
    },
    {
      id: 'expert-tour-expert-question',
      message: messages.expertQuestion || '',
      authorName: userName || email,
      authorEmail: email,
      createdAt: now,
      attachments: [{
        id: 'expert-tour-form',
        name: messages.formName || 'questionnaire.txt',
        url: DEMO_FORM_URL,
        type: 'text/plain',
        size: 0
      }]
    }
  ];

  const entry = { comment: '', status: '', replies };
  if (stage !== EXPERT_TOUR_STAGE_OPEN && email) {
    entry.claim = { assigneeEmail: email, assigneeName: userName, assignedAt: now, assignedByEmail: email };
  }
  if (stage === EXPERT_TOUR_STAGE_REVIEW) {
    entry.comment = messages.opinion || '';
    entry.status = 'validated_with_conditions';
    entry.statusUpdatedAt = now;
    entry.reviewedVersion = 1;
    entry.needsReviewSince = 2;
  }

  return {
    ...base,
    [COMPLIANCE_COMMENTS_KEY]: {
      ...comments,
      teams: { ...(comments.teams || {}), [teamId]: entry }
    }
  };
};
