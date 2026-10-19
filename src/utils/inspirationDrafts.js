const TEXT_FIELDS = [
  'title',
  'labName',
  'target',
  'typology',
  'therapeuticArea',
  'country',
  'description',
  'link',
  'review'
];

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;

export const hasInspirationContent = (project) => {
  if (!project || typeof project !== 'object') {
    return false;
  }
  return TEXT_FIELDS.some((field) => hasText(project[field]))
    || (Array.isArray(project.documents) && project.documents.length > 0);
};

// Ouvrir le formulaire crée tout de suite une ébauche (createdAt === updatedAt) : si on le quitte
// sans rien saisir — par « Annuler », mais aussi par la barre de navigation, le logo ou un
// rechargement — elle ne doit pas rester dans la liste sous le nom « Projet sans titre ».
// Une inspiration déjà enregistrée a un updatedAt postérieur, elle n'est jamais concernée.
export const isEmptyInspirationDraft = (project) =>
  Boolean(project)
  && !hasInspirationContent(project)
  && Boolean(project.createdAt)
  && project.createdAt === project.updatedAt;

export const pruneEmptyInspirationDrafts = (projects) => {
  if (!Array.isArray(projects)) {
    return projects;
  }
  const kept = projects.filter((project) => !isEmptyInspirationDraft(project));
  return kept.length === projects.length ? projects : kept;
};
