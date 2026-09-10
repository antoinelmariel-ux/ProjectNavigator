import React, { useCallback, useEffect, useMemo, useRef, useState } from '../react.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { isKnownSiteUser, searchOrgPeople, MIN_QUERY_LENGTH } from '../utils/peopleSearch.js';
import { queueSiteAccessRequest } from '../utils/siteAccessQueue.js';
import { normalizeEmail } from '../utils/normalizeEmail.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SEARCH_DEBOUNCE_MS = 250;

// Replaces free-text email entry with a search against the organization's directory (see
// src/utils/peopleSearch.js). Free-text is still accepted as a fallback on Enter — the
// directory search can't always resolve a valid address (mock/dev directory is tiny, and a
// real tenant's people picker may not surface every account) — but it's no longer the only way.
// Every successful add also (SharePoint mode only) checks site membership and, if the person
// isn't a known site user, queues a "add as site member" request — see requestAccessIfNeeded
// below and src/utils/siteAccessQueue.js.
export const PeoplePicker = ({
  id,
  value,
  onChange,
  placeholder,
  multiple = true,
  disabled = false,
  ariaLabel,
  className = '',
  context = ''
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [feedback, setFeedback] = useState('');
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  const entries = useMemo(() => (Array.isArray(value) ? value.filter(Boolean) : []), [value]);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsSearching(false);
      return undefined;
    }
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      searchOrgPeople(trimmed)
        .then((results) => {
          if (requestIdRef.current !== requestId) {
            return;
          }
          setSuggestions(results);
          setIsSearching(false);
        })
        .catch(() => {
          if (requestIdRef.current !== requestId) {
            return;
          }
          setSuggestions([]);
          setIsSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return undefined;
  }, [query]);

  // Par précaution (décision assumée, pas automatique par défaut) : quelqu'un ajouté ici et
  // absent de la liste des membres du site déclenche une demande d'ajout, traitée par un flux
  // Power Automate (voir src/utils/siteAccessQueue.js) — pas d'attente ni de blocage de l'UI
  // sur ce contrôle, ses erreurs sont avalées volontairement.
  const requestAccessIfNeeded = useCallback(
    (email, displayName) => {
      isKnownSiteUser(email)
        .then((known) => (known ? undefined : queueSiteAccessRequest({ email, displayName, context })))
        .catch(() => {});
    },
    [context]
  );

  const commitEmail = useCallback(
    (rawEmail, displayName) => {
      const normalized = normalizeEmail(rawEmail);
      if (!EMAIL_PATTERN.test(normalized)) {
        setFeedback(t('common.peoplePicker.invalidEmail'));
        return;
      }
      if (entries.some((entry) => normalizeEmail(entry) === normalized)) {
        setFeedback(t('common.peoplePicker.alreadyAddedMessage'));
        setQuery('');
        setSuggestions([]);
        setIsOpen(false);
        return;
      }
      const nextEntries = multiple ? [...entries, normalized] : [normalized];
      onChange(nextEntries);
      requestAccessIfNeeded(normalized, displayName);
      setQuery('');
      setSuggestions([]);
      setIsOpen(false);
      setFeedback('');
    },
    [entries, multiple, onChange, requestAccessIfNeeded, t]
  );

  const handleRemove = useCallback(
    (email) => {
      onChange(entries.filter((entry) => normalizeEmail(entry) !== normalizeEmail(email)));
    },
    [entries, onChange]
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (suggestions.length > 0) {
          commitEmail(suggestions[0].email, suggestions[0].displayName);
        } else if (query.trim()) {
          commitEmail(query.trim());
        }
        return;
      }
      if (event.key === 'Backspace' && !query && entries.length > 0) {
        handleRemove(entries[entries.length - 1]);
        return;
      }
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    },
    [commitEmail, entries, handleRemove, query, suggestions]
  );

  const showInput = !disabled && (multiple || entries.length === 0);

  return (
    <div className={`relative ${className}`}>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-300 bg-white px-2 py-2">
        {entries.map((email) => (
          <span
            key={email}
            className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
          >
            {email}
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemove(email)}
                className="rounded-full p-0.5 text-blue-700 hover:bg-blue-100"
                aria-label={t('common.peoplePicker.removeAriaLabelTemplate', { name: email })}
              >
                ×
              </button>
            )}
          </span>
        ))}
        {showInput && (
          <input
            id={id}
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsOpen(true);
              setFeedback('');
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || t('common.peoplePicker.searchPlaceholder')}
            aria-label={ariaLabel}
            className="min-w-[10rem] flex-1 border-0 px-1 py-0.5 text-sm text-gray-700 focus:outline-none"
          />
        )}
      </div>
      {isOpen && showInput && query.trim().length >= MIN_QUERY_LENGTH && (
        <div className="absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {isSearching ? (
            <p className="px-3 py-2 text-xs text-gray-500">{t('common.peoplePicker.searching')}</p>
          ) : suggestions.length > 0 ? (
            suggestions.map((person) => (
              <button
                key={person.email}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commitEmail(person.email, person.displayName)}
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-blue-50"
              >
                <span className="font-medium text-gray-800">{person.displayName}</span>
                <span className="text-xs text-gray-500">{person.email}</span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-xs text-gray-500">{t('common.peoplePicker.noResults')}</p>
          )}
        </div>
      )}
      {feedback && <p className="mt-1 text-xs text-amber-600">{feedback}</p>}
    </div>
  );
};
