// Helpers partagés entre les specs e2e. Pas de data-testid dans le code applicatif :
// on cible par rôle/texte visible (français, langue par défaut détectée sans profil stocké).
import { expect } from '@playwright/test';

export async function gotoFresh(page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto('/index.html');
  await expect(page.getByRole('heading', { name: 'Bienvenue sur Project Navigator' })).toBeVisible();
}

export async function completeOnboarding(page, { startTour = false } = {}) {
  const firstScopeOption = page.getByRole('group').first().locator('input[type="checkbox"]').first();
  await firstScopeOption.check();
  await page.getByRole('button', { name: 'Continuer' }).click();

  await expect(page.getByRole('heading', { name: 'Votre profil est enregistré' })).toBeVisible();
  if (startTour) {
    await page.getByRole('button', { name: 'Démarrer la visite guidée' }).click();
  } else {
    await page.getByRole('button', { name: 'Non merci, je découvrirai seul(e)' }).click();
  }
}

export async function gotoHome(page) {
  await gotoFresh(page);
  await completeOnboarding(page);
}

export function collectConsoleErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  return errors;
}
