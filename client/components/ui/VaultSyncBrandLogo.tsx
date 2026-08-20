import React from 'react';

export interface VaultSyncBrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | undefined;
  className?: string | undefined;
  showWordmark?: boolean | undefined;
  animated?: boolean | undefined;
}

const sizeMap = {
  xs: { icon: 18, text: 'text-xs', gap: 'gap-1.5' },
  sm: { icon: 22, text: 'text-sm', gap: 'gap-2' },
  md: { icon: 28, text: 'text-base', gap: 'gap-2' },
  lg: { icon: 36, text: 'text-lg', gap: 'gap-2.5' },
  xl: { icon: 48, text: 'text-2xl', gap: 'gap-3' },
  '2xl': { icon: 64, text: 'text-3xl', gap: 'gap-3.5' }
};

/**
 * Minimalist Single-Stroke Brand Logo (Synchronized with Tab / Title Favicon)
 * Clean, elegant, non-busy vector line art representing notes & writing.
 */
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
      {/* Minimalist 1-Stroke Note & Quill Pen Glyph */}
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 transition-transform duration-200 ${animated ? 'hover:scale-105' : ''}`}
      >
        {/* Document Sheet Outline with Folded Corner */}
        <path
          d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-theme-text"
        />
        {/* Folded Corner Flap */}
        <polyline
          points="14 2 14 8 20 8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-theme-text"
        />
        {/* Writing Lines / Content Indication */}
        <line
          x1="8"
          y1="13"
          x2="16"
          y2="13"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="text-theme-accent"
        />
        <line
          x1="8"
          y1="17"
          x2="13"
          y2="17"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="text-theme-text-muted"
        />
      </svg>

      {/* Optional Brand Wordmark */}
      {showWordmark && (
        <span className={`font-semibold tracking-tight font-sans text-theme-text ${currentSize.text}`}>
          VaultSync
        </span>
      )}
    </div>
  );
};
