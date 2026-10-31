import { test, expect } from '@playwright/test';
import { gotoHome, grantAdminAccess, collectConsoleErrors, readStoredState } from './fixtures.js';

async function openCurrenciesTab(page) {
  await gotoHome(page);
  await grantAdminAccess(page);
  await page.getByRole('tab', { name: /Devises/ }).click();
}

test.describe('Back-office : table de devises', () => {
  test('les devises par défaut sont listées, les taux manquants signalés', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await openCurrenciesTab(page);

    const table = page.getByTestId('currencies-table');
    await expect(table.locator('tr[data-currency-unit="K€"]')).toBeVisible();
    await expect(table.locator('tr[data-currency-unit="K$"] input[type="number"]').nth(1)).toHaveValue('');
    await expect(table.locator('tr[data-currency-unit="K€"] input[type="number"]').nth(1)).toHaveValue('1');

    expect(errors).toEqual([]);
  });

  test('un taux saisi est conservé après rechargement', async ({ page }) => {
    await openCurrenciesTab(page);

    const rateInput = page.getByTestId('currencies-table').locator('tr[data-currency-unit="K$"] input[type="number"]').nth(1);
    await rateInput.fill('0.9');

    await expect.poll(async () => {
      const state = await readStoredState(page);
      return state?.currencies?.find((entry) => entry.unit === 'K$')?.rate ?? null;
    }).toBe(0.9);

    await page.reload();
    await page.getByRole('tab', { name: /Devises/ }).click();
    await expect(
      page.getByTestId('currencies-table').locator('tr[data-currency-unit="K$"] input[type="number"]').nth(1)
    ).toHaveValue('0.9');
  });
});
