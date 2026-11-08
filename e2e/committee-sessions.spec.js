import { test, expect } from '@playwright/test';
import { gotoHome, createAndSubmitProject, grantAdminAccess, patchStateOnBoot, readStoredState, openBackOfficeTab, confirmInAppDialog } from './fixtures.js';

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
    // Le marqueur ne survit pas à l'enregistrement de l'application : c'est la présence du comité
    // qui dit si l'on a déjà semé, sinon un rechargement effacerait ce que le test vient de régler.
    const alreadySeeded = Array.isArray(state.validationCommitteeConfig?.committees)
      && state.validationCommitteeConfig.committees.some((committee) => committee?.id === seed.committeeId);
    if (!alreadySeeded) {
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

    await openBackOfficeTab(page, /Comités de validation/);
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

  test('un administrateur désigne le président et le co-président, et cela persiste', async ({ page }) => {
    test.slow();
    await seedCommittee(page, { president: '', members: [MOCK_USER, 'membre@lfb.fr', 'autre.membre@lfb.fr'] });
    await gotoHome(page);
    await grantAdminAccess(page);

    await openBackOfficeTab(page, /Comités de validation/);
    await page.getByRole('button', { name: /Configuration des comités/ }).click();

    const chairs = page.getByTestId(`committee-chairs-${COMMITTEE_ID}`);
    const president = chairs.getByLabel('Président(e)', { exact: true });
    const vicePresident = chairs.getByLabel('Co-président(e)', { exact: true });
    await expect(president).toBeEnabled();
    await expect(president).toHaveValue('');
    await president.selectOption('membre@lfb.fr');
    await vicePresident.selectOption('autre.membre@lfb.fr');
    await expect(president).toHaveValue('membre@lfb.fr');
    await expect(vicePresident).toHaveValue('autre.membre@lfb.fr');

    await expect
      .poll(async () => {
        const committee = (await readStoredState(page)).validationCommitteeConfig?.committees?.find((entry) => entry.id === COMMITTEE_ID);
        return [committee?.presidentEmail, committee?.vicePresidentEmail];
      })
      .toEqual(['membre@lfb.fr', 'autre.membre@lfb.fr']);

    // Après rechargement, la présidence est toujours là.
    await page.reload();
    await page.getByRole('button', { name: /Accéder au Back-office/ }).click();
    await openBackOfficeTab(page, /Comités de validation/);
    await page.getByRole('button', { name: /Configuration des comités/ }).click();
    await expect(page.getByTestId(`committee-chairs-${COMMITTEE_ID}`).getByLabel('Président(e)', { exact: true })).toHaveValue('membre@lfb.fr');
    await expect(page.getByTestId(`committee-chairs-${COMMITTEE_ID}`).getByLabel('Co-président(e)', { exact: true })).toHaveValue('autre.membre@lfb.fr');
  });

  test('un simple membre du comité voit la présidence sans pouvoir la changer, et sait pourquoi', async ({ page }) => {
    await seedCommittee(page, { president: 'president@lfb.fr', members: ['president@lfb.fr', MOCK_USER] });
    await gotoHome(page);
    await page.getByRole('button', { name: /Accéder au Back-office/ }).click();
    await openBackOfficeTab(page, /Comités de validation/);
    await page.getByRole('button', { name: /Configuration des comités/ }).click();

    const chairs = page.getByTestId(`committee-chairs-${COMMITTEE_ID}`);
    await expect(chairs.getByTestId(`committee-chairs-${COMMITTEE_ID}-readonly`)).toContainText('Seuls un administrateur');
    await expect(chairs.getByLabel('Président(e)', { exact: true })).toBeDisabled();
    await expect(page.getByTestId('committee-generator')).toHaveCount(0);
  });

  test('le président planifie une séance en cliquant sur une case vide du calendrier', async ({ page }) => {
    test.slow();
    await seedCommittee(page, { president: MOCK_USER, members: [MOCK_USER, 'membre@lfb.fr'] });
    await gotoHome(page);
    await grantAdminAccess(page);

    await openBackOfficeTab(page, /Comités de validation/);
    const target = new Date(daysFromNow(2));
    if (target.getMonth() !== new Date().getMonth()) {
      await page.getByRole('button', { name: 'Mois suivant' }).click();
    }
    const pad = (value) => String(value).padStart(2, '0');
    const dayKey = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;
    await page.locator(`button[data-day="${dayKey}"]`).click();

    const day = page.getByTestId('committee-calendar-day');
    await expect(day.getByText('Aucune séance ce jour.')).toBeVisible();
    await day.getByRole('button', { name: 'Créer en brouillon' }).click();

    await expect(day.getByTestId('committee-planner-session')).toHaveCount(1);
    await expect(day.getByText('Brouillon', { exact: true })).toBeVisible();
    await expect(page.locator(`button[data-day="${dayKey}"]`)).toContainText('14:00');

    await expect
      .poll(async () => (await readStoredState(page)).committeeSessions?.map((session) => session.status))
      .toEqual(['draft']);
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

    // Les points sont repliés par défaut : on déplie celui qu'on veut animer.
    const firstPassage = agenda.getByTestId('committee-agenda-passage').first();
    await expect(firstPassage.getByLabel('Durée (min)')).toHaveCount(0);
    await firstPassage.getByRole('button', { name: /Afficher ou masquer le détail/ }).click();
    await firstPassage.getByLabel('Durée (min)').fill('30');
    await firstPassage.getByRole('button', { name: 'Appliquer' }).click();
    await expect(agenda.getByText('30 min attribuées sur 60 min')).toBeVisible();

    await agenda.getByRole('button', { name: 'Tous présents' }).click();
    await expect(agenda.getByText('3 présents · 0 excusé · 0 absent').first()).toBeVisible();
    await agenda.getByRole('group', { name: 'Présence de Membre' }).getByRole('button', { name: 'Excusé' }).click();
    await expect(agenda.getByText('2 présents · 1 excusé · 0 absent').first()).toBeVisible();

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
    await agenda.getByRole('button', { name: 'Tout déplier' }).click();
    await expect(agenda.getByText('Présenté par Dpo')).toBeVisible();
    await expect
      .poll(async () => (await readStoredState(page)).committeeSessions
        ?.find((entry) => entry.id === 'session-chair')?.agenda?.find((passage) => passage.kind === 'topic')?.presenterEmails)
      .toEqual(['dpo@lfb.fr']);
    await expect(agenda.getByTestId('committee-agenda-passage')).toHaveCount(2);
    await expect(agenda.getByRole('heading', { name: 'Point RGPD' })).toBeVisible();
    await expect(agenda.getByText('40 min attribuées sur 60 min')).toBeVisible();

    // Le président annule la séance depuis l'ordre du jour.
    await agenda.getByRole('button', { name: 'Annuler la séance' }).click();
    await confirmInAppDialog(page);
    await expect(agenda.getByText('Cette séance est annulée.')).toBeVisible();
    await expect
      .poll(async () => (await readStoredState(page)).committeeSessions?.find((entry) => entry.id === 'session-chair')?.status)
      .toBe('cancelled');

    await agenda.getByRole('button', { name: /Retour/ }).click();
    await expect(page.getByRole('heading', { name: 'Enjeux du projet' })).toBeVisible();
  });

  test('le président consigne la décision du comité sur l’ordre du jour, reliée à la synthèse, et la retrouve par la recherche', async ({ page }) => {
    test.slow();
    await seedCommittee(page, {
      president: MOCK_USER,
      members: [MOCK_USER, 'membre@lfb.fr'],
      sessions: [
        { id: 'session-decision', committeeId: COMMITTEE_ID, startAt: daysFromNow(10), durationMinutes: 90, status: 'published', agenda: [] }
      ]
    });
    await gotoHome(page);
    await createAndSubmitProject(page);
    await openCommitteeSection(page);

    const panel = page.getByTestId(`committee-session-${COMMITTEE_ID}-panel`);
    await panel.getByRole('button', { name: 'Inscrire le projet' }).click();
    await panel.getByRole('button', { name: 'Voir l’ordre du jour' }).click();

    const agenda = page.getByTestId('committee-agenda');
    const topicForm = agenda.getByTestId('committee-agenda-topic-form');
    await topicForm.getByLabel('Sujet', { exact: true }).fill('Charte éthique des données');
    await topicForm.getByRole('button', { name: 'Ajouter le sujet' }).click();
    await expect(agenda.getByTestId('committee-agenda-passage')).toHaveCount(2);

    await agenda.getByRole('button', { name: 'Tout déplier' }).click();
    const decisions = agenda.getByTestId('committee-agenda-decision');
    await expect(decisions).toHaveCount(2);

    // Sujet libre : décision et commentaire vivent sur le passage, dans la séance.
    const topicPassage = agenda.getByTestId('committee-agenda-passage').filter({ hasText: 'Charte éthique des données' });
    await topicPassage.locator('select[id$="-status"]').selectOption('validated_with_conditions');
    await topicPassage.locator('[contenteditable="true"]').click();
    await page.keyboard.type('Adoptée sous réserve de relecture juridique.');
    await topicPassage.getByRole('button', { name: 'Enregistrer la décision' }).click();
    await expect(topicPassage.getByTestId('committee-agenda-decision-badge').first()).toContainText('Validé sous conditions');
    await expect
      .poll(async () => (await readStoredState(page)).committeeSessions
        ?.find((entry) => entry.id === 'session-decision')?.agenda?.find((passage) => passage.kind === 'topic')?.decision?.status)
      .toBe('validated_with_conditions');

    // Projet Project Navigator : la décision est l'avis du comité de sa synthèse.
    const projectPassage = agenda.getByTestId('committee-agenda-passage').filter({ hasNotText: 'Charte éthique des données' });
    await projectPassage.locator('select[id$="-status"]').selectOption('validated');
    await projectPassage.locator('[contenteditable="true"]').click();
    await page.keyboard.type('Projet validé par le comité.');
    await projectPassage.getByRole('button', { name: 'Enregistrer la décision' }).click();
    await expect(projectPassage.getByTestId('committee-agenda-decision-badge').first()).toContainText('Validé');
    await expect
      .poll(async () => {
        const project = (await readStoredState(page)).projects?.find((entry) => entry.answers?.__compliance_team_comments__?.committees?.[COMMITTEE_ID]);
        const entry = project?.answers?.__compliance_team_comments__?.committees?.[COMMITTEE_ID];
        return [entry?.status, entry?.comment, entry?.sessionOutcomes?.['session-decision']?.status];
      })
      .toEqual(['validated', expect.stringContaining('Projet validé par le comité.'), 'validated']);

    // Retour au back-office : le sujet se retrouve par son titre ou son commentaire.
    await grantAdminAccess(page);
    await openBackOfficeTab(page, /Comités de validation/);
    const search = page.getByTestId('committee-agenda-search');
    await search.getByLabel('Rechercher dans les ordres du jour').fill('juridique');
    const results = search.getByTestId('committee-agenda-search-result');
    await expect(results).toHaveCount(1);
    await expect(results.first()).toContainText('Charte éthique des données');
    await expect(results.first()).toContainText('Validé sous conditions');
    await expect(results.first()).toContainText('À venir');
    await results.first().getByRole('button', { name: 'Voir l’ordre du jour' }).click();
    await expect(page.getByTestId('committee-agenda')).toBeVisible();
  });
});
