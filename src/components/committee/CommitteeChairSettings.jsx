import React from '../../react.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { getCommitteeDefaultPassageMinutes, getCommitteeMemberEmails } from '../../utils/committeeSessions.js';
import { getDisplayNameFromEmail } from './committeeFormat.js';

// Président, co-président et durée d'un passage : réglages d'un comité, rangés avec sa
// configuration. Le président et le co-président sont choisis parmi les membres : c'est la liste
// des membres qui ouvre l'accès au back-office.
export const CommitteeChairSettings = ({ committee, canManage = false, onUpdateCommittee }) => {
  const { t } = useTranslation();
  const idPrefix = `committee-chairs-${committee.id}`;
  const members = getCommitteeMemberEmails(committee);

  const renderOptions = (current) => (
    <>
      <option value="">{t('committeeSessions.planner.nobody')}</option>
      {members.map((email) => (
        <option key={email} value={email}>{getDisplayNameFromEmail(email)} ({email})</option>
      ))}
      {current && !members.includes(current.toLowerCase()) && (
        <option value={current}>{current} — {t('committeeSessions.calendar.notAMember')}</option>
      )}
    </>
  );

  const renderChair = (field, labelKey) => {
    const value = committee[field] || '';
    const isOutsider = value && !members.includes(value.toLowerCase());
    return (
      <div>
        <label htmlFor={`${idPrefix}-${field}`} className="block text-sm font-medium text-gray-700">
          {t(labelKey)}
        </label>
        <select
          id={`${idPrefix}-${field}`}
          value={value}
          disabled={!canManage}
          onChange={(event) => onUpdateCommittee({ [field]: event.target.value })}
          className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          {renderOptions(value)}
        </select>
        {isOutsider && (
          <p role="alert" className="mt-1 text-xs text-amber-700">{t('committeeSessions.calendar.chairMustBeMember')}</p>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3" data-testid={`committee-chairs-${committee.id}`}>
      {!canManage && (
        <p className="lg:col-span-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-gray-700" data-testid={`committee-chairs-${committee.id}-readonly`}>
          {t('committeeSessions.planner.readOnlyHint')}
        </p>
      )}
            {renderChair('presidentEmail', 'committeeSessions.planner.president')}
      {renderChair('vicePresidentEmail', 'committeeSessions.planner.vicePresident')}
      <div>
        <label htmlFor={`${idPrefix}-default-minutes`} className="block text-sm font-medium text-gray-700">
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
          className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>
    </div>
  );
};

export default CommitteeChairSettings;
