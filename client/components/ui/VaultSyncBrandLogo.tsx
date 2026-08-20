import React from 'react';

export interface VaultSyncBrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | undefined;
  className?: string | undefined;
  showWordmark?: boolean | undefined;
  animated?: boolean | undefined;
}

const sizeMap = {
  xs: { icon: 18, text: 'text-xs', gap: 'gap-1.5' },
  sm: { icon: 24, text: 'text-sm', gap: 'gap-2' },
  md: { icon: 32, text: 'text-base', gap: 'gap-2.5' },
  lg: { icon: 40, text: 'text-lg', gap: 'gap-3' },
  xl: { icon: 56, text: 'text-2xl', gap: 'gap-3.5' },
  '2xl': { icon: 80, text: 'text-3xl', gap: 'gap-4' }
};

export const VaultSyncBrandLogo: React.FC<VaultSyncBrandLogoProps> = ({
  size = 'md',
  className = '',
  showWordmark = false,
  animated = false
}) => {
  const currentSize = sizeMap[size] || sizeMap.md;
  const dim = currentSize.icon;

  return (
    <div className={`inline-flex items-center select-none ${currentSize.gap} ${className}`}>
      {/* Minimalist Vector Glyph: Document Sheet + Folded Corner + Active Writing Pen Nib */}
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${animated ? 'hover:scale-105 transition-transform duration-300' : ''}`}
      >
        <defs>
          {/* Obsidian Black Container Gradient */}
          <linearGradient id="iconBaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#090d16" />
          </linearGradient>

          {/* Clean Paper Gradient */}
          <linearGradient id="paperSheetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f1f5f9" />
          </linearGradient>

          {/* Electric Sapphire Accent */}
          <linearGradient id="penAccentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>

          {/* Subtle Drop Shadow */}
          <filter id="docShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* 1. Squircle App Icon Base (Obsidian Dark) */}
        <rect
          x="2"
          y="2"
          width="60"
          height="60"
          rx="15"
          fill="url(#iconBaseGrad)"
          stroke="#334155"
          strokeWidth="1.2"
        />

        {/* 2. Document Note Sheet with Folded Corner */}
        {/* Main Document Body */}
        <path
          d="M20 13H40L49 22V49C49 50.65 47.65 52 46 52H20C18.35 52 17 50.65 17 49V16C17 14.35 18.35 13 20 13Z"
          fill="url(#paperSheetGrad)"
          filter="url(#docShadow)"
        />

        {/* Paper Folded Top-Right Corner */}
        <path
          d="M40 13V20C40 21.1 40.9 22 42 22H49L40 13Z"
          fill="#cbd5e1"
        />

        {/* Crisp Document Text Lines */}
        <line x1="23" y1="23" x2="35" y2="23" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        <line x1="23" y1="29" x2="43" y2="29" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        <line x1="23" y1="35" x2="43" y2="35" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        <line x1="23" y1="41" x2="33" y2="41" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />

        {/* 3. Modern Stylus / Fountain Pen Nib (Writing Action) */}
        <g transform="translate(4, 3)">
          {/* Pen Shaft / Body */}
          <path
            d="M33 39L43 29L47 33L37 43L33 39Z"
            fill="#0f172a"
            stroke="#38bdf8"
            strokeWidth="1.2"
          />
          {/* Pen Ring Accent */}
          <line x1="36" y1="36" x2="39" y2="39" stroke="url(#penAccentGrad)" strokeWidth="2" strokeLinecap="round" />

          {/* Pen Metallic Nib */}
          <path
            d="M33 39L27 45L31 49L37 43L33 39Z"
            fill="#e2e8f0"
            stroke="#0284c7"
            strokeWidth="1"
          />
          {/* Ink Tip Point */}
          <circle cx="27" cy="45" r="1.2" fill="#2563eb" />
          {/* Nib Slit */}
          <line x1="29" y1="47" x2="33" y2="43" stroke="#64748b" strokeWidth="0.8" strokeLinecap="round" />
        </g>
      </svg>

      {/* Optional Typography Wordmark */}
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className={`font-bold tracking-tight text-theme-text font-sans ${currentSize.text}`}>
            Vault<span className="text-theme-accent">Sync</span>
          </span>
          <span className="text-[9px] font-mono text-theme-text-muted tracking-wider uppercase mt-0.5">
            Bảo Mật & Soạn Thảo
          </span>
        </div>
      )}
    </div>
  );
};
