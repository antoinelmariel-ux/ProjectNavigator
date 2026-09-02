import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_FILE_SIZE_BYTES,
  buildDocumentRelativePath,
  buildDownloadUrl,
  createAttachmentFromFile,
  formatFileSize,
  getFileExtension,
  sanitizeFileName,
  uploadDocument,
  validateFile
} from '../src/utils/documentStore.js';
import { resetSpRestClient } from '../src/utils/spRestClient.js';

const makeResponse = (status, body, headers = {}) => {
  const normalized = { 'content-type': 'application/json;odata=nometadata' };
  Object.entries(headers).forEach(([key, value]) => {
    normalized[key.toLowerCase()] = value;
  });
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name) => {
        const key = String(name).toLowerCase();
        return key in normalized ? normalized[key] : null;
      }
    },
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body ?? ''))
  };
};

class FakeFileReader {
  readAsArrayBuffer(file) {
    this.result = file.buffer;
    setTimeout(() => this.onload(), 0);
  }
  readAsDataURL(file) {
    this.result = `data:${file.type};base64,QUJD`;
    setTimeout(() => this.onload(), 0);
  }
}

const fakeFile = (name, size, type = 'application/pdf') => ({
  name,
  size,
  type,
  buffer: new ArrayBuffer(8)
});

const withEnvironment = async ({ sharePoint }, fn) => {
  const previousWindow = globalThis.window;
  const previousReader = globalThis.FileReader;
  const calls = [];

  globalThis.FileReader = FakeFileReader;
  globalThis.window = {
    location: sharePoint
      ? {
        origin: 'https://lfb1.sharepoint.com',
        pathname: '/sites/ProjectNavigator_DEV/CN-App/index.aspx',
        protocol: 'https:',
        hostname: 'lfb1.sharepoint.com'
      }
      : { origin: 'http://localhost:8765', pathname: '/index.html', protocol: 'http:', hostname: 'localhost' },
    fetch: async (url, init = {}) => {
      calls.push({ url, init });
      if (url.endsWith('/_api/contextinfo')) {
        return makeResponse(200, { FormDigestValue: 'D', FormDigestTimeoutSeconds: 1800 });
      }
      if (init.method === 'GET' && url.includes('GetFolderByServerRelativeUrl')) {
        return makeResponse(404, { error: { message: 'Folder Not Found.' } });
      }
      return makeResponse(200, { Id: 3 });
    }
  };

  resetSpRestClient();
  try {
    return await fn(calls);
  } finally {
    globalThis.window = previousWindow;
    globalThis.FileReader = previousReader;
    resetSpRestClient();
  }
};

test('sanitizeFileName : neutralise les caractères refusés par SharePoint', () => {
  assert.equal(sanitizeFileName('rapport: final/v2*.pdf'), 'rapport- final-v2-.pdf');
  assert.equal(sanitizeFileName('...caché...'), 'caché');
  assert.equal(sanitizeFileName('   '), 'document');
  assert.equal(sanitizeFileName('a'.repeat(200)).length, 120);
});

test('getFileExtension : extension en minuscules, vide si absente', () => {
  assert.equal(getFileExtension('Rapport.PDF'), 'pdf');
  assert.equal(getFileExtension('archive.tar.gz'), 'gz');
  assert.equal(getFileExtension('sans-extension'), '');
});

test('formatFileSize : lisible par un humain', () => {
  assert.equal(formatFileSize(512), '512 o');
  assert.equal(formatFileSize(2048), '2 Ko');
  assert.equal(formatFileSize(3 * 1024 * 1024), '3 Mo');
  assert.equal(formatFileSize(3.5 * 1024 * 1024), '3,5 Mo');
});

test('validateFile : accepte un document bureautique de taille normale', () => {
  assert.deepEqual(validateFile(fakeFile('note.docx', 250000)), { ok: true, message: '' });
});

test('validateFile : refuse au-delà de la taille maximale, avec un message chiffré', () => {
  const result = validateFile(fakeFile('gros.pdf', MAX_FILE_SIZE_BYTES + 1));
  assert.equal(result.ok, false);
  assert.match(result.message, /trop volumineux/);
  assert.match(result.message, /10 Mo/);
});

test('validateFile : refuse une extension non autorisée et l’explique', () => {
  const result = validateFile(fakeFile('virus.exe', 1000));
  assert.equal(result.ok, false);
  assert.match(result.message, /« \.exe » ne sont pas autorisés/);
});

test('validateFile : refuse un fichier sans extension', () => {
  assert.equal(validateFile(fakeFile('sansextension', 1000)).ok, false);
});

test('buildDocumentRelativePath : range par entité et préfixe l’unicité', () => {
  assert.equal(
    buildDocumentRelativePath({
      entityType: 'showcase',
      entityId: 'p-1',
      fileName: 'note finale.pdf',
      uniqueSuffix: '1700000000000'
    }),
    'showcase/p-1/1700000000000-note finale.pdf'
  );
  assert.equal(
    buildDocumentRelativePath({ fileName: 'x.pdf' }),
    'divers/sans-identifiant/x.pdf'
  );
});

test('buildDownloadUrl : échappe les apostrophes du chemin', () => {
  assert.equal(
    buildDownloadUrl("/sites/X/CN-Documents/a/b/d'essai.pdf"),
    "/_api/web/GetFileByServerRelativeUrl('/sites/X/CN-Documents/a/b/d''essai.pdf')/$value"
  );
});

test('uploadDocument : crée les dossiers, dépose le fichier et l’indexe', async () => {
  await withEnvironment({ sharePoint: true }, async (calls) => {
    const attachment = await uploadDocument(fakeFile('Compte rendu.pdf', 1024), {
      entityType: 'showcase',
      entityId: 'p-7'
    });

    const folderCreations = calls.filter((call) => call.url.endsWith('/_api/web/folders'));
    assert.equal(folderCreations.length, 2, 'les deux niveaux de dossier doivent être créés');
    assert.ok(
      JSON.parse(folderCreations[0].init.body).ServerRelativeUrl.endsWith('/CN-Documents/showcase')
    );
    assert.ok(
      JSON.parse(folderCreations[1].init.body).ServerRelativeUrl.endsWith('/CN-Documents/showcase/p-7')
    );

    const upload = calls.find((call) => call.url.includes('Files/add'));
    assert.ok(upload, 'le fichier doit être déposé via Files/add');
    assert.equal(upload.init.headers['Content-Type'], 'application/pdf');
    assert.ok(upload.url.includes('Compte rendu.pdf'));

    const index = calls.find((call) => call.url.includes("getbytitle('CN_FilesIndex')"));
    assert.ok(index, 'le dépôt doit être indexé dans CN_FilesIndex');
    const indexed = JSON.parse(index.init.body);
    assert.equal(indexed.EntityType, 'showcase');
    assert.equal(indexed.EntityId, 'p-7');
    assert.ok(indexed.Path.includes('/CN-Documents/showcase/p-7/'));

    assert.equal(attachment.type, 'file');
    assert.equal(attachment.storage, 'sharepoint');
    assert.equal(attachment.name, 'Compte rendu.pdf');
    assert.ok(attachment.url.includes('GetFileByServerRelativeUrl'));
    assert.ok(attachment.path.includes('/CN-Documents/showcase/p-7/'));
  });
});

test('createAttachmentFromFile : hors SharePoint, retombe sur une data URL', async () => {
  await withEnvironment({ sharePoint: false }, async (calls) => {
    const attachment = await createAttachmentFromFile(fakeFile('note.pdf', 500), {
      entityType: 'showcase',
      entityId: 'p-1',
      id: 'fixe-1'
    });

    assert.equal(calls.length, 0, 'aucun appel réseau en mode simulé');
    assert.equal(attachment.id, 'fixe-1');
    assert.equal(attachment.storage, 'inline');
    assert.ok(attachment.url.startsWith('data:application/pdf;base64,'));
  });
});

test('createAttachmentFromFile : un fichier refusé lève une erreur explicite', async () => {
  await withEnvironment({ sharePoint: true }, async (calls) => {
    await assert.rejects(
      () => createAttachmentFromFile(fakeFile('script.exe', 100), { entityType: 'showcase' }),
      /ne sont pas autorisés/
    );
    assert.equal(calls.length, 0, 'un fichier refusé ne doit générer aucun appel');
  });
});

test('uploadDocument : un échec d’indexation ne perd pas le fichier déposé', async () => {
  const previousWarn = console.warn;
  console.warn = () => {};
  try {
    const previousWindow = globalThis.window;
    const previousReader = globalThis.FileReader;
    globalThis.FileReader = FakeFileReader;
    globalThis.window = {
      location: {
        origin: 'https://lfb1.sharepoint.com',
        pathname: '/sites/ProjectNavigator_DEV/CN-App/index.aspx',
        protocol: 'https:',
        hostname: 'lfb1.sharepoint.com'
      },
      fetch: async (url, init = {}) => {
        if (url.endsWith('/_api/contextinfo')) {
          return makeResponse(200, { FormDigestValue: 'D', FormDigestTimeoutSeconds: 1800 });
        }
        if (url.includes("getbytitle('CN_FilesIndex')")) {
          return makeResponse(500, { error: { message: 'Index indisponible' } });
        }
        if (init.method === 'GET') {
          return makeResponse(404, { error: { message: 'Not Found.' } });
        }
        return makeResponse(200, { Id: 1 });
      }
    };
    resetSpRestClient();
    try {
      const attachment = await uploadDocument(fakeFile('note.pdf', 100), {
        entityType: 'showcase',
        entityId: 'p-1'
      });
      assert.equal(attachment.storage, 'sharepoint');
      assert.ok(attachment.path.endsWith('note.pdf'));
    } finally {
      globalThis.window = previousWindow;
      globalThis.FileReader = previousReader;
      resetSpRestClient();
    }
  } finally {
    console.warn = previousWarn;
  }
});
