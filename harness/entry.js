// Harnais de dev : monte l'application hors SharePoint (fournisseurs mock), avec le même
// code et la même transformation que le web part SPFx. Sert aux tests e2e Playwright.
import { mountApp } from 'project-navigator-app';
import {
  hydratePersistedState,
  loadPersistedState,
  persistState,
  readPersistedState
} from '../src/utils/storage.js';

// L'état vit dans IndexedDB, asynchrone : un addInitScript ne peut plus le lire ni le réécrire
// avant le démarrage. Les specs déposent donc des fonctions `(state) => state` dans
// `window.__cnE2EStatePatches` (voir patchStateOnBoot dans e2e/fixtures.js ; renvoyer `undefined`
// laisse l'état inchangé), appliquées ici et
// réécrites dans le stockage avant le montage, comme l'était leur ancien patch du localStorage.
const applyE2EStatePatches = async () => {
  const patches = Array.isArray(window.__cnE2EStatePatches) ? window.__cnE2EStatePatches : [];
  if (patches.length === 0) {
    return;
  }
  await hydratePersistedState();
  const patched = patches.reduce((state, patch) => {
    const next = patch(state);
    return next === undefined ? state : next;
  }, loadPersistedState());
  if (patched) {
    await persistState(patched);
  }
};

window.__cnReadPersistedState = readPersistedState;

applyE2EStatePatches()
  .catch((error) => console.error('Patch e2e de l’état impossible :', error))
  .then(() => mountApp(document.getElementById('root')));
