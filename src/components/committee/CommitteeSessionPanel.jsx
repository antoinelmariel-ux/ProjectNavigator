import React, { useMemo, useState } from '../../react.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { PeoplePicker } from '../PeoplePicker.jsx';
import { CommitteeAttendance } from './CommitteeAttendance.jsx';
import { InvitationBadge } from './InvitationBadge.jsx';
import { buildInvitationId } from '../../utils/committeeInvitations.js';
import {
  DEFAULT_PASSAGE_MINUTES,
  SESSION_STATUS_CANCELLED,
  TIME_REQUEST_PENDING,
  getBookableSessions,
  getCommitteeChairEmails,
  getCommitteeMemberEmails,
  getPassageAttendance,
  getPendingRepresentationRequest,
  getProjectPassages,
  getRemainingMinutes,
  isSessionPast
} from '../../utils/committeeSessions.js';
import { formatSessionDay, formatSessionWindow, formatShortDate, formatTime } from './committeeFormat.js';

const ERROR_KEYS = ['full', 'closed', 'network', 'overrun', 'noteRequired', 'cancelled'];

// Bloc « Passage en séance » d'un comité, dans « Enjeux du projet » (spec §5, §8, §9) : inscrire
// le projet, voir et gérer son prochain passage, les présences du passage en cours et
// l'historique des passages précédents avec l'avis rendu à l'issue de chacun.
export const CommitteeSessionPanel = ({
  committee,
  projectId,
  sessions = [],
  committeeEntry = null,
  invitationRecords = {},
  isDeferred = false,
  canBook = false,
  isChair = false,
  canViewAgenda = false,
  onRunAction,
  onMovePassage,
  onOpenAgenda,
  renderStatusLabel
}) => {
  const { t, language } = useTranslation();
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [guests, setGuests] = useState([]);
  const [moveTargetId, setMoveTargetId] = useState('');
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [requestMinutes, setRequestMinutes] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [isGuestEditorOpen, setIsGuestEditorOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  const now = new Date();
  const committeeId = committee?.id;
  const idPrefix = `committee-session-${committeeId}`;
  const members = useMemo(() => getCommitteeMemberEmails(committee), [committee]);
  const chairs = useMemo(() => getCommitteeChairEmails(committee), [committee]);
  const committeeSessions = useMemo(
    () => sessions.filter((session) => session.committeeId === committeeId),
    [committeeId, sessions]
  );
  const passages = getProjectPassages(committeeSessions, projectId, committeeId, now);
  const upcoming = passages.find((entry) => !entry.isPast) || null;
  const startedPassages = passages.filter((entry) => entry.hasStarted);
  const currentPassage = startedPassages[startedPassages.length - 1] || null;
  const pastPassages = passages.filter((entry) => entry.isPast && entry !== currentPassage);
  const representation = getPendingRepresentationRequest(committeeSessions, projectId, committeeId, now);

  // Le président peut inscrire sur toute séance à venir non annulée (J-3 et place ne
  // s'appliquent pas à lui) ; le chef de projet ne voit que ce qui lui est ouvert.
  const bookableSessions = isChair
    ? committeeSessions.filter((session) => session.status !== SESSION_STATUS_CANCELLED && !isSessionPast(session, now))
    : getBookableSessions(committeeSessions, committee, now);
  const moveTargets = bookableSessions.filter((session) => session.id !== upcoming?.session.id);

  const opinionSession = committeeEntry?.sessionId
    ? sessions.find((session) => session.id === committeeEntry.sessionId)
    : null;
  const sessionOutcomes = committeeEntry?.sessionOutcomes && typeof committeeEntry.sessionOutcomes === 'object'
    ? committeeEntry.sessionOutcomes
    : {};

  const run = async (operation, successKey) => {
    setIsBusy(true);
    setFeedback(null);
    try {
      const result = await operation();
      if (result?.ok) {
        setFeedback({ tone: 'success', message: t(`committeeSessions.panel.feedback.${successKey}`) });
      } else {
        const key = ERROR_KEYS.includes(result?.error) ? result.error : 'generic';
        setFeedback({ tone: 'error', message: t(`committeeSessions.errors.${key}`, { minutes: result?.overrunMinutes || 0 }) });
      }
      return result;
    } finally {
      setIsBusy(false);
    }
  };

  const handleBook = () => {
    const target = selectedSessionId || bookableSessions[0]?.id;
    if (!target) {
      return;
    }
    run(() => onRunAction(target, { type: 'book', projectId, guests, allowOverrun: isChair }), 'booked').then((result) => {
      if (result?.ok) {
        setGuests([]);
        setSelectedSessionId('');
      }
    });
  };

  const handleMove = () => {
    if (!upcoming || !moveTargetId) {
      return;
    }
    run(() => onMovePassage(upcoming.session.id, upcoming.passage.id, moveTargetId), 'moved').then((result) => {
      if (result?.ok) {
        setMoveTargetId('');
      }
    });
  };

  const handleUnbook = () => {
    if (!upcoming || (typeof window !== 'undefined' && !window.confirm(t('committeeSessions.panel.unbookConfirm')))) {
      return;
    }
    run(() => onRunAction(upcoming.session.id, { type: 'unbook', passageId: upcoming.passage.id }), 'unbooked');
  };

  const handleRequestTime = (event) => {
    event.preventDefault();
    if (!upcoming) {
      return;
    }
    run(() => onRunAction(upcoming.session.id, {
      type: 'requestTime',
      passageId: upcoming.passage.id,
      minutes: Number.parseInt(requestMinutes, 10) || undefined,
      note: requestNote
    }), 'timeRequested').then((result) => {
      if (result?.ok) {
        setIsRequestOpen(false);
        setRequestNote('');
        setRequestMinutes('');
      }
    });
  };

  const defaultRequestMinutes = upcoming
    ? (() => {
      const remaining = Math.max(0, getRemainingMinutes(upcoming.session));
      return remaining > 0 ? Math.min(DEFAULT_PASSAGE_MINUTES, remaining) : DEFAULT_PASSAGE_MINUTES;
    })()
    : DEFAULT_PASSAGE_MINUTES;

  const renderSessionOption = (session) =>
    `${formatSessionDay(session.startAt, language)} · ${formatSessionWindow(session, language)}${session.status === 'draft' ? ` (${t('committeeSessions.status.draft')})` : ''}`;

  const timeRequest = upcoming?.passage.timeRequest;

  return (
    <section className="mt-4 space-y-3" aria-labelledby={`${idPrefix}-title`} data-testid={`${idPrefix}-panel`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 id={`${idPrefix}-title`} className="text-sm font-semibold text-gray-800">
          {t('committeeSessions.panel.title')}
        </h4>
        {canViewAgenda && upcoming && typeof onOpenAgenda === 'function' && (
          <button
            type="button"
            onClick={() => onOpenAgenda(upcoming.session.id)}
            className="text-xs font-semibold text-blue-700 hover:text-blue-800"
          >
            {t('committeeSessions.panel.openAgenda')}
          </button>
        )}
      </div>

      {opinionSession && (
        <p className="text-xs text-gray-600" data-testid={`${idPrefix}-opinion-session`}>
          {t('committeeSessions.panel.opinionRenderedInSession', { date: formatShortDate(opinionSession.startAt, language) })}
        </p>
      )}

      {representation && !upcoming && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
          {t('committeeSessions.panel.representationRequested', { date: formatShortDate(representation.session.startAt, language) })}
        </div>
      )}

      {upcoming ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 text-sm text-blue-900 space-y-2" data-testid={`${idPrefix}-upcoming`}>
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            {t('committeeSessions.panel.upcomingTitle', { number: upcoming.passageNumber })}
            <InvitationBadge record={invitationRecords[buildInvitationId(upcoming.session.id, upcoming.passage.id)]} />
          </p>
          <p>
            {formatSessionDay(upcoming.session.startAt, language)} · {formatSessionWindow(upcoming.session, language)}
            {upcoming.session.location && (
              <>
                {' · '}
                {/^https?:\/\//i.test(upcoming.session.location) ? (
                  <a href={upcoming.session.location} target="_blank" rel="noopener noreferrer" className="underline">
                    {t('committeeSessions.panel.joinLink')}
                  </a>
                ) : upcoming.session.location}
              </>
            )}
          </p>
          <p className="text-xs text-blue-800">
            {t('committeeSessions.panel.indicativeTime', {
              time: formatTime(upcoming.startAt, language),
              position: upcoming.number,
              total: upcoming.session.agenda.length,
              minutes: upcoming.passage.minutes
            })}
          </p>
          {upcoming.passage.guests.length > 0 && (
            <p className="text-xs text-blue-800">
              {t('committeeSessions.panel.guests', { guests: upcoming.passage.guests.join(', ') })}
            </p>
          )}
          {timeRequest && (
            <p className="text-xs text-blue-800">
              {t(`committeeSessions.panel.timeRequest.${timeRequest.status}`, { minutes: timeRequest.minutes })}
            </p>
          )}

          {canBook && (
            <div className="flex flex-wrap gap-2 pt-1">
              {moveTargets.length > 0 && (
                <span className="inline-flex flex-wrap items-center gap-2">
                  <label htmlFor={`${idPrefix}-move`} className="sr-only">{t('committeeSessions.panel.moveLabel')}</label>
                  <select
                    id={`${idPrefix}-move`}
                    value={moveTargetId}
                    onChange={(event) => setMoveTargetId(event.target.value)}
                    className="rounded-lg border border-blue-200 bg-white px-2 py-1 text-xs text-gray-800"
                  >
                    <option value="">{t('committeeSessions.panel.movePlaceholder')}</option>
                    {moveTargets.map((session) => (
                      <option key={session.id} value={session.id}>{renderSessionOption(session)}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!moveTargetId || isBusy}
                    onClick={handleMove}
                    className="rounded-lg border border-blue-300 bg-white px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                  >
                    {t('committeeSessions.panel.moveButton')}
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsGuestEditorOpen((value) => !value)}
                aria-expanded={isGuestEditorOpen}
                className="rounded-lg border border-blue-300 bg-white px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                {t('committeeSessions.panel.editGuests')}
              </button>
              {!(timeRequest && timeRequest.status === TIME_REQUEST_PENDING) && (
                <button
                  type="button"
                  onClick={() => setIsRequestOpen((value) => !value)}
                  aria-expanded={isRequestOpen}
                  className="rounded-lg border border-blue-300 bg-white px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                  {t('committeeSessions.panel.requestTime')}
                </button>
              )}
              <button
                type="button"
                disabled={isBusy}
                onClick={handleUnbook}
                className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {t('committeeSessions.panel.unbook')}
              </button>
            </div>
          )}

          {canBook && isGuestEditorOpen && (
            <div className="rounded-lg border border-blue-200 bg-white p-2">
              <PeoplePicker
                id={`${idPrefix}-guests-edit`}
                value={upcoming.passage.guests}
                ariaLabel={t('committeeSessions.panel.guestsLabel')}
                placeholder={t('committeeSessions.panel.guestsPlaceholder')}
                context="committee-session-guest"
                requestSiteAccess={false}
                onChange={(next) => run(() => onRunAction(upcoming.session.id, { type: 'setGuests', passageId: upcoming.passage.id, guests: next }), 'guestsSaved')}
              />
            </div>
          )}

          {canBook && isRequestOpen && (
            <form onSubmit={handleRequestTime} className="rounded-lg border border-blue-200 bg-white p-3 space-y-2 text-gray-800">
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor={`${idPrefix}-request-minutes`} className="text-xs font-medium text-gray-700">
                  {t('committeeSessions.panel.requestMinutesLabel')}
                </label>
                <input
                  id={`${idPrefix}-request-minutes`}
                  type="number"
                  min="5"
                  step="5"
                  value={requestMinutes}
                  placeholder={String(defaultRequestMinutes)}
                  onChange={(event) => setRequestMinutes(event.target.value)}
                  className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
              <label htmlFor={`${idPrefix}-request-note`} className="block text-xs font-medium text-gray-700">
                {t('committeeSessions.panel.requestNoteLabel')}
              </label>
              <textarea
                id={`${idPrefix}-request-note`}
                value={requestNote}
                onChange={(event) => setRequestNote(event.target.value)}
                required
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm"
              />
              <button
                type="submit"
                disabled={isBusy || !requestNote.trim()}
                className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {t('committeeSessions.panel.requestSubmit')}
              </button>
            </form>
          )}
        </div>
      ) : isDeferred ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-xs text-gray-700">
          {t('committeeSessions.panel.deferred')}
        </p>
      ) : canBook ? (
        bookableSessions.length > 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-3 space-y-2" data-testid={`${idPrefix}-booking`}>
            <label htmlFor={`${idPrefix}-select`} className="block text-xs font-medium text-gray-700">
              {t('committeeSessions.panel.chooseSession')}
            </label>
            <select
              id={`${idPrefix}-select`}
              value={selectedSessionId || bookableSessions[0].id}
              onChange={(event) => setSelectedSessionId(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-800"
            >
              {bookableSessions.map((session) => (
                <option key={session.id} value={session.id}>{renderSessionOption(session)}</option>
              ))}
            </select>
            <p className="text-xs text-gray-600">{t('committeeSessions.panel.wholeSessionHint')}</p>
            <PeoplePicker
              id={`${idPrefix}-guests`}
              value={guests}
              onChange={setGuests}
              ariaLabel={t('committeeSessions.panel.guestsLabel')}
              placeholder={t('committeeSessions.panel.guestsPlaceholder')}
              context="committee-session-guest"
              requestSiteAccess={false}
            />
            <button
              type="button"
              disabled={isBusy}
              onClick={handleBook}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {t('committeeSessions.panel.bookButton')}
            </button>
          </div>
        ) : (
          <p className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
            {t('committeeSessions.panel.noSession')}
          </p>
        )
      ) : passages.length === 0 ? (
        <p className="text-xs text-gray-500">{t('committeeSessions.panel.notRegistered')}</p>
      ) : null}

      {feedback && (
        <p
          role={feedback.tone === 'error' ? 'alert' : 'status'}
          className={`text-xs ${feedback.tone === 'error' ? 'text-red-700' : 'text-emerald-700'}`}
        >
          {feedback.message}
        </p>
      )}

      {currentPassage && (
        <CommitteeAttendance
          idPrefix={`${idPrefix}-current`}
          label={t('committeeSessions.attendance.sessionLabel', { date: formatShortDate(currentPassage.session.startAt, language) })}
          members={members}
          chairs={chairs}
          attendance={getPassageAttendance(currentPassage.session, currentPassage.passage)}
          onChange={isChair
            ? (email, state) => run(() => onRunAction(currentPassage.session.id, {
              type: 'setPassageAttendance',
              passageId: currentPassage.passage.id,
              email,
              state
            }), 'attendanceSaved')
            : undefined}
        />
      )}

      {isChair && currentPassage && !currentPassage.passage.representationRequest && !upcoming && (
        <button
          type="button"
          onClick={() => run(() => onRunAction(currentPassage.session.id, { type: 'requestRepresentation', passageId: currentPassage.passage.id }), 'representationRequested')}
          className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-50"
        >
          {t('committeeSessions.panel.requestRepresentation')}
        </button>
      )}

      {pastPassages.length > 0 && (
        <details className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" data-testid={`${idPrefix}-history`}>
          <summary className="cursor-pointer text-xs font-semibold text-gray-700">
            {t('committeeSessions.panel.historyTitle', { count: pastPassages.length })}
          </summary>
          <ol className="mt-2 space-y-3">
            {pastPassages.slice().reverse().map((entry) => {
              const outcome = sessionOutcomes[entry.session.id];
              return (
                <li key={entry.passage.id} className="space-y-1">
                  <p className="text-xs font-semibold text-gray-800">
                    {t('committeeSessions.panel.historyEntry', {
                      number: entry.passageNumber,
                      date: formatShortDate(entry.session.startAt, language)
                    })}
                  </p>
                  {outcome ? (
                    <p className="text-xs text-gray-700">
                      <span className="font-medium">
                        {typeof renderStatusLabel === 'function' ? renderStatusLabel(outcome.status) : outcome.status}
                      </span>
                      {outcome.comment ? ` — ${outcome.comment.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}` : ''}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">{t('committeeSessions.panel.noOutcome')}</p>
                  )}
                  <CommitteeAttendance
                    idPrefix={`${idPrefix}-history-${entry.passage.id}`}
                    label={t('committeeSessions.attendance.label')}
                    members={members}
                    chairs={chairs}
                    attendance={getPassageAttendance(entry.session, entry.passage)}
                  />
                </li>
              );
            })}
          </ol>
        </details>
      )}
    </section>
  );
};
