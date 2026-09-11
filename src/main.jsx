import React from './react.js';
import { ReactDOM } from './react.js';
import { App } from './App.jsx';
import { initSharePointContext, getRealUser } from './utils/spContext.js';
import { readImpersonationRequest, startImpersonation } from './utils/impersonation.js';
import { normalizeEmail } from './utils/normalizeEmail.js';
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
    // L'équipe technique doit être prévenue qu'un plantage a eu lieu même si l'utilisateur
    // ne clique jamais sur rien : le bouton du rendu ci-dessous sert seulement à ajouter du
    // contexte et à rassurer l'utilisateur que son incident est bien pris en compte.
    this.setState({ error, errorInfo }, () => this.sendAutomaticReport());
  }

  buildReportPayload = ({ userComment = '', isFollowUp = false } = {}) => {
    const { error, errorInfo } = this.state;
    // Identité réelle et non simulée : c'est la personne qui a réellement subi le plantage
    // que l'équipe technique doit pouvoir recontacter.
    const user = getRealUser();
    return buildErrorReportEmail({
      message: error && error.message,
      stack: error && error.stack,
      componentStack: errorInfo && errorInfo.componentStack,
      screenUrl: typeof window !== 'undefined' ? window.location.href : '',
      userEmail: user && user.mail,
      userComment,
      occurredAt: new Date().toISOString(),
      isFollowUp
    });
  };

  sendAutomaticReport = () => {
    try {
      const { subject, body, actionType } = this.buildReportPayload();
      queueNotification({ subject, body, actionType, to: resolveMaintenanceRecipients() }).catch((error) => {
        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
          console.warn('Envoi automatique du rapport d\'erreur impossible :', error);
        }
      });
    } catch (error) {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn('Construction du rapport d\'erreur automatique impossible :', error);
      }
    }
  };

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

    const trimmedComment = this.state.userComment.trim();
    if (!trimmedComment) {
      // Le plantage est déjà signalé automatiquement : sans contexte à ajouter, on se
      // contente de confirmer à l'utilisateur que son incident est pris en compte.
      this.setState({ sendStatus: 'sent' });
      return;
    }

    this.setState({ sendStatus: 'sending' });

    try {
      const { subject, body, actionType } = this.buildReportPayload({
        userComment: trimmedComment,
        isFollowUp: true
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

// « Voir en tant que » : l'identité simulée doit être posée avant le premier rendu, comme
// l'identité réelle, parce qu'App.jsx la lit une seule fois et la traite ensuite comme une
// référence stable. Le contrôle porte sur l'identité réelle, jamais sur la simulée, sinon
// simuler un administrateur suffirait à le devenir.
const applyImpersonationRequest = () => {
  const requestedEmail = readImpersonationRequest(
    typeof window !== 'undefined' && window.location ? window.location.search : ''
  );

  if (!requestedEmail) {
    return;
  }

  const realUser = getRealUser();
  const realEmail = normalizeEmail(realUser?.mail || realUser?.userPrincipalName || '');
  const admins = resolveMaintenanceRecipients().map(normalizeEmail).filter(Boolean);

  if (!realEmail || !admins.includes(realEmail)) {
    console.warn('Simulation d’identité ignorée : la session en cours n’est pas administratrice.');
    return;
  }

  startImpersonation({ email: requestedEmail });
};

// L'identité est résolue avant le premier rendu : App.jsx peut alors la lire de façon
// synchrone. Hors SharePoint, initSharePointContext retombe immédiatement sur le mock.
initSharePointContext({ fallbackUser: mockCurrentUser })
  .catch((error) => {
    console.error('Initialisation du contexte SharePoint impossible :', error);
  })
  .then(() => {
    applyImpersonationRequest();
    renderApplication();
  });
