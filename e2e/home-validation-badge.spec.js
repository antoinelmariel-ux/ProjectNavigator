import { test, expect } from '@playwright/test';
import { gotoHome, createAndSubmitProject, collectConsoleErrors } from './fixtures.js';

// Le badge de validation remplace le badge « Synthèse finalisée » sur la carte d'un projet
// soumis dès qu'au moins un périmètre (équipe experte ou comité) doit se prononcer.
//
// Les statuts sont injectés dans le stockage plutôt que saisis dans la synthèse : l'éditeur de
// commentaire n'est accessible qu'à un expert compliance, ce qui suppose le mot de passe admin
// (absent de ce dépôt). L'injection se fait dans un addInitScript et non avant la navigation,
// car App.jsx réécrit complianceNavigatorState de façon synchrone sur pagehide : un patch posé
// avant le goto serait écrasé par ce flush au moment même de quitter la page.
const injectComplianceStatuses = () => {
  const mode = window.localStorage.getItem('__e2eComplianceMode');
  if (!mode) return;
  const raw = window.localStorage.getItem('complianceNavigatorState');
  if (!raw) return;
  const state = JSON.parse(raw);
  const target = (state.projects || []).find((project) => project.status === 'submitted');
  if (!target) return;

  const teamIds = (target.analysis && target.analysis.teams) || [];
  const teams = {};
  teamIds.forEach((teamId, index) => {
    let status = 'validated';
    if (mode === 'pending' && index === 0) status = 'pending_information';
    if (mode === 'pending' && index === teamIds.length - 1) status = '';
    if (mode === 'validated' && index === 0) status = 'validated_with_conditions';
    if (mode === 'validated' && index === 1) status = 'not_concerned';
    if (mode === 'rejected' && index === 1) status = 'rejected';
    if (status) teams[teamId] = { comment: 'avis', status };
  });

  target.answers = {
    ...(target.answers || {}),
    __compliance_team_comments__: { teams, committees: {}, forcedCommitteeIds: [] }
  };
  window.localStorage.setItem('complianceNavigatorState', JSON.stringify(state));
};

const firstCard = (page) => page.locator('article[id^="project-card-"]').first();

const reloadWithMode = async (page, mode) => {
  await page.evaluate((value) => window.localStorage.setItem('__e2eComplianceMode', value), mode);
  await page.goto('/index.html');
  const badge = firstCard(page).locator('span.rounded-full').first();
  await expect(badge).toBeVisible();
  return badge;
};

test('la carte d’un projet soumis porte son statut de validation', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await gotoHome(page);
  await createAndSubmitProject(page);
  await page.addInitScript(injectComplianceStatuses);

  let badge = await reloadWithMode(page, 'pending');
  await expect(badge).toHaveText('En attente de validation');
  await expect(badge).toHaveAttribute('title', /3 avis rendus sur 5 attendus/);

  badge = await reloadWithMode(page, 'validated');
  await expect(badge).toHaveText('Validé');

  badge = await reloadWithMode(page, 'rejected');
  await expect(badge).toHaveText('Refusé');

  expect(errors).toEqual([]);
});

test('le titre de la synthèse rappelle le nom du projet', async ({ page }) => {
  await gotoHome(page);
  await createAndSubmitProject(page);
  await firstCard(page).getByRole('button', { name: 'Consulter la synthèse' }).click();

  const heading = page.locator('main h1').first();
  await expect(heading).toBeVisible();
  await expect(heading).toContainText('Synthèse');
  await expect(heading).toContainText('Réponse test.');
});
