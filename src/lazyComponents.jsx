import React, { lazy } from './react.js';

// Les trois écrans les plus lourds (≈ 40 % du code) partent dans des chunks chargés à la
// demande ; les autres restent dans le bundle principal, comme avant la migration SPFx.
export const LazyBackOffice = lazy(() =>
  import(/* webpackChunkName: "back-office" */ './components/BackOffice.jsx').then((module) => ({ default: module.BackOffice }))
);

export const LazyProjectShowcase = lazy(() =>
  import(/* webpackChunkName: "project-showcase" */ './components/ProjectShowcase.jsx').then((module) => ({ default: module.ProjectShowcase }))
);

export const LazyAdminProjectsConsole = lazy(() =>
  import(/* webpackChunkName: "admin-console" */ './components/AdminProjectsConsole.jsx').then((module) => ({ default: module.AdminProjectsConsole }))
);

export const LazyHomeScreen = lazy(() =>
  import(/* webpackMode: "eager" */ './components/HomeScreen.jsx').then((module) => ({ default: module.HomeScreen }))
);

export const LazyInspirationForm = lazy(() =>
  import(/* webpackMode: "eager" */ './components/InspirationForm.jsx').then((module) => ({ default: module.InspirationForm }))
);

export const LazyInspirationDetail = lazy(() =>
  import(/* webpackMode: "eager" */ './components/InspirationDetail.jsx').then((module) => ({ default: module.InspirationDetail }))
);

export const LazyQuestionnaireScreen = lazy(() =>
  import(/* webpackMode: "eager" */ './components/QuestionnaireScreen.jsx').then((module) => ({ default: module.QuestionnaireScreen }))
);

export const LazyOnboardingScreen = lazy(() =>
  import(/* webpackMode: "eager" */ './components/OnboardingScreen.jsx').then((module) => ({ default: module.OnboardingScreen }))
);

export const LazySynthesisReport = lazy(() =>
  import(/* webpackChunkName: "synthesis-report" */ './components/SynthesisReport.jsx').then((module) => ({ default: module.SynthesisReport }))
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
