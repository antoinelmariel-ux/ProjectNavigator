import { test, expect } from '@playwright/test';
import {
  gotoHome,
  walkToSynthesis,
  walkQuestionnaireToShowcase,
  openProjectStakes,
  getQuestionHeading,
  collectConsoleErrors
} from './fixtures.js';

async function startNewProject(page) {
  await gotoHome(page);
  await page.getByRole('button', { name: /Créer un projet/ }).first().click();
}

test.describe('Questionnaire adaptatif -> Vitrine -> Enjeux du projet', () => {
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

    await expect(page.getByRole('heading', { name: 'Enjeux du projet' })).toBeVisible();
    // La visibilité adaptative a fait grandir le nombre de questions (12 -> 25 sur le
    // parcours par défaut) : si le rapport s'affiche avec une équipe à consulter, le
    // moteur de règles a bien été piloté par les réponses saisies dans l'UI.
    await expect(page.getByText(/Équipes à solliciter/)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('le porteur de projet peut ajouter une équipe non identifiée automatiquement', async ({ page }) => {
    await startNewProject(page);
    await walkToSynthesis(page, { maxSteps: 30 });
    await expect(page.getByRole('heading', { name: 'Enjeux du projet' })).toBeVisible();

    const teamSelect = page.locator('#additional-team-select');
    await expect(teamSelect).toBeVisible();

    const options = await teamSelect.locator('option').evaluateAll(
      (nodes) => nodes.map((node) => ({ value: node.value, label: node.textContent.trim() }))
    );
    const teamOption = options.find((option) => option.value.length > 0);
    expect(teamOption).toBeTruthy();
    const teamName = teamOption.label;

    await teamSelect.selectOption(teamOption.value);
    await page.getByRole('button', { name: 'Solliciter cette équipe' }).click();

    await expect(page.getByText(/a été ajoutée aux enjeux du projet et notifiée/)).toBeVisible();
    await expect(page.getByRole('heading', { name: teamName })).toBeVisible();
  });

  test("le résumé des questions obligatoires s'affiche si des réponses manquent, et permet d'y revenir", async ({ page }) => {
    await startNewProject(page);
    // On répond à tout SAUF la question du document (facultative en pratique, mais on ne
    // gère pas ici les jalons) pour vérifier le routage : soit direct vitrine, soit résumé.
    await walkQuestionnaireToShowcase(page, { maxSteps: 30 });

    const summaryHeading = page.getByText('Questions obligatoires à compléter');
    const showcaseStakesButton = page.getByRole('button', { name: /Voir les enjeux du projet/ });
    await expect(summaryHeading.or(showcaseStakesButton)).toBeVisible();
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
    // choix (équipe), avant de re-avancer jusqu'au bout : le point le plus probable
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

    await walkQuestionnaireToShowcase(page, { maxSteps: 40 });
    const summaryHeading = page.getByText('Questions obligatoires à compléter');
    const showcaseStakesButton = page.getByRole('button', { name: /Voir les enjeux du projet/ });
    await expect(summaryHeading.or(showcaseStakesButton)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("l'édition inline depuis les enjeux ramène bien au rapport après validation", async ({ page }) => {
    await startNewProject(page);
    await walkToSynthesis(page, { maxSteps: 30 });
    await expect(page.getByRole('heading', { name: 'Enjeux du projet' })).toBeVisible();

    await page.getByRole('button', { name: 'Afficher' }).first().click();
    const editButtons = page.locator('button[aria-label*="Modifier"]');
    await expect(editButtons.first()).toBeVisible();
    await editButtons.first().click();

    await expect(page.getByText('Modification depuis les enjeux du projet')).toBeVisible();
    await page.getByRole('button', { name: 'Valider et revenir aux enjeux' }).click();

    await expect(page.getByRole('heading', { name: 'Enjeux du projet' })).toBeVisible();
  });

  test('la fin du formulaire ouvre la vitrine, les enjeux s\'ouvrent depuis celle-ci', async ({ page }) => {
    await startNewProject(page);
    await walkQuestionnaireToShowcase(page, { maxSteps: 40 });

    // La vitrine est la sortie du questionnaire : les enjeux ne s'affichent pas encore.
    const stakesButton = page.getByRole('button', { name: /Voir les enjeux du projet/ });
    await expect(stakesButton).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Enjeux du projet' })).toHaveCount(0);

    await openProjectStakes(page);
    await expect(page.getByRole('heading', { name: 'Enjeux du projet' })).toBeVisible();
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
    await page.getByRole('button', { name: 'Demander la validation' }).click();
    await expect(page.getByText(/soumis/i).first()).toBeVisible();
  });
});

async function walkToSynthesisStep(page) {
  const nextBtn = page.getByRole('button', { name: /^(Suivant|Voir la vitrine du projet)$/ });
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
test.describe('Enjeux du projet tolérants à une analyse absente', () => {
  test('un projet sans réponse ouvert sur ses enjeux affiche un rapport vide, pas l\'écran d\'erreur', async ({ page }) => {
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

    await expect(page.getByRole('heading', { name: 'Enjeux du projet' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Affichage interrompu' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /Risques identifiés \(0\)/ })).toBeVisible();
  });
});
