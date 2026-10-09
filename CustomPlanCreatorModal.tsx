import React, { useState } from 'react';

export interface CustomReadingPlan {
  id: string;
  groupTarget: 'men' | 'women';
  title: string;
  focusTheme: string;
  totalDays: number;
  scriptureMilestones: { day: number; reading: string; notes: string; completed: boolean }[];
  createdBy: string;
}

export const CustomPlanCreatorModal: React.FC<{
  groupTarget: 'men' | 'women';
  isOpen: boolean;
  onClose: () => void;
  onSavePlan: (plan: CustomReadingPlan) => void;
}> = ({ groupTarget, isOpen, onClose, onSavePlan }) => {
  const [title, setTitle] = useState('');
  const [focusTheme, setFocusTheme] = useState('');
  const [daysCount, setDaysCount] = useState<number>(7);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!title.trim()) return;

    const newPlan: CustomReadingPlan = {
      id: `${groupTarget}-plan-${Date.now()}`,
      groupTarget,
      title,
      focusTheme,
      totalDays: daysCount,
      scriptureMilestones: Array.from({ length: daysCount }, (_, i) => ({
        day: i + 1,
        reading: i === 0 ? 'Foundation Chapter' : `Day ${i + 1} Scripture Focus`,
        notes: '',
        completed: false,
      })),
      createdBy: 'Ministry Facilitator',
    };

    onSavePlan(newPlan);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0E162B] border border-white/20 p-5 rounded-2xl w-full max-w-md shadow-2xl text-left">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-['Outfit']">
          Create {groupTarget === 'men' ? 'Men On Fire' : 'Women Ignited'} Reading Plan
        </h3>
        <p className="text-xs text-slate-400 mt-1">Design a tailored spiritual blueprint with day-by-day accountability.</p>

        <div className="space-y-3 mt-4">
          <div>
            <label className="text-[10px] font-mono text-slate-300 uppercase">Plan Title</label>
            <input
              type="text"
              placeholder={groupTarget === 'men' ? 'e.g. Davidic Warfare & Purity' : 'e.g. Consecrated Sisters of Virtue'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full mt-1 bg-[#0a0a0a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-300 uppercase">Theological Focus</label>
            <input
              type="text"
              placeholder="e.g. Spiritual armor, fasting, brotherhood leadership"
              value={focusTheme}
              onChange={(e) => setFocusTheme(e.target.value)}
              className="w-full mt-1 bg-[#0a0a0a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-300 uppercase">Duration</label>
            <select
              value={daysCount}
              onChange={(e) => setDaysCount(Number(e.target.value))}
              className="w-full mt-1 bg-[#0a0a0a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              <option value={3}>3-Day Consecration Jumpstart</option>
              <option value={5}>5-Day Foundational Walk</option>
              <option value={7}>7-Day Standard Blueprint</option>
              <option value={14}>14-Day Kingdom Grind</option>
              <option value={21}>21-Day Daniel Fast & Discipline</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-[#151515] hover:bg-slate-700 text-slate-300 font-mono text-xs uppercase rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className={`flex-1 py-2 font-mono text-xs uppercase font-bold rounded-xl text-slate-950 ${
              groupTarget === 'men' ? 'bg-orange-500 hover:bg-orange-400' : 'bg-rose-400 hover:bg-rose-300'
            }`}
          >
            Publish Plan
          </button>
        </div>
      </div>
    </div>
  );
};
