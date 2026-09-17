// Gabarits des notifications envoyées via CN_NotificationsQueue puis Power Automate.
// Les e-mails de notification doivent être rédigés en anglais (contrainte Power Automate).
// Chaque message répond à trois questions pour son destinataire : ce qui s’est passé,
// ce qu’on attend de lui, et pourquoi il reçoit ce message.
// Les définitions ne produisent que du texte brut ; l’échappement HTML est fait par le
// constructeur, pour qu’un nom de projet contenant « < » ne casse pas l’e-mail.

export const NOTIFICATION_TYPES = {
  PROJECT_SUBMITTED_TEAM: 'project-submitted-team',
  PROJECT_SUBMITTED_OWNER: 'project-submitted-owner',
  PROJECT_PRELIMINARY_TEAM: 'project-preliminary-team',
  PROJECT_PRELIMINARY_OWNER: 'project-preliminary-owner',
  PROJECT_UPDATED_TEAM: 'project-updated-team',
  PROJECT_PERIMETER_DROPPED_TEAM: 'project-perimeter-dropped-team',
  PROJECT_UPDATE_SENT_OWNER: 'project-update-sent-owner',
  FINAL_CONFIRMATION_REQUESTED: 'final-confirmation-requested',
  FINAL_CONFIRMATION_REMINDER: 'final-confirmation-reminder',
  FINAL_CONFIRMATION_REEXAMINING: 'final-confirmation-reexamining',
  PROJECT_LAUNCHED_WITHOUT_CONFIRMATION: 'project-launched-without-confirmation',
  PROJECT_SHARED: 'project-shared',
  SHOWCASE_COMMENT: 'showcase-comment',
  SHOWCASE_COMMENT_REPLY: 'showcase-comment-reply',
  SYNTHESIS_COMMENT_TO_OWNER: 'synthesis-comment-to-owner',
  SYNTHESIS_COMMENT_TO_TEAM: 'synthesis-comment-to-team',
  SYNTHESIS_COMMENT_REPLY: 'synthesis-comment-reply',
  COMMITTEE_REINTEGRATION: 'committee-reintegration',
  PERIMETER_CLAIMED: 'perimeter-claimed',
  PERIMETER_TAKEN_OVER: 'perimeter-taken-over',
  PERIMETER_RELEASED: 'perimeter-released',
  PERIMETER_STALE_REMINDER: 'perimeter-stale-reminder',
  TEAM_MANUALLY_REQUESTED: 'team-manually-requested'
};

const quoted = (value) => `"${value}"`;

export const NOTIFICATION_CATALOG = {
  [NOTIFICATION_TYPES.PROJECT_SUBMITTED_TEAM]: {
    actionType: 'Project submitted for review',
    intro: (ctx) =>
      `${ctx.actorName} submitted the project ${quoted(ctx.projectName)} for compliance review.`,
    expected: () => [
      'Open the project’s stakes page in Project Navigator.',
      'Assess the points that fall within your area and identify any potential blockers.',
      'Post your remarks directly in the project stakes page: the project owner will be notified automatically.'
    ],
    reason: (ctx) =>
      ctx.teamNames.length > 0
        ? `the qualification questionnaire identified your team (${ctx.teamNames.join(', ')}) as a stakeholder for this project.`
        : 'your team was identified as a stakeholder for this project.'
  },

  [NOTIFICATION_TYPES.PROJECT_SUBMITTED_OWNER]: {
    actionType: 'Submission confirmation',
    intro: (ctx) => `Your project ${quoted(ctx.projectName)} has been submitted successfully.`,
    expected: (ctx) => [
      'No immediate action is required from you.',
      ctx.teamNames.length > 0
        ? `The relevant compliance teams have been notified (${ctx.teamNames.join(', ')}) and will get back to you.`
        : 'The relevant compliance teams have been notified and will get back to you.',
      'You will receive an email as soon as a comment is posted on your project stakes page.'
    ],
    reason: () => 'you are the owner or co-owner of this project.'
  },

  // Une demande d'avis préliminaire n'attend pas le même travail qu'une demande de validation :
  // le dire explicitement est ce qui évite qu'un expert ouvre un avant-projet en croyant devoir
  // rendre un avis ferme sur un dossier incomplet — et qu'il conclue que l'outil lui fait perdre
  // son temps.
  [NOTIFICATION_TYPES.PROJECT_PRELIMINARY_TEAM]: {
    actionType: 'Request for preliminary advice',
    intro: (ctx) =>
      `${ctx.actorName} is asking for preliminary advice on the project ${quoted(ctx.projectName)}, which is still being shaped.`,
    expected: () => [
      'Open the project’s synthesis report in Project Navigator.',
      'The project is deliberately incomplete: what is expected is guidance, not a formal opinion — the points to watch, the questions to prepare, what would block the project as it stands.',
      'Post your guidance in the synthesis report: the project owner will be notified automatically.'
    ],
    reason: (ctx) =>
      ctx.teamNames.length > 0
        ? `the qualification questionnaire identified your team (${ctx.teamNames.join(', ')}) as a stakeholder for this project.`
        : 'your team was identified as a stakeholder for this project.'
  },

  [NOTIFICATION_TYPES.PROJECT_PRELIMINARY_OWNER]: {
    actionType: 'Preliminary advice requested',
    intro: (ctx) =>
      `Your request for preliminary advice on ${quoted(ctx.projectName)} has been sent.`,
    expected: (ctx) => [
      'You can keep working on your project: editing your answers does not cancel this request.',
      ctx.teamNames.length > 0
        ? `The relevant compliance teams have been notified (${ctx.teamNames.join(', ')}) and will get back to you with guidance.`
        : 'The relevant compliance teams have been notified and will get back to you with guidance.',
      'Preliminary guidance is not an approval: you will still have to request validation before launching.'
    ],
    reason: () => 'you are the owner or co-owner of this project.'
  },

  // Envoyée uniquement aux équipes dont la mise à jour change réellement quelque chose : c'est
  // la contrepartie indispensable du droit de modifier un projet déjà soumis. Une équipe que la
  // modification ne concerne pas ne reçoit rien, sans quoi la fonctionnalité se paierait en
  // volume d'e-mails et les experts se désabonneraient de fait.
  [NOTIFICATION_TYPES.PROJECT_UPDATED_TEAM]: {
    actionType: 'Project updated - review again',
    intro: (ctx) =>
      `${ctx.actorName} updated the project ${quoted(ctx.projectName)}, and the changes affect your area.`,
    expected: () => [
      'Open the synthesis report: the changes since your last review are listed there.',
      'Check whether your previous opinion still holds.',
      'Update your opinion in the synthesis report — until you do, it is flagged as pending re-review.'
    ],
    reason: () => 'the updated answers changed the rules that involve your team on this project.'
  },

  [NOTIFICATION_TYPES.PROJECT_PERIMETER_DROPPED_TEAM]: {
    actionType: 'Project no longer concerns your team',
    intro: (ctx) =>
      `After an update by ${ctx.actorName}, the project ${quoted(ctx.projectName)} no longer triggers any rule involving your team.`,
    expected: () => [
      'No action is required from you.',
      'Any opinion you had already given on this project no longer applies.',
      'You are told rather than silently removed, in case the change looks wrong to you.'
    ],
    reason: () => 'your team was involved in this project before its latest update.'
  },

  [NOTIFICATION_TYPES.PROJECT_UPDATE_SENT_OWNER]: {
    actionType: 'Update sent',
    intro: (ctx) => `Your update to ${quoted(ctx.projectName)} has been sent.`,
    expected: (ctx) => [
      ctx.teamNames.length > 0
        ? `Only the teams your changes actually affect were notified (${ctx.teamNames.join(', ')}).`
        : 'No team was affected by your changes, so nobody was notified.',
      'The other teams keep their opinion and were deliberately left alone.',
      'You can keep working on your project: send another update whenever it changes again.'
    ],
    reason: () => 'you are the owner or co-owner of this project.'
  },

  // Ce qu'on demande ici n'est pas de tout relire : c'est de confirmer un avis au vu de ce qui a
  // changé. Le dire explicitement est ce qui garde le cas nominal à deux minutes — sinon le
  // dernier tour devient le goulot qui dissuade les porteurs de faire évoluer leur projet.
  [NOTIFICATION_TYPES.FINAL_CONFIRMATION_REQUESTED]: {
    actionType: 'Final confirmation requested',
    intro: (ctx) =>
      `${ctx.actorName} is about to launch ${quoted(ctx.projectName)} and asks you to confirm the opinion you already gave.`,
    expected: () => [
      'Open the synthesis report: your previous opinion and everything that changed since are shown side by side.',
      'If your opinion still holds, one click on “I confirm my opinion” is enough — you are not asked to review the whole project again.',
      'If something changed that you need to look at, choose “I need to review again” and update your opinion.'
    ],
    reason: () => 'you gave an opinion on this project, and its owner is now asking to launch it.'
  },

  [NOTIFICATION_TYPES.FINAL_CONFIRMATION_REMINDER]: {
    actionType: 'Launch approaching',
    intro: (ctx) =>
      `The launch date you gave for ${quoted(ctx.projectName)} is approaching, and no final confirmation has been requested yet.`,
    expected: () => [
      'Open the project and request the final confirmation from the synthesis report.',
      'The teams that already gave an opinion are only asked to confirm it, which takes them a couple of minutes.',
      'Nothing prevents you from launching without it — but the project will be flagged as launched without confirmation.'
    ],
    reason: () => 'you are the owner or co-owner of this project, and you declared its launch date.'
  },

  [NOTIFICATION_TYPES.FINAL_CONFIRMATION_REEXAMINING]: {
    actionType: 'Final confirmation - review needed',
    intro: (ctx) =>
      `${ctx.actorName} cannot confirm their opinion on ${quoted(ctx.projectName)} as it stands and needs to review it again.`,
    expected: () => [
      'No action is required from you right now.',
      'The expert will come back to you through the synthesis report.',
      'The final confirmation stays open until they have updated their opinion.'
    ],
    reason: () => 'you requested the final confirmation for this project.'
  },

  // Le seul message de tout ce dispositif qui constate un manquement — et il n'est envoyé que
  // parce que quelqu'un a déclaré le lancement, jamais parce qu'une date prévisionnelle est
  // passée. Sans cette distinction, le reproche tomberait sur les porteurs les plus sérieux,
  // ceux qui attendent précisément leur confirmation pour partir.
  [NOTIFICATION_TYPES.PROJECT_LAUNCHED_WITHOUT_CONFIRMATION]: {
    actionType: 'Project launched without final confirmation',
    intro: (ctx) =>
      `${ctx.actorName} recorded that ${quoted(ctx.projectName)} has launched, while the final confirmation was still open.`,
    expected: (ctx) => [
      ctx.teamNames.length > 0
        ? `These areas had not confirmed their opinion: ${ctx.teamNames.join(', ')}.`
        : 'Some areas had not confirmed their opinion.',
      'Open the synthesis report to see where the project stands.',
      'Nothing could have prevented the launch — this notice exists so that it is not discovered later.'
    ],
    reason: () => 'you are involved in the compliance review of this project.'
  },

  [NOTIFICATION_TYPES.PROJECT_SHARED]: {
    actionType: 'Added as co-owner',
    intro: (ctx) =>
      `${ctx.actorName} added you as a co-owner of the project ${quoted(ctx.projectName)}.`,
    expected: () => [
      'Open the project to review the answers already entered.',
      'Complete or correct the elements that fall within your area.',
      'You will now receive all notifications related to this project.'
    ],
    reason: (ctx) => `${ctx.actorName} designated you as a co-owner of this project.`
  },

  [NOTIFICATION_TYPES.SHOWCASE_COMMENT]: {
    actionType: 'Comment on the showcase',
    intro: (ctx) =>
      `${ctx.actorName} posted a comment on the showcase of the project ${quoted(ctx.projectName)}.`,
    expected: () => [
      'Read the comment from the project showcase.',
      'Reply in the discussion thread: the comment’s author will be notified.',
      'Update the project if the remark calls for a change.'
    ],
    reason: () => 'you are the owner or co-owner of this project.'
  },

  [NOTIFICATION_TYPES.SHOWCASE_COMMENT_REPLY]: {
    actionType: 'Reply to your comment',
    intro: (ctx) =>
      `${ctx.actorName} replied to your comment on the showcase of the project ${quoted(ctx.projectName)}.`,
    expected: () => [
      'Review the reply.',
      'Continue the exchange in the discussion thread if the point is not resolved.'
    ],
    reason: () => 'you are the author of the last message in this discussion thread.'
  },

  [NOTIFICATION_TYPES.SYNTHESIS_COMMENT_TO_OWNER]: {
    actionType: 'Compliance comment on your report',
    intro: (ctx) =>
      `${ctx.actorName} posted a comment on the project stakes page of the project ${quoted(ctx.projectName)}.`,
    expected: () => [
      'Open the project stakes page and read the comment.',
      'Provide the requested clarifications or adjust the project accordingly.',
      'Reply in the discussion thread: the compliance team will be notified of your reply.'
    ],
    reason: () => 'you are the owner or co-owner of this project.'
  },

  [NOTIFICATION_TYPES.SYNTHESIS_COMMENT_TO_TEAM]: {
    actionType: 'Reply from the project owner',
    intro: (ctx) =>
      `${ctx.actorName} replied on the project stakes page of the project ${quoted(ctx.projectName)}.`,
    expected: () => [
      'Review the project owner’s reply.',
      'Confirm that the point is resolved, or continue the exchange in the discussion thread.'
    ],
    reason: (ctx) =>
      ctx.teamNames.length > 0
        ? `your team (${ctx.teamNames.join(', ')}) posted a comment on this project stakes page.`
        : 'your team posted a comment on this project stakes page.'
  },

  [NOTIFICATION_TYPES.SYNTHESIS_COMMENT_REPLY]: {
    actionType: 'Reply to your comment',
    intro: (ctx) =>
      `${ctx.actorName} replied to your comment on the project stakes page of the project ${quoted(ctx.projectName)}.`,
    expected: () => [
      'Review the reply.',
      'Continue the exchange in the discussion thread if the point is not resolved.'
    ],
    reason: () => 'you are the author of the last message in this discussion thread.'
  },

  [NOTIFICATION_TYPES.COMMITTEE_REINTEGRATION]: {
    actionType: 'Reintegrated into the validation committee',
    intro: (ctx) =>
      `${ctx.actorName} reintegrated the project ${quoted(ctx.projectName)} into the validation committee.`,
    expected: () => [
      'Check that the file is complete before the committee review.',
      'Prepare the presentation materials expected by the committee.'
    ],
    reason: () => 'you are the owner or co-owner of this project.'
  },

  // Annonce de prise en charge : envoyée uniquement aux membres de l'équipe qui ont demandé à
  // être copiés (case décochée par défaut dans leur profil). Elle ne couvre que cet événement,
  // jamais les échanges qui suivront — sinon la case cochée ramène le volume d'e-mails que la
  // prise en charge est censée supprimer.
  [NOTIFICATION_TYPES.PERIMETER_CLAIMED]: {
    actionType: 'Project taken in charge',
    intro: (ctx) =>
      ctx.teamNames.length > 0
        ? `${ctx.actorName} is now handling the project ${quoted(ctx.projectName)} for ${ctx.teamNames.join(', ')}.`
        : `${ctx.actorName} is now handling the project ${quoted(ctx.projectName)}.`,
    expected: () => [
      'Nothing is expected from you: this message is a copy, for information only.',
      'The project has left your "To review" list and further exchanges will go to the person handling it.',
      'You can still open the project, comment on it, or take it over from Project Navigator.'
    ],
    reason: () =>
      'you asked to be copied when a colleague takes charge of a project for this team. You can turn this off in "My profile".'
  },

  [NOTIFICATION_TYPES.PERIMETER_TAKEN_OVER]: {
    actionType: 'Project review taken over',
    intro: (ctx) =>
      ctx.teamNames.length > 0
        ? `${ctx.actorName} took over the review of the project ${quoted(ctx.projectName)} for ${ctx.teamNames.join(', ')}.`
        : `${ctx.actorName} took over the review of the project ${quoted(ctx.projectName)}.`,
    expected: () => [
      'Check the reason given for the take-over and the current state of the review.',
      'Pass on anything the new reviewer needs to know, in the project discussion thread.',
      'Take the project back from Project Navigator if the take-over was a mistake.'
    ],
    reason: () => 'you were handling this project, or you are a contact of the team concerned.'
  },

  [NOTIFICATION_TYPES.PERIMETER_RELEASED]: {
    actionType: 'Project back in the team queue',
    intro: (ctx) =>
      ctx.teamNames.length > 0
        ? `${ctx.actorName} released the project ${quoted(ctx.projectName)}: it is back in the queue for ${ctx.teamNames.join(', ')}.`
        : `${ctx.actorName} released the project ${quoted(ctx.projectName)}: it is back in the team queue.`,
    expected: () => [
      'The project is in your "To review" list again.',
      'Take it in charge in Project Navigator if it falls within your area.'
    ],
    reason: () => 'you are a contact of the team concerned by this project.'
  },

  [NOTIFICATION_TYPES.PERIMETER_STALE_REMINDER]: {
    actionType: 'Reminder: project waiting for your review',
    intro: (ctx) =>
      ctx.teamNames.length > 0
        ? `You are handling the project ${quoted(ctx.projectName)} for ${ctx.teamNames.join(', ')}, and no action has been recorded on it for a while.`
        : `You are handling the project ${quoted(ctx.projectName)}, and no action has been recorded on it for a while.`,
    expected: () => [
      'Open the project stakes page and post your review, or update the compliance status.',
      'Release the project so that another member of your team can pick it up, if you cannot handle it.'
    ],
    reason: () => 'you took this project in charge for your team and it is still waiting.'
  },

  // Une équipe que le moteur de règles n'avait pas identifiée peut être ajoutée à la main par
  // le porteur de projet ou un expert Compliance (cf. manualTeamRequests.js) : elle reçoit
  // cette notification comme si elle avait été déclenchée normalement.
  [NOTIFICATION_TYPES.TEAM_MANUALLY_REQUESTED]: {
    actionType: 'Team requested for review',
    intro: (ctx) =>
      `${ctx.actorName} added your team to the review of the project ${quoted(ctx.projectName)}.`,
    expected: () => [
      'Open the project’s stakes page in Project Navigator.',
      'Assess the points that fall within your area and identify any potential blockers.',
      'Post your remarks directly in the project stakes page: the project owner will be notified automatically.'
    ],
    reason: () => 'your team was not identified automatically and was added manually to this project.'
  }
};

export const escapeHtml = (value) =>
  String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const buildNotificationSubject = (projectName, actionType) => {
  const safeProjectName =
    typeof projectName === 'string' && projectName.trim().length > 0
      ? projectName.trim()
      : 'Untitled project';
  const safeActionType =
    typeof actionType === 'string' && actionType.trim().length > 0
      ? actionType.trim()
      : 'Notification';
  return `[Project Navigator] ${safeProjectName} - ${safeActionType}`;
};

export const formatDate = (isoDate) => {
  if (!isoDate) {
    return '';
  }
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (value) => String(value).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} at ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const factRow = (label, value) =>
  `<tr><td style="padding:4px 12px 4px 0;color:#555;white-space:nowrap">${escapeHtml(label)}</td>` +
  `<td style="padding:4px 0;color:#111"><strong>${escapeHtml(value)}</strong></td></tr>`;

export const truncate = (value, max = 600) => {
  const text = String(value || '').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

export const buildNotification = ({
  type,
  projectName,
  projectId = '',
  actorName,
  actorEmail = '',
  ownerEmail = '',
  teamNames = [],
  excerpt = '',
  appUrl = '',
  occurredAt = ''
} = {}) => {
  const definition = NOTIFICATION_CATALOG[type];
  if (!definition) {
    throw new Error(`Type de notification inconnu : ${type}`);
  }

  const context = {
    projectName:
      typeof projectName === 'string' && projectName.trim() ? projectName.trim() : 'Untitled project',
    projectId,
    actorName: typeof actorName === 'string' && actorName.trim() ? actorName.trim() : 'A user',
    actorEmail,
    ownerEmail,
    teamNames: Array.isArray(teamNames) ? teamNames.filter(Boolean) : []
  };

  const facts = [['Project', context.projectName]];
  if (context.ownerEmail) {
    facts.push(['Project owner', context.ownerEmail]);
  }
  facts.push(['Action performed by', context.actorEmail || context.actorName]);
  if (context.teamNames.length > 0) {
    facts.push(['Teams involved', context.teamNames.join(', ')]);
  }
  const formattedDate = formatDate(occurredAt);
  if (formattedDate) {
    facts.push(['Date', formattedDate]);
  }

  const excerptText = truncate(excerpt);
  const excerptBlock = excerptText
    ? `<p style="margin:16px 0 4px;color:#555">Message content:</p>` +
      `<blockquote style="margin:0;padding:10px 14px;border-left:3px solid #cbd5e1;background:#f8fafc;color:#111">${escapeHtml(
        excerptText
      ).replace(/\n/g, '<br>')}</blockquote>`
    : '';

  const linkBlock = appUrl
    ? `<p style="margin:20px 0"><a href="${escapeHtml(appUrl)}" style="color:#1d4ed8">Open the project in Project Navigator</a></p>`
    : '';

  const body =
    '<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;line-height:1.5;color:#111">' +
    '<p>Hello,</p>' +
    `<p>${escapeHtml(definition.intro(context))}</p>` +
    excerptBlock +
    linkBlock +
    `<table role="presentation" style="border-collapse:collapse;margin:16px 0">${facts
      .map(([label, value]) => factRow(label, value))
      .join('')}</table>` +
    '<p style="margin:16px 0 6px"><strong>What is expected of you</strong></p>' +
    `<ul style="margin:0 0 8px;padding-left:20px">${definition
      .expected(context)
      .map((line) => `<li style="margin:4px 0">${escapeHtml(line)}</li>`)
      .join('')}</ul>` +
    '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px">' +
    `<p style="font-size:12px;color:#666;margin:0">Why are you receiving this message? Because ${escapeHtml(
      definition.reason(context)
    )}</p>` +
    '<p style="font-size:12px;color:#666;margin:6px 0 0">Automated message sent by Project Navigator. Please do not reply to this email: use the discussion threads in the application to communicate.</p>' +
    '</div>';

  return {
    subject: buildNotificationSubject(context.projectName, definition.actionType),
    actionType: definition.actionType,
    body
  };
};

const ERROR_REPORT_ACTION_TYPE = 'Display error report';

const preformattedBlock = (label, value) =>
  value
    ? `<p style="margin:16px 0 4px;color:#555">${escapeHtml(label)}</p>` +
      `<pre style="margin:0;padding:10px 14px;border-radius:4px;background:#0f172a;color:#e2e8f0;font-size:12px;line-height:1.4;overflow:auto;white-space:pre-wrap">${escapeHtml(
        truncate(value, 4000)
      )}</pre>`
    : '';

// Gabarit distinct de buildNotification() ci-dessus : un plantage React n'a ni projet ni
// acteur métier, seulement un message, deux piles d'appels et l'écran où c'est arrivé.
// `isFollowUp` : le premier envoi part seul, automatiquement, dès que l'AppErrorBoundary
// intercepte le plantage (voir main.jsx) ; si l'utilisateur complète ensuite avec un
// commentaire via le bouton, ce second envoi le dit explicitement pour que l'équipe ne
// le compte pas comme un incident distinct du même crash.
export const buildErrorReportEmail = ({
  message = '',
  stack = '',
  componentStack = '',
  screenUrl = '',
  userEmail = '',
  userComment = '',
  occurredAt = '',
  isFollowUp = false
} = {}) => {
  const safeMessage =
    typeof message === 'string' && message.trim() ? message.trim() : 'Unknown error';
  const formattedDate = formatDate(occurredAt) || formatDate(new Date().toISOString());

  const facts = [['Screen', screenUrl || 'unknown']];
  if (userEmail) {
    facts.push(['Reported by', userEmail]);
  }
  if (formattedDate) {
    facts.push(['Date', formattedDate]);
  }

  const commentBlock = userComment
    ? '<p style="margin:16px 0 4px;color:#555">What the user was doing:</p>' +
      `<blockquote style="margin:0;padding:10px 14px;border-left:3px solid #cbd5e1;background:#f8fafc;color:#111">${escapeHtml(
        truncate(userComment, 1000)
      ).replace(/\n/g, '<br>')}</blockquote>`
    : '';

  const introLine = isFollowUp
    ? `<p>The user who hit this display error in Project Navigator added details: <strong>${escapeHtml(safeMessage)}</strong></p>`
    : `<p>A display error occurred in Project Navigator: <strong>${escapeHtml(safeMessage)}</strong></p>`;

  const body =
    '<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;line-height:1.5;color:#111">' +
    '<p>Hello,</p>' +
    introLine +
    commentBlock +
    `<table role="presentation" style="border-collapse:collapse;margin:16px 0">${facts
      .map(([label, value]) => factRow(label, value))
      .join('')}</table>` +
    preformattedBlock('Error stack', stack) +
    preformattedBlock('Component stack', componentStack) +
    '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px">' +
    '<p style="font-size:12px;color:#666;margin:0">Why are you receiving this message? Because you are listed as a Project Navigator technical contact.</p>' +
    '<p style="font-size:12px;color:#666;margin:6px 0 0">Automated message sent by Project Navigator. Please do not reply to this email.</p>' +
    '</div>';

  const subjectPrefix = isFollowUp ? 'Error report - details added' : 'Display error report';

  return {
    subject: `[Project Navigator] ${subjectPrefix} - ${truncate(safeMessage, 80)}`,
    actionType: isFollowUp ? `${ERROR_REPORT_ACTION_TYPE} (details added)` : ERROR_REPORT_ACTION_TYPE,
    body
  };
};
