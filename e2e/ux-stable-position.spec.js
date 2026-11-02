import { test, expect } from '@playwright/test';
import {
  collectConsoleErrors,
  createAndSubmitProject,
  goToProjectsHome,
  gotoHome,
  grantSelfComplianceExpertAndCommitteeAccess,
  patchStateOnBoot
} from './fixtures.js';

// Un clic ne doit pas faire disparaître l'élément sur lequel il porte : il reste à sa place, ou
// il part en le disant. Ces specs verrouillent les deux cas qui ont motivé le changement.

test.describe('Position stable après un clic', () => {
  test('prendre un projet en charge le fait passer dans « En cours » sans faire bouger les autres', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await gotoHome(page);
    await grantSelfComplianceExpertAndCommitteeAccess(page);
    await createAndSubmitProject(page);
    await goToProjectsHome(page);

    // Un second projet déclenché, plus ancien : trié par date, il est en seconde position, et
    // c'est celui que la prise en charge aurait fait bondir en tête.
    await patchStateOnBoot(page, (stored) => {
      const state = stored || {};
      const source = (state.projects || []).find((project) => String(project?.id || '').startsWith('project-') && project.status === 'submitted');
      if (!source || (state.projects || []).some((project) => project.id === 'project-e2e-older')) {
        return state;
      }
      // Dates récentes, calculées à l'exécution : trop anciennes, les deux projets déclencheraient la
      // relance « périmètre non pris en charge », qui réécrit lastUpdated et fausse le test.
      // La prise en charge écrit lastUpdated = maintenant, postérieur aux deux : sans ordre figé,
      // le projet pris en charge passerait donc en tête.
      const now = Date.now();
      source.lastUpdated = new Date(now - 60 * 60 * 1000).toISOString();
      const clone = JSON.parse(JSON.stringify(source));
      clone.id = 'project-e2e-older';
      clone.projectName = 'Projet plus ancien';
      clone.lastUpdated = new Date(now - 120 * 60 * 1000).toISOString();
      clone.submittedAt = clone.lastUpdated;
      state.projects.push(clone);
      return state;
    });
    await page.reload();

    const cards = page.locator('article[id^="compliance-project-"]');
    await expect(cards).toHaveCount(2);
    const idsBefore = await cards.evaluateAll((elements) => elements.map((element) => element.id));
    expect(idsBefore[1]).toBe('compliance-project-project-e2e-older');

    const older = cards.nth(1);
    // Mesuré par rapport à la première carte : Playwright fait défiler la page pour cliquer, la
    // position dans la fenêtre ne dit donc rien.
    const offsetFromFirst = async () => (await older.boundingBox()).y - (await cards.first().boundingBox()).y;
    const offsetBefore = await offsetFromFirst();

    // Sans ordre figé, le projet pris en charge saute en tête puis, une demi-seconde plus tard,
    // un autre effet réécrit une date et la liste se remet dans l'ordre : l'état final ne prouve
    // rien. On enregistre donc chaque changement de l'ordre pendant toute la séquence.
    await page.evaluate(() => {
      const readOrder = () => Array.from(document.querySelectorAll('article[id^="compliance-project-"]')).map((element) => element.id);
      window.__listOrders = [readOrder()];
      const list = document.querySelector('article[id^="compliance-project-"]').closest('[role="list"]');
      new MutationObserver(() => window.__listOrders.push(readOrder())).observe(list, { childList: true, subtree: true });
    });

    await older.getByRole('button', { name: 'Je prends en charge' }).first().click();
    // Pris en charge, il quitte « À prendre » en le disant ; il ne passe jamais devant l'autre
    // carte, qui ne bouge pas.
    await expect(page.getByRole('button', { name: 'Voir dans « En cours »' })).toBeVisible();
    await page.waitForTimeout(1200);

    const orders = await page.evaluate(() => window.__listOrders);
    orders.forEach((order) => expect(order[0]).toBe(idsBefore[0]));
    expect(orders[orders.length - 1]).toEqual([idsBefore[0]]);
    expect(offsetBefore).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Voir dans « En cours »' }).click();
    await expect(page.locator('#compliance-project-project-e2e-older')).toContainText('Vous le suivez depuis');
    expect(errors).toEqual([]);
  });

  test('mettre un projet à la corbeille le fait partir avec une notification qui permet d’annuler', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await gotoHome(page);
    await page.getByRole('button', { name: /Créer un projet/ }).first().click();
    await page.locator('[contenteditable="true"]').first().click();
    await page.keyboard.type('Projet e2e Notification');
    await page.getByRole('button', { name: /Retourner à l.accueil des projets/ }).click();

    const cards = page.locator('article[id^="project-card-"]').filter({ hasText: 'Projet e2e Notification' });
    await expect(cards).toHaveCount(1);

    await page.locator('button[aria-label*="Supprimer le projet"]').first().click();
    await page.getByRole('button', { name: 'Mettre à la corbeille' }).click();

    await expect(cards).toHaveCount(0);
    const toast = page.locator('.cn-toast');
    await expect(toast).toContainText('Projet e2e Notification');
    await expect(toast).toContainText('mis à la corbeille');

    await toast.getByRole('button', { name: 'Annuler' }).click();
    await expect(toast).toHaveCount(0);
    await expect(cards).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test('en mouvement réduit, le projet disparaît sans animation mais la notification reste', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoHome(page);
    await page.getByRole('button', { name: /Créer un projet/ }).first().click();
    await page.locator('[contenteditable="true"]').first().click();
    await page.keyboard.type('Projet e2e Mouvement réduit');
    await page.getByRole('button', { name: /Retourner à l.accueil des projets/ }).click();

    await page.locator('button[aria-label*="Supprimer le projet"]').first().click();
    await page.getByRole('button', { name: 'Mettre à la corbeille' }).click();

    await expect(page.locator('article[id^="project-card-"]').filter({ hasText: 'Projet e2e Mouvement réduit' })).toHaveCount(0);
    await expect(page.locator('.cn-collapse--leaving')).toHaveCount(0);
    await expect(page.locator('.cn-toast')).toBeVisible();
  });
});
