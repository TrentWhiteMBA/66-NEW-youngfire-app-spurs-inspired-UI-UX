import React from 'react';
import { Flame, Lock } from 'lucide-react';
import { CANON_66_BOOKS, CanonBookMeta } from '../data/canonBibleProjectData';
import { AppTheme } from '../data/appThemes';

interface ScriptureCirclesRailProps {
  onSelectBook?: (bookName: string, chapter: number) => void;
  activeTheme?: AppTheme;
  className?: string;
  isGuestUser?: boolean;
}

const ALLOWED_GUEST_CANON_BOOKS = ['genesis', 'exodus', 'leviticus'];

export const ScriptureCirclesRail: React.FC<ScriptureCirclesRailProps> = ({
  onSelectBook,
  activeTheme,
  className = '',
  isGuestUser = false
}) => {
  const accentColor = activeTheme?.accentHex || '#FFFFFF';
  const borderColor = activeTheme?.borderHex || `${accentColor}70`;

  const handleCircleClick = (book: CanonBookMeta, e: React.MouseEvent) => {
    e.stopPropagation();

    const isAllowedForGuest = ALLOWED_GUEST_CANON_BOOKS.includes(book.id.toLowerCase());
    if (isGuestUser && !isAllowedForGuest) {
      window.dispatchEvent(
        new CustomEvent('yf_guest_restriction', {
          detail: {
            feature: `${book.title} Canon Video Overview (Guest Preview includes Genesis, Exodus & Leviticus)`
          }
        })
      );
      return;
    }
    
    // 1. Dispatch global event to launch video directly in persistent floating PiP player
    // This stays on the current screen (home/sanctuary) without routing to 'tv' tab!
    window.dispatchEvent(new CustomEvent('yf_play_video', {
      detail: {
        video: {
          id: `bp_${book.id}`,
          youtubeId: book.youtubeId,
          title: `${book.title} Overview • The Bible Project`,
          speaker: 'The Bible Project',
          series: '66-Book Scripture Canon Overview',
          duration: '7:30',
          category: 'Bible Project Master Series',
          thumbnailUrl: `https://img.youtube.com/vi/${book.youtubeId}/hqdefault.jpg`,
          description: `Official Bible Project video overview exploring the literary design, themes, and biblical theology of the book of ${book.title}.`,
          streamUrl: `https://www.youtube.com/watch?v=${book.youtubeId}`
        }
      }
    }));

    // 2. Optional selection notification without tab switching
    if (onSelectBook) {
      onSelectBook(book.title, 1);
    }
  };

  return (
    <div className={`w-full select-none ${className}`}>
      {/* 
        NO title or header text above the 66-circle rail.
        The canon sits borderless and integrated directly beneath the style toggle.
      */}
      <div className="w-full overflow-x-auto no-scrollbar flex items-center gap-3.5 px-4 py-2 scroll-smooth">
        {CANON_66_BOOKS.map((book) => {
          const isLockedForGuest = Boolean(isGuestUser && !ALLOWED_GUEST_CANON_BOOKS.includes(book.id.toLowerCase()));
          return (
            <div
              key={book.id}
              onClick={(e) => handleCircleClick(book, e)}
              className={`flex-shrink-0 flex flex-col items-center group cursor-pointer ${
                isLockedForGuest ? 'opacity-65 hover:opacity-90' : ''
              }`}
              title={
                isLockedForGuest
                  ? `${book.title} (${book.testament}) • Member Only (Sign In or Register to unlock all 66 Canon Videos)`
                  : `${book.title} (${book.testament}) • Tap to Watch The Bible Project Overview`
              }
            >
              {/* Circular Frame with Diagonal Split */}
              <div 
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full relative overflow-hidden shadow-xl flex-shrink-0 group-hover:scale-105 group-active:scale-95 transition-all duration-200 border"
                style={{
                  borderColor: borderColor,
                  boxShadow: `0 4px 18px ${accentColor}25`
                }}
              >
                {/* 1. TOP-LEFT HALF (YoungFire Holy Flame on pure obsidian black) */}
                <div 
                  className="absolute inset-0 bg-[#000000] flex items-start justify-start p-2"
                  style={{
                    clipPath: 'polygon(0 0, 100% 0, 0 100%)'
                  }}
                >
                  <div className="transform -translate-x-0.5 -translate-y-0.5">
                    <Flame 
                      className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 fill-amber-500/80 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)] group-hover:scale-110 transition-transform" 
                    />
                  </div>
                </div>

                {/* 2. BOTTOM-RIGHT HALF (The Bible Project Character / Book Theme Art) */}
                <div 
                  className={`absolute inset-0 bg-gradient-to-br ${book.colorGradient} overflow-hidden`}
                  style={{
                    clipPath: 'polygon(100% 0, 100% 100%, 0 100%)'
                  }}
                >
                  <img
                    src={book.thumbnailUrl}
                    alt={book.title}
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=600&q=80";
                    }}
                    className="w-full h-full object-cover object-center filter brightness-95 contrast-110 group-hover:scale-115 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>

                {/* 3. CRISP 1.5PX DIAGONAL WHITE LASER LINE */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                  <div className="w-[145%] h-[1.5px] bg-white transform -rotate-45 shadow-[0_0_5px_rgba(255,255,255,0.9)]" />
                </div>

                {/* Guest Lock Overlay for books other than Genesis, Exodus, Leviticus */}
                {isLockedForGuest && (
                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center z-20">
                    <div className="w-6 h-6 rounded-full bg-black/85 border border-amber-400/60 flex items-center justify-center shadow-md">
                      <Lock className="w-3 h-3 text-amber-400" />
                    </div>
                  </div>
                )}
              </div>

              {/* Bold Condensed Monospace Sub-Label: e.g. YF @ GEN */}
              <span className="font-mono text-[9px] sm:text-[10px] text-slate-300 group-hover:text-white font-bold uppercase tracking-wider text-center mt-1.5 transition-colors flex items-center gap-0.5">
                <span>YF @ {book.shortCode}</span>
                {isLockedForGuest && <Lock className="w-2.5 h-2.5 text-amber-400/80 inline" />}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScriptureCirclesRail;
