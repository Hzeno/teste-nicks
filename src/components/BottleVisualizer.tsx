import React from 'react';

interface BottleVisualizerProps {
  level: number; // 0.0 to 1.0 (ex: 0.6 = 60% cheia)
  onChange?: (newLevel: number) => void;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  liquidColor?: string; // e.g. amber for whisky, clear for vodka, teal for gin
}

export const BottleVisualizer: React.FC<BottleVisualizerProps> = ({
  level,
  onChange,
  interactive = false,
  size = 'md',
  liquidColor = '#f59e0b', // amber default
}) => {
  // Clamped level between 0 and 1
  const clamped = Math.max(0, Math.min(1, level));
  const percent = Math.round(clamped * 100);

  // Dimensions based on size
  const dimensions = {
    sm: { width: 34, height: 80, neckW: 10, neckH: 22, bodyH: 58 },
    md: { width: 50, height: 120, neckW: 14, neckH: 34, bodyH: 86 },
    lg: { width: 70, height: 160, neckW: 18, neckH: 45, bodyH: 115 },
  }[size];

  // Quick preset fractions
  const presets = [
    { label: 'Vazia (0%)', val: 0 },
    { label: '1/4 (25%)', val: 0.25 },
    { label: '1/2 (50%)', val: 0.5 },
    { label: '3/4 (75%)', val: 0.75 },
    { label: 'Quase cheia (90%)', val: 0.9 },
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="relative inline-flex flex-col items-center select-none">
        {/* SVG Bottle outline with dynamic liquid level */}
        <svg
          width={dimensions.width}
          height={dimensions.height}
          viewBox="0 0 60 140"
          className="overflow-visible"
        >
          <defs>
            <linearGradient id={`liquidGrad-${size}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={liquidColor} stopOpacity="0.85" />
              <stop offset="50%" stopColor={liquidColor} stopOpacity="0.95" />
              <stop offset="100%" stopColor={liquidColor} stopOpacity="0.75" />
            </linearGradient>
            <clipPath id="bottleClip">
              {/* Bottle silhouette: cap + neck + shoulder + body */}
              <path
                d="M 23 5
                   L 37 5
                   L 37 28
                   C 37 38, 50 48, 52 58
                   L 52 130
                   C 52 135, 48 138, 43 138
                   L 17 138
                   C 12 138, 8 135, 8 130
                   L 8 58
                   C 10 48, 23 38, 23 28
                   Z"
              />
            </clipPath>
          </defs>

          {/* Bottle Background (Empty glass) */}
          <path
            d="M 23 5
               L 37 5
               L 37 28
               C 37 38, 50 48, 52 58
               L 52 130
               C 52 135, 48 138, 43 138
               L 17 138
               C 12 138, 8 135, 8 130
               L 8 58
               C 10 48, 23 38, 23 28
               Z"
            fill="#1e293b"
            stroke="#475569"
            strokeWidth="2"
          />

          {/* Liquid rect clipped to bottle body (from y=20 to y=138, total height ~118) */}
          <g clipPath="url(#bottleClip)">
            {/* The liquid rises from y=138 upwards */}
            <rect
              x="6"
              y={138 - (118 * clamped)}
              width="48"
              height={118 * clamped}
              fill={`url(#liquidGrad-${size})`}
              className="transition-all duration-200"
            />
            {/* Liquid surface highlight meniscus */}
            {clamped > 0.03 && clamped < 0.98 && (
              <line
                x1="8"
                y1={138 - (118 * clamped)}
                x2="52"
                y2={138 - (118 * clamped)}
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="1.5"
              />
            )}
            {/* Glass reflection highlight */}
            <path
              d="M 12 60 L 12 128"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>

          {/* Bottle graduation tick marks (25%, 50%, 75%) */}
          <line x1="18" y1="108.5" x2="26" y2="108.5" stroke="#64748b" strokeWidth="1" strokeDasharray="1,1" />
          <line x1="16" y1="79" x2="28" y2="79" stroke="#94a3b8" strokeWidth="1.2" />
          <line x1="18" y1="49.5" x2="26" y2="49.5" stroke="#64748b" strokeWidth="1" strokeDasharray="1,1" />

          {/* Bottle cap */}
          <rect x="23" y="1" width="14" height="6" rx="1.5" fill="#334155" stroke="#475569" strokeWidth="1" />
        </svg>

        {/* Display percent label */}
        <span className="mt-1 text-xs font-mono font-medium text-slate-300 tabular-nums">
          {percent}%
        </span>
      </div>

      {interactive && onChange && (
        <div className="w-full mt-3 space-y-2">
          {/* Quick preset fraction buttons */}
          <div className="grid grid-cols-5 gap-1">
            {presets.map((p) => {
              const isSelected = Math.abs(clamped - p.val) < 0.05;
              return (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => onChange(p.val)}
                  className={`px-1.5 py-1 text-xs font-medium rounded transition-colors text-center ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                  title={p.label}
                >
                  {p.val === 0 ? '0' : p.val === 0.25 ? '¼' : p.val === 0.5 ? '½' : p.val === 0.75 ? '¾' : '0.9'}
                </button>
              );
            })}
          </div>

          {/* Smooth slider for fine adjustments */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-slate-400 font-mono">0%</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={clamped}
              onChange={(e) => onChange(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <span className="text-xs text-slate-400 font-mono">100%</span>
          </div>
        </div>
      )}
    </div>
  );
};
