// Fictional directory used only outside SharePoint mode (file://, local dev, e2e) so the
// people picker has something to search against without a real tenant. In SharePoint mode
// this file is never imported at runtime; see src/utils/peopleSearch.js.
export const mockOrgDirectory = [
  { displayName: 'Claire Dubreuil', email: 'claire.dubreuil@lfb.fr' },
  { displayName: 'Marc Lefevre', email: 'marc.lefevre@lfb.fr' },
  { displayName: 'Sophie Aubert', email: 'sophie.aubert@lfb.fr' },
  { displayName: 'Karim Belhadj', email: 'karim.belhadj@lfb.fr' },
  { displayName: 'Julie Moreau', email: 'julie.moreau@lfb.fr' },
  { displayName: 'Bertrand Darieux', email: 'bertrand.darieux@lfb.fr' },
  { displayName: 'Chef de projet (démo)', email: 'chef.projet@entreprise.com' }
];

// Fictional org chart (manager → direct reports) standing in for the SharePoint user profiles'
// DirectReports outside SharePoint mode; see src/utils/reportingHierarchy.js. The mock session
// user (Bertrand Darieux) manages two people, one of whom manages the owner of the mock projects,
// so the « Mon équipe » view of the home screen has something to show across two levels.
export const mockOrgReports = {
  'bertrand.darieux@lfb.fr': ['claire.dubreuil@lfb.fr', 'marc.lefevre@lfb.fr'],
  'claire.dubreuil@lfb.fr': ['sophie.aubert@lfb.fr', 'chef.projet@entreprise.com'],
  'marc.lefevre@lfb.fr': ['karim.belhadj@lfb.fr', 'julie.moreau@lfb.fr', 'nathan.auvray@lfb.fr']
};
