import React, { useState, useEffect } from 'react';
import { getSavedTheme, resolveThemePalette, SANCTUARY_THEMES } from '../services/themeService';

export interface SanctuaryLoadingOverlayProps {
  isVisible: boolean;
  themeColor?: string;
  themeId?: string;
}

export const SanctuaryLoadingOverlay: React.FC<SanctuaryLoadingOverlayProps> = ({
  isVisible,
  themeColor,
  themeId
}) => {
  const [, setThemeTick] = useState(0);
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const handleThemeUpdate = () => setThemeTick((t) => t + 1);
    window.addEventListener('youngfire_theme_updated', handleThemeUpdate);
    window.addEventListener('yf_apply_theme', handleThemeUpdate);
    return () => {
      window.removeEventListener('youngfire_theme_updated', handleThemeUpdate);
      window.removeEventListener('yf_apply_theme', handleThemeUpdate);
    };
  }, []);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setIsFadingOut(false);
    } else if (shouldRender) {
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsFadingOut(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, shouldRender]);

  if (!shouldRender) return null;

  // Retrieve current active style theme (Silver & Black, Fiesta, Amber, Cyan, Crimson)
  const savedTheme = themeId
    ? resolveThemePalette(themeId)
    : getSavedTheme() || SANCTUARY_THEMES.silver;

  const currentTheme = {
    ...savedTheme,
    glowColor: savedTheme.glowColor || themeColor || 'rgba(245, 158, 11, 0.6)',
    outerFlameGrad:
      savedTheme.outerFlameGrad || ([themeColor || '#F59E0B', '#D97706'] as [string, string]),
    innerFlameColor: savedTheme.innerFlameColor || '#FFFFFF'
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black transition-opacity duration-1000 ease-in-out select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Dynamic Ambient Background Glow Matching Touchpoint */}
      <div
        className="absolute w-80 h-80 rounded-full blur-[100px] opacity-50 animate-pulse pointer-events-none"
        style={{ background: currentTheme.glowColor }}
      />

      <div className="relative flex items-center justify-center">
        {/* Exterior Rotating Orbital Ring Styled With Theme Accent */}
        <div
          className="absolute w-48 h-48 rounded-full border-2 border-transparent animate-spin"
          style={{
            borderTopColor: currentTheme.outerFlameGrad[0],
            borderRightColor: currentTheme.outerFlameGrad[1],
            animationDuration: '1.2s'
          }}
        />

        {/* Counter-Rotating Orbital Track Accent */}
        <div
          className="absolute w-56 h-56 rounded-full border border-dashed opacity-30 animate-spin"
          style={{
            borderColor: currentTheme.innerFlameColor,
            animationDirection: 'reverse',
            animationDuration: '7s'
          }}
        />

        {/* Big, Bright Center YoungFire Flame Emblem Matching Touchpoint Silhouette Exactly */}
        <div
          className="relative z-10 w-32 h-32 flex items-center justify-center"
          style={{
            filter: `drop-shadow(0 0 25px ${currentTheme.outerFlameGrad[0]})`
          }}
        >
          <svg viewBox="0 0 512 512" className="w-full h-full">
            <defs>
              <linearGradient id="overlayThemedFlameGrad" x1="50%" y1="15%" x2="50%" y2="85%">
                <stop offset="0%" stopColor={currentTheme.outerFlameGrad[0]} />
                <stop offset="100%" stopColor={currentTheme.outerFlameGrad[1]} />
              </linearGradient>
            </defs>

            {/* Outer Flame Silhouette */}
            <path
              d="M256 70 C310 160 380 230 380 320 C380 395 325 442 256 442 C187 442 132 395 132 320 C132 230 202 160 256 70 Z"
              fill="url(#overlayThemedFlameGrad)"
            />

            {/* Inner Core Flame Silhouette Cutout */}
            <path
              d="M256 225 C282 278 316 312 316 356 C316 392 288 418 256 418 C224 418 196 392 196 356 C196 312 230 278 256 225 Z"
              fill={currentTheme.innerFlameColor}
            />
          </svg>
        </div>
      </div>

      {/* Subtitle Typography */}
      <div className="mt-8 flex flex-col items-center space-y-1.5 z-10">
        <span
          className="font-mono text-xs font-bold uppercase tracking-[0.3em]"
          style={{ color: currentTheme.outerFlameGrad[0] }}
        >
          Entering YoungFire Sanctuary
        </span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500">
          Joshua House of Worship
        </span>
      </div>
    </div>
  );
};

export default SanctuaryLoadingOverlay;
