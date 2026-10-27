// Un administrateur peut rendre un avis à la place d'un périmètre (équipe ou comité) depuis la
// console d'administration. L'avis porte alors une marque, `adminProxy`, qui dit qui l'a saisi : un
// avis d'expert qu'aucun expert n'a écrit ne doit jamais passer pour le sien. Elle vit dans
// l'entrée du périmètre (et dans `ClaimJson` côté SharePoint), donc sans nouvelle colonne.

const normalizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

export const normalizeAdminProxy = (value) => {
  const email = normalizeEmail(value?.email);
  if (!email) {
    return null;
  }

  return {
    email,
    at: typeof value.at === 'string' ? value.at : ''
  };
};

export const getAdminProxy = (entry) => normalizeAdminProxy(entry?.adminProxy);

export const buildAdminProxy = (email, at = new Date().toISOString()) => normalizeAdminProxy({ email, at });

// Une personne qui est contact du périmètre n'agit pas « à la place » : seul celui qui s'appuie sur
// ses droits d'administrateur sans appartenir au périmètre laisse la marque.
export const resolveAdminProxyForSave = ({ canBypass, isPerimeterMember, email, at }) => (
  canBypass && !isPerimeterMember ? buildAdminProxy(email, at) : null
);

export const isAdminAuthoredMessage = ({ authorEmail, adminEmails, memberEmails }) => {
  const author = normalizeEmail(authorEmail);
  if (!author) {
    return false;
  }

  const admins = new Set((Array.isArray(adminEmails) ? adminEmails : []).map(normalizeEmail));
  const members = new Set((Array.isArray(memberEmails) ? memberEmails : []).map(normalizeEmail));
  return admins.has(author) && !members.has(author);
};
