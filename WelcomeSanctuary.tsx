import React, { useState, useEffect } from 'react';
import { 
  Flame, ArrowRight, UserPlus, LogIn, Compass, 
  X, Sparkles, MapPin, Calendar, BookOpen, Radio,
  Globe, Youtube, Facebook, ExternalLink, Camera,
  ChevronLeft, ChevronRight, Heart, Send, CheckCircle2
} from 'lucide-react';
import { AppTheme } from '../data/appThemes';
import { useAppCover } from '../data/appCoverAssets';
import { ALL_FELLOWSHIP_PHOTOS } from '../data/fellowshipPhotos';
import { db } from '../services/firebase';
import { getPersistentAuthSession } from '../services/authService';
import {
  CalendarMeetingOverride,
  getStoredCalendarOverrides,
  subscribeToSanctuaryCalendar
} from '../services/calendarService';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';

interface WelcomeSanctuaryProps {
  onEnterSanctuary?: (user?: any) => void;
  onRegister?: () => void;
  onSignIn?: () => void;
  onGoogleSignIn?: (user?: any) => void;
  onExploreGuest?: () => void;
  onClose?: () => void;
  isAuthenticated?: boolean;
  onOpenRoster?: () => void;
  onToggleRadio?: () => void;
  isRadioPlaying?: boolean;
  onOpenThemeModal?: () => void;
  activeTheme?: AppTheme;
  [key: string]: any;
}

export const WelcomeSanctuary: React.FC<WelcomeSanctuaryProps> = ({
  onEnterSanctuary,
  onRegister,
  onSignIn,
  onGoogleSignIn,
  onExploreGuest,
  onClose,
  onReplayLaunch,
  isAuthenticated = false,
  activeTheme,
  currentUser
}) => {
  const accentColor = activeTheme?.accentHex || '#F59E0B';

  const [smallGroupLocation, setSmallGroupLocation] = useState<string>(() => {
    return localStorage.getItem('youngfire_small_group_location') || "The White's Residence";
  });
  const [calendarOverrides, setCalendarOverrides] = useState<Record<string, CalendarMeetingOverride>>(() =>
    getStoredCalendarOverrides()
  );

  useEffect(() => {
    const syncScheduleState = () => {
      setSmallGroupLocation(localStorage.getItem('youngfire_small_group_location') || "The White's Residence");
      setCalendarOverrides(getStoredCalendarOverrides());
    };
    const unsubCalendar = subscribeToSanctuaryCalendar(({ overrides }) => {
      setCalendarOverrides({ ...overrides });
      setSmallGroupLocation(localStorage.getItem('youngfire_small_group_location') || "The White's Residence");
    });
    window.addEventListener('yf_small_group_location_updated', syncScheduleState);
    window.addEventListener('yf_meeting_status_updated', syncScheduleState);
    window.addEventListener('sanctuary_calendar_events_updated', syncScheduleState);
    window.addEventListener('youngfire_gatherings_updated', syncScheduleState);
    return () => {
      unsubCalendar();
      window.removeEventListener('yf_small_group_location_updated', syncScheduleState);
      window.removeEventListener('yf_meeting_status_updated', syncScheduleState);
      window.removeEventListener('sanctuary_calendar_events_updated', syncScheduleState);
      window.removeEventListener('youngfire_gatherings_updated', syncScheduleState);
    };
  }, []);

  const nextSmallGroupOverride =
    calendarOverrides['monday_small_group'] ||
    calendarOverrides['sg_2026-10-05'] ||
    calendarOverrides['sg-2026-9-5'] ||
    Object.values(calendarOverrides).find((o) => o.status === 'rescheduled' || o.status === 'canceled');

  useEffect(() => {
    const shouldAutoplay = localStorage.getItem('youngfire_autoplay_worship') === 'true';
    const audioElement = document.getElementById('sanctuary-bg-audio') as HTMLAudioElement;

    if (audioElement) {
      if (shouldAutoplay) {
        audioElement.play().catch(() => {
          console.log("Autoplay blocked by browser policy until interaction");
        });
      } else {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
    }
  }, [currentUser]);

  // Authentic YoungFire Fellowship Photo (Strictly 1 Attached Photo: Living Room Prayer Circle Huddle)
  const WELCOME_PHOTO = { 
    url: '/IMG_3520.jpg', 
    title: 'Living Room Prayer Circle Huddle', 
    location: "White's Residence Living Room",
    description: 'Consecrated fellowship selfie huddle with Lead Facilitators Trent & Whitney White'
  };

  // Photo Style Filter Mode (Defaults to Black & White and Sharp)
  const [photoFilterMode, setPhotoFilterMode] = useState<'bw_sharp' | 'color'>('bw_sharp');

  // Interactive Google Sign-In Window State (Consent-based local device storage only)
  const [isGoogleWindowOpen, setIsGoogleWindowOpen] = useState<boolean>(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState<string>('');
  const [customGoogleName, setCustomGoogleName] = useState<string>('');
  const [rememberOnDevice, setRememberOnDevice] = useState<boolean>(true);
  const [savedLocalGoogleAccount, setSavedLocalGoogleAccount] = useState<{ email: string; name?: string } | null>(() => {
    try {
      const saved = localStorage.getItem('youngfire_saved_google_account');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Real-time Firestore Prayer Wall sync on Welcome page (collection(db, 'prayers'))
  const [welcomePrayers, setWelcomePrayers] = useState<Array<{ id: string; names?: string | string[]; cause: string; authorName?: string; timestamp?: number }>>([]);
  const [isPrayerFormOpen, setIsPrayerFormOpen] = useState<boolean>(false);
  const [prayerSenderName, setPrayerSenderName] = useState<string>('');
  const [prayerRequestText, setPrayerRequestText] = useState<string>('');
  const [prayerSubmittedToast, setPrayerSubmittedToast] = useState<boolean>(false);

  useEffect(() => {
    // Persistent SSO session restoration check on Welcome Gateway mount
    try {
      const persisted = getPersistentAuthSession();
      if (persisted && (persisted.email || persisted.uid) && !onClose && onEnterSanctuary) {
        onEnterSanctuary(persisted);
      }
    } catch {}
  }, [onClose, onEnterSanctuary]);

  useEffect(() => {
    const prayersRef = collection(db, 'prayers');
    const q = query(prayersRef, orderBy('timestamp', 'desc'), limit(25));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as any)
        }));
        setWelcomePrayers(items);
      },
      (err) => {
        console.error('Firebase Welcome Prayer Sync Error:', err);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSubmitWelcomePrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    const causeText = prayerRequestText.trim();
    if (!causeText) return;

    const resolvedAuthor =
      prayerSenderName.trim() ||
      localStorage.getItem('youngfire_user_name') ||
      sessionStorage.getItem('youngfire_guest_name') ||
      `Disciple-${Math.floor(1000 + Math.random() * 9000)}`;
    const resolvedId =
      localStorage.getItem('youngfire_user_id') ||
      sessionStorage.getItem('youngfire_guest_id') ||
      `guest-${Date.now()}`;

    setPrayerRequestText('');
    setPrayerSenderName('');
    setIsPrayerFormOpen(false);
    setPrayerSubmittedToast(true);
    setTimeout(() => setPrayerSubmittedToast(false), 3500);

    try {
      await addDoc(collection(db, 'prayers'), {
        names: [resolvedAuthor],
        cause: causeText,
        authorId: resolvedId,
        authorName: resolvedAuthor,
        status: 'Active Intercession',
        completed: false,
        intercessorsCount: 1,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        timestamp: Date.now(),
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Firebase Welcome Prayer Write Error:', err);
    }
  };

  const handleForgetSavedAccount = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      localStorage.removeItem('youngfire_saved_google_account');
    } catch {}
    setSavedLocalGoogleAccount(null);
  };

  const handleRegisterClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRegister) {
      onRegister();
    } else {
      window.dispatchEvent(new CustomEvent('yf_open_auth_portal', { detail: { mode: 'register' } }));
    }
  };

  const handleSignInClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSignIn) {
      onSignIn();
    } else {
      window.dispatchEvent(new CustomEvent('yf_open_auth_portal', { detail: { mode: 'signin' } }));
    }
  };

  const handleExploreGuestClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onExploreGuest) {
      onExploreGuest();
    } else {
      window.dispatchEvent(new CustomEvent('yf_enter_guest_preview'));
    }
  };

  const MINISTRY_EMAIL = 'JHOWYoungFire@gmail.com';

  const [isContactModalOpen, setIsContactModalOpen] = useState<boolean>(false);
  const [contactTopic, setContactTopic] = useState<string>('General Inquiry');
  const [contactName, setContactName] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [contactMessage, setContactMessage] = useState<string>('');
  const [contactSentToast, setContactSentToast] = useState<boolean>(false);
  const [emailCopied, setEmailCopied] = useState<boolean>(false);

  const buildMailtoUrl = (topic: string = contactTopic) => {
    const subject = encodeURIComponent(`YoungFire Sanctuary • ${topic}`);
    const body = encodeURIComponent(
      `Peace and blessings Facilitators,\n\nI am reaching out regarding: ${topic}\n\nName: ${contactName || ''}\nPhone: ${contactPhone || ''}\nInquiry / Prayer Request / Ministry Interest:\n${contactMessage || ''}\n`
    );
    return `mailto:${MINISTRY_EMAIL}?subject=${subject}&body=${body}`;
  };

  const buildGmailComposeUrl = (topic: string = contactTopic) => {
    const subject = encodeURIComponent(`YoungFire Sanctuary • ${topic}`);
    const body = encodeURIComponent(
      `Peace and blessings Facilitators,\n\nI am reaching out regarding: ${topic}\n\nName: ${contactName || ''}\nPhone: ${contactPhone || ''}\nInquiry / Prayer Request / Ministry Interest:\n${contactMessage || ''}\n`
    );
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(MINISTRY_EMAIL)}&su=${subject}&body=${body}`;
  };

  const handleEmailMinistry = (topic: string = 'General Inquiry') => {
    setContactTopic(topic);
    setIsContactModalOpen(true);
  };

  const handleCopyMinistryEmail = async () => {
    try {
      await navigator.clipboard.writeText(MINISTRY_EMAIL);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2500);
    } catch {
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2500);
    }
  };

  const handleSubmitContactForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactMessage.trim() && !contactName.trim()) return;

    try {
      await addDoc(collection(db, 'ministry_inquiries'), {
        to: MINISTRY_EMAIL,
        topic: contactTopic,
        name: contactName.trim() || 'Sanctuary Visitor',
        phone: contactPhone.trim() || '',
        message: contactMessage.trim(),
        timestamp: Date.now(),
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Ministry inquiry save error:', err);
    }

    setContactSentToast(true);
    // Also trigger native mail client via invisible anchor with target="_top" for devices with mail apps
    try {
      const a = document.createElement('a');
      a.href = buildMailtoUrl(contactTopic);
      a.target = '_top';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {}

    setTimeout(() => {
      setContactSentToast(false);
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 text-white flex flex-col items-center select-none font-['Outfit']">
      
      {/* 1. Stationary San Antonio Street Map Screenshot Backdrop */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-85 bg-cover bg-center select-none"
        style={{ backgroundImage: `url('/san_antonio_dark_map.png')` }}
      />

      {/* 2. Soft Obsidian Gradient Overlays for Card Text Legibility */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-black/60 via-black/20 to-black/80" />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.8)_95%)]" />

      {/* Main Sanctuary Card Container (Scrolls smoothly over stationary map) */}
      <div className="relative z-10 w-full max-w-xl mx-auto px-4 pt-3 pb-8 sm:pt-4 sm:pb-12 flex flex-col items-center">
        
        {/* Close Button (if modal overlay) */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-5 sm:right-5 p-2 rounded-full bg-black/60 hover:bg-black/90 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer z-30"
            title="Close Welcome Sanctuary"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* 3. Top Hero Photo: Clean, Unobscured with Heads, Faces & Smiles Fully Visible (Strictly 1 Single Attached Photo: IMG_3520.jpg) */}
        <div className="relative w-full h-80 sm:h-96 md:h-[480px] rounded-3xl overflow-hidden border border-amber-500/40 shadow-[0_20px_50px_rgba(0,0,0,0.9)] bg-black group">
          <img
            src={WELCOME_PHOTO.url}
            alt={WELCOME_PHOTO.title}
            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-102"
            style={{
              objectPosition: 'center 32%',
              filter: photoFilterMode === 'bw_sharp'
                ? 'grayscale(100%) contrast(155%) brightness(108%) drop-shadow(0 2px 8px rgba(0,0,0,0.5))'
                : 'contrast(125%) brightness(106%) saturate(120%) drop-shadow(0 2px 8px rgba(0,0,0,0.5))'
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/IMG_3520.jpg';
            }}
          />

          {/* Top Floating Filter Switcher Badge: Compact 1-Tap Toggle between B&W Sharp and Vibrant Color */}
          <div className="absolute top-2.5 left-2.5 z-30 flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPhotoFilterMode(prev => prev === 'bw_sharp' ? 'color' : 'bw_sharp');
              }}
              className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-black/85 hover:bg-black text-amber-300 border border-amber-500/40 backdrop-blur-md text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg transition-all cursor-pointer hover:border-amber-400 active:scale-95"
              title="Toggle Sharp Black & White vs Vibrant Color"
            >
              <span>{photoFilterMode === 'bw_sharp' ? '✦ B&W' : '☀ Color'}</span>
              <span className="text-[8px] text-slate-400 font-normal">| Tap</span>
            </button>
          </div>

          {/* Top-Right Pulsing Living Water Blue Dot Beacon: Click to Replay Launch Sequence from Beginning */}
          {onReplayLaunch && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReplayLaunch();
              }}
              className="absolute top-2.5 right-2.5 z-30 px-2.5 py-1 rounded-full bg-black/85 hover:bg-black border border-cyan-400/50 hover:border-cyan-400 backdrop-blur-md text-[9px] font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5 shadow-[0_0_18px_rgba(6,182,212,0.35)] transition-all cursor-pointer active:scale-95"
              title="Click Blue Dot to Replay Sanctuary Launch from the Beginning"
            >
              <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400 shadow-[0_0_10px_2px_rgba(6,182,212,0.9)]" />
              </span>
              <span>Beacon</span>
            </button>
          )}
        </div>

        {/* 4. Dedicated Content Well Strictly Underneath the Photograph */}
        <div className="w-full text-center space-y-4 mt-6 sm:mt-8 relative z-20 px-2">
          
          {/* Flame Center Crest */}
          <div 
            className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl flex items-center justify-center shadow-[0_0_35px_rgba(245,158,11,0.5)] border border-amber-400/50"
            style={{ 
              backgroundColor: '#000000',
              boxShadow: `0 0 30px ${accentColor}40`
            }}
          >
            <div 
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white flex items-center justify-center shadow-inner"
            >
              <Flame className="w-6 h-6 sm:w-7 sm:h-7 text-black fill-current drop-shadow" />
            </div>
          </div>

          <div>
            <h1 className="font-['Outfit'] text-2xl sm:text-3xl tracking-[0.2em] uppercase text-white font-black drop-shadow-md">
              YOUNG<span style={{ color: accentColor }}>FIRE</span>
            </h1>
            <p className="text-xs sm:text-sm font-mono tracking-[0.16em] uppercase text-slate-300 font-bold mt-0.5">
              JOSHUA HOUSE OF WORSHIP &bull; SAN ANTONIO, TX &bull; EST. 2015
            </p>
          </div>

          {/* ANNUAL THEME PROCLAMATION */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-black/85 backdrop-blur-md border border-amber-500/35 shadow-xl max-w-lg mx-auto">
            <span className="text-[10px] font-mono tracking-widest uppercase text-amber-400 font-bold block mb-1">
              ANNUAL THEME PROCLAMATION &bull; LEADERSHIP
            </span>
            <p className="font-['Outfit'] text-sm sm:text-base font-black text-white tracking-wide leading-snug">
              Rebuilding Better Together (Ephesians 4:16) &bull; Lead Facilitators Trent D. White &amp; Whitney White &bull; EST. 2015
            </p>
          </div>

          {/* Gathering Quick Notice (Synchronized with Sanctuary Calendar & Reschedules) */}
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="flex items-center justify-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="font-mono text-xs text-slate-200 tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
                {nextSmallGroupOverride?.status === 'rescheduled'
                  ? `Small Groups Rescheduled: ${nextSmallGroupOverride.rescheduleDate || 'New Date'} @ ${nextSmallGroupOverride.rescheduleTime || '7:00 PM CST'} • ${nextSmallGroupOverride.locationName || smallGroupLocation}`
                  : nextSmallGroupOverride?.status === 'canceled'
                  ? `Small Group Notice: Next Gathering Canceled (${nextSmallGroupOverride.updateNote || 'See Calendar'})`
                  : `Small Groups: ${smallGroupLocation} @7pm CST • Meetings: Bi-Weekly/Monthly`}
              </span>
            </div>
            {nextSmallGroupOverride && (nextSmallGroupOverride.status === 'rescheduled' || nextSmallGroupOverride.status === 'canceled') && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 font-mono text-[10px] font-bold uppercase text-amber-300">
                {nextSmallGroupOverride.status === 'rescheduled'
                  ? `⚠️ Rescheduled to ${nextSmallGroupOverride.rescheduleDate || 'New Date'} (${nextSmallGroupOverride.rescheduleTime || '7:00 PM CST'})`
                  : `⚠️ Gathering Canceled`}
              </span>
            )}
          </div>
        </div>

        {/* 5. STREAMLINED WELCOME PATHWAYS (3 Clear Actions) */}
        <div className="w-full max-w-sm sm:max-w-md mx-auto space-y-3 sm:space-y-3.5 mt-6">
          
          {/* Pathway 1 & 2: Sign In & Register Disciple */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
            <button
              type="button"
              onClick={handleSignInClick}
              className="w-full py-3.5 px-6 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-black tracking-wider uppercase shadow-xl transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 cursor-pointer font-['Outfit'] text-xs sm:text-sm"
            >
              <LogIn className="w-4 h-4 text-slate-950" />
              <span>Sign In</span>
            </button>

            <button
              type="button"
              onClick={handleRegisterClick}
              className="w-full py-3.5 px-6 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-black tracking-wider uppercase shadow-xl transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 cursor-pointer font-['Outfit'] text-xs sm:text-sm"
            >
              <UserPlus className="w-4 h-4 text-slate-950" />
              <span>Register Disciple</span>
            </button>
          </div>

          {/* Pathway 3: Preview Sanctuary (Guest - Read-Only Restricted Mode) */}
          <button
            type="button"
            onClick={handleExploreGuestClick}
            className="w-full py-3 px-6 rounded-xl bg-black/70 hover:bg-white/10 border border-cyan-400/40 hover:border-cyan-400 backdrop-blur-md text-white font-bold tracking-wider uppercase transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-0.5 cursor-pointer font-['Outfit'] shadow-lg"
          >
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Preview Sanctuary (Guest)</span>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="text-[9px] font-mono text-cyan-300/80 tracking-widest uppercase">
              Read-Only Preview &bull; Member Cohorts &amp; Posting Restricted
            </span>
          </button>

          {/* Secondary Action: Contact Facilitators */}
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => handleEmailMinistry('General Inquiry')}
              className="px-4 py-2 rounded-full border border-amber-500/40 bg-black/60 hover:bg-amber-500/10 backdrop-blur-md flex items-center space-x-2 transition-all duration-200 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-mono text-xs uppercase tracking-widest text-amber-300">
                Contact Facilitators
              </span>
            </button>
          </div>

          {/* Sanctuary Prayer Wall Sync Widget (Writes & listens directly to collection(db, 'prayers')) */}
          <div className="p-3.5 rounded-2xl bg-black/75 backdrop-blur-md border border-emerald-500/30 space-y-2.5 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-emerald-400" />
                <span>24/7 Sanctuary Prayer Wall ({welcomePrayers.length})</span>
              </span>
              <button
                type="button"
                onClick={() => setIsPrayerFormOpen(prev => !prev)}
                className="text-[10px] font-mono font-bold text-amber-300 hover:text-amber-200 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 cursor-pointer transition-colors"
              >
                {isPrayerFormOpen ? 'Close' : '+ Submit Prayer'}
              </button>
            </div>

            {prayerSubmittedToast && (
              <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Prayer request synced to the Sanctuary Prayer Wall.</span>
              </div>
            )}

            {isPrayerFormOpen && (
              <form onSubmit={handleSubmitWelcomePrayer} className="space-y-2 pt-1">
                <input
                  type="text"
                  placeholder="Your Name (Optional)"
                  value={prayerSenderName}
                  onChange={(e) => setPrayerSenderName(e.target.value)}
                  className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Share a prayer request with the Sanctuary..."
                    value={prayerRequestText}
                    onChange={(e) => setPrayerRequestText(e.target.value)}
                    required
                    className="flex-1 bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Pray</span>
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>

        {/* 6. JHOW OFFICIAL SOCIAL & WEB PORTAL (Vibrant Branded Media Icons) */}
        <div className="w-full max-w-sm sm:max-w-md mx-auto mt-6 p-4 rounded-2xl bg-black/75 backdrop-blur-md border border-white/15 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="text-[11px] font-mono tracking-wider uppercase text-amber-400 font-bold flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              Joshua House of Worship Online
            </span>
            <span className="text-[10px] font-mono text-slate-400">San Antonio, TX</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Website Link (Warm Gold/Amber Brand) */}
            <a
              href="https://joshuahouseofworship.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-black/60 hover:bg-amber-500/10 border border-white/15 hover:border-amber-400/50 flex flex-col items-center justify-center gap-1.5 transition-all text-center group cursor-pointer"
              title="Official Church Website"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                <Globe className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-[11px] font-bold text-white group-hover:text-amber-300">Church Website</span>
              <span className="text-[9px] font-mono text-amber-400/90 flex items-center gap-0.5">
                jhow.org <ExternalLink className="w-2.5 h-2.5" />
              </span>
            </a>

            {/* YouTube Link (Authentic YouTube Red Brand) */}
            <a
              href="https://www.youtube.com/@JoshuaHouseOfWorshipSanAntonio/featured"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-black/60 hover:bg-red-500/10 border border-white/15 hover:border-red-500/50 flex flex-col items-center justify-center gap-1.5 transition-all text-center group cursor-pointer"
              title="Official YouTube Broadcasts"
            >
              <div className="w-8 h-8 rounded-lg bg-[#FF0000]/20 text-[#FF0000] border border-[#FF0000]/30 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_12px_rgba(255,0,0,0.3)]">
                <Youtube className="w-4 h-4 text-[#FF0000]" />
              </div>
              <span className="text-[11px] font-bold text-white group-hover:text-red-400">YouTube</span>
              <span className="text-[9px] font-mono text-red-400/90 flex items-center gap-0.5">
                Livestreams <ExternalLink className="w-2.5 h-2.5" />
              </span>
            </a>

            {/* Facebook Link (Authentic Facebook Blue Brand) */}
            <a
              href="https://www.facebook.com/JoshuaHouseofWorshipSanAntonio/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-black/60 hover:bg-blue-500/10 border border-white/15 hover:border-blue-500/50 flex flex-col items-center justify-center gap-1.5 transition-all text-center group cursor-pointer"
              title="Official Facebook Page"
            >
              <div className="w-8 h-8 rounded-lg bg-[#1877F2]/20 text-[#1877F2] border border-[#1877F2]/30 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_12px_rgba(24,119,242,0.3)]">
                <Facebook className="w-4 h-4 text-[#1877F2]" />
              </div>
              <span className="text-[11px] font-bold text-white group-hover:text-blue-400">Facebook</span>
              <span className="text-[9px] font-mono text-[#1877F2]/90 flex items-center gap-0.5">
                Sanctuary <ExternalLink className="w-2.5 h-2.5" />
              </span>
            </a>
          </div>
        </div>

        {/* 7. Member Features Section (Refined Accent Colors) */}
        <div className="w-full max-w-sm sm:max-w-md mx-auto mt-6 pt-5 border-t border-white/10 text-center space-y-2.5">
          <h3 className="text-[11px] font-mono tracking-widest uppercase text-amber-400 font-bold">
            Member Features
          </h3>
          <div className="grid grid-cols-3 gap-2 w-full">
            <div className="p-2.5 rounded-xl bg-black/60 border border-white/15">
              <BookOpen className="w-4 h-4 mx-auto text-amber-400 mb-1" />
              <span className="text-[10px] font-mono text-slate-200 block font-bold">66-BOOK CANON</span>
              <span className="text-[9px] font-mono text-slate-400">Physical Bible Tracker</span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/60 border border-white/15">
              <Radio className="w-4 h-4 mx-auto text-cyan-400 mb-1" />
              <span className="text-[10px] font-mono text-slate-200 block font-bold">24/7 GOSPEL AUDIO</span>
              <span className="text-[9px] font-mono text-slate-400">8 Curated Streams</span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/60 border border-white/15">
              <Calendar className="w-4 h-4 mx-auto text-orange-400 mb-1" />
              <span className="text-[10px] font-mono text-slate-200 block font-bold">FELLOWSHIP</span>
              <span className="text-[9px] font-mono text-slate-400">In-Person &amp; Zoom</span>
            </div>
          </div>
        </div>

      </div>

      {/* Contact Facilitators Modal (Works inside iframe, mobile, and desktop) */}
      {isContactModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fadeIn"
          onClick={() => setIsContactModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-[#040711] border border-amber-500/40 p-5 sm:p-6 shadow-[0_25px_70px_rgba(0,0,0,0.95)] space-y-4 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <div>
                  <h3 className="font-['Outfit'] font-black text-base uppercase tracking-wider text-white">
                    Contact Facilitators
                  </h3>
                  <p className="font-mono text-[10px] text-amber-400">
                    {MINISTRY_EMAIL}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsContactModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white border border-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {contactSentToast && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Message logged for Facilitators ({MINISTRY_EMAIL})!</span>
              </div>
            )}

            <form onSubmit={handleSubmitContactForm} className="space-y-3">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                  Inquiry Topic
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {['General Inquiry', 'Prayer Request', 'Ministry Interest', 'Small Groups'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setContactTopic(t)}
                      className={`px-2.5 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-wider border text-center transition-all cursor-pointer ${
                        contactTopic === t
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                          : 'bg-black/60 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                    Phone or Email
                  </label>
                  <input
                    type="text"
                    placeholder="(210) 555-0199"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                  Inquiry / Prayer Request / Ministry Interest
                </label>
                <textarea
                  rows={3}
                  placeholder="Peace and blessings Facilitators, I am reaching out regarding..."
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  required
                  className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-['Outfit'] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send to Facilitators</span>
              </button>
            </form>

            {/* Direct Email Client & Copy Options */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Or Open Directly in Your Email Client:
              </div>
              <div className="grid grid-cols-3 gap-2">
                <a
                  href={buildMailtoUrl(contactTopic)}
                  target="_top"
                  rel="noopener noreferrer"
                  className="py-2 px-2 rounded-xl bg-white/5 hover:bg-amber-500/15 border border-white/15 hover:border-amber-400/50 text-center font-mono text-[10px] uppercase text-amber-300 font-bold transition-all flex items-center justify-center gap-1"
                >
                  <span>Mail App</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <a
                  href={buildGmailComposeUrl(contactTopic)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-2 rounded-xl bg-white/5 hover:bg-amber-500/15 border border-white/15 hover:border-amber-400/50 text-center font-mono text-[10px] uppercase text-slate-200 hover:text-amber-300 font-bold transition-all flex items-center justify-center gap-1"
                >
                  <span>Gmail Web</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <button
                  type="button"
                  onClick={handleCopyMinistryEmail}
                  className="py-2 px-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/15 text-center font-mono text-[10px] uppercase text-slate-200 font-bold transition-all cursor-pointer"
                >
                  {emailCopied ? '✓ Copied!' : 'Copy Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default WelcomeSanctuary;
