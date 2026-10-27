import { test, expect } from '@playwright/test';
import {
  collectConsoleErrors,
  createAndSubmitProject,
  goToProjectsHome,
  gotoHome,
  grantSelfComplianceExpertAndCommitteeAccess,
  openTriggeredProjectAndExpandTeam,
  readStoredState
} from './fixtures.js';

const readStoredControlePubEntry = async (page) => {
  const parsed = await readStoredState(page);
  const project = parsed.projects?.find((entry) => String(entry?.id || '').startsWith('project-')
    && entry?.answers?.__compliance_team_comments__?.teams?.controle_pub);
  return project?.answers?.__compliance_team_comments__?.teams?.controle_pub || null;
};

test.describe('Transférer un projet à un collègue de l’équipe', () => {
  test('le référent transfère le périmètre depuis la synthèse et sort du suivi', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await gotoHome(page);
    await grantSelfComplianceExpertAndCommitteeAccess(page);
    await createAndSubmitProject(page);
    await goToProjectsHome(page);
    await openTriggeredProjectAndExpandTeam(page, 'Contrôle pub');

    await expect(page.getByRole('button', { name: 'Transférer à…' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Je prends en charge' }).click();
    await expect
      .poll(async () => (await readStoredControlePubEntry(page))?.claim?.assigneeEmail || '')
      .toBe('bertrand.darieux@lfb.fr');

    await page.getByRole('button', { name: 'Transférer à…' }).click();
    const panel = page.getByTestId('claim-transfer-panel-controle_pub');
    await expect(panel.getByRole('button', { name: 'Confirmer le transfert' })).toBeDisabled();
    await panel.getByRole('combobox').selectOption('laure.chevalier@lfb.fr');
    await panel.getByRole('textbox').fill('Je suis en congés la semaine prochaine');
    await panel.getByRole('button', { name: 'Confirmer le transfert' }).click();

    await expect
      .poll(async () => {
        const entry = await readStoredControlePubEntry(page);
        return {
          assignee: entry?.claim?.assigneeEmail || '',
          note: entry?.claim?.reasonNote || '',
          action: entry?.claimHistory?.at(-1)?.action || '',
          followers: entry?.followers?.map((follower) => follower.email) || []
        };
      })
      .toEqual({
        assignee: 'laure.chevalier@lfb.fr',
        note: 'Je suis en congés la semaine prochaine',
        action: 'transfer',
        followers: []
      });

    await expect(page.getByRole('button', { name: 'Transférer à…' })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
