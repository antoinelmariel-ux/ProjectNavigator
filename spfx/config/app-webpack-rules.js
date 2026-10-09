'use strict';

// Règles partagées par le bundle SPFx (spfx-customize-webpack.js) et le harnais de dev
// (scripts/build-harness.js) : une seule transformation du code de ../src, pour que les tests
// e2e exercent exactement ce qui part dans le .sppkg.
const path = require('path');

const SPFX_ROOT = path.resolve(__dirname, '..');
const APP_SRC = path.resolve(SPFX_ROOT, '..', 'src');
const APP_VENDOR = path.join(APP_SRC, 'vendor');
const APP_ENTRY = path.join(APP_SRC, 'main.jsx');

const appRules = [
  {
    test: /\.jsx?$/,
    include: APP_SRC,
    exclude: APP_VENDOR,
    resourceQuery: { not: [/raw/] },
    use: {
      loader: require.resolve('babel-loader'),
      options: {
        babelrc: false,
        configFile: false,
        cacheDirectory: true,
        compact: false,
        presets: [[require.resolve('@babel/preset-react'), { runtime: 'classic' }]],
        // L'ancien build (preset-env vers ES5) changeait const/let en var, et le code en dépend :
        // plusieurs useCallback/useMemo d'App.jsx citent dans leurs dépendances une constante
        // déclarée plus bas. En ES2015+ c'est une ReferenceError (zone morte temporelle) au
        // premier rendu ; on garde donc exactement l'ancienne sémantique.
        plugins: [require.resolve('@babel/plugin-transform-block-scoping')]
      }
    }
  },
  {
    include: APP_SRC,
    resourceQuery: /raw/,
    type: 'asset/source'
  },
  {
    test: /\.png$/,
    include: APP_SRC,
    type: 'asset/resource'
  }
];

const appAliases = {
  'project-navigator-app$': APP_ENTRY,
  react$: require.resolve('react'),
  'react-dom$': require.resolve('react-dom')
};

// Webpack applique toutes les règles qui correspondent, pas la première : sans cette exclusion, les
// règles .css/.html de SPFx (sp-css-loader, html-loader) traitent aussi les imports `?raw`, et
// l'application injecte alors dans ses <style> un module JS aux classes suffixées au lieu du CSS.
const skipRawImports = (rule) => ({ resourceQuery: { not: [/raw/] }, rules: [rule] });

const applyAppWebpackRules = (config) => {
  config.module = config.module || {};
  config.module.rules = [...appRules, ...(config.module.rules || []).map(skipRawImports)];
  config.resolve = config.resolve || {};
  config.resolve.alias = { ...(config.resolve.alias || {}), ...appAliases };
  return config;
};

module.exports = { APP_SRC, APP_ENTRY, appRules, appAliases, applyAppWebpackRules };
