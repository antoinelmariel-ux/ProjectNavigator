import React, { useMemo, useState } from '../react.js';
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS } from '../i18n/languages.js';
import { getLocalizedRaw } from '../utils/localizedContent.js';

const CATEGORY_BY_KIND = {
  ruleName: 'rule',
  ruleQuestion: 'rule',
  risk: 'risk',
  team: 'team'
};

const categoryForItem = (item) => CATEGORY_BY_KIND[item.kind] || 'question';

// Tableau de traitement « à la chaîne » : les 4 langues sont toujours visibles côte à côte pour
// chaque ligne — pas de sélecteur de langue à activer avant de pouvoir taper, contrairement au
// reste du back-office (LanguageEditSwitcher). C'est la demande explicite qui motive ce composant
// séparé plutôt qu'une réutilisation du pattern habituel.
export const BackOfficeTranslations = ({ items, teams, isCurrentUserAdmin, onChange, t }) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');

  const teamNameById = useMemo(() => {
    const map = new Map();
    (Array.isArray(teams) ? teams : []).forEach((team) => {
      map.set(team.id, team.id);
    });
    return map;
  }, [teams]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== 'all' && categoryForItem(item) !== category) {
        return false;
      }
      if (teamFilter !== 'all' && !item.teamIds.includes(teamFilter)) {
        return false;
      }
      if (normalizedSearch && !item.contextLabel.toLowerCase().includes(normalizedSearch)
        && !item.referenceLabel.toLowerCase().includes(normalizedSearch)) {
        return false;
      }
      return true;
    });
  }, [items, category, teamFilter, search]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">{t('backOffice.main.translations.title')}</h2>
        <p className="text-sm text-gray-500">{t('backOffice.main.translations.subtitle')}</p>
        {!isCurrentUserAdmin && (
          <p className="text-sm text-blue-600 mt-1">{t('backOffice.main.translations.scopedHint')}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('backOffice.main.translations.searchPlaceholder')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 min-w-[220px]"
        />
        <label className="flex items-center gap-2 text-sm text-gray-600">
          {t('backOffice.main.translations.categoryFilterLabel')}
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="all">{t('backOffice.main.translations.categoryAllOption')}</option>
            <option value="question">{t('backOffice.main.translations.categoryQuestionOption')}</option>
            <option value="rule">{t('backOffice.main.translations.categoryRuleOption')}</option>
            <option value="risk">{t('backOffice.main.translations.categoryRiskOption')}</option>
            <option value="team">{t('backOffice.main.translations.categoryTeamOption')}</option>
          </select>
        </label>
        {isCurrentUserAdmin && teamNameById.size > 0 && (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            {t('backOffice.main.translations.teamFilterLabel')}
            <select
              value={teamFilter}
              onChange={(event) => setTeamFilter(event.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="all">{t('backOffice.main.translations.allTeamsOption')}</option>
              {[...teamNameById.keys()].map((teamId) => (
                <option key={teamId} value={teamId}>{teamId}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {filteredItems.length === 0 ? (
        <p className="text-sm text-gray-500">{t('backOffice.main.translations.emptyState')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-600 w-1/4">
                  {t('backOffice.main.translations.contextColumnLabel')}
                </th>
                {SUPPORTED_LANGUAGES.map((code) => (
                  <th key={code} className="px-3 py-2 text-left font-semibold text-gray-600">
                    {LANGUAGE_LABELS[code]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredItems.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-700">{item.contextLabel}</div>
                    {item.referenceLabel && (
                      <div className="text-xs text-gray-400 mt-1">{item.referenceLabel}</div>
                    )}
                    <div className="text-xs font-semibold text-amber-600 mt-1">
                      {t('backOffice.main.translations.missingCountBadgeTemplate', { count: item.missingLanguages.length })}
                    </div>
                  </td>
                  {SUPPORTED_LANGUAGES.map((code) => {
                    const isMissing = item.missingLanguages.includes(code);
                    const value = getLocalizedRaw(item.value, code);
                    const fieldProps = {
                      value,
                      onChange: (event) => onChange(item, code, event.target.value),
                      'aria-label': t('backOffice.main.translations.languageInputAriaLabelTemplate', {
                        language: LANGUAGE_LABELS[code],
                        context: item.contextLabel
                      }),
                      className: `w-full min-w-[180px] rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 ${
                        isMissing
                          ? 'border-amber-400 bg-amber-50 focus:border-amber-500 focus:ring-amber-200'
                          : 'border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-200'
                      }`
                    };
                    return (
                      <td key={code} className="px-3 py-3">
                        {item.multiline ? (
                          <textarea rows={2} {...fieldProps} />
                        ) : (
                          <input type="text" {...fieldProps} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
