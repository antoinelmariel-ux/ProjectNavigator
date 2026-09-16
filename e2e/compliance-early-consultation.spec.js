import { test, expect } from '@playwright/test';
import { answerCurrentQuestion, gotoHome, walkToSynthesis } from './fixtures.js';

const answerEverything = (page) => walkToSynthesis(page, {
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

test.describe('Consultation compliance en amont', () => {
  test('le stade déclaré est persisté et modifiable depuis le questionnaire', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: /Créer un projet/ }).first().click();

    // Un projet créé maintenant part du cadrage : c'est ce qui autorise à interroger la
    // compliance avant d'avoir tout tranché.
    const framing = page.getByRole('radio', { name: /Cadrage/ });
    await expect(framing).toHaveAttribute('aria-checked', 'true');

    await page.getByRole('radio', { name: /Avant déploiement/ }).click();
    await expect(page.getByRole('radio', { name: /Avant déploiement/ })).toHaveAttribute('aria-checked', 'true');

    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    const stateRaw = await page.evaluate(() => window.localStorage.getItem('complianceNavigatorState'));
    expect(stateRaw).toContain('__project_stage__');
    expect(stateRaw).toContain('pre_launch');
  });

  test('la synthèse propose les deux portes d’entrée et dit ce que chacune permet', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: /Créer un projet/ }).first().click();
    await answerEverything(page);

    await expect(page.getByText('Où en est votre projet vis-à-vis de la compliance')).toBeVisible();
    await expect(page.getByText('Orientation possible')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Demander un avis préliminaire' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Demander la validation' })).toBeEnabled();
  });

  test('un doute est adressé à une équipe, qui est sollicitée', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: /Créer un projet/ }).first().click();

    // Jusqu'à la première question dont l'incertitude pèse sur une règle.
    await answerCurrentQuestion(page);
    await page.getByRole('button', { name: /^Suivant$/ }).click();
    await answerCurrentQuestion(page);
    await page.getByRole('button', { name: /^Suivant$/ }).click();

    await page.getByRole('button', { name: 'Je ne sais pas encore' }).click();

    const routing = page.locator('[data-tour-id="question-uncertainty-routing"]');
    await expect(routing.getByText('À qui adresser ce doute ?')).toBeVisible();

    // Choisir l'équipe préremplit le fil : c'est lui qui sollicite et notifie réellement.
    await routing.getByRole('button', { name: /^Demander à / }).first().click();
    const askBlock = page.locator('[data-tour-id="question-ask-expert"]');
    await expect(askBlock.getByLabel('Votre question')).toHaveValue(/Je ne sais pas encore quoi répondre/);
    await askBlock.getByRole('button', { name: 'Envoyer la question' }).click();

    await expect(askBlock.getByText('En attente de réponse')).toBeVisible();
    await expect(routing.getByText(/Doute transmis à :/)).toBeVisible();
  });

  test('une demande d’avis préliminaire n’est pas une validation', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: /Créer un projet/ }).first().click();
    await answerEverything(page);

    await page.getByRole('button', { name: 'Demander un avis préliminaire' }).click();

    await expect(page.getByText('Avis préliminaire demandé :')).toBeVisible();
    // Le porteur garde la main : l'envoi ne fige pas le projet.
    await expect(page.getByText(/Vous pouvez continuer à le faire évoluer/)).toBeVisible();

    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    const stateRaw = await page.evaluate(() => window.localStorage.getItem('complianceNavigatorState'));
    expect(stateRaw).toContain('"__submission_kind__":"preliminary"');
  });
});
