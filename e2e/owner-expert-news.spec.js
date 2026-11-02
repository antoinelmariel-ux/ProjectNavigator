import { test, expect } from '@playwright/test';
import {
  collectConsoleErrors,
  createAndSubmitProject,
  goToProjectsHome,
  gotoHome,
  patchStateOnBoot
} from './fixtures.js';

// Un expert répond dans le fil du projet soumis par le compte de test (le porteur). La date est
// prise à l'exécution du patch, donc après la référence posée à la première ouverture de l'accueil.
async function injectExpertReply(page) {
  await patchStateOnBoot(page, (stored) => {
    const state = stored || {};
    (Array.isArray(state.projects) ? state.projects : []).forEach((project) => {
      if (!project || project.status !== 'submitted' || !String(project.id || '').startsWith('project-')) {
        return;
      }
      project.answers = project.answers || {};
      const comments = project.answers.__compliance_team_comments__ || {};
      const teams = comments.teams || {};
      if (teams.controle_pub?.replies?.some((reply) => reply.id === 'reply-expert-e2e')) {
        return;
      }
      teams.controle_pub = {
        ...(teams.controle_pub || {}),
        replies: [
          ...(teams.controle_pub?.replies || []),
          {
            id: 'reply-expert-e2e',
            message: 'Pouvez-vous préciser le circuit de diffusion ?',
            authorName: 'Experte',
            authorEmail: 'experte.pub@lfb.fr',
            createdAt: new Date(Date.now() - 1000).toISOString()
          }
        ]
      };
      project.answers.__compliance_team_comments__ = { ...comments, teams };
    });
    return state;
  });
  await page.reload();
}

test('le porteur voit une pastille quand un expert a écrit depuis sa dernière lecture des enjeux', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await gotoHome(page);
  await createAndSubmitProject(page);
  await goToProjectsHome(page);
  await expect(page.getByTestId('owner-expert-news-dot')).toHaveCount(0);

  await injectExpertReply(page);
  await expect(page.getByTestId('owner-expert-news-dot')).toHaveCount(1);

  const card = page.locator('article[id^="project-card-"]', { has: page.getByTestId('owner-expert-news-dot') });
  await card.getByRole('button', { name: 'Consulter les enjeux' }).click();
  await goToProjectsHome(page);
  await expect(page.getByTestId('owner-expert-news-dot')).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible();
  await expect(page.getByTestId('owner-expert-news-dot')).toHaveCount(0);
  expect(errors).toEqual([]);
});
