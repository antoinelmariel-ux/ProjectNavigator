// Gabarits des notifications envoyées via CN_NotificationsQueue puis Power Automate.
// Les e-mails de notification doivent être rédigés en anglais (contrainte Power Automate).
// Chaque message répond à trois questions pour son destinataire : ce qui s’est passé,
// ce qu’on attend de lui, et pourquoi il reçoit ce message.
// Les définitions ne produisent que du texte brut ; l’échappement HTML est fait par le
// constructeur, pour qu’un nom de projet contenant « < » ne casse pas l’e-mail.

export const NOTIFICATION_TYPES = {
  PROJECT_SUBMITTED_TEAM: 'project-submitted-team',
  PROJECT_SUBMITTED_OWNER: 'project-submitted-owner',
  PROJECT_SHARED: 'project-shared',
  SHOWCASE_COMMENT: 'showcase-comment',
  SHOWCASE_COMMENT_REPLY: 'showcase-comment-reply',
  SYNTHESIS_COMMENT_TO_OWNER: 'synthesis-comment-to-owner',
  SYNTHESIS_COMMENT_TO_TEAM: 'synthesis-comment-to-team',
  SYNTHESIS_COMMENT_REPLY: 'synthesis-comment-reply',
  COMMITTEE_REINTEGRATION: 'committee-reintegration'
};

const quoted = (value) => `"${value}"`;

export const NOTIFICATION_CATALOG = {
  [NOTIFICATION_TYPES.PROJECT_SUBMITTED_TEAM]: {
    actionType: 'Project submitted for review',
    intro: (ctx) =>
      `${ctx.actorName} submitted the project ${quoted(ctx.projectName)} for compliance review.`,
    expected: () => [
      'Open the project’s synthesis report in Project Navigator.',
      'Assess the points that fall within your area and identify any potential blockers.',
      'Post your remarks directly in the synthesis report: the project owner will be notified automatically.'
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
      'You will receive an email as soon as a comment is posted on your synthesis report.'
    ],
    reason: () => 'you are the owner or co-owner of this project.'
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
      `${ctx.actorName} posted a comment on the synthesis report of the project ${quoted(ctx.projectName)}.`,
    expected: () => [
      'Open the synthesis report and read the comment.',
      'Provide the requested clarifications or adjust the project accordingly.',
      'Reply in the discussion thread: the compliance team will be notified of your reply.'
    ],
    reason: () => 'you are the owner or co-owner of this project.'
  },

  [NOTIFICATION_TYPES.SYNTHESIS_COMMENT_TO_TEAM]: {
    actionType: 'Reply from the project owner',
    intro: (ctx) =>
      `${ctx.actorName} replied on the synthesis report of the project ${quoted(ctx.projectName)}.`,
    expected: () => [
      'Review the project owner’s reply.',
      'Confirm that the point is resolved, or continue the exchange in the discussion thread.'
    ],
    reason: (ctx) =>
      ctx.teamNames.length > 0
        ? `your team (${ctx.teamNames.join(', ')}) posted a comment on this synthesis report.`
        : 'your team posted a comment on this synthesis report.'
  },

  [NOTIFICATION_TYPES.SYNTHESIS_COMMENT_REPLY]: {
    actionType: 'Reply to your comment',
    intro: (ctx) =>
      `${ctx.actorName} replied to your comment on the synthesis report of the project ${quoted(ctx.projectName)}.`,
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

const formatDate = (isoDate) => {
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

const factRow = (label, value) =>
  `<tr><td style="padding:4px 12px 4px 0;color:#555;white-space:nowrap">${escapeHtml(label)}</td>` +
  `<td style="padding:4px 0;color:#111"><strong>${escapeHtml(value)}</strong></td></tr>`;

const truncate = (value, max = 600) => {
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
      )}</blockquote>`
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
