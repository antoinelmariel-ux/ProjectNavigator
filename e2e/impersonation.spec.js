import { test, expect } from '@playwright/test';
import { gotoHome } from './fixtures.js';

const MOCK_USER = 'bertrand.darieux@lfb.fr';
const SIMULATED_USER = 'marie.durand@lfb.fr';

// Le paramètre ?viewAs n'est honoré que si la session réelle est administratrice : en local,
// l'utilisateur mock n'est pas dans initialAdminEmails, on l'y ajoute via l'état persisté.
// addInitScript (et non un simple evaluate, contrairement à l'avertissement de fixtures.js
// sur localStorage.clear) : à la navigation suivante, la page quittée vide d'abord son état
// applicatif dans le localStorage via pagehide et écraserait une écriture faite avant elle.
async function grantSelfAdmin(page) {
  await page.addInitScript((email) => {
    const raw = window.localStorage.getItem('complianceNavigatorState');
    const state = raw ? JSON.parse(raw) : {};
    state.adminEmails = [email];
    window.localStorage.setItem('complianceNavigatorState', JSON.stringify(state));
  }, MOCK_USER);
}

test('sans droits administrateur, le paramètre de simulation est ignoré', async ({ page }) => {
  await gotoHome(page);
  await page.goto(`/index.html?viewAs=${SIMULATED_USER}`);

  await expect(page.getByRole('alert').filter({ hasText: 'Simulation d’identité' })).toHaveCount(0);
});

test('un administrateur voit l’application sous l’identité simulée, sans rien enregistrer', async ({ page }) => {
  await gotoHome(page);
  await grantSelfAdmin(page);

  await page.goto(`/index.html?viewAs=${SIMULATED_USER}`);

  const banner = page.getByRole('alert').filter({ hasText: 'Simulation d’identité' });
  await expect(banner).toBeVisible();
  await expect(banner).toContainText(SIMULATED_USER);
  await expect(banner).toContainText(MOCK_USER);
  await expect(page).toHaveTitle(/^\[Simulation\]/);

  // L'onglet de simulation partage le localStorage de la session réelle : il ne doit rien y
  // écrire, sinon il écraserait l'état de l'administrateur resté dans son propre onglet.
  const before = await page.evaluate(() => window.localStorage.getItem('complianceNavigatorState'));
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => window.localStorage.getItem('complianceNavigatorState'));
  expect(after).toBe(before);

  await banner.getByRole('button', { name: 'Quitter la simulation' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Simulation d’identité' })).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('viewAs')).toBeNull();
});
