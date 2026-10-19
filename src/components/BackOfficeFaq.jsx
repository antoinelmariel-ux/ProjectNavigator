import React, { useCallback, useEffect, useRef, useState } from '../react.js';
import { isSharePointMode } from '../config/sharepointConfig.js';
import { DEFAULT_LANGUAGE, LANGUAGE_LABELS } from '../i18n/languages.js';
import { getLocalizedRaw, setLocalizedText } from '../utils/localizedContent.js';
import { createFaqEntry, getFaqTranslationGaps } from '../utils/faqEntries.js';
import { RichTextEditor } from './RichTextEditor.jsx';
import { LanguageEditSwitcher } from './LocalizedFieldEditor.jsx';

const SAVE_DEBOUNCE_MS = 800;
const ORDER_STEP = 1000;

// Éditeur de la FAQ de la fenêtre d'aide. Une entrée = une ligne de CN_Faq : la mise à jour est
// locale tout de suite, l'écriture SharePoint passe par la file de réessais, regroupée par entrée
// (debounce) pour ne pas écrire à chaque frappe.
export const BackOfficeFaq = ({
  entries,
  setEntries,
  queueRef,
  serverMetaRef,
  currentUserEmail,
  isCurrentUserAdmin,
  t
}) => {
  const [editingLanguage, setEditingLanguage] = useState(DEFAULT_LANGUAGE);
  const entriesRef = useRef(entries);
  const timersRef = useRef(new Map());
  entriesRef.current = entries;

  const getSortOrder = useCallback((id, fallbackIndex) => {
    const stored = serverMetaRef?.current?.get(id)?.sortOrder;
    return typeof stored === 'number' ? stored : fallbackIndex * ORDER_STEP;
  }, [serverMetaRef]);

  const enqueueSave = useCallback((entry, sortOrder) => {
    if (!isSharePointMode()) {
      return;
    }
    const queue = queueRef?.current;
    if (queue && typeof queue.enqueue === 'function') {
      queue.enqueue({ action: 'save', entry, sortOrder });
    }
  }, [queueRef]);

  const flushEntry = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    const index = entriesRef.current.findIndex((entry) => entry.id === id);
    if (index === -1) {
      return;
    }
    enqueueSave(entriesRef.current[index], getSortOrder(id, index));
  }, [enqueueSave, getSortOrder]);

  const scheduleSave = useCallback((id) => {
    const previous = timersRef.current.get(id);
    if (previous) {
      clearTimeout(previous);
    }
    timersRef.current.set(id, setTimeout(() => flushEntry(id), SAVE_DEBOUNCE_MS));
  }, [flushEntry]);

  useEffect(() => () => {
    Array.from(timersRef.current.keys()).forEach((id) => flushEntry(id));
  }, [flushEntry]);

  const updateEntry = useCallback((id, patch) => {
    setEntries((previous) => previous.map((entry) => (
      entry.id === id
        ? { ...entry, ...patch, updatedBy: currentUserEmail || entry.updatedBy, updatedAt: new Date().toISOString() }
        : entry
    )));
    entriesRef.current = entriesRef.current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry));
    scheduleSave(id);
  }, [currentUserEmail, scheduleSave, setEntries]);

  const handleAdd = () => {
    const created = createFaqEntry();
    const orders = entriesRef.current.map((entry, index) => getSortOrder(entry.id, index));
    const sortOrder = (orders.length > 0 ? Math.max(...orders) : 0) + ORDER_STEP;
    serverMetaRef?.current?.set(created.id, { ...(serverMetaRef.current.get(created.id) || {}), sortOrder });
    entriesRef.current = [...entriesRef.current, created];
    setEntries((previous) => [...previous, created]);
    enqueueSave(created, sortOrder);
  };

  const handleRemove = (id) => {
    if (typeof window !== 'undefined' && !window.confirm(t('backOffice.faq.confirmDelete'))) {
      return;
    }
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    entriesRef.current = entriesRef.current.filter((entry) => entry.id !== id);
    setEntries((previous) => previous.filter((entry) => entry.id !== id));
    if (isSharePointMode() && queueRef?.current?.enqueue) {
      queueRef.current.enqueue({ action: 'remove', faqId: id });
    }
  };

  const handleMove = (index, direction) => {
    const target = index + direction;
    const list = entriesRef.current;
    if (target < 0 || target >= list.length) {
      return;
    }
    const current = list[index];
    const neighbour = list[target];
    const currentOrder = getSortOrder(current.id, index);
    const neighbourOrder = getSortOrder(neighbour.id, target);
    const meta = serverMetaRef?.current;
    if (meta) {
      meta.set(current.id, { ...(meta.get(current.id) || {}), sortOrder: neighbourOrder });
      meta.set(neighbour.id, { ...(meta.get(neighbour.id) || {}), sortOrder: currentOrder });
    }
    const next = list.slice();
    next[index] = neighbour;
    next[target] = current;
    entriesRef.current = next;
    setEntries(next);
    flushEntry(current.id);
    flushEntry(neighbour.id);
  };

  const categorySuggestions = Array.from(new Set(
    entries
      .map((entry) => getLocalizedRaw(entry.category, editingLanguage).trim())
      .filter((label) => label !== '')
  ));

  if (!isCurrentUserAdmin) {
    return (
      <p className="text-sm text-gray-600" role="status">{t('backOffice.faq.adminOnly')}</p>
    );
  }

  return (
    <div className="space-y-6" data-testid="backoffice-faq">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-gray-900">{t('backOffice.faq.title')}</h2>
          <p className="max-w-2xl text-sm text-gray-600">{t('backOffice.faq.description')}</p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {t('backOffice.faq.add')}
        </button>
      </div>

      <LanguageEditSwitcher
        editingLanguage={editingLanguage}
        onChange={setEditingLanguage}
        label={t('backOffice.faq.editingLanguage')}
        hint={t('backOffice.faq.editingLanguageHint')}
      />

      {entries.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
          {t('backOffice.faq.empty')}
        </p>
      )}

      <datalist id="faq-category-suggestions">
        {categorySuggestions.map((label) => <option key={label} value={label} />)}
      </datalist>

      <ol className="space-y-4">
        {entries.map((entry, index) => {
          const gaps = getFaqTranslationGaps(entry);
          return (
            <li
              key={entry.id}
              className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              data-faq-id={entry.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t('backOffice.faq.entryNumber', { number: index + 1 })}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={entry.isPublished !== false}
                      onChange={(event) => updateEntry(entry.id, { isPublished: event.target.checked })}
                    />
                    {t('backOffice.faq.published')}
                  </label>
                  <button
                    type="button"
                    onClick={() => handleMove(index, -1)}
                    disabled={index === 0}
                    aria-label={t('backOffice.faq.moveUp')}
                    className="rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(index, 1)}
                    disabled={index === entries.length - 1}
                    aria-label={t('backOffice.faq.moveDown')}
                    className="rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(entry.id)}
                    className="rounded-lg border border-red-200 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    {t('backOffice.faq.delete')}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor={`faq-category-${entry.id}`} className="text-sm font-medium text-gray-800">
                  {t('backOffice.faq.categoryLabel')}
                </label>
                <input
                  id={`faq-category-${entry.id}`}
                  type="text"
                  list="faq-category-suggestions"
                  value={getLocalizedRaw(entry.category, editingLanguage)}
                  placeholder={t('backOffice.faq.categoryPlaceholder')}
                  onChange={(event) => updateEntry(entry.id, {
                    category: setLocalizedText(entry.category, editingLanguage, event.target.value)
                  })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor={`faq-question-${entry.id}`} className="text-sm font-medium text-gray-800">
                  {t('backOffice.faq.questionLabel')}
                </label>
                <input
                  id={`faq-question-${entry.id}`}
                  type="text"
                  value={getLocalizedRaw(entry.question, editingLanguage)}
                  onChange={(event) => updateEntry(entry.id, {
                    question: setLocalizedText(entry.question, editingLanguage, event.target.value)
                  })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <span className="text-sm font-medium text-gray-800">{t('backOffice.faq.answerLabel')}</span>
                <RichTextEditor
                  key={`${entry.id}-${editingLanguage}`}
                  id={`faq-answer-${entry.id}`}
                  ariaLabel={t('backOffice.faq.answerLabel')}
                  value={getLocalizedRaw(entry.answer, editingLanguage)}
                  onChange={(value) => updateEntry(entry.id, {
                    answer: setLocalizedText(entry.answer, editingLanguage, value)
                  })}
                />
              </div>

              <p className={`text-xs ${gaps.length > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                {gaps.length > 0
                  ? t('backOffice.faq.missingTranslations', {
                    languages: gaps.map((code) => LANGUAGE_LABELS[code] || code).join(', ')
                  })
                  : t('backOffice.faq.fullyTranslated')}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
