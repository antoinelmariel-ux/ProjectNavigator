import { test, expect } from '@playwright/test';
import { gotoHome, walkToSynthesis } from './fixtures.js';

// Ouvre la vitrine d'un projet Tegeline : sa palette (accent #2b8f42) sert de référence
// pour vérifier que les sections intégrées suivent le thème par défaut.
async function openTegelineShowcase(page) {
  await gotoHome(page);
  await page.getByRole('button', { name: /Créer un projet/ }).first().click();
  await walkToSynthesis(page, {
    async onQuestion(heading, p) {
      if (heading && heading.includes('produit ou environnement')) {
        await p.getByText('Produit', { exact: true }).first().click();
        await p.waitForTimeout(400);
        await p.getByText('Tegeline', { exact: true }).first().click();
        return true;
      }
      if (heading && heading.includes('jalons')) {
        await p.getByRole('button', { name: /Ajouter un jalon/ }).click();
        await p.locator('input[type="date"]').first().fill('2026-04-01');
        return true;
      }
      if (heading && heading.includes('document')) {
        await p.locator('input[type="file"]').first().setInputFiles({
          name: 'doc.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('x')
        });
        return true;
      }
      return false;
    }
  });
  if ((await page.getByText('Questions obligatoires à compléter').count()) > 0) {
    await page.getByRole('button', { name: /Accéder à la synthèse/ }).click();
  }
  await page.getByRole('button', { name: /Vitrine du projet/ }).click();
  await expect(page.getByRole('button', { name: 'Partager' })).toBeVisible();
}

const teamAccent = (page) =>
  page.evaluate(() => {
    const el = document.querySelector('[data-showcase-section="team"] .sg-eyebrow');
    return el ? getComputedStyle(el).color : null;
  });

test.describe('Couleur des sections de la vitrine', () => {
  test('les sections suivent la palette du thème, et une couleur alternative reste après rechargement', async ({ page }) => {
    test.setTimeout(240000);
    await openTegelineShowcase(page);

    // Défaut : l'accent dérive de la palette Tegeline (#2b8f42 assombri pour rester lisible
    // en texte sur fond clair), surtout pas le rose figé d'origine.
    expect(await teamAccent(page)).toBe('rgb(30, 100, 46)');

    await page.getByRole('button', { name: 'Configurer' }).first().click();
    await expect(page.getByText('Couleur des sections')).toBeVisible();

    const teamLabel = page.locator('span', { hasText: /^Équipe & alliances$/ }).last();
    await teamLabel.scrollIntoViewIfNeeded();
    await teamLabel.locator('xpath=following-sibling::div[1]').getByRole('button', { name: /Rose/ }).click();
    await page.getByRole('button', { name: 'Valider' }).click();

    await expect.poll(() => teamAccent(page)).toBe('rgb(147, 37, 121)');

    // Le choix appartient au projet et non à la session : il est écrit dans ses réponses,
    // contrairement à la sélection des sections du mode Light qui reste un réglage éphémère.
    await page.reload();
    const stored = await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('complianceNavigatorState'));
      const project = (state.projects || []).find((item) => item?.answers?.showcaseSectionAccents);
      return project ? project.answers.showcaseSectionAccents : null;
    });
    // Seul l'écart au thème est stocké : une section laissée sur « Thème » suivra la marque
    // même si la palette change plus tard.
    expect(stored).toEqual({ team: 'rose' });
  });
});
