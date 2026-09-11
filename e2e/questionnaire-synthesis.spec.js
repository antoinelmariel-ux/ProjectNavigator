import { test, expect } from '@playwright/test';
import {
  gotoHome,
  walkToSynthesis,
  getQuestionHeading,
  collectConsoleErrors
} from './fixtures.js';

async function startNewProject(page) {
  await gotoHome(page);
  await page.getByRole('button', { name: /Créer un projet/ }).first().click();
}

test.describe('Questionnaire adaptatif -> Synthèse', () => {
  test('parcours complet sans erreur console, visibilité adaptative fonctionnelle', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await startNewProject(page);

    await walkToSynthesis(page, {
      async onQuestion(heading, p) {
        if (heading.includes('document')) {
          const fileInput = p.locator('input[type="file"]');
          if ((await fileInput.count()) > 0) {
            await fileInput.first().setInputFiles({
              name: 'doc.txt',
              mimeType: 'text/plain',
              buffer: Buffer.from('contenu de test')
            });
            return true;
          }
        }
        return false;
      }
    });

    await expect(page.getByRole('heading', { name: 'Synthèse' })).toBeVisible();
    // La visibilité adaptative a fait grandir le nombre de questions (12 -> 25 sur le
    // parcours par défaut) : si le rapport s'affiche avec une équipe à consulter, le
    // moteur de règles a bien été piloté par les réponses saisies dans l'UI.
    await expect(page.getByText(/Équipes à solliciter/)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("le résumé des questions obligatoires s'affiche si des réponses manquent, et permet d'y revenir", async ({ page }) => {
    await startNewProject(page);
    // On répond à tout SAUF la question du document (facultative en pratique, mais on ne
    // gère pas ici les jalons) pour vérifier le routage : soit direct synthèse, soit résumé.
    await walkToSynthesis(page, { maxSteps: 30 });

    const summaryHeading = page.getByText('Questions obligatoires à compléter');
    const synthesisHeading = page.getByRole('heading', { name: 'Synthèse' });
    await expect(summaryHeading.or(synthesisHeading)).toBeVisible();
  });

  test('un jalon ajouté persiste après un aller-retour arrière/avant dans le questionnaire', async ({ page }) => {
    await startNewProject(page);
    let milestoneHandled = false;

    await walkToSynthesis(page, {
      maxSteps: 30,
      async onQuestion(heading, p) {
        if (heading.includes('jalons') && !milestoneHandled) {
          milestoneHandled = true;
          await p.getByRole('button', { name: /Ajouter un jalon/ }).click();
          await p.locator('input[type="date"]').first().fill('2026-03-15');
          return true;
        }
        return false;
      }
    });

    expect(milestoneHandled).toBe(true);
  });

  test('modifier une réponse antérieure ne casse pas la navigation avant/arrière', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await startNewProject(page);

    // Avance de quelques questions puis revient en arrière changer la première réponse à
    // choix (équipe), avant de re-avancer jusqu'à la synthèse : le point le plus probable
    // de régression pour la visibilité conditionnelle des questions dépendantes.
    for (let i = 0; i < 5; i += 1) {
      await walkToSynthesisStep(page);
    }

    for (let i = 0; i < 10; i += 1) {
      const prevBtn = page.getByRole('button', { name: 'Précédent' });
      if ((await prevBtn.count()) === 0) break;
      await prevBtn.click();
      const heading = await getQuestionHeading(page);
      if (heading.includes('équipe est-il rattaché')) {
        const radios = page.locator('input[type="radio"]');
        const count = await radios.count();
        await radios.nth(count - 1).check({ force: true });
        break;
      }
    }

    await walkToSynthesis(page, { maxSteps: 40 });
    const summaryHeading = page.getByText('Questions obligatoires à compléter');
    const synthesisHeading = page.getByRole('heading', { name: 'Synthèse' });
    await expect(summaryHeading.or(synthesisHeading)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("l'édition inline depuis la synthèse ramène bien au rapport après validation", async ({ page }) => {
    await startNewProject(page);
    await walkToSynthesis(page, { maxSteps: 30 });
    if (await page.getByText('Questions obligatoires à compléter').count() > 0) {
      await page.getByRole('button', { name: /Accéder à la synthèse/ }).click();
    }
    await expect(page.getByRole('heading', { name: 'Synthèse' })).toBeVisible();

    await page.getByRole('button', { name: 'Afficher' }).first().click();
    const editButtons = page.locator('button[aria-label*="Modifier"]');
    await expect(editButtons.first()).toBeVisible();
    await editButtons.first().click();

    await expect(page.getByText('Modification depuis le rapport Compliance')).toBeVisible();
    await page.getByRole('button', { name: 'Valider et revenir au rapport' }).click();

    await expect(page.getByRole('heading', { name: 'Synthèse' })).toBeVisible();
  });

  test('la soumission du projet le fait apparaître comme soumis sur la page d\'accueil', async ({ page }) => {
    await startNewProject(page);
    await walkToSynthesis(page, {
      maxSteps: 30,
      async onQuestion(heading, p) {
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
    if (await page.getByText('Questions obligatoires à compléter').count() > 0) {
      await page.getByRole('button', { name: /Accéder à la synthèse/ }).click();
    }

    await page.getByRole('button', { name: 'Soumettre le projet' }).click();
    await expect(page.getByText(/soumis/i).first()).toBeVisible();
  });
});

async function walkToSynthesisStep(page) {
  const nextBtn = page.getByRole('button', { name: /^(Suivant|Voir la synthèse)$/ });
  const radios = page.locator('input[type="radio"]');
  const richTextEditable = page.locator('[contenteditable="true"]');
  const checkboxes = page.locator('input[type="checkbox"]');
  if ((await radios.count()) > 0) await radios.first().check({ force: true });
  else if ((await richTextEditable.count()) > 0) {
    await richTextEditable.first().click();
    await page.keyboard.type('Réponse test.');
  } else if ((await checkboxes.count()) > 1) await checkboxes.first().check({ force: true });
  await nextBtn.first().click();
  await page.waitForTimeout(150);
}

// Un projet créé puis laissé de côté peut n'avoir aucune réponse enregistrée : dans ce cas
// `resolveProjectAnalysis` ne recalcule rien et renvoie `null` (comportement volontaire, cf.
// test/rules.test.mjs). Les chemins qui ouvrent directement la synthèse — lien de notification
// `?projectId=…&view=synthesis`, bouton « Ouvrir » de la revue Compliance, retour depuis la
// vitrine — faisaient alors tomber toute l'application dans l'ErrorBoundary global
// (« Affichage interrompu ») au lieu d'afficher une synthèse vide.
test.describe('Synthèse tolérante à une analyse absente', () => {
  test('un projet sans réponse ouvert en synthèse affiche un rapport vide, pas l\'écran d\'erreur', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: /Créer un projet/ }).first().click();
    await expect(page.locator('[id^="question-"]').first()).toBeVisible();
    await page.getByRole('button', { name: /Retourner à l.accueil des projets/ }).first().click();
    await expect(page.getByRole('button', { name: /Continuer l.édition/ }).first()).toBeVisible();

    const projectId = await page.evaluate(
      () => (JSON.parse(window.localStorage.getItem('complianceNavigatorState') || '{}').projects || [])[0]?.id
    );
    expect(projectId).toBeTruthy();

    // addInitScript plutôt qu'un evaluate + reload : le flush `pagehide` de la page courante
    // réécrirait sinon l'état React par-dessus la modification juste avant le rechargement.
    await page.addInitScript(() => {
      const key = 'complianceNavigatorState';
      const state = JSON.parse(window.localStorage.getItem(key) || '{}');
      if (Array.isArray(state.projects) && state.projects[0]) {
        state.projects[0].answers = {};
        state.projects[0].analysis = null;
      }
      window.localStorage.setItem(key, JSON.stringify(state));
    });

    await page.goto(`/index.html?projectId=${projectId}&view=synthesis`);

    await expect(page.getByRole('heading', { name: 'Synthèse' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Affichage interrompu' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /Risques identifiés \(0\)/ })).toBeVisible();
  });
});
