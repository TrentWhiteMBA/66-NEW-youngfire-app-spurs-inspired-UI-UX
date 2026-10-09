import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, SlidersHorizontal, Map, Sparkles } from 'lucide-react';
import { APP_THEMES, AppTheme } from '../data/appThemes';

interface AppStyleSwitcherProps {
  onCycleNextTheme?: () => void;
  onCyclePrevTheme?: () => void;
  onSelectTheme?: (themeId: string) => void;
  onOpenThemeModal?: () => void;
  activeTheme?: AppTheme;
  backgroundMode?: 'map' | 'obsidian_glow';
  onToggleBackgroundMode?: () => void;
  flush?: boolean;
  className?: string;
}

export const AppStyleSwitcher: React.FC<AppStyleSwitcherProps> = ({
  onCycleNextTheme,
  onCyclePrevTheme,
  onSelectTheme,
  onOpenThemeModal,
  activeTheme,
  backgroundMode = 'map',
  onToggleBackgroundMode,
  flush = false,
  className = ''
}) => {
  const [showInlinePicker, setShowInlinePicker] = useState<boolean>(false);

  const themeBadge = activeTheme?.badge 
    ? activeTheme.badge.toUpperCase() 
    : (activeTheme?.name ? activeTheme.name.toUpperCase() : 'SILVER & BLACK');

  const accentColor = activeTheme?.accentHex || '#FFFFFF';
  const borderColor = activeTheme?.borderHex || `${accentColor}70`;

  const handleBarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCycleNextTheme) {
      onCycleNextTheme();
    } else if (onOpenThemeModal) {
      onOpenThemeModal();
    }
  };

  const handlePrevClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCyclePrevTheme) onCyclePrevTheme();
    else if (onCycleNextTheme) onCycleNextTheme();
  };

  const handleTogglePicker = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowInlinePicker(prev => !prev);
  };

  const handleToggleBg = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleBackgroundMode) {
      onToggleBackgroundMode();
    }
  };

  return (
    <div className={`w-full flex flex-col bg-transparent ${flush ? 'gap-0 border-0' : 'gap-2'} ${className}`}>
      
      {/* 
        Unified Seamless Style Switcher:
        Transparent backdrop, zero border lines, perfectly centered headline & pill toggle
      */}
      <div 
        onClick={handleBarClick}
        className="w-full py-2.5 px-3 sm:px-6 bg-transparent transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3.5 select-none group border-0 text-center mx-auto"
        title="Tap to switch to next sanctuary theme"
      >
        {/* Centered Row: Headline + Nav Chevrons + Toggle Pill */}
        <div className="flex items-center justify-center gap-2.5 flex-wrap mx-auto text-center">
          <button
            onClick={handlePrevClick}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Previous theme"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="font-black tracking-[0.18em] sm:tracking-[0.24em] text-xs sm:text-sm text-white uppercase group-hover:text-amber-200 transition-colors drop-shadow">
            SWITCH YOUR APP STYLE
          </span>

          <button
            onClick={handleBarClick}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Next theme"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Centered Theme Pill Button */}
          <div 
            className="px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black tracking-widest uppercase transition-all flex items-center gap-1.5 shadow-md group-hover:scale-105 active:scale-95"
            style={{
              border: `1.5px solid ${accentColor}`,
              backgroundColor: `${accentColor}20`,
              color: accentColor,
              boxShadow: `0 0 14px ${accentColor}30`
            }}
          >
            <span className="truncate max-w-[160px] sm:max-w-[220px]">[ {themeBadge} ]</span>
            <ChevronRight className="w-3 h-3 opacity-70 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
          </div>

          {/* Background Mode Toggle & Inline Palette Trigger */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleToggleBg}
              className="px-2 py-1 rounded-lg text-[9px] sm:text-[10px] font-mono font-bold uppercase transition-all flex items-center gap-1 border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 hover:text-white text-slate-300"
              title={backgroundMode === 'map' ? "Map Active • Tap for Black Background & Color Splashes" : "Black & Color Splashes Active • Tap for Map Background"}
            >
              {backgroundMode === 'map' ? (
                <>
                  <Map className="w-3 h-3 text-slate-300" />
                  <span className="hidden xs:inline">Map</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" style={{ color: accentColor }} />
                  <span>Glow</span>
                </>
              )}
            </button>

            <button
              onClick={handleTogglePicker}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Toggle inline color palette"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Inline Non-Modal Color Strip */}
      {showInlinePicker && (
        <div 
          className="w-full max-w-2xl mx-auto p-3 bg-[#000000] border border-white/10 rounded-2xl flex flex-col gap-2.5 animate-fadeIn shadow-2xl my-1"
        >
          <div className="flex items-center justify-between px-1 pb-1 border-b border-white/10">
            <span className="text-[10px] font-mono text-slate-300 uppercase font-bold">
              Background Canvas:
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleBackgroundMode && onToggleBackgroundMode()}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                  backgroundMode === 'map' ? 'bg-amber-500 text-black' : 'bg-white/10 text-slate-300'
                }`}
              >
                San Antonio Map
              </button>
              <button
                onClick={() => onToggleBackgroundMode && onToggleBackgroundMode()}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                  backgroundMode === 'obsidian_glow' ? 'bg-amber-500 text-black' : 'bg-white/10 text-slate-300'
                }`}
              >
                Pure Obsidian Glow
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              Liturgical Sanctuary Themes ({APP_THEMES.length}):
            </span>
            <span className="text-[9px] font-mono text-slate-500">
              Tap to apply immediately
            </span>
          </div>

          {/* Quick Swatch Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1">
            {APP_THEMES.map((theme) => {
              const isSelected = activeTheme?.id === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectTheme) onSelectTheme(theme.id);
                  }}
                  className={`px-2 py-1.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                    isSelected 
                      ? 'border-white bg-white/20 shadow-md scale-[1.02]' 
                      : 'border-white/10 bg-black/40 hover:bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: theme.accentHex }}
                    />
                    <span className="text-[10px] font-mono text-white truncate font-bold">
                      {theme.badge || theme.name}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AppStyleSwitcher;
