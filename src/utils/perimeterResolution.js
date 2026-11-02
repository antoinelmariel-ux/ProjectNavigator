// Un périmètre est « traité » du point de vue de l'expert quand il a rendu un avis. Demander des
// informations n'en est pas un : la balle est chez le porteur, mais le projet reste « En cours »
// pour l'expert qui l'a pris en charge (cf. expertQueue.js).
import { OPINION_STATUSES } from './expertQueue.js';

const SETTLED_STATUSES = new Set(OPINION_STATUSES);

export const isPerimeterStatusSettled = (status) => SETTLED_STATUSES.has(status);
