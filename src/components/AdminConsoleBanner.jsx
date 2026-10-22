import React, { useEffect } from '../react.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { buildAdminConsoleExitUrl } from '../utils/adminConsole.js';

export const AdminConsoleBanner = ({ adminEmail }) => {
  const { t } = useTranslation();

  // Comme pour la simulation : l'onglet ordinaire et la console sont ouverts côte à côte, le
  // titre est le seul repère dans la barre d'onglets.
  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const previousTitle = document.title;
    document.title = `${t('app.adminConsole.titlePrefix')} ${previousTitle}`;

    return () => {
      document.title = previousTitle;
    };
  }, [t]);

  const handleExit = () => {
    if (typeof window === 'undefined' || !window.location) {
      return;
    }
    const exitUrl = buildAdminConsoleExitUrl(window.location.href);
    if (exitUrl) {
      window.location.href = exitUrl;
    }
  };

  return (
    <div
      role="status"
      data-testid="admin-console-banner"
      className="sticky top-0 z-50 w-full border-b border-red-300 bg-red-700 px-4 py-3 text-sm text-white"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="font-semibold">{t('app.adminConsole.bannerTitle')}</span>{' '}
          <span>{t('app.adminConsole.bannerBody', { admin: adminEmail })}</span>
        </div>
        <button
          type="button"
          onClick={handleExit}
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-white bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
        >
          {t('app.adminConsole.exit')}
        </button>
      </div>
    </div>
  );
};
