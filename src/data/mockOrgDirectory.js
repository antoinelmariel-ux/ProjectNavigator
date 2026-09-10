// Fictional directory used only outside SharePoint mode (file://, local dev, e2e) so the
// people picker has something to search against without a real tenant. In SharePoint mode
// this file is never imported at runtime; see src/utils/peopleSearch.js.
export const mockOrgDirectory = [
  { displayName: 'Claire Dubreuil', email: 'claire.dubreuil@lfb.fr' },
  { displayName: 'Marc Lefevre', email: 'marc.lefevre@lfb.fr' },
  { displayName: 'Sophie Aubert', email: 'sophie.aubert@lfb.fr' },
  { displayName: 'Karim Belhadj', email: 'karim.belhadj@lfb.fr' },
  { displayName: 'Julie Moreau', email: 'julie.moreau@lfb.fr' },
  { displayName: 'Bertrand Darieux', email: 'bertrand.darieux@lfb.fr' }
];
