import React, { useEffect, useState } from 'react';
import { Flame, Sparkles } from 'lucide-react';
import { AppTheme } from '../data/appThemes';

interface BroadcastStingerWipeProps {
  show: boolean;
  onComplete: () => void;
  onMidpoint?: () => void;
  durationMs?: number;
  activeTheme?: AppTheme;
  destinationLabel?: string;
}

export const BroadcastStingerWipe: React.FC<BroadcastStingerWipeProps> = ({
  show,
  onComplete,
  onMidpoint,
  durationMs = 4250, // Locked in: stays on screen for 4 - 4.5 seconds
  activeTheme,
  destinationLabel = 'SANCTUARY'
}) => {
  const [phase, setPhase] = useState<'solid' | 'exit'>('solid');
  const accentColor = activeTheme?.accentHex || '#F59E0B';
  const secondaryColor = activeTheme?.secondaryHex || '#EF4444';
  const tertiaryColor = activeTheme?.tertiaryHex || '#FF8200';

  useEffect(() => {
    if (!show) {
      setPhase('solid');
      return;
    }

    setPhase('solid');

    // Completely lock viewport scroll & touch drag while stinger screen is visible
    const origOverflow = document.body.style.overflow;
    const origTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    // Midpoint callback to switch underlying tab halfway through the 4.25s duration
    const midTimer = setTimeout(() => {
      if (onMidpoint) onMidpoint();
    }, Math.floor(durationMs * 0.48));

    // Move to exit phase with smooth fade-out over last 450ms
    const exitTimer = setTimeout(() => {
      setPhase('exit');
    }, Math.max(durationMs - 450, 0));

    // Complete wipe and hide after full 4-4.5s
    const completeTimer = setTimeout(() => {
      onComplete();
    }, durationMs);

    return () => {
      document.body.style.overflow = origOverflow;
      document.body.style.touchAction = origTouchAction;
      clearTimeout(midTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [show, durationMs, onComplete, onMidpoint]);

  if (!show) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center select-none overflow-hidden touch-none overscroll-none transition-opacity duration-400 ease-in-out ${
        phase === 'exit' 
          ? 'opacity-0 pointer-events-none' 
          : 'opacity-100 pointer-events-auto'
      }`}
      style={{
        backgroundColor: '#000000',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        overscrollBehavior: 'none'
      }}
      onTouchMove={(e) => e.preventDefault()}
      onWheel={(e) => e.preventDefault()}
    >
      {/* San Antonio Street Map Backdrop Layer behind the Stinger Wipe */}
      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-85"
        style={{
          backgroundImage: `url('/san_antonio_dark_map.png')`,
          filter: 'contrast(130%) brightness(92%)'
        }}
      />
      {/* Subtle Obsidian Radial Vignette so map lines stay crisp behind the logo */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.35)_0%,rgba(0,0,0,0.84)_90%)] pointer-events-none" />

      {/* Dynamic Animated Radiant Theme Glows */}
      <div 
        className="absolute w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none animate-pulse"
        style={{ backgroundColor: `${accentColor}30` }}
      />
      <div 
        className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none"
        style={{ backgroundColor: `${secondaryColor}25` }}
      />
      <div 
        className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none"
        style={{ backgroundColor: `${tertiaryColor}25` }}
      />

      {/* Central Emblem & Brand Animation */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-4 text-center px-6">
        
        {/* YoungFire Holy Flame Crest Logo (Black Rounded Outer Box + White Rounded Inner Square + Black Flame) */}
        <div 
          className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-[2rem] bg-black border-2 flex items-center justify-center shadow-2xl relative group transform transition-transform"
          style={{
            borderColor: accentColor,
            boxShadow: `0 0 55px ${accentColor}65`
          }}
        >
          <div className="w-22 h-22 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-[1.4rem] bg-white flex items-center justify-center shadow-inner">
            <Flame 
              className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-black fill-current drop-shadow" 
            />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <span className="text-2xl sm:text-3xl font-black uppercase tracking-[0.28em] text-white font-['Anton',sans-serif] drop-shadow-md">
            YOUNG<span style={{ color: accentColor }}>FIRE</span>
          </span>
          <div className="flex items-center justify-center gap-2 text-xs font-mono tracking-widest text-slate-300 uppercase">
            <Sparkles className="w-3.5 h-3.5" style={{ color: accentColor }} />
            <span>TRANSITIONING TO {destinationLabel}</span>
            <Sparkles className="w-3.5 h-3.5" style={{ color: accentColor }} />
          </div>
        </div>

        {/* Dynamic 3-Stripe Fiesta / Theme Accent Bar */}
        <div className="w-48 sm:w-64 flex flex-col gap-1 my-2">
          <div className="w-full h-1 rounded-full shadow-sm" style={{ backgroundColor: accentColor }} />
          <div className="w-full h-1 rounded-full shadow-sm" style={{ backgroundColor: secondaryColor }} />
          <div className="w-full h-1 rounded-full shadow-sm" style={{ backgroundColor: tertiaryColor }} />
        </div>

        {/* Subtitle */}
        <p className="text-[11px] font-mono text-slate-400 tracking-widest uppercase">
          Joshua House of Worship &bull; San Antonio, TX
        </p>

      </div>
    </div>
  );
};

export default BroadcastStingerWipe;
