import React from '../react.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { ACTIVITY_SCOPE_VALUES, ACTIVITY_SCOPE_LABELS } from '../utils/activityScope.js';
import { resolveLocalizedText } from '../utils/localizedContent.js';

// Grille de cases à cocher pour le périmètre d'activité, partagée par l'écran d'onboarding
// et la section profil (mêmes valeurs, même rendu, deux points d'entrée différents).
export const ActivityScopeSelector = ({ value = [], onChange }) => {
  const { t, language } = useTranslation();

  const toggleValue = (code) => {
    const next = value.includes(code)
      ? value.filter((entry) => entry !== code)
      : [...value, code];
    onChange(next);
  };

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      role="group"
      aria-label={t('profile.scopeSection.heading')}
    >
      {ACTIVITY_SCOPE_VALUES.map((code) => {
        const checked = value.includes(code);
        const label = resolveLocalizedText(ACTIVITY_SCOPE_LABELS[code], language);
        return (
          <label
            key={code}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium cursor-pointer transition-all ${
              checked
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
              checked={checked}
              onChange={() => toggleValue(code)}
            />
            {label}
          </label>
        );
      })}
    </div>
  );
};
