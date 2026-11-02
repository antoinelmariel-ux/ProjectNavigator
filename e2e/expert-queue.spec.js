import { test, expect } from '@playwright/test';
import {
  collectConsoleErrors,
  createAndSubmitProject,
  goToProjectsHome,
  gotoHome,
  grantSelfComplianceExpertAndCommitteeAccess,
  patchStateOnBoot
} from './fixtures.js';

const EXPERT = 'bertrand.darieux@lfb.fr';

// Même passage par patchStateOnBoot que project-claim.spec.js : App.jsx re-persiste son état sur
// pagehide et écraserait un patch écrit avant la navigation.
async function patchControlePub(page, { entry, submissionKind }) {
  await patchStateOnBoot(page, (stored, arg) => {
    const state = stored || {};
    (Array.isArray(state.projects) ? state.projects : []).forEach((project) => {
      if (!project || project.status !== 'submitted' || !String(project.id || '').startsWith('project-')) {
        return;
      }
      project.answers = project.answers || {};
      if (arg.submissionKind) {
        project.answers.__submission_kind__ = arg.submissionKind;
        delete project.answers.__submission_history__;
      }
      const comments = project.answers.__compliance_team_comments__ || {};
      const teams = comments.teams || {};
      teams.controle_pub = { ...(teams.controle_pub || {}), ...arg.entry };
      project.answers.__compliance_team_comments__ = { ...comments, teams };
    });
    return state;
  }, { entry, submissionKind });
  await page.reload();
}

const claim = { assigneeEmail: EXPERT, assignedAt: '2026-09-01T08:00:00.000Z', assignedByEmail: EXPERT };

test.describe('File de l’expert : À prendre, En cours, Traités', () => {
  test('une demande d’information reste « En cours » ; une réponse du porteur allume la puce', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await gotoHome(page);
    await grantSelfComplianceExpertAndCommitteeAccess(page);
    await createAndSubmitProject(page);
    await goToProjectsHome(page);

    await patchControlePub(page, {
      entry: {
        claim,
        status: 'pending_information',
        statusUpdatedAt: '2026-09-02T08:00:00.000Z',
        comment: 'Merci de préciser le circuit de diffusion.'
      }
    });
    await expect(page.getByRole('button', { name: /En cours \(1\)/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Traités \(0\)/ })).toBeVisible();
    await expect(page.getByTestId('expert-queue-news-dot')).toHaveCount(0);

    await patchControlePub(page, {
      entry: {
        replies: [{
          id: 'reply-owner',
          message: 'Diffusion interne uniquement, pour partie.',
          authorName: 'Porteur',
          authorEmail: 'porteur.projet@lfb.fr',
          createdAt: '2026-09-03T08:00:00.000Z'
        }]
      }
    });
    await expect(page.getByRole('button', { name: /En cours \(1\)/ })).toBeVisible();
    await expect(page.getByTestId('expert-queue-news-dot')).toHaveCount(1);
    await expect(page.getByText(/nouvelle réponse du porteur le/)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('un avis sur une demande préliminaire reste « En cours », marqué « Avis préliminaire rendu »', async ({ page }) => {
    await gotoHome(page);
    await grantSelfComplianceExpertAndCommitteeAccess(page);
    await createAndSubmitProject(page);
    await goToProjectsHome(page);

    await patchControlePub(page, {
      submissionKind: 'preliminary',
      entry: { claim, status: 'validated', statusUpdatedAt: '2026-09-02T08:00:00.000Z', comment: 'RAS à ce stade.' }
    });
    await expect(page.getByRole('button', { name: /En cours \(1\)/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Traités \(0\)/ })).toBeVisible();
    await expect(page.getByText('Avis préliminaire rendu', { exact: true })).toBeVisible();

    await patchControlePub(page, { submissionKind: 'final', entry: {} });
    await page.getByRole('button', { name: /Traités \(1\)/ }).click();
    await expect(page.getByText('Avis rendu', { exact: true })).toBeVisible();
  });
});
