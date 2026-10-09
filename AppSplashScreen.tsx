import React, { useState, useEffect } from 'react';
import { Flame } from 'lucide-react';

export interface AppSplashScreenProps {
  durationMs?: number;
  onFinish?: () => void;
}

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({
  durationMs = 1200,
  onFinish
}) => {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Start fade-out at durationMs
    const timer = setTimeout(() => {
      setFading(true);
      const removeTimer = setTimeout(() => {
        setVisible(false);
        if (onFinish) onFinish();
      }, 500);
      return () => clearTimeout(removeTimer);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [durationMs, onFinish]);

  if (!visible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[99999] bg-[#000000] flex flex-col items-center justify-center transition-opacity duration-500 ease-out select-none ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Ambient background glowing aura */}
      <div className="absolute w-72 h-72 rounded-full bg-gradient-to-tr from-amber-500/20 via-orange-600/15 to-transparent blur-3xl pointer-events-none animate-pulse" />

      {/* Centerpiece Container */}
      <div className="relative flex flex-col items-center justify-center text-center px-4 space-y-6">
        {/* Glowing metallic chrome & gold YoungFire Holy Flame emblem (w-24 h-24) */}
        <div className="relative group animate-pulse">
          {/* Flame Halo Aura */}
          <div className="absolute -inset-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-[2.5rem] blur-xl opacity-75 animate-pulse" />
          
          <div className="relative w-24 h-24 rounded-[2rem] bg-gradient-to-tr from-amber-400 via-orange-500 to-amber-600 p-[2px] shadow-[0_0_60px_rgba(245,158,11,0.6)]">
            <div className="w-full h-full rounded-[calc(2rem-2px)] bg-gradient-to-b from-slate-950 via-[#070D1E] to-[#000000] flex items-center justify-center border border-amber-300/40 backdrop-blur-md">
              <Flame className="w-13 h-13 text-amber-400 fill-amber-400/90 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]" />
            </div>
          </div>
        </div>

        {/* YoungFire Consecrated Title */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-black uppercase font-['Outfit'] tracking-[0.25em] text-white drop-shadow">
            YOUNG<span className="text-amber-400">FIRE</span>
          </h1>

          {/* Monospace Subtitle */}
          <p className="tracking-[0.3em] font-mono text-xs text-slate-300 uppercase font-semibold">
            JOSHUA HOUSE OF WORSHIP
          </p>
        </div>

        {/* Subtle Loading Shimmer Dots */}
        <div className="flex items-center gap-1.5 pt-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 animate-ping" />
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-ping delay-150" />
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/40 animate-ping delay-300" />
        </div>
      </div>
    </div>
  );
};

export default AppSplashScreen;
