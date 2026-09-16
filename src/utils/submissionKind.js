// Deux portes d'entrée, un seul objet projet. Dupliquer le projet en « pré-projet » puis
// « projet » aurait dupliqué les réponses, les fils d'échange, les droits et la vitrine ; un
// simple qualificatif sur la soumission suffit, et toute la machinerie existante (files
// compliance, notifications, prises en charge, commentaires) continue de fonctionner telle
// quelle.
//
// Il est stocké dans les réponses du projet, comme la visibilité publique ou les commentaires
// compliance : c'est ce qui le fait voyager dans `AnswersJson` sans exiger une nouvelle colonne
// dans CN_Projects, donc sans intervention côté SharePoint avant de pouvoir déployer.
export const SUBMISSION_KIND_ANSWER_KEY = '__submission_kind__';

export const SUBMISSION_KIND_PRELIMINARY = 'preliminary';
export const SUBMISSION_KIND_FINAL = 'final';

// Un projet soumis avant cette fonctionnalité l'a été sous le régime complet : il est final.
export const normalizeSubmissionKind = (value) =>
  value === SUBMISSION_KIND_PRELIMINARY ? SUBMISSION_KIND_PRELIMINARY : SUBMISSION_KIND_FINAL;

export const getSubmissionKind = (project) =>
  normalizeSubmissionKind(
    project?.answers?.[SUBMISSION_KIND_ANSWER_KEY] ?? project?.submissionKind
  );

export const isPreliminarySubmission = (project) =>
  project?.status === 'submitted' && getSubmissionKind(project) === SUBMISSION_KIND_PRELIMINARY;

export const withSubmissionKind = (answers, submissionKind) => ({
  ...(answers && typeof answers === 'object' ? answers : {}),
  [SUBMISSION_KIND_ANSWER_KEY]: normalizeSubmissionKind(submissionKind)
});

// Un projet soumis pour avis préliminaire reste modifiable par son porteur : c'est la promesse
// même de la porte d'entrée précoce (« vous pourrez continuer à modifier votre projet »), et
// sans elle demander un avis tôt reviendrait à se figer tôt. Une demande de validation, elle,
// fige le projet exactement comme avant.
export const isProjectOpenForEditing = (project) =>
  project?.status === 'draft'
  || project?.status === 'cancelled'
  || isPreliminarySubmission(project);
