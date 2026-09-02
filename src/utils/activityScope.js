// Valeurs fixes du périmètre d'activité choisi à l'onboarding / dans le profil.
// Partagé par l'écran d'onboarding, la section profil, et le pseudo-champ de condition
// exposé dans l'éditeur de règles/questions du back-office (voir questions.js).

export const ACTIVITY_SCOPE_VALUES = [
  'worldwide',
  'france',
  'uk',
  'germany',
  'spain',
  'benelux',
  'mexico'
];

export const ACTIVITY_SCOPE_LABELS = {
  worldwide: { en: 'Worldwide', fr: 'Monde entier', de: 'Weltweit', es: 'Mundial' },
  france: { en: 'France', fr: 'France', de: 'Frankreich', es: 'Francia' },
  uk: { en: 'UK', fr: 'Royaume-Uni', de: 'Vereinigtes Königreich', es: 'Reino Unido' },
  germany: { en: 'Germany', fr: 'Allemagne', de: 'Deutschland', es: 'Alemania' },
  spain: { en: 'Spain', fr: 'Espagne', de: 'Spanien', es: 'España' },
  benelux: { en: 'Benelux', fr: 'Benelux', de: 'Benelux', es: 'Benelux' },
  mexico: { en: 'Mexico', fr: 'Mexique', de: 'Mexiko', es: 'México' }
};

export const ACTIVITY_SCOPE_CONDITION_LABEL = {
  en: 'Activity scope',
  fr: "Périmètre d'activité",
  de: 'Tätigkeitsbereich',
  es: 'Ámbito de actividad'
};
