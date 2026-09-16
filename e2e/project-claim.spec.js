import { test, expect } from '@playwright/test';
import {
  collectConsoleErrors,
  createAndSubmitProject,
  gotoHome,
  grantAdminAccess,
  grantSelfComplianceExpertAndCommitteeAccess,
  openTriggeredProjectAndExpandTeam
} from './fixtures.js';

// Injecte une prise en charge sur le périmètre « Contrôle pub » du projet soumis. Comme pour les
// statuts de conformité (voir fixtures.js), il faut passer par addInitScript et non evaluate() :
// App.jsx re-persiste son état sur pagehide et écraserait un patch écrit avant la navigation.
async function injectClaim(page, assigneeEmail) {
  await page.addInitScript((email) => {
    const KEY = 'complianceNavigatorState';
    let state = {};
    try {
      state = JSON.parse(window.localStorage.getItem(KEY) || '{}') || {};
    } catch {
      state = {};
    }
    (Array.isArray(state.projects) ? state.projects : []).forEach((project) => {
      // Seul le projet créé par le test (« project-<horodatage> ») : les projets de démo du
      // jeu de données mock sont aussi « submitted » et fausseraient les compteurs.
      if (!project || project.status !== 'submitted' || !String(project.id || '').startsWith('project-')) {
        return;
      }
      project.answers = project.answers || {};
      const comments = project.answers.__compliance_team_comments__ || {};
      const teams = comments.teams || {};
      teams.controle_pub = {
        ...(teams.controle_pub || {}),
        claim: {
          assigneeEmail: email,
          assignedAt: '2026-09-01T08:00:00.000Z',
          assignedByEmail: email
        }
      };
      project.answers.__compliance_team_comments__ = { ...comments, teams };
    });
    window.localStorage.setItem(KEY, JSON.stringify(state));
  }, assigneeEmail);
  await page.reload();
}

test.describe('Prise en charge d’un projet par un membre d’équipe', () => {
  test('revendiquer puis libérer un périmètre depuis la liste des projets déclenchés', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await gotoHome(page);
    await grantSelfComplianceExpertAndCommitteeAccess(page);
    await createAndSubmitProject(page);

    const claimRow = page.getByRole('list', { name: 'Prise en charge par périmètre' }).first();
    await expect(claimRow).toContainText('Personne ne suit encore ce périmètre');

    await page.getByRole('button', { name: 'Je prends en charge' }).first().click();
    await expect(claimRow).toContainText('Vous le suivez depuis');
    // Le projet reste dans « À traiter » pour le référent lui-même.
    await expect(page.getByRole('button', { name: /À traiter \(1\)/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Pris en charge par l’équipe \(0\)/ })).toBeVisible();

    await page.waitForTimeout(600);
    const storedAssignee = await page.evaluate(() => {
      const parsed = JSON.parse(window.localStorage.getItem('complianceNavigatorState'));
      const project = parsed.projects?.find((entry) => entry?.answers?.__compliance_team_comments__?.teams?.controle_pub?.claim);
      return project?.answers?.__compliance_team_comments__?.teams?.controle_pub?.claim?.assigneeEmail || '';
    });
    expect(storedAssignee).toBe('bertrand.darieux@lfb.fr');

    await page.getByRole('button', { name: 'Libérer' }).first().click();
    await expect(claimRow).toContainText('Personne ne suit encore ce périmètre');
    expect(errors).toEqual([]);
  });

  test('un projet suivi par un collègue quitte « À traiter » et peut être repris', async ({ page }) => {
    await gotoHome(page);
    await grantSelfComplianceExpertAndCommitteeAccess(page);
    await createAndSubmitProject(page);
    await injectClaim(page, 'marie.dupont@lfb.fr');

    await expect(page.getByRole('button', { name: /À traiter \(0\)/ })).toBeVisible();
    await page.getByRole('button', { name: /Pris en charge par l’équipe \(1\)/ }).click();
    await expect(page.getByText('Suivi par marie.dupont@lfb.fr')).toBeVisible();

    await page.getByRole('button', { name: 'Reprendre', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Reprendre ce projet' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('marie.dupont@lfb.fr');
    await dialog.getByRole('button', { name: 'Absence' }).click();
    await dialog.getByRole('button', { name: 'Reprendre', exact: true }).click();

    await expect(page.getByRole('button', { name: /À traiter \(1\)/ })).toBeVisible();
    await page.getByRole('button', { name: /À traiter \(1\)/ }).click();
    await expect(page.getByRole('list', { name: 'Prise en charge par périmètre' }).first())
      .toContainText('Vous le suivez depuis');
  });

  test('commenter un périmètre libre le revendique implicitement', async ({ page }) => {
    await gotoHome(page);
    await grantSelfComplianceExpertAndCommitteeAccess(page);
    await createAndSubmitProject(page);
    await openTriggeredProjectAndExpandTeam(page, 'Contrôle pub');

    await expect(page.getByText('personne ne suit encore ce périmètre.')).toBeVisible();

    await page.getByRole('button', { name: /Modifier le commentaire/ }).first().click();
    await page.locator('select[id^="compliance-status-"]').first().selectOption('pending_information');
    await page.locator('[id^="compliance-comment-"][contenteditable="true"]').first().click();
    await page.keyboard.type('Merci de préciser le circuit de diffusion.');
    await page.getByRole('button', { name: 'Enregistrer le commentaire' }).click();
    await page.waitForTimeout(600);

    const claim = await page.evaluate(() => {
      const parsed = JSON.parse(window.localStorage.getItem('complianceNavigatorState'));
      const project = parsed.projects?.find((entry) => entry?.answers?.__compliance_team_comments__?.teams?.controle_pub?.claim);
      return project?.answers?.__compliance_team_comments__?.teams?.controle_pub?.claim || null;
    });
    expect(claim?.assigneeEmail).toBe('bertrand.darieux@lfb.fr');

    await page.getByRole('button', { name: /Contrôle pub/ }).first().click();
    await expect(page.getByText('vous suivez ce projet pour cette équipe.')).toBeVisible();

    // Non-régression : l'éditeur de la synthèse reconstruit l'entrée du périmètre à chaque
    // enregistrement (normalizeCommentEntry) — une réponse dans le fil ne doit pas effacer la
    // prise en charge au passage.
    await page.getByRole('button', { name: /Répondre/ }).first().click();
    await page.locator('[contenteditable="true"]').last().click();
    await page.keyboard.type('Le circuit de diffusion est en pièce jointe.');
    await page.getByRole('button', { name: 'Envoyer la réponse' }).click();
    await page.waitForTimeout(600);

    const claimAfterReply = await page.evaluate(() => {
      const parsed = JSON.parse(window.localStorage.getItem('complianceNavigatorState'));
      const project = parsed.projects?.find((entry) => entry?.answers?.__compliance_team_comments__?.teams?.controle_pub?.claim);
      return project?.answers?.__compliance_team_comments__?.teams?.controle_pub?.claim || null;
    });
    expect(claimAfterReply?.assigneeEmail).toBe('bertrand.darieux@lfb.fr');
    expect(claimAfterReply?.assignedAt).toBe(claim?.assignedAt);
  });

  test('le back-office règle les délais par équipe et protège les projets d’un contact retiré', async ({ page }) => {
    await gotoHome(page);
    await grantSelfComplianceExpertAndCommitteeAccess(page);
    await createAndSubmitProject(page);
    await injectClaim(page, 'laure.dabel@lfb.fr');

    await grantAdminAccess(page);
    await page.getByRole('tab', { name: /Équipes/ }).click();

    const staleInput = page.getByLabel('Signaler au bout de (jours ouvrés sans action)').first();
    await expect(staleInput).toHaveValue('6');
    await expect(page.getByLabel('Relancer le référent au bout de (jours ouvrés sans action)').first())
      .toHaveValue('3');
    await staleInput.fill('3');
    await page.waitForTimeout(600);
    const storedStaleDays = await page.evaluate(() => {
      const parsed = JSON.parse(window.localStorage.getItem('complianceNavigatorState'));
      return parsed.teams?.find((team) => team.id === 'controle_pub')?.claimStaleDays;
    });
    expect(storedStaleDays).toBe(3);

    // La charge de l'équipe montre la prise en charge de laure.dabel@lfb.fr…
    await expect(page.getByText('1 projet(s) suivi(s)').first()).toBeVisible();

    // …et retirer ce contact demande d'abord ce que deviennent ses projets.
    await page.getByRole('button', { name: 'Retirer laure.dabel@lfb.fr' }).click();
    const dialog = page.getByRole('alertdialog', { name: 'Ce contact porte encore des projets' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Les remettre dans « À traiter »' }).click();

    await page.waitForTimeout(600);
    const afterRemoval = await page.evaluate(() => {
      const parsed = JSON.parse(window.localStorage.getItem('complianceNavigatorState'));
      const project = parsed.projects?.find((entry) => entry?.answers?.__compliance_team_comments__?.teams?.controle_pub);
      return {
        contacts: parsed.teams?.find((team) => team.id === 'controle_pub')?.contacts || [],
        claim: project?.answers?.__compliance_team_comments__?.teams?.controle_pub?.claim || null
      };
    });
    expect(afterRemoval.contacts).not.toContain('laure.dabel@lfb.fr');
    expect(afterRemoval.claim).toBeNull();
  });
});
