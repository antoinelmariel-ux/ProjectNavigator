import { test, expect } from '@playwright/test';
import { gotoHome, grantAdminAccess, createAndSubmitProject } from './fixtures.js';


// Le questionnaire de revue commence par des questions en texte libre (non modifiables ici).
// On avance jusqu'a la premiere question reellement selectionnable.
async function pickFirstSelectableAnswer(page) {
  for (let step = 0; step < 12; step += 1) {
    const inputs = page.locator('input[type="radio"]:visible, input[type="checkbox"]:visible');
    if (await inputs.count() > 0) {
      await inputs.first().check();
      return true;
    }
    await page.getByRole('button', { name: 'Suivant' }).click();
  }
  return false;
}

const SHOT = '/tmp/claude-0/-home-user-ProjectNavigator/805d599f-d693-56da-b13d-e147a78ab407/scratchpad';

test('banc d essai : charger un projet type puis creer une regle depuis ses reponses', async ({ page }) => {
  await gotoHome(page);
  await createAndSubmitProject(page);
  await grantAdminAccess(page);

  await page.getByRole('tab', { name: /Revue Compliance/i }).click();
  await expect(page.getByRole('heading', { name: 'Mode revue compliance' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Projet type' })).toBeVisible();
  await page.screenshot({ path: `${SHOT}/01-bench-empty.png`, fullPage: true });

  // Charger un projet reel comme projet type
  const sampleSelect = page.getByLabel('Charger un projet type');
  const projectOption = sampleSelect.locator('optgroup[label="Projets réels soumis"] option').first();
  const projectValue = await projectOption.getAttribute('value');
  await sampleSelect.selectOption(projectValue);

  await expect(page.getByText(/Chargé :/)).toBeVisible();
  await page.screenshot({ path: `${SHOT}/02-bench-loaded.png`, fullPage: true });

  // Le mode « Projet complet » doit etre actif et l'analyse globale renseignee
  await expect(page.getByRole('button', { name: 'Projet complet' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/règle\(s\) déclenchée\(s\), toutes équipes confondues/)).toBeVisible();

  // Ouvrir le constructeur de regle
  await page.getByRole('button', { name: 'Créer une règle à partir de ce projet' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText(/cette règle se déclencherait sur tous les projets/)).toBeVisible();
  await page.screenshot({ path: `${SHOT}/03-builder-open.png`, fullPage: true });

  // Selectionner deux conditions
  const dialog = page.getByRole('dialog');
  await dialog.locator('article button[aria-pressed="false"]').first().click();
  await expect(dialog.getByText(/Se déclenche sur .* projet\(s\) type/)).toBeVisible();
  await page.screenshot({ path: `${SHOT}/04-builder-selected.png`, fullPage: true });

  await dialog.getByLabel('Nom de la règle').fill('Règle de test du banc d’essai');
  await page.screenshot({ path: `${SHOT}/05-builder-named.png`, fullPage: true });

  // Creer la regle -> l'editeur complet s'ouvre, prerempli
  await dialog.getByRole('button', { name: 'Créer et ouvrir l’éditeur complet' }).click();

  const editor = page.getByRole('heading', { name: 'Édition de règle' });
  await expect(editor).toBeVisible();
  await expect(page.locator('input[value*="banc"]')).toHaveCount(1);
  // La condition choisie dans le constructeur doit être arrivée dans l'éditeur complet.
  await expect(page.getByText('Groupe 1')).toBeVisible();
  await page.screenshot({ path: `${SHOT}/06-rule-editor-prefilled.png`, fullPage: true });

  const ruleDialog = page.getByRole('dialog');
  await ruleDialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(editor).toBeHidden();

  // La règle existe désormais dans le référentiel et se déclenche sur le projet chargé.
  await page.getByRole('tab', { name: /^Règles/ }).click();
  // La liste des règles est virtualisée : on filtre pour amener la nouvelle règle à l'écran.
  await page.locator('#rule-title-filter').fill('banc');
  await expect(page.getByRole('heading', { name: /banc/ })).toBeVisible();
  await page.screenshot({ path: `${SHOT}/07-rule-in-list.png`, fullPage: true });
});

test('projets types enregistres : la portee et le pouvoir discriminant des conditions apparaissent', async ({ page }) => {
  await gotoHome(page);
  await createAndSubmitProject(page);
  await grantAdminAccess(page);
  await page.getByRole('tab', { name: /Revue Compliance/i }).click();

  const sampleSelect = page.getByLabel('Charger un projet type');

  // 1er projet type : le projet reel soumis, enregistre tel quel.
  const projectValue = await sampleSelect
    .locator('optgroup[label="Projets réels soumis"] option')
    .first()
    .getAttribute('value');
  await sampleSelect.selectOption(projectValue);
  await page.getByRole('button', { name: 'Enregistrer comme projet type' }).click();
  await page.getByLabel('Nom du projet type').fill('Cas A — projet LFB');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByText('Chargé : Cas A — projet LFB')).toBeVisible();

  // 2e projet type : meme base, une reponse changee, enregistre sous un autre nom.
  expect(await pickFirstSelectableAnswer(page)).toBe(true);
  await page.getByRole('button', { name: 'Enregistrer comme projet type' }).click();
  await page.getByLabel('Nom du projet type').fill('Cas B — variante');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByText('Chargé : Cas B — variante')).toBeVisible();

  // Les deux projets types sont listes et le corpus alimente les indicateurs.
  await expect(sampleSelect.locator('optgroup[label="Projets types de l’équipe"] option')).toHaveCount(2);
  await page.screenshot({ path: `${SHOT}/08-two-samples.png`, fullPage: true });

  await page.getByRole('button', { name: 'Créer une règle à partir de ce projet' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // Un badge de couverture « n/2 » est desormais affiche sur chaque condition proposee.
  await expect(dialog.getByText('/2', { exact: false }).first()).toBeVisible();

  await dialog.locator('article button[aria-pressed="false"]').first().click();
  await expect(dialog.getByText(/Se déclenche sur \d+ projet\(s\) type sur 2/)).toBeVisible();
  await page.screenshot({ path: `${SHOT}/09-builder-with-corpus.png`, fullPage: true });
});

test('un projet type survit au rechargement de la page', async ({ page }) => {
  await gotoHome(page);
  await grantAdminAccess(page);
  await page.getByRole('tab', { name: /Revue Compliance/i }).click();

  expect(await pickFirstSelectableAnswer(page)).toBe(true);
  await page.getByRole('button', { name: 'Enregistrer comme projet type' }).click();
  await page.getByLabel('Nom du projet type').fill('Cas persistant');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByText('Chargé : Cas persistant')).toBeVisible();

  // Le rechargement ramene a l'accueil : il faut rouvrir le back-office.
  await page.reload();
  await page.getByRole('button', { name: /Accéder au Back-office/ }).click();
  await page.getByRole('tab', { name: /Revue Compliance/i }).click();
  await expect(
    page.getByLabel('Charger un projet type').locator('option', { hasText: 'Cas persistant' })
  ).toHaveCount(1);
});

test('le module de revue montre le perimetre d activite issu de l onboarding', async ({ page }) => {
  await gotoHome(page);
  await grantAdminAccess(page);
  await page.getByRole('tab', { name: /Revue Compliance/i }).click();

  await expect(page.getByRole('heading', { name: 'Votre profil (onboarding)' })).toBeVisible();
  await expect(page.getByText(/Les conditions portant sur le périmètre d’activité/)).toBeVisible();
  // gotoHome a coché le premier périmètre de l'onboarding : il doit apparaître ici.
  await expect(page.getByText('bertrand.darieux@lfb.fr')).toBeVisible();
  await page.screenshot({ path: `${SHOT}/12-profile-scope.png`, fullPage: true });
});

test('le module de revue liste les regles existantes et permet de les ouvrir', async ({ page }) => {
  await gotoHome(page);
  await createAndSubmitProject(page);
  await grantAdminAccess(page);
  await page.getByRole('tab', { name: /Revue Compliance/i }).click();

  const sampleSelect = page.getByLabel('Charger un projet type');
  const projectValue = await sampleSelect
    .locator('optgroup[label="Projets réels soumis"] option')
    .first()
    .getAttribute('value');
  await sampleSelect.selectOption(projectValue);

  await expect(page.getByRole('heading', { name: 'Règles du référentiel' })).toBeVisible();

  // Vue « Déclenchées » par défaut, puis bascule sur tout le référentiel.
  const triggeredRows = page.locator('button[aria-label^="Ouvrir la règle"]');
  const triggeredCount = await triggeredRows.count();
  expect(triggeredCount).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Toutes', exact: true }).click();
  expect(await triggeredRows.count()).toBeGreaterThan(triggeredCount);
  await page.screenshot({ path: `${SHOT}/13-rules-panel.png`, fullPage: true });

  // Filtrer puis ouvrir une règle : l'éditeur complet s'ouvre, groupes de conditions compris.
  await page.getByPlaceholder('Filtrer par nom de règle…').fill('Généralité');
  await triggeredRows.first().click();
  await expect(page.getByRole('heading', { name: 'Édition de règle' })).toBeVisible();
  await expect(page.getByText('Conditions de déclenchement')).toBeVisible();
  await page.screenshot({ path: `${SHOT}/14-rule-opened-from-bench.png`, fullPage: true });
});

test('l apercu de regle montre les groupes reels et non une liste a plat', async ({ page }) => {
  await gotoHome(page);
  await createAndSubmitProject(page);
  await grantAdminAccess(page);
  await page.getByRole('tab', { name: /Revue Compliance/i }).click();

  const sampleSelect = page.getByLabel('Charger un projet type');
  const projectValue = await sampleSelect
    .locator('optgroup[label="Projets réels soumis"] option')
    .first()
    .getAttribute('value');
  await sampleSelect.selectOption(projectValue);

  await page.getByRole('button', { name: 'Créer une règle à partir de ce projet' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // Une condition venant d'une question : un seul groupe.
  const articles = dialog.locator('article');
  await articles.first().locator('button[aria-pressed="false"]').first().click();
  await expect(dialog.getByText('1 groupe(s) de conditions', { exact: false })).toBeVisible();

  // Une condition d'une seconde question : deux groupes, combinés en ET.
  await articles.nth(1).locator('button[aria-pressed="false"]').first().click();
  await expect(dialog.getByText('2 groupe(s) de conditions', { exact: false })).toBeVisible();

  // Deux valeurs d'une même question restent UN groupe : le moteur les combine en OU, et
  // l'aperçu doit le montrer plutôt que d'aligner les pastilles séparées par des « et ».
  const multiValue = articles.filter({ has: page.locator('button[aria-pressed="false"]') });
  const count = await multiValue.count();
  for (let index = 0; index < count; index += 1) {
    const remaining = multiValue.nth(index).locator('button[aria-pressed="false"]');
    if (await remaining.count() > 0 && await multiValue.nth(index).locator('button[aria-pressed="true"]').count() > 0) {
      await remaining.first().click();
      await expect(dialog.getByText('2 groupe(s) de conditions', { exact: false })).toBeVisible();
      break;
    }
  }

  await page.screenshot({ path: `${SHOT}/15-preview-groups.png`, fullPage: true });
});
