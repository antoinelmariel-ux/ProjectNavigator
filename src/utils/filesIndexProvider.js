import { isSharePointMode } from '../config/sharepointConfig.js';
import { getRepository } from './listRepository.js';
import { deleteDocument } from './documentStore.js';

// CN_FilesIndex n'existe que côté SharePoint : hors ce mode, une pièce jointe est une data URL
// en mémoire (voir createAttachmentFromFile dans documentStore.js), jamais indexée ici — il n'y
// a donc rien à nettoyer en local/mock.
//
// EntityId vaut toujours l'id du projet pour les quatre EntityType posés par un porteur ou un
// expert (project-answer, compliance-comment, compliance-reply, showcase) : une seule requête
// par ProjectId couvre donc tous les fichiers d'un projet, quel que soit l'endroit où ils ont
// été déposés.
export const filesIndexProvider = {
  async removeAllForProject(projectId) {
    if (!isSharePointMode() || !projectId) {
      return;
    }

    const repository = getRepository('filesIndex');
    const records = await repository.findBy('EntityId', projectId);

    await Promise.all(records.map(async (record) => {
      try {
        await deleteDocument(record.Path);
      } catch (error) {
        // La ligne d'index est retirée même si le fichier physique n'a pas pu l'être : un
        // fichier orphelin dans la bibliothèque est moins grave qu'une entrée d'index qui
        // pointe indéfiniment vers un projet supprimé.
        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
          console.warn('[Documents] Suppression du fichier impossible, l’entrée d’index est retirée quand même :', error);
        }
      }
      if (record.spItemId != null) {
        await repository.remove(record.spItemId);
      }
    }));
  }
};
