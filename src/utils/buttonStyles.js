// Un seul jeu de boutons pour toute l'app : trois tailles, un arrondi, cinq rôles. Les boutons
// avaient fini par compter dix couples de marges et trois arrondis rien qu'en bleu plein.
// Les chaînes restent littérales : `scripts/generate-tailwind-lite.js` les lit dans ce fichier.

const BUTTON_BASE = 'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export const BUTTON_VARIANTS = {
  primary: 'border border-transparent bg-blue-600 text-white shadow-sm hover:bg-blue-700',
  secondary: 'border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50',
  subtle: 'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
  ghost: 'border border-transparent bg-transparent text-gray-700 hover:bg-gray-100',
  danger: 'border border-transparent bg-red-600 text-white shadow-sm hover:bg-red-700'
};

export const BUTTON_SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base'
};

export const buttonClass = (variant = 'primary', size = 'md', extra = '') => [
  BUTTON_BASE,
  BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary,
  BUTTON_SIZES[size] || BUTTON_SIZES.md,
  extra
].filter(Boolean).join(' ');
