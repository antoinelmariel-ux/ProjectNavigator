import React, { useMemo, useState } from '../../react.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import {
  DEFAULT_SESSION_MINUTES,
  buildDraftSessions,
  generateSessionDates
} from '../../utils/committeeSessions.js';
import { fromDateTimeLocalValue } from './committeeFormat.js';

const WEEKDAYS = [1, 2, 3, 4, 5];
const RANKS = [1, 2, 3, 4, -1];

const toDateInputValue = (date) => {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const fieldClass = 'w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200';

// Création de séances : une règle récurrente sur une période, ou une séance isolée. Une séance
// créée naît en brouillon ; seule sa publication (depuis le calendrier) ouvre les inscriptions.
export const CommitteeSessionsGenerator = ({
  committees = [],
  sessions = [],
  defaultOpen = false,
  onCreateSessions,
  onCreated
}) => {
  const { t } = useTranslation();
  const today = useMemo(() => new Date(), []);
  const [committeeId, setCommitteeId] = useState(committees[0]?.id || '');
  const [open, setOpen] = useState(defaultOpen);
  const [rule, setRule] = useState(() => ({
    weekday: 2,
    nth: 2,
    time: '14:00',
    durationMinutes: DEFAULT_SESSION_MINUTES,
    location: '',
    from: toDateInputValue(today),
    to: toDateInputValue(new Date(today.getFullYear(), today.getMonth() + 3, today.getDate()))
  }));
  const [singleStart, setSingleStart] = useState('');
  const [feedback, setFeedback] = useState(null);

  const selectedId = committees.some((committee) => committee.id === committeeId) ? committeeId : (committees[0]?.id || '');
  const committeeSessions = sessions.filter((session) => session.committeeId === selectedId);
  const newDrafts = buildDraftSessions({
    committeeId: selectedId,
    dates: generateSessionDates({
      weekday: rule.weekday,
      nth: rule.nth,
      time: rule.time,
      from: rule.from ? new Date(`${rule.from}T00:00:00`) : null,
      to: rule.to ? new Date(`${rule.to}T23:59:59`) : null
    }),
    durationMinutes: rule.durationMinutes,
    location: rule.location,
    existingSessions: committeeSessions
  });

  const report = (result, successKey) => {
    setFeedback(result?.ok
      ? { tone: 'success', message: t(`committeeSessions.planner.feedback.${successKey}`) }
      : { tone: 'error', message: t(`committeeSessions.errors.${result?.error || 'generic'}`, { minutes: 0 }) });
    if (result?.ok && typeof onCreated === 'function' && result.sessions?.length > 0) {
      onCreated(result.sessions[0]);
    }
    return result;
  };

  const setRuleField = (field, value) => setRule((prev) => ({ ...prev, [field]: value }));

  if (committees.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm" data-testid="committee-generator">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="committee-generator-body"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left"
      >
        <span>
          <span className="block text-sm font-semibold text-gray-800">{t('committeeSessions.planner.generateTitle')}</span>
          <span className="block text-xs text-gray-500">{t('committeeSessions.calendar.generatorHint')}</span>
        </span>
        <span aria-hidden="true" className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div id="committee-generator-body" className="space-y-4 border-t border-gray-100 px-5 py-4">
          {committees.length > 1 && (
            <div className="max-w-sm">
              <label htmlFor="committee-generator-committee" className="mb-1 block text-xs font-medium text-gray-700">
                {t('committeeSessions.calendar.generatorCommittee')}
              </label>
              <select
                id="committee-generator-committee"
                value={selectedId}
                onChange={(event) => setCommitteeId(event.target.value)}
                className={fieldClass}
              >
                {committees.map((committee) => (
                  <option key={committee.id} value={committee.id}>{committee.name || committee.id}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="committee-generator-nth" className="mb-1 block text-xs font-medium text-gray-700">{t('committeeSessions.planner.rank')}</label>
              <select id="committee-generator-nth" value={rule.nth} onChange={(event) => setRuleField('nth', Number(event.target.value))} className={fieldClass}>
                {RANKS.map((rank) => (
                  <option key={rank} value={rank}>{t(`committeeSessions.planner.ranks.${rank === -1 ? 'last' : rank}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="committee-generator-weekday" className="mb-1 block text-xs font-medium text-gray-700">{t('committeeSessions.planner.weekday')}</label>
              <select id="committee-generator-weekday" value={rule.weekday} onChange={(event) => setRuleField('weekday', Number(event.target.value))} className={fieldClass}>
                {WEEKDAYS.map((day) => (
                  <option key={day} value={day}>{t(`committeeSessions.planner.weekdays.${day}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="committee-generator-time" className="mb-1 block text-xs font-medium text-gray-700">{t('committeeSessions.planner.time')}</label>
              <input id="committee-generator-time" type="time" value={rule.time} onChange={(event) => setRuleField('time', event.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="committee-generator-duration" className="mb-1 block text-xs font-medium text-gray-700">{t('committeeSessions.planner.duration')}</label>
              <input
                id="committee-generator-duration"
                type="number"
                min="10"
                step="5"
                value={rule.durationMinutes}
                onChange={(event) => setRuleField('durationMinutes', Number(event.target.value))}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="committee-generator-from" className="mb-1 block text-xs font-medium text-gray-700">{t('committeeSessions.planner.from')}</label>
              <input id="committee-generator-from" type="date" value={rule.from} onChange={(event) => setRuleField('from', event.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="committee-generator-to" className="mb-1 block text-xs font-medium text-gray-700">{t('committeeSessions.planner.to')}</label>
              <input id="committee-generator-to" type="date" value={rule.to} onChange={(event) => setRuleField('to', event.target.value)} className={fieldClass} />
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="committee-generator-location" className="mb-1 block text-xs font-medium text-gray-700">{t('committeeSessions.planner.location')}</label>
              <input
                id="committee-generator-location"
                type="text"
                value={rule.location}
                placeholder={t('committeeSessions.planner.locationPlaceholder')}
                onChange={(event) => setRuleField('location', event.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
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

          <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-4">
            <div>
              <label htmlFor="committee-generator-single" className="mb-1 block text-xs font-medium text-gray-700">{t('committeeSessions.planner.singleLabel')}</label>
              <input
                id="committee-generator-single"
                type="datetime-local"
                value={singleStart}
                onChange={(event) => setSingleStart(event.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"
              />
            </div>
            <button
              type="button"
              disabled={!singleStart}
              onClick={() => onCreateSessions(buildDraftSessions({
                committeeId: selectedId,
                dates: [fromDateTimeLocalValue(singleStart)],
                durationMinutes: rule.durationMinutes,
                location: rule.location,
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

          {feedback && (
            <p role={feedback.tone === 'error' ? 'alert' : 'status'} className={`text-xs ${feedback.tone === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>
              {feedback.message}
            </p>
          )}
        </div>
      )}
    </section>
  );
};

export default CommitteeSessionsGenerator;
