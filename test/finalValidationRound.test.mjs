import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIRMATION_CONFIRMED,
  CONFIRMATION_REEXAMINING,
  FINAL_ROUND_KEY,
  getFinalValidationRound,
  getFinalValidationRoundStatus,
  getPerimeterConfirmationState,
  hasLaunchReminderBeenSent,
  markLaunchReminderSent,
  startFinalValidationRound,
  withPerimeterConfirmation
} from '../src/utils/finalValidationRound.js';
import {
  LAUNCH_CONFIRMATION_AWAITING,
  LAUNCH_CONFIRMATION_CONFIRMED,
  LAUNCH_CONFIRMATION_LATE,
  LAUNCH_CONFIRMATION_DUE,
  LAUNCH_CONFIRMATION_LAUNCHED_WITHOUT,
  LAUNCH_CONFIRMATION_NONE,
  getDaysUntilLaunch,
  getDueLaunchReminder,
  getLaunchConfirmationSignal,
  normalizeLaunchReminderDays
} from '../src/utils/launchConfirmation.js';
import {
  getProjectLaunch,
  isProjectLaunched,
  withProjectLaunch,
  withoutProjectLaunch
} from '../src/utils/projectLaunch.js';

const REQUESTED_AT = '2026-05-01T09:00:00.000Z';

const requested = (answers = {}) =>
  startFinalValidationRound(answers, { by: 'porteur@lfb.fr', version: 2, at: REQUESTED_AT });

const perimeter = (entry, id = 'quality') => [{ id, hasOpinion: true, entry }];

test('un round n’existe que s’il a été demandé, et la demande est explicite', () => {
  assert.equal(getFinalValidationRound({}).round, 0);
  assert.equal(getFinalValidationRoundStatus({}, perimeter({ status: 'validated' })).isRequested, false);
  assert.equal(getFinalValidationRoundStatus({}, perimeter({ status: 'validated' })).isComplete, false);

  const answers = requested();
  const round = getFinalValidationRound(answers);
  assert.equal(round.round, 1);
  assert.equal(round.requestedBy, 'porteur@lfb.fr');
  assert.equal(round.version, 2);
});

test('seuls les périmètres qui se sont prononcés entrent en confirmation', () => {
  const answers = requested();
  const status = getFinalValidationRoundStatus(answers, [
    { id: 'quality', hasOpinion: true, entry: { status: 'validated' } },
    // Jamais répondu : relève de la sollicitation ordinaire, pas d'un tour de confirmation d'un
    // avis qui n'existe pas.
    { id: 'legal', hasOpinion: false, entry: {} }
  ]);

  assert.deepEqual(status.pending, ['quality']);
  assert.equal(status.isComplete, false);
});

test('confirmer en un clic suffit, et reprendre son avis vaut confirmation', () => {
  const answers = requested();

  const clicked = withPerimeterConfirmation({ status: 'validated' }, { round: 1, by: 'expert@lfb.fr' });
  assert.equal(getPerimeterConfirmationState(clicked, 1, REQUESTED_AT), CONFIRMATION_CONFIRMED);
  assert.equal(getFinalValidationRoundStatus(answers, perimeter(clicked)).isComplete, true);

  // Un avis repris après la demande : acte plus fort que le clic, il compte comme confirmation.
  const rewritten = { status: 'validated', reviewedAt: '2026-05-02T10:00:00.000Z' };
  assert.equal(getPerimeterConfirmationState(rewritten, 1, REQUESTED_AT), CONFIRMATION_CONFIRMED);

  // Le même avis, mais rendu *avant* la demande : il reste à confirmer.
  const older = { status: 'validated', reviewedAt: '2026-04-01T10:00:00.000Z' };
  assert.equal(getPerimeterConfirmationState(older, 1, REQUESTED_AT), '');
});

test('« je dois réexaminer » laisse le round ouvert jusqu’à un nouvel avis', () => {
  const answers = requested();
  const reexamining = withPerimeterConfirmation(
    { status: 'validated' },
    { round: 1, state: CONFIRMATION_REEXAMINING }
  );

  const status = getFinalValidationRoundStatus(answers, perimeter(reexamining));
  assert.deepEqual(status.reexamining, ['quality']);
  assert.equal(status.isComplete, false);

  // L'expert reprend son avis : le round se referme.
  const resolved = { ...reexamining, reviewedAt: '2026-05-03T08:00:00.000Z' };
  assert.equal(getFinalValidationRoundStatus(answers, perimeter(resolved)).isComplete, true);
});

test('une confirmation ne vaut que pour son round : un lancement repoussé en redemande une', () => {
  const first = requested();
  const confirmed = withPerimeterConfirmation({ status: 'validated' }, { round: 1 });
  assert.equal(getFinalValidationRoundStatus(first, perimeter(confirmed)).isComplete, true);

  const second = startFinalValidationRound(first, { by: 'porteur@lfb.fr', version: 3, at: '2026-11-01T09:00:00.000Z' });
  assert.equal(getFinalValidationRound(second).round, 2);
  assert.deepEqual(getFinalValidationRound(second).history.map((entry) => entry.round), [1]);
  // La confirmation du round 1 ne referme pas le round 2.
  assert.equal(getFinalValidationRoundStatus(second, perimeter(confirmed)).isComplete, false);
  assert.deepEqual(getFinalValidationRoundStatus(second, perimeter(confirmed)).pending, ['quality']);
});

test('les rappels avant lancement sont datés et idempotents', () => {
  let answers = requested();
  assert.equal(hasLaunchReminderBeenSent(answers, 30), false);
  answers = markLaunchReminderSent(answers, 30, '2026-05-01T09:00:00.000Z');
  assert.equal(hasLaunchReminderBeenSent(answers, 30), true);
  assert.equal(hasLaunchReminderBeenSent(answers, 10), false);
  // Ouvrir un nouveau round ne réarme pas les rappels déjà envoyés.
  assert.equal(hasLaunchReminderBeenSent(startFinalValidationRound(answers, {}), 30), true);
  assert.equal(FINAL_ROUND_KEY in answers, true);
});

const NOW = new Date('2026-05-01T12:00:00.000Z');

test('le signal de confirmation suit la date de lancement déclarée', () => {
  const withLaunch = (date) => ({ launchDate: date });

  assert.equal(getDaysUntilLaunch(withLaunch('2026-05-21'), NOW), 20);
  assert.equal(getDaysUntilLaunch({}, NOW), null);
  assert.equal(getDaysUntilLaunch(withLaunch('pas une date'), NOW), null);

  const notRequested = { isRequested: false, isComplete: false };

  assert.equal(
    getLaunchConfirmationSignal({ answers: withLaunch('2026-12-01'), roundStatus: notRequested, now: NOW }),
    LAUNCH_CONFIRMATION_NONE
  );
  assert.equal(
    getLaunchConfirmationSignal({ answers: withLaunch('2026-05-21'), roundStatus: notRequested, now: NOW }),
    LAUNCH_CONFIRMATION_DUE
  );
  assert.equal(
    getLaunchConfirmationSignal({ answers: withLaunch('2026-05-21'), roundStatus: { isRequested: true }, now: NOW }),
    LAUNCH_CONFIRMATION_AWAITING
  );
  // Date passée alors que le tour est ouvert : ce n'est pas le porteur qui est en faute, c'est
  // le lancement qui attend la compliance.
  assert.equal(
    getLaunchConfirmationSignal({ answers: withLaunch('2026-04-01'), roundStatus: { isRequested: true }, now: NOW }),
    LAUNCH_CONFIRMATION_LATE
  );
  // Date passée sans que personne n'ait rien demandé : c'est au porteur d'agir, et rien ne
  // permet d'affirmer que le projet est parti.
  assert.equal(
    getLaunchConfirmationSignal({ answers: withLaunch('2026-04-01'), roundStatus: notRequested, now: NOW }),
    LAUNCH_CONFIRMATION_DUE
  );
  assert.equal(
    getLaunchConfirmationSignal({ answers: withLaunch('2026-04-01'), roundStatus: { isComplete: true }, now: NOW }),
    LAUNCH_CONFIRMATION_CONFIRMED
  );
  // Sans date déclarée, rien n'est dû tant que personne n'a demandé le round.
  assert.equal(
    getLaunchConfirmationSignal({ answers: {}, roundStatus: notRequested, now: NOW }),
    LAUNCH_CONFIRMATION_NONE
  );
});

test('le rappel le plus proche du lancement l’emporte, et zéro le désactive', () => {
  const answers = (date) => ({ launchDate: date });

  assert.equal(getDueLaunchReminder({ answers: answers('2026-05-21'), roundStatus: {}, now: NOW }), 30);
  assert.equal(getDueLaunchReminder({ answers: answers('2026-05-06'), roundStatus: {}, now: NOW }), 10);
  assert.equal(getDueLaunchReminder({ answers: answers('2026-12-01'), roundStatus: {}, now: NOW }), null);
  assert.equal(getDueLaunchReminder({ answers: answers('2026-04-01'), roundStatus: {}, now: NOW }), null);
  assert.equal(
    getDueLaunchReminder({ answers: answers('2026-05-06'), roundStatus: { isComplete: true }, now: NOW }),
    null
  );
  assert.equal(
    getDueLaunchReminder({
      answers: answers('2026-05-06'),
      roundStatus: {},
      now: NOW,
      reminderDays: { first: 0, second: 0 }
    }),
    null
  );

  assert.deepEqual(normalizeLaunchReminderDays(undefined), { first: 30, second: 10 });
  assert.deepEqual(normalizeLaunchReminderDays({ first: 45, second: 0 }), { first: 45, second: 0 });
  assert.deepEqual(normalizeLaunchReminderDays({ first: -3 }), { first: 30, second: 10 });
});

test('un lancement se déclare, il ne se déduit jamais d’une date', () => {
  const overdue = { launchDate: '2026-04-01' };
  const openRound = { isRequested: true, isComplete: false };

  // Une date dépassée ne dit rien du lancement : elle est prévisionnelle, et le porteur attend
  // en général sa confirmation pour partir.
  assert.equal(isProjectLaunched(overdue), false);
  assert.equal(
    getLaunchConfirmationSignal({ answers: overdue, roundStatus: openRound, now: NOW }),
    LAUNCH_CONFIRMATION_LATE
  );

  // Déclaré lancé avec un tour incomplet : là, et seulement là, l'application peut l'affirmer.
  const launched = withProjectLaunch(overdue, { by: 'expert@lfb.fr', at: '2026-04-15T08:00:00.000Z' });
  assert.equal(isProjectLaunched(launched), true);
  assert.equal(getProjectLaunch(launched).declaredBy, 'expert@lfb.fr');
  assert.equal(
    getLaunchConfirmationSignal({ answers: launched, roundStatus: openRound, now: NOW }),
    LAUNCH_CONFIRMATION_LAUNCHED_WITHOUT
  );

  // Déclaré lancé après un tour complet : rien à signaler.
  assert.equal(
    getLaunchConfirmationSignal({ answers: launched, roundStatus: { isComplete: true }, now: NOW }),
    LAUNCH_CONFIRMATION_CONFIRMED
  );

  // Rappeler une date de lancement à un projet déjà parti n'a plus d'objet.
  assert.equal(
    getDueLaunchReminder({ answers: withProjectLaunch({ launchDate: '2026-05-06' }), roundStatus: {}, now: NOW }),
    null
  );

  // Un clic malheureux se corrige, et l'historique garde trace des deux gestes.
  const reverted = withoutProjectLaunch(launched, { by: 'admin@lfb.fr', at: '2026-04-16T08:00:00.000Z' });
  assert.equal(isProjectLaunched(reverted), false);
  assert.deepEqual(getProjectLaunch(reverted).history.map((entry) => entry.action), ['declare', 'revert']);
  assert.equal(
    getLaunchConfirmationSignal({ answers: reverted, roundStatus: openRound, now: NOW }),
    LAUNCH_CONFIRMATION_LATE
  );
});
