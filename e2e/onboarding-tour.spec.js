// Couverture du tour d'onboarding v2 : menu d'entrée à 5 parcours, navigation goTo entre
// séquences, et présence des ancrages de chaque étape sur le bon écran.
import { test, expect } from '@playwright/test';
import { gotoFresh, completeOnboarding, collectConsoleErrors } from './fixtures.js';

const tourNext = (page) => page.locator('.tgjs-controls .tgjs-button--primary');
const tourAction = (page, label) => page.locator('.tgjs-actions .tgjs-button', { hasText: label });
const tourTitle = (page) => page.locator('.tgjs-title');

async function expectStep(page, title, anchor) {
  await expect(tourTitle(page)).toHaveText(title);
  if (anchor) {
    await expect(page.locator(`[data-tour-id="${anchor}"]`).first()).toBeVisible();
  }
}

async function startTour(page) {
  await gotoFresh(page);
  await completeOnboarding(page, { startTour: true });
  await expect(tourTitle(page)).toHaveText('Bienvenue sur Project Navigator');
}

async function walk(page, steps) {
  for (const [title, anchor] of steps) {
    await expectStep(page, title, anchor);
    await tourNext(page).click();
  }
}

test.describe('tour v2', () => {
  // Plusieurs séquences traversent la vitrine (canvas WebGL, animations de révélation, mode
  // édition) : comme toutes les specs `showcase-*`, elles dépassent le timeout par défaut de
  // 30 s — « Présenter son projet » enchaîne onze étapes sur cet écran.
  test.describe.configure({ timeout: 120000 });

  test('le menu d entree propose les 5 parcours', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await startTour(page);
    for (const label of ['Tour rapide', 'Créer un projet', 'Valider son projet', 'Présenter son projet', 'Trouver l’inspiration']) {
      await expect(tourAction(page, label)).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

  test('le bouton d aide reste accessible pendant le guide', async ({ page }) => {
    await startTour(page);
    // Lancer la visite guidée, c'est déjà chercher de l'aide : la FAQ ne doit pas disparaître
    // avec l'écran d'accueil.
    const help = page.locator('.tgjs-tooltip .tgjs-help');
    await expect(help).toBeVisible();
    await expect(help).toHaveText('Aide');
    await expect(help).toHaveAttribute('href', './faq.html');

    await tourAction(page, 'Tour rapide').click();
    await expect(help).toBeVisible();
  });

  test('le tour rapide traverse questionnaire, synthese et vitrine', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await startTour(page);
    await tourAction(page, 'Tour rapide').click();

    await walk(page, [
      ['Votre copilote compliance', 'home-create-project'],
      ['Un questionnaire qui s’adapte', 'question-main-content'],
      ['Une analyse automatique', 'synthesis-summary'],
      ['Les experts viennent à vous', 'synthesis-team-exchange'],
      ['Et voilà votre vitrine', 'showcase-hero'],
      ['Personnalisable de bout en bout', 'showcase-edit-trigger'],
      ['Le feedback au bon endroit', 'showcase-annotation-note']
    ]);

    await expectStep(page, 'Voilà le potentiel de Project Navigator');
    for (const label of ['Créer un projet', 'Valider son projet', 'Présenter son projet', 'Trouver l’inspiration']) {
      await expect(tourAction(page, label)).toBeVisible();
    }
    await expect(tourAction(page, 'Tour rapide')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('la sequence creer couvre questionnaire, partage et vitrine', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await startTour(page);
    await tourAction(page, 'Créer un projet').click();

    await walk(page, [
      ['Lancer un nouveau projet', 'home-create-project'],
      ['Répondre à votre rythme', 'question-main-content'],
      ['Suivre votre avancement', 'question-summary-panel'],
      ['Où en est votre projet ?', 'question-stage-selector'],
      ['Comprendre chaque question', 'question-guidance-toggle'],
      ['Bien plus que du texte', 'question-main-content'],
      ['Signaler un doute', 'question-doubt-toggle'],
      ['Terminer quand vous voulez', 'questionnaire-finish-button'],
      ['Travailler à plusieurs', 'synthesis-share-member'],
      ['Récolter du feedback très tôt', 'showcase-share-trigger']
    ]);

    await expectStep(page, 'Votre projet est cadré');
    await expect(tourAction(page, 'Tour rapide')).toHaveCount(0);
    for (const label of ['Valider son projet', 'Présenter son projet', 'Trouver l’inspiration']) {
      await expect(tourAction(page, label)).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

  test('la sequence valider couvre obligatoires, delais, echanges et comites', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await startTour(page);
    await tourAction(page, 'Valider son projet').click();

    await walk(page, [
      ['Lire les enjeux du projet', 'synthesis-summary'],
      ['Consulter la compliance avant d’avoir fini', 'synthesis-readiness'],
      ['Compléter les informations obligatoires', 'mandatory-summary-panel'],
      // Le bloc « Points de vigilance » n'existe que si le projet porte une alerte de délai :
      // le projet de démonstration n'en a pas, le tour retombe alors sur une bulle centrée.
      ['Vérifier vos délais', null],
      ['Savoir qui sera sollicité', 'synthesis-teams'],
      ['Deux portes pour solliciter la compliance', 'synthesis-submit'],
      ['Vous gardez la main', 'synthesis-submit'],
      ['Dialoguer avec les experts', 'synthesis-team-exchange'],
      ['Le passage en comité', 'synthesis-committees']
    ]);

    await expectStep(page, 'Vous savez faire valider votre projet');
    await expect(tourAction(page, 'Tour rapide')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('la sequence presenter enchaine edition, publication et partage', async ({ page }) => {
    // La plus longue des cinq séquences : 11 étapes qui montent la vitrine, entrent en mode
    // édition et ouvrent la fenêtre de partage. Chaque étape coûte une reprise de rendu de la
    // vitrine complète, et le total dépasse le délai par défaut de 30 s — sans que rien n'échoue.
    test.slow();
    const errors = collectConsoleErrors(page);
    await startTour(page);
    await tourAction(page, 'Présenter son projet').click();

    await walk(page, [
      ['Votre vitrine existe déjà', 'showcase-hero'],
      ['Elle reste vivante', 'showcase-roadmap'],
      ['Vous éditez le rendu réel', 'showcase-edit-trigger'],
      ['La barre d’édition', null],
      ['Chaque section se règle', null],
      ['Ajoutez vos propres blocs', null],
      ['Publier vos modifications', null],
      ['Light ou complet, selon l’audience', null],
      ['Partager et choisir ce qui est visible', null],
      ['Activer les commentaires', 'showcase-comment-toggle'],
      ['Le feedback arrive en contexte', 'showcase-annotation-note']
    ]);

    await expectStep(page, 'Votre projet est prêt à être présenté');
    await expect(tourAction(page, 'Tour rapide')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('la sequence inspiration bascule sur l onglet Inspiration', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await startTour(page);
    await tourAction(page, 'Trouver l’inspiration').click();

    await walk(page, [
      ['Trouver l’inspiration', 'home-inspiration-block'],
      ['Chercher ailleurs', 'home-inspiration-toggle'],
      // La carte de filtres Inspiration n'existe que s'il y a déjà des inspirations : sur une
      // session vierge, le tour retombe sur une bulle centrée, sans ancrage.
      ['Filtrer pour trouver', null],
      ['Contribuer à votre tour', 'home-add-inspiration'],
      ['Enrichir votre fiche', 'home-add-inspiration'],
      ['La rendre visible de tous', 'home-inspiration-block']
    ]);

    await expectStep(page, 'Vous avez de quoi nourrir vos idées');
    await expect(tourAction(page, 'Tour rapide')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
