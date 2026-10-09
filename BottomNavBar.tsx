import React, { useState, useEffect } from 'react';
import { Home, Calendar, BookOpen, Menu, ShieldCheck } from 'lucide-react';
import { AppTheme } from '../data/appThemes';
import { CurrentUser } from './SettingsHUDModal';
import { checkIsAdmin } from '../services/authService';
import {
  generateThemedAppIconSvg,
  resolveThemePalette,
  getSavedThemeId
} from '../services/themeService';

export interface BottomNavBarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenMoreDrawer?: () => void;
  onOpenNotes?: () => void;
  onOpenWordPicker?: () => void;
  activeTheme?: AppTheme;
  currentUser?: CurrentUser | null;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ 
  currentTab, 
  onSelectTab, 
  onOpenMoreDrawer,
  onOpenWordPicker,
  activeTheme,
  currentUser
}) => {
  const [syncedThemeId, setSyncedThemeId] = useState<string>(() => activeTheme?.id || getSavedThemeId());

  useEffect(() => {
    if (activeTheme?.id) {
      setSyncedThemeId(activeTheme.id);
    }
  }, [activeTheme?.id]);

  useEffect(() => {
    const handleThemeUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ themeId?: string }>;
      if (customEvent.detail?.themeId) {
        setSyncedThemeId(customEvent.detail.themeId);
      } else {
        setSyncedThemeId(getSavedThemeId());
      }
    };
    window.addEventListener('youngfire_theme_updated', handleThemeUpdated);
    return () => window.removeEventListener('youngfire_theme_updated', handleThemeUpdated);
  }, []);

  const palette = resolveThemePalette(activeTheme || syncedThemeId);
  const touchpointIconUrl = generateThemedAppIconSvg(palette);
  const accentColor = activeTheme?.accentHex || palette.outerFlameGrad[0] || '#F59E0B';

  const isGuestUser = Boolean(
    !currentUser ||
    currentUser.isGuest ||
    currentUser.accountType === 'guest' ||
    (currentUser.id && currentUser.id.startsWith('guest_'))
  );

  const isAdmin =
    !isGuestUser && (
      checkIsAdmin(currentUser?.email) ||
      currentUser?.role === 'Administrator' ||
      (typeof window !== 'undefined' && localStorage.getItem('youngfire_admin_override') === 'true')
    );

  // 5-Pillar Navigation (+ Admin CMS when isAdmin is true):
  // Tab 1: "Home" (Sanctuary Dashboard)
  // Tab 2: "Schedule" (Sanctuary Fellowship Calendar)
  // Tab 3: "Word" (66-Book Scripture Reader & Imperial Atlas)
  // Tab 4: Elevated Center Touchpoint Logo: Welcome Page Flame Crest (Sanctuary Team & Roster Hub)
  // Optional Admin Tab: "Admin CMS" (LEAD)
  // Tab 5: "More" (Sliding Navigation Drawer)

  const handleTabClick = (tabId: string) => {
    if (tabId === 'more') {
      if (onOpenMoreDrawer) {
        onOpenMoreDrawer();
      } else {
        window.dispatchEvent(new CustomEvent('yf_open_nav_drawer'));
      }
    } else if (tabId === 'admin_cms') {
      window.dispatchEvent(new CustomEvent('yf_open_admin_cms'));
    } else if (tabId === 'word' && onOpenWordPicker) {
      onOpenWordPicker();
    } else {
      onSelectTab(tabId);
    }
  };

  return (
    <nav 
      aria-label="Sanctuary 5-Pillar Navigation" 
      className="fixed bottom-0 inset-x-0 z-40 bg-[#050505] border-t border-white/15 px-2 sm:px-4 py-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)]"
    >
      <div className="max-w-lg mx-auto flex items-center justify-between">
        
        {/* Tab 1: Home (Sanctuary Dashboard) */}
        <button
          type="button"
          onClick={() => handleTabClick('sanctuary')}
          className={`flex-1 flex flex-col items-center gap-1 py-1 px-1 rounded-xl cursor-pointer select-none ${
            currentTab === 'sanctuary' 
              ? 'text-white font-black' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Sanctuary Home Dashboard"
        >
          <div 
            className={`p-1.5 rounded-xl ${
              currentTab === 'sanctuary'
                ? 'bg-white/15 text-white ring-1 ring-white/50' 
                : 'bg-transparent text-slate-400'
            }`}
          >
            <Home className={`w-5 h-5 ${currentTab === 'sanctuary' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          </div>
          <span className="font-pro-display text-[10px] tracking-wider uppercase">
            Home
          </span>
        </button>

        {/* Tab 2: Schedule (Sanctuary Fellowship Calendar) */}
        <button
          type="button"
          onClick={() => handleTabClick('schedule')}
          className={`flex-1 flex flex-col items-center gap-1 py-1 px-1 rounded-xl cursor-pointer select-none ${
            currentTab === 'schedule' 
              ? 'text-white font-black' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Fellowship Calendar & Schedule"
        >
          <div 
            className={`p-1.5 rounded-xl ${
              currentTab === 'schedule' 
                ? 'bg-white/15 text-white ring-1 ring-white/50' 
                : 'bg-transparent text-slate-400'
            }`}
          >
            <Calendar className={`w-5 h-5 ${currentTab === 'schedule' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          </div>
          <span className="font-pro-display text-[10px] tracking-wider uppercase">
            Schedule
          </span>
        </button>

        {/* Tab 3: Word (66-Book Scripture Reader & Imperial Atlas) */}
        <button
          type="button"
          onClick={() => handleTabClick('word')}
          className={`flex-1 flex flex-col items-center gap-1 py-1 px-1 rounded-xl cursor-pointer select-none ${
            currentTab === 'word' 
              ? 'text-white font-black' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="66-Book Scripture & Imperial Atlas"
        >
          <div 
            className={`p-1.5 rounded-xl ${
              currentTab === 'word' 
                ? 'bg-white/15 text-white ring-1 ring-white/50' 
                : 'bg-transparent text-slate-400'
            }`}
          >
            <BookOpen className={`w-5 h-5 ${currentTab === 'word' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          </div>
          <span className="font-pro-display text-[10px] tracking-wider uppercase">
            Word
          </span>
        </button>

        {/* Tab 4: Elevated Center Touchpoint Logo (Welcome Page Flame Crest Synced With Active Theme) */}
        <div className="flex-1 flex flex-col items-center relative">
          <button
            type="button"
            onClick={() => handleTabClick('team')}
            className="relative -translate-y-3 flex flex-col items-center group cursor-pointer focus:outline-none select-none"
            title="Sanctuary Team & Discipleship Roster Hub (Welcome Page Logo Touchpoint)"
          >
            {/* Elevated Action Badge Container with Consecrated Metallic Rim */}
            <div 
              className={`w-13 h-13 rounded-2xl p-0.5 flex items-center justify-center transition-all duration-300 ${
                currentTab === 'team'
                  ? 'ring-2 ring-white/70 scale-105'
                  : 'group-hover:scale-105'
              }`}
              style={{
                background: currentTab === 'team'
                  ? `linear-gradient(135deg, ${palette.outerFlameGrad[0]}, #ffffff, ${palette.outerFlameGrad[1]})`
                  : `linear-gradient(135deg, ${palette.outerFlameGrad[0]}cc, #64748b, ${palette.outerFlameGrad[1]}99)`,
                boxShadow: `0 0 18px ${palette.glowColor}`
              }}
            >
              <img
                src={touchpointIconUrl}
                alt={palette.name}
                className="w-full h-full rounded-[14px] object-cover border border-black/40"
              />
            </div>

            {/* Label beneath elevated touchpoint badge */}
            <span 
              className="font-pro-display text-[10px] tracking-wider uppercase mt-0.5 font-bold"
              style={{ color: currentTab === 'team' ? accentColor : '#94A3B8' }}
            >
              Team
            </span>
          </button>
        </div>

        {/* Admin CMS Tab (Visible only when isAdmin is true) */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => handleTabClick('admin_cms')}
            className="flex-1 flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl text-amber-400 hover:text-amber-300 cursor-pointer group relative select-none"
            title="Admin CMS (LEAD)"
          >
            <div className="p-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 relative">
              <ShieldCheck className="w-5 h-5 stroke-[2]" />
              <span className="absolute -top-1.5 -right-2 px-1 py-0.2 rounded bg-amber-500 text-slate-950 font-mono text-[7px] font-black uppercase tracking-wider">
                LEAD
              </span>
            </div>
            <span className="font-pro-display text-[9px] tracking-wider uppercase font-bold">
              Admin CMS
            </span>
          </button>
        )}

        {/* Tab 5: More (Sliding Navigation Drawer) */}
        <button
          type="button"
          onClick={() => handleTabClick('more')}
          className="flex-1 flex flex-col items-center gap-1 py-1 px-1 rounded-xl text-slate-400 hover:text-slate-200 cursor-pointer group select-none"
          title="Open Sliding Navigation Drawer"
        >
          <div className="p-1.5 rounded-xl bg-transparent text-slate-400 group-hover:text-white">
            <Menu className="w-5 h-5 stroke-[1.75]" />
          </div>
          <span className="font-pro-display text-[10px] tracking-wider uppercase">
            More
          </span>
        </button>

      </div>
    </nav>
  );
};
