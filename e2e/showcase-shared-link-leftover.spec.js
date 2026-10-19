import { test, expect } from '@playwright/test';
import { gotoHome, createProjectAndOpenShowcase, collectConsoleErrors } from './fixtures.js';
import { encodeShowcaseShareToken } from '../src/utils/showcaseShareLink.js';

// Un lien de vitrine partagée qui n'ouvre rien (projet introuvable, à la corbeille, annulé) ne
// doit pas laisser son mode « destinataire externe » armé : la vitrine suivante, celle du projet
// que la personne crée ensuite, s'ouvrait sans menu ni bouton « Enjeux du projet ».
test('un lien partagé vers un projet introuvable ne masque pas le menu de la vitrine suivante', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await gotoHome(page);

  const token = encodeShowcaseShareToken({ projectId: 'projet-inexistant-e2e', displayMode: 'light' });
  await page.goto(`/index.html?sv=${token}`);
  await expect(page.getByRole('heading', { name: 'Projet introuvable' })).toBeVisible();

  await page.getByRole('button', { name: 'Retour à l’accueil' }).click();
  await createProjectAndOpenShowcase(page);

  await expect(page.getByRole('button', { name: 'Voir les enjeux du projet' })).toBeVisible();
  expect(errors).toEqual([]);
});
