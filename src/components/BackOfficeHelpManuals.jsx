import React from '../react.js';
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from '../i18n/languages.js';
import { HELP_MANUAL_IDS, normalizeHelpManualLink, normalizeHelpManuals } from '../utils/helpManuals.js';

// Un lien par langue et par manuel, hébergé sur SharePoint. Enregistré avec les réglages
// généraux (settings.json) : la publication passe par le contrôle de publication des réglages.
export const BackOfficeHelpManuals = ({ manuals, setManuals, t }) => {
  const current = normalizeHelpManuals(manuals);

  const handleChange = (manualId, language, value) => {
    setManuals({
      ...current,
      [manualId]: { ...current[manualId], [language]: value }
    });
  };

  return (
    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm" data-testid="backoffice-help-manuals">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-gray-900">{t('backOffice.helpManuals.title')}</h2>
        <p className="max-w-3xl text-sm text-gray-600">{t('backOffice.helpManuals.description')}</p>
      </div>
      {HELP_MANUAL_IDS.map((manualId) => (
        <fieldset key={manualId} className="space-y-3 rounded-lg border border-gray-200 p-4">
          <legend className="px-1 text-sm font-semibold text-gray-900">
            {t(`backOffice.helpManuals.manuals.${manualId}.label`)}
          </legend>
          <p className="text-xs text-gray-500">{t(`backOffice.helpManuals.manuals.${manualId}.audience`)}</p>
          {SUPPORTED_LANGUAGES.map((language) => {
            const value = current[manualId][language];
            const isInvalid = value !== '' && normalizeHelpManualLink(value) === '';
            const inputId = `help-manual-${manualId}-${language}`;
            return (
              <div key={language} className="space-y-1">
                <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
                  {LANGUAGE_LABELS[language]}
                </label>
                <input
                  id={inputId}
                  type="url"
                  value={value}
                  onChange={(event) => handleChange(manualId, language, event.target.value)}
                  placeholder={t('backOffice.helpManuals.placeholder')}
                  aria-invalid={isInvalid}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                {isInvalid && (
                  <p className="text-xs text-red-600" role="alert">{t('backOffice.helpManuals.invalidLink')}</p>
                )}
              </div>
            );
          })}
        </fieldset>
      ))}
      <p className="text-xs text-gray-500">{t('backOffice.helpManuals.readOnlyNote')}</p>
    </section>
  );
};
