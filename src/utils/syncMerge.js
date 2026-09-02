// Réconciliation « serveur + local » à l’hydratation.
// Le serveur fait autorité pour ce qu’il connaît, mais un projet présent uniquement en local
// n’a pas encore été synchronisé : le remplacer par la liste serveur le ferait disparaître de
// l’écran, puis du cache localStorage lors de la sauvegarde débouncée qui suit.
export const mergeServerAndLocalProjects = (serverProjects, localProjects) => {
  const server = Array.isArray(serverProjects) ? serverProjects.filter(Boolean) : [];
  const local = Array.isArray(localProjects) ? localProjects.filter(Boolean) : [];

  const serverIds = new Set(server.map((project) => project.id));
  // Le projet de démo n’est jamais un vrai brouillon en attente de synchronisation :
  // s’il traîne encore localement, on le laisse disparaître dès qu’un vrai serveur répond.
  const notYetSynchronized = local.filter((project) => !project.isDemo && !serverIds.has(project.id));

  return [...server, ...notYetSynchronized];
};
