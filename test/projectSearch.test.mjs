import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_FILTER_VALUE,
  buildDefaultProjectSearchConfig,
  buildQuestionColumn,
  buildProjectSearchContext,
  buildProjectSearchExportRows,
  buildProjectSearchRows,
  computeProjectSearchChartData,
  computeProjectSearchTotals,
  filterProjectSearchRows,
  getColumnKind,
  getMissingColumnSources,
  listActiveFilterIds,
  listColumnFilterValues,
  listSearchableQuestions,
  normalizeProjectSearchConfig,
  resolveProjectSearchConfig,
  searchQuestionOptions,
  sortProjectSearchRows
} from '../src/utils/projectSearch.js';

const questions = [
  { id: 'projectName', type: 'text', question: { fr: 'Nom' } },
  { id: 'solutionDescription', type: 'long_text', question: { fr: 'Description' } },
  { id: 'launchDate', type: 'date', question: { fr: 'Lancement' } },
  { id: 'BUDGET', type: 'number', question: { fr: 'Budget' }, numberUnit: { fr: 'K€', en: 'K€' } },
  { id: 'donationAmount', type: 'number', question: { fr: 'Don' }, numberUnit: { fr: '€', en: '€' } },
  {
    id: 'q10',
    type: 'multi_choice',
    question: { fr: 'Collaboration' },
    options: [
      { value: 'agence', label: { fr: 'Agence', en: 'Agency' } },
      { value: 'expert', label: { fr: 'Expert', en: 'Expert' } }
    ]
  }
];

const currencies = [
  { unit: '€', code: 'EUR', multiplier: 1, rate: 1 },
  { unit: 'K€', code: 'EUR', multiplier: 1000, rate: 1 },
  { unit: '$', code: 'USD', multiplier: 1, rate: null }
];

const projects = [
  {
    id: 'p1',
    projectName: 'Atlas',
    status: 'submitted',
    ownerEmail: 'lea.martin@example.com',
    createdAt: '2026-01-15T10:00:00.000Z',
    answers: { solutionDescription: '<p>Application <b>vaccin</b></p>', launchDate: '2026-06-01', BUDGET: '30', q10: ['agence', 'expert'] },
    analysis: { teams: ['legal'] }
  },
  {
    id: 'p2',
    projectName: 'Bourse Hélios',
    status: 'draft',
    ownerEmail: 'noah.carpentier@example.com',
    createdAt: '2026-03-02T10:00:00.000Z',
    answers: { donationAmount: '12500', q10: ['agence'] },
    analysis: { teams: [] }
  },
  {
    id: 'p3',
    projectName: 'Comet',
    status: 'cancelled',
    ownerEmail: 'lea.martin@example.com',
    answers: { BUDGET: '5', BUDGET__number_unit: '$' },
    analysis: null
  },
  { id: 'demo', projectName: 'Démo', status: 'draft', isDemo: true, answers: {} }
];

const t = (key) => key;
const ctx = buildProjectSearchContext({
  questions,
  teams: [{ id: 'legal', name: { fr: 'Juridique', en: 'Legal' } }],
  language: 'fr',
  t,
  currencyTable: currencies,
  verdictOf: () => ({ status: 'pending' })
});
const config = buildDefaultProjectSearchConfig(questions, { labels: { description: 'Description', launchDate: 'Lancement', amount: 'Montant' } });
const rows = buildProjectSearchRows(projects, config.columns, ctx);
const rowById = (id) => rows.find((row) => row.id === id);

test('la configuration de départ ne crée que les colonnes dont les questions existent', () => {
  const ids = config.columns.map((column) => column.id);
  assert.deepEqual(ids, ['builtin-projectName', 'default-description', 'builtin-owner', 'builtin-createdAt', 'default-launch', 'default-amount', 'builtin-status', 'builtin-verdict']);
  assert.equal(config.kpiColumnId, 'default-amount');
  const amount = config.columns.find((column) => column.id === 'default-amount');
  assert.deepEqual(amount.sources.map((source) => source.questionId), ['BUDGET', 'donationAmount']);
  assert.equal(amount.unit, 'K€');

  const bare = buildDefaultProjectSearchConfig([{ id: 'other', type: 'text' }]);
  assert.deepEqual(bare.columns.map((column) => column.id), ['builtin-projectName', 'builtin-owner', 'builtin-createdAt', 'builtin-status', 'builtin-verdict']);
  assert.equal(bare.kpiColumnId, '');
});

test('personnel, puis défaut de l’administrateur, puis défaut intégré', () => {
  const personal = { columns: [{ kind: 'builtin', builtinId: 'owner' }] };
  const adminDefault = { columns: [{ kind: 'builtin', builtinId: 'status' }] };
  assert.equal(resolveProjectSearchConfig({ personal, adminDefault, questions }).columns[0].builtinId, 'owner');
  assert.equal(resolveProjectSearchConfig({ personal: { columns: [] }, adminDefault, questions }).columns[0].builtinId, 'status');
  assert.equal(resolveProjectSearchConfig({ personal: null, adminDefault: 'x', questions }).columns.length, 8);
});

test('la normalisation écarte ce qui est illisible et garde les graphiques valides', () => {
  const normalized = normalizeProjectSearchConfig({
    columns: [
      { id: 'a', kind: 'custom', label: '  Montant  ', sources: [{ questionId: 'BUDGET', factor: '0' }, 'BUDGET', { questionId: 'donationAmount', factor: 0.001 }], merge: 'bogus' },
      { id: 'a', kind: 'builtin', builtinId: 'owner' },
      { kind: 'builtin', builtinId: 'unknown' }
    ],
    charts: [
      { id: 'c1', groupBy: 'a', measure: 'sum', measureColumnId: 'missing' },
      { id: 'c2', groupBy: 'missing' }
    ],
    kpiColumnId: 'missing'
  });
  assert.equal(normalized.columns.length, 1);
  assert.equal(normalized.columns[0].label, 'Montant');
  assert.equal(normalized.columns[0].merge, 'first');
  assert.deepEqual(normalized.columns[0].sources, [{ questionId: 'BUDGET', factor: 1 }, { questionId: 'donationAmount', factor: 0.001 }]);
  assert.equal(normalized.charts.length, 1);
  assert.equal(normalized.charts[0].measure, 'count');
  assert.equal(normalized.kpiColumnId, '');
});

test('le montant fusionné prend la première source renseignée, convertie dans l’unité de la colonne', () => {
  assert.equal(rowById('p1').cells['default-amount'].number, 30);
  assert.equal(rowById('p2').cells['default-amount'].number, 12.5);
  assert.equal(rowById('p2').cells['default-amount'].display, '12,5\u00a0K€');
  const unconverted = rowById('p3').cells['default-amount'];
  assert.equal(unconverted.number, null);
  assert.equal(unconverted.unconverted, true);
});

test('une source absente du référentiel est ignorée et signalée', () => {
  const column = { id: 'x', kind: 'custom', label: 'X', sources: [{ questionId: 'gone', factor: 1 }, { questionId: 'BUDGET', factor: 1 }], merge: 'first', unit: '' };
  assert.deepEqual(getMissingColumnSources(column, questions), ['gone']);
  const [row] = buildProjectSearchRows([projects[0]], [column], ctx);
  assert.equal(row.cells.x.number, 30);
});

test('somme, concaténation et coefficient', () => {
  const sum = { id: 's', kind: 'custom', label: 'S', sources: [{ questionId: 'BUDGET', factor: 1000 }, { questionId: 'donationAmount', factor: 1 }], merge: 'sum', unit: '' };
  const concat = { id: 'c', kind: 'custom', label: 'C', sources: [{ questionId: 'solutionDescription', factor: 1 }, { questionId: 'q10', factor: 1 }], merge: 'concat', unit: '' };
  const [row] = buildProjectSearchRows([{ ...projects[0], answers: { ...projects[0].answers, donationAmount: '500' } }], [sum, concat], ctx);
  assert.equal(row.cells.s.number, 30500);
  assert.equal(getColumnKind(concat, questions), 'text');
  assert.match(row.cells.c.display, /vaccin.* ; Agence, Expert/);
});

test('colonnes intégrées : statut, verdict (seulement envoyé), équipes, date de création', () => {
  assert.equal(rowById('p1').cells['builtin-verdict'].display, 'projectSearch.verdict.pending');
  assert.equal(rowById('p2').cells['builtin-verdict'].display, '');
  assert.equal(rowById('p2').cells['builtin-status'].code, 'draft');
  assert.deepEqual(rowById('p1').cells['builtin-teams'].values, ['Juridique']);
  assert.equal(rowById('p1').cells['builtin-createdAt'].date, '2026-01-15');
  assert.equal(rowById('p3').cells['builtin-createdAt'].display, '');
  assert.equal(rows.some((row) => row.id === 'demo'), false);
});

test('la recherche porte sur toutes les réponses, sans accents ni majuscules, tous les mots', () => {
  const search = (query) => filterProjectSearchRows(rows, { query, columns: config.columns, questions }).map((row) => row.id);
  assert.deepEqual(search('VACCIN'), ['p1']);
  assert.deepEqual(search('helios'), ['p2']);
  assert.deepEqual(search('agence'), ['p1', 'p2']);
  assert.deepEqual(search('agence martin'), ['p1']);
  assert.deepEqual(search('lea'), ['p1', 'p3']);
});

test('filtres par type de colonne', () => {
  const run = (filters) => filterProjectSearchRows(rows, { filters, columns: config.columns, questions }).map((row) => row.id);
  assert.deepEqual(run({ 'builtin-status': { values: ['projectSearch.status.draft'] } }), ['p2']);
  assert.deepEqual(run({ 'default-amount': { min: '20' } }), ['p1']);
  assert.deepEqual(run({ 'default-amount': { max: '20' } }), ['p2']);
  assert.deepEqual(run({ 'builtin-createdAt': { from: '2026-02-01' } }), ['p2']);
  assert.deepEqual(run({ 'default-description': { contains: 'vaccin' } }), ['p1']);
  assert.deepEqual(run({ 'builtin-teams': { values: [EMPTY_FILTER_VALUE] } }), ['p2', 'p3']);
  const values = listColumnFilterValues(rows, 'builtin-owner').map((entry) => entry.value);
  assert.deepEqual(values, ['Lea Martin', 'Noah Carpentier']);
});

test('tri : les vides en dernier dans les deux sens', () => {
  assert.deepEqual(sortProjectSearchRows(rows, { columnId: 'default-amount', direction: 'asc' }).map((row) => row.id), ['p2', 'p1', 'p3']);
  assert.deepEqual(sortProjectSearchRows(rows, { columnId: 'default-amount', direction: 'desc' }).map((row) => row.id), ['p1', 'p2', 'p3']);
});

test('indicateurs et graphiques', () => {
  const totals = computeProjectSearchTotals(rows, 'default-amount');
  assert.equal(totals.count, 3);
  assert.equal(totals.sum, 42.5);
  assert.equal(totals.unit, 'K€');
  assert.equal(totals.unconvertedCount, 1);

  const collab = { id: 'collab', kind: 'custom', label: 'Collab', sources: [{ questionId: 'q10', factor: 1 }], merge: 'first', unit: '' };
  const withCollab = buildProjectSearchRows(projects, [...config.columns, collab], ctx);
  const columns = [...config.columns, collab];
  const byCollab = computeProjectSearchChartData(withCollab, { groupBy: 'collab', measure: 'count' }, { columns, questions });
  assert.deepEqual(byCollab.map((entry) => [entry.label, entry.value]), [['Agence', 2], ['', 1], ['Expert', 1]]);

  const budgetByStatus = computeProjectSearchChartData(withCollab, { groupBy: 'builtin-status', measure: 'sum', measureColumnId: 'default-amount' }, { columns, questions });
  assert.deepEqual(budgetByStatus.map((entry) => [entry.label, entry.value]), [
    ['projectSearch.status.submitted', 30],
    ['projectSearch.status.draft', 12.5],
    ['projectSearch.status.cancelled', 0]
  ]);

  const byMonth = computeProjectSearchChartData(withCollab, { groupBy: 'builtin-createdAt', measure: 'count', dateBucket: 'month' }, { columns, questions, language: 'fr' });
  assert.deepEqual(byMonth.map((entry) => entry.key), ['2026-01', '2026-03', EMPTY_FILTER_VALUE]);
});

test('export : en-têtes, nombres et dates typés', () => {
  const exportRows = buildProjectSearchExportRows([rowById('p1')], config.columns, (column) => column.label || column.builtinId, questions);
  assert.equal(exportRows[0][0].value, 'projectName');
  const amountIndex = config.columns.findIndex((column) => column.id === 'default-amount');
  const launchIndex = config.columns.findIndex((column) => column.id === 'default-launch');
  assert.deepEqual(exportRows[1][amountIndex], { type: 'number', value: 30 });
  assert.deepEqual(exportRows[1][launchIndex], { type: 'date', value: '2026-06-01' });
});

test('la recherche de questions ignore accents et majuscules, écarte les questions déjà utilisées et plafonne les résultats', () => {
  const options = listSearchableQuestions(questions, 'fr');
  assert.deepEqual(searchQuestionOptions(options, 'LANCEMENT').results.map((option) => option.id), ['launchDate']);
  assert.deepEqual(searchQuestionOptions(options, 'budget').results.map((option) => option.id), ['BUDGET']);
  assert.deepEqual(searchQuestionOptions(options, 'q10').results.map((option) => option.id), ['q10']);
  const excluded = searchQuestionOptions(options, '', { excludeIds: ['BUDGET', 'q10'] });
  assert.ok(!excluded.results.some((option) => option.id === 'BUDGET' || option.id === 'q10'));
  const capped = searchQuestionOptions(options, '', { limit: 2 });
  assert.equal(capped.results.length, 2);
  assert.equal(capped.total, options.length);
  assert.equal(searchQuestionOptions(options, 'introuvable').total, 0);
});

test('une colonne créée depuis une question porte cette question et, pour un montant, son unité', () => {
  const amount = buildQuestionColumn(questions.find((question) => question.id === 'BUDGET'));
  assert.equal(amount.kind, 'custom');
  assert.equal(amount.label, '');
  assert.deepEqual(amount.sources, [{ questionId: 'BUDGET', factor: 1 }]);
  assert.equal(amount.unit, 'K€');
  assert.equal(buildQuestionColumn(questions.find((question) => question.id === 'q10')).unit, '');
  assert.equal(buildQuestionColumn(null), null);
  assert.ok(normalizeProjectSearchConfig({ columns: [amount] }));
});

test('seuls les filtres réellement actifs sont listés', () => {
  assert.deepEqual(listActiveFilterIds({
    a: { values: ['x'] },
    b: { values: [] },
    c: { from: '2026-01-01' },
    d: { contains: '  ' },
    e: { min: '3' }
  }), ['a', 'c', 'e']);
  assert.deepEqual(listActiveFilterIds(null), []);
});
