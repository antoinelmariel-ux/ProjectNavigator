// Une liste triée par « dernière modification » réordonne la carte sur laquelle on vient de
// cliquer : elle saute sous la souris et peut sortir de l'écran. L'ordre calculé n'est donc
// appliqué qu'à l'arrivée sur l'écran (ou quand la vue change) ; ensuite les éléments déjà
// affichés gardent leur place, les nouveaux s'insèrent là où le tri les met par rapport à leurs
// voisins, les disparus s'en vont.

const keepFirstById = (items, getId) => {
  const seen = new Set();
  const unique = [];
  items.forEach((item) => {
    const id = getId(item);
    if (id === undefined || id === null || seen.has(id)) {
      return;
    }
    seen.add(id);
    unique.push(item);
  });
  return unique;
};

export const reconcileStableOrder = (sortedItems, previousIds, getId) => {
  const sorted = keepFirstById(Array.isArray(sortedItems) ? sortedItems : [], getId);
  if (!Array.isArray(previousIds) || previousIds.length === 0) {
    return sorted;
  }

  const byId = new Map(sorted.map((item) => [getId(item), item]));
  const result = [];
  const placed = new Set();
  previousIds.forEach((id) => {
    if (byId.has(id) && !placed.has(id)) {
      placed.add(id);
      result.push(byId.get(id));
    }
  });

  if (result.length === sorted.length) {
    return result;
  }

  sorted.forEach((item, sortedIndex) => {
    const id = getId(item);
    if (placed.has(id)) {
      return;
    }
    let insertAt = 0;
    for (let cursor = sortedIndex - 1; cursor >= 0; cursor -= 1) {
      const neighbourIndex = result.findIndex((entry) => getId(entry) === getId(sorted[cursor]));
      if (neighbourIndex !== -1) {
        insertAt = neighbourIndex + 1;
        break;
      }
    }
    result.splice(insertAt, 0, item);
    placed.add(id);
  });

  return result;
};

// Les éléments qui viennent de disparaître restent à l'écran le temps de leur animation de
// sortie, à la place qu'ils occupaient : juste après leur voisin précédent encore affiché.
export const mergeLeavingItems = (displayedItems, previousIds, leavingEntries, getId) => {
  if (!Array.isArray(leavingEntries) || leavingEntries.length === 0) {
    return displayedItems;
  }

  const result = displayedItems.slice();
  const orderOf = (id) => previousIds.indexOf(id);
  leavingEntries
    .slice()
    .sort((a, b) => orderOf(getId(a)) - orderOf(getId(b)))
    .forEach((item) => {
      const previousIndex = orderOf(getId(item));
      let insertAt = 0;
      for (let cursor = previousIndex - 1; cursor >= 0; cursor -= 1) {
        const neighbourIndex = result.findIndex((entry) => getId(entry) === previousIds[cursor]);
        if (neighbourIndex !== -1) {
          insertAt = neighbourIndex + 1;
          break;
        }
      }
      result.splice(insertAt, 0, item);
    });

  return result;
};
