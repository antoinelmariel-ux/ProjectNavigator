// Une page SharePoint moderne intercepte les clics sur les liens pour naviguer sans recharger,
// et peut ainsi ouvrir dans l'onglet courant un lien pourtant marqué target="_blank" (on
// quitterait l'app en pleine saisie). `data-interception="off"` est la parade documentée par
// SharePoint ; ce relais ouvre en plus lui-même tout lien « nouvel onglet » cliqué dans l'app.
export const NEW_TAB_LINK_ATTRIBUTES = {
  target: '_blank',
  rel: 'noopener noreferrer',
  'data-interception': 'off'
};

const findNewTabLink = (target, root) => {
  const link = typeof target?.closest === 'function' ? target.closest('a[href]') : null;
  if (!link || (root && typeof root.contains === 'function' && !root.contains(link))) {
    return null;
  }
  return (link.getAttribute('target') || '').toLowerCase() === '_blank' ? link : null;
};

// Les clics modifiés (Ctrl, Maj, molette…) et les téléchargements restent au navigateur, qui
// les traite déjà hors de l'onglet courant.
export const handleNewTabLinkClick = (event, root, openWindow) => {
  if (!event || event.defaultPrevented || event.button !== 0) {
    return false;
  }
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
    return false;
  }

  const link = findNewTabLink(event.target, root);
  if (!link || link.hasAttribute('download')) {
    return false;
  }

  const href = link.href || link.getAttribute('href');
  if (!href || !/^https?:\/\//i.test(href)) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();
  openWindow(href, '_blank', 'noopener,noreferrer');
  return true;
};

export const installNewTabLinkRelay = (root) => {
  if (!root || typeof root.addEventListener !== 'function' || typeof window === 'undefined') {
    return () => {};
  }
  const listener = (event) => handleNewTabLinkClick(event, root, (...args) => window.open(...args));
  root.addEventListener('click', listener);
  return () => root.removeEventListener('click', listener);
};
