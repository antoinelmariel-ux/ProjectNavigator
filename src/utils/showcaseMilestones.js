// Les jalons sont saisis dans l'ordre où on y pense, rarement dans celui où ils arrivent :
// une frise qui remonte le temps se lit mal. Les entrées datées sont donc replacées dans
// l'ordre chronologique, chacune reprenant l'un des emplacements déjà occupés par une entrée
// datée. Les jalons sans date exploitable ne bougent pas : un jalon dont la date n'est pas
// encore saisie sauterait sinon à l'autre bout de la liste sous les doigts de l'auteur, et une
// date libre héritée d'une ancienne saisie (« Printemps 2026 ») n'est pas comparable.
const toTimestamp = (value) => {
  if (typeof value !== 'string') {
    return Number.NaN;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return Number.NaN;
  }

  return Date.parse(trimmed);
};

export const hasChronologicalDate = (value) => !Number.isNaN(toTimestamp(value));

export const sortMilestonesChronologically = (entries) => {
  if (!Array.isArray(entries)) {
    return [];
  }

  const datedSlots = [];
  entries.forEach((entry, index) => {
    if (hasChronologicalDate(entry?.date)) {
      datedSlots.push(index);
    }
  });

  if (datedSlots.length < 2) {
    return entries;
  }

  const ordered = datedSlots
    .map(index => ({ index, entry: entries[index], time: toTimestamp(entries[index].date) }))
    // à date égale, l'ordre de saisie fait foi : deux jalons du même jour ne doivent pas
    // permuter à chaque frappe
    .sort((a, b) => (a.time === b.time ? a.index - b.index : a.time - b.time));

  if (ordered.every((candidate, position) => candidate.index === datedSlots[position])) {
    return entries;
  }

  const result = entries.slice();
  datedSlots.forEach((slot, position) => {
    result[slot] = ordered[position].entry;
  });

  return result;
};
