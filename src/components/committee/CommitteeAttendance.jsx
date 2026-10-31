import React, { useState } from '../../react.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import {
  ATTENDANCE_ABSENT,
  ATTENDANCE_EXCUSED,
  ATTENDANCE_PRESENT,
  ATTENDANCE_STATES,
  summarizeAttendance
} from '../../utils/committeeSessions.js';
import { getDisplayNameFromEmail, getInitials } from './committeeFormat.js';

const STATE_STYLES = {
  [ATTENDANCE_PRESENT]: { dot: 'bg-emerald-500', ring: 'border-emerald-500', active: 'bg-emerald-600 text-white border-emerald-600' },
  [ATTENDANCE_EXCUSED]: { dot: 'bg-amber-400', ring: 'border-amber-400', active: 'bg-amber-500 text-white border-amber-500' },
  [ATTENDANCE_ABSENT]: { dot: 'bg-gray-400', ring: 'border-gray-400', active: 'bg-gray-600 text-white border-gray-600' }
};

const MemberAvatar = ({ email, state }) => (
  <span
    className={`relative inline-flex h-7 w-7 items-center justify-center rounded-full border-2 bg-white text-xs font-semibold text-gray-700 ${state ? STATE_STYLES[state].ring : 'border-gray-200'}`}
    title={getDisplayNameFromEmail(email)}
    aria-hidden="true"
  >
    {getInitials(email)}
  </span>
);

// Les présences d'un passage : repliées, une seule ligne (date, compteurs, avatars) ; dépliées,
// la liste des membres avec Présent / Excusé / Absent pour le président (spec §8). `onChange`
// absent = lecture seule.
export const CommitteeAttendance = ({
  idPrefix,
  label,
  members = [],
  chairs = [],
  attendance = {},
  onChange,
  onSetAll,
  defaultExpanded = false
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const summary = summarizeAttendance(members, attendance);
  const isEditable = typeof onChange === 'function';
  const hasAnyState = summary.total - summary.unknown > 0;

  if (!isEditable && !hasAnyState) {
    return null;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white" data-testid={`${idPrefix}-attendance`}>
      <button
        type="button"
        onClick={() => setIsExpanded((value) => !value)}
        aria-expanded={isExpanded}
        aria-controls={`${idPrefix}-attendance-list`}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
      >
        <span className="font-medium text-gray-800">{label}</span>
        <span className="text-gray-400" aria-hidden="true">·</span>
        {hasAnyState ? (
          <span>
            {t('committeeSessions.attendance.summary', {
              present: summary[ATTENDANCE_PRESENT],
              excused: summary[ATTENDANCE_EXCUSED],
              absent: summary[ATTENDANCE_ABSENT]
            })}
          </span>
        ) : (
          <span className="text-gray-500">{t('committeeSessions.attendance.notRecorded')}</span>
        )}
        <span className="ml-auto flex gap-1" aria-hidden="true">
          {members.slice(0, 8).map((email) => (
            <MemberAvatar key={email} email={email} state={attendance[email]} />
          ))}
        </span>
        <span className="text-gray-400" aria-hidden="true">{isExpanded ? '▾' : '›'}</span>
      </button>

      {isExpanded && (
        <div id={`${idPrefix}-attendance-list`} className="border-t border-gray-200 px-3 py-2">
          {isEditable && typeof onSetAll === 'function' && (
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => onSetAll(ATTENDANCE_PRESENT)}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                {t('committeeSessions.attendance.allPresent')}
              </button>
            </div>
          )}
          <ul className="space-y-1">
            {members.map((email) => {
              const state = attendance[email] || '';
              const isChair = chairs.includes(email);
              return (
                <li key={email} className="flex flex-wrap items-center gap-2 py-1">
                  <MemberAvatar email={email} state={state} />
                  <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
                    {getDisplayNameFromEmail(email)}
                    {isChair && (
                      <span className="ml-2 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        {t('committeeSessions.attendance.chairBadge')}
                      </span>
                    )}
                  </span>
                  {isEditable ? (
                    <span className="inline-flex overflow-hidden rounded-lg border border-gray-200" role="group" aria-label={t('committeeSessions.attendance.memberGroupLabel', { name: getDisplayNameFromEmail(email) })}>
                      {ATTENDANCE_STATES.map((option) => (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={state === option}
                          onClick={() => onChange(email, state === option ? '' : option)}
                          className={`border-l border-gray-200 px-2 py-1 text-xs font-medium first:border-l-0 ${state === option ? STATE_STYLES[option].active : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                        >
                          {t(`committeeSessions.attendance.states.${option}`)}
                        </button>
                      ))}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                      <span className={`h-2 w-2 rounded-full ${state ? STATE_STYLES[state].dot : 'bg-gray-200'}`} aria-hidden="true" />
                      {state ? t(`committeeSessions.attendance.states.${state}`) : t('committeeSessions.attendance.states.unknown')}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
