import React from 'react';
import { X, Check } from 'lucide-react';
import { APP_THEMES, AppTheme } from '../data/appThemes';
import {
  applyThemeToTouchpoint,
  forceRefreshManifestIcon,
  generateThemedAppIconSvg
} from '../services/themeService';

export { APP_THEMES };

interface ThemeHUDModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentThemeId: string;
  onSelectTheme: (id: string) => void;
  [key: string]: any;
}

export const ThemeHUDModal: React.FC<ThemeHUDModalProps> = ({
  isOpen,
  onClose,
  currentThemeId,
  onSelectTheme
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-[#000000] border border-white/20 rounded-3xl p-6 shadow-2xl text-white space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="font-pro-display text-base tracking-wider uppercase">Sanctuary Theme HUD</h3>
            <p className="text-[10px] font-mono text-slate-400">Select liturgical aesthetic & color palette</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto no-scrollbar">
          {APP_THEMES.map((theme) => {
            const isSelected = theme.id === currentThemeId;
            const iconPreviewUrl = generateThemedAppIconSvg(theme);
            return (
              <button
                key={theme.id}
                onClick={() => {
                  applyThemeToTouchpoint(theme.id);
                  forceRefreshManifestIcon(theme.id);
                  onSelectTheme(theme.id);
                  onClose();
                }}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white/15 ring-1 shadow-lg'
                    : 'bg-white/5 border-white/10 hover:border-white/30'
                }`}
                style={{
                  borderColor: isSelected ? theme.accentHex : undefined,
                  boxShadow: isSelected ? `0 0 20px ${theme.accentHex}35` : undefined
                }}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={iconPreviewUrl}
                    alt={theme.name}
                    className="w-10 h-10 rounded-xl border border-white/20 flex-shrink-0 shadow-md object-cover"
                  />
                  <div>
                    <div className="font-bold text-sm tracking-wide">{theme.name}</div>
                    <div className="text-[10px] text-slate-400">{theme.subtitle || theme.category}</div>
                  </div>
                </div>
                {isSelected && (
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ 
                      backgroundColor: theme.accentHex, 
                      color: theme.id === 'spurs_stealth' ? '#000000' : '#FFFFFF' 
                    }}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ThemeHUDModal;
