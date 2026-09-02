import React from './react.js';
import { ReactDOM } from './react.js';
import { App } from './App.jsx';
import { initSharePointContext } from './utils/spContext.js';
import mockCurrentUser from './data/graph-current-user.json';
import { LanguageProvider, LanguageContext } from './i18n/LanguageContext.jsx';

class AppErrorBoundary extends React.Component {
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
      console.error('Erreur d\'affichage détectée :', error);
    }
  }

  handleRefresh = () => {
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const t = this.context && typeof this.context.t === 'function' ? this.context.t : (key) => key;
      return (
        <div className="min-h-screen bg-gray-100 p-6 text-gray-900 sm:p-10">
          <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
            <h1 className="text-lg font-semibold text-red-700">{t('app.errorBoundary.title')}</h1>
            <p className="mt-3 text-sm text-gray-600">{t('app.errorBoundary.message')}</p>
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
