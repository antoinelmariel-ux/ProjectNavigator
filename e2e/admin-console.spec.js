import { test, expect } from '@playwright/test';
import { gotoHome, grantAdminAccess, collectConsoleErrors, readStoredState } from './fixtures.js';

// Les projets de démonstration (mock-sharepoint-lists/projects.json) appartiennent à d'autres
// personnes que l'utilisateur simulé : quatre projets soumis de chef.projet@entreprise.com et
// un brouillon de nathan.auvray@lfb.fr, que l'accueil ordinaire ne montre pas.
const consoleProjects = (page) => page.getByTestId('admin-console-project');
const projectRow = (page, name) => consoleProjects(page).filter({ hasText: name });

const openAdminConsole = async (page) => {
  await grantAdminAccess(page);
  await page.getByRole('tab', { name: /Administrateurs/ }).click();
  const launcher = page.getByTestId('admin-console-launcher');
  await expect(launcher).toContainText('Console d’administration des projets');
  const [consolePage] = await Promise.all([
    page.context().waitForEvent('page'),
    launcher.getByRole('button', { name: 'Ouvrir la console d’administration' }).click()
  ]);
  await consolePage.waitForLoadState();
  await expect(consolePage.getByTestId('admin-console-banner')).toBeVisible();
  return consolePage;
};

test('la console d’administration s’ouvre depuis le back-office et retrouve un projet par son porteur', async ({ page }) => {
  await gotoHome(page);
  await expect(page.getByText('Migration SharePoint LFB')).toHaveCount(0);

  const consolePage = await openAdminConsole(page);
  const errors = collectConsoleErrors(consolePage);
  expect(new URL(consolePage.url()).searchParams.get('adminConsole')).toBe('1');
  await expect(consolePage.getByTestId('admin-console-banner')).toContainText('vous avez la main sur tous les projets');
  await expect(consolePage).toHaveTitle(/^\[Admin\]/);
  await expect(consolePage.getByRole('heading', { name: 'Tous les projets' })).toBeVisible();
  await expect(projectRow(consolePage, 'Migration SharePoint LFB')).toContainText('Brouillon');

  // Recherche par porteur, insensible aux accents et à la casse, puis filtre « Porteur ».
  await consolePage.getByTestId('admin-console-search').fill('AUVRAY');
  await expect(consolePage.getByTestId('admin-console-count')).toContainText('1 projet(s)');
  await expect(consolePage.getByTestId('admin-console-search')).toHaveValue('AUVRAY');
  await consolePage.getByRole('button', { name: 'Réinitialiser' }).click();
  await consolePage.getByTestId('admin-console-owner').selectOption('chef.projet@entreprise.com');
  await expect(consolePage.getByTestId('admin-console-count')).toContainText('4 projet(s)');
  await consolePage.getByRole('button', { name: 'Réinitialiser' }).click();

  // L'onglet ordinaire n'a pas changé : pas de bandeau, pas de projets d'autrui.
  await expect(page.getByTestId('admin-console-banner')).toHaveCount(0);

  expect(errors).toEqual([]);
});

test('dans la console, un administrateur modifie, annule, met à la corbeille et restaure les projets des autres', async ({ page }) => {
  await gotoHome(page);
  const consolePage = await openAdminConsole(page);
  const errors = collectConsoleErrors(consolePage);

  // Modifier les réponses d'un brouillon qui n'est pas le sien : le projet s'ouvre dans un nouvel
  // onglet (qui garde le mode console), la liste de la console se relit ensuite.
  const [projectPage] = await Promise.all([
    consolePage.context().waitForEvent('page'),
    projectRow(consolePage, 'Migration SharePoint LFB').getByRole('button', { name: 'Modifier les réponses' }).click()
  ]);
  await projectPage.waitForLoadState();
  expect(new URL(projectPage.url()).searchParams.get('adminConsole')).toBe('1');
  await projectPage.getByRole('button', { name: /Quel est le nom du projet/ }).first().click();
  await projectPage.locator('[contenteditable="true"]').first().click();
  await projectPage.keyboard.press('End');
  await projectPage.keyboard.type(' (revu admin)');
  await expect.poll(async () => {
    const stored = await readStoredState(projectPage);
    return (stored.projects || []).some((project) => project.projectName === 'Migration SharePoint LFB (revu admin)');
  }).toBe(true);
  // La copie de secours localStorage disparaît quand l'écriture IndexedDB est confirmée : fermer
  // avant, c'est laisser la console relire (et réécrire) un état antérieur à la modification.
  await expect.poll(() => projectPage.evaluate(() => window.localStorage.getItem('complianceNavigatorState'))).toBeNull();
  await projectPage.close();
  await consolePage.reload();
  await expect(projectRow(consolePage, 'Migration SharePoint LFB (revu admin)')).toHaveCount(1);

  // Annuler la soumission d'un projet soumis par quelqu'un d'autre.
  const submitted = projectRow(consolePage, 'Impact 360');
  await submitted.getByRole('button', { name: 'Annuler la soumission' }).click();
  await submitted.getByRole('button', { name: 'Confirmer' }).click();
  await expect(submitted).toContainText('Soumission annulée');

  // Corbeille puis restauration.
  const trashed = projectRow(consolePage, 'Partenariat La Rochelle');
  await trashed.getByRole('button', { name: 'Mettre à la corbeille' }).click();
  await trashed.getByRole('button', { name: 'Confirmer' }).click();
  await expect(trashed).toContainText('Corbeille');
  await consolePage.getByTestId('admin-console-status').selectOption('trashed');
  await expect(consolePage.getByTestId('admin-console-count')).toContainText('1 projet(s)');
  await trashed.getByRole('button', { name: 'Restaurer' }).click();
  await expect(consolePage.getByTestId('admin-console-count')).toContainText('0 projet(s)');

  await expect.poll(async () => {
    const stored = await readStoredState(consolePage);
    const byName = (name) => (stored.projects || []).find((project) => String(project.projectName || '').includes(name));
    return {
      edited: byName('Migration SharePoint LFB')?.projectName,
      editedOwner: byName('Migration SharePoint LFB')?.ownerEmail,
      cancelled: byName('Impact 360')?.status
    };
  }).toEqual({
    edited: 'Migration SharePoint LFB (revu admin)',
    editedOwner: 'nathan.auvray@lfb.fr',
    cancelled: 'cancelled'
  });

  expect(errors).toEqual([]);
});

test('le paramètre de la console est ignoré pour qui n’est pas administrateur', async ({ page }) => {
  await gotoHome(page);
  await page.goto('/index.html?adminConsole=1');
  await expect(page.getByRole('group', { name: 'Sélection du bloc projet' })).toBeVisible();
  await expect(page.getByTestId('admin-console-banner')).toHaveCount(0);
  await expect(page.getByTestId('admin-projects-console')).toHaveCount(0);
});
