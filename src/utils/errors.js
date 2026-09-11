export class ConflictError extends Error {
  constructor(message, serverRecord) {
    super(message);
    this.name = 'ConflictError';
    this.serverRecord = serverRecord;
  }
}

// Une session SPO expirée ne renvoie pas une erreur HTTP : SharePoint redirige vers la page
// de connexion, que fetch suit, et on reçoit du HTML à la place du JSON attendu.
export class SessionExpiredError extends Error {
  constructor(message = 'Session SharePoint expirée. Rechargez la page.') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

export class SharePointError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'SharePointError';
    this.status = status;
    this.code = code;
  }
}

// Écriture tentée pendant une simulation d'identité (« Voir en tant que ») : elle n'est jamais
// réessayée, contrairement à une panne réseau, puisqu'elle échouera à l'identique tant que
// l'onglet reste en simulation (voir retryQueue.js/autosaveQueue.js et src/utils/impersonation.js).
export class ReadOnlySimulationError extends Error {
  constructor(message = 'Simulation d’identité active : les modifications ne sont pas enregistrées.') {
    super(message);
    this.name = 'ReadOnlySimulationError';
  }
}
