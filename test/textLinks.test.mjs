import test from 'node:test';
import assert from 'node:assert/strict';
import { splitTextWithLinks } from '../src/utils/textLinks.js';
import { buildTopicInvitation } from '../src/utils/committeeInvitations.js';

test('splitTextWithLinks isole les URL et laisse la ponctuation finale hors du lien', () => {
  assert.deepEqual(splitTextWithLinks('Voir https://x.fr/a?b=1, puis ok.'), [
    { type: 'text', value: 'Voir ' },
    { type: 'link', value: 'https://x.fr/a?b=1' },
    { type: 'text', value: ', puis ok.' }
  ]);
});

test('splitTextWithLinks ignore les schémas non http(s) et le texte vide', () => {
  assert.deepEqual(splitTextWithLinks('javascript:alert(1)'), [{ type: 'text', value: 'javascript:alert(1)' }]);
  assert.deepEqual(splitTextWithLinks(''), []);
});

test('l\'invitation d\'un sujet transforme les URL de la précision en liens échappés', () => {
  const invitation = buildTopicInvitation({
    session: { id: 's1', committeeId: 'c1', startAt: '2026-12-01T09:00:00.000Z', passages: [] },
    passage: { id: 'p1', kind: 'topic', title: 'Sujet', note: 'Doc <b> https://x.fr/a?b=1&c=2.' },
    committee: { name: 'Comité' }
  });
  assert.match(invitation.bodyHtml, /Doc &lt;b&gt; <a href="https:\/\/x\.fr\/a\?b=1&amp;c=2">https:\/\/x\.fr\/a\?b=1&amp;c=2<\/a>\./);
});
