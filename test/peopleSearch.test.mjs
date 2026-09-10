import test from 'node:test';
import assert from 'node:assert/strict';
import { resetSpRestClient } from '../src/utils/spRestClient.js';
import { MIN_QUERY_LENGTH, isKnownSiteUser, parsePeoplePickerResponse, searchOrgPeople } from '../src/utils/peopleSearch.js';
import { mockOrgDirectory } from '../src/data/mockOrgDirectory.js';

const makeResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  text: async () => JSON.stringify(body)
});

const withSharePointFetch = async (handler, fn) => {
  const previous = globalThis.window;
  globalThis.window = {
    location: {
      origin: 'https://lfb1.sharepoint.com',
      pathname: '/sites/ProjectNavigator_DEV/CN-App/index.aspx',
      protocol: 'https:',
      hostname: 'lfb1.sharepoint.com'
    },
    fetch: async (url, init = {}) => handler(url, init)
  };
  resetSpRestClient();
  try {
    return await fn();
  } finally {
    globalThis.window = previous;
    resetSpRestClient();
  }
};

test('parsePeoplePickerResponse : lit le tableau JSON imbriqué dans ClientPeoplePickerSearchUser', () => {
  const entities = [
    {
      Key: 'i:0#.f|membership|claire.dubreuil@lfb.fr',
      DisplayText: 'Claire Dubreuil',
      EntityData: { Email: 'claire.dubreuil@lfb.fr' }
    },
    {
      // Pas d'EntityData.Email mais une Key exploitable (cas observé pour certains comptes).
      Key: 'marc.lefevre@lfb.fr',
      DisplayText: 'Marc Lefevre',
      EntityData: {}
    },
    {
      // Groupe de sécurité résolu comme une entité unique, sans adresse exploitable : ignoré.
      Key: 'c:0t.c|tenant|11111111-1111-1111-1111-111111111111',
      DisplayText: 'Equipe Conformité',
      EntityData: {}
    }
  ];

  const payload = { d: { ClientPeoplePickerSearchUser: JSON.stringify(entities) } };

  assert.deepEqual(parsePeoplePickerResponse(payload), [
    { displayName: 'Claire Dubreuil', email: 'claire.dubreuil@lfb.fr' },
    { displayName: 'Marc Lefevre', email: 'marc.lefevre@lfb.fr' }
  ]);
});

test('parsePeoplePickerResponse : réponse absente ou invalide -> tableau vide', () => {
  assert.deepEqual(parsePeoplePickerResponse(null), []);
  assert.deepEqual(parsePeoplePickerResponse({ d: {} }), []);
  assert.deepEqual(parsePeoplePickerResponse({ d: { ClientPeoplePickerSearchUser: 'pas du json' } }), []);
});

test('searchOrgPeople : hors mode SharePoint, cherche dans l’annuaire fictif local', async () => {
  const previous = globalThis.window;
  globalThis.window = undefined;
  try {
    const results = await searchOrgPeople('claire');
    assert.deepEqual(results, [{ displayName: 'Claire Dubreuil', email: 'claire.dubreuil@lfb.fr' }]);

    const byEmail = await searchOrgPeople('marc.lefevre@lfb.fr');
    assert.equal(byEmail.length, 1);
    assert.equal(byEmail[0].email, 'marc.lefevre@lfb.fr');

    assert.deepEqual(await searchOrgPeople('a'.repeat(MIN_QUERY_LENGTH - 1)), []);
    assert.deepEqual(await searchOrgPeople('zzz-inconnu'), []);
  } finally {
    globalThis.window = previous;
  }
});

test('searchOrgPeople : couvre bien tout l’annuaire fictif (regression si quelqu’un le vide)', () => {
  assert.ok(mockOrgDirectory.length > 0);
  mockOrgDirectory.forEach((person) => {
    assert.match(person.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });
});

test('searchOrgPeople : en mode SharePoint, interroge clientPeoplePickerSearchUser', async () => {
  const entities = [
    { Key: 'i:0#.f|membership|julie.moreau@lfb.fr', DisplayText: 'Julie Moreau', EntityData: { Email: 'julie.moreau@lfb.fr' } }
  ];

  const calls = [];
  await withSharePointFetch((url, init) => {
    calls.push({ url, init });
    if (String(url).includes('/_api/contextinfo')) {
      return makeResponse(200, { d: { GetContextWebInformation: { FormDigestValue: 'DIGEST-1', FormDigestTimeoutSeconds: 1800 } } });
    }
    return makeResponse(200, { d: { ClientPeoplePickerSearchUser: JSON.stringify(entities) } });
  }, async () => {
    const results = await searchOrgPeople('julie');
    assert.deepEqual(results, [{ displayName: 'Julie Moreau', email: 'julie.moreau@lfb.fr' }]);
  });

  const searchCall = calls.find((call) => String(call.url).includes('clientPeoplePickerSearchUser'));
  assert.ok(searchCall, 'appelle bien clientPeoplePickerSearchUser');
  const sentBody = JSON.parse(searchCall.init.body);
  assert.equal(sentBody.queryParams.QueryString, 'julie');
  assert.equal(sentBody.queryParams.PrincipalType, 1);
});

test('isKnownSiteUser : adresse vide -> false, sans appel réseau', async () => {
  assert.equal(await isKnownSiteUser(''), false);
  assert.equal(await isKnownSiteUser(null), false);
});

test('isKnownSiteUser : hors mode SharePoint, toujours true (pas de notion de membre)', async () => {
  const previous = globalThis.window;
  globalThis.window = undefined;
  try {
    assert.equal(await isKnownSiteUser('claire.dubreuil@lfb.fr'), true);
  } finally {
    globalThis.window = previous;
  }
});

test('isKnownSiteUser : en mode SharePoint, interroge _api/web/siteusers par e-mail', async () => {
  const calls = [];

  const known = await withSharePointFetch((url) => {
    calls.push(url);
    return makeResponse(200, { value: [{ Id: 12, Email: 'claire.dubreuil@lfb.fr' }] });
  }, () => isKnownSiteUser('Claire.Dubreuil@LFB.fr'));
  assert.equal(known, true);
  const call = calls.find((url) => String(url).includes('/_api/web/siteusers'));
  assert.ok(call, 'interroge bien /_api/web/siteusers');
  assert.ok(String(call).includes("Email%20eq%20'claire.dubreuil%40lfb.fr'"));

  const unknown = await withSharePointFetch(() => makeResponse(200, { value: [] }), () =>
    isKnownSiteUser('inconnu@lfb.fr')
  );
  assert.equal(unknown, false);
});
