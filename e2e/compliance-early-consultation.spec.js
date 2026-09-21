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
  test('le formulaire ne demande plus le stade, et le projet part au stade le plus avancé', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: /Créer un projet/ }).first().click();
    await expect(page.locator('[id^="question-"]').first()).toBeVisible();

    // Se classer soi-même n'est pas une question sur le projet : le sélecteur de stade a été
    // retiré du formulaire.
    await expect(page.locator('[data-tour-id="question-stage-selector"]')).toHaveCount(0);
    await expect(page.getByRole('radio', { name: /Cadrage/ })).toHaveCount(0);

    // Tout projet part donc du stade le plus avancé : ce que le questionnaire marque
    // obligatoire correspond exactement à ce que l'avis technique et la validation exigent.
    // La consultation précoce reste ouverte par le palier « orientation », pas par une
    // déclaration du porteur.
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    const stage = await page.evaluate(() => {
      const state = JSON.parse(window.localStorage.getItem('complianceNavigatorState') || '{}');
      return (state.projects || [])[0]?.answers?.__project_stage__ ?? null;
    });
    expect(stage).toBe('pre_launch');
  });

  test('la synthèse propose les deux portes d’entrée et dit ce que chacune permet', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: /Créer un projet/ }).first().click();
    await answerEverything(page);

    await expect(page.getByText('Où en est votre projet', { exact: true })).toBeVisible();
    await expect(page.getByText('Orientation possible')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Demander un avis préliminaire' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Demander la validation' })).toBeEnabled();
  });

  test('un doute reste une note privée, sans équipe ni notification', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: /Créer un projet/ }).first().click();

    // Jusqu'à la première question dont la réponse peut être signalée comme douteuse.
    await answerCurrentQuestion(page);
    await page.getByRole('button', { name: /^Suivant$/ }).click();
    await answerCurrentQuestion(page);
    await page.getByRole('button', { name: /^Suivant$/ }).click();

    await page.getByRole('button', { name: 'J’ai un doute' }).click();
    await page.getByLabel('Expliquez votre doute').fill('Pas sûr du périmètre concerné.');

    // La case ne rouvre plus aucune mécanique de sollicitation d'équipe.
    await expect(page.locator('[data-tour-id="question-ask-expert"]')).toHaveCount(0);

    // Le doute suit jusqu'à la synthèse : dans le rappel des réponses, il s'affiche comme une
    // note à côté de la réponse donnée, jamais à sa place.
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

    // Un doute ouvert interdit la validation définitive, et le dit là où il s'affiche.
    await expect(page.getByRole('button', { name: 'Demander la validation' })).toBeDisabled();

    // Portée à la section : l'intitulé apparaît aussi dans le sommaire du rail latéral, ce qui
    // ferait deux correspondances en mode strict.
    await page.locator('#synthesis-section-overview')
      .getByRole('button', { name: /Rappel de vos réponses/ })
      .click();
    const overview = page.locator('#overview-panel');
    await expect(overview.getByText('Pas sûr du périmètre concerné.')).toBeVisible();
    await expect(
      overview.getByText('Tant qu’il est ouvert, la validation définitive n’est pas possible.')
    ).toBeVisible();
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
