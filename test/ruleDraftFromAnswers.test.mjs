import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANDIDATE_TIERS,
  annotateCandidates,
  buildConditionCandidates,
  buildDraftConditionGroups,
  classifyCandidate,
  countMatchingSamples,
  matchesConditionGroups,
  sortCandidates
} from '../src/utils/ruleDraftFromAnswers.js';

const questions = [
  {
    id: 'ProjectType',
    type: 'choice',
    question: 'Type de projet',
    options: [
      { value: 'lfb', label: 'Projet du LFB' },
      { value: 'partenaire', label: 'Projet co-construit' }
    ]
  },
  {
    id: 'components',
    type: 'multi_choice',
    question: 'Composantes du projet',
    options: [
      { value: 'site', label: 'Site internet' },
      { value: 'mobile', label: 'Application mobile' },
      { value: 'ia', label: "Outil d'IA" }
    ],
    extraCheckbox: { enabled: true, label: 'Hors périmètre' }
  },
  { id: 'budget', type: 'number', question: 'Budget' },
  { id: 'pitch', type: 'long_text', question: 'Pitch' }
];

const answers = {
  ProjectType: 'lfb',
  components: { values: ['site', 'ia'], children: {}, otherText: '' },
  budget: 120,
  pitch: 'Un texte libre qui ne doit produire aucune condition',
  components__extra_checkbox: true
};

test('buildConditionCandidates derives one candidate per selected value', () => {
  const candidates = buildConditionCandidates(answers, questions, { language: 'fr' });
  const ids = candidates.map((candidate) => candidate.id);

  assert.deepEqual(ids, [
    'ProjectType::lfb',
    'components::site',
    'components::ia',
    'components__extra_checkbox::true',
    'budget::120'
  ]);
});

test('buildConditionCandidates labels values with their option label', () => {
  const candidates = buildConditionCandidates(answers, questions, { language: 'fr' });
  const site = candidates.find((candidate) => candidate.id === 'components::site');

  assert.equal(site.valueLabel, 'Site internet');
  assert.equal(site.questionLabel, 'Composantes du projet');
  assert.equal(site.operator, 'equals');
});

test('a number answer becomes a threshold, not a strict equality', () => {
  const candidates = buildConditionCandidates(answers, questions, { language: 'fr' });
  const budget = candidates.find((candidate) => candidate.questionId === 'budget');

  assert.equal(budget.operator, 'gte');
  assert.equal(budget.value, '120');
});

test('buildConditionCandidates ignores free-text and unanswered questions', () => {
  const candidates = buildConditionCandidates({ pitch: 'texte' }, questions, { language: 'fr' });
  assert.deepEqual(candidates, []);
});

test('buildDraftConditionGroups groups values of one question with OR, questions with AND', () => {
  const candidates = buildConditionCandidates(answers, questions, { language: 'fr' });
  const selected = candidates.filter((candidate) => candidate.questionId === 'components' || candidate.questionId === 'ProjectType');
  const groups = buildDraftConditionGroups(selected, { mode: 'all' });

  assert.equal(groups.length, 2);
  assert.equal(groups[0].conditions.length, 1);
  assert.equal(groups[1].logic, 'any');
  assert.equal(groups[1].conditions.length, 2);
});

test('buildDraftConditionGroups honours a per-question AND override', () => {
  const candidates = buildConditionCandidates(answers, questions, { language: 'fr' });
  const selected = candidates.filter((candidate) => candidate.questionId === 'components');
  const groups = buildDraftConditionGroups(selected, { mode: 'all', perQuestionLogic: { components: 'all' } });

  assert.equal(groups.length, 1);
  assert.equal(groups[0].logic, 'all');
});

test('buildDraftConditionGroups in any mode produces a single OR group', () => {
  const candidates = buildConditionCandidates(answers, questions, { language: 'fr' });
  const groups = buildDraftConditionGroups(candidates, { mode: 'any' });

  assert.equal(groups.length, 1);
  assert.equal(groups[0].logic, 'any');
  assert.equal(groups[0].conditions.length, candidates.length);
});

test('a draft built from a project always matches that project', () => {
  const candidates = buildConditionCandidates(answers, questions, { language: 'fr' });
  const groups = buildDraftConditionGroups(candidates, { mode: 'all' });

  assert.equal(matchesConditionGroups(groups, answers), true);
});

test('no condition matches everything, which is the empty-rule trap', () => {
  assert.equal(matchesConditionGroups([], { anything: 'goes' }), true);
});

const samples = [
  { id: 's1', name: 'Site LFB', answers: { ProjectType: 'lfb', components: { values: ['site'] } } },
  { id: 's2', name: 'IA LFB', answers: { ProjectType: 'lfb', components: { values: ['ia'] } } },
  { id: 's3', name: 'Site partenaire', answers: { ProjectType: 'partenaire', components: { values: ['site'] } } },
  { id: 's4', name: 'Mobile partenaire', answers: { ProjectType: 'partenaire', components: { values: ['mobile'] } } }
];

test('countMatchingSamples returns the matching sample projects', () => {
  const groups = buildDraftConditionGroups(
    [{ questionId: 'ProjectType', operator: 'equals', value: 'lfb' }],
    { mode: 'all' }
  );
  const result = countMatchingSamples(groups, samples);

  assert.equal(result.count, 2);
  assert.equal(result.total, 4);
  assert.deepEqual(result.matching.map((sample) => sample.id), ['s1', 's2']);
});

test('classifyCandidate separates discriminating, specific and universal conditions', () => {
  const universalSamples = samples.map((sample) => ({ ...sample, answers: { ...sample.answers, ProjectType: 'lfb' } }));

  assert.equal(
    classifyCandidate({ questionId: 'ProjectType', operator: 'equals', value: 'lfb' }, samples).tier,
    CANDIDATE_TIERS.DISCRIMINANT
  );
  assert.equal(
    classifyCandidate({ questionId: 'ProjectType', operator: 'equals', value: 'lfb' }, universalSamples).tier,
    CANDIDATE_TIERS.UNIVERSAL
  );
  assert.equal(
    classifyCandidate({ questionId: 'components', operator: 'equals', value: 'mobile' }, samples).tier,
    CANDIDATE_TIERS.SPECIFIC
  );
});

test('sortCandidates by relevance puts discriminating conditions first', () => {
  const candidates = annotateCandidates(
    [
      { id: 'a', questionId: 'components', questionIndex: 1, operator: 'equals', value: 'mobile' },
      { id: 'b', questionId: 'ProjectType', questionIndex: 0, operator: 'equals', value: 'lfb' }
    ],
    samples
  );

  assert.deepEqual(sortCandidates(candidates, 'relevance').map((candidate) => candidate.id), ['b', 'a']);
  assert.deepEqual(sortCandidates(candidates, 'questionnaire').map((candidate) => candidate.id), ['b', 'a']);
});
