import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { collectConsoleErrors, gotoHome, grantAdminAccess, openBackOfficeTab, patchStateOnBoot } from './fixtures.js';
import { initialTeams } from '../src/data/teams.js';

// Projets de démonstration (mock-sharepoint-lists/projects.json) : quatre projets envoyés de
// chef.projet@entreprise.com (Vies Reliées 20 K€, Les journées de la filière 28 K€, Partenariat
// La Rochelle 35 K€, Impact 360 30 K€) et un brouillon de nathan.auvray@lfb.fr (Migration
// SharePoint LFB, 10 K€). Aucun n'appartient à l'utilisateur simulé.
const rows = (page) => page.getByTestId('project-search-row');
const row = (page, name) => rows(page).filter({ hasText: name });

const openProjectSearch = async (page) => {
  await openBackOfficeTab(page, /Recherche de projets/);
  await expect(page.getByRole('heading', { name: 'Recherche de projets', level: 2 })).toBeVisible();
};

test('un expert retrouve tous les projets par mots-clés, sélectionne, visualise et exporte', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await gotoHome(page);
  await grantAdminAccess(page);
  await openProjectSearch(page);

  // Tous les projets, brouillon d'un autre compris, avec les colonnes de départ.
  await expect(row(page, 'Migration SharePoint LFB')).toContainText('Brouillon');
  await expect(row(page, 'Impact 360')).toContainText('Envoyé à la compliance');
  await expect(row(page, 'Impact 360')).toContainText('30 K€');
  const headers = page.getByTestId('project-search-table').locator('thead th');
  await expect(headers).toContainText(['Nom du projet', 'Description', 'Porteur du projet', 'Créé le', 'Lancement souhaité', 'Montant', 'Statut', 'Verdict']);

  // Recherche sur toutes les réponses, sans accents ni majuscules : un libellé coché de « avec qui
  // allez-vous collaborer » retrouve les projets qui l'ont coché.
  const search = page.getByLabel('Mots-clés');
  await search.fill('CONSULTANT independant');
  await expect(rows(page)).toHaveCount(3);
  await search.fill('migration');
  await expect(rows(page)).toHaveCount(1);
  await search.fill('');

  // Filtre par statut.
  await page.getByRole('button', { name: /^Filtres/ }).click();
  await page.getByTestId('project-search-filter-builtin-status').getByLabel('Brouillon').check();
  await expect(rows(page)).toHaveCount(1);
  await page.getByRole('button', { name: 'Effacer tous les filtres' }).click();
  await expect(rows(page)).not.toHaveCount(1);

  // La sélection met à jour les indicateurs.
  await row(page, 'Impact 360').getByRole('checkbox').check();
  await row(page, 'Vies Reliées').getByRole('checkbox').check();
  await expect(page.getByTestId('project-search-kpi-count')).toHaveText('2');
  await expect(page.getByTestId('project-search-kpi-sum')).toHaveText('50 K€');

  // Un graphique créé à la demande, calculé sur la sélection.
  await page.getByTestId('project-search-add-chart').click();
  const editor = page.getByTestId('project-search-chart-editor');
  await editor.getByLabel('Regrouper par').selectOption({ label: 'Statut' });
  await editor.getByLabel('Mesure').selectOption('sum');
  await editor.getByRole('button', { name: 'Enregistrer le graphique' }).click();
  const chart = page.getByTestId('project-search-chart');
  await expect(chart).toContainText('Montant (somme) par Statut');
  await expect(chart).toContainText('Envoyé à la compliance');
  await expect(chart).toContainText('50 K€');

  // Export Excel des projets cochés.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('project-search-export').click()
  ]);
  expect(download.suggestedFilename()).toMatch(/^projets-\d{4}-\d{2}-\d{2}\.xlsx$/);
  const bytes = await readFile(await download.path());
  expect(bytes.subarray(0, 2).toString()).toBe('PK');
  const text = bytes.toString('utf8');
  expect(text).toContain('Impact 360');
  expect(text).toContain('Vies Reliées');
  expect(text).not.toContain('Migration SharePoint LFB');

  // Vitrine complète, en lecture seule, dans un nouvel onglet.
  const [showcasePage] = await Promise.all([
    page.context().waitForEvent('page'),
    row(page, 'Impact 360').getByRole('button', { name: /Voir la vitrine complète/ }).click()
  ]);
  await showcasePage.waitForLoadState();
  expect(new URL(showcasePage.url()).searchParams.get('sv')).toBeTruthy();
  await expect(showcasePage.getByText('Impact 360').first()).toBeVisible();
  await expect(showcasePage.locator('nav').filter({ hasText: 'Back-office' })).toHaveCount(0);
  await showcasePage.close();

  expect(errors).toEqual([]);
});

test('chaque expert compose ses colonnes (fusion comprise), retrouvées au rechargement, et l’administrateur propose un défaut', async ({ page }) => {
  await gotoHome(page);
  await grantAdminAccess(page);
  await openProjectSearch(page);

  await page.getByRole('button', { name: 'Colonnes et graphiques' }).click();
  await expect(page.getByTestId('project-search-storage-notice')).toContainText('navigateur');
  await page.getByTestId('project-search-add-custom-column').click();
  const column = page.getByTestId('project-search-config-column').last();
  await column.getByLabel(/Nom de la colonne/).fill('Partenaires');
  await column.getByLabel('Ajouter une question').selectOption({ label: 'Dans le cadre du projet, allez-vous collaborer avec ...' });
  await column.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await expect(page.getByTestId('project-search-table').locator('thead')).toContainText('Partenaires');
  await expect(row(page, 'Vies Reliées')).toContainText('Prestataire de service');

  // L'administrateur propose sa configuration à tous les experts.
  await page.getByTestId('project-search-publish-default').click();
  await expect(page.getByTestId('project-search-admin-default')).toContainText('Une configuration par défaut est proposée');

  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('complianceNavigatorProjectSearchConfig') || '')).toContain('Partenaires');
  await page.reload();
  await page.getByRole('button', { name: /Accéder au Back-office/ }).click();
  await openProjectSearch(page);
  await expect(page.getByTestId('project-search-table').locator('thead')).toContainText('Partenaires');
});

test('un contact d’équipe sans droits d’administration a l’onglet et voit les projets hors de son périmètre', async ({ page }) => {
  await gotoHome(page);
  await patchStateOnBoot(page, (stored, teams) => {
    const state = stored || {};
    state.adminEmails = ['nathan.auvray@lfb.fr'];
    state.teams = teams.map((team, index) => (index === 0 ? { ...team, contacts: [...team.contacts, 'bertrand.darieux@lfb.fr'] } : team));
    return state;
  }, initialTeams);
  await page.reload();
  await page.getByRole('button', { name: /Accéder au Back-office/ }).click();
  await expect(page.getByRole('heading', { name: 'Back-office' })).toBeVisible();
  await expect(page.locator('[data-backoffice-group]').filter({ hasText: 'Administrateurs' })).toHaveCount(0);
  await openProjectSearch(page);
  await expect(row(page, 'Migration SharePoint LFB')).toBeVisible();
  await page.getByRole('button', { name: 'Colonnes et graphiques' }).click();
  await expect(page.getByTestId('project-search-admin-default')).toHaveCount(0);
});
