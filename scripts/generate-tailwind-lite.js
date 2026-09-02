const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const items = [];
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      items.push(...walk(fullPath));
    } else if (/\.(jsx?|tsx?|html|css)$/.test(entry.name)) {
      items.push(fullPath);
    }
  }
  return items;
}

const filesToScan = walk(path.join(repoRoot, 'src')).filter(
  (filePath) => !path.basename(filePath).startsWith('module-manifest')
);
filesToScan.push(path.join(repoRoot, 'index.html'));
filesToScan.push(path.join(repoRoot, 'mentions-legales.html'));

// Deux niveaux de confiance :
// - attrClasses : écrites en dur dans un class="…". Si l'une d'elles ne produit
//   aucune règle, c'est un bug et le build le signale.
// - looseClasses : fragments trouvés dans des littéraux (className={`…`},
//   constantes de classes, objets de mapping). On ne peut pas savoir si ce sont
//   vraiment des classes, donc on les génère quand elles matchent, en silence.
const attrClasses = new Set();
const looseClasses = new Set();

const addTokens = (target, text) => {
  text
    .split(/\s+/)
    .filter(Boolean)
    .forEach((cls) => target.add(cls));
};

for (const filePath of filesToScan) {
  const content = fs.readFileSync(filePath, 'utf8');

  const attrRegex = /class(?:Name)?\s*=\s*"([^"]*)"/g;
  let match;
  while ((match = attrRegex.exec(content)) !== null) {
    addTokens(attrClasses, match[1]);
  }

  if (/\.(jsx?|tsx?)$/.test(filePath)) {
    // Les classes construites dynamiquement ne sont visibles que par leurs
    // fragments statiques : on retire les interpolations ${…} puis on découpe.
    const literalRegex = /`([\s\S]*?)`|'([^'\n]*)'|"([^"\n]*)"/g;
    while ((match = literalRegex.exec(content)) !== null) {
      const raw = match[1] ?? match[2] ?? match[3] ?? '';
      const staticParts = match[1] === undefined ? raw : raw.replace(/\$\{[^}]*\}/g, ' ');
      staticParts
        .split(/\s+/)
        .filter((token) => token && /[-:]/.test(token))
        .forEach((token) => {
          if (!attrClasses.has(token)) looseClasses.add(token);
        });
    }
  }
}

const rawClasses = new Set([...attrClasses, ...looseClasses]);

// Classes définies à la main ailleurs (feuilles de style du projet, blocs
// <style> des pages HTML). Leur absence du CSS généré est normale.
const handWrittenClasses = new Set();
{
  const stylesDir = path.join(repoRoot, 'src', 'styles');
  const sources = fs
    .readdirSync(stylesDir)
    .filter((name) => name.endsWith('.css') && name !== 'tailwind-internal.css')
    .map((name) => fs.readFileSync(path.join(stylesDir, name), 'utf8'));

  for (const htmlFile of ['index.html', 'mentions-legales.html']) {
    const html = fs.readFileSync(path.join(repoRoot, htmlFile), 'utf8');
    sources.push(...(html.match(/<style[\s\S]*?<\/style>/g) || []));
  }

  const selectorRegex = /\.((?:\\.|[A-Za-z0-9_-])+)/g;
  for (const source of sources) {
    let selectorMatch;
    while ((selectorMatch = selectorRegex.exec(source)) !== null) {
      handWrittenClasses.add(selectorMatch[1].replace(/\\/g, ''));
    }
  }
}

const knownPrefix = [
  'bg',
  'text',
  'font',
  'leading',
  'tracking',
  'uppercase',
  'lowercase',
  'capitalize',
  'italic',
  'not-italic',
  'underline',
  'underline-offset',
  'no-underline',
  'flex',
  'inline-flex',
  'grid',
  'inline-grid',
  'block',
  'inline-block',
  'inline',
  'hidden',
  'sr-only',
  'static',
  'relative',
  'absolute',
  'fixed',
  'sticky',
  'inset',
  'top',
  'right',
  'bottom',
  'left',
  'z',
  'p',
  'px',
  'py',
  'pt',
  'pb',
  'pl',
  'pr',
  'm',
  'mx',
  'my',
  'mt',
  'mb',
  'ml',
  'mr',
  'space',
  'w',
  'min-w',
  'max-w',
  'h',
  'min-h',
  'max-h',
  'border',
  'rounded',
  'shadow',
  'overflow',
  'truncate',
  'whitespace',
  'items',
  'justify',
  'content',
  'self',
  'gap',
  'grid-cols',
  'col-span',
  'list',
  'ring',
  'ring-offset',
  'opacity',
  'transition',
  'duration',
  'cursor',
  'outline',
  'from',
  'via',
  'to',
  'bg-opacity',
  'mx',
  'my',
  'shrink',
  'flex-shrink',
  'grow',
  'flex-grow',
  'object',
  'order',
  'resize',
  'select',
  'pointer-events',
  'backdrop',
  'prose',
  'align',
  'aspect',
  'divide',
];

// Classes maison ou tierces : elles ne doivent produire aucune règle Tailwind,
// et leur absence du CSS généré n'est pas une anomalie.
const customClassPrefixes = [
  'aurora-',
  'hv-',
  'tourguide-',
  'project-',
  'reactour__',
  'tg-',
  'scrollbar-',
  'shepherd-',
  'tw-',
  'timeline-',
  'animate__',
  'ProseMirror',
  'ql-',
  'tox-',
  'Tiptap',
  'Toastify__',
  'coveo-',
  'hds-',
  'yo-',
  'rt-',
  'sl-',
  'header-',
  'hero-',
  'banner-',
  'annotation-',
  'loading-',
  'cn-',
  'sg-',
];

function isCustomClass(cls) {
  return customClassPrefixes.some((prefix) => cls.startsWith(prefix));
}

function isTailwindClass(cls) {
  if (!cls) return false;
  if (isCustomClass(cls)) return false;
  if (cls.startsWith('-')) return true;
  if (cls.includes(':')) {
    const [variant, rest] = cls.split(':', 2);
    if (['sm', 'md', 'lg', 'xl', 'hover', 'focus', 'focus-visible', 'disabled'].includes(variant)) {
      return isTailwindClass(rest);
    }
  }
  return knownPrefix.some((prefix) => cls.startsWith(prefix));
}

const classes = new Set();
for (const cls of rawClasses) {
  if (isTailwindClass(cls)) {
    classes.add(cls);
  }
}
classes.add('-mb-3');

const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
};

const breakpointOrder = Object.fromEntries(
  Object.keys(breakpoints).map((key, index) => [key, index])
);

const pseudoVariants = ['hover', 'focus', 'focus-visible', 'disabled'];
const pseudoVariantOrder = Object.fromEntries(
  pseudoVariants.map((key, index) => [key, index])
);

const spacingScale = {
  '0': '0rem',
  '0.5': '0.125rem',
  '1': '0.25rem',
  '1.5': '0.375rem',
  '2': '0.5rem',
  '2.5': '0.625rem',
  '3': '0.75rem',
  '4': '1rem',
  '5': '1.25rem',
  '6': '1.5rem',
  '7': '1.75rem',
  '8': '2rem',
  '9': '2.25rem',
  '10': '2.5rem',
  '12': '3rem',
  '14': '3.5rem',
  '16': '4rem',
  '20': '5rem',
  '24': '6rem',
};

const sizingScale = {
  '0': '0rem',
  px: '1px',
  '0.5': '0.125rem',
  '1': '0.25rem',
  '1.5': '0.375rem',
  '2': '0.5rem',
  '2.5': '0.625rem',
  '3': '0.75rem',
  '3.5': '0.875rem',
  '4': '1rem',
  '5': '1.25rem',
  '6': '1.5rem',
  '7': '1.75rem',
  '8': '2rem',
  '9': '2.25rem',
  '10': '2.5rem',
  '11': '2.75rem',
  '12': '3rem',
  '14': '3.5rem',
  '16': '4rem',
  '20': '5rem',
  '24': '6rem',
  '28': '7rem',
  '32': '8rem',
  '36': '9rem',
  '40': '10rem',
  '44': '11rem',
  '48': '12rem',
  '52': '13rem',
  '56': '14rem',
  '60': '15rem',
  '64': '16rem',
  '72': '18rem',
  '80': '20rem',
  '96': '24rem',
};

const fractions = {};
for (const denominator of [2, 3, 4, 5, 6, 12]) {
  for (let numerator = 1; numerator < denominator; numerator += 1) {
    fractions[`${numerator}/${denominator}`] = `${((numerator / denominator) * 100).toFixed(6).replace(/\.?0+$/, '')}%`;
  }
}

const widths = {
  ...sizingScale,
  ...fractions,
  full: '100%',
  auto: 'auto',
  screen: '100vw',
  fit: 'fit-content',
  min: 'min-content',
  max: 'max-content',
};

const heights = {
  ...sizingScale,
  ...fractions,
  full: '100%',
  auto: 'auto',
  screen: '100vh',
  fit: 'fit-content',
};

const maxWidths = {
  none: 'none',
  xs: '20rem',
  sm: '24rem',
  md: '28rem',
  lg: '32rem',
  xl: '36rem',
  '2xl': '42rem',
  '3xl': '48rem',
  '4xl': '56rem',
  '5xl': '64rem',
  '6xl': '72rem',
  '7xl': '80rem',
  full: '100%',
  fit: 'fit-content',
};

const maxHeights = {
  ...sizingScale,
  full: '100%',
  screen: '100vh',
  none: 'none',
};

const minHeights = {
  '0': '0rem',
  full: '100%',
  screen: '100vh',
  fit: 'fit-content',
};

const minWidths = {
  '0': '0rem',
  full: '100%',
  fit: 'fit-content',
  min: 'min-content',
  max: 'max-content',
};

const fontSizes = {
  xs: { size: '0.75rem', lineHeight: '1rem' },
  sm: { size: '0.875rem', lineHeight: '1.25rem' },
  base: { size: '1rem', lineHeight: '1.5rem' },
  lg: { size: '1.125rem', lineHeight: '1.75rem' },
  xl: { size: '1.25rem', lineHeight: '1.75rem' },
  '2xl': { size: '1.5rem', lineHeight: '2rem' },
  '3xl': { size: '1.875rem', lineHeight: '2.25rem' },
  '4xl': { size: '2.25rem', lineHeight: '2.5rem' },
};

const fontWeights = {
  'font-medium': '500',
  'font-semibold': '600',
  'font-bold': '700',
};

const lineHeights = {
  'leading-tight': '1.25',
  'leading-snug': '1.375',
  'leading-relaxed': '1.625',
};

const gradientDirections = {
  'bg-gradient-to-r': 'to right',
  'bg-gradient-to-br': 'to bottom right',
};

const colorHex = {
  black: '#000000',
  white: '#ffffff',
  'blue-50': '#eff6ff',
  'blue-100': '#dbeafe',
  'blue-200': '#bfdbfe',
  'blue-300': '#93c5fd',
  'blue-400': '#60a5fa',
  'blue-500': '#3b82f6',
  'blue-600': '#2563eb',
  'blue-700': '#1d4ed8',
  'blue-800': '#1e40af',
  'blue-900': '#1e3a8a',
  'emerald-50': '#ecfdf5',
  'emerald-100': '#d1fae5',
  'emerald-200': '#a7f3d0',
  'emerald-500': '#10b981',
  'emerald-600': '#059669',
  'emerald-700': '#047857',
  'emerald-800': '#065f46',
  'emerald-900': '#064e3b',
  'gray-50': '#f9fafb',
  'gray-100': '#f3f4f6',
  'gray-200': '#e5e7eb',
  'gray-300': '#d1d5db',
  'gray-400': '#9ca3af',
  'gray-500': '#6b7280',
  'gray-600': '#4b5563',
  'gray-700': '#374151',
  'gray-800': '#1f2937',
  'gray-900': '#111827',
  'green-50': '#f0fdf4',
  'green-100': '#dcfce7',
  'green-200': '#bbf7d0',
  'green-600': '#16a34a',
  'green-700': '#15803d',
  'green-800': '#166534',
  'red-50': '#fef2f2',
  'red-100': '#fee2e2',
  'red-200': '#fecaca',
  'red-500': '#ef4444',
  'red-600': '#dc2626',
  'red-700': '#b91c1c',
  'pink-400': '#f472b6',
  'pink-500': '#ec4899',
  'pink-600': '#db2777',
  'yellow-50': '#fefce8',
  'yellow-100': '#fef9c3',
  'yellow-200': '#fef08a',
  'yellow-300': '#fde68a',
  'yellow-500': '#f59e0b',
  'yellow-600': '#d97706',
  'yellow-700': '#b45309',
  'yellow-800': '#92400e',
  'yellow-900': '#78350f',
  'orange-50': '#fff7ed',
};

const extraColorHex = {
  'slate-50': '#f8fafc', 'slate-100': '#f1f5f9', 'slate-200': '#e2e8f0', 'slate-300': '#cbd5e1',
  'slate-400': '#94a3b8', 'slate-500': '#64748b', 'slate-600': '#475569', 'slate-700': '#334155',
  'slate-800': '#1e293b', 'slate-900': '#0f172a',
  'amber-50': '#fffbeb', 'amber-100': '#fef3c7', 'amber-200': '#fde68a', 'amber-300': '#fcd34d',
  'amber-400': '#fbbf24', 'amber-500': '#f59e0b', 'amber-600': '#d97706', 'amber-700': '#b45309',
  'amber-800': '#92400e', 'amber-900': '#78350f',
  'orange-100': '#ffedd5', 'orange-200': '#fed7aa', 'orange-300': '#fdba74', 'orange-400': '#fb923c',
  'orange-500': '#f97316', 'orange-600': '#ea580c', 'orange-700': '#c2410c', 'orange-800': '#9a3412',
  'orange-900': '#7c2d12',
  'indigo-50': '#eef2ff', 'indigo-100': '#e0e7ff', 'indigo-200': '#c7d2fe', 'indigo-300': '#a5b4fc',
  'indigo-400': '#818cf8', 'indigo-500': '#6366f1', 'indigo-600': '#4f46e5', 'indigo-700': '#4338ca',
  'indigo-800': '#3730a3', 'indigo-900': '#312e81',
  'violet-50': '#f5f3ff', 'violet-100': '#ede9fe', 'violet-200': '#ddd6fe', 'violet-300': '#c4b5fd',
  'violet-400': '#a78bfa', 'violet-500': '#8b5cf6', 'violet-600': '#7c3aed', 'violet-700': '#6d28d9',
  'violet-800': '#5b21b6', 'violet-900': '#4c1d95',
  'purple-50': '#faf5ff', 'purple-100': '#f3e8ff', 'purple-200': '#e9d5ff', 'purple-300': '#d8b4fe',
  'purple-400': '#c084fc', 'purple-500': '#a855f7', 'purple-600': '#9333ea', 'purple-700': '#7e22ce',
  'purple-800': '#6b21a8', 'purple-900': '#581c87',
  'fuchsia-50': '#fdf4ff', 'fuchsia-100': '#fae8ff', 'fuchsia-200': '#f5d0fe', 'fuchsia-300': '#f0abfc',
  'fuchsia-400': '#e879f9', 'fuchsia-500': '#d946ef', 'fuchsia-600': '#c026d3', 'fuchsia-700': '#a21caf',
  'fuchsia-800': '#86198f', 'fuchsia-900': '#701a75',
  'sky-50': '#f0f9ff', 'sky-100': '#e0f2fe', 'sky-200': '#bae6fd', 'sky-300': '#7dd3fc',
  'sky-400': '#38bdf8', 'sky-500': '#0ea5e9', 'sky-600': '#0284c7', 'sky-700': '#0369a1',
  'sky-800': '#075985', 'sky-900': '#0c4a6e',
  'cyan-50': '#ecfeff', 'cyan-100': '#cffafe', 'cyan-200': '#a5f3fc', 'cyan-300': '#67e8f9',
  'cyan-400': '#22d3ee', 'cyan-500': '#06b6d4', 'cyan-600': '#0891b2', 'cyan-700': '#0e7490',
  'cyan-800': '#155e75', 'cyan-900': '#164e63',
  'teal-50': '#f0fdfa', 'teal-100': '#ccfbf1', 'teal-200': '#99f6e4', 'teal-300': '#5eead4',
  'teal-400': '#2dd4bf', 'teal-500': '#14b8a6', 'teal-600': '#0d9488', 'teal-700': '#0f766e',
  'teal-800': '#115e59', 'teal-900': '#134e4a',
  'lime-50': '#f7fee7', 'lime-100': '#ecfccb', 'lime-200': '#d9f99d', 'lime-300': '#bef264',
  'lime-400': '#a3e635', 'lime-500': '#84cc16', 'lime-600': '#65a30d', 'lime-700': '#4d7c0f',
  'lime-800': '#3f6212', 'lime-900': '#365314',
  'rose-50': '#fff1f2', 'rose-100': '#ffe4e6', 'rose-200': '#fecdd3', 'rose-300': '#fda4af',
  'rose-400': '#fb7185', 'rose-500': '#f43f5e', 'rose-600': '#e11d48', 'rose-700': '#be123c',
  'rose-800': '#9f1239', 'rose-900': '#881337',
  'emerald-300': '#6ee7b7', 'emerald-400': '#34d399',
  'green-300': '#86efac', 'green-400': '#4ade80', 'green-500': '#22c55e', 'green-900': '#14532d',
  'red-300': '#fca5a5', 'red-400': '#f87171', 'red-800': '#991b1b', 'red-900': '#7f1d1d',
  'pink-50': '#fdf2f8', 'pink-100': '#fce7f3', 'pink-200': '#fbcfe8', 'pink-300': '#f9a8d4',
  'pink-700': '#be185d', 'pink-800': '#9d174d', 'pink-900': '#831843',
  transparent: 'transparent',
};

// Les valeurs déjà présentes font foi : plusieurs teintes "yellow" du projet sont
// volontairement décalées par rapport à Tailwind et sont utilisées telles quelles.
for (const [token, hex] of Object.entries(extraColorHex)) {
  if (!Object.prototype.hasOwnProperty.call(colorHex, token)) {
    colorHex[token] = hex;
  }
}

const ringColors = {
  'blue-200': '191,219,254',
  'blue-400': '96,165,250',
  'blue-500': '59,130,246',
  'green-400': '74,222,128',
  'green-500': '34,197,94',
  'red-400': '248,113,113',
  'red-500': '239,68,68',
  'pink-400': '244,114,182',
};

const ringOpacityDefault = '0.45';

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  const bigint = parseInt(value, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r},${g},${b}`;
}

function escapeClass(name) {
  return name.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
}

function formatDeclarations(decls, indent = '  ') {
  return Object.entries(decls)
    .map(([prop, value]) => `${indent}${prop}: ${value};`)
    .join('\n');
}

function indentBlock(block, spaces) {
  const pad = ' '.repeat(spaces);
  return block
    .split('\n')
    .map((line) => (line ? pad + line : line))
    .join('\n');
}

function spacingValue(token) {
  if (token === 'px') return '1px';
  if (spacingScale[token]) return spacingScale[token];
  return null;
}

function arbitraryValue(token) {
  const match = /^\[(.+)\]$/.exec(token);
  if (!match) return null;
  const value = match[1].replace(/_/g, ' ');
  if (!/(?:calc|min|max|clamp)\(/.test(value)) return value;
  // Dans une classe on ecrit calc(100vh-2rem), mais CSS exige des espaces
  // autour des operateurs : Tailwind fait la meme normalisation.
  return value.replace(/(?<=[\w%)])\s*([+\-*/])\s*(?=[\w.(])/g, ' $1 ');
}

function scaleValue(scale, token) {
  if (Object.prototype.hasOwnProperty.call(scale, token)) return scale[token];
  return arbitraryValue(token);
}

function generateSpacing(property, token) {
  const value = spacingValue(token);
  if (!value) return null;
  const declarations = {};
  if (property === 'p') {
    declarations.padding = value;
  } else if (property === 'px') {
    declarations['padding-left'] = value;
    declarations['padding-right'] = value;
  } else if (property === 'py') {
    declarations['padding-top'] = value;
    declarations['padding-bottom'] = value;
  } else if (property === 'pt') {
    declarations['padding-top'] = value;
  } else if (property === 'pb') {
    declarations['padding-bottom'] = value;
  } else if (property === 'pl') {
    declarations['padding-left'] = value;
  } else if (property === 'pr') {
    declarations['padding-right'] = value;
  } else if (property === 'm') {
    declarations.margin = value;
  } else if (property === 'mx') {
    declarations['margin-left'] = value;
    declarations['margin-right'] = value;
  } else if (property === 'my') {
    declarations['margin-top'] = value;
    declarations['margin-bottom'] = value;
  } else if (property === 'mt') {
    declarations['margin-top'] = value;
  } else if (property === 'mb') {
    declarations['margin-bottom'] = value;
  } else if (property === 'ml') {
    declarations['margin-left'] = value;
  } else if (property === 'mr') {
    declarations['margin-right'] = value;
  }
  return { declarations };
}

function getColor(token) {
  if (token.includes('/')) {
    const [baseToken, alphaToken] = token.split('/');
    const hex = colorHex[baseToken];
    if (!hex) return null;
    const rgb = hexToRgb(hex);
    const alpha = (parseInt(alphaToken, 10) / 100).toFixed(2);
    return { type: 'rgba', value: `rgba(${rgb}, ${alpha})` };
  }
  const hex = colorHex[token];
  if (!hex) return null;
  return { type: 'hex', value: hex, rgb: hexToRgb(hex) };
}

function baseRule(base) {
  if (base === 'absolute') return { declarations: { position: 'absolute' } };
  if (base === 'relative') return { declarations: { position: 'relative' } };
  if (base === 'fixed') return { declarations: { position: 'fixed' } };
  if (base === 'sticky') return { declarations: { position: 'sticky' } };
  if (base === 'block') return { declarations: { display: 'block' } };
  if (base === 'inline') return { declarations: { display: 'inline' } };
  if (base === 'flex') return { declarations: { display: 'flex' } };
  if (base === 'inline-flex') return { declarations: { display: 'inline-flex' } };
  if (base === 'inline-block') return { declarations: { display: 'inline-block' } };
  if (base === 'grid') return { declarations: { display: 'grid' } };
  if (base === 'hidden') return { declarations: { display: 'none' } };
  if (base === 'flex-row') return { declarations: { 'flex-direction': 'row' } };
  if (base === 'flex-col') return { declarations: { 'flex-direction': 'column' } };
  if (base === 'flex-col-reverse') return { declarations: { 'flex-direction': 'column-reverse' } };
  if (base === 'flex-wrap') return { declarations: { 'flex-wrap': 'wrap' } };
  if (base === 'flex-1') return { declarations: { flex: '1 1 0%' } };
  if (base === 'items-center') return { declarations: { 'align-items': 'center' } };
  if (base === 'items-start') return { declarations: { 'align-items': 'flex-start' } };
  if (base === 'items-end') return { declarations: { 'align-items': 'flex-end' } };
  if (base === 'items-baseline') return { declarations: { 'align-items': 'baseline' } };
  if (base === 'justify-between') return { declarations: { 'justify-content': 'space-between' } };
  if (base === 'justify-center') return { declarations: { 'justify-content': 'center' } };
  if (base === 'justify-end') return { declarations: { 'justify-content': 'flex-end' } };
  if (base === 'justify-start') return { declarations: { 'justify-content': 'flex-start' } };
  if (base === 'self-start') return { declarations: { 'align-self': 'flex-start' } };
  if (base === 'self-end') return { declarations: { 'align-self': 'flex-end' } };
  if (base === 'self-stretch') return { declarations: { 'align-self': 'stretch' } };
  if (base === 'self-auto') return { declarations: { 'align-self': 'auto' } };
  if (base === 'w-full') return { declarations: { width: '100%' } };
  if (base.startsWith('w-')) {
    const value = scaleValue(widths, base.replace('w-', ''));
    if (value) return { declarations: { width: value } };
  }
  if (base.startsWith('h-')) {
    const value = scaleValue(heights, base.replace('h-', ''));
    if (value) return { declarations: { height: value } };
  }
  if (base === 'min-h-screen') return { declarations: { 'min-height': '100vh' } };
  if (base === 'min-w-0') return { declarations: { 'min-width': '0' } };
  if (base.startsWith('max-w-')) {
    const value = scaleValue(maxWidths, base.replace('max-w-', ''));
    if (value) return { declarations: { 'max-width': value } };
  }
  if (base.startsWith('max-h-')) {
    const value = scaleValue(maxHeights, base.replace('max-h-', ''));
    if (value) return { declarations: { 'max-height': value } };
  }
  if (base.startsWith('min-h-')) {
    const value = scaleValue(minHeights, base.replace('min-h-', ''));
    if (value) return { declarations: { 'min-height': value } };
  }
  if (base.startsWith('min-w-')) {
    const value = scaleValue(minWidths, base.replace('min-w-', ''));
    if (value) return { declarations: { 'min-width': value } };
  }
  if (base.startsWith('p-') || base.startsWith('m-')) {
    const [property, token] = base.split('-');
    const spacing = generateSpacing(property, token);
    if (spacing) return spacing;
  }
  if (base.includes('-')) {
    const [property, token] = base.split('-');
    if (['px', 'py', 'pt', 'pb', 'pl', 'pr', 'mx', 'my', 'mt', 'mb', 'ml', 'mr'].includes(property)) {
      const spacing = generateSpacing(property, token);
      if (spacing) return spacing;
    }
  }
  if (base === 'mx-auto') return { declarations: { 'margin-left': 'auto', 'margin-right': 'auto' } };
  if (base === 'ml-auto') return { declarations: { 'margin-left': 'auto' } };
  if (base === 'mr-auto') return { declarations: { 'margin-right': 'auto' } };
  if (base === 'overflow-y-auto') return { declarations: { 'overflow-y': 'auto' } };
  if (base === 'resize-y') return { declarations: { resize: 'vertical' } };
  if (base.startsWith('gap-x-')) {
    const value = spacingValue(base.replace('gap-x-', ''));
    if (value) return { declarations: { 'column-gap': value } };
  }
  if (base.startsWith('gap-y-')) {
    const value = spacingValue(base.replace('gap-y-', ''));
    if (value) return { declarations: { 'row-gap': value } };
  }
  if (base.startsWith('gap-')) {
    const token = base.replace('gap-', '');
    const value = spacingValue(token);
    if (value) return { declarations: { gap: value } };
  }
  if (base.startsWith('space-y-')) {
    const token = base.replace('space-y-', '');
    const value = spacingValue(token);
    if (value) {
      return {
        nested: [
          {
            selector: '> :not([hidden]) ~ :not([hidden])',
            declarations: { 'margin-top': value },
          },
        ],
      };
    }
  }
  if (base.startsWith('space-x-')) {
    const token = base.replace('space-x-', '');
    const value = spacingValue(token);
    if (value) {
      return {
        nested: [
          {
            selector: '> :not([hidden]) ~ :not([hidden])',
            declarations: { 'margin-left': value },
          },
        ],
      };
    }
  }
  if (base.startsWith('grid-cols-')) {
    const token = base.replace('grid-cols-', '');
    return { declarations: { 'grid-template-columns': `repeat(${token}, minmax(0, 1fr))` } };
  }
  if (base.startsWith('col-span-')) {
    const value = parseInt(base.replace('col-span-', ''), 10);
    return { declarations: { 'grid-column': `span ${value} / span ${value}` } };
  }
  if (base === 'list-disc') return { declarations: { 'list-style-type': 'disc' } };
  if (base === 'list-inside') return { declarations: { 'list-style-position': 'inside' } };
  if (base === 'sr-only') {
    return {
      custom:
        `.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0; }`,
    };
  }
  if (base === 'uppercase') return { declarations: { 'text-transform': 'uppercase' } };
  if (base === 'underline') return { declarations: { 'text-decoration': 'underline' } };
  if (base.startsWith('underline-offset-')) {
    const token = base.replace('underline-offset-', '');
    if (spacingScale[token]) {
      return { declarations: { 'text-underline-offset': spacingScale[token] } };
    }
  }
  if (base === 'italic') return { declarations: { 'font-style': 'italic' } };
  if (base.startsWith('text-')) {
    const token = base.replace('text-', '');
    if (fontSizes[token]) {
      const { size, lineHeight } = fontSizes[token];
      return { declarations: { 'font-size': size, 'line-height': lineHeight } };
    }
    if (token === '[11px]') {
      return { declarations: { 'font-size': '11px', 'line-height': '1rem' } };
    }
    if (['center', 'left', 'right'].includes(token)) {
      return { declarations: { 'text-align': token } };
    }
    if (token === 'current') {
      return { declarations: { color: 'currentColor' } };
    }
    const colorInfo = getColor(token);
    if (colorInfo) {
      if (colorInfo.type === 'rgba') {
        return { declarations: { '--tw-text-opacity': '1', color: colorInfo.value } };
      }
      return {
        declarations: {
          '--tw-text-opacity': '1',
          color: `rgba(${colorInfo.rgb}, var(--tw-text-opacity))`,
        },
      };
    }
  }
  if (fontWeights[base]) return { declarations: { 'font-weight': fontWeights[base] } };
  if (base === 'font-mono') {
    return {
      declarations: {
        'font-family': "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
      },
    };
  }
  if (lineHeights[base]) return { declarations: { 'line-height': lineHeights[base] } };
  if (base === 'tracking-wide') return { declarations: { 'letter-spacing': '0.05em' } };
  if (base.startsWith('bg-gradient-to')) {
    const direction = gradientDirections[base];
    if (direction) {
      return { declarations: { 'background-image': `linear-gradient(${direction}, var(--tw-gradient-stops))` } };
    }
  }
  if (base.startsWith('from-')) {
    const colorInfo = getColor(base.replace('from-', ''));
    if (colorInfo) {
      if (colorInfo.type === 'rgba') {
        return {
          declarations: {
            '--tw-gradient-from': colorInfo.value,
            '--tw-gradient-stops': 'var(--tw-gradient-from), var(--tw-gradient-to, rgba(255, 255, 255, 0))',
          },
        };
      }
      return {
        declarations: {
          '--tw-gradient-from': `rgb(${colorInfo.rgb})`,
          '--tw-gradient-stops': 'var(--tw-gradient-from), var(--tw-gradient-to, rgba(255, 255, 255, 0))',
        },
      };
    }
  }
  if (base.startsWith('via-')) {
    const colorInfo = getColor(base.replace('via-', ''));
    if (colorInfo) {
      if (colorInfo.type === 'rgba') {
        return {
          declarations: {
            '--tw-gradient-stops': `var(--tw-gradient-from), ${colorInfo.value}, var(--tw-gradient-to, rgba(255, 255, 255, 0))`,
          },
        };
      }
      return {
        declarations: {
          '--tw-gradient-stops': `var(--tw-gradient-from), rgb(${colorInfo.rgb}), var(--tw-gradient-to, rgba(255, 255, 255, 0))`,
        },
      };
    }
  }
  if (base.startsWith('to-')) {
    const colorInfo = getColor(base.replace('to-', ''));
    if (colorInfo) {
      if (colorInfo.type === 'rgba') {
        return { declarations: { '--tw-gradient-to': colorInfo.value } };
      }
      return { declarations: { '--tw-gradient-to': `rgb(${colorInfo.rgb})` } };
    }
  }
  if (base.startsWith('bg-opacity-')) {
    const value = parseInt(base.replace('bg-opacity-', ''), 10) / 100;
    return { declarations: { '--tw-bg-opacity': value.toString() } };
  }
  if (base.startsWith('bg-')) {
    const colorInfo = getColor(base.replace('bg-', ''));
    if (colorInfo) {
      if (colorInfo.type === 'rgba') {
        return { declarations: { '--tw-bg-opacity': '1', 'background-color': colorInfo.value } };
      }
      return {
        declarations: {
          '--tw-bg-opacity': '1',
          'background-color': `rgba(${colorInfo.rgb}, var(--tw-bg-opacity))`,
        },
      };
    }
  }
  if (base === 'border') return { declarations: { 'border-width': '1px' } };
  if (base.startsWith('border-')) {
    const token = base.replace('border-', '');
    if (token === '2') return { declarations: { 'border-width': '2px' } };
    if (token === 'b') return { declarations: { 'border-bottom-width': '1px' } };
    if (token === 't') return { declarations: { 'border-top-width': '1px' } };
    if (token === 'dashed') return { declarations: { 'border-style': 'dashed' } };
    if (token === 'transparent') return { declarations: { 'border-color': 'transparent' } };
    const colorInfo = getColor(token);
    if (colorInfo) {
      if (colorInfo.type === 'rgba') {
        return { declarations: { '--tw-border-opacity': '1', 'border-color': colorInfo.value } };
      }
      return {
        declarations: {
          '--tw-border-opacity': '1',
          'border-color': `rgba(${colorInfo.rgb}, var(--tw-border-opacity))`,
        },
      };
    }
  }
  if (base === 'rounded') return { declarations: { 'border-radius': '0.25rem' } };
  if (base === 'rounded-lg') return { declarations: { 'border-radius': '0.75rem' } };
  if (base === 'rounded-xl') return { declarations: { 'border-radius': '0.75rem' } };
  if (base === 'rounded-2xl') return { declarations: { 'border-radius': '1rem' } };
  if (base === 'rounded-3xl') return { declarations: { 'border-radius': '1.5rem' } };
  if (base === 'rounded-full') return { declarations: { 'border-radius': '9999px' } };
  if (base === 'rounded-t-2xl') {
    return {
      declarations: {
        'border-top-left-radius': '1rem',
        'border-top-right-radius': '1rem',
      },
    };
  }
  if (base === 'shadow-sm') {
    return {
      declarations: {
        '--tw-shadow': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'box-shadow': 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)',
      },
    };
  }
  if (base === 'shadow') {
    return {
      declarations: {
        '--tw-shadow': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'box-shadow': 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)',
      },
    };
  }
  if (base === 'shadow-md') {
    return {
      declarations: {
        '--tw-shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'box-shadow': 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)',
      },
    };
  }
  if (base === 'shadow-lg' || base === 'hover:shadow-lg') {
    return {
      declarations: {
        '--tw-shadow': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'box-shadow': 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)',
      },
    };
  }
  if (base === 'shadow-xl') {
    return {
      declarations: {
        '--tw-shadow': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'box-shadow': 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)',
      },
    };
  }
  if (base === 'shadow-2xl') {
    return {
      declarations: {
        '--tw-shadow': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'box-shadow': 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)',
      },
    };
  }
  if (base === 'shadow-inner') {
    return {
      declarations: {
        '--tw-shadow': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
        'box-shadow': 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)',
      },
    };
  }
  if (base === 'transition-all') {
    return { declarations: { transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)' } };
  }
  if (base === 'transition-colors') {
    return {
      declarations: {
        transition:
          'color 150ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms cubic-bezier(0.4, 0, 0.2, 1), border-color 150ms cubic-bezier(0.4, 0, 0.2, 1), text-decoration-color 150ms cubic-bezier(0.4, 0, 0.2, 1), fill 150ms cubic-bezier(0.4, 0, 0.2, 1), stroke 150ms cubic-bezier(0.4, 0, 0.2, 1)',
      },
    };
  }
  if (base === 'duration-300') return { declarations: { 'transition-duration': '300ms' } };
  if (base === 'duration-500') return { declarations: { 'transition-duration': '500ms' } };
  if (base === 'cursor-move') return { declarations: { cursor: 'move' } };
  if (base === 'cursor-grab') return { declarations: { cursor: 'grab' } };
  if (base === 'cursor-not-allowed') return { declarations: { cursor: 'not-allowed' } };
  if (base.startsWith('opacity-')) {
    const value = parseInt(base.replace('opacity-', ''), 10) / 100;
    return { declarations: { opacity: value.toString() } };
  }
  if (base === 'outline-none') {
    return { declarations: { outline: '2px solid transparent', 'outline-offset': '2px' } };
  }
  if (base.startsWith('ring-offset-')) {
    const token = base.replace('ring-offset-', '');
    if (token === '2') return { declarations: { '--tw-ring-offset-width': '2px' } };
    const colorInfo = getColor(token);
    if (colorInfo) {
      if (colorInfo.type === 'rgba') {
        return { declarations: { '--tw-ring-offset-color': colorInfo.value } };
      }
      return { declarations: { '--tw-ring-offset-color': `rgb(${colorInfo.rgb})` } };
    }
  }
  if (base === 'ring-2') {
    return { ringWidth: '2px' };
  }
  if (base.startsWith('ring-')) {
    const token = base.replace('ring-', '');
    if (ringColors[token]) {
      return { ringColor: `rgba(${ringColors[token]}, ${ringOpacityDefault})` };
    }
    if (token === 'current') {
      return { ringColor: 'currentColor' };
    }
  }
  if (base.startsWith('hover:bg-')) {
    const colorInfo = getColor(base.replace('hover:bg-', ''));
    if (colorInfo) {
      if (colorInfo.type === 'rgba') {
        return { declarations: { '--tw-bg-opacity': '1', 'background-color': colorInfo.value } };
      }
      return {
        declarations: {
          '--tw-bg-opacity': '1',
          'background-color': `rgba(${colorInfo.rgb}, var(--tw-bg-opacity))`,
        },
      };
    }
  }
  if (base.startsWith('hover:text-')) {
    const colorInfo = getColor(base.replace('hover:text-', ''));
    if (colorInfo) {
      if (colorInfo.type === 'rgba') {
        return { declarations: { '--tw-text-opacity': '1', color: colorInfo.value } };
      }
      return {
        declarations: {
          '--tw-text-opacity': '1',
          color: `rgba(${colorInfo.rgb}, var(--tw-text-opacity))`,
        },
      };
    }
  }
  if (base.startsWith('hover:border-')) {
    const colorInfo = getColor(base.replace('hover:border-', ''));
    if (colorInfo) {
      if (colorInfo.type === 'rgba') {
        return { declarations: { '--tw-border-opacity': '1', 'border-color': colorInfo.value } };
      }
      return {
        declarations: {
          '--tw-border-opacity': '1',
          'border-color': `rgba(${colorInfo.rgb}, var(--tw-border-opacity))`,
        },
      };
    }
  }
  if (base === 'hover:underline') {
    return { declarations: { 'text-decoration': 'underline' } };
  }
  if (base === '-mb-3') {
    return { declarations: { 'margin-bottom': `-${spacingValue('3')}` } };
  }
  if (base === 'inset-0') {
    return { declarations: { top: '0', right: '0', bottom: '0', left: '0' } };
  }
  if (base === 'top-0') {
    return { declarations: { top: '0' } };
  }
  if (base === 'z-10') return { declarations: { 'z-index': '10' } };
  if (base === 'z-50') return { declarations: { 'z-index': '50' } };
  if (base === 'whitespace-nowrap') {
    return { declarations: { 'white-space': 'nowrap' } };
  }
  if (base === 'whitespace-pre-line') {
    return { declarations: { 'white-space': 'pre-line' } };
  }
  if (base === 'whitespace-pre-wrap') {
    return { declarations: { 'white-space': 'pre-wrap' } };
  }
  if (base === 'whitespace-normal') {
    return { declarations: { 'white-space': 'normal' } };
  }
  if (base === 'truncate') {
    return {
      declarations: {
        overflow: 'hidden',
        'text-overflow': 'ellipsis',
        'white-space': 'nowrap',
      },
    };
  }
  if (base === 'self-center') return { declarations: { 'align-self': 'center' } };
  if (base === 'items-stretch') return { declarations: { 'align-items': 'stretch' } };
  if (base === 'justify-around') return { declarations: { 'justify-content': 'space-around' } };
  if (base === 'shrink-0' || base === 'flex-shrink-0') return { declarations: { 'flex-shrink': '0' } };
  if (base === 'shrink') return { declarations: { 'flex-shrink': '1' } };
  if (base === 'grow' || base === 'flex-grow') return { declarations: { 'flex-grow': '1' } };
  if (base === 'grow-0' || base === 'flex-grow-0') return { declarations: { 'flex-grow': '0' } };
  if (base === 'flex-none') return { declarations: { flex: 'none' } };
  if (base === 'order-first') return { declarations: { order: '-9999' } };
  if (base === 'order-last') return { declarations: { order: '9999' } };
  if (base === 'order-none') return { declarations: { order: '0' } };
  if (base.startsWith('object-')) {
    const token = base.replace('object-', '');
    if (['contain', 'cover', 'fill', 'none', 'scale-down'].includes(token)) {
      return { declarations: { 'object-fit': token } };
    }
    if (['center', 'top', 'bottom', 'left', 'right'].includes(token)) {
      return { declarations: { 'object-position': token } };
    }
  }
  if (base === 'select-none') return { declarations: { '-webkit-user-select': 'none', 'user-select': 'none' } };
  if (base === 'select-text') return { declarations: { '-webkit-user-select': 'text', 'user-select': 'text' } };
  if (base === 'pointer-events-none') return { declarations: { 'pointer-events': 'none' } };
  if (base === 'pointer-events-auto') return { declarations: { 'pointer-events': 'auto' } };
  if (base === 'resize') return { declarations: { resize: 'both' } };
  if (base === 'resize-none') return { declarations: { resize: 'none' } };
  if (base === 'align-middle') return { declarations: { 'vertical-align': 'middle' } };
  if (base === 'list-none') return { declarations: { 'list-style-type': 'none' } };
  if (base === 'list-decimal') return { declarations: { 'list-style-type': 'decimal' } };
  if (base === 'overflow-hidden') return { declarations: { overflow: 'hidden' } };
  if (base === 'overflow-auto') return { declarations: { overflow: 'auto' } };
  if (base === 'overflow-visible') return { declarations: { overflow: 'visible' } };
  if (base === 'overflow-x-auto') return { declarations: { 'overflow-x': 'auto' } };
  if (base === 'overflow-y-hidden') return { declarations: { 'overflow-y': 'hidden' } };
  if (base === 'overflow-x-hidden') return { declarations: { 'overflow-x': 'hidden' } };
  if (base === 'backdrop-blur') return { declarations: { '-webkit-backdrop-filter': 'blur(8px)', 'backdrop-filter': 'blur(8px)' } };
  if (base === 'backdrop-blur-sm') return { declarations: { '-webkit-backdrop-filter': 'blur(4px)', 'backdrop-filter': 'blur(4px)' } };
  if (base === 'cursor-pointer') return { declarations: { cursor: 'pointer' } };
  if (base === 'cursor-default') return { declarations: { cursor: 'default' } };
  if (base === 'cursor-text') return { declarations: { cursor: 'text' } };
  if (base === 'cursor-wait') return { declarations: { cursor: 'wait' } };
  if (base === 'transition') {
    return {
      declarations: {
        'transition-property':
          'color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter',
        'transition-timing-function': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'transition-duration': '150ms',
      },
    };
  }
  if (base === 'transition-shadow') {
    return {
      declarations: {
        'transition-property': 'box-shadow',
        'transition-timing-function': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'transition-duration': '150ms',
      },
    };
  }
  if (base === 'transition-transform') {
    return {
      declarations: {
        'transition-property': 'transform',
        'transition-timing-function': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'transition-duration': '150ms',
      },
    };
  }
  if (base === 'transition-opacity') {
    return {
      declarations: {
        'transition-property': 'opacity',
        'transition-timing-function': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'transition-duration': '150ms',
      },
    };
  }
  if (base === 'duration-150') return { declarations: { 'transition-duration': '150ms' } };
  if (base === 'duration-200') return { declarations: { 'transition-duration': '200ms' } };
  if (base === 'duration-700') return { declarations: { 'transition-duration': '700ms' } };
  if (base === 'rounded-md') return { declarations: { 'border-radius': '0.375rem' } };
  if (base === 'rounded-sm') return { declarations: { 'border-radius': '0.125rem' } };
  if (base === 'rounded-none') return { declarations: { 'border-radius': '0' } };
  if (base === 'rounded-b-xl') {
    return {
      declarations: {
        'border-bottom-left-radius': '0.75rem',
        'border-bottom-right-radius': '0.75rem',
      },
    };
  }
  if (base === 'rounded-t-xl') {
    return {
      declarations: {
        'border-top-left-radius': '0.75rem',
        'border-top-right-radius': '0.75rem',
      },
    };
  }
  if (base === 'rounded-b-2xl') {
    return {
      declarations: {
        'border-bottom-left-radius': '1rem',
        'border-bottom-right-radius': '1rem',
      },
    };
  }
  if (base === 'border-l') return { declarations: { 'border-left-width': '1px' } };
  if (base === 'border-r') return { declarations: { 'border-right-width': '1px' } };
  if (base === 'border-b-2') return { declarations: { 'border-bottom-width': '2px' } };
  if (base === 'border-t-2') return { declarations: { 'border-top-width': '2px' } };
  if (base === 'border-l-2') return { declarations: { 'border-left-width': '2px' } };
  if (base === 'border-l-4') return { declarations: { 'border-left-width': '4px' } };
  if (base === 'border-0') return { declarations: { 'border-width': '0' } };
  if (base === 'inset-x-0') return { declarations: { left: '0', right: '0' } };
  const sideMatch = /^(top|right|bottom|left)-(.+)$/.exec(base);
  if (sideMatch) {
    const [, side, token] = sideMatch;
    const fractions = { '1/2': '50%', '1/3': '33.333333%', '2/3': '66.666667%', '1/4': '25%', '3/4': '75%', full: '100%' };
    if (fractions[token]) return { declarations: { [side]: fractions[token] } };
    const spaced = spacingValue(token);
    if (spaced) return { declarations: { [side]: spaced } };
  }
  if (base === 'inset-y-0') return { declarations: { top: '0', bottom: '0' } };
  if (base.startsWith('z-')) {
    const token = base.replace('z-', '');
    const arbitrary = arbitraryValue(token);
    if (arbitrary) return { declarations: { 'z-index': arbitrary } };
    if (/^\d+$/.test(token)) return { declarations: { 'z-index': token } };
    if (token === 'auto') return { declarations: { 'z-index': 'auto' } };
  }
  if (['top', 'bottom', 'left', 'right'].some((side) => base.startsWith(`${side}-`))) {
    const [side, ...rest] = base.split('-');
    const token = rest.join('-');
    const value = scaleValue(sizingScale, token) || (token === 'full' ? '100%' : null) || (token === 'auto' ? 'auto' : null);
    if (value) return { declarations: { [side]: value } };
  }
  if (base === 'ring') {
    return { ringWidth: '3px' };
  }
  if (base === 'ring-0') {
    return { ringWidth: '0px' };
  }
  if (base === 'ring-1') {
    return { ringWidth: '1px' };
  }
  if (base === 'ring-4') {
    return { ringWidth: '4px' };
  }
  if (base === 'ring-offset-1') {
    return { declarations: { '--tw-ring-offset-width': '1px' } };
  }
  if (base.startsWith('ring-')) {
    const colorInfo = getColor(base.replace('ring-', ''));
    if (colorInfo) {
      const rgb = colorInfo.type === 'rgba' ? null : colorInfo.rgb;
      return { ringColor: rgb ? `rgba(${rgb}, ${ringOpacityDefault})` : colorInfo.value };
    }
  }
  if (base === 'prose') {
    return {
      custom: [
        '.prose { line-height: 1.75; }',
        '.prose p { margin: 0 0 1.25em; }',
        '.prose p:last-child { margin-bottom: 0; }',
        '.prose ul { list-style-type: disc; padding-left: 1.625em; margin: 0 0 1.25em; }',
        '.prose ol { list-style-type: decimal; padding-left: 1.625em; margin: 0 0 1.25em; }',
        '.prose li { margin: 0.5em 0; }',
        '.prose h1, .prose h2, .prose h3, .prose h4 { font-weight: 600; line-height: 1.3; margin: 1.5em 0 0.6em; }',
        '.prose h1 { font-size: 1.5em; }',
        '.prose h2 { font-size: 1.3em; }',
        '.prose h3 { font-size: 1.15em; }',
        '.prose a { color: #2563eb; text-decoration: underline; }',
        '.prose strong { font-weight: 600; }',
        '.prose blockquote { border-left: 3px solid #e5e7eb; padding-left: 1em; font-style: italic; margin: 1.25em 0; }',
      ].join('\n'),
    };
  }
  if (base === 'prose-sm') {
    return { declarations: { 'font-size': '0.875rem', 'line-height': '1.7142857' } };
  }
  return null;
}

function buildRule(cls) {
  const segments = cls.split(':');
  const base = segments.pop();
  const variants = segments;

  let rule = baseRule(base);

  if (!rule && variants.includes('hover')) {
    rule = baseRule(`hover:${base}`);
  }
  if (!rule && variants.includes('focus')) {
    rule = baseRule(base.startsWith('ring') || base.startsWith('outline') ? `ring${base.slice(4)}` : base);
    if (!rule) {
      rule = baseRule(`focus:${base}`);
    }
  }
  if (!rule && variants.includes('focus-visible')) {
    rule = baseRule(base.startsWith('ring') ? base : `focus-visible:${base}`);
  }
  if (!rule && variants.includes('disabled')) {
    rule = baseRule(base.startsWith('opacity') || base.startsWith('cursor') ? base : `disabled:${base}`);
  }

  if (!rule) return '';

  const responsive = variants.filter((variant) => breakpoints[variant]);
  const pseudoParts = variants.filter((variant) => ['hover', 'focus', 'focus-visible', 'disabled'].includes(variant));

  let pseudoSelector = '';
  for (const pseudo of pseudoParts) {
    if (pseudo === 'hover') pseudoSelector += ':hover';
    if (pseudo === 'focus') pseudoSelector += ':focus';
    if (pseudo === 'focus-visible') pseudoSelector += ':focus-visible';
    if (pseudo === 'disabled') pseudoSelector += ':disabled';
  }

  const escaped = escapeClass(cls);
  const rules = [];

  if (rule.custom) {
    rules.push(rule.custom);
  }

  const declarations = { ...(rule.declarations || {}) };
  if (rule.ringColor) {
    declarations['--tw-ring-color'] = rule.ringColor;
  }

  if (Object.keys(declarations).length) {
    rules.push(`.${escaped}${pseudoSelector} {`);
    rules.push(formatDeclarations(declarations));
    rules.push('}');
  }

  if (rule.ringWidth) {
    const width = rule.ringWidth;
    const selector = `.${escaped}${pseudoSelector || ':focus'}`;
    rules.push(`${selector} {`);
    rules.push('  --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);');
    rules.push(`  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(${width} + var(--tw-ring-offset-width)) var(--tw-ring-color);`);
    rules.push('  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);');
    rules.push('}');
  }

  if (rule.nested) {
    for (const nested of rule.nested) {
      rules.push(`.${escaped}${pseudoSelector} ${nested.selector} {`);
      rules.push(formatDeclarations(nested.declarations));
      rules.push('}');
    }
  }

  let css = rules.join('\n');
  for (const breakpoint of responsive) {
    css = `@media (min-width: ${breakpoints[breakpoint]}) {\n${indentBlock(css, 2)}\n}`;
  }

  return css;
}

const classMetaCache = new Map();

function getClassMeta(cls) {
  if (classMetaCache.has(cls)) {
    return classMetaCache.get(cls);
  }

  const segments = cls.split(':');
  segments.pop();

  let maxBreakpointIndex = -1;
  let pseudoIndex = -1;

  for (const segment of segments) {
    if (breakpoints[segment]) {
      const index = breakpointOrder[segment] ?? 0;
      if (index > maxBreakpointIndex) {
        maxBreakpointIndex = index;
      }
    } else if (Object.prototype.hasOwnProperty.call(pseudoVariantOrder, segment)) {
      const index = pseudoVariantOrder[segment];
      if (index > pseudoIndex) {
        pseudoIndex = index;
      }
    }
  }

  const hasResponsive = maxBreakpointIndex >= 0;
  const hasPseudo = pseudoIndex >= 0;

  let stage = 0;
  if (hasResponsive && hasPseudo) {
    stage = 3;
  } else if (hasPseudo) {
    stage = 2;
  } else if (hasResponsive) {
    stage = 1;
  }

  const meta = { stage, maxBreakpointIndex, pseudoIndex };
  classMetaCache.set(cls, meta);
  return meta;
}

const sortedClasses = [...classes].sort((a, b) => {
  const aMeta = getClassMeta(a);
  const bMeta = getClassMeta(b);

  if (aMeta.stage !== bMeta.stage) {
    return aMeta.stage - bMeta.stage;
  }

  if ((aMeta.stage === 1 || aMeta.stage === 3) && aMeta.maxBreakpointIndex !== bMeta.maxBreakpointIndex) {
    return aMeta.maxBreakpointIndex - bMeta.maxBreakpointIndex;
  }

  if ((aMeta.stage === 2 || aMeta.stage === 3) && aMeta.pseudoIndex !== bMeta.pseudoIndex) {
    return aMeta.pseudoIndex - bMeta.pseudoIndex;
  }

  return a.localeCompare(b);
});

const generated = [];
const handled = new Set();

for (const cls of sortedClasses) {
  if (!cls) continue;
  const css = buildRule(cls);
  if (css) {
    generated.push(css);
    handled.add(cls);
  }
}

// Une classe écrite en dur dans un class="…" qui ne produit aucune règle est un
// bug silencieux : l'élément s'affiche sans le style attendu, sans rien signaler
// dans le navigateur. Les fragments dynamiques (looseClasses) ne sont pas
// concernés : on ne peut pas savoir si ce sont vraiment des classes.
const unmapped = [...attrClasses].filter((cls) => !handled.has(cls) && isTailwindClass(cls));

// Classes qui ne sont ni reconnues comme Tailwind ni déclarées comme classes
// maison : jusqu'ici elles disparaissaient sans laisser de trace.
const unrecognized = [...attrClasses].filter(
  (cls) =>
    !handled.has(cls) &&
    !isTailwindClass(cls) &&
    !isCustomClass(cls) &&
    !handWrittenClasses.has(cls)
);

const header = `/* Tailwind-inspired utility subset generated locally */\n:root {\n  --tw-ring-offset-width: 0px;\n  --tw-ring-offset-color: #fff;\n  --tw-ring-color: rgba(59, 130, 246, 0.5);\n  --tw-ring-inset: var(--tw-empty,/*!*/ /*!*/);\n  --tw-shadow: 0 0 #0000;\n  --tw-bg-opacity: 1;\n  --tw-text-opacity: 1;\n  --tw-border-opacity: 1;\n}\n*, ::before, ::after {\n  box-sizing: border-box;\n  border-width: 0;\n  border-style: solid;\n  border-color: #e5e7eb;\n}\nhtml {\n  line-height: 1.5;\n  -webkit-text-size-adjust: 100%;\n  font-family: 'Inter', 'Segoe UI', Roboto, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;\n}\nbody {\n  margin: 0;\n  line-height: inherit;\n  font-family: 'Inter', 'Segoe UI', Roboto, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;\n}\na {\n  color: inherit;\n  text-decoration: inherit;\n}\n`;

const outputPath = path.join(__dirname, '..', 'src', 'styles', 'tailwind-internal.css');
fs.writeFileSync(outputPath, header + '\n' + generated.join('\n\n'));
console.log('CSS generated at', outputPath);
console.log(`${handled.size} classes generees.`);

const report = (title, items, hint) => {
  console.warn('');
  console.warn(`!! ${title} (${items.length})`);
  console.warn(`   ${hint}`);
  for (const item of [...items].sort()) {
    console.warn(`   - ${item}`);
  }
};

if (unmapped.length) {
  report(
    'Classes Tailwind sans regle : elles ne produiront AUCUN style',
    unmapped,
    'Ajouter la regle correspondante dans baseRule(), ou remplacer la classe dans le composant.'
  );
}

if (unrecognized.length) {
  report(
    'Classes non reconnues : ignorees silencieusement',
    unrecognized,
    'Si c\'est du Tailwind, ajouter son prefixe a knownPrefix. Sinon, ajouter son prefixe a customClassPrefixes.'
  );
}

if (unmapped.length || unrecognized.length) {
  console.warn('');
  if (process.argv.includes('--strict')) {
    process.exitCode = 1;
  }
}
