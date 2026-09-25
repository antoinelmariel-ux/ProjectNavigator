// Fictional directory used only outside SharePoint mode (file://, local dev, e2e) so the
// people picker has something to search against without a real tenant. In SharePoint mode
// this file is never imported at runtime; see src/utils/peopleSearch.js.
export const mockOrgDirectory = [
  { displayName: 'Claire Dubreuil', email: 'claire.dubreuil@entreprise-demo.example' },
  { displayName: 'Marc Lefevre', email: 'marc.lefevre@entreprise-demo.example' },
  { displayName: 'Sophie Aubert', email: 'sophie.aubert@entreprise-demo.example' },
  { displayName: 'Karim Belhadj', email: 'karim.belhadj@entreprise-demo.example' },
  { displayName: 'Julie Moreau', email: 'julie.moreau@entreprise-demo.example' },
  { displayName: 'Bertrand Darieux', email: 'bertrand.darieux@entreprise-demo.example' }
];
