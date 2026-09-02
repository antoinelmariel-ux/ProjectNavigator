// Gabarits des notifications envoyées via CN_NotificationsQueue puis Power Automate.
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

const quoted = (value) => `« ${value} »`;

export const NOTIFICATION_CATALOG = {
  [NOTIFICATION_TYPES.PROJECT_SUBMITTED_TEAM]: {
    actionType: 'Projet soumis pour analyse',
    intro: (ctx) =>
      `${ctx.actorName} a soumis le projet ${quoted(ctx.projectName)} pour analyse compliance.`,
    expected: () => [
      'Ouvrir le rapport de synthèse du projet dans Project Navigator.',
      'Évaluer les points qui relèvent de votre périmètre et identifier les éventuels blocages.',
      'Déposer vos remarques directement dans le rapport de synthèse : le porteur du projet en sera notifié automatiquement.'
    ],
    reason: (ctx) =>
      ctx.teamNames.length > 0
        ? `le questionnaire de qualification a identifié votre équipe (${ctx.teamNames.join(', ')}) comme partie prenante de ce projet.`
        : 'votre équipe a été identifiée comme partie prenante de ce projet.'
  },

  [NOTIFICATION_TYPES.PROJECT_SUBMITTED_OWNER]: {
    actionType: 'Confirmation de soumission',
    intro: (ctx) => `Votre projet ${quoted(ctx.projectName)} a bien été soumis.`,
    expected: (ctx) => [
      'Aucune action immédiate n’est attendue de votre part.',
      ctx.teamNames.length > 0
        ? `Les équipes compliance concernées ont été prévenues (${ctx.teamNames.join(', ')}) et reviendront vers vous.`
        : 'Les équipes compliance concernées ont été prévenues et reviendront vers vous.',
      'Vous recevrez un e-mail dès qu’un commentaire sera déposé sur votre rapport de synthèse.'
    ],
    reason: () => 'vous êtes porteur ou co-porteur de ce projet.'
  },

  [NOTIFICATION_TYPES.PROJECT_SHARED]: {
    actionType: 'Ajout comme co-porteur',
    intro: (ctx) =>
      `${ctx.actorName} vous a ajouté comme co-porteur du projet ${quoted(ctx.projectName)}.`,
    expected: () => [
      'Ouvrir le projet pour prendre connaissance des réponses déjà saisies.',
      'Compléter ou corriger les éléments qui relèvent de votre périmètre.',
      'Vous recevrez désormais toutes les notifications liées à ce projet.'
    ],
    reason: (ctx) => `${ctx.actorName} vous a désigné comme co-porteur de ce projet.`
  },

  [NOTIFICATION_TYPES.SHOWCASE_COMMENT]: {
    actionType: 'Commentaire sur la vitrine',
    intro: (ctx) =>
      `${ctx.actorName} a déposé un commentaire sur la vitrine du projet ${quoted(ctx.projectName)}.`,
    expected: () => [
      'Lire le commentaire depuis la vitrine du projet.',
      'Y répondre dans le fil de discussion : l’auteur du commentaire sera notifié.',
      'Mettre à jour le projet si la remarque appelle une modification.'
    ],
    reason: () => 'vous êtes porteur ou co-porteur de ce projet.'
  },

  [NOTIFICATION_TYPES.SHOWCASE_COMMENT_REPLY]: {
    actionType: 'Réponse à votre commentaire',
    intro: (ctx) =>
      `${ctx.actorName} a répondu à votre commentaire sur la vitrine du projet ${quoted(ctx.projectName)}.`,
    expected: () => [
      'Prendre connaissance de la réponse.',
      'Poursuivre l’échange dans le fil de discussion si le point n’est pas clos.'
    ],
    reason: () => 'vous êtes l’auteur du dernier message de ce fil de discussion.'
  },

  [NOTIFICATION_TYPES.SYNTHESIS_COMMENT_TO_OWNER]: {
    actionType: 'Commentaire compliance sur votre rapport',
    intro: (ctx) =>
      `${ctx.actorName} a déposé un commentaire sur le rapport de synthèse du projet ${quoted(ctx.projectName)}.`,
    expected: () => [
      'Ouvrir le rapport de synthèse et lire le commentaire.',
      'Apporter les précisions demandées ou ajuster le projet en conséquence.',
      'Répondre dans le fil de discussion : l’équipe compliance sera notifiée de votre réponse.'
    ],
    reason: () => 'vous êtes porteur ou co-porteur de ce projet.'
  },

  [NOTIFICATION_TYPES.SYNTHESIS_COMMENT_TO_TEAM]: {
    actionType: 'Réponse du porteur de projet',
    intro: (ctx) =>
      `${ctx.actorName} a répondu sur le rapport de synthèse du projet ${quoted(ctx.projectName)}.`,
    expected: () => [
      'Prendre connaissance de la réponse du porteur de projet.',
      'Confirmer que le point est levé, ou poursuivre l’échange dans le fil de discussion.'
    ],
    reason: (ctx) =>
      ctx.teamNames.length > 0
        ? `votre équipe (${ctx.teamNames.join(', ')}) a déposé un commentaire sur ce rapport de synthèse.`
        : 'votre équipe a déposé un commentaire sur ce rapport de synthèse.'
  },

  [NOTIFICATION_TYPES.SYNTHESIS_COMMENT_REPLY]: {
    actionType: 'Réponse à votre commentaire',
    intro: (ctx) =>
      `${ctx.actorName} a répondu à votre commentaire sur le rapport de synthèse du projet ${quoted(ctx.projectName)}.`,
    expected: () => [
      'Prendre connaissance de la réponse.',
      'Poursuivre l’échange dans le fil de discussion si le point n’est pas clos.'
    ],
    reason: () => 'vous êtes l’auteur du dernier message de ce fil de discussion.'
  },

  [NOTIFICATION_TYPES.COMMITTEE_REINTEGRATION]: {
    actionType: 'Réintégration en comité de validation',
    intro: (ctx) =>
      `${ctx.actorName} a réintégré le projet ${quoted(ctx.projectName)} au comité de validation.`,
    expected: () => [
      'Vérifier que le dossier est complet avant le passage en comité.',
      'Préparer les éléments de présentation attendus par le comité.'
    ],
    reason: () => 'vous êtes porteur ou co-porteur de ce projet.'
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
      : 'Projet sans nom';
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
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} à ${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
      typeof projectName === 'string' && projectName.trim() ? projectName.trim() : 'Projet sans nom',
    projectId,
    actorName:
      typeof actorName === 'string' && actorName.trim() ? actorName.trim() : 'Un utilisateur',
    actorEmail,
    ownerEmail,
    teamNames: Array.isArray(teamNames) ? teamNames.filter(Boolean) : []
  };

  const facts = [['Projet', context.projectName]];
  if (context.ownerEmail) {
    facts.push(['Porteur du projet', context.ownerEmail]);
  }
  facts.push(['À l’origine de l’action', context.actorEmail || context.actorName]);
  if (context.teamNames.length > 0) {
    facts.push(['Équipes concernées', context.teamNames.join(', ')]);
  }
  const formattedDate = formatDate(occurredAt);
  if (formattedDate) {
    facts.push(['Date', formattedDate]);
  }

  const excerptText = truncate(excerpt);
  const excerptBlock = excerptText
    ? `<p style="margin:16px 0 4px;color:#555">Contenu du message :</p>` +
      `<blockquote style="margin:0;padding:10px 14px;border-left:3px solid #cbd5e1;background:#f8fafc;color:#111">${escapeHtml(
        excerptText
      )}</blockquote>`
    : '';

  const linkBlock = appUrl
    ? `<p style="margin:20px 0"><a href="${escapeHtml(appUrl)}" style="color:#1d4ed8">Ouvrir le projet dans Project Navigator</a></p>`
    : '';

  const body =
    '<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;line-height:1.5;color:#111">' +
    '<p>Bonjour,</p>' +
    `<p>${escapeHtml(definition.intro(context))}</p>` +
    excerptBlock +
    linkBlock +
    `<table role="presentation" style="border-collapse:collapse;margin:16px 0">${facts
      .map(([label, value]) => factRow(label, value))
      .join('')}</table>` +
    '<p style="margin:16px 0 6px"><strong>Ce qui est attendu de vous</strong></p>' +
    `<ul style="margin:0 0 8px;padding-left:20px">${definition
      .expected(context)
      .map((line) => `<li style="margin:4px 0">${escapeHtml(line)}</li>`)
      .join('')}</ul>` +
    '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px">' +
    `<p style="font-size:12px;color:#666;margin:0">Pourquoi recevez-vous ce message ? Parce que ${escapeHtml(
      definition.reason(context)
    )}</p>` +
    '<p style="font-size:12px;color:#666;margin:6px 0 0">Message automatique envoyé par Project Navigator. Merci de ne pas répondre à cet e-mail : utilisez les fils de discussion de l’application pour échanger.</p>' +
    '</div>';

  return {
    subject: buildNotificationSubject(context.projectName, definition.actionType),
    actionType: definition.actionType,
    body
  };
};
