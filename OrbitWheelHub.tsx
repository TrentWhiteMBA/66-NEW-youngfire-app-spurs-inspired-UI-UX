import React from 'react';
import { 
  Flame, Shield, Heart, BookOpen, Calendar, 
  Video, Radio, Sparkles 
} from 'lucide-react';

interface WheelNode {
  id: string;
  label: string;
  badge: string;
  accentColor: string;
  borderColor: string;
  bgGradient: string;
  glowColor: string;
  icon: React.ReactNode;
}

interface OrbitWheelHubProps {
  onSelectHub: (hubId: string) => void;
  activeHubId?: string;
}

export const OrbitWheelHub: React.FC<OrbitWheelHubProps> = ({ onSelectHub, activeHubId }) => {
  const hubs: WheelNode[] = [
    {
      id: 'youngfire',
      label: 'YoungFire Sanctuary',
      badge: 'Main Pillar',
      accentColor: 'text-amber-400',
      borderColor: 'border-amber-400/50',
      bgGradient: 'bg-gradient-to-b from-amber-500/20 via-slate-900/90 to-[#000000]',
      glowColor: 'shadow-amber-500/30',
      icon: <Flame className="w-7 h-7 text-amber-400 fill-current drop-shadow" />
    },
    {
      id: 'men_on_fire',
      label: 'Men On Fire',
      badge: 'Brotherhood',
      accentColor: 'text-orange-400',
      borderColor: 'border-orange-500/50',
      bgGradient: 'bg-gradient-to-b from-orange-500/20 via-slate-900/90 to-[#000000]',
      glowColor: 'shadow-orange-500/30',
      icon: <Shield className="w-7 h-7 text-orange-400 drop-shadow" />
    },
    {
      id: 'women_ignited',
      label: 'Women Ignited',
      badge: 'Sisterhood',
      accentColor: 'text-rose-400',
      borderColor: 'border-rose-400/50',
      bgGradient: 'bg-gradient-to-b from-rose-500/20 via-slate-900/90 to-[#000000]',
      glowColor: 'shadow-rose-500/30',
      icon: <Heart className="w-7 h-7 text-rose-400 fill-current drop-shadow" />
    },
    {
      id: 'open_bible',
      label: 'Open Bible Thursdays',
      badge: 'Scripture Watch',
      accentColor: 'text-emerald-400',
      borderColor: 'border-emerald-400/50',
      bgGradient: 'bg-gradient-to-b from-emerald-500/20 via-slate-900/90 to-[#000000]',
      glowColor: 'shadow-emerald-500/30',
      icon: <BookOpen className="w-7 h-7 text-emerald-400 drop-shadow" />
    },
    {
      id: 'calendar',
      label: 'Sanctuary Calendar',
      badge: 'Gatherings',
      accentColor: 'text-cyan-400',
      borderColor: 'border-cyan-400/50',
      bgGradient: 'bg-gradient-to-b from-cyan-500/20 via-slate-900/90 to-[#000000]',
      glowColor: 'shadow-cyan-500/30',
      icon: <Calendar className="w-7 h-7 text-cyan-400 drop-shadow" />
    },
    {
      id: 'tv',
      label: 'Kingdom TV',
      badge: 'Worship Vault',
      accentColor: 'text-red-400',
      borderColor: 'border-red-400/50',
      bgGradient: 'bg-gradient-to-b from-red-500/20 via-slate-900/90 to-[#000000]',
      glowColor: 'shadow-red-500/30',
      icon: <Video className="w-7 h-7 text-red-400 drop-shadow" />
    },
    {
      id: 'radio',
      label: 'Gospel Radio 24/7',
      badge: 'Live Stream',
      accentColor: 'text-purple-400',
      borderColor: 'border-purple-400/50',
      bgGradient: 'bg-gradient-to-b from-purple-500/20 via-slate-900/90 to-[#000000]',
      glowColor: 'shadow-purple-500/30',
      icon: <Radio className="w-7 h-7 text-purple-400 drop-shadow" />
    },
    {
      id: 'prayer',
      label: 'Prayer Watch',
      badge: 'Intercession',
      accentColor: 'text-yellow-300',
      borderColor: 'border-yellow-400/50',
      bgGradient: 'bg-gradient-to-b from-yellow-500/20 via-slate-900/90 to-[#000000]',
      glowColor: 'shadow-yellow-500/30',
      icon: <Sparkles className="w-7 h-7 text-yellow-300 fill-current drop-shadow" />
    }
  ];

  return (
    <div className="w-full py-4 flex flex-col items-center select-none">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl px-2">
        {hubs.map((hub) => {
          const isActive = activeHubId === hub.id;
          return (
            <button
              key={hub.id}
              onClick={() => onSelectHub(hub.id)}
              className={`group relative flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer shadow-lg hover:scale-[1.03] active:scale-[0.98] ${
                isActive
                  ? `${hub.bgGradient} ${hub.borderColor} ring-2 ring-white/30 shadow-2xl`
                  : 'bg-gradient-to-b from-slate-800/80 via-[#0a0a0a]/90 to-[#000000]/95 border-white/10 hover:border-white/25 hover:from-slate-700/80'
              }`}
            >
              {/* Metallic top glass rim highlight */}
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-t-2xl pointer-events-none" />

              {/* 3D Icon Container */}
              <div 
                className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-white/10 shadow-md mb-2 transition-transform duration-300 group-hover:scale-110 ${
                  isActive ? `${hub.bgGradient} ${hub.glowColor}` : 'bg-gradient-to-b from-slate-800/90 to-slate-950/90'
                }`}
              >
                {hub.icon}
              </div>

              {/* Node Typography */}
              <span className="text-[11px] font-black text-white tracking-wide text-center line-clamp-1 font-['Outfit']">
                {hub.label}
              </span>
              <span className={`text-[8px] font-mono font-bold uppercase tracking-widest mt-0.5 ${hub.accentColor}`}>
                {hub.badge}
              </span>

              {/* Active glow indicator */}
              {isActive && (
                <div className="absolute -bottom-1 w-8 h-1 rounded-full bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
