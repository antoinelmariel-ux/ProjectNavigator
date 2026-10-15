import { test, expect } from '@playwright/test';
import { gotoHome, grantAdminAccess, collectConsoleErrors } from './fixtures.js';

const openFaqDialog = (page) =>
  page.evaluate(() =>
    window.dispatchEvent(new CustomEvent('cn:open-static-page', { detail: { pageId: 'faq' } }))
  );

test.describe('Back-office : FAQ', () => {
  test('une question publiée remplace la page d’aide par défaut et survit au rechargement', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await gotoHome(page);

    await openFaqDialog(page);
    await expect(page.frameLocator('iframe').getByText('Cette page est en cours de construction')).toBeVisible();
    await page.getByRole('button', { name: 'Fermer' }).click();

    await grantAdminAccess(page);
    await page.getByRole('tab', { name: /FAQ/ }).click();
    await page.getByRole('button', { name: 'Ajouter une question' }).click();

    const card = page.locator('[data-faq-id]').first();
    await card.getByRole('textbox', { name: 'Question' }).fill('Comment créer un projet ?');
    const answer = card.locator('[contenteditable="true"]').first();
    await answer.click();
    await answer.pressSequentially('Cliquez sur « Nouveau projet ».');
    await expect(card.getByText('À traduire :')).toBeVisible();

    await page.waitForTimeout(700);
    await page.reload();
    await openFaqDialog(page);
    const frame = page.frameLocator('iframe');
    await expect(frame.getByText('Comment créer un projet ?')).toBeVisible();
    await frame.getByText('Comment créer un projet ?').click();
    await expect(frame.getByText('Cliquez sur « Nouveau projet ».')).toBeVisible();

    // L'iframe de la fenêtre d'aide est volontairement sandboxée (sans scripts) : le navigateur
    // consigne le refus d'exécuter l'outillage d'injection de Playwright, ce n'est pas une erreur de l'app.
    expect(errors.filter((message) => !/sandboxed/i.test(message))).toEqual([]);
  });

  test('une question dépubliée n’apparaît plus dans la fenêtre d’aide', async ({ page }) => {
    await gotoHome(page);
    await grantAdminAccess(page);
    await page.getByRole('tab', { name: /FAQ/ }).click();
    await page.getByRole('button', { name: 'Ajouter une question' }).click();
    const card = page.locator('[data-faq-id]').first();
    await card.getByRole('textbox', { name: 'Question' }).fill('Question masquée');
    const answer = card.locator('[contenteditable="true"]').first();
    await answer.click();
    await answer.pressSequentially('Réponse.');
    await card.getByLabel('Publiée').uncheck();

    await openFaqDialog(page);
    await expect(page.frameLocator('iframe').getByText('Question masquée')).toHaveCount(0);
  });
});
