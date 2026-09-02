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
