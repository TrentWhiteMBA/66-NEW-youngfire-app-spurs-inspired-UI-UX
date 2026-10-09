import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BibleBook, BookmarkedVerse, VerseItem, HighlightColor } from '../types/scripture';
import { BIBLE_BOOKS, findBibleBook } from '../data/bibleBooks';
import {
  BIBLE_TRANSLATIONS,
  HIGHLIGHT_COLORS,
  fetchChapterVerses,
  getSavedBookmarks,
  getSavedHighlights,
  saveHighlightToFirestore,
  deleteBookmarkFromFirestore,
  saveBookmarkToFirestore
} from '../services/scriptureService';
import { BookDirectoryModal } from './BookDirectoryModal';
import { BookmarksDrawer } from './BookmarksDrawer';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Copy,
  Check,
  Search,
  Maximize2,
  Minimize2,
  Edit3,
  Layers,
  Trash2,
  CheckCircle2,
  X,
  ChevronDown
} from 'lucide-react';

export interface ScriptureViewerProps {
  initialBookId?: string;
  initialChapter?: number;
  initialVerse?: number;
  onSelectPassage?: (bookId: string, chapter: number, verse?: number) => void;
  onBack?: () => void;
  backLabel?: string;
  onOpenNotes?: (passage?: string, title?: string) => void;
}

export const ScriptureViewer: React.FC<ScriptureViewerProps> = ({
  initialBookId = 'JHN',
  initialChapter = 2,
  initialVerse,
  onSelectPassage,
  onBack,
  backLabel,
  onOpenNotes
}) => {
  // Navigation State
  const [selectedBook, setSelectedBook] = useState<BibleBook>(() => {
    return findBibleBook(initialBookId) || BIBLE_BOOKS.find(b => b.id === initialBookId) || BIBLE_BOOKS[42]; // John as default
  });
  const [currentChapter, setCurrentChapter] = useState<number>(initialChapter);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isBookmarksDrawerOpen, setIsBookmarksDrawerOpen] = useState(false);
  const [isBookListMinimized, setIsBookListMinimized] = useState<boolean>(() => {
    try {
      return localStorage.getItem('yf_bible_book_list_minimized') === 'true';
    } catch {
      return false;
    }
  });

  // Translation & Text Size
  const [translation, setTranslation] = useState<string>(() => {
    return localStorage.getItem('yf_bible_version') || 'kjv';
  });
  const [textSize, setTextSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [testamentFilter, setTestamentFilter] = useState<'ALL' | 'OT' | 'NT'>('ALL');

  // Verses State
  const [verses, setVerses] = useState<VerseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [copiedVerseNum, setCopiedVerseNum] = useState<number | null>(null);

  // Fullscreen / Sanctuary Takeover Mode
  const [isSanctuaryMode, setIsSanctuaryMode] = useState(false);

  // Highlight & Stacking Context State
  // highlights is a record: { [verseKey]: colorId } where verseKey is `${bookId}_${chapter}_${verseNumber}`
  const [highlights, setHighlights] = useState<Record<string, string>>(() => getSavedHighlights());
  const [bookmarks, setBookmarks] = useState<BookmarkedVerse[]>(() => getSavedBookmarks());
  const [activePopoverVerse, setActivePopoverVerse] = useState<number | null>(null);

  // Audio Recitation State
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>(() => {
    return localStorage.getItem('yf_preferred_voice') || '';
  });
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [currentReadingVerse, setCurrentReadingVerse] = useState<number | null>(null);
  const [speechRate, setSpeechRate] = useState<number>(0.95);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  // Refs for speech synthesis
  const speechCancelledRef = useRef(false);
  const currentVerseIndexRef = useRef(0);
  const versesRef = useRef<VerseItem[]>([]);
  const popoverContainerRef = useRef<HTMLDivElement | null>(null);
  const targetVerseRef = useRef<number | null>(initialVerse ? Number(initialVerse) : null);

  useEffect(() => {
    versesRef.current = verses;
  }, [verses]);

  const lastSyncedPropRef = useRef<string>('');

  // Sync with prop changes (only when props genuinely change from outside)
  useEffect(() => {
    const propKey = `${initialBookId || ''}_${initialChapter || 1}_${initialVerse || ''}`;
    if (propKey === lastSyncedPropRef.current) return;
    lastSyncedPropRef.current = propKey;

    if (initialBookId) {
      const book = findBibleBook(initialBookId) || BIBLE_BOOKS.find(b => b.id.toUpperCase() === initialBookId.toUpperCase());
      if (book) {
        setSelectedBook(book);
        setCurrentChapter(initialChapter || 1);
      }
    }
    if (initialVerse) {
      targetVerseRef.current = Number(initialVerse);
    }
  }, [initialBookId, initialChapter, initialVerse]);

  // Listen for global deep-link scripture events across all tabs (AI Mentor, Atlas badges, etc.)
  useEffect(() => {
    const handleGlobalNavigate = (e: any) => {
      const detail = e.detail;
      if (detail && detail.bookId) {
        const book = findBibleBook(detail.bookId) || BIBLE_BOOKS.find(b => b.id.toUpperCase() === detail.bookId.toUpperCase());
        if (book) {
          const ch = Number(detail.chapter) || 1;
          const v = detail.verse ? Number(detail.verse) : undefined;
          lastSyncedPropRef.current = `${detail.bookId}_${ch}_${v || ''}`;
          setSelectedBook(book);
          setCurrentChapter(ch);
          if (v) {
            targetVerseRef.current = v;
          }
          if (onSelectPassage) {
            onSelectPassage(book.id, ch, v);
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    };
    window.addEventListener('yf_navigate_scripture', handleGlobalNavigate);
    return () => window.removeEventListener('yf_navigate_scripture', handleGlobalNavigate);
  }, [onSelectPassage]);

  // When chapter verses finish loading or target verse is requested, automatically scroll right to the target verse
  useEffect(() => {
    if (!isLoading && verses.length > 0 && targetVerseRef.current) {
      const targetVerseNum = targetVerseRef.current;
      targetVerseRef.current = null; // Clear immediately so scroll is only attempted once and never blocks user scrolling
      const attemptScroll = (attemptsLeft: number) => {
        const el = document.getElementById(`verse-${targetVerseNum}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-amber-400', 'bg-amber-500/25');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-amber-400', 'bg-amber-500/25');
          }, 3500);
        } else if (attemptsLeft > 0) {
          setTimeout(() => attemptScroll(attemptsLeft - 1), 100);
        }
      };
      setTimeout(() => attemptScroll(5), 80);
    }
  }, [verses, isLoading]);

  // Toast Notification state
  const [toastNotification, setToastNotification] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastNotification(msg);
    setTimeout(() => {
      setToastNotification(null);
    }, 2800);
  };

  // Click-outside listener for highlight popover to ensure clean stacking dismissal without dropping touch taps
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        popoverContainerRef.current &&
        !popoverContainerRef.current.contains(e.target as Node)
      ) {
        const target = e.target as HTMLElement | null;
        if (!target?.closest('[data-highlight-trigger]') && !target?.closest('[data-verse-item]')) {
          setActivePopoverVerse(null);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activePopoverVerse !== null) {
          setActivePopoverVerse(null);
        } else if (isSanctuaryMode) {
          setIsSanctuaryMode(false);
        }
      }
    };

    document.addEventListener('click', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePopoverVerse, isSanctuaryMode]);

  // Subscribe to real-time Firestore saved scriptures & bookmarks updates
  useEffect(() => {
    const handleStorageUpdate = (e: any) => {
      if (e.detail) {
        if (e.detail.bookmarks) setBookmarks(e.detail.bookmarks);
        if (e.detail.highlights) setHighlights(e.detail.highlights);
      } else {
        setBookmarks(getSavedBookmarks());
        setHighlights(getSavedHighlights());
      }
    };

    window.addEventListener('yf_saved_scriptures_updated', handleStorageUpdate);
    return () => {
      window.removeEventListener('yf_saved_scriptures_updated', handleStorageUpdate);
    };
  }, []);

  // Fetch chapter verses whenever book, chapter, or translation changes
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    stopAudio();

    fetchChapterVerses(selectedBook.id, currentChapter, selectedBook.name, translation)
      .then(data => {
        if (active) {
          setVerses(data);
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load verses:', err);
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedBook.id, selectedBook.name, currentChapter, translation]);

  // Audio Speech Synthesis Voice Loading
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;

      const englishVoices = voices
        .filter(v => v.lang.toLowerCase().startsWith('en'))
        .sort((a, b) => {
          const score = (v: SpeechSynthesisVoice) => {
            const name = v.name.toLowerCase();
            let s = 0;
            if (name.includes('natural') || name.includes('neural')) s += 50;
            if (name.includes('google') || name.includes('premium')) s += 40;
            if (name.includes('guy') || name.includes('daniel') || name.includes('serena')) s += 30;
            return s;
          };
          return score(b) - score(a);
        });

      setAvailableVoices(englishVoices);

      const stored = localStorage.getItem('yf_preferred_voice');
      if ((!stored || !englishVoices.some(v => v.voiceURI === stored)) && englishVoices[0]) {
        setSelectedVoiceUri(englishVoices[0].voiceURI);
        try {
          localStorage.setItem('yf_preferred_voice', englishVoices[0].voiceURI);
        } catch {}
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Audio recitation functions
  const playVerseSpeech = (index: number) => {
    if (speechCancelledRef.current || !('speechSynthesis' in window)) return;
    const list = versesRef.current;
    if (index >= list.length) {
      setIsPlayingAudio(false);
      setIsAudioPaused(false);
      setCurrentReadingVerse(null);
      return;
    }

    currentVerseIndexRef.current = index;
    const v = list[index];
    setCurrentReadingVerse(v.verseNumber);

    const utteranceText =
      index === 0
        ? `${selectedBook.name}, Chapter ${currentChapter}. Verse ${v.verseNumber}: ${v.text}`
        : `Verse ${v.verseNumber}: ${v.text}`;

    const utterance = new SpeechSynthesisUtterance(utteranceText);
    if (availableVoices.length > 0) {
      const voice =
        availableVoices.find(item => item.voiceURI === selectedVoiceUri) || availableVoices[0];
      if (voice) utterance.voice = voice;
    }

    utterance.rate = speechRate * 0.95;
    utterance.pitch = 0.98;
    utterance.volume = isMuted ? 0 : volume;

    utterance.onend = () => {
      if (!speechCancelledRef.current) {
        playVerseSpeech(index + 1);
      }
    };

    utterance.onerror = err => {
      console.warn('Speech error:', err);
      if (!speechCancelledRef.current) {
        setIsPlayingAudio(false);
        setIsAudioPaused(false);
        setCurrentReadingVerse(null);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const startAudio = (startIndex: number = 0) => {
    if ('speechSynthesis' in window) {
      if (isAudioPaused) {
        window.speechSynthesis.resume();
        setIsAudioPaused(false);
        setIsPlayingAudio(true);
        return;
      }
      window.speechSynthesis.cancel();
      speechCancelledRef.current = false;
      setIsPlayingAudio(true);
      setIsAudioPaused(false);
      playVerseSpeech(startIndex);
    }
  };

  const pauseAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.pause();
      setIsAudioPaused(true);
      setIsPlayingAudio(false);
    }
  };

  const stopAudio = () => {
    if ('speechSynthesis' in window) {
      speechCancelledRef.current = true;
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      setIsAudioPaused(false);
      setCurrentReadingVerse(null);
    }
  };

  // Chapter Navigation
  const handlePrevChapter = () => {
    if (currentChapter > 1) {
      const nextCh = currentChapter - 1;
      setCurrentChapter(nextCh);
      if (onSelectPassage) onSelectPassage(selectedBook.id, nextCh);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Go to previous book if available
      const currentIdx = BIBLE_BOOKS.findIndex(b => b.id === selectedBook.id);
      if (currentIdx > 0) {
        const prevBook = BIBLE_BOOKS[currentIdx - 1];
        setSelectedBook(prevBook);
        setCurrentChapter(prevBook.totalChapters);
        if (onSelectPassage) onSelectPassage(prevBook.id, prevBook.totalChapters);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleNextChapter = () => {
    if (currentChapter < selectedBook.totalChapters) {
      const nextCh = currentChapter + 1;
      setCurrentChapter(nextCh);
      if (onSelectPassage) onSelectPassage(selectedBook.id, nextCh);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Go to next book if available
      const currentIdx = BIBLE_BOOKS.findIndex(b => b.id === selectedBook.id);
      if (currentIdx < BIBLE_BOOKS.length - 1) {
        const nextBook = BIBLE_BOOKS[currentIdx + 1];
        setSelectedBook(nextBook);
        setCurrentChapter(1);
        if (onSelectPassage) onSelectPassage(nextBook.id, 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // Filtered Verses
  const filteredVerses = useMemo(() => {
    if (!filterQuery.trim()) return verses;
    const q = filterQuery.toLowerCase();
    return verses.filter(
      v => v.text.toLowerCase().includes(q) || v.verseNumber.toString() === q
    );
  }, [verses, filterQuery]);

  // Copy Verse
  const handleCopyVerse = (verseNum: number, text: string) => {
    const citation = `${selectedBook.name} ${currentChapter}:${verseNum} - "${text}" (${translation.toUpperCase()})`;
    navigator.clipboard.writeText(citation);
    setCopiedVerseNum(verseNum);
    showToast(`Copied ${selectedBook.name} ${currentChapter}:${verseNum} citation!`);
    setTimeout(() => setCopiedVerseNum(null), 2000);
  };

  // Highlight & Bookmark Handler (Immediate optimistic update + background persistence)
  const handleSetHighlight = async (verseNum: number, colorId: string | null) => {
    const verseKey = `${selectedBook.id}_${currentChapter}_${verseNum}`;
    const verseItem = verses.find(v => v.verseNumber === verseNum);
    const verseText = verseItem ? verseItem.text : '';
    const colorObj = HIGHLIGHT_COLORS.find(c => c.id === colorId);

    // 1. Immediate optimistic UI update
    setHighlights(prev => {
      const next = { ...prev };
      if (!colorId) {
        delete next[verseKey];
      } else {
        next[verseKey] = colorId;
      }
      return next;
    });

    // Close the popover
    setActivePopoverVerse(null);

    // Visual feedback
    if (colorId && colorObj) {
      showToast(`Verse ${verseNum} highlighted in ${colorObj.name}!`);
    } else {
      showToast(`Highlight removed from verse ${verseNum}.`);
    }

    // 2. Persist in background
    try {
      await saveHighlightToFirestore(
        selectedBook.id,
        currentChapter,
        verseNum,
        colorId,
        verseText,
        selectedBook.name
      );
    } catch (e) {
      console.warn('Highlight persistence notice:', e);
    }
  };

  // Quick Bookmark toggle (Immediate optimistic update + background persistence)
  const handleToggleBookmark = async (verseNum: number) => {
    const bookmarkId = `bm_${selectedBook.id}_${currentChapter}_${verseNum}`;
    const isBookmarked = bookmarks.some(b => b.id === bookmarkId);
    const verseItem = verses.find(v => v.verseNumber === verseNum);
    const verseText = verseItem ? verseItem.text : '';
    const newBookmark: BookmarkedVerse = {
      id: bookmarkId,
      type: 'bookmark',
      bookId: selectedBook.id,
      bookName: selectedBook.name,
      chapter: currentChapter,
      verse: verseNum,
      text: verseText,
      translation: translation.toUpperCase(),
      highlightColor: 'gold',
      savedAt: new Date().toISOString()
    };

    // 1. Immediate optimistic update
    setBookmarks(prev => {
      if (isBookmarked) {
        return prev.filter(b => b.id !== bookmarkId);
      } else {
        return [newBookmark, ...prev];
      }
    });

    if (isBookmarked) {
      showToast(`Removed verse ${verseNum} from saved bookmarks.`);
    } else {
      showToast(`Saved ${selectedBook.name} ${currentChapter}:${verseNum} to bookmarks!`);
    }

    // 2. Persist in background
    try {
      if (isBookmarked) {
        await deleteBookmarkFromFirestore(bookmarkId);
      } else {
        await saveBookmarkToFirestore(newBookmark);
      }
    } catch (e) {
      console.warn('Bookmark persistence notice:', e);
    }
  };

  // Books filtered by testament for sidebar
  const sidebarBooks = useMemo(() => {
    return BIBLE_BOOKS.filter(
      b => testamentFilter === 'ALL' || b.testament === testamentFilter
    );
  }, [testamentFilter]);

  const activeTranslation =
    BIBLE_TRANSLATIONS.find(t => t.id === translation) || BIBLE_TRANSLATIONS[0];

  return (
    <div
      className={`transition-all duration-300 font-sans h-full w-full overflow-y-auto overscroll-contain pointer-events-auto touch-pan-y ${
        isSanctuaryMode
          ? 'fixed inset-0 z-[100] bg-white text-slate-900 py-6 px-3 sm:px-8 shadow-2xl'
          : 'min-h-[calc(100vh-4.5rem)] bg-white text-slate-900 py-6 px-3 sm:px-8'
      }`}
    >
      {/* Book Directory Modal */}
      <BookDirectoryModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        selectedBook={selectedBook}
        currentChapter={currentChapter}
        onSelectBookAndChapter={(book, ch) => {
          setSelectedBook(book);
          setCurrentChapter(ch);
          if (onSelectPassage) onSelectPassage(book.id, ch);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Bookmarks Drawer */}
      <BookmarksDrawer
        isOpen={isBookmarksDrawerOpen}
        onClose={() => setIsBookmarksDrawerOpen(false)}
        bookmarks={bookmarks}
        onNavigateToVerse={(bId, ch, vNum) => {
          const book = BIBLE_BOOKS.find(b => b.id === bId);
          if (book) setSelectedBook(book);
          setCurrentChapter(ch);
          if (onSelectPassage) onSelectPassage(bId, ch, vNum);
          setTimeout(() => {
            const el = document.getElementById(`verse-${vNum}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 400);
        }}
        onDeleteBookmark={id => deleteBookmarkFromFirestore(id)}
      />

      <div className="max-w-7xl mx-auto space-y-5">
        {/* Sticky Control Bar */}
        <div className="sticky top-2 z-30 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-2.5 sm:p-3 shadow-md flex flex-wrap items-center justify-between gap-2">
          {/* Book & Chapter Indicator with directory trigger */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onBack) {
                  onBack();
                } else {
                  window.dispatchEvent(new CustomEvent('yf_switch_tab', { detail: { tab: 'sanctuary' } }));
                }
              }}
              className="px-3 sm:px-3.5 py-2 rounded-xl bg-[#0a0a0a] text-amber-300 hover:text-white hover:bg-[#1a1a1a] border-2 border-amber-500/80 hover:border-amber-400 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(245,158,11,0.25)] cursor-pointer active:scale-98"
              title={backLabel || "Back to Previous Screen"}
            >
              <ChevronLeft className="w-4 h-4 text-amber-400" />
              <span className="font-semibold">{backLabel || 'Back'}</span>
            </button>

            <button
              onClick={() => setIsBookModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-[#0a0a0a] text-amber-300 hover:text-white hover:bg-[#1a1a1a] border-2 border-amber-500/80 hover:border-amber-400 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(245,158,11,0.25)] cursor-pointer"
              title="Open Book Directory"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span className="font-semibold">Book List</span>
            </button>

            <button
              onClick={() => setIsBookModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] border-2 border-amber-400 hover:border-amber-300 text-xs sm:text-sm font-bold font-mono flex items-center gap-2 transition-all shadow-[0_0_14px_rgba(245,158,11,0.3)] cursor-pointer"
              title="Click to Switch Book or Chapter"
            >
              <span className="text-amber-400">📖</span>
              <span>
                {selectedBook.name} Ch {currentChapter}
              </span>
            </button>
          </div>

          {/* Quick Prev / Next Chapter Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevChapter}
              className="px-3 py-2 rounded-xl bg-[#0a0a0a] text-amber-300 hover:text-white hover:bg-[#1a1a1a] border-2 border-amber-500/80 hover:border-amber-400 text-xs font-mono font-bold flex items-center gap-1 transition-all shadow-[0_0_10px_rgba(245,158,11,0.25)] cursor-pointer"
              title="Previous Chapter"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            <span className="text-[11px] font-mono text-slate-800 font-bold px-2 py-1 rounded bg-slate-100 border border-slate-300 select-none">
              {currentChapter} / {selectedBook.totalChapters}
            </span>

            <button
              onClick={handleNextChapter}
              className="px-3 py-2 rounded-xl bg-[#0a0a0a] text-amber-300 hover:text-white hover:bg-[#1a1a1a] border-2 border-amber-500/80 hover:border-amber-400 text-xs font-mono font-bold flex items-center gap-1 transition-all shadow-[0_0_10px_rgba(245,158,11,0.25)] cursor-pointer"
              title="Next Chapter"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action Tools (Bookmarks, Notes HUD, Takeover) */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Collapsible Book Directory Toggle Pill */}
            <button
              onClick={() => {
                setIsBookListMinimized(prev => {
                  const next = !prev;
                  try {
                    localStorage.setItem('yf_bible_book_list_minimized', String(next));
                  } catch {}
                  return next;
                });
              }}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                isBookListMinimized
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                  : 'bg-[#0a0a0a] text-slate-300 hover:text-white border-slate-700 hover:border-slate-500'
              }`}
              title={isBookListMinimized ? 'Expand 66-Book Directory' : 'Collapse Book Directory to maximize reading viewport'}
              aria-label="Toggle Collapsible 66-Book Directory"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>{isBookListMinimized ? 'Directory Minimized' : 'Collapse Directory'}</span>
            </button>

            {/* Bookmarks Drawer Trigger with Real-Time Count */}
            <button
              onClick={() => setIsBookmarksDrawerOpen(true)}
              className="px-3 py-2 rounded-xl bg-[#0a0a0a] text-amber-300 hover:text-white hover:bg-[#1a1a1a] border border-amber-500/60 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="View Firebase Bookmarked Verses"
            >
              <Bookmark className="w-3.5 h-3.5 fill-amber-400/30" />
              <span>Saved Verses ({bookmarks.length})</span>
            </button>

            {/* Study Notes HUD Trigger (Pen Button - Pre-fills Book and Chapter) */}
            <button
              onClick={() => {
                const pass = `${selectedBook.name} ${currentChapter}`;
                const tit = `${selectedBook.name} Ch ${currentChapter} Study Notes`;
                if (onOpenNotes) {
                  onOpenNotes(pass, tit);
                }
                window.dispatchEvent(
                  new CustomEvent('yf_open_notes_hud', {
                    detail: {
                      book: selectedBook.name,
                      bookId: selectedBook.id,
                      chapter: currentChapter,
                      passage: pass,
                      title: tit
                    }
                  })
                );
              }}
              className="px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer border-2 bg-[#0a0a0a] text-amber-300 hover:text-white border-amber-500/80 hover:border-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.25)]"
              title={`Open Study Notes for ${selectedBook.name} ${currentChapter}`}
              aria-label="Open Chapter Study Notes"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Notes HUD</span>
            </button>

            {/* Sanctuary / Takeover Mode Toggle */}
            <button
              onClick={() => setIsSanctuaryMode(!isSanctuaryMode)}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer border shadow-sm ${
                isSanctuaryMode
                  ? 'bg-[#0a0a0a] text-amber-300 border-amber-400 ring-2 ring-amber-400/40'
                  : 'bg-[#0a0a0a] text-slate-200 border-slate-700 hover:text-white'
              }`}
              title={
                isSanctuaryMode
                  ? 'Exit Screen Takeover (Esc)'
                  : 'Take Over Screen / Full Sanctuary View'
              }
            >
              {isSanctuaryMode ? (
                <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5 text-slate-300" />
              )}
              <span className="hidden sm:inline">
                {isSanctuaryMode ? 'Exit Takeover' : 'Takeover'}
              </span>
            </button>
          </div>
        </div>

        {/* Book Header & Purpose Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-wrap justify-between items-center gap-4">
          <div className="flex-1 min-w-[280px]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">
                Holy Scriptures &bull; {activeTranslation.name} ({activeTranslation.abbreviation})
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-mono font-bold border border-slate-300">
                {selectedBook.testament === 'OT' ? 'Old Testament' : 'New Testament'}
              </span>
              {selectedBook.section && (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono border border-slate-300">
                  {selectedBook.section}
                </span>
              )}
            </div>

            <div
              onClick={() => setIsBookModalOpen(true)}
              className="cursor-pointer group/title inline-flex items-center gap-2 mt-1 select-none"
              title="Click to Switch Book or Chapter"
            >
              <h1 className="text-2xl sm:text-4xl font-serif font-black text-slate-900 font-['Cinzel'] group-hover/title:text-amber-600 transition-colors flex items-center gap-2">
                <span>{selectedBook.name}</span>
                <span className="text-slate-700 font-sans font-bold group-hover/title:text-amber-600">
                  Chapter {currentChapter}
                </span>
                <ChevronDown className="w-5 h-5 text-amber-500 transition-transform group-hover/title:translate-y-0.5" />
              </h1>
            </div>

            {selectedBook.purpose && (
              <div className="mt-2.5 p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 font-sans leading-relaxed shadow-sm">
                <span className="font-mono font-bold text-slate-900 uppercase tracking-wider text-[10px] block mb-0.5">
                  Book Purpose & Theological Theme:
                </span>
                {selectedBook.purpose}
              </div>
            )}
          </div>

          {/* Translation & Font Size Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Translations */}
            <div className="flex bg-white p-1 rounded-xl border border-slate-300 text-xs font-mono shadow-sm">
              {BIBLE_TRANSLATIONS.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTranslation(t.id);
                    try {
                      localStorage.setItem('yf_bible_version', t.id);
                    } catch {}
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    translation === t.id
                      ? 'bg-[#0a0a0a] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={`${t.name} • ${t.description}`}
                >
                  {t.abbreviation}
                </button>
              ))}
            </div>

            {/* Font Sizing */}
            <div className="flex bg-white p-1 rounded-xl border border-slate-300 text-xs font-mono shadow-sm">
              {(['sm', 'md', 'lg'] as const).map(sz => (
                <button
                  key={sz}
                  onClick={() => setTextSize(sz)}
                  className={`px-2.5 py-1 rounded-lg uppercase cursor-pointer transition-all ${
                    textSize === sz
                      ? 'bg-[#0a0a0a] text-white font-bold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sz === 'sm' ? 'A' : sz === 'md' ? 'A+' : 'A++'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Layout Grid */}
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Books Sidebar (Collapsible) */}
          {isBookListMinimized ? (
            <div className="lg:col-span-12 flex flex-wrap items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-300 shadow-sm gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold text-slate-900 block">
                    Books List Minimized &bull; Focused on {selectedBook.name} Chapter {currentChapter}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Full-width scripture reading mode active.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsBookModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-mono font-bold border border-slate-300 transition-colors cursor-pointer"
                >
                  Switch Book ({selectedBook.name})
                </button>
                <button
                  onClick={() => {
                    setIsBookListMinimized(false);
                    try {
                      localStorage.setItem('yf_bible_book_list_minimized', 'false');
                    } catch {}
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0a0a0a] hover:bg-[#1a1a1a] text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Expand Books List</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-4 space-y-4">
              {/* Chapter Quick Grid for Current Book */}
              <div className="bg-white border border-slate-300 rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-mono font-bold uppercase text-slate-900">
                    {selectedBook.name} Chapters ({selectedBook.totalChapters})
                  </span>
                  <button
                    onClick={() => {
                      setIsBookListMinimized(true);
                      try {
                        localStorage.setItem('yf_bible_book_list_minimized', 'true');
                      } catch {}
                    }}
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer border border-slate-200 transition-colors"
                    title="Minimize books list to maximize verse reading width"
                  >
                    <Minimize2 className="w-3 h-3" />
                    <span>Minimize</span>
                  </button>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto">
                  {Array.from({ length: selectedBook.totalChapters }, (_, i) => i + 1).map(ch => (
                    <button
                      key={ch}
                      onClick={() => {
                        setCurrentChapter(ch);
                        if (onSelectPassage) onSelectPassage(selectedBook.id, ch);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        currentChapter === ch
                          ? 'bg-[#0a0a0a] text-white shadow-sm'
                          : 'bg-white text-slate-800 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              {/* Books List by Testament */}
              <div className="bg-white border border-slate-300 rounded-2xl p-4 max-h-[58vh] overflow-y-auto space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-slate-900 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-slate-700" />
                    Books ({sidebarBooks.length}):
                  </span>
                  <div className="flex gap-1 text-[10px] font-mono font-bold">
                    {(['ALL', 'OT', 'NT'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setTestamentFilter(t)}
                        className={`px-2 py-0.5 rounded ${
                          testamentFilter === t
                            ? 'bg-[#0a0a0a] text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {sidebarBooks.map(b => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setSelectedBook(b);
                        setCurrentChapter(1);
                        if (onSelectPassage) onSelectPassage(b.id, 1);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`p-2.5 rounded-xl text-left text-xs transition-all cursor-pointer flex flex-col justify-between ${
                        selectedBook.id === b.id
                          ? 'bg-[#0a0a0a] text-white font-bold shadow-md'
                          : 'bg-white text-slate-800 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-semibold truncate">{b.name}</div>
                      <div className="flex justify-between items-center mt-1 text-[9px] opacity-70">
                        <span>{b.testament}</span>
                        <span>{b.totalChapters} Ch</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Verses Column */}
          <div
            className={`${
              isBookListMinimized ? 'lg:col-span-12' : 'lg:col-span-8'
            } bg-white border border-slate-300 rounded-2xl p-4 sm:p-6 space-y-6 shadow-sm`}
          >
            {/* Header & Filter Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                <button
                  disabled={currentChapter <= 1}
                  onClick={handlePrevChapter}
                  className="px-3 py-1.5 bg-white disabled:opacity-30 text-slate-800 rounded-lg text-xs font-mono flex items-center gap-1 border border-slate-300 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-100 shadow-sm"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                <span className="text-xs font-mono font-bold text-slate-900">
                  Chapter {currentChapter} of {selectedBook.totalChapters} (
                  {activeTranslation.abbreviation})
                </span>

                <button
                  disabled={currentChapter >= selectedBook.totalChapters}
                  onClick={handleNextChapter}
                  className="px-3 py-1.5 bg-white disabled:opacity-30 text-slate-800 rounded-lg text-xs font-mono flex items-center gap-1 border border-slate-300 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-100 shadow-sm"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Verse Text Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={e => setFilterQuery(e.target.value)}
                  placeholder="Filter verses or words..."
                  className="w-full bg-white border border-slate-300 text-slate-900 text-xs pl-8 pr-3 py-1.5 rounded-xl focus:border-slate-800 focus:outline-none placeholder:text-slate-400 shadow-sm font-mono"
                />
              </div>
            </div>

            {/* Audio Recitation Bar */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isPlayingAudio
                        ? 'bg-emerald-500 animate-pulse ring-4 ring-emerald-100'
                        : isAudioPaused
                        ? 'bg-amber-500'
                        : 'bg-slate-300'
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wide">
                        Scripture Audio Reciter
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        {isPlayingAudio
                          ? `Reading Verse ${currentReadingVerse || 1} of ${verses.length}`
                          : isAudioPaused
                          ? `Paused at Verse ${currentReadingVerse || 1}`
                          : 'Ready to Read'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Steady, natural pastoral voice recitation.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Voice Selector */}
                  {availableVoices.length > 0 && (
                    <select
                      value={selectedVoiceUri}
                      onChange={e => {
                        setSelectedVoiceUri(e.target.value);
                        try {
                          localStorage.setItem('yf_preferred_voice', e.target.value);
                        } catch {}
                      }}
                      className="bg-white border border-slate-300 text-slate-800 text-xs font-mono rounded-xl px-2.5 py-1 focus:outline-none cursor-pointer max-w-[170px] truncate"
                    >
                      {availableVoices.slice(0, 12).map(v => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {v.name.replace(/Microsoft|Google|Apple|Desktop|English/gi, '').trim() ||
                            v.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Play / Pause */}
                  {!isPlayingAudio || isAudioPaused ? (
                    <button
                      onClick={() => startAudio(currentVerseIndexRef.current)}
                      className="px-3 py-1.5 rounded-xl bg-[#0a0a0a] hover:bg-[#1a1a1a] text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isAudioPaused ? 'Resume' : 'Listen'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={pauseAudio}
                      className="px-3 py-1.5 rounded-xl bg-[#0a0a0a] text-amber-300 border border-amber-500 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pause</span>
                    </button>
                  )}

                  <button
                    onClick={stopAudio}
                    disabled={!isPlayingAudio && !isAudioPaused}
                    className="px-3 py-1.5 rounded-xl bg-[#0a0a0a] text-rose-300 border border-rose-500/50 hover:border-rose-400 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Stop</span>
                  </button>

                  {/* Mute */}
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:text-slate-900 cursor-pointer"
                  >
                    {isMuted ? (
                      <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Verses Container */}
            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
                <span className="text-xs font-mono text-slate-600">
                  Loading scripture verses from storage engine...
                </span>
              </div>
            ) : filteredVerses.length === 0 ? (
              <div className="py-16 text-center text-slate-500 font-mono text-xs">
                No verses found matching "{filterQuery}".
              </div>
            ) : (
              <div
                className={`space-y-3.5 font-serif leading-relaxed text-slate-900 ${
                  textSize === 'sm'
                    ? 'text-sm'
                    : textSize === 'md'
                    ? 'text-base'
                    : 'text-lg'
                }`}
              >
                {filteredVerses.map(v => {
                  const verseKey = `${selectedBook.id}_${currentChapter}_${v.verseNumber}`;
                  const highlightColorId = highlights[verseKey];
                  const colorObj = HIGHLIGHT_COLORS.find(c => c.id === highlightColorId);
                  const isHighlighted = !!colorObj;
                  const isBookmarked = bookmarks.some(
                    b =>
                      b.bookId === selectedBook.id &&
                      b.chapter === currentChapter &&
                      b.verse === v.verseNumber
                  );

                  const isPopoverOpen = activePopoverVerse === v.verseNumber;
                  const isCopied = copiedVerseNum === v.verseNumber;
                  const isCurrentlyReading = currentReadingVerse === v.verseNumber;

                  // -----------------------------------------------------------------
                  // CRITICAL: Highlighting Stacking Context Implementation
                  // In CSS, when verse elements are positioned with relative, subsequent
                  // sibling elements render ON TOP of earlier elements. If verse 1 opens
                  // a dropdown popover, verse 2 and 3 would clip or overlap on top of it.
                  // By giving the verse with the active popover an elevated z-index (z-40),
                  // its highlight menu popover sits strictly above all other verses!
                  // -----------------------------------------------------------------
                  return (
                    <div
                      key={v.verseNumber}
                      id={`verse-${v.verseNumber}`}
                      data-verse-item={v.verseNumber}
                      style={{
                        zIndex: isPopoverOpen ? 40 : 1
                      }}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button')) return;
                        setActivePopoverVerse(activePopoverVerse === v.verseNumber ? null : v.verseNumber);
                      }}
                      onMouseUp={() => {
                        const sel = window.getSelection();
                        if (sel && sel.toString().trim().length > 0) {
                          setActivePopoverVerse(v.verseNumber);
                        }
                      }}
                      onTouchEnd={() => {
                        const sel = window.getSelection();
                        if (sel && sel.toString().trim().length > 0) {
                          setActivePopoverVerse(v.verseNumber);
                        }
                      }}
                      className={`group p-4 rounded-2xl border transition-all relative overflow-visible cursor-pointer ${
                        isCurrentlyReading
                          ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-400/50 shadow-md'
                          : isHighlighted
                          ? `${colorObj.bgClass} ${colorObj.borderClass} hover:brightness-105`
                          : isBookmarked
                          ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-200 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Verse Number & Text */}
                        <div className="flex-1">
                          <span className="font-mono text-xs font-bold text-slate-500 mr-2.5 select-none inline-block">
                            {v.verseNumber}
                          </span>
                          <span className="select-text">{v.text}</span>
                        </div>

                        {/* Action Buttons & Stacking Context Popover Trigger */}
                        <div className="flex items-center gap-1 opacity-75 group-hover:opacity-100 transition-opacity">
                          {/* Play audio from this verse */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const idx = verses.findIndex(item => item.verseNumber === v.verseNumber);
                              if (idx >= 0) startAudio(idx);
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                            title="Read aloud starting from this verse"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>

                          {/* Copy citation */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyVerse(v.verseNumber, v.text);
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                            title="Copy verse with citation"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Quick Bookmark Toggle */}
                          <button
                            data-highlight-trigger="true"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleBookmark(v.verseNumber);
                            }}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isBookmarked
                                ? 'text-amber-500 hover:text-amber-600 bg-amber-500/10'
                                : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100'
                            }`}
                            title={
                              isBookmarked
                                ? 'Remove from saved bookmarks'
                                : 'Save verse to Firebase bookmarks'
                            }
                          >
                            <Bookmark
                              className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current text-amber-500' : ''}`}
                            />
                          </button>

                          {/* Highlight Menu Trigger & Stacking Popover Container */}
                          <div className="relative">
                            <button
                              data-highlight-trigger="true"
                              onClick={e => {
                                e.stopPropagation();
                                setActivePopoverVerse(
                                  activePopoverVerse === v.verseNumber ? null : v.verseNumber
                                );
                              }}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                                isHighlighted
                                  ? 'ring-1 ring-amber-400/60 bg-white shadow-xs'
                                  : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100'
                              }`}
                              style={{
                                color: isHighlighted ? colorObj.starColor : undefined
                              }}
                              title="Choose highlight color (Firebase synced)"
                            >
                              <Sparkles
                                className={`w-3.5 h-3.5 ${isHighlighted ? 'fill-current' : ''}`}
                              />
                            </button>

                            {/* Stacking Floating Action Menu: [ 🟡 Highlight ] | [ 🔖 Bookmark ] | [ 📝 Send to Notes ] */}
                            {isPopoverOpen && (
                              <div
                                ref={popoverContainerRef}
                                className="absolute right-0 top-full mt-2 z-50 p-2.5 rounded-2xl bg-black text-white border-2 border-amber-500/80 shadow-[0_12px_36px_rgba(0,0,0,0.85)] min-w-[280px] max-w-[95vw] sm:max-w-md animate-fadeIn text-left font-sans backdrop-blur-md"
                                onClick={e => e.stopPropagation()}
                              >
                                {/* Floating Action Buttons Header */}
                                <div className="flex items-center justify-between gap-1 pb-2 border-b border-slate-800">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {/* [ 🟡 Highlight ] */}
                                    <button
                                      onClick={() => {
                                        // If already highlighted, clicking toggles removal; otherwise sets default amber
                                        if (isHighlighted) {
                                          handleSetHighlight(v.verseNumber, null);
                                        } else {
                                          handleSetHighlight(v.verseNumber, 'amber');
                                        }
                                      }}
                                      className={`py-1 px-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-all border ${
                                        isHighlighted
                                          ? 'bg-amber-500/30 border-amber-400 text-amber-300 shadow-sm'
                                          : 'bg-white/10 hover:bg-white/20 border-white/15 text-amber-300'
                                      }`}
                                      title={isHighlighted ? 'Remove highlight' : 'Highlight verse in Golden Flame'}
                                    >
                                      <span className="text-xs">🟡</span>
                                      <span>Highlight</span>
                                    </button>

                                    {/* [ 🔖 Bookmark ] */}
                                    <button
                                      onClick={() => handleToggleBookmark(v.verseNumber)}
                                      className={`py-1 px-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-all border ${
                                        isBookmarked
                                          ? 'bg-amber-500/30 border-amber-400 text-amber-300 shadow-sm'
                                          : 'bg-white/10 hover:bg-white/20 border-white/15 text-slate-200 hover:text-white'
                                      }`}
                                      title={isBookmarked ? 'Remove bookmark' : 'Save verse to youngfire_saved_scriptures_v1'}
                                    >
                                      <span className="text-xs">🔖</span>
                                      <span>{isBookmarked ? 'Saved' : 'Bookmark'}</span>
                                    </button>

                                    {/* [ 📝 Send to Notes ] */}
                                    <button
                                      onClick={() => {
                                        const pass = `${selectedBook.name} ${currentChapter}:${v.verseNumber}`;
                                        const tit = `${selectedBook.name} ${currentChapter}:${v.verseNumber} Study Note`;
                                        if (onOpenNotes) {
                                          onOpenNotes(pass, `${tit}\n\n"${v.text}"`);
                                        }
                                        window.dispatchEvent(
                                          new CustomEvent('yf_open_notes_hud', {
                                            detail: {
                                              book: selectedBook.name,
                                              bookId: selectedBook.id,
                                              chapter: currentChapter,
                                              verse: v.verseNumber,
                                              passage: pass,
                                              title: tit,
                                              text: v.text
                                            }
                                          })
                                        );
                                        showToast(`Sent ${selectedBook.name} ${currentChapter}:${v.verseNumber} to Study Notes!`);
                                        setActivePopoverVerse(null);
                                      }}
                                      className="py-1 px-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-all border bg-white/10 hover:bg-white/20 border-white/15 text-slate-200 hover:text-white"
                                      title="Open Study Notes HUD with this verse"
                                    >
                                      <span className="text-xs">📝</span>
                                      <span>Send to Notes</span>
                                    </button>
                                  </div>

                                  <button
                                    onClick={() => setActivePopoverVerse(null)}
                                    className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 cursor-pointer ml-1"
                                    title="Close Menu"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Biblical Color Palette Selection */}
                                <div className="pt-2">
                                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1.5">
                                    <span>Biblical Palette:</span>
                                    {isHighlighted && (
                                      <button
                                        onClick={() => handleSetHighlight(v.verseNumber, null)}
                                        className="text-rose-400 hover:text-rose-300 underline cursor-pointer"
                                      >
                                        Remove Color
                                      </button>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-6 gap-2">
                                    {HIGHLIGHT_COLORS.map(c => {
                                      const isCurrentColor = highlightColorId === c.id;
                                      return (
                                        <button
                                          key={c.id}
                                          onClick={() => handleSetHighlight(v.verseNumber, c.id)}
                                          className={`w-7 h-7 rounded-full transition-transform hover:scale-125 cursor-pointer flex items-center justify-center ${
                                            isCurrentColor
                                              ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-110'
                                              : ''
                                          }`}
                                          style={{ backgroundColor: c.dotColor }}
                                          title={c.name}
                                        >
                                          {isCurrentColor && (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-950 fill-white" />
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Chapter Navigation Bar */}
            <div className="flex justify-between items-center border-t border-slate-200 pt-4 flex-wrap gap-2">
              <button
                onClick={handlePrevChapter}
                className="px-4 py-2 bg-[#0a0a0a] text-amber-300 hover:text-white hover:bg-[#1a1a1a] rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border-2 border-amber-500/80 hover:border-amber-400 cursor-pointer transition-all shadow-sm"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous Chapter</span>
              </button>

              <button
                onClick={() => setIsBookModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#0a0a0a] hover:bg-[#1a1a1a] text-amber-300 hover:text-white text-xs font-mono font-bold border-2 border-amber-500/80 hover:border-amber-400 transition-all cursor-pointer shadow-sm"
              >
                {selectedBook.name} {currentChapter}:{verses.length} &bull; Directory
              </button>

              <button
                onClick={handleNextChapter}
                className="px-4 py-2 bg-[#0a0a0a] text-amber-300 hover:text-white hover:bg-[#1a1a1a] rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border-2 border-amber-500/80 hover:border-amber-400 cursor-pointer transition-all shadow-sm"
              >
                <span>Next Chapter</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Instant Feedback Toast Notification */}
      {toastNotification && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-black/95 text-white border border-amber-500/70 shadow-2xl flex items-center gap-2 text-xs font-mono font-bold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastNotification}</span>
        </div>
      )}
    </div>
  );
};
