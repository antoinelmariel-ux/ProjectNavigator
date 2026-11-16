import { DEFAULT_LANGUAGE, getLocaleTag } from '../i18n/languages.js';
import { formatAnswer } from './questions.js';
import { resolveLocalizedText } from './localizedContent.js';
import { normalizeEmail } from './normalizeEmail.js';
import { buildNumberUnitAnswerId, getDefaultNumberUnit, getUnitPivotValue, normalizeCurrencyTable } from './currencies.js';
import { SUBMISSION_HISTORY_KEY } from './submissionHistory.js';
import { foldSearchText, formatOwnerLabel } from './adminProjectSearch.js';

// Recherche de projets du back-office (onglet `projectSearch`) : tous les projets vivants, brouillons
// compris, quel que soit le périmètre de l'expert qui cherche. Le tableau est entièrement configurable
// et ne repose sur aucun identifiant de question codé en dur : une colonne personnalisée lit une ou
// plusieurs questions du référentiel *chargé* (SharePoint ou local) et les fusionne. Une question
// absente du référentiel est simplement ignorée, signalée dans l'éditeur — la colonne ne casse pas.

export const PROJECT_SEARCH_CONFIG_VERSION = 1;
export const MAX_PROJECT_SEARCH_COLUMNS = 30;
export const MAX_COLUMN_SOURCES = 10;
export const MAX_PROJECT_SEARCH_CHARTS = 12;
export const MAX_CHART_GROUPS = 12;
export const EMPTY_FILTER_VALUE = '__empty__';
export const OTHER_GROUP_KEY = '__other__';

export const BUILTIN_COLUMNS = {
  projectName: { kind: 'text' },
  owner: { kind: 'enum' },
  createdAt: { kind: 'date' },
  status: { kind: 'enum' },
  verdict: { kind: 'enum' },
  teams: { kind: 'enum' }
};
export const BUILTIN_COLUMN_IDS = Object.keys(BUILTIN_COLUMNS);

export const MERGE_MODES = ['first', 'sum', 'concat'];
export const CHART_TYPES = ['bar', 'donut'];
export const CHART_MEASURES = ['count', 'sum', 'avg'];
export const DATE_BUCKETS = ['month', 'year'];

// Questions proposées pour la configuration de départ, quand elles existent dans le référentiel.
const DEFAULT_DESCRIPTION_QUESTION_IDS = ['solutionDescription'];
const DEFAULT_LAUNCH_QUESTION_IDS = ['launchDate'];
const DEFAULT_AMOUNT_QUESTION_IDS = ['BUDGET', 'donationAmount'];

const VALUE_QUESTION_TYPES = new Set(['text', 'long_text', 'choice', 'multi_choice', 'number', 'date', 'milestone_list', 'ranking', 'file']);
const CHOICE_TYPES = new Set(['choice', 'multi_choice']);

const toText = (value) => (typeof value === 'string' ? value : value == null ? '' : String(value));
const stripTags = (value) => toText(value).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const cleanLabel = (value, max = 80) => toText(value).replace(/\s+/g, ' ').trim().slice(0, max);

let idCounter = 0;
export const createProjectSearchId = (prefix = 'col') => {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
};

const toFiniteNumber = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
  if (normalized === '' || !/^-?\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseDay = (value) => {
  const text = toText(value).trim();
  if (!text) {
    return '';
  }
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const time = Date.parse(text);
  if (Number.isNaN(time)) {
    return '';
  }
  return new Date(time).toISOString().slice(0, 10);
};

export const formatProjectSearchDate = (day, language = DEFAULT_LANGUAGE) => {
  if (!day) {
    return '';
  }
  const [year, month, date] = day.split('-').map(Number);
  try {
    return new Intl.DateTimeFormat(getLocaleTag(language), { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(year, month - 1, date)));
  } catch {
    return day;
  }
};

export const formatProjectSearchNumber = (value, language = DEFAULT_LANGUAGE) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '';
  }
  try {
    return value.toLocaleString(getLocaleTag(language), { maximumFractionDigits: 2 });
  } catch {
    return String(value);
  }
};

const formatBucket = (key, bucket, language) => {
  if (bucket === 'year') {
    return key;
  }
  const [year, month] = key.split('-').map(Number);
  try {
    return new Intl.DateTimeFormat(getLocaleTag(language), { month: 'short', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(year, month - 1, 1)));
  } catch {
    return key;
  }
};

// --- Configuration -----------------------------------------------------------------------

const normalizeSource = (raw) => {
  const questionId = toText(isPlainObject(raw) ? raw.questionId : raw).trim();
  if (!questionId) {
    return null;
  }
  const factor = toFiniteNumber(isPlainObject(raw) ? raw.factor : null);
  return { questionId, factor: factor === null || factor === 0 ? 1 : factor };
};

export const normalizeProjectSearchColumn = (raw) => {
  if (!isPlainObject(raw)) {
    return null;
  }
  const id = cleanLabel(raw.id, 64);
  const label = cleanLabel(raw.label);

  if (raw.kind === 'builtin') {
    const builtinId = toText(raw.builtinId);
    if (!BUILTIN_COLUMNS[builtinId]) {
      return null;
    }
    return { id: id || `builtin-${builtinId}`, kind: 'builtin', builtinId, label };
  }

  if (raw.kind !== 'custom') {
    return null;
  }
  const seen = new Set();
  const sources = (Array.isArray(raw.sources) ? raw.sources : [])
    .map(normalizeSource)
    .filter((source) => source && !seen.has(source.questionId) && seen.add(source.questionId))
    .slice(0, MAX_COLUMN_SOURCES);

  return {
    id: id || createProjectSearchId('col'),
    kind: 'custom',
    label,
    sources,
    merge: MERGE_MODES.includes(raw.merge) ? raw.merge : 'first',
    unit: cleanLabel(raw.unit, 16)
  };
};

const normalizeChart = (raw, columnIds) => {
  if (!isPlainObject(raw)) {
    return null;
  }
  const groupBy = toText(raw.groupBy);
  // Les colonnes intégrées sont toujours calculées : un graphique peut s'appuyer sur l'une d'elles
  // même quand elle n'est pas affichée dans le tableau.
  const isBuiltinGroup = groupBy.startsWith('builtin-') && Boolean(BUILTIN_COLUMNS[groupBy.slice('builtin-'.length)]);
  if (!columnIds.has(groupBy) && !isBuiltinGroup) {
    return null;
  }
  const measure = CHART_MEASURES.includes(raw.measure) ? raw.measure : 'count';
  const measureColumnId = toText(raw.measureColumnId);
  return {
    id: cleanLabel(raw.id, 64) || createProjectSearchId('chart'),
    title: cleanLabel(raw.title),
    type: CHART_TYPES.includes(raw.type) ? raw.type : 'bar',
    groupBy,
    dateBucket: DATE_BUCKETS.includes(raw.dateBucket) ? raw.dateBucket : 'month',
    measure: measure !== 'count' && !columnIds.has(measureColumnId) ? 'count' : measure,
    measureColumnId: measure !== 'count' && columnIds.has(measureColumnId) ? measureColumnId : ''
  };
};

// Une configuration illisible vaut « aucune » (null) : l'appelant retombe alors sur le défaut de
// l'administrateur, puis sur le défaut intégré — jamais sur un tableau vide.
export const normalizeProjectSearchConfig = (raw) => {
  if (!isPlainObject(raw) || !Array.isArray(raw.columns)) {
    return null;
  }
  const seenIds = new Set();
  const columns = raw.columns
    .map(normalizeProjectSearchColumn)
    .filter((column) => column && !seenIds.has(column.id) && seenIds.add(column.id))
    .slice(0, MAX_PROJECT_SEARCH_COLUMNS);
  if (columns.length === 0) {
    return null;
  }
  const columnIds = new Set(columns.map((column) => column.id));
  const charts = (Array.isArray(raw.charts) ? raw.charts : [])
    .map((chart) => normalizeChart(chart, columnIds))
    .filter(Boolean)
    .slice(0, MAX_PROJECT_SEARCH_CHARTS);
  const kpiColumnId = columnIds.has(toText(raw.kpiColumnId)) ? toText(raw.kpiColumnId) : '';
  return { version: PROJECT_SEARCH_CONFIG_VERSION, columns, charts, kpiColumnId };
};

const indexQuestions = (questions) => {
  const map = new Map();
  (Array.isArray(questions) ? questions : []).forEach((question) => {
    if (question && question.id) {
      map.set(String(question.id), question);
    }
  });
  return map;
};

const builtin = (builtinId) => ({ id: `builtin-${builtinId}`, kind: 'builtin', builtinId, label: '' });

// Configuration de départ quand ni l'expert ni l'administrateur n'en ont enregistré : les colonnes
// intégrées, plus description / lancement / montant *seulement* si leurs questions existent.
export const buildDefaultProjectSearchConfig = (questions, { labels = {} } = {}) => {
  const byId = indexQuestions(questions);
  const pick = (ids) => ids.filter((id) => byId.has(id));
  const columns = [builtin('projectName')];

  const descriptionIds = pick(DEFAULT_DESCRIPTION_QUESTION_IDS);
  if (descriptionIds.length) {
    columns.push({ id: 'default-description', kind: 'custom', label: labels.description || 'Description', sources: descriptionIds.map((questionId) => ({ questionId, factor: 1 })), merge: 'first', unit: '' });
  }
  columns.push(builtin('owner'), builtin('createdAt'));

  const launchIds = pick(DEFAULT_LAUNCH_QUESTION_IDS);
  if (launchIds.length) {
    columns.push({ id: 'default-launch', kind: 'custom', label: labels.launchDate || 'Launch date', sources: launchIds.map((questionId) => ({ questionId, factor: 1 })), merge: 'first', unit: '' });
  }

  const amountIds = pick(DEFAULT_AMOUNT_QUESTION_IDS).filter((id) => (byId.get(id).type || '') === 'number');
  let kpiColumnId = '';
  if (amountIds.length) {
    const unit = getDefaultNumberUnit(byId.get(amountIds[0]));
    columns.push({ id: 'default-amount', kind: 'custom', label: labels.amount || 'Amount', sources: amountIds.map((questionId) => ({ questionId, factor: 1 })), merge: 'first', unit });
    kpiColumnId = 'default-amount';
  }
  columns.push(builtin('status'), builtin('verdict'));

  return normalizeProjectSearchConfig({ columns, charts: [], kpiColumnId });
};

// Personnel > défaut de l'administrateur > défaut intégré.
export const resolveProjectSearchConfig = ({ personal, adminDefault, questions, labels } = {}) => (
  normalizeProjectSearchConfig(personal)
  || normalizeProjectSearchConfig(adminDefault)
  || buildDefaultProjectSearchConfig(questions, { labels })
);

// Sources d'une colonne qui ne correspondent plus à aucune question du référentiel chargé.
export const getMissingColumnSources = (column, questions) => {
  if (!column || column.kind !== 'custom') {
    return [];
  }
  const byId = indexQuestions(questions);
  return column.sources.filter((source) => !byId.has(source.questionId)).map((source) => source.questionId);
};

export const listSearchableQuestions = (questions, language = DEFAULT_LANGUAGE) => (Array.isArray(questions) ? questions : [])
  .filter((question) => question && question.id && VALUE_QUESTION_TYPES.has(question.type || 'choice'))
  .map((question) => ({
    id: String(question.id),
    type: question.type || 'choice',
    label: stripTags(resolveLocalizedText(question.question, language)) || String(question.id)
  }));

// Recherche dans les questions proposées à la configuration : un référentiel compte des centaines
// de questions, une liste déroulante n'y suffit pas. Chaque mot doit figurer dans le libellé ou
// l'identifiant, sans accents ni majuscules ; les questions déjà utilisées sont écartées.
export const searchQuestionOptions = (options, query = '', { excludeIds = [], limit = 8 } = {}) => {
  const excluded = new Set((Array.isArray(excludeIds) ? excludeIds : Array.from(excludeIds || [])).map(String));
  const tokens = foldSearchText(query).split(/\s+/).filter(Boolean);
  const matches = (Array.isArray(options) ? options : [])
    .filter((option) => option && !excluded.has(String(option.id)))
    .filter((option) => {
      const haystack = foldSearchText(`${option.label} ${option.id}`);
      return tokens.every((token) => haystack.includes(token));
    });
  const max = Number.isFinite(limit) && limit > 0 ? limit : matches.length;
  return { results: matches.slice(0, max), total: matches.length };
};

// Colonne créée d'un clic à partir d'une question : son nom reste vide (le libellé de la question
// s'affiche par défaut) et un montant prend d'emblée l'unité de la question, sinon il ne serait
// jamais converti.
// Ajoute une question à une colonne. Une colonne de montants encore sans unité prend celle de la
// question : sans unité, rien n'est converti et le total refuse les unités mélangées.
export const addColumnSource = (column, question) => {
  const questionId = toText(question?.id);
  if (!column || !questionId || column.sources.some((source) => source.questionId === questionId)) {
    return column;
  }
  const next = { ...column, sources: [...column.sources, { questionId, factor: 1 }] };
  if (!next.unit && (question.type || '') === 'number') {
    next.unit = cleanLabel(getDefaultNumberUnit(question), 16);
  }
  return next;
};

export const buildQuestionColumn = (question) => {
  const questionId = toText(question?.id);
  if (!questionId) {
    return null;
  }
  const unit = (question.type || '') === 'number' ? cleanLabel(getDefaultNumberUnit(question), 16) : '';
  return { id: createProjectSearchId('col'), kind: 'custom', label: '', sources: [{ questionId, factor: 1 }], merge: 'first', unit };
};

// --- Valeurs ------------------------------------------------------------------------------

const getMultiChoiceValues = (answer) => {
  if (Array.isArray(answer)) {
    return answer;
  }
  if (isPlainObject(answer) && Array.isArray(answer.values)) {
    return answer.values;
  }
  return [];
};

const isEmptyAnswer = (value) => (
  value === undefined
  || value === null
  || (typeof value === 'string' && value.trim() === '')
  || (Array.isArray(value) && value.length === 0)
  || (isPlainObject(value) && Array.isArray(value.values) && value.values.length === 0)
);

const safeFormat = (question, answer, language) => {
  try {
    return stripTags(formatAnswer(question, answer, language));
  } catch {
    return stripTags(Array.isArray(answer) ? answer.join(', ') : answer);
  }
};

const buildRateResolver = (currencyTable) => {
  const table = normalizeCurrencyTable(currencyTable);
  return (answers, unit) => {
    const frozen = answers?.[SUBMISSION_HISTORY_KEY]?.currencyRates;
    if (isPlainObject(frozen) && frozen[unit] !== undefined) {
      const value = Number(frozen[unit]);
      return Number.isFinite(value) && value > 0 ? value : null;
    }
    const entry = table.find((candidate) => candidate.unit === unit);
    return entry ? getUnitPivotValue(entry) : null;
  };
};

// Valeur d'une question pour une colonne : nombre converti dans l'unité de la colonne quand elle
// en a une (taux figés à l'envoi, sinon table courante), puis multiplié par le coefficient de la
// source. Une conversion impossible ne devient jamais un chiffre faux : la valeur est écartée et
// signalée (`unconverted`).
const readSourceValue = (source, question, answers, ctx, columnUnit) => {
  const answer = answers?.[source.questionId];
  const type = question.type || 'choice';
  if (isEmptyAnswer(answer)) {
    return null;
  }

  if (type === 'number') {
    const amount = toFiniteNumber(answer);
    if (amount === null) {
      return null;
    }
    const storedUnit = toText(answers?.[buildNumberUnitAnswerId(source.questionId)]).trim();
    const sourceUnit = storedUnit || getDefaultNumberUnit(question);
    let converted = amount;
    if (columnUnit && sourceUnit && sourceUnit !== columnUnit) {
      const from = ctx.resolveRate(answers, sourceUnit);
      const to = ctx.resolveRate(answers, columnUnit);
      if (from === null || to === null) {
        return { type: 'number', number: null, unconverted: true, unit: sourceUnit };
      }
      converted = (amount * from) / to;
    } else if (columnUnit && !sourceUnit) {
      converted = amount;
    }
    const number = converted * source.factor;
    const unit = columnUnit || sourceUnit;
    const formatted = formatProjectSearchNumber(number, ctx.language);
    return { type: 'number', number, unit, text: unit ? `${formatted}\u00a0${unit}` : formatted };
  }

  if (type === 'date') {
    const day = parseDay(answer);
    return day ? { type: 'date', date: day, text: formatProjectSearchDate(day, ctx.language) } : null;
  }

  if (CHOICE_TYPES.has(type)) {
    const values = type === 'multi_choice' ? getMultiChoiceValues(answer) : [isPlainObject(answer) ? (answer.value ?? answer.name) : answer];
    const atoms = values
      .map((value) => safeFormat(question, type === 'multi_choice' ? [value] : value, ctx.language))
      .filter(Boolean);
    const text = safeFormat(question, answer, ctx.language);
    return text || atoms.length ? { type: 'list', text: text || atoms.join(', '), values: atoms.length ? atoms : [text] } : null;
  }

  const text = safeFormat(question, answer, ctx.language);
  return text ? { type: 'text', text } : null;
};

const emptyCell = () => ({ display: '', sort: null, values: [], number: null, date: '' });

export const getColumnKind = (column, questions) => {
  if (!column) {
    return 'text';
  }
  if (column.kind === 'builtin') {
    return BUILTIN_COLUMNS[column.builtinId]?.kind || 'text';
  }
  const byId = questions instanceof Map ? questions : indexQuestions(questions);
  const types = column.sources
    .map((source) => byId.get(source.questionId))
    .filter(Boolean)
    .map((question) => question.type || 'choice');
  if (types.length === 0) {
    return 'text';
  }
  if (column.merge === 'concat' && !types.every((type) => CHOICE_TYPES.has(type))) {
    return 'text';
  }
  if (types.every((type) => type === 'number')) {
    return 'number';
  }
  if (types.every((type) => type === 'date')) {
    return 'date';
  }
  if (types.every((type) => CHOICE_TYPES.has(type))) {
    return 'enum';
  }
  return 'text';
};

const resolveCustomCell = (column, project, ctx) => {
  const answers = project?.answers || {};
  const kind = getColumnKind(column, ctx.questionsById);
  const parts = column.sources
    .map((source) => {
      const question = ctx.questionsById.get(source.questionId);
      return question ? readSourceValue(source, question, answers, ctx, kind === 'number' ? column.unit : '') : null;
    })
    .filter(Boolean);
  const unconverted = parts.some((part) => part.unconverted);
  const usable = parts.filter((part) => !part.unconverted);

  if (kind === 'number') {
    const numbers = usable.filter((part) => part.number !== null);
    let number = null;
    let unit = column.unit;
    if (column.merge === 'sum') {
      const units = new Set(numbers.map((part) => part.unit || ''));
      // Sans unité de colonne, rien n'est converti : additionner des K€ et des $ donnerait un
      // chiffre faux. Les montants restent affichés côte à côte, et ne sont pas comptés.
      if (!unit && units.size > 1) {
        const display = numbers.map((part) => part.text).join(' + ');
        return { display, sort: null, number: null, values: [], date: '', unit: '', unconverted: false, mixedUnits: true, title: display };
      }
      number = numbers.length ? numbers.reduce((total, part) => total + part.number, 0) : null;
      if (!unit) {
        unit = units.size === 1 ? Array.from(units)[0] : '';
      }
    } else if (numbers.length) {
      number = numbers[0].number;
      unit = unit || numbers[0].unit || '';
    }
    const formatted = formatProjectSearchNumber(number, ctx.language);
    return {
      display: formatted ? (unit ? `${formatted}\u00a0${unit}` : formatted) : '',
      sort: number,
      number,
      values: [],
      date: '',
      unit,
      unconverted: number === null && unconverted
    };
  }

  if (kind === 'date') {
    const days = usable.map((part) => part.date).filter(Boolean);
    const day = days[0] || '';
    return { display: formatProjectSearchDate(day, ctx.language), sort: day || null, number: null, values: day ? [day] : [], date: day };
  }

  const chosen = column.merge === 'concat' ? usable : usable.slice(0, 1);
  if (chosen.length === 0) {
    return emptyCell();
  }
  const texts = chosen.map((part) => part.text).filter(Boolean);
  const display = texts.join(' ; ');
  const values = kind === 'enum'
    ? Array.from(new Set(chosen.flatMap((part) => part.values || [])))
    : [display];
  return { display, sort: foldSearchText(display), number: null, values, date: '' };
};

const resolveBuiltinCell = (column, project, ctx) => {
  const t = ctx.t;
  switch (column.builtinId) {
    case 'projectName': {
      const name = stripTags(project?.projectName || project?.answers?.projectName || '');
      return { display: name, sort: foldSearchText(name), number: null, values: [name], date: '' };
    }
    case 'owner': {
      const email = normalizeEmail(project?.ownerEmail || '');
      const label = formatOwnerLabel(email);
      return { display: label, sort: foldSearchText(label), number: null, values: label ? [label] : [], date: '', title: email };
    }
    case 'createdAt': {
      const day = parseDay(project?.createdAt);
      return { display: formatProjectSearchDate(day, ctx.language), sort: day || null, number: null, values: day ? [day] : [], date: day };
    }
    case 'status': {
      const status = getProjectSearchStatus(project);
      const label = t(`projectSearch.status.${status}`);
      return { display: label, sort: label, number: null, values: [label], date: '', code: status };
    }
    case 'verdict': {
      const verdict = project?.status === 'submitted' && typeof ctx.verdictOf === 'function'
        ? toText(ctx.verdictOf(project)?.status)
        : '';
      if (!verdict) {
        return emptyCell();
      }
      const label = t(`projectSearch.verdict.${verdict}`);
      return { display: label, sort: label, number: null, values: [label], date: '', code: verdict };
    }
    case 'teams': {
      const teamIds = Array.isArray(project?.analysis?.teams) ? project.analysis.teams : [];
      const names = teamIds
        .map((teamId) => ctx.teamsById.get(teamId))
        .filter(Boolean)
        .map((team) => resolveLocalizedText(team.name, ctx.language) || team.id);
      const display = names.join(', ');
      return { display, sort: foldSearchText(display), number: null, values: names, date: '' };
    }
    default:
      return emptyCell();
  }
};

export const getProjectSearchStatus = (project) => {
  const status = toText(project?.status);
  return status === 'submitted' || status === 'cancelled' ? status : 'draft';
};

export const buildProjectSearchContext = ({ questions, teams, language = DEFAULT_LANGUAGE, t, currencyTable, verdictOf } = {}) => ({
  questionsById: indexQuestions(questions),
  teamsById: new Map((Array.isArray(teams) ? teams : []).filter((team) => team && team.id).map((team) => [team.id, team])),
  language,
  t: typeof t === 'function' ? t : (key) => key,
  resolveRate: buildRateResolver(currencyTable),
  verdictOf
});

export const resolveProjectSearchCell = (column, project, ctx) => (
  column.kind === 'builtin' ? resolveBuiltinCell(column, project, ctx) : resolveCustomCell(column, project, ctx)
);

// Texte de recherche « tous les champs » : nom, porteur et co-porteurs, toutes les réponses telles
// que la synthèse les affiche (libellés des options cochées compris), équipes, statut et verdict.
const buildHaystack = (project, cells, ctx) => {
  const answers = project?.answers || {};
  const parts = [project?.projectName, project?.id, project?.ownerEmail, formatOwnerLabel(project?.ownerEmail)];
  (Array.isArray(project?.sharedWith) ? project.sharedWith : []).forEach((email) => {
    parts.push(email, formatOwnerLabel(email));
  });
  Object.entries(answers).forEach(([key, value]) => {
    if (key.startsWith('__') || key.endsWith('__number_unit') || isEmptyAnswer(value)) {
      return;
    }
    const question = ctx.questionsById.get(key);
    if (question) {
      parts.push(safeFormat(question, value, ctx.language));
      return;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      parts.push(stripTags(value));
    } else if (Array.isArray(value)) {
      parts.push(value.filter((entry) => typeof entry === 'string' || typeof entry === 'number').join(' '));
    }
  });
  Object.values(cells).forEach((cell) => parts.push(cell.display));
  return foldSearchText(parts.map(toText).join(' \n '));
};

export const buildProjectSearchRows = (projects, columns, ctx) => (Array.isArray(projects) ? projects : [])
  .filter((project) => project && project.id && !project.isDemo)
  .map((project) => {
    const cells = {};
    (Array.isArray(columns) ? columns : []).forEach((column) => {
      cells[column.id] = resolveProjectSearchCell(column, project, ctx);
    });
    // Les colonnes intégrées servent aussi aux graphiques et aux filtres même quand elles ne
    // sont pas affichées : on les calcule toujours.
    BUILTIN_COLUMN_IDS.forEach((builtinId) => {
      const key = `builtin-${builtinId}`;
      if (!cells[key]) {
        cells[key] = resolveBuiltinCell({ builtinId }, project, ctx);
      }
    });
    return { id: project.id, project, cells, haystack: buildHaystack(project, cells, ctx) };
  });

// --- Recherche, filtres, tri --------------------------------------------------------------

export const matchesProjectSearchQuery = (row, query) => {
  const tokens = foldSearchText(query).split(/\s+/).filter(Boolean);
  return tokens.every((token) => row.haystack.includes(token));
};

const isFilterActive = (filter) => {
  if (!isPlainObject(filter)) {
    return false;
  }
  return (Array.isArray(filter.values) && filter.values.length > 0)
    || Boolean(filter.from) || Boolean(filter.to)
    || toFiniteNumber(filter.min) !== null || toFiniteNumber(filter.max) !== null
    || Boolean(toText(filter.contains).trim());
};

export const countActiveFilters = (filters) => Object.values(isPlainObject(filters) ? filters : {}).filter(isFilterActive).length;

export const listActiveFilterIds = (filters) => Object.entries(isPlainObject(filters) ? filters : {})
  .filter(([, filter]) => isFilterActive(filter))
  .map(([columnId]) => columnId);

const matchesFilter = (cell, filter, kind) => {
  if (!isFilterActive(filter)) {
    return true;
  }
  const safeCell = cell || emptyCell();
  if (kind === 'enum') {
    const values = Array.isArray(filter.values) ? filter.values : [];
    if (values.length === 0) {
      return true;
    }
    if (safeCell.values.length === 0) {
      return values.includes(EMPTY_FILTER_VALUE);
    }
    return safeCell.values.some((value) => values.includes(value));
  }
  if (kind === 'date') {
    const day = safeCell.date;
    if (!day) {
      return false;
    }
    return (!filter.from || day >= filter.from) && (!filter.to || day <= filter.to);
  }
  if (kind === 'number') {
    const min = toFiniteNumber(filter.min);
    const max = toFiniteNumber(filter.max);
    if (min === null && max === null) {
      return true;
    }
    if (safeCell.number === null) {
      return false;
    }
    return (min === null || safeCell.number >= min) && (max === null || safeCell.number <= max);
  }
  const needle = foldSearchText(filter.contains).trim();
  return !needle || foldSearchText(safeCell.display).includes(needle);
};

export const filterProjectSearchRows = (rows, { query = '', filters = {}, columns = [], questions = [] } = {}) => {
  const byId = indexQuestions(questions);
  const kinds = new Map(columns.map((column) => [column.id, getColumnKind(column, byId)]));
  BUILTIN_COLUMN_IDS.forEach((builtinId) => {
    const key = `builtin-${builtinId}`;
    if (!kinds.has(key)) {
      kinds.set(key, BUILTIN_COLUMNS[builtinId].kind);
    }
  });
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => matchesProjectSearchQuery(row, query))
    .filter((row) => Object.entries(isPlainObject(filters) ? filters : {})
      .every(([columnId, filter]) => !kinds.has(columnId) || matchesFilter(row.cells[columnId], filter, kinds.get(columnId))));
};

// Liste des valeurs proposées par un filtre à choix : celles réellement présentes dans les lignes.
export const listColumnFilterValues = (rows, columnId) => {
  const counts = new Map();
  let empty = 0;
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const values = row.cells[columnId]?.values || [];
    if (values.length === 0) {
      empty += 1;
    }
    values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  });
  const entries = Array.from(counts, ([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value));
  return empty > 0 ? [...entries, { value: EMPTY_FILTER_VALUE, count: empty }] : entries;
};

const compareSortValues = (a, b) => {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  return toText(a).localeCompare(toText(b));
};

// Les valeurs vides vont toujours en fin de liste, quel que soit le sens du tri.
export const sortProjectSearchRows = (rows, { columnId = '', direction = 'asc' } = {}) => {
  const list = Array.isArray(rows) ? [...rows] : [];
  if (!columnId) {
    return list;
  }
  const factor = direction === 'desc' ? -1 : 1;
  return list.sort((rowA, rowB) => {
    const a = rowA.cells[columnId]?.sort;
    const b = rowB.cells[columnId]?.sort;
    const emptyA = a === null || a === undefined || a === '';
    const emptyB = b === null || b === undefined || b === '';
    if (emptyA || emptyB) {
      return emptyA === emptyB ? 0 : emptyA ? 1 : -1;
    }
    return compareSortValues(a, b) * factor;
  });
};

// --- Indicateurs et graphiques -------------------------------------------------------------

// Unités distinctes des montants d'une colonne ('' = sans unité). Une colonne qui a une unité
// convertit tout dans celle-ci et n'en a donc qu'une ; plusieurs veulent dire qu'aucun total
// n'a de sens.
export const listNumberCellUnits = (rows, columnId) => {
  const units = new Set();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const cell = row?.cells?.[columnId];
    if (cell && typeof cell.number === 'number') {
      units.add(cell.unit || '');
    }
  });
  return Array.from(units);
};

export const computeProjectSearchTotals = (rows, kpiColumnId = '') => {
  const list = Array.isArray(rows) ? rows : [];
  if (!kpiColumnId) {
    return { count: list.length, sum: null, filledCount: 0, unconvertedCount: 0, mixedCount: 0, mixedUnits: [], unit: '' };
  }
  let sum = 0;
  let filledCount = 0;
  let unconvertedCount = 0;
  let mixedCount = 0;
  list.forEach((row) => {
    const cell = row.cells[kpiColumnId];
    if (cell && typeof cell.number === 'number') {
      sum += cell.number;
      filledCount += 1;
    } else if (cell?.unconverted) {
      unconvertedCount += 1;
    } else if (cell?.mixedUnits) {
      mixedCount += 1;
    }
  });
  const units = listNumberCellUnits(list, kpiColumnId);
  if (units.length > 1) {
    return { count: list.length, sum: null, filledCount, unconvertedCount, mixedCount, mixedUnits: units, unit: '' };
  }
  return { count: list.length, sum: filledCount ? sum : null, filledCount, unconvertedCount, mixedCount, mixedUnits: [], unit: units[0] || '' };
};

// Un graphique en somme ou moyenne sur des montants d'unités différentes additionnerait des
// chiffres incomparables : il est refusé, avec la liste des unités en cause.
export const getChartMixedUnits = (rows, chart) => {
  if (!chart || chart.measure === 'count' || !chart.measureColumnId) {
    return [];
  }
  const units = listNumberCellUnits(rows, chart.measureColumnId);
  return units.length > 1 ? units : [];
};

const groupKeysOf = (cell, kind, bucket) => {
  if (!cell) {
    return [];
  }
  if (kind === 'date') {
    if (!cell.date) {
      return [];
    }
    return [bucket === 'year' ? cell.date.slice(0, 4) : cell.date.slice(0, 7)];
  }
  if (kind === 'number') {
    return cell.display ? [cell.display] : [];
  }
  return cell.values.filter(Boolean);
};

// Une ligne par groupe. Un projet qui porte plusieurs valeurs (choix multiple, équipes) compte
// dans chacun de ses groupes ; les projets sans valeur forment le groupe « Non renseigné ».
export const computeProjectSearchChartData = (rows, chart, { columns = [], questions = [], language = DEFAULT_LANGUAGE } = {}) => {
  if (!chart) {
    return [];
  }
  const byId = indexQuestions(questions);
  const allColumns = [...columns, ...BUILTIN_COLUMN_IDS.map(builtin)];
  const groupColumn = allColumns.find((column) => column.id === chart.groupBy);
  if (!groupColumn) {
    return [];
  }
  const kind = getColumnKind(groupColumn, byId);
  const groups = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const keys = groupKeysOf(row.cells[chart.groupBy], kind, chart.dateBucket);
    const measured = chart.measure === 'count' ? 1 : row.cells[chart.measureColumnId]?.number;
    (keys.length ? keys : [EMPTY_FILTER_VALUE]).forEach((key) => {
      const group = groups.get(key) || { key, count: 0, total: 0, measuredCount: 0 };
      group.count += 1;
      if (typeof measured === 'number') {
        group.total += measured;
        group.measuredCount += 1;
      }
      groups.set(key, group);
    });
  });

  let entries = Array.from(groups.values()).map((group) => {
    const value = chart.measure === 'count'
      ? group.count
      : chart.measure === 'avg'
        ? (group.measuredCount ? group.total / group.measuredCount : 0)
        : group.total;
    return {
      key: group.key,
      label: group.key === EMPTY_FILTER_VALUE ? '' : (kind === 'date' ? formatBucket(group.key, chart.dateBucket, language) : group.key),
      value,
      count: group.count
    };
  });

  if (kind === 'date') {
    entries.sort((a, b) => (a.key === EMPTY_FILTER_VALUE ? 1 : b.key === EMPTY_FILTER_VALUE ? -1 : a.key.localeCompare(b.key)));
    return entries;
  }
  entries.sort((a, b) => (b.value - a.value) || a.label.localeCompare(b.label));
  if (entries.length > MAX_CHART_GROUPS) {
    const kept = entries.slice(0, MAX_CHART_GROUPS - 1);
    const rest = entries.slice(MAX_CHART_GROUPS - 1);
    const restCount = rest.reduce((total, entry) => total + entry.count, 0);
    const restValue = chart.measure === 'avg'
      ? rest.reduce((total, entry) => total + entry.value * entry.count, 0) / (restCount || 1)
      : rest.reduce((total, entry) => total + entry.value, 0);
    entries = [...kept, { key: OTHER_GROUP_KEY, label: '', value: restValue, count: restCount }];
  }
  return entries;
};

// --- Export ---------------------------------------------------------------------------------

// Lignes d'export : en-têtes = noms de colonnes affichés, nombres en nombres, dates en dates.
export const buildProjectSearchExportRows = (rows, columns, getColumnLabel, questions) => {
  const byId = indexQuestions(questions);
  const header = columns.map((column) => getColumnLabel(column));
  const body = (Array.isArray(rows) ? rows : []).map((row) => columns.map((column) => {
    const cell = row.cells[column.id] || emptyCell();
    const kind = getColumnKind(column, byId);
    if (kind === 'number' && typeof cell.number === 'number') {
      return { type: 'number', value: cell.number };
    }
    if (kind === 'date' && cell.date) {
      return { type: 'date', value: cell.date };
    }
    return { type: 'text', value: cell.display };
  }));
  return [header.map((value) => ({ type: 'text', value })), ...body];
};
