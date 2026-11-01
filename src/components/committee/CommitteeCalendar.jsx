import React, { useMemo, useState } from '../../react.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { getLocaleTag } from '../../i18n/languages.js';
import {
  DEFAULT_SESSION_MINUTES,
  PASSAGE_KIND_TOPIC,
  SESSION_STATUS_CANCELLED,
  SESSION_STATUS_DRAFT,
  SESSION_STATUS_PUBLISHED,
  buildDraftSessions,
  buildSessionTimeline,
  getAllocatedMinutes,
  getRemainingMinutes,
  isSessionPast
} from '../../utils/committeeSessions.js';
import {
  buildMonthGrid,
  fromDayKey,
  getCommitteeColor,
  getMonthOf,
  groupSessionsByDay,
  pickInitialDay,
  shiftMonth,
  toDayKey
} from '../../utils/committeeCalendar.js';
import {
  formatSessionDay,
  formatSessionWindow,
  formatTime,
  getDisplayNameFromEmail,
  fromDateTimeLocalValue,
  toDateTimeLocalValue
} from './committeeFormat.js';

const MAX_PILLS_PER_DAY = 2;

const statusClass = (status) => {
  if (status === SESSION_STATUS_PUBLISHED) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }
  if (status === SESSION_STATUS_CANCELLED) {
    return 'border-red-200 bg-red-50 text-red-700';
  }
  return 'border-gray-300 bg-gray-50 text-gray-700';
};

const capitalize = (label) => label.charAt(0).toUpperCase() + label.slice(1);

const formatMonthLabel = (month, language) => capitalize(
  new Intl.DateTimeFormat(getLocaleTag(language), { month: 'long', year: 'numeric' })
    .format(new Date(month.year, month.month, 1))
);

const getWeekdayLabels = (language) => {
  const formatter = new Intl.DateTimeFormat(getLocaleTag(language), { weekday: 'short' });
  // 5 janvier 2026 est un lundi.
  return Array.from({ length: 7 }, (_, index) => formatter.format(new Date(2026, 0, 5 + index)));
};

// Création d'une séance en brouillon à la date cliquée : seul le comité, l'heure, la durée et le
// lieu restent à saisir. La séance n'ouvre les inscriptions qu'une fois publiée.
const PlanOnDayForm = ({ dayKey, committees, sessions, onCreate }) => {
  const { t } = useTranslation();
  const [committeeId, setCommitteeId] = useState(committees[0]?.id || '');
  const [time, setTime] = useState('14:00');
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_SESSION_MINUTES);
  const selectedId = committees.some((committee) => committee.id === committeeId) ? committeeId : (committees[0]?.id || '');
  const day = fromDayKey(dayKey);
  const [hours, minutes] = time.split(':').map(Number);
  const startAt = day && Number.isFinite(hours) && Number.isFinite(minutes)
    ? new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes).toISOString()
    : '';
  const drafts = startAt
    ? buildDraftSessions({
      committeeId: selectedId,
      dates: [startAt],
      durationMinutes,
      existingSessions: sessions.filter((session) => session.committeeId === selectedId)
    })
    : [];
  const fieldClass = 'w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm';
  const idPrefix = `committee-plan-${dayKey}`;

  return (
    <div className="space-y-3" data-testid="committee-plan-here">
      <p className="text-sm font-semibold text-gray-800">{t('committeeSessions.calendar.planHere')}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {committees.length > 1 && (
          <div className="sm:col-span-2">
            <label htmlFor={`${idPrefix}-committee`} className="mb-1 block text-xs font-medium text-gray-700">{t('committeeSessions.calendar.generatorCommittee')}</label>
            <select id={`${idPrefix}-committee`} value={selectedId} onChange={(event) => setCommitteeId(event.target.value)} className={fieldClass}>
              {committees.map((committee) => (
                <option key={committee.id} value={committee.id}>{committee.name || committee.id}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label htmlFor={`${idPrefix}-time`} className="mb-1 block text-xs font-medium text-gray-700">{t('committeeSessions.planner.time')}</label>
          <input id={`${idPrefix}-time`} type="time" value={time} onChange={(event) => setTime(event.target.value)} className={fieldClass} />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-duration`} className="mb-1 block text-xs font-medium text-gray-700">{t('committeeSessions.planner.duration')}</label>
          <input
            id={`${idPrefix}-duration`}
            type="number"
            min="10"
            step="5"
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(Number(event.target.value))}
            className={fieldClass}
          />
        </div>
        <p className="sm:col-span-2 text-xs text-gray-600">{t('committeeSessions.planner.teamsHint')}</p>
      </div>
      <button
        type="button"
        disabled={drafts.length === 0}
        onClick={() => onCreate(drafts)}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {t('committeeSessions.calendar.planButton')}
      </button>
      {drafts.length === 0 && startAt && (
        <p className="text-xs text-gray-500">{t('committeeSessions.calendar.planDuplicate')}</p>
      )}
    </div>
  );
};

// Calendrier des séances de tous les comités (vue mensuelle, centrée sur aujourd'hui). Un clic sur
// un jour affiche, à côté, l'ordre du jour de chaque séance de ce jour ; le président, le
// co-président et les administrateurs y publient, modifient ou annulent la séance.
export const CommitteeCalendar = ({
  committees = [],
  sessions = [],
  projects = [],
  canManageCommittee = () => false,
  unbookedByCommittee = {},
  unbookedProjectsByCommittee = {},
  onRunAction,
  onDeleteDraft,
  onOpenAgenda,
  onCreateSessions,
  focusSession = null
}) => {
  const { t, language } = useTranslation();
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => getMonthOf(today));
  const [hiddenIds, setHiddenIds] = useState([]);
  const [selectedDay, setSelectedDay] = useState(() => pickInitialDay(
    groupSessionsByDay(sessions),
    getMonthOf(today),
    today
  ));
  const [drafts, setDrafts] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [handledFocusId, setHandledFocusId] = useState('');

  if (focusSession?.id && focusSession.id !== handledFocusId) {
    const date = new Date(focusSession.startAt);
    if (!Number.isNaN(date.getTime())) {
      setHandledFocusId(focusSession.id);
      setMonth(getMonthOf(date));
      setSelectedDay(toDayKey(date));
    }
  }

  const committeesById = useMemo(() => Object.fromEntries(committees.map((committee) => [committee.id, committee])), [committees]);
  const projectsById = useMemo(() => Object.fromEntries((Array.isArray(projects) ? projects : []).map((project) => [project.id, project])), [projects]);
  const visibleSessions = useMemo(
    () => sessions.filter((session) => committeesById[session.committeeId] && !hiddenIds.includes(session.committeeId)),
    [committeesById, hiddenIds, sessions]
  );
  const sessionsByDay = useMemo(() => groupSessionsByDay(visibleSessions), [visibleSessions]);
  const weeks = useMemo(() => buildMonthGrid(month, today), [month, today]);
  const weekdayLabels = useMemo(() => getWeekdayLabels(language), [language]);
  const todayKey = toDayKey(today);
  const selectedSessions = selectedDay ? (sessionsByDay[selectedDay] || []) : [];
  const selectedDate = selectedDay ? fromDayKey(selectedDay) : null;
  const monthSessionCount = weeks.flat().filter((day) => day.inMonth)
    .reduce((total, day) => total + (sessionsByDay[day.key]?.length || 0), 0);

  const toggleCommittee = (committeeId) => setHiddenIds((prev) => (
    prev.includes(committeeId) ? prev.filter((id) => id !== committeeId) : [...prev, committeeId]
  ));

  const goToToday = () => {
    setMonth(getMonthOf(today));
    setSelectedDay(todayKey);
  };

  const report = (result, successKey) => {
    setFeedback(result?.ok
      ? { tone: 'success', message: t(`committeeSessions.planner.feedback.${successKey}`) }
      : { tone: 'error', message: t(`committeeSessions.errors.${result?.error || 'generic'}`, { minutes: result?.overrunMinutes || 0 }) });
    return result;
  };

  const runWithOverrun = async (sessionId, action, successKey) => {
    let result = await onRunAction(sessionId, action);
    if (!result?.ok && result?.error === 'overrun' && typeof window !== 'undefined'
      && window.confirm(t('committeeSessions.agenda.overrunConfirm', { minutes: result.overrunMinutes }))) {
      result = await onRunAction(sessionId, { ...action, allowOverrun: true });
    }
    return report(result, successKey);
  };

  const commitDraft = (session) => {
    const draft = drafts[session.id];
    if (!draft) {
      return;
    }
    const patch = {};
    if (draft.startAt !== undefined) {
      patch.startAt = fromDateTimeLocalValue(draft.startAt);
    }
    if (draft.durationMinutes !== undefined) {
      patch.durationMinutes = Number(draft.durationMinutes);
    }
    runWithOverrun(session.id, { type: 'update', patch }, 'updated').then((result) => {
      if (result?.ok) {
        setDrafts((prev) => ({ ...prev, [session.id]: undefined }));
      }
    });
  };

  const getPassageTitle = (passage) => {
    if (passage.kind === PASSAGE_KIND_TOPIC) {
      return passage.title;
    }
    const project = projectsById[passage.projectId];
    return project?.projectName || t('committeeSessions.agenda.unknownProject');
  };

  const renderSession = (session) => {
    const committee = committeesById[session.committeeId];
    const color = getCommitteeColor(committees, session.committeeId);
    const canManage = canManageCommittee(committee);
    const isPast = isSessionPast(session, today);
    const isCancelled = session.status === SESSION_STATUS_CANCELLED;
    const isEditable = canManage && !isCancelled && !isPast;
    const timeline = buildSessionTimeline(session);
    const projectCount = session.agenda.filter((passage) => passage.kind !== PASSAGE_KIND_TOPIC).length;
    const allocated = getAllocatedMinutes(session);
    const remaining = Math.max(0, getRemainingMinutes(session));
    const fill = Math.min(100, Math.round((allocated / Math.max(1, session.durationMinutes)) * 100));
    const draft = drafts[session.id] || {};
    const idPrefix = `committee-calendar-${session.id}`;

    return (
      <article
        key={session.id}
        className="overflow-hidden rounded-xl border border-gray-200 bg-white"
        style={{ borderLeft: `4px solid ${color.solid}`, opacity: isCancelled ? 0.75 : 1 }}
        data-testid="committee-planner-session"
      >
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: color.ink }}>
                {committee?.name || committee?.id}
              </p>
              <p className={`text-base font-semibold text-gray-900 ${isCancelled ? 'line-through' : ''}`}>
                {formatSessionWindow(session, language)}
              </p>
            </div>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClass(session.status)}`}>
              {t(`committeeSessions.status.${session.status}`)}
            </span>
          </div>

          <div>
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100" role="presentation">
              <div className="h-full rounded-full" style={{ width: `${fill}%`, background: color.solid }} />
            </div>
            <p className="mt-1 text-xs text-gray-600">
              {t('committeeSessions.planner.sessionStats', { count: projectCount, allocated, remaining })}
            </p>
          </div>

          {timeline.length === 0 ? (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">{t('committeeSessions.calendar.emptyAgenda')}</p>
          ) : (
            <ol className="space-y-1.5" aria-label={t('committeeSessions.calendar.agendaLabel')}>
              {timeline.map((slot) => (
                <li key={slot.passage.id} className="flex items-baseline gap-2 text-sm">
                  <span className="w-12 shrink-0 text-xs font-semibold text-gray-500" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTime(slot.startAt, language)}</span>
                  <span className="min-w-0 flex-1 truncate text-gray-800">
                    {getPassageTitle(slot.passage)}
                    {slot.passage.kind === PASSAGE_KIND_TOPIC && (
                      <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{t('committeeSessions.calendar.topicBadge')}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-gray-500">{t('committeeSessions.calendar.minutes', { minutes: slot.passage.minutes })}</span>
                </li>
              ))}
            </ol>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenAgenda(session.id)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
              style={{ background: color.solid }}
            >
              {t('committeeSessions.calendar.openFullAgenda')}
            </button>
            {isEditable && session.status === SESSION_STATUS_DRAFT && (
              <>
                <button
                  type="button"
                  onClick={() => onRunAction(session.id, { type: 'publish' }).then((result) => report(result, 'published'))}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  {t('committeeSessions.planner.publish')}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteDraft(session.id).then((result) => report(result, 'deleted'))}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                >
                  {t('committeeSessions.planner.delete')}
                </button>
              </>
            )}
            {isEditable && session.status === SESSION_STATUS_PUBLISHED && (
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && !window.confirm(t('committeeSessions.planner.cancelConfirm', { count: projectCount }))) {
                    return;
                  }
                  onRunAction(session.id, { type: 'cancel' }).then((result) => report(result, 'cancelled'));
                }}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                {t('committeeSessions.planner.cancel')}
              </button>
            )}
          </div>

          {isEditable && (
            <details className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <summary className="cursor-pointer text-xs font-semibold text-gray-700">{t('committeeSessions.calendar.editSession')}</summary>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <div>
                  <label htmlFor={`${idPrefix}-start`} className="block text-xs text-gray-600">{t('committeeSessions.planner.startLabel')}</label>
                  <input
                    id={`${idPrefix}-start`}
                    type="datetime-local"
                    value={draft.startAt ?? toDateTimeLocalValue(session.startAt)}
                    onChange={(event) => setDrafts((prev) => ({ ...prev, [session.id]: { ...draft, startAt: event.target.value } }))}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor={`${idPrefix}-duration`} className="block text-xs text-gray-600">{t('committeeSessions.planner.duration')}</label>
                  <input
                    id={`${idPrefix}-duration`}
                    type="number"
                    min="10"
                    step="5"
                    value={draft.durationMinutes ?? session.durationMinutes}
                    onChange={(event) => setDrafts((prev) => ({ ...prev, [session.id]: { ...draft, durationMinutes: event.target.value } }))}
                    className="w-20 rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs"
                  />
                </div>
                <button
                  type="button"
                  disabled={!drafts[session.id]}
                  onClick={() => commitDraft(session)}
                  className="rounded-lg border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40"
                >
                  {t('committeeSessions.planner.save')}
                </button>
              </div>
            </details>
          )}
        </div>
      </article>
    );
  };

  const plannableCommittees = committees.filter((committee) => canManageCommittee(committee));
  const canPlanOnSelectedDay = typeof onCreateSessions === 'function'
    && plannableCommittees.length > 0
    && Boolean(selectedDate)
    && selectedDay >= todayKey;
  const planOnDay = canPlanOnSelectedDay ? (
    <PlanOnDayForm
      key={selectedDay}
      dayKey={selectedDay}
      committees={plannableCommittees}
      sessions={sessions}
      onCreate={(drafts) => onCreateSessions(drafts).then((result) => report(result, 'added'))}
    />
  ) : null;

  const unbookedTotal = committees.reduce((total, committee) => total + (unbookedByCommittee[committee.id] || 0), 0);
  const unbookedRows = committees.flatMap((committee) =>
    (unbookedProjectsByCommittee[committee.id] || []).map((project) => ({
      ...project,
      committeeName: committee.name || committee.id
    })));
  const unbookedSubmitted = unbookedRows.filter((row) => !row.isDraft);
  const unbookedDrafts = unbookedRows.filter((row) => row.isDraft);

  const renderUnbookedRow = (row) => (
    <li
      key={`${row.committeeName}-${row.id}`}
      className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-1.5 text-sm"
      data-testid="committee-unbooked-project"
    >
      {row.url ? (
        <a href={row.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 hover:underline">
          {row.name}
        </a>
      ) : (
        <span className="font-semibold text-gray-800">{row.name}</span>
      )}
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
        {t('committeeSessions.calendar.unbookedCommittee', { committee: row.committeeName })}
      </span>
      <span className="text-xs text-gray-600">
        {row.ownerEmail
          ? t('committeeSessions.calendar.unbookedOwner', { owner: getDisplayNameFromEmail(row.ownerEmail) })
          : t('committeeSessions.calendar.unbookedNoOwner')}
      </span>
    </li>
  );

  return (
    <section
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4"
      aria-labelledby="committee-calendar-title"
      data-testid="committee-calendar"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="committee-calendar-title" className="text-lg font-semibold text-gray-900">{t('committeeSessions.calendar.title')}</h3>
          <p className="text-xs text-gray-500">{t('committeeSessions.calendar.subtitle')}</p>
        </div>
        {unbookedTotal > 0 && (
          <p className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800" data-testid="committee-calendar-demand">
            {t('committeeSessions.calendar.unbooked', { count: unbookedTotal })}
            {` (${t('committeeSessions.calendar.unbookedSplit', { submitted: unbookedSubmitted.length, drafts: unbookedDrafts.length })})`}
          </p>
        )}
      </div>

      {unbookedRows.length > 0 && (
        <details className="rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-2" data-testid="committee-unbooked-details">
          <summary className="cursor-pointer text-sm font-semibold text-amber-900">
            {t('committeeSessions.calendar.unbookedListTitle')}
          </summary>
          <div className="mt-2 space-y-3">
            {unbookedSubmitted.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  {t('committeeSessions.calendar.unbookedSubmitted', { count: unbookedSubmitted.length })}
                </h4>
                <ul className="divide-y divide-amber-100">{unbookedSubmitted.map(renderUnbookedRow)}</ul>
              </div>
            )}
            {unbookedDrafts.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  {t('committeeSessions.calendar.unbookedDrafts', { count: unbookedDrafts.length })}
                </h4>
                <p className="text-xs text-gray-500">{t('committeeSessions.calendar.unbookedDraftsHint')}</p>
                <ul className="divide-y divide-amber-100">{unbookedDrafts.map(renderUnbookedRow)}</ul>
              </div>
            )}
          </div>
        </details>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMonth((prev) => shiftMonth(prev, -1))}
            aria-label={t('committeeSessions.calendar.previousMonth')}
            className="h-9 w-9 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            ‹
          </button>
          <h4 className="min-w-[10rem] text-center text-base font-semibold text-gray-900" aria-live="polite" data-testid="committee-calendar-month">
            {formatMonthLabel(month, language)}
          </h4>
          <button
            type="button"
            onClick={() => setMonth((prev) => shiftMonth(prev, 1))}
            aria-label={t('committeeSessions.calendar.nextMonth')}
            className="h-9 w-9 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            ›
          </button>
          <button
            type="button"
            onClick={goToToday}
            className="ml-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
          >
            {t('committeeSessions.calendar.today')}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('committeeSessions.calendar.legendLabel')}>
          {committees.map((committee) => {
            const color = getCommitteeColor(committees, committee.id);
            const isHidden = hiddenIds.includes(committee.id);
            return (
              <button
                key={committee.id}
                type="button"
                aria-pressed={!isHidden}
                onClick={() => toggleCommittee(committee.id)}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
                style={isHidden
                  ? { borderColor: '#d1d5db', background: '#fff', color: '#6b7280' }
                  : { borderColor: color.solid, background: color.soft, color: color.ink }}
              >
                <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: isHidden ? '#d1d5db' : color.solid }} />
                {committee.name || committee.id}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-7 gap-1" role="group" aria-label={formatMonthLabel(month, language)}>
            {weekdayLabels.map((label) => (
              <div key={label} aria-hidden="true" className="pb-1 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                {label}
              </div>
            ))}
            {weeks.flat().map((day) => {
              const daySessions = sessionsByDay[day.key] || [];
              const isSelected = selectedDay === day.key;
              const hasSessions = daySessions.length > 0;
              const label = `${formatSessionDay(day.date.toISOString(), language)}${hasSessions ? ` — ${t('committeeSessions.calendar.sessionCount', { count: daySessions.length })}` : ''}`;
              return (
                <button
                  key={day.key}
                  type="button"
                  aria-label={label}
                  aria-pressed={isSelected}
                  aria-current={day.isToday ? 'date' : undefined}
                  data-day={day.key}
                  onClick={() => setSelectedDay(day.key)}
                  className="flex flex-col items-stretch gap-1 rounded-lg border p-1.5 text-left transition-colors hover:border-blue-300"
                  style={{
                    minHeight: '5.25rem',
                    borderColor: isSelected ? '#2563eb' : (day.isToday ? '#93c5fd' : '#e5e7eb'),
                    background: isSelected ? '#eff6ff' : (day.inMonth ? '#ffffff' : '#f9fafb'),
                    boxShadow: isSelected ? '0 0 0 2px #bfdbfe' : 'none',
                    opacity: day.inMonth ? 1 : 0.55
                  }}
                >
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center self-start rounded-full text-xs font-semibold"
                    style={day.isToday
                      ? { background: '#2563eb', color: '#fff' }
                      : { color: day.inMonth ? '#374151' : '#9ca3af' }}
                  >
                    {day.dayOfMonth}
                  </span>
                  {daySessions.slice(0, MAX_PILLS_PER_DAY).map((session) => {
                    const color = getCommitteeColor(committees, session.committeeId);
                    const isCancelled = session.status === SESSION_STATUS_CANCELLED;
                    return (
                      <span
                        key={session.id}
                        title={committeesById[session.committeeId]?.name}
                        className="block truncate rounded px-1.5 py-0.5 text-xs font-semibold"
                        style={{
                          background: session.status === SESSION_STATUS_DRAFT ? '#fff' : color.soft,
                          color: color.ink,
                          border: `1px ${session.status === SESSION_STATUS_DRAFT ? 'dashed' : 'solid'} ${color.solid}`,
                          textDecoration: isCancelled ? 'line-through' : 'none',
                          opacity: isSessionPast(session, today) ? 0.65 : 1
                        }}
                      >
                        {formatTime(session.startAt, language)}
                      </span>
                    );
                  })}
                  {daySessions.length > MAX_PILLS_PER_DAY && (
                    <span className="text-xs font-semibold text-gray-500">+{daySessions.length - MAX_PILLS_PER_DAY}</span>
                  )}
                </button>
              );
            })}
          </div>
          {monthSessionCount === 0 && (
            <p className="mt-3 text-center text-xs text-gray-500">{t('committeeSessions.calendar.emptyMonth')}</p>
          )}
        </div>

        <aside className="space-y-3" aria-live="polite" aria-label={t('committeeSessions.calendar.dayPanelLabel')} data-testid="committee-calendar-day">
          {selectedDate ? (
            <>
              <h4 className="text-sm font-semibold text-gray-900">{capitalize(formatSessionDay(selectedDate.toISOString(), language))}</h4>
              {selectedSessions.length === 0 ? (
                <>
                  <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                    {t('committeeSessions.calendar.noSessionThisDay')}
                  </p>
                  {planOnDay && <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">{planOnDay}</div>}
                </>
              ) : (
                <>
                  {selectedSessions.map(renderSession)}
                  {planOnDay && (
                    <details className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                      <summary className="cursor-pointer text-xs font-semibold text-blue-800">{t('committeeSessions.calendar.planAnother')}</summary>
                      <div className="mt-3">{planOnDay}</div>
                    </details>
                  )}
                </>
              )}
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
              {t('committeeSessions.calendar.pickADay')}
            </p>
          )}
          {feedback && (
            <p role={feedback.tone === 'error' ? 'alert' : 'status'} className={`text-xs ${feedback.tone === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>
              {feedback.message}
            </p>
          )}
        </aside>
      </div>
    </section>
  );
};

export default CommitteeCalendar;
