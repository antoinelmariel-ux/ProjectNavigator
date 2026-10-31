import React, { useEffect, useMemo, useRef, useState } from '../react.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { STATIC_PAGE_EVENT } from '../utils/staticPages.js';
import { buildFaqPageHtml } from '../utils/faqEntries.js';
import { sanitizeRichText } from '../utils/richText.js';
import { buildHelpManualViewerSrc, getVisibleHelpManuals } from '../utils/helpManuals.js';
import { getOrigin, getWebUrl, isSharePointMode } from '../config/sharepointConfig.js';
import faqHtml from '../pages/faq.html?raw';
import legalHtml from '../pages/mentions-legales.html?raw';

const PAGES = {
  faq: { html: faqHtml, titleKey: 'app.staticPages.faqTitle' },
  'mentions-legales': { html: legalHtml, titleKey: 'app.staticPages.legalTitle' }
};

// Les pages gardent leur propre feuille de style (body, header, main…) : un iframe les isole de
// l'app et de la page SharePoint. Sans allow-scripts ni allow-same-origin, il ne fait qu'afficher.
// La FAQ vient de la liste éditée dans le back-office ; tant qu'elle n'a aucune entrée publiée,
// le faq.html embarqué (page « en construction ») sert de repli.
export const StaticPageDialog = ({ faqEntries = [], helpManuals = null, isExpert = false }) => {
  const { t, language } = useTranslation();
  const [pageId, setPageId] = useState(null);
  const [manualId, setManualId] = useState(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const handleOpen = (event) => {
      const requested = event?.detail?.pageId;
      if (PAGES[requested]) {
        setManualId(null);
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
        setManualId(null);
        setPageId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pageId]);

  const dynamicFaqHtml = useMemo(
    () =>
      buildFaqPageHtml(
        faqEntries,
        language,
        { heading: t('app.staticPages.faqHeading'), intro: t('app.staticPages.faqIntro') },
        sanitizeRichText
      ),
    [faqEntries, language, t]
  );

  const visibleManuals = useMemo(
    () => getVisibleHelpManuals(helpManuals, language, { isExpert }),
    [helpManuals, language, isExpert]
  );

  if (!pageId) {
    return null;
  }

  const page = PAGES[pageId];
  const activeManual = pageId === 'faq' ? visibleManuals.find((manual) => manual.id === manualId) : null;
  const getManualLabel = (manual) => manual.name || t(`app.staticPages.manuals.${manual.id}`);
  const manualLabel = activeManual ? getManualLabel(activeManual) : '';
  const manualSrc = activeManual
    ? buildHelpManualViewerSrc(activeManual.url, {
      origin: getOrigin(),
      webUrl: getWebUrl(),
      isSharePoint: isSharePointMode()
    })
    : '';
  const title = activeManual ? manualLabel : t(page.titleKey);

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
          onClick={() => {
            setManualId(null);
            setPageId(null);
          }}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {t('app.staticPages.close')}
        </button>
      </div>
      {pageId === 'faq' && visibleManuals.length > 0 && (
        <nav
          className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2"
          aria-label={t('app.staticPages.manualsNavLabel')}
        >
          {activeManual ? (
            <button
              type="button"
              onClick={() => setManualId(null)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {t('app.staticPages.backToHelp')}
            </button>
          ) : (
            <>
              <span className="text-sm font-medium text-gray-700">{t('app.staticPages.manualsHeading')}</span>
              {visibleManuals.map((manual) => (
                <button
                  key={manual.id}
                  type="button"
                  data-help-manual={manual.id}
                  onClick={() => setManualId(manual.id)}
                  className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
                >
                  {getManualLabel(manual)}
                </button>
              ))}
            </>
          )}
        </nav>
      )}
      {activeManual && manualSrc ? (
        <iframe
          key={manualSrc}
          title={manualLabel}
          src={manualSrc}
          data-help-manual-viewer={activeManual.id}
          sandbox="allow-scripts allow-same-origin allow-popups"
          referrerPolicy="no-referrer"
          className="w-full flex-1 border-0"
        />
      ) : activeManual ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center" data-help-manual-fallback>
          <p className="max-w-md text-sm text-gray-600">{t('app.staticPages.manualNoViewer')}</p>
          <a
            href={activeManual.url}
            target="_blank"
            rel="noopener noreferrer"
            data-interception="off"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {t('app.staticPages.manualOpenExternal')}
          </a>
        </div>
      ) : (
        <iframe
          title={title}
          srcDoc={pageId === 'faq' && dynamicFaqHtml ? dynamicFaqHtml : page.html}
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          className="w-full flex-1 border-0"
        />
      )}
    </div>
  );
};
