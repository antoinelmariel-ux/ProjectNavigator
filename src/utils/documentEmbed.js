// Aperçu intégré d'un document dans la vitrine. Logique pure (ni React ni DOM) : le contexte
// SharePoint lui est passé en paramètre, ce qui la rend couverte par `npm test`.
//
// Deux familles s'affichent en ligne, et une seule voie fonctionne pour chacune :
//  - PDF : rendu nativement par le lecteur du navigateur, sans service tiers ;
//  - formats bureautiques (PPTX...) : il leur faut un convertisseur Office. Le visualiseur
//    public view.officeapps.live.com ne convient pas — il va chercher le fichier depuis
//    Internet, alors que nos documents sont soit en `data:` URL (mode local), soit derrière la
//    session SharePoint du tenant. D'où le « Désolé, nous n'avons pas trouvé le fichier »
//    qu'il renvoyait systématiquement. Seul le visualiseur hébergé par le tenant lui-même
//    (Doc.aspx, appelé avec les cookies de la session courante) peut lire le fichier : hors
//    mode SharePoint, aucun aperçu intégré n'est possible pour ces formats.

// Paramètres d'ouverture PDF standard : referment le panneau de vignettes/signets que le
// lecteur du navigateur déplie par défaut, inutile pour un document présenté dans la vitrine.
const PDF_VIEWER_PARAMS = 'navpanes=0&pagemode=none';

export const IMAGE_DOCUMENT_TYPES = ['jpg', 'png'];

export const buildPdfEmbedSrc = (documentUrl) => {
  if (!documentUrl) {
    return '';
  }

  // Un fragment déjà présent (lien collé à la main) porte peut-être ses propres paramètres :
  // on ne le réécrit pas.
  return documentUrl.includes('#') ? documentUrl : `${documentUrl}#${PDF_VIEWER_PARAMS}`;
};

const toServerRelativeUrl = (documentUrl, origin) => {
  const rawPath = documentUrl.slice(origin.length);
  try {
    return decodeURIComponent(rawPath);
  } catch {
    // Séquence % invalide (URL saisie à la main) : le chemin brut reste exploitable.
    return rawPath;
  }
};

// `sourcedoc` accepte ici le chemin serveur du fichier. Si un tenant refuse cette forme, la
// variante documentée est l'identifiant unique du fichier entre accolades
// (`sourcedoc={GUID}`) : il faudrait alors le récupérer à l'upload (UniqueId, via l'API REST)
// et le stocker sur la section, le chemin seul ne permettant pas de le déduire.
export const buildOfficeEmbedSrc = (documentUrl, { origin, webUrl, isSharePoint } = {}) => {
  if (!documentUrl || !isSharePoint || !origin || !webUrl) {
    return '';
  }

  // Un fichier hors bibliothèque du tenant (data: URL, lien externe) n'est pas lisible par le
  // visualiseur du site : mieux vaut ne rien intégrer qu'afficher sa page d'erreur.
  if (!documentUrl.startsWith(`${origin}/`)) {
    return '';
  }

  const sourceDoc = toServerRelativeUrl(documentUrl, origin);
  return `${webUrl}/_layouts/15/Doc.aspx?sourcedoc=${encodeURIComponent(sourceDoc)}&action=embedview`;
};

export const resolveDocumentEmbedSrc = (documentUrl, documentType, context = {}) => {
  if (!documentUrl || IMAGE_DOCUMENT_TYPES.includes(documentType)) {
    return '';
  }

  if (documentType === 'pdf') {
    return buildPdfEmbedSrc(documentUrl);
  }

  return buildOfficeEmbedSrc(documentUrl, context);
};
