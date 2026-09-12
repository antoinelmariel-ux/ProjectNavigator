import { test, expect } from '@playwright/test';
import { gotoHome, createProjectAndOpenShowcase, collectConsoleErrors } from './fixtures.js';

const openEditor = async (page) => {
  await gotoHome(page);
  await createProjectAndOpenShowcase(page);
  await page.getByRole('button', { name: 'Modifier' }).click();
  await expect(page.locator('.sge-topbar')).toBeVisible();
};

const insertColumnsSection = async (page) => {
  const inserter = page.locator('.sge-insert').nth(2);
  await inserter.scrollIntoViewIfNeeded();
  await inserter.hover();
  await inserter.locator('.sge-insert__button').click();
  await page.locator('.sge-picker__card').filter({ hasText: 'Bloc multi-colonnes' }).click();
  await expect(page.locator('.sge-picker')).toHaveCount(0);
};

test.describe('Bloc multi-colonnes — colonnes et blocs sont deux réglages distincts', () => {
  test('on ajoute autant de blocs que voulu, indépendamment du nombre de colonnes', async ({ page }) => {
    test.setTimeout(180000);
    const errors = collectConsoleErrors(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openEditor(page);
    await insertColumnsSection(page);

    const grid = page.locator('.sge-workspace__canvas [data-showcase-section="columns"] .sg-grid');
    await expect(grid.locator('.sg-tile')).toHaveCount(3);

    const inspector = page.locator('[data-tour-id="showcase-edit-panel"]');
    const addBlock = inspector.getByRole('button', { name: 'Ajouter un bloc' });

    // Régression corrigée ici : le tableau des blocs était recalé sur le nombre de colonnes,
    // donc un 4e puis un 5e bloc étaient purement et simplement impossibles.
    await addBlock.click();
    await addBlock.click();
    await expect(grid.locator('.sg-tile')).toHaveCount(5);

    // Deux colonnes, cinq blocs : la grille se remplit sur deux rangées et demie.
    await inspector.getByLabel('Nombre de colonnes').selectOption('2');
    await expect(grid.locator('.sg-tile')).toHaveCount(5);
    await expect(grid).toHaveAttribute('data-sg-columns', '2');

    const distinctLefts = await grid.evaluate((node) => {
      const lefts = [...node.querySelectorAll('.sg-tile')].map(tile =>
        Math.round(tile.getBoundingClientRect().left)
      );
      return [...new Set(lefts)].length;
    });
    expect(distinctLefts).toBe(2);

    expect(errors).toEqual([]);
  });

  test('le nombre de colonnes choisi est celui qui s’affiche', async ({ page }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openEditor(page);
    await insertColumnsSection(page);

    const grid = page.locator('.sge-workspace__canvas [data-showcase-section="columns"] .sg-grid');
    const inspector = page.locator('[data-tour-id="showcase-edit-panel"]');

    await inspector.getByRole('button', { name: 'Ajouter un bloc' }).click();
    await expect(grid.locator('.sg-tile')).toHaveCount(4);

    // Avec `auto-fit`, quatre cartes de 260px tenaient sur une seule rangée quelle que
    // soit la valeur choisie : le sélecteur n'avait aucun effet visible.
    for (const count of ['1', '3', '4']) {
      await inspector.getByLabel('Nombre de colonnes').selectOption(count);
      await expect(grid).toHaveAttribute('data-sg-columns', count);
      const distinctLefts = await grid.evaluate((node) => {
        const lefts = [...node.querySelectorAll('.sg-tile')].map(tile =>
          Math.round(tile.getBoundingClientRect().left)
        );
        return [...new Set(lefts)].length;
      });
      expect(distinctLefts).toBe(Number(count));
    }
  });
});

test.describe('Feuille de route — remise en ordre chronologique', () => {
  test('des jalons saisis dans le désordre sont replacés dans l’ordre des dates', async ({ page }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openEditor(page);

    const inspector = page.locator('[data-tour-id="showcase-edit-panel"]');
    const roadmap = page.locator('.sge-frame').filter({ hasText: 'Feuille de route' }).first();
    await roadmap.scrollIntoViewIfNeeded();
    await roadmap.hover();
    await roadmap.locator('button[aria-label="Réglages de la section"]').click();
    await expect(inspector.locator('.sge-title')).toHaveText('Feuille de route');

    const addMilestone = inspector.getByRole('button', { name: 'Ajouter un jalon' });
    const dateAt = index => inspector.locator(`#showcase-edit-roadmapMilestones-date-${index}`);
    const descriptionAt = index =>
      inspector.locator(`#showcase-edit-roadmapMilestones-description-${index}`);

    // Le projet créé par la fixture porte déjà un jalon au 2026-04-01.
    await expect(dateAt(0)).toHaveValue('2026-04-01');
    await descriptionAt(0).fill('Cadrage');

    await addMilestone.click();
    await dateAt(1).fill('2027-01-15');
    await descriptionAt(1).fill('Généralisation');

    await addMilestone.click();
    // Antérieur aux deux précédents : il doit remonter en tête, tout seul.
    await dateAt(2).fill('2025-11-20');
    await expect(dateAt(0)).toHaveValue('2025-11-20');
    await descriptionAt(0).fill('Étude');

    await expect(dateAt(1)).toHaveValue('2026-04-01');
    await expect(descriptionAt(1)).toHaveValue('Cadrage');
    await expect(dateAt(2)).toHaveValue('2027-01-15');

    const roadmapDates = await page
      .locator('[data-showcase-section="timeline"] .sg-road__date')
      .allTextContents();
    const manualDates = roadmapDates.slice(-3);
    expect(manualDates).toEqual(['20/11/2025', '01/04/2026', '15/01/2027']);
  });
});
