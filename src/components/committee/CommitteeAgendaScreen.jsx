import React, { useEffect, useMemo, useState } from '../../react.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { CommitteeAttendance } from './CommitteeAttendance.jsx';
import { InvitationBadge } from './InvitationBadge.jsx';
import { buildInvitationId } from '../../utils/committeeInvitations.js';
import {
  PASSAGE_KIND_TOPIC,
  MIN_PASSAGE_MINUTES,
  PASSAGE_STEP_MINUTES,
  SESSION_STATUS_CANCELLED,
  TIME_REQUEST_PENDING,
  buildSessionTimeline,
  getAllocatedMinutes,
  getCommitteeChairEmails,
  getCommitteeDefaultPassageMinutes,
  getCommitteeMemberEmails,
  getPassageAttendance,
  getRemainingMinutes,
  isSessionPast
} from '../../utils/committeeSessions.js';
import { getProjectCompliancePerimeters } from '../../utils/projectValidationStatus.js';
import { normalizeTeamContacts } from '../../utils/teamContacts.js';
import { resolveLocalizedText } from '../../utils/localizedContent.js';
import { formatSessionDay, formatSessionWindow, formatTime, getDisplayNameFromEmail } from './committeeFormat.js';

const STATUS_LABEL_KEYS = {
  validated: 'synthesisReport.statusValidated',
  validated_with_conditions: 'synthesisReport.statusValidatedWithConditions',
  pending_information: 'synthesisReport.statusPendingInformation',
  not_concerned: 'synthesisReport.statusNotConcerned',
  rejected: 'synthesisReport.statusRejected'
};

const STATUS_CLASSES = {
  validated: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  validated_with_conditions: 'border-amber-200 bg-amber-50 text-amber-800',
  pending_information: 'border-blue-200 bg-blue-50 text-blue-800',
  not_concerned: 'border-gray-200 bg-gray-50 text-gray-700',
  rejected: 'border-red-200 bg-red-50 text-red-800'
};

const useNow = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  return now;
};

// Page « Ordre du jour » d'une séance (spec §7) : ce que le président a sous les yeux pour
// animer la séance — l'ordre et les horaires, le passage en cours, la vitrine et les enjeux de
// chaque projet en un clic, les experts déclenchés, les présences. Les membres la voient sans
// les commandes.
export const CommitteeAgendaScreen = ({
  session,
  committee,
  sessions = [],
  projects = [],
  teams = [],
  validationCommitteeConfig,
  candidateProjects = [],
  invitationRecords = {},
  isChair = false,
  canView = false,
  onRunAction,
  onMovePassage,
  onOpenSynthesis,
  onOpenShowcase,
  onBack
}) => {
  const { t, language } = useTranslation();
  const now = useNow();
  const [feedback, setFeedback] = useState(null);
  const [minutesDrafts, setMinutesDrafts] = useState({});
  const [moveTargets, setMoveTargets] = useState({});
  const [candidateId, setCandidateId] = useState('');
  const [topicDraft, setTopicDraft] = useState({ title: '', minutes: '10', presenter: '', note: '' });

  const members = useMemo(() => getCommitteeMemberEmails(committee), [committee]);
  const chairs = useMemo(() => getCommitteeChairEmails(committee), [committee]);
  const projectsById = useMemo(
    () => new Map(projects.filter(Boolean).map((project) => [project.id, project])),
    [projects]
  );

  if (!session || !canView) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-700" role="alert">
          {session ? t('committeeSessions.agenda.forbidden') : t('committeeSessions.agenda.notFound')}
        </p>
        {typeof onBack === 'function' && (
          <button type="button" onClick={onBack} className="mt-4 text-sm font-semibold text-blue-700 hover:text-blue-800">
            {t('committeeSessions.agenda.back')}
          </button>
        )}
      </div>
    );
  }

  const timeline = buildSessionTimeline(session);
  const allocated = getAllocatedMinutes(session);
  const remaining = getRemainingMinutes(session);
  const isCancelled = session.status === SESSION_STATUS_CANCELLED;
  const otherSessions = sessions.filter((entry) => entry.committeeId === session.committeeId
    && entry.id !== session.id
    && entry.status !== SESSION_STATUS_CANCELLED
    && !isSessionPast(entry, now));
  const bookedProjectIds = new Set(session.agenda.map((passage) => passage.projectId));
  const availableCandidates = candidateProjects.filter((project) => !bookedProjectIds.has(project.id));

  const run = async (action, successKey, { confirmOverrun = true } = {}) => {
    setFeedback(null);
    let result = await onRunAction(session.id, action);
    if (!result?.ok && result?.error === 'overrun' && confirmOverrun && typeof window !== 'undefined'
      && window.confirm(t('committeeSessions.agenda.overrunConfirm', { minutes: result.overrunMinutes }))) {
      result = await onRunAction(session.id, { ...action, allowOverrun: true });
    }
    if (result?.ok) {
      setFeedback({ tone: 'success', message: t(`committeeSessions.agenda.feedback.${successKey}`) });
    } else if (result?.error !== 'overrun') {
      setFeedback({ tone: 'error', message: t(`committeeSessions.errors.${result?.error || 'generic'}`, { minutes: result?.overrunMinutes || 0 }) });
    }
    return result;
  };

  const renderExperts = (project) => {
    const perimeters = getProjectCompliancePerimeters(project, { teams, validationCommitteeConfig })
      .filter((perimeter) => perimeter.type === 'team');
    if (perimeters.length === 0) {
      return <p className="text-xs text-gray-500">{t('committeeSessions.agenda.noExperts')}</p>;
    }
    return (
      <ul className="flex flex-wrap gap-2" aria-label={t('committeeSessions.agenda.expertsLabel')}>
        {perimeters.map((perimeter) => {
          const team = teams.find((entry) => entry?.id === perimeter.id);
          const contacts = normalizeTeamContacts(team);
          const status = perimeter.status || '';
          return (
            <li
              key={perimeter.id}
              className={`rounded-lg border px-2 py-1 text-xs ${STATUS_CLASSES[status] || 'border-gray-200 bg-white text-gray-700'}`}
              title={contacts.join(', ')}
            >
              <span className="font-semibold">{resolveLocalizedText(team?.name, language) || perimeter.id}</span>
              {' · '}
              {status ? t(STATUS_LABEL_KEYS[status] || status) : t('committeeSessions.agenda.noOpinionYet')}
              {contacts.length > 0 && (
                <span className="block text-gray-600">{contacts.map(getDisplayNameFromEmail).join(', ')}</span>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6" data-testid="committee-agenda">
      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
        {typeof onBack === 'function' && (
          <button type="button" onClick={onBack} className="text-sm font-semibold text-blue-700 hover:text-blue-800">
            ← {t('committeeSessions.agenda.back')}
          </button>
        )}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{t('committeeSessions.agenda.eyebrow')}</p>
            <h1 className="text-2xl font-bold text-gray-900">{committee?.name || session.committeeId}</h1>
            <p className="mt-1 text-sm text-gray-700">
              {formatSessionDay(session.startAt, language)} · {formatSessionWindow(session, language)}
            </p>
            {session.location && (
              <p className="mt-1 text-sm">
                {/^https?:\/\//i.test(session.location) ? (
                  <a href={session.location} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 underline">
                    {t('committeeSessions.panel.joinLink')}
                  </a>
                ) : (
                  <span className="text-gray-700">{session.location}</span>
                )}
              </p>
            )}
          </div>
          <div className="text-right text-sm">
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
              {t(`committeeSessions.status.${session.status}`)}
            </span>
            <p className="mt-2 text-gray-700">
              {t('committeeSessions.agenda.timeAllocated', { allocated, duration: session.durationMinutes })}
            </p>
            <p className={`text-xs ${remaining < 0 ? 'text-red-700 font-semibold' : 'text-gray-500'}`}>
              {remaining < 0
                ? t('committeeSessions.agenda.overrun', { minutes: -remaining })
                : t('committeeSessions.agenda.remaining', { minutes: remaining })}
            </p>
          </div>
        </div>
        {isCancelled && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="status">
            {t('committeeSessions.agenda.cancelledBanner')}
          </p>
        )}
        {isChair && session.status === 'published' && !isSessionPast(session, now) && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined'
                  && !window.confirm(t('committeeSessions.planner.cancelConfirm', { count: session.agenda.filter((passage) => passage.kind !== PASSAGE_KIND_TOPIC).length }))) {
                  return;
                }
                run({ type: 'cancel' }, 'sessionCancelled');
              }}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
            >
              {t('committeeSessions.planner.cancel')}
            </button>
          </div>
        )}
        {feedback && (
          <p role={feedback.tone === 'error' ? 'alert' : 'status'} className={`text-sm ${feedback.tone === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>
            {feedback.message}
          </p>
        )}
      </header>

      <section className="space-y-3" aria-labelledby="committee-agenda-passages">
        <h2 id="committee-agenda-passages" className="text-lg font-semibold text-gray-800">
          {t('committeeSessions.agenda.passagesTitle', { count: timeline.length })}
        </h2>
        {timeline.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600">
            {t('committeeSessions.agenda.empty')}
          </p>
        )}
        <ol className="space-y-3">
          {timeline.map(({ passage, number, startAt, endAt }) => {
            const isTopic = passage.kind === PASSAGE_KIND_TOPIC;
            const project = isTopic ? null : projectsById.get(passage.projectId);
            const isCurrent = new Date(startAt) <= now && now < new Date(endAt);
            const pendingRequest = passage.timeRequest?.status === TIME_REQUEST_PENDING ? passage.timeRequest : null;
            const minutesDraft = minutesDrafts[passage.id] ?? String(passage.minutes);
            return (
              <li
                key={passage.id}
                className={`rounded-xl border bg-white p-4 shadow-sm space-y-3 ${isCurrent ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-200'}`}
                data-testid="committee-agenda-passage"
                aria-current={isCurrent ? 'step' : undefined}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-500">
                      {number}. {formatTime(startAt, language)} – {formatTime(endAt, language)} · {t('committeeSessions.agenda.minutes', { minutes: passage.minutes })}
                      {isCurrent && (
                        <span className="ml-2 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
                          {t('committeeSessions.agenda.current')}
                        </span>
                      )}
                    </p>
                    {isTopic && (
                      <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-800">
                        {t('committeeSessions.agenda.topicBadge')}
                      </span>
                    )}
                    <h3 className="text-base font-semibold text-gray-900">
                      {isTopic ? passage.title : project?.projectName || t('committeeSessions.agenda.unknownProject')}
                    </h3>
                    {isTopic && (passage.presenter || passage.note) && (
                      <p className="text-xs text-gray-600">
                        {passage.presenter && t('committeeSessions.agenda.topicPresenter', { presenter: passage.presenter })}
                        {passage.presenter && passage.note && ' · '}
                        {passage.note}
                      </p>
                    )}
                    {!isTopic && <InvitationBadge record={invitationRecords[buildInvitationId(session.id, passage.id)]} />}
                    {project?.ownerEmail && (
                      <p className="text-xs text-gray-600">
                        {t('committeeSessions.agenda.owner', { owner: getDisplayNameFromEmail(project.ownerEmail) })}
                        {passage.guests.length > 0 && ` · ${t('committeeSessions.panel.guests', { guests: passage.guests.map(getDisplayNameFromEmail).join(', ') })}`}
                      </p>
                    )}
                  </div>
                  {project && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenShowcase(project.id)}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        {t('committeeSessions.agenda.openShowcase')}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenSynthesis(project.id)}
                        className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        {t('committeeSessions.agenda.openSynthesis')}
                      </button>
                    </div>
                  )}
                </div>

                {project && renderExperts(project)}

                {pendingRequest && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <p className="font-semibold">{t('committeeSessions.agenda.timeRequest', { minutes: pendingRequest.minutes })}</p>
                    <p className="text-xs">{pendingRequest.note}</p>
                    {isChair && (
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => run({ type: 'decideTimeRequest', passageId: passage.id, accept: true }, 'requestAccepted')}
                          className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          {t('committeeSessions.agenda.accept')}
                        </button>
                        <button
                          type="button"
                          onClick={() => run({ type: 'decideTimeRequest', passageId: passage.id, accept: false }, 'requestRefused')}
                          className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                        >
                          {t('committeeSessions.agenda.refuse')}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {isChair && !isCancelled && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                    <button
                      type="button"
                      onClick={() => run({ type: 'reorder', passageId: passage.id, direction: 'up' }, 'reordered')}
                      disabled={number === 1}
                      aria-label={t('committeeSessions.agenda.moveUp')}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => run({ type: 'reorder', passageId: passage.id, direction: 'down' }, 'reordered')}
                      disabled={number === timeline.length}
                      aria-label={t('committeeSessions.agenda.moveDown')}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-40"
                    >
                      ↓
                    </button>
                    <label htmlFor={`agenda-minutes-${passage.id}`} className="ml-2 text-xs text-gray-700">
                      {t('committeeSessions.agenda.durationLabel')}
                    </label>
                    <input
                      id={`agenda-minutes-${passage.id}`}
                      type="number"
                      min={MIN_PASSAGE_MINUTES}
                      step={PASSAGE_STEP_MINUTES}
                      value={minutesDraft}
                      onChange={(event) => setMinutesDrafts((prev) => ({ ...prev, [passage.id]: event.target.value }))}
                      className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-xs"
                    />
                    <button
                      type="button"
                      disabled={Number(minutesDraft) === passage.minutes}
                      onClick={() => run({ type: 'setMinutes', passageId: passage.id, minutes: Number(minutesDraft) }, 'minutesSaved')
                        .then(() => setMinutesDrafts((prev) => ({ ...prev, [passage.id]: undefined })))}
                      className="rounded-lg border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40"
                    >
                      {t('committeeSessions.agenda.applyDuration')}
                    </button>
                    {!isTopic && otherSessions.length > 0 && (
                      <>
                        <label htmlFor={`agenda-move-${passage.id}`} className="sr-only">{t('committeeSessions.panel.moveLabel')}</label>
                        <select
                          id={`agenda-move-${passage.id}`}
                          value={moveTargets[passage.id] || ''}
                          onChange={(event) => setMoveTargets((prev) => ({ ...prev, [passage.id]: event.target.value }))}
                          className="ml-2 rounded-lg border border-gray-300 px-2 py-1 text-xs"
                        >
                          <option value="">{t('committeeSessions.panel.movePlaceholder')}</option>
                          {otherSessions.map((entry) => (
                            <option key={entry.id} value={entry.id}>
                              {formatSessionDay(entry.startAt, language)} · {formatSessionWindow(entry, language)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!moveTargets[passage.id]}
                          onClick={async () => {
                            const result = await onMovePassage(session.id, passage.id, moveTargets[passage.id]);
                            setFeedback(result?.ok
                              ? { tone: 'success', message: t('committeeSessions.agenda.feedback.moved') }
                              : { tone: 'error', message: t(`committeeSessions.errors.${result?.error || 'generic'}`, { minutes: result?.overrunMinutes || 0 }) });
                          }}
                          className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                        >
                          {t('committeeSessions.panel.moveButton')}
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (isTopic) {
                          if (typeof window === 'undefined' || window.confirm(t('committeeSessions.agenda.removeTopicConfirm'))) {
                            run({ type: 'unbook', passageId: passage.id }, 'topicRemoved');
                          }
                          return;
                        }
                        const reason = typeof window !== 'undefined' ? window.prompt(t('committeeSessions.agenda.cancelReasonPrompt')) : '';
                        if (reason === null || !String(reason).trim()) {
                          return;
                        }
                        run({ type: 'unbook', passageId: passage.id, reason: String(reason).trim() }, 'cancelled');
                      }}
                      className="ml-auto rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      {isTopic ? t('committeeSessions.agenda.removeTopic') : t('committeeSessions.agenda.cancelPassage')}
                    </button>
                  </div>
                )}

                {!isTopic && (isChair || Object.keys(passage.attendanceOverride).length > 0) && (
                  <CommitteeAttendance
                    idPrefix={`agenda-passage-${passage.id}`}
                    label={t('committeeSessions.attendance.passageLabel')}
                    members={members}
                    chairs={chairs}
                    attendance={getPassageAttendance(session, passage)}
                    onChange={isChair
                      ? (email, state) => run({ type: 'setPassageAttendance', passageId: passage.id, email, state }, 'attendanceSaved')
                      : undefined}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {isChair && !isCancelled && (
        <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-2" aria-labelledby="committee-agenda-add">
          <h2 id="committee-agenda-add" className="text-sm font-semibold text-gray-800">{t('committeeSessions.agenda.addTitle')}</h2>
          {availableCandidates.length === 0 ? (
            <p className="text-xs text-gray-500">{t('committeeSessions.agenda.noCandidate')}</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="committee-agenda-candidate" className="sr-only">{t('committeeSessions.agenda.addTitle')}</label>
              <select
                id="committee-agenda-candidate"
                value={candidateId}
                onChange={(event) => setCandidateId(event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm"
              >
                <option value="">{t('committeeSessions.agenda.candidatePlaceholder')}</option>
                {availableCandidates.map((project) => (
                  <option key={project.id} value={project.id}>{project.projectName || project.id}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={!candidateId}
                onClick={() => run({
                  type: 'book',
                  projectId: candidateId,
                  minutes: getCommitteeDefaultPassageMinutes(committee)
                }, 'booked').then((result) => {
                  if (result?.ok) {
                    setCandidateId('');
                  }
                })}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {t('committeeSessions.agenda.addButton')}
              </button>
            </div>
          )}
        </section>
      )}

      {isChair && !isCancelled && (
        <form
          className="rounded-xl border border-gray-200 bg-white p-4 space-y-3"
          aria-labelledby="committee-agenda-topic"
          data-testid="committee-agenda-topic-form"
          onSubmit={(event) => {
            event.preventDefault();
            run({
              type: 'addTopic',
              title: topicDraft.title,
              minutes: Number(topicDraft.minutes) || MIN_PASSAGE_MINUTES,
              presenter: topicDraft.presenter,
              note: topicDraft.note
            }, 'topicAdded').then((result) => {
              if (result?.ok) {
                setTopicDraft({ title: '', minutes: '10', presenter: '', note: '' });
              }
            });
          }}
        >
          <div>
            <h2 id="committee-agenda-topic" className="text-sm font-semibold text-gray-800">{t('committeeSessions.agenda.topicTitle')}</h2>
            <p className="text-xs text-gray-500">{t('committeeSessions.agenda.topicHint')}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label htmlFor="committee-agenda-topic-title" className="block text-xs font-medium text-gray-700 mb-1">{t('committeeSessions.agenda.topicLabel')}</label>
              <input
                id="committee-agenda-topic-title"
                type="text"
                required
                value={topicDraft.title}
                onChange={(event) => setTopicDraft((prev) => ({ ...prev, title: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label htmlFor="committee-agenda-topic-presenter" className="block text-xs font-medium text-gray-700 mb-1">{t('committeeSessions.agenda.topicPresenterLabel')}</label>
              <input
                id="committee-agenda-topic-presenter"
                type="text"
                value={topicDraft.presenter}
                onChange={(event) => setTopicDraft((prev) => ({ ...prev, presenter: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label htmlFor="committee-agenda-topic-minutes" className="block text-xs font-medium text-gray-700 mb-1">{t('committeeSessions.agenda.durationLabel')}</label>
              <input
                id="committee-agenda-topic-minutes"
                type="number"
                min={MIN_PASSAGE_MINUTES}
                step={PASSAGE_STEP_MINUTES}
                value={topicDraft.minutes}
                onChange={(event) => setTopicDraft((prev) => ({ ...prev, minutes: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="sm:col-span-4">
              <label htmlFor="committee-agenda-topic-note" className="block text-xs font-medium text-gray-700 mb-1">{t('committeeSessions.agenda.topicNoteLabel')}</label>
              <input
                id="committee-agenda-topic-note"
                type="text"
                value={topicDraft.note}
                onChange={(event) => setTopicDraft((prev) => ({ ...prev, note: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={!topicDraft.title.trim()}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {t('committeeSessions.agenda.topicButton')}
          </button>
        </form>
      )}

      <section aria-labelledby="committee-agenda-attendance" className="space-y-2">
        <h2 id="committee-agenda-attendance" className="text-lg font-semibold text-gray-800">{t('committeeSessions.attendance.label')}</h2>
        <CommitteeAttendance
          idPrefix="agenda-session"
          label={t('committeeSessions.attendance.wholeSession')}
          members={members}
          chairs={chairs}
          attendance={session.attendance}
          defaultExpanded={isChair}
          onChange={isChair ? (email, state) => run({ type: 'setAttendance', email, state }, 'attendanceSaved') : undefined}
          onSetAll={isChair ? (state) => run({ type: 'setAttendance', emails: members, state }, 'attendanceSaved') : undefined}
        />
        {!isChair && Object.keys(session.attendance).length === 0 && (
          <p className="text-xs text-gray-500">{t('committeeSessions.attendance.notRecorded')}</p>
        )}
      </section>
    </div>
  );
};

export default CommitteeAgendaScreen;
