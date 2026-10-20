import { test, expect } from '@playwright/test';
import { gotoHome, walkToSynthesis, collectConsoleErrors, readStoredState } from './fixtures.js';

test.describe('Persistance transverse', () => {
  test('un edit très récent (avant le debounce) est quand même sauvegardé au pagehide', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: /Créer un projet/ }).first().click();

    // Simule un onglet qui se ferme avant que l'écriture IndexedDB ne soit confirmée : plus
    // aucune transaction n'aboutit dans cette page.
    await page.evaluate(() => {
      window.IDBDatabase.prototype.transaction = () => ({
        objectStore: () => ({ put() {}, get: () => ({}) })
      });
    });
    await page.locator('[contenteditable="true"]').first().click();
    await page.keyboard.type('Projet pagehide test');

    // Le flush pagehide doit donc laisser une copie synchrone dans le localStorage.
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    const localCopy = await page.evaluate(() => window.localStorage.getItem('complianceNavigatorState'));
    expect(localCopy).toContain('Projet pagehide test');

    // Au démarrage suivant, cette copie est reprise, écrite dans IndexedDB puis retirée : elle ne
    // doit pas occuper durablement le quota qu'on cherche justement à épargner.
    await page.reload();
    await expect
      .poll(async () => JSON.stringify(await readStoredState(page)))
      .toContain('Projet pagehide test');
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('complianceNavigatorState')))
      .toBeNull();
  });

  const fillLocalStorage = (page) => page.evaluate(() => {
    try {
      const chunk = 'x'.repeat(1024 * 1024);
      for (let i = 0; i < 20; i += 1) {
        window.localStorage.setItem('e2e-quota-filler-' + i, chunk);
      }
    } catch {
      // Le remplissage s'arrête naturellement dès que le quota est atteint.
    }
  });

  test('un localStorage saturé n’empêche plus la sauvegarde', async ({ page }) => {
    await gotoHome(page);
    await fillLocalStorage(page);

    await page.getByRole('button', { name: /Créer un projet/ }).first().click();
    await page.locator('[contenteditable="true"]').first().click();
    await page.keyboard.type('Projet quota test');

    await expect
      .poll(async () => JSON.stringify(await readStoredState(page)))
      .toContain('Projet quota test');
    await expect(page.getByText(/espace de stockage/i)).toHaveCount(0);
  });

  test('la bannière de stockage plein apparaît quand IndexedDB est indisponible et le localStorage saturé', async ({ page }) => {
    await gotoHome(page);
    await page.addInitScript(() => {
      window.IDBFactory.prototype.open = () => {
        throw new Error('IndexedDB indisponible (e2e)');
      };
    });
    await page.reload();
    await fillLocalStorage(page);

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
