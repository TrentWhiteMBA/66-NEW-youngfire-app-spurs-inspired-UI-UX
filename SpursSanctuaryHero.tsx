import React, { useState, useEffect } from 'react';
import { useFanDeckPhotos } from '../data/appCoverAssets';
import { CLOCK_CAROUSEL_PHOTOS } from '../data/fellowshipPhotos';
import { AppTheme } from '../data/appThemes';
import { AppStyleSwitcher } from './AppStyleSwitcher';
import { RotatingUCollageFanDeck } from './RotatingUCollageFanDeck';
import { ScriptureCirclesRail } from './ScriptureCirclesRail';
import { 
  Flame, ArrowRight, Radio, ChevronDown, Download, ExternalLink, ChevronLeft, ChevronRight, X, Menu, Sliders,
  BookOpen, Sparkles
} from 'lucide-react';
import { getTodaysBread, DailyBreadEntry } from '../data/dailyBreadData';
import {
  CalendarMeetingOverride,
  getEquivalentGatheringIds,
  getStoredCalendarOverrides,
  subscribeToSanctuaryCalendar
} from '../services/calendarService';
import {
  generateThemedAppIconSvg,
  resolveThemePalette,
  getSavedThemeId
} from '../services/themeService';

export interface SpursSanctuaryHeroProps {
  onNavigate: (dest: string) => void;
  onOpenSettings: () => void;
  onOpenPrayerModal?: () => void;
  isRadioPlaying: boolean;
  onToggleRadio: () => void;
  currentStationName?: string;
  onNextStation?: () => void;
  onPrevStation?: () => void;
  onOpenRoster?: () => void;
  onOpenZoom?: () => void;
  onOpenNavDrawer?: () => void;
  onToggleRadioDock?: () => void;
  onToggleMusicDock?: () => void;
  onOpenWelcome?: () => void;
  onOpenThemeModal?: () => void;
  onCycleNextTheme?: () => void;
  onCyclePrevTheme?: () => void;
  onSelectTheme?: (themeId: string) => void;
  activeTheme?: AppTheme;
  backgroundMode?: 'map' | 'obsidian_glow';
  onToggleBackgroundMode?: () => void;
  isGuestUser?: boolean;
}

// Fellowship Gathering items for YoungFire Discipleship (No matchups, no 'vs')
// Only YoungFire Small Groups have Zoom meetings scheduled; Open Bible & Sunday Worship are In-Person
interface SanctuaryGathering {
  id: string;
  title: string;
  category: string;
  emblem: string;
  dateStr: string;
  fullDate: string;
  timeStr: string;
  timeCST: string;
  location: string;
  shortLabel: string;
  badgeColor: string;
  zoomAvailable: boolean;
  status?: 'active' | 'canceled' | 'rescheduled';
  updateNote?: string;
}

const UPCOMING_GATHERINGS: SanctuaryGathering[] = [
  { 
    id: 'monday_small_group', 
    title: 'YOUNGFIRE SMALL GROUP HUDDLE',
    category: 'Bi-Weekly Discipleship & Intercessory Gathering',
    emblem: '🔥', 
    dateStr: 'OCT 5',
    fullDate: 'Monday, Oct 5',
    timeStr: '7:00 pm',
    timeCST: '7:00 PM - 8:30 PM CST',
    location: "The White's Residence",
    shortLabel: 'Small Group',
    badgeColor: 'from-amber-600 to-orange-600 border-amber-400',
    zoomAvailable: true // Only YoungFire Small Group has Zoom Broadcast
  },
  { 
    id: 'open_bible_thursday', 
    title: 'OPEN BIBLE THURSDAYS',
    category: 'All-Day Expository Study & Altar Prayer',
    emblem: '📖', 
    dateStr: 'OCT 8',
    fullDate: 'Thursday, Oct 8',
    timeStr: 'All Day',
    timeCST: 'All Day (In-Person Fellowship)',
    location: 'Joshua House of Worship • Main Hall • San Antonio, TX',
    shortLabel: 'Open Bible',
    badgeColor: 'from-zinc-900 to-black border-white/40',
    zoomAvailable: false // In-Person Only
  },
  { 
    id: 'sunday_worship', 
    title: 'SUNDAY CORPORATE WORSHIP',
    category: 'Congregational Worship & Word Proclamation',
    emblem: '🕊️', 
    dateStr: 'OCT 11',
    fullDate: 'Sunday, Oct 11',
    timeStr: '11:00 am',
    timeCST: '11:00 AM CST (In-Person Worship)',
    location: 'Joshua House of Worship • Main Sanctuary • San Antonio, TX',
    shortLabel: 'Worship & Word',
    badgeColor: 'from-orange-600 to-amber-600 border-orange-400',
    zoomAvailable: false // In-Person Only
  }
];

const JHOW_OFFICIAL_URL = 'https://joshuahouseofworship.org/?gad_source=1&gad_campaignid=22511961809&gbraid=0AAAAAokP8Rtag-bQ4B5HexneQH2q_p6gR&gclid=CjwKCAjwifjVBhBKEiwAYx4K9KTNMzVQV4-sStkh5TAvmskt4kTQ9-W6OXXTR5fWVfJlrHlJor6TkRoCSoAQAvD_BwE';

export const SpursSanctuaryHero: React.FC<SpursSanctuaryHeroProps> = ({
  onNavigate,
  onOpenSettings,
  onOpenPrayerModal,
  isRadioPlaying,
  onToggleRadio,
  currentStationName,
  onNextStation,
  onPrevStation,
  onOpenZoom,
  onOpenNavDrawer,
  onOpenThemeModal,
  onCycleNextTheme,
  onCyclePrevTheme,
  onSelectTheme,
  activeTheme,
  backgroundMode,
  onToggleBackgroundMode,
  isGuestUser = false
}) => {
  const [selectedGatheringId, setSelectedGatheringId] = useState<string>('monday_small_group');
  const [stationNotice, setStationNotice] = useState<string | null>(null);
  const [isBrandBannerOpen, setIsBrandBannerOpen] = useState<boolean>(false);
  const [showThemeHUD, setShowThemeHUD] = useState<boolean>(false);
  const [fanDeckPhotos] = useFanDeckPhotos();
  const photos = fanDeckPhotos && fanDeckPhotos.length >= 27
    ? fanDeckPhotos 
    : CLOCK_CAROUSEL_PHOTOS;

  const [smallGroupLocation, setSmallGroupLocation] = useState<string>(() => {
    return localStorage.getItem('youngfire_small_group_location') || "The White's Residence";
  });

  const [calendarOverrides, setCalendarOverrides] = useState<Record<string, CalendarMeetingOverride>>(() =>
    getStoredCalendarOverrides()
  );

  const [todaysBread, setTodaysBread] = useState<DailyBreadEntry>(() => getTodaysBread());

  // Automatically refresh Daily Bread if the calendar date rolls over at midnight
  useEffect(() => {
    const checkDailyRollover = () => {
      setTodaysBread(getTodaysBread());
    };
    const interval = setInterval(checkDailyRollover, 60000);
    window.addEventListener('focus', checkDailyRollover);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkDailyRollover);
    };
  }, []);

  useEffect(() => {
    const handleLocUpdate = (e: any) => {
      if (e.detail?.location) {
        setSmallGroupLocation(e.detail.location);
      } else {
        setSmallGroupLocation(localStorage.getItem('youngfire_small_group_location') || "The White's Residence");
      }
      setCalendarOverrides(getStoredCalendarOverrides());
    };
    const handleCalendarSync = () => {
      setCalendarOverrides(getStoredCalendarOverrides());
    };

    const unsubCalendar = subscribeToSanctuaryCalendar(({ overrides }) => {
      setCalendarOverrides({ ...overrides });
    });

    window.addEventListener('yf_small_group_location_updated', handleLocUpdate);
    window.addEventListener('yf_meeting_status_updated', handleCalendarSync);
    window.addEventListener('sanctuary_calendar_events_updated', handleCalendarSync);
    window.addEventListener('youngfire_gatherings_updated', handleCalendarSync);
    return () => {
      unsubCalendar();
      window.removeEventListener('yf_small_group_location_updated', handleLocUpdate);
      window.removeEventListener('yf_meeting_status_updated', handleCalendarSync);
      window.removeEventListener('sanctuary_calendar_events_updated', handleCalendarSync);
      window.removeEventListener('youngfire_gatherings_updated', handleCalendarSync);
    };
  }, []);

  const gatherings = UPCOMING_GATHERINGS.map(g => {
    const eqIds = getEquivalentGatheringIds(g.id);
    const matchedOverride =
      eqIds.map((eid) => calendarOverrides[eid]).find(Boolean) ||
      (g.id === 'monday_small_group'
        ? Object.entries(calendarOverrides).find(([k, v]) => k.startsWith('sg') && (v.status === 'rescheduled' || v.status === 'canceled'))?.[1]
        : g.id === 'open_bible_thursday'
        ? Object.entries(calendarOverrides).find(([k, v]) => k.startsWith('ob') && (v.status === 'rescheduled' || v.status === 'canceled'))?.[1]
        : undefined);

    let baseLoc = g.id === 'monday_small_group' ? smallGroupLocation : g.location;
    let nextFullDate = g.fullDate;
    let nextDateStr = g.dateStr;
    let nextTimeStr = g.timeStr;
    let nextTimeCST = g.timeCST;

    if (matchedOverride) {
      if (matchedOverride.locationName) {
        baseLoc = matchedOverride.locationName;
      }
      if (matchedOverride.status === 'rescheduled') {
        if (matchedOverride.rescheduleDate && /^\d{4}-\d{2}-\d{2}$/.test(matchedOverride.rescheduleDate)) {
          const [ry, rm, rd] = matchedOverride.rescheduleDate.split('-').map(Number);
          const dObj = new Date(ry, rm - 1, rd);
          nextFullDate = dObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
          nextDateStr = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
        }
        if (matchedOverride.rescheduleTime) {
          nextTimeStr = matchedOverride.rescheduleTime.replace(/\s*CST$/i, '').toLowerCase();
          nextTimeCST = matchedOverride.rescheduleTime;
        }
      }
    }

    return {
      ...g,
      location: baseLoc,
      fullDate: nextFullDate,
      dateStr: nextDateStr,
      timeStr: nextTimeStr,
      timeCST: nextTimeCST,
      status: matchedOverride?.status || 'active',
      updateNote: matchedOverride?.updateNote
    };
  });

  const currentGathering = gatherings.find(g => g.id === selectedGatheringId) || gatherings[0];

  const accentColor = activeTheme?.accentHex || '#FFFFFF';
  const borderColor = activeTheme?.borderHex || `${accentColor}70`;

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNextStation) {
      onNextStation();
      setStationNotice(currentStationName || 'Next Gospel Station');
      setTimeout(() => setStationNotice(null), 2500);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPrevStation) {
      onPrevStation();
      setStationNotice(currentStationName || 'Previous Gospel Station');
      setTimeout(() => setStationNotice(null), 2500);
    }
  };

  // 1-Tap Calendar Subscription (.ics generation for selected gathering)
  const handleDownloadICS = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGuestUser) {
      window.dispatchEvent(new CustomEvent('yf_guest_restriction', { detail: { feature: 'Sanctuary Calendar & Event Reminders' } }));
      return;
    }
    const isAllDay = currentGathering.id === 'open_bible_thursday';
    const dtStart = isAllDay ? 'DTSTART;VALUE=DATE:20261008' : (currentGathering.id === 'sunday_worship' ? 'DTSTART:20261011T110000' : 'DTSTART:20261005T190000');
    const dtEnd = isAllDay ? 'DTEND;VALUE=DATE:20261009' : (currentGathering.id === 'sunday_worship' ? 'DTEND:20261011T130000' : 'DTEND:20261005T203000');

    const icsData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//YoungFire Ministry//Sanctuary Gathering//EN',
      'BEGIN:VEVENT',
      `SUMMARY:${currentGathering.title}`,
      `DESCRIPTION:${currentGathering.category}. ${currentGathering.timeCST}. YoungFire Sanctuary Fellowship.`,
      `LOCATION:${currentGathering.location}`,
      dtStart,
      dtEnd,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${currentGathering.id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Google Calendar direct 1-tap link
  const handleOpenGoogleCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGuestUser) {
      window.dispatchEvent(new CustomEvent('yf_guest_restriction', { detail: { feature: 'Sanctuary Calendar & Event Reminders' } }));
      return;
    }
    const isAllDay = currentGathering.id === 'open_bible_thursday';
    const dates = isAllDay ? '20261008/20261009' : (currentGathering.id === 'sunday_worship' ? '20261011T110000/20261011T130000' : '20261005T190000/20261005T203000');
    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(currentGathering.title)}&dates=${dates}&details=${encodeURIComponent(currentGathering.category + ' • ' + currentGathering.timeCST)}&location=${encodeURIComponent(currentGathering.location)}`;
    window.open(gCalUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full min-h-screen bg-transparent text-white pb-32 select-none relative font-['Outfit'] flex flex-col items-center">
      
      {/* 1. JOINED YOUNGFIRE & JOSHUA HOUSE OF WORSHIP BANNER (Touches left to right flush with screen) */}
      <div 
        className="w-full relative z-20 select-none shadow-none transition-all rounded-none border-0"
        style={{
          backgroundColor: '#000000',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        <div className="w-full px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-2 max-w-7xl mx-auto">
          {/* Left + Center: Joined YoungFire Insignia & Joshua House of Worship */}
          <div 
            onClick={() => setIsBrandBannerOpen(prev => !prev)}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group flex-1 min-w-0"
            title="Tap to toggle Joshua House of Worship details & official church portal"
          >
            {/* Flame Emblem */}
            <img
              src={generateThemedAppIconSvg(activeTheme || getSavedThemeId())}
              alt="YoungFire Sanctuary Touchpoint"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover transition-all shadow-md group-hover:scale-105 flex-shrink-0 border border-white/20"
              style={{ 
                boxShadow: `0 0 14px ${resolveThemePalette(activeTheme || getSavedThemeId()).glowColor}`
              }}
            />

            {/* Joined Headings: YOUNGFIRE • JOSHUA HOUSE OF WORSHIP */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2.5 min-w-0">
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="font-['Outfit'] font-black text-sm sm:text-base tracking-[0.2em] text-white uppercase leading-none">
                  YOUNG<span style={{ color: accentColor }}>FIRE</span>
                </span>
                <span className="text-slate-500 font-bold hidden sm:inline">&bull;</span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span 
                  className="font-['Outfit'] font-bold text-xs sm:text-sm tracking-[0.16em] uppercase truncate"
                  style={{ color: accentColor }}
                >
                  Joshua House of Worship
                </span>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase hidden md:inline">
                  (San Antonio, TX &bull; EST. 2015)
                </span>
              </div>
            </div>

            <ChevronDown 
              className={`w-4 h-4 text-slate-400 group-hover:text-white transition-transform stroke-[2.5] duration-300 flex-shrink-0 ${
                isBrandBannerOpen ? 'rotate-180' : 'rotate-0'
              }`} 
              style={{ color: isBrandBannerOpen ? accentColor : undefined }}
            />
          </div>

          {/* Right: Persistent Radio Toggle & Drawer Trigger */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Persistent 24/7 Radio Toggle */}
            <button
              onClick={onToggleRadio}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer border ${
                isRadioPlaying
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
              }`}
              title={isRadioPlaying ? "24/7 Gospel Radio Playing • Tap to Pause" : "Play 24/7 Gospel Radio"}
            >
              <Radio className={`w-3.5 h-3.5 ${isRadioPlaying ? 'animate-pulse' : ''}`} />
              <span className="hidden xs:inline">{isRadioPlaying ? 'RADIO ON' : 'RADIO'}</span>
            </button>

            {/* Theme HUD Toggle Button (<Sliders />) */}
            <button
              onClick={() => {
                if (isGuestUser) {
                  window.dispatchEvent(new CustomEvent('yf_guest_restriction', { detail: { feature: 'Sanctuary Theme & Style HUD' } }));
                  return;
                }
                setShowThemeHUD(prev => !prev);
              }}
              className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                showThemeHUD
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                  : 'bg-white/5 hover:bg-white/15 border-white/15 text-slate-300 hover:text-white'
              }`}
              title="Toggle Theme & Style HUD"
              aria-label="Toggle Theme & Style HUD"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Navigation Drawer Menu Button */}
            <button
              onClick={() => {
                if (onOpenNavDrawer) onOpenNavDrawer();
                else window.dispatchEvent(new CustomEvent('yf_open_nav_drawer'));
              }}
              className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/15 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center"
              title="Open Sanctuary Navigation Gateway"
              aria-label="Open Sanctuary Navigation Gateway"
            >
              <Menu className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* INLINE DROP DOWN SMALL BANNER FOR YOUNGFIRE & JHOW INFO */}
        {isBrandBannerOpen && (
          <div 
            className="w-full px-4 sm:px-6 py-3 border-t bg-black/95 backdrop-blur-2xl flex flex-col gap-3 animate-fadeIn"
            style={{
              borderColor: borderColor,
              boxShadow: `0 10px 30px ${accentColor}25`
            }}
          >
            <div className="max-w-4xl mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* YoungFire Ministry Info */}
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md flex-shrink-0"
                  style={{ backgroundColor: accentColor }}
                >
                  <Flame className="w-4 h-4 text-black fill-current" />
                </div>
                <div>
                  <h4 className="font-['Outfit'] font-black text-xs sm:text-sm tracking-wider text-white uppercase leading-tight">
                    YoungFire Ministry &bull; Discipleship Sanctuary
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Joshua House of Worship &bull; San Antonio, TX &bull; EST. 2015 &bull; Rebuilding Better Together
                  </p>
                </div>
              </div>

              {/* Joshua House of Worship Official Link */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                <a
                  href={isGuestUser ? '#guest-restricted' : JHOW_OFFICIAL_URL}
                  target={isGuestUser ? undefined : '_blank'}
                  rel={isGuestUser ? undefined : 'noopener noreferrer'}
                  onClick={(e) => {
                    if (isGuestUser) {
                      e.preventDefault();
                      e.stopPropagation();
                      window.dispatchEvent(new CustomEvent('yf_guest_restriction', { detail: { feature: 'Official Sanctuary Portal Links' } }));
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-transform hover:scale-105 flex-shrink-0"
                  style={{
                    backgroundColor: accentColor,
                    color: activeTheme?.id === 'spurs_stealth' ? '#000000' : '#000000'
                  }}
                >
                  <span>Visit JHOW Official</span>
                  <ExternalLink className="w-3 h-3 stroke-[2.5]" />
                </a>
                <button 
                  onClick={() => setIsBrandBannerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Close Banner"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Micro Station Notification Ticker (Inside black banner) */}
        {stationNotice && (
          <div className="w-full relative z-20 px-4 py-1 flex justify-center bg-black/90 border-t border-white/5 animate-fadeIn">
            <div 
              className="px-2.5 py-0.5 rounded-full bg-black text-[9px] font-mono text-white flex items-center gap-1.5 shadow-md border"
              style={{ borderColor: accentColor }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
              <span className="uppercase tracking-wider">Tuning: {stationNotice}</span>
            </div>
          </div>
        )}

        {/* Section B: THEME SWITCHER HUD OVERLAY / DROPDOWN CARD (Only visible when showThemeHUD === true) */}
        {showThemeHUD && (
          <>
            {/* Click-outside backdrop */}
            <div 
              className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px]"
              onClick={() => setShowThemeHUD(false)}
            />
            <div 
              className="relative z-40 w-full border-t border-b border-white/15 bg-black/95 backdrop-blur-2xl shadow-2xl animate-fadeIn"
              style={{
                borderColor: borderColor,
                boxShadow: `0 16px 40px ${accentColor}25`
              }}
            >
              <div className="max-w-3xl mx-auto px-3 pt-2 pb-1 flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400 font-bold">
                  Sanctuary Theme &amp; Canvas HUD
                </span>
                <button
                  onClick={() => setShowThemeHUD(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-mono uppercase"
                  title="Close Theme HUD"
                >
                  <span>Close</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <AppStyleSwitcher 
                onCycleNextTheme={onCycleNextTheme}
                onCyclePrevTheme={onCyclePrevTheme}
                onSelectTheme={onSelectTheme}
                onOpenThemeModal={onOpenThemeModal}
                activeTheme={activeTheme} 
                backgroundMode={backgroundMode}
                onToggleBackgroundMode={onToggleBackgroundMode}
                flush={true}
              />
            </div>
          </>
        )}

        {/* Section C: 66 SCRIPTURE CANON CIRCLES (Directly inside black banner) */}
        <div className="w-full py-1.5 border-t border-white/10 bg-black">
          <ScriptureCirclesRail 
            activeTheme={activeTheme}
            isGuestUser={isGuestUser}
          />
        </div>
      </div>

      {/* Centered Sanctuary Body Content Container */}
      <div className="w-full max-w-lg mx-auto px-3 sm:px-4 flex flex-col items-center">

      {/* 5. CLOCK-ARC ROTATING PHOTO DECK - Generous vertical separation so it does not crowd the scripture rail */}
      <div className="relative z-10 my-4 sm:my-6 w-full">
        <RotatingUCollageFanDeck 
          photos={photos} 
          autoRotateIntervalMs={2000}
          activeTheme={activeTheme}
        />
      </div>

      {/* 6. ENCLOSED SMALL GROUP HUDDLE ANNOUNCEMENT CARD WITH 3-COLUMN EVENT CATEGORY TABS DIRECTLY ABOVE */}
      <div className="w-full px-3 sm:px-4 pt-1 pb-4 select-none relative z-10">
        {/* 3-Column Event Category Tab Bar Positioned Directly Above Dynamic Event Info Card */}
        <div className="flex items-center justify-between gap-2 mb-2.5 w-full overflow-x-auto no-scrollbar whitespace-nowrap">
          {gatherings.map((gathering) => {
            const isSelected = gathering.id === selectedGatheringId;
            return (
              <button
                key={gathering.id}
                onClick={() => setSelectedGatheringId(gathering.id)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer border text-center whitespace-nowrap shrink-0"
                style={{
                  borderColor: isSelected ? accentColor : 'rgba(255, 255, 255, 0.2)',
                  backgroundColor: isSelected ? `${accentColor}25` : 'rgba(0, 0, 0, 0.75)',
                  boxShadow: isSelected ? `0 0 14px ${accentColor}35` : 'none',
                  color: isSelected ? '#FFFFFF' : '#CBD5E1'
                }}
                title={gathering.title}
              >
                <span className="text-[11px] sm:text-xs font-['Outfit'] font-bold tracking-wider whitespace-nowrap">
                  {gathering.emblem} {gathering.shortLabel}
                </span>
              </button>
            );
          })}
        </div>

        <div 
          className="w-full rounded-3xl bg-[#000000]/85 backdrop-blur-2xl border overflow-hidden shadow-2xl transition-all"
          style={{
            borderColor: borderColor,
            boxShadow: `0 15px 45px ${accentColor}18`
          }}
        >
          <div className="pt-4 pb-2 px-4 flex flex-col items-center justify-center text-center">
            <span className="font-mono text-[9px] tracking-[0.25em] text-amber-400/90 mb-0.5 uppercase font-bold">
              UPCOMING SANCTUARY FELLOWSHIP
            </span>
            
            {/* Top Date */}
            <span className="font-mono text-xs tracking-[0.2em] text-slate-300 mb-1 drop-shadow uppercase font-bold">
              {currentGathering.fullDate}
            </span>

            {currentGathering.status === 'rescheduled' && (
              <span className="mb-1 px-2.5 py-0.5 rounded-full bg-amber-500/25 border border-amber-400 text-[10px] font-mono font-bold uppercase text-amber-300">
                ⚠️ Rescheduled • {currentGathering.fullDate} @ {currentGathering.timeCST}
              </span>
            )}
            {currentGathering.status === 'canceled' && (
              <span className="mb-1 px-2.5 py-0.5 rounded-full bg-rose-500/25 border border-rose-500 text-[10px] font-mono font-bold uppercase text-rose-300">
                ⚠️ Gathering Canceled {currentGathering.updateNote ? `• ${currentGathering.updateNote}` : ''}
              </span>
            )}

            {/* Title: YOUNGFIRE SMALL GROUP HUDDLE (No 'vs') */}
            <h3 className="font-['Outfit'] font-black text-base sm:text-lg tracking-wider text-white mb-0.5 drop-shadow-md uppercase">
              {currentGathering.title}
            </h3>
            
            {/* Fellowship Description */}
            <p className="text-[10px] font-mono tracking-widest text-slate-400 uppercase mb-3 font-semibold">
              {currentGathering.category}
            </p>

            {/* Center Row: Sanctuary Seal, Large Time & Location, Discipleship Flame */}
            <div className="w-full max-w-sm mx-auto flex items-center justify-between px-2 sm:px-4 my-1">
              
              {/* Left Seal: Joshua House Sanctuary */}
              <div className="flex flex-col items-center">
                <div 
                  onClick={() => onNavigate('team')}
                  className="w-13 h-13 sm:w-15 sm:h-15 rounded-full bg-gradient-to-br from-slate-800 via-slate-900 to-black border-2 flex items-center justify-center shadow-xl hover:scale-105 transition-all cursor-pointer group"
                  style={{ borderColor: accentColor }}
                  title="Joshua House Sanctuary"
                >
                  <span className="font-['Barlow_Condensed',sans-serif] text-sm sm:text-base tracking-wider text-white font-bold">
                    JHOW
                  </span>
                </div>
                <span className="font-mono text-[9px] tracking-widest text-slate-400 mt-1 uppercase font-bold">
                  SANCTUARY
                </span>
              </div>

              {/* Center: Large gathering time e.g. 7:00 pm */}
              <div className="flex flex-col items-center px-2">
                <div className="font-['Outfit'] font-black text-3xl sm:text-4xl text-white tracking-normal drop-shadow-lg leading-none">
                  {currentGathering.timeStr}
                </div>
                <p className="font-mono text-[10px] text-slate-400 mt-1.5 max-w-[200px] leading-tight text-center">
                  {currentGathering.location}
                </p>
              </div>

              {/* Right Seal: YoungFire Discipleship */}
              <div className="flex flex-col items-center">
                <div 
                  onClick={() => onNavigate('team')}
                  className="w-13 h-13 sm:w-15 sm:h-15 rounded-full bg-gradient-to-br from-slate-800 via-slate-900 to-black border-2 flex items-center justify-center shadow-xl hover:scale-105 transition-all cursor-pointer group"
                  style={{ borderColor: activeTheme?.secondaryHex || accentColor }}
                  title="YoungFire Discipleship"
                >
                  <Flame className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400 fill-amber-500/30 group-hover:scale-110 transition-transform" />
                </div>
                <span className="font-mono text-[9px] tracking-widest text-slate-400 mt-1 uppercase font-bold">
                  DISCIPLES
                </span>
              </div>
            </div>

            {/* 1-Tap Calendar Reminder links */}
            <div className="flex items-center justify-center gap-3 mt-2.5 text-[10px] font-mono text-slate-400">
              <button
                onClick={handleOpenGoogleCalendar}
                className="hover:text-amber-300 text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ExternalLink className="w-3 h-3" style={{ color: accentColor }} />
                <span>Google Cal</span>
              </button>
              <span className="text-white/20">&bull;</span>
              <button
                onClick={handleDownloadICS}
                className="hover:text-amber-300 text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3 h-3" style={{ color: accentColor }} />
                <span>Apple/iCal (.ics)</span>
              </button>
            </div>
          </div>

          {/* 3-Stripe Fiesta / Theme Accent Band */}
          <div className="w-full flex flex-col gap-[2px] mt-2">
            <div className="w-full h-1 sm:h-1.5" style={{ backgroundColor: activeTheme?.stripes?.[0] || accentColor }} />
            <div className="w-full h-1 sm:h-1.5" style={{ backgroundColor: activeTheme?.stripes?.[1] || activeTheme?.secondaryHex || '#EF426F' }} />
            <div className="w-full h-1 sm:h-1.5" style={{ backgroundColor: activeTheme?.stripes?.[2] || activeTheme?.tertiaryHex || '#FF8200' }} />
          </div>

          {/* Action button across bottom of card: Zoom only for YoungFire Small Group */}
          <button
            onClick={() => {
              if (currentGathering.zoomAvailable) {
                if (onOpenZoom) onOpenZoom();
                else window.dispatchEvent(new CustomEvent('yf_open_zoom'));
              } else {
                onNavigate('schedule');
              }
            }}
            className="w-full py-3 bg-black hover:bg-white/10 text-white font-['Outfit'] text-xs sm:text-sm tracking-[0.25em] font-black uppercase text-center transition-colors cursor-pointer block"
            title={currentGathering.zoomAvailable ? "Join Small Group Zoom Broadcast" : "View Sanctuary Schedule & Details"}
          >
            {currentGathering.zoomAvailable ? 'JOIN SMALL GROUP HUDDLE (ZOOM)' : 'VIEW SANCTUARY DETAILS & CALENDAR'}
          </button>

        </div>
      </div>

      {/* 6B. 365-DAY WHOLE-BIBLE ROTATION: DAILY BREAD OF LIFE */}
      <div className="w-full px-3 sm:px-4 pb-4 select-none relative z-10">
        <div 
          onClick={() => onNavigate('dailybread')}
          className="w-full rounded-3xl bg-[#000000]/85 backdrop-blur-2xl border p-4 sm:p-5 shadow-2xl transition-all hover:border-white/50 cursor-pointer group"
          style={{
            borderColor: borderColor,
            boxShadow: `0 15px 45px ${accentColor}18`
          }}
          title="Read Full Daily Bread Devotional"
        >
          {/* Header: Day number + Testament + Theme Badge */}
          <div className="flex items-center justify-between pb-2 border-b border-white/10 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div 
                className="w-7 h-7 rounded-lg flex items-center justify-center text-black flex-shrink-0"
                style={{ backgroundColor: accentColor }}
              >
                <BookOpen className="w-3.5 h-3.5 fill-current" />
              </div>
              <div className="min-w-0">
                <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider block" style={{ color: accentColor }}>
                  DAILY BREAD &bull; {todaysBread.testament === 'OT' ? 'OLD TESTAMENT' : 'NEW TESTAMENT'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-white font-mono text-[9px] uppercase tracking-wider font-semibold border border-white/10">
                {todaysBread.focusTheme}
              </span>
            </div>
          </div>

          {/* Scripture Reference & Verse Text */}
          <div className="pt-3 pb-2 space-y-1.5">
            <h4 className="font-['Outfit'] font-black text-lg sm:text-xl text-white tracking-wide uppercase group-hover:text-amber-300 transition-colors">
              {todaysBread.reference}
            </h4>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans italic">
              "{todaysBread.text}"
            </p>
          </div>

          {/* Practical Call & Footer Action */}
          <div className="pt-2 mt-2 border-t border-white/10 flex items-center justify-between gap-2">
            <p className="text-[10px] sm:text-[11px] font-mono text-slate-400 line-clamp-1 flex-1">
              <span className="text-white font-bold uppercase">Call:</span> {todaysBread.practicalCall}
            </p>
            <span className="text-[10px] font-mono uppercase font-bold text-amber-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform flex-shrink-0">
              <span>Devotional</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* 7. DUAL ACTION TILES with dynamic outline adjusting to color themes */}
      <div className="px-3 sm:px-4 space-y-4 relative z-10 w-full">
        <div className="grid grid-cols-2 gap-3">
          
          {/* Tile 1: MY DISCIPLESHIP • TRACK SWORD */}
          <button
            onClick={() => onNavigate('bibletracker')}
            className="p-4 rounded-2xl bg-[#000000]/90 backdrop-blur-xl border hover:scale-[1.02] transition-all group flex items-center justify-between text-left shadow-2xl shadow-black/90 cursor-pointer active:scale-98"
            style={{
              borderColor: borderColor,
              boxShadow: `0 4px 20px ${accentColor}15`
            }}
            title="My Discipleship • Check-in Sword / Track Sword"
          >
            <div className="flex flex-col gap-0.5 pr-2">
              <span className="font-['Outfit'] font-black text-base sm:text-lg leading-none text-white tracking-wide uppercase">
                MY DISCIPLESHIP
              </span>
              <span className="font-['Outfit'] font-bold text-xs sm:text-sm leading-tight text-slate-400 group-hover:text-slate-300 transition-colors uppercase">
                CHECK-IN SWORD / TRACK SWORD
              </span>
            </div>
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all flex-shrink-0 shadow-md group-hover:scale-105"
              style={{ 
                backgroundColor: accentColor,
                color: activeTheme?.id === 'spurs_stealth' ? '#000000' : '#FFFFFF'
              }}
            >
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </div>
          </button>

          {/* Tile 2: PRAYER DOCK • ENTER INTERCESSION */}
          <button
            onClick={() => onNavigate('prayer_dock')}
            className="p-4 rounded-2xl bg-[#000000]/90 backdrop-blur-xl border hover:scale-[1.02] transition-all group flex items-center justify-between text-left shadow-2xl shadow-black/90 cursor-pointer active:scale-98"
            style={{
              borderColor: borderColor,
              boxShadow: `0 4px 20px ${accentColor}15`
            }}
            title="Prayer Dock • Enter Intercession"
          >
            <div className="flex flex-col gap-0.5 pr-2">
              <span className="font-['Outfit'] font-black text-base sm:text-lg leading-none text-white tracking-wide uppercase">
                PRAYER DOCK
              </span>
              <span className="font-['Outfit'] font-bold text-xs sm:text-sm leading-tight text-slate-400 group-hover:text-slate-300 transition-colors uppercase">
                ENTER INTERCESSION
              </span>
            </div>
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all flex-shrink-0 shadow-md group-hover:scale-105"
              style={{ 
                backgroundColor: activeTheme?.secondaryHex || accentColor,
                color: activeTheme?.id === 'spurs_stealth' ? '#000000' : '#FFFFFF'
              }}
            >
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </div>
          </button>
        </div>

        {/* Guest-Only Quick Prayer Request Trigger */}
        {isGuestUser && (
          <button
            type="button"
            onClick={() => {
              if (onOpenPrayerModal) {
                onOpenPrayerModal();
              } else {
                window.dispatchEvent(new CustomEvent('yf_open_prayer_modal'));
              }
            }}
            className="w-full py-3 px-4 rounded-2xl bg-black/90 hover:bg-stone-950 backdrop-blur-xl border border-amber-500/40 hover:border-amber-400 transition-all flex items-center justify-between shadow-xl cursor-pointer group active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <div className="text-left">
                <span className="font-['Outfit'] font-black text-xs sm:text-sm uppercase tracking-wider text-white block">
                  Submit Prayer Request
                </span>
                <span className="font-mono text-[10px] text-amber-300/90 uppercase tracking-widest block">
                  24/7 Sanctuary Prayer Wall &bull; Guest Intercession
                </span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono text-[10px] font-bold uppercase tracking-wider group-hover:bg-amber-500 group-hover:text-black transition-colors">
              + Intercede
            </span>
          </button>
        )}
      </div>

      </div>

    </div>
  );
};

export default SpursSanctuaryHero;
