import React, { useState, useCallback, useEffect, useRef, useMemo } from '../react.js';
import {
  FileText,
  Users,
  AlertTriangle,
  Send,
  Sparkles,
  CheckCircle,
  Mail,
  Info,
  Edit
} from './icons.js';
import { formatAnswer } from '../utils/questions.js';
import { computeRankingRecommendations, normalizeRankingConfig } from '../utils/ranking.js';
import { resolveLocalizedText } from '../utils/localizedContent.js';
import { renderTextWithLinks } from '../utils/linkify.js';
import { ProjectShowcase } from './ProjectShowcase.jsx';
import { RichTextEditor } from './RichTextEditor.jsx';
import { extractProjectName } from '../utils/projects.js';
import { getTeamPriority } from '../utils/projectExport.js';
import {
  DEFAULT_COMMITTEE_ID,
  getTriggeredValidationCommittees,
  normalizeValidationCommitteeConfig
} from '../utils/validationCommittee.js';
import { formatTeamContacts, normalizeTeamContacts } from '../utils/teamContacts.js';
import { createAttachmentFromFile } from '../utils/documentStore.js';
import { normalizeEmail } from '../utils/normalizeEmail.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { getLocaleTag } from '../i18n/languages.js';

const formatNumber = (value, options = {}, language) => {
  return Number(value).toLocaleString(getLocaleTag(language), options);
};

const formatTimestamp = (value, language) => {
  if (!value) {
    return '';
  }

  try {
    return new Date(value).toLocaleString(getLocaleTag(language), {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return '';
  }
};

const formatCriterionScore = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '—';
  }

  if (numeric >= 3) return '+++';
  if (numeric >= 2) return '++';
  if (numeric >= 1) return '+';
  return '—';
};

const COMPLIANCE_COMMENTS_KEY = '__compliance_team_comments__';
const COMMENT_STATUS_OPTIONS = [
  {
    value: 'validated',
    labelKey: 'statusValidated',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  {
    value: 'validated_with_conditions',
    labelKey: 'statusValidatedWithConditions',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  {
    value: 'pending_information',
    labelKey: 'statusPendingInformation',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    value: 'not_concerned',
    labelKey: 'statusNotConcerned',
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200'
  },
  {
    value: 'rejected',
    labelKey: 'statusRejected',
    badgeClass: 'bg-red-100 text-red-800 border-red-200'
  }
];

const TEAM_STATUS_RANK = {
  pending_information: 0,
  rejected: 0,
  '': 1,
  validated_with_conditions: 1,
  validated: 2,
  not_concerned: 3
};

const TEAM_STATUS_COLLAPSED_BY_DEFAULT = new Set(['validated', 'not_concerned']);

const TEAM_PRIORITY_RANK = {
  critical: 0,
  elevated: 1,
  standard: 2
};

const TEAM_STATUS_ACCENT_COLOR = {
  pending_information: '#60a5fa',
  rejected: '#f87171',
  '': '#d1d5db',
  validated_with_conditions: '#fbbf24',
  validated: '#34d399',
  not_concerned: '#d1d5db'
};

const TEAM_STATUS_SUMMARY_ORDER = [
  { value: 'pending_information', labelKey: 'statusPendingInformation' },
  { value: 'rejected', labelKey: 'statusRejected' },
  { value: '', labelKey: 'statusNone' },
  { value: 'validated_with_conditions', labelKey: 'statusValidatedWithConditions' },
  { value: 'validated', labelKey: 'statusValidated' },
  { value: 'not_concerned', labelKey: 'statusNotConcerned' }
];

const formatWeeksValue = (weeks, language, t) => {
  if (weeks === undefined || weeks === null) {
    return '-';
  }

  const rounded = Math.round(weeks * 10) / 10;
  const hasDecimal = Math.abs(rounded - Math.round(rounded)) > 0.0001;

  return t('synthesisReport.weeksValueTemplate', {
    value: formatNumber(
      rounded,
      { minimumFractionDigits: hasDecimal ? 1 : 0, maximumFractionDigits: hasDecimal ? 1 : 0 },
      language
    )
  });
};

const formatDaysValue = (days, language, t) => {
  if (days === undefined || days === null) {
    return '-';
  }

  return t('synthesisReport.daysValueTemplate', { value: formatNumber(Math.round(days), {}, language) });
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

const getCommentStatusMeta = (status, t) => {
  const option = COMMENT_STATUS_OPTIONS.find((entry) => entry.value === status);
  return option ? { ...option, label: t(`synthesisReport.${option.labelKey}`) } : null;
};

const normalizeCommentAttachments = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((attachment, index) => ({
      id: typeof attachment?.id === 'string' && attachment.id.trim().length > 0
        ? attachment.id
        : `attachment-${index}`,
      name: typeof attachment?.name === 'string' ? attachment.name : 'Pièce jointe',
      url: typeof attachment?.url === 'string' ? attachment.url : '',
      type: typeof attachment?.type === 'string' ? attachment.type : '',
      size: Number.isFinite(Number(attachment?.size)) ? Number(attachment.size) : 0
    }))
    .filter((attachment) => attachment.url.trim().length > 0);
};

const normalizeCommentEntry = (entry) => {
  const comment = typeof entry?.comment === 'string' ? entry.comment : '';
  const statusCandidate = typeof entry?.status === 'string' ? entry.status : '';
  const status = COMMENT_STATUS_OPTIONS.some((option) => option.value === statusCandidate)
    ? statusCandidate
    : '';
  const replies = Array.isArray(entry?.replies)
    ? entry.replies
        .map((reply, index) => ({
          id: typeof reply?.id === 'string' && reply.id.trim().length > 0
            ? reply.id
            : `reply-${index}`,
          message: typeof reply?.message === 'string' ? reply.message : '',
          authorName: typeof reply?.authorName === 'string' ? reply.authorName : '',
          authorEmail: typeof reply?.authorEmail === 'string' ? reply.authorEmail : '',
          createdAt: typeof reply?.createdAt === 'string' ? reply.createdAt : '',
          attachments: normalizeCommentAttachments(reply?.attachments)
        }))
        .filter((reply) => reply.message.trim().length > 0 || reply.authorName || reply.authorEmail)
    : [];

  return {
    comment,
    status,
    attachments: normalizeCommentAttachments(entry?.attachments),
    replies
  };
};

const normalizeReplyDraft = (value) => {
  if (!value || typeof value !== 'object') {
    return { message: '', attachments: [] };
  }

  return {
    message: typeof value.message === 'string' ? value.message : '',
    attachments: normalizeCommentAttachments(value.attachments)
  };
};

const normalizeComplianceComments = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const teams = value.teams && typeof value.teams === 'object' ? value.teams : {};
    const committees =
      value.committees && typeof value.committees === 'object' ? value.committees : {};
    const legacyCommittee =
      value.committee && typeof value.committee === 'object' ? value.committee : null;

    return {
      teams,
      committees: legacyCommittee && !committees[DEFAULT_COMMITTEE_ID]
        ? {
          ...committees,
          [DEFAULT_COMMITTEE_ID]: legacyCommittee
        }
        : committees,
      forcedCommitteeIds: Array.isArray(value.forcedCommitteeIds) ? value.forcedCommitteeIds : [],
      legacy: typeof value.legacy === 'string' ? value.legacy : ''
    };
  }

  if (typeof value === 'string') {
    return {
      teams: {},
      committees: {},
      forcedCommitteeIds: [],
      legacy: value
    };
  }

  return {
    teams: {},
    committees: {},
    forcedCommitteeIds: [],
    legacy: ''
  };
};

const buildComplianceCommentDrafts = (comments, teams, committees) => {
  const teamDrafts = {};
  const committeeDrafts = {};

  (Array.isArray(teams) ? teams : []).forEach((team) => {
    if (!team?.id) {
      return;
    }
    teamDrafts[team.id] = normalizeCommentEntry(comments?.teams?.[team.id]);
  });

  (Array.isArray(committees) ? committees : []).forEach((committee) => {
    if (!committee?.id) {
      return;
    }
    committeeDrafts[committee.id] = normalizeCommentEntry(comments?.committees?.[committee.id]);
  });

  return {
    teams: teamDrafts,
    committees: committeeDrafts
  };
};

const formatOverviewValue = (question, answer, missingInfoLabel, language) => {
  const formatted = formatAnswer(question, answer, language);

  if (typeof formatted === 'string') {
    if (formatted.trim().length > 0) {
      return formatted;
    }
  } else if (formatted) {
    return formatted;
  }

  return question?.required ? missingInfoLabel : '';
};

const formatRiskTimingViolation = (violation, language, t) => {
  if (!violation) {
    return '';
  }

  const actualParts = [];
  if (typeof violation.actualWeeks === 'number') {
    actualParts.push(formatWeeksValue(violation.actualWeeks, language, t));
  }
  if (typeof violation.actualDays === 'number') {
    actualParts.push(formatDaysValue(violation.actualDays, language, t));
  }

  const requiredParts = [];
  if (typeof violation.requiredWeeks === 'number') {
    requiredParts.push(t('synthesisReport.weeksValueTemplate', { value: formatNumber(violation.requiredWeeks, {}, language) }));
  }
  if (typeof violation.requiredDays === 'number') {
    requiredParts.push(t('synthesisReport.daysValueTemplate', { value: formatNumber(violation.requiredDays, {}, language) }));
  }

  if (actualParts.length === 0 && requiredParts.length === 0) {
    return '';
  }

  const actualText = actualParts.length > 0 ? actualParts.join(' / ') : t('synthesisReport.delayNotCalculated');

  if (requiredParts.length === 0) {
    return t('synthesisReport.delayObservedTemplate', { actual: actualText });
  }

  return t('synthesisReport.delayObservedWithMinimumTemplate', {
    actual: actualText,
    required: requiredParts.join(' / ')
  });
};

const formatTimingRequirementSummary = (questionBank, constraint, language, t) => {
  if (!constraint || typeof constraint !== 'object') {
    return '';
  }

  const startId = constraint.startQuestion;
  const endId = constraint.endQuestion;
  const minimumWeeks =
    typeof constraint.minimumWeeks === 'number' ? constraint.minimumWeeks : undefined;
  const minimumDays =
    typeof constraint.minimumDays === 'number' ? constraint.minimumDays : undefined;

  const startLabel = resolveQuestionLabel(questionBank, startId, language);
  const endLabel = resolveQuestionLabel(questionBank, endId, language);

  const startDisplay = startLabel || startId || '';
  const endDisplay = endLabel || endId || '';

  const requirementParts = [];
  if (minimumWeeks !== undefined) {
    requirementParts.push(t('synthesisReport.weeksValueTemplate', { value: formatNumber(minimumWeeks, {}, language) }));
  }
  if (minimumDays !== undefined) {
    requirementParts.push(t('synthesisReport.daysValueTemplate', { value: formatNumber(minimumDays, {}, language) }));
  }

  const hasRequirement = requirementParts.length > 0;
  const hasStart = startDisplay.length > 0;
  const hasEnd = endDisplay.length > 0;

  if (!hasRequirement && !hasStart && !hasEnd) {
    return '';
  }

  if (hasRequirement && hasStart && hasEnd) {
    return t('synthesisReport.respectMinimumBetweenTemplate', {
      requirement: requirementParts.join(' / '),
      start: startDisplay,
      end: endDisplay
    });
  }

  if (hasRequirement && hasStart && !hasEnd) {
    return t('synthesisReport.respectMinimumAfterTemplate', {
      requirement: requirementParts.join(' / '),
      start: startDisplay
    });
  }

  if (hasRequirement && !hasStart && hasEnd) {
    return t('synthesisReport.respectMinimumBeforeTemplate', {
      requirement: requirementParts.join(' / '),
      end: endDisplay
    });
  }

  if (hasRequirement) {
    return t('synthesisReport.respectMinimumGenericTemplate', { requirement: requirementParts.join(' / ') });
  }

  if (hasStart && hasEnd) {
    return t('synthesisReport.monitorDelayBetweenTemplate', { start: startDisplay, end: endDisplay });
  }

  if (hasStart || hasEnd) {
    return t('synthesisReport.monitorDateTemplate', { value: hasStart ? startDisplay : endDisplay });
  }

  return '';
};

const formatVigilanceStatusMessage = (alert, language, t) => {
  if (!alert || typeof alert !== 'object') {
    return '';
  }

  if (alert.status === 'unknown') {
    return t('synthesisReport.missingDatesMessage');
  }

  if (alert.status === 'satisfied' && alert.diff) {
    const parts = [];
    if (typeof alert.diff.diffInWeeks === 'number') {
      parts.push(formatWeeksValue(alert.diff.diffInWeeks, language, t));
    }
    if (typeof alert.diff.diffInDays === 'number') {
      parts.push(formatDaysValue(alert.diff.diffInDays, language, t));
    }

    if (parts.length === 0) {
      return t('synthesisReport.delayCompliantMessage');
    }

    return t('synthesisReport.delayObservedAnticipateTemplate', { parts: parts.join(' / ') });
  }

  return '';
};

const resolveQuestionLabel = (questionBank, questionId, language) => {
  if (!questionId) {
    return '';
  }

  const collection = Array.isArray(questionBank) ? questionBank : [];
  const match = collection.find(question => question?.id === questionId);

  return resolveLocalizedText(match?.question, language) || questionId;
};

const normalizeTeamQuestionForDisplay = (entry, language) => {
  if (typeof entry === 'string') {
    return { text: entry, timingViolation: null };
  }

  if (entry && typeof entry === 'object') {
    return {
      text: resolveLocalizedText(entry.text, language),
      timingViolation:
        entry.timingViolation && typeof entry.timingViolation === 'object'
          ? entry.timingViolation
          : null
    };
  }

  return { text: '', timingViolation: null };
};

const formatTeamQuestionTimingMessage = (questionBank, violation, language, t) => {
  if (!violation) {
    return '';
  }

  const base = formatRiskTimingViolation(violation, language, t);
  if (!base) {
    return '';
  }

  const startLabel = resolveQuestionLabel(questionBank, violation.startQuestion, language);
  const endLabel = resolveQuestionLabel(questionBank, violation.endQuestion, language);

  if (startLabel || endLabel) {
    const safeStart = startLabel || violation.startQuestion || t('synthesisReport.startFallback');
    const safeEnd = endLabel || violation.endQuestion || t('synthesisReport.endFallback');
    return t('synthesisReport.delayBetweenTemplate', { start: safeStart, end: safeEnd, base });
  }

  return base;
};

export const SynthesisReport = ({
  answers,
  analysis,
  teams,
  questions,
  projectStatus,
  projectId,
  projectName: providedProjectName,
  onOpenProjectShowcase,
  canOpenProjectShowcase = true,
  isProjectEditable = true,
  onRestart,
  onBack,
  onUpdateAnswers,
  onUpdateComplianceComments,
  onComplianceReplyNotification,
  currentUser = null,
  sharedMembers = [],
  ownerEmail = '',
  adminEmails = [],
  onShareProjectMember,
  onRemoveProjectMember,
  onSubmitProject,
  onNavigateToQuestion,
  saveFeedback,
  onDismissSaveFeedback,
  isAdminMode = false,
  tourContext = null,
  hasIncompleteAnswers = false,
  validationCommitteeConfig = null
}) => {
  const { t, language } = useTranslation();
  const [isShowcaseFallbackOpen, setIsShowcaseFallbackOpen] = useState(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const showcaseFallbackRef = useRef(null);
  const complianceCommentFeedbackTimeoutRef = useRef(null);
  const [expandedThreads, setExpandedThreads] = useState({});
  const [complianceReplyDrafts, setComplianceReplyDrafts] = useState({});
  const [teamCollapsedOverrides, setTeamCollapsedOverrides] = useState({});
  const [openTeamCommentEditors, setOpenTeamCommentEditors] = useState({});
  const [openTeamReplyBoxes, setOpenTeamReplyBoxes] = useState({});
  const [shareMemberDraft, setShareMemberDraft] = useState('');
  const [shareMemberFeedback, setShareMemberFeedback] = useState('');
  useEffect(() => {
    if (!tourContext?.isActive) {
      return;
    }

    if (typeof document === 'undefined') {
      return;
    }

    const stepToSelectorMap = {
      'compliance-report': '[data-tour-id="synthesis-summary"]',
      'compliance-report-top': '[data-tour-id="synthesis-summary"]',
      'compliance-teams': '[data-tour-id="synthesis-teams"]',
      'compliance-risks': '[data-tour-id="synthesis-risks"]'
    };

    const selector = stepToSelectorMap[tourContext.activeStep];
    if (!selector) {
      return;
    }

    const element = document.querySelector(selector);
    if (element && typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [tourContext]);
  const relevantTeams = teams.filter(team => (analysis?.teams || []).includes(team.id));
  const sharedTeamBlocks = useMemo(() => {
    const blocks = Array.isArray(analysis?.sharedTeamBlocks) ? analysis.sharedTeamBlocks : [];
    return blocks.map((block) => {
      const teamIds = Array.isArray(block?.teamIds) ? block.teamIds : [];
      const teamNames = teamIds
        .map((teamId) => teams.find((team) => team?.id === teamId)?.name || teamId)
        .filter(Boolean);
      const formattedQuestions = Array.isArray(block?.questions)
        ? block.questions
            .map((entry) => normalizeTeamQuestionForDisplay(entry, language))
            .filter((question) => (question.text || '').trim().length > 0)
        : [];
      return {
        ...block,
        ruleName: resolveLocalizedText(block?.ruleName, language),
        teamNames,
        questions: formattedQuestions
      };
    });
  }, [analysis?.sharedTeamBlocks, teams, language]);
  const hasSaveFeedback = Boolean(saveFeedback?.message);
  const isSaveSuccess = saveFeedback?.status === 'success';
  const complianceComments = useMemo(
    () => normalizeComplianceComments(answers?.[COMPLIANCE_COMMENTS_KEY]),
    [answers]
  );
  const getStoredTeamStatus = useCallback(
    (teamId) => normalizeCommentEntry(complianceComments.teams?.[teamId]).status,
    [complianceComments]
  );
  const sortedRelevantTeams = useMemo(() => {
    return [...relevantTeams].sort((a, b) => {
      const statusRankA = TEAM_STATUS_RANK[getStoredTeamStatus(a.id)] ?? 1;
      const statusRankB = TEAM_STATUS_RANK[getStoredTeamStatus(b.id)] ?? 1;
      if (statusRankA !== statusRankB) {
        return statusRankA - statusRankB;
      }
      const priorityRankA = TEAM_PRIORITY_RANK[getTeamPriority(analysis, a.id)] ?? 1;
      const priorityRankB = TEAM_PRIORITY_RANK[getTeamPriority(analysis, b.id)] ?? 1;
      return priorityRankA - priorityRankB;
    });
  }, [relevantTeams, getStoredTeamStatus, analysis]);
  const teamStatusSummary = useMemo(() => {
    const counts = {};
    relevantTeams.forEach((team) => {
      const status = getStoredTeamStatus(team.id);
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [relevantTeams, getStoredTeamStatus]);
  const toggleTeamCollapsed = useCallback((teamId, currentlyCollapsed) => {
    setTeamCollapsedOverrides((prev) => ({ ...prev, [teamId]: !currentlyCollapsed }));
  }, []);
  const toggleTeamCommentEditor = useCallback((teamId) => {
    setOpenTeamCommentEditors((prev) => ({ ...prev, [teamId]: !prev[teamId] }));
  }, []);
  const toggleTeamReplyBox = useCallback((teamId) => {
    setOpenTeamReplyBoxes((prev) => ({ ...prev, [teamId]: !prev[teamId] }));
  }, []);
  const [complianceCommentDrafts, setComplianceCommentDrafts] = useState(() =>
    buildComplianceCommentDrafts(complianceComments, relevantTeams, [])
  );
  const [complianceCommentFeedback, setComplianceCommentFeedback] = useState(null);
  const updateComplianceComments =
    typeof onUpdateComplianceComments === 'function' ? onUpdateComplianceComments : onUpdateAnswers;
  const canSaveComplianceComment = typeof updateComplianceComments === 'function';
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
  const normalizedAdminEmails = useMemo(
    () => (Array.isArray(adminEmails) ? adminEmails.map(normalizeEmail).filter(Boolean) : []),
    [adminEmails]
  );
  const canBypassCompliancePerimeter = useMemo(
    () => isAdminMode && !!currentUserEmail && normalizedAdminEmails.includes(currentUserEmail),
    [isAdminMode, currentUserEmail, normalizedAdminEmails]
  );
  const complianceTeamIdsForUser = useMemo(() => {
    if (!currentUserEmail) {
      return new Set();
    }

    const matched = new Set();
    relevantTeams.forEach((team) => {
      const contacts = normalizeTeamContacts(team);
      const isMember = contacts.some((contact) => normalizeEmail(contact) === currentUserEmail);
      if (isMember && team?.id) {
        matched.add(team.id);
      }
    });
    return matched;
  }, [currentUserEmail, relevantTeams]);
  const normalizedSharedMembers = useMemo(
    () => (Array.isArray(sharedMembers) ? sharedMembers.filter(Boolean) : []),
    [sharedMembers]
  );
  const normalizedOwnerEmail = useMemo(() => normalizeEmail(ownerEmail), [ownerEmail]);
  const canReplyAsProjectContributor = useMemo(() => {
    if (!currentUserEmail) {
      return isProjectEditable && !projectId;
    }

    const isOwner = normalizedOwnerEmail.length > 0 && normalizedOwnerEmail === currentUserEmail;
    const isCoOwner = normalizedSharedMembers.some((member) => normalizeEmail(member) === currentUserEmail);
    return isOwner || isCoOwner || (isProjectEditable && !projectId);
  }, [currentUserEmail, isProjectEditable, normalizedOwnerEmail, normalizedSharedMembers, projectId]);
  const normalizedValidationCommitteeConfig = useMemo(
    () => normalizeValidationCommitteeConfig(validationCommitteeConfig),
    [validationCommitteeConfig]
  );
  const validationCommittees = normalizedValidationCommitteeConfig.committees;
  const triggeredValidationCommittees = useMemo(
    () =>
      getTriggeredValidationCommittees(normalizedValidationCommitteeConfig, {
        answers,
        analysis,
        relevantTeams,
        forcedCommitteeIds: complianceComments.forcedCommitteeIds
      }),
    [analysis, answers, complianceComments.forcedCommitteeIds, normalizedValidationCommitteeConfig, relevantTeams]
  );
  const requiredValidationCommittees = useMemo(
    () => triggeredValidationCommittees.filter((committee) => committee.commentRequired),
    [triggeredValidationCommittees]
  );

  const resolveTeamLabel = useCallback(
    (teamId) => {
      if (!teamId) {
        return '';
      }

      const teamMatch = teams.find(team => team?.id === teamId);
      return teamMatch?.name || teamId;
    },
    [teams]
  );

  const normalizedProjectStatus =
    typeof projectStatus === 'string' ? projectStatus.toLowerCase() : null;
  const statusLabelMap = {
    draft: t('synthesisReport.statusDraft'),
    submitted: t('synthesisReport.statusSubmitted')
  };
  const statusClassMap = {
    draft: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    submitted: 'bg-emerald-100 text-emerald-800 border border-emerald-200'
  };
  const projectStatusLabel = normalizedProjectStatus
    ? statusLabelMap[normalizedProjectStatus] || projectStatus
    : null;
  const projectStatusClasses = normalizedProjectStatus
    ? statusClassMap[normalizedProjectStatus] || 'bg-gray-100 text-gray-700 border border-gray-200'
    : '';

  const priorityColors = {
    critical: 'bg-red-100 text-red-800 border-red-300',
    elevated: 'bg-orange-100 text-orange-800 border-orange-300',
    standard: 'bg-blue-100 text-blue-800 border-blue-300'
  };

  const riskColors = {
    high: 'bg-red-50 border-red-300 text-red-900',
    medium: 'bg-orange-50 border-orange-300 text-orange-900',
    low: 'bg-green-50 border-green-300 text-green-900'
  };

  const riskLevelLabels = {
    high: t('backOffice.ruleEditor.riskLevelHigh'),
    medium: t('backOffice.ruleEditor.riskLevelMedium'),
    low: t('backOffice.ruleEditor.riskLevelLow')
  };

  const riskPriorityLabels = {
    critical: t('backOffice.ruleEditor.riskPriorityToAnticipateUrgently'),
    elevated: t('backOffice.ruleEditor.riskPriorityToAnticipate'),
    standard: t('backOffice.ruleEditor.riskPriorityToDo')
  };

  const vigilanceStatusClasses = {
    satisfied: 'bg-emerald-50 border-emerald-300 text-emerald-900',
    unknown: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    breach: 'bg-red-50 border-red-300 text-red-900'
  };


  const rankingQuestions = useMemo(
    () => (Array.isArray(questions) ? questions.filter(question => question?.type === 'ranking') : []),
    [questions]
  );

  const rankingResults = useMemo(() => {
    return rankingQuestions
      .map(question => {
        const config = normalizeRankingConfig(question.rankingConfig || {}, language);
        const answer = answers?.[question.id];
        const recommendations = computeRankingRecommendations(answer, config, 3, language);
        const formattedAnswer = formatAnswer(question, answer, language);
        const prioritizedOrder = Array.isArray(answer?.prioritized)
          ? answer.prioritized
          : config.criteria.map(item => item.id);
        const ignoredSet = new Set(Array.isArray(answer?.ignored) ? answer.ignored : []);
        const orderedCriteria = prioritizedOrder
          .map(id => config.criteria.find(criterion => criterion.id === id))
          .filter(Boolean)
          .filter(criterion => !ignoredSet.has(criterion.id));
        const ignoredCriteria = config.criteria.filter(criterion => ignoredSet.has(criterion.id));

        return {
          question,
          config,
          recommendations,
          formattedAnswer,
          orderedCriteria,
          ignoredCriteria
        };
      })
      .filter(entry => entry.recommendations.length > 0 && entry.formattedAnswer);
  }, [answers, rankingQuestions, language]);

  const timelineDetails = analysis?.timeline?.details || [];
  const vigilanceAlerts = (Array.isArray(analysis?.timeline?.vigilance)
    ? analysis.timeline.vigilance
    : [])
    .filter(alert => alert && alert.status !== 'breach')
    .map(alert => ({
      ...alert,
      requirementSummary: formatTimingRequirementSummary(questions, alert.timingConstraint, language, t),
      statusMessage: formatVigilanceStatusMessage(alert, language, t)
    }));

  const extractedProjectName = extractProjectName(answers, questions);
  const effectiveProjectName =
    typeof providedProjectName === 'string' && providedProjectName.trim().length > 0
      ? providedProjectName.trim()
      : extractedProjectName;

  const scrollShowcaseIntoView = useCallback(() => {
    const node = showcaseFallbackRef.current;

    if (node) {
      if (typeof node.scrollIntoView === 'function') {
        node.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }

    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showcaseFallbackRef]);

  useEffect(() => {
    if (!isShowcaseFallbackOpen) {
      return;
    }

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        scrollShowcaseIntoView();
      });
    } else {
      scrollShowcaseIntoView();
    }
  }, [isShowcaseFallbackOpen, scrollShowcaseIntoView]);

  useEffect(() => {
    setComplianceCommentDrafts(
      buildComplianceCommentDrafts(complianceComments, relevantTeams, validationCommittees)
    );
  }, [complianceComments, relevantTeams, validationCommittees]);

  useEffect(() => {
    return () => {
      if (complianceCommentFeedbackTimeoutRef.current) {
        clearTimeout(complianceCommentFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const scheduleComplianceFeedback = useCallback((targetId, message) => {
    if (complianceCommentFeedbackTimeoutRef.current) {
      clearTimeout(complianceCommentFeedbackTimeoutRef.current);
    }

    setComplianceCommentFeedback({ targetId, message });

    complianceCommentFeedbackTimeoutRef.current = setTimeout(() => {
      setComplianceCommentFeedback(null);
    }, 4000);
  }, []);

  const handleComplianceCommentSubmit = useCallback(
    ({ event, targetId, targetType }) => {
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }

      if (!canSaveComplianceComment) {
        return;
      }

      const isCommittee = targetType === 'committee';
      const currentEntry = isCommittee
        ? complianceCommentDrafts.committees?.[targetId]
        : complianceCommentDrafts.teams?.[targetId];

      if (!currentEntry) {
        return;
      }

      const normalizedDraft =
        typeof currentEntry.comment === 'string' ? currentEntry.comment.replace(/\r\n/g, '\n') : '';
      const trimmedDraft = normalizedDraft.trim();
      const nextEntry = {
        comment: trimmedDraft,
        status: currentEntry.status,
        replies: Array.isArray(currentEntry.replies) ? currentEntry.replies : [],
        attachments: normalizeCommentAttachments(currentEntry.attachments)
      };

      const nextComments = {
        teams: { ...(complianceComments?.teams || {}) },
        committees: { ...(complianceComments?.committees || {}) },
        forcedCommitteeIds: complianceComments?.forcedCommitteeIds || [],
        legacy: complianceComments?.legacy || ''
      };

      if (isCommittee && targetId) {
        nextComments.committees[targetId] = nextEntry;
      } else if (targetId) {
        nextComments.teams[targetId] = nextEntry;
      }

      updateComplianceComments({
        [COMPLIANCE_COMMENTS_KEY]: nextComments
      });

      setComplianceCommentDrafts((prev) => {
        const nextDrafts = {
          ...prev,
          teams: { ...(prev?.teams || {}) },
          committees: { ...(prev?.committees || {}) }
        };
        if (isCommittee && targetId) {
          nextDrafts.committees[targetId] = nextEntry;
        } else if (targetId) {
          nextDrafts.teams[targetId] = nextEntry;
        }
        return nextDrafts;
      });

      if (!isCommittee && targetId) {
        setTeamCollapsedOverrides((prev) => {
          if (!(targetId in prev)) {
            return prev;
          }
          const next = { ...prev };
          delete next[targetId];
          return next;
        });
        setOpenTeamCommentEditors((prev) => ({ ...prev, [targetId]: false }));
      }

      scheduleComplianceFeedback(
        `${targetType}-${targetId || 'committee'}`,
        (trimmedDraft.length > 0 || normalizeCommentAttachments(currentEntry.attachments).length > 0)
          ? t('synthesisReport.commentSavedMessage')
          : t('synthesisReport.commentClearedMessage')
      );
    },
    [
      canSaveComplianceComment,
      effectiveProjectName,
      complianceCommentDrafts,
      complianceComments,
      updateComplianceComments,
      scheduleComplianceFeedback,
      t
    ]
  );

  const handleComplianceCommentChange = useCallback(
    ({ targetId, targetType, field, value }) => {
      setComplianceCommentDrafts((prev) => {
        const nextDrafts = {
          ...prev,
          teams: { ...(prev?.teams || {}) },
          committees: { ...(prev?.committees || {}) }
        };
        if (targetType === 'committee' && targetId) {
          nextDrafts.committees[targetId] = {
            ...prev?.committees?.[targetId],
            [field]: value
          };
        } else if (targetId) {
          nextDrafts.teams[targetId] = {
            ...prev?.teams?.[targetId],
            [field]: value
          };
        }
        return nextDrafts;
      });

      if (complianceCommentFeedback) {
        if (complianceCommentFeedbackTimeoutRef.current) {
          clearTimeout(complianceCommentFeedbackTimeoutRef.current);
          complianceCommentFeedbackTimeoutRef.current = null;
        }
        setComplianceCommentFeedback(null);
      }
    },
    [complianceCommentFeedback]
  );

  // Sur SharePoint, le fichier part dans la bibliothèque CN-Documents et seul un lien est
  // conservé dans le commentaire ; hors SharePoint, createAttachmentFromFile retombe sur
  // une data URL comme auparavant.
  const uploadCommentAttachments = useCallback(async (files, { entityType, feedbackTargetId }) => {
    const safeFiles = Array.isArray(files) ? files : Array.from(files || []);

    const uploads = await Promise.all(
      safeFiles.map(async (file, index) => {
        try {
          const attachment = await createAttachmentFromFile(file, {
            entityType,
            entityId: projectId || 'sans-projet',
            id: `attachment-${Date.now()}-${index}`
          });
          return {
            id: attachment.id,
            name: attachment.name,
            type: attachment.mimeType || '',
            size: attachment.size,
            url: attachment.url
          };
        } catch (error) {
          setComplianceCommentFeedback({
            targetId: feedbackTargetId,
            message: error?.message || t('synthesisReport.uploadFailedMessage')
          });
          return null;
        }
      })
    );

    return uploads.filter(Boolean);
  }, [projectId, t]);



  const handleComplianceCommentFilesChange = useCallback(async ({ targetId, targetType, files }) => {
    const safeFiles = Array.isArray(files) ? files : Array.from(files || []);
    if (safeFiles.length === 0) {
      return;
    }

    const nextAttachments = await uploadCommentAttachments(safeFiles, {
      entityType: 'compliance-comment',
      feedbackTargetId: targetId
    });
    if (nextAttachments.length === 0) {
      return;
    }

    setComplianceCommentDrafts((prev) => {
      const nextDrafts = {
        ...prev,
        teams: { ...(prev?.teams || {}) },
        committees: { ...(prev?.committees || {}) }
      };

      if (targetType === 'committee' && targetId) {
        const current = normalizeCommentEntry(prev?.committees?.[targetId]);
        nextDrafts.committees[targetId] = {
          ...current,
          attachments: [...normalizeCommentAttachments(current.attachments), ...nextAttachments]
        };
      } else if (targetId) {
        const current = normalizeCommentEntry(prev?.teams?.[targetId]);
        nextDrafts.teams[targetId] = {
          ...current,
          attachments: [...normalizeCommentAttachments(current.attachments), ...nextAttachments]
        };
      }

      return nextDrafts;
    });
  }, [uploadCommentAttachments]);

  const handleComplianceCommentAttachmentRemove = useCallback(({ targetId, targetType, attachmentId }) => {
    setComplianceCommentDrafts((prev) => {
      const nextDrafts = {
        ...prev,
        teams: { ...(prev?.teams || {}) },
        committees: { ...(prev?.committees || {}) }
      };

      if (targetType === 'committee' && targetId) {
        const current = normalizeCommentEntry(prev?.committees?.[targetId]);
        nextDrafts.committees[targetId] = {
          ...current,
          attachments: normalizeCommentAttachments(current.attachments).filter((attachment) => attachment.id !== attachmentId)
        };
      } else if (targetId) {
        const current = normalizeCommentEntry(prev?.teams?.[targetId]);
        nextDrafts.teams[targetId] = {
          ...current,
          attachments: normalizeCommentAttachments(current.attachments).filter((attachment) => attachment.id !== attachmentId)
        };
      }

      return nextDrafts;
    });
  }, []);

  const handleComplianceReplyChange = useCallback((threadKey, value) => {
    setComplianceReplyDrafts(prev => ({
      ...prev,
      [threadKey]: {
        ...normalizeReplyDraft(prev?.[threadKey]),
        message: value
      }
    }));
  }, []);

  const handleComplianceReplyFilesChange = useCallback(async (threadKey, files) => {
    const safeFiles = Array.isArray(files) ? files : Array.from(files || []);
    if (safeFiles.length === 0) {
      return;
    }

    const nextAttachments = await uploadCommentAttachments(safeFiles, {
      entityType: 'compliance-reply',
      feedbackTargetId: threadKey
    });
    if (nextAttachments.length === 0) {
      return;
    }

    setComplianceReplyDrafts((prev) => {
      const current = normalizeReplyDraft(prev?.[threadKey]);
      return {
        ...prev,
        [threadKey]: {
          ...current,
          attachments: [...current.attachments, ...nextAttachments]
        }
      };
    });
  }, [uploadCommentAttachments]);

  const handleComplianceReplyAttachmentRemove = useCallback((threadKey, attachmentId) => {
    setComplianceReplyDrafts((prev) => {
      const current = normalizeReplyDraft(prev?.[threadKey]);
      return {
        ...prev,
        [threadKey]: {
          ...current,
          attachments: current.attachments.filter((attachment) => attachment.id !== attachmentId)
        }
      };
    });
  }, []);

  const handleComplianceReplySubmit = useCallback(
    ({ targetId, targetType }) => {
      if (!canSaveComplianceComment) {
        return;
      }

      const threadKey = `${targetType}-${targetId}`;
      const draft = normalizeReplyDraft(complianceReplyDrafts[threadKey]);
      const trimmed = draft.message.trim();

      if (!trimmed && draft.attachments.length === 0) {
        return;
      }

      const sourceEntry = targetType === 'committee'
        ? complianceComments.committees?.[targetId]
        : complianceComments.teams?.[targetId];
      const normalizedEntry = normalizeCommentEntry(sourceEntry);
      const reply = {
        id: `reply-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        message: trimmed,
        authorName: currentUserDisplayName || t('synthesisReport.defaultUserLabel'),
        authorEmail: currentUserEmail,
        createdAt: new Date().toISOString(),
        attachments: draft.attachments
      };
      const nextEntry = {
        ...normalizedEntry,
        replies: [...(normalizedEntry.replies || []), reply]
      };

      const nextComments = {
        teams: { ...(complianceComments?.teams || {}) },
        committees: { ...(complianceComments?.committees || {}) },
        forcedCommitteeIds: complianceComments?.forcedCommitteeIds || [],
        legacy: complianceComments?.legacy || ''
      };

      if (targetType === 'committee') {
        nextComments.committees[targetId] = nextEntry;
      } else {
        nextComments.teams[targetId] = nextEntry;
      }

      updateComplianceComments({
        [COMPLIANCE_COMMENTS_KEY]: nextComments
      });

      if (typeof onComplianceReplyNotification === 'function') {
        const lastExistingReply = Array.isArray(normalizedEntry.replies) && normalizedEntry.replies.length > 0
          ? normalizedEntry.replies[normalizedEntry.replies.length - 1]
          : null;
        onComplianceReplyNotification({
          targetId,
          targetType,
          projectName: effectiveProjectName,
          lastAuthorEmail: lastExistingReply?.authorEmail || '',
          lastAuthorName: lastExistingReply?.authorName || ''
        });
      }

      setComplianceReplyDrafts(prev => ({
        ...prev,
        [threadKey]: { message: '', attachments: [] }
      }));

      if (targetType === 'team' && targetId) {
        setOpenTeamReplyBoxes((prev) => ({ ...prev, [targetId]: false }));
      }

      scheduleComplianceFeedback(threadKey, t('synthesisReport.replyAddedMessage'));
    },
    [
      canSaveComplianceComment,
      complianceComments,
      complianceReplyDrafts,
      currentUserDisplayName,
      t,
      currentUserEmail,
      effectiveProjectName,
      onComplianceReplyNotification,
      updateComplianceComments,
      scheduleComplianceFeedback
    ]
  );

  const shouldCollapseThread = useCallback((messages) => {
    if (!Array.isArray(messages)) {
      return false;
    }

    if (messages.length > 3) {
      return true;
    }

    const totalLength = messages.reduce((sum, message) => sum + (message.message || '').length, 0);
    const hasLongMessage = messages.some((message) => (message.message || '').length > 280);

    return totalLength > 600 || hasLongMessage;
  }, []);

  const getThreadMessages = useCallback((entry, authorLabel) => {
    const normalized = normalizeCommentEntry(entry);
    const messages = [];

    if (normalized.comment.trim().length > 0 || normalizeCommentAttachments(normalized.attachments).length > 0) {
      messages.push({
        id: `comment-${authorLabel || 'team'}`,
        message: normalized.comment,
        authorName: authorLabel || t('synthesisReport.defaultTeamLabel'),
        createdAt: '',
        attachments: normalizeCommentAttachments(normalized.attachments)
      });
    }

    normalized.replies.forEach((reply) => {
      messages.push({
        id: reply.id,
        message: reply.message,
        authorName: reply.authorName || reply.authorEmail || t('synthesisReport.defaultUserLabel'),
        createdAt: reply.createdAt,
        attachments: normalizeCommentAttachments(reply.attachments)
      });
    });

    return messages;
  }, [t]);

  const toggleThreadExpanded = useCallback((threadKey) => {
    setExpandedThreads(prev => ({
      ...prev,
      [threadKey]: true
    }));
  }, []);

  const handleShareMemberAdd = useCallback(() => {
    if (typeof onShareProjectMember !== 'function') {
      return;
    }

    const normalized = normalizeEmail(shareMemberDraft);
    if (!normalized) {
      setShareMemberFeedback(t('synthesisReport.invalidEmailMessage'));
      return;
    }

    onShareProjectMember(normalized);
    setShareMemberDraft('');
    setShareMemberFeedback(t('synthesisReport.memberAddedTemplate', { email: normalized }));
  }, [onShareProjectMember, shareMemberDraft, t]);

  const handleShareMemberRemove = useCallback((email) => {
    if (typeof onRemoveProjectMember !== 'function') {
      return;
    }

    onRemoveProjectMember(email);
  }, [onRemoveProjectMember]);

  const handleOpenShowcase = useCallback(() => {
    if (!canOpenProjectShowcase) {
      return;
    }

    if (typeof onOpenProjectShowcase === 'function') {
      onOpenProjectShowcase({
        projectId,
        projectName: effectiveProjectName,
        status: projectStatus,
        answers,
        analysis,
        relevantTeams,
        questions,
        timelineDetails
      });
      return;
    }

    setIsShowcaseFallbackOpen(true);

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        scrollShowcaseIntoView();
      });
    } else {
      scrollShowcaseIntoView();
    }
  }, [
    analysis,
    answers,
    effectiveProjectName,
    onOpenProjectShowcase,
    canOpenProjectShowcase,
    projectId,
    projectStatus,
    questions,
    relevantTeams,
    scrollShowcaseIntoView,
    timelineDetails
  ]);

  const handleCloseShowcase = useCallback(() => {
    setIsShowcaseFallbackOpen(false);
  }, []);

  const legacyComplianceComment = complianceComments.legacy?.trim() || '';
  const hasLegacyComplianceComment = legacyComplianceComment.length > 0;
  const committeeCommentMap = useMemo(() => {
    const nextMap = {};
    validationCommittees.forEach((committee) => {
      if (!committee?.id) {
        return;
      }
      nextMap[committee.id] = normalizeCommentEntry(complianceComments.committees?.[committee.id]);
    });
    return nextMap;
  }, [complianceComments.committees, validationCommittees]);
  const triggeredCommitteeIds = useMemo(
    () => new Set(triggeredValidationCommittees.map((committee) => committee.id)),
    [triggeredValidationCommittees]
  );
  const requiredCommitteeIds = useMemo(
    () => new Set(requiredValidationCommittees.map((committee) => committee.id)),
    [requiredValidationCommittees]
  );
  const committeesToDisplay = validationCommittees.filter((committee) => {
    if (canBypassCompliancePerimeter) {
      return true;
    }
    const hasComment = committeeCommentMap[committee.id]?.comment?.trim().length > 0;
    return triggeredCommitteeIds.has(committee.id) || hasComment;
  });
  const shouldShowCommitteeSection = committeesToDisplay.length > 0;
  const shouldShowComplianceCommentsSection =
    canBypassCompliancePerimeter || relevantTeams.length > 0 || shouldShowCommitteeSection || hasLegacyComplianceComment;

  const getComplianceFeedbackMessage = useCallback(
    (targetId) => (complianceCommentFeedback?.targetId === targetId ? complianceCommentFeedback.message : null),
    [complianceCommentFeedback]
  );

  const handleSubmitProject = useCallback(() => {
    if (!onSubmitProject) {
      return;
    }

    onSubmitProject({
      projectName: effectiveProjectName,
      answers,
      analysis,
      relevantTeams,
      timelineDetails
    });
  }, [analysis, answers, effectiveProjectName, onSubmitProject, relevantTeams, timelineDetails]);

  const teamsHeadingLabel = t('synthesisReport.teamsHeadingLabel');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 px-4 py-6 sm:px-8 sm:py-10">
      <div className="max-w-6xl mx-auto">
        <div
          className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-6"
          role="region"
          aria-label={t('synthesisReport.projectSynthesisAriaLabel')}
          data-tour-id="synthesis-summary"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold text-gray-800 sm:text-4xl">{t('synthesisReport.title')}</h1>
              {projectStatusLabel && (
                <span
                  className={`inline-flex items-center self-start rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${projectStatusClasses}`}
                >
                  {t('synthesisReport.statusLabelTemplate', { status: projectStatusLabel })}
                </span>
              )}
              {!isProjectEditable && (
                <p className="text-sm text-gray-500">
                  {t('synthesisReport.notEditableNotice')}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full lg:w-auto">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="text-sm font-medium text-gray-600 underline underline-offset-4 hover:text-gray-800 transition-all w-full sm:w-auto text-center"
                  >
                    {t('synthesisReport.backToQuestionnaire')}
                  </button>
                )}
                {canOpenProjectShowcase && (
                  <button
                    type="button"
                    onClick={handleOpenShowcase}
                    className="px-4 py-2 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-all flex items-center justify-center w-full sm:w-auto text-sm sm:text-base"
                    data-tour-id="synthesis-showcase"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t('synthesisReport.projectShowcaseButton')}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleSubmitProject}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-md transition-all flex items-center justify-center w-full sm:w-auto text-sm sm:text-base"
                data-tour-id="synthesis-submit"
              >
                <Send className="w-4 h-4 mr-2" />
                {t('synthesisReport.submitProjectButton')}
              </button>
            </div>
          </div>

          {(onShareProjectMember || onRemoveProjectMember) && (
            <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
                  {t('synthesisReport.shareSectionTitle')}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {t('synthesisReport.shareSectionHint')}
                </p>
              </div>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="email"
                  value={shareMemberDraft}
                  onChange={(event) => setShareMemberDraft(event.target.value)}
                  placeholder="prenom.nom@lfb.fr"
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                />
                <button
                  type="button"
                  onClick={handleShareMemberAdd}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                >
                  {t('synthesisReport.addButton')}
                </button>
              </div>
              {shareMemberFeedback && (
                <p className="mt-2 text-xs text-emerald-600">{shareMemberFeedback}</p>
              )}
              {normalizedSharedMembers.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {normalizedSharedMembers.map((member) => (
                    <span
                      key={member}
                      className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                    >
                      {member}
                      {typeof onRemoveProjectMember === 'function' && (
                        <button
                          type="button"
                          onClick={() => handleShareMemberRemove(member)}
                          className="rounded-full p-0.5 text-blue-700 hover:bg-blue-100"
                          aria-label={t('synthesisReport.removeMemberAriaLabel', { member })}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {hasSaveFeedback && (
            <div className="mb-6" role="status" aria-live="polite">
              <div
                className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
                  isSaveSuccess
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {isSaveSuccess ? (
                  <CheckCircle className="mt-0.5 h-5 w-5" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-5 w-5" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{saveFeedback.message}</p>
                </div>
                {typeof onDismissSaveFeedback === 'function' && (
                  <button
                    type="button"
                    onClick={onDismissSaveFeedback}
                    className="text-xs font-semibold uppercase tracking-wide text-current hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-current rounded"
                  >
                    {t('synthesisReport.closeButton')}
                  </button>
                )}
              </div>
            </div>
          )}


          <section className="mb-8" aria-labelledby="teams-heading" data-tour-id="synthesis-teams">
            <h2 id="teams-heading" className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
              <Users className="w-6 h-6 mr-2 text-blue-600" />
              {t('synthesisReport.teamsHeadingTemplate', { label: teamsHeadingLabel, count: relevantTeams.length })}
            </h2>
            {hasIncompleteAnswers && (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                <Info className="mt-0.5 h-5 w-5" />
                <p>{t('synthesisReport.incompleteAnswersMessage')}</p>
              </div>
            )}
            {relevantTeams.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {TEAM_STATUS_SUMMARY_ORDER.filter((entry) => (teamStatusSummary[entry.value] || 0) > 0).map((entry) => (
                  <span
                    key={entry.value}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TEAM_STATUS_ACCENT_COLOR[entry.value] }} />
                    {teamStatusSummary[entry.value]} {t(`synthesisReport.${entry.labelKey}`).toLowerCase()}
                  </span>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4">
              {sharedTeamBlocks.map((block) => (
                <div
                  key={`shared-${block.ruleId || block.ruleName}`}
                  className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200"
                  role="article"
                  aria-label={t('synthesisReport.sharedBlockAriaLabelTemplate', { ruleName: block.ruleName || t('synthesisReport.ruleFallback') })}
                >
                  <h3 className="text-lg font-bold text-blue-900">
                    {block.ruleName || t('synthesisReport.unnamedRuleFallback')}
                  </h3>
                  <p className="mt-2 text-sm text-blue-800">
                    {t('synthesisReport.sharedBlockForTemplate', { teamNames: block.teamNames.join(' · ') })}
                  </p>
                  {block.questions.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-blue-900 mb-2">{t('synthesisReport.pointsToPrepareSharedTitle')}</h4>
                      <ul className="space-y-1">
                        {block.questions.map((question, idx) => (
                          <li key={idx} className="text-sm text-blue-900 flex">
                            <span className="mr-2">•</span>
                            <span>{renderTextWithLinks(question.text)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
              {sortedRelevantTeams.map(team => {
                const teamPriority = getTeamPriority(analysis, team.id);
                const teamQuestions = analysis.questions?.[team.id];
                const teamContactLabel = formatTeamContacts(team, ' · ');
                const formattedTeamQuestions = Array.isArray(teamQuestions)
                  ? teamQuestions
                      .map((entry) => normalizeTeamQuestionForDisplay(entry, language))
                      .filter(question => (question.text || '').trim().length > 0)
                  : [];

                const storedEntry = normalizeCommentEntry(complianceComments.teams?.[team.id]);
                const draftEntry = complianceCommentDrafts.teams?.[team.id] || storedEntry;
                const headerStatusMeta = getCommentStatusMeta(storedEntry.status, t);
                const statusMeta = getCommentStatusMeta(canBypassCompliancePerimeter ? draftEntry.status : storedEntry.status, t);
                const isDirty =
                  draftEntry.comment !== storedEntry.comment
                  || draftEntry.status !== storedEntry.status
                  || JSON.stringify(normalizeCommentAttachments(draftEntry.attachments))
                    !== JSON.stringify(normalizeCommentAttachments(storedEntry.attachments));
                const feedbackMessage = getComplianceFeedbackMessage(`team-${team.id}`);
                const canEditTeamComment = canBypassCompliancePerimeter || complianceTeamIdsForUser.has(team.id);
                const canReplyTeamThread = canEditTeamComment || canReplyAsProjectContributor;
                const threadKey = `team-${team.id}`;
                const threadMessages = getThreadMessages(storedEntry, team.name);
                const isThreadExpanded = Boolean(expandedThreads[threadKey]);
                const shouldCollapse = !isThreadExpanded && shouldCollapseThread(threadMessages);
                const visibleMessages = shouldCollapse ? threadMessages.slice(0, 2) : threadMessages;
                const isCommentEditorOpen = Boolean(openTeamCommentEditors[team.id]);
                const isReplyBoxOpen = Boolean(openTeamReplyBoxes[team.id]);
                const defaultTeamCollapsed = TEAM_STATUS_COLLAPSED_BY_DEFAULT.has(storedEntry.status);
                const isTeamCollapsed = teamCollapsedOverrides[team.id] !== undefined
                  ? teamCollapsedOverrides[team.id]
                  : defaultTeamCollapsed;
                const teamAccentColor = TEAM_STATUS_ACCENT_COLOR[storedEntry.status] ?? TEAM_STATUS_ACCENT_COLOR[''];

                return (
                  <div
                    key={team.id}
                    className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-blue-300 transition-all"
                    style={{ borderLeftWidth: '4px', borderLeftColor: teamAccentColor }}
                    role="article"
                    aria-label={t('synthesisReport.teamAriaLabelTemplate', { teamName: team.name })}
                  >
                    <button
                      type="button"
                      onClick={() => toggleTeamCollapsed(team.id, isTeamCollapsed)}
                      className="flex w-full items-start justify-between gap-3 text-left"
                      aria-expanded={!isTeamCollapsed}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <svg
                          className={`mt-1 h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${isTeamCollapsed ? '-rotate-90' : ''}`}
                          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                        <div className="min-w-0">
                          <h3 className="text-lg font-bold text-gray-800">{team.name}</h3>
                          {isTeamCollapsed && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {t('synthesisReport.teamCollapsedSummaryTemplate', {
                                prepCount: formattedTeamQuestions.length,
                                exchangeCount: threadMessages.length
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                        {headerStatusMeta && (
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${headerStatusMeta.badgeClass}`}>
                            {headerStatusMeta.label}
                          </span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${priorityColors[teamPriority]}`}>
                          {riskPriorityLabels[teamPriority] || teamPriority}
                        </span>
                      </div>
                    </button>

                    {!isTeamCollapsed && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-600 mb-3">{renderTextWithLinks(team.expertise)}</p>
                        {teamContactLabel && (
                          <div className="mt-2 text-sm text-blue-600 font-medium flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {renderTextWithLinks(teamContactLabel)}
                          </div>
                        )}

                        {formattedTeamQuestions.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-semibold text-gray-800 mb-2">{t('synthesisReport.pointsToPrepareTitle')}</h4>
                            <ul className="space-y-1">
                              {formattedTeamQuestions.map((question, idx) => {
                                const timingMessage = formatTeamQuestionTimingMessage(questions, question.timingViolation, language, t);
                                return (
                                  <li key={idx} className="text-sm text-gray-700 flex flex-col">
                                    <div className="flex">
                                      <span className="text-blue-500 mr-2">•</span>
                                      <span>{renderTextWithLinks(question.text)}</span>
                                    </div>
                                    {timingMessage && (
                                      <span className="ml-5 text-xs text-yellow-600 mt-1">⚠️ {timingMessage}</span>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        {shouldShowComplianceCommentsSection && (
                          <div className="mt-6 border-t border-gray-200 pt-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-sm font-semibold text-gray-800">{t('synthesisReport.expertCommentTitle')}</h4>
                                <p className="text-xs text-gray-500 mt-0.5">{t('synthesisReport.expertCommentSubtitleTemplate', { teamName: team.name })}</p>
                              </div>
                              {statusMeta && (
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusMeta.badgeClass}`}>
                                  {statusMeta.label}
                                </span>
                              )}
                            </div>

                            <div className="space-y-3">
                              {visibleMessages.length > 0 ? (
                                <div className="space-y-3">
                                  {visibleMessages.map((message) => {
                                    const trimmedMessage = message.message.trim();
                                    const isTruncated = shouldCollapse && trimmedMessage.length > 240;
                                    const preview = isTruncated ? `${trimmedMessage.slice(0, 240)}…` : trimmedMessage;

                                    return (
                                      <div key={message.id} className="rounded-lg border border-gray-200 bg-white p-3">
                                        <p className="text-xs font-semibold text-gray-500">
                                          {message.authorName || message.authorEmail || t('synthesisReport.defaultTeamLabel')}
                                        </p>
                                        <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                                          {renderTextWithLinks(preview)}
                                        </p>
                                      </div>
                                    );
                                  })}
                                  {shouldCollapse && (
                                    <button
                                      type="button"
                                      onClick={() => toggleThreadExpanded(threadKey)}
                                      className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                                    >
                                      {t('synthesisReport.seeMore')}
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">{t('synthesisReport.noCommentYet')}</p>
                              )}
                            </div>

                            {canEditTeamComment && (
                              <div className="border-t border-gray-200 pt-3">
                                <button
                                  type="button"
                                  onClick={() => toggleTeamCommentEditor(team.id)}
                                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                                >
                                  {isCommentEditorOpen ? t('synthesisReport.closeToggle') : t('synthesisReport.editCommentToggle')}
                                </button>
                                {isCommentEditorOpen && (
                                  <form
                                    onSubmit={(event) =>
                                      handleComplianceCommentSubmit({ event, targetId: team.id, targetType: 'team' })
                                    }
                                    className="mt-3 space-y-3"
                                  >
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700" htmlFor={`compliance-status-${team.id}`}>
                                        {t('synthesisReport.statusFieldLabel')}
                                      </label>
                                      <select
                                        id={`compliance-status-${team.id}`}
                                        value={draftEntry.status}
                                        onChange={(event) =>
                                          handleComplianceCommentChange({
                                            targetId: team.id,
                                            targetType: 'team',
                                            field: 'status',
                                            value: event.target.value
                                          })
                                        }
                                        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                      >
                                        <option value="">{t('synthesisReport.selectStatusOption')}</option>
                                        {COMMENT_STATUS_OPTIONS.map((option) => (
                                          <option key={`status-${team.id}-${option.value}`} value={option.value}>
                                            {t(`synthesisReport.${option.labelKey}`)}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700" htmlFor={`compliance-comment-${team.id}`}>
                                        {t('synthesisReport.commentFieldLabel')}
                                      </label>
                                      <RichTextEditor
                                        id={`compliance-comment-${team.id}`}
                                        compact
                                        placeholder={t('synthesisReport.teamCommentPlaceholder')}
                                        value={draftEntry.comment}
                                        onChange={(value) =>
                                          handleComplianceCommentChange({
                                            targetId: team.id,
                                            targetType: 'team',
                                            field: 'comment',
                                            value
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <button
                                        type="submit"
                                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                                          canSaveComplianceComment && isDirty
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }`}
                                        disabled={!canSaveComplianceComment || !isDirty}
                                      >
                                        {t('synthesisReport.saveCommentButton')}
                                      </button>
                                      {feedbackMessage && (
                                        <span className="text-xs font-medium text-emerald-700">
                                          {feedbackMessage}
                                        </span>
                                      )}
                                    </div>
                                  </form>
                                )}
                              </div>
                            )}

                            {canReplyTeamThread && (
                              <div className="border-t border-gray-200 pt-3">
                                <button
                                  type="button"
                                  onClick={() => toggleTeamReplyBox(team.id)}
                                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                                >
                                  {isReplyBoxOpen ? t('synthesisReport.closeToggle') : t('synthesisReport.replyToggle')}
                                </button>
                                {isReplyBoxOpen && (
                                  <div className="mt-3">
                                    <RichTextEditor
                                      id={`${threadKey}-reply-editor`}
                                      compact
                                      value={normalizeReplyDraft(complianceReplyDrafts[threadKey]).message}
                                      onChange={(value) => handleComplianceReplyChange(threadKey, value)}
                                      placeholder={t('synthesisReport.replyPlaceholder')}
                                    />
                                    <input
                                      type="file"
                                      multiple
                                      className="mt-2 block w-full text-xs text-gray-600"
                                      onChange={(event) => {
                                        handleComplianceReplyFilesChange(threadKey, event.target.files);
                                        event.target.value = '';
                                      }}
                                    />
                                    {normalizeReplyDraft(complianceReplyDrafts[threadKey]).attachments.length > 0 && (
                                      <ul className="mt-2 space-y-1 text-xs">
                                        {normalizeReplyDraft(complianceReplyDrafts[threadKey]).attachments.map((attachment) => (
                                          <li key={attachment.id} className="flex items-center justify-between gap-2">
                                            <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                                              {attachment.name}
                                            </a>
                                            <button type="button" className="text-red-600" onClick={() => handleComplianceReplyAttachmentRemove(threadKey, attachment.id)}>{t('synthesisReport.removeButton')}</button>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                    <div className="mt-2 flex items-center gap-3">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleComplianceReplySubmit({ targetId: team.id, targetType: 'team' })
                                        }
                                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                                          canSaveComplianceComment
                                          && (normalizeReplyDraft(complianceReplyDrafts[threadKey]).message.trim().length > 0
                                            || normalizeReplyDraft(complianceReplyDrafts[threadKey]).attachments.length > 0)
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }`}
                                        disabled={
                                          !canSaveComplianceComment
                                          || (normalizeReplyDraft(complianceReplyDrafts[threadKey]).message.trim().length === 0
                                            && normalizeReplyDraft(complianceReplyDrafts[threadKey]).attachments.length === 0)
                                        }
                                      >
                                        {t('synthesisReport.sendReplyButton')}
                                      </button>
                                      {feedbackMessage && (
                                        <span className="text-xs font-medium text-emerald-700">
                                          {feedbackMessage}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <div data-tour-id="synthesis-risks" className="space-y-8">
            <section aria-labelledby="risks-heading">
              <h2 id="risks-heading" className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <AlertTriangle className="w-6 h-6 mr-2 text-red-500" />
                {t('synthesisReport.risksHeadingTemplate', { count: analysis.risks.length })}
              </h2>
              {hasIncompleteAnswers && (
                <div className="mb-4 flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                  <Info className="mt-0.5 h-5 w-5" />
                  <p>{t('synthesisReport.incompleteAnswersMessage')}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.risks.map((risk, idx) => {
                  const timingViolationMessage = formatRiskTimingViolation(risk.timingViolation, language, t);
                  const riskDescriptionText = resolveLocalizedText(risk.description, language);
                  const riskMitigationText = resolveLocalizedText(risk.mitigation, language);

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border ${riskColors[risk.level]}`}
                      role="article"
                      aria-label={t('synthesisReport.riskAriaLabelTemplate', { level: riskLevelLabels[risk.level] || risk.level })}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="text-sm font-semibold text-gray-700">{riskLevelLabels[risk.level] || risk.level}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${priorityColors[risk.priority]}`}>
                          {riskPriorityLabels[risk.priority] || risk.priority}
                        </span>
                      </div>
                      <p className="text-gray-800 font-medium">{renderTextWithLinks(riskDescriptionText)}</p>
                      {timingViolationMessage && (
                        <p className="text-xs text-red-600 mt-2">{timingViolationMessage}</p>
                      )}
                      <p className="text-xs text-gray-600 mt-2">
                        <span className="font-semibold text-gray-700">{t('synthesisReport.referentTeamLabel')}</span>{' '}
                        {(() => {
                          const associatedTeam = teams.find(team => {
                            if (risk.teamId) {
                              return team.id === risk.teamId;
                            }
                            if (Array.isArray(risk.teams)) {
                              return risk.teams.includes(team.id);
                            }
                            return false;
                          });

                          if (associatedTeam) {
                            return associatedTeam.name;
                          }

                          if (risk.teamId) {
                            return risk.teamId;
                          }

                          if (Array.isArray(risk.teams) && risk.teams.length > 0) {
                            return risk.teams[0];
                          }

                          return t('synthesisReport.teamNotProvided');
                        })()}
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        <span className="font-semibold text-gray-700">{t('synthesisReport.mitigationLabel')}</span>{' '}
                        {renderTextWithLinks(riskMitigationText)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {rankingResults.map(result => (
              <section key={result.question.id} aria-labelledby={`ranking-${result.question.id}`} className="mt-8">
                <h3
                  id={`ranking-${result.question.id}`}
                  className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2"
                >
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  {result.config.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4">{t('synthesisReport.declaredPrioritiesTemplate', { answer: result.formattedAnswer })}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.recommendations.map(recommendation => (
                    <article
                      key={recommendation.id}
                      className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm space-y-3"
                      aria-label={t('synthesisReport.recommendationAriaLabelTemplate', { name: recommendation.name })}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{recommendation.name}</h4>
                          {recommendation.previousProject && (
                            <p className="text-xs text-gray-600">{t('synthesisReport.recentProjectTemplate', { value: recommendation.previousProject })}</p>
                          )}
                          {recommendation.opinion && (
                            <p className="text-xs text-gray-600">{t('synthesisReport.globalOpinionTemplate', { value: recommendation.opinion })}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-gray-500 uppercase">{t('synthesisReport.scoreLabel')}</span>
                          <p className="text-xl font-bold text-indigo-700">{formatNumber(recommendation.score, { maximumFractionDigits: 1 }, language)}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {result.orderedCriteria.map(criterion => (
                          <span
                            key={`${recommendation.id}-${criterion.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100"
                          >
                            {criterion.label}{t('synthesisReport.criterionLabelSeparator')}<span className="text-gray-900">{formatCriterionScore(recommendation.scores?.[criterion.id])}</span>
                          </span>
                        ))}
                        {result.ignoredCriteria.map(criterion => (
                          <span
                            key={`${recommendation.id}-${criterion.id}-ignored`}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-500 border border-gray-200"
                          >
                            {t('synthesisReport.criterionIgnoredTemplate', { label: criterion.label })}
                          </span>
                        ))}
                      </div>

                      <div className="flex flex-col gap-1 text-sm text-gray-700">
                        {recommendation.contact && (
                          <div className="flex items-center gap-2 text-blue-700">
                            <Mail className="w-4 h-4" />
                            {renderTextWithLinks(recommendation.contact)}
                          </div>
                        )}
                        {recommendation.website && (
                          <a
                            href={recommendation.website}
                            className="text-sm text-blue-600 underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {t('synthesisReport.visitWebsiteLink')}
                          </a>
                        )}
                        {recommendation.notes && (
                          <p className="text-xs text-gray-600 mt-1">{renderTextWithLinks(recommendation.notes)}</p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}

            {vigilanceAlerts.length > 0 && (
              <section aria-labelledby="vigilance-heading" className="mt-8">
                <h2 id="vigilance-heading" className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                  <CheckCircle className="w-6 h-6 mr-2 text-emerald-500" />
                  {t('synthesisReport.vigilanceHeadingTemplate', { count: vigilanceAlerts.length })}
                </h2>
                <div className="space-y-3">
                  {vigilanceAlerts.map(alert => {
                    const priorityClass = priorityColors[alert.priority] || 'bg-emerald-100 text-emerald-800 border-emerald-300';
                    const statusClass = vigilanceStatusClasses[alert.status] || vigilanceStatusClasses.unknown;
                    const alertRuleName = resolveLocalizedText(alert.ruleName, language);
                    const alertRiskDescription = resolveLocalizedText(alert.riskDescription, language);
                    const title = alertRiskDescription.trim().length > 0
                      ? alertRiskDescription
                      : alertRuleName;
                    const teamLabel = resolveTeamLabel(alert.teamId);

                    return (
                      <div
                        key={alert.id || `${alert.ruleId}-${alert.riskId || 'risk'}`}
                        className={`p-4 rounded-xl border ${statusClass}`}
                        role="article"
                        aria-label={t('synthesisReport.vigilanceAriaLabelTemplate', { ruleName: alertRuleName })}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <span className="text-sm font-semibold text-gray-700">{alertRuleName}</span>
                          {alert.priority && (
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${priorityClass}`}>
                              {riskPriorityLabels[alert.priority] || alert.priority}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-800 font-medium">{renderTextWithLinks(title)}</p>
                        {alert.requirementSummary && (
                          <p className="text-xs text-emerald-800 mt-2">{alert.requirementSummary}</p>
                        )}
                        {alert.statusMessage && (
                          <p className="text-xs text-gray-600 mt-2">{alert.statusMessage}</p>
                        )}
                        {teamLabel && (
                          <p className="text-xs text-gray-600 mt-2">
                            <span className="font-semibold text-gray-700">{t('synthesisReport.referentTeamLabel')}</span>{' '}
                            {teamLabel}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {shouldShowComplianceCommentsSection && (
            <section className="mt-8" aria-labelledby="compliance-comments-heading">
              <div className="bg-white rounded-xl border border-blue-200 p-6 space-y-6">
                <div className="flex items-center">
                  <Info className="w-6 h-6 mr-2 text-blue-600" />
                  <h2 id="compliance-comments-heading" className="text-2xl font-bold text-gray-800">
                    {t('synthesisReport.expertCommentTitle')}
                  </h2>
                </div>

                <p className="text-sm text-gray-500">
                  {t('synthesisReport.committeeCommentNote', { teamsLabel: teamsHeadingLabel })}
                </p>

                {shouldShowCommitteeSection && (
                  <div className="space-y-4">
                    {requiredValidationCommittees.length > 0 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        <p className="font-medium">{t('synthesisReport.requiredCommitteesTitle')}</p>
                        <ul className="mt-2 list-disc pl-5 space-y-1">
                          {requiredValidationCommittees.map((committee) => (
                            <li key={`required-${committee.id}`}>{committee.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {committeesToDisplay.map((committee) => {
                      const committeeCommentEntry = committeeCommentMap[committee.id] || normalizeCommentEntry();
                      const committeeDraft = complianceCommentDrafts.committees?.[committee.id] || committeeCommentEntry;
                      const feedbackMessage = getComplianceFeedbackMessage(`committee-${committee.id}`);
                      const committeeStatusMeta = getCommentStatusMeta(
                        canBypassCompliancePerimeter ? committeeDraft.status : committeeCommentEntry.status,
                        t
                      );
                      const isRequired = requiredCommitteeIds.has(committee.id);
                      const isDirty =
                        committeeDraft.comment !== committeeCommentEntry.comment
                        || committeeDraft.status !== committeeCommentEntry.status
                        || JSON.stringify(normalizeCommentAttachments(committeeDraft.attachments))
                          !== JSON.stringify(normalizeCommentAttachments(committeeCommentEntry.attachments));
                      const threadKey = `committee-${committee.id}`;
                      const threadMessages = getThreadMessages(committeeCommentEntry, committee.name);
                      const isThreadExpanded = Boolean(expandedThreads[threadKey]);
                      const shouldCollapse = !isThreadExpanded && shouldCollapseThread(threadMessages);
                      const visibleMessages = shouldCollapse ? threadMessages.slice(0, 2) : threadMessages;

                      return (
                        <article key={committee.id} className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <h3 className="text-base font-semibold text-gray-800">{committee.name}</h3>
                              <p className="text-xs text-gray-500">
                                {isRequired
                                  ? t('synthesisReport.committeeRequiredHint')
                                  : t('synthesisReport.committeeOptionalHint')}
                              </p>
                            </div>
                            {committeeStatusMeta && (
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold border ${committeeStatusMeta.badgeClass}`}
                              >
                                {committeeStatusMeta.label}
                              </span>
                            )}
                          </div>

                          {canBypassCompliancePerimeter ? (
                            <form
                              onSubmit={(event) =>
                                handleComplianceCommentSubmit({
                                  event,
                                  targetId: committee.id,
                                  targetType: 'committee'
                                })
                              }
                              className="mt-4 space-y-3"
                            >
                              <div>
                                <label
                                  className="block text-sm font-medium text-gray-700"
                                  htmlFor={`compliance-committee-status-${committee.id}`}
                                >
                                  {t('synthesisReport.statusFieldLabel')}
                                </label>
                                <select
                                  id={`compliance-committee-status-${committee.id}`}
                                  value={committeeDraft.status}
                                  onChange={(event) =>
                                    handleComplianceCommentChange({
                                      targetId: committee.id,
                                      targetType: 'committee',
                                      field: 'status',
                                      value: event.target.value
                                    })
                                  }
                                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                >
                                  <option value="">{t('synthesisReport.selectStatusOption')}</option>
                                  {COMMENT_STATUS_OPTIONS.map((option) => (
                                    <option key={`status-committee-${committee.id}-${option.value}`} value={option.value}>
                                      {t(`synthesisReport.${option.labelKey}`)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label
                                  className="block text-sm font-medium text-gray-700"
                                  htmlFor={`compliance-committee-comment-${committee.id}`}
                                >
                                  {t('synthesisReport.commentFieldLabel')}
                                </label>
                                <RichTextEditor
                                  id={`compliance-committee-comment-${committee.id}`}
                                  compact
                                  placeholder={t('synthesisReport.committeeCommentPlaceholder')}
                                  value={committeeDraft.comment}
                                  onChange={(value) =>
                                    handleComplianceCommentChange({
                                      targetId: committee.id,
                                      targetType: 'committee',
                                      field: 'comment',
                                      value
                                    })
                                  }
                                />
                                <input
                                  type="file"
                                  multiple
                                  className="mt-2 block w-full text-xs text-gray-600"
                                  onChange={(event) => {
                                    handleComplianceCommentFilesChange({
                                      targetId: committee.id,
                                      targetType: 'committee',
                                      files: event.target.files
                                    });
                                    event.target.value = '';
                                  }}
                                />
                                {normalizeCommentAttachments(committeeDraft.attachments).length > 0 && (
                                  <ul className="mt-2 space-y-1 text-xs">
                                    {normalizeCommentAttachments(committeeDraft.attachments).map((attachment) => (
                                      <li key={attachment.id} className="flex items-center justify-between gap-2">
                                        <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                                          {attachment.name}
                                        </a>
                                        <button
                                          type="button"
                                          className="text-red-600"
                                          onClick={() => handleComplianceCommentAttachmentRemove({ targetId: committee.id, targetType: 'committee', attachmentId: attachment.id })}
                                        >{t('synthesisReport.removeButton')}</button>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs text-gray-500">
                                  {t('synthesisReport.committeeSavedNote')}
                                </p>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                  <button
                                    type="submit"
                                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                                      canSaveComplianceComment && isDirty
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    }`}
                                    disabled={!canSaveComplianceComment || !isDirty}
                                  >
                                    {t('synthesisReport.saveCommentButton')}
                                  </button>
                                  {feedbackMessage && (
                                    <span className="text-xs font-medium text-emerald-700">
                                      {feedbackMessage}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </form>
                          ) : null}

                          <div className="mt-4 space-y-3">
                            {visibleMessages.length > 0 ? (
                              <div className="space-y-3">
                                {visibleMessages.map((message) => {
                                  const trimmedMessage = message.message.trim();
                                  const isTruncated = shouldCollapse && trimmedMessage.length > 240;
                                  const preview = isTruncated ? `${trimmedMessage.slice(0, 220)}…` : trimmedMessage;
                                  return (
                                    <div key={message.id} className="rounded-lg bg-white border border-gray-200 p-3">
                                      <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
                                        <span className="font-semibold text-gray-700">{message.authorName}</span>
                                        {message.createdAt && <span>{formatTimestamp(message.createdAt, language)}</span>}
                                      </div>
                                      <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">
                                        {renderTextWithLinks(preview)}
                                      </p>
                                      {normalizeCommentAttachments(message.attachments).length > 0 && (
                                        <ul className="mt-2 space-y-1 text-xs">
                                          {normalizeCommentAttachments(message.attachments).map((attachment) => (
                                            <li key={attachment.id}>
                                              <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                                                {attachment.name}
                                              </a>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  );
                                })}
                                {shouldCollapse && (
                                  <button
                                    type="button"
                                    onClick={() => toggleThreadExpanded(threadKey)}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                                  >
                                    {t('synthesisReport.seeMore')}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">
                                {t('synthesisReport.noCommitteeCommentYet')}
                              </p>
                            )}
                            <div className="border-t border-gray-200 pt-3">
                              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                {t('synthesisReport.replyFieldLabel')}
                              </label>
                              <RichTextEditor
                                id={`${threadKey}-reply-editor`}
                                compact
                                value={normalizeReplyDraft(complianceReplyDrafts[threadKey]).message}
                                onChange={(value) => handleComplianceReplyChange(threadKey, value)}
                                placeholder={t('synthesisReport.replyPlaceholder')}
                              />
                              <input
                                type="file"
                                multiple
                                className="mt-2 block w-full text-xs text-gray-600"
                                onChange={(event) => {
                                  handleComplianceReplyFilesChange(threadKey, event.target.files);
                                  event.target.value = '';
                                }}
                              />
                              {normalizeReplyDraft(complianceReplyDrafts[threadKey]).attachments.length > 0 && (
                                <ul className="mt-2 space-y-1 text-xs">
                                  {normalizeReplyDraft(complianceReplyDrafts[threadKey]).attachments.map((attachment) => (
                                    <li key={attachment.id} className="flex items-center justify-between gap-2">
                                      <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                                        {attachment.name}
                                      </a>
                                      <button type="button" className="text-red-600" onClick={() => handleComplianceReplyAttachmentRemove(threadKey, attachment.id)}>{t('synthesisReport.removeButton')}</button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <div className="mt-2 flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleComplianceReplySubmit({ targetId: committee.id, targetType: 'committee' })
                                  }
                                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                                    canSaveComplianceComment
                                    && (normalizeReplyDraft(complianceReplyDrafts[threadKey]).message.trim().length > 0
                                      || normalizeReplyDraft(complianceReplyDrafts[threadKey]).attachments.length > 0)
                                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  }`}
                                  disabled={
                                    !canSaveComplianceComment
                                    || (normalizeReplyDraft(complianceReplyDrafts[threadKey]).message.trim().length === 0
                                      && normalizeReplyDraft(complianceReplyDrafts[threadKey]).attachments.length === 0)
                                  }
                                >
                                  {t('synthesisReport.sendReplyButton')}
                                </button>
                                {feedbackMessage && (
                                  <span className="text-xs font-medium text-emerald-700">
                                    {feedbackMessage}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                {hasLegacyComplianceComment && (
                  <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-600">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t('synthesisReport.legacyCommentLabel')}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-gray-700">
                      {renderTextWithLinks(legacyComplianceComment)}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="mt-8" aria-labelledby="overview-heading">
            <button
              type="button"
              onClick={() => setIsOverviewOpen((previous) => !previous)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 text-left transition-colors hover:bg-gray-100"
              aria-expanded={isOverviewOpen}
              aria-controls="overview-panel"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" aria-hidden="true" />
                <span id="overview-heading" className="text-lg font-bold text-gray-800">
                  {t('synthesisReport.overviewTitle')}
                </span>
              </span>
              <span className="text-sm font-medium text-blue-600">
                {isOverviewOpen ? t('synthesisReport.overviewHide') : t('synthesisReport.overviewShow')}
              </span>
            </button>
            {isOverviewOpen && (
              <div
                id="overview-panel"
                className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-5 sm:p-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {questions.map(q => {
                    const answerValue = answers[q.id];
                    const shouldRenderCard = isAnswerProvided(answerValue) || q.required;

                    if (!shouldRenderCard) {
                      return null;
                    }

                    const missingInfoLabel = t('synthesisReport.missingInfoLabel');
                    const displayValue = formatOverviewValue(q, answerValue, missingInfoLabel, language);
                    const questionText = resolveLocalizedText(q.question, language);

                    return (
                      <div key={q.id} className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <p className="text-sm text-gray-600">{questionText}</p>
                          {typeof onNavigateToQuestion === 'function' && isProjectEditable && (
                            <button
                              type="button"
                              onClick={() => onNavigateToQuestion(q.id)}
                              className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-colors"
                              aria-label={t('synthesisReport.editAnswerAriaLabelTemplate', { question: questionText })}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {(() => {
                          const resolvedValue = displayValue || missingInfoLabel;
                          const isMissingInfo = resolvedValue === missingInfoLabel;
                          return (
                            <p
                              className={`font-semibold whitespace-pre-line ${
                                isMissingInfo ? 'text-rose-400' : 'text-gray-900'
                              }`}
                            >
                              {renderTextWithLinks(resolvedValue)}
                            </p>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
      {isShowcaseFallbackOpen && (
        <div ref={showcaseFallbackRef}>
          <ProjectShowcase
            projectName={effectiveProjectName}
            onClose={handleCloseShowcase}
            analysis={analysis}
            relevantTeams={relevantTeams}
            questions={questions}
            answers={answers}
            timelineDetails={timelineDetails}
            onUpdateAnswers={onUpdateAnswers}
          />
        </div>
      )}
    </div>
  );
};
