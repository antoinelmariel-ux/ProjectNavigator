import { test, expect } from '@playwright/test';
import { initialQuestions } from '../src/data/questions.js';
import { gotoHome, patchStateOnBoot, walkQuestionnaireToShowcase, collectConsoleErrors } from './fixtures.js';

const questionsWithOther = initialQuestions.map((question) =>
  question.type === 'choice' || question.type === 'multi_choice'
    ? { ...question, otherOption: { enabled: true, value: '', label: { fr: 'Autre', en: 'Other' }, placeholder: { fr: 'Précisez ici', en: 'Specify' } } }
    : question
);

test('l’option « Autre » : saisie libre pour un choix unique et multiple', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await patchStateOnBoot(page, (state, questions) => ({ ...(state || {}), questions }), questionsWithOther);
  await gotoHome(page);
  await page.getByRole('button', { name: /Créer un projet/ }).first().click();

  const seen = { choice: false, multi: false };

  await walkQuestionnaireToShowcase(page, {
    async onQuestion(_heading, p) {
      const other = p.getByRole('radio', { name: 'Autre' });
      const otherCheck = p.getByRole('checkbox', { name: 'Autre' });
      if (!seen.choice && (await other.count()) > 0) {
        seen.choice = true;
        await other.check({ force: true });
        const input = p.getByPlaceholder('Précisez ici');
        await expect(input).toBeVisible();
        await input.fill('Ma précision unique');
        await expect(input).toHaveValue('Ma précision unique');
        await p.getByRole('radio').first().check({ force: true });
        await expect(input).toHaveCount(0);
        await other.check({ force: true });
        await expect(p.getByPlaceholder('Précisez ici')).toBeVisible();
        return false;
      }
      if (!seen.multi && (await otherCheck.count()) > 0) {
        seen.multi = true;
        await p.getByRole('checkbox').first().check({ force: true });
        await otherCheck.check({ force: true });
        const input = p.getByPlaceholder('Précisez ici');
        await expect(input).toBeVisible();
        await input.fill('Ma précision multiple');
        await expect(input).toHaveValue('Ma précision multiple');
        await otherCheck.uncheck({ force: true });
        await expect(input).toHaveCount(0);
        await otherCheck.check({ force: true });
        await expect(p.getByPlaceholder('Précisez ici')).toHaveValue('');
        await p.getByPlaceholder('Précisez ici').fill('Texte final');
        return true;
      }
      return false;
    }
  });

  expect(seen).toEqual({ choice: true, multi: true });
  expect(errors).toEqual([]);
});
