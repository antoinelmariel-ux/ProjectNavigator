import { test, expect } from '@playwright/test';
import { gotoHome, walkToSynthesis, collectConsoleErrors } from './fixtures.js';

test.describe('Persistance transverse', () => {
  test('un edit très récent (avant le debounce) est quand même sauvegardé au pagehide', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: /Créer un projet/ }).first().click();
    await page.locator('[contenteditable="true"]').first().click();
    await page.keyboard.type('Projet pagehide test');

    // Déclenche le flush pagehide directement (sans attendre les 400ms de debounce), pour
    // vérifier que persistNowRef sauvegarde bien l'état le plus récent à la fermeture.
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    const stateRaw = await page.evaluate(() => window.localStorage.getItem('complianceNavigatorState'));
    expect(stateRaw).toContain('Projet pagehide test');
  });

  test('la bannière de stockage plein apparaît quand le quota localStorage est atteint', async ({ page }) => {
    await gotoHome(page);
    await page.evaluate(() => {
      try {
        const chunk = 'x'.repeat(1024 * 1024);
        for (let i = 0; i < 20; i += 1) {
          window.localStorage.setItem('e2e-quota-filler-' + i, chunk);
        }
      } catch {
        // Le remplissage s'arrête naturellement dès que le quota est atteint.
      }
    });

    await page.getByRole('button', { name: /Créer un projet/ }).first().click();
    await page.locator('[contenteditable="true"]').first().click();
    await page.keyboard.type('Projet quota test');
    await expect(page.getByText(/espace de stockage|quota|sauvegarde/i).first()).toBeVisible();
  });

  test("un membre ajouté au projet persiste dans le stockage local après un rechargement", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await gotoHome(page);
    await page.getByRole('button', { name: /Créer un projet/ }).first().click();
    await walkToSynthesis(page, { maxSteps: 30 });
    if ((await page.getByText('Questions obligatoires à compléter').count()) > 0) {
      await page.getByRole('button', { name: /Accéder à la synthèse/ }).click();
    }

    await page.locator('input[type="email"]').first().fill('collegue-e2e@lfb.fr');
    await page.getByRole('button', { name: 'Ajouter' }).first().click();
    await page.waitForTimeout(300);

    await page.reload();
    const membersRaw = await page.evaluate(() => window.localStorage.getItem('complianceNavigatorMockProjectMembers'));
    expect(membersRaw).toContain('collegue-e2e@lfb.fr');
    expect(errors).toEqual([]);
  });
});
