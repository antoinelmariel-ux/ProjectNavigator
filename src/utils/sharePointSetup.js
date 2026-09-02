import { getWebUrl, isSharePointMode, sharepointConfig } from '../config/sharepointConfig.js';
import { diagnoseInstallation, publishAllReferentials } from './referentialStore.js';
import { rulesProvider } from './rulesProvider.js';
import { teamsProvider } from './teamsProvider.js';

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

// `rules`/`teams` ne sont plus des fichiers CN-Config : une ligne par élément, upsertée via
// leur provider respectif. On ne supprime jamais une ligne distante absente localement — un
// admin qui veut nettoyer une règle/équipe orpheline le fait depuis SharePoint.
const publishRowList = async (items, saveItem, { key, file, label, userEmail }) => {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) {
    return { key, file, label, status: 'skipped' };
  }

  const failures = [];
  for (let index = 0; index < list.length; index += 1) {
    try {
      await saveItem(list[index], { sortOrder: index * 1000, userEmail });
    } catch (error) {
      failures.push(`${list[index]?.id ?? index} : ${error?.message || error}`);
    }
  }

  return failures.length > 0
    ? { key, file, label, status: 'error', message: failures.join(' · ') }
    : { key, file, label, status: 'published', count: list.length };
};

export const reinitializeSharePointConfiguration = async (payload) => {
  const { rules, teams, userEmail, ...referentialPayload } = payload || {};

  const diagnostic = await diagnoseSharePointInstallation();
  if (!diagnostic.ok) {
    throw new Error(
      `Structure SharePoint incomplète : ${diagnostic.missing.join(', ')} introuvable(s). ` +
        'Créez ces listes et bibliothèques avant de publier la configuration.'
    );
  }

  const [fileResults, rulesResult, teamsResult] = await Promise.all([
    publishAllReferentials(referentialPayload),
    publishRowList(rules, (rule, options) => rulesProvider.saveRule(rule, options), {
      key: 'rules',
      file: sharepointConfig.lists.rules,
      label: 'Règles',
      userEmail
    }),
    publishRowList(teams, (team, options) => teamsProvider.saveTeam(team, options), {
      key: 'teams',
      file: sharepointConfig.lists.teams,
      label: 'Équipes',
      userEmail
    })
  ]);

  const results = [...fileResults, rulesResult, teamsResult];
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
