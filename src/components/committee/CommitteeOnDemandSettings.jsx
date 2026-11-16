import React from '../../react.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { ConditionGroupsEditor } from '../ConditionGroupsEditor.jsx';
import { CommitteeTriggerCards } from './CommitteeTriggerCards.jsx';
import { applyRuleConditionGroups, normalizeRuleConditionGroups } from '../../utils/ruleConditions.js';

// Déclenchement à la demande du porteur (validationCommittee.js, `onDemand`) : un interrupteur et
// le même panneau de critères que le déclenchement automatique. Les critères disent quand le
// porteur a le droit de solliciter le comité ; sans critère, il le peut toujours.
export const CommitteeOnDemandSettings = ({ committee, questions = [], language, ruleOptions = [], onUpdateCommittee }) => {
  const { t } = useTranslation();
  const onDemand = committee?.onDemand || { enabled: false };
  const idPrefix = `committee-on-demand-${committee.id}`;

  const updateOnDemand = (updater) => {
    onUpdateCommittee((current) => ({ ...current, onDemand: updater(current.onDemand || {}) }));
  };

  return (
    <section
      className="space-y-4 rounded-xl border border-blue-200 bg-white p-4"
      aria-labelledby={`${idPrefix}-heading`}
      data-testid={`committee-on-demand-${committee.id}`}
    >
      <div>
        <h3 id={`${idPrefix}-heading`} className="text-base font-semibold text-gray-800">
          {t('committeeSessions.onDemand.title')}
        </h3>
        <p className="text-xs text-gray-600">{t('committeeSessions.onDemand.description')}</p>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input
          type="checkbox"
          checked={onDemand.enabled === true}
          onChange={(event) => updateOnDemand((current) => ({ ...current, enabled: event.target.checked }))}
          className="h-4 w-4 rounded border-gray-300 text-blue-600"
        />
        {t('committeeSessions.onDemand.enabledLabel')}
      </label>

      {onDemand.enabled === true && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-800">{t('committeeSessions.onDemand.criteriaHeading')}</h4>
            <p className="text-xs text-gray-600">{t('committeeSessions.onDemand.criteriaHint')}</p>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-800">{t('committeeSessions.onDemand.conditionsHeading')}</h4>
            <ConditionGroupsEditor
              idPrefix={idPrefix}
              groups={normalizeRuleConditionGroups(onDemand)}
              onChange={(nextGroups) =>
                updateOnDemand((current) => applyRuleConditionGroups(current, nextGroups))}
              questions={questions}
              language={language}
              emptyStateText={t('committeeSessions.onDemand.conditionsEmpty')}
            />
          </div>

          <CommitteeTriggerCards
            idPrefix="validation-committee-on-demand"
            committeeId={committee.id}
            value={onDemand}
            ruleOptions={ruleOptions}
            onChange={(key, next) => updateOnDemand((current) => ({ ...current, [key]: next }))}
          />
        </div>
      )}
    </section>
  );
};

export default CommitteeOnDemandSettings;
