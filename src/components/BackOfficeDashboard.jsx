import React, { useMemo, useState } from '../react.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { getLocaleTag } from '../i18n/languages.js';

const TIME_FILTER_OPTIONS = [
  {
    id: 'all',
    computeRange: () => null
  },
  {
    id: '30d',
    computeRange: () => {
      const end = endOfDay(new Date());
      const start = startOfDay(addDays(end, -29));
      return { start, end };
    }
  },
  {
    id: '90d',
    computeRange: () => {
      const end = endOfDay(new Date());
      const start = startOfDay(addDays(end, -89));
      return { start, end };
    }
  },
  {
    id: '12m',
    computeRange: () => {
      const end = endOfDay(new Date());
      const start = startOfDay(addMonths(end, -11));
      return { start, end };
    }
  },
  {
    id: 'custom',
    computeRange: () => null
  }
];

const TIME_FILTER_LABEL_KEYS = {
  all: 'timeFilterAll',
  '30d': 'timeFilter30d',
  '90d': 'timeFilter90d',
  '12m': 'timeFilter12m',
  custom: 'timeFilterCustom'
};

const COLORBLIND_SAFE_PALETTE = [
  {
    color: '#0072B2',
    pattern:
      'repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.35) 0, rgba(255, 255, 255, 0.35) 8px, transparent 8px, transparent 16px)',
    backgroundSize: '16px 16px'
  },
  {
    color: '#D55E00',
    pattern:
      'repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.35) 0, rgba(255, 255, 255, 0.35) 8px, transparent 8px, transparent 16px)',
    backgroundSize: '16px 16px'
  },
  {
    color: '#009E73',
    pattern:
      'repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.35) 0, rgba(255, 255, 255, 0.35) 6px, transparent 6px, transparent 12px)',
    backgroundSize: '12px 12px'
  },
  {
    color: '#CC79A7',
    pattern:
      'repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.35) 0, rgba(255, 255, 255, 0.35) 10px, transparent 10px, transparent 20px)',
    backgroundSize: '20px 20px'
  },
  {
    color: '#56B4E9',
    pattern:
      'repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0, rgba(255, 255, 255, 0.3) 6px, transparent 6px, transparent 12px)',
    backgroundSize: '12px 12px'
  },
  {
    color: '#E69F00',
    pattern:
      'repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0, rgba(255, 255, 255, 0.3) 12px, transparent 12px, transparent 24px)',
    backgroundSize: '24px 24px'
  },
  {
    color: '#F0E442',
    pattern:
      'repeating-linear-gradient(225deg, rgba(17, 24, 39, 0.2) 0, rgba(17, 24, 39, 0.2) 6px, transparent 6px, transparent 12px)',
    backgroundSize: '12px 12px'
  },
  {
    color: '#000000',
    pattern:
      'repeating-linear-gradient(315deg, rgba(255, 255, 255, 0.35) 0, rgba(255, 255, 255, 0.35) 4px, transparent 4px, transparent 8px)',
    backgroundSize: '8px 8px'
  }
];

const getPaletteEntry = (index, palette = COLORBLIND_SAFE_PALETTE) => {
  const source = Array.isArray(palette) && palette.length > 0 ? palette : COLORBLIND_SAFE_PALETTE;
  return source[index % source.length];
};

const resolveColor = (entry) => {
  if (typeof entry === 'string') {
    return entry;
  }
  return entry?.color || '#4B5563';
};

const buildPatternStyle = (input, palette = COLORBLIND_SAFE_PALETTE) => {
  const entry =
    typeof input === 'number' || typeof input === 'bigint'
      ? getPaletteEntry(Number(input), palette)
      : input;

  if (typeof entry === 'string') {
    return {
      backgroundColor: entry,
      border: '1px solid rgba(17, 24, 39, 0.15)'
    };
  }

  return {
    backgroundColor: entry.color,
    backgroundImage: entry.pattern,
    backgroundSize: entry.backgroundSize,
    backgroundBlendMode: entry.backgroundBlendMode || 'multiply',
    border: entry.border || '1px solid rgba(17, 24, 39, 0.15)'
  };
};

const createNumberFormatter = (language) => new Intl.NumberFormat(getLocaleTag(language));
const createDecimalFormatter = (language) =>
  new Intl.NumberFormat(getLocaleTag(language), {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0
  });

const createAverageFormatter = (language) =>
  new Intl.NumberFormat(getLocaleTag(language), {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });

const COMPLIANCE_COMMENTS_KEY = '__compliance_team_comments__';
const PENDING_INFORMATION_STATUS = 'pending_information';

const formatDays = (value, decimalFormatter, t) => {
  if (!Number.isFinite(value)) {
    return '—';
  }
  const isSingular = Math.abs(value - 1) < 0.001;
  return t(isSingular ? 'backOffice.dashboard.daySingular' : 'backOffice.dashboard.dayPlural', {
    value: decimalFormatter.format(value)
  });
};

const startOfDay = (date) => {
  const clone = new Date(date.getTime());
  clone.setHours(0, 0, 0, 0);
  return clone;
};

const endOfDay = (date) => {
  const clone = new Date(date.getTime());
  clone.setHours(23, 59, 59, 999);
  return clone;
};

const addDays = (referenceDate, amount) => {
  const clone = new Date(referenceDate.getTime());
  clone.setDate(clone.getDate() + amount);
  return clone;
};

const addMonths = (referenceDate, amount) => {
  const clone = new Date(referenceDate.getTime());
  clone.setMonth(clone.getMonth() + amount);
  return clone;
};

const parseDate = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const getProjectGeneratedAt = (project) => {
  const candidates = [
    project?.generatedAt,
    project?.metadata?.generatedAt,
    project?.submittedAt,
    project?.lastUpdated
  ];

  for (const candidate of candidates) {
    const parsed = parseDate(candidate);
    if (parsed) {
      return parsed;
    }
  }

  return null;
};

const getLeadTeamsFromProject = (project) => {
  const rawValue = project?.answers?.teamLeadTeam;

  if (Array.isArray(rawValue)) {
    return rawValue
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0);
  }

  if (typeof rawValue === 'string' && rawValue.trim().length > 0) {
    return [rawValue.trim()];
  }

  return [];
};

const getLaunchDate = (project) => {
  const answers = project?.answers || {};
  return parseDate(answers.launchDate || answers.projectLaunchDate);
};

const getComplianceComments = (project) => {
  const raw = project?.answers?.[COMPLIANCE_COMMENTS_KEY];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { teams: {}, committees: {} };
  }

  const teams = raw.teams && typeof raw.teams === 'object' ? raw.teams : {};
  const committees = raw.committees && typeof raw.committees === 'object' ? raw.committees : {};
  return { teams, committees };
};

const normalizeReply = (reply) => {
  if (!reply || typeof reply !== 'object') {
    return null;
  }

  const createdAt = parseDate(reply.createdAt);
  if (!createdAt) {
    return null;
  }

  return {
    message: typeof reply.message === 'string' ? reply.message : '',
    authorEmail: typeof reply.authorEmail === 'string' ? reply.authorEmail.trim().toLowerCase() : '',
    authorName: typeof reply.authorName === 'string' ? reply.authorName : '',
    createdAt
  };
};

const isDecisionStatus = (status) =>
  typeof status === 'string' && status.length > 0 && status !== PENDING_INFORMATION_STATUS;

const DAY_IN_MS = 1000 * 60 * 60 * 24;

const computeDelayInDays = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return null;
  }

  const diff = (endDate.getTime() - startDate.getTime()) / DAY_IN_MS;
  if (!Number.isFinite(diff)) {
    return null;
  }

  return Math.max(0, diff);
};

const getProjectLeadEmails = (project) => {
  const recipients = [project?.ownerEmail, ...(Array.isArray(project?.sharedWith) ? project.sharedWith : [])]
    .map((email) => (typeof email === 'string' ? email.trim().toLowerCase() : ''))
    .filter((email) => email.length > 0);
  return new Set(recipients);
};

const buildExpertLabelMap = (teams = []) => {
  const map = new Map();
  (Array.isArray(teams) ? teams : []).forEach((team) => {
    if (team?.id) {
      map.set(team.id, team.name || team.id);
    }
  });
  return map;
};

const computeComplianceMetrics = (projects = [], teams = [], t) => {
  const expertLabelMap = buildExpertLabelMap(teams);
  const perExpert = new Map();
  let globalValidationTotal = 0;
  let globalValidationCount = 0;
  let globalReactionTotal = 0;
  let globalReactionCount = 0;

  projects.forEach((project) => {
    const comments = getComplianceComments(project);
    const teamEntries = comments.teams && typeof comments.teams === 'object' ? comments.teams : {};
    const projectLeadEmails = getProjectLeadEmails(project);
    const submissionDate = getProjectGeneratedAt(project) || parseDate(project?.submittedAt);
    let projectStartDate = null;
    let earliestDecisionDate = null;

    Object.entries(teamEntries).forEach(([teamId, entry]) => {
      const label = expertLabelMap.get(teamId) || teamId || t('backOffice.dashboard.expertNotIdentified');
      const normalizedReplies = Array.isArray(entry?.replies)
        ? entry.replies.map(normalizeReply).filter(Boolean).sort((a, b) => a.createdAt - b.createdAt)
        : [];

      const firstProjectLeadReply = normalizedReplies.find((reply) => projectLeadEmails.has(reply.authorEmail));
      const decisionDate = isDecisionStatus(entry?.status)
        ? (normalizedReplies.length > 0 ? normalizedReplies[normalizedReplies.length - 1].createdAt : parseDate(project?.lastUpdated))
        : null;

      if (firstProjectLeadReply && (!projectStartDate || firstProjectLeadReply.createdAt < projectStartDate)) {
        projectStartDate = firstProjectLeadReply.createdAt;
      }

      const effectiveStartDate = firstProjectLeadReply?.createdAt || submissionDate;

      if (!perExpert.has(teamId || label)) {
        perExpert.set(teamId || label, {
          id: teamId || label,
          label,
          validationTotal: 0,
          validationCount: 0,
          reactionTotal: 0,
          reactionCount: 0
        });
      }

      const expertMetrics = perExpert.get(teamId || label);

      const validationDelay = computeDelayInDays(effectiveStartDate, decisionDate);
      if (validationDelay !== null) {
        expertMetrics.validationTotal += validationDelay;
        expertMetrics.validationCount += 1;
        if (!earliestDecisionDate || decisionDate < earliestDecisionDate) {
          earliestDecisionDate = decisionDate;
        }
      }

      let previous = null;
      normalizedReplies.forEach((reply) => {
        if (decisionDate && reply.createdAt > decisionDate) {
          return;
        }

        const role = projectLeadEmails.has(reply.authorEmail) ? 'project_lead' : 'expert';
        if (!previous) {
          previous = { ...reply, role };
          return;
        }

        if (previous.role !== role) {
          const delay = computeDelayInDays(previous.createdAt, reply.createdAt);
          if (delay !== null) {
            expertMetrics.reactionTotal += delay;
            expertMetrics.reactionCount += 1;
          }
        }

        previous = { ...reply, role };
      });
    });

    const effectiveProjectStart = projectStartDate || submissionDate;
    const globalValidationDelay = computeDelayInDays(effectiveProjectStart, earliestDecisionDate);
    if (globalValidationDelay !== null) {
      globalValidationTotal += globalValidationDelay;
      globalValidationCount += 1;
    }
  });

  const expertEntries = Array.from(perExpert.values())
    .map((entry) => ({
      ...entry,
      validationAverage: entry.validationCount > 0 ? entry.validationTotal / entry.validationCount : 0,
      reactionAverage: entry.reactionCount > 0 ? entry.reactionTotal / entry.reactionCount : 0
    }))
    .sort((a, b) => b.validationAverage - a.validationAverage || a.label.localeCompare(b.label));

  expertEntries.forEach((entry) => {
    if (entry.reactionCount > 0) {
      globalReactionTotal += entry.reactionTotal;
      globalReactionCount += entry.reactionCount;
    }
  });

  return {
    globalValidationAverage: globalValidationCount > 0 ? globalValidationTotal / globalValidationCount : 0,
    globalValidationCount,
    globalReactionAverage: globalReactionCount > 0 ? globalReactionTotal / globalReactionCount : 0,
    globalReactionCount,
    expertEntries
  };
};

const PieChart = ({ data, colors = COLORBLIND_SAFE_PALETTE, size = 180, strokeWidth = 26, title }) => {
  const { t, language } = useTranslation();
  const numberFormatter = useMemo(() => createNumberFormatter(language), [language]);
  const decimalFormatter = useMemo(() => createDecimalFormatter(language), [language]);
  const total = data.reduce((sum, item) => sum + Math.max(item.value, 0), 0);

  if (total <= 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-6 text-center text-sm text-gray-500">
        <span role="img" aria-label={t('backOffice.dashboard.noDataAriaLabel')}>📊</span>
        <p>{t('backOffice.dashboard.noDataMessage')}</p>
      </div>
    );
  }

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const segments = [];
  let cumulative = 0;

  data.forEach((item, index) => {
    const value = Math.max(item.value, 0);
    if (value <= 0) {
      return;
    }

    const segmentLength = (value / total) * circumference;
    const percentage = (value / total) * 100;
    const paletteEntry = getPaletteEntry(segments.length, colors);
    const midAngle = ((cumulative + segmentLength / 2) / circumference) * 2 * Math.PI - Math.PI / 2;

    segments.push({
      key: item.id || item.label || index,
      item,
      value,
      percentage,
      segmentLength,
      startOffset: cumulative,
      paletteEntry,
      midAngle,
      displayIndex: segments.length
    });

    cumulative += segmentLength;
  });

  const labelRadius = Math.max(radius - strokeWidth / 2 - 8, radius * 0.45);

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={title || t('backOffice.dashboard.defaultTitle')}
      >
        <g transform={`translate(${size / 2} ${size / 2}) rotate(-90)`}>
          <circle
            r={radius}
            fill="transparent"
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
          />
          {segments.map((segment) => {
            const dashArray = `${segment.segmentLength} ${circumference}`;
            const color = resolveColor(segment.paletteEntry);
            return (
              <g key={`segment-${segment.key}`}>
                <circle
                  r={radius}
                  fill="transparent"
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={dashArray}
                  strokeDashoffset={-segment.startOffset}
                  strokeLinecap="butt"
                >
                  <title>
                    {t('backOffice.dashboard.pieChartTooltip', {
                      label: segment.item.label,
                      value: numberFormatter.format(segment.value),
                      percent: decimalFormatter.format(segment.percentage)
                    })}
                  </title>
                </circle>
              </g>
            );
          })}
          {segments.map((segment) => {
            const angle = segment.midAngle;
            const x = Math.cos(angle) * labelRadius;
            const y = Math.sin(angle) * labelRadius;
            return (
              <text
                key={`label-${segment.key}`}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#111827"
                fontSize={12}
                fontWeight={700}
                stroke="#ffffff"
                strokeWidth={3}
                style={{ paintOrder: 'stroke fill' }}
                aria-hidden="true"
              >
                {segment.displayIndex + 1}
              </text>
            );
          })}
        </g>
      </svg>
      <div className="grid w-full gap-2 text-sm">
        {segments.map((segment) => (
          <div
            key={`legend-${segment.key}`}
            className="flex items-center justify-between rounded-lg border border-gray-100 bg-white/70 px-3 py-2"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                {segment.displayIndex + 1}
              </span>
              <span
                className="h-3 w-10 rounded-full"
                style={buildPatternStyle(segment.paletteEntry, colors)}
                aria-hidden="true"
              />
              <span className="font-medium text-gray-700">{segment.item.label}</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {numberFormatter.format(segment.value)} · {decimalFormatter.format(segment.percentage)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const BarChart = ({
  data,
  valueFormatter,
  unitSuffix = '',
  colors = COLORBLIND_SAFE_PALETTE,
  emptyLabel
}) => {
  const { t, language } = useTranslation();
  const numberFormatter = useMemo(() => createNumberFormatter(language), [language]);
  const resolvedValueFormatter = valueFormatter || ((value) => numberFormatter.format(value));
  const resolvedEmptyLabel = emptyLabel || t('backOffice.dashboard.noDataToDisplay');
  const cleanedData = data.filter((entry) => Number.isFinite(entry.value) && entry.value > 0);
  const maxValue = cleanedData.reduce((max, entry) => Math.max(max, entry.value), 0);

  if (cleanedData.length === 0 || maxValue <= 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-6 text-center text-sm text-gray-500">
        <span role="img" aria-label={t('backOffice.dashboard.noDataAriaLabel')}>📉</span>
        <p>{resolvedEmptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cleanedData.map((entry, index) => {
        const percentage = Math.max((entry.value / maxValue) * 100, 4);
        const barStyle = {
          width: `${percentage}%`,
          ...buildPatternStyle(index, colors),
          borderRadius: '9999px'
        };
        return (
          <div key={entry.id || entry.label || index} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">{entry.label}</span>
              <span className="font-semibold text-gray-900">
                {resolvedValueFormatter(entry.value)}{unitSuffix}
              </span>
            </div>
            <div className="h-3 rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={barStyle}
                aria-hidden="true"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const buildTeamOptions = (projects = [], t) => {
  const counts = new Map();
  projects.forEach((project) => {
    const teams = getLeadTeamsFromProject(project);
    if (teams.length === 0) {
      counts.set('not_set', (counts.get('not_set') || 0) + 1);
      return;
    }
    teams.forEach((team) => {
      counts.set(team, (counts.get(team) || 0) + 1);
    });
  });

  if (!counts.has('not_set')) {
    counts.set('not_set', 0);
  }

  const entries = Array.from(counts.entries()).map(([id, count]) => ({
    id,
    label: id === 'not_set' ? t('backOffice.dashboard.teamNotSet') : id,
    count
  }));

  entries.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return entries;
};

const formatDateRangeSummary = (range, fallbackLabel, language) => {
  if (!range) {
    return fallbackLabel;
  }

  const formatter = new Intl.DateTimeFormat(getLocaleTag(language), { dateStyle: 'medium' });
  return `${formatter.format(range.start)} – ${formatter.format(range.end)}`;
};

export const BackOfficeDashboard = ({ projects = [], teams = [] }) => {
  const { t, language } = useTranslation();
  const [selectedLeadTeam, setSelectedLeadTeam] = useState('all');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const numberFormatter = useMemo(() => createNumberFormatter(language), [language]);
  const decimalFormatter = useMemo(() => createDecimalFormatter(language), [language]);
  const averageFormatter = useMemo(() => createAverageFormatter(language), [language]);

  const sanitizedProjects = useMemo(
    () => (Array.isArray(projects) ? projects.filter((project) => !(project && project.isDemo)) : []),
    [projects]
  );

  const teamOptions = useMemo(() => buildTeamOptions(sanitizedProjects, t), [sanitizedProjects, t]);
  const timeOption = useMemo(
    () => TIME_FILTER_OPTIONS.find((option) => option.id === selectedTimeFilter) || TIME_FILTER_OPTIONS[0],
    [selectedTimeFilter]
  );

  const computedRange = useMemo(() => {
    if (timeOption.id === 'custom') {
      const start = customStart ? startOfDay(new Date(customStart)) : null;
      const end = customEnd ? endOfDay(new Date(customEnd)) : null;

      if (start && end && start > end) {
        return null;
      }

      if (!start && !end) {
        return null;
      }

      return {
        start: start || startOfDay(addDays(end || new Date(), -29)),
        end: end || endOfDay(new Date())
      };
    }

    return timeOption.computeRange ? timeOption.computeRange() : null;
  }, [timeOption, customStart, customEnd]);

  const filteredProjects = useMemo(() => {
    const list = sanitizedProjects;

    return list.filter((project) => {
      if (!project) {
        return false;
      }

      if (selectedLeadTeam !== 'all') {
        const teamsForProject = getLeadTeamsFromProject(project);
        const target = selectedLeadTeam === 'not_set' ? teamsForProject.length === 0 : teamsForProject.includes(selectedLeadTeam);
        if (!target) {
          return false;
        }
      }

      if (computedRange) {
        const generatedAt = getProjectGeneratedAt(project);
        if (!generatedAt) {
          return false;
        }

        if (generatedAt < computedRange.start || generatedAt > computedRange.end) {
          return false;
        }
      }

      return true;
    });
  }, [sanitizedProjects, selectedLeadTeam, computedRange]);

  const leadTeamDistribution = useMemo(() => {
    const counts = new Map();
    const teamNotSetLabel = t('backOffice.dashboard.teamNotSet');
    filteredProjects.forEach((project) => {
      const teamsForProject = getLeadTeamsFromProject(project);
      if (teamsForProject.length === 0) {
        counts.set(teamNotSetLabel, (counts.get(teamNotSetLabel) || 0) + 1);
        return;
      }
      teamsForProject.forEach((team) => {
        counts.set(team, (counts.get(team) || 0) + 1);
      });
    });

    const entries = Array.from(counts.entries()).map(([label, value]) => ({ label, value }));
    entries.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

    return {
      total: entries.reduce((sum, entry) => sum + entry.value, 0),
      entries
    };
  }, [filteredProjects, t]);

  const averageDelay = useMemo(() => {
    let totalDays = 0;
    let count = 0;

    filteredProjects.forEach((project) => {
      const submissionDate = getProjectGeneratedAt(project) || parseDate(project?.submittedAt);
      const launchDate = getLaunchDate(project);

      if (!submissionDate || !launchDate) {
        return;
      }

      const diffInMs = launchDate.getTime() - submissionDate.getTime();
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

      if (!Number.isFinite(diffInDays)) {
        return;
      }

      const sanitized = Math.max(diffInDays, 0);
      totalDays += sanitized;
      count += 1;
    });

    return {
      average: count > 0 ? totalDays / count : 0,
      count
    };
  }, [filteredProjects]);

  const complianceMetrics = useMemo(
    () => computeComplianceMetrics(filteredProjects, teams, t),
    [filteredProjects, teams, t]
  );

  const riskSeverityAverages = useMemo(() => {
    const totals = new Map();
    const unclassifiedLabel = t('backOffice.dashboard.riskLevelUnclassified');

    filteredProjects.forEach((project) => {
      const risks = Array.isArray(project?.analysis?.risks) ? project.analysis.risks : [];
      if (risks.length === 0) {
        return;
      }
      risks.forEach((risk) => {
        const rawLevel = typeof risk?.level === 'string' && risk.level.trim().length > 0 ? risk.level.trim() : unclassifiedLabel;
        const normalizedLevel = rawLevel.charAt(0).toUpperCase() + rawLevel.slice(1);
        totals.set(normalizedLevel, (totals.get(normalizedLevel) || 0) + 1);
      });
    });

    const entries = Array.from(totals.entries()).map(([label, totalRisks]) => ({
      id: label,
      label,
      totalRisks,
      value: filteredProjects.length > 0 ? totalRisks / filteredProjects.length : 0
    }));

    entries.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

    return {
      entries
    };
  }, [filteredProjects, t]);

  const riskLevelDistribution = useMemo(() => {
    const counts = new Map();
    const notEvaluatedLabel = t('backOffice.dashboard.complexityNotEvaluated');
    filteredProjects.forEach((project) => {
      const complexity = typeof project?.analysis?.complexity === 'string' && project.analysis.complexity.trim().length > 0
        ? project.analysis.complexity.trim()
        : notEvaluatedLabel;
      counts.set(complexity, (counts.get(complexity) || 0) + 1);
    });

    const entries = Array.from(counts.entries()).map(([label, value]) => ({ label, value }));
    entries.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

    return {
      total: entries.reduce((sum, entry) => sum + entry.value, 0),
      entries
    };
  }, [filteredProjects, t]);

  const solicitationsByTeam = useMemo(() => {
    const counts = new Map();
    const teamNames = new Map(
      Array.isArray(teams)
        ? teams.map((team) => [team.id, team.name || team.id])
        : []
    );

    filteredProjects.forEach((project) => {
      const collected = new Set();
      const risks = Array.isArray(project?.analysis?.risks) ? project.analysis.risks : [];
      risks.forEach((risk) => {
        if (typeof risk?.teamId === 'string' && risk.teamId) {
          collected.add(risk.teamId);
        }
        if (Array.isArray(risk?.teams)) {
          risk.teams.forEach((teamId) => {
            if (typeof teamId === 'string' && teamId) {
              collected.add(teamId);
            }
          });
        }
      });

      const analysisTeams = Array.isArray(project?.analysis?.teams) ? project.analysis.teams : [];
      analysisTeams.forEach((teamId) => {
        if (typeof teamId === 'string' && teamId) {
          collected.add(teamId);
        }
      });

      collected.forEach((teamId) => {
        counts.set(teamId, (counts.get(teamId) || 0) + 1);
      });
    });

    const entries = Array.from(counts.entries()).map(([teamId, value]) => ({
      id: teamId,
      label: teamNames.get(teamId) || teamId,
      value
    }));

    entries.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

    return {
      total: entries.reduce((sum, entry) => sum + entry.value, 0),
      entries
    };
  }, [filteredProjects, teams]);

  const leadTeamFilterLabel = useMemo(() => {
    if (selectedLeadTeam === 'all') {
      return t('backOffice.dashboard.allTeams');
    }
    if (selectedLeadTeam === 'not_set') {
      return t('backOffice.dashboard.teamNotSet');
    }
    return selectedLeadTeam;
  }, [selectedLeadTeam, t]);

  const effectiveRangeLabel = useMemo(() => {
    if (timeOption.id === 'custom') {
      if (!customStart && !customEnd) {
        return t('backOffice.dashboard.customRangeLabel');
      }
      return formatDateRangeSummary(computedRange, t('backOffice.dashboard.customRangeLabel'), language);
    }
    return t(`backOffice.dashboard.${TIME_FILTER_LABEL_KEYS[timeOption.id]}`);
  }, [timeOption, customStart, customEnd, computedRange, t, language]);

  const totalObservedRisks = useMemo(
    () => riskSeverityAverages.entries.reduce((sum, entry) => sum + entry.totalRisks, 0),
    [riskSeverityAverages.entries]
  );

  const byLeadTeamTitle = t('backOffice.dashboard.byLeadTeamTitle');
  const byRiskLevelTitle = t('backOffice.dashboard.byRiskLevelTitle');

  return (
    <article className="space-y-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <header className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-800">{t('backOffice.dashboard.title')}</h2>
        <p className="text-sm text-gray-600">{t('backOffice.dashboard.subtitle')}</p>
      </header>

      <section aria-label={t('backOffice.dashboard.filtersAriaLabel')} className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="dashboard-lead-team-filter" className="text-sm font-medium text-gray-700">
              {t('backOffice.dashboard.leadTeamFilterLabel')}
            </label>
            <select
              id="dashboard-lead-team-filter"
              value={selectedLeadTeam}
              onChange={(event) => setSelectedLeadTeam(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="all">
                {t('backOffice.dashboard.allTeamsOption', { count: numberFormatter.format(sanitizedProjects.length) })}
              </option>
              <option value="not_set">
                {t('backOffice.dashboard.teamNotSetOption', {
                  count: numberFormatter.format(teamOptions.find((option) => option.id === 'not_set')?.count || 0)
                })}
              </option>
              {teamOptions
                .filter((option) => option.id !== 'not_set')
                .map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} ({numberFormatter.format(option.count)})
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="dashboard-time-filter" className="text-sm font-medium text-gray-700">
              {t('backOffice.dashboard.periodFilterLabel')}
            </label>
            <select
              id="dashboard-time-filter"
              value={selectedTimeFilter}
              onChange={(event) => setSelectedTimeFilter(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {TIME_FILTER_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {t(`backOffice.dashboard.${TIME_FILTER_LABEL_KEYS[option.id]}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {timeOption.id === 'custom' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="dashboard-custom-start" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t('backOffice.dashboard.startDateLabel')}
              </label>
              <input
                id="dashboard-custom-start"
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
                max={customEnd || undefined}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="dashboard-custom-end" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t('backOffice.dashboard.endDateLabel')}
              </label>
              <input
                id="dashboard-custom-end"
                type="date"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
                min={customStart || undefined}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-blue-50/70 px-4 py-3 text-sm text-blue-900">
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
            {t('backOffice.dashboard.activeFiltersLabel')}
          </span>
          <span>
            {t('backOffice.dashboard.activeFiltersSummaryTemplate', {
              count: t(filteredProjects.length > 1 ? 'home.projectCountPlural' : 'home.projectCountSingular', {
                count: numberFormatter.format(filteredProjects.length)
              }),
              team: leadTeamFilterLabel,
              range: effectiveRangeLabel
            })}
          </span>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
          <p className="text-sm font-medium text-blue-800">{t('backOffice.dashboard.submittedProjectsLabel')}</p>
          <p className="mt-3 text-4xl font-bold text-blue-900">
            {numberFormatter.format(filteredProjects.length)}
          </p>
          <p className="mt-2 text-xs text-blue-700">
            {t('backOffice.dashboard.submittedProjectsHint', { total: numberFormatter.format(sanitizedProjects.length) })}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
          <p className="text-sm font-medium text-emerald-800">{t('backOffice.dashboard.avgDelayLabel')}</p>
          <p className="mt-3 text-3xl font-bold text-emerald-900">
            {formatDays(averageDelay.average, decimalFormatter, t)}
          </p>
          <p className="mt-2 text-xs text-emerald-700">
            {t(averageDelay.count > 1 ? 'backOffice.dashboard.avgDelayHintPlural' : 'backOffice.dashboard.avgDelayHintSingular', {
              count: numberFormatter.format(averageDelay.count)
            })}
          </p>
        </div>
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5">
          <p className="text-sm font-medium text-indigo-800">{t('backOffice.dashboard.avgValidationLabel')}</p>
          <p className="mt-3 text-3xl font-bold text-indigo-900">
            {formatDays(complianceMetrics.globalValidationAverage, decimalFormatter, t)}
          </p>
          <p className="mt-2 text-xs text-indigo-700">{t('backOffice.dashboard.avgValidationHint')}</p>
          <p className="mt-1 text-xs text-indigo-700">
            {t(
              complianceMetrics.globalValidationCount > 1
                ? 'backOffice.dashboard.avgValidationCountPlural'
                : 'backOffice.dashboard.avgValidationCountSingular',
              { count: numberFormatter.format(complianceMetrics.globalValidationCount) }
            )}
          </p>
        </div>
        <div className="rounded-2xl border border-fuchsia-100 bg-fuchsia-50/70 p-5">
          <p className="text-sm font-medium text-fuchsia-800">{t('backOffice.dashboard.avgReactivityLabel')}</p>
          <p className="mt-3 text-3xl font-bold text-fuchsia-900">
            {formatDays(complianceMetrics.globalReactionAverage, decimalFormatter, t)}
          </p>
          <p className="mt-2 text-xs text-fuchsia-700">{t('backOffice.dashboard.avgReactivityHint')}</p>
          <p className="mt-1 text-xs text-fuchsia-700">
            {t(
              complianceMetrics.globalReactionCount > 1
                ? 'backOffice.dashboard.avgReactivityCountPlural'
                : 'backOffice.dashboard.avgReactivityCountSingular',
              { count: numberFormatter.format(complianceMetrics.globalReactionCount) }
            )}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2" aria-label={t('backOffice.dashboard.validationByExpertAriaLabel')}>
        <article className="rounded-2xl border border-gray-100 bg-white/80 p-5 shadow-inner">
          <header className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800">{t('backOffice.dashboard.validationByExpertTitle')}</h3>
            <p className="text-sm text-gray-500">{t('backOffice.dashboard.validationByExpertHint')}</p>
          </header>
          <BarChart
            data={complianceMetrics.expertEntries.map((entry) => ({
              id: `expert-validation-${entry.id}`,
              label: entry.label,
              value: entry.validationAverage
            }))}
            valueFormatter={(value) => formatDays(value, decimalFormatter, t)}
            emptyLabel={t('backOffice.dashboard.noValidationDataForExperts')}
          />
        </article>
        <article className="rounded-2xl border border-gray-100 bg-white/80 p-5 shadow-inner">
          <header className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800">{t('backOffice.dashboard.reactivityByExpertTitle')}</h3>
            <p className="text-sm text-gray-500">{t('backOffice.dashboard.reactivityByExpertHint')}</p>
          </header>
          <BarChart
            data={complianceMetrics.expertEntries.map((entry) => ({
              id: `expert-reactivity-${entry.id}`,
              label: entry.label,
              value: entry.reactionAverage
            }))}
            valueFormatter={(value) => formatDays(value, decimalFormatter, t)}
            emptyLabel={t('backOffice.dashboard.noReactivityData')}
          />
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2" aria-label={t('backOffice.dashboard.distributionAriaLabel')}>
        <article className="rounded-2xl border border-gray-100 bg-white/80 p-5 shadow-inner">
          <header className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800">{byLeadTeamTitle}</h3>
            <p className="text-sm text-gray-500">{t('backOffice.dashboard.byLeadTeamHint')}</p>
          </header>
          <PieChart
            data={leadTeamDistribution.entries}
            title={byLeadTeamTitle}
          />
        </article>
        <article className="rounded-2xl border border-gray-100 bg-white/80 p-5 shadow-inner">
          <header className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800">{byRiskLevelTitle}</h3>
            <p className="text-sm text-gray-500">{t('backOffice.dashboard.byRiskLevelHint')}</p>
          </header>
          <PieChart
            data={riskLevelDistribution.entries}
            title={byRiskLevelTitle}
          />
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2" aria-label={t('backOffice.dashboard.riskAnalysisAriaLabel')}>
        <article className="rounded-2xl border border-gray-100 bg-white/80 p-5 shadow-inner">
          <header className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800">{t('backOffice.dashboard.avgRisksBySeverityTitle')}</h3>
            <p className="text-sm text-gray-500">{t('backOffice.dashboard.avgRisksBySeverityHint')}</p>
          </header>
          <BarChart
            data={riskSeverityAverages.entries.map((entry) => ({
              ...entry,
              value: entry.value,
              label: entry.label,
              totalRisks: entry.totalRisks
            }))}
            valueFormatter={(value) => averageFormatter.format(value)}
            unitSuffix={t('backOffice.dashboard.riskUnitSuffix')}
            emptyLabel={t('backOffice.dashboard.noRisksIdentified')}
          />
          {riskSeverityAverages.entries.length > 0 && (
            <p className="mt-4 text-xs text-gray-500">
              {t('backOffice.dashboard.totalObservedTemplate', {
                risks: t(totalObservedRisks > 1 ? 'backOffice.dashboard.riskCountPlural' : 'backOffice.dashboard.riskCountSingular', {
                  count: numberFormatter.format(totalObservedRisks)
                }),
                projects: t(filteredProjects.length > 1 ? 'home.projectCountPlural' : 'home.projectCountSingular', {
                  count: numberFormatter.format(filteredProjects.length)
                })
              })}
            </p>
          )}
        </article>
        <article className="rounded-2xl border border-gray-100 bg-white/80 p-5 shadow-inner">
          <header className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800">{t('backOffice.dashboard.solicitationsTitle')}</h3>
            <p className="text-sm text-gray-500">{t('backOffice.dashboard.solicitationsHint')}</p>
          </header>
          <BarChart
            data={solicitationsByTeam.entries}
            unitSuffix={t('backOffice.dashboard.solicitationsUnitSuffix')}
            emptyLabel={t('backOffice.dashboard.noSolicitations')}
          />
        </article>
      </section>
    </article>
  );
};
