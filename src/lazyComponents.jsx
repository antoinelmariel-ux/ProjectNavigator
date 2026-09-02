import React, { lazy } from './react.js';

const loadModule = (modulePath) => {
  if (typeof window === 'undefined') {
    throw new Error('ModuleLoader indisponible.');
  }

  if (!window.ModuleLoader || typeof window.ModuleLoader.import !== 'function') {
    throw new Error('ModuleLoader indisponible.');
  }

  return window.ModuleLoader.import(modulePath);
};

// Le manifest différé (gros composants) est chargé après le premier rendu.
// On attend sa disponibilité avant de résoudre les composants concernés (sans course).
const whenDeferredManifestReady = () =>
  new Promise((resolve) => {
    if (typeof window === 'undefined' || window.__CN_DEFERRED_READY__) {
      resolve();
      return;
    }
    window.addEventListener('cn:manifest-deferred-ready', () => resolve(), { once: true });
  });

export const LazyBackOffice = lazy(() =>
  whenDeferredManifestReady().then(() => ({
    default: loadModule('./src/components/BackOffice.jsx').BackOffice
  }))
);

export const LazyProjectShowcase = lazy(() =>
  whenDeferredManifestReady().then(() => ({
    default: loadModule('./src/components/ProjectShowcase.jsx').ProjectShowcase
  }))
);

export const LazyHomeScreen = lazy(() =>
  Promise.resolve().then(() => ({
    default: loadModule('./src/components/HomeScreen.jsx').HomeScreen
  }))
);

export const LazyInspirationForm = lazy(() =>
  Promise.resolve().then(() => ({
    default: loadModule('./src/components/InspirationForm.jsx').InspirationForm
  }))
);

export const LazyInspirationDetail = lazy(() =>
  Promise.resolve().then(() => ({
    default: loadModule('./src/components/InspirationDetail.jsx').InspirationDetail
  }))
);

export const LazyQuestionnaireScreen = lazy(() =>
  Promise.resolve().then(() => ({
    default: loadModule('./src/components/QuestionnaireScreen.jsx').QuestionnaireScreen
  }))
);

export const LazyOnboardingScreen = lazy(() =>
  Promise.resolve().then(() => ({
    default: loadModule('./src/components/OnboardingScreen.jsx').OnboardingScreen
  }))
);

export const LazySynthesisReport = lazy(() =>
  whenDeferredManifestReady().then(() => ({
    default: loadModule('./src/components/SynthesisReport.jsx').SynthesisReport
  }))
);

export const LoadingFallback = ({ label, hint }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
    <div className="flex items-center gap-3 text-sm text-gray-600">
      <span className="loading-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
    {hint && <p className="mt-2 text-xs text-gray-400">{hint}</p>}
  </div>
);
