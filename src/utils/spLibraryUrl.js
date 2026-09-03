import { sharepointConfig } from '../config/sharepointConfig.js';
import { odataQuote, spGet } from './spRestClient.js';

// Le "Url" interne généré par SharePoint à la création d'une bibliothèque peut diverger de son
// Title affiché (constaté sur ProjectNavigator_DEV : le tiret de "CN-App" est absent de l'URL
// réelle alors que le Title l'a bien). `documentStore.js`/`referentialStore.js` appellent
// GetFolderByServerRelativeUrl / GetFileByServerRelativeUrl, qui exigent le chemin réel — on le
// résout donc via l'API plutôt que de le reconstruire depuis le nom configuré.
const cache = new Map();

export const resolveLibraryServerRelativeUrl = async (libraryKey) => {
  if (cache.has(libraryKey)) {
    return cache.get(libraryKey);
  }

  const title = sharepointConfig.libraries[libraryKey];
  if (!title) {
    throw new Error(`Bibliothèque inconnue : ${libraryKey}`);
  }

  const promise = spGet(
    `/_api/web/lists/getbytitle('${odataQuote(title)}')/rootFolder?$select=ServerRelativeUrl`
  ).then((data) => data.ServerRelativeUrl);

  promise.catch(() => cache.delete(libraryKey));
  cache.set(libraryKey, promise);
  return promise;
};

export const resetLibraryUrlCache = () => cache.clear();
