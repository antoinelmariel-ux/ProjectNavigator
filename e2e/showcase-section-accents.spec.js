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
    expect(await teamAccent(page)).toBe('rgb(35, 108, 52)');

    // La couleur d'une section se règle désormais depuis les réglages de cette section
    // (l'inspecteur d'édition), pas depuis le bouton « Configurer » — qui ne gère plus que
    // les sections visibles en mode Light et a été retiré de la barre d'édition.
    await page.getByRole('button', { name: 'Modifier' }).click();
    const teamFrame = page.locator('[data-sge-section-id="team"]');
    await teamFrame.scrollIntoViewIfNeeded();
    // La barre d'outils de la section n'est pointable qu'au survol du cadre (voir
    // showcase-editor.spec.js) : elle flotte au-dessus de la vitrine sans gêner sa lecture.
    await teamFrame.hover();
    await teamFrame.getByRole('button', { name: 'Réglages de la section' }).click();
    await expect(page.getByText('Couleur de la section')).toBeVisible();

    await page.getByRole('button', { name: /Rose/ }).click();

    // L'aperçu se met à jour immédiatement, avant même la publication. La teinte « rose »
    // est composée sur la palette Tegeline (voir buildAccentFamilies dans
    // src/utils/showcaseAccents.js) : ce n'est plus la teinte universelle figée.
    await expect.poll(() => teamAccent(page)).toBe('rgb(145, 44, 108)');

    await page.getByRole('button', { name: 'Publier' }).click();

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
