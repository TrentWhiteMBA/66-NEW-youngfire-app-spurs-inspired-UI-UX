import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Edit3, Save, Search, BookOpen, FileText, Check, Tag, PenTool, GripVertical } from 'lucide-react';

export interface StudyNote {
  id: string;
  title: string;
  scriptureRef: string;
  tag: string;
  content: string;
  timestamp: number;
  dateString: string;
}

export interface StudyNotesHUDProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen?: () => void;
  onNavigateToScripture?: (bookId: string, chapter: number) => void;
  prefill?: {
    passage?: string;
    title?: string;
  } | null;
}

export const StudyNotesHUD: React.FC<StudyNotesHUDProps> = ({
  isOpen,
  onClose,
  onOpen,
  onNavigateToScripture,
  prefill
}) => {
  const [notes, setNotes] = useState<StudyNote[]>(() => {
    try {
      const saved = localStorage.getItem('youngfire_study_notes');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure no mock notes remain in local storage
        const cleaned = Array.isArray(parsed) 
          ? parsed.filter((n: any) => n.id !== 'note_default_1' && n.id !== 'note_default_2')
          : [];
        return cleaned;
      }
      return [];
    } catch {
      return [];
    }
  });

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form fields
  const [title, setTitle] = useState('');
  const [scriptureRef, setScriptureRef] = useState('');
  const [tag, setTag] = useState('Discipleship');
  const [content, setContent] = useState('');

  // Draggable position state for floating Notes trigger pill
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('yf_notes_hud_pos_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {}
    return { x: 0, y: 0 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isIconHidden, setIsIconHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem('youngfire_hide_notes_icon') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleVisibilityChange = (e: Event) => {
      const customEv = e as CustomEvent<{ hidden?: boolean }>;
      if (typeof customEv.detail?.hidden === 'boolean') {
        setIsIconHidden(customEv.detail.hidden);
      } else {
        try {
          setIsIconHidden(localStorage.getItem('youngfire_hide_notes_icon') === 'true');
        } catch {}
      }
    };
    window.addEventListener('yf_notes_icon_visibility_changed', handleVisibilityChange);
    return () => window.removeEventListener('yf_notes_icon_visibility_changed', handleVisibilityChange);
  }, []);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0
  });
  const hasDraggedRef = useRef(false);

  // Sync prefill prop changes
  useEffect(() => {
    if (prefill && isOpen) {
      setIsCreatingNew(true);
      setActiveNoteId(null);
      const pass = prefill.passage || '';
      const tit = prefill.title || (pass ? `${pass} Study Notes` : 'New Study Note');
      setTitle(tit);
      setScriptureRef(pass);
      setTag('Discipleship');
      setContent('');
    }
  }, [prefill, isOpen]);

  // Listen for global custom events to prefill and open notes HUD
  useEffect(() => {
    const handleOpenHudEvent = (e: any) => {
      const detail = e.detail;
      if (detail) {
        setIsCreatingNew(true);
        setActiveNoteId(null);
        const pass = detail.passage || `${detail.book || ''} ${detail.chapter || ''}`.trim();
        const tit = detail.title || (pass ? `${pass} Study Notes` : 'New Study Note');
        setTitle(tit);
        setScriptureRef(pass);
        setTag('Discipleship');
        setContent('');
      }
      onOpen?.();
    };

    window.addEventListener('yf_open_notes_hud', handleOpenHudEvent);
    window.addEventListener('yf_open_study_notes', handleOpenHudEvent);
    return () => {
      window.removeEventListener('yf_open_notes_hud', handleOpenHudEvent);
      window.removeEventListener('yf_open_study_notes', handleOpenHudEvent);
    };
  }, [onOpen]);

  // Touch & Pointer drag handlers for floating Notes trigger
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: position.x,
      initY: position.y
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      hasDraggedRef.current = true;
    }

    const newX = dragStartRef.current.initX + dx;
    const newY = dragStartRef.current.initY + dy;

    // Viewport clamping so pen icon cannot be lost off screen or block bars
    const maxLeft = -(typeof window !== 'undefined' ? window.innerWidth - 70 : 300);
    const maxRight = 10;
    const maxUp = -(typeof window !== 'undefined' ? window.innerHeight - 130 : 600);
    const maxDown = 60;

    const clampedX = Math.max(maxLeft, Math.min(maxRight, newX));
    const clampedY = Math.max(maxUp, Math.min(maxDown, newY));

    setPosition({ x: clampedX, y: clampedY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    try {
      localStorage.setItem('yf_notes_hud_pos_v2', JSON.stringify(position));
    } catch {}
  };

  const handleClickTrigger = (e: React.MouseEvent) => {
    if (hasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onOpen?.();
  };

  // Sync with backend API
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/notes')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.notes) && data.notes.length > 0) {
          setNotes(data.notes);
          try {
            localStorage.setItem('youngfire_study_notes', JSON.stringify(data.notes));
          } catch {}
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const handleStartCreate = () => {
    setIsCreatingNew(true);
    setActiveNoteId(null);
    setTitle('');
    setScriptureRef('');
    setTag('Discipleship');
    setContent('');
  };

  const handleSelectNote = (n: StudyNote) => {
    setIsCreatingNew(false);
    setActiveNoteId(n.id);
    setTitle(n.title);
    setScriptureRef(n.scriptureRef || '');
    setTag(n.tag || 'General');
    setContent(n.content);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const now = new Date();
    const dateString = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const notePayload: StudyNote = {
      id: activeNoteId || `note_${Date.now()}`,
      title: title.trim(),
      scriptureRef: scriptureRef.trim(),
      tag: tag.trim(),
      content: content.trim(),
      timestamp: Date.now(),
      dateString
    };

    let updatedList: StudyNote[] = [];
    if (activeNoteId) {
      updatedList = notes.map(n => n.id === activeNoteId ? notePayload : n);
    } else {
      updatedList = [notePayload, ...notes];
      setActiveNoteId(notePayload.id);
      setIsCreatingNew(false);
    }

    setNotes(updatedList);
    try {
      localStorage.setItem('youngfire_study_notes', JSON.stringify(updatedList));
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notePayload)
      });
    } catch {}
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    if (activeNoteId === id) {
      setActiveNoteId(null);
      setIsCreatingNew(false);
    }
    try {
      localStorage.setItem('youngfire_study_notes', JSON.stringify(updated));
      await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    } catch {}
  };

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (n.scriptureRef && n.scriptureRef.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (n.tag && n.tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      {/* Movable, Draggable Floating "Notes" Pen Button accessible across all tabs (unless hidden in Settings) */}
      {!isOpen && onOpen && !isIconHidden && (
        <button
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={handleClickTrigger}
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
            touchAction: 'none'
          }}
          className={`fixed bottom-24 right-4 z-[9000] p-3 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 text-slate-950 shadow-[0_8px_24px_rgba(245,158,11,0.45),0_0_12px_rgba(251,191,36,0.3)] border-2 border-white/50 flex items-center justify-center group touch-none select-none transition-shadow ${
            isDragging ? 'cursor-grabbing scale-105 shadow-2xl ring-4 ring-amber-400/40' : 'cursor-grab hover:scale-105 active:scale-95'
          }`}
          title="Drag anywhere to reposition • Tap to Open Study Notes HUD"
          aria-label="Movable Study Notes Trigger"
        >
          <GripVertical className="w-3.5 h-3.5 text-slate-900/60 -mr-0.5 group-hover:text-slate-950 transition-colors" />
          <PenTool className="w-5 h-5 stroke-[2.5] text-slate-950 group-hover:rotate-12 transition-transform" />
          <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out font-mono text-xs font-black tracking-wider pl-0 group-hover:pl-1.5">
            NOTES
          </span>
        </button>
      )}

      {/* Floating Study Notes HUD Modal with high z-index z-[9999] */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none"
          onClick={onClose}
        >
          <div 
            className="w-full max-w-4xl bg-[#0a0a0a] border border-amber-500/40 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.15)] flex flex-col max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#000000] border-t border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_4px_12px_rgba(245,158,11,0.25)]">
                  <PenTool className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase font-['Outfit'] text-white tracking-wide">
                    GLOBAL STUDY NOTES & REVELATION HUD
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400">
                    Capture, edit & persist personal scripture insights across all tabs
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleStartCreate}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all border-t border-white/30"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>New Note</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer transition-colors"
                  aria-label="Close Notes HUD"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body Split View */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left Column: Notes List */}
              <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/10 flex flex-col bg-[#000000]/60">
                {/* Search Bar */}
                <div className="p-3 border-b border-white/5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search notes or scripture..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-60 md:max-h-none">
                  {filteredNotes.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 font-serif">
                      No notes found. Tap <strong>New Note</strong> to create your first revelation entry.
                    </div>
                  ) : (
                    filteredNotes.map((n) => {
                      const isSelected = n.id === activeNoteId && !isCreatingNew;
                      return (
                        <div
                          key={n.id}
                          onClick={() => handleSelectNote(n)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-400 text-white shadow-md'
                              : 'bg-[#0a0a0a]/80 border-white/5 text-slate-300 hover:border-white/20 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-bold text-white truncate font-['Outfit']">{n.title}</h4>
                            <button
                              onClick={(e) => handleDeleteNote(n.id, e)}
                              className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                              title="Delete Note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {n.scriptureRef && (
                            <span className="text-[10px] font-mono text-amber-400 font-bold block mt-0.5">
                              {n.scriptureRef}
                            </span>
                          )}

                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5 text-[9px] font-mono text-slate-400">
                            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                              {n.tag}
                            </span>
                            <span>{n.dateString}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Note Editor or Empty View */}
              <div className="flex-1 flex flex-col p-4 sm:p-6 bg-[#0a0a0a] overflow-y-auto">
                {isCreatingNew || activeNoteId ? (
                  <form onSubmit={handleSaveNote} className="flex-1 flex flex-col space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <span className="text-xs font-mono font-bold uppercase text-amber-400">
                        {isCreatingNew ? '✦ New Study Note' : '✦ Edit Study Note'}
                      </span>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all border-t border-white/30"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Note</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-mono text-slate-400 block mb-1">Title</label>
                        <input
                          type="text"
                          placeholder="e.g., Unity in the Spirit, Armor of God..."
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-['Outfit'] focus:outline-none focus:border-amber-400"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-slate-400 block mb-1">Topic Tag</label>
                        <select
                          value={tag}
                          onChange={(e) => setTag(e.target.value)}
                          className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-400"
                        >
                          <option value="Discipleship">Discipleship</option>
                          <option value="Sanctuary Watch">Sanctuary Watch</option>
                          <option value="Brotherhood">Brotherhood</option>
                          <option value="Sisterhood">Sisterhood</option>
                          <option value="Theology">Theology</option>
                          <option value="Prayer">Prayer</option>
                          <option value="General">General</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-1">Scripture Reference Anchor</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g., Ephesians 4:16 or Romans 12:1-2"
                          value={scriptureRef}
                          onChange={(e) => setScriptureRef(e.target.value)}
                          className="flex-1 bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                        />
                        {scriptureRef && onNavigateToScripture && (
                          <button
                            type="button"
                            onClick={() => {
                              onNavigateToScripture('EPH', 4);
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                            title="Open in Scripture Viewer"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Open Passage</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col min-h-[220px]">
                      <label className="text-[10px] font-mono text-slate-400 block mb-1">Revelation & Study Notes</label>
                      <textarea
                        placeholder="Write down personal notes, key takeaways, Greek/Hebrew word insights, and prayers..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={10}
                        className="w-full flex-1 bg-[#000000] border border-white/10 rounded-2xl p-4 text-xs text-white leading-relaxed font-serif focus:outline-none focus:border-amber-400 resize-none"
                        required
                      />
                    </div>
                  </form>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 text-slate-400">
                    <FileText className="w-12 h-12 text-slate-600" />
                    <h4 className="text-sm font-bold text-white font-['Outfit']">No Note Selected</h4>
                    <p className="text-xs font-serif max-w-sm">
                      Select a note from the list on the left to read or edit, or tap <strong>New Note</strong> above to capture fresh revelation.
                    </p>
                    <button
                      onClick={handleStartCreate}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs flex items-center gap-1.5 shadow-md cursor-pointer mt-2 border-t border-white/30"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Generate New Note</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
