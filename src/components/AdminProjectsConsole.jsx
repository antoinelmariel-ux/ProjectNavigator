import React, { useMemo, useState } from '../react.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { Edit, Eye, FileText, Search, Trash2, Undo, XCircle } from './icons.js';
import {
  ADMIN_PROJECT_STATUSES,
  formatOwnerLabel,
  getAdminProjectStatus,
  listProjectOwners,
  searchAdminProjects
} from '../utils/adminProjectSearch.js';
import { normalizeEmail } from '../utils/normalizeEmail.js';

const PAGE_SIZE = 50;

const STATUS_BADGE_CLASSNAMES = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  submitted: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-orange-50 text-orange-700 border-orange-200',
  trashed: 'bg-red-50 text-red-700 border-red-200'
};

const stripTags = (value) => (typeof value === 'string' ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '');

const formatDate = (value, language) => {
  const time = Date.parse(value || '');
  if (Number.isNaN(time)) {
    return '';
  }
  return new Date(time).toLocaleDateString(language || 'fr', { year: 'numeric', month: 'short', day: 'numeric' });
};

const ACTION_BUTTON_CLASSNAME = 'inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-semibold';

export const AdminProjectsConsole = ({
  projects,
  isProjectsLoading = false,
  canPermanentlyDeleteProject,
  onOpenProject,
  onShowProjectShowcase,
  onCancelProjectSubmission,
  onDeleteProject,
  onRestoreProject,
  onPermanentlyDeleteProject
}) => {
  const { t, language } = useTranslation();
  const [query, setQuery] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [status, setStatus] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [pendingAction, setPendingAction] = useState(null);

  const owners = useMemo(() => listProjectOwners(projects), [projects]);
  const results = useMemo(
    () => searchAdminProjects(projects, { query, ownerEmail, status }),
    [projects, query, ownerEmail, status]
  );
  const totalCount = Array.isArray(projects) ? projects.length : 0;
  const visibleResults = results.slice(0, visibleCount);
  const hasCriteria = query.trim().length > 0 || ownerEmail || status;

  const updateCriteria = (setter) => (event) => {
    setter(event.target.value);
    setVisibleCount(PAGE_SIZE);
    setPendingAction(null);
  };

  const resetCriteria = () => {
    setQuery('');
    setOwnerEmail('');
    setStatus('');
    setVisibleCount(PAGE_SIZE);
    setPendingAction(null);
  };

  const confirmPendingAction = () => {
    if (!pendingAction) {
      return;
    }
    const { type, projectId } = pendingAction;
    if (type === 'cancel') {
      onCancelProjectSubmission?.(projectId);
    } else if (type === 'trash') {
      onDeleteProject?.(projectId);
    } else if (type === 'purge') {
      onPermanentlyDeleteProject?.(projectId);
    }
    setPendingAction(null);
  };

  const renderConfirmation = (project, projectName) => {
    const hasExpertWork = pendingAction.type === 'purge'
      && typeof canPermanentlyDeleteProject === 'function'
      && !canPermanentlyDeleteProject(project);
    return (
      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
        <p>{t(`adminConsole.confirm.${pendingAction.type}`, { name: projectName })}</p>
        {hasExpertWork && <p className="mt-1 font-semibold">{t('adminConsole.confirm.purgeExpertWork')}</p>}
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => setPendingAction(null)}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            {t('adminConsole.confirm.dismiss')}
          </button>
          <button
            type="button"
            onClick={confirmPendingAction}
            className="inline-flex items-center rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            {t('adminConsole.confirm.confirm')}
          </button>
        </div>
      </div>
    );
  };

  const renderProject = (project) => {
    const projectStatus = getAdminProjectStatus(project);
    const projectName = stripTags(project.projectName) || t('adminConsole.unnamedProject');
    const owner = normalizeEmail(project.ownerEmail || '');
    const coOwners = (Array.isArray(project.sharedWith) ? project.sharedWith : [])
      .map((entry) => normalizeEmail(entry || ''))
      .filter(Boolean);
    const updatedOn = formatDate(project.lastUpdated || project.submittedAt, language);
    const isTrashed = projectStatus === 'trashed';
    const isPending = pendingAction?.projectId === project.id;

    return (
      <li
        key={project.id}
        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
        data-testid="admin-console-project"
        data-project-id={project.id}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold text-gray-900">{projectName}</p>
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE_CLASSNAMES[projectStatus]}`}>
                {t(`adminConsole.status.${projectStatus}`)}
              </span>
            </div>
            <p className="text-sm text-gray-700">
              {owner
                ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOwnerEmail(owner);
                      setVisibleCount(PAGE_SIZE);
                    }}
                    className="font-medium text-blue-700 hover:underline"
                    title={t('adminConsole.filterByThisOwner')}
                  >
                    {formatOwnerLabel(owner)} <span className="text-gray-500">({owner})</span>
                  </button>
                )
                : <span className="italic text-gray-500">{t('adminConsole.noOwner')}</span>}
            </p>
            {coOwners.length > 0 && (
              <p className="text-xs text-gray-500">{t('adminConsole.coOwners', { list: coOwners.join(', ') })}</p>
            )}
            {updatedOn && <p className="text-xs text-gray-500">{t('adminConsole.updatedOn', { date: updatedOn })}</p>}
          </div>

          {!isPending && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {!isTrashed && (
                <>
                  <button
                    type="button"
                    onClick={() => onOpenProject?.(project.id, 'questionnaire')}
                    className={`${ACTION_BUTTON_CLASSNAME} border-blue-200 text-blue-700 hover:bg-blue-50`}
                  >
                    <Edit className="h-4 w-4" aria-hidden="true" />
                    {t('adminConsole.actions.editAnswers')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenProject?.(project.id, 'synthesis')}
                    className={`${ACTION_BUTTON_CLASSNAME} border-gray-200 text-gray-700 hover:bg-gray-50`}
                  >
                    <FileText className="h-4 w-4" aria-hidden="true" />
                    {t('adminConsole.actions.synthesis')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onShowProjectShowcase?.(project.id)}
                    className={`${ACTION_BUTTON_CLASSNAME} border-gray-200 text-gray-700 hover:bg-gray-50`}
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    {t('adminConsole.actions.showcase')}
                  </button>
                </>
              )}
              {projectStatus === 'submitted' && (
                <button
                  type="button"
                  onClick={() => setPendingAction({ type: 'cancel', projectId: project.id })}
                  className={`${ACTION_BUTTON_CLASSNAME} border-orange-200 text-orange-700 hover:bg-orange-50`}
                >
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                  {t('adminConsole.actions.cancelSubmission')}
                </button>
              )}
              {!isTrashed && (
                <button
                  type="button"
                  onClick={() => setPendingAction({ type: 'trash', projectId: project.id })}
                  className={`${ACTION_BUTTON_CLASSNAME} border-red-200 text-red-700 hover:bg-red-50`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {t('adminConsole.actions.trash')}
                </button>
              )}
              {isTrashed && (
                <>
                  <button
                    type="button"
                    onClick={() => onRestoreProject?.(project.id)}
                    className={`${ACTION_BUTTON_CLASSNAME} border-blue-200 text-blue-700 hover:bg-blue-50`}
                  >
                    <Undo className="h-4 w-4" aria-hidden="true" />
                    {t('adminConsole.actions.restore')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingAction({ type: 'purge', projectId: project.id })}
                    className={`${ACTION_BUTTON_CLASSNAME} border-red-200 text-red-700 hover:bg-red-50`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    {t('adminConsole.actions.purge')}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        {isPending && renderConfirmation(project, projectName)}
      </li>
    );
  };

  return (
    <section className="space-y-6" aria-labelledby="admin-console-heading" data-testid="admin-projects-console">
      <div>
        <h1 id="admin-console-heading" className="text-2xl font-bold text-gray-900">{t('adminConsole.heading')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('adminConsole.description')}</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <form
          role="search"
          className="flex flex-col gap-3 md:flex-row md:items-end"
          onSubmit={(event) => event.preventDefault()}
        >
          <label className="block flex-1 text-sm font-medium text-gray-700">
            {t('adminConsole.searchLabel')}
            <span className="mt-1 flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3">
              <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={updateCriteria(setQuery)}
                placeholder={t('adminConsole.searchPlaceholder')}
                className="w-full rounded border-0 bg-transparent py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="admin-console-search"
                autoFocus
              />
            </span>
          </label>
          <label className="block text-sm font-medium text-gray-700 md:w-64">
            {t('adminConsole.ownerLabel')}
            <select
              value={ownerEmail}
              onChange={updateCriteria(setOwnerEmail)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="admin-console-owner"
            >
              <option value="">{t('adminConsole.allOwners')}</option>
              {owners.map((owner) => (
                <option key={owner.email} value={owner.email}>
                  {`${owner.label} (${owner.email}) · ${owner.count}`}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700 md:w-48">
            {t('adminConsole.statusLabel')}
            <select
              value={status}
              onChange={updateCriteria(setStatus)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="admin-console-status"
            >
              <option value="">{t('adminConsole.allStatuses')}</option>
              {ADMIN_PROJECT_STATUSES.map((entry) => (
                <option key={entry} value={entry}>{t(`adminConsole.status.${entry}`)}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={resetCriteria}
            disabled={!hasCriteria}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('adminConsole.reset')}
          </button>
        </form>
        <p className="mt-3 text-sm text-gray-600" aria-live="polite" data-testid="admin-console-count">
          {t('adminConsole.resultCount', { count: results.length, total: totalCount })}
        </p>
      </div>

      {isProjectsLoading && totalCount === 0 ? (
        <p className="text-sm text-gray-500">{t('adminConsole.loading')}</p>
      ) : results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
          {t('adminConsole.noResult')}
        </div>
      ) : (
        <>
          <ul className="space-y-3" aria-label={t('adminConsole.listAriaLabel')}>
            {visibleResults.map(renderProject)}
          </ul>
          {results.length > visibleResults.length && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                {t('adminConsole.showMore', { count: results.length - visibleResults.length })}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};
