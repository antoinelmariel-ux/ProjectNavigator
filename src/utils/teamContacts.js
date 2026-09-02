export const normalizeTeamContacts = (team) => {
  if (!team) {
    return [];
  }

  const rawContacts = Array.isArray(team.contacts)
    ? team.contacts
    : Array.isArray(team.contact)
      ? team.contact
      : typeof team.contact === 'string'
        ? team.contact.split(/[,;\n]/)
        : [];

  return rawContacts
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
};

export const formatTeamContacts = (team, separator = ', ') =>
  normalizeTeamContacts(team).join(separator);

export const parseTeamContacts = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0);
  }

  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(/[,;\n]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};
