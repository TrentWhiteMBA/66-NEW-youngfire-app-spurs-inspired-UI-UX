import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, Maximize2, Minimize2, Move, Scaling, Film, 
  ListMusic, SkipForward, SkipBack, ChevronDown, ChevronUp, Play
} from 'lucide-react';
import { VideoItem } from './KingdomVideoVault';
import { cleanYouTubeId } from '../data/mediaVaultData';

interface FloatingVideoPlayerProps {
  video: VideoItem | null;
  playlistQueue?: VideoItem[];
  currentPlaylistTitle?: string;
  onClose: () => void;
  onExpand?: () => void;
  onVideoChange?: (video: VideoItem) => void;
}

type PlayerDisplayMode = 'pip' | 'minimized' | 'maximized';

export const FloatingVideoPlayer: React.FC<FloatingVideoPlayerProps> = ({
  video: initialVideo,
  playlistQueue = [],
  currentPlaylistTitle,
  onClose,
  onVideoChange
}) => {
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(initialVideo);
  const [displayMode, setDisplayMode] = useState<PlayerDisplayMode>('pip');
  const [isNextUpOpen, setIsNextUpOpen] = useState(false);
  const [willMinimizeOnRelease, setWillMinimizeOnRelease] = useState(false);

  // Keep activeVideo in sync with initialVideo prop
  useEffect(() => {
    if (initialVideo) {
      setActiveVideo(initialVideo);
    }
  }, [initialVideo]);

  // Playlist Queue Management
  const currentQueueIndex = playlistQueue.findIndex(
    v => (v.id && activeVideo?.id && v.id === activeVideo.id) || 
         (v.youtubeId && activeVideo?.youtubeId && v.youtubeId === activeVideo.youtubeId)
  );

  const hasNext = currentQueueIndex !== -1 && currentQueueIndex < playlistQueue.length - 1;
  const hasPrev = currentQueueIndex > 0;

  const handlePlayNext = useCallback(() => {
    if (hasNext) {
      const nextVideo = playlistQueue[currentQueueIndex + 1];
      setActiveVideo(nextVideo);
      if (onVideoChange) onVideoChange(nextVideo);
    }
  }, [hasNext, currentQueueIndex, playlistQueue, onVideoChange]);

  const handlePlayPrev = useCallback(() => {
    if (hasPrev) {
      const prevVideo = playlistQueue[currentQueueIndex - 1];
      setActiveVideo(prevVideo);
      if (onVideoChange) onVideoChange(prevVideo);
    }
  }, [hasPrev, currentQueueIndex, playlistQueue, onVideoChange]);

  const handleSelectFromQueue = (selected: VideoItem) => {
    setActiveVideo(selected);
    if (onVideoChange) onVideoChange(selected);
  };

  // YouTube IFrame API PostMessage auto-advance listener when video finishes
  useEffect(() => {
    const handleYouTubeMessage = (event: MessageEvent) => {
      try {
        if (typeof event.data === 'string') {
          const parsed = JSON.parse(event.data);
          // YT.PlayerState.ENDED === 0
          if (parsed.event === 'onStateChange' && parsed.info === 0) {
            handlePlayNext();
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleYouTubeMessage);
    return () => window.removeEventListener('message', handleYouTubeMessage);
  }, [handlePlayNext]);

  // Dynamic Width state for PiP mode: constrained between 220px and 90vw
  const [playerWidth, setPlayerWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return Math.min(380, Math.max(260, window.innerWidth * 0.85));
    }
    return 360;
  });

  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      const defaultX = Math.max(12, window.innerWidth - 400);
      const defaultY = Math.max(70, window.innerHeight - 340);
      return { x: defaultX, y: defaultY };
    }
    return { x: 20, y: 100 };
  });

  // Draggable position when minimized
  const [minimizedPos, setMinimizedPos] = useState<{ x: number; y: number } | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  const dragRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    startTime: number;
    modeAtStart: PlayerDisplayMode;
  } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; initialWidth: number } | null>(null);
  const pinchRef = useRef<{ initialDistance: number; initialWidth: number } | null>(null);

  // Restore to PiP helper ensuring comfortable vertical position away from bottom edge
  const restoreToPip = useCallback(() => {
    setDisplayMode('pip');
    setWillMinimizeOnRelease(false);
    if (typeof window !== 'undefined') {
      setPosition(prev => {
        const currentHeight = playerWidth * (9 / 16) + 80;
        const safeMaxY = Math.max(60, window.innerHeight - currentHeight - 90);
        const safeMaxX = Math.max(12, window.innerWidth - playerWidth - 12);
        return {
          x: Math.min(Math.max(12, prev.x), safeMaxX),
          y: prev.y > safeMaxY ? Math.max(70, safeMaxY - 40) : Math.max(16, prev.y)
        };
      });
    }
  }, [playerWidth]);

  // Keep inside screen viewport on window resize when in PiP mode
  useEffect(() => {
    const handleResize = () => {
      if (displayMode !== 'pip') return;
      setPlayerWidth(prev => {
        const maxWidth = typeof window !== 'undefined' ? window.innerWidth * 0.9 : 800;
        return Math.max(220, Math.min(maxWidth, prev));
      });
      setPosition(prev => {
        const maxX = Math.max(0, window.innerWidth - playerWidth - 12);
        const maxY = Math.max(0, window.innerHeight - 100);
        return {
          x: Math.min(Math.max(12, prev.x), maxX),
          y: Math.min(Math.max(12, prev.y), maxY)
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [playerWidth, displayMode]);

  // Pointer Drag Handlers (Works across PiP, Maximized swipe-down, and Minimized pill)
  const handlePointerDown = (e: React.PointerEvent) => {
    // Do not hijack clicks on interactive action buttons
    if ((e.target as HTMLElement).closest('button')) return;

    setIsDragging(true);
    setWillMinimizeOnRelease(false);

    let initX = position.x;
    let initY = position.y;
    if (displayMode === 'minimized') {
      const fallbackX = typeof window !== 'undefined' ? Math.max(12, window.innerWidth - 304) : 20;
      const fallbackY = typeof window !== 'undefined' ? Math.max(60, window.innerHeight - 140) : 500;
      initX = minimizedPos ? minimizedPos.x : fallbackX;
      initY = minimizedPos ? minimizedPos.y : fallbackY;
    }

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: initX,
      initialY: initY,
      startTime: Date.now(),
      modeAtStart: displayMode
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!dragRef.current) return;
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;
    const mode = dragRef.current.modeAtStart;

    if (mode === 'minimized') {
      const pillWidth = 288;
      const pillHeight = 52;
      const maxX = Math.max(8, window.innerWidth - pillWidth - 8);
      const maxY = Math.max(8, window.innerHeight - pillHeight - 8);
      setMinimizedPos({
        x: Math.max(8, Math.min(maxX, dragRef.current.initialX + deltaX)),
        y: Math.max(8, Math.min(maxY, dragRef.current.initialY + deltaY))
      });
      return;
    }

    if (mode === 'maximized') {
      // Swiping down on maximized header prepares to minimize to PiP or Dock
      if (deltaY > 55) {
        setWillMinimizeOnRelease(true);
      } else {
        setWillMinimizeOnRelease(false);
      }
      return;
    }

    // PiP mode dragging
    const currentWidth = playerWidth;
    const currentHeight = playerWidth * (9 / 16) + 70;

    const maxX = Math.max(0, window.innerWidth - currentWidth - 8);
    const maxY = Math.max(0, window.innerHeight - 56);

    const newX = Math.max(4, Math.min(maxX, dragRef.current.initialX + deltaX));
    const newY = Math.max(8, Math.min(maxY, dragRef.current.initialY + deltaY));
    setPosition({ x: newX, y: newY });

    // Check if dragged into bottom Minimize Zone or swiped downward strongly
    const bottomMinimizeThreshold = window.innerHeight - Math.min(currentHeight * 0.65, 165);
    const isNearBottomZone = newY >= bottomMinimizeThreshold || e.clientY >= window.innerHeight - 95;
    const isStrongDownSwipe = deltaY > 95 && newY > window.innerHeight * 0.45;
    setWillMinimizeOnRelease(isNearBottomZone || isStrongDownSwipe);
  }, [playerWidth]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (!isDragging || !dragRef.current) return;
    const { startX, startY, startTime, modeAtStart } = dragRef.current;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    const elapsed = Math.max(1, Date.now() - startTime);
    const velocityY = deltaY / elapsed; // px per ms
    const totalMove = Math.hypot(deltaX, deltaY);

    setIsDragging(false);
    setWillMinimizeOnRelease(false);
    dragRef.current = null;
    try {
      (e.target as HTMLElement)?.releasePointerCapture(e.pointerId);
    } catch {}

    // 1. Minimized mode: tap or swipe-up restores to PiP
    if (modeAtStart === 'minimized') {
      if (totalMove < 8 || (deltaY < -45 && Math.abs(deltaY) > Math.abs(deltaX))) {
        restoreToPip();
      }
      return;
    }

    // 2. Maximized mode: swipe down minimizes to PiP (or directly to minimized if long swipe)
    if (modeAtStart === 'maximized') {
      if (deltaY > 160 || (deltaY > 60 && velocityY > 0.65)) {
        setDisplayMode('minimized');
      } else if (deltaY > 45) {
        setDisplayMode('pip');
      }
      return;
    }

    // 3. PiP mode: check if user swiped down or dragged into bottom minimize zone
    const currentHeight = playerWidth * (9 / 16) + 70;
    const bottomMinimizeThreshold = window.innerHeight - Math.min(currentHeight * 0.65, 165);
    const droppedInBottomZone =
      deltaY > 25 && (position.y >= bottomMinimizeThreshold || e.clientY >= window.innerHeight - 95);
    const flickedDownToMinimize =
      deltaY > 75 && velocityY > 0.45 && Math.abs(deltaY) > Math.abs(deltaX);

    if (droppedInBottomZone || flickedDownToMinimize) {
      setDisplayMode('minimized');
      return;
    }

    // Fluid boundary snapping to viewport edges when staying in PiP mode
    setPosition(prev => {
      const snapThreshold = 36;
      const currentWidth = playerWidth;
      const rightEdge = Math.max(12, window.innerWidth - currentWidth - 12);
      const bottomEdge = Math.max(12, window.innerHeight - currentHeight - 16);

      let snappedX = prev.x;
      let snappedY = prev.y;

      if (prev.x < snapThreshold) snappedX = 12;
      else if (Math.abs(prev.x - rightEdge) < snapThreshold) snappedX = rightEdge;

      if (prev.y < snapThreshold) snappedY = 12;
      else if (prev.y > bottomEdge) snappedY = bottomEdge;

      return { x: snappedX, y: snappedY };
    });
  }, [isDragging, playerWidth, position.y, restoreToPip]);

  // Pointer Corner Drag-Resizing (Bottom-Right Handle) — dragging smaller than 200px minimizes!
  const handleResizePointerDown = (e: React.PointerEvent) => {
    if (displayMode !== 'pip') return;
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialWidth: playerWidth
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleResizePointerMove = useCallback((e: PointerEvent) => {
    if (!resizeRef.current || displayMode !== 'pip') return;
    const deltaX = e.clientX - resizeRef.current.startX;
    const rawTargetWidth = resizeRef.current.initialWidth + deltaX;
    if (rawTargetWidth < 195) {
      setWillMinimizeOnRelease(true);
    } else {
      setWillMinimizeOnRelease(false);
    }
    const minWidth = 210;
    const maxWidth = Math.min(window.innerWidth * 0.92, 850);
    const newWidth = Math.max(minWidth, Math.min(maxWidth, rawTargetWidth));
    setPlayerWidth(newWidth);
  }, [displayMode]);

  const handleResizePointerUp = useCallback((e: PointerEvent) => {
    if (!isResizing) return;
    if (willMinimizeOnRelease) {
      setDisplayMode('minimized');
    }
    setIsResizing(false);
    setWillMinimizeOnRelease(false);
    resizeRef.current = null;
    try {
      (e.target as HTMLElement)?.releasePointerCapture(e.pointerId);
    } catch {}
  }, [isResizing, willMinimizeOnRelease]);

  // Two-Finger Pinch-to-Zoom & Pinch-In-to-Minimize Gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    if (displayMode !== 'pip') return;
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const distance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      pinchRef.current = {
        initialDistance: distance,
        initialWidth: playerWidth
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (displayMode !== 'pip') return;
    if (e.touches.length === 2 && pinchRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (pinchRef.current.initialDistance > 0) {
        const scale = currentDistance / pinchRef.current.initialDistance;
        const rawWidth = pinchRef.current.initialWidth * scale;
        if (rawWidth < 195) {
          setDisplayMode('minimized');
          pinchRef.current = null;
          return;
        }
        const minWidth = 220;
        const maxWidth = Math.min(window.innerWidth * 0.92, 850);
        const newWidth = Math.max(minWidth, Math.min(maxWidth, rawWidth));
        setPlayerWidth(newWidth);
      }
    }
  };

  const handleTouchEnd = () => {
    pinchRef.current = null;
  };

  // Window listeners for pointer drag & resize
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('pointermove', handleResizePointerMove);
      window.addEventListener('pointerup', handleResizePointerUp);
      window.addEventListener('pointercancel', handleResizePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handleResizePointerMove);
      window.removeEventListener('pointerup', handleResizePointerUp);
      window.removeEventListener('pointercancel', handleResizePointerUp);
    };
  }, [isResizing, handleResizePointerMove, handleResizePointerUp]);

  if (!activeVideo) return null;

  const isDirectUpload = (activeVideo as any).videoType === 'direct_upload' || 
    (activeVideo.videoUrl && (activeVideo.videoUrl.endsWith('.mp4') || activeVideo.videoUrl.endsWith('.mov') || activeVideo.videoUrl.includes('firebasestorage')));

  const rawId = activeVideo.youtubeId || (activeVideo as any).id || '';
  const cleanId = cleanYouTubeId(rawId);

  // Toggle maximize / expanded mode in sanctuary
  const toggleMaximize = () => {
    if (displayMode === 'maximized') {
      restoreToPip();
    } else {
      setDisplayMode('maximized');
    }
  };

  // Toggle minimized / docked mode
  const toggleMinimize = () => {
    if (displayMode === 'minimized') {
      restoreToPip();
    } else {
      setDisplayMode('minimized');
    }
  };

  return (
    <>
      {/* Dim backdrop overlay ONLY in maximized sanctuary theater mode */}
      {displayMode === 'maximized' && (
        <div 
          onClick={() => restoreToPip()}
          className="fixed inset-0 z-[9998] bg-black/85 backdrop-blur-md transition-opacity duration-300"
        />
      )}

      {/* Visual Drop-to-Minimize Indicator Pill when dragging toward bottom */}
      {isDragging && willMinimizeOnRelease && displayMode !== 'minimized' && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2 rounded-full bg-amber-500/95 text-slate-950 font-mono text-xs font-black uppercase tracking-wider shadow-[0_0_30px_rgba(245,158,11,0.8)] flex items-center gap-2 pointer-events-none animate-bounce">
          <ChevronDown className="w-4 h-4 stroke-[3]" />
          <span>Release to Minimize Worship PiP</span>
        </div>
      )}

      {/* Main Video Player Wrapper */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`fixed z-[9999] select-none ${
          isDragging || isResizing ? 'transition-none' : 'transition-all duration-300'
        } ${
          displayMode === 'maximized'
            ? 'inset-x-3 sm:inset-x-8 top-12 sm:top-16 max-w-4xl mx-auto rounded-3xl border-2 border-amber-400/80 shadow-[0_0_80px_rgba(245,158,11,0.4)] overflow-hidden bg-black'
            : displayMode === 'minimized'
            ? `${minimizedPos ? 'top-0 left-0' : 'bottom-24 right-3 sm:bottom-6 sm:right-6'} w-72 rounded-2xl border border-amber-400/70 shadow-[0_15px_40px_rgba(0,0,0,0.95)] overflow-hidden bg-black/95 backdrop-blur-xl`
            : `top-0 left-0 rounded-2xl overflow-hidden border ${
                willMinimizeOnRelease ? 'border-cyan-400 ring-2 ring-cyan-400/60 scale-95' : 'border-amber-500/60'
              } bg-[#0a0a0a] shadow-2xl`
        }`}
        style={{
          ...(displayMode === 'pip' ? {
            width: `${playerWidth}px`,
            transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
            cursor: isDragging ? 'grabbing' : 'auto',
            willChange: 'transform, width'
          } : displayMode === 'minimized' && minimizedPos ? {
            transform: `translate3d(${minimizedPos.x}px, ${minimizedPos.y}px, 0)`,
            cursor: isDragging ? 'grabbing' : 'grab',
            willChange: 'transform'
          } : {})
        }}
      >
        {/* Top Touch Drag & Swipe-to-Minimize Handlebar */}
        <div 
          onPointerDown={handlePointerDown}
          style={{ touchAction: 'none' }}
          className="bg-black px-3 pt-1.5 pb-2 flex flex-col border-b border-white/10 select-none touch-none cursor-grab active:cursor-grabbing"
          title={
            displayMode === 'minimized'
              ? 'Drag to move or Tap to expand Worship PiP'
              : 'Drag to move or Swipe down to minimize Worship PiP'
          }
        >
          {/* Visual Touch Grab Pill */}
          <div className="w-full flex items-center justify-center pb-1 pointer-events-none">
            <div className="w-9 h-1 rounded-full bg-amber-400/50" />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 truncate pr-2 pointer-events-none">
              {displayMode === 'pip' || displayMode === 'minimized' ? (
                <Move className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 animate-pulse" />
              ) : (
                <Film className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              )}
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping flex-shrink-0" />
              <span className="text-xs font-mono font-bold text-amber-300 truncate">
                {currentPlaylistTitle ? `${currentPlaylistTitle} • ${activeVideo.title}` : activeVideo.title}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0 pointer-events-auto">
              {/* Playlist Queue Toggle */}
              {playlistQueue.length > 0 && displayMode !== 'minimized' && (
                <button
                  type="button"
                  onClick={() => setIsNextUpOpen(prev => !prev)}
                  className={`p-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-mono ${
                    isNextUpOpen ? 'bg-amber-400 text-black font-bold' : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                  title="Toggle Next Up Queue"
                >
                  <ListMusic className="w-3.5 h-3.5" />
                  <span>{currentQueueIndex + 1}/{playlistQueue.length}</span>
                </button>
              )}

              {/* Minimize / Restore Button */}
              <button
                type="button"
                onClick={toggleMinimize}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer transition-colors flex items-center gap-1"
                title={displayMode === 'minimized' ? "Restore Video View" : "Minimize to Floating Pill"}
              >
                {displayMode === 'minimized' ? (
                  <span className="text-[10px] font-mono text-amber-300 font-bold px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 flex items-center gap-1">
                    <ChevronUp className="w-3 h-3" />
                    <span>Expand</span>
                  </span>
                ) : (
                  <Minimize2 className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Maximize / Expand In Sanctuary Button */}
              {displayMode !== 'minimized' && (
                <button
                  type="button"
                  onClick={toggleMaximize}
                  className="p-1 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-white/10 cursor-pointer transition-colors"
                  title={displayMode === 'maximized' ? "Return to Floating Window" : "Expand in Sanctuary"}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/10 cursor-pointer transition-colors"
                title="Close Video"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 
          CRITICAL: VIDEO CONTAINER IS PERMANENTLY MOUNTED ACROSS MINIMIZE/MAXIMIZE.
          Prevents player reloads, ensuring video continues playing seamlessly without restart!
        */}
        <div 
          className={`w-full bg-black transition-all ${
            displayMode === 'minimized'
              ? 'h-0 opacity-0 overflow-hidden pointer-events-none'
              : 'relative aspect-video w-full'
          }`}
        >
          {(isDragging || isResizing) && (
            <div className="absolute inset-0 z-20 bg-transparent" />
          )}

          {isDirectUpload ? (
            <video
              src={activeVideo.videoUrl}
              controls
              autoPlay
              onEnded={handlePlayNext}
              className="w-full h-full object-contain bg-black"
            />
          ) : cleanId ? (
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${cleanId}?autoplay=1&enablejsapi=1&rel=0`}
              title={activeVideo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : null}
        </div>

        {/* Footer Info & Queue Controls (Also supports Touch/Pointer Drag & Swipe Down to Minimize) */}
        {displayMode !== 'minimized' && (
          <div
            onPointerDown={handlePointerDown}
            style={{ touchAction: 'none' }}
            className="relative px-3 py-2 bg-black flex flex-col gap-1.5 text-[11px] font-mono border-t border-white/10 select-none touch-none cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 truncate pr-4 pointer-events-none">
                <span className="text-amber-400 font-bold uppercase text-[9px] px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                  {activeVideo.category || 'Worship'}
                </span>
                <span className="text-slate-300 truncate">
                  {activeVideo.speaker || activeVideo.artist || (activeVideo as any).uploadedBy?.name || 'Sanctuary'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 pr-5">
                {/* Quick Touch Swipe/Tap Minimize Pill in Footer */}
                <button
                  type="button"
                  onClick={toggleMinimize}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[9px] text-slate-300 hover:text-amber-300 border border-white/10 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Minimize Worship PiP"
                >
                  <ChevronDown className="w-3 h-3 text-amber-400" />
                  <span>Minimize</span>
                </button>

                {/* Queue Previous / Next Skip Buttons */}
                {playlistQueue.length > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handlePlayPrev}
                      disabled={!hasPrev}
                      className={`p-1 rounded transition-colors ${
                        hasPrev ? 'text-slate-300 hover:text-white cursor-pointer' : 'text-slate-600 cursor-not-allowed'
                      }`}
                      title="Previous Video"
                    >
                      <SkipBack className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handlePlayNext}
                      disabled={!hasNext}
                      className={`p-1 rounded transition-colors ${
                        hasNext ? 'text-amber-400 hover:text-amber-300 cursor-pointer' : 'text-slate-600 cursor-not-allowed'
                      }`}
                      title="Next Video"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Corner Resize Handle only in PiP mode */}
            {displayMode === 'pip' && (
              <div
                onPointerDown={handleResizePointerDown}
                style={{ touchAction: 'none' }}
                className="absolute right-0 bottom-0 w-7 h-7 flex items-end justify-end p-1.5 text-amber-400 hover:text-amber-200 cursor-nwse-resize active:scale-110 transition-transform touch-none"
                title="Drag to Resize Video Window (or Drag Inward / Pinch to Minimize)"
              >
                <Scaling className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        )}

        {/* Collapsible Next Up Queue Drawer */}
        {isNextUpOpen && displayMode !== 'minimized' && playlistQueue.length > 0 && (
          <div className="bg-[#080808] border-t border-white/10 max-h-60 overflow-y-auto no-scrollbar p-2 space-y-1.5">
            <div className="flex items-center justify-between px-2 py-1 text-[10px] font-mono uppercase text-slate-400 font-bold border-b border-white/5">
              <span>Next Up &bull; {playlistQueue.length} Videos</span>
              <button 
                onClick={() => setIsNextUpOpen(false)}
                className="text-slate-500 hover:text-white"
              >
                Close
              </button>
            </div>
            {playlistQueue.map((item, idx) => {
              const isCurrent = idx === currentQueueIndex;
              return (
                <div
                  key={`queue_${item.id || item.youtubeId}_${idx}`}
                  onClick={() => handleSelectFromQueue(item)}
                  className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-all ${
                    isCurrent 
                      ? 'bg-amber-400/20 border border-amber-400/40 text-amber-300' 
                      : 'hover:bg-white/5 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="relative w-12 h-8 rounded-lg overflow-hidden bg-black flex-shrink-0">
                    <img
                      src={item.thumbnailUrl || (item.youtubeId ? `https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg` : '/image_4.png')}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    {isCurrent && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Play className="w-3 h-3 text-amber-400 fill-current" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-[11px] font-bold truncate leading-tight">
                      {idx + 1}. {item.title}
                    </h5>
                    <p className="text-[9px] font-mono text-slate-400 truncate mt-0.5">
                      {item.speaker || item.artist || (item as any).uploadedBy?.name || item.category}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default FloatingVideoPlayer;
