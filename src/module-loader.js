(function (global) {

  const moduleCache = Object.create(null);

  const isAbsoluteUrl = url => /^(?:[a-z]+:)?\/\//i.test(url);

  const getManifest = () => global.__COMPLIANCE_NAVIGATOR_MANIFEST__;

  const isFileProtocol = global.location && global.location.protocol === 'file:';

  const normalizeRelativePath = (value) => {
    if (typeof value !== 'string') {
      return null;
    }

    const withoutBackslashes = value.replace(/\\/g, '/');
    const withoutLeadingSlash = withoutBackslashes.replace(/^\/+/, '');
    const withoutDrivePrefix = withoutLeadingSlash.replace(/^[a-zA-Z]:\//, '');

    return withoutDrivePrefix || null;
  };

  const toRelativeFromRoot = (absoluteUrl) => {
    if (!global.location || !absoluteUrl) {
      return null;
    }

    try {
      const parsedUrl = new URL(absoluteUrl);
      const baseDirectory = decodeURIComponent(new URL('.', global.location.href).pathname || '');
      let relativePath = decodeURIComponent(parsedUrl.pathname || '');

      if (baseDirectory && relativePath.startsWith(baseDirectory)) {
        relativePath = relativePath.slice(baseDirectory.length);
      } else {
        relativePath = relativePath.replace(/^\//, '');
      }

      return normalizeRelativePath(relativePath);
    } catch {
      return null;
    }
  };

  // Le manifest (module-manifest.js) contient tout le code déjà transpilé (build Babel).
  // Il est la source de vérité pour les deux protocoles (file:// et http).
  const fetchFromManifest = (url) => {
    const manifest = getManifest();
    if (!manifest || typeof manifest !== 'object') {
      return null;
    }

    const relativePath = toRelativeFromRoot(url);
    if (!relativePath) {
      return null;
    }

    const normalizedRelativePath = normalizeRelativePath(relativePath);
    if (!normalizedRelativePath) {
      return null;
    }

    const manifestKeys = [
      normalizedRelativePath,
      `./${normalizedRelativePath}`,
      normalizedRelativePath.replace(/^src\//, ''),
      `./${normalizedRelativePath.replace(/^src\//, '')}`
    ];

    for (let index = 0; index < manifestKeys.length; index += 1) {
      const key = manifestKeys[index];
      if (typeof key === 'string' && Object.prototype.hasOwnProperty.call(manifest, key)) {
        return manifest[key];
      }
    }

    return null;
  };

  const fetchSourceFromXhr = (url) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);

    const isSuccessfulStatus = xhr.status >= 200 && xhr.status < 400;
    const canAllowStatusZero = isFileProtocol && xhr.status === 0 && typeof xhr.responseText === 'string';

    if (!isSuccessfulStatus && !canAllowStatusZero) {
      throw new Error(`Impossible de charger le module "${url}" (statut ${xhr.status}).`);
    }

    return xhr.responseText;
  };

  const fetchSourceSync = (url) => {
    // Priorité au manifest (code transpilé, aucun aller-retour réseau).
    const manifestSource = fetchFromManifest(url);
    if (typeof manifestSource === 'string') {
      return manifestSource;
    }

    // Fallback réseau (utile seulement en développement si le manifest n'a pas été régénéré).
    return fetchSourceFromXhr(url);
  };

  const normalizeModuleUrl = (value) => {
    if (typeof value !== 'string') {
      return '';
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }

    return trimmed.split('#')[0].split('?')[0];
  };

  const isJsonModule = (url) => normalizeModuleUrl(url).toLowerCase().endsWith('.json');

  const transformSource = (url, source) => {
    if (isJsonModule(url)) {
      const parsed = JSON.parse(source);
      return `module.exports = ${JSON.stringify(parsed)};`;
    }

    // Le code des modules JS/JSX est déjà transpilé (dans le manifest) : rien à faire.
    return source;
  };

  const normalizeUrl = (specifier, baseUrl) => {
    if (isAbsoluteUrl(specifier)) {
      return specifier;
    }

    const resolvedUrl = new URL(specifier, baseUrl);
    return resolvedUrl.href;
  };

  const loadModule = url => {
    if (moduleCache[url]) {
      return moduleCache[url].exports;
    }

    const source = fetchSourceSync(url);
    const transformed = transformSource(url, source);

    const module = { exports: {} };
    moduleCache[url] = module;

    const dirname = url.slice(0, url.lastIndexOf('/') + 1) || url;

    const localRequire = specifier => {
      const childUrl = normalizeUrl(specifier, dirname);
      return loadModule(childUrl);
    };

    const factory = new Function('require', 'module', 'exports', 'global',
      `${transformed}\n//# sourceURL=${url}`
    );

    try {
      factory(localRequire, module, module.exports, global);
    } catch (error) {
      delete moduleCache[url];
      throw error;
    }

    return module.exports;
  };

  global.ModuleLoader = {
    import(modulePath) {
      const entryUrl = normalizeUrl(modulePath, global.location.href);
      return loadModule(entryUrl);
    }
  };
})(window);
