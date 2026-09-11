import React, { useEffect } from '../react.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { buildExitUrl } from '../utils/impersonation.js';

export const ImpersonationBanner = ({ simulatedEmail, realEmail }) => {
  const { t } = useTranslation();

  // Le titre de l'onglet est le seul repère quand la session réelle et la simulation sont
  // ouvertes côte à côte : sans lui, rien ne distingue les deux onglets dans la barre.
  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const previousTitle = document.title;
    document.title = `${t('app.impersonation.titlePrefix')} ${previousTitle}`;

    return () => {
      document.title = previousTitle;
    };
  }, [t]);

  // L'onglet est ouvert avec `noopener` : il ne peut pas se fermer lui-même, on revient donc
  // à la même page sans le paramètre, ce qui rend l'identité réelle.
  const handleExit = () => {
    if (typeof window === 'undefined' || !window.location) {
      return;
    }
    const exitUrl = buildExitUrl(window.location.href);
    if (exitUrl) {
      window.location.href = exitUrl;
    }
  };

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 w-full border-b border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-900"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="font-semibold">{t('app.impersonation.bannerTitle', { simulated: simulatedEmail })}</span>{' '}
          <span>{t('app.impersonation.bannerBody', { real: realEmail })}</span>
        </div>
        <button
          type="button"
          onClick={handleExit}
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-purple-300 bg-white px-3 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100"
        >
          {t('app.impersonation.exit')}
        </button>
      </div>
    </div>
  );
};
