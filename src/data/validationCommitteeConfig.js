export const initialValidationCommitteeConfig = {
  enabled: true,
  committees: [
    {
      id: 'committee-default',
      name: 'Comité de validation',
      commentRequired: true,
      emails: ['comite.validation@company.com', 'secretariat.validation@company.com'],
      ruleTriggers: {
        matchMode: 'any',
        ruleIds: []
      },
      conditionGroups: [],
      riskTriggers: {
        minRiskScore: null
      },
      teamTriggers: {
        minTeamsCount: null
      }
    }
  ]
};
