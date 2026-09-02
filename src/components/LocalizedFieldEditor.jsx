import React from '../react.js';
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS } from '../i18n/languages.js';

export const LanguageEditSwitcher = ({ editingLanguage, onChange, label, hint }) => {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">{label}</span>
        <div className="inline-flex rounded-lg border border-blue-200 bg-white p-0.5">
          {SUPPORTED_LANGUAGES.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => onChange(code)}
              aria-pressed={editingLanguage === code}
              className={`px-3 py-1 rounded-md text-xs font-semibold uppercase transition-colors ${
                editingLanguage === code
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-blue-50'
              }`}
            >
              {code}
            </button>
          ))}
        </div>
      </div>
      <span className="text-xs text-blue-800">
        {LANGUAGE_LABELS[editingLanguage] || editingLanguage}
        {hint ? ` — ${hint}` : ''}
      </span>
    </div>
  );
};
