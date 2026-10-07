// Pages d'aide (FAQ, mentions légales) : affichées dans l'app, car une page SharePoint ne sert
// pas de fichier .html voisin. N'importe quel composant les ouvre par un événement, sans prop.
export const STATIC_PAGE_IDS = ['faq', 'mentions-legales'];
export const STATIC_PAGE_EVENT = 'cn:open-static-page';

export const openStaticPage = (pageId) => {
  if (typeof window === 'undefined' || !STATIC_PAGE_IDS.includes(pageId)) {
    return;
  }
  window.dispatchEvent(new CustomEvent(STATIC_PAGE_EVENT, { detail: { pageId } }));
};

// Lien d'aide : garde un vrai <a> (clic milieu, lecteurs d'écran) mais ouvre la page dans l'app.
export const staticPageLinkProps = (pageId) => ({
  href: `#${pageId}`,
  onClick: (event) => {
    event.preventDefault();
    openStaticPage(pageId);
  }
});
