import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOfficeEmbedSrc,
  buildPdfEmbedSrc,
  resolveDocumentEmbedSrc
} from '../src/utils/documentEmbed.js';

const sharePointContext = {
  origin: 'https://tenant.sharepoint.com',
  webUrl: 'https://tenant.sharepoint.com/sites/ProjectNavigator',
  isSharePoint: true
};

test('un PDF est rendu directement, panneau de vignettes refermé', () => {
  const src = buildPdfEmbedSrc('https://tenant.sharepoint.com/sites/X/CN-Documents/note.pdf');
  assert.equal(
    src,
    'https://tenant.sharepoint.com/sites/X/CN-Documents/note.pdf#navpanes=0&pagemode=none'
  );
});

test('un fragment déjà présent dans l’URL du PDF n’est pas réécrit', () => {
  const src = buildPdfEmbedSrc('https://exemple.com/note.pdf#page=4');
  assert.equal(src, 'https://exemple.com/note.pdf#page=4');
});

test('un PPTX du tenant passe par le visualiseur Office du site, pas par officeapps.live.com', () => {
  const src = buildOfficeEmbedSrc(
    'https://tenant.sharepoint.com/sites/ProjectNavigator/CN-Documents/showcase/p1/deck%20final.pptx',
    sharePointContext
  );

  assert.equal(
    src,
    'https://tenant.sharepoint.com/sites/ProjectNavigator/_layouts/15/Doc.aspx'
      + '?sourcedoc=%2Fsites%2FProjectNavigator%2FCN-Documents%2Fshowcase%2Fp1%2Fdeck%20final.pptx'
      + '&action=embedview'
  );
  assert.ok(!src.includes('officeapps.live.com'));
});

test('hors mode SharePoint, aucun aperçu Office n’est tenté', () => {
  const src = buildOfficeEmbedSrc('data:application/vnd.ms-powerpoint;base64,AAAA', {
    ...sharePointContext,
    isSharePoint: false
  });

  assert.equal(src, '');
});

test('un document hors bibliothèque du tenant n’est jamais intégré', () => {
  assert.equal(buildOfficeEmbedSrc('data:application/pdf;base64,AAAA', sharePointContext), '');
  assert.equal(buildOfficeEmbedSrc('https://autre-site.com/deck.pptx', sharePointContext), '');
});

test('resolveDocumentEmbedSrc : les images n’ont pas d’aperçu iframe, elles sont rendues en <img>', () => {
  assert.equal(
    resolveDocumentEmbedSrc('https://tenant.sharepoint.com/x/photo.jpg', 'jpg', sharePointContext),
    ''
  );
  assert.equal(
    resolveDocumentEmbedSrc('https://tenant.sharepoint.com/x/photo.png', 'png', sharePointContext),
    ''
  );
});

test('resolveDocumentEmbedSrc : sans document, rien à intégrer', () => {
  assert.equal(resolveDocumentEmbedSrc('', 'pdf', sharePointContext), '');
});
