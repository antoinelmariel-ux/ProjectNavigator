import test from 'node:test';
import assert from 'node:assert/strict';
import { describeCommitteeSessionForEmail } from '../src/utils/committeeSessionEmails.js';

const session = (location) => ({
  id: 's1',
  committeeId: 'c1',
  startAt: '2026-11-10T13:00:00.000Z',
  durationMinutes: 60,
  status: 'published',
  location
});

test('un e-mail du calendrier ne contient jamais le lien Teams ni la salle', () => {
  ['https://teams.microsoft.com/l/meetup-join/secret', 'Salle Pasteur, bâtiment B', ''].forEach((location) => {
    const text = describeCommitteeSessionForEmail(session(location));
    assert.match(text, /^Session: Tuesday,? 10 November 2026, /);
    assert.equal(text.includes('teams.microsoft.com'), false);
    assert.equal(text.includes('Pasteur'), false);
    assert.match(text, /How to join is in your Outlook invitation/);
  });
});

test('une séance annulée ne renvoie pas vers « comment rejoindre »', () => {
  const text = describeCommitteeSessionForEmail(session('https://teams.microsoft.com/l/meetup-join/secret'), { withJoinHint: false });
  assert.equal(text.includes('How to join'), false);
  assert.equal(text.includes('teams.microsoft.com'), false);
});
