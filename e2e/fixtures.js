// Helpers partagés entre les specs e2e. Pas de data-testid dans le code applicatif :
// on cible par rôle/texte visible (français, langue par défaut détectée sans profil stocké).
import { expect } from '@playwright/test';

export async function gotoFresh(page) {
  // Volontairement pas de addInitScript() pour vider le localStorage : ce hook se
  // réexécuterait à chaque navigation, y compris un page.reload() ultérieur dans le test,
  // ce qui reviderait le stockage juste après une action que le test cherche à vérifier
  // justement à travers un rechargement (persistance). Un seul clear + reload suffit.
  await page.goto('/index.html');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Bienvenue sur Project Navigator' })).toBeVisible();
}

export async function completeOnboarding(page, { startTour = false } = {}) {
  const firstScopeOption = page.getByRole('group').first().locator('input[type="checkbox"]').first();
  await firstScopeOption.check();
  await page.getByRole('button', { name: 'Continuer' }).click();

  await expect(page.getByRole('heading', { name: 'Votre profil est enregistré' })).toBeVisible();
  if (startTour) {
    await page.getByRole('button', { name: 'Démarrer la visite guidée' }).click();
  } else {
    await page.getByRole('button', { name: 'Non merci, je découvrirai seul(e)' }).click();
  }
}

export async function gotoHome(page) {
  await gotoFresh(page);
  await completeOnboarding(page);
}

export async function getQuestionHeading(page) {
  return page.locator('[id^="question-"]').first().textContent().catch(() => '');
}

async function waitHeadingChange(page, previous, timeout = 5000) {
  await page
    .waitForFunction(
      (prev) => {
        const el = document.querySelector('[id^="question-"]');
        return el && el.textContent !== prev;
      },
      previous,
      { timeout }
    )
    .catch(() => {});
}

// Répond à la question visible avec une stratégie générique (premier radio, texte enrichi,
// première case à cocher si plusieurs, nombre, date), en laissant `onQuestion` prendre la main
// pour les cas particuliers (jalons, fichier) avant la réponse générique.
export async function answerCurrentQuestion(page, { onQuestion } = {}) {
  const heading = await getQuestionHeading(page);
  if (onQuestion) {
    const handled = await onQuestion(heading, page);
    if (handled) return heading;
  }

  const radios = page.locator('input[type="radio"]');
  const checkboxes = page.locator('input[type="checkbox"]');
  const richTextEditable = page.locator('[contenteditable="true"]');
  const numberInputs = page.locator('input[type="number"]');
  const urlInputs = page.locator('input[type="url"]');
  const dateInputs = page.locator('input[type="date"]');

  if ((await radios.count()) > 0) {
    await radios.first().check({ force: true });
  } else if ((await richTextEditable.count()) > 0) {
    await richTextEditable.first().click();
    await page.keyboard.type('Réponse test.');
  } else if ((await checkboxes.count()) > 1) {
    await checkboxes.first().check({ force: true });
  } else if ((await numberInputs.count()) > 0) {
    await numberInputs.first().fill('5');
  } else if ((await urlInputs.count()) > 0) {
    await urlInputs.first().fill('https://exemple.com');
  } else if ((await dateInputs.count()) > 0) {
    await dateInputs.first().fill('2026-01-01');
  }
  return heading;
}

// Avance jusqu'à la synthèse (ou s'arrête plus tôt si demandé), en répondant génériquement
// à chaque question. Passe par l'écran des questions obligatoires manquantes s'il apparaît.
export async function walkToSynthesis(page, { onQuestion, maxSteps = 60 } = {}) {
  for (let step = 0; step < maxSteps; step += 1) {
    const heading = await answerCurrentQuestion(page, { onQuestion });
    const nextBtn = page.getByRole('button', { name: /^(Suivant|Voir la synthèse)$/ });
    if ((await nextBtn.count()) === 0) break;
    const isLast = (await nextBtn.first().textContent()).includes('synthèse');
    await nextBtn.first().click();
    if (!isLast) {
      await waitHeadingChange(page, heading);
    } else {
      await page.waitForTimeout(300);
      const proceedBtn = page.getByRole('button', { name: /Accéder à la synthèse/ });
      if ((await proceedBtn.count()) > 0) {
        await proceedBtn.click();
        await page.waitForTimeout(300);
      }
      return;
    }
  }
}

// Crée un projet, répond génériquement à tout le questionnaire (jalon + fichier gérés) et
// ouvre sa vitrine depuis la synthèse. Utilisé par les specs ProjectShowcase.
export async function createProjectAndOpenShowcase(page) {
  await page.getByRole('button', { name: /Créer un projet/ }).first().click();
  await walkToSynthesis(page, {
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
  if ((await page.getByText('Questions obligatoires à compléter').count()) > 0) {
    await page.getByRole('button', { name: /Accéder à la synthèse/ }).click();
  }
  await page.getByRole('button', { name: /Vitrine du projet/ }).click();
  await expect(page.getByRole('button', { name: 'Partager' })).toBeVisible();
}

// Crée un projet, répond génériquement à tout le questionnaire puis le soumet. Utilisé par
// les specs commentaires experts / validation / repêchage comité.
export async function createAndSubmitProject(page) {
  await page.getByRole('button', { name: /Créer un projet/ }).first().click();
  await walkToSynthesis(page, {
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
  if ((await page.getByText('Questions obligatoires à compléter').count()) > 0) {
    await page.getByRole('button', { name: /Accéder à la synthèse/ }).click();
  }
  await page.getByRole('button', { name: 'Soumettre le projet' }).click();
  await page.waitForTimeout(400);
}

// Rend l'utilisateur courant (mock local, bertrand.darieux@lfb.fr) expert compliance de la
// première équipe ET membre du comité de validation par défaut, tout en gardant l'accès admin
// complet au back-office (sinon s'ajouter soi-même comme contact d'équipe/comité bascule
// silencieusement la session en vue "responsable compliance" restreinte — voir allowedTabIds
// dans BackOffice.jsx — qui masque entre autres l'onglet Administrateurs). L'ordre des étapes
// (Administrateurs d'abord) est donc important, pas accessoire.
export async function grantSelfComplianceExpertAndCommitteeAccess(page, adminPassword) {
  await page.getByRole('button', { name: /Activer le mode administrateur/ }).click();
  await page.getByRole('heading', { name: 'Accès back-office' }).waitFor();
  await page.getByLabel('Mot de passe').fill(adminPassword);
  await page.getByRole('button', { name: 'Déverrouiller' }).click();
  await page.getByRole('button', { name: /Accéder au Back-office/ }).click();
  await expect(page.getByRole('heading', { name: 'Back-office' })).toBeVisible();

  await page.getByRole('tab', { name: /Administrateurs/ }).click();
  const adminEmailsField = page.getByLabel('Adresses e-mail des administrateurs');
  const existingAdmins = await adminEmailsField.inputValue();
  await adminEmailsField.fill(existingAdmins + '\nbertrand.darieux@lfb.fr');

  await page.getByRole('tab', { name: /Équipes/ }).click();
  const contactsTextarea = page.locator('textarea[id$="-contact"]').first();
  const existingContacts = await contactsTextarea.inputValue();
  await contactsTextarea.fill(existingContacts + ', bertrand.darieux@lfb.fr');
  await contactsTextarea.blur();

  await page.getByRole('tab', { name: /Comités de validation/ }).click();
  const committeeEmailsField = page.getByPlaceholder('ex: comite@company.com, bureau@company.com').first();
  const existingEmails = await committeeEmailsField.inputValue();
  await committeeEmailsField.fill(existingEmails + ', bertrand.darieux@lfb.fr');
  await committeeEmailsField.blur();

  await page.getByRole('button', { name: 'Mode Chef de Projet' }).click();
  await expect(page.getByRole('button', { name: /Créer un projet/ }).first()).toBeVisible();
}

// Ouvre le premier projet listé dans la section "Projets déclenchés pour vous" et déplie la
// carte de l'équipe donnée (les cartes sont repliées par défaut, y compris juste après un
// enregistrement).
export async function openTriggeredProjectAndExpandTeam(page, teamName) {
  await page.getByRole('button', { name: 'Ouvrir' }).first().click();
  await expect(page.getByRole('heading', { name: 'Synthèse' })).toBeVisible();
  await page.getByRole('button', { name: new RegExp(teamName) }).first().click();
}

export function collectConsoleErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  return errors;
}
