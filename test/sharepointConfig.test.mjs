import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getLibraryServerRelativeUrl,
  getSiteRelativeUrl,
  getWebUrl,
  isSharePointMode,
  sharepointConfig
} from '../src/config/sharepointConfig.js';

const withLocation = (location, extra, fn) => {
  const previous = globalThis.window;
  globalThis.window = { location, ...extra };
  try {
    return fn();
  } finally {
    globalThis.window = previous;
  }
};

const spo = (pathname) => ({
  origin: 'https://lfb1.sharepoint.com',
  pathname,
  protocol: 'https:',
  hostname: 'lfb1.sharepoint.com'
});

test('getWebUrl : remonte du dossier de l’app jusqu’au web SharePoint', () => {
  withLocation(spo('/sites/ProjectNavigator_DEV/CN-App/index.aspx'), {}, () => {
    assert.equal(getWebUrl(), 'https://lfb1.sharepoint.com/sites/ProjectNavigator_DEV');
  });
});

test('getWebUrl : déduit le site depuis n’importe quelle page du site', () => {
  withLocation(spo('/sites/ProjectNavigator_DEV/SitePages/Accueil.aspx'), {}, () => {
    assert.equal(getWebUrl(), 'https://lfb1.sharepoint.com/sites/ProjectNavigator_DEV');
  });
});

test('getWebUrl : la surcharge __CN_WEB_URL__ gagne et perd son slash final', () => {
  withLocation(spo('/sites/Autre/CN-App/index.aspx'), { __CN_WEB_URL__: 'https://lfb1.sharepoint.com/sites/Force/' }, () => {
    assert.equal(getWebUrl(), 'https://lfb1.sharepoint.com/sites/Force');
  });
});

test('getWebUrl : chaîne vide hors navigateur', () => {
  const previous = globalThis.window;
  globalThis.window = undefined;
  try {
    assert.equal(getWebUrl(), '');
  } finally {
    globalThis.window = previous;
  }
});

test('getSiteRelativeUrl : chemin relatif au serveur', () => {
  withLocation(spo('/sites/ProjectNavigator_DEV/CN-App/index.aspx'), {}, () => {
    assert.equal(getSiteRelativeUrl(), '/sites/ProjectNavigator_DEV');
  });
});

test('getLibraryServerRelativeUrl : chemin complet des bibliothèques', () => {
  withLocation(spo('/sites/ProjectNavigator_DEV/CN-App/index.aspx'), {}, () => {
    assert.equal(
      getLibraryServerRelativeUrl('config'),
      '/sites/ProjectNavigator_DEV/CN-Config'
    );
    assert.throws(() => getLibraryServerRelativeUrl('inconnue'), /Bibliothèque inconnue/);
  });
});

test('isSharePointMode : vrai seulement en https sur *.sharepoint.com', () => {
  withLocation(spo('/sites/X/CN-App/index.aspx'), {}, () => {
    assert.equal(isSharePointMode(), true);
  });
  withLocation(
    { origin: 'null', pathname: '/index.html', protocol: 'file:', hostname: '' },
    {},
    () => {
      assert.equal(isSharePointMode(), false);
    }
  );
  withLocation(
    { origin: 'http://localhost:3000', pathname: '/', protocol: 'http:', hostname: 'localhost' },
    {},
    () => {
      assert.equal(isSharePointMode(), false);
    }
  );
});

test('sharepointConfig : les 12 listes et 3 bibliothèques attendues', () => {
  assert.equal(Object.keys(sharepointConfig.lists).length, 12);
  assert.equal(sharepointConfig.lists.projects, 'CN_Projects');
  assert.equal(sharepointConfig.lists.notificationsQueue, 'CN_NotificationsQueue');
  assert.equal(sharepointConfig.lists.userProfiles, 'CN_UserProfiles');
  assert.equal(sharepointConfig.lists.rules, 'CN_Rules');
  assert.equal(sharepointConfig.lists.teams, 'CN_Teams');
  assert.deepEqual(Object.values(sharepointConfig.libraries), [
    'CN-App',
    'CN-Config',
    'CN-Documents'
  ]);
});
