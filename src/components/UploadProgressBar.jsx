import React from '../react.js';

export const UploadProgressBar = ({ value = 0, label = '' }) => {
  const percent = Math.round(Math.max(0, Math.min(1, Number(value) || 0)) * 100);
  return (
    <div className="mt-2" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span>{percent} %</span>
      </div>
      <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
        <div className="h-2 rounded-full bg-blue-600" style={{ width: `${percent}%`, transition: 'width 200ms ease' }} />
      </div>
    </div>
  );
};
