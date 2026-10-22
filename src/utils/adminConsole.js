// Console d'administration des projets : un administrateur l'ouvre depuis l'onglet
// « Administrateurs » du back-office, dans un second onglet (?adminConsole=1). C'est le seul
// endroit où il a la main sur tous les projets, ceux des autres comme les brouillons : les
// droits étendus ne s'exercent donc jamais par mégarde depuis sa session ordinaire, et le
// bandeau dit en permanence dans quelle fenêtre il se trouve.
//
// Comme « Voir en tant que », ce n'est pas une frontière de sécurité : main.jsx n'active la
// console que si l'identité réelle figure dans les administrateurs, et l'interface seule en
// dépend. Les deux modes s'excluent : simuler quelqu'un n'ouvre pas la console.

export const ADMIN_CONSOLE_PARAM = 'adminConsole';

let isActive = false;

export const readAdminConsoleRequest = (search) => {
  if (typeof search !== 'string' || !search) {
    return false;
  }

  const query = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(query).get(ADMIN_CONSOLE_PARAM) === '1';
};

export const buildAdminConsoleUrl = (href) => {
  if (typeof href !== 'string' || !href) {
    return '';
  }

  const url = new URL(href);
  url.searchParams.set(ADMIN_CONSOLE_PARAM, '1');
  return url.toString();
};

export const buildAdminConsoleExitUrl = (href) => {
  if (typeof href !== 'string' || !href) {
    return '';
  }

  const url = new URL(href);
  url.searchParams.delete(ADMIN_CONSOLE_PARAM);
  return url.toString();
};

export const startAdminConsole = () => {
  isActive = true;
};

export const stopAdminConsole = () => {
  isActive = false;
};

export const isAdminConsoleActive = () => isActive;
