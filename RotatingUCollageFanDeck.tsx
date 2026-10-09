import React, { useState, useEffect, useRef } from 'react';
import { AppTheme } from '../data/appThemes';
import { CLOCK_CAROUSEL_PHOTOS } from '../data/fellowshipPhotos';

interface RotatingUCollageFanDeckProps {
  photos?: string[];
  className?: string;
  onPhotoClick?: (index: number) => void;
  autoRotateIntervalMs?: number;
  activeTheme?: AppTheme;
}

const DEFAULT_PHOTOS = CLOCK_CAROUSEL_PHOTOS;

/**
 * Clock-Arc Photo Carousel
 * Spaced out across the entire screen horizontally similar to Spurs App.
 * Pure 2D horizontal arc track with zero swoop-behind.
 * Dynamic border outlines reflecting the active theme.
 * Clean photos with zero captions.
 */
export const RotatingUCollageFanDeck: React.FC<RotatingUCollageFanDeckProps> = ({
  photos = DEFAULT_PHOTOS,
  className = '',
  onPhotoClick,
  autoRotateIntervalMs = 2000,
  activeTheme
}) => {
  // Ensure at least 5 photos for complete slot coverage
  const displayPhotos = photos.length >= 5 ? photos : [...photos, ...DEFAULT_PHOTOS].slice(0, 5);
  const totalCount = displayPhotos.length;

  const [activeIndex, setActiveIndex] = useState<number>(0);
  const prevOffsetsRef = useRef<number[]>([]);

  const accentColor = activeTheme?.accentHex || '#FFFFFF';

  // Auto-rotate tick
  useEffect(() => {
    if (autoRotateIntervalMs <= 0) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % totalCount);
    }, autoRotateIntervalMs);

    return () => clearInterval(timer);
  }, [totalCount, autoRotateIntervalMs]);

  // Compute normalized signed offset for each photo index relative to activeIndex
  const getOffset = (i: number): number => {
    if (totalCount <= 0) return 0;
    let offset = ((i - activeIndex) % totalCount);
    if (offset < -Math.floor(totalCount / 2)) offset += totalCount;
    if (offset > Math.floor(totalCount / 2)) offset -= totalCount;
    return offset;
  };

  const currentOffsets = displayPhotos.map((_, i) => getOffset(i));

  // Determine which cards need their transition suppressed to prevent cross-screen swoop
  const suppressTransitionFlags = currentOffsets.map((curr, i) => {
    const prev = prevOffsetsRef.current[i];
    if (prev === undefined) return false;
    // If wrapping between left exited (<= -2) and right waiting (>= 2)
    return (prev <= -2 && curr >= 2) || (prev >= 2 && curr <= -2);
  });

  useEffect(() => {
    prevOffsetsRef.current = currentOffsets;
  }, [activeIndex]);

  const handleCardClick = (origIndex: number, offset: number) => {
    if (offset === 0) {
      if (onPhotoClick) onPhotoClick(origIndex);
    } else if (offset === -1) {
      setActiveIndex((prev) => (prev - 1 + totalCount) % totalCount);
    } else if (offset === 1) {
      setActiveIndex((prev) => (prev + 1) % totalCount);
    }
  };

  return (
    <div className={`relative w-full py-2 flex flex-col items-center justify-center select-none overflow-hidden ${className}`}>
      
      {/* Clock-Arc Card Stage: expanded across the entire horizontal screen */}
      <div className="relative w-full h-38 sm:h-44 flex items-center justify-center overflow-hidden">
        {displayPhotos.map((photo, i) => {
          const offset = currentOffsets[i];
          const suppressTransition = suppressTransitionFlags[i];

          // Spaced-out positions expanding across the entire width of the screen
          let transform = '';
          let opacity = 0;
          let filter = 'grayscale(100%) brightness(75%)';
          let zIndex = 0;
          let pointerEvents: 'none' | 'auto' = 'none';

          if (offset <= -2) {
            // Offset <= -2 (Off-screen Left / Exited)
            transform = 'translate(-235%, 32px) rotate(-28deg) scale(0.70)';
            opacity = 0;
            pointerEvents = 'none';
            zIndex = 0;
          } else if (offset === -1) {
            // Offset -1 (Slot 1 — Left 7 o'clock Position, spaced out to the left screen edge)
            transform = 'translate(-142%, 14px) rotate(-16deg) scale(0.90)';
            opacity = 0.65;
            filter = 'grayscale(100%) brightness(75%)';
            zIndex = 10;
            pointerEvents = 'auto';
          } else if (offset === 0) {
            // Offset 0 (Slot 2 — Center 6 o'clock Position — ACTIVE)
            transform = 'translate(0%, 0px) rotate(0deg) scale(1.12)';
            opacity = 1.0;
            filter = 'grayscale(0%) brightness(100%)';
            zIndex = 30;
            pointerEvents = 'auto';
          } else if (offset === 1) {
            // Offset +1 (Slot 3 — Right 5 o'clock Position, spaced out to the right screen edge)
            transform = 'translate(142%, 14px) rotate(16deg) scale(0.90)';
            opacity = 0.65;
            filter = 'grayscale(100%) brightness(75%)';
            zIndex = 10;
            pointerEvents = 'auto';
          } else {
            // Offset >= +2 (Off-screen Right / Waiting)
            transform = 'translate(235%, 32px) rotate(28deg) scale(0.70)';
            opacity = 0;
            pointerEvents = 'none';
            zIndex = 0;
          }

          const isCenter = offset === 0;

          return (
            <div
              key={`${i}-${photo}`}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-22 sm:w-26 h-30 sm:h-36 pointer-events-none"
              style={{ zIndex }}
            >
              <div
                onClick={() => handleCardClick(i, offset)}
                className={`w-full h-full rounded-2xl overflow-hidden cursor-pointer transition-all ${
                  isCenter
                    ? 'border-2 shadow-2xl'
                    : 'border border-white/20 shadow-lg'
                }`}
                style={{
                  transform,
                  opacity,
                  filter,
                  pointerEvents,
                  borderColor: isCenter ? accentColor : 'rgba(255, 255, 255, 0.2)',
                  boxShadow: isCenter 
                    ? `0 10px 35px ${accentColor}40` 
                    : '0 4px 15px rgba(0,0,0,0.5)',
                  transition: suppressTransition
                    ? 'none'
                    : 'all 500ms cubic-bezier(0.25, 1, 0.5, 1)',
                  visibility: (offset <= -2 || offset >= 2) && suppressTransition ? 'hidden' : 'visible'
                }}
                title={isCenter ? 'Active Sanctuary Photo' : 'Tap to rotate to center'}
              >
                <img
                  src={photo}
                  alt={`Sanctuary Photo ${i + 1}`}
                  className="w-full h-full object-cover object-top filter contrast-110 brightness-105"
                  loading="eager"
                  draggable={false}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/IMG_3522.jpg';
                  }}
                />
                
                {/* Active Card Subtle Vignette */}
                <div 
                  className={`absolute inset-0 transition-opacity ${
                    isCenter 
                      ? 'bg-gradient-to-t from-black/50 via-transparent to-black/10' 
                      : 'bg-black/30'
                  }`} 
                />
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default RotatingUCollageFanDeck;
