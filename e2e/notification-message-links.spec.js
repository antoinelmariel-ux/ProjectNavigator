import { test, expect } from '@playwright/test';
import {
  collectConsoleErrors,
  createAndSubmitProject,
  goToProjectsHome,
  gotoHome,
  grantSelfComplianceExpertAndCommitteeAccess,
  openTriggeredProjectAndExpandTeam,
  patchStateOnBoot
} from './fixtures.js';

const OWNER_EMAIL = 'porteur.externe@lfb.fr';

// Le compte de test est expert de « Contrôle pub » ; le projet est confié à quelqu'un d'autre,
// sans quoi un avis rendu sur son propre projet ne préviendrait personne (l'auteur d'une
// action n'est jamais destinataire de son propre mail).
async function handProjectToAnotherOwner(page) {
  await patchStateOnBoot(page, (stored, ownerEmail) => {
    const state = stored || {};
    (Array.isArray(state.projects) ? state.projects : []).forEach((project) => {
      if (project?.status === 'submitted' && String(project.id || '').startsWith('project-')) {
        project.ownerEmail = ownerEmail;
        project.sharedWith = [];
      }
    });
    return state;
  }, OWNER_EMAIL);
  await page.reload();
  await expect(page.getByRole('button', { name: /À prendre \(1\)/ })).toBeVisible();
}

const COLLEAGUE_EMAIL = 'collegue.autre@lfb.fr';
// Seul contact de l'équipe « Contrôle pub » dans le référentiel par défaut.
const COLLEAGUE_EXPERT_EMAIL = 'laure.chevalier@lfb.fr';

async function seedThread(page, replies) {
  await patchStateOnBoot(page, (stored, seededReplies) => {
    const state = stored || {};
    (Array.isArray(state.projects) ? state.projects : []).forEach((project) => {
      if (project?.status === 'submitted' && String(project.id || '').startsWith('project-')) {
        project.answers = project.answers || {};
        const comments = project.answers.__compliance_team_comments__ || {};
        const teams = comments.teams || {};
        teams.controle_pub = {
          ...(teams.controle_pub || {}),
          replies: seededReplies.map((reply) => ({ ...reply, authorName: reply.authorEmail, createdAt: '2026-11-01T09:00:00.000Z' }))
        };
        project.answers.__compliance_team_comments__ = { ...comments, teams };
      }
    });
    return state;
  }, replies);
  await page.reload();
  await expect(page.getByRole('button', { name: /À prendre \(1\)/ })).toBeVisible();
}

async function sendThreadReply(page, text, { beforeSend } = {}) {
  await page.getByRole('button', { name: /Répondre/ }).first().click();
  if (beforeSend) {
    await beforeSend();
  }
  await page.locator('[contenteditable="true"]').last().click();
  await page.keyboard.type(text);
  await page.getByRole('button', { name: 'Envoyer la réponse' }).click();
}

const readMails = (page) => page.evaluate(() => window.__cnMockNotifications || []);

const lastMailTo = async (page, email) => {
  const mails = await readMails(page);
  return [...mails].reverse().find((mail) => mail.to.includes(email)) || null;
};

const extractReplyLink = (body) => {
  const match = body.match(/<a href="([^"]+)"[^>]*>Reply in Project Navigator<\/a>/);
  return match ? match[1].replace(/&amp;/g, '&') : null;
};

const isInViewport = (locator) => locator.evaluate((element) => {
  const rect = element.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
});

test.describe('Mails d’échange : le texte en tête, et un lien vers le message lui-même', () => {
  test('avis puis réponse de l’expert : mail au porteur et lien vers l’avis, puis vers la réponse', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await gotoHome(page);
    await grantSelfComplianceExpertAndCommitteeAccess(page);
    await createAndSubmitProject(page);
    await goToProjectsHome(page);
    await handProjectToAnotherOwner(page);
    await openTriggeredProjectAndExpandTeam(page, 'Contrôle pub');

    await page.getByRole('button', { name: /Modifier le commentaire/ }).first().click();
    await page.locator('select[id^="compliance-status-"]').first().selectOption('validated_with_conditions');
    await page.locator('[id^="compliance-comment-"][contenteditable="true"]').first().click();
    await page.keyboard.type('Merci de préciser le budget détaillé.');
    await page.getByRole('button', { name: 'Enregistrer le commentaire' }).click();

    await expect.poll(async () => (await lastMailTo(page, OWNER_EMAIL))?.body || '').toContain('budget détaillé');
    const opinionMail = await lastMailTo(page, OWNER_EMAIL);
    const body = opinionMail.body;
    const positions = {
      message: body.indexOf('Status: Validated with conditions<br>Merci de préciser le budget détaillé.'),
      warning: body.indexOf('Do not reply to this email.'),
      link: body.indexOf('Reply in Project Navigator'),
      hello: body.indexOf('Hello,')
    };
    Object.values(positions).forEach((index) => expect(index).toBeGreaterThan(-1));
    expect(positions.message).toBeLessThan(positions.warning);
    expect(positions.warning).toBeLessThan(positions.link);
    expect(positions.link).toBeLessThan(positions.hello);

    const opinionLink = new URL(extractReplyLink(body));
    expect(opinionLink.searchParams.get('view')).toBe('synthesis');
    expect(opinionLink.searchParams.get('focusKind')).toBe('team');
    expect(opinionLink.searchParams.get('focusId')).toBe('controle_pub');
    expect(opinionLink.searchParams.get('focusMessage')).toBe('opinion');

    // Une réponse dans le fil : c'est elle, et non l'avis, qui ouvre le mail suivant.
    const teamToggle = page.getByRole('button', { name: /Contrôle pub/ }).first();
    if ((await teamToggle.getAttribute('aria-expanded')) !== 'true') {
      await teamToggle.click();
    }
    await page.getByRole('button', { name: /Répondre/ }).first().click();
    await page.locator('[contenteditable="true"]').last().click();
    await page.keyboard.type('Pouvez-vous joindre le devis ?');
    await page.getByRole('button', { name: 'Envoyer la réponse' }).click();

    await expect.poll(async () => (await lastMailTo(page, OWNER_EMAIL))?.body || '').toContain('joindre le devis');
    const replyMail = await lastMailTo(page, OWNER_EMAIL);
    expect(replyMail.body.indexOf('Pouvez-vous joindre le devis ?')).toBeLessThan(replyMail.body.indexOf('Do not reply'));
    expect(replyMail.body).not.toContain('Status: Validated with conditions');
    const replyLink = new URL(extractReplyLink(replyMail.body));
    const replyId = replyLink.searchParams.get('focusMessage');
    expect(replyId).toMatch(/^reply-/);

    // Arrivée par le lien de l'avis : « Enjeux du projet », carte dépliée, avis cerné et visible.
    await page.waitForTimeout(600);
    await page.goto(opinionLink.toString());
    await expect(page.getByRole('heading', { name: 'Enjeux du projet' })).toBeVisible();
    const opinion = page.locator('#compliance-opinion-team-controle_pub');
    await expect(opinion).toHaveAttribute('data-cn-link-target', 'true');
    await expect.poll(() => isInViewport(opinion)).toBe(true);

    // Arrivée par le lien de la réponse : la réponse elle-même.
    await page.goto(replyLink.toString());
    const reply = page.locator(`#compliance-message-${replyId}`);
    await expect(reply).toHaveAttribute('data-cn-link-target', 'true');
    await expect(reply).toContainText('Pouvez-vous joindre le devis ?');
    await expect.poll(() => isInViewport(reply)).toBe(true);

    // Une réponse qui n'existe plus : on retombe sur la carte de l'équipe.
    replyLink.searchParams.set('focusMessage', 'reply-disparue');
    await page.goto(replyLink.toString());
    await expect(page.locator('#compliance-team-block-controle_pub')).toHaveAttribute('data-cn-link-target', 'true');

    expect(errors).toEqual([]);
  });

  test('une réponse de l’expert ne part qu’une fois au porteur, et le mail « réponse » ne va qu’à un autre dernier auteur', async ({ page }) => {
    await gotoHome(page);
    await grantSelfComplianceExpertAndCommitteeAccess(page);
    await createAndSubmitProject(page);
    await goToProjectsHome(page);
    await handProjectToAnotherOwner(page);
    // Le porteur a écrit le dernier message du fil : il reçoit déjà le mail principal de la
    // réponse, le mail « réponse à votre message » ferait doublon.
    await seedThread(page, [{ id: 'reply-owner', message: 'Question du porteur', authorEmail: OWNER_EMAIL }]);
    await openTriggeredProjectAndExpandTeam(page, 'Contrôle pub');
    await sendThreadReply(page, 'Réponse unique au porteur');
    await expect.poll(async () => (await readMails(page)).filter((mail) => mail.body.includes('Réponse unique au porteur')).length).toBe(1);
    await page.waitForTimeout(500);
    const toOwner = (await readMails(page)).filter((mail) => mail.body.includes('Réponse unique au porteur'));
    expect(toOwner).toHaveLength(1);
    expect(toOwner[0].to).toContain(OWNER_EMAIL);
    expect(toOwner[0].subject).toContain('Compliance comment on your report');
  });

  test('le dernier auteur du fil hors des destinataires principaux reçoit bien « réponse à votre message »', async ({ page }) => {
    await gotoHome(page);
    await grantSelfComplianceExpertAndCommitteeAccess(page);
    await createAndSubmitProject(page);
    await goToProjectsHome(page);
    await handProjectToAnotherOwner(page);
    await seedThread(page, [{ id: 'reply-colleague', message: 'Avis d’un collègue', authorEmail: COLLEAGUE_EMAIL }]);
    await openTriggeredProjectAndExpandTeam(page, 'Contrôle pub');
    await sendThreadReply(page, 'Réponse vue par deux personnes');
    await expect.poll(async () => (await readMails(page)).filter((mail) => mail.body.includes('Réponse vue par deux personnes')).length).toBe(2);
    const mails = (await readMails(page)).filter((mail) => mail.body.includes('Réponse vue par deux personnes'));
    const toColleague = mails.find((mail) => mail.to.includes(COLLEAGUE_EMAIL));
    const toOwner = mails.find((mail) => mail.to.includes(OWNER_EMAIL));
    expect(toColleague.subject).toContain('Reply to your comment');
    expect(toColleague.to).not.toContain(OWNER_EMAIL);
    expect(toOwner.to).not.toContain(COLLEAGUE_EMAIL);
  });

  test('un post-it ne prévient le porteur qu’une fois, quand son auteur le quitte, avec le texte complet', async ({ page }) => {
    test.setTimeout(60000);
    const errors = collectConsoleErrors(page);
    await gotoHome(page);
    await grantSelfComplianceExpertAndCommitteeAccess(page);
    await createAndSubmitProject(page);
    await goToProjectsHome(page);
    await handProjectToAnotherOwner(page);
    const stored = await page.evaluate(() => window.__cnReadPersistedState());
    const project = stored.projects.find((entry) => entry?.status === 'submitted');

    await page.goto(`/index.html?projectId=${encodeURIComponent(project.id)}`);
    await page.getByRole('button', { name: /Activer le mode annotation|Commenter/ }).first().click();
    const intro = page.getByTestId('annotation-intro');
    if (await intro.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'J’ai compris' }).click();
    }
    await page.locator('[data-showcase-section]').first().dblclick();
    const note = page.getByPlaceholder('Ajoutez votre remarque ici...').first();
    await expect(note).toBeFocused();

    const showcaseMails = async () => (await readMails(page)).filter((mail) => mail.to.includes(OWNER_EMAIL)
      && mail.subject.includes('Comment on the showcase'));

    // Une pause en pleine frappe ne doit plus envoyer un texte à moitié écrit.
    await page.keyboard.type('Le visuel de la page 3');
    await page.waitForTimeout(2000);
    expect(await showcaseMails()).toHaveLength(0);
    await page.keyboard.type(' doit porter la mention légale.');

    // L'auteur quitte le post-it : un seul mail, avec tout le texte.
    await note.evaluate((element) => element.blur());
    await expect.poll(async () => (await showcaseMails()).length).toBe(1);
    expect((await showcaseMails())[0].body).toContain('Le visuel de la page 3 doit porter la mention légale.');

    // Le retoucher plus tard ne renvoie rien.
    await note.focus();
    await page.keyboard.type(' Merci.');
    await note.evaluate((element) => element.blur());
    await page.waitForTimeout(1500);
    expect(await showcaseMails()).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  test('le chef de projet répond sur un périmètre que personne n’a pris en charge : aucun mail, et il en est averti', async ({ page }) => {
    test.setTimeout(60000);
    const errors = collectConsoleErrors(page);
    await gotoHome(page);
    await createAndSubmitProject(page);
    const stored = await page.evaluate(() => window.__cnReadPersistedState());
    const project = stored.projects.find((entry) => entry?.status === 'submitted');
    const stakesLink = `/index.html?projectId=${encodeURIComponent(project.id)}&view=synthesis&focusKind=team&focusId=controle_pub`;

    await patchStateOnBoot(page, (state, arg) => {
      (state?.projects || []).forEach((entry) => {
        if (entry?.id !== arg.projectId) {
          return;
        }
        const comments = entry.answers.__compliance_team_comments__ || {};
        comments.teams = {
          ...(comments.teams || {}),
          controle_pub: {
            ...(comments.teams?.controle_pub || {}),
            status: 'pending_information',
            comment: 'Merci de préciser le public visé.',
            statusUpdatedAt: '2026-11-01T09:00:00.000Z',
            replies: [{ id: 'reply-expert', message: 'Question de l’expert', authorEmail: arg.expert, authorName: arg.expert, createdAt: '2026-11-01T09:05:00.000Z' }],
            ...(arg.claimed ? { claim: { assigneeEmail: arg.expert, assignedAt: '2026-11-01T09:00:00.000Z', assignedByEmail: arg.expert } } : {})
          }
        };
        entry.answers.__compliance_team_comments__ = comments;
      });
      return state;
    }, { projectId: project.id, expert: COLLEAGUE_EXPERT_EMAIL, claimed: false });
    await page.goto(stakesLink);
    await expect(page.getByRole('heading', { name: 'Enjeux du projet' })).toBeVisible();

    const mailsToExpert = async () => (await readMails(page)).filter((mail) => mail.to.includes(COLLEAGUE_EXPERT_EMAIL));
    await sendThreadReply(page, 'Le public visé est national.', {
      beforeSend: () => expect(page.getByTestId('unclaimed-reply-hint-controle_pub')).toBeVisible()
    });
    await expect(page.getByText('Le public visé est national.')).toBeVisible();
    await page.waitForTimeout(800);
    expect(await mailsToExpert()).toHaveLength(0);

    // Le même échange, une fois le périmètre pris en charge : le référent est prévenu.
    await patchStateOnBoot(page, (state, arg) => {
      (state?.projects || []).forEach((entry) => {
        const teamEntry = entry?.id === arg.projectId ? entry.answers?.__compliance_team_comments__?.teams?.controle_pub : null;
        if (teamEntry) {
          teamEntry.claim = { assigneeEmail: arg.expert, assignedAt: '2026-11-01T09:00:00.000Z', assignedByEmail: arg.expert };
        }
      });
      return state;
    }, { projectId: project.id, expert: COLLEAGUE_EXPERT_EMAIL });
    await page.goto(stakesLink);
    await expect(page.getByRole('heading', { name: 'Enjeux du projet' })).toBeVisible();
    await sendThreadReply(page, 'Et la diffusion commence en mars.', {
      beforeSend: () => expect(page.getByTestId('unclaimed-reply-hint-controle_pub')).toHaveCount(0)
    });
    await expect.poll(async () => (await mailsToExpert()).length).toBe(1);
    const mail = (await mailsToExpert())[0];
    expect(mail.body).toContain('Et la diffusion commence en mars.');
    expect(mail.subject).toContain('Reply from the project owner');
    expect(errors).toEqual([]);
  });

  test('le lien d’un post-it ouvre la vitrine, pas les enjeux, et n’échoue pas si le post-it a disparu', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await gotoHome(page);
    await grantSelfComplianceExpertAndCommitteeAccess(page);
    await createAndSubmitProject(page);
    await goToProjectsHome(page);
    const stored = await page.evaluate(() => window.__cnReadPersistedState());
    const project = stored.projects.find((entry) => entry?.status === 'submitted');

    await page.goto(`/index.html?projectId=${encodeURIComponent(project.id)}&focusKind=note&focusId=note-disparue`);
    await expect(page.locator('.annotation-toolbar')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Enjeux du projet' })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
