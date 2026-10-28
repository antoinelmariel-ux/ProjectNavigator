import { test, expect } from '@playwright/test';
import { gotoHome, createProjectAndOpenShowcase, collectConsoleErrors } from './fixtures.js';

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const png = (name) => ({ name, type: 'image/png', base64: PNG_BASE64 });
const mp3 = (name) => ({ name, type: 'audio/mpeg', base64: 'SUQzAwAAAAAAAA==' });

const STREAM_EMBED_CODE =
  '<iframe src="https://contoso.sharepoint.com/sites/projet/_layouts/15/embed.aspx?UniqueId=1234&amp;embed=%7B%7D" width="640" height="360"></iframe>';

const openEditorWithMediaGallery = async (page) => {
  // Le lecteur Stream intégré viserait un vrai tenant : on lui sert une page vide.
  await page.route('https://contoso.sharepoint.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Stream</title>' })
  );
  await gotoHome(page);
  await createProjectAndOpenShowcase(page);
  await page.getByRole('button', { name: 'Modifier' }).click();
  await expect(page.locator('.sge-topbar')).toBeVisible();

  const inserter = page.locator('.sge-insert').nth(2);
  await inserter.scrollIntoViewIfNeeded();
  await inserter.hover();
  await inserter.locator('.sge-insert__button').click();
  await page.locator('.sge-picker__card').filter({ hasText: 'Galerie média' }).click();
  await expect(page.locator('.sge-picker')).toHaveCount(0);
};

const setFiles = async (page, files) => {
  const input = page.getByTestId('media-gallery-file-input');
  await input.setInputFiles(files.map(({ name, type, base64 }) => ({
    name,
    mimeType: type,
    buffer: Buffer.from(base64, 'base64')
  })));
};

const canvasGallery = (page) =>
  page.locator('.sge-workspace__canvas [data-showcase-section="media-gallery"]');

test.describe('Vitrine — bloc « Galerie média »', () => {
  test('un média seul, puis un carrousel au clic, réordonnable, avec une légende par média', async ({ page }) => {
    test.setTimeout(180000);
    const errors = collectConsoleErrors(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openEditorWithMediaGallery(page);

    const gallery = canvasGallery(page);
    await expect(gallery.locator('.sg-media__empty')).toBeVisible();

    await setFiles(page, [png('premiere.png')]);
    await expect(gallery.locator('img.sg-media__image')).toHaveAttribute('src', /^data:image\/png/);
    // Un seul média : pas de carrousel.
    await expect(gallery.locator('.sg-media__nav')).toHaveCount(0);

    await setFiles(page, [png('deuxieme.png'), mp3('podcast.mp3')]);
    const inspector = page.getByTestId('media-gallery-controls');
    await expect(inspector.getByTestId('media-gallery-item')).toHaveCount(3);
    await expect(gallery.locator('.sg-media__count')).toHaveText('1 / 3');

    await gallery.getByRole('button', { name: 'Média suivant' }).click();
    await expect(gallery.locator('.sg-media__count')).toHaveText('2 / 3');
    await gallery.getByRole('button', { name: 'Afficher le média 3' }).click();
    await expect(gallery.locator('audio')).toHaveCount(1);
    await gallery.getByRole('button', { name: 'Média suivant' }).click();
    await expect(gallery.locator('.sg-media__count')).toHaveText('1 / 3');

    await inspector.getByRole('button', { name: 'Descendre le média 1' }).click();
    await expect(inspector.getByTestId('media-gallery-item').first()).toContainText('deuxieme.png');

    await inspector.getByRole('button', { name: 'Une par média' }).click();
    const firstCaption = inspector.getByTestId('media-gallery-item').first().locator('[contenteditable="true"]');
    await firstCaption.click();
    await page.keyboard.type('Légende de la deuxième image');
    await expect(gallery.locator('.sg-media__caption')).toContainText('Légende de la deuxième image');
    await gallery.getByRole('button', { name: 'Média suivant' }).click();
    await expect(gallery.locator('.sg-media__caption')).not.toContainText('Légende de la deuxième image');

    await inspector.getByRole('button', { name: 'Retirer le média 3' }).click();
    await expect(inspector.getByTestId('media-gallery-item')).toHaveCount(2);

    await page.getByRole('button', { name: 'Publier' }).click();
    await expect(page.locator('.sge-topbar')).toHaveCount(0);
    const published = page.locator('[data-showcase-section="media-gallery"]');
    await expect(published.locator('.sg-media__count')).toHaveText('1 / 2');
    await expect(published.locator('.sg-media__caption')).toContainText('Légende de la deuxième image');
    await expect(published.getByTestId('media-gallery-resize-handle')).toHaveCount(0);

    expect(errors).toEqual([]);
  });

  test('position de la légende, poignée de redimensionnement et passage sous le média en étroit', async ({ page }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openEditorWithMediaGallery(page);
    await setFiles(page, [png('photo.png')]);

    const gallery = canvasGallery(page);
    const media = gallery.locator('.sg-media');
    const inspector = page.getByTestId('media-gallery-controls');
    await expect(media).toHaveAttribute('data-caption-position', 'right');

    await inspector.getByRole('button', { name: 'À gauche' }).click();
    await expect(media).toHaveAttribute('data-caption-position', 'left');
    await inspector.getByRole('button', { name: 'En dessous' }).click();
    await expect(media).toHaveAttribute('data-caption-position', 'below');
    await inspector.getByRole('button', { name: 'À droite' }).click();

    const handle = gallery.getByTestId('media-gallery-resize-handle');
    await handle.scrollIntoViewIfNeeded();
    const stage = gallery.locator('.sg-media__stage');
    const before = await stage.boundingBox();
    const box = await handle.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 200, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    const after = await stage.boundingBox();
    expect(after.width).toBeLessThan(before.width - 120);
    // Les proportions suivent : l'image carrée reste carrée.
    const image = await gallery.locator('img.sg-media__image').boundingBox();
    expect(Math.abs(image.width - image.height)).toBeLessThan(2);
    const width = Number(await handle.getAttribute('aria-valuenow'));
    expect(width).toBeLessThan(60);

    await handle.focus();
    await page.keyboard.press('ArrowRight');
    await expect(handle).toHaveAttribute('aria-valuenow', String(width + 5));

    // Sur un bloc étroit, la légende repasse sous le média quelle que soit sa position.
    await page.getByRole('button', { name: 'Publier' }).click();
    await page.setViewportSize({ width: 420, height: 900 });
    const published = page.locator('[data-showcase-section="media-gallery"] .sg-media');
    await published.scrollIntoViewIfNeeded();
    await expect(published).toHaveCSS('flex-direction', 'column');
  });

  test('un lien Microsoft Stream s’ajoute comme un média, avec l’avertissement sur le partage', async ({ page }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openEditorWithMediaGallery(page);

    const inspector = page.getByTestId('media-gallery-controls');
    await expect(inspector.getByTestId('media-gallery-stream-warning')).toContainText('partagez la vidéo dans Stream');

    const streamInput = inspector.getByLabel('Ou un lien vers une vidéo Microsoft Stream');
    await streamInput.fill('https://www.youtube.com/watch?v=abc');
    await inspector.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await expect(inspector.getByText('Ce lien n’est pas un lien Microsoft Stream')).toBeVisible();

    await streamInput.fill(STREAM_EMBED_CODE);
    await inspector.getByRole('button', { name: 'Ajouter', exact: true }).click();
    const gallery = canvasGallery(page);
    await expect(gallery.locator('iframe.sg-media__frame')).toHaveAttribute(
      'src',
      'https://contoso.sharepoint.com/sites/projet/_layouts/15/embed.aspx?UniqueId=1234&embed=%7B%7D'
    );

    await streamInput.fill('https://contoso.sharepoint.com/:v:/s/projet/EabcDEF?e=x1');
    await inspector.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await gallery.getByRole('button', { name: 'Média suivant' }).click();
    await expect(gallery.getByRole('link', { name: 'Ouvrir dans Stream' })).toHaveAttribute(
      'href',
      'https://contoso.sharepoint.com/:v:/s/projet/EabcDEF?e=x1'
    );
  });
});
