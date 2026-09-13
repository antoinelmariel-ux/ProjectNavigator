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

const ensureSharePointStructureReady = async () => {
  const diagnostic = await diagnoseSharePointInstallation();
  if (!diagnostic.ok) {
    throw new Error(
      `Structure SharePoint incomplète : ${diagnostic.missing.join(', ')} introuvable(s). ` +
        'Créez ces listes et bibliothèques avant de publier la configuration.'
    );
  }
};

const throwOnFailures = (results) => {
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
};

const buildPublishSummary = (results) => ({
  siteUrl: getWebUrl(),
  libraryName: sharepointConfig.libraries.config,
  lists: results
    .filter((entry) => entry.status === 'published')
    .map((entry) => ({ key: entry.key, name: entry.file, count: entry.count })),
  skipped: results.filter((entry) => entry.status === 'skipped').map((entry) => entry.file)
});

// Publie uniquement les référentiels JSON (questions, niveaux de risque, pondérations,
// thèmes, réglages) : n'écrit jamais les listes CN_Rules/CN_Teams, qui se synchronisent déjà
// ligne par ligne au fil des éditions du back-office (voir rulesProvider/teamsProvider).
// `selectedKeys` (Set) restreint quels référentiels sont republiés ; omis, tous le sont.
export const publishReferentialSettings = async (referentialPayload, selectedKeys) => {
  await ensureSharePointStructureReady();
  const results = await publishAllReferentials(referentialPayload, selectedKeys);
  throwOnFailures(results);
  return buildPublishSummary(results);
};

// `selection` (optionnelle) restreint ce que la réinitialisation écrase :
// `selection.files` (Set de clés REFERENTIAL_FILES) pour les référentiels JSON, et
// `selection.rules`/`selection.teams` (booléens, true par défaut) pour les listes.
export const reinitializeSharePointConfiguration = async (payload, selection) => {
  const { rules, teams, userEmail, ...referentialPayload } = payload || {};

  await ensureSharePointStructureReady();

  const includeRules = !selection || selection.rules !== false;
  const includeTeams = !selection || selection.teams !== false;
  const fileKeys = selection ? selection.files : undefined;

  const [fileResults, rulesResult, teamsResult] = await Promise.all([
    publishAllReferentials(referentialPayload, fileKeys),
    includeRules
      ? publishRowList(rules, (rule, options) => rulesProvider.saveRule(rule, options), {
        key: 'rules',
        file: sharepointConfig.lists.rules,
        label: 'Règles',
        userEmail
      })
      : Promise.resolve({ key: 'rules', file: sharepointConfig.lists.rules, label: 'Règles', status: 'skipped' }),
    includeTeams
      ? publishRowList(teams, (team, options) => teamsProvider.saveTeam(team, options), {
        key: 'teams',
        file: sharepointConfig.lists.teams,
        label: 'Équipes',
        userEmail
      })
      : Promise.resolve({ key: 'teams', file: sharepointConfig.lists.teams, label: 'Équipes', status: 'skipped' })
  ]);

  const results = [...fileResults, rulesResult, teamsResult];
  throwOnFailures(results);
  return buildPublishSummary(results);
};
