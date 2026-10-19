import { test, expect } from '@playwright/test';
import { gotoHome, createProjectAndOpenShowcase, collectConsoleErrors } from './fixtures.js';

// PNG 1×1 : le seul format affiché nativement (<img>) hors SharePoint, donc vérifiable ici.
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const openEditorWithDocumentViewer = async (page) => {
  await gotoHome(page);
  await createProjectAndOpenShowcase(page);
  await page.getByRole('button', { name: 'Modifier' }).click();
  await expect(page.locator('.sge-topbar')).toBeVisible();

  const inserter = page.locator('.sge-insert').nth(2);
  await inserter.scrollIntoViewIfNeeded();
  await inserter.hover();
  await inserter.locator('.sge-insert__button').click();
  await page.locator('.sge-picker__card').filter({ hasText: 'Visionneuse documentaire' }).click();
  await expect(page.locator('.sge-picker')).toHaveCount(0);
};

// Un vrai glisser depuis le bureau est hors de portée de Playwright : on rejoue la séquence
// d'événements avec un DataTransfer qui porte des fichiers, comme le navigateur le ferait.
const buildFileTransfer = (page, files) =>
  page.evaluateHandle((entries) => {
    const transfer = new DataTransfer();
    entries.forEach(({ name, type, base64 }) => {
      const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
      transfer.items.add(new File([bytes], name, { type }));
    });
    return transfer;
  }, files);

const dropFiles = async (locator, page, files) => {
  const dataTransfer = await buildFileTransfer(page, files);
  await locator.dispatchEvent('dragenter', { dataTransfer });
  await locator.dispatchEvent('dragover', { dataTransfer });
  await locator.dispatchEvent('drop', { dataTransfer });
};

const png = (name) => ({ name, type: 'image/png', base64: PNG_BASE64 });

// Un survol réel émet un dragover en continu (≈ toutes les 50 ms) : on le reproduit, sinon
// le voile s'efface avant qu'on ait pu le mesurer.
const startHoveringWithFile = (zone) =>
  zone.evaluate((node) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['x'], 'apercu.png', { type: 'image/png' }));
    node.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: transfer }));
    window.__documentDragPump = setInterval(() => {
      node.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: transfer }));
    }, 50);
  });

const stopHovering = (page) => page.evaluate(() => clearInterval(window.__documentDragPump));

test.describe('Visionneuse documentaire — dépôt de fichier par glisser-déposer', () => {
  test('on dépose un document sur le canevas, puis on le remplace au même endroit', async ({ page }) => {
    test.setTimeout(180000);
    const errors = collectConsoleErrors(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openEditorWithDocumentViewer(page);

    const canvasZone = page.locator(
      '.sge-workspace__canvas [data-showcase-section="document-viewer"] .sg-doc .sge-dropzone'
    );
    await canvasZone.scrollIntoViewIfNeeded();

    // Le voile n'apparaît que pendant le survol d'un fichier…
    await expect(canvasZone.locator('.sge-dropzone__veil')).toHaveCount(0);
    await startHoveringWithFile(canvasZone);
    await expect(canvasZone.locator('.sge-dropzone__veil')).toContainText('Déposer le fichier ici');
    await expect(canvasZone).toHaveClass(/sge-dropzone--over/);
    await stopHovering(page);
    // …et s'efface de lui-même quand le survol cesse (fichier ramené hors de la fenêtre).
    await expect(canvasZone.locator('.sge-dropzone__veil')).toHaveCount(0);

    await dropFiles(canvasZone, page, [png('premier.png')]);
    const image = canvasZone.locator('img.sg-doc__image');
    await expect(image).toHaveAttribute('src', /^data:image\/png/);

    const inspector = page.locator('[data-tour-id="showcase-edit-panel"]');
    await expect(inspector.getByText('Document déposé — ouvrir')).toBeVisible();

    await dropFiles(canvasZone, page, [png('second.png')]);
    await expect(image).toHaveAttribute('src', /^data:image\/png/);
    await expect(canvasZone.locator('.sge-dropzone__veil')).toHaveCount(0);

    expect(errors).toEqual([]);
  });

  test('le dépôt fonctionne aussi dans l’inspecteur, et refuse plusieurs fichiers à la fois', async ({ page }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openEditorWithDocumentViewer(page);

    const inspector = page.locator('[data-tour-id="showcase-edit-panel"]');
    const inspectorZone = inspector.locator('.sge-dropzone');
    await expect(inspectorZone).toContainText('Choisir un fichier ou le glisser ici');

    await dropFiles(inspectorZone, page, [png('un.png'), png('deux.png')]);
    await expect(inspector.getByText('Un seul document par visionneuse')).toBeVisible();
    await expect(inspector.getByText('Document déposé — ouvrir')).toHaveCount(0);

    await dropFiles(inspectorZone, page, [png('un.png')]);
    await expect(inspector.getByText('Document déposé — ouvrir')).toBeVisible();
    await expect(inspector.getByText('Un seul document par visionneuse')).toHaveCount(0);
    await expect(
      page.locator('.sge-workspace__canvas [data-showcase-section="document-viewer"] img.sg-doc__image')
    ).toBeVisible();
  });

  test('un fichier non autorisé affiche l’erreur sur le canevas, sans rien déposer', async ({ page }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openEditorWithDocumentViewer(page);

    const section = page.locator('.sge-workspace__canvas [data-showcase-section="document-viewer"]');
    await dropFiles(section.locator('.sg-doc .sge-dropzone'), page, [
      { name: 'script.exe', type: 'application/octet-stream', base64: PNG_BASE64 }
    ]);
    await expect(section.locator('.sge-doc-error')).toContainText('ne sont pas autorisés');
    await expect(section.locator('img.sg-doc__image')).toHaveCount(0);
  });

  test('le voile couvre un document intégré : l’iframe ne capte pas le dépôt', async ({ page }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openEditorWithDocumentViewer(page);

    const canvasZone = page.locator(
      '.sge-workspace__canvas [data-showcase-section="document-viewer"] .sg-doc .sge-dropzone'
    );
    await dropFiles(canvasZone, page, [
      { name: 'note.pdf', type: 'application/pdf', base64: btoa('%PDF-1.4\n%%EOF') }
    ]);
    await expect(canvasZone.locator('iframe.sg-doc__frame')).toHaveCount(1);
    await canvasZone.scrollIntoViewIfNeeded();

    await startHoveringWithFile(canvasZone);
    await expect(canvasZone.locator('.sge-dropzone__veil')).toContainText('Déposer pour remplacer le document');

    const topElementClass = await canvasZone.evaluate((zone) => {
      const box = zone.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return hit?.closest('.sge-dropzone__veil') ? 'veil' : hit?.tagName;
    });
    await stopHovering(page);
    expect(topElementClass).toBe('veil');
  });

  test('un fichier lâché à côté d’une zone n’est pas ouvert par le navigateur, seulement en édition', async ({ page }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    await createProjectAndOpenShowcase(page);

    // Renvoie, pour un dragover puis un drop lâchés hors de toute zone, si le navigateur
    // aurait appliqué son comportement par défaut (ouvrir le fichier) et l'effet affiché.
    const dropOutsideZones = () =>
      page.evaluate(() => {
        const target = document.querySelector('[data-showcase-section]') || document.body;
        const transfer = new DataTransfer();
        transfer.items.add(new File(['x'], 'egare.png', { type: 'image/png' }));
        const over = new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: transfer });
        target.dispatchEvent(over);
        const drop = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer });
        target.dispatchEvent(drop);
        return {
          overBlocked: over.defaultPrevented,
          dropEffect: transfer.dropEffect,
          dropBlocked: drop.defaultPrevented
        };
      });

    // Hors édition, l'application ne s'en mêle pas.
    expect(await dropOutsideZones()).toMatchObject({ overBlocked: false, dropBlocked: false });

    await page.getByRole('button', { name: 'Modifier' }).click();
    await expect(page.locator('.sge-topbar')).toBeVisible();
    expect(await dropOutsideZones()).toEqual({ overBlocked: true, dropEffect: 'none', dropBlocked: true });

    // Une zone de la visionneuse garde la main : le dépôt y est accepté, pas refusé.
    const inserter = page.locator('.sge-insert').nth(2);
    await inserter.scrollIntoViewIfNeeded();
    await inserter.hover();
    await inserter.locator('.sge-insert__button').click();
    await page.locator('.sge-picker__card').filter({ hasText: 'Visionneuse documentaire' }).click();
    const canvasZone = page.locator(
      '.sge-workspace__canvas [data-showcase-section="document-viewer"] .sg-doc .sge-dropzone'
    );
    await dropFiles(canvasZone, page, [png('accepte.png')]);
    await expect(canvasZone.locator('img.sg-doc__image')).toBeVisible();
  });
});
