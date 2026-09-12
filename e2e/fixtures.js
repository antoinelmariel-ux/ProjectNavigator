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

// Renseigne le chiffre d'impact de la section « Objectifs ». Il n'a pas de question au
// questionnaire : vide par défaut, il ne se saisit que depuis l'éditeur de vitrine. Le
// rechargement final remonte la vitrine publiée en haut de page, indispensable aux specs qui
// vérifient qu'un compteur se résout sans qu'on ait défilé jusqu'à lui.
export async function publishShowcaseImpactFigure(page, { figure, unit = '', caption = '' } = {}) {
  await page.getByRole('button', { name: 'Modifier' }).click();
  const frame = page.locator('[data-sge-section-id="objectives"]');
  await frame.scrollIntoViewIfNeeded();
  await frame.hover();
  await frame.getByRole('button', { name: 'Réglages de la section' }).click();

  await page.getByLabel(/Chiffre d’impact/).fill(figure);
  if (unit) {
    await page.getByLabel('Unité du chiffre').fill(unit);
  }
  if (caption) {
    await page.getByLabel('Légende du chiffre').fill(caption);
  }

  await page.getByRole('button', { name: 'Publier' }).click();
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem('complianceNavigatorState') || ''))
    .toContain('showcaseImpactFigure');

  await page.reload();
  await page.getByRole('button', { name: /Vitrine du projet/ }).first().click();
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

// Le bouton cadenas qui ouvre le back-office n'est visible que pour une personne déjà désignée
// (adminEmails, contact d'équipe ou membre de comité) : on ne peut plus, comme avant, l'atteindre
// via le mot de passe partagé en tant qu'utilisateur quelconque. Pour les tests, on désigne donc
// le compte de test avant même que l'app ne démarre (page.addInitScript, pas evaluate() après coup
// : App.jsx re-persiste son état sur pagehide, ce qui écraserait un patch écrit avant une navigation
// à venir — voir la note équivalente pour les statuts de conformité plus haut dans ce fichier).
export async function grantAdminAccess(page, email = 'bertrand.darieux@lfb.fr') {
  await page.addInitScript((adminEmail) => {
    const KEY = 'complianceNavigatorState';
    let state = {};
    try {
      state = JSON.parse(window.localStorage.getItem(KEY) || '{}') || {};
    } catch {
      state = {};
    }
    const existing = Array.isArray(state.adminEmails) ? state.adminEmails : [];
    state.adminEmails = existing.includes(adminEmail) ? existing : [...existing, adminEmail];
    window.localStorage.setItem(KEY, JSON.stringify(state));
  }, email);
  await page.reload();
  await page.getByRole('button', { name: /Accéder au Back-office/ }).click();
  await expect(page.getByRole('heading', { name: 'Back-office' })).toBeVisible();
}

// Rend l'utilisateur courant (mock local, bertrand.darieux@lfb.fr) expert compliance de la
// première équipe ET membre du comité de validation par défaut, tout en gardant l'accès admin
// complet au back-office (sinon s'ajouter soi-même comme contact d'équipe/comité bascule
// silencieusement la session en vue "responsable compliance" restreinte — voir allowedTabIds
// dans BackOffice.jsx — qui masque entre autres l'onglet Administrateurs). Passer par
// grantAdminAccess d'abord (droits admin persistés dès le boot) est donc important, pas accessoire.
export async function grantSelfComplianceExpertAndCommitteeAccess(page) {
  await grantAdminAccess(page);

  // Les 2 champs ci-dessous sont un PeoplePicker (src/components/PeoplePicker.jsx) : on tape
  // l'adresse puis Entrée la valide et l'ajoute à la liste existante (pas de fill/blur sur un
  // textarea brut comme avant son introduction). Pas besoin de passer par l'onglet
  // Administrateurs : grantAdminAccess a déjà rendu les droits admin persistants dès le boot.
  await page.getByRole('tab', { name: /Équipes/ }).click();
  const contactsField = page.locator('input[id$="-contact"]').first();
  await contactsField.fill('bertrand.darieux@lfb.fr');
  await contactsField.press('Enter');

  await page.getByRole('tab', { name: /Comités de validation/ }).click();
  const committeeEmailsField = page.getByPlaceholder('Rechercher un membre du comité…').first();
  await committeeEmailsField.fill('bertrand.darieux@lfb.fr');
  await committeeEmailsField.press('Enter');

  await page.getByRole('button', { name: 'Mode Chef de Projet' }).click();
  await expect(page.getByRole('button', { name: /Créer un projet/ }).first()).toBeVisible();
}

// Ouvre le premier projet listé dans la section "Projets déclenchés pour vous" et s'assure que
// la carte de l'équipe donnée est dépliée. Les cartes sont repliées par défaut, mais le bouton
// "Ouvrir" de cette liste (vue expert/comité) déplie déjà automatiquement l'équipe concernée
// (focusPerimeter dans SynthesisReport.jsx) : cliquer dessus inconditionnellement la replierait
// à nouveau, d'où la vérification de aria-expanded avant de cliquer.
export async function openTriggeredProjectAndExpandTeam(page, teamName) {
  await page.getByRole('button', { name: 'Ouvrir' }).first().click();
  await expect(page.getByRole('heading', { name: 'Synthèse' })).toBeVisible();
  const teamToggle = page.getByRole('button', { name: new RegExp(teamName) }).first();
  if ((await teamToggle.getAttribute('aria-expanded')) !== 'true') {
    await teamToggle.click();
  }
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
