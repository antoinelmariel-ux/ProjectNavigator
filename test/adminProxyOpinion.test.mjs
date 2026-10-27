import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAdminProxy,
  isAdminAuthoredMessage,
  normalizeAdminProxy,
  resolveAdminProxyForSave
} from '../src/utils/adminProxyOpinion.js';

test('normalizeAdminProxy exige un email et le met en forme', () => {
  assert.equal(normalizeAdminProxy(null), null);
  assert.equal(normalizeAdminProxy({ email: '  ' }), null);
  assert.deepEqual(normalizeAdminProxy({ email: ' Admin@LFB.fr ', at: '2026-01-01T00:00:00.000Z' }), {
    email: 'admin@lfb.fr',
    at: '2026-01-01T00:00:00.000Z'
  });
  assert.deepEqual(getAdminProxy({ adminProxy: { email: 'a@b.fr' } }), { email: 'a@b.fr', at: '' });
});

test('seul un admin hors du périmètre laisse la marque', () => {
  const at = '2026-01-01T00:00:00.000Z';
  assert.deepEqual(
    resolveAdminProxyForSave({ canBypass: true, isPerimeterMember: false, email: 'admin@lfb.fr', at }),
    { email: 'admin@lfb.fr', at }
  );
  assert.equal(resolveAdminProxyForSave({ canBypass: true, isPerimeterMember: true, email: 'admin@lfb.fr', at }), null);
  assert.equal(resolveAdminProxyForSave({ canBypass: false, isPerimeterMember: false, email: 'x@lfb.fr', at }), null);
});

test('un message est signalé admin seulement si son auteur est admin et pas membre', () => {
  const adminEmails = ['Admin@lfb.fr'];
  assert.equal(isAdminAuthoredMessage({ authorEmail: 'admin@lfb.fr', adminEmails, memberEmails: [] }), true);
  assert.equal(isAdminAuthoredMessage({ authorEmail: 'admin@lfb.fr', adminEmails, memberEmails: ['ADMIN@lfb.fr'] }), false);
  assert.equal(isAdminAuthoredMessage({ authorEmail: '', adminEmails }), false);
  assert.equal(isAdminAuthoredMessage({ authorEmail: 'expert@lfb.fr', adminEmails }), false);
});
