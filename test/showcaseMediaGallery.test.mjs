import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CAPTION_MODE_NONE,
  CAPTION_MODE_PER_MEDIA,
  CAPTION_MODE_SHARED,
  DEFAULT_MEDIA_WIDTH,
  MAX_MEDIA_WIDTH,
  MIN_MEDIA_WIDTH,
  clampCarouselIndex,
  clampMediaWidth,
  computeMediaWidthFromPointer,
  moveMediaItem,
  normalizeCaptionMode,
  normalizeCaptionPosition,
  normalizeMediaList,
  parseStreamLink,
  resolveMediaCaption,
  resolveMediaKindFromFile,
  resolveStreamEmbedUrl
} from '../src/utils/showcaseMediaGallery.js';

test('resolveMediaKindFromFile : extension d’abord, type MIME ensuite, sinon null', () => {
  assert.equal(resolveMediaKindFromFile({ name: 'photo.JPEG' }), 'image');
  assert.equal(resolveMediaKindFromFile({ name: 'film.mov' }), 'video');
  assert.equal(resolveMediaKindFromFile({ name: 'podcast.m4a' }), 'audio');
  assert.equal(resolveMediaKindFromFile({ name: 'sans-extension', mimeType: 'video/mp4' }), 'video');
  assert.equal(resolveMediaKindFromFile({ name: 'rapport.pdf', mimeType: 'application/pdf' }), null);
});

test('parseStreamLink : n’accepte qu’un lien https SharePoint Online ou Stream', () => {
  assert.equal(
    parseStreamLink('https://contoso.sharepoint.com/:v:/s/projet/EabcDEF?e=x1'),
    'https://contoso.sharepoint.com/:v:/s/projet/EabcDEF?e=x1'
  );
  assert.equal(parseStreamLink('http://contoso.sharepoint.com/video.mp4'), null);
  assert.equal(parseStreamLink('https://youtube.com/watch?v=1'), null);
  assert.equal(parseStreamLink('javascript:alert(1)'), null);
  assert.equal(parseStreamLink(''), null);
});

test('parseStreamLink : extrait le src d’un code d’intégration collé tel quel', () => {
  const embedCode = '<iframe src="https://contoso.sharepoint.com/sites/p/_layouts/15/embed.aspx?UniqueId=1234&amp;embed=%7B%7D" width="640" height="360"></iframe>';
  assert.equal(
    parseStreamLink(embedCode),
    'https://contoso.sharepoint.com/sites/p/_layouts/15/embed.aspx?UniqueId=1234&embed=%7B%7D'
  );
});

test('resolveStreamEmbedUrl : seules les adresses de lecteur intégrable s’affichent dans la page', () => {
  const embed = 'https://contoso.sharepoint.com/sites/p/_layouts/15/embed.aspx?UniqueId=1234';
  assert.equal(resolveStreamEmbedUrl(embed), embed);
  assert.equal(
    resolveStreamEmbedUrl('https://web.microsoftstream.com/video/0a1b2c3d-1111'),
    'https://web.microsoftstream.com/embed/video/0a1b2c3d-1111'
  );
  assert.equal(resolveStreamEmbedUrl('https://contoso.sharepoint.com/:v:/s/projet/EabcDEF'), '');
  assert.equal(resolveStreamEmbedUrl('https://evil.example.com/_layouts/15/embed.aspx'), '');
});

test('normalizeMediaList : écarte les entrées invalides ou dangereuses, garde l’ordre et dédoublonne les ids', () => {
  const list = normalizeMediaList([
    { id: 'a', kind: 'image', url: 'https://contoso.sharepoint.com/a.png', name: ' a.png ', caption: ' Légende ' },
    { id: 'b', kind: 'image', url: 'javascript:alert(1)' },
    { id: 'c', kind: 'video', url: 'data:text/html,<script>' },
    { id: 'd', kind: 'pdf', url: 'https://contoso.sharepoint.com/d.pdf' },
    { id: 'a', kind: 'audio', url: 'data:audio/mpeg;base64,AAA' },
    { id: 'e', kind: 'stream', url: 'https://youtube.com/x' },
    null
  ]);
  assert.deepEqual(list.map((item) => item.kind), ['image', 'audio']);
  assert.equal(list[0].name, 'a.png');
  assert.equal(list[0].caption, 'Légende');
  assert.notEqual(list[0].id, list[1].id);
});

test('réglages : mode et position de légende, largeur bornée', () => {
  assert.equal(normalizeCaptionMode('n’importe quoi'), CAPTION_MODE_SHARED);
  assert.equal(normalizeCaptionMode(CAPTION_MODE_PER_MEDIA), CAPTION_MODE_PER_MEDIA);
  assert.equal(normalizeCaptionPosition('top'), 'right');
  assert.equal(normalizeCaptionPosition('below'), 'below');
  assert.equal(clampMediaWidth(5), MIN_MEDIA_WIDTH);
  assert.equal(clampMediaWidth(240), MAX_MEDIA_WIDTH);
  assert.equal(clampMediaWidth('abc'), DEFAULT_MEDIA_WIDTH);
  assert.equal(clampMediaWidth(47.6), 48);
});

test('computeMediaWidthFromPointer : la poignée suit le bord opposé à la légende', () => {
  const box = { containerLeft: 100, containerWidth: 1000, mediaLeft: 100, mediaRight: 1100 };
  assert.equal(computeMediaWidthFromPointer({ ...box, pointerX: 600, captionPosition: 'right' }), 50);
  assert.equal(
    computeMediaWidthFromPointer({ ...box, mediaLeft: 500, mediaRight: 1100, pointerX: 800, captionPosition: 'left' }),
    30
  );
  assert.equal(computeMediaWidthFromPointer({ ...box, pointerX: 900, captionPosition: 'below' }), 60);
  assert.equal(computeMediaWidthFromPointer({ ...box, pointerX: 0, captionPosition: 'right' }), MIN_MEDIA_WIDTH);
});

test('resolveMediaCaption : aucune, commune (description) ou propre au média', () => {
  const media = [{ caption: 'Première' }, { caption: '' }];
  assert.equal(resolveMediaCaption({ captionMode: CAPTION_MODE_NONE, description: 'X', media }, 0), '');
  assert.equal(resolveMediaCaption({ captionMode: CAPTION_MODE_SHARED, description: ' Commune ', media }, 1), 'Commune');
  assert.equal(resolveMediaCaption({ captionMode: CAPTION_MODE_PER_MEDIA, description: 'X', media }, 0), 'Première');
  assert.equal(resolveMediaCaption({ captionMode: CAPTION_MODE_PER_MEDIA, description: 'X', media }, 1), '');
});

test('moveMediaItem et clampCarouselIndex', () => {
  assert.deepEqual(moveMediaItem(['a', 'b', 'c'], 0, 1), ['b', 'a', 'c']);
  assert.deepEqual(moveMediaItem(['a', 'b', 'c'], 0, -1), ['a', 'b', 'c']);
  assert.equal(clampCarouselIndex(3, 3), 0);
  assert.equal(clampCarouselIndex(-1, 3), 2);
  assert.equal(clampCarouselIndex(4, 0), 0);
});
