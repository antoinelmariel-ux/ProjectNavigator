import React, { useMemo, useState } from '../../react.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { InvitationBadge } from './InvitationBadge.jsx';
import { CommitteeAgendaDecision } from './CommitteeAgendaDecision.jsx';
import { buildInvitationId } from '../../utils/committeeInvitations.js';
import { PASSAGE_ROLE_GUEST, PASSAGE_ROLE_OWNER, PASSAGE_ROLE_PRESENTER } from '../../utils/userCommitteePassages.js';
import { formatSessionDay, formatSessionWindow, formatTime } from './committeeFormat.js';

const FILTERS_FROM = 5;

const getCommitteeName = (committeesById, committeeId) => committeesById[committeeId]?.name || committeeId;

// Un passage de la personne, résumé sur une carte. Les actions (temps, invités, désinscription)
// restent dans le bloc comité de la synthèse : cette page ne fait que renvoyer.
export const CommitteePassageCard = ({ entry, committeesById, invitationRecords, onOpenAgenda, onOpenSynthesis }) => {
  const { t, language } = useTranslation();
  const committeeName = getCommitteeName(committeesById, entry.committeeId);
  const isOwner = entry.role === PASSAGE_ROLE_OWNER;
  const idPrefix = `my-passage-${entry.session.id}-${entry.passage.id}`;
  const muted = entry.isPast && entry.isCancelled;
  return (
    <li
      className={`rounded-xl border bg-white p-4 shadow-sm space-y-2 ${
        entry.isCancelled && !entry.isPast ? 'border-red-200' : 'border-gray-200'
      } ${muted ? 'opacity-70' : ''}`}
      data-testid="my-committee-passage"
      data-passage-state={entry.isPast ? 'past' : 'upcoming'}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-500">
            {formatSessionDay(entry.session.startAt, language)} · {committeeName}
          </p>
          <h3 className="text-base font-semibold text-gray-900">
            {entry.title}
            {entry.passageNumber > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-600">
                ({t('committeeSessions.myPassages.passageNumber', { number: entry.passageNumber })})
              </span>
            )}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {entry.isTopic && (
              <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-800">
                {t('committeeSessions.myPassages.topicBadge')}
              </span>
            )}
            {entry.role === PASSAGE_ROLE_GUEST && (
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-semibold text-gray-700">
                {t('committeeSessions.myPassages.roleGuest')}
              </span>
            )}
            {entry.role === PASSAGE_ROLE_PRESENTER && (
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-semibold text-gray-700">
                {t('committeeSessions.myPassages.rolePresenter')}
              </span>
            )}
            {entry.isCancelled && (
              <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800">
                {t('committeeSessions.myPassages.cancelledBadge')}
              </span>
            )}
            {!entry.isPast && !entry.isCancelled && (
              <InvitationBadge record={invitationRecords[buildInvitationId(entry.session.id, entry.passage.id)]} />
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!entry.isCancelled && typeof onOpenAgenda === 'function' && (
            <button
              type="button"
              onClick={() => onOpenAgenda(entry.session.id)}
              className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
            >
              {t('committeeSessions.myPassages.openAgenda')}
            </button>
          )}
          {isOwner && entry.project && typeof onOpenSynthesis === 'function' && (
            <button
              type="button"
              onClick={() => onOpenSynthesis(entry.project.id, entry.committeeId)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              {t('committeeSessions.myPassages.openSynthesis')}
            </button>
          )}
        </div>
      </div>

      {!entry.isPast && entry.isCancelled && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="status">
          {t('committeeSessions.myPassages.cancelledUpcoming')}
        </p>
      )}
      {!entry.isPast && !entry.isCancelled && (
        <p className="text-sm text-gray-700">
          {formatSessionWindow(entry.session, language)}
          <span className="block text-xs text-gray-600">
            {t('committeeSessions.myPassages.indicativeTime', {
              time: formatTime(entry.startAt, language),
              minutes: entry.passage.minutes,
              position: entry.number,
              total: entry.total
            })}
          </span>
        </p>
      )}
      {entry.isPast && !entry.isCancelled && (
        entry.hasDecision ? (
          <CommitteeAgendaDecision
            idPrefix={idPrefix}
            status={entry.decision.status}
            comment={entry.decision.comment}
            canEdit={false}
          />
        ) : (
          <p className="text-sm text-gray-600" data-testid="my-committee-passage-no-decision">
            {t('committeeSessions.myPassages.noDecision')}
          </p>
        )
      )}
      {entry.currentOpinionDiffers && (
        <p className="text-xs text-amber-800">
          {t('committeeSessions.myPassages.opinionChanged')}
        </p>
      )}
    </li>
  );
};

export const MyCommitteePassagesScreen = ({
  passages = { upcoming: [], past: [] },
  committeesById = {},
  invitationRecords = {},
  onOpenAgenda,
  onOpenSynthesis,
  onBack
}) => {
  const { t } = useTranslation();
  const [committeeFilter, setCommitteeFilter] = useState('');
  const [titleFilter, setTitleFilter] = useState('');

  const all = useMemo(() => [...passages.upcoming, ...passages.past], [passages]);
  const showFilters = all.length >= FILTERS_FROM;
  const committeeOptions = useMemo(
    () => [...new Set(all.map((entry) => entry.committeeId))]
      .map((id) => ({ id, label: getCommitteeName(committeesById, id) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [all, committeesById]
  );
  const titleOptions = useMemo(
    () => [...new Set(all.map((entry) => entry.title))].sort((a, b) => a.localeCompare(b)),
    [all]
  );
  const matches = (entry) => (!committeeFilter || entry.committeeId === committeeFilter)
    && (!titleFilter || entry.title === titleFilter);
  const upcoming = passages.upcoming.filter(matches);
  const past = passages.past.filter(matches);

  const renderList = (entries, emptyKey) => (entries.length === 0 ? (
    <p className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600">{t(emptyKey)}</p>
  ) : (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <CommitteePassageCard
          key={entry.key}
          entry={entry}
          committeesById={committeesById}
          invitationRecords={invitationRecords}
          onOpenAgenda={onOpenAgenda}
          onOpenSynthesis={onOpenSynthesis}
        />
      ))}
    </ul>
  ));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6" data-testid="my-committee-passages">
      <header className="space-y-2">
        {typeof onBack === 'function' && (
          <button type="button" onClick={onBack} className="text-sm font-semibold text-blue-700 hover:text-blue-800">
            ← {t('committeeSessions.myPassages.back')}
          </button>
        )}
        <h1 className="text-2xl font-bold text-gray-900">{t('committeeSessions.myPassages.title')}</h1>
        <p className="text-sm text-gray-600">{t('committeeSessions.myPassages.subtitle')}</p>
      </header>

      {all.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600">
          {t('committeeSessions.myPassages.empty')}
        </p>
      ) : (
        <>
          {showFilters && (
            <div className="flex flex-wrap gap-3">
              <label className="text-sm text-gray-700">
                <span className="block text-xs font-medium text-gray-600">{t('committeeSessions.myPassages.filterCommittee')}</span>
                <select
                  value={committeeFilter}
                  onChange={(event) => setCommitteeFilter(event.target.value)}
                  className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
                >
                  <option value="">{t('committeeSessions.myPassages.filterAll')}</option>
                  {committeeOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-gray-700">
                <span className="block text-xs font-medium text-gray-600">{t('committeeSessions.myPassages.filterTitle')}</span>
                <select
                  value={titleFilter}
                  onChange={(event) => setTitleFilter(event.target.value)}
                  className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
                >
                  <option value="">{t('committeeSessions.myPassages.filterAll')}</option>
                  {titleOptions.map((title) => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <section className="space-y-3" aria-labelledby="my-passages-upcoming">
            <h2 id="my-passages-upcoming" className="text-lg font-semibold text-gray-800">
              {t('committeeSessions.myPassages.upcomingTitle')}
            </h2>
            {renderList(upcoming, 'committeeSessions.myPassages.noUpcoming')}
          </section>
          <section className="space-y-3" aria-labelledby="my-passages-past">
            <h2 id="my-passages-past" className="text-lg font-semibold text-gray-800">
              {t('committeeSessions.myPassages.pastTitle')}
            </h2>
            {renderList(past, 'committeeSessions.myPassages.noPast')}
          </section>
        </>
      )}
    </div>
  );
};
