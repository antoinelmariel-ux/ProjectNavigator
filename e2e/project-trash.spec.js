import { test, expect } from '@playwright/test';
import {
  gotoHome,
  createAndSubmitProject,
  createProjectAndOpenShowcase,
  grantSelfComplianceExpertAndCommitteeAccess,
  collectConsoleErrors
} from './fixtures.js';

const trashButton = (page) => page.getByTestId('home-trash-button');
const trashDialog = (page) => page.getByRole('dialog', { name: 'Corbeille' });

const createDraft = async (page, name) => {
  await page.getByRole('button', { name: /Créer un projet/ }).first().click();
  await page.locator('[contenteditable="true"]').first().click();
  await page.keyboard.type(name);
  await page.getByRole('button', { name: /Retourner à l.accueil des projets/ }).click();
  await expect(page.getByText(name).first()).toBeVisible();
};

const moveFirstProjectToTrash = async (page) => {
  await page.locator('button[aria-label*="Supprimer le projet"]').first().click();
  await page.getByRole('button', { name: 'Mettre à la corbeille' }).click();
};

test('un projet supprimé passe par la corbeille, se restaure, puis se supprime définitivement', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await gotoHome(page);
  await createDraft(page, 'Projet e2e Corbeille');

  await moveFirstProjectToTrash(page);
  const projectList = page.locator('article[id^="project-card-"]');
  await expect(projectList.filter({ hasText: 'Projet e2e Corbeille' })).toHaveCount(0);

  // La corbeille survit à un rechargement : c'est un marqueur persisté, pas un état d'écran.
  await page.reload();
  await expect(trashButton(page)).toContainText('1');
  await trashButton(page).click();
  const dialog = trashDialog(page);
  await expect(dialog.getByTestId('home-trash-item')).toHaveCount(1);
  await expect(dialog).toContainText('Projet e2e Corbeille');

  await dialog.getByRole('button', { name: 'Restaurer' }).click();
  await expect(dialog).toContainText('La corbeille est vide.');
  await dialog.getByRole('button', { name: 'Fermer la corbeille' }).click();
  await expect(projectList.filter({ hasText: 'Projet e2e Corbeille' })).toHaveCount(1);

  await moveFirstProjectToTrash(page);
  await trashButton(page).click();
  await dialog.getByRole('button', { name: 'Supprimer définitivement' }).click();
  await expect(dialog.getByRole('alert')).toContainText('supprimé définitivement');
  await dialog.getByRole('button', { name: 'Confirmer la suppression' }).click();
  await expect(dialog).toContainText('La corbeille est vide.');

  await page.reload();
  await expect(page.getByText('Projet e2e Corbeille')).toHaveCount(0);
  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem('complianceNavigatorState') || '{}'));
  expect((stored.projects || []).some((project) => project.projectName === 'Projet e2e Corbeille')).toBe(false);
  expect(errors).toEqual([]);
});

// L'avis est injecté dans le stockage (addInitScript, pour survivre au flush pagehide d'App.jsx)
// sur la première équipe, dont la session de test est contact.
const injectExpertOpinion = () => {
  const raw = window.localStorage.getItem('complianceNavigatorState');
  if (!raw) return;
  const state = JSON.parse(raw);
  const teamId = Array.isArray(state.teams) && state.teams[0] ? state.teams[0].id : null;
  const target = (state.projects || []).find((project) => project.status === 'submitted');
  if (!teamId || !target) return;
  const comments = (target.answers && target.answers.__compliance_team_comments__) || {};
  if (comments.teams && comments.teams[teamId] && comments.teams[teamId].comment) return;
  target.answers = {
    ...(target.answers || {}),
    __compliance_team_comments__: {
      teams: { ...(comments.teams || {}), [teamId]: { comment: '<p>Avis expert</p>', status: 'pending_information' } },
      committees: comments.committees || {},
      forcedCommitteeIds: comments.forcedCommitteeIds || []
    }
  };
  window.localStorage.setItem('complianceNavigatorState', JSON.stringify(state));
};

test('un projet ayant reçu un avis quitte la corbeille du porteur mais reste « Abandonné » côté expert', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await gotoHome(page);
  await grantSelfComplianceExpertAndCommitteeAccess(page);
  await createAndSubmitProject(page);
  await page.addInitScript(injectExpertOpinion);
  await page.goto('/index.html');

  const abandonedTab = page.getByRole('button', { name: /Abandonnés/ });
  await expect(abandonedTab).toBeVisible();

  await page.locator('article[id^="project-card-"]').first()
    .locator('button[aria-label*="Supprimer le projet"]').click();
  await page.getByRole('button', { name: 'Mettre à la corbeille' }).click();

  await abandonedTab.click();
  const complianceList = page.getByRole('list', { name: /projets déclenchés/i });
  await expect(complianceList.getByRole('listitem')).toHaveCount(1);
  await expect(complianceList).toContainText('Abandonné');

  await trashButton(page).click();
  const dialog = trashDialog(page);
  await expect(dialog).toContainText('Un expert a déjà répondu');
  await dialog.getByRole('button', { name: 'Supprimer définitivement' }).click();
  await expect(dialog.getByRole('alert')).toContainText('restera visible des experts sollicités');
  await dialog.getByRole('button', { name: 'Confirmer la suppression' }).click();
  await expect(dialog).toContainText('La corbeille est vide.');
  await dialog.getByRole('button', { name: 'Fermer la corbeille' }).click();

  await page.reload();
  await expect(trashButton(page)).not.toContainText(/\d/);
  await page.getByRole('button', { name: /Abandonnés/ }).click();
  await expect(page.getByRole('list', { name: /projets déclenchés/i }).getByRole('listitem')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('un lien de vitrine partagé ne s’ouvre plus une fois le projet supprimé', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await gotoHome(page);
  await createProjectAndOpenShowcase(page);
  await page.getByRole('button', { name: 'Partager' }).click();
  const shareUrl = await page.locator('input[readonly], input[type="text"]').first().inputValue();
  expect(shareUrl).toContain('sv=');

  await page.goto('/index.html');
  await moveFirstProjectToTrash(page);

  await page.goto(shareUrl);
  await expect(page.getByRole('heading', { name: 'Projet supprimé' })).toBeVisible();
  await expect(page.locator('.sg-shell')).toHaveCount(0);

  await page.getByRole('button', { name: 'Retour à l’accueil' }).click();
  await trashButton(page).click();
  const dialog = trashDialog(page);
  await dialog.getByRole('button', { name: 'Supprimer définitivement' }).click();
  await dialog.getByRole('button', { name: 'Confirmer la suppression' }).click();
  await expect(dialog).toContainText('La corbeille est vide.');

  await page.goto(shareUrl);
  await expect(page.getByRole('heading', { name: 'Projet introuvable' })).toBeVisible();
  await expect(page.locator('.sg-shell')).toHaveCount(0);
  expect(errors).toEqual([]);
});
