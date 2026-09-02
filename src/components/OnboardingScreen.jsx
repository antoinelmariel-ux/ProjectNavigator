import React, { useState } from '../react.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { ActivityScopeSelector } from './ActivityScopeSelector.jsx';
import { Sparkles } from './icons.js';

// Premier écran vu par une personne n'ayant pas encore de profil enregistré (cf. App.jsx,
// gate `shouldShowOnboarding`). Deux étapes : choix du périmètre, puis proposition de la
// visite guidée existante (réutilise handleStartOnboarding, pas de nouvelle logique de tour).
export const OnboardingScreen = ({ onComplete, onStartTour, onSkipTour }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState('scope');
  const [selectedScope, setSelectedScope] = useState([]);

  const handleContinue = () => {
    onComplete(selectedScope);
    setStep('tour');
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm space-y-6">
        {step === 'scope' ? (
          <>
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-gray-800">{t('onboarding.title')}</h1>
              <p className="text-sm text-gray-600">{t('onboarding.scopeStep.description')}</p>
            </div>
            <ActivityScopeSelector value={selectedScope} onChange={setSelectedScope} />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleContinue}
                disabled={selectedScope.length === 0}
                className={`px-6 py-3 rounded-lg font-medium text-white transition-all ${
                  selectedScope.length === 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {t('onboarding.scopeStep.continueButton')}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center space-y-6">
            <Sparkles className="mx-auto h-10 w-10 text-blue-500" aria-hidden="true" />
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-gray-800">{t('onboarding.tourStep.heading')}</h2>
              <p className="text-sm text-gray-600">{t('onboarding.tourStep.description')}</p>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button
                type="button"
                onClick={onStartTour}
                className="px-6 py-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all"
              >
                {t('onboarding.tourStep.startButton')}
              </button>
              <button
                type="button"
                onClick={onSkipTour}
                className="px-6 py-3 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
              >
                {t('onboarding.tourStep.skipButton')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
