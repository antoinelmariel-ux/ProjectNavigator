// Sans backend réel, les providers "Mock*" (utilisés hors mode SharePoint) doivent survivre
// à un rechargement de page comme le reste de l'état applicatif (voir storage.js) : sans
// cela, tout ce qu'ils gèrent (profil, membres de projet, commentaires, sticky notes...)
// disparaît silencieusement au prochain F5, alors que les projets eux-mêmes persistent bien.
const getLocalStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  return window.localStorage;
};

export const loadPersistedMockMap = (storageKey) => {
  const storage = getLocalStorage();
  if (!storage) {
    return new Map();
  }
  try {
    const raw = storage.getItem(storageKey);
    const entries = raw ? JSON.parse(raw) : [];
    return new Map(Array.isArray(entries) ? entries : []);
  } catch {
    return new Map();
  }
};

export const savePersistedMockMap = (storageKey, map) => {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(storageKey, JSON.stringify(Array.from(map.entries())));
  } catch {
    // Quota ou stockage indisponible (mode privé) : les données restent utilisables pour
    // la session en cours, seule leur persistance après rechargement est perdue.
  }
};
