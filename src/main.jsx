import React from './react.js';
import { ReactDOM } from './react.js';
import { App } from './App.jsx';
import { initSharePointContext, getCurrentUser } from './utils/spContext.js';
import mockCurrentUser from './data/graph-current-user.json';
import { LanguageProvider, LanguageContext } from './i18n/LanguageContext.jsx';
import { loadPersistedState } from './utils/storage.js';
import { initialAdminEmails } from './data/adminEmails.js';
import { queueNotification } from './utils/notificationQueue.js';
import { buildErrorReportEmail } from './utils/notificationTemplates.js';

const resolveMaintenanceRecipients = () => {
  const persisted = loadPersistedState();
  const persistedEmails = persisted && Array.isArray(persisted.adminEmails) ? persisted.adminEmails : [];
  return persistedEmails.length > 0 ? persistedEmails : initialAdminEmails;
};

class AppErrorBoundary extends React.Component {
  static contextType = LanguageContext;

  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, userComment: '', sendStatus: 'idle' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error('Erreur d\'affichage détectée :', error);
    }
    this.setState({ error, errorInfo });
  }

  handleRefresh = () => {
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload();
    }
  };

  handleCommentChange = (event) => {
    this.setState({ userComment: event.target.value });
  };

  handleSendReport = async () => {
    if (this.state.sendStatus === 'sending' || this.state.sendStatus === 'sent') {
      return;
    }
    this.setState({ sendStatus: 'sending' });

    try {
      const user = getCurrentUser();
      const { subject, body, actionType } = buildErrorReportEmail({
        message: this.state.error && this.state.error.message,
        stack: this.state.error && this.state.error.stack,
        componentStack: this.state.errorInfo && this.state.errorInfo.componentStack,
        screenUrl: typeof window !== 'undefined' ? window.location.href : '',
        userEmail: user && user.mail,
        userComment: this.state.userComment,
        occurredAt: new Date().toISOString()
      });

      const result = await queueNotification({
        subject,
        body,
        actionType,
        to: resolveMaintenanceRecipients()
      });

      this.setState({ sendStatus: result.queued ? 'sent' : 'sent-mock' });
    } catch (error) {
      if (typeof console !== 'undefined' && typeof console.error === 'function') {
        console.error('Envoi du rapport d\'erreur impossible :', error);
      }
      this.setState({ sendStatus: 'error' });
    }
  };

  render() {
    if (this.state.hasError) {
      const t = this.context && typeof this.context.t === 'function' ? this.context.t : (key) => key;
      const { sendStatus, userComment } = this.state;
      const isSending = sendStatus === 'sending';
      const isSent = sendStatus === 'sent' || sendStatus === 'sent-mock';

      return (
        <div className="min-h-screen bg-gray-100 p-6 text-gray-900 sm:p-10">
          <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
            <h1 className="text-lg font-semibold text-red-700">{t('app.errorBoundary.title')}</h1>
            <p className="mt-3 text-sm text-gray-600">{t('app.errorBoundary.message')}</p>

            <div className="mt-5 border-t border-gray-200 pt-5">
              <label htmlFor="error-report-comment" className="block text-sm font-medium text-gray-700">
                {t('app.errorBoundary.commentLabel')}
              </label>
              <textarea
                id="error-report-comment"
                value={userComment}
                onChange={this.handleCommentChange}
                disabled={isSending || isSent}
                rows={3}
                placeholder={t('app.errorBoundary.commentPlaceholder')}
                className="mt-2 w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              />
              <button
                type="button"
                onClick={this.handleSendReport}
                disabled={isSending || isSent}
                className="mt-3 inline-flex items-center rounded-lg border border-red-600 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSending ? t('app.errorBoundary.sendingStatus') : t('app.errorBoundary.sendReportButton')}
              </button>
              {sendStatus === 'sent' && (
                <p className="mt-2 text-sm text-green-700">{t('app.errorBoundary.sentStatus')}</p>
              )}
              {sendStatus === 'sent-mock' && (
                <p className="mt-2 text-sm text-gray-600">{t('app.errorBoundary.sentMockStatus')}</p>
              )}
              {sendStatus === 'error' && (
                <p className="mt-2 text-sm text-red-700">{t('app.errorBoundary.sendErrorStatus')}</p>
              )}
            </div>

            <button
              type="button"
              onClick={this.handleRefresh}
              className="mt-5 inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              {t('app.errorBoundary.reloadButton')}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const renderApplication = () => {
  const rootElement = document.getElementById('root');

  if (!rootElement || !ReactDOM) {
    return;
  }

  const initialLanguage = typeof window !== 'undefined' ? window.__CN_BOOT_LANGUAGE__ : undefined;

  if (typeof ReactDOM.createRoot === 'function') {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <LanguageProvider initialLanguage={initialLanguage}>
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </LanguageProvider>
    );
    rootElement.dataset.appMounted = 'true';
  } else if (typeof ReactDOM.render === 'function') {
    ReactDOM.render(
      <LanguageProvider initialLanguage={initialLanguage}>
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </LanguageProvider>,
      rootElement
    );
    rootElement.dataset.appMounted = 'true';
  } else {
    console.error('Aucune méthode de rendu ReactDOM disponible.');
  }
};

// L'identité est résolue avant le premier rendu : App.jsx peut alors la lire de façon
// synchrone. Hors SharePoint, initSharePointContext retombe immédiatement sur le mock.
initSharePointContext({ fallbackUser: mockCurrentUser })
  .catch((error) => {
    console.error('Initialisation du contexte SharePoint impossible :', error);
  })
  .then(renderApplication);
