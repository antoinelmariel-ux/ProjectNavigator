import { DEFAULT_LANGUAGE } from './languages.js';

const getByPath = (dictionary, path) => {
  if (!dictionary) {
    return undefined;
  }
  return path
    .split('.')
    .reduce((value, segment) => (value && typeof value === 'object' ? value[segment] : undefined), dictionary);
};

const interpolate = (template, params) => {
  if (!params) {
    return template;
  }
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  );
};

export const translate = (dictionaries, language, key, params) => {
  const fromActive = getByPath(dictionaries[language], key);
  if (typeof fromActive === 'string') {
    return interpolate(fromActive, params);
  }

  const fromFallback = getByPath(dictionaries[DEFAULT_LANGUAGE], key);
  if (typeof fromFallback === 'string') {
    return interpolate(fromFallback, params);
  }

  return key;
};
