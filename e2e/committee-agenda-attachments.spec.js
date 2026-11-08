import { test, expect } from '@playwright/test';
import { gotoHome, createAndSubmitProject, patchStateOnBoot, readStoredState, confirmInAppDialog } from './fixtures.js';

// Pièces jointes et liens d'un sujet de l'ordre du jour : le président les ajoute, les membres et
// les intervenants du sujet les ouvrent.
const MOCK_USER = 'bertrand.darieux@lfb.fr';
const COMMITTEE_ID = 'committee-e2e';
const SESSION_ID = 'session-attachments';

const daysFromNow = (days, hours = 14) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hours, 0, 0, 0);
  return date.toISOString();
};

const seed = (page, { president, members, topic }) => patchStateOnBoot(
  page,
  (stored, arg) => {
    const state = stored || {};
    const alreadySeeded = Array.isArray(state.validationCommitteeConfig?.committees)
      && state.validationCommitteeConfig.committees.some((committee) => committee?.id === arg.committeeId);
    if (!alreadySeeded) {
      state.validationCommitteeConfig = {
        enabled: true,
        committees: [{
          id: arg.committeeId,
          name: 'Comité E2E',
          emails: arg.members,
          presidentEmail: arg.president,
          defaultPassageMinutes: 20,
          teamTriggers: { minTeamsCount: 1 }
        }]
      };
      state.committeeSessions = [{
        id: arg.sessionId,
        committeeId: arg.committeeId,
        startAt: arg.startAt,
        durationMinutes: 90,
        status: 'published',
        agenda: arg.topic ? [{ id: 'topic-1', kind: 'topic', title: 'Charte éthique des données', minutes: 15, ...arg.topic }] : []
      }];
    }
    return state;
  },
  { committeeId: COMMITTEE_ID, sessionId: SESSION_ID, startAt: daysFromNow(10), president, members, topic }
);

const openAgenda = async (page) => {
  await page.goto(`/index.html?committeeSession=${SESSION_ID}`);
};

const storedAttachments = async (page) => (await readStoredState(page)).committeeSessions
  ?.find((entry) => entry.id === SESSION_ID)?.agenda?.[0]?.attachments || [];

test.describe('Ordre du jour : documents et liens d’un point', () => {
  test('le président joint un lien et un fichier, puis en retire un', async ({ page }) => {
    await seed(page, { president: MOCK_USER, members: [MOCK_USER, 'membre@lfb.fr'], topic: {} });
    await gotoHome(page);
    await openAgenda(page);

    const agenda = page.getByTestId('committee-agenda');
    await expect(agenda).toBeVisible();
    const topic = agenda.getByTestId('committee-agenda-passage').filter({ hasText: 'Charte éthique des données' });
    await topic.getByRole('button', { name: /Charte éthique des données/ }).click();

    const attachments = topic.getByTestId('agenda-attachments');
    await expect(attachments).toContainText('Aucun document ni lien pour ce point.');

    await attachments.getByLabel('Adresse du lien').fill('javascript:alert(1)');
    await attachments.getByRole('button', { name: 'Ajouter le lien' }).click();
    await expect(attachments.getByRole('alert')).toContainText('n’est pas une adresse http(s) valide');

    await attachments.getByLabel('Adresse du lien').fill('intranet.lfb.fr/charte');
    await attachments.getByLabel('Libellé (facultatif)').fill('Projet de charte');
    await attachments.getByRole('button', { name: 'Ajouter le lien' }).click();
    const link = attachments.getByRole('link', { name: 'Projet de charte' });
    await expect(link).toHaveAttribute('href', 'https://intranet.lfb.fr/charte');
    await expect(link).toHaveAttribute('target', '_blank');

    await attachments.locator('input[type="file"]').setInputFiles({
      name: 'note-cadrage.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 e2e')
    });
    await expect(attachments.getByRole('link', { name: 'note-cadrage.pdf' })).toHaveAttribute('download', 'note-cadrage.pdf');
    await expect.poll(async () => (await storedAttachments(page)).map((entry) => entry.name))
      .toEqual(['Projet de charte', 'note-cadrage.pdf']);

    await attachments.getByRole('button', { name: 'Retirer « Projet de charte »' }).click();
    await confirmInAppDialog(page);
    await expect(attachments.getByRole('link', { name: 'Projet de charte' })).toHaveCount(0);
    await expect.poll(async () => (await storedAttachments(page)).map((entry) => entry.name)).toEqual(['note-cadrage.pdf']);
  });

  test('un membre lit les documents sans pouvoir les modifier', async ({ page }) => {
    await seed(page, {
      president: 'president@lfb.fr',
      members: ['president@lfb.fr', MOCK_USER],
      topic: { attachments: [{ id: 'l1', type: 'link', url: 'https://intranet.lfb.fr/charte', name: 'Projet de charte' }] }
    });
    await gotoHome(page);
    await openAgenda(page);

    const topic = page.getByTestId('committee-agenda-passage').filter({ hasText: 'Charte éthique des données' });
    await topic.getByRole('button', { name: /Charte éthique des données/ }).click();
    const attachments = topic.getByTestId('agenda-attachments');
    await expect(attachments.getByRole('link', { name: 'Projet de charte' })).toBeVisible();
    await expect(attachments.getByLabel('Adresse du lien')).toHaveCount(0);
    await expect(attachments.getByRole('button', { name: /Retirer/ })).toHaveCount(0);
  });

  test('un intervenant du sujet, non membre, retrouve les documents dans sa vue', async ({ page }) => {
    await seed(page, {
      president: 'president@lfb.fr',
      members: ['president@lfb.fr', 'membre@lfb.fr'],
      topic: {
        presenterEmails: [MOCK_USER],
        attachments: [{ id: 'l1', type: 'link', url: 'https://intranet.lfb.fr/charte', name: 'Projet de charte' }]
      }
    });
    await gotoHome(page);
    await openAgenda(page);

    const agenda = page.getByTestId('committee-agenda-participant');
    await expect(agenda).toBeVisible();
    const mine = agenda.getByTestId('committee-agenda-participant-mine');
    await expect(mine.getByRole('link', { name: 'Projet de charte' })).toHaveAttribute('href', 'https://intranet.lfb.fr/charte');
    await expect(mine.getByLabel('Adresse du lien')).toHaveCount(0);
  });

  test('le président joint un document à un passage de projet, que le porteur retrouve dans sa synthèse', async ({ page }) => {
    test.slow();
    await seed(page, { president: MOCK_USER, members: [MOCK_USER, 'membre@lfb.fr'], topic: null });
    await gotoHome(page);
    await createAndSubmitProject(page);

    const toggle = page.getByRole('region', { name: /Avis Comité/ }).getByRole('button', { name: /Avis Comité/ });
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
      await toggle.click();
    }
    const panel = page.getByTestId(`committee-session-${COMMITTEE_ID}-panel`);
    await panel.getByRole('button', { name: 'Inscrire le projet' }).click();
    await panel.getByRole('button', { name: 'Voir l’ordre du jour' }).click();

    const agenda = page.getByTestId('committee-agenda');
    const passage = agenda.getByTestId('committee-agenda-passage').first();
    await passage.locator('button[aria-expanded]').first().click();
    const attachments = passage.getByTestId('agenda-attachments');
    await expect(attachments).toContainText('le porteur, les co-porteurs et les invités');
    await attachments.getByLabel('Adresse du lien').fill('https://intranet.lfb.fr/dossier-comite');
    await attachments.getByLabel('Libellé (facultatif)').fill('Dossier du comité');
    await attachments.getByRole('button', { name: 'Ajouter le lien' }).click();
    await expect(attachments.getByRole('link', { name: 'Dossier du comité' })).toBeVisible();
    await expect.poll(async () => (await storedAttachments(page)).map((entry) => entry.name)).toEqual(['Dossier du comité']);

    await agenda.getByRole('button', { name: /Retour/ }).first().click();
    const synthesisPanel = page.getByTestId(`committee-session-${COMMITTEE_ID}-panel`);
    if (!(await synthesisPanel.isVisible())) {
      const sectionToggle = page.getByRole('region', { name: /Avis Comité/ }).getByRole('button', { name: /Avis Comité/ });
      await sectionToggle.click();
    }
    await expect(synthesisPanel.getByTestId(`committee-session-${COMMITTEE_ID}-upcoming`)
      .getByRole('link', { name: 'Dossier du comité' })).toHaveAttribute('href', 'https://intranet.lfb.fr/dossier-comite');
  });
});
