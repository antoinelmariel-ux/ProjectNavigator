import { test, expect } from '@playwright/test';
import { gotoHome, grantAdminAccess, collectConsoleErrors } from './fixtures.js';

// L'organigramme fictif (src/data/mockOrgDirectory.js) place le porteur des quatre projets
// soumis de démonstration deux niveaux sous l'utilisateur simulé : c'est ce qui fait apparaître
// l'onglet « Mon équipe » ici, sans rien injecter.
const teamCards = (page) => page.getByRole('list', { name: 'Projets de votre équipe' }).getByRole('listitem');

test('le manager consulte les projets de son équipe sans les confondre avec les siens', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await gotoHome(page);

  const tabs = page.getByRole('group', { name: 'Sélection du bloc projet' });
  await expect(tabs.getByRole('button', { name: 'Mes projets' })).toHaveAttribute('aria-pressed', 'true');
  const teamTab = tabs.getByRole('button', { name: 'Mon équipe (4)' });
  await expect(teamTab).toBeVisible();
  await expect(page.getByText('Porté par Chef de projet (démo)')).toHaveCount(0);

  await teamTab.click();
  await expect(page.getByRole('heading', { name: 'Projets de votre équipe' })).toBeVisible();
  await expect(page.getByRole('note')).toContainText('Consultation seule');
  await expect(teamCards(page)).toHaveCount(4);

  const card = teamCards(page).filter({ hasText: 'Impact 360' });
  await expect(card).toContainText('Porté par Chef de projet (démo)');
  await expect(card).toContainText('Équipe de Claire Dubreuil');
  await expect(card.getByRole('button', { name: /Modifier/ })).toHaveCount(0);
  await expect(card.getByRole('button', { name: /Supprimer|Dupliquer|Annuler la soumission/ })).toHaveCount(0);

  await page.getByRole('searchbox', { name: 'Rechercher un projet ou une personne' }).fill('Impact');
  await expect(teamCards(page)).toHaveCount(1);

  await card.getByRole('button', { name: 'Consulter les enjeux' }).click();
  await expect(page.getByText('Les modifications sont désactivées dans cette vue', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: /Retourner à l.accueil des projets/ }).first().click();
  await expect(tabs.getByRole('button', { name: 'Mon équipe (4)' })).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await expect(tabs.getByRole('button', { name: 'Mes projets' })).toHaveAttribute('aria-pressed', 'true');

  expect(errors).toEqual([]);
});

test('un administrateur ouvre les brouillons de l’équipe aux managers depuis le back-office', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await gotoHome(page);
  const tabs = page.getByRole('group', { name: 'Sélection du bloc projet' });
  await expect(tabs.getByRole('button', { name: 'Mon équipe (4)' })).toBeVisible();

  await grantAdminAccess(page);
  await page.getByRole('tab', { name: /Administrateurs/ }).click();
  const privateOption = page.getByRole('button', { name: /Projets envoyés uniquement/ });
  const draftsOption = page.getByRole('button', { name: /Projets envoyés et brouillons/ });
  await expect(privateOption).toHaveAttribute('aria-pressed', 'true');
  await draftsOption.click();
  await expect(draftsOption).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Basculer vers le mode chef de projet' }).click();
  await tabs.getByRole('button', { name: 'Mon équipe (5)' }).click();
  await expect(page.getByRole('note')).toContainText('Les brouillons en cours de rédaction sont également affichés');
  const draftCard = teamCards(page).filter({ hasText: 'Brouillon' });
  await expect(draftCard).toHaveCount(1);
  await expect(draftCard).toContainText('Équipe de Marc Lefevre');
  await expect(draftCard.getByRole('button', { name: /Continuer|Modifier/ })).toHaveCount(0);

  await page.reload();
  await expect(tabs.getByRole('button', { name: 'Mon équipe (5)' })).toBeVisible();

  expect(errors).toEqual([]);
});
