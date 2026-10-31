import { test, expect } from '@playwright/test';
import {
  gotoHome,
  patchStateOnBoot,
  readStoredState,
  grantSelfComplianceExpertAndCommitteeAccess,
  collectConsoleErrors
} from './fixtures.js';

const openFaqDialog = (page) =>
  page.evaluate(() =>
    window.dispatchEvent(new CustomEvent('cn:open-static-page', { detail: { pageId: 'faq' } }))
  );

const MANUALS = {
  projectManager: { fr: 'https://example.sharepoint.com/sites/cn/Docs/chef-de-projet.pdf', en: '', de: '', es: '' },
  sme: { fr: 'https://example.sharepoint.com/sites/cn/Docs/sme.pptx', en: '', de: '', es: '' }
};

test.describe('Fenêtre d’aide : manuels en lecture seule', () => {
  test('sans lien renseigné, aucun bouton de manuel', async ({ page }) => {
    await gotoHome(page);
    await openFaqDialog(page);
    const dialog = page.locator('[data-static-page="faq"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-help-manual]')).toHaveCount(0);
  });

  test('un non-expert ne voit que le manuel Chef de projet, dans une visionneuse sans téléchargement', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await patchStateOnBoot(page, (state, manuals) => ({ ...(state || {}), helpManuals: manuals }), MANUALS);
    await gotoHome(page);
    await openFaqDialog(page);
    const dialog = page.locator('[data-static-page="faq"]');
    await expect(dialog.locator('[data-help-manual="projectManager"]')).toBeVisible();
    await expect(dialog.locator('[data-help-manual="sme"]')).toHaveCount(0);

    await dialog.locator('[data-help-manual="projectManager"]').click();
    const viewer = dialog.locator('[data-help-manual-viewer="projectManager"]');
    await expect(viewer).toHaveAttribute('src', /chef-de-projet\.pdf#toolbar=0/);
    await expect(viewer).not.toHaveAttribute('sandbox', /allow-downloads/);

    await dialog.getByRole('button', { name: /Retour à l’aide|Retour à l'aide/ }).click();
    await expect(dialog.locator('[data-help-manual="projectManager"]')).toBeVisible();
    expect(errors.filter((message) => !/frame|X-Frame|Refused to display|ERR_/.test(message))).toEqual([]);
  });

  test('un expert voit le manuel SME ; hors SharePoint un PowerPoint propose l’ouverture externe', async ({ page }) => {
    await gotoHome(page);
    await grantSelfComplianceExpertAndCommitteeAccess(page);
    await page.getByRole('button', { name: 'Accéder au Back-office' }).click();
    await page.getByRole('tab', { name: /FAQ/ }).click();

    const smeInput = page.locator('#help-manual-sme-fr');
    await smeInput.fill(MANUALS.sme.fr);
    await page.locator('#help-manual-projectManager-fr').fill('pas un lien');
    await expect(page.getByRole('alert').filter({ hasText: 'https://' })).toBeVisible();
    await page.locator('#help-manual-projectManager-fr').fill(MANUALS.projectManager.fr);

    await expect.poll(async () => (await readStoredState(page))?.helpManuals?.sme?.fr).toBe(MANUALS.sme.fr);

    await page.getByRole('button', { name: 'Mode Chef de Projet' }).click();
    await openFaqDialog(page);
    const dialog = page.locator('[data-static-page="faq"]');
    await expect(dialog.locator('[data-help-manual]')).toHaveCount(2);
    await dialog.locator('[data-help-manual="sme"]').click();
    await expect(dialog.locator('[data-help-manual-viewer]')).toHaveCount(0);
    await expect(dialog.locator('[data-help-manual-fallback] a')).toHaveAttribute('href', MANUALS.sme.fr);
  });
});
