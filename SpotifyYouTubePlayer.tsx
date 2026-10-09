import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  Shuffle, Repeat, Music, ChevronUp, ChevronDown, 
  Search, BookOpen, Heart, Sparkles, X, Flame, Radio, ExternalLink
} from 'lucide-react';
import type { MusicTrack } from '../types';
import { VERIFIED_GOSPEL_TRACKS, GOSPEL_TRACK_CATEGORIES } from '../data/musicTracksData';
import { parseScriptureRefToNav, cleanYouTubeId } from '../data/kingdomMediaData';

interface SpotifyYouTubePlayerProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  onNavigateToScripture?: (bookId: string, chapter: number) => void;
  isDucked?: boolean;
  masterVolume?: number;
  onMasterVolumeChange?: (vol: number) => void;
  onSwitchToRadio?: () => void;
}

export const SpotifyYouTubePlayer: React.FC<SpotifyYouTubePlayerProps> = ({
  isOpen,
  onToggleOpen,
  onNavigateToScripture,
  isDucked = false,
  masterVolume = 0.85,
  onMasterVolumeChange,
  onSwitchToRadio
}) => {
  const [tracks, setTracks] = useState<MusicTrack[]>(VERIFIED_GOSPEL_TRACKS);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(masterVolume);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isExpandedDrawer, setIsExpandedDrawer] = useState<boolean>(false);
  const [favoriteTrackIds, setFavoriteTrackIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('youngfire_music_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrack = tracks[currentTrackIndex] || VERIFIED_GOSPEL_TRACKS[0];

  // Initialize Audio
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;

    const handleEnded = () => {
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        handleNextTrack();
      }
    };

    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [isRepeat, currentTrackIndex, isShuffle, tracks]);

  // Handle Ducking & Volume
  useEffect(() => {
    if (audioRef.current) {
      const targetVol = isDucked ? 0.1 : (isMuted ? 0 : volume);
      audioRef.current.volume = targetVol;
    }
  }, [volume, isMuted, isDucked]);

  // Sync with masterVolume prop
  useEffect(() => {
    setVolume(masterVolume);
  }, [masterVolume]);

  // Listen to custom event to play specific track from anywhere in app
  useEffect(() => {
    const handlePlayTrackEvent = (e: Event) => {
      const customEv = e as CustomEvent<{ track: any; autoPlay?: boolean }>;
      if (customEv.detail?.track) {
        const trk = customEv.detail.track;
        const ytId = trk.youtubeId ? cleanYouTubeId(trk.youtubeId) : (trk.videoUrl ? cleanYouTubeId(trk.videoUrl) : undefined);
        const foundIdx = tracks.findIndex(t => t.id === trk.id || (ytId && t.youtubeId === ytId));
        if (foundIdx !== -1) {
          playTrackAtIndex(foundIdx);
        } else {
          // Add on top and play
          const newTrk: MusicTrack = {
            id: trk.id || `custom_${Date.now()}`,
            title: trk.title,
            artist: trk.artist || trk.speaker || 'Joshua House of Worship',
            category: trk.category || 'Worship Video',
            albumArt: trk.albumArt || trk.thumbnailUrl || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : '/image_4.png'),
            youtubeId: ytId || "",
            audioUrl: ytId ? undefined : (trk.streamUrl || trk.audioUrl),
            thematicFocus: trk.thematicFocus,
            scriptureRef: trk.scriptureRef
          };
          setTracks(prev => [newTrk, ...prev]);
          playTrackAtIndex(0);
        }
      }
    };

    window.addEventListener('yf_play_dock_track', handlePlayTrackEvent);
    return () => window.removeEventListener('yf_play_dock_track', handlePlayTrackEvent);
  }, [tracks]);

  const playTrackAtIndex = (index: number) => {
    if (index < 0 || index >= tracks.length) return;
    setCurrentTrackIndex(index);
    const track = tracks[index];
    
    // If it's a worship sanctuary video with a YouTube ID, NEVER play radio station stream
    if (track.youtubeId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      setIsPlaying(true);
      return;
    }

    if (audioRef.current) {
      // Use verified direct audio stream or fallback gospel stream only for audio tracks
      const streamUrl = track.streamUrl || (track.audioUrl?.startsWith('http') ? track.audioUrl : 'https://stream.0nlineradio.com/gospel?ref=radiobrowser');
      audioRef.current.src = streamUrl;
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          // Fallback to high quality stream
          if (audioRef.current) {
            audioRef.current.src = 'https://stream.0nlineradio.com/gospel?ref=radiobrowser';
            audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          }
        });
    }
  };

  const handleTogglePlay = () => {
    const track = tracks[currentTrackIndex];
    if (track?.youtubeId) {
      setIsPlaying(!isPlaying);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      return;
    }

    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current.src) {
        playTrackAtIndex(currentTrackIndex);
      } else {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(() => playTrackAtIndex(currentTrackIndex));
      }
    }
  };

  const handleNextTrack = () => {
    if (isShuffle) {
      const nextIdx = Math.floor(Math.random() * tracks.length);
      playTrackAtIndex(nextIdx);
    } else {
      const nextIdx = (currentTrackIndex + 1) % tracks.length;
      playTrackAtIndex(nextIdx);
    }
  };

  const handlePrevTrack = () => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
    } else {
      const prevIdx = (currentTrackIndex - 1 + tracks.length) % tracks.length;
      playTrackAtIndex(prevIdx);
    }
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated: string[];
    if (favoriteTrackIds.includes(id)) {
      updated = favoriteTrackIds.filter(f => f !== id);
    } else {
      updated = [...favoriteTrackIds, id];
    }
    setFavoriteTrackIds(updated);
    try {
      localStorage.setItem('youngfire_music_favorites', JSON.stringify(updated));
    } catch {}
  };

  const handleScriptureClick = (refText?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!refText) return;
    const parsed = parseScriptureRefToNav(refText);
    if (parsed) {
      if (onNavigateToScripture) {
        onNavigateToScripture(parsed.bookId, parsed.chapter);
      } else {
        window.dispatchEvent(new CustomEvent('yf_navigate_scripture', { 
          detail: { bookId: parsed.bookId, chapter: parsed.chapter } 
        }));
      }
    }
  };

  // Filter tracks for search & category
  const filteredTracks = tracks.filter(t => {
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      (t.thematicFocus && t.thematicFocus.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      {/* 1. Persistent Bottom Audio Dock */}
      {isOpen && (
        <div 
          className="fixed bottom-[68px] sm:bottom-[72px] inset-x-3 max-w-xl mx-auto z-40 transition-all duration-300 ease-out animate-slideUp select-none"
        >
          <div className="relative overflow-hidden bg-[#070B18]/95 border border-amber-500/80 shadow-[0_12px_45px_rgba(0,0,0,0.9),0_0_20px_rgba(245,158,11,0.25)] rounded-2xl backdrop-blur-xl p-2.5 sm:p-3 text-white border-t border-white/20">
            {/* Top Amber Accent Line */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

            <div className="flex items-center justify-between gap-3">
              {/* Album Art & Track Info (Click opens drawer) */}
              <div 
                onClick={() => setIsExpandedDrawer(true)}
                className="flex items-center gap-2.5 truncate cursor-pointer group flex-1"
                title="Tap to browse 200+ Gospel Tracks"
              >
                <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-[#0a0a0a] border border-white/10 flex-shrink-0 group-hover:border-amber-400/80 transition-colors">
                  <img
                    src={currentTrack.albumArt || '/image_4.png'}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/image_4.png';
                    }}
                  />
                  {isPlaying && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="flex items-end gap-0.5 h-3 px-1">
                        <span className="w-0.5 bg-amber-400 animate-[bounce_1s_infinite_100ms] h-full" />
                        <span className="w-0.5 bg-amber-400 animate-[bounce_1s_infinite_300ms] h-2/3" />
                        <span className="w-0.5 bg-amber-400 animate-[bounce_1s_infinite_200ms] h-4/5" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="truncate">
                  <div className="flex items-center gap-1.5 truncate">
                    <h5 className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors font-['Outfit']">
                      {currentTrack.title}
                    </h5>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex-shrink-0">
                      GOSPEL
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono truncate">
                    <span>{currentTrack.artist}</span>
                    {currentTrack.scriptureRef && (
                      <button
                        onClick={(e) => handleScriptureClick(currentTrack.scriptureRef, e)}
                        className="text-cyan-400 hover:text-cyan-300 underline font-bold"
                        title="Read passage"
                      >
                        &bull; 📖 {currentTrack.scriptureRef}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Player Controls */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <button
                  onClick={handlePrevTrack}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Previous track"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  onClick={handleTogglePlay}
                  className="w-9 h-9 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 flex items-center justify-center font-black cursor-pointer shadow-lg shadow-amber-500/30 active:scale-95 transition-all"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-slate-950 text-slate-950" />
                  ) : (
                    <Play className="w-4 h-4 fill-slate-950 text-slate-950 ml-0.5" />
                  )}
                </button>

                <button
                  onClick={handleNextTrack}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Next track"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                {/* Browse 200+ Tracks / Expand Drawer */}
                <button
                  onClick={() => setIsExpandedDrawer(true)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 border border-white/10 transition-colors cursor-pointer ml-1"
                  title="Open 200+ Track Library"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>

                {/* Close Dock Button */}
                <button
                  onClick={onToggleOpen}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Minimize Dock"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Embedded Worship Video Screen in Dock (Plays real video/audio, NOT radio!) */}
            {currentTrack.youtubeId && isPlaying && (
              <div className="mt-2.5 rounded-xl overflow-hidden aspect-video max-h-48 w-full bg-black border border-white/10 shadow-lg animate-fadeIn">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${currentTrack.youtubeId}?autoplay=1&enablejsapi=1&rel=0`}
                  title={currentTrack.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Expanded 200+ Track Library Drawer / Modal */}
      {isExpandedDrawer && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
          onClick={() => setIsExpandedDrawer(false)}
        >
          <div 
            className="w-full max-w-2xl bg-[#070B18] border border-amber-500/50 rounded-t-3xl sm:rounded-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-slideUp text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase font-['Outfit'] text-white">
                    GOSPEL PRAISE SANCTUARY
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400">
                    200+ Consecrated Tracks &bull; Non-Stop Background Play
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onSwitchToRadio && (
                  <button
                    onClick={() => {
                      setIsExpandedDrawer(false);
                      onSwitchToRadio();
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer hover:bg-cyan-500/30"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>24/7 Radio</span>
                  </button>
                )}
                <button
                  onClick={() => setIsExpandedDrawer(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Now Playing Bar inside Drawer */}
            <div className="bg-[#0a0a0a] p-3 border-b border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 truncate">
                <img
                  src={currentTrack.albumArt || '/image_4.png'}
                  alt={currentTrack.title}
                  className="w-10 h-10 rounded-xl object-cover border border-white/10"
                />
                <div className="truncate">
                  <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block">
                    Now Playing ({currentTrackIndex + 1}/{tracks.length})
                  </span>
                  <h4 className="text-xs font-bold text-white truncate font-['Outfit']">
                    {currentTrack.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono truncate">{currentTrack.artist}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleTogglePlay}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs uppercase cursor-pointer hover:bg-amber-400 flex items-center gap-1"
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
              </div>
            </div>

            {/* Search & Categories */}
            <div className="p-3 sm:p-4 space-y-2.5 border-b border-white/10">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search 200+ gospel anthems & artists..."
                  className="w-full bg-[#0a0a0a] border border-white/10 focus:border-amber-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 font-mono outline-none"
                />
              </div>

              {/* Categories */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {GOSPEL_TRACK_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap cursor-pointer border ${
                      selectedCategory === cat
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                        : 'bg-[#0a0a0a] text-slate-300 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Track List */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 divide-y divide-white/5 space-y-1">
              {filteredTracks.map((trk, trkIdx) => {
                const actualIndex = tracks.findIndex(t => t.id === trk.id);
                const isSelected = actualIndex === currentTrackIndex;
                const isFav = favoriteTrackIds.includes(trk.id);

                return (
                  <div
                    key={`syp_${trk.id}_${trkIdx}`}
                    onClick={() => playTrackAtIndex(actualIndex)}
                    className={`p-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300' 
                        : 'hover:bg-white/5 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#0a0a0a] border border-white/10 flex-shrink-0">
                        <img 
                          src={trk.albumArt || '/image_4.png'} 
                          alt={trk.title} 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/image_4.png';
                          }}
                        />
                      </div>
                      <div className="truncate">
                        <h5 className={`text-xs font-bold truncate font-['Outfit'] ${isSelected ? 'text-amber-400' : 'text-white'}`}>
                          {trk.title}
                        </h5>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono truncate">
                          <span>{trk.artist}</span>
                          {trk.scriptureRef && (
                            <button
                              onClick={(e) => handleScriptureClick(trk.scriptureRef, e)}
                              className="text-cyan-400 hover:text-cyan-300 underline font-bold"
                            >
                              &bull; 📖 {trk.scriptureRef}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => toggleFavorite(trk.id, e)}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-400 text-rose-400' : ''}`} />
                      </button>
                      <span className="text-[10px] font-mono text-slate-400">{trk.duration}</span>
                      {isSelected && isPlaying ? (
                        <Pause className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Play className="w-4 h-4 text-slate-400 hover:text-amber-400" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
