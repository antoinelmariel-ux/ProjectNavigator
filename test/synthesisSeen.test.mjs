import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ensureSynthesisSeenRecord,
  getLatestExpertActivityAt,
  hasUnseenExpertActivity,
  markSynthesisSeen
} from '../src/utils/synthesisSeen.js';

const memoryStorage = () => {
  const data = new Map();
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) };
};

const OWNER = 'owner@lfb.fr';
const project = (teams = {}, extra = {}) => ({
  id: 'p1',
  status: 'submitted',
  ownerEmail: OWNER,
  sharedWith: ['co@lfb.fr'],
  answers: { __compliance_team_comments__: { teams, committees: {} } },
  ...extra
});

test('un avis, un statut ou un message d’expert compte ; les messages des porteurs non', () => {
  assert.equal(getLatestExpertActivityAt(project({
    legal: {
      status: 'pending_information',
      statusUpdatedAt: '2026-10-01T10:00:00Z',
      replies: [
        { authorEmail: 'expert@lfb.fr', createdAt: '2026-10-02T10:00:00Z' },
        { authorEmail: 'CO@lfb.fr', createdAt: '2026-10-05T10:00:00Z' },
        { authorEmail: OWNER, createdAt: '2026-10-06T10:00:00Z' }
      ]
    }
  })), '2026-10-02T10:00:00Z');
  assert.equal(getLatestExpertActivityAt(project({ legal: { statusUpdatedAt: '2026-10-01T10:00:00Z' } })), '');
});

test('la première lecture pose une référence : l’historique existant ne s’allume pas', () => {
  const storage = memoryStorage();
  const old = project({ legal: { status: 'validated', statusUpdatedAt: '2026-09-01T10:00:00Z' } });
  const record = ensureSynthesisSeenRecord(OWNER, { storage, now: '2026-10-01T00:00:00Z' });
  assert.equal(hasUnseenExpertActivity(old, record), false);
  const again = ensureSynthesisSeenRecord(OWNER, { storage, now: '2026-12-01T00:00:00Z' });
  assert.equal(again.initializedAt, '2026-10-01T00:00:00Z');
});

test('nouvel avis après la dernière ouverture des enjeux : pastille, éteinte en les rouvrant', () => {
  const storage = memoryStorage();
  ensureSynthesisSeenRecord(OWNER, { storage, now: '2026-10-01T00:00:00Z' });
  markSynthesisSeen(OWNER, 'p1', { storage, now: '2026-10-02T00:00:00Z' });
  const withNews = project({ legal: { status: 'validated', comment: 'ok', statusUpdatedAt: '2026-10-03T10:00:00Z' } });
  assert.equal(hasUnseenExpertActivity(withNews, ensureSynthesisSeenRecord(OWNER, { storage })), true);
  markSynthesisSeen(OWNER, 'p1', { storage, now: '2026-10-04T00:00:00Z' });
  assert.equal(hasUnseenExpertActivity(withNews, ensureSynthesisSeenRecord(OWNER, { storage })), false);
});
