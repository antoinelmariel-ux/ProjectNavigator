import { test, expect } from '@playwright/test';
import { gotoHome, createAndSubmitProject, goToProjectsHome, patchStateOnBoot } from './fixtures.js';

// « Mes passages en comité » : un porteur qui n'est pas membre du comité retrouve ses passages,
// l'ordre du jour de la séance (les autres points masqués) et, après la séance, la décision.
const COMMITTEE_ID = 'committee-e2e';

const daysFromNow = (days, hours = 14) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hours, 0, 0, 0);
  return date.toISOString();
};

const seedCommittee = (page, sessions) => patchStateOnBoot(
  page,
  (stored, seed) => {
    const state = stored || {};
    const alreadySeeded = Array.isArray(state.validationCommitteeConfig?.committees)
      && state.validationCommitteeConfig.committees.some((committee) => committee?.id === seed.committeeId);
    if (!alreadySeeded) {
      state.validationCommitteeConfig = {
        enabled: true,
        committees: [{
          id: seed.committeeId,
          name: 'Comité E2E',
          emails: ['president@lfb.fr', 'membre@lfb.fr'],
          presidentEmail: 'president@lfb.fr',
          defaultPassageMinutes: 20,
          teamTriggers: { minTeamsCount: 1 }
        }]
      };
      state.committeeSessions = seed.sessions;
    }
    return state;
  },
  { committeeId: COMMITTEE_ID, sessions }
);

// Fait passer la séance dans le passé et y consigne la décision du comité sur le projet, comme
// le ferait le président depuis l'ordre du jour.
const moveSessionToPastWithDecision = (stored, seed) => {
  if (!stored || window.localStorage.getItem('__e2ePastSession') !== '1') {
    return stored;
  }
  const session = (stored.committeeSessions || []).find((entry) => entry.id === seed.sessionId);
  if (!session) {
    return stored;
  }
  session.startAt = seed.startAt;
  const booked = session.agenda.find((passage) => passage.projectId);
  const project = (stored.projects || []).find((entry) => entry.id === booked?.projectId);
  if (project) {
    const comments = project.answers.__compliance_team_comments__ || { teams: {}, committees: {} };
    comments.committees = {
      ...(comments.committees || {}),
      [seed.committeeId]: {
        status: 'validated_with_conditions',
        comment: '<p>Revoir la clause de consentement.</p>',
        sessionId: seed.sessionId,
        sessionOutcomes: {
          [seed.sessionId]: { status: 'validated_with_conditions', comment: '<p>Revoir la clause de consentement.</p>' }
        }
      }
    };
    project.answers.__compliance_team_comments__ = comments;
  }
  return stored;
};

const bookFromSynthesis = async (page) => {
  const toggle = page.getByRole('region', { name: /Avis Comité/ }).getByRole('button', { name: /Avis Comité/ });
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click();
  }
  const panel = page.getByTestId(`committee-session-${COMMITTEE_ID}-panel`);
  await panel.getByRole('button', { name: 'Inscrire le projet' }).click();
  await expect(panel.getByTestId(`committee-session-${COMMITTEE_ID}-upcoming`)).toBeVisible();
  return panel;
};

test.describe('Mes passages en comité', () => {
  test('sans passage, aucune entrée ; une fois inscrit, le porteur retrouve son créneau et l’ordre du jour masqué', async ({ page }) => {
    test.slow();
    await seedCommittee(page, [{
      id: 'session-open',
      committeeId: COMMITTEE_ID,
      startAt: daysFromNow(5),
      durationMinutes: 90,
      status: 'published',
      agenda: [{ id: 'topic-hr', kind: 'topic', title: 'Point RH confidentiel', minutes: 15 }]
    }]);
    await gotoHome(page);
    await expect(page.getByTestId('nav-committee-passages')).toHaveCount(0);

    await createAndSubmitProject(page);
    const panel = await bookFromSynthesis(page);
    await expect(panel.getByTestId(`committee-session-${COMMITTEE_ID}-my-passages`)).toBeVisible();

    await goToProjectsHome(page);
    await expect(page.getByTestId('home-committee-passage-hint')).toContainText('Prochain passage : Comité E2E');
    const navButton = page.getByTestId('nav-committee-passages');
    await expect(navButton).toHaveAttribute('aria-label', 'Mes passages en comité (1 à venir)');
    await navButton.click();

    const screen = page.getByTestId('my-committee-passages');
    const card = screen.getByTestId('my-committee-passage');
    await expect(card).toHaveCount(1);
    await expect(card).toHaveAttribute('data-passage-state', 'upcoming');
    await expect(card).toContainText('passage n° 1');
    await expect(card).toContainText('position 2 sur 2');

    await card.getByRole('button', { name: 'Voir la séance' }).click();
    const agenda = page.getByTestId('committee-agenda-participant');
    await expect(agenda).toBeVisible();
    await expect(agenda.getByTestId('committee-agenda-participant-mine')).toHaveCount(1);
    await expect(agenda.getByTestId('committee-agenda-participant-other')).toHaveCount(1);
    await expect(agenda.getByTestId('committee-agenda-participant-other')).toContainText('Autre passage');
    await expect(page.getByText('Point RH confidentiel')).toHaveCount(0);
    await expect(page.getByTestId('committee-agenda')).toHaveCount(0);

    await agenda.getByRole('button', { name: 'Tous mes passages en comité' }).click();
    await expect(page.getByTestId('my-committee-passages')).toBeVisible();
  });

  test('après la séance, le porteur lit la décision figée pour ce passage', async ({ page }) => {
    test.slow();
    await seedCommittee(page, [{
      id: 'session-held',
      committeeId: COMMITTEE_ID,
      startAt: daysFromNow(10),
      durationMinutes: 60,
      status: 'published',
      agenda: []
    }]);
    await gotoHome(page);
    await createAndSubmitProject(page);
    await bookFromSynthesis(page);
    await goToProjectsHome(page);

    await patchStateOnBoot(page, moveSessionToPastWithDecision, {
      sessionId: 'session-held',
      committeeId: COMMITTEE_ID,
      startAt: daysFromNow(-3, 9)
    });
    await page.evaluate(() => window.localStorage.setItem('__e2ePastSession', '1'));
    await page.goto('/index.html');

    await expect(page.getByTestId('home-committee-passage-hint')).toContainText('Dernier passage : Comité E2E');
    await expect(page.getByTestId('nav-committee-passages')).toHaveAttribute('aria-label', 'Mes passages en comité (0 à venir)');
    await page.getByTestId('nav-committee-passages').click();

    const card = page.getByTestId('my-committee-passage');
    await expect(card).toHaveAttribute('data-passage-state', 'past');
    await expect(card.getByTestId('committee-agenda-decision-badge')).toContainText('Validé sous conditions');
    await expect(card).toContainText('Revoir la clause de consentement.');
  });
});
