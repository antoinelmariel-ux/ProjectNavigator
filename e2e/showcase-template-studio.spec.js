import { test, expect } from '@playwright/test';
import { collectConsoleErrors, gotoHome, grantAdminAccess, readStoredState } from './fixtures.js';

// L'atelier règle un modèle sur la vraie vitrine : on clique une section, on la règle dans
// l'inspecteur, la vitrine suit aussitôt — sur des réponses d'exemple ou des emplacements vides.
test('l’atelier règle le modèle « don » sur la vraie vitrine', async ({ page }) => {
  test.setTimeout(120000);
  const errors = collectConsoleErrors(page);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await gotoHome(page);
  await grantAdminAccess(page);
  await page.getByRole('tab', { name: /Modèles de vitrine/ }).click();

  await page.getByTestId('showcase-template-card').first().getByRole('button', { name: 'Éditer sur la vitrine' }).click();
  const studio = page.getByTestId('showcase-template-studio');
  await expect(studio).toBeVisible();
  const canvas = studio.getByTestId('showcase-template-studio-canvas');
  const inspector = studio.getByTestId('showcase-template-studio-inspector');
  const frame = (key) => canvas.locator(`[data-authoring-key="${key}"]`);

  // réponses fictives : le montant d'exemple, mis en forme, dans le vrai rendu
  const amount = frame('block:amount');
  await expect(amount.locator('[data-showcase-section="figure"]')).toContainText(/50\s000\s?€/);
  await expect(amount).toContainText('En plusieurs versements');

  // un clic sur la vitrine sélectionne la section, l'inspecteur en montre les réglages
  await amount.locator('[data-showcase-section="figure"]').click();
  await expect(amount).toHaveClass(/sga-frame--selected/);
  const settings = inspector.locator('[data-testid="showcase-template-section"][data-section-id="amount"]');
  await expect(settings).toBeVisible();
  await settings.locator('[data-slot-id="description"]').getByRole('combobox', { name: 'Affichage' }).selectOption('hidden');
  await expect(amount).not.toContainText('En plusieurs versements');

  // emplacements vides : ce qu'un porteur voit au départ
  await studio.getByRole('button', { name: 'Emplacements vides' }).click();
  await expect(amount).toContainText('Information à compléter');

  // un bloc ajouté depuis le plan est sélectionné et garde un cadre tant qu'il est vide
  await studio.getByRole('combobox', { name: 'Ajouter un bloc…' }).selectOption('quote');
  const quoteSettings = inspector.locator('[data-testid="showcase-template-section"][data-section-kind="block"]');
  await expect(quoteSettings.getByRole('combobox', { name: 'Gabarit' })).toHaveValue('quote');
  const quoteKey = `block:${await quoteSettings.getAttribute('data-section-id')}`;
  await expect(frame(quoteKey)).toContainText('Rien à afficher avec ces réponses');
  await quoteSettings.locator('[data-slot-id="description"]').getByRole('textbox', { name: 'Texte' }).fill('Une parole de bénéficiaire.');
  await expect(frame(quoteKey).locator('[data-showcase-section="quote"]')).toContainText('Une parole de bénéficiaire.');

  // vue lecteur : plus aucun cadre, la vitrine telle qu'on la lira
  await studio.getByRole('button', { name: 'Données d’exemple' }).click();
  await studio.getByRole('button', { name: 'Vue lecteur (P)' }).click();
  await expect(canvas.locator('.sga-frame')).toHaveCount(0);
  await expect(canvas.locator('[data-showcase-section="quote"]')).toContainText('Une parole de bénéficiaire.');

  await studio.getByRole('button', { name: 'Fermer l’atelier' }).click();
  await expect(studio).toHaveCount(0);
  await expect
    .poll(async () => {
      const state = await readStoredState(page);
      const donation = (state.showcaseTemplates || []).find((template) => template.id === 'don-bourse-appel-a-projets');
      return donation ? donation.sections.some((entry) => entry.kind === 'block' && entry.type === 'quote') : null;
    })
    .toBe(true);
  expect(errors).toEqual([]);
});
