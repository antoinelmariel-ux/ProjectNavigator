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

    // L'autopilote renseigne une date de lancement déjà passée. Ce n'est pas un lancement pour
    // autant — une date est prévisionnelle : le projet est signalé comme attendant la compliance,
    // et non comme parti sans confirmation.
    await expect(page.getByText('Le lancement attend la compliance')).toBeVisible();

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

test('un lancement se déclare : il n’est jamais déduit d’une date dépassée', async ({ page }) => {
  test.slow();
  await gotoHome(page);
  await grantSelfComplianceExpertAndCommitteeAccess(page);
  await createAndSubmitProject(page);

  await openTriggeredProjectAndExpandTeam(page, 'Contrôle pub');
  await page.getByRole('button', { name: /Modifier le commentaire/ }).first().click();
  await page.locator('[id^="compliance-status-"]').first().selectOption('validated');
  await page.locator('[id^="compliance-comment-"][contenteditable="true"]').first().click();
  await page.keyboard.type('RAS.');
  await page.getByRole('button', { name: 'Enregistrer le commentaire' }).click();

  await page.getByRole('button', { name: 'Demander la confirmation finale' }).click();

  // La date de lancement est déjà passée, mais rien ne permet d'affirmer que le projet est parti.
  await expect(page.getByText('Le lancement attend la compliance')).toBeVisible();
  await expect(page.getByText(/lancé sans confirmation finale/i)).toHaveCount(0);

  // Quelqu'un le constate : là seulement l'application l'affirme.
  await page.getByRole('button', { name: 'Déclarer le projet lancé' }).click();
  await expect(page.getByText('Projet lancé sans confirmation finale')).toBeVisible();

  await expect
    .poll(() => page.evaluate(() => {
      const parsed = JSON.parse(window.localStorage.getItem('complianceNavigatorState'));
      const project = parsed.projects?.find((entry) => entry?.answers?.__project_launch__?.launchedAt);
      return Boolean(project);
    }))
    .toBe(true);

  // Et le constat se corrige.
  await page.getByRole('button', { name: 'Le projet n’est pas lancé' }).click();
  await expect(page.getByText('Le lancement attend la compliance')).toBeVisible();
});
