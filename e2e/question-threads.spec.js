import { test, expect } from '@playwright/test';
import { gotoHome, walkToSynthesis } from './fixtures.js';

const TEAM_NAME = 'Juridique France';

async function askFromCurrentQuestion(page, message) {
  await page.getByRole('button', { name: 'Poser une question' }).click();
  await page.getByLabel('À quelle équipe ?').selectOption({ label: TEAM_NAME });
  await page.getByLabel('Votre question').fill(message);
  await page.getByRole('button', { name: 'Envoyer la question' }).click();
}

test.describe('Questions ancrées sur une question du formulaire', () => {
  test('poser une question sans soumettre, y répondre et la clore', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: /Créer un projet/ }).first().click();

    await askFromCurrentQuestion(page, 'Ce périmètre vous concerne-t-il déjà à ce stade ?');

    const threadBlock = page.locator('[data-tour-id="question-ask-expert"]');
    await expect(threadBlock.getByText('Ce périmètre vous concerne-t-il déjà à ce stade ?')).toBeVisible();
    await expect(threadBlock.getByText('En attente de réponse')).toBeVisible();

    // Le fil vit dans les réponses du projet : il survit à un rechargement sans qu'aucune
    // soumission n'ait eu lieu.
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    const stateRaw = await page.evaluate(() => window.localStorage.getItem('complianceNavigatorState'));
    expect(stateRaw).toContain('__question_threads__');
    expect(stateRaw).toContain('Ce périmètre vous concerne-t-il déjà à ce stade ?');

    await threadBlock.getByPlaceholder('Répondre…').fill('Précision : le partenaire est européen.');
    await threadBlock.getByRole('button', { name: 'Envoyer' }).click();

    await expect(threadBlock.getByText('Précision : le partenaire est européen.')).toBeVisible();
    await expect(threadBlock.getByText('En attente de réponse')).toHaveCount(0);

    await threadBlock.getByRole('button', { name: 'Marquer comme réglée' }).click();
    await expect(threadBlock.getByText('Réglée')).toBeVisible();
    await expect(threadBlock.getByRole('button', { name: 'Rouvrir la question' })).toBeVisible();
  });

  test('la question sollicite l’équipe : elle devient un périmètre de la synthèse', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: /Créer un projet/ }).first().click();

    await askFromCurrentQuestion(page, 'Un doute sur le contrat cadre.');

    await walkToSynthesis(page, {
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
    // Une équipe interrogée depuis le questionnaire est sollicitée comme si une règle l'avait
    // déclenchée : son bloc apparaît en synthèse, avec le fil rattaché.
    await expect(page.getByRole('heading', { name: TEAM_NAME }).first()).toBeVisible();
    await expect(page.getByText('Questions posées depuis le questionnaire').first()).toBeVisible();
  });
});
