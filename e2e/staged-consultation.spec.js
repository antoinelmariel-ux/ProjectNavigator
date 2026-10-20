import { test, expect } from '@playwright/test';
import { initialTeams } from '../src/data/teams.js';
import {
  collectConsoleErrors,
  gotoHome,
  openProjectStakes,
  patchStateOnBoot,
  proceedThroughMandatorySummary,
  readStoredState,
  walkQuestionnaireToShowcase
} from './fixtures.js';

// Une demande d'avis préliminaire peut ne solliciter d'abord qu'une partie des périmètres : les
// autres attendent que le porteur les sollicite, sans rien recevoir ni voir du projet.
//
// Le compte de test devient contact de l'équipe PI dès le démarrage (patchStateOnBoot, pour que le
// flush sur pagehide ne l'écrase pas) : il est à la fois porteur et expert d'un périmètre mis
// de côté, ce qui permet de vérifier dans une seule session que l'expert ne voit rien.
const makeSelfPiExpert = (stored, teams) => {
  const state = stored || {};
  state.teams = teams.map((team) => (team.id === 'pi'
    ? { ...team, contacts: [...(team.contacts || []), 'bertrand.darieux@lfb.fr'] }
    : team));
  return state;
};

const readStaged = async (page) => {
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const state = await readStoredState(page);
  const project = (state.projects || []).find((entry) => entry.status === 'submitted');
  return project?.answers?.__staged_consultation__ || null;
};

const openStakesOfNewProject = async (page) => {
  await page.getByRole('button', { name: /Créer un projet/ }).first().click();
  await walkQuestionnaireToShowcase(page, {
    async onQuestion(heading, p) {
      if (heading.includes('jalons')) {
        await p.getByRole('button', { name: /Ajouter un jalon/ }).click();
        await p.locator('input[type="date"]').first().fill('2026-04-01');
        return true;
      }
      if (heading.includes('document')) {
        await p.locator('input[type="file"]').first().setInputFiles({
          name: 'doc.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('x')
        });
        return true;
      }
      return false;
    }
  });
  await proceedThroughMandatorySummary(page);
  await openProjectStakes(page);
};

test('commencer par un périmètre : les autres attendent, invisibles de leurs experts', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await gotoHome(page);
  await patchStateOnBoot(page, makeSelfPiExpert, initialTeams);
  await page.reload();
  await openStakesOfNewProject(page);

  await page.getByRole('button', { name: 'Demander un avis préliminaire' }).click();
  const chooser = page.getByRole('group', { name: 'Qui voulez-vous consulter ?' });
  await expect(chooser.getByRole('button', { name: 'Tous les périmètres concernés (recommandé)' }))
    .toHaveAttribute('aria-pressed', 'true');
  await chooser.getByRole('button', { name: 'Commencer par certains périmètres' }).click();
  await chooser.getByLabel('Juridique International').check();

  const send = chooser.getByRole('button', { name: /Envoyer à Juridique International/ });
  await expect(send).toContainText('3 périmètres seront sollicités plus tard');
  await send.click();

  await expect(page.getByText('Consultation partielle : 1 périmètre sur 4 sollicité')).toBeVisible();
  await expect(page.getByText('À solliciter ensuite : Contrôle pub, DPO, PI.')).toBeVisible();
  await expect(page.getByText('À solliciter ensuite', { exact: true })).toHaveCount(3);

  const staged = await readStaged(page);
  expect(staged?.isActive).toBe(true);
  expect(staged?.solicited).toEqual(['team:juridique_international']);

  await page.goto('/index.html');
  const card = page.locator('article[id^="project-card-"]').first();
  await expect(card.getByText('Consultation partielle')).toBeVisible();
  // L'expert de PI n'a pas été sollicité : rien dans sa file.
  await expect(page.getByText('Projets déclenchés pour vous')).toBeVisible();
  await expect(page.getByText('Aucun projet à traiter pour l’instant.')).toBeVisible();

  expect(errors).toEqual([]);
});

test('solliciter les autres périmètres referme la consultation par vagues', async ({ page }) => {
  await gotoHome(page);
  await patchStateOnBoot(page, makeSelfPiExpert, initialTeams);
  await page.reload();
  await openStakesOfNewProject(page);

  await page.getByRole('button', { name: 'Demander un avis préliminaire' }).click();
  const chooser = page.getByRole('group', { name: 'Qui voulez-vous consulter ?' });
  await chooser.getByRole('button', { name: 'Commencer par certains périmètres' }).click();
  await chooser.getByLabel('Juridique International').check();
  await chooser.getByRole('button', { name: /Envoyer à Juridique International/ }).click();
  await expect(page.getByText('Consultation partielle : 1 périmètre sur 4 sollicité')).toBeVisible();

  await page.getByRole('button', { name: 'Solliciter les autres périmètres' }).click();
  await expect(page.getByText(/Consultation partielle/)).toHaveCount(0);
  await expect(page.getByText('À solliciter ensuite', { exact: true })).toHaveCount(0);

  const staged = await readStaged(page);
  expect(staged?.isActive).toBe(false);
  expect(staged?.waves).toHaveLength(2);

  await page.goto('/index.html');
  await expect(page.getByRole('button', { name: 'À traiter (1)' })).toBeVisible();
});

test('tout envoyer reste le choix par défaut', async ({ page }) => {
  await gotoHome(page);
  await openStakesOfNewProject(page);

  await page.getByRole('button', { name: 'Demander un avis préliminaire' }).click();
  await page.getByRole('button', { name: 'Envoyer à tous les périmètres' }).click();
  await expect(page.getByText('Avis préliminaire demandé :')).toBeVisible();
  await expect(page.getByText(/Consultation partielle/)).toHaveCount(0);
  expect(await readStaged(page)).toBeNull();
});
