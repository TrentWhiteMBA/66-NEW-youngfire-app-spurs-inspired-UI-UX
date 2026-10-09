import React, { useState, useEffect } from 'react';
import { 
  BookOpen, ArrowLeft, CheckCircle2, Flame, Award, 
  Sparkles, Check, Bookmark, Calendar, ChevronRight,
  Shield, Layers, Target, RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  BIBLE_BOOKS, 
  CANON_CATEGORY_FILTERS, 
  filterBibleBooksByCategory, 
  type BibleBook, 
  type CanonCategoryFilter 
} from '../data/bibleBooks';

interface PhysicalBibleTrackerProps {
  onBack?: () => void;
  onOpenPassage?: (passage: { bookId: string; chapter: number }) => void;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCheckInDate: string; // YYYY-MM-DD
  totalDaysRead: number;
  selectedTranslation: string;
  todayNotes: string;
}

export const PhysicalBibleTracker: React.FC<PhysicalBibleTrackerProps> = ({ 
  onBack,
  onOpenPassage 
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Streak & Huddle State - Initialize to 0 on cold start
  const [streakData, setStreakData] = useState<StreakData>(() => {
    try {
      const saved = localStorage.getItem('youngfire_sword_streak_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastCheckInDate: '',
      totalDaysRead: 0,
      selectedTranslation: 'NKJV',
      todayNotes: ''
    };
  });

  // Completed Books / Chapters Map - Clean slate on new account
  const [completedBooks, setCompletedBooks] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('youngfire_completed_bible_books');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const [activeCategory, setActiveCategory] = useState<CanonCategoryFilter>('All 66 Books');
  const [readChapters, setReadChapters] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('youngfire_read_chapters_list');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [checkedInToday, setCheckedInToday] = useState<boolean>(() => streakData.lastCheckInDate === todayStr);
  const [todayChaptersRead, setTodayChaptersRead] = useState<number>(3);

  useEffect(() => {
    localStorage.setItem('youngfire_sword_streak_v1', JSON.stringify(streakData));
  }, [streakData]);

  useEffect(() => {
    localStorage.setItem('youngfire_completed_bible_books', JSON.stringify(completedBooks));
  }, [completedBooks]);

  const handleCheckInSword = () => {
    if (checkedInToday) return;

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#EF4444', '#10B981', '#E2E8F0']
      });
    } catch {}

    const newStreak = streakData.lastCheckInDate === yesterdayStr() 
      ? streakData.currentStreak + 1 
      : (streakData.lastCheckInDate === todayStr ? streakData.currentStreak : streakData.currentStreak + 1);

    const updated: StreakData = {
      ...streakData,
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, streakData.longestStreak),
      lastCheckInDate: todayStr,
      totalDaysRead: streakData.totalDaysRead + 1
    };

    setStreakData(updated);
    setCheckedInToday(true);
  };

  function yesterdayStr(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }

  const toggleBookCompleted = (bookId: string) => {
    setCompletedBooks(prev => {
      const next = { ...prev, [bookId]: !prev[bookId] };
      return next;
    });
  };

  const completedCount = Object.values(completedBooks).filter(Boolean).length;
  const percentComplete = Math.round((completedCount / 66) * 100);

  const filteredBooks = filterBibleBooksByCategory(BIBLE_BOOKS, activeCategory);

  return (
    <div className="w-full max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-5 text-white select-none animate-fadeIn font-['Outfit']">
      
      {/* 1. TOP SANCTUARY HEADER & BACK BUTTON */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack} 
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white cursor-pointer transition-colors"
              title="Return to Sanctuary"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-['Outfit'] font-black text-lg sm:text-xl tracking-wider uppercase text-white flex items-center gap-2">
                MY DISCIPLESHIP &bull; TRACK SWORD
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                PHYSICAL BIBLE
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400">
              Consecrated 66-Book Scripture Reading Progress &bull; Hebrews 4:12
            </p>
          </div>
        </div>

        {/* Total Progress Badge & Modal Trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('yf_open_reading_progress'))}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
            title="Open Interactive Discipleship Reading Progress Modal"
          >
            <span>🛡️ Progress Quest</span>
            <span>&rarr;</span>
          </button>
          <div className="text-right hidden sm:block">
            <span className="text-xs font-mono text-slate-400 block font-bold">CANON PROGRESS</span>
            <span className="text-base font-black text-amber-400 font-mono">
              {completedCount}/66 ({percentComplete}%)
            </span>
          </div>
        </div>
      </div>

      {/* 2. SWORD CHECK-IN HUDDLE CARD */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0a0a0a] via-[#000000] to-black border border-amber-500/30 shadow-2xl relative overflow-hidden">
        {/* Glow corner accent */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <span className="text-[11px] font-mono tracking-widest uppercase text-amber-400 font-bold block mb-1">
              ⚔️ DAILY WORD CONSECRATION HUDDLE
            </span>
            <h3 className="font-['Outfit'] font-black text-xl text-white tracking-wide">
              {checkedInToday ? "Sword Checked-In Today! ⚔️" : "Ready to Draw Your Sword?"}
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-md leading-relaxed">
              Read your physical Bible today, record your progress, and keep your fire burning with your fellow disciples.
            </p>
          </div>

          {/* Action Check-In Button */}
          <button
            onClick={handleCheckInSword}
            disabled={checkedInToday}
            className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer ${
              checkedInToday
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-110 active:scale-95 shadow-amber-500/30'
            }`}
          >
            {checkedInToday ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>SWORD CONSECRATED TODAY</span>
              </>
            ) : (
              <>
                <Flame className="w-5 h-5 text-slate-950 animate-bounce" />
                <span>CHECK-IN SWORD TODAY →</span>
              </>
            )}
          </button>
        </div>

        {/* 3. STREAK STATS ROW */}
        <div className="grid grid-cols-3 gap-2.5 pt-4">
          <div className="p-3 rounded-2xl bg-black/50 border border-white/5 text-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Current Streak</span>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <Flame className="w-4 h-4 text-orange-400 fill-orange-500/50" />
              <span className="text-lg sm:text-xl font-black font-mono text-white">
                {streakData.currentStreak} Days
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-black/50 border border-white/5 text-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Best Streak</span>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="text-lg sm:text-xl font-black font-mono text-amber-300">
                {streakData.longestStreak} Days
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-black/50 border border-white/5 text-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Total Consecrated</span>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span className="text-lg sm:text-xl font-black font-mono text-amber-300">
                {streakData.totalDaysRead} Days
              </span>
            </div>
          </div>
        </div>

        {/* Translation Preference Pill Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2 mt-4 pt-3 border-t border-white/5 text-xs">
          <span className="text-[11px] font-mono text-slate-400">My Physical Translation:</span>
          <div className="flex items-center gap-1.5">
            {['NKJV', 'KJV', 'ESV', 'CSB', 'NIV'].map((trans) => (
              <button
                key={trans}
                onClick={() => setStreakData(prev => ({ ...prev, selectedTranslation: trans }))}
                className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold uppercase transition-all cursor-pointer ${
                  streakData.selectedTranslation === trans
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {trans}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. 66-BOOK CANON PROGRESS CHECKLIST */}
      <div className="p-5 rounded-3xl bg-black/80 border border-white/10 shadow-2xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-['Outfit'] font-black text-base sm:text-lg text-white uppercase flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              <span>66-Book Consecrated Checklist</span>
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Check off completed books read in your physical Bible
            </p>
          </div>

          {/* Standardized Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 w-full pt-1 text-[10px] font-mono">
            {CANON_CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1.5 rounded-xl border whitespace-nowrap transition-colors cursor-pointer font-bold ${
                  activeCategory === cat
                    ? 'bg-amber-500 border-amber-400 text-slate-950 font-black shadow-sm'
                    : 'bg-black/60 border-white/15 text-white hover:border-amber-400/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>{completedCount} of 66 Books Completed</span>
            <span>{percentComplete}% of Canon Consecrated</span>
          </div>
        </div>

        {/* Books Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pr-1">
          {filteredBooks.map((book) => {
            const bookChaptersRead = Array.from({ length: book.totalChapters }, (_, i) => i + 1)
              .filter(c => readChapters.includes(`${book.id}_${c}`)).length;
            const isDone = Boolean(completedBooks[book.id]) || bookChaptersRead === book.totalChapters;
            const effectiveRead = isDone ? book.totalChapters : bookChaptersRead;
            return (
              <div
                key={book.id}
                onClick={() => {
                  if (onOpenPassage) {
                    onOpenPassage({ bookId: book.id, chapter: 1 });
                  } else {
                    window.dispatchEvent(new CustomEvent('yf_navigate_scripture', { detail: { bookId: book.id, chapter: 1 } }));
                  }
                }}
                className={`bg-black/60 border rounded-xl p-3 flex items-center justify-between gap-2.5 cursor-pointer transition-all text-white font-bold ${
                  isDone
                    ? 'border-amber-500/50 bg-amber-950/20'
                    : 'border-white/15 hover:border-amber-400/50'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-white font-['Outfit']">{book.name}</span>
                    <span className="px-2 py-0.5 rounded-lg bg-white/10 border border-white/15 text-[10px] font-mono font-bold text-amber-300">
                      {effectiveRead} / {book.totalChapters} Chs
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-300 font-normal block truncate mt-0.5">
                    {book.section || (book.testament === 'OT' ? 'Old Testament' : 'New Testament')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBookCompleted(book.id);
                  }}
                  title={isDone ? 'Mark book unread' : 'Mark book completed'}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
                    isDone ? 'bg-amber-500 text-slate-950' : 'border border-white/30 bg-black/40 hover:border-amber-400'
                  }`}
                >
                  {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default PhysicalBibleTracker;
