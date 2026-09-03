import { isSharePointMode } from '../config/sharepointConfig.js';
import { getRepository } from './listRepository.js';
import { resolveLibraryServerRelativeUrl } from './spLibraryUrl.js';
import { getCurrentUser } from './spContext.js';
import { odataQuote, spGet, spPost } from './spRestClient.js';

// Files/add convient largement en deçà de cette taille ; au-delà il faudrait le découpage
// StartUpload/ContinueUpload/FinishUpload. On préfère un refus explicite à un échec obscur.
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'txt', 'csv', 'rtf', 'odt', 'ods', 'odp',
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp',
  'msg', 'eml', 'zip'
]);

export const formatFileSize = (bytes) => {
  const size = Number(bytes) || 0;
  if (size < 1024) {
    return `${size} o`;
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} Ko`;
  }
  const megabytes = size / (1024 * 1024);
  const rounded = Math.round(megabytes * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : String(rounded).replace('.', ',')} Mo`;
};

export const getFileExtension = (fileName) => {
  const match = String(fileName || '').match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : '';
};

// SharePoint refuse " * : < > ? / \ | # % et les noms commençant ou finissant par un point.
export const sanitizeFileName = (fileName) => {
  const raw = String(fileName || '').trim();
  const cleaned = raw
    .replace(/[\\/:*?"<>|#%~&{}]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
    .trim();

  if (!cleaned) {
    return 'document';
  }
  return cleaned.length > 120 ? cleaned.slice(-120) : cleaned;
};

export const validateFile = (file) => {
  if (!file || !file.name) {
    return { ok: false, message: 'Fichier illisible.' };
  }

  const size = Number(file.size) || 0;
  if (size > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      message: `Fichier trop volumineux (${formatFileSize(size)}). La taille maximale est de ${formatFileSize(MAX_FILE_SIZE_BYTES)}.`
    };
  }

  const extension = getFileExtension(file.name);
  if (!extension) {
    return { ok: false, message: 'Ce fichier n’a pas d’extension : impossible de le déposer.' };
  }
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return {
      ok: false,
      message: `Les fichiers « .${extension} » ne sont pas autorisés. Formats acceptés : documents bureautiques, images, PDF, archives ZIP.`
    };
  }

  return { ok: true, message: '' };
};

export const buildDocumentRelativePath = ({ entityType, entityId, fileName, uniqueSuffix }) => {
  const safeType = sanitizeFileName(entityType || 'divers');
  const safeId = sanitizeFileName(entityId || 'sans-identifiant');
  const safeName = sanitizeFileName(fileName);
  const prefix = uniqueSuffix ? `${uniqueSuffix}-` : '';
  return `${safeType}/${safeId}/${prefix}${safeName}`;
};

const documentsRoot = () => resolveLibraryServerRelativeUrl('documents');

export const buildDownloadUrl = (serverRelativePath) =>
  `/_api/web/GetFileByServerRelativeUrl('${odataQuote(serverRelativePath)}')/$value`;

const ensureFolder = async (serverRelativeUrl) => {
  try {
    await spGet(`/_api/web/GetFolderByServerRelativeUrl('${odataQuote(serverRelativeUrl)}')?$select=Name`);
    return;
  } catch (error) {
    if (error && error.status !== 404) {
      throw error;
    }
  }

  try {
    await spPost('/_api/web/folders', { ServerRelativeUrl: serverRelativeUrl });
  } catch (error) {
    // Course entre deux dépôts simultanés : le dossier peut avoir été créé entre-temps.
    if (!(error && (error.status === 400 || error.status === 409))) {
      throw error;
    }
  }
};

const readFileAsArrayBuffer = (file) =>
  new Promise((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      reject(new Error('Lecture de fichier indisponible dans ce navigateur.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Lecture du fichier impossible.'));
    reader.readAsArrayBuffer(file);
  });

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      reject(new Error('Lecture de fichier indisponible dans ce navigateur.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error || new Error('Lecture du fichier impossible.'));
    reader.readAsDataURL(file);
  });

export const uploadDocument = async (file, { entityType, entityId } = {}) => {
  const root = await documentsRoot();
  const relativePath = buildDocumentRelativePath({
    entityType,
    entityId,
    fileName: file.name,
    uniqueSuffix: String(Date.now())
  });
  const [folderType, folderId] = relativePath.split('/');

  await ensureFolder(`${root}/${folderType}`);
  await ensureFolder(`${root}/${folderType}/${folderId}`);

  const serverRelativePath = `${root}/${relativePath}`;
  const folderPath = serverRelativePath.slice(0, serverRelativePath.lastIndexOf('/'));
  const storedName = serverRelativePath.slice(serverRelativePath.lastIndexOf('/') + 1);
  const content = await readFileAsArrayBuffer(file);

  await spPost(
    `/_api/web/GetFolderByServerRelativeUrl('${odataQuote(folderPath)}')/Files/add(url='${odataQuote(storedName)}',overwrite=true)`,
    undefined,
    { rawBody: content, contentType: file.type || 'application/octet-stream' }
  );

  const fileId = `file-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const uploadedAt = new Date().toISOString();

  // L’index alimente les vues et les rapports ; son échec ne doit pas perdre le fichier,
  // qui est déjà déposé dans la bibliothèque.
  try {
    await getRepository('filesIndex').create({
      FileId: fileId,
      EntityType: entityType || '',
      EntityId: entityId || '',
      Path: serverRelativePath,
      UploadedBy: getCurrentUser().mail || '',
      UploadedAt: uploadedAt
    });
  } catch (error) {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn('[Documents] Indexation impossible (le fichier est déposé) :', error);
    }
  }

  return {
    id: fileId,
    type: 'file',
    name: file.name,
    url: buildDownloadUrl(serverRelativePath),
    path: serverRelativePath,
    size: Number(file.size) || 0,
    mimeType: file.type || '',
    storage: 'sharepoint',
    createdAt: uploadedAt
  };
};

// Point d’entrée unique des pièces jointes. Hors SharePoint on conserve le comportement
// historique (data URL en mémoire) pour que le mode simulé reste utilisable.
export const createAttachmentFromFile = async (file, { entityType, entityId, id } = {}) => {
  const validation = validateFile(file);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  if (!isSharePointMode()) {
    const dataUrl = await readFileAsDataUrl(file);
    if (!dataUrl) {
      throw new Error('Lecture du fichier impossible.');
    }
    return {
      id: id || `file-${Date.now()}`,
      type: 'file',
      name: file.name,
      url: dataUrl,
      size: Number(file.size) || 0,
      mimeType: file.type || '',
      storage: 'inline',
      createdAt: new Date().toISOString()
    };
  }

  const attachment = await uploadDocument(file, { entityType, entityId });
  return id ? { ...attachment, id } : attachment;
};
