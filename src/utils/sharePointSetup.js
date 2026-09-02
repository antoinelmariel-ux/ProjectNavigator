import { getWebUrl, isSharePointMode, sharepointConfig } from '../config/sharepointConfig.js';
import { diagnoseInstallation, publishAllReferentials } from './referentialStore.js';

const NOT_SHAREPOINT_MESSAGE =
  'Action impossible : ouvrez l’application depuis SharePoint ' +
  '(https://…sharepoint.com/sites/…/CN-App/index.aspx) pour accéder aux listes.';

// Le contrôle de mode vit ici plutôt que chez l’appelant : le diagnostic est le premier
// appel réseau, et hors SharePoint il retomberait sinon sur une erreur HTTP incompréhensible.
export const diagnoseSharePointInstallation = async () => {
  if (!isSharePointMode()) {
    throw new Error(NOT_SHAREPOINT_MESSAGE);
  }
  return diagnoseInstallation();
};

export const reinitializeSharePointConfiguration = async (payload) => {
  const diagnostic = await diagnoseSharePointInstallation();
  if (!diagnostic.ok) {
    throw new Error(
      `Structure SharePoint incomplète : ${diagnostic.missing.join(', ')} introuvable(s). ` +
        'Créez ces listes et bibliothèques avant de publier la configuration.'
    );
  }

  const results = await publishAllReferentials(payload);
  const failures = results.filter(
    (entry) => entry.status === 'error' || entry.status === 'conflict'
  );

  if (failures.length > 0) {
    throw new Error(
      `Publication partielle : ${failures
        .map((entry) => `${entry.file} (${entry.message || entry.status})`)
        .join(' · ')}`
    );
  }

  return {
    siteUrl: getWebUrl(),
    libraryName: sharepointConfig.libraries.config,
    lists: results
      .filter((entry) => entry.status === 'published')
      .map((entry) => ({ key: entry.key, name: entry.file, count: entry.count })),
    skipped: results.filter((entry) => entry.status === 'skipped').map((entry) => entry.file)
  };
};
