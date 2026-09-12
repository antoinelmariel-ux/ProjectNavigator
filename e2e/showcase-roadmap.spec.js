import { test, expect } from '@playwright/test';
import { gotoHome, createProjectAndOpenShowcase } from './fixtures.js';

// Géométrie de la feuille de route. Elle s'est désalignée deux fois : le trait vivait dans
// le repère de la liste et les pastilles dans celui de leur ligne, si bien qu'une remise à
// zéro générique des <ol> — dans un tout autre fichier — suffisait à les séparer sans que
// rien ne le signale. Depuis, pastille et segment sont les deux pseudo-éléments d'une même
// ligne ; ces mesures sont là pour que la régression ne puisse plus passer inaperçue.
const readGeometry = (page) =>
  page.evaluate(() => {
    const items = [...document.querySelectorAll('.sg-road__item')];
    if (items.length === 0) return null;

    // `left`/`top` calculés portent déjà le centre visé : le recentrage est fait par le
    // transform, qui n'apparaît pas dans ces valeurs.
    const rows = items.map((item) => {
      const box = item.getBoundingClientRect();
      const dot = getComputedStyle(item, '::before');
      const segment = getComputedStyle(item, '::after');
      const hasSegment = segment.content !== 'none';
      const date = item.querySelector('.sg-road__date');
      const dateBox = date ? date.getBoundingClientRect() : null;
      return {
        dotX: box.left + parseFloat(dot.left),
        dotY: box.top + parseFloat(dot.top),
        hasSegment,
        segmentX: hasSegment ? box.left + parseFloat(segment.left) : null,
        segmentTop: hasSegment ? box.top + parseFloat(segment.top) : null,
        segmentBottom: hasSegment ? box.bottom - parseFloat(segment.bottom) : null,
        dateMidY: dateBox ? dateBox.top + dateBox.height / 2 : null
      };
    });

    return {
      count: rows.length,
      lastHasSegment: rows[rows.length - 1].hasSegment,
      maxAxisGap: Math.max(...rows.map(row => (row.hasSegment ? Math.abs(row.dotX - row.segmentX) : 0))),
      maxStartGap: Math.max(...rows.map(row => (row.hasSegment ? Math.abs(row.segmentTop - row.dotY) : 0))),
      maxJoinGap: Math.max(
        ...rows.map((row, index) => {
          const next = rows[index + 1];
          return row.hasSegment && next ? Math.abs(row.segmentBottom - next.dotY) : 0;
        })
      ),
      maxDateGap: Math.max(...rows.map(row => (row.dateMidY === null ? 0 : Math.abs(row.dotY - row.dateMidY))))
    };
  });

test.describe('Feuille de route de la vitrine', () => {
  test('pastilles et trait restent alignés à toutes les largeurs, et le trait s’arrête sur la dernière pastille', async ({ page }) => {
    test.setTimeout(180000);
    await gotoHome(page);
    await createProjectAndOpenShowcase(page);

    // `--sg-marker-col` est un clamp() piloté par la largeur de fenêtre : on balaie ses deux
    // bornes et le palier intermédiaire, là où l'ancien montage dérivait.
    for (const width of [360, 640, 1280, 1680]) {
      await page.setViewportSize({ width, height: 900 });
      await page.locator('.sg-road').scrollIntoViewIfNeeded();
      const geometry = await readGeometry(page);

      expect(geometry, `largeur ${width}`).not.toBeNull();
      expect(geometry.count, `largeur ${width}`).toBeGreaterThan(0);
      // Même axe vertical pour la pastille et son segment.
      expect(geometry.maxAxisGap, `largeur ${width}`).toBeLessThan(0.5);
      // Le segment part du centre de sa pastille et rejoint celui de la suivante.
      expect(geometry.maxStartGap, `largeur ${width}`).toBeLessThan(0.5);
      expect(geometry.maxJoinGap, `largeur ${width}`).toBeLessThan(0.5);
      // La pastille est centrée sur la ligne de date, pas posée à côté.
      expect(geometry.maxDateGap, `largeur ${width}`).toBeLessThan(1);
      // Rien ne dépasse sous le dernier jalon.
      expect(geometry.lastHasSegment, `largeur ${width}`).toBe(false);
    }
  });

  // Le recalage JavaScript d'autrefois ne se rejouait qu'au redimensionnement de la fenêtre :
  // passer en édition change les hauteurs de ligne sans redimensionner, et le trait gardait
  // sa hauteur périmée en pendouillant sous la dernière pastille.
  test('la géométrie tient quand l’éditeur change la mise en page', async ({ page }) => {
    test.setTimeout(180000);
    await gotoHome(page);
    await createProjectAndOpenShowcase(page);
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.getByRole('button', { name: 'Modifier' }).click();
    await expect(page.locator('.sge-inspector')).toBeVisible();
    await page.locator('.sg-road').scrollIntoViewIfNeeded();

    const geometry = await readGeometry(page);
    expect(geometry).not.toBeNull();
    expect(geometry.maxAxisGap).toBeLessThan(0.5);
    expect(geometry.maxJoinGap).toBeLessThan(0.5);
    expect(geometry.lastHasSegment).toBe(false);
  });
});
