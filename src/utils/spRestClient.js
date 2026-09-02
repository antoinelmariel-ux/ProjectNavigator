import { getWebUrl } from '../config/sharepointConfig.js';
import { ConflictError, SessionExpiredError, SharePointError } from './errors.js';

const ACCEPT_BY_METADATA = {
  none: 'application/json;odata=nometadata',
  minimal: 'application/json;odata=minimalmetadata',
  verbose: 'application/json;odata=verbose'
};

const MAX_RETRIES = 3;
const MAX_RETRY_DELAY_MS = 30000;
// On renouvelle le digest à 80 % de sa durée de vie pour ne jamais écrire avec un jeton expiré.
const DIGEST_SAFETY_RATIO = 0.8;
const MAX_PAGES = 200;

let digestValue = null;
let digestExpiresAt = 0;

export const resetSpRestClient = () => {
  digestValue = null;
  digestExpiresAt = 0;
};

const getFetch = () => {
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    return window.fetch.bind(window);
  }
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch.bind(globalThis);
  }
  throw new SharePointError('fetch indisponible dans cet environnement.', 0);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const buildUrl = (path) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const webUrl = getWebUrl();
  return `${webUrl}${path.startsWith('/') ? '' : '/'}${path}`;
};

// Dans un littéral OData, une apostrophe se protège en la doublant.
export const odataQuote = (value) => String(value ?? '').replace(/'/g, "''");

export const buildQuery = (options = {}) => {
  const parts = [];
  const append = (key, value) => {
    if (value !== undefined && value !== null && value !== '') {
      parts.push(`${key}=${encodeURIComponent(String(value))}`);
    }
  };
  append('$select', options.select);
  append('$filter', options.filter);
  append('$expand', options.expand);
  append('$orderby', options.orderby);
  append('$top', options.top);
  return parts.length ? `?${parts.join('&')}` : '';
};

const extractErrorMessage = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const error = payload.error || payload['odata.error'];
  const message = error && error.message;
  if (typeof message === 'string') {
    return message;
  }
  if (message && typeof message.value === 'string') {
    return message.value;
  }
  return null;
};

const extractErrorCode = (payload) => {
  const error = payload && (payload.error || payload['odata.error']);
  return (error && error.code) || undefined;
};

const looksLikeSignInPage = (contentType, text) =>
  contentType.includes('text/html') || /<html/i.test(text.slice(0, 400));

const readBody = async (response, raw) => {
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (response.status === 204) {
    return null;
  }
  const text = await response.text();
  if (!text) {
    return null;
  }
  if (looksLikeSignInPage(contentType, text)) {
    throw new SessionExpiredError();
  }
  if (raw) {
    return text;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const retryDelayMs = (response, attempt) => {
  const header = Number(response.headers.get('Retry-After'));
  if (Number.isFinite(header) && header > 0) {
    return Math.min((header + 1) * 1000, MAX_RETRY_DELAY_MS);
  }
  return Math.min(2 ** attempt * 1000, MAX_RETRY_DELAY_MS);
};

const requestDigest = async () => {
  if (digestValue && Date.now() < digestExpiresAt) {
    return digestValue;
  }
  const response = await getFetch()(buildUrl('/_api/contextinfo'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: { Accept: ACCEPT_BY_METADATA.none }
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new SessionExpiredError();
    }
    throw new SharePointError(
      'Impossible d’obtenir le jeton de sécurité SharePoint.',
      response.status
    );
  }
  const payload = await readBody(response, false);
  const info = payload && (payload.d ? payload.d.GetContextWebInformation : payload);
  const value = info && info.FormDigestValue;
  if (!value) {
    throw new SharePointError('Jeton de sécurité SharePoint introuvable dans la réponse.', 500);
  }
  const timeoutSeconds = Number(info.FormDigestTimeoutSeconds) || 1800;
  digestValue = value;
  digestExpiresAt = Date.now() + timeoutSeconds * 1000 * DIGEST_SAFETY_RATIO;
  return value;
};

const request = async (method, path, options = {}) => {
  const {
    body,
    rawBody,
    metadata = 'none',
    headers: extraHeaders,
    etag,
    raw = false,
    contentType,
    attempt = 0
  } = options;

  const isRead = method === 'GET';
  const headers = { Accept: ACCEPT_BY_METADATA[metadata] || ACCEPT_BY_METADATA.none, ...extraHeaders };
  const init = { method: isRead ? 'GET' : 'POST', credentials: 'same-origin', headers };

  if (!isRead) {
    headers['X-RequestDigest'] = await requestDigest();
    if (method !== 'POST') {
      headers['X-HTTP-Method'] = method;
    }
    if (etag) {
      headers['IF-MATCH'] = etag;
    }
    if (rawBody !== undefined) {
      headers['Content-Type'] = contentType || 'text/plain;charset=utf-8';
      init.body = rawBody;
    } else if (body !== undefined) {
      headers['Content-Type'] = contentType || ACCEPT_BY_METADATA[metadata] || ACCEPT_BY_METADATA.none;
      init.body = JSON.stringify(body);
    }
  }

  const response = await getFetch()(buildUrl(path), init);

  if ((response.status === 429 || response.status === 503) && attempt < MAX_RETRIES) {
    await sleep(retryDelayMs(response, attempt));
    return request(method, path, { ...options, attempt: attempt + 1 });
  }

  // Un 403 sur une écriture signifie presque toujours un digest périmé : on le renouvelle une fois.
  if (response.status === 403 && !isRead && attempt < 1) {
    resetSpRestClient();
    return request(method, path, { ...options, attempt: attempt + 1 });
  }

  if (response.status === 401) {
    throw new SessionExpiredError();
  }

  if (!response.ok) {
    const payload = await readBody(response, false);
    const message = extractErrorMessage(payload) || `Erreur SharePoint (HTTP ${response.status}).`;
    if (response.status === 412) {
      throw new ConflictError(message);
    }
    throw new SharePointError(message, response.status, extractErrorCode(payload));
  }

  const payload = await readBody(response, raw);
  return { data: payload, etag: response.headers.get('ETag') };
};

const unwrap = async (promise) => (await promise).data;

export const spGet = (path, options) => unwrap(request('GET', path, options));

export const spGetWithEtag = (path, options) => request('GET', path, options);

export const spPost = (path, body, options) => unwrap(request('POST', path, { ...options, body }));

export const spMerge = (path, body, options = {}) =>
  unwrap(request('MERGE', path, { ...options, body, etag: options.etag || '*' }));

export const spDelete = (path, options = {}) =>
  unwrap(request('DELETE', path, { ...options, etag: options.etag || '*' }));

export const spPut = (path, rawBody, options = {}) =>
  unwrap(request('PUT', path, { ...options, rawBody }));

export const spGetAll = async (path, options) => {
  const items = [];
  let nextPath = path;
  let pages = 0;

  while (nextPath && pages < MAX_PAGES) {
    const payload = await spGet(nextPath, options);
    if (payload && Array.isArray(payload.value)) {
      items.push(...payload.value);
    }
    nextPath =
      (payload && (payload['odata.nextLink'] || (payload.d && payload.d.__next))) || null;
    pages += 1;
  }

  return items;
};
