import React, { useEffect, useRef, useState } from '../react.js';
import { Clipboard, Settings, Eye, Search } from './icons.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { resolveLocalizedText, getLocalizedRaw, setLocalizedText } from '../utils/localizedContent.js';
import { LanguageEditSwitcher } from './LocalizedFieldEditor.jsx';

const inputClassName = 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent';

const getFilterTypeForField = (field) =>
  field && (field.type === 'select' || field.type === 'multi_select') ? 'select' : 'text';

export const InspirationFilterEditor = ({
  mode = 'edit',
  filter,
  sourceOptions = [],
  formFields = [],
  initialLanguage,
  onSave,
  onCancel
}) => {
  const { t, language } = useTranslation();
  const overlayRef = useRef(null);
  const titleRef = useRef(null);
  const isCreation = mode === 'create';
  const [editingLanguage, setEditingLanguage] = useState(initialLanguage || language);
  const [sourceId, setSourceId] = useState(isCreation ? '' : filter?.sourceQuestionId || filter?.id || '');
  const [label, setLabel] = useState(filter?.label ?? '');
  const [isLabelTouched, setIsLabelTouched] = useState(!isCreation);
  const [emptyOptionLabel, setEmptyOptionLabel] = useState(filter?.emptyOptionLabel ?? '');
  const [enabled, setEnabled] = useState(filter?.enabled !== false);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.scrollTo({ top: 0 });
    }
    if (titleRef.current) {
      titleRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const sourceField = formFields.find((field) => field && field.id === sourceId) || null;
  const type = isCreation ? getFilterTypeForField(sourceField) : filter?.type || 'text';
  const resolvedLabel = resolveLocalizedText(label, editingLanguage) || resolveLocalizedText(label, language);
  const sourceFieldLabel = sourceField ? resolveLocalizedText(sourceField.label, editingLanguage) || sourceField.id : sourceId;
  const options = Array.isArray(sourceField?.options) ? sourceField.options : (Array.isArray(filter?.options) ? filter.options : []);

  const errors = {
    source: isCreation && !sourceField ? t('backOffice.inspirationFilterEditor.sourceRequiredError') : '',
    label: resolvedLabel.trim().length === 0 ? t('backOffice.inspirationFieldEditor.labelRequiredError') : ''
  };
  const hasErrors = Boolean(errors.source || errors.label);

  const handleSourceChange = (nextId) => {
    setSourceId(nextId);
    if (!isLabelTouched) {
      const nextField = formFields.find((field) => field && field.id === nextId);
      setLabel(nextField ? nextField.label : '');
    }
  };

  const handleSave = () => {
    if (hasErrors) {
      setShowErrors(true);
      return;
    }

    const nextFilter = {
      ...(isCreation ? {} : filter),
      label,
      type,
      enabled,
      sourceQuestionId: sourceId
    };

    if (type === 'select') {
      nextFilter.emptyOptionLabel = resolveLocalizedText(emptyOptionLabel, language).trim().length > 0
        ? emptyOptionLabel
        : t('backOffice.main.allValuesDefault');
    }

    onSave(nextFilter);
  };

  const dialogTitleId = 'inspiration-filter-editor-title';
  const previewEmptyLabel = resolveLocalizedText(emptyOptionLabel, editingLanguage) || t('backOffice.main.allValuesDefault');

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto"
      role="presentation"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-4 sm:my-8 overflow-y-auto hv-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
      >
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-6 rounded-t-2xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
            <h2
              id={dialogTitleId}
              ref={titleRef}
              tabIndex={-1}
              className="text-3xl font-bold text-gray-800 focus:outline-none"
            >
              {isCreation
                ? t('backOffice.inspirationFilterEditor.createTitle')
                : t('backOffice.inspirationFilterEditor.editTitle')}
            </h2>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition-all"
              >
                {t('backOffice.ruleEditor.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
              >
                {t('backOffice.ruleEditor.save')}
              </button>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-8">
          <LanguageEditSwitcher
            editingLanguage={editingLanguage}
            onChange={setEditingLanguage}
            label={t('backOffice.main.inspirationEditingLanguageLabel')}
            hint={t('backOffice.inspirationFilterEditor.editingLanguageHint')}
          />

          {showErrors && hasErrors && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {t('backOffice.inspirationFieldEditor.fixErrorsMessage')}
            </div>
          )}

          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Clipboard className="w-5 h-5 text-blue-500" />
              {t('backOffice.ruleEditor.generalInfoHeading')}
            </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="inspiration-filter-editor-source" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('backOffice.inspirationFilterEditor.sourceLabel')}
                </label>
                {isCreation ? (
                  <>
                    <select
                      id="inspiration-filter-editor-source"
                      value={sourceId}
                      onChange={(event) => handleSourceChange(event.target.value)}
                      className={inputClassName}
                      aria-invalid={showErrors && Boolean(errors.source)}
                    >
                      <option value="">{t('backOffice.main.selectFieldPlaceholder')}</option>
                      {sourceOptions.map((option) => (
                        <option key={option.value} value={option.value} disabled={option.disabled}>
                          {option.label}{option.disabled ? t('backOffice.main.alreadyUsedSuffix') : ''}
                        </option>
                      ))}
                    </select>
                    <p className={`mt-1 text-xs ${showErrors && errors.source ? 'text-red-600' : 'text-gray-500'}`}>
                      {showErrors && errors.source ? errors.source : t('backOffice.main.inspirationFilterableFieldsHint')}
                    </p>
                  </>
                ) : (
                  <>
                    <input
                      id="inspiration-filter-editor-source"
                      type="text"
                      value={sourceFieldLabel ? `${sourceFieldLabel} (${sourceId})` : sourceId}
                      readOnly
                      className={`${inputClassName} bg-gray-50 text-gray-600`}
                    />
                    <p className="mt-1 text-xs text-gray-500">{t('backOffice.inspirationFilterEditor.sourceLockedHint')}</p>
                  </>
                )}
              </div>
              <div>
                <label htmlFor="inspiration-filter-editor-label" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('backOffice.main.displayedLabelLabel')}
                </label>
                <input
                  id="inspiration-filter-editor-label"
                  type="text"
                  value={getLocalizedRaw(label, editingLanguage)}
                  onChange={(event) => {
                    setIsLabelTouched(true);
                    setLabel((prev) => setLocalizedText(prev, editingLanguage, event.target.value));
                  }}
                  className={inputClassName}
                  aria-invalid={showErrors && Boolean(errors.label)}
                />
                <p className={`mt-1 text-xs ${showErrors && errors.label ? 'text-red-600' : 'text-gray-500'}`}>
                  {showErrors && errors.label ? errors.label : t('backOffice.main.inspirationFilterLabelHint')}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-500" />
              {t('backOffice.main.behaviorLabel')}
            </h3>
            <div className="space-y-4">
              {type === 'select' ? (
                <div>
                  <label htmlFor="inspiration-filter-editor-empty-option" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('backOffice.main.allOptionLabelLabel')}
                  </label>
                  <input
                    id="inspiration-filter-editor-empty-option"
                    type="text"
                    value={getLocalizedRaw(emptyOptionLabel, editingLanguage)}
                    onChange={(event) => setEmptyOptionLabel((prev) => setLocalizedText(prev, editingLanguage, event.target.value))}
                    className={inputClassName}
                    placeholder={t('backOffice.main.allValuesDefault')}
                  />
                  <p className="mt-1 text-xs text-gray-500">{t('backOffice.main.allValuesHint')}</p>
                </div>
              ) : (
                <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                  {sourceField || !isCreation
                    ? t('backOffice.main.inspirationFullTextSearchHint')
                    : t('backOffice.inspirationFilterEditor.chooseSourceFirst')}
                </p>
              )}
              {type === 'select' && (
                <p className="text-xs text-gray-500">{t('backOffice.inspirationFilterEditor.optionsFromFieldHint')}</p>
              )}
              <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(event) => setEnabled(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-gray-800">{t('backOffice.inspirationFilterEditor.enabledLabel')}</span>
                  <span className="block text-xs text-gray-500">{t('backOffice.inspirationFilterEditor.enabledHint')}</span>
                </span>
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" />
              {t('backOffice.inspirationFieldEditor.previewHeading')}
            </h3>
            <div className={`rounded-xl border border-gray-200 bg-gray-50 p-5 ${enabled ? '' : 'opacity-60'}`}>
              <p className="mb-2 text-sm font-medium text-gray-700">
                {resolvedLabel || t('backOffice.inspirationFilterEditor.previewLabelFallback')}
              </p>
              {type === 'select' ? (
                <select disabled className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                  <option>{previewEmptyLabel}</option>
                  {options.map((option) => (
                    <option key={option.value}>{resolveLocalizedText(option.label, editingLanguage) || option.value}</option>
                  ))}
                </select>
              ) : (
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                    <Search className="h-4 w-4 text-gray-400" />
                  </span>
                  <input type="text" disabled className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm" />
                </div>
              )}
              {type === 'select' && options.length > 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  {t('backOffice.inspirationFields.optionCountTemplate', { count: options.length })}
                </p>
              )}
              {!enabled && (
                <p className="mt-3 text-xs italic text-gray-500">{t('backOffice.inspirationFilterEditor.previewDisabledNote')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
