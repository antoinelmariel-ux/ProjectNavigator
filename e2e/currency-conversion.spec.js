import { test, expect } from '@playwright/test';
import {
  gotoHome,
  patchStateOnBoot,
  walkToSynthesis,
  collectConsoleErrors
} from './fixtures.js';

const BUDGET_QUESTION_TEXT = 'Budget e2e du projet';
const FOLLOW_UP_QUESTION_TEXT = 'Détaillez le gros budget e2e';
const TEAM_NAME = 'Contrôle pub';

// La carte d'une équipe sollicitée est repliable (bouton nommé d'après l'équipe) ; le nom seul
// apparaît aussi comme option du menu « ajouter une équipe manuellement ».
const teamCard = (page) => page.getByRole('button', { name: new RegExp(TEAM_NAME) });

// Référentiel minimal : un budget saisi en K€ ou K$, une question qui n'apparaît qu'au-dessus de
// 100 K€ et une règle qui sollicite une équipe au-dessus du même seuil. 1 K$ = 0,9 K€, donc
// 120 K$ = 108 K€ (au-dessus) et 80 K$ = 72 K€ (en dessous), alors que le nombre brut 80 est
// inférieur au seuil 100 et 120 supérieur : seule la conversion distingue ces cas des valeurs brutes.
async function seedCurrencyReferential(page) {
  await patchStateOnBoot(
    page,
    (stored, labels) => {
      const state = stored || {};
      const text = (fr) => ({ fr, en: fr, de: fr, es: fr });
      const threshold = { question: 'e2eBudget', operator: 'gt', value: 100, valueUnit: 'K€' };
      state.questions = [
        {
          id: 'e2eBudget',
          type: 'number',
          question: text(labels.budget),
          options: [],
          required: false,
          numberUnit: 'K€',
          numberUnitOptions: ['K$'],
          conditions: [],
          conditionGroups: [],
          conditionLogic: 'all'
        },
        {
          id: 'e2eBigBudget',
          type: 'text',
          question: text(labels.followUp),
          options: [],
          required: false,
          conditions: [{ type: 'question', ...threshold }],
          conditionGroups: [{ logic: 'all', conditions: [{ type: 'question', ...threshold }] }],
          conditionLogic: 'all'
        }
      ];
      state.rules = [
        {
          id: 'e2e-big-budget',
          name: text('Budget élevé e2e'),
          conditions: [{ type: 'question', ...threshold }],
          conditionGroups: [{ logic: 'all', conditions: [{ type: 'question', ...threshold }] }],
          conditionLogic: 'all',
          teams: ['controle_pub'],
          questions: {},
          risks: []
        }
      ];
      state.currencies = [
        { unit: 'K€', code: 'EUR', multiplier: 1000, rate: 1, updatedAt: '' },
        { unit: 'K$', code: 'USD', multiplier: 1000, rate: 0.9, updatedAt: '' }
      ];
      return state;
    },
    { budget: BUDGET_QUESTION_TEXT, followUp: FOLLOW_UP_QUESTION_TEXT }
  );
  await page.reload();
}

// Parcourt le questionnaire en répondant au budget demandé et renvoie les intitulés rencontrés.
// Les questions de la vitrine s'intercalent à des rangs fixes dans le référentiel : on ne
// suppose donc pas que la question de suivi vienne juste après le budget.
async function fillProjectWithBudget(page, amount, unit) {
  const headings = [];
  await page.getByRole('button', { name: /Créer un projet/ }).first().click();
  await walkToSynthesis(page, {
    async onQuestion(heading, p) {
      headings.push(heading);
      if (heading.includes(BUDGET_QUESTION_TEXT)) {
        await p.locator('input[type="number"]').first().fill(String(amount));
        await p.getByRole('combobox', { name: /unité|devise/i }).selectOption(unit);
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
  return headings;
}

const sawFollowUp = (headings) => headings.some((heading) => heading.includes(FOLLOW_UP_QUESTION_TEXT));

test.describe('Conversion de devises : du seuil de la règle au projet', () => {
  test('120 K$ (= 108 K€) dépasse le seuil de 100 K€ : question de suivi et équipe sollicitée', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await gotoHome(page);
    await seedCurrencyReferential(page);

    const headings = await fillProjectWithBudget(page, 120, 'K$');

    expect(sawFollowUp(headings)).toBe(true);
    await expect(teamCard(page)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('80 K$ (= 72 K€) reste sous le seuil : ni question de suivi, ni équipe', async ({ page }) => {
    await gotoHome(page);
    await seedCurrencyReferential(page);

    const headings = await fillProjectWithBudget(page, 80, 'K$');

    expect(headings.some((heading) => heading.includes(BUDGET_QUESTION_TEXT))).toBe(true);
    expect(sawFollowUp(headings)).toBe(false);
    await expect(teamCard(page)).toHaveCount(0);
  });

  test('le même nombre ne donne pas le même résultat selon la devise choisie', async ({ page }) => {
    await gotoHome(page);
    await seedCurrencyReferential(page);

    // 108 K€ dépasse 100 K€, alors que 108 K$ vaut 97,2 K€ et reste dessous.
    const inEuros = await fillProjectWithBudget(page, 108, 'K€');
    expect(sawFollowUp(inEuros)).toBe(true);
    await expect(teamCard(page)).toBeVisible();
  });

  test('108 K$ (= 97,2 K€) reste sous le seuil', async ({ page }) => {
    await gotoHome(page);
    await seedCurrencyReferential(page);

    const inDollars = await fillProjectWithBudget(page, 108, 'K$');
    expect(sawFollowUp(inDollars)).toBe(false);
    await expect(teamCard(page)).toHaveCount(0);
  });
});
