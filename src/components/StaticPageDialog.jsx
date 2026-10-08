import React, { useEffect, useRef, useState } from '../react.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { STATIC_PAGE_EVENT } from '../utils/staticPages.js';
import faqHtml from '../pages/faq.html?raw';
import legalHtml from '../pages/mentions-legales.html?raw';

const PAGES = {
  faq: { html: faqHtml, titleKey: 'app.staticPages.faqTitle' },
  'mentions-legales': { html: legalHtml, titleKey: 'app.staticPages.legalTitle' }
};

// Les pages gardent leur propre feuille de style (body, header, main…) : un iframe les isole de
// l'app et de la page SharePoint. Sans allow-scripts ni allow-same-origin, il ne fait qu'afficher.
export const StaticPageDialog = () => {
  const { t } = useTranslation();
  const [pageId, setPageId] = useState(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const handleOpen = (event) => {
      const requested = event?.detail?.pageId;
      if (PAGES[requested]) {
        setPageId(requested);
      }
    };
    window.addEventListener(STATIC_PAGE_EVENT, handleOpen);
    return () => window.removeEventListener(STATIC_PAGE_EVENT, handleOpen);
  }, []);

  useEffect(() => {
    if (!pageId) {
      return undefined;
    }
    closeButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setPageId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pageId]);

  if (!pageId) {
    return null;
  }

  const page = PAGES[pageId];
  const title = t(page.titleKey);

  return (
    <div
      className="fixed inset-0 flex flex-col bg-white"
      style={{ zIndex: 2147483600 }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-static-page={pageId}
    >
      <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-4 py-3">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={() => setPageId(null)}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {t('app.staticPages.close')}
        </button>
      </div>
      <iframe
        title={title}
        srcDoc={page.html}
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        className="w-full flex-1 border-0"
      />
    </div>
  );
};
