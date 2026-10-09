import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Clock, MapPin, Video, Flame, 
  ChevronLeft, ChevronRight, Download, Plus, Check, List, 
  Grid, Sparkles, X, ExternalLink, ShieldCheck, Compass, Edit3, Trash2,
  BookOpen
} from 'lucide-react';
import { AppTheme } from '../data/appThemes';
import { SCHEDULE_MOSAIC_PHOTOS } from '../data/fellowshipPhotos';
import { CurrentUser } from './SettingsHUDModal';
import {
  CalendarMeetingOverride,
  getStoredCalendarOverrides,
  getEquivalentGatheringIds,
  saveCalendarMeetingOverride,
  subscribeToSanctuaryCalendar,
  upsertSanctuaryCalendarEventToFirestore,
  deleteSanctuaryCalendarEventFromFirestore
} from '../services/calendarService';
import { getStoredGatheringEvents, GatheringEvent } from '../data/gatheringEventsData';

interface SanctuaryScheduleViewProps {
  currentUser?: CurrentUser | null;
  onOpenZoom?: () => void;
  onNavigate?: (tab: string) => void;
  activeTheme?: AppTheme;
  [key: string]: any;
}

export interface ScheduleGathering {
  id: string;
  year: number;
  month: number; // 0-indexed (0 = Jan, 9 = Oct)
  dayNumber: number; // 1-31
  dateStr: string;
  timeStr: string;
  title: string;
  category: 'small-group' | 'open-bible' | 'special';
  badge: string;
  locationName: string;
  address: string;
  description: string;
  hasZoom: boolean;
  zoomUrl?: string;
  hostLeader: string;
  isAtWhites: boolean;
  isUpcoming: boolean;
  isCustom?: boolean;
  status?: 'pending' | 'approved' | 'active' | 'canceled' | 'rescheduled';
  approvalStatus?: 'pending' | 'approved';
  approved?: boolean;
  createdBy?: string;
  createdById?: string;
  rescheduleDate?: string;
  rescheduleTime?: string;
  updateNote?: string;
}

// Canonical reference date for bi-weekly Mondays: Monday, October 5, 2026
const CANONICAL_REF_MONDAY = new Date(2026, 9, 5);

// Dense mosaic photo array with all public directory photos duplicated to eliminate ANY black voids on all screens
const FULL_SCHEDULE_MOSAIC: string[] = [
  '/IMG_3519.jpg', '/IMG_3520.jpg', '/IMG_3521.jpg', '/IMG_3522.jpg',
  '/IMG_3523.jpg', '/IMG_3524.jpg', '/IMG_3525.jpg', '/IMG_3526.jpg',
  '/IMG_3527.jpg', '/IMG_3528.jpg', '/IMG_3529.jpg', '/IMG_3530.jpg',
  '/IMG_3531.jpg', '/IMG_3532.jpg', '/IMG_3533.jpg', '/IMG_3534.jpg',
  '/IMG_3535.jpg', '/IMG_3536.jpg', '/IMG_3537.jpg', '/IMG_3538.jpg',
  '/IMG_3539.jpg', '/IMG_3540.jpg', '/IMG_3541.jpg', '/IMG_3542.jpg',
  '/IMG_3543.jpg', '/IMG_3544.jpg', '/IMG_3545.jpg', '/fellowship_prayer_circle.jpg',
  '/image_2.png', '/image_3.png', '/image_4.png', '/image_5.png', '/image_6.png', '/image_7.png',
  '/IMG_3520.jpg', '/IMG_3524.jpg', '/IMG_3519.jpg', '/IMG_3527.jpg',
  '/IMG_3522.jpg', '/IMG_3525.jpg', '/IMG_3528.jpg', '/IMG_3532.jpg',
  '/IMG_3530.jpg', '/IMG_3533.jpg', '/IMG_3535.jpg', '/IMG_3537.jpg',
  '/IMG_3539.jpg', '/IMG_3541.jpg', '/IMG_3543.jpg', '/IMG_3545.jpg',
  '/IMG_3521.jpg', '/IMG_3523.jpg', '/IMG_3526.jpg', '/IMG_3529.jpg',
  '/IMG_3531.jpg', '/IMG_3534.jpg', '/IMG_3536.jpg', '/IMG_3538.jpg',
  '/IMG_3540.jpg', '/IMG_3542.jpg', '/IMG_3544.jpg', '/fellowship_prayer_circle.jpg'
];

export const SanctuaryScheduleView: React.FC<SanctuaryScheduleViewProps> = ({ 
  currentUser,
  onOpenZoom, 
  activeTheme 
}) => {
  const accentColor = activeTheme?.accentHex || '#F59E0B';
  const secondaryColor = activeTheme?.secondaryHex || '#EA580C';
  const borderColor = activeTheme?.borderHex || `${accentColor}50`;

  const isLeader = Boolean(
    currentUser?.isAdmin ||
    currentUser?.accountType === 'administrator' ||
    currentUser?.role === 'Administrator' ||
    currentUser?.role === 'Lead Facilitator' ||
    currentUser?.role === 'Overseer' ||
    ['trentwhite0308@gmail.com', 'trentwhitemba@yahoo.com', 'white.whitney91@gmail.com', 'luislopez567@hotmail.com'].includes((currentUser?.email || '').toLowerCase().trim()) ||
    localStorage.getItem('youngfire_admin_override') === 'true'
  );

  // 12-Month / Infinite Calendar State (Default to October 2026)
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => new Date(2026, 9, 1));
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Schedule Controls
  const [filterMode, setFilterMode] = useState<'all' | 'whites' | 'upcoming'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedGathering, setSelectedGathering] = useState<ScheduleGathering | null>(null);
  const [icsDownloaded, setIcsDownloaded] = useState(false);

  // Quick In-Schedule Admin Event Creator Modal
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('7:00 PM CST');
  const [newEventCategory, setNewEventCategory] = useState<'small-group' | 'open-bible' | 'special'>('special');
  const [newEventLocation, setNewEventLocation] = useState("The White's Residence");
  const [newEventDesc, setNewEventDesc] = useState('');

  // Small Group Custom Location override
  const [smallGroupLoc, setSmallGroupLoc] = useState<string>(() => {
    return localStorage.getItem('youngfire_small_group_location') || "The White's Residence";
  });

  // Custom Gatherings from Admin CMS (Excludes Men On Fire and Women Ignited pre-scheduled dates)
  const [customGatherings, setCustomGatherings] = useState<ScheduleGathering[]>(() => {
    try {
      const saved = localStorage.getItem('youngfire_sanctuary_custom_gatherings');
      const list = saved ? JSON.parse(saved) : [];
      return Array.isArray(list)
        ? list.filter(g => !g.title?.toLowerCase().includes('men on fire') && !g.title?.toLowerCase().includes('women ignited'))
        : [];
    } catch {
      return [];
    }
  });

  // Live Meeting Overrides (Rescheduled / Canceled) synced across FellowshipCalendar & Firestore
  const [meetingOverrides, setMeetingOverrides] = useState<Record<string, CalendarMeetingOverride>>(() =>
    getStoredCalendarOverrides()
  );

  // Shared Sanctuary Calendar Events from Firestore / localStorage
  const [sharedCalendarEvents, setSharedCalendarEvents] = useState<GatheringEvent[]>(() =>
    getStoredGatheringEvents()
  );

  // Admin Reschedule / Edit Controls in Gathering Details Modal
  const [isAdminEditingModal, setIsAdminEditingModal] = useState(false);
  const [editModalStatus, setEditModalStatus] = useState<'active' | 'canceled' | 'rescheduled'>('active');
  const [editModalRescheduleDate, setEditModalRescheduleDate] = useState('');
  const [editModalRescheduleTime, setEditModalRescheduleTime] = useState('7:00 PM CST');
  const [editModalLocation, setEditModalLocation] = useState('');
  const [editModalNote, setEditModalNote] = useState('');

  // Listeners for updates + Live Firestore onSnapshot subscription
  useEffect(() => {
    const handleLocUpdate = (e: any) => {
      if (e.detail?.location) setSmallGroupLoc(e.detail.location);
    };
    const handleGatheringsUpdate = () => {
      try {
        const saved = localStorage.getItem('youngfire_sanctuary_custom_gatherings');
        if (saved) {
          const list = JSON.parse(saved);
          setCustomGatherings(Array.isArray(list) ? list.filter(g => !g.title?.toLowerCase().includes('men on fire') && !g.title?.toLowerCase().includes('women ignited')) : []);
        }
        const delSaved = localStorage.getItem('youngfire_deleted_gathering_ids');
        if (delSaved) {
          setDeletedGatheringIds(JSON.parse(delSaved));
        }
        setMeetingOverrides(getStoredCalendarOverrides());
        setSharedCalendarEvents(getStoredGatheringEvents());
      } catch {}
    };

    const unsubFirestore = subscribeToSanctuaryCalendar(({ overrides }) => {
      setMeetingOverrides({ ...overrides });
      handleGatheringsUpdate();
    });

    window.addEventListener('yf_small_group_location_updated', handleLocUpdate);
    window.addEventListener('youngfire_gatherings_updated', handleGatheringsUpdate);
    window.addEventListener('sanctuary_calendar_events_updated', handleGatheringsUpdate);
    window.addEventListener('yf_meeting_status_updated', handleGatheringsUpdate);
    return () => {
      unsubFirestore();
      window.removeEventListener('yf_small_group_location_updated', handleLocUpdate);
      window.removeEventListener('youngfire_gatherings_updated', handleGatheringsUpdate);
      window.removeEventListener('sanctuary_calendar_events_updated', handleGatheringsUpdate);
      window.removeEventListener('yf_meeting_status_updated', handleGatheringsUpdate);
    };
  }, []);

  // System-wide deleted event IDs (allows administrators to delete any event at any time)
  const [deletedGatheringIds, setDeletedGatheringIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('youngfire_deleted_gathering_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const handleJumpToDefault = () => {
    setCurrentMonthDate(new Date(2026, 9, 1));
    setSelectedDay(null);
  };

  const activeYear = currentMonthDate.getFullYear();
  const activeMonth = currentMonthDate.getMonth();
  const monthName = currentMonthDate.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
  const totalDaysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();
  const startDayOfWeek = new Date(activeYear, activeMonth, 1).getDay(); // 0 = Sun, 1 = Mon ...

  // Generate dynamic gatherings for ANY active month
  const monthGatherings: ScheduleGathering[] = React.useMemo(() => {
    const list: ScheduleGathering[] = [];

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dayDate = new Date(activeYear, activeMonth, day);
      const dayOfWeek = dayDate.getDay(); // 0 = Sun, 1 = Mon, 4 = Thu
      const dateStr = dayDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });

      // 1. Check if Monday for YoungFire Small Groups (Every other Monday)
      if (dayOfWeek === 1) {
        const diffMs = dayDate.getTime() - CANONICAL_REF_MONDAY.getTime();
        const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
        
        if (Math.abs(diffWeeks) % 2 === 0) {
          list.push({
            id: `sg-${activeYear}-${activeMonth}-${day}`,
            year: activeYear,
            month: activeMonth,
            dayNumber: day,
            title: 'YOUNGFIRE SMALL GROUP HUDDLE',
            category: 'small-group',
            badge: 'Small Group',
            dateStr,
            timeStr: '7:00 PM CST',
            locationName: smallGroupLoc,
            address: 'San Antonio, TX (In-Person & Live Zoom)',
            description: `Bi-Weekly Monday YoungFire small group fellowship at ${smallGroupLoc}. Living room huddle, word accountability, and live Zoom broadcast.`,
            hasZoom: true,
            hostLeader: 'Lead Facilitators Trent & Whitney White',
            isAtWhites: smallGroupLoc.toLowerCase().includes('white'),
            isUpcoming: true
          });
        }
      }

      // 2. Check if Thursday for Open Bible Study (Every Thursday)
      if (dayOfWeek === 4) {
        list.push({
          id: `ob-${activeYear}-${activeMonth}-${day}`,
          year: activeYear,
          month: activeMonth,
          dayNumber: day,
          title: 'OPEN BIBLE STUDY',
          category: 'open-bible',
          badge: 'Open Bible',
          dateStr,
          timeStr: '7:00 PM CST',
          locationName: 'YoungFire Sanctuary Digital Watch',
          address: 'San Antonio, TX (Live Zoom Broadcast)',
          description: 'Corporate expository scripture meditation, verse-by-verse chapter tracking, and interactive reflections across the 66-Book Imperial Scripture Atlas.',
          hasZoom: true,
          hostLeader: 'YoungFire Discipleship Ministry',
          isAtWhites: false,
          isUpcoming: true
        });
      }
    }

    // 3. Merge custom gatherings for this month (strictly excluding Men On Fire and Women Ignited)
    const currentUserId = (currentUser as any)?.id || (currentUser as any)?.uid || currentUser?.email || '';
    const matchingCustom = customGatherings.filter((cg) => {
      if (cg.year !== activeYear || cg.month !== activeMonth) return false;
      if (cg.title?.toLowerCase().includes('men on fire') || cg.title?.toLowerCase().includes('women ignited')) return false;
      const isPending = cg.status === 'pending' || cg.approvalStatus === 'pending' || cg.approved === false;
      if (isPending && !isLeader) {
        // Show pending events only to the author who proposed them or to Lead Admins
        const isAuthor = Boolean(
          (currentUserId && cg.createdById && currentUserId === cg.createdById) ||
          (currentUser?.name && cg.createdBy && currentUser.name.trim().toLowerCase() === cg.createdBy.trim().toLowerCase())
        );
        return isAuthor;
      }
      return true;
    });
    list.push(...matchingCustom);

    // 4. Merge shared Sanctuary Calendar Events from FellowshipCalendar / Firestore
    sharedCalendarEvents.forEach((gevt) => {
      if (!gevt.date || !/^\d{4}-\d{2}-\d{2}$/.test(gevt.date)) return;
      if (gevt.title?.toLowerCase().includes('men on fire') || gevt.title?.toLowerCase().includes('women ignited')) return;
      const [gYear, gMonth1, gDay] = gevt.date.split('-').map(Number);
      const gMonth0 = gMonth1 - 1;
      if (gYear !== activeYear || gMonth0 !== activeMonth) return;
      if (list.some((existing) => existing.id === gevt.id)) return;
      const isPending = gevt.status === 'pending' || gevt.approvalStatus === 'pending' || gevt.approved === false;
      if (isPending && !isLeader) {
        const isAuthor = Boolean(
          (currentUserId && gevt.createdById && currentUserId === gevt.createdById) ||
          (currentUser?.name && gevt.createdBy && currentUser.name.trim().toLowerCase() === gevt.createdBy.trim().toLowerCase())
        );
        if (!isAuthor) return;
      }
      const dObj = new Date(gYear, gMonth0, gDay);
      list.push({
        id: gevt.id,
        year: gYear,
        month: gMonth0,
        dayNumber: gDay,
        dateStr: dObj.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        timeStr: gevt.time || '7:00 PM CST',
        title: (gevt.title || 'SANCTUARY GATHERING').toUpperCase(),
        category: 'special',
        badge: gevt.groupTag === '#YoungFire' ? 'Sanctuary Event' : 'Special Gathering',
        locationName: gevt.location || smallGroupLoc,
        address: 'San Antonio, TX (In-Person & Live Zoom)',
        description: gevt.description || gevt.focusTopic || 'Consecrated YoungFire sanctuary gathering.',
        hasZoom: Boolean(gevt.zoomUrl ?? true),
        zoomUrl: gevt.zoomUrl,
        hostLeader: gevt.createdBy || 'Lead Facilitators Trent & Whitney White',
        isAtWhites: Boolean((gevt.location || smallGroupLoc).toLowerCase().includes('white')),
        isUpcoming: true,
        isCustom: true,
        status: (gevt.status as any) || (isPending ? 'pending' : 'approved'),
        approvalStatus: isPending ? 'pending' : 'approved',
        approved: !isPending,
        createdBy: gevt.createdBy,
        createdById: gevt.createdById
      });
    });

    // 5. Apply Meeting Overrides (Rescheduled / Canceled) across all items
    const resolvedList = list.map((item) => {
      const padM = String(item.month + 1).padStart(2, '0');
      const padD = String(item.dayNumber).padStart(2, '0');
      const eqIds = getEquivalentGatheringIds(item.id, `${item.year}-${padM}-${padD}`);
      const matchedOverride = eqIds.map((eid) => meetingOverrides[eid]).find(Boolean);
      if (!matchedOverride) return item;

      let nextYear = item.year;
      let nextMonth = item.month;
      let nextDay = item.dayNumber;
      let nextDateStr = item.dateStr;

      if (
        matchedOverride.status === 'rescheduled' &&
        matchedOverride.rescheduleDate &&
        /^\d{4}-\d{2}-\d{2}$/.test(matchedOverride.rescheduleDate)
      ) {
        const [ry, rm1, rd] = matchedOverride.rescheduleDate.split('-').map(Number);
        const rm0 = rm1 - 1;
        if (ry === activeYear && rm0 === activeMonth) {
          nextYear = ry;
          nextMonth = rm0;
          nextDay = rd;
          nextDateStr = new Date(ry, rm0, rd).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
        }
      }

      return {
        ...item,
        year: nextYear,
        month: nextMonth,
        dayNumber: nextDay,
        dateStr: nextDateStr,
        timeStr:
          matchedOverride.status === 'rescheduled' && matchedOverride.rescheduleTime
            ? matchedOverride.rescheduleTime
            : item.timeStr,
        locationName: matchedOverride.locationName || item.locationName,
        status: matchedOverride.status,
        rescheduleDate: matchedOverride.rescheduleDate,
        rescheduleTime: matchedOverride.rescheduleTime,
        updateNote: matchedOverride.updateNote
      };
    });

    // Filter out any events deleted by administrators
    const activeList = resolvedList.filter((g) => !deletedGatheringIds.includes(g.id));

    // Sort by day number
    return activeList.sort((a, b) => a.dayNumber - b.dayNumber);
  }, [activeYear, activeMonth, totalDaysInMonth, smallGroupLoc, customGatherings, sharedCalendarEvents, meetingOverrides, deletedGatheringIds, currentUser, isLeader]);

  // Filtered Gatherings
  const filteredGatherings = monthGatherings.filter((g) => {
    if (selectedDay !== null && g.dayNumber !== selectedDay) return false;
    if (filterMode === 'whites') return g.isAtWhites;
    if (filterMode === 'upcoming') return g.isUpcoming;
    return true;
  });

  // Export ICS calendar file for active month
  const handleExportICS = () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//YoungFire Ministry//Sanctuary Schedule//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      ...monthGatherings.map((g) => {
        const dayStr = g.dayNumber < 10 ? `0${g.dayNumber}` : `${g.dayNumber}`;
        const monthNum = activeMonth + 1;
        const monthStr = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;
        return [
          'BEGIN:VEVENT',
          `UID:${g.id}@youngfire.jhow.org`,
          `DTSTAMP:${activeYear}${monthStr}${dayStr}T190000Z`,
          `DTSTART:${activeYear}${monthStr}${dayStr}T190000`,
          `DTEND:${activeYear}${monthStr}${dayStr}T210000`,
          `SUMMARY:${g.title} - YoungFire Sanctuary`,
          `DESCRIPTION:${g.description}`,
          `LOCATION:${g.locationName} - ${g.address}`,
          'STATUS:CONFIRMED',
          'END:VEVENT'
        ].join('\r\n');
      }),
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `YoungFire_Sanctuary_Schedule_${monthName}_${activeYear}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIcsDownloaded(true);
    setTimeout(() => setIcsDownloaded(false), 3000);
  };

  // Add custom event handler
  const handleSaveCustomEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle || !newEventDate) return;

    const parts = newEventDate.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const dateObj = new Date(year, month, day);
    const dateStr = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const currentUserId = (currentUser as any)?.id || (currentUser as any)?.uid || currentUser?.email || '';
    const newGathering: ScheduleGathering = {
      id: `custom-${Date.now()}`,
      year,
      month,
      dayNumber: day,
      dateStr,
      timeStr: newEventTime,
      title: newEventTitle.toUpperCase(),
      category: newEventCategory,
      badge: newEventCategory === 'small-group' ? 'Small Group' : newEventCategory === 'open-bible' ? 'Open Bible' : 'Special Gathering',
      locationName: newEventLocation,
      address: newEventLocation.toLowerCase().includes('white') ? 'San Antonio, TX' : 'San Antonio, TX (Live Zoom Broadcast)',
      description: newEventDesc || 'Consecrated YoungFire sanctuary gathering and fellowship.',
      hasZoom: true,
      hostLeader: isLeader ? 'Lead Facilitators Trent & Whitney White' : (currentUser?.name || 'YoungFire Disciple'),
      isAtWhites: newEventLocation.toLowerCase().includes('white'),
      isUpcoming: true,
      isCustom: true,
      status: isLeader ? 'approved' : 'pending',
      approvalStatus: isLeader ? 'approved' : 'pending',
      approved: isLeader,
      createdBy: currentUser?.name || 'Sanctuary Disciple',
      createdById: currentUserId
    };

    const updated = [...customGatherings, newGathering];
    setCustomGatherings(updated);
    try {
      localStorage.setItem('youngfire_sanctuary_custom_gatherings', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('youngfire_gatherings_updated'));
      upsertSanctuaryCalendarEventToFirestore({
        ...newGathering,
        date: newEventDate,
        time: newEventTime
      });
    } catch {}

    setIsAddEventOpen(false);
    setNewEventTitle('');
    setNewEventDesc('');
  };

  // Approve pending custom gathering (Lead Administrators only)
  const handleApproveCustomGathering = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isLeader) return;
    let approvedTarget: ScheduleGathering | null = null;
    const updatedCustom = customGatherings.map((g) => {
      if (g.id === id) {
        approvedTarget = { ...g, status: 'approved' as const, approvalStatus: 'approved' as const, approved: true };
        return approvedTarget;
      }
      return g;
    });
    setCustomGatherings(updatedCustom);
    if (selectedGathering && selectedGathering.id === id) {
      setSelectedGathering({
        ...selectedGathering,
        status: 'approved',
        approvalStatus: 'approved',
        approved: true
      });
    }
    try {
      localStorage.setItem('youngfire_sanctuary_custom_gatherings', JSON.stringify(updatedCustom));
      window.dispatchEvent(new CustomEvent('youngfire_gatherings_updated'));
      if (approvedTarget) {
        upsertSanctuaryCalendarEventToFirestore(approvedTarget);
      }
    } catch {}
  };

  // Delete gathering (Custom or Standard system event for Administrators)
  const handleDeleteGathering = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updatedCustom = customGatherings.filter((g) => g.id !== id);
    setCustomGatherings(updatedCustom);

    const updatedDeleted = Array.from(new Set([...deletedGatheringIds, id]));
    setDeletedGatheringIds(updatedDeleted);

    try {
      localStorage.setItem('youngfire_sanctuary_custom_gatherings', JSON.stringify(updatedCustom));
      localStorage.setItem('youngfire_deleted_gathering_ids', JSON.stringify(updatedDeleted));
      window.dispatchEvent(new CustomEvent('youngfire_gatherings_updated'));
      deleteSanctuaryCalendarEventFromFirestore(id);
    } catch {}
  };

  // Save Facilitator Reschedule / Status Update for selectedGathering
  const handleSaveModalScheduleOverride = async () => {
    if (!selectedGathering || !isLeader) return;
    const padM = String(selectedGathering.month + 1).padStart(2, '0');
    const padD = String(selectedGathering.dayNumber).padStart(2, '0');
    const baseDateYmd = `${selectedGathering.year}-${padM}-${padD}`;

    const nextOverrides = await saveCalendarMeetingOverride(
      selectedGathering.id,
      {
        status: editModalStatus,
        rescheduleDate: editModalStatus === 'rescheduled' ? editModalRescheduleDate : undefined,
        rescheduleTime: editModalStatus === 'rescheduled' ? editModalRescheduleTime : undefined,
        locationName: editModalLocation.trim() || selectedGathering.locationName,
        updateNote: editModalNote.trim(),
        updatedBy: currentUser?.name || 'Lead Facilitator'
      },
      {
        title: selectedGathering.title,
        date: baseDateYmd,
        time: selectedGathering.timeStr,
        category: selectedGathering.category,
        locationName: editModalLocation.trim() || selectedGathering.locationName,
        description: selectedGathering.description
      }
    );

    setMeetingOverrides({ ...nextOverrides });
    setIsAdminEditingModal(false);
    setSelectedGathering({
      ...selectedGathering,
      status: editModalStatus,
      rescheduleDate: editModalStatus === 'rescheduled' ? editModalRescheduleDate : undefined,
      rescheduleTime: editModalStatus === 'rescheduled' ? editModalRescheduleTime : undefined,
      timeStr:
        editModalStatus === 'rescheduled' && editModalRescheduleTime
          ? editModalRescheduleTime
          : selectedGathering.timeStr,
      locationName: editModalLocation.trim() || selectedGathering.locationName,
      updateNote: editModalNote.trim()
    });
  };

  // Restore deleted system events (for Administrators)
  const handleRestoreDeletedGatherings = () => {
    setDeletedGatheringIds([]);
    try {
      localStorage.removeItem('youngfire_deleted_gathering_ids');
      window.dispatchEvent(new CustomEvent('youngfire_gatherings_updated'));
    } catch {}
  };

  const handleProposeGathering = () => {
    const subject = encodeURIComponent("Sanctuary Gathering Proposal");
    const body = encodeURIComponent(
      `Dear Admin Team,\n\nI am proposing we gather on [Date & Time] at [Location].\n\nPurpose / Reason: [Explain here]\n\nCoordinator: [Name]\nContact Information: [Phone / Email]\n\nVery respectfully,\n${currentUser?.name || 'Sanctuary Disciple'}`
    );
    window.location.href = `mailto:JHOWYoungFire@gmail.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="relative min-h-screen text-slate-100 pb-28 font-['Outfit'] select-none">
      
      {/* 1. Dynamic Multi-Scale Dense Masonry Mosaic Grid */}
      <div className="relative w-full h-[210px] sm:h-[270px] overflow-hidden bg-black select-none border-none z-10">
        
        {/* Dense, Edge-to-Edge Authentic Fellowship Photo Mosaic in Rich Vibrant Color with Solid Black Borders */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 auto-rows-[70px] sm:auto-rows-[90px] gap-0 w-full overflow-hidden bg-black">
          {FULL_SCHEDULE_MOSAIC.map((photoUrl, idx) => (
            <div 
              key={idx} 
              className="relative overflow-hidden w-full h-[70px] sm:h-[90px] bg-black border-2 border-black rounded-none"
            >
              <img 
                src={photoUrl} 
                alt="" 
                className="w-full h-full object-cover object-center rounded-none filter brightness-105 contrast-110 saturate-110 transition-transform duration-500 hover:scale-105"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/IMG_3519.jpg';
                }}
              />
            </div>
          ))}
        </div>

        {/* Ambient Obsidian Radial Shadow Behind Insignia: Softened for bright mosaic visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/35 pointer-events-none" />

        {/* Centered Stylized YoungFire Holy Flame and JHOW Insignia Centerpiece */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 z-20 space-y-2 pointer-events-none">
          
          {/* Flame Center Emblem with Heavy Drop Shadows */}
          <div 
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center border-2 border-amber-400 bg-black/85 backdrop-blur-md transition-transform"
            style={{
              filter: 'drop-shadow(0 0 16px rgba(0,0,0,0.9)) drop-shadow(0 0 8px rgba(245,158,11,0.4))'
            }}
          >
            <Flame className="w-8 h-8 text-amber-400 fill-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.9)] animate-pulse" />
          </div>

          {/* Brand Proclamation */}
          <div style={{ filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.95))' }}>
            <span className="text-[10px] font-mono tracking-[0.25em] text-amber-300 font-bold uppercase block">
              SANCTUARY GATHERINGS &bull; EST. 2015
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-['Barlow_Condensed'] font-black tracking-wider uppercase text-white drop-shadow-lg">
              SANCTUARY SCHEDULE
            </h1>
            <p className="text-xs font-mono text-slate-300 tracking-wider uppercase">
              JOSHUA HOUSE OF WORSHIP &bull; SAN ANTONIO, TX
            </p>
          </div>
        </div>

      </div>

      {/* Main Container */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-4 space-y-5">

        {/* 2. Schedule Action Bar & Controls Alignment */}
        <div className="space-y-3">
          
          {/* 3-Pill Filter Bar: [ All Gatherings ] | [ At The White's ] | [ Up Next ] */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
            <button
              onClick={() => { setFilterMode('all'); setSelectedDay(null); }}
              className={`py-2 px-5 rounded-full font-['Barlow_Condensed'] font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm ${
                filterMode === 'all' && selectedDay === null
                  ? 'bg-slate-200 text-slate-950 font-black'
                  : 'bg-white/5 text-slate-300 hover:text-white font-bold border border-white/10'
              }`}
            >
              All Gatherings
            </button>
            <button
              onClick={() => { setFilterMode('whites'); setSelectedDay(null); }}
              className={`py-2 px-5 rounded-full font-['Barlow_Condensed'] font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm ${
                filterMode === 'whites'
                  ? 'bg-slate-200 text-slate-950 font-black'
                  : 'bg-white/5 text-slate-300 hover:text-white font-bold border border-white/10'
              }`}
            >
              At The White&apos;s
            </button>
            <button
              onClick={() => { setFilterMode('upcoming'); setSelectedDay(null); }}
              className={`py-2 px-5 rounded-full font-['Barlow_Condensed'] font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm ${
                filterMode === 'upcoming'
                  ? 'bg-slate-200 text-slate-950 font-black'
                  : 'bg-white/5 text-slate-300 hover:text-white font-bold border border-white/10'
              }`}
            >
              Up Next
            </button>

            {selectedDay !== null && (
              <button
                onClick={() => setSelectedDay(null)}
                className="py-1.5 px-3 rounded-full bg-amber-400/20 text-amber-300 font-mono text-xs flex items-center gap-1 cursor-pointer border border-amber-400/40"
              >
                <span>Day {selectedDay}</span>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Action Banner: [ + ] ADD TO CALENDAR (Rectangular stadium bar in high-contrast black & white with thin silver border) */}
          <button
            onClick={handleExportICS}
            className="w-full py-3.5 px-6 rounded-none bg-black text-white border border-white/30 hover:border-white hover:bg-zinc-950 font-['Barlow_Condensed'] font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer shadow-md active:scale-[0.99]"
          >
            {icsDownloaded ? (
              <>
                <Check className="w-5 h-5 text-amber-400 stroke-[3]" />
                <span>CALENDAR SYNCED &amp; DOWNLOADED (.ICS)</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 text-white stroke-[3]" />
                <span>[ + ] ADD TO CALENDAR (SYNC ALL {monthName} GATHERINGS)</span>
                <Download className="w-4 h-4 ml-1 text-slate-400" />
              </>
            )}
          </button>

          {/* Infinite Month Switcher Header & List/Calendar Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/85 border border-white/15 backdrop-blur-xl shadow-xl">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-mono font-bold"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">PREV</span>
            </button>

            <div className="text-center space-y-0.5">
              <div className="flex items-center justify-center gap-2">
                <CalendarIcon className="w-4 h-4 text-amber-400" />
                <h2 className="font-['Barlow_Condensed'] font-black text-2xl sm:text-3xl tracking-wider uppercase text-white">
                  {monthName} {activeYear}
                </h2>
              </div>
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                12-MONTH INFINITE SANCTUARY CALENDAR
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle: [ Grid ] | [ List ] */}
              <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'grid' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                  title="7-Column Calendar Grid"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'list' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Gatherings List"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleJumpToDefault}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-amber-400 text-[10px] font-mono uppercase font-bold transition-colors hidden md:block"
                title="Return to October 2026"
              >
                Oct 2026
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-mono font-bold"
                title="Next Month"
              >
                <span className="hidden sm:inline">NEXT</span>
                <ChevronRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>

          {/* Event Proposal & Admin CMS Direct Control Bar */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider">
                {isLeader ? 'Admin CMS • Facilitator Controls' : 'Sanctuary Event Proposals'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isLeader && deletedGatheringIds.length > 0 && (
                <button
                  onClick={handleRestoreDeletedGatherings}
                  className="py-1 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 font-mono text-xs cursor-pointer transition-colors"
                  title="Restore deleted system events"
                >
                  Restore ({deletedGatheringIds.length})
                </button>
              )}
              <button
                onClick={handleProposeGathering}
                className="py-1 px-3 rounded-lg bg-amber-500 text-slate-950 font-['Barlow_Condensed'] font-black text-xs uppercase tracking-wider cursor-pointer hover:bg-amber-400 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>+ Propose Gathering</span>
              </button>
              {isLeader && (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('yf_open_admin_cms'))}
                  className="py-1 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs cursor-pointer transition-colors"
                  title="Open Full Admin Console"
                >
                  Console &rarr;
                </button>
              )}
            </div>
          </div>

        </div>

        {/* 4. Calendar Grid View: Exact 7-Column Days */}
        {viewMode === 'grid' && (
          <div className="rounded-3xl bg-[#000000]/90 border border-white/10 p-4 sm:p-5 shadow-2xl backdrop-blur-xl space-y-3">
            
            {/* Weekday Names Header */}
            <div className="grid grid-cols-7 gap-1 text-center font-['Barlow_Condensed'] font-black text-xs sm:text-sm tracking-wider text-slate-400 uppercase py-1 border-b border-white/10">
              <span className="text-red-400">SUN</span>
              <span>MON</span>
              <span>TUE</span>
              <span>WED</span>
              <span className="text-amber-400">THU</span>
              <span>FRI</span>
              <span>SAT</span>
            </div>

            {/* 7-Column Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {/* Blank Offset Cells for Days Before 1st of Month */}
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`blank-${i}`} className="min-h-16 sm:min-h-20 rounded-xl bg-white/[0.02] border border-transparent opacity-30 pointer-events-none" />
              ))}

              {/* Day Cells (1 to totalDaysInMonth) */}
              {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
                const day = idx + 1;
                const gatheringsOnDay = monthGatherings.filter((g) => g.dayNumber === day);
                const isSelected = selectedDay === day;

                return (
                  <div
                    key={`day-${day}`}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`min-h-16 sm:min-h-20 rounded-xl p-1.5 flex flex-col justify-between transition-all duration-200 cursor-pointer relative group ${
                      isSelected
                        ? 'bg-amber-500/20 border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                        : gatheringsOnDay.length > 0
                        ? 'bg-[#0a0a0a] border border-white/15 hover:border-amber-400/50 hover:bg-[#111111]'
                        : 'bg-black/40 border border-white/5 hover:border-white/20'
                    }`}
                  >
                    {/* Day Number */}
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-mono font-bold ${
                        gatheringsOnDay.length > 0 ? 'text-white' : 'text-slate-500'
                      }`}>
                        {day}
                      </span>

                      {gatheringsOnDay.length > 0 && (
                        <Flame className="w-3 h-3 text-amber-400 fill-amber-400 animate-pulse" />
                      )}
                    </div>

                    {/* Event Badges inside Cell */}
                    <div className="space-y-1 mt-1">
                      {gatheringsOnDay.map((g) => (
                        <div
                          key={g.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedGathering(g);
                          }}
                          className={`text-[8px] sm:text-[9px] font-mono px-1 py-0.5 rounded truncate font-bold uppercase transition-transform group-hover:scale-102 ${
                            g.category === 'small-group'
                              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                              : g.category === 'open-bible'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}
                          title={`${g.title} (${g.timeStr})`}
                        >
                          {g.badge}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend Footer */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-white/10 text-[10px] font-mono text-slate-400">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <span>Small Groups (Bi-Weekly Mondays)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span>Open Bible Study (Thursdays)</span>
                </div>
              </div>

              <span>Tap any day to focus gatherings</span>
            </div>

          </div>
        )}

        {/* 5. Gatherings List: Comprehensive Event Cards */}
        <div className="space-y-4">
          
          <div className="flex items-center justify-between">
            <h3 className="font-['Barlow_Condensed'] font-black text-xl uppercase tracking-wider text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-400" />
              <span>
                {selectedDay !== null 
                  ? `Gatherings For ${monthName} ${selectedDay}, ${activeYear}` 
                  : `${monthName} ${activeYear} Consecrated Assemblies`}
              </span>
            </h3>

            <span className="text-xs font-mono text-slate-400">
              {filteredGatherings.length} {filteredGatherings.length === 1 ? 'Gathering' : 'Gatherings'}
            </span>
          </div>

          {filteredGatherings.length === 0 ? (
            <div className="p-8 rounded-3xl bg-black/60 border border-white/10 text-center space-y-2">
              <CalendarIcon className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-bold text-slate-300 font-['Outfit']">No gatherings scheduled on this date.</p>
              <p className="text-xs font-mono text-slate-500">Tap &quot;All Gatherings&quot; to view corporate assembly schedule for {monthName}.</p>
            </div>
          ) : (
            filteredGatherings.map((gathering) => (
              <div
                key={gathering.id}
                onClick={() => setSelectedGathering(gathering)}
                className="group relative rounded-3xl bg-[#000000]/90 border border-white/10 hover:border-amber-400/40 transition-all duration-200 p-5 sm:p-6 shadow-xl backdrop-blur-md cursor-pointer overflow-hidden"
              >
                {/* Accent Side Stripe */}
                <div 
                  className="absolute left-0 inset-y-0 w-1.5"
                  style={{
                    backgroundColor: gathering.category === 'small-group' ? '#EA580C' : '#F59E0B'
                  }}
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  {/* Left: Date Monogram & Title */}
                  <div className="flex items-start gap-4">
                    
                    {/* Date Block */}
                    <div className="w-14 h-14 rounded-2xl bg-black/80 border border-white/15 flex flex-col items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                      <span className="font-['Barlow_Condensed'] font-black text-2xl text-white leading-none">
                        {gathering.dayNumber}
                      </span>
                      <span className="text-[9px] font-mono text-amber-400 uppercase tracking-wider font-bold">
                        {monthName.slice(0, 3)}
                      </span>
                    </div>

                    {/* Information */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                          gathering.category === 'small-group'
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {gathering.badge}
                        </span>

                        <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{gathering.timeStr}</span>
                        </span>

                        {gathering.isCustom && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                            Custom Event
                          </span>
                        )}

                        {(gathering.status === 'pending' || gathering.approvalStatus === 'pending' || gathering.approved === false) && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/40 font-bold uppercase">
                            Pending Approval
                          </span>
                        )}

                        {gathering.status === 'rescheduled' && (
                          <span className="text-[9px] font-mono px-2 py-0.5 bg-amber-500/25 text-amber-300 rounded border border-amber-400/60 font-bold uppercase">
                            ⚠️ Rescheduled {gathering.rescheduleDate ? `to ${gathering.rescheduleDate}` : ''}
                          </span>
                        )}

                        {gathering.status === 'canceled' && (
                          <span className="text-[9px] font-mono px-2 py-0.5 bg-rose-500/25 text-rose-300 rounded border border-rose-500/60 font-bold uppercase">
                            ⚠️ Canceled
                          </span>
                        )}
                      </div>

                      <h4 className={`font-['Barlow_Condensed'] font-black text-xl sm:text-2xl tracking-wide uppercase transition-colors ${
                        gathering.status === 'canceled'
                          ? 'line-through text-slate-500'
                          : 'text-white group-hover:text-amber-300'
                      }`}>
                        {gathering.title}
                      </h4>

                      <p className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-bold">{gathering.locationName}</span>
                        <span className="text-slate-500 hidden sm:inline">&bull;</span>
                        <span className="text-slate-400 hidden sm:inline">{gathering.address}</span>
                      </p>
                    </div>

                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {(gathering.status === 'pending' || gathering.approvalStatus === 'pending' || gathering.approved === false) && isLeader && (
                      <button
                        onClick={(e) => handleApproveCustomGathering(gathering.id, e)}
                        className="py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Approve Event (Administrator)"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>APPROVE</span>
                      </button>
                    )}

                    {isLeader && (
                      <button
                        onClick={(e) => handleDeleteGathering(gathering.id, e)}
                        className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-white transition-colors cursor-pointer border border-red-500/40 shadow-sm"
                        title="Delete Event (Administrator)"
                        aria-label="Delete Event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {gathering.hasZoom && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenZoom) onOpenZoom();
                        }}
                        className="py-2 px-3.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Open Sanctuary Zoom Meeting"
                      >
                        <Video className="w-3.5 h-3.5 text-cyan-400" />
                        <span>ZOOM</span>
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedGathering(gathering)}
                      className="py-2 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-['Barlow_Condensed'] font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Details &rarr;
                    </button>
                  </div>

                </div>

                <p className="text-xs font-mono text-slate-400 line-clamp-2 mt-3 pt-3 border-t border-white/5">
                  {gathering.description}
                </p>
              </div>
            ))
          )}

        </div>

      </div>

      {/* 6. Gathering Details Modal */}
      {selectedGathering && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#000000] border border-amber-500/30 p-6 space-y-5 shadow-2xl overflow-hidden">
            
            {/* Top Accent Stripe */}
            <div 
              className="absolute top-0 inset-x-0 h-1.5"
              style={{
                backgroundColor: selectedGathering.category === 'small-group' ? '#EA580C' : '#F59E0B'
              }}
            />

            {/* Close Button */}
            <button
              onClick={() => setSelectedGathering(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Badge */}
            <div className="space-y-1.5 pt-2">
              <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full inline-block ${
                selectedGathering.category === 'small-group'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {selectedGathering.badge}
              </span>

              <h3 className="font-['Barlow_Condensed'] font-black text-2xl sm:text-3xl uppercase tracking-wider text-white">
                {selectedGathering.title}
              </h3>
            </div>

            {/* Info Grid */}
            <div className="space-y-2.5 p-4 rounded-2xl bg-black/60 border border-white/10 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 uppercase">Date:</span>
                <span className="text-white font-bold">{selectedGathering.dateStr}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 uppercase">Time:</span>
                <span className="text-amber-400 font-bold">{selectedGathering.timeStr}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 uppercase">Host:</span>
                <span className="text-slate-300 font-medium">{selectedGathering.hostLeader}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 uppercase">Location:</span>
                <span className="text-white font-bold">{selectedGathering.locationName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 uppercase">Address:</span>
                <span className="text-slate-300 text-right">{selectedGathering.address}</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs font-mono text-slate-300 leading-relaxed">
              {selectedGathering.description}
            </p>

            {selectedGathering.status === 'rescheduled' && (
              <div className="p-3.5 rounded-2xl bg-amber-950/70 border border-amber-500/60 text-amber-200 text-xs font-mono">
                <strong className="block text-amber-300 font-bold mb-0.5">⚠️ NOTICE: GATHERING RESCHEDULED</strong>
                Rescheduled to: <span className="text-white font-bold">{selectedGathering.rescheduleDate || selectedGathering.dateStr}</span> at <span className="text-white font-bold">{selectedGathering.rescheduleTime || selectedGathering.timeStr}</span>
                {selectedGathering.updateNote && <p className="mt-1 text-[11px] text-slate-300 italic">{selectedGathering.updateNote}</p>}
              </div>
            )}

            {selectedGathering.status === 'canceled' && (
              <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/60 text-rose-200 text-xs font-mono">
                <strong className="block text-rose-300 font-bold mb-0.5">⚠️ NOTICE: GATHERING CANCELED</strong>
                {selectedGathering.updateNote || 'Facilitators have canceled this gathering.'}
              </div>
            )}

            {/* Facilitator Reschedule / Status Controls */}
            {isLeader && (
              <div className="p-4 rounded-2xl bg-black/80 border border-amber-500/40 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-mono font-bold uppercase text-amber-300 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Facilitator Reschedule &amp; Status Controls</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextOpen = !isAdminEditingModal;
                      setIsAdminEditingModal(nextOpen);
                      if (nextOpen && selectedGathering) {
                        const padM = String(selectedGathering.month + 1).padStart(2, '0');
                        const padD = String(selectedGathering.dayNumber).padStart(2, '0');
                        setEditModalStatus(
                          selectedGathering.status === 'canceled' || selectedGathering.status === 'rescheduled'
                            ? selectedGathering.status
                            : 'rescheduled'
                        );
                        setEditModalRescheduleDate(
                          selectedGathering.rescheduleDate || `${selectedGathering.year}-${padM}-${padD}`
                        );
                        setEditModalRescheduleTime(
                          selectedGathering.rescheduleTime || selectedGathering.timeStr || '7:00 PM CST'
                        );
                        setEditModalLocation(selectedGathering.locationName || smallGroupLoc);
                        setEditModalNote(selectedGathering.updateNote || '');
                      }
                    }}
                    className="text-xs font-mono text-amber-400 hover:underline cursor-pointer"
                  >
                    {isAdminEditingModal ? 'Close' : 'Reschedule / Edit'}
                  </button>
                </div>

                {isAdminEditingModal && (
                  <div className="space-y-3 text-xs font-mono">
                    <div className="flex gap-2 flex-wrap">
                      {(['active', 'rescheduled', 'canceled'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setEditModalStatus(st)}
                          className={`px-3 py-1.5 rounded-xl font-bold uppercase cursor-pointer ${
                            editModalStatus === st
                              ? st === 'canceled'
                                ? 'bg-rose-500 text-slate-950'
                                : st === 'rescheduled'
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-emerald-500 text-slate-950'
                              : 'bg-white/5 text-slate-300 border border-white/10'
                          }`}
                        >
                          {st === 'active' ? 'Active' : st === 'rescheduled' ? 'Reschedule' : 'Cancel'}
                        </button>
                      ))}
                    </div>

                    {editModalStatus === 'rescheduled' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] uppercase text-slate-400 mb-1">New Date</label>
                          <input
                            type="date"
                            value={editModalRescheduleDate}
                            onChange={(e) => setEditModalRescheduleDate(e.target.value)}
                            className="w-full p-2 rounded-xl bg-black border border-white/20 text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-slate-400 mb-1">New Time</label>
                          <input
                            type="text"
                            value={editModalRescheduleTime}
                            onChange={(e) => setEditModalRescheduleTime(e.target.value)}
                            placeholder="7:30 PM CST"
                            className="w-full p-2 rounded-xl bg-black border border-white/20 text-white text-xs"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Location</label>
                      <input
                        type="text"
                        value={editModalLocation}
                        onChange={(e) => setEditModalLocation(e.target.value)}
                        className="w-full p-2 rounded-xl bg-black border border-white/20 text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Facilitator Update Note</label>
                      <input
                        type="text"
                        value={editModalNote}
                        onChange={(e) => setEditModalNote(e.target.value)}
                        placeholder="e.g. Rescheduled to Tuesday @ 7:30 PM CST"
                        className="w-full p-2 rounded-xl bg-black border border-white/20 text-white text-xs"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveModalScheduleOverride}
                      className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-wider cursor-pointer"
                    >
                      Save &amp; Sync Schedule Update
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              {selectedGathering.hasZoom && (
                <button
                  onClick={() => {
                    setSelectedGathering(null);
                    if (onOpenZoom) onOpenZoom();
                  }}
                  className="py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-['Barlow_Condensed'] font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-600/30"
                >
                  <Video className="w-4 h-4" />
                  <span>JOIN ZOOM MEETING</span>
                </button>
              )}

              <button
                onClick={() => setSelectedGathering(null)}
                className={`py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-['Barlow_Condensed'] font-black text-sm tracking-wider uppercase cursor-pointer ${
                  !selectedGathering.hasZoom && !isLeader ? 'col-span-2' : ''
                }`}
              >
                CLOSE
              </button>

              {isLeader && (
                <button
                  onClick={() => {
                    handleDeleteGathering(selectedGathering.id);
                    setSelectedGathering(null);
                  }}
                  className="col-span-2 py-2.5 px-4 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 hover:text-white border border-red-500/40 font-['Barlow_Condensed'] font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm mt-1"
                  title="Permanently Delete Event (Administrator)"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span>DELETE EVENT (ADMINISTRATOR)</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 7. Quick In-Schedule Add Event Modal (For Facilitators) */}
      {isAddEventOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <form 
            onSubmit={handleSaveCustomEvent}
            className="relative w-full max-w-md rounded-3xl bg-[#000000] border border-amber-500/50 p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-['Barlow_Condensed'] font-black text-xl text-white uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                <span>Schedule New Gathering</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setIsAddEventOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Gathering Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. YoungFire Small Group or Open Bible Study"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/15 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Time</label>
                  <input
                    type="text"
                    required
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Category</label>
                <select
                  value={newEventCategory}
                  onChange={(e) => setNewEventCategory(e.target.value as any)}
                  className="w-full bg-[#0a0a0a] border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="small-group">YoungFire Small Groups (Mondays)</option>
                  <option value="open-bible">Open Bible Study (Thursdays)</option>
                  <option value="special">Special Sanctuary Gathering</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Location</label>
                <input
                  type="text"
                  required
                  value={newEventLocation}
                  onChange={(e) => setNewEventLocation(e.target.value)}
                  placeholder="The White's Residence"
                  className="w-full bg-[#0a0a0a] border border-white/15 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Description / Focus</label>
                <textarea
                  rows={2}
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  placeholder="Gathering theme, scripture reading, or prayer points..."
                  className="w-full bg-[#0a0a0a] border border-white/15 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddEventOpen(false)}
                className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black font-['Barlow_Condensed'] text-sm tracking-wider uppercase shadow-lg shadow-amber-500/25"
              >
                Save Gathering
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export const SanctuaryCalendarHub = SanctuaryScheduleView;
export default SanctuaryScheduleView;
