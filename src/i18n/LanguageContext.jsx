import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from '../react.js';
import { isSupportedLanguage } from './languages.js';
import { detectBrowserLanguage } from './detectLanguage.js';
import { loadStoredLanguage, storeLanguage } from './languageStorage.js';
import { DICTIONARIES } from './dictionaries/index.js';
import { translate } from './translate.js';

export const LanguageContext = createContext(null);

const resolveInitialLanguage = () => {
  const stored = loadStoredLanguage();
  if (isSupportedLanguage(stored)) {
    return stored;
  }
  return detectBrowserLanguage();
};

export const LanguageProvider = ({ children, initialLanguage }) => {
  const [language, setLanguageState] = useState(() =>
    isSupportedLanguage(initialLanguage) ? initialLanguage : resolveInitialLanguage()
  );

  useEffect(() => {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((code) => {
    if (!isSupportedLanguage(code)) {
      return;
    }
    storeLanguage(code);
    setLanguageState(code);
  }, []);

  const t = useCallback((key, params) => translate(DICTIONARIES, language, key, params), [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage doit être utilisé à l’intérieur de LanguageProvider.');
  }
  return context;
};

export const useTranslation = () => {
  const { t, language } = useLanguage();
  return { t, language };
};
