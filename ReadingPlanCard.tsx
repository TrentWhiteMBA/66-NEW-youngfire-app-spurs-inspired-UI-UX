import React, { useState, useEffect } from 'react';
import { 
  BookOpen, CheckCircle2, Circle, ChevronDown, ChevronUp, 
  Sparkles, Flame, Shield, Heart, ArrowRight, RotateCcw,
  Check, Award, Trash2 
} from 'lucide-react';
import { ReadingPlan, ReadingPlanDay, getCompletedDays, toggleDayCompleted, resetPlanProgress } from '../data/readingPlansData';
import confetti from 'canvas-confetti';

interface ReadingPlanCardProps {
  plan: ReadingPlan;
  onNavigateToScripture?: (bookId: string, chapter: number) => void;
  defaultExpanded?: boolean;
  onDeletePlan?: (planId: string) => void;
}

export const ReadingPlanCard: React.FC<ReadingPlanCardProps> = ({
  plan,
  onNavigateToScripture,
  defaultExpanded = false,
  onDeletePlan
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [completedDays, setCompletedDays] = useState<number[]>(() => getCompletedDays(plan.id));
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  // Sync state if external changes occur
  useEffect(() => {
    setCompletedDays(getCompletedDays(plan.id));
  }, [plan.id]);

  const totalDays = plan.durationDays;
  const completedCount = completedDays.length;
  const percentage = Math.min(100, Math.round((completedCount / totalDays) * 100));
  const isAllCompleted = completedCount === totalDays && totalDays > 0;

  const handleToggleDay = (dayNum: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = toggleDayCompleted(plan.id, dayNum);
    setCompletedDays(updated);

    // If day newly completed and resulted in 100% completion, trigger celebratory confetti
    if (!completedDays.includes(dayNum) && updated.length === totalDays) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}
    }
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Reset your progress for "${plan.title}"?`)) {
      resetPlanProgress(plan.id);
      setCompletedDays([]);
    }
  };

  // Color mappings
  const colorMap: Record<string, any> = {
    orange: {
      border: 'border-orange-500/40',
      glow: 'shadow-orange-500/10',
      badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
      accentText: 'text-orange-400',
      barBg: 'bg-orange-500',
      buttonBg: 'bg-orange-500 hover:bg-orange-400 text-slate-950',
      dayCheck: 'text-orange-400'
    },
    amber: {
      border: 'border-amber-500/40',
      glow: 'shadow-amber-500/10',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      accentText: 'text-amber-400',
      barBg: 'bg-amber-500',
      buttonBg: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
      dayCheck: 'text-amber-400'
    },
    rose: {
      border: 'border-rose-500/40',
      glow: 'shadow-rose-500/10',
      badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      accentText: 'text-rose-400',
      barBg: 'bg-rose-500',
      buttonBg: 'bg-rose-500 hover:bg-rose-400 text-slate-950',
      dayCheck: 'text-rose-400'
    },
    cyan: {
      border: 'border-cyan-500/40',
      glow: 'shadow-cyan-500/10',
      badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      accentText: 'text-cyan-400',
      barBg: 'bg-cyan-500',
      buttonBg: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950',
      dayCheck: 'text-cyan-400'
    },
    purple: {
      border: 'border-purple-500/40',
      glow: 'shadow-purple-500/10',
      badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      accentText: 'text-purple-400',
      barBg: 'bg-purple-500',
      buttonBg: 'bg-purple-500 hover:bg-purple-400 text-slate-950',
      dayCheck: 'text-purple-400'
    },
    emerald: {
      border: 'border-emerald-500/40',
      glow: 'shadow-emerald-500/10',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      accentText: 'text-emerald-400',
      barBg: 'bg-emerald-500',
      buttonBg: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950',
      dayCheck: 'text-emerald-400'
    }
  };

  const scheme = colorMap[plan.accentColor || 'amber'] || colorMap.amber;

  return (
    <div className={`bg-[#0a0a0a] border ${scheme.border} rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl ${scheme.glow} transition-all`}>
      {/* Plan Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold border uppercase tracking-wider ${scheme.badgeBg}`}>
              {plan.badge}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {plan.durationDays} Daily Milestones
            </span>
            {isAllCompleted && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold flex items-center gap-1">
                <Award className="w-3 h-3" />
                <span>PLAN COMPLETED</span>
              </span>
            )}
          </div>

          <h3 className="text-base sm:text-lg font-black font-['Outfit'] uppercase text-white tracking-wide">
            {plan.title}
          </h3>

          <p className="text-xs text-slate-300 font-mono">
            {plan.subtitle}
          </p>

          <p className="text-xs text-slate-400 font-serif leading-relaxed pt-1">
            {plan.description}
          </p>
        </div>

        {/* Action Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {completedCount > 0 && (
            <button
              onClick={handleReset}
              className="p-2 rounded-xl bg-[#0a0a0a] border border-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Reset Plan Progress"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {onDeletePlan && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete the reading plan "${plan.title}"?`)) {
                  onDeletePlan(plan.id);
                }
              }}
              className="p-2 rounded-xl bg-[#0a0a0a] border border-white/10 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Delete this reading plan"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-3.5 py-2 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isExpanded 
                ? 'bg-[#151515] text-white border border-white/20' 
                : `${scheme.buttonBg} shadow-md`
            }`}
          >
            <span>{isExpanded ? 'Collapse Days' : 'Expand Plan'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5 bg-black/60 p-3 rounded-2xl border border-white/5">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-300 flex items-center gap-1.5">
            <span className={scheme.accentText}>Progress:</span>
            <span>{completedCount} of {totalDays} Days Completed</span>
          </span>
          <span className={`font-bold ${isAllCompleted ? 'text-emerald-400' : scheme.accentText}`}>
            {percentage}%
          </span>
        </div>

        <div className="w-full h-2 rounded-full bg-[#151515] overflow-hidden relative">
          <div 
            className={`h-full ${scheme.barBg} transition-all duration-500 rounded-full`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {plan.themeScripture && (
          <p className="text-[10px] text-slate-400 font-mono italic pt-1 truncate">
            &bull; {plan.themeScripture}
          </p>
        )}
      </div>

      {/* Expandable Day List */}
      {isExpanded && (
        <div className="space-y-2.5 pt-2 border-t border-white/10 animate-fadeIn">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
              Day-by-Day Scripture Milestones:
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Click checkbox to mark completed
            </span>
          </div>

          <div className="space-y-2">
            {plan.days.map((day: ReadingPlanDay) => {
              const isDayDone = completedDays.includes(day.dayNumber);
              const isDetailOpen = expandedDay === day.dayNumber;

              return (
                <div
                  key={day.dayNumber}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isDayDone
                      ? 'bg-black/40 border-emerald-500/30 text-slate-300'
                      : 'bg-black/80 border-white/10 hover:border-white/20 text-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Completion Checkbox */}
                    <button
                      onClick={(e) => handleToggleDay(day.dayNumber, e)}
                      className={`mt-0.5 p-1 rounded-lg transition-transform active:scale-90 cursor-pointer ${
                        isDayDone 
                          ? 'text-emerald-400 hover:text-emerald-300' 
                          : 'text-slate-500 hover:text-white'
                      }`}
                      title={isDayDone ? 'Mark as Incomplete' : 'Mark as Completed'}
                    >
                      {isDayDone ? (
                        <CheckCircle2 className="w-5 h-5 fill-emerald-500/20" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    {/* Day Content Header */}
                    <div 
                      className="flex-1 cursor-pointer select-none"
                      onClick={() => setExpandedDay(isDetailOpen ? null : day.dayNumber)}
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                          isDayDone ? 'bg-emerald-500/20 text-emerald-300' : `${scheme.badgeBg}`
                        }`}>
                          Day {day.dayNumber}
                        </span>

                        <span className="px-2 py-0.5 rounded bg-[#0a0a0a] border border-white/15 text-slate-200 font-mono text-[10px] font-bold">
                          {day.scriptureReference}
                        </span>

                        {isDayDone && (
                          <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Done</span>
                          </span>
                        )}
                      </div>

                      <h4 className={`text-xs sm:text-sm font-bold tracking-wide ${isDayDone ? 'line-through text-slate-400' : 'text-white'}`}>
                        {day.title}
                      </h4>

                      <p className="text-[11px] text-slate-300 font-serif line-clamp-2 mt-1">
                        {day.devotionalFocus}
                      </p>
                    </div>

                    {/* Action: Direct Navigation to 66-Book Bible view */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => {
                          if (onNavigateToScripture) {
                            onNavigateToScripture(day.bookId, day.chapter);
                          } else {
                            window.dispatchEvent(new CustomEvent('yf_navigate_scripture', {
                              detail: { bookId: day.bookId, chapter: day.chapter }
                            }));
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition-all ${
                          isDayDone 
                            ? 'bg-[#0a0a0a] hover:bg-[#1a1a1a] text-slate-300 border border-white/10' 
                            : `${scheme.buttonBg}`
                        }`}
                        title={`Open ${day.scriptureReference} in 66-Book Bible`}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Read Scripture</span>
                        <ArrowRight className="w-3 h-3 sm:hidden" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Devotional & Reflection Details */}
                  {isDetailOpen && (
                    <div className="mt-3 pt-3 border-t border-white/5 space-y-2 text-xs animate-fadeIn bg-[#0a0a0a]/60 p-3 rounded-xl">
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-amber-400 font-bold">Key Passage Quote:</span>
                        <p className="text-[11px] text-amber-200/90 font-serif italic border-l-2 border-amber-400/60 pl-2 py-0.5">
                          {day.keyVerse}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-cyan-400 font-bold">Discipleship Reflection:</span>
                        <p className="text-[11px] text-slate-300 font-serif">
                          {day.reflectionPrompt}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 font-bold">Today's Consecrated Action:</span>
                        <p className="text-[11px] text-emerald-200/90 font-mono">
                          &bull; {day.practicalAction}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
