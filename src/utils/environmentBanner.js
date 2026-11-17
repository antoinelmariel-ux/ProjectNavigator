export const ENVIRONMENT_BANNER_TONES = ['amber', 'violet', 'blue', 'rose'];
export const MAX_ENVIRONMENT_BANNER_LABEL_LENGTH = 80;

export const DEFAULT_ENVIRONMENT_BANNER = Object.freeze({ enabled: false, label: '', tone: 'amber' });

// Absent ou illisible = pas de bande : en cas de doute, c'est la plateforme de démonstration qui
// perd sa bande, jamais la production qui en gagne une.
export const normalizeEnvironmentBanner = (value) => {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_ENVIRONMENT_BANNER };
  }
  const label = typeof value.label === 'string' ? value.label.slice(0, MAX_ENVIRONMENT_BANNER_LABEL_LENGTH) : '';
  return {
    enabled: value.enabled === true,
    label,
    tone: ENVIRONMENT_BANNER_TONES.includes(value.tone) ? value.tone : DEFAULT_ENVIRONMENT_BANNER.tone
  };
};

export const getEnvironmentBannerText = (banner, fallbackLabel = '') => {
  const normalized = normalizeEnvironmentBanner(banner);
  return normalized.label.trim() || fallbackLabel;
};
