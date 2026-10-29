import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterOnboardingStepsForAudience, normalizeOnboardingConfig } from '../src/utils/onboarding.js';
import { ONBOARDING_AUDIENCE_COMPLIANCE } from '../src/data/onboardingTour.js';
import {
  buildExpertTourAnswers,
  buildExpertTourTeams,
  EXPERT_TOUR_STAGE_CLAIMED,
  EXPERT_TOUR_STAGE_OPEN,
  EXPERT_TOUR_STAGE_REVIEW,
  isExpertTourStep,
  pickExpertTourTeamId
} from '../src/utils/expertTourDemo.js';

const config = normalizeOnboardingConfig();
const findStep = (steps, id) => steps.find((step) => step.id === id);
const actionIds = (step) => step.actions.map((action) => action.id);

test('le parcours expert est proposé juste sous le tour rapide', () => {
  const welcome = findStep(config.steps, 'welcome');
  assert.deepEqual(actionIds(welcome).slice(0, 2), ['go-quick', 'go-expert']);
  assert.equal(welcome.actions[1].audience, ONBOARDING_AUDIENCE_COMPLIANCE);
});

test('un non-expert ne voit jamais le bouton du parcours expert', () => {
  const steps = filterOnboardingStepsForAudience(config.steps, { isComplianceActor: false });
  steps.forEach((step) => assert.ok(!actionIds(step).includes('go-expert'), step.id));
});

test('un expert garde le bouton, et un menu filtré garde un bouton principal', () => {
  const expertSteps = filterOnboardingStepsForAudience(config.steps, { isComplianceActor: true });
  assert.ok(actionIds(findStep(expertSteps, 'welcome')).includes('go-expert'));

  const quickEnd = findStep(filterOnboardingStepsForAudience(config.steps), 'quick-end');
  assert.equal(quickEnd.actions[0].id, 'go-create');
  assert.equal(quickEnd.actions[0].variant, 'primary');
});

test('le public d une action survit à la normalisation, une valeur inconnue non', () => {
  const custom = normalizeOnboardingConfig({
    ...config,
    steps: [{ id: 'menu', actions: [{ id: 'a', action: 'goTo', audience: 'compliance' }, { id: 'b', action: 'goTo', audience: 'other' }] }]
  });
  assert.equal(custom.steps[0].actions[0].audience, 'compliance');
  assert.equal('audience' in custom.steps[0].actions[1], false);
});

test('les étapes du parcours expert sont contiguës et en fin de tour', () => {
  const ids = config.steps.map((step) => step.id);
  const first = ids.indexOf('expert-intro');
  assert.ok(first > ids.indexOf('inspiration-end'));
  assert.ok(ids.slice(first).every(isExpertTourStep));
});

test('l utilisateur est ajouté, pour l affichage, à une équipe que le projet déclenche', () => {
  const teams = [{ id: 'a', contacts: ['x@lfb.fr'] }, { id: 'b', contacts: ['me@lfb.fr'] }];
  assert.equal(pickExpertTourTeamId(teams, 'ME@lfb.fr'), 'b');
  assert.equal(pickExpertTourTeamId(teams, 'other@lfb.fr'), 'a');

  const display = buildExpertTourTeams(teams, 'a', 'me@lfb.fr');
  assert.deepEqual(display[0].contacts, ['me@lfb.fr', 'x@lfb.fr']);
  assert.deepEqual(teams[0].contacts, ['x@lfb.fr']);
  assert.equal(buildExpertTourTeams(teams, 'b', 'me@lfb.fr')[1], teams[1]);
});

test('les réponses d exemple suivent l étape : ouvert, pris en charge, à ré-examiner', () => {
  const options = { teamId: 'a', userEmail: 'me@lfb.fr', userName: 'Me', messages: { opinion: 'ok' } };
  const entry = (stage) => buildExpertTourAnswers({ q1: 'x' }, { ...options, stage }).__compliance_team_comments__.teams.a;

  const open = entry(EXPERT_TOUR_STAGE_OPEN);
  assert.equal(open.claim, undefined);
  assert.equal(open.status, '');
  assert.equal(open.replies.length, 2);
  assert.ok(open.replies[1].attachments[0].url.startsWith('data:'));

  assert.equal(entry(EXPERT_TOUR_STAGE_CLAIMED).claim.assigneeEmail, 'me@lfb.fr');

  const review = entry(EXPERT_TOUR_STAGE_REVIEW);
  assert.equal(review.status, 'validated_with_conditions');
  assert.ok(review.needsReviewSince > review.reviewedVersion);
});
