import React, { useState } from 'react';
import { MapPin, BookOpen, Compass, ChevronUp, Sparkles, X } from 'lucide-react';
import { AppTheme } from '../data/appThemes';

interface WordDimensionPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDimension: (dimension: 'atlas' | 'bible') => void;
  activeTheme?: AppTheme;
}

export const WordDimensionPickerSheet: React.FC<WordDimensionPickerSheetProps> = ({
  isOpen,
  onClose,
  onSelectDimension,
  activeTheme
}) => {
  const [isExpandingToFull, setIsExpandingToFull] = useState<boolean>(false);
  const [selectedDim, setSelectedDim] = useState<'atlas' | 'bible' | null>(null);

  if (!isOpen) return null;

  const accentColor = activeTheme?.accentHex || '#F59E0B';
  const borderColor = activeTheme?.borderHex || `${accentColor}70`;

  const handleChoose = (dim: 'atlas' | 'bible') => {
    setSelectedDim(dim);
    // Smoothly animate sliding all the way up to full screen, then trigger callback
    setIsExpandingToFull(true);
    setTimeout(() => {
      onSelectDimension(dim);
      setIsExpandingToFull(false);
      setSelectedDim(null);
    }, 450);
  };

  return (
    <div 
      className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-end justify-center transition-opacity duration-300"
      onClick={onClose}
    >
      <style>{`
        @keyframes wordSheetSlideUp {
          0% {
            transform: translateY(100%);
            opacity: 0.4;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl bg-[#070B18] border-t-2 border-x-2 rounded-t-[36px] shadow-[-20px_0_60px_rgba(0,0,0,0.95)] p-5 sm:p-7 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] text-white flex flex-col justify-between transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-y-auto ${
          isExpandingToFull 
            ? 'h-screen max-h-screen rounded-none' 
            : 'h-[50vh] min-h-[340px] max-h-[56vh]'
        }`}
        style={{
          borderColor: borderColor,
          boxShadow: `0 -10px 40px ${accentColor}30`,
          animation: isExpandingToFull ? undefined : 'wordSheetSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Top Drag Handle & Title */}
        <div>
          <div className="flex justify-center mb-2.5">
            <div className="w-12 h-1.5 rounded-full bg-white/25" />
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: accentColor }} />
              <h3 className="font-['Outfit'] font-black text-base sm:text-lg uppercase tracking-wider text-white">
                THE WORD HUB &bull; SELECT DIMENSION
              </h3>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close Word Hub Picker"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-slate-300 font-mono tracking-wide mb-4">
            Select either the <span className="text-cyan-400 font-bold">Imperial Atlas</span> or the <span className="text-amber-400 font-bold">66-Book Bible</span> below:
          </p>

          {/* Dual Dimension Tabs Side-by-Side Halfway Up the Screen: Imperial Atlas vs 66-Book Bible */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            
            {/* 1. IMPERIAL ATLAS TAB */}
            <button
              type="button"
              onClick={() => handleChoose('atlas')}
              className={`p-3.5 sm:p-4 rounded-2xl bg-black/90 border-2 text-left transition-all cursor-pointer group hover:scale-[1.02] active:scale-98 relative overflow-hidden flex flex-col justify-between ${
                selectedDim === 'atlas' ? 'ring-2 ring-cyan-400' : ''
              }`}
              style={{
                borderColor: selectedDim === 'atlas' ? '#22D3EE' : `${accentColor}55`,
                boxShadow: `0 6px 24px ${accentColor}20`
              }}
            >
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-2.5">
                  <div 
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
                    style={{ backgroundColor: 'rgba(34, 211, 238, 0.18)', color: '#22D3EE' }}
                  >
                    <Compass className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-45 transition-transform duration-300" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 font-bold">
                    Atlas Tab
                  </span>
                </div>
                <h4 className="font-['Outfit'] font-black text-sm sm:text-base tracking-wider uppercase text-white mb-1 group-hover:text-cyan-300 transition-colors">
                  IMPERIAL ATLAS
                </h4>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Interactive 66-book cartography, geographical pins &amp; biblical journey timelines.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono uppercase font-bold text-cyan-400">
                <span>Open Atlas</span>
                <span>→</span>
              </div>
            </button>

            {/* 2. 66-BOOK BIBLE TAB */}
            <button
              type="button"
              onClick={() => handleChoose('bible')}
              className={`p-3.5 sm:p-4 rounded-2xl bg-black/90 border-2 text-left transition-all cursor-pointer group hover:scale-[1.02] active:scale-98 relative overflow-hidden flex flex-col justify-between ${
                selectedDim === 'bible' ? 'ring-2 ring-amber-400' : ''
              }`}
              style={{
                borderColor: selectedDim === 'bible' ? accentColor : `${accentColor}55`,
                boxShadow: `0 6px 24px ${accentColor}20`
              }}
            >
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-2.5">
                  <div 
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
                    style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
                  >
                    <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 font-bold">
                    Bible Tab
                  </span>
                </div>
                <h4 className="font-['Outfit'] font-black text-sm sm:text-base tracking-wider uppercase text-white mb-1 group-hover:text-amber-300 transition-colors">
                  66-BOOK BIBLE
                </h4>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Full 66-book Scripture canon, chapter reader, verse highlights &amp; study notes.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono uppercase font-bold" style={{ color: accentColor }}>
                <span>Open Bible</span>
                <span>→</span>
              </div>
            </button>

          </div>
        </div>

        {/* Footer indicator showing full-screen slide */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-slate-400 pt-2">
          <ChevronUp className="w-4 h-4 animate-bounce" style={{ color: accentColor }} />
          <span>Tap either tab to expand to full screen</span>
        </div>
      </div>
    </div>
  );
};

export default WordDimensionPickerSheet;
