import React from '../../react.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { CommitteePassageCard } from './MyCommitteePassagesScreen.jsx';
import { getEffectiveSessionLocation } from '../../utils/committeeInvitations.js';
import { SESSION_STATUS_CANCELLED } from '../../utils/committeeSessions.js';
import { formatSessionDay, formatSessionWindow, formatTime } from './committeeFormat.js';

// Ordre du jour vu par quelqu'un qui n'est pas membre du comité mais y passe (porteur, invité,
// intervenant d'un sujet) : tous les créneaux pour se situer dans le déroulé, mais seuls les siens
// portent un titre et, une fois la séance passée, la décision. Aucune commande.
export const CommitteeAgendaParticipantView = ({
  agenda,
  committee,
  invitationRecords = {},
  onOpenSynthesis,
  onOpenMyPassages,
  onBack
}) => {
  const { t, language } = useTranslation();
  const { session, slots } = agenda;
  const committeesById = committee ? { [committee.id]: committee } : {};
  const meetingLocation = getEffectiveSessionLocation(session, invitationRecords);
  const isCancelled = session.status === SESSION_STATUS_CANCELLED;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6" data-testid="committee-agenda-participant">
      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {typeof onBack === 'function' && (
            <button type="button" onClick={onBack} className="text-sm font-semibold text-blue-700 hover:text-blue-800">
              ← {t('committeeSessions.agenda.back')}
            </button>
          )}
          {typeof onOpenMyPassages === 'function' && (
            <button type="button" onClick={onOpenMyPassages} className="text-sm font-semibold text-blue-700 hover:text-blue-800">
              {t('committeeSessions.myPassages.agenda.allMine')}
            </button>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{t('committeeSessions.myPassages.agenda.eyebrow')}</p>
          <h1 className="text-2xl font-bold text-gray-900">{committee?.name || session.committeeId}</h1>
          <p className="mt-1 text-sm text-gray-700">
            {formatSessionDay(session.startAt, language)} · {formatSessionWindow(session, language)}
          </p>
          {meetingLocation && !isCancelled && (
            <p className="mt-1 text-sm">
              {/^https?:\/\//i.test(meetingLocation) ? (
                <a href={meetingLocation} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 underline">
                  {t('committeeSessions.panel.joinLink')}
                </a>
              ) : (
                <span className="text-gray-700">{meetingLocation}</span>
              )}
            </p>
          )}
        </div>
        {isCancelled && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="status">
            {t('committeeSessions.agenda.cancelledBanner')}
          </p>
        )}
        <p className="text-xs text-gray-500">{t('committeeSessions.myPassages.agenda.maskedNote')}</p>
      </header>

      <ol className="space-y-3" aria-label={t('committeeSessions.agenda.passagesTitle', { count: slots.length })}>
        {slots.map((slot) => (slot.entry ? (
          <li key={slot.passageId} className="space-y-1" data-testid="committee-agenda-participant-mine">
            <p className="text-xs font-semibold text-blue-800">
              {slot.number}. {formatTime(slot.startAt, language)} – {formatTime(slot.endAt, language)} · {t('committeeSessions.myPassages.agenda.yourPassage')}
            </p>
            <ul>
              <CommitteePassageCard
                entry={slot.entry}
                committeesById={committeesById}
                invitationRecords={invitationRecords}
                onOpenSynthesis={onOpenSynthesis}
              />
            </ul>
          </li>
        ) : (
          <li
            key={slot.passageId}
            className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-500"
            data-testid="committee-agenda-participant-other"
          >
            {slot.number}. {formatTime(slot.startAt, language)} – {formatTime(slot.endAt, language)} · {t('committeeSessions.agenda.minutes', { minutes: slot.minutes })} · {t('committeeSessions.myPassages.agenda.otherPassage')}
          </li>
        )))}
      </ol>
    </div>
  );
};
