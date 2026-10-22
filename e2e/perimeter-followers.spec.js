import { test, expect } from '@playwright/test';
import {
  collectConsoleErrors,
  createAndSubmitProject,
  goToProjectsHome,
  gotoHome,
  grantSelfComplianceExpertAndCommitteeAccess,
  openTriggeredProjectAndExpandTeam,
  patchStateOnBoot,
  readStoredState
} from './fixtures.js';

const readStoredControlePubEntry = async (page) => {
  const parsed = await readStoredState(page);
  const project = parsed.projects?.find((entry) => String(entry?.id || '').startsWith('project-')
    && entry?.answers?.__compliance_team_comments__?.teams?.controle_pub);
  return project?.answers?.__compliance_team_comments__?.teams?.controle_pub || null;
};

// Même passage par patchStateOnBoot que project-claim.spec.js : un patch écrit avant la
// navigation serait écrasé par la persistance de pagehide.
async function injectClaimAndFollower(page, { assigneeEmail, followerEmail }) {
  await patchStateOnBoot(page, (stored, arg) => {
    const state = stored || {};
    (Array.isArray(state.projects) ? state.projects : []).forEach((project) => {
      if (!project || project.status !== 'submitted' || !String(project.id || '').startsWith('project-')) {
        return;
      }
      project.answers = project.answers || {};
      const comments = project.answers.__compliance_team_comments__ || {};
      const teams = comments.teams || {};
      teams.controle_pub = {
        ...(teams.controle_pub || {}),
        claim: {
          assigneeEmail: arg.assigneeEmail,
          assignedAt: '2026-09-01T08:00:00.000Z',
          assignedByEmail: arg.assigneeEmail
        },
        followers: [{ email: arg.followerEmail, addedByEmail: arg.assigneeEmail, addedAt: '2026-09-02T08:00:00.000Z' }]
      };
      project.answers.__compliance_team_comments__ = { ...comments, teams };
    });
    return state;
  }, { assigneeEmail, followerEmail });
  await page.reload();
}

test.describe('Ajouter un collègue de l’équipe au suivi d’un projet', () => {
  test('l’expert ajoute puis retire un membre de son équipe depuis la carte de l’équipe', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await gotoHome(page);
    await grantSelfComplianceExpertAndCommitteeAccess(page);
    await createAndSubmitProject(page);
    await goToProjectsHome(page);
    await openTriggeredProjectAndExpandTeam(page, 'Contrôle pub');

    const followersBlock = page.getByTestId('team-followers-controle_pub');
    await expect(followersBlock).toContainText('Personnes qui suivent ce projet');
    await expect(followersBlock).toContainText('Aucun collègue ajouté.');

    await followersBlock.getByLabel('Ajouter un membre de l’équipe au suivi').selectOption('laure.chevalier@lfb.fr');
    await followersBlock.getByRole('button', { name: 'Ajouter au suivi' }).click();
    await expect(followersBlock.getByRole('listitem')).toHaveText(/laure\.chevalier@lfb\.fr/);

    await expect
      .poll(async () => (await readStoredControlePubEntry(page))?.followers?.map((entry) => entry.email) || [])
      .toEqual(['laure.chevalier@lfb.fr']);

    // Un avis enregistré ensuite repart du brouillon de l'éditeur : il ne doit pas perdre le suiveur.
    await page.getByRole('button', { name: /Modifier le commentaire/ }).first().click();
    await page.locator('select[id^="compliance-status-"]').first().selectOption('pending_information');
    await page.getByRole('button', { name: 'Enregistrer le commentaire' }).click();
    await expect
      .poll(async () => {
        const entry = await readStoredControlePubEntry(page);
        return { status: entry?.status || '', followers: entry?.followers?.map((f) => f.email) || [] };
      })
      .toEqual({ status: 'pending_information', followers: ['laure.chevalier@lfb.fr'] });

    // Enregistrer l'avis replie la carte de l'équipe, comme dans project-claim.spec.js.
    await page.getByRole('button', { name: /Contrôle pub/ }).first().click();
    // Une fois le périmètre pris en charge, le suiveur figure à côté du référent.
    await expect(page.getByRole('article', { name: 'Équipe Contrôle pub' }))
      .toContainText('(bertrand.darieux@lfb.fr) · laure.chevalier@lfb.fr');
    await page.getByRole('button', { name: 'Retirer laure.chevalier@lfb.fr du suivi' }).click();
    await expect(followersBlock).toContainText('Aucun collègue ajouté.');
    await expect
      .poll(async () => (await readStoredControlePubEntry(page))?.followers || null)
      .toBeNull();
    expect(errors).toEqual([]);
  });

  test('un suiveur garde dans « À traiter » un projet pris en charge par un collègue', async ({ page }) => {
    await gotoHome(page);
    await grantSelfComplianceExpertAndCommitteeAccess(page);
    await createAndSubmitProject(page);
    await goToProjectsHome(page);
    await injectClaimAndFollower(page, {
      assigneeEmail: 'laure.chevalier@lfb.fr',
      followerEmail: 'bertrand.darieux@lfb.fr'
    });

    await expect(page.getByRole('button', { name: /À traiter \(1\)/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Pris en charge par l’équipe \(0\)/ })).toBeVisible();
  });
});
