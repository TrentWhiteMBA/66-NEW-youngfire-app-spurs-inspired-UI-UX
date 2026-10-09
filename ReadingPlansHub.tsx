import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, BookOpen, Plus, CheckCircle2, Circle, 
  Calendar, Flame, Sparkles, Trash2, X, ChevronRight, 
  Award, Shield, Heart, Bookmark 
} from 'lucide-react';
import { READING_PLANS, ReadingPlan, ReadingPlanDay } from '../data/readingPlansData';
import { CurrentUser } from './SettingsHUDModal';
import confetti from 'canvas-confetti';

interface ReadingPlansHubProps {
  onBack?: () => void;
  currentUser?: CurrentUser | null;
  onNavigateToScripture?: (bookId: string, chapter: number) => void;
  initialCategory?: 'all' | 'general' | 'men' | 'women' | 'custom';
}

interface CustomPlanDayInput {
  dayNumber: number;
  title: string;
  scriptureReference: string;
  bookId: string;
  chapter: number;
}

export const ReadingPlansHub: React.FC<ReadingPlansHubProps> = ({
  onBack,
  currentUser,
  onNavigateToScripture,
  initialCategory = 'all'
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'general' | 'men' | 'women' | 'custom'>(initialCategory);
  const [customPlans, setCustomPlans] = useState<ReadingPlan[]>(() => {
    try {
      const saved = localStorage.getItem('youngfire_custom_reading_plans');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activePlanId, setActivePlanId] = useState<string>(() => {
    return READING_PLANS[0]?.id || '';
  });

  // Track completed days per plan: { [planId]: number[] } (array of completed day numbers)
  const [progressMap, setProgressMap] = useState<Record<string, number[]>>(() => {
    try {
      const saved = localStorage.getItem('youngfire_reading_progress_map');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Modal State for "Create Custom Bible Reading Plan"
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [planTitle, setPlanTitle] = useState('');
  const [planSubtitle, setPlanSubtitle] = useState('');
  const [planDuration, setPlanDuration] = useState<5 | 7 | 14 | 30>(7);
  const [planCategory, setPlanCategory] = useState<'general' | 'men' | 'women'>('general');
  const [dailyMilestones, setDailyMilestones] = useState<CustomPlanDayInput[]>([]);

  // Update daily milestones template whenever duration changes in modal
  useEffect(() => {
    const defaultMilestones: CustomPlanDayInput[] = Array.from({ length: planDuration }, (_, i) => {
      const day = i + 1;
      return {
        dayNumber: day,
        title: `Day ${day} Spiritual Milestone`,
        scriptureReference: `Ephesians ${Math.min(day, 6)}:1-10`,
        bookId: 'EPH',
        chapter: Math.min(day, 6)
      };
    });
    setDailyMilestones(defaultMilestones);
  }, [planDuration]);

  // Combine built-in plans + user-created custom plans
  const allPlans: ReadingPlan[] = [...READING_PLANS, ...customPlans];

  const filteredPlans = allPlans.filter(p => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'custom') return customPlans.some(cp => cp.id === p.id);
    return p.category === selectedCategory;
  });

  const activePlan = allPlans.find(p => p.id === activePlanId) || filteredPlans[0] || allPlans[0];

  const handleToggleDayComplete = (planId: string, dayNum: number) => {
    setProgressMap(prev => {
      const current = prev[planId] || [];
      const isAlready = current.includes(dayNum);
      const updated = isAlready ? current.filter(d => d !== dayNum) : [...current, dayNum];

      const newMap = { ...prev, [planId]: updated };
      try {
        localStorage.setItem('youngfire_reading_progress_map', JSON.stringify(newMap));
      } catch {}

      if (!isAlready) {
        try {
          confetti({
            particleCount: 40,
            spread: 55,
            origin: { y: 0.6 }
          });
        } catch {}
      }

      return newMap;
    });
  };

  const handleSaveCustomPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planTitle.trim()) return;

    const newPlanId = `custom_plan_${Date.now()}`;
    const builtDays: ReadingPlanDay[] = dailyMilestones.map(m => ({
      dayNumber: m.dayNumber,
      title: m.title.trim() || `Day ${m.dayNumber} Milestone`,
      scriptureReference: m.scriptureReference.trim() || 'John 1',
      bookId: m.bookId || 'JHN',
      chapter: m.chapter || 1,
      devotionalFocus: `Personal scripture meditation and prayer on ${m.scriptureReference}.`,
      keyVerse: m.scriptureReference,
      reflectionPrompt: 'What is the Holy Spirit speaking to you through this passage today?',
      practicalAction: 'Apply this scripture in at least one conversation or decision today.'
    }));

    const newPlan: ReadingPlan = {
      id: newPlanId,
      title: planTitle.trim(),
      subtitle: planSubtitle.trim() || `${planDuration}-Day Custom Devotional Journey`,
      category: planCategory,
      durationDays: planDuration,
      badge: `${planDuration}-DAY CUSTOM PLAN`,
      description: `A custom user-defined ${planDuration}-day Bible reading plan created by ${currentUser?.name || 'Disciple'}.`,
      accentColor: planCategory === 'men' ? 'orange' : planCategory === 'women' ? 'rose' : 'amber',
      themeScripture: dailyMilestones[0]?.scriptureReference || 'Psalm 119:105',
      days: builtDays
    };

    const updated = [newPlan, ...customPlans];
    setCustomPlans(updated);
    try {
      localStorage.setItem('youngfire_custom_reading_plans', JSON.stringify(updated));
    } catch {}

    setActivePlanId(newPlanId);
    setSelectedCategory('custom');
    setIsCreateModalOpen(false);
    setPlanTitle('');
    setPlanSubtitle('');
  };

  const handleDeleteCustomPlan = (planId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this custom reading plan?')) {
      const updated = customPlans.filter(p => p.id !== planId);
      setCustomPlans(updated);
      try {
        localStorage.setItem('youngfire_custom_reading_plans', JSON.stringify(updated));
      } catch {}
      if (activePlanId === planId) {
        setActivePlanId(READING_PLANS[0]?.id || '');
      }
    }
  };

  const completedDays = progressMap[activePlan?.id || ''] || [];
  const progressPercent = activePlan ? Math.round((completedDays.length / activePlan.durationDays) * 100) : 0;

  return (
    <div className="space-y-6 select-none max-w-5xl mx-auto px-2 sm:px-4 py-4">
      {/* Header */}
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
                Scripture Growth & Daily Milestones
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                {allPlans.length} Total Plans
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-['Outfit'] uppercase text-white tracking-wide">
              Bible Reading Plans Hub
            </h2>
          </div>
        </div>

        {/* Create Custom Plan Action Button */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer transition-all self-start sm:self-auto border-t border-white/40"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Create Custom Bible Reading Plan</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
        {[
          { id: 'all', label: 'All Plans' },
          { id: 'general', label: 'YoungFire Foundations' },
          { id: 'men', label: 'Men On Fire (Brotherhood)' },
          { id: 'women', label: 'Women Ignited (Sisterhood)' },
          { id: 'custom', label: `My Custom Plans (${customPlans.length})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-bold ${
              selectedCategory === tab.id
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                : 'bg-[#0a0a0a] text-slate-300 border-white/10 hover:border-white/25'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Horizontal Plan Selector */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
        {filteredPlans.map((plan) => {
          const isSelected = plan.id === activePlan?.id;
          const isCustom = customPlans.some(cp => cp.id === plan.id);
          const done = (progressMap[plan.id] || []).length;
          const pct = Math.round((done / plan.durationDays) * 100);

          return (
            <div
              key={plan.id}
              onClick={() => setActivePlanId(plan.id)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex-shrink-0 w-64 flex flex-col justify-between ${
                isSelected
                  ? 'bg-gradient-to-b from-amber-500/20 via-slate-900/90 to-[#0a0a0a] border-amber-400 shadow-lg ring-1 ring-amber-400/40'
                  : 'bg-[#0a0a0a] border-white/10 hover:border-white/20'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-400">
                    {plan.durationDays} Days &bull; {plan.category}
                  </span>
                  {isCustom && (
                    <button
                      onClick={(e) => handleDeleteCustomPlan(plan.id, e)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Delete Custom Plan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <h4 className="text-xs font-bold text-white line-clamp-1 font-['Outfit']">
                  {plan.title}
                </h4>
                <p className="text-[10px] text-slate-400 line-clamp-1 font-serif mt-0.5">
                  {plan.subtitle}
                </p>
              </div>

              {/* Mini progress bar */}
              <div className="mt-3 pt-2 border-t border-white/5 space-y-1">
                <div className="flex justify-between text-[9px] font-mono text-slate-400">
                  <span>{done} of {plan.durationDays} days</span>
                  <span className="text-amber-400 font-bold">{pct}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#151515] overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Plan Detail & Day-by-Day Milestone Checkboxes */}
      {activePlan && (
        <div className="p-5 sm:p-6 bg-[#0a0a0a] border border-amber-500/30 rounded-3xl shadow-xl space-y-5">
          {/* Active Plan Hero */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-white/10">
            <div className="space-y-1 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  {activePlan.badge}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  {completedDays.length} / {activePlan.durationDays} Days Completed ({progressPercent}%)
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black font-['Outfit'] uppercase text-white">
                {activePlan.title}
              </h3>
              <p className="text-xs text-slate-300 font-serif leading-relaxed">
                {activePlan.description}
              </p>
              <div className="text-[11px] font-mono text-amber-400 pt-1">
                Anchor Scripture: {activePlan.themeScripture}
              </div>
            </div>

            {/* Overall Progress Gauge */}
            <div className="flex flex-col items-center justify-center p-3 bg-[#000000] border border-white/10 rounded-2xl min-w-[120px]">
              <span className="text-2xl font-black font-mono text-amber-400">
                {progressPercent}%
              </span>
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">
                Journey Progress
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-[#151515] overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 via-emerald-400 to-emerald-300 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Days Grid: Interactive day-by-day checkbox milestones */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400">
              Daily Scripture Milestones & Reading Checklist
            </h4>

            <div className="grid grid-cols-1 gap-2.5">
              {activePlan.days.map((day) => {
                const isCompleted = completedDays.includes(day.dayNumber);

                return (
                  <div
                    key={day.dayNumber}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCompleted
                        ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-200'
                        : 'bg-[#000000] border-white/10 text-white hover:border-amber-400/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Interactive Checkbox */}
                      <button
                        onClick={() => handleToggleDayComplete(activePlan.id, day.dayNumber)}
                        className={`p-1 rounded-lg cursor-pointer transition-transform active:scale-90 mt-0.5 ${
                          isCompleted ? 'text-emerald-400' : 'text-slate-500 hover:text-amber-400'
                        }`}
                        title={isCompleted ? 'Mark Day as Incomplete' : 'Check off Day as Completed'}
                        aria-label={`Toggle Day ${day.dayNumber}`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                        ) : (
                          <Circle className="w-6 h-6 stroke-[1.5]" />
                        )}
                      </button>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            isCompleted ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            Day {day.dayNumber}
                          </span>
                          <h5 className={`text-xs font-bold font-['Outfit'] ${isCompleted ? 'line-through text-slate-400' : 'text-white'}`}>
                            {day.title}
                          </h5>
                        </div>

                        <p className="text-xs font-mono text-amber-300 font-bold">
                          📖 Scripture: {day.scriptureReference}
                        </p>
                        <p className="text-[11px] text-slate-400 font-serif line-clamp-2">
                          {day.devotionalFocus}
                        </p>
                      </div>
                    </div>

                    {/* Action: Open passage in Scripture Viewer */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => {
                          if (onNavigateToScripture) {
                            onNavigateToScripture(day.bookId || 'EPH', day.chapter || 1);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                        title="Open passage in Scripture Viewer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Read Passage</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CREATE CUSTOM BIBLE READING PLAN MODAL */}
      {isCreateModalOpen && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div 
            className="w-full max-w-2xl bg-[#0a0a0a] border border-amber-500/40 rounded-3xl shadow-2xl p-5 sm:p-6 text-white max-h-[90vh] overflow-y-auto space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black font-['Outfit'] uppercase text-white">
                    Create Custom Bible Reading Plan
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400">
                    Define milestones and track day-by-day progress locally
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveCustomPlan} className="space-y-4">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Plan Title</label>
                <input
                  type="text"
                  placeholder="e.g., Romans Consecration Journey, Gospel of John in 14 Days"
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-['Outfit']"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Subtitle / Spiritual Focus</label>
                <input
                  type="text"
                  placeholder="e.g., Walking in the Spirit and Victory Over the Flesh"
                  value={planSubtitle}
                  onChange={(e) => setPlanSubtitle(e.target.value)}
                  className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400 font-serif"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Duration Picker: 5, 7, 14, 30 days */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Duration</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[5, 7, 14, 30].map((d) => (
                      <button
                        type="button"
                        key={d}
                        onClick={() => setPlanDuration(d as any)}
                        className={`py-2 rounded-xl text-xs font-mono font-bold border cursor-pointer transition-all ${
                          planDuration === d
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                            : 'bg-[#000000] text-slate-300 border-white/10 hover:border-white/20'
                        }`}
                      >
                        {d} Days
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Category Hub</label>
                  <select
                    value={planCategory}
                    onChange={(e) => setPlanCategory(e.target.value as any)}
                    className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-400"
                  >
                    <option value="general">YoungFire General Discipleship</option>
                    <option value="men">Men On Fire (Brotherhood)</option>
                    <option value="women">Women Ignited (Sisterhood)</option>
                  </select>
                </div>
              </div>

              {/* Day-by-Day Milestone Assignment */}
              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
                  Assign Daily Scripture Milestones ({planDuration} Days)
                </label>

                <div className="max-h-56 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {dailyMilestones.map((m, idx) => (
                    <div 
                      key={m.dayNumber}
                      className="p-3 bg-[#000000] border border-white/10 rounded-xl flex items-center gap-3 text-xs"
                    >
                      <span className="w-12 font-mono font-bold text-amber-400 flex-shrink-0">
                        Day {m.dayNumber}
                      </span>
                      <input
                        type="text"
                        placeholder="Day Theme / Title"
                        value={m.title}
                        onChange={(e) => {
                          const updated = [...dailyMilestones];
                          updated[idx].title = e.target.value;
                          setDailyMilestones(updated);
                        }}
                        className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                      <input
                        type="text"
                        placeholder="Scripture Ref (e.g. John 1:1-18)"
                        value={m.scriptureReference}
                        onChange={(e) => {
                          const updated = [...dailyMilestones];
                          updated[idx].scriptureReference = e.target.value;
                          setDailyMilestones(updated);
                        }}
                        className="w-36 sm:w-44 bg-[#0a0a0a] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-amber-300 font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-slate-300 rounded-xl text-xs font-mono cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs font-mono cursor-pointer shadow-md border-t border-white/30"
                >
                  Save & Launch Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
