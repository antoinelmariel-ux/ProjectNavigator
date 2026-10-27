import test from 'node:test';
import assert from 'node:assert/strict';

import { initialShowcaseTemplates } from '../src/data/showcaseTemplates.js';
import { initialQuestions } from '../src/data/questions.js';
import { SHOWCASE_SECTION_IDS, normalizeSectionOrder } from '../src/utils/showcaseEditor.js';
import {
  applyShowcaseFieldSources,
  applyShowcaseFieldSourcesToQuestions,
  applyShowcaseTemplate,
  buildLinkedBlockFieldId,
  buildTemplateBlockSectionId,
  createShowcaseTemplate,
  fillMissingSourcedTextFields,
  getTemplateBuiltInSectionIds,
  hasShowcaseTemplateActivation,
  mapShowcaseUpdatesToSources,
  normalizeShowcaseTemplate,
  resolveLinkedBlockFieldSources,
  resolveShowcaseTemplate,
  resolveShowcaseTemplateFieldSources
} from '../src/utils/showcaseTemplates.js';

const FORMERLY_BLOCKED_TYPES = [
  'projet_d_un_tiers_soutenu_par_le_lfb',
  'don_bourse_appel_a_projets',
  'advisory_board_non_relie_a_un_projet'
];

test('chaque type autrefois privé de vitrine a un modèle par défaut', () => {
  FORMERLY_BLOCKED_TYPES.forEach((value) => {
    const template = resolveShowcaseTemplate({ ProjectType: value }, initialShowcaseTemplates);
    assert.ok(template, value);
  });
  assert.equal(resolveShowcaseTemplate({ ProjectType: 'projet_du_lfb' }, initialShowcaseTemplates), null);
});

test('les valeurs d’activation par défaut existent dans la question ProjectType', () => {
  const projectType = initialQuestions.find((question) => question.id === 'ProjectType');
  const values = new Set(projectType.options.map((option) => option.value));
  initialShowcaseTemplates.forEach((template) => {
    template.activation.conditionGroups.forEach((group) => {
      group.conditions.forEach((condition) => {
        assert.equal(condition.question, 'ProjectType');
        assert.ok(values.has(condition.value), condition.value);
      });
    });
  });
});

test('l’activation lit aussi une réponse à choix stockée en objet', () => {
  const template = resolveShowcaseTemplate(
    { ProjectType: { value: 'don_bourse_appel_a_projets', children: [] } },
    initialShowcaseTemplates
  );
  assert.equal(template.id, 'don-bourse-appel-a-projets');
});

test('un modèle sans condition ne s’applique jamais', () => {
  const draft = createShowcaseTemplate([]);
  assert.deepEqual(draft.activation.conditionGroups, []);
  assert.equal(hasShowcaseTemplateActivation(draft), false);
  assert.equal(resolveShowcaseTemplate({ ProjectType: 'projet_du_lfb' }, [draft]), null);
});

test('une condition dont la question n’est pas choisie ne fait pas s’appliquer le modèle partout', () => {
  const template = {
    id: 'draft',
    activation: { conditionGroups: [{ logic: 'all', conditions: [{ type: 'question', question: '', operator: 'equals', value: '' }] }] },
    sections: []
  };
  assert.equal(resolveShowcaseTemplate({ ProjectType: 'projet_du_lfb' }, [template]), null);
});

test('les conditions combinent plusieurs questions et opérateurs, comme les règles', () => {
  const template = {
    id: 'don-hors-france',
    activation: {
      conditionGroups: [
        { logic: 'all', conditions: [{ type: 'question', question: 'ProjectType', operator: 'equals', value: 'don_bourse_appel_a_projets' }] },
        {
          logic: 'any',
          conditions: [
            { type: 'question', question: 'country', operator: 'not_equals', value: 'france' },
            { type: 'question', question: 'amount', operator: 'gte', value: '10000' }
          ]
        }
      ]
    },
    sections: []
  };
  const don = { ProjectType: 'don_bourse_appel_a_projets' };
  assert.equal(resolveShowcaseTemplate({ ...don, country: 'france', amount: '500' }, [template]), null);
  assert.equal(resolveShowcaseTemplate({ ...don, country: 'italie', amount: '500' }, [template]).id, 'don-hors-france');
  assert.equal(resolveShowcaseTemplate({ ...don, country: 'france', amount: '20000' }, [template]).id, 'don-hors-france');
  assert.equal(resolveShowcaseTemplate({ ProjectType: 'projet_du_lfb', country: 'italie' }, [template]), null);
});

test('le premier modèle de la liste qui convient l’emporte', () => {
  const when = (value) => ({ conditionGroups: [{ logic: 'all', conditions: [{ type: 'question', question: 'ProjectType', operator: 'equals', value }] }] });
  const templates = [
    { id: 'premier', activation: when('x'), sections: [] },
    { id: 'second', activation: when('x'), sections: [] }
  ];
  assert.equal(resolveShowcaseTemplate({ ProjectType: 'x' }, templates).id, 'premier');
  assert.equal(resolveShowcaseTemplate({ ProjectType: 'x' }, [...templates].reverse()).id, 'second');
});

test('un modèle enregistré avec l’ancienne activation (question + réponses) est relu en conditions', () => {
  const template = normalizeShowcaseTemplate({
    id: 'ancien',
    activation: { questionId: 'ProjectType', values: ['a', 'b'] },
    sections: []
  });
  assert.equal(hasShowcaseTemplateActivation(template), true);
  assert.equal(resolveShowcaseTemplate({ ProjectType: 'b' }, [template]).id, 'ancien');
  assert.equal(resolveShowcaseTemplate({ ProjectType: 'c' }, [template]), null);
});

test('le bandeau de complétude ne peut pas être retiré d’un modèle', () => {
  const template = normalizeShowcaseTemplate({ id: 'x', sections: [{ kind: 'builtin', id: 'hero' }] });
  assert.deepEqual(getTemplateBuiltInSectionIds(template), ['notice', 'hero']);
});

test('sans modèle, toutes les sections intégrées restent proposées', () => {
  assert.deepEqual(getTemplateBuiltInSectionIds(null), SHOWCASE_SECTION_IDS);
});

test('un modèle tient lieu d’ordre et de blocs tant que rien n’est enregistré', () => {
  const template = normalizeShowcaseTemplate({
    id: 'tpl',
    activation: { conditionGroups: [{ logic: 'all', conditions: [{ type: 'question', question: 'ProjectType', operator: 'equals', value: 'a' }] }] },
    sections: [
      { kind: 'builtin', id: 'hero' },
      { kind: 'block', id: 'b1', type: 'story', title: { fr: 'Le bénéficiaire', en: 'The beneficiary' }, description: '' },
      { kind: 'builtin', id: 'team' }
    ]
  });
  const blockId = buildTemplateBlockSectionId('tpl', 'b1');
  const answers = applyShowcaseTemplate({ ProjectType: 'a' }, template, 'fr');

  assert.deepEqual(answers.showcaseSectionOrder, ['notice', 'hero', blockId, 'team']);
  assert.equal(answers.customShowcaseSections.length, 1);
  assert.equal(answers.customShowcaseSections[0].title, 'Le bénéficiaire');
  assert.equal(applyShowcaseTemplate({}, template, 'en').customShowcaseSections[0].title, 'The beneficiary');

  const builtIns = getTemplateBuiltInSectionIds(template);
  assert.deepEqual(
    normalizeSectionOrder(answers.showcaseSectionOrder, answers.customShowcaseSections, builtIns),
    ['notice', 'hero', blockId, 'team']
  );
});

test('une vitrine personnalisée appartient à son porteur', () => {
  const template = initialShowcaseTemplates[0];
  const own = {
    customShowcaseSections: [],
    showcaseSectionOrder: ['hero', 'notice']
  };
  assert.equal(applyShowcaseTemplate(own, normalizeShowcaseTemplate(template), 'fr'), own);

  const orderOnly = applyShowcaseTemplate({ showcaseSectionOrder: ['hero'] }, normalizeShowcaseTemplate(template), 'fr');
  assert.deepEqual(orderOnly.showcaseSectionOrder, ['hero']);
  assert.ok(orderOnly.customShowcaseSections.length > 0);
});

test('une section intégrée retirée par le modèle n’est jamais réinjectée', () => {
  const order = normalizeSectionOrder(['hero', 'problem'], [], ['notice', 'hero']);
  assert.deepEqual(order, ['hero', 'notice']);
});


const SOURCE_QUESTIONS = [
  { id: 'problemPainPoints', type: 'long_text', question: 'Besoins' },
  { id: 'targetAudience', type: 'multi_choice', question: 'Audience' },
  { id: 'donationContext', type: 'long_text', question: 'Contexte du don' },
  { id: 'beneficiaryKind', type: 'choice', question: 'Type de bénéficiaire', options: ['a', 'b'] },
  { id: 'launchDate', type: 'date', question: 'Lancement' }
];

test('un modèle relie un champ de section intégrée à une autre question', () => {
  const template = normalizeShowcaseTemplate({
    id: 'tpl',
    sections: [
      { kind: 'builtin', id: 'problem', fieldSources: { problemPainPoints: 'donationContext', unknownField: 'x' } },
      { kind: 'builtin', id: 'hero', fieldSources: { projectSlogan: '' } }
    ]
  });
  const problem = template.sections.find((entry) => entry.id === 'problem');
  const hero = template.sections.find((entry) => entry.id === 'hero');
  assert.deepEqual(problem.fieldSources, { problemPainPoints: 'donationContext' });
  assert.equal('fieldSources' in hero, false);
  assert.deepEqual(resolveShowcaseTemplateFieldSources(template, SOURCE_QUESTIONS), { problemPainPoints: 'donationContext' });
});

test('une question supprimée ou d’un type incompatible rend le champ à sa question d’origine', () => {
  const template = normalizeShowcaseTemplate({
    id: 'tpl',
    sections: [
      { kind: 'builtin', id: 'problem', fieldSources: { problemPainPoints: 'deletedQuestion' } },
      { kind: 'builtin', id: 'solution', fieldSources: { solutionDescription: 'beneficiaryKind' } },
      { kind: 'builtin', id: 'hero', fieldSources: { targetAudience: 'launchDate', projectSlogan: 'donationContext' } }
    ]
  });
  assert.deepEqual(resolveShowcaseTemplateFieldSources(template, SOURCE_QUESTIONS), { projectSlogan: 'donationContext' });
});

test('les champs à choix n’acceptent que des questions à choix', () => {
  const template = normalizeShowcaseTemplate({
    id: 'tpl',
    sections: [{ kind: 'builtin', id: 'hero', fieldSources: { targetAudience: 'beneficiaryKind' } }]
  });
  assert.deepEqual(resolveShowcaseTemplateFieldSources(template, SOURCE_QUESTIONS), { targetAudience: 'beneficiaryKind' });
});

test('la vitrine lit la question liée et la publication l’écrit', () => {
  const sources = { problemPainPoints: 'donationContext' };
  const view = applyShowcaseFieldSources({ problemPainPoints: 'ancien', donationContext: 'nouveau' }, sources);
  assert.equal(view.problemPainPoints, 'nouveau');

  const emptyView = applyShowcaseFieldSources({ problemPainPoints: 'ancien' }, sources);
  assert.equal(emptyView.problemPainPoints, undefined);

  assert.deepEqual(
    mapShowcaseUpdatesToSources({ problemPainPoints: 'édité', showcaseSectionOrder: ['hero'] }, sources),
    { donationContext: 'édité', showcaseSectionOrder: ['hero'] }
  );
});

test('la question liée prend l’identifiant du champ et devient obligatoire', () => {
  const view = applyShowcaseFieldSourcesToQuestions(SOURCE_QUESTIONS, { problemPainPoints: 'donationContext' });
  const alias = view.find((question) => question.id === 'problemPainPoints');
  assert.equal(alias.question, 'Contexte du don');
  assert.equal(alias.required, true);
  assert.equal(view.filter((question) => question.id === 'problemPainPoints').length, 1);
  assert.ok(view.some((question) => question.id === 'donationContext'));
});

test('un champ texte lié sans réponse affiche « information manquante », pas un champ à choix', () => {
  const sources = { problemPainPoints: 'donationContext', targetAudience: 'beneficiaryKind', teamLead: 'donationContext' };
  const filled = fillMissingSourcedTextFields({ problemPainPoints: '', targetAudience: undefined, teamLead: 'Alice' }, sources, 'Information manquante');
  assert.equal(filled.problemPainPoints, 'Information manquante');
  assert.equal(filled.targetAudience, undefined);
  assert.equal(filled.teamLead, 'Alice');
});

test('un bloc lié garde son lien une fois recopié dans la vitrine', () => {
  const template = normalizeShowcaseTemplate({
    id: 'tpl',
    activation: { conditionGroups: [] },
    sections: [
      { kind: 'block', id: 'context', type: 'story', title: { fr: 'Contexte' }, description: '', sourceQuestionId: 'donationContext' },
      { kind: 'block', id: 'untitled', type: 'highlight', title: '', description: '', sourceQuestionId: 'beneficiaryKind' },
      { kind: 'block', id: 'grid', type: 'columns', title: { fr: 'Grille' }, description: '', sourceQuestionId: 'donationContext' }
    ]
  });
  const answers = applyShowcaseTemplate({}, template, 'fr');
  const story = answers.customShowcaseSections.find((section) => section.type === 'story');
  assert.equal(story.sourceQuestionId, 'donationContext');
  assert.equal(answers.customShowcaseSections.length, 3);

  const sources = resolveLinkedBlockFieldSources(answers.customShowcaseSections, SOURCE_QUESTIONS);
  assert.deepEqual(sources, {
    [buildLinkedBlockFieldId('donationContext')]: 'donationContext',
    [buildLinkedBlockFieldId('beneficiaryKind')]: 'beneficiaryKind'
  });
});

test('un bloc lié à une date n’est pas relié', () => {
  assert.deepEqual(
    resolveLinkedBlockFieldSources([{ id: 'x', type: 'story', sourceQuestionId: 'launchDate' }], SOURCE_QUESTIONS),
    {}
  );
});
