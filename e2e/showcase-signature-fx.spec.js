import { test, expect } from '@playwright/test';
import { gotoHome, createProjectAndOpenShowcase, collectConsoleErrors } from './fixtures.js';

test.describe('Effet WebGL / animations de la vitrine (ShowcaseSignatureFx)', () => {
  test('le canvas WebGL s\'initialise sans erreur et le repli reste masqué quand WebGL est disponible', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await gotoHome(page);
    await createProjectAndOpenShowcase(page);

    const glAvailable = await page.evaluate(() => {
      const canvas = document.querySelector('.sg-bg');
      if (!canvas) return false;
      try {
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
      } catch {
        return false;
      }
    });
    expect(glAvailable).toBe(true);
    await expect(page.locator('.sg-bg-fallback')).toHaveCSS('display', 'none');
    expect(errors).toEqual([]);
  });

  test('le CTA du hero déclenche une ondulation et fait défiler jusqu\'à la section "problème"', async ({ page }) => {
    await gotoHome(page);
    await createProjectAndOpenShowcase(page);

    // ShowcaseSignatureFx attache son écouteur pointerdown dans un useEffect après le montage.
    await page.waitForTimeout(800);
    const scrollYBefore = await page.evaluate(() => window.scrollY);
    const cta = page.getByRole('button', { name: 'Découvrir le projet' });
    await expect(async () => {
      await cta.click();
      await expect(page.locator('.sg-ripple')).toHaveCount(1, { timeout: 500 });
    }).toPass({ timeout: 8000, intervals: [500] });

    await page.waitForTimeout(200);
    const scrollYAfter = await page.evaluate(() => window.scrollY);
    expect(scrollYAfter).toBeGreaterThan(scrollYBefore);

    // L'ondulation se retire d'elle-même après son animation (640ms).
    await expect(page.locator('.sg-ripple')).toHaveCount(0, { timeout: 2000 });
  });

  test('le titre du hero se découpe en mots animés', async ({ page }) => {
    await gotoHome(page);
    await createProjectAndOpenShowcase(page);
    await expect(page.locator('.sg-hero__title .sg-word').first()).toBeVisible();
  });

  test('quitter puis rouvrir la vitrine ne duplique pas le canvas et n\'échoue pas', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await gotoHome(page);
    await createProjectAndOpenShowcase(page);
    await expect(page.locator('.sg-bg')).toHaveCount(1);

    await page.getByRole('button', { name: 'Synthèse' }).click();
    await expect(page.getByRole('heading', { name: 'Synthèse' })).toBeVisible();

    await page.getByRole('button', { name: /Vitrine du projet/ }).click();
    await expect(page.locator('.sg-bg')).toHaveCount(1);
    expect(errors).toEqual([]);
  });
});

test.describe('ShowcaseSignatureFx avec prefers-reduced-motion', () => {
  test('bascule sur le repli statique et affiche immédiatement révélations, compteurs et titre en clair', async ({ page }) => {
    // page.emulateMedia() plutôt que test.use({ reducedMotion: 'reduce' }) : dans cet
    // environnement, l'option de contexte seule n'était pas systématiquement reflétée par
    // matchMedia() avant la première navigation, alors que l'appel explicite l'est de façon fiable.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = collectConsoleErrors(page);
    await gotoHome(page);
    await createProjectAndOpenShowcase(page);
    await page.waitForTimeout(300);

    await expect(page.locator('.sg-bg-fallback')).toHaveCSS('display', 'block');

    // Régression : les compteurs restaient à 0 tant qu'on n'avait pas fait défiler jusqu'à
    // eux, même avec prefers-reduced-motion, contrairement aux autres révélations (sg-rv,
    // road items, story steps) qui s'affichent bien immédiatement dans ce mode.
    const counter = page.locator('[data-sg-count]').first();
    await expect(counter).toHaveText(await counter.getAttribute('data-sg-count'));

    // Pas de découpage mot-par-mot animé en mode "réduit" : le titre reste un texte simple.
    await expect(page.locator('.sg-hero__title .sg-word')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
