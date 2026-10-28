import test from 'node:test';
import assert from 'node:assert/strict';

import { initialShowcaseTemplates } from '../src/data/showcaseTemplates.js';
import { initialQuestions } from '../src/data/questions.js';
import { SHOWCASE_SECTION_IDS, normalizeSectionOrder } from '../src/utils/showcaseEditor.js';
import {
  SLOT_MODES,
  applyShowcaseFieldSources,
  applyShowcaseFieldSourcesToQuestions,
  applyShowcaseTemplate,
  buildLinkedBlockFieldId,
  buildShowcaseTemplatePreviewAnswers,
  buildSlotPlaceholder,
  buildTemplateBlockSectionId,
  collectSlotQuestionIds,
  composeSlotText,
  createShowcaseTemplate,
  extractSlotPlaceholders,
  fillMissingSourcedTextFields,
  formatSlotQuestionValue,
  getTemplateBlockSlots,
  getTemplateBuiltInSectionIds,
  getSectionsHiddenByCondition,
  getTemplateHiddenFieldIds,
  getTemplateSectionDisplayConditions,
  hasSectionDisplayCondition,
  hasShowcaseTemplateActivation,
  isBuiltInPartHidden,
  mapShowcaseUpdatesToSources,
  normalizeShowcaseTemplate,
  resolveBuiltInSectionLabel,
  resolveLinkedBlockFieldSources,
  resolveSectionSlots,
  resolveShowcaseTemplate,
  resolveShowcaseTemplateFieldSources,
  resolveSlotContent,
  resolveSlotMode
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
  assert.equal(story.slots.description.questionId, 'donationContext');
  assert.equal(answers.customShowcaseSections.length, 3);

  const sources = resolveLinkedBlockFieldSources(answers.customShowcaseSections, SOURCE_QUESTIONS);
  assert.deepEqual(sources, {
    [buildLinkedBlockFieldId('donationContext')]: 'donationContext',
    [buildLinkedBlockFieldId('beneficiaryKind')]: 'beneficiaryKind'
  });
});

test('un bloc lié à des jalons n’est pas relié : aucun emplacement ne sait les afficher', () => {
  const questions = [...SOURCE_QUESTIONS, { id: 'roadmapMilestones', type: 'milestone_list', question: 'Jalons' }];
  assert.deepEqual(
    resolveLinkedBlockFieldSources([{ id: 'x', type: 'story', sourceQuestionId: 'roadmapMilestones' }], questions),
    {}
  );
});

// --- Emplacements des blocs ---------------------------------------------------------------

const SLOT_QUESTIONS = [
  {
    id: 'amount',
    type: 'number',
    question: { fr: 'Montant' },
    numberUnit: { fr: '€', en: '€' },
    numberUnitOptions: ['$']
  },
  {
    id: 'kinds',
    type: 'multi_choice',
    question: { fr: 'Types' },
    options: [
      { value: 'fin', label: { fr: 'Don financier', en: 'Financial donation' }, subOptions: [{ value: 'projet', label: { fr: 'Pour un projet', en: 'For a project' } }] },
      { value: 'nature', label: { fr: 'Don en nature', en: 'In-kind donation' } }
    ]
  },
  {
    id: 'schedule',
    type: 'choice',
    question: { fr: 'Versement' },
    options: [{ value: 'unique', label: { fr: 'Versement unique', en: 'Single payment' } }]
  },
  { id: 'beneficiary', type: 'text', question: { fr: 'Bénéficiaire' } },
  { id: 'milestones', type: 'milestone_list', question: { fr: 'Jalons' } }
];

const findSlotQuestion = (id) => SLOT_QUESTIONS.find((question) => question.id === id) || null;

test('un nombre s’affiche dans la langue du lecteur, avec l’unité choisie au questionnaire', () => {
  const amount = findSlotQuestion('amount');
  assert.equal(formatSlotQuestionValue(amount, '25000', { language: 'fr' }).text, '25\u202f000\u00a0€');
  assert.equal(formatSlotQuestionValue(amount, '25000', { language: 'en' }).text, '25,000\u00a0€');
  assert.equal(formatSlotQuestionValue(amount, '1500.5', { language: 'en', unit: '$' }).text, '1,500.5\u00a0$');
  assert.equal(formatSlotQuestionValue(amount, '12', { language: 'fr', unit: 'inconnue' }).text, '12\u00a0€');
  const parts = formatSlotQuestionValue(amount, '25000', { language: 'en' });
  assert.equal(parts.value, '25,000');
  assert.equal(parts.unit, '€');
  assert.deepEqual(formatSlotQuestionValue(amount, '', { language: 'fr' }), { text: '', items: [] });
});

test('un choix multiple donne un élément par option cochée, sous-options comprises', () => {
  const kinds = findSlotQuestion('kinds');
  assert.deepEqual(
    formatSlotQuestionValue(kinds, ['fin', 'nature'], { language: 'fr' }).items,
    ['Don financier', 'Don en nature']
  );
  assert.deepEqual(
    formatSlotQuestionValue(kinds, { values: ['fin', 'nature'], children: { fin: ['projet'] } }, { language: 'en' }).items,
    ['Financial donation (For a project)', 'In-kind donation']
  );
  assert.equal(formatSlotQuestionValue(kinds, ['fin', 'nature'], { language: 'fr' }).text, 'Don financier, Don en nature');
});

test('un choix simple affiche le libellé traduit de l’option', () => {
  assert.equal(formatSlotQuestionValue(findSlotQuestion('schedule'), 'unique', { language: 'en' }).text, 'Single payment');
});

test('un texte composé cite les réponses du questionnaire', () => {
  assert.deepEqual(extractSlotPlaceholders('Pour {{beneficiary}} : {{ amount }}, {{beneficiary}}'), ['beneficiary', 'amount']);
  assert.equal(
    composeSlotText('{{amount}} versés à {{beneficiary}}', (id) => ({ amount: '10 €', beneficiary: 'X' })[id]),
    '10 € versés à X'
  );
  assert.equal(buildSlotPlaceholder('amount'), '{{amount}}');
});

test('le mode d’un emplacement dit ce que le porteur peut en faire', () => {
  const text = { kind: 'text' };
  const list = { kind: 'list' };
  const options = { language: 'fr', findQuestion: findSlotQuestion };
  assert.equal(resolveSlotMode({ state: 'used', source: 'text', text: 'Titre' }, text, options), SLOT_MODES.OWNER);
  assert.equal(resolveSlotMode({ state: 'used', source: 'text', text: 'Pour {{beneficiary}}' }, text, options), SLOT_MODES.DERIVED);
  assert.equal(resolveSlotMode({ state: 'locked', source: 'text', text: 'Fixe' }, text, options), SLOT_MODES.LOCKED);
  assert.equal(resolveSlotMode({ state: 'hidden', source: 'question', questionId: 'amount' }, text, options), SLOT_MODES.HIDDEN);
  assert.equal(resolveSlotMode({ state: 'used', source: 'question', questionId: 'beneficiary' }, text, options), SLOT_MODES.LINKED);
  assert.equal(resolveSlotMode({ state: 'used', source: 'question', questionId: 'beneficiary' }, list, options), SLOT_MODES.DERIVED);
  assert.equal(resolveSlotMode({ state: 'used', source: 'question', questionId: 'amount' }, text, options), SLOT_MODES.DERIVED);
  // une question supprimée ou d'un type inaffichable rend l'emplacement à son texte
  assert.equal(resolveSlotMode({ state: 'used', source: 'question', questionId: 'gone', text: 'Repli' }, text, options), SLOT_MODES.OWNER);
  assert.equal(resolveSlotMode({ state: 'used', source: 'question', questionId: 'milestones' }, text, options), SLOT_MODES.OWNER);
});

test('le contenu d’un emplacement vient du questionnaire, « information manquante » s’il est vide', () => {
  const answers = { amount: '5000', kinds: ['fin'], beneficiary: '' };
  const context = {
    language: 'fr',
    findQuestion: findSlotQuestion,
    readQuestion: (id) => formatSlotQuestionValue(findSlotQuestion(id), answers[id], { language: 'fr' }),
    missing: () => 'Information manquante'
  };
  const resolve = (slot, definition) => resolveSlotContent(slot, definition, {
    ...context,
    mode: resolveSlotMode(slot, definition, context)
  });

  assert.equal(resolve({ state: 'used', source: 'question', questionId: 'amount' }, { kind: 'text' }).text, '5\u202f000\u00a0€');
  assert.deepEqual(resolve({ state: 'used', source: 'question', questionId: 'kinds' }, { kind: 'list' }).items, ['Don financier']);
  assert.equal(resolve({ state: 'used', source: 'question', questionId: 'beneficiary' }, { kind: 'text' }).text, 'Information manquante');
  assert.equal(
    resolve({ state: 'locked', source: 'text', text: { fr: '{{amount}} pour {{beneficiary}}' } }, { kind: 'text' }).text,
    '5\u202f000\u00a0€ pour Information manquante'
  );
  assert.deepEqual(
    resolve({ state: 'locked', source: 'text', text: 'Montant : {{amount}}\n\nType : {{kinds}}' }, { kind: 'list' }).items,
    ['Montant : 5\u202f000\u00a0€', 'Type : Don financier']
  );
  assert.equal(resolve({ state: 'used', source: 'text', text: 'Écrit par le porteur' }, { kind: 'text' }), null);
  assert.equal(resolve({ state: 'hidden', source: 'question', questionId: 'amount' }, { kind: 'text' }), null);
});

test('un bloc à emplacements devient une section dont seuls les textes du porteur sont recopiés', () => {
  const template = normalizeShowcaseTemplate({
    id: 'don',
    sections: [{
      kind: 'block',
      id: 'amount',
      type: 'figure',
      slots: {
        accent: { state: 'locked', source: 'text', text: { fr: 'Le soutien' } },
        title: { state: 'used', source: 'text', text: { fr: 'Titre de départ', en: 'Starting title' } },
        figure: { state: 'used', source: 'question', questionId: 'amount' },
        description: { state: 'hidden', source: 'text', text: 'Jamais affiché' }
      }
    }]
  });
  const [section] = applyShowcaseTemplate({}, template, 'en').customShowcaseSections;
  assert.equal(section.id, buildTemplateBlockSectionId('don', 'amount'));
  assert.equal(section.title, 'Starting title');
  assert.equal(section.accent, '');
  assert.equal(section.figure, '');
  assert.equal(section.description, '');
  assert.deepEqual(Object.keys(section.slots).sort(), ['accent', 'description', 'figure']);
});

test('un bloc dont tous les emplacements sont vides ou masqués n’est pas proposé', () => {
  const template = normalizeShowcaseTemplate({
    id: 'don',
    sections: [
      { kind: 'block', id: 'empty', type: 'highlight', slots: { title: { state: 'hidden', source: 'question', questionId: 'amount' } } },
      { kind: 'block', id: 'list', type: 'checklist', slots: { items: { state: 'used', source: 'text', text: 'Un\nDeux' } } }
    ]
  });
  const sections = applyShowcaseTemplate({}, template, 'fr').customShowcaseSections;
  assert.deepEqual(sections.map((section) => section.id), [buildTemplateBlockSectionId('don', 'list')]);
  assert.deepEqual(sections[0].items, ['Un', 'Deux']);
});

test('les emplacements d’un bloc venu du modèle suivent le modèle, même une fois la vitrine enregistrée', () => {
  const template = normalizeShowcaseTemplate({
    id: 'don',
    sections: [{ kind: 'block', id: 'amount', type: 'figure', slots: { figure: { state: 'used', source: 'question', questionId: 'amount' } } }]
  });
  const sectionId = buildTemplateBlockSectionId('don', 'amount');
  const stored = { id: sectionId, type: 'figure', slots: { figure: { state: 'used', source: 'question', questionId: 'old' } } };
  assert.equal(resolveSectionSlots(stored, getTemplateBlockSlots(template)).figure.questionId, 'amount');
  assert.equal(resolveSectionSlots(stored, {}).figure.questionId, 'old');
  assert.equal(resolveSectionSlots({ id: 'mine', type: 'highlight', title: 'x' }, {}), null);
});

test('les questions lues par les emplacements sont reliées, sauf masquées ou déjà éditées par la vitrine', () => {
  const sections = [{
    id: 's1',
    type: 'checklist',
    slots: {
      title: { state: 'used', source: 'question', questionId: 'beneficiary' },
      description: { state: 'hidden', source: 'question', questionId: 'schedule' },
      items: { state: 'locked', source: 'text', text: { fr: '{{amount}}', en: '{{kinds}} {{projectName}}' } }
    }
  }];
  const questions = [...SLOT_QUESTIONS, { id: 'projectName', type: 'text', question: 'Nom' }];
  assert.deepEqual(
    Object.values(resolveLinkedBlockFieldSources(sections, questions, { excludedIds: ['projectName'] })).sort(),
    ['amount', 'beneficiary', 'kinds']
  );
  assert.deepEqual(collectSlotQuestionIds(sections[0].slots, { editableOnly: true }), ['beneficiary']);
});

test('un modèle enregistré avant les emplacements est relu sans perte', () => {
  const template = normalizeShowcaseTemplate({
    id: 'ancien',
    sections: [
      { kind: 'block', id: 'a', type: 'story', title: { fr: 'Titre' }, description: { fr: 'Consigne' } },
      { kind: 'block', id: 'b', type: 'highlight', title: 'T', description: 'Repli', sourceQuestionId: 'beneficiary' }
    ]
  });
  const [story, highlight] = template.sections.filter((entry) => entry.kind === 'block');
  assert.deepEqual(story.slots.title, { state: 'used', source: 'text', text: { fr: 'Titre' } });
  assert.deepEqual(story.slots.description, { state: 'used', source: 'text', text: { fr: 'Consigne' } });
  assert.deepEqual(highlight.slots.description, { state: 'used', source: 'question', questionId: 'beneficiary', text: 'Repli' });
  assert.deepEqual(highlight.slots.accent, { state: 'used', source: 'text', text: '' });
});

// --- Sections intégrées : éléments retirés et titres -----------------------------------

test('un modèle retire des éléments d’une section intégrée et les champs qui vont avec', () => {
  const template = normalizeShowcaseTemplate({
    id: 'tpl',
    sections: [
      { kind: 'builtin', id: 'hero', hiddenParts: ['heroCta', 'heroHighlights', 'inconnu'], fieldSources: { targetAudience: 'kinds' } },
      { kind: 'builtin', id: 'team', hiddenParts: ['teamCoreMembers'] },
      { kind: 'builtin', id: 'problem', hiddenParts: ['problemPainPoints'] }
    ]
  });
  assert.deepEqual(template.sections.find((entry) => entry.id === 'hero').hiddenParts, ['heroHighlights', 'heroCta']);
  assert.equal('hiddenParts' in template.sections.find((entry) => entry.id === 'problem'), false);
  assert.equal(isBuiltInPartHidden(template, 'hero', 'heroCta'), true);
  assert.equal(isBuiltInPartHidden(template, 'hero', 'projectSlogan'), false);
  assert.equal(isBuiltInPartHidden(null, 'hero', 'heroCta'), false);
  assert.deepEqual(Array.from(getTemplateHiddenFieldIds(template)).sort(), ['targetAudience', 'teamCoreMembers']);
  // un élément retiré n'est pas relié à une question
  assert.deepEqual(resolveShowcaseTemplateFieldSources(template, SLOT_QUESTIONS), {});
});

test('un modèle renomme les titres d’une section intégrée, langue par langue', () => {
  const template = normalizeShowcaseTemplate({
    id: 'tpl',
    sections: [
      { kind: 'builtin', id: 'problem', labels: { eyebrow: { fr: 'Le besoin', en: 'The need' }, headline: { fr: '  ' } } },
      { kind: 'builtin', id: 'hero', labels: { headline: { fr: 'Ignoré : le titre du hero est le nom du projet' } } }
    ]
  });
  assert.equal(resolveBuiltInSectionLabel(template, 'problem', 'eyebrow', 'en'), 'The need');
  // langue non traduite : repli sur la langue par défaut, comme tout contenu du référentiel
  assert.equal(resolveBuiltInSectionLabel(template, 'problem', 'eyebrow', 'de'), 'The need');
  assert.equal(resolveBuiltInSectionLabel(template, 'problem', 'headline', 'fr'), '');
  assert.equal('labels' in template.sections.find((entry) => entry.id === 'hero'), false);
});

test('le chiffre d’impact peut lire une question numérique', () => {
  const template = normalizeShowcaseTemplate({
    id: 'tpl',
    sections: [{ kind: 'builtin', id: 'objectives', fieldSources: { showcaseImpactFigure: 'amount', showcaseImpactFigureUnit: 'amount' } }]
  });
  assert.deepEqual(resolveShowcaseTemplateFieldSources(template, SLOT_QUESTIONS), { showcaseImpactFigure: 'amount' });
});

// --- Modèle « don » par défaut et aperçu -------------------------------------------------

test('le modèle « don » par défaut ne lit que des questions qui existent et qu’il sait afficher', () => {
  const template = resolveShowcaseTemplate({ ProjectType: 'don_bourse_appel_a_projets' }, initialShowcaseTemplates);
  const blocks = template.sections.filter((entry) => entry.kind === 'block');
  const ids = new Set(blocks.flatMap((entry) => collectSlotQuestionIds(entry.slots)));
  assert.ok(ids.has('donationAmount'));
  ids.forEach((id) => {
    const question = initialQuestions.find((candidate) => candidate.id === id);
    assert.ok(question, id);
    assert.ok(['text', 'long_text', 'choice', 'multi_choice', 'number', 'date'].includes(question.type), id);
  });
  const amount = blocks.find((entry) => entry.id === 'amount');
  assert.equal(amount.type, 'figure');
  assert.deepEqual(amount.slots.figure, { state: 'used', source: 'question', questionId: 'donationAmount', text: '' });
});

test('les questions du don ne s’affichent que pour un don', () => {
  const donationIds = initialQuestions.filter((question) => question.id.startsWith('donation')).map((question) => question.id);
  assert.ok(donationIds.length >= 5);
  initialQuestions
    .filter((question) => donationIds.includes(question.id))
    .forEach((question) => {
      assert.deepEqual(question.conditionGroups, [{
        logic: 'all',
        conditions: [{ question: 'ProjectType', operator: 'equals', value: 'don_bourse_appel_a_projets' }]
      }], question.id);
    });
});

test('l’aperçu invente une réponse, selon son type, pour chaque question lue encore vide', () => {
  const template = normalizeShowcaseTemplate({
    id: 'tpl',
    sections: [
      { kind: 'builtin', id: 'problem', fieldSources: { problemPainPoints: 'beneficiary' } },
      {
        kind: 'block',
        id: 'b',
        type: 'checklist',
        slots: {
          title: { state: 'used', source: 'question', questionId: 'amount' },
          items: { state: 'used', source: 'question', questionId: 'kinds' },
          description: { state: 'locked', source: 'text', text: '{{schedule}}' }
        }
      }
    ]
  });
  const answers = buildShowcaseTemplatePreviewAnswers(template, SLOT_QUESTIONS, { amount: '42' }, 'fr');
  assert.equal(answers.amount, '42');
  assert.deepEqual(answers.kinds, ['fin', 'nature']);
  assert.equal(answers.schedule, 'unique');
  assert.match(answers.beneficiary, /^Exemple de réponse/);
});

// --- Conditions d'affichage des sections ------------------------------------------------

const whenCounterpartIs = (value) => ({
  conditionGroups: [{ logic: 'all', conditions: [{ type: 'question', question: 'counterpart', operator: 'equals', value }] }]
});

test('une section du modèle ne s’affiche que si ses conditions sont remplies', () => {
  const template = normalizeShowcaseTemplate({
    id: 'don',
    sections: [
      { kind: 'builtin', id: 'team', displayCondition: whenCounterpartIs('aucune') },
      { kind: 'block', id: 'terms', type: 'checklist', slots: { title: { text: 'Modalités' } }, displayCondition: whenCounterpartIs('mention') },
      { kind: 'builtin', id: 'hero' }
    ]
  });
  const conditions = getTemplateSectionDisplayConditions(template);
  const blockId = buildTemplateBlockSectionId('don', 'terms');
  assert.deepEqual(Object.keys(conditions).sort(), [blockId, 'team'].sort());

  assert.deepEqual(Array.from(getSectionsHiddenByCondition(conditions, { counterpart: 'aucune' })), [blockId]);
  assert.deepEqual(Array.from(getSectionsHiddenByCondition(conditions, { counterpart: 'mention' })), ['team']);
  assert.deepEqual(Array.from(getSectionsHiddenByCondition(conditions, {})).sort(), [blockId, 'team'].sort());
});

test('une condition d’affichage vide ou incomplète ne masque rien', () => {
  const template = normalizeShowcaseTemplate({
    id: 'don',
    sections: [
      { kind: 'builtin', id: 'team', displayCondition: { conditionGroups: [] } },
      { kind: 'builtin', id: 'timeline', displayCondition: { conditionGroups: [{ logic: 'all', conditions: [{ type: 'question', question: '', operator: 'equals', value: '' }] }] } },
      { kind: 'builtin', id: 'notice', displayCondition: whenCounterpartIs('x') }
    ]
  });
  assert.equal('displayCondition' in template.sections.find((entry) => entry.id === 'team'), false);
  assert.equal(hasSectionDisplayCondition(template.sections.find((entry) => entry.id === 'timeline')), false);
  // le bandeau de complétude ne peut pas être masqué par une condition
  assert.equal('displayCondition' in template.sections.find((entry) => entry.id === 'notice'), false);
  assert.deepEqual(getTemplateSectionDisplayConditions(template), {});
});
