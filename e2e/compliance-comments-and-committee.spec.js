import { test, expect } from '@playwright/test';
import {
  gotoHome,
  createAndSubmitProject,
  grantSelfComplianceExpertAndCommitteeAccess,
  openTriggeredProjectAndExpandTeam,
  collectConsoleErrors
} from './fixtures.js';

const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

test.describe('Commentaires experts, réponses et validation par équipe', () => {
  test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non fourni : tests ignorés.');

  test('le statut sélectionné dans l\'éditeur de commentaire reste stable (non-régression)', async ({ page }) => {
    // Régression : relevantTeams n'était pas mémoïsé dans SynthesisReport.jsx, donc le moindre
    // re-rendu (déclenché par la sélection elle-même) réinitialisait le brouillon de statut/
    // commentaire à sa dernière valeur persistée avant que l'utilisateur ait pu l'enregistrer -
    // rendant le <select> de statut inutilisable en pratique.
    await gotoHome(page);
    await grantSelfComplianceExpertAndCommitteeAccess(page, ADMIN_PASSWORD);
    await createAndSubmitProject(page);
    await openTriggeredProjectAndExpandTeam(page, 'Contrôle pub');

    await page.getByRole('button', { name: /Modifier le commentaire/ }).first().click();
    const statusSelect = page.locator('select').first();
    await statusSelect.selectOption('validated_with_conditions');

    // Laisse le temps à un éventuel re-rendu parasite de survenir avant de vérifier.
    await page.waitForTimeout(500);
    await expect(statusSelect).toHaveValue('validated_with_conditions');
  });

  test('enregistrer un commentaire + statut le persiste correctement, puis une réponse s\'ajoute au fil', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await gotoHome(page);
    await grantSelfComplianceExpertAndCommitteeAccess(page, ADMIN_PASSWORD);
    await createAndSubmitProject(page);
    await openTriggeredProjectAndExpandTeam(page, 'Contrôle pub');

    await page.getByRole('button', { name: /Modifier le commentaire/ }).first().click();
    await page.locator('select').first().selectOption('validated_with_conditions');
    await page.locator('[id^="compliance-comment-"][contenteditable="true"]').first().click();
    await page.keyboard.type('Merci de préciser le budget détaillé avant validation.');
    await page.getByRole('button', { name: 'Enregistrer le commentaire' }).click();

    await expect(page.getByRole('button', { name: /Contrôle pub/ }).first()).toContainText('Validé sous conditions');

    await page.waitForTimeout(600); // laisse passer le debounce de persistance (400ms)
    const storedComments = await page.evaluate(() => {
      const parsed = JSON.parse(window.localStorage.getItem('complianceNavigatorState'));
      const withComments = parsed.projects?.find((p) => p.answers?.__compliance_team_comments__?.teams?.controle_pub);
      return withComments?.answers?.__compliance_team_comments__ ?? null;
    });
    expect(storedComments?.teams?.controle_pub?.status).toBe('validated_with_conditions');
    expect(storedComments?.teams?.controle_pub?.comment).toContain('budget détaillé');

    // Le commentaire enregistré replie la carte : la ré-ouvrir pour accéder à "Répondre".
    await page.getByRole('button', { name: /Contrôle pub/ }).first().click();
    await page.getByRole('button', { name: /Répondre/ }).first().click();
    await page.locator('[contenteditable="true"]').last().click();
    await page.keyboard.type('Le budget détaillé est en pièce jointe du projet.');
    await page.getByRole('button', { name: 'Envoyer la réponse' }).click();

    await expect(page.getByText('Le budget détaillé est en pièce jointe')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('valider une équipe déplace le projet de "À traiter" vers "Traités"', async ({ page }) => {
    await gotoHome(page);
    await grantSelfComplianceExpertAndCommitteeAccess(page, ADMIN_PASSWORD);
    await createAndSubmitProject(page);

    await expect(page.getByRole('button', { name: /À traiter \(1\)/ })).toBeVisible();

    await openTriggeredProjectAndExpandTeam(page, 'Contrôle pub');
    await page.getByRole('button', { name: /Modifier le commentaire/ }).first().click();
    await page.locator('select').first().selectOption('validated');
    await page.locator('[id^="compliance-comment-"][contenteditable="true"]').first().click();
    await page.keyboard.type('RAS, validé.');
    await page.getByRole('button', { name: 'Enregistrer le commentaire' }).click();
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: /Retourner à l.accueil des projets/ }).click();
    await expect(page.getByRole('button', { name: /Traités \(1\)/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /À traiter \(0\)/ })).toBeVisible();
  });
});

test.describe('Repêchage par un comité (réintégration)', () => {
  test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non fourni : tests ignorés.');

  test('un membre de comité peut réintégrer un projet hors scope, qui bascule alors en "À traiter" pour ce comité', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await gotoHome(page);
    // Le comité par défaut n'a aucun déclencheur configuré (ruleTriggers/riskTriggers/
    // teamTriggers vides) : il ne se déclenche donc jamais automatiquement, ce qui en fait
    // un candidat "hors scope" idéal pour tester la réintégration sans configuration
    // supplémentaire.
    await grantSelfComplianceExpertAndCommitteeAccess(page, ADMIN_PASSWORD);
    await createAndSubmitProject(page);

    await page.getByRole('button', { name: /Hors scope comité \(1\)/ }).click();
    const reintegrateBtn = page.getByRole('button', { name: 'Réintégrer en comité' });
    await expect(reintegrateBtn).toBeVisible();
    await reintegrateBtn.click();

    await expect(page.getByRole('button', { name: /Hors scope comité \(0\)/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /À traiter \(1\)/ })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
