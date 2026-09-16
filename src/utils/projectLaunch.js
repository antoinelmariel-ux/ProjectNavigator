// Le lancement est un fait déclaré, jamais déduit. L'application n'observe pas les projets : une
// date de lancement est une prévision saisie des mois plus tôt, et la plupart des porteurs
// attendent justement d'avoir leur confirmation pour partir. En déduire « lancé sans
// confirmation » accusait donc à tort ceux qui faisaient exactement ce qu'on attend d'eux — et
// un signal qui se trompe sur les bons élèves cesse d'être lu, ce qui détruit la seule force
// qu'avait ce dernier tour.
//
// N'importe qui dans la boucle peut faire ce constat : le porteur, un administrateur, ou un
// expert du périmètre qui a vu la campagne partir.
export const PROJECT_LAUNCH_KEY = '__project_launch__';

export const LAUNCH_ACTION_DECLARE = 'declare';
export const LAUNCH_ACTION_REVERT = 'revert';

const toText = (value) => (typeof value === 'string' ? value : '');

export const normalizeProjectLaunch = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { launchedAt: '', declaredBy: '', history: [] };
  }

  return {
    launchedAt: toText(value.launchedAt),
    declaredBy: toText(value.declaredBy),
    history: Array.isArray(value.history)
      ? value.history
        .filter((entry) => entry && typeof entry === 'object')
        .map((entry) => ({
          action: entry.action === LAUNCH_ACTION_REVERT ? LAUNCH_ACTION_REVERT : LAUNCH_ACTION_DECLARE,
          by: toText(entry.by),
          at: toText(entry.at)
        }))
      : []
  };
};

export const getProjectLaunch = (answers) =>
  normalizeProjectLaunch(answers && typeof answers === 'object' ? answers[PROJECT_LAUNCH_KEY] : null);

export const isProjectLaunched = (answers) => getProjectLaunch(answers).launchedAt.length > 0;

export const withProjectLaunch = (answers, { by = '', at } = {}) => {
  const previous = getProjectLaunch(answers);
  const launchedAt = typeof at === 'string' && at.length > 0 ? at : new Date().toISOString();

  return {
    ...(answers && typeof answers === 'object' ? answers : {}),
    [PROJECT_LAUNCH_KEY]: {
      launchedAt,
      declaredBy: by,
      // Une déclaration a des conséquences visibles pour tout le monde : on garde qui l'a faite
      // et quand, y compris quand elle est retirée. Un clic malheureux se corrige, il ne
      // s'efface pas.
      history: [...previous.history, { action: LAUNCH_ACTION_DECLARE, by, at: launchedAt }]
    }
  };
};

export const withoutProjectLaunch = (answers, { by = '', at } = {}) => {
  const previous = getProjectLaunch(answers);
  const revertedAt = typeof at === 'string' && at.length > 0 ? at : new Date().toISOString();

  return {
    ...(answers && typeof answers === 'object' ? answers : {}),
    [PROJECT_LAUNCH_KEY]: {
      launchedAt: '',
      declaredBy: '',
      history: [...previous.history, { action: LAUNCH_ACTION_REVERT, by, at: revertedAt }]
    }
  };
};
