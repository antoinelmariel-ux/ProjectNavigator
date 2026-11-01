import { test, expect } from '@playwright/test';
import { gotoHome, createAndSubmitProject, grantAdminAccess, patchStateOnBoot, readStoredState } from './fixtures.js';

// Calendrier des comités (docs/specs/calendrier-comites.md). Le comité de test se déclenche dès
// qu'une équipe d'experts l'est — ce que fait toujours le projet rempli par l'autopilote.
const MOCK_USER = 'bertrand.darieux@lfb.fr';
const COMMITTEE_ID = 'committee-e2e';

const daysFromNow = (days, hours = 14) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hours, 0, 0, 0);
  return date.toISOString();
};

const toDateTimeLocal = (iso) => {
  const date = new Date(iso);
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const seedCommittee = (page, { president, members, sessions = [] }) => patchStateOnBoot(
  page,
  (stored, seed) => {
    const state = stored || {};
    if (!state.__committeeSeeded) {
      state.validationCommitteeConfig = {
        enabled: true,
        committees: [{
          id: seed.committeeId,
          name: 'Comité E2E',
          emails: seed.members,
          presidentEmail: seed.president,
          defaultPassageMinutes: 20,
          teamTriggers: { minTeamsCount: 1 }
        }]
      };
      state.committeeSessions = seed.sessions;
      state.__committeeSeeded = true;
    }
    return state;
  },
  { committeeId: COMMITTEE_ID, president, members, sessions }
);

const openCommitteeSection = async (page) => {
  const toggle = page.getByRole('region', { name: /Avis Comité/ }).getByRole('button', { name: /Avis Comité/ });
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click();
  }
  await expect(page.getByTestId(`committee-session-${COMMITTEE_ID}-panel`)).toBeVisible();
};

test.describe('Calendrier des comités', () => {
  test('le président planifie et publie une séance depuis le back-office', async ({ page }) => {
    test.slow();
    await seedCommittee(page, { president: MOCK_USER, members: [MOCK_USER, 'membre@lfb.fr'] });
    await gotoHome(page);
    await grantAdminAccess(page);

    await page.getByRole('tab', { name: /Comités de validation/ }).click();
    const calendar = page.getByTestId('committee-calendar');
    await expect(calendar).toBeVisible();
    await expect(page.getByRole('button', { name: /Configuration des comités/ })).toHaveAttribute('aria-expanded', 'false');

    const start = daysFromNow(12);
    const generator = page.getByTestId('committee-generator');
    const generatorToggle = generator.getByRole('button', { name: 'Planifier des séances' });
    if ((await generatorToggle.getAttribute('aria-expanded')) !== 'true') {
      await generatorToggle.click();
    }
    await generator.getByLabel('Séance supplémentaire').fill(toDateTimeLocal(start));
    await generator.getByRole('button', { name: 'Ajouter', exact: true }).click();

    const day = page.getByTestId('committee-calendar-day');
    await expect(day.getByTestId('committee-planner-session')).toHaveCount(1);
    await expect(day.getByTestId('committee-planner-session').getByText('Brouillon', { exact: true })).toBeVisible();

    await day.getByRole('button', { name: 'Publier' }).click();
    await expect(day.getByText('Séance publiée : les inscriptions sont ouvertes.')).toBeVisible();

    await page.getByRole('button', { name: /Configuration des comités/ }).click();
    await expect(page.getByLabel('Président(e)', { exact: true })).toHaveValue(MOCK_USER);

    await expect
      .poll(async () => (await readStoredState(page)).committeeSessions?.map((session) => session.status))
      .toEqual(['published']);
  });

  test('le chef de projet ne voit que les séances ouvertes, s’inscrit et demande plus de temps', async ({ page }) => {
    test.slow();
    await seedCommittee(page, {
      president: 'president@lfb.fr',
      members: ['president@lfb.fr', 'membre@lfb.fr'],
      sessions: [
        { id: 'session-open', committeeId: COMMITTEE_ID, startAt: daysFromNow(10), durationMinutes: 60, status: 'published', agenda: [] },
        { id: 'session-too-close', committeeId: COMMITTEE_ID, startAt: daysFromNow(2), durationMinutes: 60, status: 'published', agenda: [] },
        { id: 'session-draft', committeeId: COMMITTEE_ID, startAt: daysFromNow(20), durationMinutes: 60, status: 'draft', agenda: [] }
      ]
    });
    await gotoHome(page);
    await createAndSubmitProject(page);
    await openCommitteeSection(page);

    const panel = page.getByTestId(`committee-session-${COMMITTEE_ID}-panel`);
    const select = panel.getByLabel('Choisir une séance');
    await expect(select.locator('option')).toHaveCount(1);

    await panel.getByRole('button', { name: 'Inscrire le projet' }).click();
    await expect(panel.getByTestId(`committee-session-${COMMITTEE_ID}-upcoming`)).toContainText('Prochain passage (n° 1)');
    await expect(panel.getByText(/réservez toute la séance/)).toBeVisible();

    await panel.getByRole('button', { name: 'Demander plus de temps' }).click();
    await panel.getByLabel(/Justification/).fill('Projet multi-pays, beaucoup de questions attendues.');
    await panel.getByRole('button', { name: 'Envoyer la demande' }).click();
    await expect(panel.getByText(/20 min supplémentaires en attente/)).toBeVisible();

    await expect
      .poll(async () => {
        const stored = await readStoredState(page);
        const session = stored.committeeSessions?.find((entry) => entry.id === 'session-open');
        return session?.agenda?.map((passage) => [passage.minutes, passage.timeRequest?.status]);
      })
      .toEqual([[20, 'pending']]);
  });

  test('le président anime la séance depuis l’ordre du jour : durée, présences', async ({ page }) => {
    test.slow();
    await seedCommittee(page, {
      president: MOCK_USER,
      members: [MOCK_USER, 'membre@lfb.fr', 'autre.membre@lfb.fr'],
      sessions: [
        { id: 'session-chair', committeeId: COMMITTEE_ID, startAt: daysFromNow(10), durationMinutes: 60, status: 'published', agenda: [] }
      ]
    });
    await gotoHome(page);
    await createAndSubmitProject(page);
    await openCommitteeSection(page);

    const panel = page.getByTestId(`committee-session-${COMMITTEE_ID}-panel`);
    await panel.getByRole('button', { name: 'Inscrire le projet' }).click();
    await panel.getByRole('button', { name: 'Voir l’ordre du jour' }).click();

    const agenda = page.getByTestId('committee-agenda');
    await expect(agenda.getByRole('heading', { name: 'Comité E2E' })).toBeVisible();
    await expect(agenda.getByTestId('committee-agenda-passage')).toHaveCount(1);
    await expect(agenda.getByRole('button', { name: 'Vitrine' })).toBeVisible();
    await expect(agenda.getByText('20 min attribuées sur 60 min')).toBeVisible();

    const firstPassage = agenda.getByTestId('committee-agenda-passage').first();
    await firstPassage.getByLabel('Durée (min)').fill('30');
    await firstPassage.getByRole('button', { name: 'Appliquer' }).click();
    await expect(agenda.getByText('30 min attribuées sur 60 min')).toBeVisible();

    await agenda.getByRole('button', { name: 'Tous présents' }).click();
    await expect(agenda.getByText('3 présent(s) · 0 excusé(s) · 0 absent(s)').first()).toBeVisible();
    await agenda.getByRole('group', { name: 'Présence de Membre' }).getByRole('button', { name: 'Excusé' }).click();
    await expect(agenda.getByText('2 présent(s) · 1 excusé(s) · 0 absent(s)').first()).toBeVisible();

    await expect
      .poll(async () => {
        const stored = await readStoredState(page);
        const session = stored.committeeSessions?.find((entry) => entry.id === 'session-chair');
        return [session?.agenda?.[0]?.minutes, session?.attendance?.['membre@lfb.fr']];
      })
      .toEqual([30, 'excused']);

    // Un sujet hors projet prend du temps de séance, comme un projet.
    const topicForm = agenda.getByTestId('committee-agenda-topic-form');
    await topicForm.getByLabel('Sujet', { exact: true }).fill('Point RGPD');
    const presenterField = topicForm.getByRole('textbox', { name: /Intervenant/ }).first();
    await presenterField.fill('dpo@lfb.fr');
    await presenterField.press('Enter');
    await topicForm.getByRole('button', { name: 'Ajouter le sujet' }).click();
    await expect(agenda.getByText('Présenté par Dpo')).toBeVisible();
    await expect
      .poll(async () => (await readStoredState(page)).committeeSessions
        ?.find((entry) => entry.id === 'session-chair')?.agenda?.find((passage) => passage.kind === 'topic')?.presenterEmails)
      .toEqual(['dpo@lfb.fr']);
    await expect(agenda.getByTestId('committee-agenda-passage')).toHaveCount(2);
    await expect(agenda.getByRole('heading', { name: 'Point RGPD' })).toBeVisible();
    await expect(agenda.getByText('40 min attribuées sur 60 min')).toBeVisible();

    // Le président annule la séance depuis l'ordre du jour.
    page.once('dialog', (dialog) => dialog.accept());
    await agenda.getByRole('button', { name: 'Annuler la séance' }).click();
    await expect(agenda.getByText('Cette séance est annulée.')).toBeVisible();
    await expect
      .poll(async () => (await readStoredState(page)).committeeSessions?.find((entry) => entry.id === 'session-chair')?.status)
      .toBe('cancelled');

    await agenda.getByRole('button', { name: /Retour/ }).click();
    await expect(page.getByRole('heading', { name: 'Enjeux du projet' })).toBeVisible();
  });
});
