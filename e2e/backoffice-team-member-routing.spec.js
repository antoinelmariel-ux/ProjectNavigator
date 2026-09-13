import { test, expect } from '@playwright/test';
import { gotoHome, grantAdminAccess, collectConsoleErrors } from './fixtures.js';

// L'équipe « Affaires Publiques » du référentiel par défaut a déjà deux contacts, donc le
// panneau de routage par membre est visible sans setup supplémentaire.
const MULTI_MEMBER_TEAM = 'Affaires Publiques';

async function openTeamsTab(page) {
  await gotoHome(page);
  await grantAdminAccess(page);
  await page.getByRole('tab', { name: /Équipes/ }).click();
}

const teamCard = (page) => page.locator('article').filter({ hasText: MULTI_MEMBER_TEAM }).first();

test.describe('Back-office : déclenchement par membre d’équipe', () => {
  test('le panneau n’apparaît qu’à partir de deux membres', async ({ page }) => {
    await openTeamsTab(page);

    await expect(teamCard(page).getByText('Déclenchement par membre', { exact: true })).toBeVisible();

    const singleMemberCard = page.locator('article').filter({ hasText: 'Contrôle pub' }).first();
    await expect(singleMemberCard.getByText('Déclenchement par membre', { exact: true })).toHaveCount(0);
  });

  test('des critères posés sur chaque membre déclenchent l’avertissement de couverture', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await openTeamsTab(page);

    const card = teamCard(page);
    const members = card.locator('li', { has: page.getByRole('button', { name: 'Critères' }) });
    const memberCount = await members.count();
    expect(memberCount).toBeGreaterThan(1);

    await expect(card.getByText('Toujours sollicité', { exact: true }).first()).toBeVisible();
    await expect(card.getByRole('alert')).toHaveCount(0);

    for (let index = 0; index < memberCount; index += 1) {
      await members.nth(index).getByRole('button', { name: 'Critères' }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Créer un groupe de conditions' }).click();

      const questionSelect = dialog.locator('select').filter({ hasText: 'Sélectionner...' }).first();
      await questionSelect.selectOption({ index: 1 });

      await dialog.getByRole('button', { name: 'Terminé' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }

    await expect(card.getByText('Sollicité si', { exact: true }).first()).toBeVisible();
    await expect(card.getByText('Toujours sollicité', { exact: true })).toHaveCount(0);
    await expect(card.getByRole('alert')).toContainText('plus aucun membre de cette équipe n’est sollicité systématiquement');

    expect(errors).toEqual([]);
  });

  test('l’avertissement propose une réattribution qui rétablit la couverture', async ({ page }) => {
    await openTeamsTab(page);

    const card = teamCard(page);
    const members = card.locator('li', { has: page.getByRole('button', { name: 'Critères' }) });
    const memberCount = await members.count();

    for (let index = 0; index < memberCount; index += 1) {
      await members.nth(index).getByRole('button', { name: 'Critères' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: 'Créer un groupe de conditions' }).click();
      await dialog.locator('select').filter({ hasText: 'Sélectionner...' }).first().selectOption({ index: 1 });
      await dialog.getByRole('button', { name: 'Terminé' }).click();
    }

    const alert = card.getByRole('alert');
    await expect(alert).toBeVisible();

    // La cible porte déjà des critères ici : la mise en garde sur leur remplacement doit s'afficher.
    await expect(alert.getByText(/seront remplacés/)).toBeVisible();

    const sourceEmail = await alert.locator('select').first().inputValue();
    await alert.getByRole('button', { name: 'Réattribuer' }).click();

    await expect(card.getByRole('alert')).toHaveCount(0);
    await expect(
      members.filter({ hasText: sourceEmail }).getByText('Toujours sollicité', { exact: true })
    ).toBeVisible();
  });

  test('le mode « non sollicité si » choisi avant la première condition est conservé', async ({ page }) => {
    await openTeamsTab(page);

    const card = teamCard(page);
    const members = card.locator('li', { has: page.getByRole('button', { name: 'Critères' }) });
    await members.first().getByRole('button', { name: 'Critères' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('radio', { name: /Ne pas solliciter ce membre/ }).check();
    await dialog.getByRole('button', { name: 'Créer un groupe de conditions' }).click();
    await dialog.locator('select').filter({ hasText: 'Sélectionner...' }).first().selectOption({ index: 1 });
    await dialog.getByRole('button', { name: 'Terminé' }).click();

    await expect(members.first().getByText('Non sollicité si', { exact: true })).toBeVisible();

    await members.first().getByRole('button', { name: 'Critères' }).click();
    await expect(page.getByRole('dialog').getByRole('radio', { name: /Ne pas solliciter ce membre/ })).toBeChecked();
  });

  test('retirer le dernier membre sans critère fait apparaître l’avertissement', async ({ page }) => {
    await openTeamsTab(page);

    const card = teamCard(page);
    const members = card.locator('li', { has: page.getByRole('button', { name: 'Critères' }) });
    const memberCount = await members.count();

    // On conditionne tous les membres sauf le premier : tant qu'il reste, pas d'avertissement.
    for (let index = 1; index < memberCount; index += 1) {
      await members.nth(index).getByRole('button', { name: 'Critères' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: 'Créer un groupe de conditions' }).click();
      await dialog.locator('select').filter({ hasText: 'Sélectionner...' }).first().selectOption({ index: 1 });
      await dialog.getByRole('button', { name: 'Terminé' }).click();
    }

    await expect(card.getByRole('alert')).toHaveCount(0);

    const firstMemberEmail = (await members.first().locator('span').first().textContent())?.trim();
    await card.getByRole('button', { name: `Retirer ${firstMemberEmail}` }).click();

    await expect(card.getByRole('alert')).toContainText('plus aucun membre de cette équipe n’est sollicité systématiquement');
  });
});
