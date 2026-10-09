import React, { useState, useEffect, useRef } from "react";
import { 
  Flame, Shield, Heart, BookOpen, Calendar, 
  Video, Radio, Sparkles, Pause, Play, RotateCcw, 
  ChevronRight, Compass 
} from 'lucide-react';

export interface OrbitNode {
  id: string;
  deg: number;
  label: string;
  badge: string;
  description: string;
  icon: React.ReactNode;
  iconName: string;
  accentColor: string;
  borderColor: string;
  bgGradient: string;
  glowColor: string;
  badgeBg: string;
  badgeText: string;
}

interface WheelHubProps {
  onSelectHub?: (hubId: string) => void;
  activeHubId?: string;
}

export const ORBIT_NODES: OrbitNode[] = [
  {
    id: 'youngfire',
    deg: 0,
    label: 'YoungFire Sanctuary',
    badge: 'Main Pillar',
    description: 'Every Joint Supplies & Apostolic Discipleship',
    icon: <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 fill-current" />,
    iconName: 'Flame',
    accentColor: 'text-amber-400',
    borderColor: 'border-amber-400/80',
    bgGradient: 'bg-gradient-to-tr from-amber-600/40 via-[#0a0a0a] to-amber-950/90',
    glowColor: 'shadow-[0_0_20px_rgba(245,158,11,0.5)]',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-300'
  },
  {
    id: 'men_on_fire',
    deg: 45,
    label: 'Men On Fire',
    badge: 'Brotherhood',
    description: 'Iron Sharpens Iron & Armor of God',
    icon: <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" />,
    iconName: 'Shield',
    accentColor: 'text-orange-400',
    borderColor: 'border-orange-500/80',
    bgGradient: 'bg-gradient-to-tr from-orange-600/40 via-[#0a0a0a] to-orange-950/90',
    glowColor: 'shadow-[0_0_20px_rgba(249,115,22,0.5)]',
    badgeBg: 'bg-orange-500/20',
    badgeText: 'text-orange-300'
  },
  {
    id: 'women_ignited',
    deg: 90,
    label: 'Women Ignited',
    badge: 'Sisterhood',
    description: 'Consecrated Virtuous Sisterhood & Grace',
    icon: <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400 fill-current" />,
    iconName: 'Heart',
    accentColor: 'text-rose-400',
    borderColor: 'border-rose-400/80',
    bgGradient: 'bg-gradient-to-tr from-rose-600/40 via-[#0a0a0a] to-rose-950/90',
    glowColor: 'shadow-[0_0_20px_rgba(244,63,94,0.5)]',
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-300'
  },
  {
    id: 'open_bible',
    deg: 135,
    label: 'Open Bible Thursdays',
    badge: 'Scripture Watch',
    description: 'Deep Scripture Dive & Pastoral Exegesis',
    icon: <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />,
    iconName: 'BookOpen',
    accentColor: 'text-emerald-400',
    borderColor: 'border-emerald-400/80',
    bgGradient: 'bg-gradient-to-tr from-emerald-600/40 via-[#0a0a0a] to-emerald-950/90',
    glowColor: 'shadow-[0_0_20px_rgba(52,211,153,0.5)]',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300'
  },
  {
    id: 'calendar',
    deg: 180,
    label: 'Sanctuary Calendar',
    badge: 'Events & Huddles',
    description: 'Bi-Weekly Small Groups & Ministry Gatherings',
    icon: <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />,
    iconName: 'Calendar',
    accentColor: 'text-cyan-400',
    borderColor: 'border-cyan-400/80',
    bgGradient: 'bg-gradient-to-tr from-cyan-600/40 via-[#0a0a0a] to-cyan-950/90',
    glowColor: 'shadow-[0_0_20px_rgba(6,182,212,0.5)]',
    badgeBg: 'bg-cyan-500/20',
    badgeText: 'text-cyan-300'
  },
  {
    id: 'tv',
    deg: 225,
    label: 'Kingdom TV & Media',
    badge: 'Video Vault',
    description: 'Recorded Sermons, Worship Anthems & Exhortations',
    icon: <Video className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />,
    iconName: 'Video',
    accentColor: 'text-red-400',
    borderColor: 'border-red-400/80',
    bgGradient: 'bg-gradient-to-tr from-red-600/40 via-[#0a0a0a] to-red-950/90',
    glowColor: 'shadow-[0_0_20px_rgba(239,68,68,0.5)]',
    badgeBg: 'bg-red-500/20',
    badgeText: 'text-red-300'
  },
  {
    id: 'radio',
    deg: 270,
    label: '24/7 Gospel Radio',
    badge: 'Live Broadcast',
    description: 'Continuous Live Anointing & Gospel Anthems',
    icon: <Radio className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />,
    iconName: 'Radio',
    accentColor: 'text-purple-400',
    borderColor: 'border-purple-400/80',
    bgGradient: 'bg-gradient-to-tr from-purple-600/40 via-[#0a0a0a] to-purple-950/90',
    glowColor: 'shadow-[0_0_20px_rgba(192,132,252,0.5)]',
    badgeBg: 'bg-purple-500/20',
    badgeText: 'text-purple-300'
  },
  {
    id: 'prayer',
    deg: 315,
    label: '24/7 Prayer Dock',
    badge: 'Intercession Watch',
    description: 'Live Altar Prayer Requests & Consecration',
    icon: <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300 fill-current" />,
    iconName: 'Sparkles',
    accentColor: 'text-yellow-300',
    borderColor: 'border-yellow-400/80',
    bgGradient: 'bg-gradient-to-tr from-yellow-500/40 via-[#0a0a0a] to-yellow-950/90',
    glowColor: 'shadow-[0_0_20px_rgba(250,204,21,0.5)]',
    badgeBg: 'bg-yellow-500/20',
    badgeText: 'text-yellow-200'
  }
];

export const WheelHub: React.FC<WheelHubProps> = ({ onSelectHub, activeHubId }) => {
  const [isRotating, setIsRotating] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<OrbitNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<OrbitNode>(() => {
    return ORBIT_NODES.find(n => n.id === activeHubId) || ORBIT_NODES[0];
  });
  
  const [radius, setRadius] = useState(165);
  const angleRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastXRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Sync active node if prop changes
  useEffect(() => {
    if (activeHubId) {
      const match = ORBIT_NODES.find(n => n.id === activeHubId);
      if (match) setSelectedNode(match);
    }
  }, [activeHubId]);

  // Responsive radius
  useEffect(() => {
    const handleResize = () => {
      setRadius(window.innerWidth < 640 ? 125 : 165);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update node positions with strictly upright orientation (pure translate, zero rotation)
  const updateNodePositions = () => {
    const currentAngle = angleRef.current;
    const r = radius;
    ORBIT_NODES.forEach((node) => {
      const el = nodeRefs.current[node.id];
      if (el) {
        const theta = ((currentAngle + node.deg) * Math.PI) / 180;
        const x = Math.round(Math.sin(theta) * r);
        const y = Math.round(-Math.cos(theta) * r);
        // Note: strictly translate, NO rotate transform applied, keeping icons 100% upright
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    });
  };

  // 60FPS animation loop
  useEffect(() => {
    let lastTime = performance.now();
    const loop = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      if (isRotating && !hoveredNode && !isDraggingRef.current) {
        // ~7.5 degrees per second (48 second full 360 orbit)
        const speed = 0.0075 * delta;
        angleRef.current = (angleRef.current + speed) % 360;
        updateNodePositions();
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRotating, hoveredNode, radius]);

  // Initial positioning
  useEffect(() => {
    updateNodePositions();
  }, [radius]);

  // Touch & Pointer interaction: Direct 60fps drag
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    lastXRef.current = e.clientX;
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastXRef.current;
    lastXRef.current = e.clientX;
    angleRef.current = (angleRef.current + dx * 0.4) % 360;
    updateNodePositions();
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleNodeClick = (node: OrbitNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(node);
    if (onSelectHub) {
      onSelectHub(node.id);
    }
  };

  const displayNode = hoveredNode || selectedNode;

  return (
    <div className="relative flex flex-col items-center justify-center p-2 sm:p-4 select-none w-full max-w-2xl">
      {/* Orbit Wheel Controls Top Bar */}
      <div className="flex items-center justify-between w-full max-w-md px-2 pb-2 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-1.5 text-amber-300">
          <Compass className="w-4 h-4 animate-spin-slow" />
          <span className="font-bold uppercase tracking-wider text-[11px]">360° Orbit Wheel Selector</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRotating(!isRotating)}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center gap-1 text-[11px] font-mono cursor-pointer transition-colors"
            title={isRotating ? 'Pause Orbit Animation' : 'Resume Orbit Animation'}
          >
            {isRotating ? (
              <>
                <Pause className="w-3 h-3 text-amber-400" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 text-emerald-400" />
                <span>Spin</span>
              </>
            )}
          </button>
          <button
            onClick={() => {
              angleRef.current = 0;
              updateNodePositions();
            }}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
            title="Reset Wheel Orientation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Orbit Wheel Canvas Area */}
      <div
        className="relative w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] flex items-center justify-center cursor-grab active:cursor-grabbing touch-none my-3"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Outer glowing cosmic halo */}
        <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 blur-md pointer-events-none" />
        
        {/* Concentric orbital rings */}
        <div className="absolute inset-6 sm:inset-8 rounded-full border border-dashed border-amber-500/30 pointer-events-none" />
        <div className="absolute inset-16 sm:inset-20 rounded-full border border-white/10 pointer-events-none" />

        {/* Orbital nodes container with pure Cartesian placement (zero container rotation) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {ORBIT_NODES.map((node) => {
            const isHovered = hoveredNode?.id === node.id;
            const isActive = selectedNode?.id === node.id || activeHubId === node.id;

            return (
              <div
                key={node.id}
                ref={(el) => { nodeRefs.current[node.id] = el; }}
                className="absolute flex items-center justify-center pointer-events-auto will-change-transform"
                style={{
                  transform: 'translate3d(0, 0, 0)'
                }}
              >
                {/* 
                  Upright 3D Emblem Icon:
                  Because translation uses Cartesian (x, y) along the orbit,
                  the icon NEVER rotates and stays 100% strictly upright at all 360 degrees!
                */}
                <button
                  type="button"
                  onClick={(e) => handleNodeClick(node, e)}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className={`group relative w-13 h-13 sm:w-16 sm:h-16 rounded-2xl border-t-2 border-l border-b-4 border-r-2 border-b-black/90 border-r-black/70 flex flex-col items-center justify-center transition-all duration-200 cursor-pointer shadow-[0_12px_28px_rgba(0,0,0,0.85),0_3px_5px_rgba(255,255,255,0.3)_inset,0_-4px_8px_rgba(0,0,0,0.7)_inset] active:translate-y-1 active:border-b-2 active:shadow-md ${
                    node.bgGradient
                  } ${node.borderColor} ${node.glowColor} ${
                    isHovered || isActive 
                      ? 'scale-125 ring-2 ring-white z-30 shadow-[0_0_30px_rgba(255,255,255,0.8),0_14px_28px_rgba(0,0,0,0.95)]' 
                      : 'hover:scale-115'
                  }`}
                  title={`${node.label} (${node.badge})`}
                >
                  {/* 3D Specular Top Glass Rim Highlight */}
                  <div className="absolute inset-x-1.5 top-0.5 h-1/2 rounded-t-xl bg-gradient-to-b from-white/40 via-white/10 to-transparent pointer-events-none" />

                  {/* 3D Deep Embossed Coin Bezel Container */}
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-gradient-to-b from-white/20 via-black/20 to-black/60 border border-white/25 shadow-[inset_0_2px_4px_rgba(255,255,255,0.35),inset_0_-2px_4px_rgba(0,0,0,0.7)]">
                    <div className="filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.95)] drop-shadow-[0_1px_2px_rgba(255,255,255,0.5)] transition-transform duration-200 group-hover:scale-110">
                      {node.icon}
                    </div>
                  </div>

                  {/* Active 3D glowing jewel badge */}
                  {isActive && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-white shadow-[0_0_12px_#f59e0b] animate-ping" />
                  )}

                  {/* Mini Tooltip */}
                  <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-md bg-black/95 border border-white/20 text-[9px] font-mono font-bold text-white shadow-lg pointer-events-none transition-opacity ${
                    isHovered ? 'opacity-100 z-50' : 'opacity-0'
                  }`}>
                    {node.label}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Central Hub Core: Interactive Showcase */}
        <div 
          onClick={() => handleNodeClick(displayNode, {} as any)}
          className="relative z-10 w-32 h-32 sm:w-44 sm:h-44 rounded-full bg-gradient-to-tr from-[#160B03] via-[#0B1020] to-[#1C0F04] border-2 border-amber-400/80 shadow-[0_0_40px_rgba(245,158,11,0.35)] flex flex-col items-center justify-center p-3 text-center cursor-pointer hover:border-amber-300 transition-all group pointer-events-auto"
        >
          <div className="w-full h-full rounded-full bg-[#060914]/90 border border-amber-500/40 flex flex-col items-center justify-center p-2 sm:p-3 text-center transition-all group-hover:bg-[#070D1E]">
            {/* Center Dynamic Icon */}
            <div className="mb-1 transition-transform group-hover:scale-110 filter drop-shadow-[0_3px_5px_rgba(0,0,0,0.8)]">
              {displayNode.icon}
            </div>
            
            <div className="font-['Cinzel'] font-black text-amber-300 text-[11px] sm:text-xs tracking-wide uppercase line-clamp-1">
              {displayNode.label}
            </div>

            <div className={`text-[8px] sm:text-[9px] font-mono px-2 py-0.5 rounded-full mt-0.5 font-bold uppercase tracking-widest ${displayNode.badgeBg} ${displayNode.badgeText}`}>
              {displayNode.badge}
            </div>

            <div className="mt-1 text-[8px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1 group-hover:text-amber-300">
              <span>Open Pillar</span>
              <ChevronRight className="w-2.5 h-2.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Active Node Quick Guide Bar */}
      <div className="w-full max-w-md p-3 rounded-2xl bg-[#000000] border border-white/10 shadow-lg text-center space-y-1">
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs font-mono font-bold text-white">
            {displayNode.label}
          </span>
          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${displayNode.badgeBg} ${displayNode.badgeText}`}>
            {displayNode.badge}
          </span>
        </div>
        <p className="text-[11px] font-serif text-slate-300">
          {displayNode.description}
        </p>
        <button
          onClick={() => handleNodeClick(displayNode, {} as any)}
          className="mt-1 text-xs font-mono font-bold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 cursor-pointer"
        >
          <span>Tap to Enter This Ministry Hub &rarr;</span>
        </button>
      </div>

      {/* Discipleship Reading Progress & Ephesian Shield Quick Launch */}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('yf_open_reading_progress'))}
        className="mt-2.5 w-full max-w-md p-2.5 rounded-2xl bg-[#0a0a0a] hover:bg-[#111111] border border-amber-500/30 hover:border-amber-400 text-amber-300 flex items-center justify-between gap-2 shadow-lg transition-all cursor-pointer group"
        title="Open 66 Books Chapter Progress & Ephesian Shield of Faith Reading Activities"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-sm">
            🛡️
          </div>
          <div className="text-left">
            <div className="text-xs font-bold text-white font-['Outfit'] group-hover:text-amber-300">
              Discipleship Reading Progress & Ephesian Shield
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              66 Books Chapter Grid &bull; Quench Fiery Darts Quest
            </div>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
          <span>Open</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </button>
    </div>
  );
};

