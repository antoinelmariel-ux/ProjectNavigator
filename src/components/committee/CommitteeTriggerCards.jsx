import React from '../../react.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';

// Les trois cartes de critères d'un comité (règles déclenchées, score de risque, nombre
// d'équipes), partagées par le déclenchement automatique et celui à la demande du porteur : les
// deux panneaux parlent la même grammaire. `value` porte `ruleTriggers`/`riskTriggers`/
// `teamTriggers` ; `onChange(key, next)` remplace l'une de ces trois entrées.
export const CommitteeTriggerCards = ({ idPrefix, committeeId, value, onChange, ruleOptions = [] }) => {
  const { t } = useTranslation();
  const ruleTriggers = value?.ruleTriggers || { matchMode: 'any', ruleIds: [] };
  const riskTriggers = value?.riskTriggers || { minRiskScore: null };
  const teamTriggers = value?.teamTriggers || { minTeamsCount: null };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div>
          <h4 className="text-base font-semibold text-gray-800">{t('backOffice.main.triggeringRulesHeading')}</h4>
          <p className="text-xs text-gray-600">{t('backOffice.main.triggerByRulesHint')}</p>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-rules-${committeeId}`} className="text-sm font-medium text-gray-700">
            {t('backOffice.main.targetedRulesLabel')}
          </label>
          <select
            id={`${idPrefix}-rules-${committeeId}`}
            multiple
            value={ruleTriggers.ruleIds}
            onChange={(event) => {
              const selected = Array.from(event.target.selectedOptions).map((option) => option.value);
              onChange('ruleTriggers', { ...ruleTriggers, ruleIds: selected });
            }}
            className="mt-2 h-36 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {ruleOptions.length === 0 && (
              <option value="" disabled>
                {t('backOffice.main.noRuleAvailable')}
              </option>
            )}
            {ruleOptions.map((option) => (
              <option key={`${idPrefix}-rule-${committeeId}-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-gray-500">{t('backOffice.main.ctrlCmdMultiSelectHint')}</p>
        </div>
        <p className="text-xs text-gray-500">{t('backOffice.main.committeeTriggersOnRuleHint')}</p>
      </div>

      <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div>
          <h4 className="text-base font-semibold text-gray-800">{t('backOffice.main.identifiedRisksHeading')}</h4>
          <p className="text-xs text-gray-600">{t('backOffice.main.linkRiskAnalysisHint')}</p>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-risk-score-${committeeId}`} className="text-sm font-medium text-gray-700">
            {t('backOffice.main.minRiskScoreLabel')}
          </label>
          <input
            id={`${idPrefix}-risk-score-${committeeId}`}
            type="number"
            min="0"
            step="0.5"
            value={riskTriggers.minRiskScore ?? ''}
            onChange={(event) => {
              const next = event.target.value;
              onChange('riskTriggers', { ...riskTriggers, minRiskScore: next === '' ? null : Number(next) });
            }}
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder={t('backOffice.main.exampleThreeFivePlaceholder')}
          />
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div>
          <h4 className="text-base font-semibold text-gray-800">{t('backOffice.main.solicitedTeamsHeading')}</h4>
          <p className="text-xs text-gray-600">{t('backOffice.main.triggerByTeamCountHint')}</p>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-team-count-${committeeId}`} className="text-sm font-medium text-gray-700">
            {t('backOffice.main.minTeamsCountLabel')}
          </label>
          <input
            id={`${idPrefix}-team-count-${committeeId}`}
            type="number"
            min="1"
            value={teamTriggers.minTeamsCount ?? ''}
            onChange={(event) => {
              const next = event.target.value;
              onChange('teamTriggers', { ...teamTriggers, minTeamsCount: next === '' ? null : Number(next) });
            }}
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder={t('backOffice.main.exampleThreePlaceholder')}
          />
        </div>
      </div>
    </div>
  );
};

export default CommitteeTriggerCards;
