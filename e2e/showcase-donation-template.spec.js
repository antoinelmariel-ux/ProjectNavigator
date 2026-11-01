import { test, expect } from '@playwright/test';
import {
  collectConsoleErrors,
  gotoHome,
  grantAdminAccess,
  patchStateOnBoot,
  proceedThroughMandatorySummary,
  readStoredState,
  walkQuestionnaireToShowcase
} from './fixtures.js';
import { initialShowcaseTemplates } from '../src/data/showcaseTemplates.js';

// La vitrine d'un don se remplit d'office depuis le questionnaire : le montant devient le
// chiffre clé, les choix deviennent des listes, une phrase du modèle cite les réponses.
// Ce que le modèle retire n'apparaît ni dans la vitrine ni dans son éditeur.
const BENEFICIARY = 'Association Hémophilie Solidaire';
const PURPOSE = 'Le soutien finance un programme d’éducation thérapeutique.';

const answerAsDonation = async (page) => {
  await page.getByRole('button', { name: /Créer un projet/ }).first().click();
  await walkQuestionnaireToShowcase(page, {
    async onQuestion(heading, p) {
      if (heading.includes('De quel type de projet')) {
        await p.getByLabel('Don / bourse / Appel à projets').check({ force: true });
        return true;
      }
      if (heading.includes('montant total du soutien')) {
        await p.locator('input[type="number"]').first().fill('25000');
        return true;
      }
      if (heading.includes('Qui est le bénéficiaire')) {
        await p.locator('[contenteditable="true"], input[type="text"]').first().click();
        await p.keyboard.type(BENEFICIARY);
        return true;
      }
      if (heading.includes('Que finance concrètement')) {
        await p.locator('[contenteditable="true"]').first().click();
        await p.keyboard.type(PURPOSE);
        return true;
      }
      if (heading.includes('Comment le soutien sera-t-il versé')) {
        await p.getByLabel('En plusieurs versements').check({ force: true });
        return true;
      }
      if (heading.includes('Une contrepartie est-elle attendue')) {
        await p.getByLabel('Aucune contrepartie').check({ force: true });
        return true;
      }
      if (heading.includes('À destination de qui porte le soutien')) {
        await p.getByLabel('Association ou organisme à but non lucratif').check({ force: true });
        await p.getByLabel('Expert ou réseau professionnel').check({ force: true });
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

// L'équipe ne s'affiche que si un compte rendu est attendu du bénéficiaire : le don créé
// ci-dessous n'en attend aucun.
const templatesWithConditionalTeam = initialShowcaseTemplates.map((template) => (
  template.id !== 'don-bourse-appel-a-projets'
    ? template
    : {
        ...template,
        sections: template.sections.map((entry) => (
          entry.kind === 'builtin' && entry.id === 'team'
            ? {
                ...entry,
                displayCondition: {
                  conditionGroups: [{
                    logic: 'all',
                    conditions: [{ type: 'question', question: 'donationCounterpart', operator: 'equals', value: 'compte_rendu_utilisation' }]
                  }]
                }
              }
            : entry
        ))
      }
));

test('la vitrine d’un don se remplit depuis le questionnaire', async ({ page }) => {
  test.setTimeout(240000);
  const errors = collectConsoleErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await patchStateOnBoot(page, (state, templates) => ({ ...(state || {}), showcaseTemplates: templates }), templatesWithConditionalTeam);
  await gotoHome(page);
  await answerAsDonation(page);

  const hero = page.locator('[data-showcase-section="hero"]');
  await expect(hero).toContainText('Un soutien de LFB');
  // le bouton du hero mène à « Le problème », absent de ce récit : le modèle le retire
  await expect(hero.locator('.sg-hero__cta')).toHaveCount(0);

  const figure = page.locator('[data-showcase-section="figure"]').first();
  await expect(figure).toContainText(/25\s000\s?€/);
  await expect(figure).toContainText(`Pour ${BENEFICIARY}`);
  await expect(figure).toContainText('En plusieurs versements');

  await expect(page.locator('[data-showcase-section="story"]').first()).toContainText(BENEFICIARY);
  await expect(page.locator('[data-showcase-section="highlight"]').first()).toContainText(PURPOSE);

  const stack = page.locator('[data-showcase-section="stack"]').first();
  await expect(stack.locator('.sg-card')).toHaveCount(2);
  await expect(stack).toContainText('Expert ou réseau professionnel');

  const checklist = page.locator('[data-showcase-section="checklist"]').first();
  await expect(checklist).toContainText(/Montant : 25\s000\s€/);
  await expect(checklist).toContainText('Contrepartie attendue : Aucune contrepartie');
  // « Points d'attention » est le nom du gabarit, pas un titre de vitrine
  await expect(checklist).not.toContainText('Points d’attention');

  // le coût estimé du projet ferait doublon avec le montant : le modèle le retire
  await expect(page.locator('[data-showcase-section="timeline"]')).toContainText('Les étapes du soutien');
  await expect(page.locator('[data-tour-id="showcase-budget"]')).toHaveCount(0);
  // condition d'affichage non remplie : le lecteur ne voit pas l'équipe
  await expect(page.locator('[data-showcase-section="team"]')).toHaveCount(0);

  // En édition : le montant se modifie par sa question, et la phrase qui le cite suit.
  await page.getByRole('button', { name: 'Modifier' }).click();
  await expect(page.locator('.sge-topbar')).toBeVisible();
  // en édition, le porteur la voit grisée, avec la raison
  const teamFrame = page.locator('.sge-frame').filter({ has: page.locator('[data-showcase-section="team"]') });
  await expect(teamFrame.getByTestId('showcase-section-hidden-by-condition')).toBeVisible();
  const figureFrame = page.locator('.sge-frame').filter({ has: page.locator('[data-showcase-section="figure"]') }).first();
  await figureFrame.scrollIntoViewIfNeeded();
  await figureFrame.hover();
  await figureFrame.locator('button[aria-label="Réglages de la section"]').click();
  const questionFields = page.getByTestId('showcase-linked-block-field');
  await expect(questionFields).toBeVisible();
  // le sur-titre et le titre sont fixés par le modèle : aucun éditeur pour eux
  await expect(page.getByTestId('showcase-block-locked-hint')).toBeVisible();
  await expect(page.locator('#custom-section-template-don-bourse-appel-a-projets-amount-title')).toHaveCount(0);
  await questionFields.getByLabel('Quel est le montant total du soutien ?').fill('30000');
  await expect(figure).toContainText(/30\s000\s?€/);
  await expect(checklist).toContainText(/Montant : 30\s000\s€/);

  await page.getByRole('button', { name: 'Publier' }).click();
  await expect
    .poll(async () => {
      const state = await readStoredState(page);
      const project = (state.projects || []).find((entry) => entry?.answers?.ProjectType === 'don_bourse_appel_a_projets');
      return project?.answers?.donationAmount ?? null;
    })
    .toBe('30000');

  expect(errors).toEqual([]);
});

test('le back-office masque un emplacement, renomme une section et prévisualise le modèle', async ({ page }) => {
  test.setTimeout(120000);
  const errors = collectConsoleErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoHome(page);
  await grantAdminAccess(page);
  await page.getByRole('tab', { name: /Modèles de vitrine/ }).click();

  const donation = page.getByTestId('showcase-template-card').first();
  await donation.getByRole('button', { name: 'Éditer sur la vitrine' }).click();
  const studio = page.getByTestId('showcase-template-studio');
  const outline = studio.getByTestId('showcase-template-studio-outline');
  const inspector = studio.getByTestId('showcase-template-studio-inspector');
  const section = (id) => inspector.locator(`[data-testid="showcase-template-section"][data-section-id="${id}"]`);
  const select = async (id, kind = 'block') => {
    await outline.locator(`[data-outline-key="${kind}:${id}"]`).click();
    return section(id);
  };
  const slot = (blockId, slotId) => section(blockId).locator(`[data-testid="showcase-template-slot"][data-slot-id="${slotId}"]`);

  await select('amount');
  await slot('amount', 'description').getByRole('combobox', { name: 'Affichage' }).selectOption('hidden');
  // un emplacement masqué ne propose plus de contenu
  await expect(slot('amount', 'description').getByRole('combobox', { name: 'Contenu' })).toHaveCount(0);
  await select('timeline', 'builtin');
  await section('timeline').getByRole('textbox', { name: 'Titre', exact: true }).fill('Calendrier des versements');

  // une phrase composée cite une réponse choisie dans la liste
  await select('purpose');
  const accent = slot('purpose', 'accent');
  await accent.getByRole('textbox', { name: 'Texte' }).fill('Soutien à');
  await accent.getByRole('combobox', { name: 'Citer une réponse' }).selectOption('donationBeneficiary');
  await expect(accent.getByRole('textbox', { name: 'Texte' })).toHaveValue('Soutien à {{donationBeneficiary}}');

  // les modalités ne s'affichent que si un compte rendu est attendu du bénéficiaire
  await select('terms');
  const termsCondition = section('terms').getByTestId('showcase-template-display-condition');
  await expect(termsCondition.locator('summary')).toContainText('toujours affichée');
  await termsCondition.locator('summary').click();
  await termsCondition.getByRole('button', { name: 'Créer un groupe de conditions' }).click();
  await termsCondition
    .locator('select')
    .filter({ has: page.locator('option[value="donationCounterpart"]') })
    .first()
    .selectOption('donationCounterpart');
  await termsCondition
    .locator('select')
    .filter({ has: page.locator('option', { hasText: 'Compte rendu de l’utilisation des fonds' }) })
    .first()
    .selectOption({ label: 'Compte rendu de l’utilisation des fonds' });
  await expect(termsCondition.locator('summary')).toContainText('affichée sous condition');

  // la feuille de route devient le bloc « Étapes » du catalogue, titre renommé compris
  await select('timeline', 'builtin');
  await section('timeline').getByRole('button', { name: 'Remplacer par un bloc réglable' }).click();
  await expect(section('timeline')).toHaveCount(0);
  const steps = section('from-timeline');
  await expect(steps.locator('[data-slot-id="items"]').getByRole('combobox', { name: 'Contenu' })).toHaveValue('roadmapMilestones');
  await expect(steps.locator('[data-slot-id="title"]').getByRole('textbox', { name: 'Texte' })).toHaveValue('Calendrier des versements');

  // un bloc « Citation » ajouté au modèle
  await studio.getByRole('combobox', { name: 'Ajouter un bloc…' }).selectOption('quote');
  const quote = inspector.locator('[data-testid="showcase-template-section"][data-section-kind="block"]');
  await quote.getByRole('combobox', { name: 'Gabarit' }).selectOption('quote');
  await quote.locator('[data-slot-id="description"]').getByRole('textbox', { name: 'Texte' }).fill('Un soutien qui change le quotidien des familles.');
  await quote.locator('[data-slot-id="subtitle"]').getByRole('textbox', { name: 'Texte' }).fill('Marie Martin');

  await studio.getByRole('button', { name: 'Fermer l’atelier' }).click();
  await donation.getByRole('button', { name: 'Aperçu' }).click();
  const preview = page.getByTestId('showcase-template-preview');
  await expect(preview).toBeVisible();
  const figure = preview.locator('[data-showcase-section="figure"]').first();
  await expect(figure).toContainText(/50\s000\s?€/);
  await expect(figure).not.toContainText('En plusieurs versements');
  await expect(preview.locator('[data-showcase-section="highlight"]').first()).toContainText('Soutien à Association Hémophilie Solidaire');
  const previewSteps = preview.locator('[data-showcase-section="steps"]');
  await expect(previewSteps).toContainText('Calendrier des versements');
  // les jalons du projet d'exemple, une étape par jalon, datée
  await expect(previewSteps.locator('.sg-road__item').first()).toContainText('01/10/2025');
  await expect(previewSteps).toContainText('Validation du concept et du budget');
  await expect(preview.locator('[data-showcase-section="timeline"]')).toHaveCount(0);
  const previewQuote = preview.locator('[data-showcase-section="quote"]');
  await expect(previewQuote).toContainText('Un soutien qui change le quotidien des familles.');
  await expect(previewQuote).toContainText('Marie Martin');
  await expect(preview.locator('[data-showcase-section="problem"]')).toHaveCount(0);
  // réponse fictive : aucune contrepartie, la condition des modalités n'est pas remplie
  await expect(preview.locator('[data-showcase-section="checklist"]')).toHaveCount(0);
  await expect(preview.locator('[data-showcase-section="stack"]')).toHaveCount(1);

  await page.getByRole('button', { name: 'Fermer l’aperçu' }).click();
  await expect(preview).toHaveCount(0);
  expect(errors).toEqual([]);
});
