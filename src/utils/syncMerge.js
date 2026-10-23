// Réconciliation « serveur + local » à l’hydratation.
// Le serveur fait autorité pour ce qu’il connaît, mais un projet présent uniquement en local
// n’a pas encore été synchronisé : le remplacer par la liste serveur le ferait disparaître de
// l’écran, puis du cache localStorage lors de la sauvegarde débouncée qui suit.
//
// Exception : un projet local qui porte un `rowVersion` a été confirmé une fois par le serveur.
// S’il n’y figure plus, il a pu être supprimé ailleurs. L’appelant le fait vérifier un par un
// (`listPossiblyDeletedProjects`) et ne passe ici que les identifiants dont l’absence est
// confirmée : une liste serveur tronquée ne doit jamais suffire à effacer un projet.
export const listPossiblyDeletedProjects = (serverProjects, localProjects) => {
  const server = Array.isArray(serverProjects) ? serverProjects.filter(Boolean) : [];
  const local = Array.isArray(localProjects) ? localProjects.filter(Boolean) : [];
  const serverIds = new Set(server.map((project) => project.id));

  return local.filter((project) => (
    !project.isDemo
    && !serverIds.has(project.id)
    && typeof project.rowVersion === 'number'
    && project.rowVersion > 0
  ));
};

export const mergeServerAndLocalProjects = (serverProjects, localProjects, confirmedDeletedIds = []) => {
  const server = Array.isArray(serverProjects) ? serverProjects.filter(Boolean) : [];
  const local = Array.isArray(localProjects) ? localProjects.filter(Boolean) : [];
  const deletedIds = new Set(Array.isArray(confirmedDeletedIds) ? confirmedDeletedIds : []);

  const serverIds = new Set(server.map((project) => project.id));
  // Le projet de démo n’est jamais un vrai brouillon en attente de synchronisation :
  // s’il traîne encore localement, on le laisse disparaître dès qu’un vrai serveur répond.
  const notYetSynchronized = local.filter(
    (project) => !project.isDemo && !serverIds.has(project.id) && !deletedIds.has(project.id)
  );

  return [...server, ...notYetSynchronized];
};
