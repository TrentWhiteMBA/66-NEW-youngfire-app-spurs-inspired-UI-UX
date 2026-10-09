import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Flame, Sparkles } from 'lucide-react';

interface CinematicLaunchPortalProps {
  onLaunchComplete: (initialTab?: 'home' | 'schedule' | 'calendar' | 'team') => void;
  onEnterSanctuary?: (initialTab?: 'home' | 'schedule' | 'calendar' | 'team') => void;
  onPrimeAudioGesture?: () => void;
}

type LaunchStage =
  | 'black-beacon'
  | 'world-map'
  | 'sa-locked'
  | 'sa-zooming'
  | 'stinger-flame'
  | 'fade-to-welcome';

export const CinematicLaunchPortal: React.FC<CinematicLaunchPortalProps> = ({
  onLaunchComplete,
  onEnterSanctuary,
  onPrimeAudioGesture
}) => {
  const [stage, setStage] = useState<LaunchStage>('world-map');
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const isExitingRef = useRef(false);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  // Smooth exit helper that always fades out cleanly over 1.5s before unmounting
  const triggerSmoothExit = useCallback(() => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    try {
      sessionStorage.setItem('youngfire_portal_entered', 'true');
      localStorage.setItem('youngfire_portal_entered', 'true');
    } catch {}
    if (onPrimeAudioGesture) onPrimeAudioGesture();
    clearAllTimers();
    setStage('fade-to-welcome');
    const exitTimer = setTimeout(() => {
      onLaunchComplete();
    }, 1500);
    timersRef.current.push(exitTimer);
  }, [clearAllTimers, onLaunchComplete, onPrimeAudioGesture]);

  // Eliminate re-entry latency if session has already unlocked the portal
  useEffect(() => {
    try {
      if (
        sessionStorage.getItem('youngfire_portal_entered') === 'true' ||
        localStorage.getItem('youngfire_portal_entered') === 'true'
      ) {
        onLaunchComplete();
      }
    } catch {}
  }, [onLaunchComplete]);

  // Starts the cinematic startup sequence when the user hits the Blue Beacon light:
  // 1. Dark Globe Map fades out & San Antonio Map appears ('sa-locked')
  // 2. Smoothly zoom in on the San Antonio Map ('sa-zooming')
  // 3. YoungFire Logo Stinger Page with San Antonio Map behind it ('stinger-flame')
  // 4. Dissolve to Welcome Page ('fade-to-welcome')
  const startProcessFromBeginning = useCallback(() => {
    isExitingRef.current = false;
    clearAllTimers();

    // Step 1: Cross-fade from Dark Globe Map to San Antonio street map
    setStage('sa-locked');

    const tZoom = setTimeout(() => {
      // Step 2: Smoothly zoom in on the San Antonio map toward the Blue Beacon (3.5s)
      setStage('sa-zooming');

      const tStinger = setTimeout(() => {
        // Step 3: Reveal the YoungFire Holy Flame Logo Stinger page with San Antonio map behind it (4s)
        setStage('stinger-flame');

        const tFadeWelcome = setTimeout(() => {
          // Step 4: Smoothly transition to the Welcome Sanctuary page
          triggerSmoothExit();
        }, 4000);
        timersRef.current.push(tFadeWelcome);
      }, 3500);
      timersRef.current.push(tStinger);
    }, 1200);

    timersRef.current.push(tZoom);
  }, [clearAllTimers, triggerSmoothExit]);

  // Preload Dark Globe Map, San Antonio Map & Welcome assets on mount
  useEffect(() => {
    const preloadUrls = [
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80',
      '/san_antonio_dark_map.png',
      '/IMG_3520.jpg'
    ];
    preloadUrls.forEach((src) => {
      const img = new Image();
      img.src = src;
    });

    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  const handleBlueDotClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Do NOT start audible music here; music starts 1.55s after landing on the Welcome Page.
    // Silently prime the audio element on this click gesture so browser autoplay is unlocked.
    if (onPrimeAudioGesture) onPrimeAudioGesture();
    startProcessFromBeginning();
  };

  // Handler for the San Antonio Beacon Calendar Callout:
  const handleBeaconCalendarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPrimeAudioGesture) onPrimeAudioGesture();
    clearAllTimers();
    setStage('stinger-flame');
    const calTimer = setTimeout(() => {
      if (onEnterSanctuary) {
        onEnterSanctuary('calendar');
      } else {
        onLaunchComplete('calendar');
      }
    }, 1100);
    timersRef.current.push(calTimer);
  };

  const isMapAndBeaconVisible =
    stage === 'black-beacon' ||
    stage === 'world-map' ||
    stage === 'sa-locked' ||
    stage === 'sa-zooming';

  const isStingerVisible = stage === 'stinger-flame' || stage === 'fade-to-welcome';

  return (
    <div
      className={`fixed inset-0 z-[100] overflow-hidden bg-black select-none flex items-center justify-center transition-opacity duration-[1500ms] ease-in-out ${
        stage === 'fade-to-welcome'
          ? 'opacity-0 pointer-events-none'
          : 'opacity-100 pointer-events-auto'
      }`}
    >
      <style>{`
        @keyframes livingWaterPulse {
          0% {
            transform: scale(0.85);
            opacity: 0.95;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            transform: scale(4.2);
            opacity: 0;
          }
        }
        @keyframes stingerCrestBreathe {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 40px rgba(245, 158, 11, 0.45), 0 0 80px rgba(245, 158, 11, 0.2);
          }
          50% {
            transform: scale(1.04);
            box-shadow: 0 0 55px rgba(245, 158, 11, 0.65), 0 0 100px rgba(245, 158, 11, 0.3);
          }
        }
        @keyframes ambientGlobeDrift {
          0% {
            transform: scale(1) translate(0%, 0%);
          }
          50% {
            transform: scale(1.04) translate(-1.2%, -0.8%);
          }
          100% {
            transform: scale(1) translate(0%, 0%);
          }
        }
        .animate-globe-drift {
          animation: ambientGlobeDrift 24s ease-in-out infinite;
          will-change: transform;
        }
        .animate-living-water {
          animation: livingWaterPulse 2.2s cubic-bezier(0, 0.2, 0.8, 1) infinite;
        }
        .animate-flame-hold {
          animation: stingerCrestBreathe 3.2s ease-in-out infinite;
        }
      `}</style>

      {/* ==================================================================== */}
      {/* 1A. DARK GLOBE MAP LAYER (Visible on initial Beacon Light screen)    */}
      {/*     Outer wrapper handles opacity/scale transition so ambient drift  */}
      {/*     on inner layer never causes a transform snap or glitch on click  */}
      {/* ==================================================================== */}
      <div
        className={`absolute inset-0 pointer-events-none transition-all duration-[1200ms] ease-out ${
          stage === 'world-map' || stage === 'black-beacon'
            ? 'opacity-70 scale-100'
            : 'opacity-0 scale-110'
        }`}
        style={{ transformOrigin: '48% 54%' }}
      >
        <div
          className="w-full h-full bg-cover bg-center animate-globe-drift"
          style={{
            backgroundImage: `radial-gradient(circle at 48% 54%, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.85) 100%), url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80')`,
            filter: 'grayscale(100%) contrast(135%) brightness(80%)'
          }}
        />
      </div>

      {/* ==================================================================== */}
      {/* 1B. SAN ANTONIO DARK STREET MAP (/san_antonio_dark_map.png)          */}
      {/*     Appears when Blue Beacon is clicked ('sa-locked'),               */}
      {/*     zooms in smoothly ('sa-zooming'), and stays static in stinger    */}
      {/* ==================================================================== */}
      <div
        className={`absolute inset-0 bg-cover bg-center pointer-events-none ${
          stage === 'sa-zooming'
            ? 'transition-all duration-[3500ms] ease-in-out opacity-95'
            : isStingerVisible
            ? 'transition-none opacity-0'
            : 'transition-all duration-[1000ms] ease-out'
        } ${
          stage === 'sa-locked'
            ? 'opacity-90 scale-100'
            : stage === 'sa-zooming'
            ? 'opacity-95 scale-[2.8]'
            : isStingerVisible
            ? 'opacity-0'
            : 'opacity-0 scale-100'
        }`}
        style={{
          backgroundImage: `radial-gradient(circle at 50% 52%, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.75) 100%), url('/san_antonio_dark_map.png')`,
          filter: 'contrast(130%) brightness(96%)',
          transformOrigin: '50% 52%',
          ...(isStingerVisible ? { transform: 'none' } : {})
        }}
      />

      {/* ==================================================================== */}
      {/* 2. LIVING WATER BLUE DOT BEACON OVER JHOW SAN ANTONIO                 */}
      {/* ==================================================================== */}
      <div
        className={`absolute z-20 flex flex-col items-center justify-center cursor-pointer group ${
          stage === 'sa-zooming'
            ? 'transition-all duration-[3500ms] ease-in-out'
            : 'transition-all duration-[1000ms] ease-out'
        } ${isMapAndBeaconVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{
          top: stage === 'world-map' || stage === 'black-beacon' ? '54%' : '52%',
          left: stage === 'world-map' || stage === 'black-beacon' ? '48%' : '50%',
          transform:
            stage === 'sa-zooming'
              ? 'translate(-50%, -50%) scale(1.45)'
              : 'translate(-50%, -50%) scale(1)'
        }}
        onClick={handleBlueDotClick}
        title="Click Blue Beacon to Enter Sanctuary"
      >
        {/* Concentric Living Water Pulse Rings */}
        <div className="relative flex items-center justify-center w-28 h-28">
          <div className="absolute w-14 h-14 rounded-full border border-cyan-400 animate-living-water" />
          <div
            className="absolute w-14 h-14 rounded-full border border-cyan-300 animate-living-water"
            style={{ animationDelay: '0.75s' }}
          />
          <div
            className="absolute w-14 h-14 rounded-full border border-sky-300/70 animate-living-water"
            style={{ animationDelay: '1.5s' }}
          />
          {/* Radiant Solid Cyan Beacon Core */}
          <div
            className={`w-5 h-5 rounded-full bg-cyan-400 transition-all duration-500 ease-out ${
              stage === 'sa-zooming'
                ? 'shadow-[0_0_55px_22px_rgba(6,182,212,0.95)] scale-125'
                : 'shadow-[0_0_35px_14px_rgba(6,182,212,0.85)] group-hover:scale-125'
            }`}
          />
        </div>

        {/* Minimalist Interactive Beacon Prompt */}
        <div
          className={`mt-2 flex flex-col items-center transition-opacity duration-700 pointer-events-none ${
            stage === 'world-map' || stage === 'black-beacon' || stage === 'sa-locked' ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="px-4 py-1.5 rounded-full bg-black/85 border border-cyan-400/60 backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.35)]">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan-300 font-bold">
              {stage === 'world-map' || stage === 'black-beacon' ? 'Tap To Enter Sanctuary' : 'Sanctuary Beacon Locked'}
            </span>
          </div>
          <span className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            Joshua House of Worship • San Antonio, TX
          </span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. OFFICIAL YOUNGFIRE HOLY FLAME STINGER PAGE (ABSOLUTE DEAD-CENTER) */}
      {/*    Renders the YoungFire Crest Logo over the San Antonio Street Map  */}
      {/* ==================================================================== */}
      {(stage === 'stinger-flame' || stage === 'fade-to-welcome') && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center m-0 p-0 overflow-hidden select-none">
          {/* San Antonio Street Map Backdrop Layer behind the YoungFire Logo */}
          <div
            className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-85"
            style={{
              backgroundImage: `url('/san_antonio_dark_map.png')`,
              filter: 'contrast(130%) brightness(92%)'
            }}
          />
          {/* Subtle Obsidian Radial Vignette so map lines stay crisp behind the logo */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.35)_0%,rgba(0,0,0,0.84)_90%)] pointer-events-none" />

          {/* Ambient Centered Radiant Glows */}
          <div
            className="absolute w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none animate-pulse"
            style={{ backgroundColor: '#F59E0B30' }}
          />
          <div
            className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none"
            style={{ backgroundColor: '#EF444425' }}
          />
          <div
            className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none"
            style={{ backgroundColor: '#FF820025' }}
          />

          {/* Perfectly Centered YoungFire Holy Flame Crest Logo & Brand */}
          <div className="relative z-10 flex flex-col items-center justify-center gap-4 text-center px-6">
            {/* YoungFire Holy Flame Crest Logo (Black Rounded Outer Box + White Rounded Inner Square + Black Flame) */}
            <div
              className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-[2rem] bg-black border-2 flex items-center justify-center shadow-2xl relative animate-flame-hold"
              style={{
                borderColor: '#F59E0B',
                boxShadow: '0 0 55px #F59E0B65'
              }}
            >
              <div className="w-22 h-22 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-[1.4rem] bg-white flex items-center justify-center shadow-inner">
                <Flame className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-black fill-current drop-shadow" />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <span className="text-2xl sm:text-3xl font-black uppercase tracking-[0.28em] text-white font-['Anton',sans-serif] drop-shadow-md">
                YOUNG<span style={{ color: '#F59E0B' }}>FIRE</span>
              </span>
              <div className="flex items-center justify-center gap-2 text-xs font-mono tracking-widest text-slate-300 uppercase">
                <Sparkles className="w-3.5 h-3.5" style={{ color: '#F59E0B' }} />
                <span>ENTERING SANCTUARY</span>
                <Sparkles className="w-3.5 h-3.5" style={{ color: '#F59E0B' }} />
              </div>
            </div>

            {/* Dynamic 3-Stripe Fiesta / Theme Accent Bar */}
            <div className="w-48 sm:w-64 flex flex-col gap-1 my-2">
              <div className="w-full h-1 rounded-full shadow-sm" style={{ backgroundColor: '#F59E0B' }} />
              <div className="w-full h-1 rounded-full shadow-sm" style={{ backgroundColor: '#EF4444' }} />
              <div className="w-full h-1 rounded-full shadow-sm" style={{ backgroundColor: '#FF8200' }} />
            </div>

            {/* Subtitle */}
            <p className="text-[11px] font-mono text-slate-400 tracking-widest uppercase">
              Joshua House of Worship &bull; San Antonio, TX
            </p>
          </div>
        </div>
      )}

      {/* Bottom Controls during Map / Beacon Phases */}
      {!isStingerVisible && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3">
          <button
            onClick={triggerSmoothExit}
            className="px-5 py-2 rounded-full border border-white/20 bg-black/70 backdrop-blur-md font-mono text-[10px] uppercase tracking-widest text-slate-300 hover:text-white hover:border-white/40 transition-all cursor-pointer"
          >
            Skip Intro
          </button>
        </div>
      )}
    </div>
  );
};
