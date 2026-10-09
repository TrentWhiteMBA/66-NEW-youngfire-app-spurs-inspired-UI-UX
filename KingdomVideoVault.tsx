import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Play, Film, Sparkles, ExternalLink, 
  Search, Heart, Flame, BookOpen, Music, Video, Radio, 
  RefreshCw, Plus, Upload, Check, ListMusic, UserCheck, 
  X, AlertCircle, Layers
} from 'lucide-react';
import { 
  SANCTUARY_VIDEOS_DATA,
  CANONICAL_MEDIA_VAULT, 
  VERIFIED_PRAISE_AND_WORSHIP,
  VERIFIED_TEACHINGS,
  MediaVaultVideo,
  cleanYouTubeId, 
  getYouTubeThumbnail 
} from '../data/sanctuaryVideosData';
import { getLatestBibleProjectVideos } from '../services/bibleProjectSync';
import { 
  subscribeToCommunityVideos, 
  subscribeToCommunityPlaylists,
  uploadVideoFile, 
  submitCommunityVideo, 
  createCommunityPlaylist,
  CommunityVideo, 
  CommunityPlaylist,
  INITIAL_CURATED_PLAYLISTS
} from '../services/videoSyncService';

export type VideoItem = MediaVaultVideo & {
  videoType?: 'youtube' | 'direct_upload';
  videoUrl?: string;
  publishedAt?: string;
  isNew?: boolean;
  uploadedBy?: { uid: string; name: string; role: string };
};

export const getYouTubeThumb = (id: string) => getYouTubeThumbnail(id, 'hq');

interface KingdomVideoVaultProps {
  currentUser?: any;
  onBack?: () => void;
  onAudioDucking?: (shouldDuck: boolean) => void;
  onFloatVideo?: (video: VideoItem) => void;
  onPlayPlaylist?: (playlist: CommunityPlaylist, videos: VideoItem[]) => void;
  onActiveVideoChange?: (video: VideoItem) => void;
}

export const KingdomVideoVault: React.FC<KingdomVideoVaultProps> = ({ 
  currentUser,
  onBack, 
  onAudioDucking, 
  onFloatVideo,
  onPlayPlaylist,
  onActiveVideoChange
}) => {
  const [baseVideos, setBaseVideos] = useState<VideoItem[]>(SANCTUARY_VIDEOS_DATA);
  const [communityVideos, setCommunityVideos] = useState<CommunityVideo[]>([]);
  const [playlists, setPlaylists] = useState<CommunityPlaylist[]>(INITIAL_CURATED_PLAYLISTS);

  const [activeVideo, setActiveVideo] = useState<VideoItem>(SANCTUARY_VIDEOS_DATA[0]);

  // Sync active video with parent App for seamless background PiP transitions
  useEffect(() => {
    if (activeVideo && onActiveVideoChange) {
      onActiveVideoChange(activeVideo);
    }
  }, [activeVideo, onActiveVideoChange]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All Videos');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [visibleCount, setVisibleCount] = useState(36);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);

  // Video Submission Form State
  const [submitType, setSubmitType] = useState<'youtube' | 'direct_upload'>('youtube');
  const [submitTitle, setSubmitTitle] = useState('');
  const [submitCategory, setSubmitCategory] = useState<'Worship' | 'Testimony' | 'Exhortation' | 'Bible Study'>('Worship');
  const [submitYoutubeUrl, setSubmitYoutubeUrl] = useState('');
  const [submitDescription, setSubmitDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Playlist Builder Form State
  const [playlistTitle, setPlaylistTitle] = useState('');
  const [playlistDesc, setPlaylistDesc] = useState('');
  const [selectedVideoIdsForPlaylist, setSelectedVideoIdsForPlaylist] = useState<string[]>([]);
  const [playlistSearch, setPlaylistSearch] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  const [savedFavorites, setSavedFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('youngfire_video_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [brokenVideoIds, setBrokenVideoIds] = useState<Set<string>>(new Set());

  const markVideoBroken = (videoId: string) => {
    setBrokenVideoIds((prev) => {
      if (prev.has(videoId)) return prev;
      const next = new Set(prev);
      next.add(videoId);
      return next;
    });
  };

  // 1. Ingest verified BibleProject catalog from https://bibleproject.com/videos/all/ on mount
  useEffect(() => {
    let isMounted = true;
    setIsSyncing(true);

    getLatestBibleProjectVideos()
      .then((bpVideos) => {
        if (!isMounted) return;
        const rawList: VideoItem[] = [
          ...VERIFIED_PRAISE_AND_WORSHIP,
          ...bpVideos,
          ...VERIFIED_TEACHINGS
        ];
        // Strictly deduplicate by YouTube ID or video ID
        const dedupedMap = new Map<string, VideoItem>();
        rawList.forEach((v) => {
          const ytKey = cleanYouTubeId(v.youtubeId || '');
          const key = ytKey || v.id;
          if (key && !dedupedMap.has(key)) {
            dedupedMap.set(key, v);
          }
        });
        setBaseVideos(Array.from(dedupedMap.values()));
        setIsSyncing(false);
      })
      .catch((err) => {
        console.warn('[KingdomVideoVault] RSS Sync notice:', err);
        setIsSyncing(false);
      });

    return () => { isMounted = false; };
  }, []);

  // 2. Real-time Firestore sync for Community Videos
  useEffect(() => {
    const unsubVideos = subscribeToCommunityVideos((cloudVideos) => {
      setCommunityVideos(cloudVideos);
    });
    return () => unsubVideos();
  }, []);

  // 3. Real-time Firestore sync for Community Playlists
  useEffect(() => {
    const unsubPlaylists = subscribeToCommunityPlaylists((cloudPlaylists) => {
      setPlaylists(cloudPlaylists);
    });
    return () => unsubPlaylists();
  }, []);

  // Combine base canonical videos with community submissions & purge broken thumbnails/videos
  const allVideos: VideoItem[] = React.useMemo(() => {
    const combined: VideoItem[] = [
      ...communityVideos.map(cv => ({
        id: cv.id,
        title: cv.title,
        category: cv.category,
        videoType: cv.videoType,
        videoUrl: cv.videoUrl,
        youtubeId: cv.youtubeId || '',
        thumbnailUrl: cv.thumbnailUrl,
        speaker: cv.uploadedBy.name,
        artist: cv.uploadedBy.name,
        duration: cv.duration || 'Video',
        description: cv.description,
        thematicFocus: cv.description,
        isNew: true,
        uploadedBy: cv.uploadedBy
      })),
      ...baseVideos
    ];

    const seenKeys = new Set<string>();
    return combined.filter((v) => {
      if (!v || !v.id || brokenVideoIds.has(v.id)) return false;
      const cleanYt = cleanYouTubeId(v.youtubeId || '');
      const isDirect = v.videoType === 'direct_upload' && Boolean(v.videoUrl);
      if (!isDirect && cleanYt.length !== 11) return false;
      const key = cleanYt || v.id;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });
  }, [communityVideos, baseVideos, brokenVideoIds]);

  // Ensure activeVideo is always a valid non-broken video
  useEffect(() => {
    if (activeVideo && brokenVideoIds.has(activeVideo.id) && allVideos.length > 0) {
      setActiveVideo(allVideos[0]);
    }
  }, [brokenVideoIds, activeVideo, allVideos]);

  // Clean Top Stadium Filter Pills:
  // [ All Videos ] | [ Old Testament ] | [ New Testament ] | [ Themes & Theology ] | [ How to Read ] | [ Word Studies ] | [ Praise & Worship ]
  const STADIUM_CATEGORIES = [
    'All Videos',
    'Old Testament',
    'New Testament',
    'Themes & Theology',
    'How to Read',
    'Word Studies',
    'Praise & Worship'
  ] as const;

  const handleSelectVideo = (v: VideoItem) => {
    setActiveVideo(v);
    if (onAudioDucking) onAudioDucking(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePopoutFloat = (v: VideoItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFloatVideo) {
      onFloatVideo(v);
    } else {
      window.dispatchEvent(new CustomEvent('yf_play_video', {
        detail: {
          video: {
            id: v.id,
            youtubeId: v.youtubeId,
            videoUrl: v.videoUrl,
            videoType: v.videoType,
            title: v.title,
            speaker: v.speaker || v.artist || (v as any).uploadedBy?.name || 'YoungFire Sanctuary',
            series: v.series || v.category,
            duration: v.duration,
            category: v.category,
            thumbnailUrl: v.thumbnailUrl || (v.youtubeId ? `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg` : '/image_4.png'),
            description: v.description || v.thematicFocus || '',
            streamUrl: v.videoUrl || (v.youtubeId ? `https://www.youtube.com/watch?v=${v.youtubeId}` : '')
          }
        }
      }));
    }
  };

  const handleStartPlaylistPlayback = (playlist: CommunityPlaylist) => {
    // Resolve videos matching videoIds in exact order
    const resolved: VideoItem[] = [];
    playlist.videoIds.forEach(vid => {
      const match = allVideos.find(v => v.id === vid || (v.youtubeId && v.youtubeId === vid));
      if (match) resolved.push(match);
    });

    if (resolved.length === 0) return;

    if (onPlayPlaylist) {
      onPlayPlaylist(playlist, resolved);
    } else {
      window.dispatchEvent(new CustomEvent('yf_play_playlist', {
        detail: {
          title: playlist.title,
          videos: resolved
        }
      }));
    }
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedFavorites.includes(id)
      ? savedFavorites.filter(favId => favId !== id)
      : [...savedFavorites, id];
    setSavedFavorites(updated);
    try {
      localStorage.setItem('youngfire_video_favorites', JSON.stringify(updated));
    } catch {}
  };

  // Video Submission Handler
  const handleSubmitVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!currentUser) {
      setSubmitError('Please sign in to your sanctuary account to submit community media.');
      return;
    }
    if (!submitTitle.trim()) {
      setSubmitError('Please provide a title for the video.');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalVideoUrl = '';
      let parsedYoutubeId: string | undefined = undefined;

      if (submitType === 'youtube') {
        const cleanedId = cleanYouTubeId(submitYoutubeUrl);
        if (!cleanedId || cleanedId.length !== 11) {
          throw new Error('Please enter a valid YouTube video link or 11-character video ID.');
        }
        parsedYoutubeId = cleanedId;
        finalVideoUrl = `https://www.youtube.com/watch?v=${cleanedId}`;
      } else {
        if (!selectedFile) {
          throw new Error('Please select an .mp4 or .mov video file to upload.');
        }
        finalVideoUrl = await uploadVideoFile(selectedFile, (pct) => setUploadProgress(pct));
      }

      const newVideo = await submitCommunityVideo({
        title: submitTitle.trim(),
        category: submitCategory,
        videoType: submitType,
        videoUrl: finalVideoUrl,
        youtubeId: parsedYoutubeId,
        thumbnailUrl: parsedYoutubeId ? `https://img.youtube.com/vi/${parsedYoutubeId}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=600&q=80',
        uploadedBy: {
          uid: currentUser.id || currentUser.uid || 'usr_sanctuary',
          name: currentUser.displayName || currentUser.name || 'Sanctuary Disciple',
          role: currentUser.role || 'Member'
        },
        duration: submitType === 'youtube' ? 'Video' : 'Upload',
        description: submitDescription.trim() || undefined
      });

      // Reset form and close
      setSubmitTitle('');
      setSubmitYoutubeUrl('');
      setSubmitDescription('');
      setSelectedFile(null);
      setUploadProgress(null);
      setIsSubmitModalOpen(false);
      setActiveVideo(newVideo as any);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit video. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Playlist Builder Handler
  const handleSavePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert('Please sign in to create and publish playlists.');
      return;
    }
    if (!playlistTitle.trim()) {
      alert('Please enter a title for your playlist.');
      return;
    }
    if (selectedVideoIdsForPlaylist.length === 0) {
      alert('Please select at least 1 video for this playlist.');
      return;
    }

    setIsCreatingPlaylist(true);
    try {
      // Find first video thumbnail as cover
      const firstVid = allVideos.find(v => v.id === selectedVideoIdsForPlaylist[0] || v.youtubeId === selectedVideoIdsForPlaylist[0]);
      const cover = firstVid?.thumbnailUrl || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=600&q=80';

      await createCommunityPlaylist({
        title: playlistTitle.trim(),
        description: playlistDesc.trim() || 'Curated sanctuary worship & discipleship playlist.',
        coverThumbnailUrl: cover,
        videoIds: selectedVideoIdsForPlaylist,
        createdBy: {
          uid: currentUser.id || currentUser.uid || 'usr_sanctuary',
          name: currentUser.displayName || currentUser.name || 'Sanctuary Disciple'
        },
        isPublic: true
      });

      // Reset & close
      setPlaylistTitle('');
      setPlaylistDesc('');
      setSelectedVideoIdsForPlaylist([]);
      setIsPlaylistModalOpen(false);
    } catch (err) {
      console.error('Failed to create playlist:', err);
    } finally {
      setIsCreatingPlaylist(false);
    }
  };

  const filteredVideos = allVideos.filter(v => {
    if (showOnlyFavorites && !savedFavorites.includes(v.id)) return false;
    
    let matchesCategory = false;
    if (selectedCategory === 'All Videos') {
      matchesCategory = true;
    } else if (selectedCategory === 'Old Testament') {
      matchesCategory = v.category === 'Old Testament' || Boolean(v.series?.toLowerCase().includes('old testament'));
    } else if (selectedCategory === 'New Testament') {
      matchesCategory = v.category === 'New Testament' || Boolean(v.series?.toLowerCase().includes('new testament'));
    } else if (selectedCategory === 'Themes & Theology') {
      matchesCategory = v.category === 'Themes & Theology' || v.category === 'Biblical Themes' || Boolean(v.series?.toLowerCase().includes('theme'));
    } else if (selectedCategory === 'How to Read') {
      matchesCategory = v.category === 'How to Read' || Boolean(v.series?.toLowerCase().includes('how to read'));
    } else if (selectedCategory === 'Word Studies') {
      matchesCategory = v.category === 'Word Studies' || Boolean(v.series?.toLowerCase().includes('word study'));
    } else if (selectedCategory === 'Praise & Worship') {
      matchesCategory = v.category === 'Praise & Worship' || v.category === 'Worship';
    } else if (selectedCategory === 'Community') {
      matchesCategory = Boolean((v as any).uploadedBy || (v as any).videoType);
    } else {
      matchesCategory = v.category?.toLowerCase() === selectedCategory.toLowerCase();
    }
    
    const matchesSearch = 
      (v.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.speaker || v.artist || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.thematicFocus || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.series || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 pb-28 select-none px-2 sm:px-4 font-['Outfit']">
      
      {/* Top Header with High-Contrast Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={() => {
                if (onAudioDucking) onAudioDucking(false);
                onBack();
              }}
              className="p-2 rounded-xl bg-[#0a0a0a] border border-white/15 text-slate-200 hover:text-white cursor-pointer transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white">
                WORSHIP SANCTUARY VIDEO VAULT
              </h2>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              Cloud Media Uploads &bull; Shared Playlists &bull; Real-Time Multi-Device Sync
            </p>
          </div>
        </div>

        {/* High-Contrast Obsidian & Flame Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {isSyncing && (
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-amber-400 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Syncing...</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-black hover:bg-zinc-900 border-2 border-amber-400 text-amber-300 hover:text-amber-200 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(245,158,11,0.25)] active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Submit Video</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPlaylistModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-black hover:bg-zinc-900 border-2 border-orange-500 text-orange-300 hover:text-orange-200 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(234,88,12,0.25)] active:scale-95 cursor-pointer"
          >
            <ListMusic className="w-3.5 h-3.5 text-orange-400" />
            <span>+ Create Playlist</span>
          </button>
        </div>
      </div>

      {/* Official JHOW Links Banner */}
      <div className="p-3 rounded-2xl bg-black border border-white/10 flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-400" />
          <span className="text-amber-400 font-bold uppercase text-[10px] tracking-wider">
            Joshua House of Worship Official:
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="https://joshuahouseofworship.org/?gad_source=1"
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3 h-3 text-amber-400" />
            <span>JHOW Website</span>
          </a>
          <a
            href="https://www.youtube.com/@JoshuaHouseOfWorshipSanAntonio"
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3 h-3 text-rose-400" />
            <span>JHOW YouTube</span>
          </a>
          <a
            href="https://bibleproject.com/videos/all/"
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 flex items-center gap-1.5 transition-colors"
          >
            <BookOpen className="w-3 h-3 text-cyan-400" />
            <span>BibleProject Series</span>
          </a>
        </div>
      </div>

      {/* Main Docked Video Player (16:9 Aspect Ratio) */}
      <div className="bg-[#080808] border border-amber-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl">
          {activeVideo.videoType === 'direct_upload' || activeVideo.videoUrl?.includes('firebasestorage') ? (
            <video
              src={activeVideo.videoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain bg-black"
            />
          ) : (
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${cleanYouTubeId(activeVideo.youtubeId)}?autoplay=1&rel=0`}
              title={activeVideo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  {activeVideo.category}
                </span>
                {activeVideo.isNew && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-black bg-cyan-500 text-black shadow-sm">
                    NEW
                  </span>
                )}
                {activeVideo.series && (
                  <span className="text-xs font-mono text-slate-400">
                    &bull; {activeVideo.series}
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-1">
                {activeVideo.title}
              </h3>
              <p className="text-xs font-mono text-slate-300">
                {activeVideo.speaker || activeVideo.artist || (activeVideo as any).uploadedBy?.name} &bull; {activeVideo.duration}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => handlePopoutFloat(activeVideo, e)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/15 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                title="Watch in Floating Picture-in-Picture Player"
              >
                <Video className="w-3.5 h-3.5 text-cyan-400" />
                <span>Float PiP</span>
              </button>
              <button
                type="button"
                onClick={(e) => toggleFavorite(activeVideo.id, e)}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  savedFavorites.includes(activeVideo.id)
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
                title="Toggle Favorite"
              >
                <Heart className={`w-4 h-4 ${savedFavorites.includes(activeVideo.id) ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {activeVideo.thematicFocus && (
            <p className="text-xs text-slate-400 leading-relaxed pt-1 border-t border-white/5">
              {activeVideo.thematicFocus}
            </p>
          )}

          {activeVideo.lyricsText && (
            <div className="mt-3 p-3 rounded-xl bg-black/60 border border-white/5 space-y-1">
              <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block">
                Lyric Excerpt:
              </span>
              <p className="text-xs text-slate-300 whitespace-pre-line font-mono italic leading-relaxed">
                {activeVideo.lyricsText}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CURATED PLAYLISTS SHELF (Real-Time Shared Across Devices) */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-orange-400" />
            <h3 className="text-xs sm:text-sm font-black uppercase font-mono tracking-wider text-white">
              Shared Sanctuary Playlists ({playlists.length})
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Auto-Queue Continuous Playback
          </span>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 pt-1">
          {playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => handleStartPlaylistPlayback(pl)}
              className="flex-shrink-0 w-64 sm:w-72 p-3 rounded-2xl bg-black border border-white/10 hover:border-amber-400/80 transition-all cursor-pointer group shadow-lg hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] flex flex-col justify-between"
            >
              <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-900 mb-2">
                <img
                  src={pl.coverThumbnailUrl}
                  alt={pl.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/35 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                  <div className="w-9 h-9 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/85 text-[10px] font-mono text-amber-300 font-bold backdrop-blur-sm border border-white/10">
                  {pl.videoIds.length} Videos
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                  {pl.title}
                </h4>
                <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                  {pl.description}
                </p>
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mt-2 pt-1.5 border-t border-white/5">
                  <span>By {pl.createdBy.name}</span>
                  <span className="text-amber-400 font-bold">Play Queue &rarr;</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search & Stadium Categories Toolbar */}
      <div className="space-y-3 pt-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search BibleProject series, praise anthems, community uploads, or teachers..."
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 shadow-inner"
          />
        </div>

        {/* Stadium Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {STADIUM_CATEGORIES.map((cat: string) => {
            let count = 0;
            if (cat === 'All Videos') {
              count = allVideos.length;
            } else if (cat === 'Old Testament') {
              count = allVideos.filter(v => v.category === 'Old Testament' || Boolean(v.series?.toLowerCase().includes('old testament'))).length;
            } else if (cat === 'New Testament') {
              count = allVideos.filter(v => v.category === 'New Testament' || Boolean(v.series?.toLowerCase().includes('new testament'))).length;
            } else if (cat === 'Themes & Theology') {
              count = allVideos.filter(v => v.category === 'Themes & Theology' || v.category === 'Biblical Themes' || Boolean(v.series?.toLowerCase().includes('theme'))).length;
            } else if (cat === 'How to Read') {
              count = allVideos.filter(v => v.category === 'How to Read' || Boolean(v.series?.toLowerCase().includes('how to read'))).length;
            } else if (cat === 'Word Studies') {
              count = allVideos.filter(v => v.category === 'Word Studies' || Boolean(v.series?.toLowerCase().includes('word study'))).length;
            } else if (cat === 'Praise & Worship') {
              count = allVideos.filter(v => v.category === 'Praise & Worship' || v.category === 'Worship').length;
            } else {
              count = allVideos.filter(v => v.category?.toLowerCase() === cat.toLowerCase()).length;
            }

            const isSelected = !showOnlyFavorites && selectedCategory === cat;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setShowOnlyFavorites(false);
                  setSelectedCategory(cat);
                  setVisibleCount(36);
                }}
                className={`px-4 py-2 rounded-full text-xs font-mono font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                    : 'bg-black/60 text-slate-300 hover:text-white border-white/15 hover:border-white/30'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isSelected ? 'bg-black/25 text-black' : 'bg-white/10 text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
            className={`px-4 py-2 rounded-full text-xs font-mono font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 border ml-auto ${
              showOnlyFavorites
                ? 'bg-rose-500 text-black border-rose-400 font-bold shadow-md'
                : 'bg-black/60 text-rose-300 hover:text-white border-rose-500/30'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-black text-black' : 'text-rose-400'}`} />
            <span>Favorites ({savedFavorites.length})</span>
          </button>
        </div>
      </div>

      {/* Video Cards Grid */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1 text-xs font-mono text-slate-400">
          <span>Showing {Math.min(visibleCount, filteredVideos.length)} of {filteredVideos.length} Videos</span>
          {savedFavorites.length > 0 && <span>{savedFavorites.length} Saved in Favorites</span>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {filteredVideos.slice(0, visibleCount).map((video, idx) => {
            const isActive = activeVideo.id === video.id;
            const isFav = savedFavorites.includes(video.id);

            return (
              <div
                key={`kvv_${video.id}_${video.youtubeId || 'vid'}_${idx}`}
                onClick={() => handleSelectVideo(video)}
                className={`rounded-2xl overflow-hidden border transition-all cursor-pointer group bg-[#0a0a0a] flex flex-col justify-between hover:scale-[1.01] ${
                  isActive ? 'border-amber-400 shadow-xl shadow-amber-500/20' : 'border-white/10 hover:border-white/30'
                }`}
              >
                {/* 16:9 Thumbnail Image */}
                <div className="relative aspect-video overflow-hidden bg-black">
                  <img
                    src={video.thumbnailUrl || (video.youtubeId ? `https://img.youtube.com/vi/${cleanYouTubeId(video.youtubeId)}/hqdefault.jpg` : '')}
                    alt={video.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      // YouTube's 404 placeholder is 120x90; purge any broken thumbnail/video immediately
                      if (img.naturalWidth > 0 && img.naturalWidth <= 120) {
                        markVideoBroken(video.id);
                      }
                    }}
                    onError={() => {
                      markVideoBroken(video.id);
                    }}
                    className="w-full h-full object-cover object-center filter brightness-95 group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Play Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Duration Badge */}
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/85 text-[10px] font-mono text-white font-bold backdrop-blur-sm">
                    {video.duration}
                  </div>

                  {/* Category Pill Tag & NEW Badge */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <div className="px-2 py-0.5 rounded-full bg-black/85 border border-white/20 text-[9px] font-mono text-amber-300 font-bold backdrop-blur-sm">
                      {video.category}
                    </div>
                    {video.isNew && (
                      <div className="px-1.5 py-0.5 rounded-md bg-cyan-400 text-black text-[9px] font-mono font-black shadow-md">
                        NEW
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Meta Content */}
                <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug">
                      {video.title}
                    </h4>
                    <p className="text-[11px] font-mono text-slate-400 mt-1 truncate">
                      {video.speaker || video.artist || (video as any).uploadedBy?.name}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] font-mono text-slate-500">
                    <button
                      type="button"
                      onClick={(e) => handlePopoutFloat(video, e)}
                      className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                      title="Float in PiP window"
                    >
                      <Video className="w-3 h-3" />
                      <span>PiP</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(video.id, e)}
                      className="p-1 hover:text-white transition-colors cursor-pointer"
                      title="Favorite"
                    >
                      <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500 text-rose-500' : 'text-slate-500'}`} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Load More Pagination */}
        {filteredVideos.length > visibleCount && (
          <div className="text-center pt-4">
            <button
              type="button"
              onClick={() => setVisibleCount(prev => prev + 24)}
              className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold border border-white/15 transition-all cursor-pointer active:scale-95"
            >
              Load More Videos ({filteredVideos.length - visibleCount} Remaining)
            </button>
          </div>
        )}
      </div>

      {/* ========================================================
          MODAL 1: VIDEO CONTRIBUTION MODAL (YouTube or File Upload)
          ======================================================== */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#090909] border-2 border-amber-400/80 shadow-[0_0_60px_rgba(245,158,11,0.35)] p-5 sm:p-6 space-y-4 text-white">
            
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" />
                <h3 className="text-base sm:text-lg font-black uppercase font-mono tracking-wider text-white">
                  Contribute Sanctuary Media
                </h3>
              </div>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Check Banner */}
            {!currentUser && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs font-mono text-amber-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>You must be signed in to publish community media across devices.</span>
              </div>
            )}

            <form onSubmit={handleSubmitVideo} className="space-y-4">
              {/* Option Tabs: YouTube Link vs Direct File Upload */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black border border-white/10">
                <button
                  type="button"
                  onClick={() => setSubmitType('youtube')}
                  className={`py-2 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer ${
                    submitType === 'youtube'
                      ? 'bg-amber-400 text-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Option A: YouTube Link
                </button>
                <button
                  type="button"
                  onClick={() => setSubmitType('direct_upload')}
                  className={`py-2 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer ${
                    submitType === 'direct_upload'
                      ? 'bg-amber-400 text-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Option B: Direct File Upload
                </button>
              </div>

              {/* Title Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-300 uppercase font-bold">
                  Video Title *
                </label>
                <input
                  type="text"
                  required
                  value={submitTitle}
                  onChange={(e) => setSubmitTitle(e.target.value)}
                  placeholder="e.g. Testimony of Divine Healing at JHOW"
                  className="w-full px-3.5 py-2 rounded-xl bg-black border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Category Dropdown */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-300 uppercase font-bold">
                  Category *
                </label>
                <select
                  value={submitCategory}
                  onChange={(e) => setSubmitCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl bg-black border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="Worship">Worship</option>
                  <option value="Testimony">Testimony</option>
                  <option value="Exhortation">Exhortation</option>
                  <option value="Bible Study">Bible Study</option>
                </select>
              </div>

              {/* Content Specific Input */}
              {submitType === 'youtube' ? (
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-300 uppercase font-bold">
                    YouTube URL or ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={submitYoutubeUrl}
                    onChange={(e) => setSubmitYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3.5 py-2 rounded-xl bg-black border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  {submitYoutubeUrl && cleanYouTubeId(submitYoutubeUrl).length === 11 && (
                    <div className="mt-2 flex items-center gap-2.5 p-2 rounded-xl bg-white/5 border border-white/10">
                      <img
                        src={`https://img.youtube.com/vi/${cleanYouTubeId(submitYoutubeUrl)}/hqdefault.jpg`}
                        alt="Preview"
                        referrerPolicy="no-referrer"
                        className="w-16 h-10 object-cover rounded-lg"
                      />
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                        &check; Verified YouTube ID: {cleanYouTubeId(submitYoutubeUrl)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-300 uppercase font-bold">
                    Video File (.mp4 or .mov) *
                  </label>
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime"
                    required
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    className="w-full px-3.5 py-2 rounded-xl bg-black border border-white/15 text-xs text-white file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-mono file:bg-amber-400 file:text-black cursor-pointer"
                  />
                  {uploadProgress !== null && (
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[10px] font-mono text-amber-400">
                        <span>Uploading to Firebase Cloud...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div 
                          className="h-full bg-amber-400 transition-all duration-200" 
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-300 uppercase font-bold">
                  Description / Thematic Exhortation
                </label>
                <textarea
                  rows={2}
                  value={submitDescription}
                  onChange={(e) => setSubmitDescription(e.target.value)}
                  placeholder="Scriptures referenced or brief reflection..."
                  className="w-full px-3.5 py-2 rounded-xl bg-black border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {submitError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
                  {submitError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Publishing to Cloud...' : 'Publish Video & Sync'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: PLAYLIST CREATOR MODAL (Select from all videos)
          ======================================================== */}
      {isPlaylistModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-[#090909] border-2 border-orange-500/80 shadow-[0_0_60px_rgba(234,88,12,0.35)] p-5 sm:p-6 space-y-4 text-white overflow-hidden">
            
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ListMusic className="w-5 h-5 text-orange-400" />
                <h3 className="text-base sm:text-lg font-black uppercase font-mono tracking-wider text-white">
                  Create Shared Playlist
                </h3>
              </div>
              <button
                onClick={() => setIsPlaylistModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlaylist} className="flex-1 flex flex-col min-h-0 space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-300 uppercase font-bold">
                    Playlist Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={playlistTitle}
                    onChange={(e) => setPlaylistTitle(e.target.value)}
                    placeholder="e.g. YoungFire Friday Altar Encounter"
                    className="w-full px-3.5 py-2 rounded-xl bg-black border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-300 uppercase font-bold">
                    Description
                  </label>
                  <input
                    type="text"
                    value={playlistDesc}
                    onChange={(e) => setPlaylistDesc(e.target.value)}
                    placeholder="Curated praise, testimonies, and apostolic teachings."
                    className="w-full px-3.5 py-2 rounded-xl bg-black border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-400"
                  />
                </div>
              </div>

              {/* Video Picker Section */}
              <div className="flex-1 flex flex-col min-h-0 space-y-2 border-t border-white/10 pt-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="font-bold text-slate-300 uppercase">
                    Select Videos ({selectedVideoIdsForPlaylist.length} Selected)
                  </span>
                  <input
                    type="text"
                    value={playlistSearch}
                    onChange={(e) => setPlaylistSearch(e.target.value)}
                    placeholder="Search videos..."
                    className="px-2.5 py-1 rounded-lg bg-black border border-white/15 text-[10px] text-white placeholder-slate-500 w-36 focus:outline-none focus:border-orange-400"
                  />
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar space-y-1.5 pr-1 max-h-56 bg-black/60 rounded-2xl p-2 border border-white/5">
                  {allVideos
                    .filter(v => 
                      v.title.toLowerCase().includes(playlistSearch.toLowerCase()) || 
                      v.category.toLowerCase().includes(playlistSearch.toLowerCase())
                    )
                    .map((vid) => {
                      const isChecked = selectedVideoIdsForPlaylist.includes(vid.id);
                      return (
                        <div
                          key={`pl_picker_${vid.id}`}
                          onClick={() => {
                            setSelectedVideoIdsForPlaylist(prev => 
                              isChecked ? prev.filter(id => id !== vid.id) : [...prev, vid.id]
                            );
                          }}
                          className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-all ${
                            isChecked ? 'bg-orange-500/20 border border-orange-500/50' : 'bg-white/5 hover:bg-white/10 border border-transparent'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                            isChecked ? 'bg-orange-500 border-orange-400 text-black' : 'border-white/30'
                          }`}>
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>

                          <img
                            src={vid.thumbnailUrl || (vid.youtubeId ? `https://img.youtube.com/vi/${vid.youtubeId}/hqdefault.jpg` : '/image_4.png')}
                            alt={vid.title}
                            referrerPolicy="no-referrer"
                            className="w-12 h-7 object-cover rounded"
                          />

                          <div className="flex-1 min-w-0">
                            <h5 className="text-[11px] font-bold text-white truncate">
                              {vid.title}
                            </h5>
                            <span className="text-[9px] font-mono text-slate-400">
                              {vid.category}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsPlaylistModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingPlaylist || selectedVideoIdsForPlaylist.length === 0}
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-mono text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingPlaylist ? 'Publishing to Cloud...' : 'Publish Shared Playlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default KingdomVideoVault;
