// Table de devises livrée par défaut. Seule la devise pivot (EUR) a un taux : les autres taux
// ne sont volontairement pas inventés. Tant qu'un administrateur ne les a pas renseignés
// (back-office, onglet « Devises »), une condition convertie ne se déclenche pas pour ces unités.
export const initialCurrencies = [
  { unit: '€', code: 'EUR', multiplier: 1, rate: 1, updatedAt: '' },
  { unit: 'K€', code: 'EUR', multiplier: 1000, rate: 1, updatedAt: '' },
  { unit: '$', code: 'USD', multiplier: 1, rate: null, updatedAt: '' },
  { unit: 'K$', code: 'USD', multiplier: 1000, rate: null, updatedAt: '' },
  { unit: '£', code: 'GBP', multiplier: 1, rate: null, updatedAt: '' },
  { unit: 'K£', code: 'GBP', multiplier: 1000, rate: null, updatedAt: '' },
  { unit: 'MXN', code: 'MXN', multiplier: 1, rate: null, updatedAt: '' }
];
