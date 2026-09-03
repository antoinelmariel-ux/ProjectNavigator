import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NOTIFICATION_CATALOG,
  NOTIFICATION_TYPES,
  buildNotification,
  buildNotificationSubject,
  escapeHtml
} from '../src/utils/notificationTemplates.js';

const baseContext = {
  projectName: 'Campagne patients 2026',
  projectId: 'p-1',
  actorName: 'Antoine Lassauge',
  actorEmail: 'antoine@lfb.fr',
  ownerEmail: 'porteur@lfb.fr',
  occurredAt: '2026-08-28T14:30:00.000Z'
};

test('chaque type déclaré possède un gabarit complet', () => {
  const types = Object.values(NOTIFICATION_TYPES);
  assert.equal(types.length, Object.keys(NOTIFICATION_CATALOG).length);

  types.forEach((type) => {
    const definition = NOTIFICATION_CATALOG[type];
    assert.ok(definition, `gabarit manquant pour ${type}`);
    assert.equal(typeof definition.actionType, 'string');
    assert.ok(definition.actionType.length > 0);

    const context = { ...baseContext, teamNames: [] };
    assert.ok(definition.intro(context).length > 20, `intro trop courte pour ${type}`);
    const expected = definition.expected(context);
    assert.ok(Array.isArray(expected) && expected.length >= 2, `attentes trop maigres pour ${type}`);
    assert.ok(definition.reason(context).length > 10, `justification trop courte pour ${type}`);
  });
});

test('chaque notification explique ce qui est attendu ET pourquoi elle est reçue', () => {
  Object.values(NOTIFICATION_TYPES).forEach((type) => {
    const { body } = buildNotification({ ...baseContext, type });
    assert.ok(body.includes('What is expected of you'), `section « attendu » absente pour ${type}`);
    assert.ok(
      body.includes('Why are you receiving this message?'),
      `section « pourquoi » absente pour ${type}`
    );
    assert.ok(body.includes('do not reply to this email'), `mention automatique absente pour ${type}`);
    assert.ok(body.includes('Campagne patients 2026'));
  });
});

test('ordre du corps : intro → contenu du message → lien → tableau → attendu', () => {
  const { body } = buildNotification({
    ...baseContext,
    type: NOTIFICATION_TYPES.SHOWCASE_COMMENT,
    excerpt: 'Merci de retirer le visuel page 3.',
    appUrl: 'https://lfb1.sharepoint.com/sites/PN/CN-App/index.aspx?projectId=p-1'
  });

  const positions = {
    intro: body.indexOf('posted a comment'),
    contenu: body.indexOf('Message content'),
    lien: body.indexOf('Open the project in Project Navigator'),
    tableau: body.indexOf('<table'),
    attendu: body.indexOf('What is expected of you'),
    pourquoi: body.indexOf('Why are you receiving this message?')
  };

  Object.entries(positions).forEach(([nom, index]) => {
    assert.ok(index > -1, `section « ${nom} » absente`);
  });

  assert.ok(positions.intro < positions.contenu, 'le contenu doit suivre l’introduction');
  assert.ok(positions.contenu < positions.lien, 'le lien doit suivre le contenu du message');
  assert.ok(positions.lien < positions.tableau, 'le tableau doit venir après le lien');
  assert.ok(positions.tableau < positions.attendu, 'les attentes doivent suivre le tableau');
  assert.ok(positions.attendu < positions.pourquoi, 'la justification reste en pied de message');
});

test('sans contenu de message, le lien reste avant le tableau', () => {
  const { body } = buildNotification({
    ...baseContext,
    type: NOTIFICATION_TYPES.PROJECT_SUBMITTED_TEAM,
    appUrl: 'https://lfb1.sharepoint.com/sites/PN/CN-App/index.aspx?projectId=p-1'
  });

  assert.ok(!body.includes('Message content'));
  assert.ok(
    body.indexOf('Open the project in Project Navigator') < body.indexOf('<table'),
    'le lien doit précéder le tableau récapitulatif'
  );
});

test('buildNotificationSubject : préfixe, nom de projet et action', () => {
  assert.equal(
    buildNotificationSubject('Mon projet', 'Project submitted for review'),
    '[Project Navigator] Mon projet - Project submitted for review'
  );
  assert.equal(
    buildNotificationSubject('   ', ''),
    '[Project Navigator] Untitled project - Notification'
  );
});

test('escapeHtml : neutralise le balisage injecté', () => {
  assert.equal(escapeHtml('<script>alert("x")</script>'), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
});

test('un nom de projet contenant du HTML ne casse pas l’e-mail', () => {
  const { body, subject } = buildNotification({
    ...baseContext,
    type: NOTIFICATION_TYPES.SHOWCASE_COMMENT,
    projectName: '<img src=x onerror=alert(1)>',
    excerpt: '<b>gras</b>'
  });

  assert.ok(!body.includes('<img src=x'));
  assert.ok(body.includes('&lt;img src=x'));
  assert.ok(!body.includes('<b>gras</b>'));
  assert.ok(subject.includes('<img src=x onerror=alert(1)>'));
});

test('la soumission cite les équipes concernées dans la justification', () => {
  const { body } = buildNotification({
    ...baseContext,
    type: NOTIFICATION_TYPES.PROJECT_SUBMITTED_TEAM,
    teamNames: ['Contrôle pub', 'Juridique France']
  });

  assert.ok(body.includes('Contrôle pub, Juridique France'));
  assert.ok(body.includes('stakeholder'));
});

test('le lien vers le projet n’apparaît que s’il est fourni', () => {
  const withLink = buildNotification({
    ...baseContext,
    type: NOTIFICATION_TYPES.PROJECT_SHARED,
    appUrl: 'https://lfb1.sharepoint.com/sites/PN/CN-App/index.aspx?projectId=p-1'
  });
  assert.ok(withLink.body.includes('Open the project in Project Navigator'));
  assert.ok(withLink.body.includes('projectId=p-1'));

  const withoutLink = buildNotification({ ...baseContext, type: NOTIFICATION_TYPES.PROJECT_SHARED });
  assert.ok(!withoutLink.body.includes('Open the project in Project Navigator'));
});

test('un extrait trop long est tronqué', () => {
  const { body } = buildNotification({
    ...baseContext,
    type: NOTIFICATION_TYPES.SHOWCASE_COMMENT,
    excerpt: 'a'.repeat(900)
  });
  assert.ok(body.includes('…'));
  assert.ok(!body.includes('a'.repeat(700)));
});

test('la date est présentée en format lisible, pas en ISO', () => {
  const { body } = buildNotification({ ...baseContext, type: NOTIFICATION_TYPES.SHOWCASE_COMMENT });
  assert.ok(!body.includes('2026-08-28T14:30'));
  assert.ok(/2[89]\/08\/2026/.test(body));
});

test('type inconnu rejeté explicitement', () => {
  assert.throws(
    () => buildNotification({ ...baseContext, type: 'inexistant' }),
    /Type de notification inconnu/
  );
});

test('valeurs manquantes remplacées par des libellés neutres', () => {
  const { body, subject } = buildNotification({ type: NOTIFICATION_TYPES.SHOWCASE_COMMENT });
  assert.ok(subject.includes('Untitled project'));
  assert.ok(body.includes('A user'));
});
