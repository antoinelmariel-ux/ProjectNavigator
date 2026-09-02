import React, { useEffect, useMemo, useState } from '../react.js';
import { Edit, Close, Download, Link as LinkIcon } from './icons.js';
import { normalizeInspirationFormConfig } from '../utils/inspirationConfig.js';
import { RichTextEditor } from './RichTextEditor.jsx';
import { renderRichText } from '../utils/richText.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';

const formatValue = (value, notProvidedLabel) => {
  if (Array.isArray(value)) {
    const formatted = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .join(', ');
    return formatted.length > 0 ? formatted : notProvidedLabel;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return notProvidedLabel;
};

const normalizeDocuments = (documents) =>
  Array.isArray(documents)
    ? documents
        .map((doc) => ({
          name: typeof doc?.name === 'string' ? doc.name.trim() : '',
          url: typeof doc?.url === 'string' ? doc.url.trim() : ''
        }))
        .filter((doc) => doc.name.length > 0 || doc.url.length > 0)
    : [];

const normalizeMultiSelect = (value) =>
  Array.isArray(value)
    ? value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    : [];

export const InspirationDetail = ({
  project,
  formConfig,
  onBack,
  onUpdate,
  onExport
}) => {
  const { t } = useTranslation();
  const notProvidedLabel = t('inspirationDetail.notProvided');
  const normalizedConfig = useMemo(
    () => normalizeInspirationFormConfig(formConfig),
    [formConfig]
  );
  const [draft, setDraft] = useState(project);
  const [editingFields, setEditingFields] = useState({});

  useEffect(() => {
    setDraft(project);
    setEditingFields({});
  }, [project]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  }, [project?.id]);

  if (!project) {
    return null;
  }

  const enabledFields = normalizedConfig.fields.filter((field) => field.enabled);

  const toggleFieldEditing = (fieldId, isEditing) => {
    setEditingFields((prev) => ({ ...prev, [fieldId]: isEditing }));
  };

  const handleFieldChange = (fieldId, value) => {
    setDraft((prev) => ({ ...prev, [fieldId]: value }));

    if (typeof onUpdate === 'function') {
      const field = enabledFields.find((item) => item.id === fieldId);
      if (!field) {
        return;
      }

      const normalizedValue = field.type === 'documents'
        ? normalizeDocuments(value)
        : field.type === 'multi_select'
          ? normalizeMultiSelect(value)
          : value;

      onUpdate(project.id, {
        [fieldId]: normalizedValue,
        updatedAt: new Date().toISOString()
      });
    }
  };

  const renderField = (field, content) => (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {field.label || field.id}
          </p>
          {content}
        </div>
        <div className="flex flex-wrap gap-2">
          {editingFields[field.id] ? (
            <>
              <button
                type="button"
                onClick={() => toggleFieldEditing(field.id, false)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <Close className="h-4 w-4" aria-hidden="true" />
                {t('inspirationDetail.finish')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(project);
                  toggleFieldEditing(field.id, false);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                <Close className="h-4 w-4" aria-hidden="true" />
                {t('inspirationDetail.cancel')}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => toggleFieldEditing(field.id, true)}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
            >
              <Edit className="h-4 w-4" aria-hidden="true" />
              {t('inspirationDetail.edit')}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const resolvePlaceholder = (field, fallback) => {
    if (typeof field.placeholder === 'string' && field.placeholder.trim() !== '') {
      return field.placeholder.trim();
    }

    return fallback;
  };

  const renderEditableField = (field) => {
    const value = draft?.[field.id] ?? '';

    if (field.type === 'select') {
      const emptyOptionLabel = resolvePlaceholder(field, t('inspirationDetail.selectPlaceholder'));
      return (
        <select
          value={value}
          onChange={(event) => handleFieldChange(field.id, event.target.value)}
          className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">{emptyOptionLabel}</option>
          {(field.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === 'multi_select') {
      const selections = normalizeMultiSelect(value);
      return (
        <select
          multiple
          value={selections}
          onChange={(event) =>
            handleFieldChange(
              field.id,
              Array.from(event.target.selectedOptions).map((option) => option.value)
            )}
          className="mt-2 w-full min-h-[140px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {(field.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === 'long_text') {
      const fallback = field.id === 'review'
        ? t('inspirationDetail.reviewPlaceholder')
        : t('inspirationDetail.descriptionPlaceholder');
      return (
        <div className="mt-2">
          <RichTextEditor
            id={`inspiration-${field.id}`}
            value={value}
            onChange={(nextValue) => handleFieldChange(field.id, nextValue)}
            ariaLabel={`${field.label} ${t('inspirationDetail.richTextEditSuffix')}`}
            placeholder={resolvePlaceholder(field, fallback)}
            compact
          />
        </div>
      );
    }

    if (field.type === 'documents') {
      return (
        <div className="mt-2 space-y-3">
          {normalizeDocuments(value).map((doc, index) => (
            <div key={`doc-${index}`} className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <input
                type="text"
                value={doc.name}
                onChange={(event) => {
                  const nextDocs = normalizeDocuments(value);
                  nextDocs[index] = { ...doc, name: event.target.value };
                  handleFieldChange(field.id, nextDocs);
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="url"
                value={doc.url}
                onChange={(event) => {
                  const nextDocs = normalizeDocuments(value);
                  nextDocs[index] = { ...doc, url: event.target.value };
                  handleFieldChange(field.id, nextDocs);
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              handleFieldChange(field.id, [
                ...normalizeDocuments(value),
                { name: '', url: '' }
              ])
            }
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
          >
            {t('inspirationDetail.addDocument')}
          </button>
          <p className="text-xs text-amber-600">{t('inspirationDetail.documentsShareNotice')}</p>
        </div>
      );
    }

    const inputType = field.type === 'url' ? 'url' : 'text';
    const placeholder = resolvePlaceholder(field, field.type === 'url' ? 'https://...' : '');

    return (
      <input
        type={inputType}
        value={value}
        onChange={(event) => handleFieldChange(field.id, event.target.value)}
        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        placeholder={placeholder}
      />
    );
  };

  const renderDisplayField = (field) => {
    const value = project?.[field.id];

    if (field.type === 'long_text') {
      return (
        <p className="mt-2 text-sm text-gray-700">
          {value?.trim() ? renderRichText(value) : formatValue(value, notProvidedLabel)}
        </p>
      );
    }

    if (field.type === 'documents') {
      const docs = normalizeDocuments(value);
      return (
        <div className="mt-2 space-y-2 text-sm text-gray-700">
          {docs.length > 0 ? (
            docs.map((doc, index) => (
              <div key={`doc-view-${index}`} className="flex flex-col">
                <span className="font-medium">{doc.name || t('inspirationDetail.documentFallbackName')}</span>
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {doc.url}
                  </a>
                )}
              </div>
            ))
          ) : (
            <p>{notProvidedLabel}</p>
          )}
        </div>
      );
    }

    if (field.type === 'multi_select') {
      const selections = normalizeMultiSelect(value);
      return (
        <p className="mt-2 text-sm text-gray-700">
          {selections.length > 0 ? selections.join(', ') : notProvidedLabel}
        </p>
      );
    }

    if (field.type === 'url') {
      return value ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
        >
          <LinkIcon className="h-4 w-4" aria-hidden="true" />
          {value}
        </a>
      ) : (
        <p className="mt-2 text-sm text-gray-700">{notProvidedLabel}</p>
      );
    }

    return <p className="mt-2 text-sm text-gray-700">{formatValue(value, notProvidedLabel)}</p>;
  };

  const visibilityLabel =
    project.visibility === 'shared' ? t('inspirationDetail.visibilityShared') : t('inspirationDetail.visibilityPersonal');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 px-4 py-8 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="rounded-3xl border border-gray-200 bg-white p-6 shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                {t('inspirationDetail.pageEyebrow')}
              </p>
              <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {project.labName} · {project.country}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onExport?.(project)}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {t('inspirationDetail.save')}
              </button>
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                <Close className="h-4 w-4" aria-hidden="true" />
                {t('inspirationDetail.back')}
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-gray-500">{t('inspirationDetail.shareModeLabel')}</p>
              <p className="text-sm font-semibold text-gray-700">{visibilityLabel}</p>
            </div>
            <div
              className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 p-1"
              role="group"
              aria-label={t('inspirationDetail.shareModeLabel')}
            >
              <button
                type="button"
                onClick={() => onUpdate(project.id, { visibility: 'personal', updatedAt: new Date().toISOString() })}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                  project.visibility !== 'shared'
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-700 hover:bg-blue-100'
                }`}
              >
                {t('inspirationDetail.visibilityPersonal')}
              </button>
              <button
                type="button"
                onClick={() => onUpdate(project.id, { visibility: 'shared', updatedAt: new Date().toISOString() })}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                  project.visibility === 'shared'
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-700 hover:bg-blue-100'
                }`}
              >
                {t('inspirationDetail.visibilityShared')}
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4">
          {enabledFields.map((field) => (
            <React.Fragment key={field.id}>
              {renderField(
                field,
                editingFields[field.id] ? renderEditableField(field) : renderDisplayField(field)
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
