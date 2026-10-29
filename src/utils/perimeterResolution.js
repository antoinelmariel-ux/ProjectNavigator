// Un périmètre est « traité » du point de vue de l'expert dès qu'il a pris position, y compris en
// demandant des informations : l'ordre est alors chez le porteur, plus dans sa file « À traiter ».
const SETTLED_STATUSES = new Set([
  'validated',
  'validated_with_conditions',
  'rejected',
  'not_concerned',
  'pending_information'
]);

export const isPerimeterStatusSettled = (status) => SETTLED_STATUSES.has(status);
