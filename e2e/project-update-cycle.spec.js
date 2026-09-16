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

    // Modifier le stade déclaré : une réponse comme une autre du point de vue du suivi, toujours
    // atteignable quelle que soit la question affichée.
    await page.getByRole('radio', { name: /Conception/ }).click();

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
