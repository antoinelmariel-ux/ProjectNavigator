import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MEMBER_TRIGGER_MODE_EXCLUDE,
  MEMBER_TRIGGER_MODE_INCLUDE,
  TEAM_MEMBER_COVERAGE_ALL_CONDITIONAL,
  TEAM_MEMBER_COVERAGE_NO_MEMBER,
  TEAM_MEMBER_COVERAGE_OK,
  applyTeamMemberRule,
  getTeamMemberCoverageWarning,
  getTeamMemberRule,
  hasUnconditionalTeamMember,
  normalizeTeamMemberRules,
  reassignTeamMemberRule,
  resolveTeamRecipients
} from '../src/utils/teamMemberRules.js';

const group = (conditions, logic = 'all') => ({ logic, conditions });
const condition = (question, value, operator = 'equals') => ({ type: 'question', question, operator, value });

const buildTeam = (memberRules = []) => ({
  id: 'juridique',
  name: 'Juridique',
  contacts: ['alice@lfb.fr', 'bob@lfb.fr', 'carole@lfb.fr'],
  memberRules
});

test('sans critère, tous les contacts de l’équipe sont sollicités', () => {
  const team = buildTeam();
  assert.deepEqual(resolveTeamRecipients(team, { country: 'FR' }), [
    'alice@lfb.fr',
    'bob@lfb.fr',
    'carole@lfb.fr'
  ]);
  assert.equal(getTeamMemberCoverageWarning(team), TEAM_MEMBER_COVERAGE_OK);
});

test('mode include : le membre n’est sollicité que si ses critères sont remplis', () => {
  const team = buildTeam([
    {
      email: 'alice@lfb.fr',
      mode: MEMBER_TRIGGER_MODE_INCLUDE,
      conditionGroups: [group([condition('country', 'FR')])]
    }
  ]);

  assert.deepEqual(resolveTeamRecipients(team, { country: 'FR' }), [
    'alice@lfb.fr',
    'bob@lfb.fr',
    'carole@lfb.fr'
  ]);
  assert.deepEqual(resolveTeamRecipients(team, { country: 'DE' }), ['bob@lfb.fr', 'carole@lfb.fr']);
});

test('mode exclude : le membre est sollicité sauf si ses critères sont remplis', () => {
  const team = buildTeam([
    {
      email: 'bob@lfb.fr',
      mode: MEMBER_TRIGGER_MODE_EXCLUDE,
      conditionGroups: [group([condition('budget', 100, 'gt')])]
    }
  ]);

  assert.deepEqual(resolveTeamRecipients(team, { budget: 50 }), [
    'alice@lfb.fr',
    'bob@lfb.fr',
    'carole@lfb.fr'
  ]);
  assert.deepEqual(resolveTeamRecipients(team, { budget: 500 }), ['alice@lfb.fr', 'carole@lfb.fr']);
});

test('les groupes se combinent en ET, les conditions d’un groupe suivent sa logique', () => {
  const team = buildTeam([
    {
      email: 'carole@lfb.fr',
      mode: MEMBER_TRIGGER_MODE_INCLUDE,
      conditionGroups: [
        group([condition('country', 'FR'), condition('country', 'BE')], 'any'),
        group([condition('kind', 'clinique')])
      ]
    }
  ]);

  assert.ok(resolveTeamRecipients(team, { country: 'BE', kind: 'clinique' }).includes('carole@lfb.fr'));
  assert.ok(!resolveTeamRecipients(team, { country: 'BE', kind: 'interne' }).includes('carole@lfb.fr'));
  assert.ok(!resolveTeamRecipients(team, { country: 'DE', kind: 'clinique' }).includes('carole@lfb.fr'));
});

test('la comparaison des adresses ignore la casse et les espaces', () => {
  const team = {
    ...buildTeam([
      {
        email: '  Alice@LFB.fr ',
        mode: MEMBER_TRIGGER_MODE_INCLUDE,
        conditionGroups: [group([condition('country', 'FR')])]
      }
    ])
  };

  assert.deepEqual(resolveTeamRecipients(team, { country: 'DE' }), ['bob@lfb.fr', 'carole@lfb.fr']);
});

test('une règle orpheline (contact retiré) est ignorée', () => {
  const team = {
    id: 'juridique',
    contacts: ['bob@lfb.fr'],
    memberRules: [
      {
        email: 'alice@lfb.fr',
        mode: MEMBER_TRIGGER_MODE_INCLUDE,
        conditionGroups: [group([condition('country', 'FR')])]
      }
    ]
  };

  assert.deepEqual(normalizeTeamMemberRules(team), []);
  assert.deepEqual(resolveTeamRecipients(team, {}), ['bob@lfb.fr']);
});

test('une règle sans condition ne compte pas comme un critère', () => {
  const team = buildTeam([
    { email: 'alice@lfb.fr', mode: MEMBER_TRIGGER_MODE_INCLUDE, conditionGroups: [] }
  ]);

  assert.deepEqual(normalizeTeamMemberRules(team), []);
  assert.equal(getTeamMemberRule(team, 'alice@lfb.fr'), null);
  assert.equal(resolveTeamRecipients(team, {}).length, 3);
});

test('avertissement quand plus personne n’est sollicité systématiquement', () => {
  const conditioned = (email) => ({
    email,
    mode: MEMBER_TRIGGER_MODE_INCLUDE,
    conditionGroups: [group([condition('country', 'FR')])]
  });

  const partial = buildTeam([conditioned('alice@lfb.fr')]);
  assert.ok(hasUnconditionalTeamMember(partial));
  assert.equal(getTeamMemberCoverageWarning(partial), TEAM_MEMBER_COVERAGE_OK);

  const allConditional = {
    ...buildTeam([conditioned('alice@lfb.fr'), conditioned('bob@lfb.fr'), conditioned('carole@lfb.fr')])
  };
  assert.ok(!hasUnconditionalTeamMember(allConditional));
  assert.equal(getTeamMemberCoverageWarning(allConditional), TEAM_MEMBER_COVERAGE_ALL_CONDITIONAL);
  assert.deepEqual(resolveTeamRecipients(allConditional, { country: 'DE' }), []);
});

test('retirer le dernier membre non conditionné déclenche l’avertissement', () => {
  const team = buildTeam([
    {
      email: 'alice@lfb.fr',
      mode: MEMBER_TRIGGER_MODE_INCLUDE,
      conditionGroups: [group([condition('country', 'FR')])]
    },
    {
      email: 'bob@lfb.fr',
      mode: MEMBER_TRIGGER_MODE_EXCLUDE,
      conditionGroups: [group([condition('country', 'DE')])]
    }
  ]);

  assert.equal(getTeamMemberCoverageWarning(team), TEAM_MEMBER_COVERAGE_OK);

  const afterRemoval = { ...team, contacts: ['alice@lfb.fr', 'bob@lfb.fr'] };
  assert.equal(getTeamMemberCoverageWarning(afterRemoval), TEAM_MEMBER_COVERAGE_ALL_CONDITIONAL);
});

test('une équipe sans contact est signalée à part', () => {
  assert.equal(getTeamMemberCoverageWarning({ id: 'x', contacts: [] }), TEAM_MEMBER_COVERAGE_NO_MEMBER);
});

test('applyTeamMemberRule écrit puis efface les critères d’un membre', () => {
  const team = buildTeam();
  const withRule = applyTeamMemberRule(team, 'alice@lfb.fr', (current) => ({
    ...current,
    mode: MEMBER_TRIGGER_MODE_EXCLUDE,
    conditionGroups: [group([condition('country', 'FR')])]
  }));

  assert.equal(normalizeTeamMemberRules(withRule).length, 1);
  assert.equal(getTeamMemberRule(withRule, 'alice@lfb.fr').mode, MEMBER_TRIGGER_MODE_EXCLUDE);

  const cleared = applyTeamMemberRule(withRule, 'alice@lfb.fr', (current) => ({
    ...current,
    conditionGroups: []
  }));
  assert.deepEqual(normalizeTeamMemberRules(cleared), []);
});

test('les critères d’un membre restent isolés des autres membres', () => {
  const team = applyTeamMemberRule(
    applyTeamMemberRule(buildTeam(), 'alice@lfb.fr', (current) => ({
      ...current,
      conditionGroups: [group([condition('country', 'FR')])]
    })),
    'bob@lfb.fr',
    (current) => ({
      ...current,
      mode: MEMBER_TRIGGER_MODE_EXCLUDE,
      conditionGroups: [group([condition('country', 'FR')])]
    })
  );

  assert.deepEqual(resolveTeamRecipients(team, { country: 'FR' }), ['alice@lfb.fr', 'carole@lfb.fr']);
  assert.deepEqual(resolveTeamRecipients(team, { country: 'DE' }), ['bob@lfb.fr', 'carole@lfb.fr']);
});

const conditionedTeam = () =>
  buildTeam([
    {
      email: 'alice@lfb.fr',
      mode: MEMBER_TRIGGER_MODE_EXCLUDE,
      conditionGroups: [group([condition('country', 'FR')])]
    },
    {
      email: 'bob@lfb.fr',
      mode: MEMBER_TRIGGER_MODE_INCLUDE,
      conditionGroups: [group([condition('kind', 'clinique')])]
    },
    {
      email: 'carole@lfb.fr',
      mode: MEMBER_TRIGGER_MODE_INCLUDE,
      conditionGroups: [group([condition('budget', 100, 'gt')])]
    }
  ]);

test('réattribuer les critères libère la source et rétablit la couverture', () => {
  const team = conditionedTeam();
  assert.equal(getTeamMemberCoverageWarning(team), TEAM_MEMBER_COVERAGE_ALL_CONDITIONAL);

  const next = reassignTeamMemberRule(team, 'alice@lfb.fr', 'bob@lfb.fr');

  assert.equal(getTeamMemberCoverageWarning(next), TEAM_MEMBER_COVERAGE_OK);
  assert.equal(getTeamMemberRule(next, 'alice@lfb.fr'), null);
  // La règle « sauf si pays = FR » a bien suivi : c'est Bob qui saute désormais sur FR, et
  // Alice, libérée, est la seule que rien ne peut écarter.
  assert.deepEqual(resolveTeamRecipients(next, { country: 'FR' }), ['alice@lfb.fr']);
  assert.deepEqual(resolveTeamRecipients(next, { country: 'DE' }), ['alice@lfb.fr', 'bob@lfb.fr']);
});

test('la cible hérite du mode et des groupes de la source, et perd les siens', () => {
  const next = reassignTeamMemberRule(conditionedTeam(), 'alice@lfb.fr', 'bob@lfb.fr');
  const moved = getTeamMemberRule(next, 'bob@lfb.fr');

  assert.equal(moved.mode, MEMBER_TRIGGER_MODE_EXCLUDE);
  assert.deepEqual(
    moved.conditionGroups.map((entry) => entry.conditions.map((item) => item.question)),
    [['country']]
  );
  // Le membre non concerné garde les siens intacts.
  assert.equal(getTeamMemberRule(next, 'carole@lfb.fr').mode, MEMBER_TRIGGER_MODE_INCLUDE);
});

test('la réattribution est sans effet si la source, la cible ou le couple est invalide', () => {
  const team = conditionedTeam();

  assert.deepEqual(normalizeTeamMemberRules(reassignTeamMemberRule(team, 'alice@lfb.fr', 'alice@lfb.fr')), normalizeTeamMemberRules(team));
  assert.deepEqual(normalizeTeamMemberRules(reassignTeamMemberRule(team, 'alice@lfb.fr', 'inconnu@lfb.fr')), normalizeTeamMemberRules(team));
  assert.deepEqual(normalizeTeamMemberRules(reassignTeamMemberRule(team, '', 'bob@lfb.fr')), normalizeTeamMemberRules(team));

  const withoutRule = buildTeam();
  assert.deepEqual(normalizeTeamMemberRules(reassignTeamMemberRule(withoutRule, 'alice@lfb.fr', 'bob@lfb.fr')), []);
});

test('la réattribution ignore la casse des adresses', () => {
  const next = reassignTeamMemberRule(conditionedTeam(), 'ALICE@lfb.fr', ' Bob@LFB.fr ');

  assert.equal(getTeamMemberRule(next, 'alice@lfb.fr'), null);
  assert.equal(getTeamMemberRule(next, 'bob@lfb.fr').mode, MEMBER_TRIGGER_MODE_EXCLUDE);
});
