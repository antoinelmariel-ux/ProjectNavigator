import { injectStyles } from './injectStyles.js';

// Feuilles de la vitrine, chargées à la demande : l'écran vitrine de l'application et
// l'aperçu des modèles de vitrine du back-office les partagent.
export const loadShowcaseStyles = () =>
  Promise.all([
    import(/* webpackChunkName: "showcase-styles" */ './project-showcase.css?raw'),
    import(/* webpackChunkName: "showcase-styles" */ './project-showcase-theme-signature.css?raw'),
    import(/* webpackChunkName: "showcase-styles" */ './showcase-editor.css?raw')
  ]).then(([showcase, themeSignature, editor]) => {
    injectStyles('project-showcase', showcase.default);
    injectStyles('project-showcase-theme-signature', themeSignature.default);
    injectStyles('showcase-editor', editor.default);
  });
