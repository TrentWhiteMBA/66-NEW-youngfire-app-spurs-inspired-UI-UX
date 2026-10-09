import React, { useState, useRef, useEffect } from 'react';
import { 
  Flame, 
  BookOpen, 
  Compass, 
  Tv, 
  Radio, 
  PenTool, 
  Heart, 
  Settings, 
  ShieldAlert, 
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Trash2,
  LogOut,
  MessageSquare,
  Sun,
  ChevronRight,
  Lock,
  Camera
} from 'lucide-react';
import { CurrentUser } from './SettingsHUDModal';
import { AppTheme } from '../data/appThemes';
import { MENU_DRAWER_BW_PHOTO } from '../data/fellowshipPhotos';
import { checkIsAdmin, clearPersistentAuthSession } from '../services/authService';
import { db } from '../services/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { getProfileDocId } from '../services/profileService';

export interface SlidingNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab?: string;
  onNavigate: (tab: string, subView?: any) => void;
  onOpenSettingsModal: () => void;
  onOpenNotesModal: () => void;
  onOpenThemeModal: () => void;
  onOpenWelcomeModal: () => void;
  onOpenPrayerModal?: () => void;
  onDeleteProfile?: () => void;
  onToggleRadio?: () => void;
  isRadioPlaying?: boolean;
  currentStationName?: string;
  onNextStation?: () => void;
  onPrevStation?: () => void;
  onToggleMusicDock?: () => void;
  isMusicDockOpen?: boolean;
  onOpenZoomFlyer?: () => void;
  activeTheme?: AppTheme;
  currentUser?: CurrentUser | null;
}

export const SlidingNavDrawer: React.FC<SlidingNavDrawerProps> = ({
  isOpen,
  onClose,
  currentTab = 'sanctuary',
  onNavigate,
  onOpenSettingsModal,
  onOpenNotesModal,
  onOpenWelcomeModal,
  onOpenPrayerModal,
  onDeleteProfile,
  activeTheme,
  currentUser
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [activeTouchId, setActiveTouchId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchCurrentX = useRef<number>(0);
  const touchCurrentY = useRef<number>(0);

  // When drawer opens, initialize highlight to current active tab
  useEffect(() => {
    if (isOpen) {
      setHighlightedItemId(currentTab || 'fellowship');
    }
  }, [isOpen, currentTab]);

  // Mobile scroll tracking: highlight the item closest to the viewport reading center
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const containerRect = container.getBoundingClientRect();
    const focusY = containerRect.top + containerRect.height * 0.42;

    const itemElements = container.querySelectorAll<HTMLElement>('[data-drawer-item-id]');
    let closestId: string | null = null;
    let minDistance = Infinity;

    itemElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const elCenter = rect.top + rect.height / 2;
      const dist = Math.abs(focusY - elCenter);
      if (dist < minDistance) {
        minDistance = dist;
        closestId = el.getAttribute('data-drawer-item-id');
      }
    });

    if (closestId && closestId !== highlightedItemId) {
      setHighlightedItemId(closestId);
    }
  };

  // Allow native swipe-back / browser back navigation and touch gestures to seamlessly dismiss drawer
  useEffect(() => {
    if (!isOpen) return;

    let startX = 0;
    let startY = 0;
    let curX = 0;
    let curY = 0;

    const onGlobalTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      curX = startX;
      curY = startY;
    };

    const onGlobalTouchMove = (e: TouchEvent) => {
      curX = e.touches[0].clientX;
      curY = e.touches[0].clientY;
    };

    const onGlobalTouchEnd = () => {
      const deltaX = curX - startX;
      const deltaY = Math.abs(curY - startY);
      // Swipe right anywhere to return to previous screen (horizontal delta > 40px, dominating vertical)
      if (deltaX > 40 && deltaY < 140) {
        onClose();
      }
    };

    window.addEventListener('touchstart', onGlobalTouchStart, { passive: true });
    window.addEventListener('touchmove', onGlobalTouchMove, { passive: true });
    window.addEventListener('touchend', onGlobalTouchEnd, { passive: true });

    const handlePopState = () => {
      onClose();
    };
    try {
      window.history.pushState({ youngfire_drawer: 'open' }, '');
    } catch {}
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('touchstart', onGlobalTouchStart);
      window.removeEventListener('touchmove', onGlobalTouchMove);
      window.removeEventListener('touchend', onGlobalTouchEnd);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const accentColor = activeTheme?.accentHex || '#F59E0B';

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
      localStorage.getItem('youngfire_admin_override') === 'true'
    );

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchCurrentX.current = e.touches[0].clientX;
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
    touchCurrentY.current = e.touches[0].clientY;

    // Detect item under finger during mobile drag/glide
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const itemEl = target?.closest<HTMLElement>('[data-drawer-item-id]');
    if (itemEl) {
      const id = itemEl.getAttribute('data-drawer-item-id');
      if (id && id !== highlightedItemId) {
        setHighlightedItemId(id);
        try {
          if ('vibrate' in navigator) navigator.vibrate(8);
        } catch {}
      }
    }
  };

  const handleTouchEnd = () => {
    const deltaX = touchCurrentX.current - touchStartX.current;
    const deltaY = Math.abs(touchCurrentY.current - touchStartY.current);
    // Swiping right towards dismissal / previous screen (horizontal swipe > 45px)
    if (deltaX > 45 && deltaY < 130) {
      onClose();
    }
  };

  const executeProfileDeletion = async () => {
    try {
      const targetDocId = getProfileDocId(currentUser?.email || '', (currentUser as any)?.uid || currentUser?.id);
      if (targetDocId) {
        await deleteDoc(doc(db, 'sanctuary_disciples', targetDocId));
      }
      if (currentUser?.id && currentUser.id !== targetDocId) {
        await deleteDoc(doc(db, 'sanctuary_disciples', currentUser.id));
      }
      localStorage.removeItem('youngfire_auth_session');
      localStorage.removeItem('youngfire_user_doc_id');
      localStorage.removeItem('youngfire_user_avatar');
      sessionStorage.clear();
      localStorage.removeItem('youngfire_device_session_v1');
      localStorage.removeItem('youngfire_user_session');
      localStorage.removeItem('youngfire_sword_streak_v1');
      localStorage.removeItem('youngfire_completed_bible_books');

      const rosterSaved = localStorage.getItem('youngfire_member_roster_v2');
      if (rosterSaved && currentUser?.id) {
        const roster = JSON.parse(rosterSaved);
        if (Array.isArray(roster)) {
          const filtered = roster.filter((m: any) => m.id !== currentUser.id && m.email !== currentUser.email);
          localStorage.setItem('youngfire_member_roster_v2', JSON.stringify(filtered));
        }
      }
      if (currentUser?.id) {
        fetch(`/api/roster/${currentUser.id}`, { method: 'DELETE' }).catch(() => {});
        window.dispatchEvent(new CustomEvent('yf_delete_member', { detail: { id: currentUser.id } }));
      }
    } catch {}

    setShowDeleteConfirm(false);
    onClose();

    if (onDeleteProfile) {
      onDeleteProfile();
    } else {
      window.dispatchEvent(new CustomEvent('yf_account_deleted'));
    }
  };

  const guardGuestAction = (featureLabel: string, allowedForGuest: boolean, callback: () => void) => {
    if (isGuestUser && !allowedForGuest) {
      onClose();
      window.dispatchEvent(new CustomEvent('yf_guest_restriction', { detail: { feature: featureLabel } }));
      return;
    }
    callback();
  };

  // Left-Aligned Menu Actions (with Admin CMS tab when isAdmin is true)
  const menuActions: Array<{
    id: string;
    label: string;
    icon: any;
    badge?: string;
    allowedForGuest?: boolean;
    action: () => void;
  }> = [
    {
      id: 'fellowship',
      label: 'Sanctuary Fellowship Hub',
      icon: Users,
      allowedForGuest: false,
      action: () => guardGuestAction('Sanctuary Fellowship Hub', false, () => { onNavigate('fellowship'); onClose(); })
    },
    {
      id: 'men',
      label: 'Men On Fire Brotherhood Hub',
      icon: Flame,
      allowedForGuest: false,
      action: () => guardGuestAction('Men On Fire Brotherhood Hub', false, () => { onNavigate('men'); onClose(); })
    },
    {
      id: 'women',
      label: 'Women Ignited Sisterhood Hub',
      icon: Sparkles,
      allowedForGuest: false,
      action: () => guardGuestAction('Women Ignited Sisterhood Hub', false, () => { onNavigate('women'); onClose(); })
    },
    {
      id: 'discipleship',
      label: 'Discipleship & Reading Plans',
      icon: Compass,
      allowedForGuest: false,
      action: () => guardGuestAction('Discipleship & Reading Plans', false, () => { onNavigate('discipleship'); onClose(); })
    },
    {
      id: 'reading-progress',
      label: 'Discipleship Reading Progress',
      icon: Shield,
      allowedForGuest: false,
      action: () => guardGuestAction('Discipleship Reading Progress', false, () => { 
        window.dispatchEvent(new CustomEvent('yf_open_reading_progress'));
        onClose(); 
      })
    },
    {
      id: 'dailybread',
      label: '365-Day Daily Bread Hub',
      icon: Sun,
      allowedForGuest: false,
      action: () => guardGuestAction('365-Day Daily Bread Hub', false, () => { onNavigate('dailybread'); onClose(); })
    },
    {
      id: 'mentor',
      label: 'AI Discipleship Mentor',
      icon: MessageSquare,
      allowedForGuest: false,
      action: () => guardGuestAction('AI Discipleship Mentor', false, () => { onNavigate('mentor'); onClose(); })
    },
    {
      id: 'word-bible',
      label: '66-Book Scripture Reader',
      icon: BookOpen,
      allowedForGuest: false,
      action: () => guardGuestAction('66-Book Scripture Reader', false, () => { onNavigate('word', 'bible'); onClose(); })
    },
    {
      id: 'word-atlas',
      label: 'Imperial Scripture Atlas',
      icon: Compass,
      allowedForGuest: false,
      action: () => guardGuestAction('Imperial Scripture Atlas', false, () => { onNavigate('word', 'atlas'); onClose(); })
    },
    {
      id: 'tv',
      label: 'Worship Sanctuary TV & Vault',
      icon: Tv,
      allowedForGuest: false,
      action: () => guardGuestAction('Worship Sanctuary TV & Vault', false, () => { onNavigate('tv'); onClose(); })
    },
    {
      id: 'radio',
      label: '24/7 Gospel Radio Player',
      icon: Radio,
      allowedForGuest: true,
      action: () => { onNavigate('radio'); onClose(); }
    },
    {
      id: 'prayer',
      label: 'Prayer Dock & Intercession',
      icon: Heart,
      allowedForGuest: true,
      action: () => { onNavigate('prayer_dock'); onClose(); }
    },
    ...(isGuestUser ? [{
      id: 'submit_prayer',
      label: 'Submit Prayer Request',
      icon: Flame,
      badge: 'PRAY',
      allowedForGuest: true,
      action: () => {
        onClose();
        if (onOpenPrayerModal) {
          onOpenPrayerModal();
        } else {
          window.dispatchEvent(new CustomEvent('yf_open_prayer_modal'));
        }
      }
    }] : []),
    {
      id: 'notes',
      label: 'Study Notes HUD',
      icon: PenTool,
      allowedForGuest: false,
      action: () => guardGuestAction('Study Notes HUD', false, () => { onOpenNotesModal(); onClose(); })
    },
    {
      id: 'welcome',
      label: 'Welcome Sanctuary Portal',
      icon: Sparkles,
      allowedForGuest: false,
      action: () => guardGuestAction('Welcome Sanctuary Portal', false, () => { onOpenWelcomeModal(); onClose(); })
    },
    {
      id: 'settings',
      label: 'Settings & Device Profile',
      icon: Settings,
      allowedForGuest: false,
      action: () => guardGuestAction('Settings & Device Profile', false, () => { onOpenSettingsModal(); onClose(); })
    },
    ...(isAdmin ? [{
      id: 'admin_cms',
      label: 'Admin CMS',
      icon: ShieldCheck,
      badge: 'LEAD',
      allowedForGuest: false,
      action: () => {
        window.dispatchEvent(new CustomEvent('yf_open_admin_cms'));
        onClose();
      }
    }] : [])
  ];

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-10 bg-[#000000] text-white select-none overflow-hidden font-['Outfit'] pl-[7.5vw]"
    >
      {/* Ambient Flame Glow behind drawer */}
      <div 
        className="absolute top-1/3 right-10 w-96 h-96 rounded-full blur-[140px] pointer-events-none z-0 opacity-20"
        style={{ backgroundColor: accentColor }}
      />

      {/* 1. Sanctuary Navigation Screen: Shifted to the left & Zoomed Out (scale 0.88) */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          transform: 'scale(0.88)', 
          transformOrigin: 'top left',
          width: '113.6%',
          height: '113.6%'
        }}
        className="bg-[#000000] flex flex-col justify-between py-4 px-4 sm:px-6 relative z-20 overflow-y-auto no-scrollbar shadow-2xl"
      >
        {/* Top Section: 2. Centered Brand Header */}
        <div className="flex flex-col items-center justify-center text-center pb-3 border-b border-white/10 relative z-20 space-y-2">
          
          {/* Close button on upper right of menu column */}
          <button 
            onClick={onClose}
            className="absolute top-0 right-0 p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/10"
            title="Close Drawer"
            aria-label="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Swipe back indicator badge */}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 py-1 px-3 bg-white/5 hover:bg-white/10 rounded-full text-[10px] font-mono text-slate-400 hover:text-slate-200 cursor-pointer transition-colors border border-white/5"
            title="Swipe right or tap to return"
          >
            <span>SWIPE RIGHT TO RETURN</span>
            <ChevronRight className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          </button>

          {/* YoungFire Holy Flame Icon */}
          <div 
            className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg border"
            style={{
              backgroundColor: accentColor,
              borderColor: `${accentColor}80`,
              boxShadow: `0 0 20px ${accentColor}50`
            }}
          >
            <Flame className="w-5 h-5 text-black fill-current animate-pulse" />
          </div>

          {/* YOUNGFIRE (condensed font) */}
          <h2 className="text-2xl sm:text-3xl font-['Barlow_Condensed'] font-black tracking-wider uppercase text-white leading-none">
            YOUNG<span style={{ color: accentColor }}>FIRE</span>
          </h2>

          {/* JOSHUA HOUSE OF WORSHIP • EST. 2015 */}
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-amber-400 font-bold">
            JOSHUA HOUSE OF WORSHIP &bull; EST. 2015
          </p>

          {/* Active Disciple Profile Pill (Click to open Profile & Photo Upload) */}
          {currentUser && !isGuestUser && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSettingsModal();
              }}
              className="mt-1.5 flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 transition-all cursor-pointer group"
              title="Tap to upload profile photo or edit disciple profile"
            >
              <div
                className="relative w-7 h-7 rounded-full flex items-center justify-center text-black font-black text-xs shrink-0"
                style={{ backgroundColor: accentColor }}
              >
                {currentUser.avatar && !currentUser.avatar.startsWith('data:image/svg+xml') ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <span>{(currentUser.name || 'YF').slice(0, 2).toUpperCase()}</span>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-black border border-amber-400 text-amber-400 flex items-center justify-center">
                  <Camera className="w-2 h-2" />
                </span>
              </div>
              <div className="text-left min-w-0">
                <div className="text-[11px] font-bold text-white truncate max-w-[140px]">
                  {currentUser.fullName || currentUser.name}
                </div>
                <div className="text-[9px] font-mono text-amber-400 uppercase tracking-wider">
                  {currentUser.role || 'YoungFire Member'}
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Borderless Heightened Right Artwork Integration Covering Navigation Black Area */}
        <div className="absolute right-0 top-28 sm:top-32 bottom-8 w-[68%] sm:w-[75%] max-w-[340px] pointer-events-none z-0 overflow-hidden select-none">
          {/* Subtle gradient scrim protecting navigation readability while keeping photo bright */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/25 to-transparent pointer-events-none z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none z-10" />
          <img
            src="/IMG_3527.jpg"
            alt="YoungFire Sacred Fellowship"
            className="w-full h-full object-cover object-[center_20%] filter contrast-110 brightness-140 saturate-110 opacity-85 pointer-events-none"
            style={{
              WebkitMaskImage: 'radial-gradient(ellipse 95% 90% at 75% 50%, black 45%, transparent 100%)',
              maskImage: 'radial-gradient(ellipse 95% 90% at 75% 50%, black 45%, transparent 100%)'
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/fellowship_prayer_circle.jpg';
            }}
          />
        </div>

        {/* 3. Left-Aligned Menu Actions */}
        <nav className="space-y-1 my-3 py-1 relative z-20 flex-1">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 px-2 pb-1.5">
            Sanctuary Navigation
          </div>

          {menuActions.map((item) => {
            const Icon = item.icon;
            const isActive = highlightedItemId === item.id || activeTouchId === item.id;
            const isLockedForGuest = isGuestUser && !item.allowedForGuest;
            return (
              <button
                key={item.id}
                data-drawer-item-id={item.id}
                onClick={item.action}
                onTouchStart={() => setActiveTouchId(item.id)}
                onTouchEnd={() => {
                  setActiveTouchId(null);
                  setHighlightedItemId(item.id);
                }}
                onTouchCancel={() => setActiveTouchId(null)}
                style={{ WebkitTapHighlightColor: 'rgba(245, 158, 11, 0.2)' }}
                className={`w-full flex items-center justify-between gap-3 text-left transition-colors duration-150 py-2.5 px-3 rounded-xl touch-manipulation active:bg-white/10 active:text-amber-400 border cursor-pointer ${
                  isActive
                    ? 'bg-white/10 text-amber-400 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)] font-bold'
                    : isLockedForGuest
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent'
                    : 'text-slate-200 hover:text-white hover:bg-white/10 border-transparent hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div 
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      isActive
                        ? 'bg-amber-500/25 text-amber-400 ring-1 ring-amber-400/50'
                        : 'bg-white/5 text-slate-400 group-hover:bg-amber-500/20 group-hover:text-amber-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold tracking-wide font-['Barlow_Condensed',sans-serif] uppercase truncate">
                    {item.label}
                  </span>
                </div>
                {item.badge ? (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-mono text-[9px] font-black uppercase tracking-wider shrink-0">
                    {item.badge}
                  </span>
                ) : null}
                {isLockedForGuest && (
                  <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-black/85 border border-amber-500/70 shadow-[0_2px_12px_rgba(0,0,0,0.9),0_0_10px_rgba(245,158,11,0.45)] backdrop-blur-md shrink-0">
                    {/* High-Visibility Golden Lock Icon */}
                    <svg 
                      className="w-3.5 h-3.5 text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]" 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                    <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-amber-300 drop-shadow-sm">
                      Locked
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* BOTTOM SECTION: Logout & Delete Profile & Close Link */}
        <div className="pt-3 border-t border-white/10 relative z-20 space-y-2">
          {/* Logout Action Button */}
          <button
            onClick={() => {
              try {
                clearPersistentAuthSession();
                localStorage.removeItem('youngfire_verified_auth_v1');
                localStorage.removeItem('youngfire_device_session_v1');
                localStorage.removeItem('youngfire_user_session');
                window.dispatchEvent(new CustomEvent('yf_logout'));
              } catch {}
              onClose();
            }}
            className="w-full py-2.5 px-3 rounded-xl border border-amber-500/40 hover:border-amber-400 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-white text-xs font-black font-['Outfit'] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 group active:scale-98"
            title="Log Out of Sanctuary Session"
          >
            <LogOut className="w-4 h-4 stroke-[2.5] text-amber-400 group-hover:scale-110 transition-transform" />
            <span>{isGuestUser ? 'EXIT GUEST PREVIEW / SIGN IN' : 'LOG OUT OF SANCTUARY'}</span>
          </button>

          {/* Delete My Profile (danger action - restricted for guests) */}
          {!isGuestUser && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-2.5 px-3 rounded-xl border border-red-500/40 hover:border-red-500 bg-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-300 text-xs font-black font-['Outfit'] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 group active:scale-98"
              title="Permanently Delete Consecrated Disciple Profile & Records"
            >
              <Trash2 className="w-4 h-4 stroke-[2.5] text-red-500 group-hover:scale-110 transition-transform" />
              <span>Delete My Profile</span>
            </button>
          )}

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
            <span>YoungFire Sanctuary &bull; 2026</span>
            <button 
              onClick={onClose}
              className="text-amber-400 hover:underline uppercase tracking-wider cursor-pointer font-bold"
            >
              Return &larr;
            </button>
          </div>
        </div>

        {/* IN-APP DANGER CONFIRMATION MODAL */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-fade-in">
            <div className="w-full max-w-sm rounded-3xl bg-[#0D0406] border-2 border-red-500/60 p-5 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/50 text-red-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black uppercase text-white font-['Outfit']">Delete Profile?</h3>
                <p className="text-xs text-slate-300 font-mono leading-relaxed">
                  Are you sure you want to delete your profile? All consecrated streaks and device data will be permanently wiped.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeProfileDeletion}
                  className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-black uppercase tracking-wider transition-colors cursor-pointer shadow-lg shadow-red-600/30"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SlidingNavDrawer;
