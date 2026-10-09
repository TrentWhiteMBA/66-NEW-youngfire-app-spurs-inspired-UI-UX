import React, { useState, useMemo, useEffect } from 'react';
import { BibleBook } from '../types/scripture';
import { BIBLE_BOOKS } from '../data/bibleBooks';
import { X, Search, BookOpen, ChevronLeft, ArrowRight, Layers } from 'lucide-react';

interface BookDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBook: BibleBook;
  currentChapter: number;
  onSelectBookAndChapter: (book: BibleBook, chapter: number) => void;
}

export const BookDirectoryModal: React.FC<BookDirectoryModalProps> = ({
  isOpen,
  onClose,
  selectedBook,
  currentChapter,
  onSelectBookAndChapter
}) => {
  const [search, setSearch] = useState('');
  const [testament, setTestament] = useState<'ALL' | 'OT' | 'NT'>('ALL');
  const [activeBook, setActiveBook] = useState<BibleBook>(selectedBook);
  const [mobileTab, setMobileTab] = useState<'books' | 'chapters'>('books');

  // Sync activeBook with selectedBook whenever modal opens or selectedBook updates
  useEffect(() => {
    if (isOpen && selectedBook) {
      setActiveBook(selectedBook);
    }
  }, [isOpen, selectedBook]);

  const filteredBooks = useMemo(() => {
    return BIBLE_BOOKS.filter(book => {
      const matchTestament = testament === 'ALL' || book.testament === testament;
      const matchSearch =
        !search.trim() ||
        book.name.toLowerCase().includes(search.toLowerCase()) ||
        book.id.toLowerCase().includes(search.toLowerCase()) ||
        (book.section && book.section.toLowerCase().includes(search.toLowerCase()));
      return matchTestament && matchSearch;
    });
  }, [search, testament]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] bg-[#0a0a0a] border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-6 border-b border-slate-800 bg-black/70 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-bold font-['Cinzel'] tracking-wide text-white">
                Holy Scripture Directory
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 font-mono">
                Select from the 66 inspired books &bull; Jump directly to any chapter
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-[#151515] hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close Directory"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Step Switcher: [ 1. Choose Book ] | [ 2. Choose Chapter ] */}
        <div className="md:hidden px-3 pt-2.5 pb-1 bg-[#0a0a0a] border-b border-slate-800/80">
          <div className="flex items-center gap-1.5 bg-black p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setMobileTab('books')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all cursor-pointer text-center ${
                mobileTab === 'books'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              1. Books ({filteredBooks.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('chapters')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all cursor-pointer text-center truncate ${
                mobileTab === 'chapters'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2. {activeBook.name} ({activeBook.totalChapters} Ch)
            </button>
          </div>
        </div>

        {/* Filters & Search (Only active when on books view or desktop) */}
        <div className={`p-3 sm:p-4 border-b border-slate-800/80 bg-[#0a0a0a]/60 flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-center justify-between ${mobileTab === 'chapters' ? 'hidden md:flex' : 'flex'}`}>
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search books (e.g. John, Genesis, Romans)..."
              className="w-full bg-black border border-slate-700 text-slate-100 placeholder:text-slate-500 text-xs pl-9 pr-3 py-2 rounded-xl focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-black p-1 rounded-xl border border-slate-800 text-xs font-mono">
            {(['ALL', 'OT', 'NT'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTestament(t)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  testament === t
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t === 'ALL' ? 'All (66)' : t === 'OT' ? 'Old Testament (39)' : 'New Testament (27)'}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="flex-1 grid md:grid-cols-12 overflow-hidden min-h-0">
          {/* Books List (Left 7 cols on desktop, full width on mobile) */}
          <div className={`md:col-span-7 border-r border-slate-800 overflow-y-auto p-3 sm:p-4 space-y-2 ${mobileTab === 'chapters' ? 'hidden md:block' : 'block'}`}>
            <div className="text-[11px] font-mono uppercase font-bold text-slate-400 px-1 mb-2 flex items-center justify-between">
              <span>Books of the Bible ({filteredBooks.length})</span>
              <span className="text-[10px] text-slate-500">Tap book to select chapter</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredBooks.map(book => {
                const isSelected = activeBook.id === book.id;
                const isCurrent = selectedBook.id === book.id;
                return (
                  <button
                    key={book.id}
                    onClick={() => {
                      setActiveBook(book);
                      setMobileTab('chapters');
                    }}
                    className={`p-3 rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between border ${
                      isSelected
                        ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-lg shadow-amber-500/10'
                        : isCurrent
                        ? 'bg-[#151515]/90 text-amber-300 border-amber-500/40 hover:bg-[#1a1a1a]'
                        : 'bg-black/60 text-slate-300 border-slate-800 hover:bg-[#1a1a1a]/70 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-xs truncate">{book.name}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                          isSelected ? 'bg-black/20 text-black' : 'bg-[#151515] text-slate-400'
                        }`}
                      >
                        {book.testament}
                      </span>
                    </div>

                    <div
                      className={`text-[10px] font-mono mt-1 flex justify-between items-center ${
                        isSelected ? 'text-black/80' : 'text-slate-400'
                      }`}
                    >
                      <span>{book.totalChapters} ch</span>
                      {isCurrent && <span className="text-[9px] font-bold">Current</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chapter Quick-Jump (Right 5 cols on desktop, full width on mobile) */}
          <div className={`md:col-span-5 bg-black/40 p-4 sm:p-5 overflow-y-auto flex flex-col justify-between ${mobileTab === 'books' ? 'hidden md:flex' : 'flex'}`}>
            <div>
              {/* Mobile Back to Books trigger */}
              <button
                type="button"
                onClick={() => setMobileTab('books')}
                className="md:hidden mb-3 text-xs font-mono text-amber-400 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Choose Different Book</span>
              </button>

              <div className="border-b border-slate-800 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                    {activeBook.testament === 'OT' ? 'Old Testament' : 'New Testament'}
                  </span>
                  {activeBook.section && (
                    <span className="text-[10px] font-mono text-slate-400">{activeBook.section}</span>
                  )}
                </div>
                <h3 className="text-xl font-bold font-serif text-white mt-1">{activeBook.name}</h3>
                {activeBook.purpose && (
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-3">
                    {activeBook.purpose}
                  </p>
                )}
              </div>

              <div className="text-xs font-mono font-bold text-amber-400 mb-2.5 flex items-center justify-between">
                <span>Select Chapter (1 - {activeBook.totalChapters}):</span>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-72 overflow-y-auto pr-1">
                {Array.from({ length: (activeBook.totalChapters || (activeBook as any).chaptersCount || 1) }, (_, i: number) => i + 1).map((ch: number) => {
                  const isCurrentPassage =
                    selectedBook.id === activeBook.id && currentChapter === ch;
                  return (
                    <button
                      key={ch}
                      onClick={() => {
                        onSelectBookAndChapter(activeBook, ch);
                        setMobileTab('books');
                        onClose();
                      }}
                      className={`h-10 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center border ${
                        isCurrentPassage
                          ? 'bg-amber-500 text-black border-amber-400 ring-2 ring-amber-400/50 shadow-md'
                          : 'bg-[#0a0a0a] text-slate-200 border-slate-800 hover:bg-[#1a1a1a] hover:border-amber-400 hover:text-white'
                      }`}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Direct jump to first chapter button */}
            <div className="pt-4 border-t border-slate-800 mt-4">
              <button
                onClick={() => {
                  onSelectBookAndChapter(activeBook, 1);
                  setMobileTab('books');
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-mono font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 transition-all active:scale-98"
              >
                <span>Read {activeBook.name} Chapter 1</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
