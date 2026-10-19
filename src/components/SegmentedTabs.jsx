import React from '../react.js';

const TONES = {
  blue: {
    activeText: 'text-blue-700',
    idleHover: 'hover:text-blue-700',
    badgeUrgent: 'bg-blue-600 text-white',
    badgeFilled: 'bg-blue-100 text-blue-700'
  },
  indigo: {
    activeText: 'text-indigo-700',
    idleHover: 'hover:text-indigo-700',
    badgeUrgent: 'bg-indigo-600 text-white',
    badgeFilled: 'bg-indigo-100 text-indigo-700'
  }
};

export const SegmentedTabs = ({ items, value, onChange, ariaLabel, className = '' }) => {
  return (
    <div
      className={`flex flex-wrap gap-1 rounded-2xl border border-blue-100 bg-blue-50 p-1 sm:inline-flex sm:max-w-full ${className}`}
      role="group"
      aria-label={ariaLabel}
    >
      {items.map(({ id, label, count, ariaLabel: itemAriaLabel, icon: Icon, tone = 'blue', urgent = false, tourId }) => {
        const isActive = value === id;
        const palette = TONES[tone] || TONES.blue;
        const hasCount = typeof count === 'number';
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={isActive}
            aria-label={itemAriaLabel}
            data-tour-id={tourId}
            className={`flex flex-auto items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-semibold transition-colors sm:flex-none ${
              isActive
                ? `border-blue-200 bg-white shadow-sm ${palette.activeText}`
                : `border-transparent text-gray-600 hover:bg-white ${palette.idleHover}`
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
              {label}
            </span>
            {hasCount && (
              <span
                aria-hidden="true"
                className={`inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                  urgent && count > 0
                    ? palette.badgeUrgent
                    : count > 0
                      ? palette.badgeFilled
                      : 'bg-gray-100 text-gray-500'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
