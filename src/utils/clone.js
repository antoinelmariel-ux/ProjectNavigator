export const cloneDeep = (value) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // Certaines valeurs (fonctions, DOM…) ne sont pas clonables : on retombe sur JSON.
    }
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
};
