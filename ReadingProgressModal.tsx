import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, BarChart3, CheckCircle2, Circle, Flame, Award, 
  BookOpen, Users, ShieldCheck, Crown, BookMarked, 
  Shield, Sparkles, ChevronDown, ChevronUp, Search, 
  RotateCcw, Check, ExternalLink, Zap, Heart, Target
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  BIBLE_BOOKS, 
  CANON_CATEGORY_FILTERS, 
  filterBibleBooksByCategory, 
  type BibleBook, 
  type CanonCategoryFilter 
} from '../data/bibleBooks';
import { CurrentUser } from './SettingsHUDModal';

interface ReadingProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToBook?: (bookId: string) => void;
  currentUser?: CurrentUser | null;
}

export type ProgressTab = 'books' | 'activities' | 'community';

interface FieryDart {
  id: string;
  name: string;
  scriptureToQuench: string;
  citation: string;
  declaration: string;
  isQuenched: boolean;
}

const INITIAL_FIERY_DARTS: FieryDart[] = [
  {
    id: 'dart_doubt',
    name: 'Fiery Dart of Doubt & Unbelief',
    scriptureToQuench: 'Now faith is the substance of things hoped for, the evidence of things not seen... without faith it is impossible to please Him.',
    citation: 'Hebrews 11:1, 6 (NKJV)',
    declaration: 'I quench doubt with unwavering trust in God’s infallible promises!',
    isQuenched: false
  },
  {
    id: 'dart_fear',
    name: 'Fiery Dart of Fear & Intimidation',
    scriptureToQuench: 'For God has not given us a spirit of fear, but of power and of love and of a sound mind.',
    citation: '2 Timothy 1:7 (NKJV)',
    declaration: 'Fear has no dominion over me; the Lion of Judah is my defense!',
    isQuenched: false
  },
  {
    id: 'dart_condemnation',
    name: 'Fiery Dart of Accusation & Guilt',
    scriptureToQuench: 'There is therefore now no condemnation to those who are in Christ Jesus, who do not walk according to the flesh, but according to the Spirit.',
    citation: 'Romans 8:1 (NKJV)',
    declaration: 'Christ’s blood has cleansed me. I stand justified and without condemnation!',
    isQuenched: false
  },
  {
    id: 'dart_weariness',
    name: 'Fiery Dart of Weariness & Discouragement',
    scriptureToQuench: 'And let us not grow weary while doing good, for in due season we shall reap if we do not lose heart.',
    citation: 'Galatians 6:9 (NKJV)',
    declaration: 'My strength is renewed like the eagle’s; I shall run and not be weary!',
    isQuenched: false
  },
  {
    id: 'dart_anxiety',
    name: 'Fiery Dart of Anxiety & Restlessness',
    scriptureToQuench: 'Be anxious for nothing, but in everything by prayer and supplication, with thanksgiving, let your requests be made known to God; and the peace of God... will guard your hearts.',
    citation: 'Philippians 4:6–7 (NKJV)',
    declaration: 'I cast every care upon the Lord, for He cares for me deeply!',
    isQuenched: false
  },
  {
    id: 'dart_pride',
    name: 'Fiery Dart of Pride & Self-Reliance',
    scriptureToQuench: 'God resists the proud, but gives grace to the humble. Therefore humble yourselves under the mighty hand of God.',
    citation: '1 Peter 5:5–6 (NKJV)',
    declaration: 'I bow in holy humility; Christ alone is my righteousness and strength!',
    isQuenched: false
  }
];

const ARMOR_PIECES = [
  { id: 'belt', name: 'Belt of Truth', ref: 'Ephesians 6:14a', icon: '🎗️', focus: 'Integrity and Christ as the Truth' },
  { id: 'breastplate', name: 'Breastplate of Righteousness', ref: 'Ephesians 6:14b', icon: '🛡️', focus: 'Heart protected by Christ’s righteousness' },
  { id: 'shoes', name: 'Shoes of the Gospel of Peace', ref: 'Ephesians 6:15', icon: '👟', focus: 'Readiness to proclaim good news' },
  { id: 'shield', name: 'Shield of Faith', ref: 'Ephesians 6:16', icon: '🛡️', focus: 'Quenching all the fiery darts of the wicked one' },
  { id: 'helmet', name: 'Helmet of Salvation', ref: 'Ephesians 6:17a', icon: '🪖', focus: 'Guarding thoughts, mind, and eternal hope' },
  { id: 'sword', name: 'Sword of the Spirit', ref: 'Ephesians 6:17b', icon: '⚔️', focus: 'The Living Word of God spoken in power' },
  { id: 'prayer', name: 'Praying Always in the Spirit', ref: 'Ephesians 6:18', icon: '🔥', focus: 'Supplication and perseverance for all saints' }
];

const ROMAN_ROAD_STEPS = [
  { id: 'rom_1', title: 'The Universal Condition', ref: 'Romans 3:23 (NKJV)', text: 'For all have sinned and fall short of the glory of God.' },
  { id: 'rom_2', title: 'The Consequence & Gift', ref: 'Romans 6:23 (NKJV)', text: 'For the wages of sin is death, but the gift of God is eternal life in Christ Jesus our Lord.' },
  { id: 'rom_3', title: 'The Demonstration of Love', ref: 'Romans 5:8 (NKJV)', text: 'But God demonstrates His own love toward us, in that while we were still sinners, Christ died for us.' },
  { id: 'rom_4', title: 'The Confession of Faith', ref: 'Romans 10:9–10 (NKJV)', text: 'That if you confess with your mouth the Lord Jesus and believe in your heart that God has raised Him from the dead, you will be saved.' },
  { id: 'rom_5', title: 'The Assurance of No Condemnation', ref: 'Romans 8:1 (NKJV)', text: 'There is therefore now no condemnation to those who are in Christ Jesus, who do not walk according to the flesh, but according to the Spirit.' }
];

export const ReadingProgressModal: React.FC<ReadingProgressModalProps> = ({
  isOpen,
  onClose,
  onNavigateToBook,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<ProgressTab>('books');

  // Read chapters list: e.g. ["GEN_1", "GEN_2", "MAT_1"]
  const [readChapters, setReadChapters] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('youngfire_read_chapters_list');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Ephesian Shield & Armor state
  const [armorState, setArmorState] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('youngfire_ephesian_armor_state');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Fiery Darts Quenched state
  const [quenchedDartIds, setQuenchedDartIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('youngfire_quenched_darts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Roman Road checked steps
  const [romanRoadSteps, setRomanRoadSteps] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('youngfire_roman_road_steps');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 66 Books Filtering & Search
  const [categoryFilter, setCategoryFilter] = useState<CanonCategoryFilter>('All 66 Books');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);

  // Admin Community state
  const [communityProgress, setCommunityProgress] = useState<any[]>([]);
  const [loadingCommunity, setLoadingCommunity] = useState(false);

  const isAdmin = Boolean(
    currentUser?.isAdmin ||
    currentUser?.accountType === 'administrator' ||
    (() => {
      try {
        const saved = localStorage.getItem('youngfire_user_session');
        if (saved) {
          const u = JSON.parse(saved);
          return u?.isAdmin || u?.accountType === 'administrator';
        }
      } catch {}
      return false;
    })()
  );

  // Load community reading analytics for administrator
  useEffect(() => {
    if (isOpen && isAdmin) {
      setLoadingCommunity(true);
      Promise.all([
        fetch('/api/roster').then(r => r.json()).catch(() => ({ roster: [] })),
        fetch('/api/progress/stats').then(r => r.json()).catch(() => ({ stats: {} }))
      ]).then(([rosterData]) => {
        const members = Array.isArray(rosterData?.roster) ? rosterData.roster : [];
        const baseStats = members.map((m: any, idx: number) => {
          const defaultChapters = m.chaptersRead || 0;
          return {
            id: m.id || `m_${idx}`,
            name: m.fullName || m.name || 'Sanctuary Disciple',
            role: m.role || 'Disciple',
            avatar: m.avatar || '/image_4.png',
            chaptersRead: defaultChapters,
            percent: Math.round((defaultChapters / 1189) * 100),
            lastActive: 'Active'
          };
        });
        setCommunityProgress(baseStats);
      }).finally(() => {
        setLoadingCommunity(false);
      });
    }
  }, [isOpen, isAdmin]);

  if (!isOpen) return null;

  const totalChapters = 1189;
  const readChaptersCount = readChapters.length;
  const progressPercent = Math.min(100, Math.round((readChaptersCount / totalChapters) * 100));

  const otChaptersTotal = 929;
  const ntChaptersTotal = 260;

  const otReadCount = readChapters.filter(ch => {
    const bookId = ch.split('_')[0];
    const b = BIBLE_BOOKS.find(book => book.id === bookId);
    return b?.testament === 'OT';
  }).length;

  const ntReadCount = readChapters.filter(ch => {
    const bookId = ch.split('_')[0];
    const b = BIBLE_BOOKS.find(book => book.id === bookId);
    return b?.testament === 'NT';
  }).length;

  // Count fully mastered books
  const masteredBooksCount = BIBLE_BOOKS.filter(book => {
    for (let c = 1; c <= book.totalChapters; c++) {
      if (!readChapters.includes(`${book.id}_${c}`)) return false;
    }
    return true;
  }).length;

  // Filtered books list
  const filteredBooks = filterBibleBooksByCategory(BIBLE_BOOKS, categoryFilter).filter(book => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = book.name.toLowerCase().includes(q) ||
        book.id.toLowerCase().includes(q) ||
        (book.purpose && book.purpose.toLowerCase().includes(q)) ||
        (book.section && book.section.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // Chapter Toggle Handler
  const toggleChapter = (bookId: string, chapterNum: number) => {
    const key = `${bookId}_${chapterNum}`;
    let updated: string[];
    if (readChapters.includes(key)) {
      updated = readChapters.filter(k => k !== key);
    } else {
      updated = [...readChapters, key];
      // Celebrate if last chapter in book completed
      const book = BIBLE_BOOKS.find(b => b.id === bookId);
      if (book) {
        const isNowComplete = Array.from({ length: book.totalChapters }, (_, i) => i + 1)
          .every(c => updated.includes(`${bookId}_${c}`));
        if (isNowComplete) {
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
        }
      }
    }
    setReadChapters(updated);
    try {
      localStorage.setItem('youngfire_read_chapters_list', JSON.stringify(updated));
    } catch {}
  };

  // Mark Entire Book Complete
  const markEntireBook = (book: BibleBook, complete: boolean) => {
    const bookKeys = Array.from({ length: book.totalChapters }, (_, i) => `${book.id}_${i + 1}`);
    let updated: string[];
    if (complete) {
      const set = new Set([...readChapters, ...bookKeys]);
      updated = Array.from(set);
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.55 } });
    } else {
      updated = readChapters.filter(k => !k.startsWith(`${book.id}_`));
    }
    setReadChapters(updated);
    try {
      localStorage.setItem('youngfire_read_chapters_list', JSON.stringify(updated));
    } catch {}
  };

  // Toggle Armor Piece
  const toggleArmorPiece = (pieceId: string) => {
    const updated = { ...armorState, [pieceId]: !armorState[pieceId] };
    setArmorState(updated);
    try {
      localStorage.setItem('youngfire_ephesian_armor_state', JSON.stringify(updated));
    } catch {}
    if (Object.values(updated).filter(Boolean).length === ARMOR_PIECES.length) {
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.5 } });
    }
  };

  // Quench Fiery Dart
  const quenchDart = (dartId: string) => {
    if (quenchedDartIds.includes(dartId)) return;
    const updated = [...quenchedDartIds, dartId];
    setQuenchedDartIds(updated);
    try {
      localStorage.setItem('youngfire_quenched_darts', JSON.stringify(updated));
    } catch {}
    confetti({ particleCount: 35, spread: 50, origin: { y: 0.65 } });
  };

  // Toggle Roman Road
  const toggleRomanRoadStep = (stepId: string) => {
    let updated: string[];
    if (romanRoadSteps.includes(stepId)) {
      updated = romanRoadSteps.filter(s => s !== stepId);
    } else {
      updated = [...romanRoadSteps, stepId];
      if (updated.length === ROMAN_ROAD_STEPS.length) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      }
    }
    setRomanRoadSteps(updated);
    try {
      localStorage.setItem('youngfire_roman_road_steps', JSON.stringify(updated));
    } catch {}
  };

  const handleResetProgress = () => {
    if (window.confirm('Are you sure you want to reset your local Bible chapter progress?')) {
      setReadChapters([]);
      try {
        localStorage.removeItem('youngfire_read_chapters_list');
      } catch {}
    }
  };

  // Calculate today's Proverb (1 to 31)
  const todayDate = new Date();
  const todayProverbDay = Math.min(31, Math.max(1, todayDate.getDate()));

  const totalCommunityChapters = communityProgress.reduce((sum, u) => sum + (u.chaptersRead || 0), readChaptersCount);

  return (
    <div 
      className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl bg-[#000000] border border-amber-500/40 rounded-3xl p-4 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9)] space-y-4 text-white max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black font-['Outfit'] uppercase tracking-wider text-white">
                Discipleship Reading Progress
              </h2>
              <p className="text-[11px] font-mono text-slate-400">
                66 Canonical Books Mastered &bull; Ephesian Shield of Faith Activities
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer transition-colors"
            aria-label="Close Reading Progress"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top 3-Tab Navigation Bar */}
        <div className="p-1 bg-[#040814] rounded-2xl border border-white/10 flex flex-wrap sm:flex-nowrap gap-1">
          <button
            onClick={() => setActiveTab('books')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider font-['Outfit'] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'books'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>66 Bible Books ({readChaptersCount}/1,189)</span>
          </button>

          <button
            onClick={() => setActiveTab('activities')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider font-['Outfit'] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'activities'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-orange-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>🛡️ Ephesian Shield & Activities</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('community')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider font-['Outfit'] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'community'
                  ? 'bg-purple-500 text-slate-950 shadow-md font-bold'
                  : 'text-purple-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Crown className="w-4 h-4" />
              <span>Leaderboard (Admin)</span>
            </button>
          )}
        </div>

        {/* ========================================================
            TAB 1: 66 BOOKS OF THE BIBLE COMPLETE CHAPTER TRACKER
           ======================================================== */}
        {activeTab === 'books' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Overall Progress Capsule */}
            <div className="p-4 bg-[#0a0a0a] rounded-2xl border border-amber-500/30 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                    Total Canonical Reading Mastery
                  </span>
                  <div className="text-xl sm:text-2xl font-black font-['Outfit'] text-white">
                    {readChaptersCount} <span className="text-slate-400 text-sm font-normal">/ 1,189 Chapters</span>
                    <span className="ml-3 text-amber-400 text-sm font-mono font-bold">({progressPercent}%)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-center">
                    <span className="text-slate-400 block text-[10px]">Old Testament</span>
                    <span className="text-white font-bold">{otReadCount} / {otChaptersTotal}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-center">
                    <span className="text-slate-400 block text-[10px]">New Testament</span>
                    <span className="text-white font-bold">{ntReadCount} / {ntChaptersTotal}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
                    <span className="text-amber-400 block text-[10px]">Mastered Books</span>
                    <span className="text-amber-300 font-bold">{masteredBooksCount} / 66</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-[#0a0a0a] rounded-full overflow-hidden p-0.5 border border-white/10">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 via-orange-400 to-emerald-400 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>39 Old Testament Books &bull; 27 New Testament Books</span>
                {readChaptersCount > 0 && (
                  <button 
                    onClick={handleResetProgress}
                    className="text-rose-400 hover:text-rose-300 underline cursor-pointer text-[10px]"
                  >
                    Reset Progress
                  </button>
                )}
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="space-y-2.5">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search books e.g. Genesis, Matthew, Ephesians, Psalms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/15 focus:border-amber-400 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Standardized Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                {CANON_CATEGORY_FILTERS.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all cursor-pointer font-bold ${
                      categoryFilter === cat
                        ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md'
                        : 'bg-black/60 border-white/15 text-white hover:border-amber-400/50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Books List Grid with Chapter Grids */}
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin">
              {filteredBooks.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-slate-400 bg-[#0a0a0a] rounded-2xl border border-white/10">
                  No Bible books matched "{searchQuery}".
                </div>
              ) : (
                filteredBooks.map((book, idx) => {
                  const bookReadChapters = Array.from({ length: book.totalChapters }, (_, i) => i + 1)
                    .filter(c => readChapters.includes(`${book.id}_${c}`));
                  const isComplete = bookReadChapters.length === book.totalChapters;
                  const percent = Math.round((bookReadChapters.length / book.totalChapters) * 100);
                  const isExpanded = expandedBookId === book.id;
                  const bookNumber = book.order || (idx + 1);

                  return (
                    <div 
                      key={book.id}
                      className={`rounded-xl border transition-all p-3 ${
                        isComplete
                          ? 'bg-emerald-950/30 border-emerald-500/40 shadow-sm text-white font-bold'
                          : 'bg-black/60 border-white/15 hover:border-amber-400/40 text-white font-bold'
                      }`}
                    >
                      {/* Book Header Row */}
                      <div className="flex items-center justify-between gap-3">
                        <div 
                          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                          onClick={() => setExpandedBookId(isExpanded ? null : book.id)}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 ${
                            isComplete 
                              ? 'bg-emerald-500 text-slate-950' 
                              : 'bg-white/10 text-amber-300 border border-white/15'
                          }`}>
                            {isComplete ? '✓' : bookNumber}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-white font-['Outfit']">
                                {book.name}
                              </h4>
                              <span className="text-[10px] font-mono text-slate-300 font-normal">
                                {book.testament === 'OT' ? 'Old Testament' : 'New Testament'} &bull; {book.section}
                              </span>
                              {isComplete && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[9px] font-mono font-bold">
                                  Mastered
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-slate-400 font-normal truncate mt-0.5">
                              {book.purpose || `${book.totalChapters} Canonical Chapters`}
                            </p>
                          </div>
                        </div>

                        {/* Progress Badge & Action Buttons */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/15 text-right">
                            <span className="text-xs font-mono font-bold text-white block">
                              {bookReadChapters.length} / {book.totalChapters} Chs
                            </span>
                            <span className="text-[9px] font-mono text-amber-300 font-bold">
                              {percent}%
                            </span>
                          </div>

                          {/* Quick Mark All Complete / Clear */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markEntireBook(book, !isComplete);
                            }}
                            className={`p-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                              isComplete
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                                : 'bg-white/5 border-white/15 text-white hover:border-amber-400'
                            }`}
                            title={isComplete ? "Clear this book" : "Mark entire book complete"}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>

                          {/* Navigate to book in Bible */}
                          {onNavigateToBook && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                                onNavigateToBook(book.id);
                              }}
                              className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 cursor-pointer"
                              title="Read this book in Scripture Viewer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Expand/Collapse Chevron */}
                          <button
                            onClick={() => setExpandedBookId(isExpanded ? null : book.id)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Interactive Chapter Grid */}
                      {isExpanded && (
                        <div className="pt-3 mt-3 border-t border-white/10 space-y-2.5 animate-fadeIn">
                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                            <span>Tap any chapter to mark read/unread or jump to Scripture Viewer:</span>
                            <div className="flex items-center gap-2">
                              {onNavigateToBook && (
                                <>
                                  <button
                                    onClick={() => {
                                      onClose();
                                      onNavigateToBook(book.id);
                                    }}
                                    className="text-cyan-400 hover:underline cursor-pointer font-bold"
                                  >
                                    Open {book.name}
                                  </button>
                                  <span>&bull;</span>
                                </>
                              )}
                              <button
                                onClick={() => markEntireBook(book, true)}
                                className="text-amber-400 hover:underline cursor-pointer"
                              >
                                Mark All ({book.totalChapters})
                              </button>
                              <span>&bull;</span>
                              <button
                                onClick={() => markEntireBook(book, false)}
                                className="text-rose-400 hover:underline cursor-pointer"
                              >
                                Clear
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-12 gap-1.5">
                            {Array.from({ length: book.totalChapters }, (_, i) => i + 1).map((chNum) => {
                              const isRead = readChapters.includes(`${book.id}_${chNum}`);
                              return (
                                <button
                                  key={chNum}
                                  onClick={() => toggleChapter(book.id, chNum)}
                                  className={`py-1 px-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                                    isRead
                                      ? 'bg-emerald-500 text-slate-950 shadow-sm ring-1 ring-emerald-300'
                                      : 'bg-black/60 border border-white/15 text-white hover:border-amber-400/50'
                                  }`}
                                  title={`Chapter ${chNum}`}
                                >
                                  <span>{chNum}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: BIBLE READING ACTIVITIES (THE EPHESIAN SHIELD)
           ======================================================== */}
        {activeTab === 'activities' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Banner: The Ephesian Shield of Faith Theme */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-orange-950/50 via-[#0a0a0a] to-amber-950/50 rounded-3xl border border-orange-500/40 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-orange-500 text-slate-950 font-black text-[10px] font-mono uppercase tracking-wider">
                  2026 Vision Reading Quest
                </span>
                <span className="text-xs font-mono font-bold text-amber-300">
                  Ephesians 6:10–18 (NKJV)
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white font-['Outfit'] uppercase">
                The Ephesian Shield of Faith Quest
              </h3>
              <p className="text-xs text-amber-200/90 font-serif italic leading-relaxed">
                "Above all, taking the shield of faith with which you will be able to quench all the fiery darts of the wicked one." &mdash; Ephesians 6:16
              </p>
            </div>

            {/* Activity 1: Fiery Darts Deflector (Interactive Faith Quencher) */}
            <div className="p-4 bg-[#0a0a0a] rounded-2xl border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <h4 className="text-xs font-bold text-white font-['Outfit'] uppercase">
                    Quench the Fiery Darts (Shield of Faith Exercise)
                  </h4>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">
                  {quenchedDartIds.length} / {INITIAL_FIERY_DARTS.length} Quenched
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                Click each incoming dart to lift the Shield of Faith and quench it with God's Living Word:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {INITIAL_FIERY_DARTS.map((dart) => {
                  const isQuenched = quenchedDartIds.includes(dart.id);
                  return (
                    <div
                      key={dart.id}
                      onClick={() => quenchDart(dart.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isQuenched
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                          : 'bg-black/50 border-orange-500/30 hover:border-orange-400 hover:bg-orange-950/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold font-['Outfit'] ${isQuenched ? 'text-emerald-300 line-through' : 'text-orange-300'}`}>
                          {dart.name}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10">
                          {isQuenched ? '🛡️ Quenched!' : '🔥 Incoming'}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-300 italic mb-1.5">
                        "{dart.scriptureToQuench}"
                      </p>
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-amber-400 font-bold">{dart.citation}</span>
                        <span className="text-slate-400">{isQuenched ? 'Faith Declared' : 'Tap to Quench'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity 2: Daily Armor of God Checklist */}
            <div className="p-4 bg-[#0a0a0a] rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white font-['Outfit'] uppercase">
                    Put on the Whole Armor of God (Ephesians 6:11)
                  </h4>
                </div>
                <span className="text-[11px] font-mono text-amber-300 font-bold">
                  {Object.values(armorState).filter(Boolean).length} / {ARMOR_PIECES.length} Equipped Today
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ARMOR_PIECES.map((piece) => {
                  const isEquipped = Boolean(armorState[piece.id]);
                  return (
                    <div
                      key={piece.id}
                      onClick={() => toggleArmorPiece(piece.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                        isEquipped
                          ? 'bg-emerald-950/30 border-emerald-500/50'
                          : 'bg-black/40 border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg flex-shrink-0">{piece.icon}</span>
                        <div className="min-w-0">
                          <div className={`text-xs font-bold font-['Outfit'] truncate ${isEquipped ? 'text-emerald-300' : 'text-white'}`}>
                            {piece.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">
                            {piece.ref} &bull; {piece.focus}
                          </div>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border ${
                        isEquipped ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-white/20'
                      }`}>
                        {isEquipped && <Check className="w-3.5 h-3.5 font-bold" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity 3: Proverbs 31 Daily Wisdom Walk */}
            <div className="p-4 bg-[#0a0a0a] rounded-2xl border border-amber-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <h4 className="text-xs font-bold text-white font-['Outfit'] uppercase">
                    Proverbs 31 Day-by-Day Wisdom Walk
                  </h4>
                </div>
                <span className="text-[11px] font-mono text-amber-300 font-bold">
                  Day {todayProverbDay} &bull; Proverbs {todayProverbDay}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-300">
                Today is Day {todayProverbDay} of the month. Match the date by reading Proverbs chapter {todayProverbDay} today to gain divine discernment and righteous counsel.
              </p>
              {onNavigateToBook && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToBook('PRO');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs transition-colors flex items-center gap-1.5 cursor-pointer mt-1"
                >
                  <span>Open Proverbs {todayProverbDay} in Bible</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Activity 4: The Roman Road to Salvation */}
            <div className="p-4 bg-[#0a0a0a] rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-white font-['Outfit'] uppercase">
                    The Roman Road of Salvation Pilgrimage
                  </h4>
                </div>
                <span className="text-[11px] font-mono text-cyan-300 font-bold">
                  {romanRoadSteps.length} / {ROMAN_ROAD_STEPS.length} Completed
                </span>
              </div>

              <div className="space-y-2">
                {ROMAN_ROAD_STEPS.map((step, sIdx) => {
                  const isDone = romanRoadSteps.includes(step.id);
                  return (
                    <div
                      key={step.id}
                      onClick={() => toggleRomanRoadStep(step.id)}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-3 transition-all cursor-pointer ${
                        isDone
                          ? 'bg-cyan-950/20 border-cyan-500/40 text-cyan-200'
                          : 'bg-black/40 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-white/10 text-[10px] font-mono font-bold flex items-center justify-center text-amber-400">
                            {sIdx + 1}
                          </span>
                          <span className="text-xs font-bold text-white font-['Outfit']">
                            {step.title} &bull; {step.ref}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-300 mt-1 italic pl-7">
                          "{step.text}"
                        </p>
                      </div>
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border mt-0.5 ${
                        isDone ? 'bg-cyan-500 border-cyan-400 text-slate-950' : 'border-white/20'
                      }`}>
                        {isDone && <Check className="w-3.5 h-3.5 font-bold" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: COMMUNITY READING LEADERBOARD (ADMIN ONLY)
           ======================================================== */}
        {activeTab === 'community' && isAdmin && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 bg-[#0a0a0a] rounded-2xl border border-purple-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-purple-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span>Sanctuary Community Reading Hub</span>
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {totalCommunityChapters} Chapters Read Across Roster
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                Administrator overview of all registered disciples and active chapter progress across Joshua House of Worship.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Disciples Bible Progress Leaderboard ({communityProgress.length})
              </h4>

              {loadingCommunity ? (
                <div className="p-6 text-center text-xs font-mono text-slate-400 animate-pulse">
                  Loading disciples reading metrics...
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                  {communityProgress.map((disciple, idx) => (
                    <div
                      key={disciple.id}
                      className="p-3 bg-[#0a0a0a] rounded-xl border border-white/5 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 text-center text-[10px] font-mono font-bold text-amber-400">
                          #{idx + 1}
                        </span>
                        <img
                          src={disciple.avatar}
                          alt={disciple.name}
                          className="w-8 h-8 rounded-full border border-white/10 object-cover"
                        />
                        <div>
                          <div className="text-xs font-bold text-white font-['Outfit']">
                            {disciple.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {disciple.role}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-bold font-mono text-emerald-400">
                          {disciple.chaptersRead} ch. ({disciple.percent}%)
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono">
                          Active: {disciple.lastActive}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ReadingProgressModal;
