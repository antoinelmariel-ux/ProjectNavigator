import { test, expect } from '@playwright/test';
import {
  collectConsoleErrors,
  gotoHome,
  grantAdminAccess,
  proceedThroughMandatorySummary,
  readStoredState,
  walkQuestionnaireToShowcase
} from './fixtures.js';

// Un modèle de vitrine choisit de quelle question vient le contenu d'une section : la vitrine
// affiche cette réponse, et la modifier dans la vitrine modifie le questionnaire.
const DESCRIPTION = 'Le don finance une chaire de recherche.';

const configureDonationTemplate = async (page) => {
  await grantAdminAccess(page);
  await page.getByRole('tab', { name: /Modèles de vitrine/ }).click();
  await page.getByTestId('showcase-template-card').first().getByRole('button', { name: 'Éditer sur la vitrine' }).click();
  const studio = page.getByTestId('showcase-template-studio');
  const outline = studio.getByTestId('showcase-template-studio-outline');
  const inspector = studio.getByTestId('showcase-template-studio-inspector');

  const section = (id) => inspector.locator(`[data-testid="showcase-template-section"][data-section-id="${id}"]`);
  const select = async (id, kind = 'block') => {
    await outline.locator(`[data-outline-key="${kind}:${id}"]`).click();
    return section(id);
  };
  const slot = (blockId, slotId) => section(blockId).locator(`[data-testid="showcase-template-slot"][data-slot-id="${slotId}"]`);
  await select('beneficiary');
  await slot('beneficiary', 'description').getByRole('combobox', { name: 'Contenu' }).selectOption('solutionDescription');
  await select('purpose');
  await slot('purpose', 'description').getByRole('combobox', { name: 'Contenu' }).selectOption('teamLeadTeam');
  // un emplacement lié n'a plus de texte à saisir : son contenu est la réponse
  await expect(slot('beneficiary', 'description').getByRole('textbox')).toHaveCount(0);
  // le modèle « don » retire les membres clés : on les rétablit avant de les relier
  await select('team', 'builtin');
  await section('team').getByRole('checkbox', { name: 'Membres clés' }).check();
  await section('team').getByRole('combobox', { name: 'Membres clés' }).selectOption('q15');
  await studio.getByRole('button', { name: 'Fermer l’atelier' }).click();
};

const createDonation = async (page) => {
  await page.getByRole('button', { name: /Créer un projet/ }).first().click();
  await walkQuestionnaireToShowcase(page, {
    async onQuestion(heading, p) {
      if (heading.includes('De quel type de projet')) {
        await p.getByLabel('Don / bourse / Appel à projets').check({ force: true });
        return true;
      }
      if (heading.includes('Décrivez en quoi consiste votre projet')) {
        await p.locator('[contenteditable="true"]').first().click();
        await p.keyboard.type(DESCRIPTION);
        return true;
      }
      // laissée sans réponse : la section qui la lit doit le dire
      if (heading.includes('autre information clef')) {
        return true;
      }
      if (heading.includes('jalons')) {
        await p.getByRole('button', { name: /Ajouter un jalon/ }).click();
        await p.locator('input[type="date"]').first().fill('2026-04-01');
        return true;
      }
      if (heading.includes('document')) {
        await p.locator('input[type="file"]').first().setInputFiles({
          name: 'doc.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('x')
        });
        return true;
      }
      return false;
    }
  });
  await proceedThroughMandatorySummary(page);
};

test('une section de vitrine lit la question choisie dans le modèle et la réécrit', async ({ page }) => {
  test.setTimeout(240000);
  const errors = collectConsoleErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoHome(page);
  await configureDonationTemplate(page);
  await page.getByRole('button', { name: 'Basculer vers le mode chef de projet' }).click();
  await createDonation(page);

  const story = page.locator('[data-showcase-section="story"]').first();
  await expect(story).toContainText(DESCRIPTION);
  // premier choix proposé par le questionnaire, affiché par son libellé
  await expect(page.locator('[data-showcase-section="highlight"]').first()).toContainText('Marketing DOI');
  await expect(page.locator('[data-showcase-section="team"]')).toContainText('Information à compléter');

  await page.getByRole('button', { name: 'Modifier' }).click();
  await expect(page.locator('.sge-topbar')).toBeVisible();

  const storyText = page.locator('[data-showcase-section="story"] .sg-story__step .sge-inline').first();
  // la barre d'outils de la section recouvre la première ligne : on clique sur la dernière
  await storyText.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  const storyBox = await storyText.boundingBox();
  await storyText.click({ position: { x: 10, y: storyBox.height - 8 } });
  await page.keyboard.press('End');
  await page.keyboard.type(' Modifiée dans la vitrine.');

  const highlightFrame = page.locator('.sge-frame').filter({ has: page.locator('[data-showcase-section="highlight"]') }).first();
  await highlightFrame.scrollIntoViewIfNeeded();
  await highlightFrame.hover();
  await highlightFrame.locator('button[aria-label="Réglages de la section"]').click();
  await page.getByTestId('showcase-linked-block-field').locator('select').selectOption('medical_dof');
  await expect(page.locator('[data-showcase-section="highlight"]').first()).toContainText('Médical DOF');

  await page.getByRole('button', { name: 'Publier' }).click();

  await expect
    .poll(async () => {
      const state = await readStoredState(page);
      const project = (state.projects || []).find((entry) => entry?.answers?.ProjectType === 'don_bourse_appel_a_projets');
      return project ? [project.answers.solutionDescription, project.answers.teamLeadTeam] : null;
    })
    .toEqual([expect.stringContaining('Modifiée dans la vitrine.'), 'medical_dof']);

  expect(errors).toEqual([]);
});
