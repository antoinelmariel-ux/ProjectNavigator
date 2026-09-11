import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SHOWCASE_SHARE_PARAM,
  decodeShowcaseShareToken,
  encodeShowcaseShareToken,
  isSharedShowcaseSearch,
  readShowcaseShareToken
} from '../src/utils/showcaseShareLink.js';

test('le jeton restitue exactement les options de partage', () => {
  const settings = {
    projectId: 'proj-42',
    displayMode: 'light',
    commentsEnabled: true,
    annotationVisibility: 'mine'
  };

  assert.deepEqual(decodeShowcaseShareToken(encodeShowcaseShareToken(settings)), settings);
});

test('les valeurs par défaut sont le mode complet, sans commentaires, tous les post-its', () => {
  assert.deepEqual(decodeShowcaseShareToken(encodeShowcaseShareToken({ projectId: 'p1' })), {
    projectId: 'p1',
    displayMode: 'full',
    commentsEnabled: false,
    annotationVisibility: 'all'
  });
});

test('le jeton ne laisse pas lire le mode d\'affichage en clair', () => {
  const lightToken = encodeShowcaseShareToken({ projectId: 'proj-42', displayMode: 'light' });
  const fullToken = encodeShowcaseShareToken({ projectId: 'proj-42', displayMode: 'full' });

  assert.notEqual(lightToken, fullToken);
  [lightToken, fullToken].forEach((token) => {
    assert.ok(!/light|full|proj-42/i.test(token));
    assert.ok(!/light|full/i.test(Buffer.from(token, 'base64url').toString('latin1')));
  });
});

test('un jeton retouché à la main est rejeté', () => {
  const token = encodeShowcaseShareToken({ projectId: 'proj-42', displayMode: 'light' });

  for (let index = 0; index < token.length; index += 1) {
    const replacement = token[index] === 'A' ? 'B' : 'A';
    const tampered = `${token.slice(0, index)}${replacement}${token.slice(index + 1)}`;
    assert.equal(decodeShowcaseShareToken(tampered), null, `caractère ${index}`);
  }

  assert.equal(decodeShowcaseShareToken(token.slice(0, -2)), null);
  assert.equal(decodeShowcaseShareToken(`${token}AAAA`), null);
  assert.equal(decodeShowcaseShareToken('not a token!'), null);
  assert.equal(decodeShowcaseShareToken(''), null);
  assert.equal(decodeShowcaseShareToken(null), null);
});

test('un identifiant de projet non ASCII survit à l\'aller-retour', () => {
  const token = encodeShowcaseShareToken({ projectId: 'projet-éclair 2030' });

  assert.equal(decodeShowcaseShareToken(token).projectId, 'projet-éclair 2030');
});

test('sans identifiant de projet, aucun jeton n\'est produit', () => {
  assert.equal(encodeShowcaseShareToken({ projectId: '   ' }), '');
  assert.equal(encodeShowcaseShareToken({}), '');
  assert.equal(encodeShowcaseShareToken(null), '');
});

test('readShowcaseShareToken lit le paramètre de partage et ignore le reste', () => {
  const token = encodeShowcaseShareToken({ projectId: 'p1', displayMode: 'light' });

  assert.equal(readShowcaseShareToken(`?${SHOWCASE_SHARE_PARAM}=${token}`).displayMode, 'light');
  assert.equal(readShowcaseShareToken(`?x=1&${SHOWCASE_SHARE_PARAM}=${token}`).projectId, 'p1');
  assert.equal(readShowcaseShareToken('?projectId=p1&showcaseMode=light'), null);
  assert.equal(readShowcaseShareToken(`?${SHOWCASE_SHARE_PARAM}=broken`), null);
  assert.equal(readShowcaseShareToken(''), null);
});

test('les anciens liens en clair restent reconnus comme des vues partagées', () => {
  const token = encodeShowcaseShareToken({ projectId: 'p1' });

  assert.equal(isSharedShowcaseSearch('?projectId=p1&showcaseShared=1'), true);
  assert.equal(isSharedShowcaseSearch('?projectId=p1&showcaseShared=true'), true);
  assert.equal(isSharedShowcaseSearch(`?${SHOWCASE_SHARE_PARAM}=${token}`), true);
  assert.equal(isSharedShowcaseSearch(`?${SHOWCASE_SHARE_PARAM}=broken`), false);
  assert.equal(isSharedShowcaseSearch('?projectId=p1'), false);
  assert.equal(isSharedShowcaseSearch(''), false);
});
