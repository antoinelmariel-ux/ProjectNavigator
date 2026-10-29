// Parcours « Revoir et valider un projet » : réservé aux experts Compliance (contacts d'une équipe
// ou membres d'un comité), proposé juste sous « Tour rapide », et joué sur le projet d'exemple vu
// comme par un expert — sans que l'équipe ajoutée pour l'occasion n'atteigne le stockage.
import { test, expect } from '@playwright/test';
import { gotoFresh, completeOnboarding, collectConsoleErrors, patchStateOnBoot, readStoredState } from './fixtures.js';
import { initialTeams } from '../src/data/teams.js';

const MOCK_USER = 'bertrand.darieux@lfb.fr';
const EXPERT_LABEL = 'Revoir et valider un projet';

const tourNext = (page) => page.locator('.tgjs-controls .tgjs-button--primary');
const tourActions = (page) => page.locator('.tgjs-actions .tgjs-button');
const tourAction = (page, label) => page.locator('.tgjs-actions .tgjs-button', { hasText: label });
const tourTitle = (page) => page.locator('.tgjs-title');

async function expectStep(page, title, anchor) {
  await expect(tourTitle(page)).toHaveText(title);
  const highlight = page.locator('.tgjs-highlight');
  if (!anchor) {
    await expect(highlight).toHaveClass(/tgjs-highlight--empty/);
    return;
  }
  await expect(page.locator(`[data-tour-id="${anchor}"]`).first()).toBeVisible();
  await expect(highlight).not.toHaveClass(/tgjs-highlight--empty/);
}

async function startTour(page) {
  await gotoFresh(page);
  await completeOnboarding(page, { startTour: true });
  await expect(tourTitle(page)).toHaveText('Bienvenue sur Project Navigator');
}

// Expert d'une équipe que le projet d'exemple ne déclenche pas : le guide doit alors l'ajouter,
// pour l'affichage seulement, à une équipe déclenchée (« Contrôle pub », la première).
const makeExpert = (page) => patchStateOnBoot(
  page,
  (stored, { teams, email }) => {
    const state = stored || {};
    if (!Array.isArray(state.teams)) {
      state.teams = teams.map((team) => (team.id === 'affaires_publiques'
        ? { ...team, contacts: [...team.contacts, email] }
        : team));
    }
    return state;
  },
  { teams: initialTeams, email: MOCK_USER }
);

test.describe('parcours expert du guide', () => {
  test.describe.configure({ timeout: 120000 });

  test('le bouton n existe pas pour qui n est pas expert', async ({ page }) => {
    await startTour(page);
    await expect(tourAction(page, 'Tour rapide')).toBeVisible();
    await expect(tourAction(page, EXPERT_LABEL)).toHaveCount(0);
  });

  test('un expert le trouve sous « Tour rapide » et le parcourt jusqu au bout', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await makeExpert(page);
    await startTour(page);

    const labels = await tourActions(page).allInnerTexts();
    expect(labels.slice(0, 2).map((label) => label.trim())).toEqual(['Tour rapide', EXPERT_LABEL]);

    await tourAction(page, EXPERT_LABEL).click();

    const steps = [
      ['Les projets qui vous concernent', 'home-compliance-projects'],
      ['Votre file de travail', 'home-compliance-tabs'],
      ['Votre périmètre dans le projet', 'synthesis-team-card'],
      ['Commencez par la vitrine', 'synthesis-showcase'],
      ['Une première vue d’ensemble', 'showcase-hero'],
      ['Revenir aux enjeux', 'showcase-back-to-report'],
      ['Toutes les réponses du porteur', 'synthesis-overview'],
      ['Prendre le projet en charge', 'synthesis-team-claim'],
      ['Passer la main', 'synthesis-team-claim'],
      ['Garder un collègue dans la boucle', 'synthesis-team-followers'],
      ['Échanger avec le porteur', 'synthesis-team-thread'],
      ['Rendre votre avis', 'synthesis-team-opinion'],
      ['Une demande d’avis préliminaire'],
      ['Une demande de validation'],
      ['Une consultation par étapes'],
      ['Le projet continue d’évoluer', 'synthesis-team-review']
    ];
    for (const [title, anchor] of steps) {
      await expectStep(page, title, anchor);
      if (title === 'Prendre le projet en charge') {
        await expect(page.getByRole('button', { name: 'Je prends en charge' }).first()).toBeVisible();
      }
      if (title === 'Passer la main') {
        await expect(page.getByRole('button', { name: 'Transférer à…' }).first()).toBeVisible();
      }
      await tourNext(page).click();
    }

    await expectStep(page, 'Vous êtes prêt');
    for (const label of ['Créer un projet', 'Valider son projet', 'Terminer la visite']) {
      await expect(tourAction(page, label)).toBeVisible();
    }

    // Terminer recharge l'accueil : le stockage n'est lisible qu'une fois l'app remontée.
    await tourAction(page, 'Terminer la visite').click();
    await expect(tourTitle(page)).toHaveCount(0);
    await page.waitForLoadState('load');
    await expect(page.locator('[data-tour-id="home-create-project"]')).toBeVisible();
    const stored = await readStoredState(page);
    const storedTeam = (stored?.teams || []).find((team) => team.id === 'controle_pub');
    expect(storedTeam?.contacts || []).not.toContain(MOCK_USER);
    expect(errors).toEqual([]);
  });
});
