import React from '../react.js';
import { Plus, Trash2 } from './icons.js';
import { findUnitsWithoutRate, getUnitPivotValue, normalizeCurrencyEntry } from '../utils/currencies.js';

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500';

const todayIso = () => new Date().toISOString().slice(0, 10);

export const BackOfficeCurrencies = ({
  currencies = [],
  setCurrencies,
  questions = [],
  publishControl = null,
  t
}) => {
  const rows = Array.isArray(currencies) ? currencies : [];
  const unitsWithoutRate = findUnitsWithoutRate(questions, rows);

  const updateRow = (index, patch) => {
    setCurrencies((previous) => {
      const list = Array.isArray(previous) ? [...previous] : [];
      list[index] = { ...list[index], ...patch };
      return list;
    });
  };

  const addRow = () => {
    setCurrencies((previous) => [
      ...(Array.isArray(previous) ? previous : []),
      { unit: '', code: '', multiplier: 1, rate: null, updatedAt: '' }
    ]);
  };

  const removeRow = (index) => {
    setCurrencies((previous) => (Array.isArray(previous) ? previous.filter((_, i) => i !== index) : []));
  };

  const parseNumberField = (value) => (value === '' ? null : Number(value));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <h2 className="mb-1 text-base font-semibold">{t('backOffice.main.currencies.title')}</h2>
        <p>{t('backOffice.main.currencies.intro')}</p>
      </div>

      {publishControl}

      {unitsWithoutRate.length > 0 && (
        <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {t('backOffice.main.currencies.unitsWithoutRate', { units: unitsWithoutRate.join(', ') })}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">
          {t('backOffice.main.currencies.empty')}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm" data-testid="currencies-table">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-3 py-2">{t('backOffice.main.currencies.unit')}</th>
                <th className="px-3 py-2">{t('backOffice.main.currencies.code')}</th>
                <th className="px-3 py-2">{t('backOffice.main.currencies.multiplier')}</th>
                <th className="px-3 py-2">{t('backOffice.main.currencies.rate')}</th>
                <th className="px-3 py-2">{t('backOffice.main.currencies.updatedAt')}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const hasRate = getUnitPivotValue(normalizeCurrencyEntry(row) || {}) !== null;
                return (
                  <tr key={`currency-${index}`} className="border-t border-gray-100" data-currency-unit={row.unit}>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        className={inputClass}
                        value={row.unit ?? ''}
                        aria-label={t('backOffice.main.currencies.unit')}
                        onChange={(event) => updateRow(index, { unit: event.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        className={inputClass}
                        value={row.code ?? ''}
                        aria-label={t('backOffice.main.currencies.code')}
                        onChange={(event) => updateRow(index, { code: event.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className={inputClass}
                        value={row.multiplier ?? ''}
                        aria-label={t('backOffice.main.currencies.multiplier')}
                        onChange={(event) => updateRow(index, { multiplier: parseNumberField(event.target.value) })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className={`${inputClass} ${hasRate ? '' : 'border-amber-400 bg-amber-50'}`}
                        value={row.rate ?? ''}
                        aria-label={t('backOffice.main.currencies.rate')}
                        placeholder={t('backOffice.main.currencies.noRate')}
                        title={hasRate ? undefined : t('backOffice.main.currencies.missingRate')}
                        onChange={(event) => updateRow(index, {
                          rate: parseNumberField(event.target.value),
                          updatedAt: todayIso()
                        })}
                      />
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">{row.updatedAt || ''}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="rounded p-2 text-red-600 hover:bg-red-50"
                        aria-label={t('backOffice.main.currencies.remove')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        <Plus className="h-4 w-4" />
        {t('backOffice.main.currencies.add')}
      </button>
    </div>
  );
};

export default BackOfficeCurrencies;
