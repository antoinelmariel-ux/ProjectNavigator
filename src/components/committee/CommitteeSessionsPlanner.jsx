import React, { useMemo, useState } from '../../react.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import {
  DEFAULT_SESSION_MINUTES,
  PASSAGE_KIND_TOPIC,
  SESSION_STATUS_CANCELLED,
  SESSION_STATUS_DRAFT,
  SESSION_STATUS_PUBLISHED,
  buildDraftSessions,
  generateSessionDates,
  getAllocatedMinutes,
  getCommitteeDefaultPassageMinutes,
  getCommitteeMemberEmails,
  getRemainingMinutes,
  isSessionPast
} from '../../utils/committeeSessions.js';
import {
  formatSessionDay,
  formatSessionWindow,
  fromDateTimeLocalValue,
  getDisplayNameFromEmail,
  toDateTimeLocalValue
} from './committeeFormat.js';

const WEEKDAYS = [1, 2, 3, 4, 5];
const RANKS = [1, 2, 3, 4, -1];

const toDateInputValue = (date) => {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// Calendrier d'un comité dans l'onglet « Comité de validation » du back-office (spec §3) :
// président, co-président et durée par défaut d'un passage, génération des séances à partir
// d'une règle sur la période voulue, puis retouches séance par séance (date, durée, lieu,
// publication, annulation). Une séance générée naît en brouillon : seule la publication l'ouvre
// aux inscriptions.
export const CommitteeSessionsPlanner = ({
  committee,
  sessions = [],
  canManage = false,
  unbookedCount = 0,
  freeMinutes = 0,
  onUpdateCommittee,
  onCreateSessions,
  onRunAction,
  onDeleteDraft,
  onOpenAgenda
}) => {
  const { t, language } = useTranslation();
  const today = useMemo(() => new Date(), []);
  const idPrefix = `committee-planner-${committee.id}`;
  const [rule, setRule] = useState(() => ({
    weekday: 2,
    nth: 2,
    time: '14:00',
    durationMinutes: DEFAULT_SESSION_MINUTES,
    from: toDateInputValue(today),
    to: toDateInputValue(new Date(today.getFullYear(), today.getMonth() + 3, today.getDate()))
  }));
  const [singleStart, setSingleStart] = useState('');
  const [showPast, setShowPast] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [drafts, setDrafts] = useState({});

  const members = getCommitteeMemberEmails(committee);
  const committeeSessions = sessions.filter((session) => session.committeeId === committee.id);
  const visibleSessions = committeeSessions.filter((session) => showPast || !isSessionPast(session, today));
  const generatedDates = generateSessionDates({
    weekday: rule.weekday,
    nth: rule.nth,
    time: rule.time,
    from: rule.from ? new Date(`${rule.from}T00:00:00`) : null,
    to: rule.to ? new Date(`${rule.to}T23:59:59`) : null
  });
  const newDrafts = buildDraftSessions({
    committeeId: committee.id,
    dates: generatedDates,
    durationMinutes: rule.durationMinutes,
    existingSessions: committeeSessions
  });

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

  const memberOptions = (
    <>
      <option value="">{t('committeeSessions.planner.nobody')}</option>
      {members.map((email) => (
        <option key={email} value={email}>{getDisplayNameFromEmail(email)} ({email})</option>
      ))}
    </>
  );

  return (
    <section className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-4" aria-labelledby={`${idPrefix}-title`} data-testid={idPrefix}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 id={`${idPrefix}-title`} className="text-sm font-semibold uppercase tracking-wide text-blue-900">
            {t('committeeSessions.planner.title')}
          </h4>
          <p className="mt-1 text-xs text-blue-900">{t('committeeSessions.planner.hint')}</p>
        </div>
        <p className="text-xs text-blue-900" data-testid={`${idPrefix}-demand`}>
          {t('committeeSessions.planner.demand', { unbooked: unbookedCount, minutes: freeMinutes })}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor={`${idPrefix}-president`} className="block text-xs font-medium text-gray-700 mb-1">
            {t('committeeSessions.planner.president')}
          </label>
          <select
            id={`${idPrefix}-president`}
            value={committee.presidentEmail || ''}
            disabled={!canManage}
            onChange={(event) => onUpdateCommittee({ presidentEmail: event.target.value })}
            className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"
          >
            {memberOptions}
          </select>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-vice`} className="block text-xs font-medium text-gray-700 mb-1">
            {t('committeeSessions.planner.vicePresident')}
          </label>
          <select
            id={`${idPrefix}-vice`}
            value={committee.vicePresidentEmail || ''}
            disabled={!canManage}
            onChange={(event) => onUpdateCommittee({ vicePresidentEmail: event.target.value })}
            className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"
          >
            {memberOptions}
          </select>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-default-minutes`} className="block text-xs font-medium text-gray-700 mb-1">
            {t('committeeSessions.planner.defaultMinutes')}
          </label>
          <input
            id={`${idPrefix}-default-minutes`}
            type="number"
            min="10"
            step="5"
            disabled={!canManage}
            value={getCommitteeDefaultPassageMinutes(committee)}
            onChange={(event) => onUpdateCommittee({ defaultPassageMinutes: Number(event.target.value) })}
            className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      {!canManage && (
        <p className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs text-gray-700" data-testid={`${idPrefix}-readonly`}>
          {t('committeeSessions.planner.readOnlyHint')}
        </p>
      )}

      {canManage && (
        <details className="rounded-lg border border-blue-200 bg-white p-3" open={committeeSessions.length === 0}>
          <summary className="cursor-pointer text-sm font-semibold text-gray-800">{t('committeeSessions.planner.generateTitle')}</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor={`${idPrefix}-nth`} className="block text-xs font-medium text-gray-700 mb-1">{t('committeeSessions.planner.rank')}</label>
              <select
                id={`${idPrefix}-nth`}
                value={rule.nth}
                onChange={(event) => setRule((prev) => ({ ...prev, nth: Number(event.target.value) }))}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              >
                {RANKS.map((rank) => (
                  <option key={rank} value={rank}>{t(`committeeSessions.planner.ranks.${rank === -1 ? 'last' : rank}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${idPrefix}-weekday`} className="block text-xs font-medium text-gray-700 mb-1">{t('committeeSessions.planner.weekday')}</label>
              <select
                id={`${idPrefix}-weekday`}
                value={rule.weekday}
                onChange={(event) => setRule((prev) => ({ ...prev, weekday: Number(event.target.value) }))}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              >
                {WEEKDAYS.map((day) => (
                  <option key={day} value={day}>{t(`committeeSessions.planner.weekdays.${day}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${idPrefix}-time`} className="block text-xs font-medium text-gray-700 mb-1">{t('committeeSessions.planner.time')}</label>
              <input
                id={`${idPrefix}-time`}
                type="time"
                value={rule.time}
                onChange={(event) => setRule((prev) => ({ ...prev, time: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-duration`} className="block text-xs font-medium text-gray-700 mb-1">{t('committeeSessions.planner.duration')}</label>
              <input
                id={`${idPrefix}-duration`}
                type="number"
                min="10"
                step="5"
                value={rule.durationMinutes}
                onChange={(event) => setRule((prev) => ({ ...prev, durationMinutes: Number(event.target.value) }))}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-from`} className="block text-xs font-medium text-gray-700 mb-1">{t('committeeSessions.planner.from')}</label>
              <input
                id={`${idPrefix}-from`}
                type="date"
                value={rule.from}
                onChange={(event) => setRule((prev) => ({ ...prev, from: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-to`} className="block text-xs font-medium text-gray-700 mb-1">{t('committeeSessions.planner.to')}</label>
              <input
                id={`${idPrefix}-to`}
                type="date"
                value={rule.to}
                onChange={(event) => setRule((prev) => ({ ...prev, to: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <p className="sm:col-span-3 text-xs text-gray-600">{t('committeeSessions.planner.teamsHint')}</p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={newDrafts.length === 0}
              onClick={() => onCreateSessions(newDrafts).then((result) => report(result, 'generated'))}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {t('committeeSessions.planner.generateButton', { count: newDrafts.length })}
            </button>
            <span className="text-xs text-gray-600">{t('committeeSessions.planner.generateHint')}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3">
            <div>
              <label htmlFor={`${idPrefix}-single`} className="block text-xs font-medium text-gray-700 mb-1">{t('committeeSessions.planner.singleLabel')}</label>
              <input
                id={`${idPrefix}-single`}
                type="datetime-local"
                value={singleStart}
                onChange={(event) => setSingleStart(event.target.value)}
                className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <button
              type="button"
              disabled={!singleStart}
              onClick={() => onCreateSessions(buildDraftSessions({
                committeeId: committee.id,
                dates: [fromDateTimeLocalValue(singleStart)],
                durationMinutes: rule.durationMinutes,
                existingSessions: committeeSessions
              })).then((result) => {
                report(result, 'added');
                if (result?.ok) {
                  setSingleStart('');
                }
              })}
              className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            >
              {t('committeeSessions.planner.singleButton')}
            </button>
          </div>
        </details>
      )}

      {feedback && (
        <p role={feedback.tone === 'error' ? 'alert' : 'status'} className={`text-xs ${feedback.tone === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>
          {feedback.message}
        </p>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-700">
            {t('committeeSessions.planner.listTitle', { count: visibleSessions.length })}
          </h5>
          <label className="inline-flex items-center gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={showPast} onChange={(event) => setShowPast(event.target.checked)} className="h-4 w-4 rounded border-gray-300" />
            {t('committeeSessions.planner.showPast')}
          </label>
        </div>
        {visibleSessions.length === 0 ? (
          <p className="text-xs text-gray-600">{t('committeeSessions.planner.empty')}</p>
        ) : (
          <ul className="space-y-2">
            {visibleSessions.map((session) => {
              const draft = drafts[session.id] || {};
              const isEditable = canManage && session.status !== SESSION_STATUS_CANCELLED && !isSessionPast(session, today);
              const remaining = getRemainingMinutes(session);
              const projectCount = session.agenda.filter((passage) => passage.kind !== PASSAGE_KIND_TOPIC).length;
              return (
                <li key={session.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm" data-testid="committee-planner-session">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-800">
                        {formatSessionDay(session.startAt, language)} · {formatSessionWindow(session, language)}
                      </p>
                      <p className="text-xs text-gray-600">
                        {t('committeeSessions.planner.sessionStats', {
                          count: projectCount,
                          allocated: getAllocatedMinutes(session),
                          remaining: Math.max(0, remaining)
                        })}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${session.status === SESSION_STATUS_PUBLISHED ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : session.status === SESSION_STATUS_CANCELLED ? 'border-red-200 bg-red-50 text-red-700' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
                        {t(`committeeSessions.status.${session.status}`)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenAgenda(session.id)}
                        className="rounded-lg border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        {t('committeeSessions.planner.openAgenda')}
                      </button>
                      {isEditable && session.status === SESSION_STATUS_DRAFT && (
                        <>
                          <button
                            type="button"
                            onClick={() => onRunAction(session.id, { type: 'publish' }).then((result) => report(result, 'published'))}
                            className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            {t('committeeSessions.planner.publish')}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteDraft(session.id).then((result) => report(result, 'deleted'))}
                            className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
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
                          className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          {t('committeeSessions.planner.cancel')}
                        </button>
                      )}
                    </div>
                  </div>
                  {isEditable && (
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <div>
                        <label htmlFor={`${idPrefix}-${session.id}-start`} className="block text-xs text-gray-600">{t('committeeSessions.planner.startLabel')}</label>
                        <input
                          id={`${idPrefix}-${session.id}-start`}
                          type="datetime-local"
                          value={draft.startAt ?? toDateTimeLocalValue(session.startAt)}
                          onChange={(event) => setDrafts((prev) => ({ ...prev, [session.id]: { ...draft, startAt: event.target.value } }))}
                          className="rounded-lg border border-gray-300 px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label htmlFor={`${idPrefix}-${session.id}-duration`} className="block text-xs text-gray-600">{t('committeeSessions.planner.duration')}</label>
                        <input
                          id={`${idPrefix}-${session.id}-duration`}
                          type="number"
                          min="10"
                          step="5"
                          value={draft.durationMinutes ?? session.durationMinutes}
                          onChange={(event) => setDrafts((prev) => ({ ...prev, [session.id]: { ...draft, durationMinutes: event.target.value } }))}
                          className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-xs"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={!drafts[session.id]}
                        onClick={() => commitDraft(session)}
                        className="rounded-lg border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40"
                      >
                        {t('committeeSessions.planner.save')}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};
