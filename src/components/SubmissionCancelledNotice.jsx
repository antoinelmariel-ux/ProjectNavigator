import React from '../react.js';
import { XCircle } from './icons.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { stripRichTextToPlainText } from '../utils/richText.js';

// Ce que voit quelqu'un qui suit un lien issu d'un e-mail de notification envoyé avant
// l'annulation de la soumission : une annonce, jamais le projet lui-même (ni synthèse, ni
// vitrine) — cf. la redirection dans App.jsx quand le projet ciblé est passé au statut
// `cancelled`.
export const SubmissionCancelledNotice = ({ projectName = '', onBackToHome }) => {
  const { t } = useTranslation();
  const displayName = stripRichTextToPlainText(projectName).trim();

  const handleBackToHome = () => {
    if (typeof onBackToHome === 'function') {
      onBackToHome();
    }
  };

  return (
    <div className="py-10 px-4 sm:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6 text-center">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <XCircle className="w-7 h-7" aria-hidden="true" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {t('submissionCancelledNotice.title')}
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              {displayName.length > 0
                ? t('submissionCancelledNotice.descriptionWithName', { name: displayName })
                : t('submissionCancelledNotice.description')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleBackToHome}
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all"
          >
            {t('submissionCancelledNotice.backToHome')}
          </button>
        </div>
      </div>
    </div>
  );
};
