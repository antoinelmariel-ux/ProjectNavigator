import { test, expect } from '@playwright/test';
import { gotoHome, createProjectAndOpenShowcase, collectConsoleErrors } from './fixtures.js';

const openEditor = async (page) => {
  await gotoHome(page);
  await createProjectAndOpenShowcase(page);
  await page.getByRole('button', { name: 'Modifier' }).click();
  await expect(page.locator('.sge-topbar')).toBeVisible();
};

test.describe('Éditeur de vitrine — canvas vivant', () => {
  test('la vitrine reste affichée pendant l’édition et se met à jour à la frappe', async ({ page }) => {
    test.setTimeout(120000);
    const errors = collectConsoleErrors(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openEditor(page);

    // Régression historique : le mode édition remplaçait la vitrine par un bloc vide.
    await expect(page.locator('[data-tour-id="showcase-preview"]')).toBeVisible();
    await expect(page.locator('.sge-frame').first()).toBeVisible();

    const heroTitle = page.locator('.sg-hero__title .sge-inline');
    await heroTitle.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' – édité en direct');

    await expect(page.locator('.sg-hero__title')).toContainText('édité en direct');
    // le champ de l'inspecteur reflète la même valeur : une seule source, deux vues
    await expect(page.locator('.sge-inspector')).toContainText('édité en direct');
    await expect(page.locator('.sge-topbar__status--dirty')).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('le « + » entre deux sections insère le gabarit à cet endroit précis', async ({ page }) => {
    test.setTimeout(120000);
    const errors = collectConsoleErrors(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openEditor(page);

    const titlesBefore = await page.locator('.sge-frame__title').allTextContents();

    const inserter = page.locator('.sge-insert').nth(2);
    await inserter.scrollIntoViewIfNeeded();
    await inserter.hover();
    await inserter.locator('.sge-insert__button').click();

    // les vignettes sont le rendu réel du gabarit, pas un fil de fer
    const card = page.locator('.sge-picker__card').filter({ hasText: 'Bloc multi-colonnes' });
    await expect(card).toBeVisible();
    await expect(card.locator('.sge-picker__preview .sg-band')).toBeAttached();

    // survol : aperçu fantôme inséré à sa place définitive
    await card.hover();
    await expect(page.locator('.sge-ghost')).toBeVisible();

    await card.click();
    await expect(page.locator('.sge-picker')).toHaveCount(0);

    const titlesAfter = await page.locator('.sge-frame__title').allTextContents();
    expect(titlesAfter.length).toBe(titlesBefore.length + 1);
    // insérée en 3e position (après les deux premières sections), pas en fin de vitrine
    expect(titlesAfter.slice(0, 2)).toEqual(titlesBefore.slice(0, 2));
    expect(titlesAfter[2]).not.toBe(titlesBefore[2]);

    expect(errors).toEqual([]);
  });

  test('l’inspecteur n’affiche que la section sélectionnée', async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openEditor(page);

    const inspector = page.locator('[data-tour-id="showcase-edit-panel"]');
    await expect(inspector).toContainText('Hero du projet');
    await expect(inspector).toContainText('Quel est le nom du projet ?');
    // les champs des autres rubriques ne sont pas déversés dans le même formulaire
    await expect(inspector).not.toContainText('Feuille de route');

    const roadmap = page.locator('.sge-frame').filter({ hasText: 'Feuille de route' }).first();
    await roadmap.scrollIntoViewIfNeeded();
    // la barre d'outils de section n'est pointable qu'au survol du cadre : c'est ce qui
    // lui permet de flotter au-dessus de la vitrine sans jamais gêner sa lecture.
    await roadmap.hover();
    await roadmap.locator('button[aria-label="Réglages de la section"]').click();
    await expect(inspector.locator('.sge-title')).toHaveText('Feuille de route');
  });

  test('l’aperçu masque tout le chrome puis le restitue', async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openEditor(page);

    await expect(page.locator('.sge-frame').first()).toBeVisible();
    await page.getByRole('button', { name: /^Aperçu$/ }).click();

    await expect(page.locator('.sge-frame')).toHaveCount(0);
    await expect(page.locator('.sge-inspector')).toHaveCount(0);
    await expect(page.locator('[data-tour-id="showcase-preview"]')).toBeVisible();

    await page.getByRole('button', { name: /Quitter l’aperçu/ }).click();
    await expect(page.locator('.sge-frame').first()).toBeVisible();
  });

  test('annuler puis rétablir remonte et redescend l’historique', async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openEditor(page);

    const before = await page.locator('.sge-frame').count();
    const inserter = page.locator('.sge-insert').nth(1);
    await inserter.scrollIntoViewIfNeeded();
    await inserter.hover();
    await inserter.locator('.sge-insert__button').click();
    await page.locator('.sge-picker__card').first().click();
    await expect(page.locator('.sge-frame')).toHaveCount(before + 1);

    // l'historique est débounce : on attend qu'il ait enregistré le pas
    const undo = page.getByRole('button', { name: 'Annuler' });
    await expect(undo).toBeEnabled();
    await undo.click();
    await expect(page.locator('.sge-frame')).toHaveCount(before);

    await page.getByRole('button', { name: 'Rétablir' }).click();
    await expect(page.locator('.sge-frame')).toHaveCount(before + 1);
  });

  test('publier applique les modifications, quitter en abandonne', async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openEditor(page);

    const heroTitle = page.locator('.sg-hero__title .sge-inline');
    await heroTitle.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' PUBLIE');
    await page.getByRole('button', { name: 'Publier' }).click();

    await expect(page.locator('.sge-topbar')).toHaveCount(0);
    await expect(page.locator('.sg-hero__title')).toContainText('PUBLIE');

    // seconde passe : une modification abandonnée ne doit rien laisser
    await page.getByRole('button', { name: 'Modifier' }).click();
    const heroAgain = page.locator('.sg-hero__title .sge-inline');
    await heroAgain.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' JETE');
    await expect(page.locator('.sg-hero__title')).toContainText('JETE');

    await page.getByRole('button', { name: 'Quitter' }).click();
    await page.getByRole('button', { name: 'Abandonner' }).click();

    await expect(page.locator('.sge-topbar')).toHaveCount(0);
    await expect(page.locator('.sg-hero__title')).toContainText('PUBLIE');
    await expect(page.locator('.sg-hero__title')).not.toContainText('JETE');
  });

  test('réordonner une section depuis sa barre d’outils déplace le bloc dans la vitrine', async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openEditor(page);

    const titlesBefore = await page.locator('.sge-frame__title').allTextContents();
    const third = page.locator('.sge-frame').nth(2);
    await third.scrollIntoViewIfNeeded();
    await third.hover();
    await third.locator('button[aria-label="Monter la section"]').click();

    const titlesAfter = await page.locator('.sge-frame__title').allTextContents();
    expect(titlesAfter[1]).toBe(titlesBefore[2]);
    expect(titlesAfter[2]).toBe(titlesBefore[1]);
    // l'ordre du plan suit celui du canvas : c'est la même source
    await page.locator('.sge-icon-btn').first().click();
    const outlineTitles = await page.locator('.sge-outline__text').allTextContents();
    expect(outlineTitles[1]).toBe(titlesBefore[2]);
  });

  test('un brouillon non publié survit à un rechargement complet', async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openEditor(page);

    const heroTitle = page.locator('.sg-hero__title .sge-inline');
    await heroTitle.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' BROUILLON');

    // le brouillon est écrit hors de complianceNavigatorState : il ne doit surtout pas
    // se retrouver dans les réponses tant qu'il n'est pas publié
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('complianceNavigatorShowcaseDrafts') || ''))
      .toContain('BROUILLON');

    await page.reload();
    await page.getByRole('button', { name: /Vitrine du projet/ }).first().click();

    const banner = page.locator('.sge-draft');
    await expect(banner).toBeVisible();
    // la vitrine publiée, elle, n'a pas bougé
    await expect(page.locator('.sg-hero__title')).not.toContainText('BROUILLON');

    await banner.getByRole('button', { name: 'Reprendre l’édition' }).click();
    await expect(page.locator('.sg-hero__title')).toContainText('BROUILLON');
    await expect(page.locator('.sge-topbar')).toBeVisible();
  });

  test('une section masquée en vue Light reste éditable, et disparaît à l’aperçu', async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openEditor(page);

    await page.getByRole('button', { name: 'Mode Light' }).click();

    const problem = page.locator('.sge-frame').filter({ hasText: 'Le problème' }).first();
    await problem.scrollIntoViewIfNeeded();
    // La barre d'outils du cadre n'apparaît (opacity/pointer-events) qu'au survol de
    // .sge-frame : un .click() direct sur le bouton la cible avant qu'elle ne soit
    // interactive et se heurte au contenu de la section en dessous (comme un vrai
    // utilisateur, il faut d'abord survoler le cadre pour la révéler).
    await problem.hover();
    await problem.locator('button[aria-label="Masquer en vue Light"]').click();

    // toujours présente dans le canvas (barrée), sinon impossible de la réafficher
    await expect(problem).toHaveClass(/sge-frame--hidden/);

    await page.getByRole('button', { name: /^Aperçu$/ }).click();
    await expect(page.locator('[data-showcase-section="problem"]')).toHaveCount(0);
  });
});
