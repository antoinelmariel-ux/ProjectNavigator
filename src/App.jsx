import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from './react.js';
import { AnnotationLayer } from './components/AnnotationLayer.jsx';
import {
  LazyBackOffice,
  LazyProjectShowcase,
  LazyHomeScreen,
  LazyInspirationForm,
  LazyInspirationDetail,
  LazyQuestionnaireScreen,
  LazySynthesisReport,
  LazyOnboardingScreen,
  LoadingFallback
} from './lazyComponents.jsx';
import { Link, Lock, MessageSquare, Settings, Sparkles, UserCircle } from './components/icons.js';
import { MandatoryQuestionsSummary } from './components/MandatoryQuestionsSummary.jsx';
import { ActivityScopeSelector } from './components/ActivityScopeSelector.jsx';
import { useLanguage, LanguageContext } from './i18n/LanguageContext.jsx';
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, getLocaleTag } from './i18n/languages.js';
import { initialQuestions } from './data/questions.js';
import { initialRules } from './data/rules.js';
import { initialRiskLevelRules } from './data/riskLevelRules.js';
import { initialRiskWeights } from './data/riskWeights.js';
import { initialTeams } from './data/teams.js';
import { initialShowcaseThemes } from './data/showcaseThemes.js';
import { initialOnboardingTourConfig } from './data/onboardingTour.js';
import { initialValidationCommitteeConfig } from './data/validationCommitteeConfig.js';
import { initialAdminEmails } from './data/adminEmails.js';
import { loadPersistedState, persistState } from './utils/storage.js';
import { shouldShowQuestion as shouldShowQuestionBase, withActivityScope } from './utils/questions.js';
import { analyzeAnswers as analyzeAnswersBase, resolveProjectAnalysis } from './utils/rules.js';
import { extractProjectName } from './utils/projects.js';
import { createDemoProject, demoProjectAnswersSnapshot } from './data/demoProject.js';
import { normalizeRiskWeighting } from './utils/risk.js';
import { normalizeEmail } from './utils/normalizeEmail.js';
import { normalizeProjectEntry, normalizeProjectsCollection } from './utils/projectNormalization.js';
import {
  createDefaultProjectFiltersConfig,
  normalizeProjectFilterConfig,
  stripRetiredProjectFilterFields
} from './utils/projectFilters.js';
import { normalizeOnboardingConfig } from './utils/onboarding.js';
import {
  createDefaultInspirationFiltersConfig,
  createDefaultInspirationFormConfig,
  normalizeInspirationFiltersConfig,
  normalizeInspirationFormConfig
} from './utils/inspirationConfig.js';
import { exportInspirationToFile } from './utils/inspirationExport.js';
import { normalizeValidationCommitteeConfig } from './utils/validationCommittee.js';
import { isShowcaseAccessBlockedByProjectType } from './utils/showcase.js';
import { normalizeTeamContacts } from './utils/teamContacts.js';
import { normalizeRulesTeamReferences } from './utils/teamIds.js';
import { getCurrentUser } from './utils/spContext.js';
import { dataProvider } from './utils/dataProvider.js';
import { inspirationDataProvider } from './utils/inspirationDataProvider.js';
import { projectMembersProvider } from './utils/projectMembersProvider.js';
import { userProfileProvider } from './utils/userProfileProvider.js';
import { showcaseStickyNotesProvider } from './utils/showcaseStickyNotesProvider.js';
import { complianceCommentsProvider } from './utils/complianceCommentsProvider.js';
import { rulesProvider } from './utils/rulesProvider.js';
import { teamsProvider } from './utils/teamsProvider.js';
import { mergeComplianceComments } from './utils/mergeComplianceComments.js';
import { createAutosaveQueue } from './utils/autosaveQueue.js';
import { createRetryQueue } from './utils/retryQueue.js';
import {
  diagnoseSharePointInstallation,
  reinitializeSharePointConfiguration
} from './utils/sharePointSetup.js';
import { isSharePointMode } from './config/sharepointConfig.js';
import { loadReferentials } from './utils/referentialStore.js';
import { mergeServerAndLocalProjects } from './utils/syncMerge.js';
import { queueNotification } from './utils/notificationQueue.js';
import { NOTIFICATION_TYPES, buildNotification } from './utils/notificationTemplates.js';
const HEADER_LOGO_PATH = './src/components/logo.png';

const APP_VERSION = 'v1.0.385';

class AdminBackOfficeErrorBoundary extends React.Component {
  static contextType = LanguageContext;

  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error('Erreur lors du chargement du back-office :', error);
    }
  }

  handleRecovery = () => {
    this.setState({ hasError: false });
    if (typeof this.props.onRecover === 'function') {
      this.props.onRecover();
    }
  };

  render() {
    if (this.state.hasError) {
      const t = this.context && typeof this.context.t === 'function' ? this.context.t : (key) => key;
      return (
        <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-red-700">{t('app.backOfficeErrorBoundary.title')}</h2>
          <p className="mt-2 text-sm text-gray-600">{t('app.backOfficeErrorBoundary.message')}</p>
          <button
            type="button"
            onClick={this.handleRecovery}
            className="mt-4 inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            {t('app.backOfficeErrorBoundary.backButton')}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const resolveShowcaseDisplayMode = (value) => {
  if (value === 'light') {
    return 'light';
  }
  if (value === 'full') {
    return 'full';
  }
  return null;
};

const loadScript = (src) => {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('Document indisponible.'));
  }

  const existingScript = document.querySelector(`script[data-lazy-src="${src}"]`);
  if (existingScript) {
    if (existingScript.dataset.loaded === 'true') {
      return Promise.resolve();
    }

    if (existingScript.dataset.failed === 'true') {
      existingScript.remove();
      return loadScript(src);
    }

    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error(`Impossible de charger ${src}.`)), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.lazySrc = src;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => {
      script.dataset.failed = 'true';
      reject(new Error(`Impossible de charger ${src}.`));
    }, { once: true });
    document.head.appendChild(script);
  });
};

const ensureTourGuideAssets = async () => {
  if (typeof window === 'undefined') {
    return false;
  }

  if (window.TourGuideClient) {
    return true;
  }

  if (typeof document !== 'undefined' && !document.querySelector('link[data-tourguide-css="true"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './src/styles/tourguide.css';
    link.dataset.tourguideCss = 'true';
    document.head.appendChild(link);
  }

  await loadScript('./src/vendor/tourguide.js');
  return typeof window.TourGuideClient === 'function';
};

const ANNOTATION_COLORS = [
  '#2563eb',
  '#ec4899',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#0ea5e9',
  '#14b8a6',
  '#ef4444',
  '#ea580c'
];

const BACK_OFFICE_PASSWORD_HASH = '3c5b8c6aaa89db61910cdfe32f1bdb193d1923146dbd6a7b0634a32ab73ac1af';
const BACK_OFFICE_PASSWORD_FALLBACK_DIGEST = '86ceec83';

const computeBackOfficePasswordDigest = async (value) => {
  if (typeof value !== 'string' || value.length === 0) {
    return '';
  }

  const globalCrypto =
    typeof globalThis !== 'undefined' && typeof globalThis.crypto !== 'undefined'
      ? globalThis.crypto
      : undefined;

  const hasSubtleCrypto =
    !!globalCrypto?.subtle && typeof TextEncoder !== 'undefined';

  if (hasSubtleCrypto) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(value);
      const digest = await globalCrypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(digest))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
    } catch (error) {
      // Fallback defined below
    }
  }

  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16).padStart(8, '0');
};

const verifyBackOfficePassword = async (value) => {
  const digest = await computeBackOfficePasswordDigest(value);

  if (!digest) {
    return false;
  }

  if (digest.length === BACK_OFFICE_PASSWORD_HASH.length) {
    return digest === BACK_OFFICE_PASSWORD_HASH;
  }

  return digest === BACK_OFFICE_PASSWORD_FALLBACK_DIGEST;
};

const COMPLIANCE_COMMENTS_KEY = '__compliance_team_comments__';
const SHOWCASE_COMMENT_EDIT_DEBOUNCE_MS = 1200;

const normalizeRecipientList = (emails = []) => {
  const unique = new Set();
  (Array.isArray(emails) ? emails : []).forEach((email) => {
    const normalized = normalizeEmail(email);
    if (normalized) {
      unique.add(normalized);
    }
  });
  return Array.from(unique);
};

const cloneDeep = (value) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch (error) {
      // Fallback to JSON strategy below
    }
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return value;
  }
};

const clamp01 = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
};

const createAnnotationId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `note-${Date.now()}-${Math.round(Math.random() * 100000)}`;
};


const formatSyncStatusLabel = (syncStatus, t) => {
  const state = syncStatus?.state;
  if (state === 'syncing') return t('app.sync.syncing');
  if (state === 'offline') return t('app.sync.offline');
  if (state === 'conflict') return t('app.sync.conflict');
  return t('app.sync.synced');
};

const formatSyncMeta = (syncStatus, t, language) => {
  if (!syncStatus?.updatedAt) return '';

  const date = new Date(syncStatus.updatedAt);
  const time = Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString(getLocaleTag(language), { hour: '2-digit', minute: '2-digit' });

  if (!time) return '';
  if (syncStatus.updatedBy) {
    return t('app.sync.lastModifiedBy', { user: syncStatus.updatedBy, time });
  }
  return t('app.sync.lastModifiedAt', { time });
};

const createInspirationId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `inspiration-${Date.now()}-${Math.round(Math.random() * 100000)}`;
};

const buildAnnotationContextKey = ({ screen, projectId, scope }) => {
  const base = screen === 'showcase' ? `showcase:${projectId || 'unknown'}` : screen;

  if (screen === 'showcase' && scope) {
    return `${base}:${scope}`;
  }

  return base || 'global';
};

const restoreShowcaseQuestions = (currentQuestions, referenceQuestions = initialQuestions) => {
  if (!Array.isArray(currentQuestions)) {
    return referenceQuestions;
  }

  const nextQuestions = currentQuestions.slice();
  let changed = false;

  referenceQuestions.forEach((referenceQuestion, referenceIndex) => {
    if (!referenceQuestion || !referenceQuestion.showcase) {
      return;
    }

    const existingIndex = nextQuestions.findIndex((item) => item && item.id === referenceQuestion.id);

    if (existingIndex === -1) {
      const clonedQuestion = cloneDeep(referenceQuestion);
      const insertionIndex = Math.min(referenceIndex, nextQuestions.length);
      nextQuestions.splice(insertionIndex, 0, clonedQuestion);
      changed = true;
      return;
    }

    const existingQuestion = nextQuestions[existingIndex];
    const existingShowcaseMeta = existingQuestion && existingQuestion.showcase;
    const referenceShowcaseMeta = referenceQuestion.showcase;

    const showcaseMetaDiffers =
      !existingShowcaseMeta ||
      JSON.stringify(existingShowcaseMeta) !== JSON.stringify(referenceShowcaseMeta);

    if (showcaseMetaDiffers) {
      nextQuestions[existingIndex] = {
        ...existingQuestion,
        showcase: cloneDeep(referenceShowcaseMeta)
      };
      changed = true;
    }
  });

  return changed ? nextQuestions : currentQuestions;
};


const isAnswerProvided = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return value !== null && value !== undefined;
};

const computeMandatoryProgress = (questions = [], answers = {}) => {
  const mandatoryQuestions = Array.isArray(questions)
    ? questions.filter(question => question?.required)
    : [];

  const totalMandatoryQuestions = mandatoryQuestions.length;
  const answeredMandatoryQuestions = mandatoryQuestions.filter(
    question => question?.id && isAnswerProvided(answers[question.id])
  ).length;

  return {
    totalMandatoryQuestions,
    answeredMandatoryQuestions
  };
};

const areAnswersEqual = (previousValue, nextValue) => {
  if (previousValue === nextValue) {
    return true;
  }

  if (Array.isArray(previousValue) && Array.isArray(nextValue)) {
    try {
      return JSON.stringify(previousValue) === JSON.stringify(nextValue);
    } catch (error) {
      if (previousValue.length !== nextValue.length) {
        return false;
      }
      return previousValue.every((entry, index) => entry === nextValue[index]);
    }
  }

  if (
    previousValue &&
    nextValue &&
    typeof previousValue === 'object' &&
    typeof nextValue === 'object'
  ) {
    try {
      return JSON.stringify(previousValue) === JSON.stringify(nextValue);
    } catch (error) {
      return false;
    }
  }

  return false;
};

const findQuestionById = (questions, id) => {
  if (!Array.isArray(questions)) {
    return null;
  }

  return questions.find(question => question?.id === id) || null;
};

const normalizeMilestoneListValue = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(item => ({
      date: typeof item?.date === 'string' ? item.date.trim() : '',
      description: typeof item?.description === 'string' ? item.description.trim() : ''
    }))
    .filter(entry => entry.date.length > 0 || entry.description.length > 0)
    .map(entry => ({
      date: entry.date,
      description: entry.description
    }));
};

const areMilestoneListsEqual = (previousValue, nextValue) => {
  if (previousValue.length !== nextValue.length) {
    return false;
  }

  return previousValue.every((entry, index) => {
    const nextEntry = nextValue[index];
    if (!nextEntry) {
      return false;
    }

    return entry.date === nextEntry.date && entry.description === nextEntry.description;
  });
};

const applyAnswerUpdates = (
  prevAnswers = {},
  updates,
  questions,
  predicate,
  options = {}
) => {
  if (!updates || typeof updates !== 'object') {
    return { nextAnswers: prevAnswers, changed: false };
  }

  const entries = Object.entries(updates);
  if (entries.length === 0) {
    return { nextAnswers: prevAnswers, changed: false };
  }

  const nextAnswers = { ...prevAnswers };
  let changed = false;

  entries.forEach(([questionId, value]) => {
    if (!questionId) {
      return;
    }

    const question = findQuestionById(questions, questionId);
    const questionType = question?.type;

    if (questionType === 'milestone_list') {
      const normalizedValue = normalizeMilestoneListValue(value);
      const previousRawValue = nextAnswers[questionId];
      const previousValue = Array.isArray(previousRawValue)
        ? normalizeMilestoneListValue(previousRawValue)
        : [];
      const previousRawJson = JSON.stringify(Array.isArray(previousRawValue) ? previousRawValue : []);
      const normalizedJson = JSON.stringify(normalizedValue);

      if (normalizedValue.length > 0) {
        if (!areMilestoneListsEqual(previousValue, normalizedValue) || previousRawJson !== normalizedJson) {
          changed = true;
          nextAnswers[questionId] = normalizedValue;
        }
      } else if (questionId in nextAnswers) {
        changed = true;
        delete nextAnswers[questionId];
      }

      return;
    }

    if (Array.isArray(value)) {
      const filtered = value
        .map(item => (typeof item === 'string' ? item.trim() : item))
        .filter(item => {
          if (typeof item === 'string') {
            return item.length > 0;
          }
          return item !== null && item !== undefined;
        });

      const previousValue = nextAnswers[questionId];
      const arraysAreEqual = Array.isArray(previousValue)
        && previousValue.length === filtered.length
        && previousValue.every((item, index) => item === filtered[index]);

      if (filtered.length > 0) {
        if (!arraysAreEqual) {
          changed = true;
        }
        nextAnswers[questionId] = filtered;
      } else if (questionId in nextAnswers) {
        changed = true;
        delete nextAnswers[questionId];
      }

      return;
    }

    if (value === null || value === undefined) {
      if (questionId in nextAnswers) {
        changed = true;
        delete nextAnswers[questionId];
      }
      return;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        if (nextAnswers[questionId] !== value) {
          changed = true;
          nextAnswers[questionId] = value;
        }
      } else if (questionId in nextAnswers) {
        changed = true;
        delete nextAnswers[questionId];
      }
      return;
    }

    if (nextAnswers[questionId] !== value) {
      changed = true;
      nextAnswers[questionId] = value;
    }
  });

  if (!changed) {
    return { nextAnswers: prevAnswers, changed: false };
  }

  const canEvaluatePredicate = typeof predicate === 'function';
  const shouldPreserveQuestion = typeof options.shouldPreserveQuestion === 'function'
    ? options.shouldPreserveQuestion
    : null;
  const questionsToRemove = Array.isArray(questions) && canEvaluatePredicate
    ? questions
        .filter(question => {
          if (!question || !question.id) {
            return false;
          }

          const wasVisible = predicate(question, prevAnswers);
          const isVisible = predicate(question, nextAnswers);

          if (isVisible) {
            return false;
          }

          if (shouldPreserveQuestion && shouldPreserveQuestion(question, {
            prevAnswers,
            nextAnswers
          })) {
            return false;
          }

          if (wasVisible) {
            return true;
          }

          return isAnswerProvided(nextAnswers[question.id]) || isAnswerProvided(prevAnswers[question.id]);
        })
        .map(question => question.id)
    : [];

  if (questionsToRemove.length > 0) {
    questionsToRemove.forEach(questionId => {
      if (questionId in nextAnswers) {
        changed = true;
        delete nextAnswers[questionId];
      }
    });
  }

  return { nextAnswers, changed };
};

const resolveFallbackQuestionsLength = (savedState, currentQuestionsLength = initialQuestions.length) => {
  if (savedState && Array.isArray(savedState.questions) && savedState.questions.length > 0) {
    return savedState.questions.length;
  }

  return currentQuestionsLength;
};

const buildInitialProjectsState = () => {
  const savedState = loadPersistedState();

  const providerProjects = typeof dataProvider?.listProjectsSync === 'function'
    ? normalizeProjectsCollection(dataProvider.listProjectsSync(), initialQuestions.length)
    : [];

  if (!savedState) {
    if (Array.isArray(providerProjects) && providerProjects.length > 0) {
      return providerProjects;
    }

    // En mode SharePoint, l’hydratation serveur arrive juste après : ne pas semer de
    // projet de démo, sinon l’autosave peut l’écrire pour de vrai avant que le serveur réponde.
    return isSharePointMode() ? [] : [createDemoProject()];
  }

  const fallbackQuestions = Array.isArray(savedState.questions) ? savedState.questions : initialQuestions;
  const fallbackRules = Array.isArray(savedState.rules)
    ? normalizeRulesTeamReferences(savedState.rules)
    : initialRules;
  const fallbackRiskLevelRules = Array.isArray(savedState.riskLevelRules)
    ? savedState.riskLevelRules
    : initialRiskLevelRules;
  const fallbackRiskWeights = savedState && typeof savedState.riskWeights === 'object'
    ? normalizeRiskWeighting(savedState.riskWeights)
    : initialRiskWeights;
  const fallbackQuestionsLength = resolveFallbackQuestionsLength(savedState, fallbackQuestions.length);

  const normalizedProjects = normalizeProjectsCollection(savedState.projects, fallbackQuestionsLength)
    || normalizeProjectsCollection(savedState.submittedProjects, fallbackQuestionsLength);

  if (normalizedProjects && normalizedProjects.length > 0) {
    return normalizedProjects;
  }

  if (Array.isArray(providerProjects) && providerProjects.length > 0) {
    return providerProjects;
  }

  if (isSharePointMode()) {
    return [];
  }

  return [createDemoProject({
    questions: fallbackQuestions,
    rules: fallbackRules,
    riskLevelRules: fallbackRiskLevelRules,
    riskWeights: fallbackRiskWeights
  })];
};

const getStoredInspirationProjects = () => {
  const savedState = loadPersistedState();
  if (savedState && Array.isArray(savedState.inspirationProjects)) {
    return cloneDeep(savedState.inspirationProjects);
  }

  // En mode SharePoint la lecture est asynchrone : l’hydratation réconcilie ensuite.
  return typeof inspirationDataProvider?.listInspirationsSync === 'function'
    ? cloneDeep(inspirationDataProvider.listInspirationsSync())
    : [];
};

const buildInitialOnboardingConfig = () => {
  const savedState = loadPersistedState();
  if (savedState && savedState.onboardingTourConfig) {
    return normalizeOnboardingConfig(savedState.onboardingTourConfig);
  }

  return cloneDeep(initialOnboardingTourConfig);
};

const buildInitialValidationCommitteeConfig = () => {
  const savedState = loadPersistedState();
  if (savedState && savedState.validationCommitteeConfig) {
    return normalizeValidationCommitteeConfig(savedState.validationCommitteeConfig);
  }

  return normalizeValidationCommitteeConfig(initialValidationCommitteeConfig);
};

const buildInitialAdminEmailsState = () => {
  const savedState = loadPersistedState();
  if (savedState && Array.isArray(savedState.adminEmails)) {
    return savedState.adminEmails;
  }

  return cloneDeep(initialAdminEmails);
};

const isOnboardingProject = (project) => {
  if (!project || typeof project !== 'object') {
    return false;
  }

  const { id } = project;
  if (typeof id !== 'string' || id.length === 0) {
    return false;
  }

  return id === 'onboarding-demo' || id.startsWith('tour-');
};

const sanitizeRestoredProjects = (projects) => {
  if (!Array.isArray(projects)) {
    return [];
  }

  const restored = projects.filter(project => !isOnboardingProject(project));

  if (restored.length === 0) {
    return [];
  }

  return cloneDeep(restored);
};

export const App = () => {
  const { language, setLanguage, t } = useLanguage();
  const [mode, setMode] = useState('user');
  const [screen, setScreen] = useState('home');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [projects, setProjects] = useState(buildInitialProjectsState);
  const projectsRef = useRef(projects);
  const [inspirationProjects, setInspirationProjects] = useState(() => []);
  const [hasLoadedInspirationProjects, setHasLoadedInspirationProjects] = useState(false);
  const [onboardingTourConfig, setOnboardingTourConfig] = useState(buildInitialOnboardingConfig);
  const [activeInspirationId, setActiveInspirationId] = useState(null);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [saveFeedback, setSaveFeedback] = useState(null);
  const [showcaseProjectContext, setShowcaseProjectContext] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ state: 'synced', updatedAt: null, updatedBy: '' });
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator === 'undefined' || navigator.onLine !== false
  );
  const [returnToSynthesisAfterEdit, setReturnToSynthesisAfterEdit] = useState(false);
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [onboardingStepId, setOnboardingStepId] = useState(null);
  const [tourGuideStatus, setTourGuideStatus] = useState('loading');
  const tourInstanceRef = useRef(null);
  const onboardingStateRef = useRef(null);
  const onboardingDemoDataRef = useRef(null);
  const isOnboardingActiveRef = useRef(false);

  const [questions, setQuestions] = useState(() => restoreShowcaseQuestions(initialQuestions));
  const [rules, setRules] = useState(initialRules);
  const [riskLevelRules, setRiskLevelRules] = useState(initialRiskLevelRules);
  const [riskWeights, setRiskWeights] = useState(() => normalizeRiskWeighting(initialRiskWeights));
  const [teams, setTeams] = useState(initialTeams);
  const [showcaseThemes, setShowcaseThemes] = useState(initialShowcaseThemes);
  const [projectFilters, setProjectFiltersState] = useState(() => createDefaultProjectFiltersConfig());
  const [inspirationFilters, setInspirationFilters] = useState(() => createDefaultInspirationFiltersConfig());
  const [inspirationFormFields, setInspirationFormFields] = useState(() => createDefaultInspirationFormConfig());
  const [homeView, setHomeView] = useState('platform');
  const [isHydrated, setIsHydrated] = useState(false);
  const [sharePointSync, setSharePointSync] = useState(() =>
    isSharePointMode() ? { state: 'loading', message: '' } : { state: 'local-only', message: '' }
  );
  const [persistenceError, setPersistenceError] = useState(false);
  const [validationCommitteeConfig, setValidationCommitteeConfig] = useState(buildInitialValidationCommitteeConfig);
  const [adminEmails, setAdminEmails] = useState(buildInitialAdminEmailsState);
  const [isBackOfficeUnlocked, setIsBackOfficeUnlocked] = useState(false);
  const [backOfficeAuthError, setBackOfficeAuthError] = useState(null);
  const [isBackOfficePromptOpen, setIsBackOfficePromptOpen] = useState(false);
  const [backOfficePromptValue, setBackOfficePromptValue] = useState('');
  const [backOfficePromptError, setBackOfficePromptError] = useState('');

  const normalizedOnboardingConfig = useMemo(
    () => normalizeOnboardingConfig(onboardingTourConfig),
    [onboardingTourConfig]
  );
  const normalizedAdminEmails = useMemo(
    () => (Array.isArray(adminEmails) ? adminEmails.map(normalizeEmail).filter(Boolean) : []),
    [adminEmails]
  );
  // Résolu par main.jsx avant le premier rendu : référence stable pour toute la vie de l’app.
  const currentUser = getCurrentUser();
  const currentUserEmail = useMemo(
    () => normalizeEmail(currentUser?.mail || currentUser?.userPrincipalName || ''),
    [currentUser]
  );
  const currentUserDisplayName = useMemo(() => {
    const firstName = typeof currentUser?.givenName === 'string' ? currentUser.givenName.trim() : '';
    const lastName = typeof currentUser?.surname === 'string' ? currentUser.surname.trim() : '';
    const combined = `${firstName} ${lastName}`.trim();
    if (combined) {
      return combined;
    }
    const displayName = typeof currentUser?.displayName === 'string' ? currentUser.displayName.trim() : '';
    if (displayName) {
      return displayName;
    }
    return currentUserEmail;
  }, [currentUser, currentUserEmail]);
  const isCurrentUserAdmin = useMemo(
    () => !!currentUserEmail && normalizedAdminEmails.includes(currentUserEmail),
    [currentUserEmail, normalizedAdminEmails]
  );

  // Profil personnel (périmètre d'activité + langue préférée), chargé une fois depuis
  // SharePoint (ou le mock en dev). `userProfileLoadFailed` évite de bloquer toute l'app
  // derrière l'onboarding si le profil est simplement injoignable (coupure réseau).
  const [userProfile, setUserProfile] = useState(null);
  const [isUserProfileLoaded, setIsUserProfileLoaded] = useState(false);
  const [userProfileLoadFailed, setUserProfileLoadFailed] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileDraftScope, setProfileDraftScope] = useState([]);
  const activityScope = userProfile?.activityScope;

  useEffect(() => {
    if (isProfileModalOpen) {
      setProfileDraftScope(userProfile?.activityScope || []);
    }
  }, [isProfileModalOpen, userProfile]);

  // Injecte le périmètre d'activité de la personne connectée dans les réponses avant toute
  // évaluation de condition, sans jamais le persister dans les réponses réelles d'un projet.
  const shouldShowQuestion = useCallback(
    (question, answersForEvaluation) =>
      shouldShowQuestionBase(question, withActivityScope(answersForEvaluation, activityScope)),
    [activityScope]
  );
  const analyzeAnswers = useCallback(
    (answersForEvaluation, rulesArg, riskLevelRulesArg, riskWeightsArg) =>
      analyzeAnswersBase(
        withActivityScope(answersForEvaluation, activityScope),
        rulesArg,
        riskLevelRulesArg,
        riskWeightsArg
      ),
    [activityScope]
  );

  const backOfficePromptResolverRef = useRef(null);
  const [adminView, setAdminView] = useState('home');
  const showcaseShareInputRef = useRef(null);
  const [showcaseDisplayMode, setShowcaseDisplayMode] = useState('full');
  const [showcaseDisplayModeLock, setShowcaseDisplayModeLock] = useState(null);
  const [showcaseShareMode, setShowcaseShareMode] = useState('full');
  const [showcaseShareCommentsEnabled, setShowcaseShareCommentsEnabled] = useState(false);
  const [showcaseShareAnnotationVisibility, setShowcaseShareAnnotationVisibility] = useState('all');
  const [isShowcaseSharedView, setIsShowcaseSharedView] = useState(false);
  const [showcaseCommentsEnabled, setShowcaseCommentsEnabled] = useState(false);
  const [showcaseAnnotationVisibilityMode, setShowcaseAnnotationVisibilityMode] = useState('all');
  const previousScreenRef = useRef(null);
  const pendingShowcaseDisplayModeRef = useRef(null);
  const [isAnnotationModeEnabled, setIsAnnotationModeEnabled] = useState(false);
  const [isAnnotationPaused, setIsAnnotationPaused] = useState(false);
  const [annotationNotes, setAnnotationNotes] = useState([]);
  const [annotationSources, setAnnotationSources] = useState({ session: ANNOTATION_COLORS[0] });
  const [showcaseAnnotationScope, setShowcaseAnnotationScope] = useState('display-full');
  const [autoFocusAnnotationId, setAutoFocusAnnotationId] = useState(null);
  const [isShowcaseEditing, setIsShowcaseEditing] = useState(false);
  const [isShowcaseShareOpen, setIsShowcaseShareOpen] = useState(false);
  const [showcaseShareFeedback, setShowcaseShareFeedback] = useState('');
  const [sharePointReinitState, setSharePointReinitState] = useState({
    inProgress: false,
    message: '',
    status: 'idle'
  });
  const annotationNotesRef = useRef(annotationNotes);
  const loadedStylesRef = useRef(new Set());
  const pendingShowcaseProjectIdRef = useRef(null);
  const pendingShowcaseSharedRef = useRef(false);
  const pendingShowcaseCommentsRef = useRef(false);
  const pendingShowcaseAnnotationVisibilityRef = useRef('all');
  const autosaveQueueRef = useRef(null);
  const autosaveTimeoutRef = useRef(null);
  const showcaseCommentNotificationTimeoutsRef = useRef(new Map());
  const projectMembersQueueRef = useRef(null);
  const stickyNotesQueueRef = useRef(null);
  const complianceCommentsQueueRef = useRef(null);
  const userProfileQueueRef = useRef(null);
  const rulesQueueRef = useRef(null);
  const teamsQueueRef = useRef(null);
  // Métadonnées SharePoint (spItemId/RowVersion/SortOrder) par id de règle/équipe — jamais
  // injectées dans l'objet applicatif consommé par le moteur de règles (rules.js).
  const ruleServerMetaRef = useRef(new Map());
  const teamServerMetaRef = useRef(new Map());
  const loadedProjectMembersRef = useRef(new Set());
  const loadedStickyNotesRef = useRef(new Set());

  // Un projet chargé depuis le serveur n’embarque pas ses membres (CN_Projects n’a pas de
  // colonne dédiée) : on les charge à part, une seule fois par projet, à son ouverture.
  const loadProjectMembersIfNeeded = useCallback((projectId) => {
    if (!projectId || loadedProjectMembersRef.current.has(projectId) || !isSharePointMode()) {
      return;
    }

    loadedProjectMembersRef.current.add(projectId);

    projectMembersProvider
      .listMembers(projectId)
      .then((members) => {
        if (!Array.isArray(members)) {
          return;
        }
        setProjects((prevProjects) => prevProjects.map((project) => (
          project.id === projectId
            ? { ...project, sharedWith: members.map((member) => member.email) }
            : project
        )));
      })
      .catch((error) => {
        loadedProjectMembersRef.current.delete(projectId);
        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
          console.warn('[Membres] Chargement SharePoint impossible :', error);
        }
      });
  }, []);

  useEffect(() => {
    if (activeProjectId) {
      loadProjectMembersIfNeeded(activeProjectId);
    }
  }, [activeProjectId, loadProjectMembersIfNeeded]);

  const loadInspirationProjectsIfNeeded = useCallback(() => {
    if (hasLoadedInspirationProjects) {
      return;
    }

    setInspirationProjects(getStoredInspirationProjects());
    setHasLoadedInspirationProjects(true);

    if (isSharePointMode() && typeof inspirationDataProvider.listInspirations === 'function') {
      inspirationDataProvider
        .listInspirations()
        .then((entries) => {
          if (Array.isArray(entries) && entries.length > 0) {
            setInspirationProjects(entries);
          }
        })
        .catch((error) => {
          if (typeof console !== 'undefined' && typeof console.warn === 'function') {
            console.warn('[Inspirations] Chargement SharePoint impossible :', error);
          }
        });
    }
  }, [hasLoadedInspirationProjects]);

  const handleHomeViewChange = useCallback((nextHomeView) => {
    if (nextHomeView === 'inspiration') {
      loadInspirationProjectsIfNeeded();
    }

    setHomeView(nextHomeView);
  }, [loadInspirationProjectsIfNeeded]);

  const buildProjectUrl = useCallback((projectId) => {
    if (typeof window === 'undefined' || !window.location) {
      return '';
    }
    try {
      const url = new URL(window.location.href);
      url.hash = '';
      url.search = '';
      if (projectId) {
        url.searchParams.set('projectId', projectId);
      }
      return url.toString();
    } catch {
      return '';
    }
  }, []);

  // Point d’entrée unique de toutes les notifications. L’app n’envoie jamais d’e-mail :
  // elle dépose une demande dans CN_NotificationsQueue, traitée par un flux Power Automate.
  const notify = useCallback((descriptor = {}) => {
    const project = descriptor.project || {};
    const actorEmail = currentUserEmail;
    const includeActor = descriptor.includeActor === true;

    const to = normalizeRecipientList(descriptor.to || []).filter(
      (email) => includeActor || email !== actorEmail
    );
    const cc = normalizeRecipientList(descriptor.cc || []).filter(
      (email) => (includeActor || email !== actorEmail) && !to.includes(email)
    );

    if (to.length === 0 && cc.length === 0) {
      return;
    }

    let notification;
    try {
      notification = buildNotification({
        type: descriptor.type,
        projectName: project.projectName,
        projectId: project.id,
        actorName: currentUserDisplayName,
        actorEmail,
        ownerEmail: project.ownerEmail,
        teamNames: descriptor.teamNames,
        excerpt: descriptor.excerpt,
        appUrl: buildProjectUrl(project.id),
        occurredAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('[Notification] Gabarit introuvable :', error);
      return;
    }

    // Volontairement non bloquant : l’échec d’une notification ne doit jamais
    // annuler l’action métier de l’utilisateur.
    queueNotification({
      subject: notification.subject,
      body: notification.body,
      actionType: notification.actionType,
      to,
      cc,
      projectId: project.id || ''
    }).catch((error) => {
      console.warn('[Notification] Mise en file impossible :', error);
    });
  }, [buildProjectUrl, currentUserDisplayName, currentUserEmail]);

  const buildOwnerNotificationRecipients = useCallback((project) => {
    const owner = normalizeEmail(project?.ownerEmail);
    const sharedWith = Array.isArray(project?.sharedWith) ? project.sharedWith : [];
    const coOwners = normalizeRecipientList(sharedWith).filter((email) => email !== owner);

    return {
      to: owner ? [owner] : [],
      cc: coOwners
    };
  }, []);

  const notifyOwnerAndCoOwners = useCallback((project, type, options = {}) => {
    if (!project) {
      return;
    }

    const recipients = buildOwnerNotificationRecipients(project);
    notify({
      type,
      project,
      to: recipients.to,
      cc: recipients.cc,
      ...options
    });
  }, [buildOwnerNotificationRecipients, notify]);

  const notifyThreadLastAuthor = useCallback((payload = {}) => {
    const targetEmail = normalizeEmail(payload.targetEmail);
    if (!targetEmail || targetEmail === currentUserEmail) {
      return;
    }

    notify({
      type: payload.type,
      project: payload.project,
      to: [targetEmail],
      excerpt: payload.excerpt
    });
  }, [currentUserEmail, notify]);


  const ensureStylesheetLoaded = useCallback((href) => {
    if (typeof document === 'undefined' || !href) {
      return;
    }

    if (loadedStylesRef.current.has(href)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.dynamic = 'true';
    document.head.appendChild(link);
    loadedStylesRef.current.add(href);
  }, []);

  const isAnnotationUiInteraction = useCallback((event) => {
    const path = typeof event?.composedPath === 'function' ? event.composedPath() : [];
    if (Array.isArray(path) && path.length > 0) {
      return path.some(node => node instanceof Element && node.dataset?.annotationUi === 'true');
    }

    const target = event?.target;
    const element = target instanceof Element ? target : target?.parentElement;
    if (element?.closest) {
      return Boolean(element.closest('[data-annotation-ui="true"]'));
    }

    return false;
  }, []);

  useEffect(() => () => {
    showcaseCommentNotificationTimeoutsRef.current.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    showcaseCommentNotificationTimeoutsRef.current.clear();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleBeforeUnload = (event) => {
      if (!hasUnsavedChanges) {
        return undefined;
      }

      const message = t('app.beforeUnload.message');
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, t]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const { search, hash } = window.location;
    const params = new URLSearchParams(search || '');
    let projectId = params.get('projectId') || params.get('showcase');
    const rawShowcaseMode = params.get('showcaseMode');
    const resolvedShowcaseMode = resolveShowcaseDisplayMode(rawShowcaseMode);
    const rawShowcaseShared = params.get('showcaseShared');
    const rawShowcaseComments = params.get('showcaseComments');
    const rawShowcaseAnnotationVisibility = params.get('showcaseAnnotationVisibility');
    const isSharedView = rawShowcaseShared === '1' || rawShowcaseShared === 'true';
    const hasCommentsEnabled = rawShowcaseComments === '1' || rawShowcaseComments === 'true';
    const hasMineOnlyAnnotationVisibility = rawShowcaseAnnotationVisibility === 'mine';

    if (!projectId && typeof hash === 'string' && hash.length > 1) {
      const normalizedHash = hash.slice(1);
      if (normalizedHash.startsWith('showcase=')) {
        projectId = normalizedHash.replace(/^showcase=/, '');
      } else if (normalizedHash.startsWith('showcase:')) {
        projectId = normalizedHash.replace(/^showcase:/, '');
      }
    }

    if (projectId) {
      pendingShowcaseProjectIdRef.current = projectId;
    }

    if (resolvedShowcaseMode) {
      pendingShowcaseDisplayModeRef.current = resolvedShowcaseMode;
    }

    if (isSharedView) {
      pendingShowcaseSharedRef.current = true;
    }

    if (hasCommentsEnabled) {
      pendingShowcaseCommentsRef.current = true;
    }

    if (hasMineOnlyAnnotationVisibility) {
      pendingShowcaseAnnotationVisibilityRef.current = 'mine';
    }
  }, []);

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  useEffect(() => {
    if (!showcaseProjectContext) {
      return;
    }

    ensureStylesheetLoaded('./src/styles/project-showcase.css');
    ensureStylesheetLoaded('./src/styles/project-showcase-theme-signature.css');
    ensureStylesheetLoaded('./src/styles/showcase-editor.css');
  }, [ensureStylesheetLoaded, showcaseProjectContext]);

  useEffect(() => {
    annotationNotesRef.current = annotationNotes;
  }, [annotationNotes]);

  useEffect(() => {
    isOnboardingActiveRef.current = isOnboardingActive;
  }, [isOnboardingActive]);

  useEffect(() => {
    if (isOnboardingActive) {
      return;
    }

    setProjects(prevProjects => {
      if (!Array.isArray(prevProjects) || prevProjects.length === 0) {
        return prevProjects;
      }

      const containsOnboardingProjects = prevProjects.some(isOnboardingProject);
      if (!containsOnboardingProjects) {
        return prevProjects;
      }

      const sanitizedProjects = prevProjects.filter(project => !isOnboardingProject(project));

      if (sanitizedProjects.length === 0) {
        return buildInitialProjectsState();
      }

      return cloneDeep(sanitizedProjects);
    });
  }, [isOnboardingActive, setProjects]);

  useEffect(() => {
    if (mode !== 'admin') {
      setAdminView('home');
    }
  }, [mode]);

const updateProjectFilters = useCallback((updater) => {
  setProjectFiltersState(prevConfig => {
    const currentConfig = normalizeProjectFilterConfig(prevConfig);
    const nextConfig = typeof updater === 'function' ? updater(currentConfig) : updater;
    return normalizeProjectFilterConfig(nextConfig);
  });
}, []);

  const updateInspirationFilters = useCallback((updater) => {
    setInspirationFilters(prevConfig => {
      const currentConfig = normalizeInspirationFiltersConfig(prevConfig);
      const nextConfig = typeof updater === 'function' ? updater(currentConfig) : updater;
      return normalizeInspirationFiltersConfig(nextConfig);
    });
  }, []);

  const updateInspirationFormFields = useCallback((updater) => {
    setInspirationFormFields(prevConfig => {
      const currentConfig = normalizeInspirationFormConfig(prevConfig);
      const nextConfig = typeof updater === 'function' ? updater(currentConfig) : updater;
      return normalizeInspirationFormConfig(nextConfig);
    });
  }, []);

  useEffect(() => {
    if (!Array.isArray(showcaseThemes) || showcaseThemes.length === 0) {
      return;
    }

    setQuestions((previousQuestions) => {
      const nextQuestions = Array.isArray(previousQuestions)
        ? previousQuestions.slice()
        : [];
      const themeQuestionIndex = nextQuestions.findIndex(question => question?.id === 'showcaseTheme');

      if (themeQuestionIndex === -1) {
        return previousQuestions;
      }

      const themeOptions = showcaseThemes
        .map(theme => (typeof theme?.label === 'string' && theme.label.trim().length > 0
          ? theme.label.trim()
          : typeof theme?.id === 'string'
            ? theme.id
            : ''))
        .filter(option => option.length > 0);

      const existingOptions = Array.isArray(nextQuestions[themeQuestionIndex]?.options)
        ? nextQuestions[themeQuestionIndex].options
        : [];

      const existingHasStructuredOptions = existingOptions.some((option) => {
        if (!option || typeof option !== 'object' || Array.isArray(option)) {
          return false;
        }

        const hasSubOptions = Array.isArray(option.subOptions) && option.subOptions.length > 0;
        const hasDefinedSubType = option.subType === 'choice' || option.subType === 'multi_choice';

        return hasSubOptions || hasDefinedSubType;
      });

      if (existingHasStructuredOptions) {
        return previousQuestions;
      }

      if (
        themeOptions.length === existingOptions.length &&
        themeOptions.every((option, index) => option === existingOptions[index])
      ) {
        return previousQuestions;
      }

      const existingThemeQuestion = nextQuestions[themeQuestionIndex] || {};

      nextQuestions[themeQuestionIndex] = {
        ...existingThemeQuestion,
        options: themeOptions
      };

      return nextQuestions;
    });
  }, [setQuestions, showcaseThemes]);

  useEffect(() => {
    try {
      const savedState = loadPersistedState();
      if (!savedState) {
        return;
      }

      const fallbackQuestions = Array.isArray(savedState.questions) ? savedState.questions : questions;
      const fallbackRules = Array.isArray(savedState.rules)
        ? normalizeRulesTeamReferences(savedState.rules)
        : rules;
      const fallbackRiskLevelRules = Array.isArray(savedState.riskLevelRules)
        ? savedState.riskLevelRules
        : riskLevelRules;
      const fallbackRiskWeights = savedState && typeof savedState.riskWeights === 'object'
        ? normalizeRiskWeighting(savedState.riskWeights)
        : riskWeights;
      const fallbackQuestionsLength = resolveFallbackQuestionsLength(savedState, fallbackQuestions.length);

      if (savedState.mode === 'admin') {
        setMode('user');
      } else if (savedState.mode) {
        setMode(savedState.mode);
      }
      if (savedState.screen) setScreen(savedState.screen);
      if (typeof savedState.currentQuestionIndex === 'number' && savedState.currentQuestionIndex >= 0) {
        setCurrentQuestionIndex(savedState.currentQuestionIndex);
      }
      if (savedState.answers && typeof savedState.answers === 'object') setAnswers(savedState.answers);
      if (typeof savedState.analysis !== 'undefined') setAnalysis(savedState.analysis);
      if (Array.isArray(savedState.projects)) {
        const normalized = normalizeProjectsCollection(savedState.projects, fallbackQuestionsLength);
        if (normalized && normalized.length > 0) {
          setProjects(normalized);
        } else {
          setProjects(isSharePointMode() ? [] : [createDemoProject({
            questions: fallbackQuestions,
            rules: fallbackRules,
            riskLevelRules: fallbackRiskLevelRules,
            riskWeights: fallbackRiskWeights
          })]);
        }
      } else if (Array.isArray(savedState.submittedProjects)) {
        const normalized = normalizeProjectsCollection(savedState.submittedProjects, fallbackQuestionsLength);
        if (normalized && normalized.length > 0) {
          setProjects(normalized);
        } else {
          setProjects(isSharePointMode() ? [] : [createDemoProject({
            questions: fallbackQuestions,
            rules: fallbackRules,
            riskLevelRules: fallbackRiskLevelRules,
            riskWeights: fallbackRiskWeights
          })]);
        }
      }
      if (typeof savedState.activeProjectId === 'string') setActiveProjectId(savedState.activeProjectId);
      if (typeof savedState.activeInspirationId === 'string') setActiveInspirationId(savedState.activeInspirationId);
      if (typeof savedState.homeView === 'string') setHomeView(savedState.homeView);
      if (Array.isArray(savedState.questions)) {
        setQuestions(restoreShowcaseQuestions(savedState.questions));
      }
      if (Array.isArray(savedState.rules)) {
        setRules(normalizeRulesTeamReferences(savedState.rules));
      }
      if (Array.isArray(savedState.riskLevelRules)) setRiskLevelRules(savedState.riskLevelRules);
      if (savedState && typeof savedState.riskWeights === 'object') {
        setRiskWeights(normalizeRiskWeighting(savedState.riskWeights));
      }
      if (Array.isArray(savedState.teams)) setTeams(savedState.teams);
      if (Array.isArray(savedState.showcaseThemes)) setShowcaseThemes(savedState.showcaseThemes);
      if (savedState && typeof savedState.projectFilters === 'object') {
        setProjectFiltersState(normalizeProjectFilterConfig(stripRetiredProjectFilterFields(savedState.projectFilters)));
      }
      if (savedState && typeof savedState.inspirationFilters === 'object') {
        setInspirationFilters(normalizeInspirationFiltersConfig(savedState.inspirationFilters));
      }
      if (savedState && typeof savedState.inspirationFormFields === 'object') {
        setInspirationFormFields(normalizeInspirationFormConfig(savedState.inspirationFormFields));
      }
      if (savedState && savedState.onboardingTourConfig) {
        setOnboardingTourConfig(normalizeOnboardingConfig(savedState.onboardingTourConfig));
      }
    } catch (error) {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn('[Hydration] Échec du chargement de l’état local :', error);
      }
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Cache d’abord, serveur ensuite : l’hydratation locale ci-dessus a déjà peint l’écran,
  // on réconcilie ensuite avec SharePoint sans jamais bloquer le premier rendu.
  useEffect(() => {
    if (!isHydrated || !isSharePointMode()) {
      return undefined;
    }

    let cancelled = false;

    const applyReferentials = (slices) => {
      if (Array.isArray(slices.questions)) setQuestions(restoreShowcaseQuestions(slices.questions));
      if (Array.isArray(slices.riskLevelRules)) setRiskLevelRules(slices.riskLevelRules);
      if (slices.riskWeights && typeof slices.riskWeights === 'object') {
        setRiskWeights(normalizeRiskWeighting(slices.riskWeights));
      }
      if (Array.isArray(slices.showcaseThemes)) setShowcaseThemes(slices.showcaseThemes);
      if (Array.isArray(slices.adminEmails)) setAdminEmails(slices.adminEmails);
      if (slices.projectFilters && typeof slices.projectFilters === 'object') {
        setProjectFiltersState(normalizeProjectFilterConfig(stripRetiredProjectFilterFields(slices.projectFilters)));
      }
      if (slices.inspirationFilters && typeof slices.inspirationFilters === 'object') {
        setInspirationFilters(normalizeInspirationFiltersConfig(slices.inspirationFilters));
      }
      if (slices.inspirationFormFields) {
        setInspirationFormFields(normalizeInspirationFormConfig(slices.inspirationFormFields));
      }
      if (slices.onboardingTourConfig) {
        setOnboardingTourConfig(normalizeOnboardingConfig(slices.onboardingTourConfig));
      }
      if (slices.validationCommitteeConfig) {
        setValidationCommitteeConfig(normalizeValidationCommitteeConfig(slices.validationCommitteeConfig));
      }
    };

    const hydrateFromSharePoint = async () => {
      try {
        const [serverProjects, referentials, complianceCommentsByProject, ruleEntries, teamEntries] =
          await Promise.all([
            dataProvider.listProjects(),
            loadReferentials(),
            // Chargées à part et protégées par leur propre repli : un souci sur l'une de ces
            // listes (pas encore créée, droits insuffisants) ne doit pas empêcher les projets et
            // référentiels de se charger normalement.
            complianceCommentsProvider.listAllComments().catch(() => ({})),
            rulesProvider.listAllRules().catch(() => []),
            teamsProvider.listAllTeams().catch(() => [])
          ]);

        if (cancelled) {
          return;
        }

        applyReferentials(referentials.slices);

        // Liste vide = jamais publiée (pas encore d'admin cliqué sur « Publier la
        // configuration ») plutôt qu'un référentiel volontairement vidé : on garde alors les
        // règles/équipes locales (défauts ou cache) au lieu d'écraser avec un tableau vide.
        if (ruleEntries.length > 0) {
          ruleServerMetaRef.current = new Map(ruleEntries.map(({ rule, meta }) => [rule.id, meta]));
          setRules(normalizeRulesTeamReferences(ruleEntries.map(({ rule }) => rule)));
        }
        if (teamEntries.length > 0) {
          teamServerMetaRef.current = new Map(teamEntries.map(({ team, meta }) => [team.id, meta]));
          setTeams(teamEntries.map(({ team }) => team));
        }

        const fallbackQuestionsLength = Array.isArray(referentials.slices.questions)
          ? referentials.slices.questions.length
          : initialQuestions.length;
        const normalizedServerProjects = (
          normalizeProjectsCollection(serverProjects, fallbackQuestionsLength) || []
        ).map((project) => ({
          ...project,
          answers: {
            ...project.answers,
            [COMPLIANCE_COMMENTS_KEY]: mergeComplianceComments(
              project.answers?.[COMPLIANCE_COMMENTS_KEY],
              complianceCommentsByProject[project.id]
            )
          }
        }));

        setProjects((previousProjects) =>
          mergeServerAndLocalProjects(normalizedServerProjects, previousProjects)
        );

        const warnings = [];
        if (referentials.missing.length > 0) {
          warnings.push(
            t('app.banners.missingConfigWarning', { files: referentials.missing.join(', ') })
          );
        }
        if (referentials.errors.length > 0) {
          warnings.push(
            t('app.banners.unreadableFilesWarning', {
              files: referentials.errors.map((entry) => entry.file).join(', ')
            })
          );
        }

        setSharePointSync({
          state: warnings.length > 0 ? 'partial' : 'synced',
          message: warnings.join(' · ')
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        const expired = error && error.name === 'SessionExpiredError';
        setSharePointSync({
          state: expired ? 'session-expired' : 'error',
          message: expired ? '' : (error && error.message) || t('app.banners.unknownError')
        });
      }
    };

    hydrateFromSharePoint();

    return () => {
      cancelled = true;
    };
  }, [isHydrated, t]);

  // Chargé une fois au démarrage (mock ou SharePoint réel) : indépendant de l'effet
  // ci-dessus, qui ne tourne qu'en mode SharePoint. `null` = pas encore de profil enregistré
  // pour cette personne, ce qui déclenche l'onboarding (voir `shouldShowOnboarding` plus bas).
  useEffect(() => {
    if (!isHydrated || !currentUserEmail) {
      return undefined;
    }

    let cancelled = false;

    userProfileProvider.getProfile(currentUserEmail)
      .then((profile) => {
        if (cancelled) return;
        setUserProfile(profile);
        setIsUserProfileLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        // Ne jamais bloquer toute l'app derrière l'onboarding à cause d'une coupure réseau.
        setUserProfileLoadFailed(true);
        setIsUserProfileLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isHydrated, currentUserEmail]);

  useEffect(() => {
    if (homeView === 'inspiration' || screen === 'inspiration-form' || screen === 'inspiration-detail') {
      loadInspirationProjectsIfNeeded();
    }
  }, [homeView, screen, loadInspirationProjectsIfNeeded]);

  const persistDefaults = useMemo(() => ({
    questions: JSON.stringify(restoreShowcaseQuestions(initialQuestions)),
    rules: JSON.stringify(initialRules),
    riskLevelRules: JSON.stringify(initialRiskLevelRules),
    riskWeights: JSON.stringify(normalizeRiskWeighting(initialRiskWeights)),
    teams: JSON.stringify(initialTeams),
    showcaseThemes: JSON.stringify(initialShowcaseThemes)
  }), []);

  const buildPersistPayload = useCallback(() => {
    // Données utilisateur : toujours persistées.
    const payload = {
      projects,
      inspirationProjects,
      activeProjectId,
      activeInspirationId,
      homeView,
      projectFilters,
      inspirationFilters,
      inspirationFormFields,
      onboardingTourConfig,
      validationCommitteeConfig,
      adminEmails
    };

    // Référentiels volumineux : persistés seulement s’ils diffèrent du défaut
    // (l’hydratation retombe sur le défaut quand la clé est absente).
    const referentials = {
      questions,
      rules,
      riskLevelRules,
      riskWeights,
      teams,
      showcaseThemes
    };
    Object.entries(referentials).forEach(([key, value]) => {
      if (JSON.stringify(value) !== persistDefaults[key]) {
        payload[key] = value;
      }
    });

    return payload;
  }, [
    projects,
    inspirationProjects,
    activeProjectId,
    activeInspirationId,
    homeView,
    questions,
    rules,
    riskLevelRules,
    riskWeights,
    teams,
    showcaseThemes,
    projectFilters,
    inspirationFilters,
    inspirationFormFields,
    onboardingTourConfig,
    validationCommitteeConfig,
    adminEmails,
    persistDefaults
  ]);

  const persistNow = useCallback(() => {
    const result = persistState(buildPersistPayload());
    setPersistenceError(!(result && result.ok));
  }, [buildPersistPayload]);

  // Le debounce ci-dessous attend 400ms pour éviter d’écrire à chaque frappe. L’effet
  // suivant garde toujours la dernière version de persistNow disponible pour un flush
  // immédiat si l’onglet se ferme avant que ce délai ne s’écoule.
  const persistNowRef = useRef(null);
  useEffect(() => {
    persistNowRef.current = isHydrated ? persistNow : null;
  }, [isHydrated, persistNow]);

  useEffect(() => {
    if (!isHydrated) {
      return undefined;
    }

    const timerId = setTimeout(persistNow, 400);

    return () => clearTimeout(timerId);
  }, [isHydrated, persistNow]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    // pagehide se déclenche de façon fiable à la fermeture/navigation (y compris sur
    // mobile) ; beforeunload en complément pour les navigateurs plus anciens. Sans ce
    // flush, une modification faite dans les 400ms précédant la fermeture serait perdue.
    const flushPendingChanges = () => {
      if (persistNowRef.current) {
        persistNowRef.current();
      }
    };

    window.addEventListener('pagehide', flushPendingChanges);
    window.addEventListener('beforeunload', flushPendingChanges);

    return () => {
      window.removeEventListener('pagehide', flushPendingChanges);
      window.removeEventListener('beforeunload', flushPendingChanges);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    let disposed = false;

    const preloadTourGuide = () => {
      ensureTourGuideAssets()
        .then((isReady) => {
          if (!disposed) {
            setTourGuideStatus(isReady ? 'ready' : 'error');
          }
        })
        .catch(() => {
          if (!disposed) {
            setTourGuideStatus('error');
          }
        });
    };

    if (window.TourGuideClient) {
      setTourGuideStatus('ready');
      return () => {
        disposed = true;
      };
    }

    setTourGuideStatus('loading');

    const schedulePreload =
      typeof window.requestIdleCallback === 'function'
        ? () => window.requestIdleCallback(preloadTourGuide, { timeout: 1500 })
        : () => window.setTimeout(preloadTourGuide, 200);

    const cancelPreload =
      typeof window.cancelIdleCallback === 'function'
        ? (id) => window.cancelIdleCallback(id)
        : (id) => window.clearTimeout(id);

    const preloadId = schedulePreload();

    return () => {
      disposed = true;
      cancelPreload(preloadId);
    };
  }, []);

  const noop = useCallback(() => {}, []);

  const computeDemoData = useCallback(() => {
    const answers = cloneDeep(demoProjectAnswersSnapshot) || {};
    const visibleQuestions = questions.filter(question => shouldShowQuestion(question, answers));
    const analysisResult = analyzeAnswers(answers, rules, riskLevelRules, riskWeights);
    const relevantTeamsList = Array.isArray(teams)
      ? teams.filter(team => (analysisResult?.teams || []).includes(team.id))
      : [];
    const timelineDetails = analysisResult?.timeline?.details || [];
    const projectName = typeof answers.projectName === 'string' && answers.projectName.trim().length > 0
      ? answers.projectName.trim()
      : t('app.demoProjectName');

    return {
      answers,
      analysis: analysisResult,
      questions: visibleQuestions.length > 0 ? visibleQuestions : questions,
      projectName,
      relevantTeams: relevantTeamsList,
      timelineDetails
    };
  }, [analyzeAnswers, questions, riskLevelRules, riskWeights, rules, shouldShowQuestion, t, teams]);

  const getDemoData = useCallback(() => {
    if (!onboardingDemoDataRef.current) {
      onboardingDemoDataRef.current = computeDemoData();
    }

    return onboardingDemoDataRef.current;
  }, [computeDemoData]);

  const buildOnboardingAnnotationNotes = useCallback((projectContext) => {
    if (!projectContext) {
      return [];
    }

    const projectId = projectContext.projectId || 'unknown';
    const contextId = buildAnnotationContextKey({
      screen: 'showcase',
      projectId,
      scope: showcaseAnnotationScope
    });
    const sourceId = 'onboarding-demo';
    const color = registerAnnotationSource(sourceId, ANNOTATION_COLORS[3]);

    return [
      {
        id: createAnnotationId(),
        x: 0.22,
        y: 0.25,
        sectionId: 'hero',
        sectionX: 0.25,
        sectionY: 0.2,
        text: '💡 À montrer en mode Light pour aller droit au message.',
        status: 'open',
        replies: [],
        attachments: [],
        color,
        contextId,
        projectId,
        projectName: projectContext.projectName || '',
        sourceId
      },
      {
        id: createAnnotationId(),
        x: 0.68,
        y: 0.42,
        sectionId: 'solution',
        sectionX: 0.65,
        sectionY: 0.4,
        text: 'Ajouter une capture ici pour illustrer la solution.',
        status: 'open',
        replies: [],
        attachments: [],
        color,
        contextId,
        projectId,
        projectName: projectContext.projectName || '',
        sourceId
      },
      {
        id: createAnnotationId(),
        x: 0.3,
        y: 0.75,
        sectionId: 'timeline',
        sectionX: 0.35,
        sectionY: 0.2,
        text: t('app.demoTimelineAnnotation'),
        status: 'open',
        replies: [],
        attachments: [],
        color,
        contextId,
        projectId,
        projectName: projectContext.projectName || '',
        sourceId
      }
    ];
  }, [registerAnnotationSource, showcaseAnnotationScope, t]);

  const buildOnboardingProjects = useCallback((demoData) => {
    const baseAnswers = cloneDeep(demoData?.answers || demoProjectAnswersSnapshot || {});
    const now = Date.now();

    const createEntry = (config) => {
      const offsetMs = typeof config.offsetMs === 'number' ? config.offsetMs : 0;
      const timestamp = config.timestamp || new Date(now - offsetMs).toISOString();
      const answersPatch = config.answers || {};
      const answers = cloneDeep({ ...baseAnswers, ...answersPatch });
      if (config.projectName) {
        answers.projectName = config.projectName;
      }

      const projectName = typeof answers.projectName === 'string' && answers.projectName.trim().length > 0
        ? answers.projectName.trim()
        : t('home.projectNameFallback');

      const analysisResult = analyzeAnswers(answers, rules, riskLevelRules, riskWeights);
      const visibleQuestions = questions.filter(question => shouldShowQuestion(question, answers));
      const {
        totalMandatoryQuestions: totalQuestions,
        answeredMandatoryQuestions: answeredQuestions
      } = computeMandatoryProgress(visibleQuestions, answers);
      const status = config.status || 'draft';

      return {
        id: config.id,
        projectName,
        answers,
        analysis: analysisResult,
        status,
        lastUpdated: config.lastUpdated || timestamp,
        generatedAt: config.generatedAt || timestamp,
        submittedAt: status === 'submitted' ? (config.submittedAt || timestamp) : undefined,
        totalQuestions,
        answeredQuestions: Math.min(answeredQuestions, totalQuestions || answeredQuestions),
        lastQuestionIndex:
          typeof config.lastQuestionIndex === 'number'
            ? config.lastQuestionIndex
            : (status === 'submitted' && totalQuestions > 0
              ? totalQuestions - 1
              : Math.max(totalQuestions - 2, 0)),
        isDemo: true
      };
    };

    return [
      createEntry({
        id: 'tour-draft-1',
        projectName: 'Atlas Connect',
        status: 'draft',
        offsetMs: 86400000,
        answers: {
          teamLead: 'Léa Martin',
          teamLeadTeam: 'Digital'
        }
      }),
      createEntry({
        id: 'tour-submitted',
        projectName: 'Pulse Live',
        status: 'submitted',
        offsetMs: 432000000,
        answers: {
          teamLead: 'Noah Carpentier',
          teamLeadTeam: 'Marketing'
        }
      }),
      createEntry({
        id: 'tour-draft-demo',
        projectName: demoData?.projectName || 'Plasma 360',
        status: 'draft',
        offsetMs: 172800000,
        answers: {}
      })
    ];
  }, [analyzeAnswers, currentUserEmail, questions, riskLevelRules, riskWeights, rules, shouldShowQuestion, t]);

  const restoreOnboardingSnapshot = useCallback(() => {
    const snapshot = onboardingStateRef.current;
    onboardingStateRef.current = null;
    onboardingDemoDataRef.current = null;

    if (!snapshot) {
      setMode('user');
      setAdminView('home');
      setScreen('home');
      setAnswers({});
      setAnalysis(null);
      setProjects(buildInitialProjectsState());
      setProjectFiltersState(createDefaultProjectFiltersConfig());
      setCurrentQuestionIndex(0);
      setValidationError(null);
      setSaveFeedback(null);
      setActiveProjectId(null);
      setShowcaseProjectContext(null);
      setHasUnsavedChanges(false);
      setBackOfficeAuthError(null);
      setIsBackOfficeUnlocked(false);
      setAnnotationNotes([]);
      setAnnotationSources({ session: ANNOTATION_COLORS[0] });
      setIsAnnotationModeEnabled(false);
      setIsAnnotationPaused(false);
      setShowcaseAnnotationScope('display-full');
      return;
    }

    setMode(snapshot.mode || 'user');
    setAdminView(snapshot.adminView || 'home');
    setScreen(snapshot.screen || 'home');
    setAnswers(snapshot.answers || {});
    setAnalysis(typeof snapshot.analysis !== 'undefined' ? snapshot.analysis : null);
    const restoredProjects = sanitizeRestoredProjects(snapshot.projects);
    setProjects(
      restoredProjects.length > 0
        ? restoredProjects
        : buildInitialProjectsState()
    );
    setProjectFiltersState(
      snapshot.projectFilters
        ? normalizeProjectFilterConfig(stripRetiredProjectFilterFields(snapshot.projectFilters))
        : createDefaultProjectFiltersConfig()
    );
    setCurrentQuestionIndex(
      typeof snapshot.currentQuestionIndex === 'number' && snapshot.currentQuestionIndex >= 0
        ? snapshot.currentQuestionIndex
        : 0
    );
    setValidationError(snapshot.validationError || null);
    setSaveFeedback(snapshot.saveFeedback || null);
    setActiveProjectId(typeof snapshot.activeProjectId === 'string' ? snapshot.activeProjectId : null);
    setShowcaseProjectContext(snapshot.showcaseProjectContext || null);
    setHasUnsavedChanges(Boolean(snapshot.hasUnsavedChanges));
    setBackOfficeAuthError(snapshot.backOfficeAuthError || null);
    setIsBackOfficeUnlocked(Boolean(snapshot.isBackOfficeUnlocked));
    setAnnotationNotes(Array.isArray(snapshot.annotationNotes) ? snapshot.annotationNotes : []);
    setAnnotationSources(snapshot.annotationSources || { session: ANNOTATION_COLORS[0] });
    setIsAnnotationModeEnabled(Boolean(snapshot.isAnnotationModeEnabled));
    setIsAnnotationPaused(Boolean(snapshot.isAnnotationPaused));
    setShowcaseAnnotationScope(snapshot.showcaseAnnotationScope || 'display-full');
  }, [
    setActiveProjectId,
    setAdminView,
    setAnalysis,
    setAnswers,
    setBackOfficeAuthError,
    setCurrentQuestionIndex,
    setHasUnsavedChanges,
    setIsBackOfficeUnlocked,
    setMode,
    setProjectFiltersState,
    setProjects,
    setSaveFeedback,
    setScreen,
    setShowcaseProjectContext,
    setValidationError,
    setAnnotationNotes,
    setAnnotationSources,
    setIsAnnotationModeEnabled,
    setIsAnnotationPaused,
    setShowcaseAnnotationScope
  ]);

  const finishOnboarding = useCallback((options = {}) => {
    const { shouldLoadIndex = false } = options || {};
    const snapshotExists = Boolean(onboardingStateRef.current);
    const wasOnboardingActive = isOnboardingActiveRef.current;

    if (!wasOnboardingActive && !snapshotExists) {
      return;
    }

    isOnboardingActiveRef.current = false;
    setIsOnboardingActive(false);
    setOnboardingStepId(null);

    const tourInstance = tourInstanceRef.current;
    tourInstanceRef.current = null;

    if (tourInstance && typeof tourInstance.stop === 'function') {
      try {
        tourInstance.stop();
      } catch (error) {
        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
          console.warn('[Onboarding] Impossible de stopper le guide :', error);
        }
      }
    }

    if (snapshotExists) {
      restoreOnboardingSnapshot();
    }

    if (shouldLoadIndex && typeof window !== 'undefined') {
      const redirect = () => {
        try {
          if (window.location) {
            if (typeof window.location.assign === 'function') {
              window.location.assign('./index.html');
            } else {
              window.location.href = './index.html';
            }
          }
        } catch (error) {
          if (typeof console !== 'undefined' && typeof console.warn === 'function') {
            console.warn('[Onboarding] Impossible de charger la page d’accueil :', error);
          }
        }
      };

      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => redirect());
      } else if (typeof window.setTimeout === 'function') {
        window.setTimeout(() => redirect(), 0);
      }
    }
  }, [restoreOnboardingSnapshot]);

  const handleOnboardingStepEnter = useCallback((stepId) => {
    if (!stepId) {
      return;
    }

    const demoData = getDemoData();

    const openDemoShowcase = () => {
      openProjectShowcase({
        projectId: null,
        projectName: demoData.projectName,
        answers: cloneDeep(demoData.answers),
        analysis: demoData.analysis,
        relevantTeams: demoData.relevantTeams,
        questions: demoData.questions,
        timelineDetails: demoData.timelineDetails,
        status: 'draft'
      });
      setHasUnsavedChanges(false);
    };

    const ensureShowcaseTopVisible = () => {
      if (typeof window === 'undefined') {
        return;
      }

      const scrollToTop = () => {
        try {
          if (typeof document !== 'undefined') {
            const topSection = document.querySelector('[data-tour-id="showcase-preview"]');
            if (topSection && typeof topSection.scrollIntoView === 'function') {
              topSection.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
              return;
            }
          }

          if (typeof window.scrollTo === 'function') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        } catch (error) {
          if (typeof window.scrollTo === 'function') {
            window.scrollTo({ top: 0 });
          }
        }
      };

      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => {
          if (typeof window.setTimeout === 'function') {
            window.setTimeout(scrollToTop, 0);
          } else {
            scrollToTop();
          }
        });
        return;
      }

      if (typeof window.setTimeout === 'function') {
        window.setTimeout(scrollToTop, 0);
        return;
      }

      scrollToTop();
    };

    const shouldOpenShareModal = stepId === 'showcase-share-settings';

    if (!shouldOpenShareModal && isShowcaseShareOpen) {
      setIsShowcaseShareOpen(false);
      setShowcaseShareFeedback('');
    }

    switch (stepId) {
      case 'welcome':
      case 'create-project': {
        setScreen('home');
        setShowcaseProjectContext(null);
        setActiveProjectId(null);
        setValidationError(null);
        setSaveFeedback(null);
        setHasUnsavedChanges(false);
        break;
      }
      case 'question-overview':
      case 'question-guidance': {
        setShowcaseProjectContext(null);
        setScreen('questionnaire');
        setActiveProjectId('onboarding-demo');
        setAnswers(cloneDeep(demoData.answers));
        setCurrentQuestionIndex(0);
        setAnalysis(null);
        setValidationError(null);
        setSaveFeedback(null);
        setHasUnsavedChanges(false);
        break;
      }
      case 'questionnaire-finish': {
        setShowcaseProjectContext(null);
        setScreen('questionnaire');
        setActiveProjectId('onboarding-demo');
        setAnswers(cloneDeep(demoData.answers));
        setAnalysis(null);
        setValidationError(null);
        setSaveFeedback(null);
        setHasUnsavedChanges(false);
        const totalQuestionsCount = Array.isArray(demoData.questions) && demoData.questions.length > 0
          ? demoData.questions.length
          : questions.length;
        const finishButtonIndex = totalQuestionsCount > 1 ? totalQuestionsCount - 2 : 0;
        setCurrentQuestionIndex(finishButtonIndex);
        break;
      }
      case 'compliance-report-top':
      case 'compliance-teams':
      case 'compliance-risks':
      case 'compliance-submit':
      case 'compliance-save':
      case 'compliance-showcase-button': {
        setAnswers(cloneDeep(demoData.answers));
        setAnalysis(demoData.analysis);
        setCurrentQuestionIndex(0);
        setValidationError(null);
        setScreen('synthesis');
        setSaveFeedback(null);
        setHasUnsavedChanges(false);
        break;
      }
      case 'showcase-top': {
        openDemoShowcase();
        ensureShowcaseTopVisible();
        break;
      }
      case 'showcase-bottom':
      case 'showcase-edit-trigger':
      case 'showcase-edit':
      case 'showcase-custom-sections':
      case 'showcase-save-edits':
      case 'showcase-back-to-report': {
        openDemoShowcase();
        break;
      }
      case 'showcase-share-settings': {
        openDemoShowcase();
        setShowcaseShareMode(showcaseDisplayMode === 'light' ? 'light' : 'full');
        setShowcaseShareCommentsEnabled(true);
        setShowcaseShareAnnotationVisibility('all');
        setIsShowcaseShareOpen(true);
        setShowcaseShareFeedback('');
        setIsAnnotationModeEnabled(false);
        setIsAnnotationPaused(false);
        break;
      }
      case 'showcase-comment-button': {
        openDemoShowcase();
        setIsShowcaseShareOpen(false);
        setShowcaseShareFeedback('');
        setIsAnnotationModeEnabled(false);
        setIsAnnotationPaused(false);
        break;
      }
      case 'showcase-comments-postits': {
        openDemoShowcase();
        setIsShowcaseShareOpen(false);
        setShowcaseShareFeedback('');
        setIsAnnotationModeEnabled(true);
        setIsAnnotationPaused(false);
        setAnnotationNotes(buildOnboardingAnnotationNotes({
          projectId: 'unknown',
          projectName: demoData.projectName
        }));
        break;
      }
      case 'project-filters':
      case 'project-inspiration':
      case 'home-goodbye': {
        setShowcaseProjectContext(null);
        setScreen('home');
        setActiveProjectId(null);
        setValidationError(null);
        setSaveFeedback(null);
        setHasUnsavedChanges(false);
        break;
      }
      default:
        break;
    }
  }, [
    getDemoData,
    openProjectShowcase,
    screen,
    questions,
    setActiveProjectId,
    setAnalysis,
    setAnswers,
    setAnnotationNotes,
    setIsAnnotationModeEnabled,
    setIsAnnotationPaused,
    setCurrentQuestionIndex,
    setHasUnsavedChanges,
    setIsShowcaseShareOpen,
    setSaveFeedback,
    setScreen,
    setShowcaseShareCommentsEnabled,
    setShowcaseShareFeedback,
    setShowcaseShareMode,
    setShowcaseProjectContext,
    setValidationError,
    buildOnboardingAnnotationNotes,
    showcaseDisplayMode,
    isShowcaseShareOpen
  ]);

  const handleStartOnboarding = useCallback(() => {
    if (isOnboardingActive) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    if (typeof window.TourGuideClient !== 'function') {
      ensureTourGuideAssets()
        .then((isReady) => {
          setTourGuideStatus(isReady ? 'ready' : 'error');
          if (!isReady && typeof window.alert === 'function') {
            window.alert(t('app.nav.guideTemporarilyUnavailable'));
          }
        })
        .catch(() => {
          setTourGuideStatus('error');
          if (typeof window.alert === 'function') {
            window.alert(t('app.nav.guideTemporarilyUnavailable'));
          }
        });
      return;
    }

    onboardingStateRef.current = {
      mode,
      screen,
      adminView,
      answers: cloneDeep(answers),
      analysis: cloneDeep(analysis),
      projects: cloneDeep(projects),
      projectFilters: cloneDeep(projectFilters),
      currentQuestionIndex,
      validationError: cloneDeep(validationError),
      saveFeedback: cloneDeep(saveFeedback),
      activeProjectId,
      showcaseProjectContext: cloneDeep(showcaseProjectContext),
      hasUnsavedChanges,
      backOfficeAuthError,
      isBackOfficeUnlocked,
      annotationNotes: cloneDeep(annotationNotes),
      annotationSources: cloneDeep(annotationSources),
      isAnnotationModeEnabled,
      isAnnotationPaused,
      showcaseAnnotationScope
    };

    const demoData = getDemoData();
    onboardingDemoDataRef.current = demoData;
    const onboardingProjects = buildOnboardingProjects(demoData);

    isOnboardingActiveRef.current = true;
    setIsOnboardingActive(true);
    setOnboardingStepId(null);
    setMode('user');
    setAdminView('home');
    setScreen('home');
    setShowcaseProjectContext(null);
    setActiveProjectId(null);
    setAnswers({});
    setAnalysis(null);
    setValidationError(null);
    setSaveFeedback(null);
    setHasUnsavedChanges(false);
    setBackOfficeAuthError(null);
    setIsBackOfficeUnlocked(false);
    setAnnotationNotes([]);
    setAnnotationSources({ session: ANNOTATION_COLORS[0] });
    setIsAnnotationModeEnabled(false);
    setIsAnnotationPaused(false);
    setShowcaseAnnotationScope('display-full');
    setProjects(onboardingProjects);
    setProjectFiltersState(createDefaultProjectFiltersConfig());

    const {
      steps,
      labels,
      allowClose,
      showStepDots
    } = normalizedOnboardingConfig;

    if (!Array.isArray(steps) || steps.length === 0) {
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(t('app.onboardingTourEmpty'));
      }
      return;
    }

    const tour = new window.TourGuideClient({
      steps,
      labels,
      allowClose,
      showStepDots
    });

    tour.on('stepChange', ({ step }) => {
      const stepId = step?.id || null;
      handleOnboardingStepEnter(stepId);
      setOnboardingStepId(stepId);
    });

    tour.on('close', () => {
      finishOnboarding({ shouldLoadIndex: true });
    });

    tour.on('finish', () => {
      finishOnboarding({ shouldLoadIndex: true });
    });

    tour.start();
    tourInstanceRef.current = tour;
  }, [
    isOnboardingActive,
    mode,
    screen,
    t,
    adminView,
    answers,
    analysis,
    projects,
    projectFilters,
    currentQuestionIndex,
    validationError,
    saveFeedback,
    activeProjectId,
    showcaseProjectContext,
    hasUnsavedChanges,
    backOfficeAuthError,
    isBackOfficeUnlocked,
    annotationNotes,
    annotationSources,
    isAnnotationModeEnabled,
    isAnnotationPaused,
    showcaseAnnotationScope,
    getDemoData,
    buildOnboardingProjects,
    normalizedOnboardingConfig,
    handleOnboardingStepEnter,
    finishOnboarding,
    setMode,
    setAdminView,
    setScreen,
    setShowcaseProjectContext,
    setActiveProjectId,
    setAnswers,
    setAnalysis,
    setValidationError,
    setSaveFeedback,
    setHasUnsavedChanges,
    setBackOfficeAuthError,
    setIsBackOfficeUnlocked,
    setAnnotationNotes,
    setAnnotationSources,
    setIsAnnotationModeEnabled,
    setIsAnnotationPaused,
    setShowcaseAnnotationScope,
    setProjects,
    setProjectFiltersState
  ]);

  useEffect(() => () => {
    if (tourInstanceRef.current && typeof tourInstanceRef.current.stop === 'function') {
      try {
        tourInstanceRef.current.stop();
      } catch (error) {
        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
          console.warn('[Onboarding] Nettoyage du guide impossible :', error);
        }
      }
    }
    tourInstanceRef.current = null;
  }, []);

  useEffect(() => {
    autosaveQueueRef.current = createAutosaveQueue({
      processItem: async (item) => {
        const expectedRowVersion = item?.expectedRowVersion;
        return dataProvider.upsertProject(item.project, {
          expectedRowVersion,
          userEmail: currentUserEmail
        });
      },
      onStatusChange: (state, details = {}) => {
        setSyncStatus({
          state,
          updatedAt: details.updatedAt || null,
          updatedBy: details.updatedBy || ''
        });

        if (state === 'synced' && details.projectId && details.updatedAt) {
          setProjects((prevProjects) => prevProjects.map((project) => {
            if (project.id !== details.projectId) {
              return project;
            }
            return {
              ...project,
              rowVersion: project.rowVersion ? project.rowVersion + 1 : 1,
              lastUpdated: details.updatedAt
            };
          }));
        }
      }
    });

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [currentUserEmail]);

  useEffect(() => {
    projectMembersQueueRef.current = createRetryQueue({
      processItem: (payload) => (
        payload.action === 'remove'
          ? projectMembersProvider.removeMember(payload.projectId, payload.email)
          : projectMembersProvider.addMember(payload.projectId, payload.email)
      ),
      getItemKey: (payload) => `${payload.projectId}::${payload.email}`
    });

    stickyNotesQueueRef.current = createRetryQueue({
      processItem: (note) => showcaseStickyNotesProvider.upsertNote(note, { userEmail: currentUserEmail }),
      getItemKey: (note) => note.id
    });

    complianceCommentsQueueRef.current = createRetryQueue({
      processItem: (payload) => complianceCommentsProvider.upsertComment(
        payload.projectId,
        payload.targetType,
        payload.targetId,
        payload.entry,
        { userEmail: payload.userEmail }
      ),
      getItemKey: (payload) => `${payload.projectId}::${payload.targetType}:${payload.targetId}`
    });

    userProfileQueueRef.current = createRetryQueue({
      processItem: (payload) => userProfileProvider.saveProfile(payload.email, payload.patch),
      getItemKey: (payload) => payload.email
    });

    rulesQueueRef.current = createRetryQueue({
      processItem: async (payload) => {
        if (payload.action === 'remove') {
          await rulesProvider.removeRule(payload.ruleId);
          ruleServerMetaRef.current.delete(payload.ruleId);
          return;
        }
        const { rule, meta } = await rulesProvider.saveRule(payload.rule, {
          sortOrder: payload.sortOrder,
          userEmail: currentUserEmail
        });
        ruleServerMetaRef.current.set(rule.id, meta);
      },
      getItemKey: (payload) => (payload.action === 'remove' ? payload.ruleId : payload.rule.id)
    });

    teamsQueueRef.current = createRetryQueue({
      processItem: async (payload) => {
        if (payload.action === 'remove') {
          await teamsProvider.removeTeam(payload.teamId);
          teamServerMetaRef.current.delete(payload.teamId);
          return;
        }
        const { team, meta } = await teamsProvider.saveTeam(payload.team, {
          sortOrder: payload.sortOrder,
          userEmail: currentUserEmail
        });
        teamServerMetaRef.current.set(team.id, meta);
      },
      getItemKey: (payload) => (payload.action === 'remove' ? payload.teamId : payload.team.id)
    });
  }, [currentUserEmail]);

  // Mise à jour optimiste immédiate (l'écran d'onboarding/le profil réagit tout de suite),
  // écriture réelle passée par la file d'attente avec réessais (voir plus haut).
  const handleSaveUserProfile = useCallback((patch) => {
    if (!currentUserEmail) {
      return;
    }
    setUserProfile((prev) => ({
      activityScope: [],
      preferredLanguage: '',
      hasCompletedOnboarding: false,
      ...prev,
      ...patch
    }));
    userProfileQueueRef.current?.enqueue({ email: currentUserEmail, patch });
  }, [currentUserEmail]);

  const handleSaveProfileFromModal = useCallback(() => {
    handleSaveUserProfile({ activityScope: profileDraftScope, preferredLanguage: language });
    setIsProfileModalOpen(false);
  }, [handleSaveUserProfile, profileDraftScope, language]);

  // Un seul écouteur global : au retour de connexion, on rejoue uniquement ce qui était en
  // attente dans chaque file (jamais un renvoi de l'état complet, pour ne jamais écraser un
  // changement fait par quelqu'un d'autre pendant la coupure).
  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleOnline = () => {
      setIsOnline(true);
      autosaveQueueRef.current?.flush();
      projectMembersQueueRef.current?.flush();
      stickyNotesQueueRef.current?.flush();
      complianceCommentsQueueRef.current?.flush();
      userProfileQueueRef.current?.flush();
      rulesQueueRef.current?.flush();
      teamsQueueRef.current?.flush();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const tourContext = useMemo(
    () => (isOnboardingActive ? { isActive: true, activeStep: onboardingStepId } : null),
    [isOnboardingActive, onboardingStepId]
  );

  const activeQuestions = useMemo(
    () => questions.filter(q => shouldShowQuestion(q, answers)),
    [questions, answers, shouldShowQuestion]
  );

  const unansweredMandatoryQuestions = useMemo(
    () =>
      activeQuestions.filter(question => question.required && !isAnswerProvided(answers[question.id])),
    [activeQuestions, answers]
  );

  const pendingMandatoryQuestions = useMemo(
    () =>
      unansweredMandatoryQuestions.map(question => ({
        question,
        position: activeQuestions.findIndex(item => item.id === question.id) + 1
      })),
    [unansweredMandatoryQuestions, activeQuestions]
  );

  const hasIncompleteAnswers = useMemo(
    () => unansweredMandatoryQuestions.length > 0,
    [unansweredMandatoryQuestions]
  );

  const teamLeadTeamOptions = useMemo(() => {
    const leadTeamQuestion = questions.find(question => question?.id === 'teamLeadTeam');
    if (!leadTeamQuestion || !Array.isArray(leadTeamQuestion.options)) {
      return [];
    }

    const sanitized = leadTeamQuestion.options
      .map(option => (typeof option === 'string' ? option.trim() : ''))
      .filter(option => option.length > 0);

    return Array.from(new Set(sanitized));
  }, [questions]);

  useEffect(() => {
    if (!isHydrated) return;
    if (activeQuestions.length === 0) return;
    if (currentQuestionIndex >= activeQuestions.length) {
      setCurrentQuestionIndex(activeQuestions.length - 1);
    }
  }, [activeQuestions.length, currentQuestionIndex, isHydrated]);

  useEffect(() => {
    if (screen !== 'questionnaire' && screen !== 'synthesis') {
      setSaveFeedback(null);
    }
  }, [screen]);

  const activeProject = useMemo(
    () => projects.find(project => project.id === activeProjectId) || null,
    [projects, activeProjectId]
  );
  const activeInspirationProject = useMemo(
    () => inspirationProjects.find(project => project.id === activeInspirationId) || null,
    [inspirationProjects, activeInspirationId]
  );

  const activeProjectName = useMemo(() => {
    if (typeof activeProject?.projectName === 'string' && activeProject.projectName.trim().length > 0) {
      return activeProject.projectName.trim();
    }

    return extractProjectName(answers, questions);
  }, [activeProject, answers, questions]);

  useEffect(() => {
    if (!isHydrated || isOnboardingActive || !autosaveQueueRef.current) {
      return undefined;
    }

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    const projectToSync = activeProject || projects[0];
    if (!projectToSync || projectToSync.isDemo) {
      return undefined;
    }

    autosaveTimeoutRef.current = setTimeout(() => {
      const expectedRowVersion = typeof projectToSync.rowVersion === 'number'
        ? projectToSync.rowVersion
        : undefined;

      autosaveQueueRef.current.enqueue({
        project: projectToSync,
        expectedRowVersion
      });
    }, 700);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
    };
  }, [
    activeProject,
    projects,
    isHydrated,
    isOnboardingActive,
    answers,
    analysis,
    currentQuestionIndex,
    inspirationProjects,
    adminView,
    screen,
    mode
  ]);

  const activeShowcaseProjectId = showcaseProjectContext?.projectId || null;

  // Les post-its ne sont sauvegardés nulle part par défaut (ni SharePoint, ni localStorage) :
  // on les charge une fois par projet, à l’ouverture de sa vitrine.
  const loadStickyNotesIfNeeded = useCallback((projectId) => {
    if (!projectId || loadedStickyNotesRef.current.has(projectId) || !isSharePointMode()) {
      return;
    }

    loadedStickyNotesRef.current.add(projectId);

    showcaseStickyNotesProvider
      .listNotes(projectId)
      .then((notes) => {
        if (!Array.isArray(notes) || notes.length === 0) {
          return;
        }
        setAnnotationNotes((prevNotes) => [
          ...prevNotes.filter((note) => note?.projectId !== projectId),
          ...notes.map((note) => ({
            ...note,
            contextId: buildAnnotationContextKey({ screen: 'showcase', projectId, scope: note.scope })
          }))
        ]);
      })
      .catch((error) => {
        loadedStickyNotesRef.current.delete(projectId);
        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
          console.warn('[Post-its] Chargement SharePoint impossible :', error);
        }
      });
  }, []);

  useEffect(() => {
    if (activeShowcaseProjectId) {
      loadStickyNotesIfNeeded(activeShowcaseProjectId);
    }
  }, [activeShowcaseProjectId, loadStickyNotesIfNeeded]);

  const activeShowcaseProject = useMemo(
    () => projects.find(project => project?.id === activeShowcaseProjectId) || null,
    [activeShowcaseProjectId, projects]
  );
  const canManageProject = useCallback((project) => {
    if (!project) {
      return false;
    }

    if (isAdminMode) {
      return true;
    }

    if (!currentUserEmail) {
      return false;
    }

    const ownerEmail = normalizeEmail(project.ownerEmail || '');
    const sharedWith = Array.isArray(project.sharedWith) ? project.sharedWith : [];
    const isCoOwner = sharedWith.some(entry => normalizeEmail(entry) === currentUserEmail);

    return ownerEmail === currentUserEmail || isCoOwner;
  }, [currentUserEmail, isAdminMode]);
  const canCloseAnnotationNotes = useMemo(
    () => canManageProject(activeShowcaseProject),
    [activeShowcaseProject, canManageProject]
  );

  const activeAnnotationContextKey = useMemo(
    () => buildAnnotationContextKey({
      screen,
      projectId: activeShowcaseProjectId,
      scope: showcaseAnnotationScope
    }),
    [activeShowcaseProjectId, screen, showcaseAnnotationScope]
  );

  useEffect(() => {
    if (!isOnboardingActive || onboardingStepId !== 'showcase-comments-postits') {
      return;
    }

    if (screen !== 'showcase') {
      return;
    }

    const hasOnboardingNotes = annotationNotes.some(note => note?.sourceId === 'onboarding-demo');
    if (hasOnboardingNotes) {
      return;
    }

    const demoData = getDemoData();
    setIsAnnotationModeEnabled(true);
    setIsAnnotationPaused(false);
    setAnnotationNotes(buildOnboardingAnnotationNotes({
      projectId: showcaseProjectContext?.projectId || 'unknown',
      projectName: demoData.projectName
    }));
  }, [
    annotationNotes,
    buildOnboardingAnnotationNotes,
    getDemoData,
    isOnboardingActive,
    onboardingStepId,
    screen,
    setAnnotationNotes,
    setIsAnnotationModeEnabled,
    setIsAnnotationPaused,
    showcaseProjectContext
  ]);

  const registerAnnotationSource = useCallback((sourceId, preferredColor) => {
    if (!sourceId) {
      return ANNOTATION_COLORS[0];
    }

    let resolvedColor = ANNOTATION_COLORS[0];

    setAnnotationSources(prevSources => {
      if (prevSources[sourceId]) {
        resolvedColor = prevSources[sourceId];
        return prevSources;
      }

      const usedColors = new Set(Object.values(prevSources));

      if (preferredColor && !usedColors.has(preferredColor)) {
        resolvedColor = preferredColor;
      } else {
        const availableColor = ANNOTATION_COLORS.find(color => !usedColors.has(color));
        resolvedColor = availableColor || ANNOTATION_COLORS[0];
      }

      return { ...prevSources, [sourceId]: resolvedColor };
    });

    return resolvedColor;
  }, []);

  const resolveAnnotationTarget = useCallback((clientX, clientY, targetElement = null) => {
    if (typeof document === 'undefined') {
      return { sectionId: null, sectionX: null, sectionY: null };
    }

    const activeTarget = targetElement instanceof Element
      ? targetElement
      : document.elementFromPoint(clientX, clientY);

    const sectionElement = activeTarget?.closest('[data-showcase-section]');

    if (!sectionElement) {
      return { sectionId: null, sectionX: null, sectionY: null };
    }

    const rect = sectionElement.getBoundingClientRect();
    const sectionWidth = rect?.width || 1;
    const sectionHeight = rect?.height || 1;

    return {
      sectionId: sectionElement.getAttribute('data-showcase-section') || null,
      sectionX: clamp01((clientX - rect.left) / sectionWidth),
      sectionY: clamp01((clientY - rect.top) / sectionHeight)
    };
  }, []);

  const handleAddAnnotationNote = useCallback((clientX, clientY, targetElement = null) => {
    if (screen !== 'showcase' || !showcaseProjectContext || isAnnotationPaused) {
      return;
    }

    const width = typeof window !== 'undefined' ? window.innerWidth || 1 : 1;
    const height = typeof window !== 'undefined' ? window.innerHeight || 1 : 1;
    const x = clamp01(clientX / width);
    const y = clamp01(clientY / height);
    const sourceId = currentUserDisplayName || 'session';
    const color = registerAnnotationSource(sourceId);
    const { sectionId, sectionX, sectionY } = resolveAnnotationTarget(clientX, clientY, targetElement);

    const newNoteId = createAnnotationId();
    const newNote = {
      id: newNoteId,
      x,
      y,
      sectionId,
      sectionX: sectionX ?? x,
      sectionY: sectionY ?? y,
      text: '',
      status: 'open',
      replies: [],
      attachments: [],
      color,
      contextId: activeAnnotationContextKey,
      projectId: showcaseProjectContext.projectId || 'unknown',
      projectName: showcaseProjectContext.projectName || '',
      scope: showcaseAnnotationScope,
      sourceId,
      sourceEmail: currentUserEmail
    };

    setAnnotationNotes(prevNotes => [...prevNotes, newNote]);
    setAutoFocusAnnotationId(newNoteId);

    stickyNotesQueueRef.current?.enqueue(newNote);
  }, [
    activeAnnotationContextKey,
    currentUserDisplayName,
    currentUserEmail,
    isAnnotationPaused,
    registerAnnotationSource,
    resolveAnnotationTarget,
    screen,
    showcaseAnnotationScope,
    showcaseProjectContext
  ]);

  const handleAnnotationTextChange = useCallback((noteId, text) => {
    setAnnotationNotes(prevNotes => prevNotes.map(note => (
      note?.id === noteId
        ? (note.status === 'closed' ? note : { ...note, text })
        : note
    )));

    const timeoutKey = `${showcaseProjectContext?.projectId || 'showcase'}:${noteId}`;
    const existingTimeout = showcaseCommentNotificationTimeoutsRef.current.get(timeoutKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeoutId = setTimeout(() => {
      const note = (annotationNotesRef.current || []).find((entry) => entry?.id === noteId);
      if (note) {
        stickyNotesQueueRef.current?.enqueue(note);
      }

      const commentText = typeof note?.text === 'string' ? note.text.trim() : '';
      if (!commentText) {
        return;
      }

      const project = projects.find((entry) => entry?.id === showcaseProjectContext?.projectId)
        || (showcaseProjectContext
          ? {
            id: showcaseProjectContext.projectId,
            projectName: showcaseProjectContext.projectName,
            ownerEmail: showcaseProjectContext.ownerEmail || '',
            sharedWith: Array.isArray(showcaseProjectContext.sharedWith) ? showcaseProjectContext.sharedWith : []
          }
          : null);

      notifyOwnerAndCoOwners(project, NOTIFICATION_TYPES.SHOWCASE_COMMENT, {
        excerpt: commentText
      });
      showcaseCommentNotificationTimeoutsRef.current.delete(timeoutKey);
    }, SHOWCASE_COMMENT_EDIT_DEBOUNCE_MS);

    showcaseCommentNotificationTimeoutsRef.current.set(timeoutKey, timeoutId);
  }, [
    currentUserDisplayName,
    notifyOwnerAndCoOwners,
    projects,
    showcaseProjectContext
  ]);

  const handleCloseAnnotationNote = useCallback((noteId) => {
    const current = (annotationNotesRef.current || []).find((entry) => entry?.id === noteId);
    if (!current || current.status === 'closed') {
      return;
    }

    const closedNote = {
      ...current,
      status: 'closed',
      closedAt: new Date().toISOString(),
      closedBy: currentUserDisplayName || t('app.genericUserFallback')
    };

    setAnnotationNotes(prevNotes => prevNotes.map(note => (
      note?.id === noteId ? closedNote : note
    )));

    stickyNotesQueueRef.current?.enqueue(closedNote);
  }, [currentUserDisplayName, t]);

  const handleAddAnnotationReply = useCallback((noteId, replyText) => {
    if (!replyText) {
      return;
    }

    const trimmed = replyText.trim();
    if (!trimmed) {
      return;
    }

    const current = (annotationNotesRef.current || []).find((entry) => entry?.id === noteId);
    if (!current || current.status === 'closed') {
      return;
    }

    const reply = {
      id: createAnnotationId(),
      text: trimmed,
      author: currentUserDisplayName || t('app.genericUserFallback'),
      authorEmail: currentUserEmail,
      createdAt: new Date().toISOString(),
      attachments: []
    };

    const existingReplies = Array.isArray(current.replies) ? current.replies : [];
    const previousReply = existingReplies.length > 0 ? existingReplies[existingReplies.length - 1] : null;
    const lastReplyAuthor = normalizeEmail(previousReply?.authorEmail || '');
    const updatedNote = { ...current, replies: [...existingReplies, reply] };

    setAnnotationNotes(prevNotes => prevNotes.map(note => (
      note?.id === noteId ? updatedNote : note
    )));

    stickyNotesQueueRef.current?.enqueue(updatedNote);

    notifyThreadLastAuthor({
      targetEmail: lastReplyAuthor,
      type: NOTIFICATION_TYPES.SHOWCASE_COMMENT_REPLY,
      project: {
        id: showcaseProjectContext?.projectId || activeProjectId,
        projectName: showcaseProjectContext?.projectName || activeProjectName,
        ownerEmail: showcaseProjectContext?.ownerEmail || ''
      },
      excerpt: typeof reply?.text === 'string' ? reply.text : ''
    });
  }, [
    activeProjectId,
    activeProjectName,
    currentUserEmail,
    notifyThreadLastAuthor,
    showcaseProjectContext,
    t
  ]);

  const handleToggleAnnotationMode = useCallback(() => {
    setIsAnnotationModeEnabled(prev => {
      const next = !prev;

      if (!next) {
        setIsAnnotationPaused(false);
      }

      return next;
    });
  }, []);

  const handleToggleAnnotationPause = useCallback(() => {
    setIsAnnotationPaused(prev => !prev);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    if (!isAnnotationModeEnabled || isAnnotationPaused || screen !== 'showcase') {
      return undefined;
    }

    const handleDocumentClick = (event) => {
      const target = event?.target;

      if (isAnnotationUiInteraction(event)) {
        return;
      }

      handleAddAnnotationNote(event.clientX, event.clientY, target);
    };

    window.addEventListener('click', handleDocumentClick, true);

    return () => {
      window.removeEventListener('click', handleDocumentClick, true);
    };
  }, [handleAddAnnotationNote, isAnnotationModeEnabled, isAnnotationPaused, isAnnotationUiInteraction, screen]);

  const isAdminMode = mode === 'admin';
  const isAdminHomeView = isAdminMode && adminView === 'home';
  const isAdminBackOfficeView = isAdminMode && adminView === 'back-office';
  const shouldShowOnboarding = isHydrated
    && isUserProfileLoaded
    && !userProfileLoadFailed
    && (!userProfile || !userProfile.hasCompletedOnboarding);
  const isActiveProjectEditable = !activeProject
    || (canManageProject(activeProject) && activeProject.status === 'draft')
    || isAdminMode;
  const annotationOffsetClass = isAnnotationModeEnabled && screen === 'showcase'
    ? 'pt-20 lg:pt-24'
    : '';

  const handleAnswer = useCallback((questionId, answer) => {
    const previousValue = answers[questionId];
    let answerChanged = !areAnswersEqual(previousValue, answer);
    const nextAnswers = { ...answers, [questionId]: answer };

    const questionsToRemove = questions
      .filter(q => !shouldShowQuestion(q, nextAnswers))
      .map(q => q.id);

    let nextAnswersSnapshot = null;

    if (questionsToRemove.length === 0) {
      if (answerChanged) {
        nextAnswersSnapshot = nextAnswers;
      }
    } else {
      const sanitizedAnswers = { ...nextAnswers };
      let removedExistingAnswer = false;
      questionsToRemove.forEach(qId => {
        if (Object.prototype.hasOwnProperty.call(sanitizedAnswers, qId)) {
          if (Object.prototype.hasOwnProperty.call(answers, qId)) {
            removedExistingAnswer = true;
          }
          delete sanitizedAnswers[qId];
        }
      });

      if (!answerChanged) {
        if (removedExistingAnswer) {
          answerChanged = true;
        } else {
          const prevKeys = Object.keys(answers);
          const nextKeys = Object.keys(sanitizedAnswers);
          if (prevKeys.length !== nextKeys.length) {
            answerChanged = true;
          } else if (nextKeys.some(key => !areAnswersEqual(answers[key], sanitizedAnswers[key]))) {
            answerChanged = true;
          }
        }
      }

      if (answerChanged) {
        nextAnswersSnapshot = sanitizedAnswers;
      }
    }

    if (!answerChanged || !nextAnswersSnapshot) {
      setValidationError(prev => {
        if (!prev) return null;
        return prev.questionId === questionId ? null : prev;
      });
      return;
    }

    setAnswers(nextAnswersSnapshot);
    setHasUnsavedChanges(true);

    const updatedAnalysis = Object.keys(nextAnswersSnapshot).length > 0
      ? analyzeAnswers(nextAnswersSnapshot, rules, riskLevelRules, riskWeights)
      : null;

    setAnalysis(updatedAnalysis);

    const relevantQuestions = questions.filter(question => shouldShowQuestion(question, nextAnswersSnapshot));
    const {
      totalMandatoryQuestions: totalMandatoryQuestionsCount,
      answeredMandatoryQuestions: answeredQuestionsCount
    } = computeMandatoryProgress(relevantQuestions, nextAnswersSnapshot);
    const inferredName = extractProjectName(nextAnswersSnapshot, questions);
    const normalizedInferredName = typeof inferredName === 'string' ? inferredName.trim() : '';

    if (activeProjectId && isActiveProjectEditable) {
      setProjects(prevProjects => {
        const projectIndex = prevProjects.findIndex(project => project.id === activeProjectId);
        if (projectIndex === -1) {
          return prevProjects;
        }

        const project = prevProjects[projectIndex];
        if (!project) {
          return prevProjects;
        }

        const canUpdateProject = project.status === 'draft' || isAdminMode;
        if (!canUpdateProject) {
          return prevProjects;
        }

        const totalQuestions = totalMandatoryQuestionsCount;
        const sanitizedName = normalizedInferredName.length > 0
          ? normalizedInferredName
          : project.projectName;
        const lastQuestionIndex = totalQuestions > 0
          ? Math.min(Math.max(project.lastQuestionIndex ?? totalQuestions - 1, 0), totalQuestions - 1)
          : project.lastQuestionIndex ?? 0;

        const updatedProject = {
          ...project,
          answers: nextAnswersSnapshot,
          analysis: updatedAnalysis,
          projectName: sanitizedName,
          totalQuestions,
          answeredQuestions: Math.min(answeredQuestionsCount, totalQuestions || answeredQuestionsCount),
          lastQuestionIndex,
          lastUpdated: new Date().toISOString()
        };

        const nextProjects = prevProjects.slice();
        nextProjects[projectIndex] = updatedProject;
        return nextProjects;
      });
    }

    setValidationError(prev => {
      if (!prev) return null;
      return prev.questionId === questionId ? null : prev;
    });
  }, [
    activeProjectId,
    analyzeAnswers,
    answers,
    extractProjectName,
    isActiveProjectEditable,
    isAdminMode,
    questions,
    riskLevelRules,
    riskWeights,
    rules,
    setHasUnsavedChanges,
    shouldShowQuestion
  ]);

  const handleUpdateAnswers = useCallback((updates) => {
    if (!isActiveProjectEditable) {
      return;
    }

    let sanitizedResult = null;

    setAnswers(prevAnswers => {
      const { nextAnswers, changed } = applyAnswerUpdates(prevAnswers, updates, questions, shouldShowQuestion);
      if (!changed) {
        return prevAnswers;
      }
      sanitizedResult = nextAnswers;
      return nextAnswers;
    });

    if (sanitizedResult) {
      const updatedAnalysis = analyzeAnswers(sanitizedResult, rules, riskLevelRules, riskWeights);
      setAnalysis(updatedAnalysis);
      setValidationError(null);
      setHasUnsavedChanges(true);

      if (activeProjectId) {
        setProjects(prevProjects => {
          const projectIndex = prevProjects.findIndex(project => project.id === activeProjectId);
          if (projectIndex === -1) {
            return prevProjects;
          }

          const project = prevProjects[projectIndex];
          if (!project) {
            return prevProjects;
          }

          const canUpdateProject = project.status === 'draft' || isAdminMode;
          if (!canUpdateProject) {
            return prevProjects;
          }

          const relevantQuestions = questions.filter(question => shouldShowQuestion(question, sanitizedResult));
          const {
            totalMandatoryQuestions: totalQuestions,
            answeredMandatoryQuestions: answeredQuestionsCount
          } = computeMandatoryProgress(relevantQuestions, sanitizedResult);
          const inferredName = extractProjectName(sanitizedResult, questions);
          const sanitizedName = inferredName && inferredName.trim().length > 0
            ? inferredName.trim()
            : project.projectName;
          const lastQuestionIndex = totalQuestions > 0
            ? Math.min(Math.max(project.lastQuestionIndex ?? totalQuestions - 1, 0), totalQuestions - 1)
            : project.lastQuestionIndex ?? 0;

          const updatedProject = {
            ...project,
            answers: sanitizedResult,
            analysis: updatedAnalysis,
            projectName: sanitizedName,
            totalQuestions,
            answeredQuestions: Math.min(answeredQuestionsCount, totalQuestions || answeredQuestionsCount),
            lastQuestionIndex,
            lastUpdated: new Date().toISOString()
          };

          const nextProjects = prevProjects.slice();
          nextProjects[projectIndex] = updatedProject;
          return nextProjects;
        });
      }
    }
  }, [
    activeProjectId,
    analyzeAnswers,
    extractProjectName,
    isActiveProjectEditable,
    isAdminMode,
    setHasUnsavedChanges,
    questions,
    riskLevelRules,
    riskWeights,
    rules,
    shouldShowQuestion
  ]);

  const handleUpdateComplianceComments = useCallback((updates) => {
    if (!activeProjectId || !updates || typeof updates !== 'object') {
      return;
    }

    let sanitizedResult = null;

    setAnswers(prevAnswers => {
      const nextAnswers = { ...prevAnswers };
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined) {
          delete nextAnswers[key];
        } else {
          nextAnswers[key] = value;
        }
      });
      sanitizedResult = nextAnswers;
      return nextAnswers;
    });

    if (sanitizedResult) {
      const project = projects.find((entry) => entry?.id === activeProjectId);
      const nextComments = sanitizedResult?.[COMPLIANCE_COMMENTS_KEY];

      if (project && nextComments && typeof nextComments === 'object' && !Array.isArray(nextComments)) {
        const isOwnerOrCoOwner = normalizeEmail(project.ownerEmail) === currentUserEmail
          || (Array.isArray(project.sharedWith)
            && project.sharedWith.some((email) => normalizeEmail(email) === currentUserEmail));

        const teamEntries = nextComments.teams && typeof nextComments.teams === 'object' ? nextComments.teams : {};
        const committeeEntries = nextComments.committees && typeof nextComments.committees === 'object' ? nextComments.committees : {};

        // Miroir best-effort vers CN_ComplianceComments : la fiche projet reste la source
        // de lecture de l’UI (zéro changement de comportement), ce n’est qu’une copie
        // durable et indépendante par commentaire (permissions, flux Power Automate).
        const previousComments = project.answers && typeof project.answers === 'object'
          ? project.answers[COMPLIANCE_COMMENTS_KEY]
          : null;
        const previousTeamEntries = previousComments?.teams && typeof previousComments.teams === 'object'
          ? previousComments.teams
          : {};
        const previousCommitteeEntries = previousComments?.committees && typeof previousComments.committees === 'object'
          ? previousComments.committees
          : {};

        const mirrorChangedEntries = (entries, previousEntries, targetType) => {
          Object.entries(entries).forEach(([targetId, entry]) => {
            if (JSON.stringify(entry) === JSON.stringify(previousEntries[targetId])) {
              return;
            }
            complianceCommentsQueueRef.current?.enqueue({
              projectId: activeProjectId,
              targetType,
              targetId,
              entry,
              userEmail: currentUserEmail
            });
          });
        };

        mirrorChangedEntries(teamEntries, previousTeamEntries, 'team');
        mirrorChangedEntries(committeeEntries, previousCommitteeEntries, 'committee');

        if (isOwnerOrCoOwner) {
          const teamRecipients = Object.keys(teamEntries)
            .flatMap((teamId) => {
              const team = teams.find((entry) => entry?.id === teamId);
              return normalizeTeamContacts(team);
            });
          const committeeRecipients = Object.keys(committeeEntries)
            .flatMap((committeeId) => {
              const committee = normalizeValidationCommitteeConfig(validationCommitteeConfig).committees
                .find((entry) => entry?.id === committeeId);
              return Array.isArray(committee?.emails) ? committee.emails : [];
            });
          const recipients = normalizeRecipientList([...teamRecipients, ...committeeRecipients])
            .filter((email) => email !== currentUserEmail);

          if (recipients.length > 0) {
            const teamNames = Object.keys(teamEntries)
              .map((teamId) => teams.find((entry) => entry?.id === teamId)?.name)
              .filter(Boolean);

            notify({
              type: NOTIFICATION_TYPES.SYNTHESIS_COMMENT_TO_TEAM,
              project,
              to: recipients,
              teamNames
            });
          }
        } else {
          notifyOwnerAndCoOwners(project, NOTIFICATION_TYPES.SYNTHESIS_COMMENT_TO_OWNER);
        }
      }

      setHasUnsavedChanges(true);
      setProjects(prevProjects => {
        const projectIndex = prevProjects.findIndex(project => project.id === activeProjectId);
        if (projectIndex === -1) {
          return prevProjects;
        }

        const currentProject = prevProjects[projectIndex];
        if (!currentProject) {
          return prevProjects;
        }

        const updatedProject = {
          ...currentProject,
          answers: sanitizedResult,
          lastUpdated: new Date().toISOString()
        };

        const nextProjects = prevProjects.slice();
        nextProjects[projectIndex] = updatedProject;
        return nextProjects;
      });
    }
  }, [
    activeProjectId,
    currentUserEmail,
    notify,
    notifyOwnerAndCoOwners,
    projects,
    setHasUnsavedChanges,
    teams,
    validationCommitteeConfig
  ]);

  const handleComplianceReplyNotification = useCallback((payload = {}) => {
    notifyThreadLastAuthor({
      targetEmail: payload.lastAuthorEmail,
      type: NOTIFICATION_TYPES.SYNTHESIS_COMMENT_REPLY,
      project: {
        id: payload.projectId || activeProjectId,
        projectName: payload.projectName,
        ownerEmail: payload.ownerEmail || ''
      },
      excerpt: payload.message || ''
    });
  }, [activeProjectId, notifyThreadLastAuthor]);

  const handleAddSharedMember = useCallback((email) => {
    if (!activeProjectId) {
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return;
    }

    // La notification est calculée hors du setter : React peut rejouer une fonction de
    // mise à jour d’état, ce qui enverrait le message en double.
    const targetProject = projects.find((project) => project?.id === activeProjectId);
    const alreadyShared = (Array.isArray(targetProject?.sharedWith) ? targetProject.sharedWith : [])
      .some((entry) => normalizeEmail(entry) === normalizedEmail);

    if (!targetProject || alreadyShared) {
      return;
    }

    setProjects(prevProjects => prevProjects.map(project => {
      if (project.id !== activeProjectId) {
        return project;
      }

      const existingShared = Array.isArray(project.sharedWith) ? project.sharedWith : [];
      if (existingShared.some(entry => normalizeEmail(entry) === normalizedEmail)) {
        return project;
      }

      return {
        ...project,
        ownerEmail: project.ownerEmail || currentUserEmail || '',
        sharedWith: [...existingShared, normalizedEmail],
        lastUpdated: new Date().toISOString()
      };
    }));

    notify({
      type: NOTIFICATION_TYPES.PROJECT_SHARED,
      project: {
        ...targetProject,
        ownerEmail: targetProject.ownerEmail || currentUserEmail || ''
      },
      to: [normalizedEmail]
    });

    projectMembersQueueRef.current?.enqueue({
      action: 'add',
      projectId: activeProjectId,
      email: normalizedEmail
    });
  }, [activeProjectId, currentUserEmail, notify, projects]);

  const handleRemoveSharedMember = useCallback((email) => {
    if (!activeProjectId) {
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return;
    }

    setProjects(prevProjects => prevProjects.map(project => {
      if (project.id !== activeProjectId) {
        return project;
      }

      const existingShared = Array.isArray(project.sharedWith) ? project.sharedWith : [];
      const nextShared = existingShared.filter(entry => normalizeEmail(entry) !== normalizedEmail);
      if (nextShared.length === existingShared.length) {
        return project;
      }

      return {
        ...project,
        sharedWith: nextShared,
        lastUpdated: new Date().toISOString()
      };
    }));

    projectMembersQueueRef.current?.enqueue({
      action: 'remove',
      projectId: activeProjectId,
      email: normalizedEmail
    });
  }, [activeProjectId]);

  const buildDefaultAnswers = useCallback(() => {
    if (currentUserDisplayName) {
      return { teamLead: currentUserDisplayName };
    }
    return {};
  }, [currentUserDisplayName]);

  const resetProjectState = useCallback(() => {
    setAnswers(buildDefaultAnswers());
    setCurrentQuestionIndex(0);
    setAnalysis(null);
    setValidationError(null);
    setActiveProjectId(null);
    setHasUnsavedChanges(false);
    setReturnToSynthesisAfterEdit(false);
  }, [buildDefaultAnswers, setHasUnsavedChanges]);

  const openBackOfficePrompt = useCallback(() => new Promise((resolve) => {
    backOfficePromptResolverRef.current = resolve;
    setBackOfficePromptValue('');
    setBackOfficePromptError('');
    setIsBackOfficePromptOpen(true);
  }), []);

  const closeBackOfficePrompt = useCallback((result = false) => {
    setIsBackOfficePromptOpen(false);
    setBackOfficePromptValue('');
    setBackOfficePromptError('');
    const resolver = backOfficePromptResolverRef.current;
    backOfficePromptResolverRef.current = null;
    if (typeof resolver === 'function') {
      resolver(result);
    }
  }, []);

  const handleBackOfficePromptSubmit = useCallback(async (event) => {
    event.preventDefault();
    const trimmed = backOfficePromptValue.trim();
    if (!trimmed) {
      setBackOfficePromptError(t('app.backOfficeAuth.emptyPasswordError'));
      return;
    }

    const isValid = await verifyBackOfficePassword(trimmed);

    if (isValid) {
      setIsBackOfficeUnlocked(true);
      setBackOfficeAuthError(null);
      closeBackOfficePrompt(true);
      return;
    }

    setIsBackOfficeUnlocked(false);
    setBackOfficeAuthError(t('app.backOfficeAuth.incorrectPassword'));
    setBackOfficePromptError(t('app.backOfficeAuth.incorrectPassword'));
  }, [backOfficePromptValue, closeBackOfficePrompt, t]);

  const requestAdminAccess = useCallback(async () => {
    if (isAdminMode) {
      setIsBackOfficeUnlocked(true);
      setBackOfficeAuthError(null);
      return true;
    }

    if (isCurrentUserAdmin) {
      setIsBackOfficeUnlocked(true);
      setBackOfficeAuthError(null);
      return true;
    }

    if (isBackOfficeUnlocked) {
      setBackOfficeAuthError(null);
      return true;
    }

    setBackOfficeAuthError(null);
    return openBackOfficePrompt();
  }, [
    isAdminMode,
    isCurrentUserAdmin,
    isBackOfficeUnlocked,
    openBackOfficePrompt,
    setBackOfficeAuthError,
    setIsBackOfficeUnlocked
  ]);

  const handleBackOfficeClick = useCallback(async () => {
    const hasAccess = await requestAdminAccess();
    if (!hasAccess) {
      return;
    }

    setMode('admin');
    setAdminView('back-office');
  }, [requestAdminAccess, setMode]);

  const handleActivateAdminOnHome = useCallback(async () => {
    const hasAccess = await requestAdminAccess();
    if (!hasAccess) {
      return;
    }

    setMode('admin');
    setAdminView('home');
    setScreen('home');
  }, [requestAdminAccess, setMode, setScreen]);

  const handleReturnToProjectMode = useCallback(() => {
    setMode('user');
    setAdminView('home');
    setBackOfficeAuthError(null);
  }, [setBackOfficeAuthError, setMode]);

  const handleCreateNewProject = useCallback(() => {
    const defaultAnswers = buildDefaultAnswers();
    const projectId = `project-${Date.now()}`;
    const now = new Date().toISOString();
    const relevantQuestions = questions.filter(question => shouldShowQuestion(question, defaultAnswers));
    const { totalMandatoryQuestions, answeredMandatoryQuestions } =
      computeMandatoryProgress(relevantQuestions, defaultAnswers);
    const computedAnalysis = Object.keys(defaultAnswers).length > 0
      ? analyzeAnswers(defaultAnswers, rules, riskLevelRules, riskWeights)
      : null;
    const inferredName = extractProjectName(defaultAnswers, questions);
    const projectName = inferredName && inferredName.trim().length > 0 ? inferredName.trim() : t('home.projectNameFallback');

    setAnswers(defaultAnswers);
    setCurrentQuestionIndex(0);
    setAnalysis(computedAnalysis);
    setValidationError(null);
    setHasUnsavedChanges(false);
    setReturnToSynthesisAfterEdit(false);

    setProjects(upsertProject({
      id: projectId,
      projectName,
      answers: defaultAnswers,
      analysis: computedAnalysis,
      status: 'draft',
      lastUpdated: now,
      lastQuestionIndex: 0,
      totalQuestions: totalMandatoryQuestions,
      answeredQuestions: Math.min(answeredMandatoryQuestions, totalMandatoryQuestions || answeredMandatoryQuestions),
      ownerEmail: currentUserEmail || '',
      sharedWith: []
    }));
    setActiveProjectId(projectId);
    setScreen('questionnaire');
  }, [
    analyzeAnswers,
    buildDefaultAnswers,
    currentUserEmail,
    extractProjectName,
    questions,
    riskLevelRules,
    riskWeights,
    rules,
    setHasUnsavedChanges,
    t,
    shouldShowQuestion,
    upsertProject
  ]);

  const handleStartInspirationProject = useCallback(() => {
    const now = new Date().toISOString();
    const draftId = createInspirationId();
    const baseInspirationProjects = hasLoadedInspirationProjects
      ? inspirationProjects
      : getStoredInspirationProjects();

    setInspirationProjects([{
      id: draftId,
      title: '',
      labName: '',
      target: '',
      typology: '',
      therapeuticArea: '',
      country: '',
      description: '',
      link: '',
      review: '',
      documents: [],
      visibility: 'personal',
      createdAt: now,
      updatedAt: now,
      ownerEmail: currentUserEmail || '',
      teamLead: currentUserDisplayName || ''
    }, ...(Array.isArray(baseInspirationProjects) ? baseInspirationProjects : [])]);
    setHasLoadedInspirationProjects(true);

    setActiveInspirationId(draftId);
    setScreen('inspiration-form');
  }, [currentUserDisplayName, currentUserEmail, hasLoadedInspirationProjects, inspirationProjects]);

  const handleAutosaveInspirationProject = useCallback((projectId, updates) => {
    if (!projectId || !updates) {
      return;
    }

    setInspirationProjects((prev) => (Array.isArray(prev) ? prev : []).map((project) => {
      if (!project || project.id !== projectId) {
        return project;
      }

      return {
        ...project,
        ...updates,
        updatedAt: new Date().toISOString()
      };
    }));
  }, []);

  const handleCancelInspirationForm = useCallback(() => {
    if (activeInspirationProject) {
      const hasContent = [
        activeInspirationProject.title,
        activeInspirationProject.labName,
        activeInspirationProject.target,
        activeInspirationProject.typology,
        activeInspirationProject.therapeuticArea,
        activeInspirationProject.country,
        activeInspirationProject.description,
        activeInspirationProject.link,
        activeInspirationProject.review
      ].some((value) => typeof value === 'string' && value.trim().length > 0)
        || (Array.isArray(activeInspirationProject.documents)
          && activeInspirationProject.documents.length > 0);

      if (!hasContent) {
        setInspirationProjects((prev) =>
          (Array.isArray(prev) ? prev : []).filter((project) => project?.id !== activeInspirationProject.id)
        );
      }
    }

    setScreen('home');
    handleHomeViewChange('inspiration');
  }, [activeInspirationProject, handleHomeViewChange]);

  const handleOpenInspirationProject = useCallback((projectId) => {
    if (!projectId) {
      return;
    }
    setActiveInspirationId(projectId);
    setScreen('inspiration-detail');
  }, []);

  const handleUpdateInspirationProject = useCallback((projectId, updates) => {
    if (!projectId || !updates) {
      return;
    }

    setInspirationProjects((prev) => (Array.isArray(prev) ? prev : []).map((project) => {
      if (!project || project.id !== projectId) {
        return project;
      }

      return { ...project, ...updates };
    }));
  }, []);

  const handleExportInspirationProject = useCallback((project) => {
    if (!project) {
      return;
    }

    exportInspirationToFile(project);
  }, []);

  const navigateToSynthesis = useCallback(() => {
    const result = analyzeAnswers(answers, rules, riskLevelRules, riskWeights);
    setAnalysis(result);
    setValidationError(null);
    setReturnToSynthesisAfterEdit(false);
    setScreen('synthesis');
  }, [analyzeAnswers, answers, riskLevelRules, riskWeights, rules]);

  const leaveQuestionnaireForSynthesis = useCallback(() => {
    if (unansweredMandatoryQuestions.length > 0) {
      setValidationError(null);
      setReturnToSynthesisAfterEdit(false);
      setScreen('mandatory-summary');
      return;
    }

    navigateToSynthesis();
  }, [navigateToSynthesis, unansweredMandatoryQuestions]);

  const handleNext = useCallback(() => {
    if (currentQuestionIndex < activeQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setValidationError(null);
      return;
    }

    leaveQuestionnaireForSynthesis();
  }, [activeQuestions, currentQuestionIndex, leaveQuestionnaireForSynthesis]);

  const handleBack = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
    setValidationError(null);
  }, [currentQuestionIndex]);

  const handleRestart = useCallback(() => {
    resetProjectState();
    setScreen('questionnaire');
  }, [resetProjectState]);

  const handleOpenProject = useCallback((projectId, options = {}) => {
    if (!projectId) {
      return;
    }

    const project = projects.find(item => item.id === projectId);
    if (!project) {
      return;
    }

    const projectAnswers = project.answers || {};
    const derivedQuestions = questions.filter(q => shouldShowQuestion(q, projectAnswers));
    const derivedAnalysis = resolveProjectAnalysis(
      project,
      (a) => analyzeAnswers(a, rules, riskLevelRules, riskWeights)
    );
    const {
      totalMandatoryQuestions: totalQuestions,
      answeredMandatoryQuestions: answeredQuestionsCount
    } = computeMandatoryProgress(derivedQuestions, projectAnswers);
    const missingMandatory = derivedQuestions.filter(question => question.required && !isAnswerProvided(projectAnswers[question.id]));
    const rawIndex = typeof project.lastQuestionIndex === 'number' ? project.lastQuestionIndex : 0;
    const sanitizedIndex = totalQuestions > 0 ? Math.min(Math.max(rawIndex, 0), totalQuestions - 1) : 0;
    const firstMissingId = missingMandatory[0]?.id;
    const missingIndex = firstMissingId
      ? derivedQuestions.findIndex(question => question.id === firstMissingId)
      : -1;
    const startingIndex = missingIndex >= 0 ? missingIndex : project.status === 'draft' ? sanitizedIndex : 0;

    setAnswers(projectAnswers);
    setAnalysis(derivedAnalysis);
    setCurrentQuestionIndex(startingIndex);
    setValidationError(null);
    setActiveProjectId(project.id);

    setProjects(prevProjects => prevProjects.map(entry => {
      if (entry.id !== project.id) {
        return entry;
      }

      return {
        ...entry,
        analysis: derivedAnalysis,
        totalQuestions,
        answeredQuestions: Math.min(
          answeredQuestionsCount,
          totalQuestions || answeredQuestionsCount
        ),
        lastQuestionIndex: sanitizedIndex
      };
    }));

    const forcedView = typeof options?.view === 'string' ? options.view : null;

    let targetScreen = null;
    if (forcedView === 'synthesis' || forcedView === 'questionnaire' || forcedView === 'mandatory-summary') {
      targetScreen = forcedView;
    }

    if (!targetScreen) {
      targetScreen = project.status === 'draft' ? 'questionnaire' : 'synthesis';
    }

    setScreen(targetScreen);
    setHasUnsavedChanges(false);
  }, [
    analyzeAnswers,
    projects,
    questions,
    resolveProjectAnalysis,
    setHasUnsavedChanges,
    riskLevelRules,
    riskWeights,
    rules,
    shouldShowQuestion
  ]);


  const handleReintegrateProjectInCommittee = useCallback((projectId, committeeId) => {
    if (!projectId || !committeeId) {
      return;
    }

    setProjects(prevProjects => prevProjects.map((project) => {
      if (!project || project.id !== projectId) {
        return project;
      }

      const answers = project.answers && typeof project.answers === 'object' ? project.answers : {};
      const rawComments = answers[COMPLIANCE_COMMENTS_KEY];
      const comments = rawComments && typeof rawComments === 'object' && !Array.isArray(rawComments)
        ? rawComments
        : {};
      const forcedCommitteeIds = Array.isArray(comments.forcedCommitteeIds)
        ? comments.forcedCommitteeIds.filter((id) => typeof id === 'string' && id.trim().length > 0)
        : [];

      const nextForcedCommitteeIds = forcedCommitteeIds.includes(committeeId)
        ? forcedCommitteeIds
        : [...forcedCommitteeIds, committeeId];

      notifyOwnerAndCoOwners(project, NOTIFICATION_TYPES.COMMITTEE_REINTEGRATION, {
        excerpt: `Comité concerné : ${committeeId}.`
      });

      return {
        ...project,
        answers: {
          ...answers,
          [COMPLIANCE_COMMENTS_KEY]: {
            ...comments,
            forcedCommitteeIds: nextForcedCommitteeIds
          }
        },
        lastUpdated: new Date().toISOString()
      };
    }));
  }, [currentUserDisplayName, notifyOwnerAndCoOwners]);

  const handleDeleteProject = useCallback((projectId) => {
    if (!projectId) {
      return;
    }

    setProjects(prevProjects => prevProjects.filter(project => project.id !== projectId));
    setActiveProjectId(prev => (prev === projectId ? null : prev));
  }, []);

  const handleDuplicateProject = useCallback((projectId) => {
    if (!projectId) {
      return null;
    }

    // Identifiant et nom sont calculés ici pour pouvoir être rendus à l’appelant :
    // l’updater de setProjects s’exécute pendant le rendu, trop tard pour en lire le résultat.
    const knownProjects = projectsRef.current || [];
    const source = knownProjects.find(project => project?.id === projectId);
    if (!source) {
      return null;
    }

    const duplicateId = `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const baseName = typeof source.projectName === 'string' && source.projectName.trim().length > 0
      ? source.projectName.trim()
      : t('home.projectNameFallback');
    const nameWithoutCopyPrefix = baseName.replace(/^\[Copie\]\s*/i, '').trim();
    const duplicateName = `[Copie] ${nameWithoutCopyPrefix.length > 0 ? nameWithoutCopyPrefix : baseName}`;

    setProjects(prevProjects => {
      const sourceProject = prevProjects.find(project => project.id === projectId);
      if (!sourceProject) {
        return prevProjects;
      }

      const answersClone = sourceProject.answers && typeof sourceProject.answers === 'object'
        ? JSON.parse(JSON.stringify(sourceProject.answers))
        : {};

      if (currentUserDisplayName) {
        answersClone.teamLead = currentUserDisplayName;
      }

      const relevantQuestions = questions.filter(question => shouldShowQuestion(question, answersClone));
      const {
        totalMandatoryQuestions: derivedTotalQuestions,
        answeredMandatoryQuestions: derivedAnsweredQuestions
      } = computeMandatoryProgress(relevantQuestions, answersClone);
      const totalQuestions = derivedTotalQuestions > 0
        ? derivedTotalQuestions
        : typeof sourceProject.totalQuestions === 'number' && sourceProject.totalQuestions > 0
          ? sourceProject.totalQuestions
          : 0;

      const answeredQuestionsCount = derivedTotalQuestions > 0
        ? derivedAnsweredQuestions
        : typeof sourceProject.answeredQuestions === 'number'
          ? Math.min(sourceProject.answeredQuestions, totalQuestions || sourceProject.answeredQuestions)
          : 0;

      const computedAnalysis = Object.keys(answersClone).length > 0
        ? analyzeAnswers(answersClone, rules, riskLevelRules, riskWeights)
        : null;

      const duplicateEntry = {
        id: duplicateId,
        projectName: duplicateName,
        answers: answersClone,
        analysis: computedAnalysis,
        status: 'draft',
        lastUpdated: new Date().toISOString(),
        lastQuestionIndex: 0,
        totalQuestions,
        answeredQuestions: Math.min(answeredQuestionsCount, totalQuestions || answeredQuestionsCount),
        ownerEmail: currentUserEmail || '',
        sharedWith: []
      };

      return [duplicateEntry, ...prevProjects];
    });

    return { id: duplicateId, projectName: duplicateName };
  }, [
    analyzeAnswers,
    currentUserDisplayName,
    currentUserEmail,
    questions,
    riskLevelRules,
    riskWeights,
    rules,
    shouldShowQuestion,
    t
  ]);

  const openProjectShowcase = useCallback((context = {}) => {
    const {
      projectId = null,
      projectName: providedProjectName,
      status: providedStatus,
      answers: providedAnswers,
      analysis: providedAnalysis,
      relevantTeams: providedRelevantTeams,
      questions: providedQuestions,
      timelineDetails: providedTimelineDetails
    } = context || {};

    const project = projectId ? projects.find(item => item.id === projectId) : null;
    const answersSource = providedAnswers || project?.answers || {};
    const visibleQuestions = Array.isArray(providedQuestions) && providedQuestions.length > 0
      ? providedQuestions
      : questions.filter(question => shouldShowQuestion(question, answersSource));
    const computedAnalysis = providedAnalysis
      || (project && !providedAnswers
        ? resolveProjectAnalysis(project, (a) => analyzeAnswers(a, rules, riskLevelRules, riskWeights))
        : (Object.keys(answersSource).length > 0
          ? analyzeAnswers(answersSource, rules, riskLevelRules, riskWeights)
          : null));
    const relevantTeamsList = Array.isArray(providedRelevantTeams) && providedRelevantTeams.length > 0
      ? providedRelevantTeams
      : teams.filter(team => (computedAnalysis?.teams || []).includes(team.id));
    const timelineDetailsList = Array.isArray(providedTimelineDetails)
      ? providedTimelineDetails
      : computedAnalysis?.timeline?.details || [];

    const normalizedProjectName = typeof providedProjectName === 'string' && providedProjectName.trim().length > 0
      ? providedProjectName.trim()
      : (typeof project?.projectName === 'string' && project.projectName.trim().length > 0
        ? project.projectName.trim()
        : extractProjectName(answersSource, questions));

    const resolvedProjectName = normalizedProjectName && normalizedProjectName.length > 0
      ? normalizedProjectName
      : t('home.projectNameFallback');
    const resolvedStatus = providedStatus || project?.status || 'draft';

    const {
      totalMandatoryQuestions: totalQuestions,
      answeredMandatoryQuestions: answeredQuestionsCount
    } = computeMandatoryProgress(visibleQuestions, answersSource);

    const hasShowcaseIncompleteAnswers = visibleQuestions.length > 0
      ? visibleQuestions.some(
        question => question.required && !isAnswerProvided(answersSource[question.id])
      )
      : Object.keys(answersSource).length === 0;


    if (projectId) {
      setProjects(prevProjects => prevProjects.map(entry => {
        if (entry.id !== projectId) {
          return entry;
        }

        return {
          ...entry,
          analysis: computedAnalysis,
          totalQuestions,
          answeredQuestions: Math.min(
            answeredQuestionsCount,
            totalQuestions || answeredQuestionsCount
          )
        };
      }));
    }

    const pendingShowcaseMode = pendingShowcaseDisplayModeRef.current;
    const resolvedShowcaseMode = resolveShowcaseDisplayMode(pendingShowcaseMode) || 'full';
    const pendingSharedView = Boolean(pendingShowcaseSharedRef.current);
    const pendingComments = Boolean(pendingShowcaseCommentsRef.current);
    const pendingAnnotationVisibility = pendingShowcaseAnnotationVisibilityRef.current === 'mine' ? 'mine' : 'all';
    const resolvedDisplayModeLock = pendingSharedView
      ? resolvedShowcaseMode
      : resolvedShowcaseMode === 'light'
        ? 'light'
        : null;

    pendingShowcaseDisplayModeRef.current = null;
    pendingShowcaseSharedRef.current = false;
    pendingShowcaseCommentsRef.current = false;
    pendingShowcaseAnnotationVisibilityRef.current = 'all';
    setShowcaseDisplayMode(resolvedShowcaseMode);
    setShowcaseDisplayModeLock(resolvedDisplayModeLock);
    setIsShowcaseSharedView(pendingSharedView);
    setShowcaseCommentsEnabled(pendingComments);
    setShowcaseAnnotationVisibilityMode(pendingAnnotationVisibility);

    setShowcaseProjectContext({
      projectId: projectId || null,
      projectName: resolvedProjectName,
      status: resolvedStatus,
      answers: answersSource,
      analysis: computedAnalysis,
      relevantTeams: relevantTeamsList,
      questions: visibleQuestions.length > 0 ? visibleQuestions : questions,
      timelineDetails: timelineDetailsList,
      hasIncompleteAnswers: hasShowcaseIncompleteAnswers
    });
    previousScreenRef.current = screen;
    setScreen('showcase');
  }, [
    analyzeAnswers,
    projects,
    questions,
    resolveProjectAnalysis,
    riskLevelRules,
    riskWeights,
    rules,
    screen,
    shouldShowQuestion,
    t,
    teams
  ]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const pendingProjectId = pendingShowcaseProjectIdRef.current;
    if (!pendingProjectId) {
      return;
    }

    const matchingProject = projects.find(project => project?.id === pendingProjectId);
    if (!matchingProject) {
      return;
    }

    pendingShowcaseProjectIdRef.current = null;
    openProjectShowcase({ projectId: pendingProjectId });
  }, [isHydrated, openProjectShowcase, projects]);

  const isActiveProjectShowcaseBlocked = useMemo(
    () => isShowcaseAccessBlockedByProjectType(answers),
    [answers]
  );

  const canShowProjectShowcase = useCallback(
    (project) => !isShowcaseAccessBlockedByProjectType(project?.answers || {}),
    []
  );

  const handleShowProjectShowcase = useCallback((projectId) => {
    if (!projectId) {
      return;
    }

    const project = projects.find((entry) => entry?.id === projectId);
    if (isShowcaseAccessBlockedByProjectType(project?.answers || {})) {
      return;
    }

    openProjectShowcase({ projectId });
  }, [openProjectShowcase, projects]);

  const handleOpenActiveProjectShowcase = useCallback((payload = {}) => {
    const projectId = payload?.projectId || activeProjectId || null;

    if (isShowcaseAccessBlockedByProjectType(answers)) {
      return;
    }

    openProjectShowcase({
      ...payload,
      projectId
    });
  }, [activeProjectId, answers, openProjectShowcase]);

  const handleCloseProjectShowcase = useCallback(() => {
    setShowcaseProjectContext(null);
    setShowcaseDisplayMode('full');
    setShowcaseDisplayModeLock(null);
    setIsShowcaseSharedView(false);
    setShowcaseCommentsEnabled(false);
    setShowcaseAnnotationVisibilityMode('all');
    if (previousScreenRef.current) {
      setScreen(previousScreenRef.current);
    } else {
      setScreen('home');
    }
    previousScreenRef.current = null;
  }, []);

  const handleReturnToComplianceReport = useCallback(() => {
    if (showcaseProjectContext?.projectId) {
      const { projectId } = showcaseProjectContext;
      setShowcaseProjectContext(null);
      setIsShowcaseSharedView(false);
      setShowcaseCommentsEnabled(false);
      setShowcaseAnnotationVisibilityMode('all');
      previousScreenRef.current = null;
      handleOpenProject(projectId, { view: 'synthesis' });
      return;
    }

    setShowcaseProjectContext(null);
    setIsShowcaseSharedView(false);
    setShowcaseCommentsEnabled(false);
    setShowcaseAnnotationVisibilityMode('all');

    if (previousScreenRef.current) {
      setScreen(previousScreenRef.current);
    } else {
      setScreen('synthesis');
    }

    previousScreenRef.current = null;
  }, [handleOpenProject, showcaseProjectContext, setScreen]);

  const handleUpdateProjectShowcaseAnswers = useCallback((updates) => {
    const projectId = showcaseProjectContext?.projectId;
    const project = projectId ? projects.find(entry => entry.id === projectId) : null;

    if (
      !showcaseProjectContext ||
      !projectId ||
      (showcaseProjectContext.status !== 'draft' && !isAdminMode)
      || !canManageProject(project)
      || !project
      || (project.status !== 'draft' && !isAdminMode)
    ) {
      return;
    }

    // Le patch est calculé ici, avant tout setState, plutôt que dans le
    // callback fonctionnel de setProjects : React n'exécute pas forcément ce
    // callback de façon synchrone, donc muter une variable extérieure depuis
    // celui-ci pour la relire juste après (comme c'était fait auparavant)
    // laissait souvent showcaseProjectContext (et donc l'affichage de la
    // vitrine) figé sur les anciennes réponses après un enregistrement.
    const { nextAnswers, changed } = applyAnswerUpdates(
      project.answers || {},
      updates,
      questions,
      shouldShowQuestion,
      {
        shouldPreserveQuestion: (question) => !question?.showcase
      }
    );
    if (!changed) {
      return;
    }

    const relevantQuestions = questions.filter(question => shouldShowQuestion(question, nextAnswers));
    const {
      totalMandatoryQuestions: totalQuestions,
      answeredMandatoryQuestions: answeredQuestions
    } = computeMandatoryProgress(relevantQuestions, nextAnswers);

    const updatedAnalysis = analyzeAnswers(nextAnswers, rules, riskLevelRules, riskWeights);
    const timelineDetails = updatedAnalysis?.timeline?.details || [];
    const relevantTeamsIds = Array.isArray(updatedAnalysis?.teams) ? updatedAnalysis.teams : [];
    const relevantTeams = teams.filter(team => relevantTeamsIds.includes(team.id));
    const inferredName = extractProjectName(nextAnswers, questions);
    const sanitizedName = inferredName && inferredName.trim().length > 0
      ? inferredName.trim()
      : project.projectName;

    const lastQuestionIndex = totalQuestions > 0
      ? Math.min(Math.max(project.lastQuestionIndex ?? totalQuestions - 1, 0), totalQuestions - 1)
      : project.lastQuestionIndex ?? 0;

    const contextPatch = {
      projectName: sanitizedName,
      answers: nextAnswers,
      analysis: updatedAnalysis,
      relevantTeams,
      timelineDetails,
      questions: relevantQuestions.length > 0 ? relevantQuestions : null
    };

    const now = new Date().toISOString();

    const updatedProject = {
      ...project,
      answers: nextAnswers,
      analysis: updatedAnalysis,
      projectName: sanitizedName,
      totalQuestions,
      answeredQuestions: Math.min(answeredQuestions, totalQuestions || answeredQuestions),
      lastQuestionIndex,
      lastUpdated: now
    };

    setProjects(prevProjects => {
      if (!prevProjects.some(entry => entry.id === projectId)) {
        return prevProjects;
      }

      return [updatedProject, ...prevProjects.filter(entry => entry.id !== projectId)];
    });

    setShowcaseProjectContext(prev => {
      if (!prev || prev.projectId !== projectId) {
        return prev;
      }

      return {
        ...prev,
        ...contextPatch,
        questions: contextPatch.questions ? contextPatch.questions : prev.questions
      };
    });

    setHasUnsavedChanges(true);
  }, [
    analyzeAnswers,
    canManageProject,
    extractProjectName,
    isAdminMode,
    setHasUnsavedChanges,
    projects,
    questions,
    riskLevelRules,
    riskWeights,
    rules,
    showcaseProjectContext,
    shouldShowQuestion,
    teams
  ]);

  const upsertProject = useCallback((entry) => {
    return prevProjects => {
      if (!entry || !entry.id) {
        return prevProjects;
      }

      const filtered = prevProjects.filter(project => project.id !== entry.id);
      return [entry, ...filtered];
    };
  }, []);

  const handleSaveProject = useCallback((payload = {}) => {
    const baseAnswers = payload.answers && typeof payload.answers === 'object' ? payload.answers : answers;
    const sanitizedAnswers = baseAnswers || {};
    const status = payload.status === 'submitted' ? 'submitted' : 'draft';
    const projectId = activeProjectId || payload.id || `project-${Date.now()}`;
    const relevantQuestions = questions.filter(question => shouldShowQuestion(question, sanitizedAnswers));
    const existingProject = projects.find(project => project?.id === projectId);
    const {
      totalMandatoryQuestions: derivedTotalQuestions,
      answeredMandatoryQuestions: answeredQuestionsCount
    } = computeMandatoryProgress(relevantQuestions, sanitizedAnswers);
    const computedTotalQuestions = typeof payload.totalQuestions === 'number'
      ? payload.totalQuestions
      : derivedTotalQuestions;
    const totalQuestions = computedTotalQuestions > 0 ? computedTotalQuestions : 0;
    const now = new Date().toISOString();

    let computedAnalysis = null;
    if (payload.analysis && typeof payload.analysis === 'object') {
      computedAnalysis = payload.analysis;
    } else if (Object.keys(sanitizedAnswers).length > 0) {
      computedAnalysis = analyzeAnswers(sanitizedAnswers, rules, riskLevelRules, riskWeights);
    }

    if (status === 'submitted' && !computedAnalysis) {
      return null;
    }

    const inferredName = extractProjectName(sanitizedAnswers, questions);
    const projectNameRaw = typeof payload.projectName === 'string' ? payload.projectName : inferredName;
    const sanitizedName =
      projectNameRaw && projectNameRaw.trim().length > 0 ? projectNameRaw.trim() : t('home.projectNameFallback');

    let lastQuestionIndex =
      typeof payload.lastQuestionIndex === 'number' ? payload.lastQuestionIndex : currentQuestionIndex;
    if (status === 'submitted' && totalQuestions > 0) {
      lastQuestionIndex = totalQuestions - 1;
    }

    const clampedLastIndex = totalQuestions > 0
      ? Math.min(Math.max(lastQuestionIndex, 0), totalQuestions - 1)
      : 0;

    const entry = {
      id: projectId,
      projectName: sanitizedName,
      answers: sanitizedAnswers,
      analysis: computedAnalysis,
      status,
      lastUpdated: now,
      lastQuestionIndex: clampedLastIndex,
      totalQuestions,
      answeredQuestions: Math.min(answeredQuestionsCount, totalQuestions || answeredQuestionsCount),
      ownerEmail: existingProject?.ownerEmail || currentUserEmail || '',
      sharedWith: Array.isArray(existingProject?.sharedWith) ? existingProject.sharedWith : []
    };

    if (status === 'submitted') {
      entry.submittedAt = now;
    }

    setProjects(upsertProject(entry));
    setActiveProjectId(projectId);

    if (computedAnalysis) {
      setAnalysis(computedAnalysis);
    }

    setHasUnsavedChanges(false);

    return entry;
  }, [
    activeProjectId,
    activeQuestions.length,
    analyzeAnswers,
    answers,
    currentQuestionIndex,
    currentUserEmail,
    extractProjectName,
    projects,
    questions,
    riskLevelRules,
    riskWeights,
    rules,
    setHasUnsavedChanges,
    shouldShowQuestion,
    t,
    upsertProject
  ]);

  // `notifiedTeams` (et non `teams`) respecte le drapeau `notifyTeam` de chaque règle :
  // un administrateur peut décider qu’une règle mobilise une équipe sans la notifier.
  const notifyProjectSubmission = useCallback((project) => {
    const notifiedTeams = (Array.isArray(project?.analysis?.notifiedTeams)
      ? project.analysis.notifiedTeams
      : [])
      .map((teamId) => teams.find((entry) => entry?.id === teamId))
      .filter(Boolean);
    const teamNames = notifiedTeams.map((team) => team.name).filter(Boolean);
    const teamRecipients = normalizeRecipientList(
      notifiedTeams.flatMap((team) => normalizeTeamContacts(team))
    );

    if (teamRecipients.length > 0) {
      notify({
        type: NOTIFICATION_TYPES.PROJECT_SUBMITTED_TEAM,
        project,
        to: teamRecipients,
        teamNames
      });
    }

    const owners = buildOwnerNotificationRecipients(project);
    notify({
      type: NOTIFICATION_TYPES.PROJECT_SUBMITTED_OWNER,
      project,
      to: owners.to,
      cc: owners.cc,
      teamNames,
      // Le porteur qui soumet doit recevoir sa propre confirmation.
      includeActor: true
    });
  }, [buildOwnerNotificationRecipients, notify, teams]);

  const handleSubmitProject = useCallback((payload = {}) => {
    if (autosaveQueueRef.current && autosaveQueueRef.current.size() > 0) {
      setSaveFeedback({
        status: 'error',
        message: t('app.submit.syncing')
      });
      return null;
    }

    if (unansweredMandatoryQuestions.length > 0) {
      setSaveFeedback({
        status: 'error',
        message: t('app.submit.missingMandatory')
      });
      setScreen('synthesis');
      return null;
    }

    const entry = handleSaveProject({ ...payload, status: 'submitted' });
    if (entry) {
      notifyProjectSubmission(entry);
      setValidationError(null);
      setScreen('home');
    }
  }, [handleSaveProject, notifyProjectSubmission, t, unansweredMandatoryQuestions]);

  const handleDismissSaveFeedback = useCallback(() => {
    setSaveFeedback(null);
  }, []);

  const handleBackToQuestionnaire = useCallback(() => {
    if (unansweredMandatoryQuestions.length > 0) {
      const firstMissingId = unansweredMandatoryQuestions[0].id;
      const targetIndex = activeQuestions.findIndex(question => question.id === firstMissingId);
      if (targetIndex >= 0) {
        setCurrentQuestionIndex(targetIndex);
      }
    } else if (activeQuestions.length > 0) {
      const lastIndex = activeQuestions.length - 1;
      setCurrentQuestionIndex(prevIndex => {
        if (prevIndex > lastIndex) {
          return lastIndex;
        }
        return prevIndex;
      });
    }
    setValidationError(null);
    setScreen('questionnaire');
  }, [activeQuestions, unansweredMandatoryQuestions]);

  const handleNavigateToQuestion = useCallback((questionId) => {
    const targetIndex = activeQuestions.findIndex(question => question.id === questionId);
    if (targetIndex >= 0) {
      setCurrentQuestionIndex(targetIndex);
    }
    setValidationError(null);
    setScreen('questionnaire');
  }, [activeQuestions]);

  const handleNavigateToQuestionFromReport = useCallback((questionId) => {
    setReturnToSynthesisAfterEdit(true);
    handleNavigateToQuestion(questionId);
  }, [handleNavigateToQuestion]);

  const handleReturnToSynthesisFromQuestionnaire = useCallback(() => {
    navigateToSynthesis();
  }, [navigateToSynthesis]);

  const handleProceedToSynthesis = useCallback(() => {
    navigateToSynthesis();
  }, [navigateToSynthesis]);

  const syncStatusLabel = formatSyncStatusLabel(syncStatus, t);
  const syncStatusMeta = formatSyncMeta(syncStatus, t, language);

  const showcaseProjectId = showcaseProjectContext?.projectId || '';
  const canShareActiveProjectShowcase = useMemo(
    () => !isShowcaseSharedView && (isOnboardingActive || canManageProject(activeShowcaseProject)),
    [activeShowcaseProject, canManageProject, isOnboardingActive, isShowcaseSharedView]
  );
  const canConfigureActiveProjectShowcaseModes = useMemo(
    () => !isShowcaseSharedView && (isOnboardingActive || canManageProject(activeShowcaseProject)),
    [activeShowcaseProject, canManageProject, isOnboardingActive, isShowcaseSharedView]
  );
  const buildShowcaseShareUrl = useCallback((shareMode) => {
    if (!showcaseProjectId || typeof window === 'undefined') {
      return '';
    }

    const url = new URL(window.location.href);
    url.searchParams.set('projectId', showcaseProjectId);
    url.searchParams.set('showcaseShared', '1');
    if (showcaseShareCommentsEnabled) {
      url.searchParams.set('showcaseComments', '1');
      if (showcaseShareAnnotationVisibility === 'mine') {
        url.searchParams.set('showcaseAnnotationVisibility', 'mine');
      } else {
        url.searchParams.delete('showcaseAnnotationVisibility');
      }
    } else {
      url.searchParams.delete('showcaseComments');
      url.searchParams.delete('showcaseAnnotationVisibility');
    }
    if (shareMode === 'light') {
      url.searchParams.set('showcaseMode', 'light');
    } else {
      url.searchParams.delete('showcaseMode');
    }
    url.hash = `showcase=${showcaseProjectId}`;
    return url.toString();
  }, [showcaseProjectId, showcaseShareAnnotationVisibility, showcaseShareCommentsEnabled]);

  const showcaseShareUrl = useMemo(
    () => buildShowcaseShareUrl(showcaseShareMode),
    [buildShowcaseShareUrl, showcaseShareMode]
  );

  const handleOpenShowcaseShare = useCallback(() => {
    if (!showcaseProjectId || !canShareActiveProjectShowcase) {
      return;
    }

    setShowcaseShareMode(showcaseDisplayMode === 'light' ? 'light' : 'full');
    setShowcaseShareCommentsEnabled(false);
        setShowcaseShareAnnotationVisibility('all');
    setIsShowcaseShareOpen(true);
    setShowcaseShareFeedback('');
  }, [canShareActiveProjectShowcase, showcaseDisplayMode, showcaseProjectId]);

  const handleCloseShowcaseShare = useCallback(() => {
    setIsShowcaseShareOpen(false);
    setShowcaseShareFeedback('');
  }, []);

  useEffect(() => {
    if (!isShowcaseShareOpen) {
      return;
    }

    if (showcaseShareInputRef.current && typeof showcaseShareInputRef.current.focus === 'function') {
      showcaseShareInputRef.current.focus();
    }
  }, [isShowcaseShareOpen]);

  const handleCopyShowcaseLink = useCallback(async () => {
    if (!showcaseShareUrl) {
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(showcaseShareUrl);
        setShowcaseShareFeedback(t('app.showcaseShare.linkCopied'));
        return;
      }
    } catch (error) {
      // Fallback below.
    }

    if (typeof document !== 'undefined') {
      const input = document.getElementById('showcase-share-link');
      if (input && typeof input.select === 'function') {
        input.select();
        const copied = document.execCommand && document.execCommand('copy');
        if (copied) {
          setShowcaseShareFeedback(t('app.showcaseShare.linkCopied'));
          return;
        }
      }
    }

    setShowcaseShareFeedback(t('app.showcaseShare.copyFailed'));
  }, [showcaseShareUrl, t]);

  const handleDownloadShowcaseShortcut = useCallback(() => {
    if (!showcaseShareUrl || typeof window === 'undefined') {
      return;
    }

    const shortcutContent = `[InternetShortcut]\nURL=${showcaseShareUrl}\n`;
    const blob = new Blob([shortcutContent], { type: 'text/plain' });
    const fileName = `raccourci-showcase-${showcaseProjectId || 'projet'}.url`;
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = downloadUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);
    setShowcaseShareFeedback(t('app.showcaseShare.shortcutDownloaded'));
  }, [showcaseProjectId, showcaseShareUrl, t]);

  const handleSharePointReinitialization = useCallback(async () => {
    setSharePointReinitState({
      inProgress: true,
      message: t('app.reinit.checking'),
      status: 'pending'
    });

    try {
      const diagnostic = await diagnoseSharePointInstallation();
      const alreadyPublished = diagnostic.files.filter((entry) => entry.present);

      if (alreadyPublished.length > 0) {
        const confirmed =
          typeof window === 'undefined' || typeof window.confirm !== 'function'
            ? true
            : window.confirm(
              t('app.reinit.confirmOverwritePrefix', { count: alreadyPublished.length }) +
                  t('app.reinit.confirmOverwriteSuffix')
            );

        if (!confirmed) {
          setSharePointReinitState({
            inProgress: false,
            message: t('app.reinit.cancelledPublish'),
            status: 'idle'
          });
          return;
        }
      }

      setSharePointReinitState({
        inProgress: true,
        message: t('app.reinit.publishing'),
        status: 'pending'
      });

      const summary = await reinitializeSharePointConfiguration({
        questions,
        rules,
        teams,
        riskLevelRules,
        riskWeights,
        projectFilters,
        inspirationFilters,
        inspirationFormFields,
        onboardingTourConfig,
        validationCommitteeConfig,
        showcaseThemes,
        adminEmails,
        userEmail: currentUserEmail
      });

      const details = summary.lists
        .map((entry) => `${entry.name}: ${entry.count}`)
        .join(' · ');

      setSharePointReinitState({
        inProgress: false,
        message: t('app.reinit.publishedSuccess', { library: summary.libraryName, details }),
        status: 'success'
      });
    } catch (error) {
      setSharePointReinitState({
        inProgress: false,
        message: error?.message || t('app.reinit.failedGeneric'),
        status: 'error'
      });
    }
  }, [
    adminEmails,
    currentUserEmail,
    inspirationFilters,
    inspirationFormFields,
    onboardingTourConfig,
    projectFilters,
    questions,
    riskLevelRules,
    riskWeights,
    rules,
    showcaseThemes,
    t,
    teams,
    validationCommitteeConfig
  ]);

  return (
    <div className={`min-h-screen ${annotationOffsetClass}`}>
      {!isOnline && (
        <div
          role="alert"
          className="sticky top-0 z-50 w-full border-b border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800"
        >
          <div className="mx-auto max-w-2xl">{t('app.banners.offline')}</div>
        </div>
      )}

      {sharePointSync.state === 'loading' && (
        <div
          role="status"
          className="sticky top-0 z-50 w-full border-b border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800"
        >
          <div className="mx-auto max-w-2xl">{t('app.banners.syncing')}</div>
        </div>
      )}

      {sharePointSync.state === 'partial' && (
        <div
          role="status"
          className="sticky top-0 z-50 w-full border-b border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800"
        >
          <div className="mx-auto max-w-2xl">
            {t('app.banners.partialPrefix')}{sharePointSync.message}{t('app.banners.partialSuffix')}
          </div>
        </div>
      )}

      {sharePointSync.state === 'error' && (
        <div
          role="alert"
          className="sticky top-0 z-50 w-full border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <div className="mx-auto max-w-2xl">
            {t('app.banners.errorPrefix')}{sharePointSync.message}{t('app.banners.errorSuffix')}
          </div>
        </div>
      )}

      {sharePointSync.state === 'session-expired' && (
        <div
          role="alert"
          className="sticky top-0 z-50 w-full border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <div className="mx-auto max-w-2xl">
            {t('app.banners.sessionExpired')}{' '}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="font-medium underline"
            >
              {t('app.banners.reloadPage')}
            </button>{' '}
            {t('app.banners.reconnectSuffix')}
          </div>
        </div>
      )}

      {persistenceError && (
        <div
          role="alert"
          className="sticky top-0 z-50 w-full border-b border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900"
        >
          <div className="mx-auto flex max-w-2xl items-start justify-between gap-3">
            <span>{t('app.banners.persistenceError')}</span>
            <button
              type="button"
              onClick={() => setPersistenceError(false)}
              className="whitespace-nowrap rounded-lg border border-yellow-300 px-2 py-0.5 text-xs font-medium hover:bg-yellow-100"
            >
              {t('app.banners.close')}
            </button>
          </div>
        </div>
      )}
      <AnnotationLayer
        isActive={isAnnotationModeEnabled && screen === 'showcase'}
        isPaused={isAnnotationPaused}
        isEditing={isShowcaseEditing}
        hideToolbar={isOnboardingActive && onboardingStepId === 'showcase-back-to-report'}
        notes={annotationNotes}
        activeContextId={activeAnnotationContextKey}
        sourceColors={annotationSources}
        projectName={showcaseProjectContext?.projectName || ''}
        autoFocusNoteId={autoFocusAnnotationId}
        onAutoFocusComplete={() => setAutoFocusAnnotationId(null)}
        canCloseNotes={canCloseAnnotationNotes}
        noteVisibilityMode={isShowcaseSharedView ? showcaseAnnotationVisibilityMode : 'all'}
        currentSourceId={currentUserDisplayName || ''}
        onTogglePause={handleToggleAnnotationPause}
        onExit={handleToggleAnnotationMode}
        onNoteChange={handleAnnotationTextChange}
        onNoteClose={handleCloseAnnotationNote}
        onNoteReply={handleAddAnnotationReply}
      />

      <div id="tour-onboarding-anchor" className="sr-only" aria-hidden="true">
        {t('app.nav.guideLabel')}
      </div>
      {!shouldShowOnboarding && (
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center space-x-3 self-center">
              <img
                src={HEADER_LOGO_PATH}
                alt=""
                className="h-12 w-auto shrink-0 object-contain"
                aria-hidden="true"
              />
              <div>
                <h1 className="text-lg font-bold text-gray-800 sm:text-xl">Project Navigator</h1>
                    </div>
            </div>

            <div
              className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3 lg:justify-end"
              role="group"
              aria-label={t('app.nav.groupAriaLabel')}
            >
              {mode === 'user' && (
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  className="order-first self-start sm:order-none sm:self-center inline-flex h-10 px-4 items-center justify-center gap-2 rounded-full border bg-white border-gray-200 text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-label={t('profile.openButtonAriaLabel')}
                  title={t('profile.openButtonAriaLabel')}
                >
                  <UserCircle className="h-5 w-5" />
                  <span className="hidden sm:inline">{t('profile.title')}</span>
                </button>
              )}
              {screen === 'showcase' && (
                <button
                  type="button"
                  onClick={handleToggleAnnotationMode}
                  className={`order-first self-start sm:order-last sm:self-center inline-flex h-10 px-4 items-center justify-center rounded-full border text-blue-700 shadow-sm transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isAnnotationModeEnabled ? 'bg-blue-50 border-blue-200' : 'bg-white border-blue-100'
                  }`}
                  aria-pressed={isAnnotationModeEnabled}
                  aria-label={isAnnotationModeEnabled ? t('app.nav.annotationOn') : t('app.nav.annotationOff')}
                  title={isAnnotationModeEnabled ? t('app.nav.annotationOn') : t('app.nav.annotationOff')}
                  data-annotation-ui="true"
                  data-tour-id="showcase-comment-toggle"
                >
                  <MessageSquare className="h-5 w-5" />
                  <span className="sr-only">{t('app.nav.annotationSrOnly')}</span>
                </button>
              )}
              {screen === 'showcase' && canShareActiveProjectShowcase && (
                <button
                  type="button"
                  onClick={handleOpenShowcaseShare}
                  className="order-first self-start sm:order-last sm:self-center inline-flex h-10 px-4 items-center justify-center rounded-full border bg-white border-blue-100 text-blue-700 shadow-sm transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-label={t('app.nav.shareShowcase')}
                  title={t('app.nav.shareShowcase')}
                  data-tour-id="showcase-share-trigger"
                >
                  <Link className="h-5 w-5" />
                  <span className="sr-only">{t('app.nav.shareSrOnly')}</span>
                </button>
              )}
              {mode === 'user' && screen === 'showcase' && showcaseProjectContext && (
                <button
                  type="button"
                  onClick={handleReturnToComplianceReport}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg font-medium text-sm sm:text-base transition-all bg-blue-600 text-white"
                  aria-label={t('app.nav.returnToReport')}
                  title={t('app.nav.returnToReport')}
                  data-tour-id="showcase-back-to-report"
                >
                  {t('app.nav.reportSummaryLabel')}
                </button>
              )}
              {mode === 'user' && (
                <>
                  <button
                    type="button"
                    onClick={handleStartOnboarding}
                    className={`w-full sm:w-auto px-4 py-2 rounded-lg font-medium text-sm sm:text-base transition-all flex items-center justify-center gap-2 ${
                      isOnboardingActive
                        ? 'bg-blue-600 text-white'
                        : tourGuideStatus === 'ready'
                          ? 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
                          : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                    }`}
                    disabled={tourGuideStatus !== 'ready' || isOnboardingActive}
                    data-tour-id="nav-onboarding-trigger"
                    aria-live="polite"
                    aria-label={
                      tourGuideStatus === 'loading'
                        ? t('app.nav.guideLoadingAria')
                        : tourGuideStatus === 'error'
                          ? t('app.nav.guideErrorAria')
                          : t('app.nav.guideLaunchAria')
                    }
                    title={
                      tourGuideStatus === 'error'
                        ? t('app.nav.guideErrorTitle')
                        : undefined
                    }
                  >
                    {tourGuideStatus === 'loading' ? (
                      <span className="loading-spinner" aria-hidden="true" />
                    ) : (
                      <Sparkles className="text-lg sm:text-xl" aria-hidden="true" />
                    )}
                    <span>
                      {tourGuideStatus === 'loading'
                        ? t('app.nav.guidePreparing')
                        : tourGuideStatus === 'error'
                          ? t('app.nav.guideUnavailable')
                          : t('app.nav.guideLabel')}
                    </span>
                  </button>
                  {screen !== 'home' && (
                    <button
                      type="button"
                      onClick={() => setScreen('home')}
                      className={`w-full sm:w-auto px-4 py-2 rounded-lg font-medium text-sm sm:text-base transition-all bg-gray-100 text-gray-700 hover:bg-gray-200`}
                      aria-pressed={false}
                      aria-label={t('app.nav.backToHomeAriaLabel')}
                    >
                      {t('app.nav.backToHomeLabel')}
                    </button>
                  )}
                  <a
                    href="https://forms.office.com/e/p6PYB1gbpM"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm sm:text-base transition-all text-white bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 hover:from-pink-600 hover:via-red-600 hover:to-yellow-600 focus-visible:ring-pink-400"
                    aria-label={t('app.nav.feedbackAriaLabel')}
                  >
                    <Sparkles className="text-lg sm:text-xl" aria-hidden="true" />
                    <span>{t('app.nav.feedbackLabel')}</span>
                  </a>
                </>
              )}
              {mode === 'admin' && (
                <button
                  type="button"
                  onClick={handleReturnToProjectMode}
                  className={`w-full sm:w-auto px-4 py-2 rounded-lg font-medium text-sm sm:text-base transition-all ${
                    mode === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  aria-pressed={mode === 'user'}
                  aria-label={t('app.nav.switchToProjectModeAriaLabel')}
                >
                  {t('app.nav.switchToProjectModeLabel')}
                </button>
              )}
              {!isAdminMode && (
                <button
                  type="button"
                  onClick={handleActivateAdminOnHome}
                  className={`w-full sm:w-auto px-4 py-2 rounded-lg font-medium text-sm sm:text-base transition-all flex items-center justify-center ${
                    isAdminHomeView
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  aria-pressed={isAdminHomeView}
                  aria-label={t('app.nav.activateAdmin')}
                  title={t('app.nav.activateAdmin')}
                >
                  <Lock className="text-lg sm:text-xl" />
                  <span className="sr-only">{t('app.nav.adminModeSrOnly')}</span>
                </button>
              )}
              {isAdminMode && (
                <button
                  type="button"
                  onClick={handleBackOfficeClick}
                  className={`w-full sm:w-auto px-4 py-2 rounded-lg font-medium text-sm sm:text-base transition-all flex items-center justify-center gap-3 ${
                    isAdminBackOfficeView
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  aria-pressed={isAdminBackOfficeView}
                  aria-label={t('app.nav.accessBackOffice')}
                  title={t('app.nav.accessBackOffice')}
                >
                  <span>{t('app.nav.accessBackOffice')}</span>
                  <Settings className="text-lg sm:text-xl" aria-hidden="true" />
                </button>
              )}
              {backOfficeAuthError && (
                <p className="w-full text-sm text-red-600 sm:w-auto" role="alert">
                  {backOfficeAuthError}
                </p>
              )}
            </div>
          </div>
        </div>
      </nav>
      )}

      {isProfileModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-4 py-6 bg-black bg-opacity-50 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-modal-title"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full my-4 sm:my-8 p-6 sm:p-8 space-y-6 hv-modal-panel">
            <div className="text-center">
              <h2 id="profile-modal-title" className="text-xl font-semibold text-gray-800">
                {t('profile.title')}
              </h2>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">{t('profile.scopeSection.heading')}</p>
              <ActivityScopeSelector value={profileDraftScope} onChange={setProfileDraftScope} />
            </div>
            <div className="space-y-2">
              <label htmlFor="profile-language-select" className="text-sm font-medium text-gray-700">
                {t('profile.languageSection.heading')}
              </label>
              <select
                id="profile-language-select"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {SUPPORTED_LANGUAGES.map((code) => (
                  <option key={code} value={code}>
                    {LANGUAGE_LABELS[code]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition-all"
              >
                {t('profile.closeButton')}
              </button>
              <button
                type="button"
                onClick={handleSaveProfileFromModal}
                disabled={profileDraftScope.length === 0}
                className={`px-4 py-2 rounded-lg font-medium text-white transition-all ${
                  profileDraftScope.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {t('profile.saveButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isShowcaseShareOpen && canShareActiveProjectShowcase && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-black bg-opacity-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="showcase-share-title"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-4 hv-modal-panel">
            <div className="text-center">
              <h2 id="showcase-share-title" className="text-xl font-semibold text-gray-800">
                {t('app.showcaseShare.title')}
              </h2>
              <p className="mt-2 text-sm text-gray-600">{t('app.showcaseShare.description')}</p>
            </div>
            <div className="space-y-3">
              <label htmlFor="showcase-share-link" className="text-sm font-medium text-gray-700">
                {t('app.showcaseShare.linkLabel')}
              </label>
              <input
                id="showcase-share-link"
                type="text"
                value={showcaseShareUrl}
                ref={showcaseShareInputRef}
                readOnly
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800"
              />
              {showcaseShareFeedback && (
                <p className="text-sm text-blue-600">{showcaseShareFeedback}</p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">{t('app.showcaseShare.displayModeLabel')}</p>
              <div className="inline-flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowcaseShareMode('full')}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    showcaseShareMode === 'full'
                      ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                  aria-pressed={showcaseShareMode === 'full'}
                >
                  {t('app.showcaseShare.fullMode')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowcaseShareMode('light')}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    showcaseShareMode === 'light'
                      ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                  aria-pressed={showcaseShareMode === 'light'}
                >
                  {t('app.showcaseShare.lightMode')}
                </button>
              </div>
              <p className="text-xs text-gray-500">{t('app.showcaseShare.lightModeHint')}</p>
            </div>
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  checked={showcaseShareCommentsEnabled}
                  onChange={(event) => setShowcaseShareCommentsEnabled(event.target.checked)}
                />
                {t('app.showcaseShare.commentsEnabledLabel')}
              </label>
              <p className="text-xs text-gray-500">{t('app.showcaseShare.commentsHint')}</p>
              {showcaseShareCommentsEnabled && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{t('app.showcaseShare.postItVisibilityLabel')}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setShowcaseShareAnnotationVisibility('all')}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        showcaseShareAnnotationVisibility === 'all'
                          ? 'border-blue-200 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                      aria-pressed={showcaseShareAnnotationVisibility === 'all'}
                    >
                      {t('app.showcaseShare.allPostIts')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowcaseShareAnnotationVisibility('mine')}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        showcaseShareAnnotationVisibility === 'mine'
                          ? 'border-blue-200 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                      aria-pressed={showcaseShareAnnotationVisibility === 'mine'}
                    >
                      {t('app.showcaseShare.onlyMyPostIts')}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={handleCopyShowcaseLink}
                className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('app.showcaseShare.copyLink')}
              </button>
              <button
                type="button"
                onClick={handleDownloadShowcaseShortcut}
                className="px-5 py-2 bg-white text-blue-700 font-medium rounded-lg border border-blue-200 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('app.showcaseShare.downloadShortcut')}
              </button>
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleCloseShowcaseShare}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                {t('app.showcaseShare.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isBackOfficePromptOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="backoffice-auth-title"
        >
          <div className="absolute inset-0 bg-gray-900/50" onClick={() => closeBackOfficePrompt(false)} aria-hidden="true" />
          <form
            onSubmit={handleBackOfficePromptSubmit}
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="text-center">
              <h2 id="backoffice-auth-title" className="text-xl font-semibold text-gray-800">
                {t('app.backOfficeAuth.title')}
              </h2>
              <p className="mt-2 text-sm text-gray-600">{t('app.backOfficeAuth.description')}</p>
            </div>
            <div className="mt-5 space-y-3">
              <label htmlFor="backoffice-password" className="text-sm font-medium text-gray-700">
                {t('app.backOfficeAuth.passwordLabel')}
              </label>
              <input
                id="backoffice-password"
                type="password"
                value={backOfficePromptValue}
                onChange={(event) => setBackOfficePromptValue(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder={t('app.backOfficeAuth.passwordPlaceholder')}
              />
              {backOfficePromptError && (
                <p className="text-sm text-red-600" role="alert">
                  {backOfficePromptError}
                </p>
              )}
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => closeBackOfficePrompt(false)}
                className="px-5 py-2 bg-white text-gray-700 font-medium rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                {t('app.backOfficeAuth.cancel')}
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
              >
                {t('app.backOfficeAuth.unlock')}
              </button>
            </div>
          </form>
        </div>
      )}

      <main id="main-content" tabIndex="-1" className="focus:outline-none">
        {!isHydrated ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <LoadingFallback
              label={t('app.loading.homeLabel')}
              hint={t('app.loading.homeHint')}
            />
          </div>
        ) : shouldShowOnboarding ? (
          <Suspense fallback={(<LoadingFallback label={t('app.loading.screenLabel')} hint={t('app.loading.screenHint')} />)}>
            <LazyOnboardingScreen
              onComplete={(scope) => handleSaveUserProfile({ activityScope: scope })}
              onStartTour={() => {
                handleSaveUserProfile({ hasCompletedOnboarding: true });
                handleStartOnboarding();
              }}
              onSkipTour={() => handleSaveUserProfile({ hasCompletedOnboarding: true })}
            />
          </Suspense>
        ) : isAdminBackOfficeView ? (
          <AdminBackOfficeErrorBoundary onRecover={handleReturnToProjectMode}>
            <Suspense
              fallback={(
                <LoadingFallback
                  label={t('app.loading.backOfficeLabel')}
                  hint={t('app.loading.backOfficeHint')}
                />
              )}
            >
              <LazyBackOffice
                projects={projects}
                questions={questions}
                setQuestions={setQuestions}
                rules={rules}
                setRules={setRules}
                riskLevelRules={riskLevelRules}
                setRiskLevelRules={setRiskLevelRules}
                riskWeights={riskWeights}
                setRiskWeights={setRiskWeights}
                teams={teams}
                setTeams={setTeams}
                showcaseThemes={showcaseThemes}
                setShowcaseThemes={setShowcaseThemes}
                projectFilters={projectFilters}
                setProjectFilters={updateProjectFilters}
                inspirationFilters={inspirationFilters}
                setInspirationFilters={updateInspirationFilters}
                inspirationFormFields={inspirationFormFields}
                setInspirationFormFields={updateInspirationFormFields}
                onboardingTourConfig={onboardingTourConfig}
                setOnboardingTourConfig={setOnboardingTourConfig}
                validationCommitteeConfig={validationCommitteeConfig}
                setValidationCommitteeConfig={setValidationCommitteeConfig}
                adminEmails={adminEmails}
                setAdminEmails={setAdminEmails}
                currentUserEmail={currentUserEmail}
                isCurrentUserAdmin={isCurrentUserAdmin}
                activityScope={activityScope}
                onSharePointReinitialize={handleSharePointReinitialization}
                sharePointReinitializeState={sharePointReinitState}
                rulesQueueRef={rulesQueueRef}
                teamsQueueRef={teamsQueueRef}
                ruleServerMetaRef={ruleServerMetaRef}
                teamServerMetaRef={teamServerMetaRef}
              />
            </Suspense>
          </AdminBackOfficeErrorBoundary>
        ) : screen === 'home' ? (
          <Suspense fallback={(<LoadingFallback label={t('app.loading.screenLabel')} hint={t('app.loading.screenHint')} />)}>
            <LazyHomeScreen
            projects={projects}
            projectFilters={projectFilters}
            teamLeadOptions={teamLeadTeamOptions}
            teams={teams}
            inspirationProjects={inspirationProjects}
            inspirationFilters={inspirationFilters}
            validationCommitteeConfig={validationCommitteeConfig}
            currentUser={currentUser}
            homeView={homeView}
            onHomeViewChange={handleHomeViewChange}
            onStartInspirationProject={handleStartInspirationProject}
            onOpenInspirationProject={handleOpenInspirationProject}
            onStartNewProject={handleCreateNewProject}
            onOpenProject={handleOpenProject}
            onDeleteProject={handleDeleteProject}
            onShowProjectShowcase={handleShowProjectShowcase}
            canShowProjectShowcase={canShowProjectShowcase}
            onDuplicateProject={handleDuplicateProject}
            onReintegrateProjectInCommittee={handleReintegrateProjectInCommittee}
            isAdminMode={isAdminMode}
            tourContext={tourContext}
            />
          </Suspense>
        ) : screen === 'inspiration-form' ? (
          <Suspense fallback={(<LoadingFallback label={t('app.loading.inspirationFormLabel')} hint={t('app.loading.inspirationFormHint')} />)}>
            <LazyInspirationForm
            project={activeInspirationProject}
            formConfig={inspirationFormFields}
            existingProjects={inspirationProjects}
            onAutosave={handleAutosaveInspirationProject}
            onCancel={handleCancelInspirationForm}
            />
          </Suspense>
        ) : screen === 'inspiration-detail' ? (
          <Suspense fallback={(<LoadingFallback label={t('app.loading.inspirationDetailLabel')} hint={t('app.loading.inspirationDetailHint')} />)}>
            <LazyInspirationDetail
            project={activeInspirationProject}
            formConfig={inspirationFormFields}
            onBack={() => {
              setScreen('home');
              handleHomeViewChange('inspiration');
            }}
            onUpdate={handleUpdateInspirationProject}
            onExport={handleExportInspirationProject}
            />
          </Suspense>
        ) : screen === 'questionnaire' ? (
          <Suspense fallback={(<LoadingFallback label={t('app.loading.questionnaireLabel')} hint={t('app.loading.questionnaireHint')} />)}>
            <LazyQuestionnaireScreen
            questions={activeQuestions}
            currentIndex={currentQuestionIndex}
            answers={answers}
            onAnswer={handleAnswer}
            onNext={handleNext}
            onBack={handleBack}
            allQuestions={questions}
            onNavigateToQuestion={handleNavigateToQuestion}
            saveFeedback={saveFeedback}
            onDismissSaveFeedback={handleDismissSaveFeedback}
            validationError={validationError}
            onReturnToSynthesis={
              returnToSynthesisAfterEdit ? handleReturnToSynthesisFromQuestionnaire : undefined
            }
            isReturnToSynthesisRequested={returnToSynthesisAfterEdit}
            tourContext={tourContext}
            onFinish={leaveQuestionnaireForSynthesis}
            />
          </Suspense>
        ) : screen === 'mandatory-summary' ? (
          <MandatoryQuestionsSummary
            pendingQuestions={pendingMandatoryQuestions}
            totalQuestions={activeQuestions.length}
            onBackToQuestionnaire={handleBackToQuestionnaire}
            onNavigateToQuestion={handleNavigateToQuestion}
            onProceedToSynthesis={handleProceedToSynthesis}
          />
        ) : screen === 'synthesis' ? (
          <Suspense fallback={(<LoadingFallback label={t('app.loading.synthesisLabel')} hint={t('app.loading.synthesisHint')} />)}>
            <LazySynthesisReport
              answers={answers}
              analysis={analysis}
              teams={teams}
              questions={activeQuestions}
              projectStatus={activeProject?.status || null}
              projectId={activeProjectId}
              projectName={activeProjectName}
              onOpenProjectShowcase={handleOpenActiveProjectShowcase}
              canOpenProjectShowcase={!isActiveProjectShowcaseBlocked}
              isProjectEditable={isActiveProjectEditable}
              onRestart={handleRestart}
              onBack={isActiveProjectEditable ? handleBackToQuestionnaire : undefined}
              onUpdateAnswers={isActiveProjectEditable ? handleUpdateAnswers : undefined}
              onUpdateComplianceComments={activeProjectId ? handleUpdateComplianceComments : undefined}
              onComplianceReplyNotification={handleComplianceReplyNotification}
              currentUser={currentUser}
              sharedMembers={activeProject?.sharedWith || []}
              ownerEmail={activeProject?.ownerEmail || ''}
              onShareProjectMember={activeProjectId && canManageProject(activeProject) ? handleAddSharedMember : undefined}
              onRemoveProjectMember={activeProjectId && canManageProject(activeProject) ? handleRemoveSharedMember : undefined}
              onSubmitProject={handleSubmitProject}
              onNavigateToQuestion={handleNavigateToQuestionFromReport}
              isExistingProject={Boolean(activeProjectId)}
              saveFeedback={saveFeedback}
              onDismissSaveFeedback={handleDismissSaveFeedback}
              isAdminMode={isAdminMode}
              hasIncompleteAnswers={hasIncompleteAnswers}
              tourContext={tourContext}
              validationCommitteeConfig={validationCommitteeConfig}
              adminEmails={adminEmails}
            />
          </Suspense>
        ) : screen === 'showcase' ? (
          showcaseProjectContext ? (
            <div className="space-y-4">
              {showcaseProjectContext.status !== 'draft' && (
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                  {isAdminMode
                    ? t('app.showcaseStatus.adminEditable')
                    : t('app.showcaseStatus.readOnly')}
                </div>
              )}
              <Suspense
                fallback={(
                  <LoadingFallback
                    label={t('app.loading.showcaseLabel')}
                    hint={t('app.loading.showcaseHint')}
                  />
                )}
              >
                <LazyProjectShowcase
                  projectName={showcaseProjectContext.projectName}
                  onClose={handleCloseProjectShowcase}
                  analysis={showcaseProjectContext.analysis}
                  relevantTeams={showcaseProjectContext.relevantTeams}
                  questions={showcaseProjectContext.questions}
                  answers={showcaseProjectContext.answers}
                  timelineDetails={showcaseProjectContext.timelineDetails}
                  showcaseThemes={showcaseThemes}
                  hasIncompleteAnswers={Boolean(showcaseProjectContext.hasIncompleteAnswers)}
                  initialDisplayMode={showcaseDisplayMode}
                  displayModeLock={showcaseDisplayModeLock}
                  hideEditBar={isShowcaseSharedView}
                  canConfigureDisplayModes={canConfigureActiveProjectShowcaseModes}
                  hideNotice={isShowcaseSharedView}
                  onUpdateAnswers={
                    isShowcaseSharedView
                      ? undefined
                      : isOnboardingActive
                        ? noop
                        : showcaseProjectContext.status === 'draft' || isAdminMode
                          ? handleUpdateProjectShowcaseAnswers
                          : undefined
                  }
                  tourContext={tourContext}
                  onDisplayModeChange={setShowcaseDisplayMode}
                  onAnnotationScopeChange={setShowcaseAnnotationScope}
                  onEditingStateChange={setIsShowcaseEditing}
                />
              </Suspense>
            </div>
          ) : null
      ) : null}
    </main>

    {screen === 'showcase' && isShowcaseSharedView && showcaseCommentsEnabled && (
      <button
        type="button"
        onClick={handleToggleAnnotationMode}
        className={`fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold shadow-lg transition hover:shadow-xl ${
          isAnnotationModeEnabled
            ? 'border-blue-200 bg-blue-600 text-white'
            : 'border-blue-100 bg-white text-blue-700'
        }`}
        aria-pressed={isAnnotationModeEnabled}
        aria-label={isAnnotationModeEnabled ? t('app.floatingComments.close') : t('app.floatingComments.open')}
        title={isAnnotationModeEnabled ? t('app.floatingComments.close') : t('app.floatingComments.open')}
        data-annotation-ui="true"
      >
        <MessageSquare className="h-4 w-4" />
        <span>{t('app.floatingComments.label')}</span>
      </button>
    )}

    <footer className="bg-white border-t border-gray-200 mt-10" aria-label={t('app.footer.ariaLabel')}>
      <p className="text-xs text-gray-400 text-center py-4">
        Project Navigator · Version {APP_VERSION} · {syncStatusLabel}{syncStatusMeta ? ` · ${syncStatusMeta}` : ''} ·{' '}
        <a
          href="./mentions-legales.html"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-500"
        >
          {t('app.footer.legalNotice')}
        </a>
      </p>
    </footer>
    </div>
  );
};
