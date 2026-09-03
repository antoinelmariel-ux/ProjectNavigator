import React, { useCallback, useEffect, useMemo, useRef, useState } from '../react.js';
import {
  Plus,
  Target,
  Rocket,
  Compass,
  Search,
  Users,
  Calendar,
  CheckCircle,
  Eye,
  AlertTriangle,
  Edit,
  Copy,
  Trash2,
  Close,
  Sparkles
} from './icons.js';
import { normalizeProjectFilterConfig } from '../utils/projectFilters.js';
import { normalizeInspirationFiltersConfig } from '../utils/inspirationConfig.js';
import { normalizeTeamContacts } from '../utils/teamContacts.js';
import { normalizeEmail } from '../utils/normalizeEmail.js';
import {
  getTriggeredValidationCommittees,
  normalizeValidationCommitteeConfig
} from '../utils/validationCommittee.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { getLocaleTag } from '../i18n/languages.js';

const formatDate = (isoDate, language, unknownDateLabel) => {
  if (!isoDate) {
    return unknownDateLabel;
  }

  try {
    return new Date(isoDate).toLocaleString(getLocaleTag(language), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return unknownDateLabel;
  }
};

const getSafeString = (value) => (typeof value === 'string' ? value : '');

const normalizeInspirationFieldValues = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }

  return [];
};

const DEFAULT_SELECT_FILTER_VALUE = 'all';
const DEFAULT_TEXT_FILTER_VALUE = '';
const COMPLIANCE_COMMENTS_KEY = '__compliance_team_comments__';
const PROJECTS_PAGE_SIZE = 6;
const INSPIRATIONS_PAGE_SIZE = 6;

const normalizeComplianceComments = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return {
      teams: value.teams && typeof value.teams === 'object' ? value.teams : {},
      committees: value.committees && typeof value.committees === 'object' ? value.committees : {},
      forcedCommitteeIds: Array.isArray(value.forcedCommitteeIds) ? value.forcedCommitteeIds : []
    };
  }

  return {
    teams: {},
    committees: {},
    forcedCommitteeIds: []
  };
};

const PROJECT_FILTER_VALUE_EXTRACTORS = {
  projectName: (project) => {
    if (!project) {
      return '';
    }

    const directName = getSafeString(project.projectName);
    if (directName.trim().length > 0) {
      return directName;
    }

    return getSafeString(project.answers?.projectName);
  },
  teamLead: (project) => getSafeString(project?.answers?.teamLead),
  teamLeadTeam: (project) => getSafeString(project?.answers?.teamLeadTeam)
};

const formatAnswerValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => (item == null ? '' : String(item))).filter(Boolean).join(', ');
  }

  if (value && typeof value === 'object') {
    if (Array.isArray(value.values)) {
      return value.values.map((item) => (item == null ? '' : String(item))).filter(Boolean).join(', ');
    }
    if (typeof value.value !== 'undefined') {
      return String(value.value);
    }
  }

  if (value == null) {
    return '';
  }

  return String(value);
};

const getProjectFilterValue = (field, project) => {
  if (!field || !project) {
    return '';
  }

  const extractor = PROJECT_FILTER_VALUE_EXTRACTORS[field.id];
  if (typeof extractor === 'function') {
    const extracted = extractor(project);
    if (typeof extracted === 'string' && extracted.trim().length > 0) {
      return extracted;
    }
  }

  const sourceId = typeof field.sourceQuestionId === 'string' && field.sourceQuestionId.trim().length > 0
    ? field.sourceQuestionId
    : field.id;

  const answerValue = project?.answers?.[sourceId];
  if (typeof answerValue === 'string') {
    return answerValue;
  }

  const formattedAnswer = formatAnswerValue(answerValue);
  if (formattedAnswer.trim().length > 0) {
    return formattedAnswer;
  }

  const directValue = project[sourceId];
  if (typeof directValue === 'string') {
    return directValue;
  }

  return formatAnswerValue(directValue);
};

const getProjectTimestamp = (project) => {
  if (!project) {
    return 0;
  }

  const candidates = [project.lastUpdated, project.submittedAt, project.generatedAt];

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (!candidate) {
      continue;
    }

    const parsed = new Date(candidate).getTime();
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
};

const buildInitialFiltersState = (config) => {
  const initial = {
    sortOrder: 'desc',
    sortOrderDefault: 'desc'
  };

  if (!config || !Array.isArray(config.fields)) {
    return initial;
  }

  config.fields.forEach((field) => {
    if (!field) {
      return;
    }

    if (field.id === 'dateOrder') {
      const defaultValue = field.defaultValue === 'asc' ? 'asc' : 'desc';
      initial.sortOrder = defaultValue;
      initial.sortOrderDefault = defaultValue;
      return;
    }

    if (field.type === 'select') {
      initial[field.id] = DEFAULT_SELECT_FILTER_VALUE;
    } else {
      initial[field.id] = '';
    }
  });

  return initial;
};

const STATUS_CLASSNAMES = {
  draft: 'bg-yellow-50 border-yellow-200 text-yellow-600',
  submitted: 'bg-emerald-50 border-emerald-200 text-emerald-600'
};

const PaginationControls = ({ page, totalPages, onPrevious, onNext }) => {
  const { t } = useTranslation();

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-end gap-2 pt-2">
      <button
        type="button"
        onClick={onPrevious}
        disabled={page <= 1}
        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
          page <= 1
            ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
            : 'border-blue-200 bg-white text-blue-700 hover:bg-blue-50'
        }`}
      >
        {t('home.previous')}
      </button>
      <span className="text-xs font-medium text-gray-500">
        {t('home.pageOf', { page, totalPages })}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={page >= totalPages}
        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
          page >= totalPages
            ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
            : 'border-blue-200 bg-white text-blue-700 hover:bg-blue-50'
        }`}
      >
        {t('home.next')}
      </button>
    </div>
  );
};

const computeRemainingQuestions = (project) => {
  if (!project || typeof project.totalQuestions !== 'number' || project.totalQuestions <= 0) {
    return null;
  }

  const answeredCountRaw =
    typeof project.answeredQuestions === 'number'
      ? project.answeredQuestions
      : Math.max((project.lastQuestionIndex ?? 0) + 1, 0);

  const answeredCount = Math.min(answeredCountRaw, project.totalQuestions);
  const remainingCount = Math.max(project.totalQuestions - answeredCount, 0);

  return remainingCount;
};

export const HomeScreen = ({
  projects = [],
  projectFilters,
  teamLeadOptions = [],
  inspirationProjects = [],
  inspirationFilters,
  homeView = 'platform',
  onHomeViewChange,
  onStartInspirationProject,
  onOpenInspirationProject,
  onStartNewProject,
  onOpenProject,
  onDeleteProject,
  onShowProjectShowcase,
  canShowProjectShowcase,
  onDuplicateProject,
  onReintegrateProjectInCommittee,
  isAdminMode = false,
  tourContext = null,
  currentUser = null,
  teams = [],
  validationCommitteeConfig = null,
  isProjectsLoading = false
}) => {
  const { t, language } = useTranslation();
  const normalizedFilters = useMemo(
    () => normalizeProjectFilterConfig(projectFilters),
    [projectFilters]
  );
  const currentUserEmail = useMemo(
    () => normalizeEmail(currentUser?.mail || currentUser?.userPrincipalName || ''),
    [currentUser]
  );
  const currentUserFirstName = getSafeString(currentUser?.givenName).trim();
  const [complianceProjectsView, setComplianceProjectsView] = useState('pending');
  const [committeeSelectionModal, setCommitteeSelectionModal] = useState({ isOpen: false, project: null, committees: [] });
  const heroHeadline = currentUserFirstName.length > 0
    ? t('home.heroHeadlineNamed', { name: currentUserFirstName })
    : t('home.heroHeadlineGeneric');
  const compactHeadline = currentUserFirstName.length > 0
    ? t('home.compactHeadlineNamed', { name: currentUserFirstName })
    : t('home.compactHeadlineGeneric');
  const [filtersState, setFiltersState] = useState(() => buildInitialFiltersState(normalizedFilters));
  const normalizedInspirationFilters = useMemo(
    () => normalizeInspirationFiltersConfig(inspirationFilters),
    [inspirationFilters]
  );
  const [inspirationFiltersState, setInspirationFiltersState] = useState(() =>
    buildInitialFiltersState(normalizedInspirationFilters)
  );
  const [projectPage, setProjectPage] = useState(1);
  const [duplicationNotice, setDuplicationNotice] = useState(null);
  const [projectSearch, setProjectSearch] = useState('');
  const [inspirationPage, setInspirationPage] = useState(1);
  const [deleteDialogState, setDeleteDialogState] = useState(() => ({
    isOpen: false,
    project: null
  }));
  const deleteCancelButtonRef = useRef(null);
  const deleteConfirmButtonRef = useRef(null);
  const previouslyFocusedElementRef = useRef(null);

  const accessibleProjects = useMemo(() => {
    if (!Array.isArray(projects)) {
      return [];
    }

    if (isAdminMode || !currentUserEmail) {
      return projects;
    }

    return projects.filter((project) => {
      const ownerEmail = normalizeEmail(project?.ownerEmail);
      const sharedWith = Array.isArray(project?.sharedWith) ? project.sharedWith : [];
      const isShared = sharedWith.some((entry) => normalizeEmail(entry) === currentUserEmail);

      if (!ownerEmail && sharedWith.length === 0) {
        return true;
      }

      return ownerEmail === currentUserEmail || isShared;
    });
  }, [projects, isAdminMode, currentUserEmail]);

  // Piste 11 : l’argumentaire produit ne s’affiche que tant que l’utilisateur n’a pas
  // de projet en propre. Les projets simplement partagés avec lui ne comptent pas.
  const ownsAProject = useMemo(() => {
    if (!currentUserEmail || !Array.isArray(projects)) {
      return false;
    }

    return projects.some((project) => normalizeEmail(project?.ownerEmail) === currentUserEmail);
  }, [projects, currentUserEmail]);

  // Une inspiration "partagee" reste visible par tous ; une inspiration "personnelle"
  // ne doit remonter que pour son proprietaire (sauf entrees anciennes sans ownerEmail).
  const accessibleInspirationProjects = useMemo(() => {
    if (!Array.isArray(inspirationProjects)) {
      return [];
    }

    if (isAdminMode || !currentUserEmail) {
      return inspirationProjects;
    }

    return inspirationProjects.filter((project) => {
      if (project?.visibility === 'shared') {
        return true;
      }

      const ownerEmail = normalizeEmail(project?.ownerEmail);
      if (!ownerEmail) {
        return true;
      }

      return ownerEmail === currentUserEmail;
    });
  }, [inspirationProjects, isAdminMode, currentUserEmail]);

  const normalizedValidationCommitteeConfig = useMemo(
    () => normalizeValidationCommitteeConfig(validationCommitteeConfig),
    [validationCommitteeConfig]
  );

  const isComplianceExpert = useMemo(() => {
    if (!currentUserEmail) {
      return false;
    }

    return teams.some((team) => {
      const contacts = normalizeTeamContacts(team);
      return contacts.some((contact) => normalizeEmail(contact) === currentUserEmail);
    });
  }, [currentUserEmail, teams]);

  const isValidationCommitteeMember = useMemo(() => {
    if (!currentUserEmail) {
      return false;
    }

    return normalizedValidationCommitteeConfig.committees.some((committee) => {
      const committeeEmails = Array.isArray(committee?.emails) ? committee.emails : [];
      return committeeEmails.some((email) => normalizeEmail(email) === currentUserEmail);
    });
  }, [currentUserEmail, normalizedValidationCommitteeConfig.committees]);


  const currentUserCommittees = useMemo(() => {
    if (!currentUserEmail) {
      return [];
    }

    return normalizedValidationCommitteeConfig.committees.filter((committee) => {
      const committeeEmails = Array.isArray(committee?.emails) ? committee.emails : [];
      return committeeEmails.some((email) => normalizeEmail(email) === currentUserEmail);
    });
  }, [currentUserEmail, normalizedValidationCommitteeConfig.committees]);

  const isComplianceActor = isComplianceExpert || isValidationCommitteeMember;

  const complianceTriggeredProjects = useMemo(() => {
    if (!currentUserEmail || !isComplianceActor || !Array.isArray(projects)) {
      return [];
    }

    return projects
      .map((project) => {
        const comments = normalizeComplianceComments(project?.answers?.[COMPLIANCE_COMMENTS_KEY]);
        const forcedCommitteeIds = comments.forcedCommitteeIds;
        const analysisTeamIds = Array.isArray(project?.analysis?.teams) ? project.analysis.teams : [];
        const relevantTeams = teams.filter((team) => team?.id && analysisTeamIds.includes(team.id));

        const triggeredTeams = relevantTeams
          .filter((team) => {
            const contacts = normalizeTeamContacts(team);
            return contacts.some((contact) => normalizeEmail(contact) === currentUserEmail);
          })
          .map((team) => ({ id: team.id, name: team.name || team.id, type: 'team' }));

        const triggeredCommittees = getTriggeredValidationCommittees(normalizedValidationCommitteeConfig, {
          answers: project?.answers || {},
          analysis: project?.analysis || {},
          relevantTeams,
          forcedCommitteeIds
        })
          .filter((committee) => {
            const committeeEmails = Array.isArray(committee?.emails) ? committee.emails : [];
            return committeeEmails.some((email) => normalizeEmail(email) === currentUserEmail);
          })
          .map((committee) => ({ id: committee.id, name: committee.name || committee.id, type: 'committee' }));

        const triggeredPerimeters = [...triggeredTeams, ...triggeredCommittees];

        const allValidated = triggeredPerimeters.length > 0 && triggeredPerimeters.every((entry) => {
          const status = entry.type === 'committee'
            ? comments.committees?.[entry.id]?.status
            : comments.teams?.[entry.id]?.status;
          return status === 'validated';
        });

        const allExpertsValidated = relevantTeams.every((team) => comments.teams?.[team.id]?.status === 'validated');
        const userOutOfScopeCommittees = currentUserCommittees.filter(
          (committee) => !triggeredCommittees.some((entry) => entry.id === committee.id)
        );

        const isOutOfScopeCandidate =
          isValidationCommitteeMember
          && project?.status === 'submitted'
          && userOutOfScopeCommittees.length > 0
          && !allExpertsValidated;

        return {
          project,
          triggeredPerimeters,
          allValidated,
          isOutOfScopeCandidate,
          userOutOfScopeCommittees
        };
      })
      .filter((entry) => entry.triggeredPerimeters.length > 0 || entry.isOutOfScopeCandidate)
      .sort((a, b) => getProjectTimestamp(b.project) - getProjectTimestamp(a.project));
  }, [
    projects,
    currentUserEmail,
    currentUserCommittees,
    isComplianceActor,
    isValidationCommitteeMember,
    normalizedValidationCommitteeConfig,
    teams
  ]);

  const pendingComplianceProjects = useMemo(
    () => complianceTriggeredProjects.filter((entry) => entry.triggeredPerimeters.length > 0 && !entry.allValidated),
    [complianceTriggeredProjects]
  );

  const treatedComplianceProjects = useMemo(
    () => complianceTriggeredProjects.filter((entry) => entry.triggeredPerimeters.length > 0 && entry.allValidated),
    [complianceTriggeredProjects]
  );

  const outOfScopeCommitteeProjects = useMemo(
    () => complianceTriggeredProjects.filter((entry) => entry.isOutOfScopeCandidate),
    [complianceTriggeredProjects]
  );

  const displayedComplianceProjects = complianceProjectsView === 'treated'
    ? treatedComplianceProjects
    : complianceProjectsView === 'out_of_scope'
      ? outOfScopeCommitteeProjects
      : pendingComplianceProjects;


  const handleReintegrateInCommittee = useCallback((projectEntry) => {
    if (!projectEntry || typeof onReintegrateProjectInCommittee !== 'function') {
      return;
    }

    const availableCommittees = Array.isArray(projectEntry.userOutOfScopeCommittees)
      ? projectEntry.userOutOfScopeCommittees
      : [];

    if (availableCommittees.length === 0) {
      return;
    }

    if (availableCommittees.length === 1) {
      onReintegrateProjectInCommittee(projectEntry.project.id, availableCommittees[0].id);
      return;
    }

    setCommitteeSelectionModal({
      isOpen: true,
      project: projectEntry,
      committees: availableCommittees
    });
  }, [onReintegrateProjectInCommittee]);

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialogState({ isOpen: false, project: null });
  }, []);

  const handleCancelDeleteProject = useCallback(() => {
    closeDeleteDialog();
  }, [closeDeleteDialog]);

  useEffect(() => {
    if (!tourContext?.isActive) {
      return;
    }

    if (typeof document === 'undefined') {
      return;
    }

    const { activeStep } = tourContext;
    let selector = null;

    if (activeStep === 'create-project') {
      selector = '[data-tour-id="home-create-project"]';
    } else if (activeStep === 'project-filters') {
      selector = '[data-tour-id="home-filters"]';
    }

    if (selector) {
      const element = document.querySelector(selector);
      if (element && typeof element.scrollIntoView === 'function') {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [tourContext]);

  const handleRequestProjectDeletion = useCallback((project) => {
    if (!project || !project.id || typeof onDeleteProject !== 'function') {
      return;
    }

    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      previouslyFocusedElementRef.current = document.activeElement;
    } else {
      previouslyFocusedElementRef.current = null;
    }

    setDeleteDialogState({
      isOpen: true,
      project
    });
  }, [onDeleteProject]);

  const handleConfirmDeleteProject = useCallback(() => {
    if (!deleteDialogState.project || typeof onDeleteProject !== 'function') {
      closeDeleteDialog();
      return;
    }

    onDeleteProject(deleteDialogState.project.id);
    closeDeleteDialog();
  }, [closeDeleteDialog, deleteDialogState.project, onDeleteProject]);

  const handleDuplicateProjectWithFeedback = useCallback((projectId) => {
    if (typeof onDuplicateProject !== 'function') {
      return;
    }

    const duplicate = onDuplicateProject(projectId);
    if (!duplicate?.id) {
      return;
    }

    setProjectPage(1);
    setDuplicationNotice(duplicate);
  }, [onDuplicateProject]);

  useEffect(() => {
    if (!duplicationNotice?.id) {
      return undefined;
    }

    const frameId = window.setTimeout(() => {
      const card = document.getElementById(`project-card-${duplicationNotice.id}`);
      if (card && typeof card.scrollIntoView === 'function') {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 0);

    const clearId = window.setTimeout(() => setDuplicationNotice(null), 6000);

    return () => {
      window.clearTimeout(frameId);
      window.clearTimeout(clearId);
    };
  }, [duplicationNotice]);

  useEffect(() => {
    if (!deleteDialogState.isOpen) {
      if (
        previouslyFocusedElementRef.current &&
        typeof previouslyFocusedElementRef.current.focus === 'function'
      ) {
        const shouldRestoreFocus =
          typeof document === 'undefined' ||
          document.contains(previouslyFocusedElementRef.current);

        if (shouldRestoreFocus) {
          previouslyFocusedElementRef.current.focus();
        }

        previouslyFocusedElementRef.current = null;
      }
      return undefined;
    }

    const timeoutId = typeof window !== 'undefined'
      ? window.setTimeout(() => {
        if (deleteCancelButtonRef.current && typeof deleteCancelButtonRef.current.focus === 'function') {
          deleteCancelButtonRef.current.focus();
        }
      }, 0)
      : null;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCancelDeleteProject();
        return;
      }

      if (event.key === 'Tab') {
        const focusableElements = [deleteCancelButtonRef.current, deleteConfirmButtonRef.current].filter(
          (element) => element && typeof element.focus === 'function'
        );

        if (focusableElements.length === 0) {
          return;
        }

        const activeElement = typeof document !== 'undefined' ? document.activeElement : null;
        const currentIndex = focusableElements.indexOf(activeElement);
        let nextIndex = currentIndex;

        if (event.shiftKey) {
          nextIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
        } else {
          nextIndex = currentIndex === focusableElements.length - 1 ? 0 : currentIndex + 1;
        }

        event.preventDefault();
        focusableElements[nextIndex]?.focus();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('keydown', handleKeyDown);
      }
      if (timeoutId !== null && typeof window !== 'undefined') {
        window.clearTimeout(timeoutId);
      }
    };
  }, [deleteDialogState.isOpen, handleCancelDeleteProject]);

  useEffect(() => {
    setFiltersState(prevState => {
      const initialState = buildInitialFiltersState(normalizedFilters);
      const nextState = { ...prevState };
      let changed = false;

      if (typeof prevState.sortOrder === 'undefined') {
        nextState.sortOrder = initialState.sortOrder;
        changed = true;
      }
      if (typeof prevState.sortOrderDefault === 'undefined') {
        nextState.sortOrderDefault = initialState.sortOrderDefault;
        changed = true;
      }

      if (prevState.sortOrder === prevState.sortOrderDefault) {
        if (prevState.sortOrder !== initialState.sortOrder) {
          nextState.sortOrder = initialState.sortOrder;
          changed = true;
        }
      }
      if (prevState.sortOrderDefault !== initialState.sortOrderDefault) {
        nextState.sortOrderDefault = initialState.sortOrderDefault;
        changed = true;
      }

      normalizedFilters.fields.forEach((field) => {
        if (!field || field.id === 'dateOrder') {
          return;
        }

        if (field.type === 'select') {
          if (!(field.id in prevState)) {
            nextState[field.id] = DEFAULT_SELECT_FILTER_VALUE;
            changed = true;
          }
          if (!field.enabled && nextState[field.id] !== DEFAULT_SELECT_FILTER_VALUE) {
            nextState[field.id] = DEFAULT_SELECT_FILTER_VALUE;
            changed = true;
          }
        } else {
          if (!(field.id in prevState)) {
            nextState[field.id] = '';
            changed = true;
          }
          if (!field.enabled && nextState[field.id] !== '') {
            nextState[field.id] = '';
            changed = true;
          }
        }
      });

      Object.keys(nextState).forEach((key) => {
        if (key === 'sortOrder' || key === 'sortOrderDefault') {
          return;
        }

        const stillExists = normalizedFilters.fields.some((field) => field && field.id === key);
        if (!stillExists) {
          delete nextState[key];
          changed = true;
        }
      });

      if (!changed) {
        return prevState;
      }

      return nextState;
    });
  }, [normalizedFilters]);

  useEffect(() => {
    setInspirationFiltersState(prevState => {
      const initialState = buildInitialFiltersState(normalizedInspirationFilters);
      const nextState = { ...prevState };
      let changed = false;

      normalizedInspirationFilters.fields.forEach((field) => {
        if (!field) {
          return;
        }

        if (field.type === 'select') {
          if (!(field.id in prevState)) {
            nextState[field.id] = DEFAULT_SELECT_FILTER_VALUE;
            changed = true;
          }
          if (!field.enabled && nextState[field.id] !== DEFAULT_SELECT_FILTER_VALUE) {
            nextState[field.id] = DEFAULT_SELECT_FILTER_VALUE;
            changed = true;
          }
        } else {
          if (!(field.id in prevState)) {
            nextState[field.id] = DEFAULT_TEXT_FILTER_VALUE;
            changed = true;
          }
          if (!field.enabled && nextState[field.id] !== DEFAULT_TEXT_FILTER_VALUE) {
            nextState[field.id] = DEFAULT_TEXT_FILTER_VALUE;
            changed = true;
          }
        }
      });

      Object.keys(nextState).forEach((key) => {
        const stillExists = normalizedInspirationFilters.fields.some((field) => field && field.id === key);
        if (!stillExists) {
          delete nextState[key];
          changed = true;
        }
      });

      if (!changed) {
        return prevState;
      }

      return nextState;
    });
  }, [normalizedInspirationFilters]);

  const selectFilterOptions = useMemo(() => {
    const fields = Array.isArray(normalizedFilters.fields) ? normalizedFilters.fields : [];
    const map = new Map();

    fields.forEach((field) => {
      if (!field || field.type !== 'select') {
        return;
      }

      const options = new Set();

      if (field.id === 'teamLeadTeam' && Array.isArray(teamLeadOptions)) {
        teamLeadOptions.forEach((option) => {
          const label = getSafeString(option).trim();
          if (label.length > 0) {
            options.add(label);
          }
        });
      }

      if (Array.isArray(field.options)) {
        field.options.forEach((option) => {
          const label = getSafeString(option).trim();
          if (label.length > 0) {
            options.add(label);
          }
        });
      }

      accessibleProjects.forEach((project) => {
        const value = getProjectFilterValue(field, project).trim();
        if (value.length > 0) {
          options.add(value);
        }
      });

      map.set(field.id, Array.from(options).sort((a, b) => a.localeCompare(b, getLocaleTag(language), { sensitivity: 'base' })));
    });

    return map;
  }, [accessibleProjects, normalizedFilters.fields, teamLeadOptions, language]);

  const inspirationFilterOptions = useMemo(() => {
    const fields = Array.isArray(normalizedInspirationFilters.fields) ? normalizedInspirationFilters.fields : [];
    const map = new Map();

    fields.forEach((field) => {
      if (!field || field.type !== 'select') {
        return;
      }

      const options = new Set();

      if (Array.isArray(field.options)) {
        field.options.forEach((option) => {
          const label = getSafeString(option).trim();
          if (label.length > 0) {
            options.add(label);
          }
        });
      }

      accessibleInspirationProjects.forEach((project) => {
        const values = normalizeInspirationFieldValues(project?.[field.id]);
        values.forEach((value) => {
          if (value.length > 0) {
            options.add(value);
          }
        });
      });

      map.set(field.id, Array.from(options).sort((a, b) => a.localeCompare(b, getLocaleTag(language), { sensitivity: 'base' })));
    });

    return map;
  }, [normalizedInspirationFilters.fields, accessibleInspirationProjects, language]);

  const filteredProjects = useMemo(() => {
    if (!Array.isArray(accessibleProjects)) {
      return [];
    }

    const activeFields = Array.isArray(normalizedFilters.fields) ? normalizedFilters.fields : [];

    const search = projectSearch.trim().toLowerCase();

    const selection = accessibleProjects.filter((project) => {
      if (search.length > 0) {
        const haystack = [
          project?.projectName,
          project?.answers?.teamLead,
          project?.answers?.teamLeadTeam
        ]
          .map((value) => getSafeString(value).toLowerCase())
          .join(' ');

        if (haystack.indexOf(search) === -1) {
          return false;
        }
      }

      for (let index = 0; index < activeFields.length; index += 1) {
        const field = activeFields[index];
        if (!field || !field.enabled || field.id === 'dateOrder') {
          continue;
        }

        const value = filtersState[field.id];

        if (field.type === 'select') {
          if (value && value !== DEFAULT_SELECT_FILTER_VALUE) {
            const projectValue = getProjectFilterValue(field, project);
            if (projectValue !== value) {
              return false;
            }
          }
          continue;
        }

        const query = typeof value === 'string' ? value.trim().toLowerCase() : '';
        if (query.length === 0) {
          continue;
        }

        const projectValue = getProjectFilterValue(field, project);
        if (projectValue.toLowerCase().indexOf(query) === -1) {
          return false;
        }
      }

      return true;
    });

    const sortField = activeFields.find((field) => field && field.id === 'dateOrder');
    const selectedOrder = filtersState.sortOrder || sortField?.defaultValue || 'desc';
    const direction = selectedOrder === 'asc' ? 'asc' : 'desc';

    return selection.slice().sort((a, b) => {
      const statusA = a?.status === 'draft' ? 0 : 1;
      const statusB = b?.status === 'draft' ? 0 : 1;

      if (statusA !== statusB) {
        return statusA - statusB;
      }

      const timeA = getProjectTimestamp(a);
      const timeB = getProjectTimestamp(b);
      const diff = timeA - timeB;

      return direction === 'asc' ? diff : -diff;
    });
  }, [accessibleProjects, normalizedFilters, filtersState, projectSearch]);

  const filteredInspirationProjects = useMemo(() => {
    if (!Array.isArray(accessibleInspirationProjects)) {
      return [];
    }

    const activeFields = Array.isArray(normalizedInspirationFilters.fields)
      ? normalizedInspirationFilters.fields
      : [];

    return accessibleInspirationProjects.filter((project) => {
      for (let index = 0; index < activeFields.length; index += 1) {
        const field = activeFields[index];
        if (!field || !field.enabled) {
          continue;
        }

        const value = inspirationFiltersState[field.id];
        const projectValues = normalizeInspirationFieldValues(project?.[field.id]);

        if (field.type === 'select') {
          if (value && value !== DEFAULT_SELECT_FILTER_VALUE) {
            if (!projectValues.includes(value)) {
              return false;
            }
          }
          continue;
        }

        const query = typeof value === 'string' ? value.trim().toLowerCase() : '';
        if (query.length === 0) {
          continue;
        }

        const haystack = projectValues.join(' ').toLowerCase();
        if (haystack.indexOf(query) === -1) {
          return false;
        }
      }

      return true;
    });
  }, [accessibleInspirationProjects, normalizedInspirationFilters.fields, inspirationFiltersState]);

  const submittedProjects = useMemo(() => {
    if (!Array.isArray(projects)) {
      return [];
    }

    return projects
      .filter((project) => project?.status === 'submitted')
      .slice()
      .sort((a, b) => getProjectTimestamp(b) - getProjectTimestamp(a));
  }, [projects]);

  const submittedInspirationProjects = useMemo(() => {
    if (!Array.isArray(inspirationProjects)) {
      return [];
    }

    return inspirationProjects
      .filter((project) => project?.visibility === 'shared')
      .slice()
      .sort((a, b) => getProjectTimestamp(b) - getProjectTimestamp(a));
  }, [inspirationProjects]);
  const personalInspirationProjects = useMemo(
    () => filteredInspirationProjects.filter((project) => project?.visibility !== 'shared'),
    [filteredInspirationProjects]
  );
  const sharedInspirationProjects = useMemo(
    () => filteredInspirationProjects.filter((project) => project?.visibility === 'shared'),
    [filteredInspirationProjects]
  );
  const totalProjectPages = Math.max(1, Math.ceil(filteredProjects.length / PROJECTS_PAGE_SIZE));
  const paginatedProjects = useMemo(() => {
    const offset = (projectPage - 1) * PROJECTS_PAGE_SIZE;
    return filteredProjects.slice(offset, offset + PROJECTS_PAGE_SIZE);
  }, [filteredProjects, projectPage]);
  const totalInspirationPages = Math.max(1, Math.ceil(filteredInspirationProjects.length / INSPIRATIONS_PAGE_SIZE));
  const paginatedPersonalInspirationProjects = useMemo(() => {
    const offset = (inspirationPage - 1) * INSPIRATIONS_PAGE_SIZE;
    const pageEntries = filteredInspirationProjects.slice(offset, offset + INSPIRATIONS_PAGE_SIZE);

    return pageEntries.filter((project) => project?.visibility !== 'shared');
  }, [filteredInspirationProjects, inspirationPage]);
  const paginatedSharedInspirationProjects = useMemo(() => {
    const offset = (inspirationPage - 1) * INSPIRATIONS_PAGE_SIZE;
    const pageEntries = filteredInspirationProjects.slice(offset, offset + INSPIRATIONS_PAGE_SIZE);

    return pageEntries.filter((project) => project?.visibility === 'shared');
  }, [filteredInspirationProjects, inspirationPage]);

  const hasProjects = accessibleProjects.length > 0;
  const hasFilteredProjects = filteredProjects.length > 0;
  const hasSubmittedProjects = submittedProjects.length > 0;
  const hasInspirationProjects = accessibleInspirationProjects.length > 0;
  const hasFilteredInspirationProjects = filteredInspirationProjects.length > 0;
  const hasPersonalInspirations = personalInspirationProjects.length > 0;
  const hasSharedInspirations = sharedInspirationProjects.length > 0;
  const hasSubmittedInspirations = submittedInspirationProjects.length > 0;
  const hasPaginatedPersonalInspirations = paginatedPersonalInspirationProjects.length > 0;
  const hasPaginatedSharedInspirations = paginatedSharedInspirationProjects.length > 0;
  const pendingDeletionProjectName = useMemo(() => {
    if (!deleteDialogState.project) {
      return '';
    }

    const directName = getSafeString(deleteDialogState.project.projectName);
    if (directName.trim().length > 0) {
      return directName;
    }

    const answerName = getSafeString(deleteDialogState.project.answers?.projectName);
    if (answerName.trim().length > 0) {
      return answerName;
    }

    return t('home.projectNameFallback');
  }, [deleteDialogState.project, t]);

  const hasActiveFilters = useMemo(() => {
    if (projectSearch.trim().length > 0) {
      return true;
    }

    const fields = Array.isArray(normalizedFilters.fields) ? normalizedFilters.fields : [];

    for (let index = 0; index < fields.length; index += 1) {
      const field = fields[index];
      if (!field || !field.enabled) {
        continue;
      }

      if (field.id === 'dateOrder') {
        if (filtersState.sortOrder !== filtersState.sortOrderDefault) {
          return true;
        }
        continue;
      }

      const value = filtersState[field.id];
      if (field.type === 'select') {
        if (value && value !== DEFAULT_SELECT_FILTER_VALUE) {
          return true;
        }
      } else if (typeof value === 'string' && value.trim().length > 0) {
        return true;
      }
    }

    return false;
  }, [normalizedFilters, filtersState, projectSearch]);

  const hasActiveInspirationFilters = useMemo(() => {
    const fields = Array.isArray(normalizedInspirationFilters.fields)
      ? normalizedInspirationFilters.fields
      : [];

    for (let index = 0; index < fields.length; index += 1) {
      const field = fields[index];
      if (!field || !field.enabled) {
        continue;
      }

      const value = inspirationFiltersState[field.id];
      if (field.type === 'select') {
        if (value && value !== DEFAULT_SELECT_FILTER_VALUE) {
          return true;
        }
      } else if (typeof value === 'string' && value.trim().length > 0) {
        return true;
      }
    }

    return false;
  }, [normalizedInspirationFilters.fields, inspirationFiltersState]);

  const displayedProjectsCount = filteredProjects.length;
  const totalProjectsCount = accessibleProjects.length;
  const sortFilterConfig = Array.isArray(normalizedFilters.fields)
    ? normalizedFilters.fields.find(field => field && field.id === 'dateOrder')
    : null;
  const enabledFilterFields = Array.isArray(normalizedFilters.fields)
    ? normalizedFilters.fields.filter(field => field && field.enabled && field.id !== 'dateOrder')
    : [];
  const shouldShowFiltersCard = hasProjects && (enabledFilterFields.length > 0 || (sortFilterConfig && sortFilterConfig.enabled));
  const currentSortOrder = filtersState.sortOrder || sortFilterConfig?.defaultValue || 'desc';
  const inspirationFilterFields = Array.isArray(normalizedInspirationFilters.fields)
    ? normalizedInspirationFilters.fields.filter((field) => field && field.enabled)
    : [];
  const shouldShowInspirationFiltersCard = hasInspirationProjects && inspirationFilterFields.length > 0;

  useEffect(() => {
    setProjectPage(1);
  }, [filteredProjects.length, homeView]);

  useEffect(() => {
    setInspirationPage(1);
  }, [filteredInspirationProjects.length, homeView]);

  const handleClearProjectFilter = useCallback((target) => {
    setFiltersState((prev) => {
      const next = { ...prev };

      if (target.type === 'sort') {
        const defaultValue = prev.sortOrderDefault || 'desc';
        if (prev.sortOrder === defaultValue) {
          return prev;
        }
        next.sortOrder = defaultValue;
        return next;
      }

      if (target.type === 'select') {
        next[target.id] = DEFAULT_SELECT_FILTER_VALUE;
      } else {
        next[target.id] = DEFAULT_TEXT_FILTER_VALUE;
      }

      return next;
    });
  }, []);

  const handleClearInspirationFilter = useCallback((target) => {
    setInspirationFiltersState((prev) => {
      const next = { ...prev };

      if (target.type === 'select') {
        next[target.id] = DEFAULT_SELECT_FILTER_VALUE;
      } else {
        next[target.id] = DEFAULT_TEXT_FILTER_VALUE;
      }

      return next;
    });
  }, []);

  const activeProjectFilterChips = useMemo(() => {
    const chips = [];

    enabledFilterFields.forEach((field) => {
      const rawValue = filtersState[field.id];
      if (field.type === 'select') {
        if (rawValue && rawValue !== DEFAULT_SELECT_FILTER_VALUE) {
          chips.push({
            id: field.id,
            label: field.label || t('home.filterFallback'),
            value: String(rawValue),
            onClear: () => handleClearProjectFilter({ id: field.id, type: 'select' })
          });
        }
        return;
      }

      const trimmed = typeof rawValue === 'string' ? rawValue.trim() : '';
      if (trimmed.length > 0) {
        chips.push({
          id: field.id,
          label: field.label || t('home.filterFallback'),
          value: trimmed,
          onClear: () => handleClearProjectFilter({ id: field.id, type: 'text' })
        });
      }
    });

    if (sortFilterConfig?.enabled && filtersState.sortOrder !== filtersState.sortOrderDefault) {
      chips.push({
        id: 'sortOrder',
        label: sortFilterConfig.label || t('home.sortFallback'),
        value: filtersState.sortOrder === 'asc' ? t('home.sortAsc') : t('home.sortDesc'),
        onClear: () => handleClearProjectFilter({ id: 'sortOrder', type: 'sort' })
      });
    }

    return chips;
  }, [
    enabledFilterFields,
    filtersState,
    sortFilterConfig,
    handleClearProjectFilter,
    t
  ]);

  const activeInspirationFilterChips = useMemo(() => {
    const chips = [];

    inspirationFilterFields.forEach((field) => {
      const rawValue = inspirationFiltersState[field.id];
      if (field.type === 'select') {
        if (rawValue && rawValue !== DEFAULT_SELECT_FILTER_VALUE) {
          chips.push({
            id: field.id,
            label: field.label || t('home.filterFallback'),
            value: String(rawValue),
            onClear: () => handleClearInspirationFilter({ id: field.id, type: 'select' })
          });
        }
        return;
      }

      const trimmed = typeof rawValue === 'string' ? rawValue.trim() : '';
      if (trimmed.length > 0) {
        chips.push({
          id: field.id,
          label: field.label || t('home.filterFallback'),
          value: trimmed,
          onClear: () => handleClearInspirationFilter({ id: field.id, type: 'text' })
        });
      }
    });

    return chips;
  }, [inspirationFilterFields, inspirationFiltersState, handleClearInspirationFilter, t]);

  const handleResetFilters = () => {
    setFiltersState(buildInitialFiltersState(normalizedFilters));
    setProjectSearch('');
  };

  const handleResetInspirationFilters = () => {
    setInspirationFiltersState(buildInitialFiltersState(normalizedInspirationFilters));
  };

  const renderProjectCard = (project) => {
    const risksCount = project.analysis?.risks?.length ?? 0;
    const isDraft = project.status === 'draft';
    const projectStatus = {
      className: STATUS_CLASSNAMES[project.status] || STATUS_CLASSNAMES.submitted,
      label: isDraft ? t('home.statusDraft') : t('home.statusSubmitted')
    };
    const remainingQuestions = computeRemainingQuestions(project);
    const progressTotal = typeof project.totalQuestions === 'number' ? project.totalQuestions : 0;
    const progressAnswered = remainingQuestions === null
      ? 0
      : Math.max(progressTotal - remainingQuestions, 0);
    const progressPercent = progressTotal > 0
      ? Math.round((progressAnswered / progressTotal) * 100)
      : 0;
    const adminCanEditSubmitted = isAdminMode && !isDraft;
    const leadName = getSafeString(project?.answers?.teamLead).trim();
    const leadTeam = getSafeString(project?.answers?.teamLeadTeam).trim();
    const leadDisplay = leadName.length > 0
      ? `${leadName}${leadTeam.length > 0 ? ` (${leadTeam})` : ''}`
      : leadTeam.length > 0
        ? `(${leadTeam})`
        : t('home.leadNotProvided');
    const projectTypeRaw = project?.answers?.ProjectType;
    const projectType = Array.isArray(projectTypeRaw)
      ? projectTypeRaw
          .map(item => (typeof item === 'string' ? item.trim() : ''))
          .filter(item => item.length > 0)
          .join(', ')
      : getSafeString(projectTypeRaw).trim();
    const projectTypeDisplay = projectType.length > 0
      ? projectType
      : t('home.projectTypeNotProvided');

    return (
      <article
        key={project.id}
        id={`project-card-${project.id}`}
        className={`border rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all ${
          duplicationNotice?.id === project.id
            ? 'bg-blue-50 border-blue-200'
            : 'bg-white border-gray-200'
        }`}
        role="listitem"
        aria-label={t('home.projectAriaLabel', { name: project.projectName || t('home.projectNameFallback') })}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
              <span>{project.projectName || t('home.projectNameFallback')}</span>
              {project.isDemo && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-full">
                  {t('home.demoProjectBadge')}
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {isDraft
                ? t('home.lastUpdated', { date: formatDate(project.lastUpdated || project.submittedAt, language, t('home.dateUnknown')) })
                : t('home.submittedOn', { date: formatDate(project.submittedAt || project.lastUpdated, language, t('home.dateUnknown')) })}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-end gap-2">
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-full border ${projectStatus.className}`.trim()}
              >
                {projectStatus.label}
              </span>
            </div>
            {typeof onDuplicateProject === 'function' && (
              <button
                type="button"
                onClick={() => handleDuplicateProjectWithFeedback(project.id)}
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                aria-label={t('home.duplicateProjectAriaLabel', { name: project.projectName || t('home.projectNameFallback') })}
                title={t('home.duplicateProjectTitle')}
              >
                <Copy className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
            {isDraft && typeof onDeleteProject === 'function' && (
              <button
                type="button"
                onClick={() => handleRequestProjectDeletion(project)}
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                aria-label={t('home.deleteProjectAriaLabel', { name: project.projectName || t('home.projectNameFallback') })}
                title={t('home.deleteProjectTitle')}
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {isDraft && progressTotal > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">{t('home.progressLabel')}</span>
              <span className="text-gray-500">
                {t('home.progressCount', { answered: progressAnswered, total: progressTotal })}
              </span>
            </div>
            <div
              className="mt-2 w-full bg-gray-200 rounded-full h-2"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('home.progressAriaLabel', { name: project.projectName || t('home.projectNameFallback') })}
            >
              <span
                className="block bg-blue-600 h-2 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
              risksCount > 0
                ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                : 'bg-gray-50 border-gray-200 text-gray-600'
            }`}
          >
            <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            {risksCount === 0
              ? t('home.noRisksIdentified')
              : t(risksCount > 1 ? 'home.risksIdentifiedPlural' : 'home.risksIdentifiedSingular', { count: risksCount })}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4" aria-hidden="true" />
            {leadDisplay}
          </span>
          <span className="flex items-center gap-2">
            <Target className="w-4 h-4" aria-hidden="true" />
            {projectTypeDisplay}
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              if (isDraft) {
                onOpenProject(project.id);
                return;
              }

              if (adminCanEditSubmitted) {
                onOpenProject(project.id, { view: 'questionnaire' });
                return;
              }

              onOpenProject(project.id);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              isDraft || adminCanEditSubmitted
                ? 'hv-button-draft text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isDraft ? (
              <>
                <Edit className="w-4 h-4" aria-hidden="true" />
                <span>{t('home.continueEditing')}</span>
              </>
            ) : adminCanEditSubmitted ? (
              <>
                <Edit className="w-4 h-4" aria-hidden="true" />
                <span>{t('home.editProject')}</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" aria-hidden="true" />
                <span>{t('home.viewSynthesis')}</span>
              </>
            )}
          </button>
          {adminCanEditSubmitted && (
            <button
              type="button"
              onClick={() => onOpenProject(project.id, { view: 'synthesis' })}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all bg-blue-600 text-white hover:bg-blue-700"
            >
              <Eye className="w-4 h-4" aria-hidden="true" />
              <span>{t('home.viewSynthesis')}</span>
            </button>
          )}
          {onShowProjectShowcase && (typeof canShowProjectShowcase !== 'function' || canShowProjectShowcase(project)) && (
            <button
              type="button"
              onClick={() => onShowProjectShowcase(project.id)}
              className="inline-flex items-center px-4 py-2 bg-white border border-blue-200 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-all"
            >
              <Sparkles className="w-4 h-4 mr-2" /> {t('home.projectShowcase')}
            </button>
          )}
        </div>
      </article>
    );
  };

  const renderInspirationCard = (project) => (
    <article
      key={project.id}
      className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all"
      role="listitem"
      aria-label={t('home.inspirationAriaLabel', { title: project.title || t('home.inspirationTitleFallback') })}
    >
      <div className="space-y-3">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{project.title || t('home.inspirationTitleFallback')}</h3>
          <p className="text-sm text-gray-500">{project.labName || t('home.labNotProvided')}</p>
        </div>
        <dl className="grid grid-cols-1 gap-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4" />
            <span>{project.country || t('home.countryNotProvided')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span>{project.target || t('home.targetNotProvided')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>{project.therapeuticArea || t('home.therapeuticAreaNotProvided')}</span>
          </div>
        </dl>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onOpenInspirationProject?.(project.id)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all bg-blue-600 text-white hover:bg-blue-700"
        >
          <Eye className="w-4 h-4" aria-hidden="true" />
          <span>{t('home.viewFullSheet')}</span>
        </button>
      </div>
    </article>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 px-4 py-8 sm:px-8">
      <div className="max-w-6xl mx-auto space-y-12">
        <header
          className={`bg-white border border-blue-100 rounded-3xl shadow-xl ${
            ownsAProject ? 'p-5 sm:p-6' : 'p-6 sm:p-10'
          }`}
          role="banner"
        >
          {ownsAProject ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">{compactHeadline}</h1>
                <p className="mt-1 text-sm text-gray-600">{t('home.compactSubtitle')}</p>
              </div>
              <button
                type="button"
                onClick={onStartNewProject}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all"
                data-tour-id="home-create-project"
              >
                <Plus className="w-5 h-5" aria-hidden="true" />
                <span>{t('home.createProject')}</span>
              </button>
            </div>
          ) : (
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-4">
              <span className="inline-flex items-center px-3 py-1 text-sm font-semibold text-blue-700 bg-blue-100 rounded-full border border-blue-200">
                <Target className="w-4 h-4 mr-2" /> {t('home.heroBadge')}
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
                {heroHeadline}
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed max-w-2xl">{t('home.heroDescription')}</p>
              <div className="flex flex-col sm:flex-row gap-3" role="group" aria-label={t('home.mainActionsAriaLabel')}>
                <button
                  type="button"
                  onClick={onStartNewProject}
                  className="inline-flex items-center justify-center gap-3 px-5 py-3 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all"
                  data-tour-id="home-create-project"
                >
                  <Plus className="w-5 h-5" aria-hidden="true" />
                  <span className="flex flex-col leading-tight text-left">
                    <span>{t('home.createNewProjectLine1')}</span>
                    <span>{t('home.createNewProjectLine2')}</span>
                  </span>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm text-gray-600">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4" role="listitem">
                <p className="font-semibold text-gray-800 flex items-center">
                  <Rocket className="w-5 h-5 mr-2" /> {t('home.feature1Title')}
                </p>
                <p className="mt-2 leading-relaxed">{t('home.feature1Body')}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4" role="listitem">
                <p className="font-semibold text-gray-800 flex items-center">
                  <Compass className="w-5 h-5 mr-2" /> {t('home.feature2Title')}
                </p>
                <p className="mt-2 leading-relaxed">{t('home.feature2Body')}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4" role="listitem">
                <p className="font-semibold text-gray-800 flex items-center">
                  <Users className="w-5 h-5 mr-2" /> {t('home.feature3Title')}
                </p>
                <p className="mt-2 leading-relaxed">{t('home.feature3Body')}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4" role="listitem">
                <p className="font-semibold text-gray-800 flex items-center">
                  <Calendar className="w-5 h-5 mr-2" /> {t('home.feature4Title')}
                </p>
                <p className="mt-2 leading-relaxed">{t('home.feature4Body')}</p>
              </div>
            </div>
          </div>
          )}
        </header>

        {isComplianceActor && homeView !== 'inspiration' && (
          <section
            aria-labelledby="compliance-projects-heading"
            className="bg-white border border-blue-100 rounded-3xl shadow-xl p-6 sm:p-8 space-y-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="compliance-projects-heading" className="text-2xl font-bold text-gray-900">
                  {t('home.triggeredHeading')}
                </h2>
                <p className="mt-1 text-sm text-gray-600">{t('home.triggeredSubtitle')}</p>
              </div>
              <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 p-1" role="group" aria-label={t('home.triggeredFilterAriaLabel')}>
                <button
                  type="button"
                  onClick={() => setComplianceProjectsView('pending')}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                    complianceProjectsView === 'pending'
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  {t('home.pendingTab', { count: pendingComplianceProjects.length })}
                </button>
                <button
                  type="button"
                  onClick={() => setComplianceProjectsView('treated')}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                    complianceProjectsView === 'treated'
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  {t('home.treatedTab', { count: treatedComplianceProjects.length })}
                </button>
                {isValidationCommitteeMember && (
                  <button
                    type="button"
                    onClick={() => setComplianceProjectsView('out_of_scope')}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                      complianceProjectsView === 'out_of_scope'
                        ? 'bg-blue-600 text-white'
                        : 'text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    {t('home.outOfScopeTab', { count: outOfScopeCommitteeProjects.length })}
                  </button>
                )}
              </div>
            </div>

            {displayedComplianceProjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 p-5 text-sm text-gray-600">
                {complianceProjectsView === 'pending'
                  ? t('home.noPendingTriggered')
                  : complianceProjectsView === 'treated'
                    ? t('home.noTreatedTriggered')
                    : t('home.noOutOfScopeTriggered')}
              </div>
            ) : (
              <div className="space-y-3" role="list" aria-label={t('home.triggeredListAriaLabel')}>
                {displayedComplianceProjects.map((projectEntry) => {
                  const { project, triggeredPerimeters, allValidated } = projectEntry;
                  return (
                    <article
                      key={`compliance-trigger-${project.id}`}
                      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                      role="listitem"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <h3 className="text-base font-semibold text-gray-900">
                            {project.projectName || t('home.projectNameFallback')}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {t('home.lastUpdated', { date: formatDate(project.lastUpdated || project.submittedAt, language, t('home.dateUnknown')) })}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {triggeredPerimeters.map((entry) => (
                              <span
                                key={`${project.id}-${entry.type}-${entry.id}`}
                                className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                              >
                                {entry.type === 'committee' ? t('home.committeeLabel') : t('home.expertLabel')} · {entry.name}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            allValidated
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-amber-50 border-amber-200 text-amber-700'
                          }`}>
                            {allValidated ? t('home.validated') : t('home.toReview')}
                          </span>
                          {complianceProjectsView === 'out_of_scope' && (
                            <button
                              type="button"
                              onClick={() => handleReintegrateInCommittee(projectEntry)}
                              className="inline-flex items-center gap-2 rounded-lg border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50"
                            >
                              {t('home.reintegrateInCommittee')}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenProject?.(project.id)}
                            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                            {t('home.open')}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <section aria-labelledby="projects-heading" className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 id="projects-heading" className="text-2xl font-bold text-gray-900">
                {homeView === 'inspiration' ? t('home.inspiringProjectsHeading') : t('home.savedProjectsHeading')}
              </h2>
              <p className="text-sm text-gray-600">
                {homeView === 'inspiration' ? t('home.inspirationSectionSubtitle') : t('home.projectsSectionSubtitle')}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div
                className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 p-1"
                role="group"
                aria-label={t('home.blockSelectionAriaLabel')}
              >
                <button
                  type="button"
                  onClick={() => onHomeViewChange?.('platform')}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                    homeView !== 'inspiration'
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  {t('home.lfbProjectsTab')}
                </button>
                <button
                  type="button"
                  onClick={() => onHomeViewChange?.('inspiration')}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                    homeView === 'inspiration'
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-700 hover:bg-blue-100'
                  }`}
                  data-tour-id="home-inspiration-toggle"
                >
                  {t('home.inspirationTab')}
                </button>
              </div>
              {homeView === 'inspiration' ? (
                <button
                  type="button"
                  onClick={onStartInspirationProject}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  data-tour-id="home-add-inspiration"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  {t('home.addInspiringProject')}
                </button>
              ) : (
                <span className="inline-flex items-center text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
                  <CheckCircle className="w-4 h-4 mr-2" />{' '}
                  {t(displayedProjectsCount > 1 ? 'home.projectCountPlural' : 'home.projectCountSingular', { count: displayedProjectsCount })}
                  {hasActiveFilters ? ` ${t('home.outOfTotal', { total: totalProjectsCount })}` : ''}
                </span>
              )}
            </div>
          </div>

          {homeView !== 'inspiration' && duplicationNotice && (
            <div
              className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800"
              role="status"
              aria-live="polite"
            >
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p>
                {t('home.duplicateNoticePrefix')}{' '}
                <span className="font-semibold">{duplicationNotice.projectName}</span>. {t('home.duplicateNoticeSuffix')}
              </p>
            </div>
          )}

          {homeView !== 'inspiration' && !hasProjects && isProjectsLoading && (
            <div
              className="bg-white border border-dashed border-blue-200 rounded-3xl p-8"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center justify-center gap-3 text-center text-gray-600">
                <span className="loading-spinner" aria-hidden="true" />
                <div>
                  <p className="text-lg font-medium text-gray-800">{t('home.projectsLoadingTitle')}</p>
                  <p className="mt-1 text-sm">{t('home.projectsLoadingBody')}</p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6" aria-hidden="true">
                {[0, 1].map((placeholderIndex) => (
                  <div key={placeholderIndex} className="border rounded-2xl p-6">
                    <span className="cn-line cn-line--title" />
                    <span className="cn-line cn-line--text" />
                    <span className="cn-line cn-line--short" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {homeView !== 'inspiration' && !hasProjects && !isProjectsLoading && (
            <div className="bg-white border border-dashed border-blue-200 rounded-3xl p-8 text-center text-gray-600" role="status" aria-live="polite">
              <p className="text-lg font-medium text-gray-800">{t('home.noProjectsYetTitle')}</p>
              <p className="mt-2">{t('home.noProjectsYetBody')}</p>
              <button
                type="button"
                onClick={onStartNewProject}
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-all"
              >
                <Plus className="w-4 h-4 mr-2" /> {t('home.createProject')}
              </button>
            </div>
          )}

          {homeView !== 'inspiration' && hasProjects && (
            <>
              <div className="relative">
                <label htmlFor="project-search" className="sr-only">
                  {t('home.searchProjectLabel')}
                </label>
                <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                  <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  id="project-search"
                  type="search"
                  value={projectSearch}
                  onChange={(event) => setProjectSearch(event.target.value)}
                  placeholder={t('home.searchProjectLabel')}
                  className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-base text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {shouldShowFiltersCard && (
                <div
                  className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4"
                  role="region"
                  aria-label={t('home.availableFilters')}
                  data-tour-id="home-filters"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                      {t('home.availableFilters')}
                    </h3>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        hasActiveFilters
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                      disabled={!hasActiveFilters}
                    >
                      {t('home.clearAllFilters')}
                    </button>
                  </div>
                  {activeProjectFilterChips.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {t('home.activeFilters')}
                      </span>
                      {activeProjectFilterChips.map((chip) => (
                        <span
                          key={chip.id}
                          className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                        >
                          <span className="font-semibold text-blue-800">{chip.label} :</span>
                          <span>{chip.value}</span>
                          <button
                            type="button"
                            onClick={chip.onClear}
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-blue-700 transition-colors hover:bg-blue-100"
                            aria-label={t('home.removeFilterAriaLabel', { label: chip.label })}
                          >
                            <Close className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-4">
                    {enabledFilterFields.map((field) => {
                      const fieldId = `project-filter-${field.id}`;

                      if (field.type === 'select') {
                        const value = filtersState[field.id] || DEFAULT_SELECT_FILTER_VALUE;
                        const optionLabel = field.emptyOptionLabel || t('home.allValues');
                        const options = selectFilterOptions.get(field.id) || [];
                        return (
                          <div key={field.id} className="flex w-full flex-col gap-2 text-sm text-gray-700 sm:w-60">
                            <label htmlFor={fieldId} className="font-semibold text-gray-700">
                              {field.label}
                            </label>
                            <select
                              id={fieldId}
                              value={value}
                              onChange={(event) =>
                                setFiltersState(prev => ({ ...prev, [field.id]: event.target.value }))
                              }
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            >
                              <option value={DEFAULT_SELECT_FILTER_VALUE}>{optionLabel}</option>
                              {options.map(option => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      }

                      const value = typeof filtersState[field.id] === 'string' ? filtersState[field.id] : '';
                      return (
                        <label key={field.id} htmlFor={fieldId} className="flex w-full flex-col gap-2 text-sm text-gray-700 sm:w-60">
                          <span className="font-semibold text-gray-700">{field.label}</span>
                          <input
                            id={fieldId}
                            type="text"
                            value={value}
                            onChange={(event) =>
                              setFiltersState(prev => ({ ...prev, [field.id]: event.target.value }))
                            }
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder={t('home.searchPlaceholder')}
                          />
                        </label>
                      );
                    })}
                    {sortFilterConfig && sortFilterConfig.enabled && (
                      <div className="flex w-full flex-col gap-2 text-sm text-gray-700 sm:w-60">
                        <label htmlFor="project-sort-order" className="font-semibold text-gray-700">
                          {sortFilterConfig.label}
                        </label>
                        <select
                          id="project-sort-order"
                          value={currentSortOrder}
                          onChange={(event) =>
                            setFiltersState(prev => ({
                              ...prev,
                              sortOrder: event.target.value === 'asc' ? 'asc' : 'desc'
                            }))
                          }
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                          <option value="desc">{t('home.sortDesc')}</option>
                          <option value="asc">{t('home.sortAsc')}</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {hasFilteredProjects ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6" role="list">
                    {paginatedProjects.map(project => renderProjectCard(project))}
                  </div>
                  <PaginationControls
                    page={projectPage}
                    totalPages={totalProjectPages}
                    onPrevious={() => setProjectPage((prev) => Math.max(1, prev - 1))}
                    onNext={() => setProjectPage((prev) => Math.min(totalProjectPages, prev + 1))}
                  />
                </>
              ) : (
                <div
                  className="bg-white border border-dashed border-blue-200 rounded-3xl p-8 text-center text-gray-600"
                  role="status"
                  aria-live="polite"
                >
                  <p className="text-lg font-medium text-gray-800">{t('home.noProjectsMatchFilters')}</p>
                  <p className="mt-2">{t('home.adjustFiltersOrResetFull')}</p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-all"
                    >
                      {t('home.clearAllFilters')}
                    </button>
                  )}
                </div>
              )}

              <section className="space-y-4" aria-labelledby="submitted-projects-heading">
                <div className="flex items-center justify-between gap-3">
                  <h3 id="submitted-projects-heading" className="text-xl font-bold text-gray-900">
                    {t('home.submittedProjectsHeading')}
                  </h3>
                  {hasSubmittedProjects && (
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {t(submittedProjects.length > 1 ? 'home.projectCountPlural' : 'home.projectCountSingular', { count: submittedProjects.length })}
                    </span>
                  )}
                </div>

                {hasSubmittedProjects ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6" role="list">
                    {submittedProjects.map((project) => renderProjectCard(project))}
                  </div>
                ) : (
                  <div className="bg-white border border-dashed border-emerald-200 rounded-3xl p-6 text-center text-gray-600">
                    <p className="text-lg font-medium text-gray-800">{t('home.noSubmittedProjects')}</p>
                  </div>
                )}
              </section>
            </>
          )}

          {homeView === 'inspiration' && !hasInspirationProjects && (
            <div className="bg-white border border-dashed border-blue-200 rounded-3xl p-8 text-center text-gray-600" role="status" aria-live="polite">
              <p className="text-lg font-medium text-gray-800">{t('home.noInspirationsYetTitle')}</p>
              <p className="mt-2">{t('home.noInspirationsYetBody')}</p>
              <button
                type="button"
                onClick={onStartInspirationProject}
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-all"
              >
                <Plus className="w-4 h-4 mr-2" /> {t('home.createInspiringProject')}
              </button>
            </div>
          )}

          {homeView === 'inspiration' && hasInspirationProjects && (
            <>
              {shouldShowInspirationFiltersCard && (
                <div
                  className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4"
                  role="region"
                  aria-label={t('home.inspirationFiltersAriaLabel')}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                      {t('home.inspirationFiltersHeading')}
                    </h3>
                    <button
                      type="button"
                      onClick={handleResetInspirationFilters}
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        hasActiveInspirationFilters
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                      disabled={!hasActiveInspirationFilters}
                    >
                      {t('home.clearAllFilters')}
                    </button>
                  </div>
                  {activeInspirationFilterChips.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {t('home.activeFilters')}
                      </span>
                      {activeInspirationFilterChips.map((chip) => (
                        <span
                          key={chip.id}
                          className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                        >
                          <span className="font-semibold text-blue-800">{chip.label} :</span>
                          <span>{chip.value}</span>
                          <button
                            type="button"
                            onClick={chip.onClear}
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-blue-700 transition-colors hover:bg-blue-100"
                            aria-label={t('home.removeFilterAriaLabel', { label: chip.label })}
                          >
                            <Close className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
                    {inspirationFilterFields.map((field) => {
                      const fieldId = `inspiration-filter-${field.id}`;

                      if (field.type === 'select') {
                        const value = inspirationFiltersState[field.id] || DEFAULT_SELECT_FILTER_VALUE;
                        const optionLabel = field.emptyOptionLabel || t('home.allValues');
                        const options = inspirationFilterOptions.get(field.id) || [];
                        return (
                          <div key={field.id} className="flex flex-col gap-2 text-sm text-gray-700">
                            <label htmlFor={fieldId} className="font-semibold text-gray-700">
                              {field.label}
                            </label>
                            <select
                              id={fieldId}
                              value={value}
                              onChange={(event) =>
                                setInspirationFiltersState(prev => ({ ...prev, [field.id]: event.target.value }))
                              }
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            >
                              <option value={DEFAULT_SELECT_FILTER_VALUE}>{optionLabel}</option>
                              {options.map(option => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      }

                      const value = typeof inspirationFiltersState[field.id] === 'string'
                        ? inspirationFiltersState[field.id]
                        : '';
                      return (
                        <label key={field.id} htmlFor={fieldId} className="flex flex-col gap-2 text-sm text-gray-700">
                          <span className="font-semibold text-gray-700">{field.label}</span>
                          <input
                            id={fieldId}
                            type="text"
                            value={value}
                            onChange={(event) =>
                              setInspirationFiltersState(prev => ({ ...prev, [field.id]: event.target.value }))
                            }
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder={t('home.searchPlaceholder')}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {hasFilteredInspirationProjects ? (
                <div className="space-y-8">
                  <section className="space-y-4" aria-labelledby="personal-inspirations-heading">
                    <div className="flex items-center justify-between gap-3">
                      <h3 id="personal-inspirations-heading" className="text-xl font-bold text-gray-900">
                        {t('home.personalInspirationsHeading')}
                      </h3>
                      {hasPersonalInspirations && (
                        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {t(personalInspirationProjects.length > 1 ? 'home.inspirationCountPlural' : 'home.inspirationCountSingular', { count: personalInspirationProjects.length })}
                        </span>
                      )}
                    </div>

                    {hasPaginatedPersonalInspirations ? (
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2" role="list">
                        {paginatedPersonalInspirationProjects.map((project) => renderInspirationCard(project))}
                      </div>
                    ) : (
                      <div className="rounded-3xl border border-dashed border-blue-200 bg-white p-6 text-center text-gray-600">
                        <p className="text-lg font-medium text-gray-800">{t('home.noPersonalInspirationsMatch')}</p>
                      </div>
                    )}
                  </section>

                  <section className="space-y-4" aria-labelledby="shared-inspirations-heading">
                    <div className="flex items-center justify-between gap-3">
                      <h3 id="shared-inspirations-heading" className="text-xl font-bold text-gray-900">
                        {t('home.sharedInspirationsHeading')}
                      </h3>
                      {hasSharedInspirations && (
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {t(sharedInspirationProjects.length > 1 ? 'home.inspirationCountPlural' : 'home.inspirationCountSingular', { count: sharedInspirationProjects.length })}
                        </span>
                      )}
                    </div>

                    {hasPaginatedSharedInspirations ? (
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2" role="list">
                        {paginatedSharedInspirationProjects.map((project) => renderInspirationCard(project))}
                      </div>
                    ) : (
                      <div className="rounded-3xl border border-dashed border-emerald-200 bg-white p-6 text-center text-gray-600">
                        <p className="text-lg font-medium text-gray-800">{t('home.noSharedInspirationsMatch')}</p>
                      </div>
                    )}
                  </section>
                  <PaginationControls
                    page={inspirationPage}
                    totalPages={totalInspirationPages}
                    onPrevious={() => setInspirationPage((prev) => Math.max(1, prev - 1))}
                    onNext={() => setInspirationPage((prev) => Math.min(totalInspirationPages, prev + 1))}
                  />
                </div>
              ) : (
                <div
                  className="bg-white border border-dashed border-blue-200 rounded-3xl p-8 text-center text-gray-600"
                  role="status"
                  aria-live="polite"
                >
                  <p className="text-lg font-medium text-gray-800">{t('home.noProjectsMatchFilters')}</p>
                  <p className="mt-2">{t('home.adjustFiltersOrReset')}</p>
                  {hasActiveInspirationFilters && (
                    <button
                      type="button"
                      onClick={handleResetInspirationFilters}
                      className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-all"
                    >
                      {t('home.clearAllFilters')}
                    </button>
                  )}
                </div>
              )}

              <section className="space-y-4" aria-labelledby="submitted-inspirations-heading">
                <div className="flex items-center justify-between gap-3">
                  <h3 id="submitted-inspirations-heading" className="text-xl font-bold text-gray-900">
                    {t('home.submittedInspirationsHeading')}
                  </h3>
                  {hasSubmittedInspirations && (
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {t(submittedInspirationProjects.length > 1 ? 'home.inspirationCountPlural' : 'home.inspirationCountSingular', { count: submittedInspirationProjects.length })}
                    </span>
                  )}
                </div>

                {hasSubmittedInspirations ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6" role="list">
                    {submittedInspirationProjects.map((project) => renderInspirationCard(project))}
                  </div>
                ) : (
                  <div className="bg-white border border-dashed border-emerald-200 rounded-3xl p-6 text-center text-gray-600">
                    <p className="text-lg font-medium text-gray-800">{t('home.noSubmittedInspirations')}</p>
                  </div>
                )}
              </section>
            </>
          )}
        </section>
      </div>

      {committeeSelectionModal.isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('home.chooseCommitteeTitle')}</h3>
            <p className="text-sm text-gray-600">{t('home.chooseCommitteeDescription')}</p>
            <div className="space-y-2">
              {committeeSelectionModal.committees.map((committee) => (
                <button
                  key={`reintegrate-${committee.id}`}
                  type="button"
                  onClick={() => {
                    onReintegrateProjectInCommittee?.(committeeSelectionModal.project?.project?.id, committee.id);
                    setCommitteeSelectionModal({ isOpen: false, project: null, committees: [] });
                  }}
                  className="w-full rounded-xl border border-blue-200 px-4 py-3 text-left text-sm font-semibold text-blue-700 hover:bg-blue-50"
                >
                  {committee.name || committee.id}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setCommitteeSelectionModal({ isOpen: false, project: null, committees: [] })}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('home.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteDialogState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div
            className="absolute inset-0 bg-gray-900 bg-opacity-60"
            aria-hidden="true"
            onClick={handleCancelDeleteProject}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-project-dialog-title"
            aria-describedby="delete-project-dialog-description"
            className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl focus:outline-none"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                <Trash2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h2 id="delete-project-dialog-title" className="text-xl font-semibold text-gray-900">
                  {t('home.deleteProjectDialogTitle')}
                </h2>
                <p id="delete-project-dialog-description" className="mt-2 text-sm text-gray-600">
                  {t('home.deleteProjectDescription', {
                    name: pendingDeletionProjectName || t('home.projectNameFallback')
                  })}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                ref={deleteCancelButtonRef}
                onClick={handleCancelDeleteProject}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {t('home.cancel')}
              </button>
              <button
                type="button"
                ref={deleteConfirmButtonRef}
                onClick={handleConfirmDeleteProject}
                className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
              >
                {t('home.deletePermanently')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
