import { test, expect } from '@playwright/test';
import {
  collectConsoleErrors,
  createAndSubmitProject,
  goToProjectsHome,
  gotoHome,
  grantSelfComplianceExpertAndCommitteeAccess,
  openTriggeredProjectAndExpandTeam,
  patchStateOnBoot,
  readStoredState
} from './fixtures.js';

const readStoredReplies = async (page) => {
  const parsed = await readStoredState(page);
  const project = parsed.projects?.find((entry) => entry?.answers?.__compliance_team_comments__?.teams?.controle_pub);
  return project?.answers?.__compliance_team_comments__?.teams?.controle_pub?.replies || [];
};

test.describe('Modifier sa réponse dans le fil de discussion', () => {
  test('modifiable tant que l’autre n’a pas répondu, mention « Modifié », sans notification', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const notifications = [];
    page.on('console', (message) => {
      if (message.text().startsWith('[Notification]')) {
        notifications.push(message.text());
      }
    });

    await gotoHome(page);
    await grantSelfComplianceExpertAndCommitteeAccess(page);
    await createAndSubmitProject(page);
    await goToProjectsHome(page);
    await openTriggeredProjectAndExpandTeam(page, 'Contrôle pub');

    await page.getByRole('button', { name: /Répondre/ }).first().click();
    await page.locator('[contenteditable="true"]').last().click();
    await page.keyboard.type('Premiere version de ma reponse.');
    await page.getByRole('button', { name: 'Envoyer la réponse' }).click();

    const thread = page.locator('[data-tour-id="synthesis-team-thread"]');
    await expect(thread).toContainText('Premiere version de ma reponse.');
    await expect(thread.getByTestId('compliance-reply-edited')).toHaveCount(0);
    await expect.poll(async () => (await readStoredReplies(page)).length).toBe(1);

    const notificationsBeforeEdit = notifications.length;
    await thread.getByTestId('compliance-reply-edit').click();
    await expect(thread.getByText('Modifier votre réponse ne renvoie pas de notification.')).toBeVisible();
    const editor = thread.locator('[contenteditable="true"]');
    await editor.click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('Version corrigee de ma reponse.');
    await thread.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(thread).toContainText('Version corrigee de ma reponse.');
    await expect(thread).not.toContainText('Premiere version');
    await expect(thread.getByTestId('compliance-reply-edited')).toHaveText('Modifié');
    await expect
      .poll(async () => {
        const [reply] = await readStoredReplies(page);
        return { message: reply?.message, edited: Boolean(reply?.editedAt), sameDate: reply?.editedAt !== reply?.createdAt };
      })
      .toEqual({ message: 'Version corrigee de ma reponse.', edited: true, sameDate: true });
    await page.waitForTimeout(300);
    expect(notifications.length).toBe(notificationsBeforeEdit);

    // Une réponse de quelqu'un d'autre arrive : la mienne n'est plus modifiable.
    await patchStateOnBoot(page, (stored) => {
      const state = stored || {};
      (Array.isArray(state.projects) ? state.projects : []).forEach((project) => {
        const entry = project?.answers?.__compliance_team_comments__?.teams?.controle_pub;
        if (entry && Array.isArray(entry.replies)) {
          entry.replies.push({
            id: 'reply-other',
            message: 'Reponse de l’autre partie.',
            authorName: 'Laure Chevalier',
            authorEmail: 'laure.chevalier@lfb.fr',
            createdAt: new Date().toISOString(),
            attachments: []
          });
        }
      });
      return state;
    });
    await page.reload();
    await page.getByRole('button', { name: 'Ouvrir', exact: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Enjeux du projet' })).toBeVisible();
    const teamToggle = page.getByRole('button', { name: /Contrôle pub/ }).first();
    if ((await teamToggle.getAttribute('aria-expanded')) !== 'true') {
      await teamToggle.click();
    }

    const reloadedThread = page.locator('[data-tour-id="synthesis-team-thread"]');
    await expect(reloadedThread).toContainText('Reponse de l’autre partie.');
    await expect(reloadedThread.getByTestId('compliance-reply-edited')).toHaveText('Modifié');
    await expect(reloadedThread.getByTestId('compliance-reply-edit')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
