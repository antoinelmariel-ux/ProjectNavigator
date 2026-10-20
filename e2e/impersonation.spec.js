import { test, expect } from '@playwright/test';
import { gotoHome, patchStateOnBoot, readStoredState } from './fixtures.js';

const MOCK_USER = 'bertrand.darieux@lfb.fr';
const SIMULATED_USER = 'marie.durand@lfb.fr';

// Le paramètre ?viewAs n'est honoré que si la session réelle est administratrice : en local,
// l'utilisateur mock n'est pas dans initialAdminEmails, on l'y ajoute via l'état persisté.
// patchStateOnBoot (et non un simple evaluate) : à la navigation suivante, la page quittée vide
// d'abord son état applicatif dans le stockage via pagehide et écraserait une écriture faite avant elle.
async function grantSelfAdmin(page) {
  await patchStateOnBoot(page, (stored, email) => {
    const state = stored || {};
    state.adminEmails = [email];
    return state;
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

  // L'onglet de simulation partage le stockage de la session réelle : il ne doit rien y
  // écrire, sinon il écraserait l'état de l'administrateur resté dans son propre onglet.
  const before = JSON.stringify(await readStoredState(page));
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const after = JSON.stringify(await readStoredState(page));
  expect(after).toBe(before);
  expect(await page.evaluate(() => window.localStorage.getItem('complianceNavigatorState'))).toBeNull();

  await banner.getByRole('button', { name: 'Quitter la simulation' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Simulation d’identité' })).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('viewAs')).toBeNull();
});
