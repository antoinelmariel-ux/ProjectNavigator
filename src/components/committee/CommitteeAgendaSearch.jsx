import React, { useMemo, useState } from '../../react.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { DecisionBadge } from './CommitteeAgendaDecision.jsx';
import { buildAgendaSearchEntries, searchAgendaEntries } from '../../utils/committeeAgendaSearch.js';
import { formatSessionDay } from './committeeFormat.js';

const MAX_RESULTS = 50;

const SITUATION_CLASSES = {
  trashed: 'border-red-200 bg-red-50 text-red-800',
  purged: 'border-red-200 bg-red-50 text-red-800',
  missing: 'border-red-200 bg-red-50 text-red-800',
  deferred: 'border-amber-200 bg-amber-50 text-amber-800'
};

const TIMING_CLASSES = {
  upcoming: 'border-blue-200 bg-blue-50 text-blue-800',
  past: 'border-gray-200 bg-gray-50 text-gray-700',
  cancelled: 'border-red-200 bg-red-50 text-red-800'
};

const excerpt = (text, max = 220) => (text.length > max ? `${text.slice(0, max).trimEnd()}…` : text);

// Retrouver un sujet traité (ou programmé) dans l'un des ordres du jour, passés ou à venir, et en
// relire la décision. Texte libre sur le titre et le commentaire ; chaque résultat renvoie à son ordre du jour.
export const CommitteeAgendaSearch = ({ committees = [], sessions = [], projects = [], teams = [], onOpenAgenda }) => {
  const { t, language } = useTranslation();
  const [query, setQuery] = useState('');
  const [committeeId, setCommitteeId] = useState('');

  const entries = useMemo(
    () => {
      const visibleIds = new Set(committees.map((committee) => committee.id));
      return buildAgendaSearchEntries({
        sessions: sessions.filter((session) => visibleIds.has(session.committeeId)),
        projects,
        committees,
        stagedOptions: { teams }
      });
    },
    [sessions, projects, committees, teams]
  );
  const hasQuery = query.trim().length > 0;
  const results = useMemo(
    () => (hasQuery ? searchAgendaEntries(entries, query, { committeeId }) : []),
    [entries, query, committeeId, hasQuery]
  );

  return (
    <section
      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
      aria-labelledby="committee-agenda-search-title"
      data-testid="committee-agenda-search"
    >
      <div>
        <h3 id="committee-agenda-search-title" className="text-lg font-semibold text-gray-800">{t('committeeSessions.search.title')}</h3>
        <p className="text-xs text-gray-500">{t('committeeSessions.search.hint')}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <label htmlFor="committee-agenda-search-input" className="sr-only">{t('committeeSessions.search.label')}</label>
        <input
          id="committee-agenda-search-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('committeeSessions.search.placeholder')}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        {committees.length > 1 && (
          <select
            aria-label={t('committeeSessions.search.allCommittees')}
            value={committeeId}
            onChange={(event) => setCommitteeId(event.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-2 text-sm"
          >
            <option value="">{t('committeeSessions.search.allCommittees')}</option>
            {committees.map((committee) => (
              <option key={committee.id} value={committee.id}>{committee.name || committee.id}</option>
            ))}
          </select>
        )}
      </div>

      {!hasQuery && <p className="text-xs text-gray-500">{t('committeeSessions.search.noQuery')}</p>}
      {hasQuery && results.length === 0 && (
        <p className="text-sm text-gray-600" role="status">{t('committeeSessions.search.noResult')}</p>
      )}
      {results.length > 0 && (
        <>
          <p className="text-xs text-gray-500" role="status">{t('committeeSessions.search.count', { count: results.length })}</p>
          <ul className="space-y-2">
            {results.slice(0, MAX_RESULTS).map((entry) => (
              <li key={entry.key} className="rounded-xl border border-gray-200 p-3 space-y-1" data-testid="committee-agenda-search-result">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">{entry.title || t('committeeSessions.agenda.unknownProject')}</p>
                    <p className="text-xs text-gray-600">
                      {entry.committeeName} · {formatSessionDay(entry.startAt, language)}
                    </p>
                  </div>
                  {typeof onOpenAgenda === 'function' && (
                    <button
                      type="button"
                      onClick={() => onOpenAgenda(entry.sessionId)}
                      className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      {t('committeeSessions.search.open')}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${TIMING_CLASSES[entry.timing]}`}>
                    {t(`committeeSessions.search.timing_${entry.timing}`)}
                  </span>
                  {entry.isDraftSession && (
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-semibold text-gray-700">
                      {t('committeeSessions.search.draftSession')}
                    </span>
                  )}
                  {entry.kind === 'topic' && (
                    <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-800">
                      {t('committeeSessions.search.topic')}
                    </span>
                  )}
                  {entry.projectSituation !== 'live' && (
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${SITUATION_CLASSES[entry.projectSituation]}`}>
                      {t(`committeeSessions.search.situation_${entry.projectSituation}`)}
                    </span>
                  )}
                  {entry.status
                    ? <DecisionBadge status={entry.status} />
                    : <span className="text-xs text-gray-500">{t('committeeSessions.search.noDecision')}</span>}
                </div>
                {entry.comment && <p className="text-sm text-gray-700">{excerpt(entry.comment)}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
};
