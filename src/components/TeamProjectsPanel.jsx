import React, { useEffect, useMemo, useState } from '../react.js';
import { AlertTriangle, Eye, Search, Users } from './icons.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { normalizeEmail } from '../utils/normalizeEmail.js';
import { stripRichTextToPlainText } from '../utils/richText.js';
import { summarizeTeamBranches } from '../utils/reportingHierarchy.js';

const PAGE_SIZE = 12;
const ATTENTION_VALIDATION_STATUSES = new Set(['rejected', 'outdated']);
const ATTENTION_LAUNCH_SIGNALS = new Set(['late', 'launched_without']);

const CHIP_BASE = 'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors';
const CHIP_ACTIVE = 'border-indigo-600 bg-indigo-600 text-white';
const CHIP_IDLE = 'border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50';
const ATTENTION_CHIP_ACTIVE = 'border-amber-600 bg-amber-600 text-white';
const ATTENTION_CHIP_IDLE = 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100';

const getEntryTimestamp = (entry) => {
  const value = Date.parse(entry?.project?.lastUpdated || entry?.project?.submittedAt || '');
  return Number.isNaN(value) ? 0 : value;
};

export const TeamProjectsPanel = ({
  entries = [],
  peopleCount = 0,
  status = 'ready',
  isPartial = false,
  onRetry,
  renderCard,
  getValidationStatus,
  launchSignals = {}
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const needsAttention = useMemo(() => {
    const flagged = new Set();
    entries.forEach((entry) => {
      const validation = typeof getValidationStatus === 'function' ? getValidationStatus(entry.project) : null;
      if (
        ATTENTION_VALIDATION_STATUSES.has(validation?.status)
        || ATTENTION_LAUNCH_SIGNALS.has(launchSignals[entry.project.id])
      ) {
        flagged.add(entry.project.id);
      }
    });
    return flagged;
  }, [entries, getValidationStatus, launchSignals]);

  const branches = useMemo(() => summarizeTeamBranches(entries), [entries]);

  useEffect(() => {
    if (branchFilter && !branches.some((branch) => branch.email === branchFilter)) {
      setBranchFilter('');
    }
  }, [branches, branchFilter]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries
      .filter((entry) => !branchFilter || normalizeEmail(entry.branch?.email) === branchFilter)
      .filter((entry) => !attentionOnly || needsAttention.has(entry.project.id))
      .filter((entry) => {
        if (!query) {
          return true;
        }
        const haystack = [
          stripRichTextToPlainText(entry.project.projectName || ''),
          entry.owner?.displayName,
          entry.owner?.email,
          entry.manager?.displayName
        ].join(' ').toLowerCase();
        return haystack.includes(query);
      })
      .slice()
      .sort((a, b) => getEntryTimestamp(b) - getEntryTimestamp(a));
  }, [entries, branchFilter, attentionOnly, needsAttention, search]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, branchFilter, attentionOnly]);

  const visibleEntries = filteredEntries.slice(0, visibleCount);
  const remainingCount = Math.max(0, filteredEntries.length - visibleEntries.length);
  const hasFilters = search.trim().length > 0 || Boolean(branchFilter) || attentionOnly;

  return (
    <div className="space-y-5">
      <div
        className="flex items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900"
        role="note"
      >
        <Eye className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" aria-hidden="true" />
        <p>
          <span className="font-semibold">{t('home.team.readOnlyTitle')}</span>{' '}
          {t(peopleCount > 1 ? 'home.team.readOnlyBodyPlural' : 'home.team.readOnlyBodySingular', { count: peopleCount })}
        </p>
      </div>

      {isPartial && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800" role="status">
          {t('home.team.partialNotice', { count: peopleCount })}
        </p>
      )}

      {status === 'error' && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">
          <span>{t('home.team.loadError')}</span>
          {typeof onRetry === 'function' && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
            >
              {t('home.team.retry')}
            </button>
          )}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-indigo-200 bg-white p-8 text-center text-gray-600" role="status">
          <Users className="mx-auto h-8 w-8 text-indigo-500" aria-hidden="true" />
          <p className="mt-3 text-lg font-medium text-gray-800">{t('home.team.emptyTitle')}</p>
          <p className="mt-2 text-sm">{t('home.team.emptyBody')}</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <div className="relative">
              <label htmlFor="team-project-search" className="sr-only">{t('home.team.searchLabel')}</label>
              <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                id="team-project-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('home.team.searchLabel')}
                className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-base text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {branches.length > 1 && (
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('home.team.branchFilterAriaLabel')}>
                  <button
                    type="button"
                    aria-pressed={!branchFilter}
                    onClick={() => setBranchFilter('')}
                    className={`${CHIP_BASE} ${!branchFilter ? CHIP_ACTIVE : CHIP_IDLE}`}
                  >
                    {t('home.team.allBranches', { count: entries.length })}
                  </button>
                  {branches.map((branch) => (
                    <button
                      key={`team-branch-${branch.email}`}
                      type="button"
                      aria-pressed={branchFilter === branch.email}
                      onClick={() => setBranchFilter(branchFilter === branch.email ? '' : branch.email)}
                      title={t('home.team.branchTooltip', { name: branch.displayName })}
                      className={`${CHIP_BASE} ${branchFilter === branch.email ? CHIP_ACTIVE : CHIP_IDLE}`}
                    >
                      {t('home.team.branchChip', { name: branch.displayName, count: branch.count })}
                    </button>
                  ))}
                </div>
              )}
              {needsAttention.size > 0 && (
                <button
                  type="button"
                  aria-pressed={attentionOnly}
                  onClick={() => setAttentionOnly((prev) => !prev)}
                  className={`inline-flex items-center gap-1 ${CHIP_BASE} ${attentionOnly ? ATTENTION_CHIP_ACTIVE : ATTENTION_CHIP_IDLE}`}
                  title={t('home.team.attentionTooltip')}
                >
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  {t('home.team.attentionFilter', { count: needsAttention.size })}
                </button>
              )}
            </div>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-indigo-200 bg-white p-8 text-center text-gray-600" role="status" aria-live="polite">
              <p className="text-lg font-medium text-gray-800">{t('home.noProjectsMatchFilters')}</p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setBranchFilter('');
                    setAttentionOnly(false);
                  }}
                  className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
                >
                  {t('home.clearAllFilters')}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" role="list" aria-label={t('home.team.listAriaLabel')}>
                {visibleEntries.map((entry) => renderCard(entry.project, { teamEntry: entry }))}
              </div>
              {remainingCount > 0 && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                    className="rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                  >
                    {t('home.team.showMore', { count: Math.min(PAGE_SIZE, remainingCount) })}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default TeamProjectsPanel;
