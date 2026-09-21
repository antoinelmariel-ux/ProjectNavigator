import { test, expect } from '@playwright/test';
import { gotoHome, createAndSubmitProject, openProjectStakes } from './fixtures.js';

// Lot 2 : un projet soumis continue de vivre. Le porteur peut le modifier, il voit ce qui a
// bougé depuis ce que les experts ont reçu, et l'envoi de la mise à jour est un acte explicite.
test.describe('Cycle de mise à jour après soumission', () => {
  test('un projet soumis reste modifiable et son envoi est versionné', async ({ page }) => {
    test.slow();
    await gotoHome(page);
    await createAndSubmitProject(page);

    // La soumission enregistre la v1 et l'instantané des réponses envoyées.
    const afterSubmit = await page.evaluate(() => {
      const parsed = JSON.parse(window.localStorage.getItem('complianceNavigatorState'));
      const project = parsed.projects?.find((entry) => entry?.status === 'submitted' && String(entry.id).startsWith('project-'));
      const history = project?.answers?.__submission_history__;
      return { version: history?.version ?? null, hasSnapshot: Boolean(history?.snapshot) };
    });
    expect(afterSubmit).toEqual({ version: 1, hasSnapshot: true });

    // Un projet soumis n'est plus figé : sa carte propose de le modifier.
    await page.getByRole('button', { name: 'Modifier le projet' }).first().click();
    await expect(page.getByRole('button', { name: 'Terminer' })).toBeVisible();

    // Modifier une réponse : le suivi des modifications porte sur les réponses au questionnaire.
    // Le sommaire de la barre latérale est ouvert par défaut, et permet d'atteindre n'importe
    // quelle question quelle que soit celle qui s'affiche à la réouverture.
    await page.getByRole('button', { name: /Quel est le nom du projet/ }).first().click();
    const nameEditor = page.locator('[contenteditable="true"]').first();
    await expect(nameEditor).toBeVisible();
    await nameEditor.click();
    await page.keyboard.type(' v2');

    await page.getByRole('button', { name: 'Terminer' }).click();
    // La sortie du questionnaire est la vitrine : le bandeau de mise à jour vit sur les enjeux.
    await openProjectStakes(page);

    const banner = page.getByText(/réponse[s]? modifiée[s]? depuis la v1/);
    await expect(banner).toBeVisible();

    await page.getByRole('button', { name: 'Envoyer la mise à jour' }).click();

    // L'envoi fait passer le projet en v2 et le bandeau disparaît : l'état courant redevient
    // la référence.
    await expect
      .poll(() => page.evaluate(() => {
        const parsed = JSON.parse(window.localStorage.getItem('complianceNavigatorState'));
        const project = parsed.projects?.find((entry) => entry?.status === 'submitted' && String(entry.id).startsWith('project-'));
        return project?.answers?.__submission_history__?.version ?? null;
      }))
      .toBe(2);

    await expect(banner).toHaveCount(0);
  });
});
