import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getMissingForPreliminaryRequest, getProjectReadiness, READINESS_ORIENTATION } from '../src/utils/projectReadiness.js';
import { PROJECT_STAGE_ANSWER_KEY } from '../src/utils/projectStage.js';

const questions = [
  { id: 'core', required: true },
  { id: 'later', required: true, requiredFromStage: 'design' }
];

const isOrientationReached = (answers) =>
  getProjectReadiness(questions, answers).levels.find((level) => level.id === READINESS_ORIENTATION).reached;

test('preliminary request only requires the core questions, whatever the declared stage', () => {
  for (const stage of ['framing', 'design', 'pre_launch', undefined]) {
    const answers = { core: 'oui' };
    if (stage) {
      answers[PROJECT_STAGE_ANSWER_KEY] = stage;
    }
    assert.deepEqual(getMissingForPreliminaryRequest(questions, answers), [], `stage ${stage}`);
    assert.equal(isOrientationReached(answers), true, `stage ${stage}`);
  }
});

test('preliminary request stays blocked while a core question is missing', () => {
  const answers = { [PROJECT_STAGE_ANSWER_KEY]: 'pre_launch', later: 'x' };
  assert.deepEqual(getMissingForPreliminaryRequest(questions, answers).map((q) => q.id), ['core']);
  assert.equal(isOrientationReached(answers), false);
});
