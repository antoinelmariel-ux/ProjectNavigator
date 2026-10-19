import React, { useEffect, useMemo, useRef, useState } from '../react.js';
import {
  Plus,
  Trash2,
  Clipboard,
  ArrowUp,
  ArrowDown,
  Settings,
  Eye,
  LayoutList,
  Info
} from './icons.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { resolveLocalizedText, getLocalizedRaw, setLocalizedText } from '../utils/localizedContent.js';
import {
  finalizeInspirationFormFieldOptions,
  sanitizeInspirationFormFieldId
} from '../utils/inspirationConfig.js';
import { LanguageEditSwitcher } from './LocalizedFieldEditor.jsx';

const OPTION_TYPES = new Set(['select', 'multi_select']);
const PLACEHOLDER_TYPES = new Set(['text', 'long_text', 'select', 'url']);

const inputClassName = 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent';

let optionRowCounter = 0;
const nextOptionRowKey = () => {
  optionRowCounter += 1;
  return `option-row-${optionRowCounter}`;
};

const toOptionRows = (options) =>
  (Array.isArray(options) ? options : []).map((option) => ({
    key: nextOptionRowKey(),
    value: typeof option?.value === 'string' ? option.value : '',
    label: option?.label ?? ''
  }));

export const InspirationFieldEditor = ({
  mode = 'edit',
  field,
  typeOptions,
  existingIds,
  isBuiltIn = false,
  linkedFilterLabels = [],
  initialLanguage,
  onSave,
  onCancel
}) => {
  const { t, language } = useTranslation();
  const overlayRef = useRef(null);
  const titleRef = useRef(null);
  const isCreation = mode === 'create';
  const [editingLanguage, setEditingLanguage] = useState(initialLanguage || language);
  const [label, setLabel] = useState(field?.label ?? '');
  const [fieldId, setFieldId] = useState(isCreation ? '' : field?.id || '');
  const [type, setType] = useState(field?.type || 'text');
  const [placeholder, setPlaceholder] = useState(typeof field?.placeholder === 'string' ? field.placeholder : '');
  const [required, setRequired] = useState(Boolean(field?.required));
  const [enabled, setEnabled] = useState(field?.enabled !== false);
  const [optionRows, setOptionRows] = useState(() => toOptionRows(field?.options));
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

  useEffect(() => {
    if (OPTION_TYPES.has(type) && optionRows.length === 0) {
      setOptionRows([{ key: nextOptionRowKey(), value: '', label: '' }]);
    }
  }, [type, optionRows.length]);

  const resolvedLabel = resolveLocalizedText(label, editingLanguage) || resolveLocalizedText(label, language);
  const effectiveId = isCreation
    ? sanitizeInspirationFormFieldId(fieldId) || sanitizeInspirationFormFieldId(resolvedLabel)
    : field?.id || '';
  const isIdDuplicate = isCreation && effectiveId.length > 0 && existingIds instanceof Set && existingIds.has(effectiveId);
  const hasOptions = OPTION_TYPES.has(type);
  const finalizedOptions = useMemo(
    () => (hasOptions ? finalizeInspirationFormFieldOptions(optionRows) : []),
    [hasOptions, optionRows]
  );

  const errors = {
    label: resolvedLabel.trim().length === 0 ? t('backOffice.inspirationFieldEditor.labelRequiredError') : '',
    id: !effectiveId
      ? t('backOffice.inspirationFieldEditor.idRequiredError')
      : isIdDuplicate
        ? t('backOffice.main.duplicateIdError')
        : '',
    options: hasOptions && finalizedOptions.length === 0 ? t('backOffice.inspirationFieldEditor.optionsRequiredError') : ''
  };
  const hasErrors = Boolean(errors.label || errors.id || errors.options);

  const handleSave = () => {
    if (hasErrors) {
      setShowErrors(true);
      return;
    }

    const nextField = {
      id: effectiveId,
      label,
      type,
      enabled,
      required
    };

    const trimmedPlaceholder = placeholder.trim();
    if (PLACEHOLDER_TYPES.has(type) && trimmedPlaceholder.length > 0) {
      nextField.placeholder = trimmedPlaceholder;
    }

    if (hasOptions) {
      nextField.options = finalizedOptions;
    }

    onSave(nextField);
  };

  const updateOptionLabel = (key, text) => {
    setOptionRows((rows) => rows.map((row) => (
      row.key === key ? { ...row, label: setLocalizedText(row.label, editingLanguage, text) } : row
    )));
  };

  const moveOption = (index, delta) => {
    setOptionRows((rows) => {
      const target = index + delta;
      if (target < 0 || target >= rows.length) {
        return rows;
      }
      const next = rows.slice();
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const dialogTitleId = 'inspiration-field-editor-title';
  const previewLabel = resolvedLabel || t('backOffice.inspirationFieldEditor.previewLabelFallback');
  const previewPlaceholder = placeholder.trim();

  const renderPreviewControl = () => {
    if (type === 'long_text') {
      return (
        <textarea
          rows={3}
          disabled
          placeholder={previewPlaceholder}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        />
      );
    }
    if (type === 'select') {
      return (
        <select disabled className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
          <option>{previewPlaceholder || t('backOffice.inspirationFieldEditor.previewSelectFallback')}</option>
        </select>
      );
    }
    if (type === 'multi_select') {
      return (
        <div className="flex flex-wrap gap-2">
          {finalizedOptions.length === 0 ? (
            <span className="text-xs italic text-gray-500">{t('backOffice.inspirationFieldEditor.previewNoOption')}</span>
          ) : (
            finalizedOptions.map((option) => (
              <span key={option.value} className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700">
                {resolveLocalizedText(option.label, editingLanguage) || option.value}
              </span>
            ))
          )}
        </div>
      );
    }
    if (type === 'documents') {
      return (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-4 text-center text-xs text-gray-500">
          {t('backOffice.inspirationFieldEditor.previewDocuments')}
        </div>
      );
    }
    return (
      <input
        type={type === 'url' ? 'url' : 'text'}
        disabled
        placeholder={previewPlaceholder || (type === 'url' ? 'https://' : '')}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
      />
    );
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto"
      role="presentation"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-4 sm:my-8 overflow-y-auto hv-modal-panel"
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
                ? t('backOffice.inspirationFieldEditor.createTitle')
                : t('backOffice.inspirationFieldEditor.editTitle')}
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
            hint={t('backOffice.inspirationFieldEditor.editingLanguageHint')}
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label htmlFor="inspiration-field-editor-label" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('backOffice.main.fieldLabelLabel')}
                </label>
                <input
                  id="inspiration-field-editor-label"
                  type="text"
                  value={getLocalizedRaw(label, editingLanguage)}
                  onChange={(event) => setLabel((prev) => setLocalizedText(prev, editingLanguage, event.target.value))}
                  className={inputClassName}
                  placeholder={t('backOffice.main.fieldLabelPlaceholderExample')}
                  aria-invalid={showErrors && Boolean(errors.label)}
                />
                {showErrors && errors.label && <p className="mt-1 text-xs text-red-600">{errors.label}</p>}
              </div>
              <div>
                <label htmlFor="inspiration-field-editor-type" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('backOffice.main.fieldTypeLabel')}
                </label>
                <select
                  id="inspiration-field-editor-type"
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  className={inputClassName}
                >
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {!isCreation && linkedFilterLabels.length > 0 && type !== field?.type && (
                  <p className="mt-1 text-xs text-amber-700">
                    {t('backOffice.inspirationFieldEditor.typeChangeFilterWarning')}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="inspiration-field-editor-id" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('backOffice.main.technicalIdLabel')}
                </label>
                {isCreation ? (
                  <>
                    <input
                      id="inspiration-field-editor-id"
                      type="text"
                      value={fieldId}
                      onChange={(event) => setFieldId(event.target.value)}
                      className={inputClassName}
                      placeholder={effectiveId || t('backOffice.main.fieldIdPlaceholderExample')}
                      aria-invalid={showErrors && Boolean(errors.id)}
                    />
                    <p className={`mt-1 text-xs ${isIdDuplicate || (showErrors && errors.id) ? 'text-red-600' : 'text-gray-500'}`}>
                      {isIdDuplicate || (showErrors && errors.id)
                        ? errors.id
                        : effectiveId
                          ? t('backOffice.main.idUsedTemplate', { id: effectiveId })
                          : t('backOffice.main.leaveEmptyToGenerateId')}
                    </p>
                  </>
                ) : (
                  <>
                    <input
                      id="inspiration-field-editor-id"
                      type="text"
                      value={fieldId}
                      readOnly
                      className={`${inputClassName} bg-gray-50 font-mono text-sm text-gray-600`}
                    />
                    <p className="mt-1 text-xs text-gray-500">{t('backOffice.inspirationFieldEditor.idLockedHint')}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {(PLACEHOLDER_TYPES.has(type) || hasOptions) && (
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-1 flex items-center gap-2">
                <LayoutList className="w-5 h-5 text-blue-500" />
                {t('backOffice.inspirationFieldEditor.inputHeading')}
              </h3>
              <p className="text-sm text-gray-600 mb-4">{t('backOffice.inspirationFieldEditor.inputIntro')}</p>
              <div className="space-y-6">
                {PLACEHOLDER_TYPES.has(type) && (
                  <div>
                    <label htmlFor="inspiration-field-editor-placeholder" className="block text-sm font-medium text-gray-700 mb-2">
                      {type === 'select' ? t('backOffice.main.defaultSelectLabelLabel') : t('backOffice.main.placeholderFieldLabel')}
                    </label>
                    <input
                      id="inspiration-field-editor-placeholder"
                      type="text"
                      value={placeholder}
                      onChange={(event) => setPlaceholder(event.target.value)}
                      className={inputClassName}
                      placeholder={type === 'select'
                        ? t('backOffice.main.defaultSelectPlaceholderExample')
                        : t('backOffice.main.placeholderDisplayedText')}
                    />
                    <p className="mt-1 text-xs text-gray-500">{t('backOffice.inspirationFieldEditor.placeholderLanguageHint')}</p>
                  </div>
                )}

                {hasOptions && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="block text-sm font-medium text-gray-700">
                        {t('backOffice.inspirationFieldEditor.optionsHeading')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOptionRows((rows) => [...rows, { key: nextOptionRowKey(), value: '', label: '' }])}
                        className="flex items-center px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all text-sm font-medium"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        {t('backOffice.inspirationFieldEditor.addOption')}
                      </button>
                    </div>
                    {linkedFilterLabels.length > 0 && (
                      <p className="mb-3 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        {t('backOffice.inspirationFieldEditor.optionsSyncedWithFiltersTemplate', { filters: linkedFilterLabels.join(', ') })}
                      </p>
                    )}
                    <ol className="list-none pl-0 space-y-2">
                      {optionRows.map((row, index) => {
                        const optionLabel = getLocalizedRaw(row.label, editingLanguage);
                        const optionInputId = `inspiration-field-editor-option-${row.key}`;
                        return (
                          <li key={row.key} className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                            <span className="mt-2 w-6 text-right text-xs font-semibold text-gray-400">{index + 1}.</span>
                            <div className="flex-1">
                              <label htmlFor={optionInputId} className="sr-only">
                                {t('backOffice.inspirationFieldEditor.optionLabelAriaTemplate', { index: index + 1 })}
                              </label>
                              <input
                                id={optionInputId}
                                type="text"
                                value={optionLabel}
                                onChange={(event) => updateOptionLabel(row.key, event.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={resolveLocalizedText(row.label, language) || t('backOffice.inspirationFieldEditor.optionPlaceholder')}
                              />
                              {row.value && (
                                <p className="mt-1 text-xs text-gray-500">
                                  {t('backOffice.inspirationFieldEditor.storedValueTemplate', { value: row.value })}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveOption(index, -1)}
                                disabled={index === 0}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                                aria-label={t('backOffice.inspirationFieldEditor.moveOptionUpAriaTemplate', { index: index + 1 })}
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveOption(index, 1)}
                                disabled={index === optionRows.length - 1}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                                aria-label={t('backOffice.inspirationFieldEditor.moveOptionDownAriaTemplate', { index: index + 1 })}
                              >
                                <ArrowDown className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setOptionRows((rows) => rows.filter((entry) => entry.key !== row.key))}
                                className="p-2 text-red-600 hover:bg-red-50 rounded"
                                aria-label={t('backOffice.inspirationFieldEditor.removeOptionAriaTemplate', { index: index + 1 })}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                    {showErrors && errors.options && <p className="mt-2 text-xs text-red-600">{errors.options}</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-500" />
              {t('backOffice.main.behaviorLabel')}
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={required}
                  onChange={(event) => setRequired(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-gray-800">{t('backOffice.main.requiredFieldLabel')}</span>
                  <span className="block text-xs text-gray-500">{t('backOffice.inspirationFieldEditor.requiredHint')}</span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(event) => setEnabled(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-gray-800">{t('backOffice.main.activeFieldLabel')}</span>
                  <span className="block text-xs text-gray-500">
                    {isBuiltIn
                      ? t('backOffice.inspirationFieldEditor.enabledBuiltInHint')
                      : t('backOffice.inspirationFieldEditor.enabledHint')}
                  </span>
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
                {previewLabel}
                {required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
              </p>
              {renderPreviewControl()}
              {!enabled && (
                <p className="mt-3 text-xs italic text-gray-500">{t('backOffice.inspirationFieldEditor.previewDisabledNote')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
