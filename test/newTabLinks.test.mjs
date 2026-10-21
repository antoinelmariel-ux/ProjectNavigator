import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleNewTabLinkClick } from '../src/utils/newTabLinks.js';

const makeLink = (attributes = {}) => ({
  href: attributes.href,
  getAttribute: (name) => (name in attributes ? attributes[name] : null),
  hasAttribute: (name) => name in attributes
});

const makeEvent = (link, overrides = {}) => {
  const event = {
    button: 0,
    defaultPrevented: false,
    prevented: false,
    stopped: false,
    target: { closest: () => link },
    preventDefault() { this.prevented = true; },
    stopPropagation() { this.stopped = true; },
    ...overrides
  };
  return event;
};

const root = { contains: () => true };

test('un lien target="_blank" est ouvert dans un nouvel onglet, sans laisser la page naviguer', () => {
  const opened = [];
  const event = makeEvent(makeLink({ href: 'https://example.com/doc', target: '_blank' }));

  assert.equal(handleNewTabLinkClick(event, root, (...args) => opened.push(args)), true);
  assert.deepEqual(opened, [['https://example.com/doc', '_blank', 'noopener,noreferrer']]);
  assert.equal(event.prevented, true);
  assert.equal(event.stopped, true);
});

test('les liens sans target="_blank", les téléchargements et les liens non http restent au navigateur', () => {
  const cases = [
    makeLink({ href: 'https://example.com' }),
    makeLink({ href: 'https://example.com/f.pdf', target: '_blank', download: '' }),
    makeLink({ href: 'javascript:alert(1)', target: '_blank' }),
    null
  ];
  cases.forEach((link) => {
    const event = makeEvent(link);
    assert.equal(handleNewTabLinkClick(event, root, () => assert.fail('ouvert à tort')), false);
    assert.equal(event.prevented, false);
  });
});

test('clic modifié, autre bouton, clic déjà traité ou lien hors de l’app : rien n’est intercepté', () => {
  const link = makeLink({ href: 'https://example.com', target: '_blank' });
  const never = () => assert.fail('ouvert à tort');

  assert.equal(handleNewTabLinkClick(makeEvent(link, { ctrlKey: true }), root, never), false);
  assert.equal(handleNewTabLinkClick(makeEvent(link, { button: 1 }), root, never), false);
  assert.equal(handleNewTabLinkClick(makeEvent(link, { defaultPrevented: true }), root, never), false);
  assert.equal(handleNewTabLinkClick(makeEvent(link), { contains: () => false }, never), false);
});
