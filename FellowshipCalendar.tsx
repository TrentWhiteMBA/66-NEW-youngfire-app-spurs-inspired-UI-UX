import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  BookOpen, Flame, Sparkles, Clock, Users, ArrowRight,
  CheckCircle2, Plus, Info, Video, ExternalLink, Cake,
  AlertTriangle, X, Edit3, RotateCcw, Shield, Check, Heart, Trash2
} from 'lucide-react';
import { DiscipleshipLesson } from '../data/lessonsData';
import { CurrentUser } from './SettingsHUDModal';
import { getStoredGatheringEvents, GatheringEvent, deleteGatheringEvent, saveGatheringEvent, approveGatheringEvent } from '../data/gatheringEventsData';
import {
  getEquivalentGatheringIds,
  getStoredCalendarOverrides,
  saveCalendarMeetingOverride,
  subscribeToSanctuaryCalendar
} from '../services/calendarService';
import confetti from 'canvas-confetti';

export interface CalendarEventItem {
  id: string;
  title: string;
  type: 'small_group' | 'lesson' | 'fellowship_idea' | 'ad_hoc_men' | 'ad_hoc_women' | 'special';
  time?: string;
  date: string; // YYYY-MM-DD
  lessonIndex?: number;
  lessonId?: string;
  lesson?: DiscipleshipLesson;
  description?: string;
  scriptureTopic?: string;
  isZoom?: boolean;
  zoomUrl?: string;
  groupTag?: '#MenOnFire' | '#WomenIgnited' | '#YoungFire';
  status?: 'active' | 'approved' | 'pending' | 'canceled' | 'rescheduled';
  approvalStatus?: 'pending' | 'approved';
  approved?: boolean;
  createdBy?: string;
  createdById?: string;
  rescheduleDate?: string;
  rescheduleTime?: string;
  updateNote?: string;
}

export interface MemberBirthday {
  name: string;
  birthday: string; // MM-DD
  role?: string;
  avatar?: string;
}

export interface FellowshipCalendarProps {
  lessons: DiscipleshipLesson[];
  ideas?: Array<{
    id: string;
    title: string;
    description: string;
    votes: number;
    scheduledDate?: string;
    scheduledStatus?: boolean;
  }>;
  onSelectLesson: (lessonIndex: number) => void;
  currentUser?: CurrentUser | null;
  onNavigateToScripture?: (bookId: string, chapter: number) => void;
}

// Real registered roster member birthdays only (No mock birthdays)
const DEFAULT_ROSTER_BIRTHDAYS: MemberBirthday[] = [];

// Check if a given date is "every other Monday" anchored on Oct 5, 2026 (matching SanctuaryScheduleView)
function isEveryOtherMonday(date: Date): { isMonday: boolean; cycleIndex: number } {
  if (date.getDay() !== 1) return { isMonday: false, cycleIndex: 0 }; // Must be Monday
  // Anchor Monday: Oct 5, 2026 (Month is 0-indexed: 9 is October)
  const anchor = new Date(2026, 9, 5);
  const diffTime = date.getTime() - anchor.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.round(diffDays / 7);
  const isEveryOther = Math.abs(diffWeeks) % 2 === 0;
  // Compute zero-based cycle index starting from anchor
  const cycleIndex = Math.floor(diffWeeks / 2);
  return { isMonday: isEveryOther, cycleIndex };
}

// Pad helper
function pad(num: number): string {
  return String(num).padStart(2, '0');
}

export const FellowshipCalendar: React.FC<FellowshipCalendarProps> = ({
  lessons,
  ideas = [],
  onSelectLesson,
  currentUser = null,
  onNavigateToScripture
}) => {
  // Calendar month state: defaults to Sanctuary Schedule Month (October 2026)
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(9); // 9 = October (0-indexed)
  const [selectedDateStr, setSelectedDateStr] = useState<string>('2026-10-05');

  // Zoom Bridge Modal State
  const [activeModalEvent, setActiveModalEvent] = useState<CalendarEventItem | null>(null);

  // Birthday Celebration Modal / Toast
  const [birthdayAlert, setBirthdayAlert] = useState<string | null>(null);

  // Admin Meeting Overrides (canceled / rescheduled) stored in localStorage
  const [meetingOverrides, setMeetingOverrides] = useState<Record<string, {
    status: 'active' | 'canceled' | 'rescheduled';
    rescheduleDate?: string;
    rescheduleTime?: string;
    updateNote?: string;
    updatedBy?: string;
    updatedAt?: string;
  }>>(() => {
    try {
      const saved = localStorage.getItem('youngfire_calendar_overrides');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [smallGroupLocation, setSmallGroupLocation] = useState<string>(() => {
    return localStorage.getItem('youngfire_small_group_location') || "The White's Residence";
  });

  useEffect(() => {
    const handleLocUpdate = (e: any) => {
      if (e.detail?.location) {
        setSmallGroupLocation(e.detail.location);
      } else {
        setSmallGroupLocation(localStorage.getItem('youngfire_small_group_location') || "The White's Residence");
      }
    };
    window.addEventListener('yf_small_group_location_updated', handleLocUpdate);
    return () => window.removeEventListener('yf_small_group_location_updated', handleLocUpdate);
  }, []);

  // Admin edit form inside modal
  const [isAdminEditing, setIsAdminEditing] = useState(false);
  const [editStatus, setEditStatus] = useState<'active' | 'canceled' | 'rescheduled'>('active');
  const [editRescheduleDate, setEditRescheduleDate] = useState('');
  const [editRescheduleTime, setEditRescheduleTime] = useState('7:00 PM CST');
  const [editUpdateNote, setEditUpdateNote] = useState('');

  // Sister Hub & Shared Gathering Events (from sanctuary_calendar_events)
  const [gatheringEvents, setGatheringEvents] = useState<GatheringEvent[]>(() => getStoredGatheringEvents());

  // Sanctuary Schedule Custom Gatherings (Shared with SanctuaryScheduleView & Admin CMS)
  const [customGatherings, setCustomGatherings] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('youngfire_sanctuary_custom_gatherings');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleEventsUpdated = (e: Event) => {
      const customEv = e as CustomEvent<{ events: GatheringEvent[]; overrides?: any }>;
      if (customEv.detail?.events) {
        setGatheringEvents(customEv.detail.events);
      } else {
        setGatheringEvents(getStoredGatheringEvents());
      }
      setMeetingOverrides(getStoredCalendarOverrides() as any);
    };
    const handleCustomGatheringsUpdate = () => {
      try {
        const saved = localStorage.getItem('youngfire_sanctuary_custom_gatherings');
        if (saved) setCustomGatherings(JSON.parse(saved));
        setMeetingOverrides(getStoredCalendarOverrides() as any);
      } catch {}
    };

    const unsubFirestore = subscribeToSanctuaryCalendar(({ overrides }) => {
      setMeetingOverrides({ ...overrides } as any);
      setGatheringEvents(getStoredGatheringEvents());
      handleCustomGatheringsUpdate();
    });

    window.addEventListener('sanctuary_calendar_events_updated', handleEventsUpdated);
    window.addEventListener('youngfire_gatherings_updated', handleCustomGatheringsUpdate);
    window.addEventListener('yf_meeting_status_updated', handleCustomGatheringsUpdate);
    return () => {
      unsubFirestore();
      window.removeEventListener('sanctuary_calendar_events_updated', handleEventsUpdated);
      window.removeEventListener('youngfire_gatherings_updated', handleCustomGatheringsUpdate);
      window.removeEventListener('yf_meeting_status_updated', handleCustomGatheringsUpdate);
    };
  }, []);

  // Check if current user is an authorized Lead Facilitator / Administrator
  const isAdmin = useMemo(() => {
    if (localStorage.getItem('youngfire_admin_override') === 'true') return true;
    if (!currentUser) return false;
    const emailLower = (currentUser.email || '').toLowerCase().trim();
    return (
      currentUser.isAdmin === true ||
      currentUser.accountType === 'administrator' ||
      currentUser.role === 'Administrator' ||
      currentUser.role === 'Lead Facilitator' ||
      currentUser.role === 'Overseer' ||
      ['trentwhite0308@gmail.com', 'trentwhitemba@yahoo.com', 'white.whitney91@gmail.com', 'luislopez567@hotmail.com'].includes(emailLower)
    );
  }, [currentUser]);

  // Propose / Schedule New Event Modal State
  const [isProposeEventOpen, setIsProposeEventOpen] = useState(false);
  const [newEvtTitle, setNewEvtTitle] = useState('');
  const [newEvtScripture, setNewEvtScripture] = useState('Ephesians 4:16');
  const [newEvtFocus, setNewEvtFocus] = useState('');
  const [newEvtDate, setNewEvtDate] = useState(selectedDateStr);
  const [newEvtTime, setNewEvtTime] = useState('7:00 PM CST');
  const [newEvtGroupTag, setNewEvtGroupTag] = useState<'#YoungFire' | '#MenOnFire' | '#WomenIgnited'>('#YoungFire');

  const handleCreateCalendarEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvtTitle.trim() || !newEvtDate) return;
    const currentUserId = (currentUser as any)?.id || (currentUser as any)?.uid || currentUser?.email || '';
    const newEvt: GatheringEvent = {
      id: `yf_evt_${Date.now()}`,
      title: newEvtTitle.trim(),
      scriptureRef: newEvtScripture.trim() || 'Ephesians 4:16',
      focusTopic: newEvtFocus.trim() || 'Sanctuary Fellowship & Discipleship',
      dateTime: `${newEvtDate}T19:00`,
      date: newEvtDate,
      time: newEvtTime.trim() || '7:00 PM CST',
      zoomUrl: 'https://us05web.zoom.us/j/8785161298?pwd=e0zBTD2QHIHfx0AzjzXG7EHQno9Oig.1&omn=85728476365',
      zoomMeetingId: '878 516 1298',
      zoomPasscode: 'FIRE2026',
      groupTag: newEvtGroupTag,
      targetAudience: newEvtGroupTag === '#MenOnFire' ? 'men' : newEvtGroupTag === '#WomenIgnited' ? 'women' : 'all',
      createdBy: currentUser?.name || 'Sanctuary Disciple',
      createdById: currentUserId,
      createdRole: currentUser?.role || 'YoungFire Member',
      location: 'Virtual Sanctuary Zoom Bridge & Living Room',
      description: `${newEvtFocus.trim() || 'Sanctuary Fellowship'} (Scripture: ${newEvtScripture.trim() || 'Ephesians 4:16'}).`,
      status: isAdmin ? 'active' : 'pending',
      approvalStatus: isAdmin ? 'approved' : 'pending',
      approved: isAdmin
    };
    const updated = saveGatheringEvent(newEvt);
    setGatheringEvents(updated);
    setSelectedDateStr(newEvtDate);
    setIsProposeEventOpen(false);
    setNewEvtTitle('');
    setNewEvtFocus('');
    setBirthdayAlert(
      isAdmin
        ? `✅ Event "${newEvt.title}" scheduled and published to the Sanctuary Calendar!`
        : `⏳ Event "${newEvt.title}" submitted with status 'pending' for Lead Facilitator approval!`
    );
    setTimeout(() => setBirthdayAlert(null), 5000);
  };

  const handleApproveCalendarEvent = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isAdmin) return;
    const updated = approveGatheringEvent(id);
    setGatheringEvents(updated);
    // Also approve in customGatherings if it originated from SanctuaryScheduleView
    try {
      const saved = localStorage.getItem('youngfire_sanctuary_custom_gatherings');
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list)) {
          const updatedCustom = list.map((cg: any) =>
            cg.id === id ? { ...cg, status: 'approved', approvalStatus: 'approved', approved: true } : cg
          );
          localStorage.setItem('youngfire_sanctuary_custom_gatherings', JSON.stringify(updatedCustom));
          setCustomGatherings(updatedCustom);
          window.dispatchEvent(new CustomEvent('youngfire_gatherings_updated'));
        }
      }
    } catch {}
    setBirthdayAlert(`✅ Event approved and published to the Sanctuary Calendar!`);
    setTimeout(() => setBirthdayAlert(null), 4000);
  };

  // Aggregate user birthdays from real registered roster members
  const allBirthdays = useMemo(() => {
    const list = [...DEFAULT_ROSTER_BIRTHDAYS];
    try {
      const saved = localStorage.getItem('youngfire_member_roster_v2');
      if (saved) {
        const roster = JSON.parse(saved);
        if (Array.isArray(roster)) {
          roster.forEach((m: any) => {
            const memberName = m.fullName || m.name;
            if (memberName && m.birthday && /^\d{2}-\d{2}$/.test(m.birthday)) {
              if (!list.some(b => b.name.toLowerCase() === memberName.toLowerCase())) {
                list.push({
                  name: memberName,
                  birthday: m.birthday,
                  role: m.role || 'YoungFire Disciple',
                  avatar: m.avatar
                });
              }
            }
          });
        }
      }
    } catch {}

    if (currentUser?.birthday && /^\d{2}-\d{2}$/.test(currentUser.birthday)) {
      if (!list.some(b => b.name === currentUser.name)) {
        list.push({
          name: currentUser.name || 'Disciple',
          birthday: currentUser.birthday,
          role: currentUser.role || 'Member',
          avatar: currentUser.avatar
        });
      }
    }
    return list;
  }, [currentUser]);

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }, []);

  // Save meeting overrides and broadcast alert event
  const saveOverrides = (updated: typeof meetingOverrides) => {
    setMeetingOverrides(updated);
    try {
      localStorage.setItem('youngfire_calendar_overrides', JSON.stringify(updated));
    } catch {}

    // Find any active canceled or rescheduled meetings to trigger global notification
    const updates = Object.values(updated).filter(u => u.status === 'canceled' || u.status === 'rescheduled');
    if (updates.length > 0) {
      const latest = updates[updates.length - 1];
      const message = latest.status === 'canceled'
        ? `⚠️ Meeting Update: Gathering Canceled by Facilitators (${latest.updateNote || 'No reason provided'}).`
        : `⚠️ Meeting Update: Gathering Rescheduled to ${latest.rescheduleDate || 'new date'} at ${latest.rescheduleTime || '7:00 PM CST'}.`;
      
      window.dispatchEvent(new CustomEvent('yf_meeting_status_updated', {
        detail: { count: updates.length, message, updates }
      }));
    } else {
      window.dispatchEvent(new CustomEvent('yf_meeting_status_updated', {
        detail: { count: 0, message: null, updates: [] }
      }));
    }
  };

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleGoToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDateStr(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
  };

  // Month metadata
  const monthName = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [currentYear, currentMonth]);

  // Aggregate all events mapped by YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();

    const addEvent = (dateStr: string, item: CalendarEventItem) => {
      // Check all equivalent IDs for an override
      const eqIds = getEquivalentGatheringIds(item.id, dateStr);
      const override = eqIds.map((eid) => meetingOverrides[eid]).find(Boolean);
      if (override) {
        item.status = override.status;
        item.rescheduleDate = override.rescheduleDate;
        item.rescheduleTime = override.rescheduleTime;
        item.updateNote = override.updateNote;
        if (override.status === 'rescheduled' && override.rescheduleTime) {
          item.time = override.rescheduleTime;
        }
      }
      const existing = map.get(dateStr) || [];
      existing.push(item);
      map.set(dateStr, existing);

      // If rescheduled to a different date, also place the active rescheduled meeting on the new target date
      if (
        override &&
        override.status === 'rescheduled' &&
        override.rescheduleDate &&
        /^\d{4}-\d{2}-\d{2}$/.test(override.rescheduleDate) &&
        override.rescheduleDate !== dateStr
      ) {
        const targetExisting = map.get(override.rescheduleDate) || [];
        if (!targetExisting.some((e) => e.id === item.id)) {
          targetExisting.push({
            ...item,
            date: override.rescheduleDate,
            time: override.rescheduleTime || item.time
          });
          map.set(override.rescheduleDate, targetExisting);
        }
      }
    };

    // 1. Lock YoungFire Small Group and Discipleship Lessons to the SAME cadence:
    // Every other Monday @ 7:00 PM CST!
    // Auto-populate for currentMonth and adjacent months
    for (let day = 1; day <= 31; day++) {
      const d = new Date(currentYear, currentMonth, day);
      if (d.getMonth() === currentMonth) {
        const check = isEveryOtherMonday(d);
        if (check.isMonday) {
          const dateStr = `${currentYear}-${pad(currentMonth + 1)}-${pad(day)}`;
          // Pair with corresponding discipleship lesson from lessons list
          const safeIndex = Math.abs(check.cycleIndex) % (lessons.length || 1);
          const pairedLesson = lessons[safeIndex] || lessons[0];

          addEvent(dateStr, {
            id: `sg_${dateStr}`,
            title: 'YoungFire Small Group & Discipleship',
            type: 'small_group',
            time: '7:00 PM CST',
            date: dateStr,
            lessonIndex: safeIndex,
            lessonId: pairedLesson?.id,
            lesson: pairedLesson,
            scriptureTopic: pairedLesson ? (pairedLesson.primaryPassage || pairedLesson.scripturePassage || 'Ephesians 4:16') : '2026 Theme: Rebuilding Together',
            description: `Gathering Location: ${smallGroupLocation} (Bi-Weekly Mondays @ 7:00 PM CST). ${pairedLesson ? (pairedLesson.summary || pairedLesson.description) : 'Bi-weekly living room discipleship huddle, scripture exposition & community prayer.'}`,
            isZoom: true,
            zoomUrl: 'https://us05web.zoom.us/j/8785161298?pwd=e0zBTD2QHIHfx0AzjzXG7EHQno9Oig.1&omn=85728476365',
            status: 'active'
          });
        }

        // Thursday Open Bible Study (Matching SanctuaryScheduleView)
        if (d.getDay() === 4) {
          const dateStr = `${currentYear}-${pad(currentMonth + 1)}-${pad(day)}`;
          addEvent(dateStr, {
            id: `ob_${dateStr}`,
            title: 'Open Bible Study',
            type: 'special',
            time: '7:00 PM CST',
            date: dateStr,
            scriptureTopic: 'Expository Scripture Study & Word Immersion',
            description: 'Corporate Thursday expository scripture meditation, verse-by-verse chapter tracking, and interactive reflections across the 66-Book Imperial Scripture Atlas.',
            isZoom: true,
            zoomUrl: 'https://us05web.zoom.us/j/8785161298?pwd=e0zBTD2QHIHfx0AzjzXG7EHQno9Oig.1&omn=85728476365',
            groupTag: '#YoungFire',
            status: 'active'
          });
        }
      }
    }

    // 2. Custom Gatherings (Shared with SanctuaryScheduleView & Admin CMS)
    const currentUserId = (currentUser as any)?.id || (currentUser as any)?.uid || currentUser?.email || '';
    customGatherings.forEach((cg) => {
      const isPending = cg.status === 'pending' || cg.approvalStatus === 'pending' || cg.approved === false;
      if (isPending && !isAdmin) {
        const isAuthor = Boolean(
          (currentUserId && cg.createdById && currentUserId === cg.createdById) ||
          (currentUser?.name && cg.createdBy && currentUser.name.trim().toLowerCase() === cg.createdBy.trim().toLowerCase())
        );
        if (!isAuthor) return;
      }
      const cgYear = cg.year || parseInt((cg.dateStr || '').slice(0, 4), 10);
      const cgMonth = cg.month !== undefined ? cg.month : (cg.date ? parseInt(cg.date.split('-')[1], 10) - 1 : currentMonth);
      if (cgYear === currentYear && cgMonth === currentMonth) {
        const dateStr = `${currentYear}-${pad(currentMonth + 1)}-${pad(cg.dayNumber || 1)}`;
        addEvent(dateStr, {
          id: cg.id,
          title: cg.title,
          type: cg.category === 'small-group' ? 'small_group' : 'special',
          time: cg.timeStr || '7:00 PM CST',
          date: dateStr,
          scriptureTopic: cg.badge || 'Sanctuary Gathering',
          description: `${cg.locationName}: ${cg.description || 'YoungFire Sanctuary Consecrated Gathering.'}`,
          isZoom: Boolean(cg.hasZoom),
          zoomUrl: cg.zoomUrl || 'https://us05web.zoom.us/j/8785161298?pwd=e0zBTD2QHIHfx0AzjzXG7EHQno9Oig.1&omn=85728476365',
          groupTag: '#YoungFire',
          status: isPending ? 'pending' : 'active',
          approvalStatus: isPending ? 'pending' : 'approved',
          approved: !isPending,
          createdBy: cg.createdBy,
          createdById: cg.createdById
        });
      }
    });

    // 3. Fellowship Ideas scheduled onto the calendar (Ad-hoc sessions)
    ideas.forEach((idea) => {
      if (idea.scheduledDate && /^\d{4}-\d{2}-\d{2}$/.test(idea.scheduledDate)) {
        addEvent(idea.scheduledDate, {
          id: `idea_evt_${idea.id}`,
          title: `Fellowship: ${idea.title}`,
          type: 'fellowship_idea',
          time: '6:30 PM CST',
          date: idea.scheduledDate,
          description: idea.description,
          isZoom: false,
          status: 'active'
        });
      }
    });

    // 4. Gathering Events from Men On Fire, Women Ignited, and YoungFire (sanctuary_calendar_events)
    gatheringEvents.forEach((gevt) => {
      if (gevt.date && /^\d{4}-\d{2}-\d{2}$/.test(gevt.date)) {
        const isPending = gevt.status === 'pending' || gevt.approvalStatus === 'pending' || gevt.approved === false;
        if (isPending && !isAdmin) {
          const isAuthor = Boolean(
            (currentUserId && gevt.createdById && currentUserId === gevt.createdById) ||
            (currentUser?.name && gevt.createdBy && currentUser.name.trim().toLowerCase() === gevt.createdBy.trim().toLowerCase())
          );
          if (!isAuthor) return;
        }
        const isMen = gevt.groupTag === '#MenOnFire' || gevt.targetAudience === 'men';
        const isWomen = gevt.groupTag === '#WomenIgnited' || gevt.targetAudience === 'women';
        addEvent(gevt.date, {
          id: gevt.id,
          title: gevt.title,
          type: isMen ? 'ad_hoc_men' : isWomen ? 'ad_hoc_women' : 'special',
          time: gevt.time || '7:00 PM CST',
          date: gevt.date,
          scriptureTopic: gevt.scriptureRef ? `${gevt.scriptureRef} — ${gevt.focusTopic}` : gevt.focusTopic,
          description: gevt.description || `${gevt.groupTag}: ${gevt.focusTopic}. Hosted by ${gevt.createdBy || 'Facilitators'}.`,
          isZoom: Boolean(gevt.zoomUrl),
          zoomUrl: gevt.zoomUrl || 'https://us05web.zoom.us/j/8785161298?pwd=e0zBTD2QHIHfx0AzjzXG7EHQno9Oig.1&omn=85728476365',
          groupTag: gevt.groupTag,
          status: gevt.status || 'active',
          approvalStatus: gevt.approvalStatus || (isPending ? 'pending' : 'approved'),
          approved: gevt.approved !== false,
          createdBy: gevt.createdBy,
          createdById: gevt.createdById
        });
      }
    });

    return map;
  }, [currentYear, currentMonth, lessons, ideas, gatheringEvents, meetingOverrides]);

  // Aggregate birthdays mapped by MM-DD
  const birthdaysByDate = useMemo(() => {
    const map = new Map<string, MemberBirthday[]>();
    allBirthdays.forEach(b => {
      const existing = map.get(b.birthday) || [];
      existing.push(b);
      map.set(b.birthday, existing);
    });
    return map;
  }, [allBirthdays]);

  // Active meeting updates beacon banner
  const activeAlertUpdates = useMemo(() => {
    return Object.entries(meetingOverrides)
      .filter(([_, val]) => val.status === 'canceled' || val.status === 'rescheduled')
      .map(([id, val]) => ({ id, ...val }));
  }, [meetingOverrides]);

  // Calendar days grid computation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sun
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthTotalDays = new Date(currentYear, currentMonth, 0).getDate();

    const cells: Array<{
      dayNumber: number;
      dateStr: string;
      monthDayStr: string; // MM-DD
      isCurrentMonth: boolean;
      events: CalendarEventItem[];
      birthdays: MemberBirthday[];
    }> = [];

    // Leading padding days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = prevMonthTotalDays - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${pad(prevMonth + 1)}-${pad(dNum)}`;
      const monthDayStr = `${pad(prevMonth + 1)}-${pad(dNum)}`;
      cells.push({
        dayNumber: dNum,
        dateStr,
        monthDayStr,
        isCurrentMonth: false,
        events: eventsByDate.get(dateStr) || [],
        birthdays: birthdaysByDate.get(monthDayStr) || []
      });
    }

    // Days in current month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${currentYear}-${pad(currentMonth + 1)}-${pad(d)}`;
      const monthDayStr = `${pad(currentMonth + 1)}-${pad(d)}`;
      cells.push({
        dayNumber: d,
        dateStr,
        monthDayStr,
        isCurrentMonth: true,
        events: eventsByDate.get(dateStr) || [],
        birthdays: birthdaysByDate.get(monthDayStr) || []
      });
    }

    // Trailing padding days to fill 35 or 42 grid cells
    const remaining = 35 - (cells.length % 35);
    if (remaining < 35 && remaining > 0) {
      for (let d = 1; d <= remaining; d++) {
        const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
        const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
        const dateStr = `${nextYear}-${pad(nextMonth + 1)}-${pad(d)}`;
        const monthDayStr = `${pad(nextMonth + 1)}-${pad(d)}`;
        cells.push({
          dayNumber: d,
          dateStr,
          monthDayStr,
          isCurrentMonth: false,
          events: eventsByDate.get(dateStr) || [],
          birthdays: birthdaysByDate.get(monthDayStr) || []
        });
      }
    }

    return cells;
  }, [currentYear, currentMonth, eventsByDate, birthdaysByDate]);

  // Selected date events
  const selectedDayEvents = eventsByDate.get(selectedDateStr) || [];
  const selectedMonthDayStr = selectedDateStr.slice(5); // MM-DD
  const selectedDayBirthdays = birthdaysByDate.get(selectedMonthDayStr) || [];

  // Handle clicking a calendar date cell
  const handleDateClick = (dateStr: string, events: CalendarEventItem[]) => {
    setSelectedDateStr(dateStr);

    // If that date has a small group or custom gathering, open the Zoom Bridge Modal
    const targetEvent = events.find(e => e.type === 'small_group' || e.isZoom);
    if (targetEvent) {
      setActiveModalEvent(targetEvent);
      setIsAdminEditing(false);
      setEditStatus(targetEvent.status || 'active');
      setEditRescheduleDate(targetEvent.rescheduleDate || '');
      setEditRescheduleTime(targetEvent.rescheduleTime || '7:00 PM CST');
      setEditUpdateNote(targetEvent.updateNote || '');
    }
  };

  // Birthday Tap Handler
  const handleBirthdayClick = (birthday: MemberBirthday, e: React.MouseEvent) => {
    e.stopPropagation();
    setBirthdayAlert(`🎉 Celebrating ${birthday.name}'s Birthday! (${birthday.role || 'YoungFire Disciple'})`);
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch {}
    setTimeout(() => setBirthdayAlert(null), 5000);
  };

  // Admin Save Changes to Scheduled Meeting
  const handleAdminSaveMeetingUpdate = async () => {
    if (!activeModalEvent) return;
    const nextOverrides = await saveCalendarMeetingOverride(
      activeModalEvent.id,
      {
        status: editStatus,
        rescheduleDate: editStatus === 'rescheduled' ? editRescheduleDate : undefined,
        rescheduleTime: editStatus === 'rescheduled' ? editRescheduleTime : undefined,
        updateNote: editUpdateNote,
        updatedBy: currentUser?.name || 'Lead Facilitator',
        updatedAt: new Date().toISOString()
      },
      {
        title: activeModalEvent.title,
        date: activeModalEvent.date,
        time: activeModalEvent.time,
        description: activeModalEvent.description
      }
    );
    saveOverrides(nextOverrides as any);
    setIsAdminEditing(false);

    // Update active modal event local state
    setActiveModalEvent({
      ...activeModalEvent,
      status: editStatus,
      rescheduleDate: editStatus === 'rescheduled' ? editRescheduleDate : undefined,
      rescheduleTime: editStatus === 'rescheduled' ? editRescheduleTime : undefined,
      updateNote: editUpdateNote
    });
  };

  const handleDeleteCalendarEvent = () => {
    if (!activeModalEvent) return;
    if (confirm(`Permanently remove event "${activeModalEvent.title}" from the Sanctuary Calendar?`)) {
      deleteGatheringEvent(activeModalEvent.id);
      setGatheringEvents(prev => prev.filter(e => e.id !== activeModalEvent.id));

      const updatedOverrides = {
        ...meetingOverrides,
        [activeModalEvent.id]: {
          status: 'canceled' as const,
          updateNote: 'Gathering removed by facilitator.',
          updatedBy: currentUser?.name || 'Lead Facilitator',
          updatedAt: new Date().toISOString()
        }
      };
      saveOverrides(updatedOverrides);
      setActiveModalEvent(null);
    }
  };

  const handleProposeGathering = () => {
    const subject = encodeURIComponent("Sanctuary Gathering Proposal");
    const body = encodeURIComponent(
      `Dear Admin Team,\n\nI am proposing we gather on [Date & Time] at [Location].\n\nPurpose / Reason: [Explain here]\n\nCoordinator: [Name]\nContact Information: [Phone / Email]\n\nVery respectfully,\n${currentUser?.name || 'Sanctuary Disciple'}`
    );
    window.location.href = `mailto:JHOWYoungFire@gmail.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="bg-[#0a0a0a] border border-purple-500/30 rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl relative">
      {/* 1. MEETING UPDATE BEACON BANNER (If any meeting is canceled or rescheduled) */}
      {activeAlertUpdates.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-950/70 border-2 border-amber-500 text-white flex items-center justify-between gap-3 shadow-lg shadow-amber-500/20 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300 font-bold block">
                ⚠️ MEETING UPDATE NOTIFICATION BEACON
              </span>
              <p className="text-xs sm:text-sm font-bold text-white">
                Gathering has been {activeAlertUpdates.some(u => u.status === 'canceled') ? 'CANCELED' : 'RESCHEDULED'} by Facilitators
              </p>
              <p className="text-[11px] text-amber-200/90 font-mono mt-0.5">
                {activeAlertUpdates[0].updateNote || 'Check meeting card for details.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const target = eventsByDate.get(selectedDateStr)?.find(e => e.id in meetingOverrides);
              if (target) setActiveModalEvent(target);
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold flex-shrink-0 cursor-pointer shadow transition-all"
          >
            Review Update
          </button>
        </div>
      )}

      {/* 2. BIRTHDAY CELEBRATION TOAST */}
      {birthdayAlert && (
        <div className="fixed top-6 inset-x-4 max-w-md mx-auto z-50 p-4 rounded-2xl bg-black border-2 border-amber-400 text-white shadow-2xl flex items-center justify-between gap-3 animate-slideDown">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎂</span>
            <p className="text-xs font-bold font-mono text-amber-300">{birthdayAlert}</p>
          </div>
          <button 
            onClick={() => setBirthdayAlert(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. CALENDAR HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-purple-400" />
            <h3 className="text-base sm:text-lg font-black font-['Outfit'] uppercase text-white tracking-wide">
              Fellowship Sanctuary Calendar
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[9px] font-bold border border-purple-500/30">
              Zoom Bridge &bull; 2-Way Sync
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-400 mt-0.5">
            Every other Monday @ 7:00 PM CST locked with Discipleship Lessons &bull; Member Birthdays Active
          </p>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl bg-[#0a0a0a] border border-white/10 text-slate-300 hover:text-white hover:bg-[#1a1a1a] cursor-pointer transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono font-bold text-white px-3 py-1.5 bg-black/80 rounded-xl border border-white/10 min-w-[140px] text-center">
            {monthName}
          </span>

          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl bg-[#0a0a0a] border border-white/10 text-slate-300 hover:text-white hover:bg-[#1a1a1a] cursor-pointer transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleGoToToday}
            className="px-2.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-mono font-bold cursor-pointer transition-colors"
          >
            Today
          </button>

          <button
            onClick={handleProposeGathering}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold cursor-pointer transition-colors flex items-center gap-1 shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Propose Gathering</span>
          </button>
        </div>
      </div>

      {/* 4. LEGEND BAR */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-slate-300 bg-black/60 p-2.5 rounded-xl border border-white/5">
        <span className="text-slate-400 font-bold uppercase tracking-wider">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>
          <span>YoungFire Small Group & Lesson (Every other Mon @ 7PM)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
          <span>🎂 Member Birthday</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
          <span>Canceled / Rescheduled Alert</span>
        </div>
      </div>

      {/* 5. CALENDAR GRID */}
      <div className="space-y-1">
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] font-bold uppercase text-slate-400 py-1 border-b border-white/5">
          <div>Sun</div>
          <div className="text-orange-400">Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div className="text-amber-400">Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Days Grid Cells */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-1">
          {calendarDays.map((cell, idx) => {
            const isSelected = cell.dateStr === selectedDateStr;
            const isToday = cell.dateStr === todayStr;
            const hasSmallGroup = cell.events.some(e => e.type === 'small_group');
            const hasMenEvent = cell.events.some(e => e.type === 'ad_hoc_men' || e.groupTag === '#MenOnFire');
            const hasWomenEvent = cell.events.some(e => e.type === 'ad_hoc_women' || e.groupTag === '#WomenIgnited');
            const hasBirthdays = cell.birthdays.length > 0;
            const hasCanceledOrRescheduled = cell.events.some(e => e.status === 'canceled' || e.status === 'rescheduled');

            return (
              <div
                key={`${cell.dateStr}_${idx}`}
                onClick={() => handleDateClick(cell.dateStr, cell.events)}
                className={`min-h-[82px] sm:min-h-[96px] p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  !cell.isCurrentMonth
                    ? 'opacity-35 bg-black/30 border-white/5 text-slate-500'
                    : hasCanceledOrRescheduled
                    ? 'bg-rose-950/30 border-rose-500/60 shadow-md shadow-rose-500/10'
                    : isSelected
                    ? 'bg-purple-950/40 border-purple-400 shadow-lg shadow-purple-500/20'
                    : isToday
                    ? 'bg-amber-950/30 border-amber-500/80 shadow-md shadow-amber-500/10'
                    : 'bg-black/60 border-white/5 hover:border-purple-500/40 hover:bg-[#0a0a0a]/80'
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-mono font-bold ${
                    isToday 
                      ? 'text-amber-400 underline font-black' 
                      : isSelected 
                      ? 'text-purple-300' 
                      : cell.isCurrentMonth 
                      ? 'text-slate-200' 
                      : 'text-slate-600'
                  }`}>
                    {cell.dayNumber}
                  </span>

                  <div className="flex items-center gap-1">
                    {/* Birthday Cake Badge */}
                    {hasBirthdays && (
                      <button
                        onClick={(e) => handleBirthdayClick(cell.birthdays[0], e)}
                        className="p-0.5 rounded-full hover:scale-125 transition-transform cursor-pointer"
                        title={`🎉 Birthday: ${cell.birthdays.map(b => b.name).join(', ')}`}
                      >
                        <span className="text-xs">🎂</span>
                      </button>
                    )}

                    {isToday && (
                      <span className="text-[8px] font-mono px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                        TODAY
                      </span>
                    )}
                  </div>
                </div>

                {/* Event Badges */}
                <div className="space-y-1 my-1 overflow-hidden">
                  {cell.events.map((evt) => {
                    const isCanceled = evt.status === 'canceled';
                    const isRescheduled = evt.status === 'rescheduled';

                    if (evt.type === 'small_group') {
                      return (
                        <div
                          key={evt.id}
                          className={`px-1.5 py-0.5 rounded-lg border text-[9px] font-mono font-bold truncate flex items-center gap-1 ${
                            isCanceled
                              ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 line-through'
                              : isRescheduled
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                              : 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                          }`}
                          title={`Click to open Zoom Bridge & Discipleship Outline`}
                        >
                          <Flame className="w-2.5 h-2.5 flex-shrink-0 text-orange-400" />
                          <span className="truncate">
                            {isCanceled ? '⚠️ CANCELED' : isRescheduled ? '⚠️ RESCHEDULED' : 'Small Group 7PM'}
                          </span>
                        </div>
                      );
                    }

                    if (evt.type === 'ad_hoc_men' || evt.groupTag === '#MenOnFire') {
                      return (
                        <div
                          key={evt.id}
                          className={`px-1.5 py-0.5 rounded-lg border text-[9px] font-mono font-bold truncate flex items-center gap-1 shadow-sm ${
                            isCanceled
                              ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 line-through'
                              : isRescheduled
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                              : 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                          }`}
                          title={`${evt.title} (#MenOnFire)`}
                        >
                          <Shield className="w-2.5 h-2.5 flex-shrink-0 text-orange-400" />
                          <span className="truncate">{evt.title}</span>
                        </div>
                      );
                    }

                    if (evt.type === 'ad_hoc_women' || evt.groupTag === '#WomenIgnited') {
                      return (
                        <div
                          key={evt.id}
                          className={`px-1.5 py-0.5 rounded-lg border text-[9px] font-mono font-bold truncate flex items-center gap-1 shadow-sm ${
                            isCanceled
                              ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 line-through'
                              : isRescheduled
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                              : 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                          }`}
                          title={`${evt.title} (#WomenIgnited)`}
                        >
                          <Sparkles className="w-2.5 h-2.5 flex-shrink-0 text-rose-400" />
                          <span className="truncate">{evt.title}</span>
                        </div>
                      );
                    }

                    if (evt.type === 'fellowship_idea') {
                      return (
                        <div
                          key={evt.id}
                          className="px-1.5 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-mono font-bold truncate flex items-center gap-1"
                        >
                          <Sparkles className="w-2.5 h-2.5 flex-shrink-0 text-emerald-400" />
                          <span className="truncate">{evt.title}</span>
                        </div>
                      );
                    }

                    if (evt.type === 'special') {
                      return (
                        <div
                          key={evt.id}
                          className="px-1.5 py-0.5 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[9px] font-mono font-bold truncate flex items-center gap-1"
                        >
                          <Sparkles className="w-2.5 h-2.5 flex-shrink-0 text-purple-400" />
                          <span className="truncate">{evt.title}</span>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>

                {/* Pip indicators */}
                <div className="flex items-center gap-1 self-end">
                  {hasSmallGroup && <span className="w-1.5 h-1.5 rounded-full bg-orange-400" title="Small Group"></span>}
                  {hasMenEvent && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" title="Men On Fire (#MenOnFire)"></span>}
                  {hasWomenEvent && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Women Ignited (#WomenIgnited)"></span>}
                  {hasBirthdays && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Birthday"></span>}
                  {hasCanceledOrRescheduled && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Update"></span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. SELECTED DATE INSPECTOR BAR */}
      <div className="p-4 bg-black/80 rounded-2xl border border-white/10 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <h4 className="text-xs font-mono font-bold uppercase text-white">
              Schedule for {new Date(`${selectedDateStr}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </h4>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {selectedDayEvents.length} Gathering(s) &bull; {selectedDayBirthdays.length} Birthday(s)
          </span>
        </div>

        {/* Birthday Card on Selected Date */}
        {selectedDayBirthdays.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🎂</span>
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-amber-400 block">
                  Sanctuary Birthday Celebration
                </span>
                <p className="text-xs font-bold text-white">
                  🎉 Celebrating {selectedDayBirthdays.map(b => b.name).join(' & ')}!
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  {selectedDayBirthdays.map(b => b.role).filter(Boolean).join(' • ')}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => handleBirthdayClick(selectedDayBirthdays[0], e)}
              className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-mono text-xs font-bold cursor-pointer hover:bg-amber-400"
            >
              Celebrate 🎉
            </button>
          </div>
        )}

        {selectedDayEvents.length === 0 ? (
          <p className="text-xs text-slate-400 font-serif italic py-1">
            No formal gathering scheduled on this date. Small Groups meet every other Monday @ 7:00 PM CST.
          </p>
        ) : (
          <div className="space-y-2">
            {selectedDayEvents.map((evt) => {
              const isCanceled = evt.status === 'canceled';
              const isRescheduled = evt.status === 'rescheduled';
              const isMen = evt.type === 'ad_hoc_men' || evt.groupTag === '#MenOnFire';
              const isWomen = evt.type === 'ad_hoc_women' || evt.groupTag === '#WomenIgnited';

              return (
                <div 
                  key={evt.id}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCanceled 
                      ? 'bg-rose-950/40 border-rose-500/40' 
                      : isRescheduled 
                      ? 'bg-amber-950/40 border-amber-500/40' 
                      : isMen
                      ? 'bg-[#0a0a0a] border-orange-500/30'
                      : isWomen
                      ? 'bg-[#0a0a0a] border-rose-500/30'
                      : 'bg-[#0a0a0a]/90 border-white/5'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {isMen ? (
                        <Shield className="w-4 h-4 text-orange-400" />
                      ) : isWomen ? (
                        <Heart className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Flame className="w-4 h-4 text-orange-400" />
                      )}
                      <h5 className={`text-xs font-bold ${isCanceled ? 'line-through text-slate-400' : 'text-white'}`}>
                        {evt.title}
                      </h5>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-300">
                        {isRescheduled && evt.rescheduleTime ? evt.rescheduleTime : evt.time}
                      </span>
                      {isMen && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/40 font-bold">
                          #MenOnFire
                        </span>
                      )}
                      {isWomen && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                          #WomenIgnited
                        </span>
                      )}
                      {isCanceled && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                          CANCELED
                        </span>
                      )}
                      {isRescheduled && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                          RESCHEDULED TO {evt.rescheduleDate || 'NEW DATE'}
                        </span>
                      )}
                      {(evt.status === 'pending' || evt.approvalStatus === 'pending' || evt.approved === false) && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase">
                          Pending Approval
                        </span>
                      )}
                    </div>

                    {evt.scriptureTopic && (
                      <p className="text-[11px] font-mono text-cyan-300 font-bold">
                        📖 Study Passage: {evt.scriptureTopic}
                      </p>
                    )}

                    {evt.description && (
                      <p className="text-[11px] text-slate-300 font-serif leading-relaxed line-clamp-2">
                        {evt.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(evt.status === 'pending' || evt.approvalStatus === 'pending' || evt.approved === false) && isAdmin && (
                      <button
                        onClick={(e) => handleApproveCalendarEvent(evt.id, e)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
                        title="Approve Event Proposal"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setActiveModalEvent(evt);
                        setIsAdminEditing(false);
                        setEditStatus(evt.status === 'canceled' || evt.status === 'rescheduled' ? evt.status : 'active');
                        setEditRescheduleDate(evt.rescheduleDate || '');
                        setEditRescheduleTime(evt.rescheduleTime || '7:00 PM CST');
                        setEditUpdateNote(evt.updateNote || '');
                      }}
                      className={`px-3 py-1.5 rounded-xl font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all ${
                        isWomen 
                          ? 'bg-rose-500 hover:bg-rose-400 text-slate-950'
                          : 'bg-orange-500 hover:bg-orange-400 text-slate-950'
                      }`}
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Zoom Bridge</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 7. ZOOM BRIDGE & SAME-DAY DISCIPLESHIP LESSON MODAL CARD */}
      {activeModalEvent && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setActiveModalEvent(null)}
        >
          {(() => {
            const isMenModal = activeModalEvent.type === 'ad_hoc_men' || activeModalEvent.groupTag === '#MenOnFire';
            const isWomenModal = activeModalEvent.type === 'ad_hoc_women' || activeModalEvent.groupTag === '#WomenIgnited';

            return (
              <div 
                className={`w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border ${
                  isWomenModal ? 'border-rose-500/50' : 'border-orange-500/40'
                } rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl text-white relative animate-scaleUp`}
                onClick={e => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold border uppercase ${
                        isWomenModal 
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                          : 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                      }`}>
                        {isWomenModal 
                          ? 'Women Ignited Gathering • #WomenIgnited' 
                          : isMenModal 
                          ? 'Men On Fire Gathering • #MenOnFire' 
                          : 'Zoom Small Group • Bi-Weekly Monday'}
                      </span>
                      {activeModalEvent.status === 'canceled' && (
                        <span className="px-2 py-0.5 rounded bg-rose-500 text-slate-950 font-mono text-[9px] font-black uppercase">
                          Gathering Canceled
                        </span>
                      )}
                      {activeModalEvent.status === 'rescheduled' && (
                        <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-mono text-[9px] font-black uppercase">
                          Gathering Rescheduled
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg sm:text-xl font-black font-['Outfit'] uppercase text-white tracking-wide">
                      {activeModalEvent.title}
                    </h3>
                    <p className="text-xs font-mono text-slate-400">
                      {activeModalEvent.date} &bull; {activeModalEvent.status === 'rescheduled' && activeModalEvent.rescheduleTime ? activeModalEvent.rescheduleTime : activeModalEvent.time}
                    </p>
                    {activeModalEvent.type === 'small_group' && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-300 font-mono font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                        <span>📍 Location: {smallGroupLocation} (Bi-Weekly Mondays @ 7:00 PM CST) • In-Person &amp; Zoom</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setActiveModalEvent(null)}
                    className="p-2 rounded-xl bg-[#0a0a0a] border border-white/10 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Warning if canceled or rescheduled */}
                {activeModalEvent.status === 'canceled' && (
                  <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/60 text-rose-200 text-xs font-mono">
                    <strong className="block text-rose-300 font-bold mb-0.5">⚠️ NOTICE: GATHERING CANCELED</strong>
                    {activeModalEvent.updateNote || 'Facilitators have canceled this gathering.'}
                  </div>
                )}

                {activeModalEvent.status === 'rescheduled' && (
                  <div className="p-3.5 rounded-2xl bg-amber-950/70 border border-amber-500/60 text-amber-200 text-xs font-mono">
                    <strong className="block text-amber-300 font-bold mb-0.5">⚠️ NOTICE: GATHERING RESCHEDULED</strong>
                    Rescheduled to: <span className="text-white font-bold">{activeModalEvent.rescheduleDate || 'New date'}</span> at <span className="text-white font-bold">{activeModalEvent.rescheduleTime || '7:00 PM CST'}</span>
                    {activeModalEvent.updateNote && <p className="mt-1 text-[11px] text-slate-300 italic">{activeModalEvent.updateNote}</p>}
                  </div>
                )}

                {/* HIGH-CONTRAST ZOOM LAUNCH BUTTON */}
                {activeModalEvent.status !== 'canceled' && (
                  <div className={`p-4 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl ${
                    isWomenModal
                      ? 'bg-gradient-to-r from-rose-500/20 via-pink-500/20 to-rose-500/20 border-rose-500'
                      : 'bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-orange-500/20 border-orange-500'
                  }`}>
                    <div className="space-y-0.5">
                      <span className={`text-[10px] font-mono uppercase font-bold block ${
                        isWomenModal ? 'text-rose-400' : 'text-orange-400'
                      }`}>
                        {isWomenModal ? 'Consecrated Sisterhood Video Sanctuary' : isMenModal ? 'Consecrated Brotherhood Video Sanctuary' : 'Interactive Video Sanctuary'}
                      </span>
                      <p className="text-xs text-white font-mono font-bold">
                        Meeting ID: <span className={isWomenModal ? 'text-rose-300' : 'text-amber-300'}>878 516 1298</span> &bull; Passcode: <span className={isWomenModal ? 'text-rose-300' : 'text-amber-300'}>FIRE2026</span>
                      </p>
                    </div>

                    <a
                      href={activeModalEvent.zoomUrl || 'https://us05web.zoom.us/j/8785161298?pwd=e0zBTD2QHIHfx0AzjzXG7EHQno9Oig.1&omn=85728476365'}
                      target="_blank"
                      rel="noreferrer"
                      className={`px-5 py-2.5 rounded-xl font-black font-['Outfit'] uppercase text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                        isWomenModal
                          ? 'bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-rose-500/30'
                          : 'bg-orange-500 hover:bg-orange-400 text-slate-950 shadow-orange-500/30'
                      }`}
                    >
                      <Video className="w-4 h-4" />
                      <span>{isWomenModal ? 'Join Sisterhood Zoom' : isMenModal ? 'Join Brotherhood Zoom' : 'Join Zoom Small Group'}</span>
                    </a>
                  </div>
                )}

                {/* CO-LOCATED DISCIPLESHIP LESSON OUTLINE */}
            {activeModalEvent.lesson ? (
              <div className="space-y-3 p-4 rounded-2xl bg-black/70 border border-white/10">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono font-bold uppercase text-white">
                      Co-Located Discipleship Lesson
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-300 px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/30">
                    Same-Day Cadence
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold text-white font-['Outfit']">
                    {activeModalEvent.lesson.lessonTitle || activeModalEvent.lesson.title}
                  </h4>

                  <p className="text-[11px] font-mono text-amber-400 font-bold">
                    📖 Scripture Passage: {activeModalEvent.lesson.primaryPassage || activeModalEvent.lesson.scripturePassage || 'Ephesians 4:16'}
                  </p>

                  <p className="text-[10px] font-mono text-slate-400">
                    Facilitators: {activeModalEvent.lesson.teachers || activeModalEvent.lesson.facilitator || 'Trent White & Whitney White'}
                  </p>

                  <p className="text-xs text-slate-300 font-serif leading-relaxed pt-1">
                    {activeModalEvent.lesson.summary || activeModalEvent.lesson.description}
                  </p>
                </div>

                {/* Lesson Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                  {activeModalEvent.lessonIndex !== undefined && (
                    <button
                      onClick={() => {
                        onSelectLesson(activeModalEvent.lessonIndex!);
                        setActiveModalEvent(null);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow transition-all"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Open Full Lesson Study</span>
                    </button>
                  )}

                  {activeModalEvent.lesson.primaryPassage && onNavigateToScripture && (
                    <button
                      onClick={() => {
                        // Extract book and chapter if possible, e.g. "Romans 12" -> "ROM", 12
                        const passage = activeModalEvent.lesson?.primaryPassage || '';
                        const match = passage.match(/^([A-Za-z0-9\s]+?)\s+(\d+)/);
                        if (match) {
                          const bookName = match[1].trim();
                          const chapter = parseInt(match[2], 10) || 1;
                          onNavigateToScripture(bookName.slice(0, 3).toUpperCase(), chapter);
                          setActiveModalEvent(null);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#0a0a0a] border border-white/15 text-slate-200 hover:text-white font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Read Passage</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-black/70 border border-white/10 text-xs text-slate-400 font-serif">
                {activeModalEvent.description || 'YoungFire Small Group Fellowship & Community Study.'}
              </div>
            )}

            {/* 8. ADMIN CONTROLS SECTION (Only for Trent & Whitney) */}
            {isAdmin && (
              <div className="p-4 rounded-2xl bg-black border border-purple-500/40 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-mono font-bold uppercase text-purple-300">
                      Facilitator Schedule Controls (Admin)
                    </span>
                  </div>
                  <button
                    onClick={() => setIsAdminEditing(!isAdminEditing)}
                    className="text-xs font-mono text-purple-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isAdminEditing ? 'Close Controls' : 'Edit Meeting Status'}</span>
                  </button>
                </div>

                {isAdminEditing ? (
                  <div className="space-y-3 text-xs animate-fadeIn">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-slate-400">Meeting Status</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditStatus('active')}
                          className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold cursor-pointer ${
                            editStatus === 'active' 
                              ? 'bg-emerald-500 text-slate-950' 
                              : 'bg-[#0a0a0a] text-slate-300 border border-white/10'
                          }`}
                        >
                          Active
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditStatus('canceled')}
                          className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold cursor-pointer ${
                            editStatus === 'canceled' 
                              ? 'bg-rose-500 text-slate-950' 
                              : 'bg-[#0a0a0a] text-slate-300 border border-white/10'
                          }`}
                        >
                          Cancel Gathering
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditStatus('rescheduled')}
                          className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold cursor-pointer ${
                            editStatus === 'rescheduled' 
                              ? 'bg-amber-400 text-slate-950' 
                              : 'bg-[#0a0a0a] text-slate-300 border border-white/10'
                          }`}
                        >
                          Reschedule
                        </button>
                      </div>
                    </div>

                    {editStatus === 'rescheduled' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono uppercase text-slate-400">New Date (YYYY-MM-DD)</label>
                          <input
                            type="date"
                            value={editRescheduleDate}
                            onChange={(e) => setEditRescheduleDate(e.target.value)}
                            className="w-full p-2 rounded-xl bg-[#0a0a0a] border border-white/20 text-white font-mono text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono uppercase text-slate-400">New Time</label>
                          <input
                            type="text"
                            value={editRescheduleTime}
                            onChange={(e) => setEditRescheduleTime(e.target.value)}
                            placeholder="7:30 PM CST"
                            className="w-full p-2 rounded-xl bg-[#0a0a0a] border border-white/20 text-white font-mono text-xs"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-slate-400">Facilitator Note / Reason</label>
                      <input
                        type="text"
                        value={editUpdateNote}
                        onChange={(e) => setEditUpdateNote(e.target.value)}
                        placeholder="e.g. Canceled for churchwide revival service; or rescheduled 30 mins later"
                        className="w-full p-2 rounded-xl bg-[#0a0a0a] border border-white/20 text-white font-mono text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <button
                        onClick={handleAdminSaveMeetingUpdate}
                        className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-mono font-bold text-xs cursor-pointer shadow-md flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>Save Status Update</span>
                      </button>
                      <button
                        onClick={handleDeleteCalendarEvent}
                        className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-mono font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                        title="Permanently remove gathering from calendar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Gathering</span>
                      </button>
                      <button
                        onClick={() => setIsAdminEditing(false)}
                        className="px-3 py-2 rounded-xl bg-[#0a0a0a] text-slate-400 hover:text-white font-mono text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 font-mono">
                    Trent & Whitney can cancel or reschedule any scheduled meeting. Doing so triggers a pulsing notification beacon across the applet.
                  </p>
                )}
              </div>
            )}
          </div>
            );
          })()}
        </div>
      )}

      {/* 8. PROPOSE / SCHEDULE NEW EVENT MODAL */}
      {isProposeEventOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsProposeEventOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#0a0a0a] border border-amber-500/40 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl text-white relative animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
                  {isAdmin ? 'Admin Direct Schedule' : 'Sanctuary Event Proposal'}
                </span>
                <h3 className="text-base font-black font-['Outfit'] uppercase text-white">
                  {isAdmin ? 'Schedule Sanctuary Gathering' : 'Propose Sanctuary Gathering'}
                </h3>
              </div>
              <button
                onClick={() => setIsProposeEventOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!isAdmin && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-mono">
                Proposed events are submitted with status <strong>Pending Approval</strong> for Lead Facilitators Trent &amp; Whitney White to review and approve.
              </div>
            )}

            <form onSubmit={handleCreateCalendarEvent} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Event Title *</label>
                <input
                  type="text"
                  required
                  value={newEvtTitle}
                  onChange={(e) => setNewEvtTitle(e.target.value)}
                  placeholder="e.g., YoungFire Worship & Prayer Night"
                  className="w-full p-2.5 rounded-xl bg-black border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Date *</label>
                  <input
                    type="date"
                    required
                    value={newEvtDate}
                    onChange={(e) => setNewEvtDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-black border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Time</label>
                  <input
                    type="text"
                    value={newEvtTime}
                    onChange={(e) => setNewEvtTime(e.target.value)}
                    placeholder="7:00 PM CST"
                    className="w-full p-2.5 rounded-xl bg-black border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Scripture Reference</label>
                  <input
                    type="text"
                    value={newEvtScripture}
                    onChange={(e) => setNewEvtScripture(e.target.value)}
                    placeholder="Ephesians 4:16"
                    className="w-full p-2.5 rounded-xl bg-black border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Fellowship Cohort</label>
                  <select
                    value={newEvtGroupTag}
                    onChange={(e) => setNewEvtGroupTag(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-black border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  >
                    <option value="#YoungFire">#YoungFire (All Sanctuary)</option>
                    <option value="#MenOnFire">#MenOnFire (Brotherhood)</option>
                    <option value="#WomenIgnited">#WomenIgnited (Sisterhood)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Focus Topic / Description</label>
                <textarea
                  rows={2}
                  value={newEvtFocus}
                  onChange={(e) => setNewEvtFocus(e.target.value)}
                  placeholder="Describe the focus topic, fellowship details, or prayer points..."
                  className="w-full p-2.5 rounded-xl bg-black border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsProposeEventOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono cursor-pointer shadow-md"
                >
                  {isAdmin ? 'Publish Event' : 'Submit for Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
