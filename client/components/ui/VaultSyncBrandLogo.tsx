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
      {/* Precision Vector Glyph: Open Book + Confidential Envelope + Cyber Vault Padlock */}
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${animated ? 'hover:scale-105 transition-transform duration-300' : ''}`}
      >
        <defs>
          {/* Obsidian Matte Dark Gradients */}
          <linearGradient id="vaultBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e2433" />
            <stop offset="50%" stopColor="#101522" />
            <stop offset="100%" stopColor="#070a11" />
          </linearGradient>

          {/* Book Spine / Cover Titanium Bevel */}
          <linearGradient id="bookCoverGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Glowing Cyber Accent Gradient */}
          <linearGradient id="cyberGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* Keyhole Radiant Pulse */}
          <radialGradient id="keyholeRadiance" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
            <stop offset="70%" stopColor="#0284c7" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0369a1" stopOpacity="0" />
          </radialGradient>

          {/* Smooth Drop Shadow */}
          <filter id="vaultGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0284c7" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* 1. App Icon Rounded Background Slate (Obsidian Black) */}
        <rect
          x="2"
          y="2"
          width="60"
          height="60"
          rx="16"
          fill="url(#vaultBgGrad)"
          stroke="#334155"
          strokeWidth="1.5"
          strokeOpacity="0.6"
        />

        {/* 2. Open Journal / Encrypted Envelope Silhouette (Back Wings) */}
        {/* Left Book Page */}
        <path
          d="M12 20C12 18 14 16 16 16H31V44H16C13.5 44 12 42.5 12 40V20Z"
          fill="#1e293b"
          stroke="#475569"
          strokeWidth="1.2"
        />
        {/* Left Page Script Lines */}
        <line x1="16" y1="22" x2="27" y2="22" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7" />
        <line x1="16" y1="27" x2="25" y2="27" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7" />
        <line x1="16" y1="32" x2="27" y2="32" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7" />

        {/* Right Book Page */}
        <path
          d="M52 20C52 18 50 16 48 16H33V44H48C50.5 44 52 42.5 52 40V20Z"
          fill="#1e293b"
          stroke="#475569"
          strokeWidth="1.2"
        />
        {/* Right Page Script Lines */}
        <line x1="37" y1="22" x2="48" y2="22" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7" />
        <line x1="39" y1="27" x2="48" y2="27" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7" />
        <line x1="37" y1="32" x2="48" y2="32" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7" />

        {/* Book Spine Center Fold */}
        <line x1="32" y1="15" x2="32" y2="45" stroke="#0ea5e9" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />

        {/* 3. Forefront Vault Padlock (Security & Envelope Lock Shield) */}
        {/* Shackle */}
        <path
          d="M24 29V23C24 18.58 27.58 15 32 15C36.42 15 40 18.58 40 23V29"
          stroke="url(#cyberGlowGrad)"
          strokeWidth="3.2"
          strokeLinecap="round"
          filter="url(#vaultGlow)"
        />

        {/* Padlock Body (Chiseled Titanium Plate) */}
        <rect
          x="20"
          y="28"
          width="24"
          height="22"
          rx="6"
          fill="url(#bookCoverGrad)"
          stroke="url(#cyberGlowGrad)"
          strokeWidth="1.5"
          filter="url(#vaultGlow)"
        />

        {/* Glowing Geometric Keyhole */}
        <circle cx="32" cy="36" r="3" fill="#38bdf8" />
        <polygon points="30.5,36 33.5,36 34.5,43 29.5,43" fill="#38bdf8" />
        <circle cx="32" cy="37.5" r="7" fill="url(#keyholeRadiance)" opacity="0.6" />

        {/* Precision Micro Corner Accents */}
        <circle cx="23.5" cy="31.5" r="1" fill="#64748b" />
        <circle cx="40.5" cy="31.5" r="1" fill="#64748b" />
        <circle cx="23.5" cy="46.5" r="1" fill="#64748b" />
        <circle cx="40.5" cy="46.5" r="1" fill="#64748b" />
      </svg>

      {/* Optional Typography Wordmark */}
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className={`font-bold tracking-tight text-theme-text font-sans ${currentSize.text}`}>
            Vault<span className="text-theme-accent">Sync</span>
          </span>
          <span className="text-[9px] font-mono text-theme-text-muted tracking-wider uppercase mt-0.5">
            Zero-Knowledge E2EE
          </span>
        </div>
      )}
    </div>
  );
};
