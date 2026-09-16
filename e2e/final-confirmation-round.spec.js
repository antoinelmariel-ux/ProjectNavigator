import { test, expect } from '@playwright/test';
import { gotoHome, createAndSubmitProject, grantSelfComplianceExpertAndCommitteeAccess, openTriggeredProjectAndExpandTeam } from './fixtures.js';

// Lot 3 : dernier tour avant lancement. Rien ne peut le rendre obligatoire — il n'existe pas de
// jalon opposable — donc ce qui est testé ici, c'est qu'il est demandé explicitement, qu'il ne
// coûte qu'un clic à l'expert, et qu'il se referme.
test.describe('Confirmation finale avant lancement', () => {
  test('le porteur demande la confirmation, l’expert la donne en un clic', async ({ page }) => {
    test.slow();
    await gotoHome(page);
    await grantSelfComplianceExpertAndCommitteeAccess(page);
    await createAndSubmitProject(page);

    // Un avis est d'abord rendu : sans avis, il n'y a rien à confirmer.
    await openTriggeredProjectAndExpandTeam(page, 'Contrôle pub');
    await page.getByRole('button', { name: /Modifier le commentaire/ }).first().click();
    await page.locator('[id^="compliance-status-"]').first().selectOption('validated');
    await page.locator('[id^="compliance-comment-"][contenteditable="true"]').first().click();
    await page.keyboard.type('RAS pour le contrôle pub.');
    await page.getByRole('button', { name: 'Enregistrer le commentaire' }).click();

    await page.getByRole('button', { name: 'Demander la confirmation finale' }).click();

    await expect
      .poll(() => page.evaluate(() => {
        const parsed = JSON.parse(window.localStorage.getItem('complianceNavigatorState'));
        const project = parsed.projects?.find((entry) => entry?.answers?.__final_validation_round__);
        return project?.answers?.__final_validation_round__?.round ?? null;
      }))
      .toBe(1);

    // L'autopilote renseigne une date de lancement déjà passée : le projet est donc signalé comme
    // « lancé sans confirmation », ce qui est exactement l'état que ce tour doit rendre visible.
    await expect(page.getByText(/date de lancement est passée sans confirmation finale/)).toBeVisible();

    // Côté expert : deux boutons, pas une relecture complète.
    await page.getByRole('button', { name: /Contrôle pub/ }).first().click();
    await expect(page.getByText('Votre avis est-il toujours valable ?')).toBeVisible();
    await page.getByRole('button', { name: 'Je confirme mon avis' }).click();

    await expect(page.getByText('Confirmation finale obtenue')).toBeVisible();

    await expect
      .poll(() => page.evaluate(() => {
        const parsed = JSON.parse(window.localStorage.getItem('complianceNavigatorState'));
        const project = parsed.projects?.find((entry) => entry?.answers?.__final_validation_round__);
        return project?.answers?.__compliance_team_comments__?.teams?.controle_pub?.confirmation?.state ?? null;
      }))
      .toBe('confirmed');
  });
});
