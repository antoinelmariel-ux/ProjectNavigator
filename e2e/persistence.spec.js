import { test, expect } from '@playwright/test';
import { gotoHome, walkToSynthesis, collectConsoleErrors } from './fixtures.js';

test.describe('Persistance transverse', () => {
  test('un edit très récent (avant le debounce) est quand même sauvegardé au pagehide', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: /Créer un projet/ }).first().click();
    await page.locator('[contenteditable="true"]').first().click();
    await page.keyboard.type('Projet pagehide test');

    // Déclenche le flush pagehide directement (sans attendre les 400ms de debounce), pour
    // vérifier que persistNowRef sauvegarde bien l'état le plus récent à la fermeture.
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    const stateRaw = await page.evaluate(() => window.localStorage.getItem('complianceNavigatorState'));
    expect(stateRaw).toContain('Projet pagehide test');
  });

  test('la bannière de stockage plein apparaît quand le quota localStorage est atteint', async ({ page }) => {
    await gotoHome(page);
    await page.evaluate(() => {
      try {
        const chunk = 'x'.repeat(1024 * 1024);
        for (let i = 0; i < 20; i += 1) {
          window.localStorage.setItem('e2e-quota-filler-' + i, chunk);
        }
      } catch {
        // Le remplissage s'arrête naturellement dès que le quota est atteint.
      }
    });

    await page.getByRole('button', { name: /Créer un projet/ }).first().click();
    await page.locator('[contenteditable="true"]').first().click();
    await page.keyboard.type('Projet quota test');
    await expect(page.getByText(/espace de stockage|quota|sauvegarde/i).first()).toBeVisible();
  });

  // Adresse volontairement absente de l'annuaire simulé, pour qu'aucune suggestion ne vienne
  // se substituer à la saisie au moment de valider.
  const MEMBER_EMAIL = 'collegue-e2e@lfb.fr';

  test("un membre ajouté au projet persiste dans le stockage local après un rechargement", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await gotoHome(page);
    await page.getByRole('button', { name: /Créer un projet/ }).first().click();
    await walkToSynthesis(page, { maxSteps: 30 });

    // Le partage passe par un PeoplePicker (src/components/PeoplePicker.jsx) : on tape
    // l'adresse puis Entrée la valide. Plus de <input type="email"> ni de bouton « Ajouter »
    // comme avant son introduction — c'est ce qui avait silencieusement périmé ce test.
    const picker = page.getByPlaceholder('prenom.nom@lfb.fr');
    await picker.fill(MEMBER_EMAIL);
    await picker.press('Enter');

    // Entrée valide la première suggestion de l'annuaire quand il y en a une, et seulement à
    // défaut le texte saisi : on vérifie donc ce qui a réellement été ajouté avant de tester
    // sa persistance, plutôt que de supposer que c'est bien MEMBER_EMAIL.
    await expect(page.getByText(MEMBER_EMAIL, { exact: false }).first()).toBeVisible();

    // Soumettre avant de recharger : c'est ce qui donne sur la carte d'accueil le bouton
    // « Consulter les enjeux », seul chemin de retour vers l'écran qui affiche les membres
    // (un brouillon ne propose que « Continuer l'édition », qui rouvre le questionnaire).
    // Le partage, lui, n'existe que sur les enjeux d'avant soumission, d'où cet ordre.
    await page.getByRole('button', { name: 'Demander la validation' }).click();
    await page.waitForTimeout(400);

    await page.reload();

    // Deux vérifications distinctes, parce que deux mécanismes distincts peuvent casser :
    // l'écriture (le membre atteint-il localStorage ?) et surtout la RELECTURE au rechargement.
    // C'est la seconde qui garde la régression documentée dans CLAUDE.md : un Mock*Provider
    // adossé à une Map nue réécrit bien dans localStorage mais repart vide à chaque F5, le
    // membre disparaissant de l'écran alors que la clé de stockage, elle, reste correcte.
    const membersRaw = await page.evaluate(
      () => window.localStorage.getItem('complianceNavigatorMockProjectMembers')
    );
    expect(membersRaw).toContain(MEMBER_EMAIL);

    // Le rechargement ramène à l'accueil : il faut rouvrir les enjeux du projet pour voir si
    // le membre est toujours là.
    const card = page.locator('article[id^="project-card-"]').first();
    await card.getByRole('button', { name: 'Consulter les enjeux' }).click();
    await expect(page.getByText(MEMBER_EMAIL, { exact: false }).first()).toBeVisible();
    expect(errors).toEqual([]);
  });
});
