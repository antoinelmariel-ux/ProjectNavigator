import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHelpManualViewerSrc,
  getVisibleHelpManuals,
  normalizeHelpManualLink,
  normalizeHelpManuals,
  resolveHelpManualUrl
} from '../src/utils/helpManuals.js';

const context = { origin: 'https://t.sharepoint.com', webUrl: 'https://t.sharepoint.com/sites/cn', isSharePoint: true };

test('normalizeHelpManuals complète les 4 langues des 2 manuels', () => {
  const result = normalizeHelpManuals({ sme: { fr: ' https://a ' }, junk: 1 });
  assert.equal(result.sme.fr, 'https://a');
  assert.deepEqual(Object.keys(result), ['projectManager', 'sme']);
  assert.equal(result.projectManager.de, '');
});

test('normalizeHelpManualLink extrait le src du code incorporer et refuse le non-https', () => {
  assert.equal(
    normalizeHelpManualLink('<iframe src="https://t.sharepoint.com/x?a=1&amp;b=2" width="1"></iframe>'),
    'https://t.sharepoint.com/x?a=1&b=2'
  );
  assert.equal(normalizeHelpManualLink('javascript:alert(1)'), '');
  assert.equal(normalizeHelpManualLink('http://t.sharepoint.com/x'), '');
  assert.equal(normalizeHelpManualLink(''), '');
});

test('resolveHelpManualUrl : langue, puis français, puis toute langue renseignée', () => {
  const manuals = { sme: { fr: 'https://fr', es: 'https://es' } };
  assert.equal(resolveHelpManualUrl(manuals, 'sme', 'es'), 'https://es');
  assert.equal(resolveHelpManualUrl(manuals, 'sme', 'de'), 'https://fr');
  assert.equal(resolveHelpManualUrl({ sme: { en: 'https://en' } }, 'sme', 'de'), 'https://en');
  assert.equal(resolveHelpManualUrl({}, 'sme', 'fr'), '');
});

test('le manuel SME est réservé aux experts, un manuel sans lien est absent', () => {
  const manuals = { sme: { fr: 'https://s' }, projectManager: { fr: 'https://p' } };
  assert.deepEqual(getVisibleHelpManuals(manuals, 'fr', { isExpert: false }).map((m) => m.id), ['projectManager']);
  assert.deepEqual(getVisibleHelpManuals(manuals, 'fr', { isExpert: true }).map((m) => m.id), ['projectManager', 'sme']);
  assert.deepEqual(getVisibleHelpManuals({ sme: { fr: 'https://s' } }, 'fr', { isExpert: false }), []);
});

test('buildHelpManualViewerSrc : visionneuse lecture seule selon le type de lien', () => {
  assert.equal(
    buildHelpManualViewerSrc('https://t.sharepoint.com/sites/cn/Docs/m.pdf', context),
    'https://t.sharepoint.com/sites/cn/Docs/m.pdf#toolbar=0&navpanes=0'
  );
  assert.match(
    buildHelpManualViewerSrc('https://t.sharepoint.com/sites/cn/Docs/Manuel SME.pptx'.replace(' ', '%20'), context),
    /Doc\.aspx\?sourcedoc=.*&action=embedview$/
  );
  assert.equal(
    buildHelpManualViewerSrc('https://t.sharepoint.com/:p:/s/cn/Abc?e=xyz', context),
    'https://t.sharepoint.com/:p:/s/cn/Abc?e=xyz&action=embedview'
  );
  assert.equal(buildHelpManualViewerSrc('https://t.sharepoint.com/sites/cn/Docs/m.pptx', { isSharePoint: false }), '');
});
