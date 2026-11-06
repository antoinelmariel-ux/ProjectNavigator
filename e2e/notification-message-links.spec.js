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
