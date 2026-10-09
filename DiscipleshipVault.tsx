import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, BookOpen, Calendar, Trash2, Edit3, Plus, 
  Search, FileText, CheckCircle2, ChevronRight, Video, 
  ExternalLink, Download, AlertTriangle 
} from 'lucide-react';
import { INITIAL_AUTHENTIC_LESSONS, DiscipleshipLesson } from '../data/lessonsData';
import { CurrentUser } from './SettingsHUDModal';

interface DiscipleshipVaultProps {
  onBack?: () => void;
  currentUser?: CurrentUser | null;
  onNavigateToScripture?: (bookId: string, chapter: number) => void;
}

export const DiscipleshipVault: React.FC<DiscipleshipVaultProps> = ({
  onBack,
  currentUser,
  onNavigateToScripture
}) => {
  // Lesson dates are strictly locked to their original file creation dates - never dynamically altered
  const [lessons, setLessons] = useState<DiscipleshipLesson[]>(() => {
    try {
      const saved = localStorage.getItem('youngfire_authentic_lessons');
      return saved ? JSON.parse(saved) : INITIAL_AUTHENTIC_LESSONS;
    } catch {
      return INITIAL_AUTHENTIC_LESSONS;
    }
  });

  const [selectedLessonIndex, setSelectedLessonIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lessonToDelete, setLessonToDelete] = useState<DiscipleshipLesson | null>(null);
  const [toastMsg, setToastMsg] = useState<string>('');

  // Fetch updated lessons from backend if available
  useEffect(() => {
    fetch('/api/lessons')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.lessons) && data.lessons.length > 0) {
          setLessons(data.lessons);
          try {
            localStorage.setItem('youngfire_authentic_lessons', JSON.stringify(data.lessons));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const isAuthorized = currentUser?.isAdmin || currentUser?.email?.toLowerCase().includes('trent') || currentUser?.email?.toLowerCase().includes('whitney');

  const handleDeleteLesson = async () => {
    if (!lessonToDelete) return;

    const id = lessonToDelete.id;
    const updated = lessons.filter(l => l.id !== id);
    setLessons(updated);
    setSelectedLessonIndex(0);
    setLessonToDelete(null);

    try {
      localStorage.setItem('youngfire_authentic_lessons', JSON.stringify(updated));
      await fetch(`/api/lessons/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete lesson on server:', err);
    }

    setToastMsg(`Lesson "${lessonToDelete.lessonTitle || lessonToDelete.title}" deleted.`);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const filteredLessons = lessons.filter(l => {
    const q = searchQuery.toLowerCase();
    const title = (l.lessonTitle || l.title || '').toLowerCase();
    const series = (l.seriesTitle || '').toLowerCase();
    const scripture = (l.primaryPassage || l.scripturePassage || '').toLowerCase();
    const teachers = (l.teachers || l.facilitator || '').toLowerCase();
    return title.includes(q) || series.includes(q) || scripture.includes(q) || teachers.includes(q);
  });

  const activeLesson = filteredLessons[selectedLessonIndex] || filteredLessons[0] || lessons[0];

  return (
    <div className="space-y-6 select-none max-w-5xl mx-auto px-2 sm:px-4 py-4">
      {/* Vault Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-[#0a0a0a] border border-white/15 text-slate-200 hover:text-white cursor-pointer transition-colors"
              title="Return"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                YoungFire Discipleship Vault &bull; {lessons.length} Taught Sessions
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                Dates Locked to Creation
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-['Outfit'] uppercase text-white tracking-wide">
              Expository Teaching Archives
            </h2>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search lessons, scripture..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedLessonIndex(0);
            }}
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
          />
        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-400 rounded-xl text-emerald-300 text-xs font-mono font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Horizontal Session Selector with Delete Trash Can icon */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {filteredLessons.map((les, idx) => {
          const isSelected = activeLesson?.id === les.id;
          return (
            <div
              key={les.id}
              className={`flex items-center rounded-xl border transition-all ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md'
                  : 'bg-[#0a0a0a] text-slate-300 hover:text-white border-white/10'
              }`}
            >
              <button
                onClick={() => setSelectedLessonIndex(idx)}
                className="px-3 py-2 text-xs font-mono font-bold whitespace-nowrap cursor-pointer"
              >
                {idx + 1}. {(les.lessonTitle || les.title || '').length > 24 ? `${(les.lessonTitle || les.title || '').slice(0, 24)}...` : (les.lessonTitle || les.title || '')}
              </button>

              {/* Trash Can for Authorized Leaders & Admins */}
              {isAuthorized && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLessonToDelete(les);
                  }}
                  className={`p-1.5 mr-1.5 rounded-lg hover:bg-rose-500 hover:text-white transition-colors cursor-pointer ${
                    isSelected ? 'text-slate-800' : 'text-slate-500 hover:text-rose-400'
                  }`}
                  title={`Delete Lesson: ${les.lessonTitle || les.title}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Active Lesson Detailed Card */}
      {activeLesson ? (
        <div className="p-5 sm:p-6 bg-[#0a0a0a] border border-amber-500/30 rounded-3xl shadow-xl space-y-5">
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-white/10">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  {activeLesson.seriesTitle || 'Discipleship Series'}
                </span>
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-cyan-400" />
                  <span>Teaching Date: <strong>{activeLesson.teachingDate || '2026-09-02'}</strong> (Locked File Date)</span>
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black font-['Outfit'] uppercase text-white">
                {activeLesson.lessonTitle || activeLesson.title}
              </h3>
              <p className="text-xs font-mono text-slate-400">
                Facilitators: {activeLesson.teachers || activeLesson.facilitator || 'Trent White & Whitney White'}
              </p>
            </div>

            {/* Actions: Scripture deep link & Delete */}
            <div className="flex items-center gap-2 flex-wrap">
              {(activeLesson.primaryPassage || activeLesson.scripturePassage) && (
                <button
                  onClick={() => {
                    if (onNavigateToScripture) {
                      onNavigateToScripture(activeLesson.bookId || 'REV', activeLesson.chapter || 3);
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                  title="Open Scripture Passage"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Read {activeLesson.primaryPassage || activeLesson.scripturePassage}</span>
                </button>
              )}

              {isAuthorized && (
                <button
                  onClick={() => setLessonToDelete(activeLesson)}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                  title="Delete this lesson from Vault"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Delete Lesson</span>
                </button>
              )}
            </div>
          </div>

          {/* Description & Theme */}
          <div className="space-y-2">
            <div className="text-xs font-mono text-amber-400 font-bold">
              Core Theme: {activeLesson.theme || 'Faithfulness and Spiritual Vigor'}
            </div>
            <p className="text-xs sm:text-sm text-slate-300 font-serif leading-relaxed">
              {activeLesson.description || activeLesson.summary}
            </p>
          </div>

          {/* Study Notes Content */}
          {(activeLesson.studyNotes || activeLesson.notesContent) && (
            <div className="p-4 bg-[#000000] border border-white/10 rounded-2xl space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block">
                Expository Study Outline & Greek Insights
              </span>
              <pre className="text-xs text-slate-200 font-serif leading-relaxed whitespace-pre-wrap font-sans">
                {activeLesson.studyNotes || activeLesson.notesContent}
              </pre>
            </div>
          )}

          {/* Discussion Questions */}
          {activeLesson.questions && activeLesson.questions.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
                Living Room Fellowship Discussion Questions
              </span>
              <ul className="space-y-1.5 text-xs text-slate-300 font-serif list-disc pl-5">
                {(activeLesson.questions || []).map((q: any, qIdx: number) => (
                  <li key={qIdx} className="leading-relaxed">
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Challenge */}
          {activeLesson.challenge && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs font-mono text-amber-300">
              <strong className="text-amber-400 block mb-0.5">Weekly Kingdom Challenge:</strong>
              {activeLesson.challenge}
            </div>
          )}

          {/* PDF Attachments */}
          {activeLesson.attachments && activeLesson.attachments.length > 0 && (
            <div className="pt-2 border-t border-white/10">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block mb-2">
                Study Guides & PDF Resources
              </span>
              <div className="flex flex-wrap gap-2">
                {activeLesson.attachments.map((att: any, aIdx: number) => (
                  <div
                    key={aIdx}
                    className="p-2.5 bg-[#0a0a0a] border border-white/10 rounded-xl flex items-center gap-2 text-xs font-mono text-slate-200"
                  >
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>{att.name}</span>
                    <span className="text-[10px] text-slate-500">({att.size})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-12 text-center text-slate-400 font-mono text-xs">
          No discipleship lessons found matching query.
        </div>
      )}

      {/* Safety Confirmation Modal for Lesson Deletion */}
      {lessonToDelete && (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0a0a0a] border border-rose-500/50 rounded-3xl p-5 space-y-4 text-center">
            <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
            <h4 className="text-sm font-bold text-white uppercase font-['Outfit']">
              Confirm Lesson Deletion
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-white">"{lessonToDelete.lessonTitle || lessonToDelete.title}"</strong> from the Discipleship Vault?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setLessonToDelete(null)}
                className="flex-1 py-2 bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-mono rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteLesson}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs font-mono rounded-xl cursor-pointer shadow-md"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
