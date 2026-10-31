import React from '../react.js';
import { convertThresholdToUnits, getCurrencyTable } from '../utils/currencies.js';
import { getQuestionCurrencyChoices, hasCurrencyChoice, isComparisonOperator } from '../utils/conditionValueUnit.js';
import { getLocaleTag } from '../i18n/languages.js';

const formatAmount = (amount, language) =>
  new Intl.NumberFormat(getLocaleTag(language), { maximumFractionDigits: 2 }).format(amount);

// Devise du seuil d'une condition numérique : la liste vient de la table de devises (pas
// seulement des unités de la question), « Valeur brute » conserve le comparatif historique.
export const ConditionValueUnit = ({ question, operator, value, threshold, language, onChange, t }) => {
  if (!hasCurrencyChoice(question, language) || !isComparisonOperator(operator)) {
    return null;
  }

  const tableUnits = getCurrencyTable().map((entry) => entry.unit);
  const options = value && !tableUnits.includes(value) ? [value, ...tableUnits] : tableUnits;
  const equivalents = value
    ? convertThresholdToUnits(threshold, value, getQuestionCurrencyChoices(question, language))
    : [];

  return (
    <div className="mt-2">
      <label className="mb-1 block text-xs font-medium text-gray-600">
        {t('backOffice.main.currencies.thresholdUnit')}
      </label>
      <select
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        aria-label={t('backOffice.main.currencies.thresholdUnit')}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
      >
        <option value="">{t('backOffice.main.currencies.rawOption')}</option>
        {options.map((unit) => (
          <option key={unit} value={unit}>{unit}</option>
        ))}
      </select>
      {equivalents.length > 0 && (
        <p className="mt-1 text-xs text-gray-500">
          {'≈ '}{equivalents.map((entry) => `${formatAmount(entry.amount, language)} ${entry.unit}`).join(' · ')}
        </p>
      )}
    </div>
  );
};

export default ConditionValueUnit;
