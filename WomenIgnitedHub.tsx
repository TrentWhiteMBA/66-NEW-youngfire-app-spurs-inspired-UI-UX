import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Heart, ExternalLink, Sparkles, Users, BookOpen, 
  Calendar, Plus, Clock, Video, Trash2, Search, Mail, Phone, 
  MapPin, Cake, UserPlus, X, Check, MessageSquare, Send, Edit3,
  AlertTriangle, Lock, Camera
} from 'lucide-react';
import { CurrentUser } from './SettingsHUDModal';
import { READING_PLANS, ReadingPlan } from '../data/readingPlansData';
import { ReadingPlanCard } from './ReadingPlanCard';
import { CustomPlanCreatorModal, CustomReadingPlan } from './CustomPlanCreatorModal';
import { 
  getStoredGatheringEvents, 
  saveGatheringEvent, 
  approveGatheringEvent,
  deleteGatheringEvent, 
  GatheringEvent 
} from '../data/gatheringEventsData';
import { parseScriptureRefToNav } from '../data/kingdomMediaData';
import { RosterMember } from './MemberRosterModal';
import { useAppCover } from '../data/appCoverAssets';
import { SanAntonioVectorMap } from './SanAntonioVectorMap';
import { db } from '../services/firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getProfileDocId, upsertDiscipleProfile, deduplicateSanctuaryDisciples } from '../services/profileService';
import { DiscipleCutoutCard } from './DiscipleCutoutCard';
import { compressImageFile } from '../utils/imageUtils';
import {
  formatChatTimestamp,
  toggleChatReaction,
  getOptimisticMessageReactions,
  ChatReactionAndCopyBar,
  ChatPasteButton,
  checkHubAccess
} from './ChatMessageItem';

interface WomenIgnitedHubProps {
  onBack?: () => void;
  currentUser?: CurrentUser | null;
  onNavigateToScripture?: (bookId: string, chapter: number) => void;
}

interface ChatMessage {
  id: string;
  sender: string;
  senderId?: string;
  role: string;
  avatarText: string;
  avatarUrl?: string;
  text: string;
  timestamp: string;
  createdAt?: any;
  reactions?: Record<string, string[]>;
}

export const WomenIgnitedHub: React.FC<WomenIgnitedHubProps> = ({
  onBack,
  currentUser,
  onNavigateToScripture
}) => {
  // 1. Strict Gender Isolation Access Check:
  // Non-admin males cannot view Women Ignited; admins (Trent/Whitney or currentUser.isAdmin) can view both.
  const isAuthorized = useMemo(() => {
    if (!currentUser) return true; // guest preview safe fallback
    return checkHubAccess('sisterhood', currentUser);
  }, [currentUser]);

  // Active sister hub tab
  const [activeTab, setActiveTab] = useState<'events' | 'roster' | 'plans' | 'chat'>('events');
  const womenCover = useAppCover('women_ignited_cover');

  // Gathering Events state
  const [gatheringEvents, setGatheringEvents] = useState<GatheringEvent[]>(() => {
    const all = getStoredGatheringEvents();
    return all.filter(e => e.groupTag === '#WomenIgnited' || e.targetAudience === 'women');
  });

  // Modal for Scheduling New Gathering Event
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventScripture, setEventScripture] = useState('Proverbs 31:25–26');
  const [eventFocus, setEventFocus] = useState('');
  const [eventDate, setEventDate] = useState(() => {
    // Default to upcoming Thursday
    const d = new Date();
    const day = d.getDay();
    const diff = (11 - day) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
  });
  const [eventTime, setEventTime] = useState('6:30 PM CST');
  const [eventZoomUrl, setEventZoomUrl] = useState('https://us05web.zoom.us/j/8785161298?pwd=e0zBTD2QHIHfx0AzjzXG7EHQno9Oig.1&omn=85728476365');
  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Sisterhood Roster State
  const [sisterhoodRoster, setSisterhoodRoster] = useState<any[]>([]);
  const rosterMembers = sisterhoodRoster;
  const [rosterSearch, setRosterSearch] = useState('');
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Sister');
  const [newMemberCalling, setNewMemberCalling] = useState('Sisterhood Prayer & Intercession');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberBirthday, setNewMemberBirthday] = useState('');
  const [newMemberResidence, setNewMemberResidence] = useState('San Antonio, TX');
  const [newMemberAvatar, setNewMemberAvatar] = useState('');
  const [isUploadingSisterPhoto, setIsUploadingSisterPhoto] = useState(false);

  const handleSisterModalPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploadingSisterPhoto(true);
    try {
      const base64 = await compressImageFile(file, 420, 420, 0.82);
      if (base64) {
        setNewMemberAvatar(base64);
      }
    } catch (err) {
      console.error('Error compressing sister photo:', err);
    } finally {
      setIsUploadingSisterPhoto(false);
    }
  };

  const handleQuickSelfSisterPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !currentUser) return;
    setIsUploadingSisterPhoto(true);
    try {
      const base64 = await compressImageFile(file, 420, 420, 0.82);
      if (!base64) return;
      const cleanName = (currentUser.fullName || currentUser.name || 'Sister Disciple').trim();
      const cleanEmail = (currentUser.email || '').toLowerCase().trim();
      const targetId = getProfileDocId(cleanEmail, currentUser.id || (currentUser as any).uid);
      await upsertDiscipleProfile({
        email: cleanEmail,
        name: cleanName,
        uid: targetId,
        role: currentUser.role || 'YoungFire Member',
        calling: currentUser.calling || 'Sisterhood Prayer & Intercession',
        gender: 'sister',
        avatarUrl: base64
      });
      localStorage.setItem('youngfire_user_avatar', base64);
      window.dispatchEvent(
        new CustomEvent('yf_disciple_card_updated', {
          detail: { id: targetId, email: cleanEmail, name: cleanName, avatarUrl: base64 }
        })
      );
      setSuccessToast('Your Sisterhood profile photo has been updated!');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error('Error uploading self sister photo:', err);
    } finally {
      setIsUploadingSisterPhoto(false);
    }
  };

  // Live Chat state (Real-Time Firestore on 'women_chat')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newChatText, setNewChatText] = useState('');
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingChatText, setEditingChatText] = useState('');

  useEffect(() => {
    const mapSnapshotToMessages = (docs: any[]): ChatMessage[] => {
      return docs.map(docSnap => {
        const data = docSnap.data({ serverTimestamps: 'estimate' }) as any;
        const formattedTime = formatChatTimestamp(data.createdAt || data.timestamp);
        const resolvedSender = data.senderName || data.sender || 'Sister Disciple';
        const resolvedRole = data.senderRole || data.role || 'YoungFire Member';
        return {
          id: docSnap.id,
          ...data,
          sender: resolvedSender,
          role: resolvedRole,
          avatarText: data.avatarText || resolvedSender.slice(0, 2).toUpperCase(),
          avatarUrl: data.avatarUrl || '',
          text: data.text || '',
          timestamp: formattedTime,
          createdAt: data.createdAt,
          reactions: data.reactions || {}
        } as ChatMessage;
      });
    };

    const sisterhoodRef = collection(db, 'sanctuary_sisterhood_chat');
    const qSisterhood = query(sisterhoodRef, orderBy('createdAt', 'asc'));
    const unsubscribeSisterhood = onSnapshot(qSisterhood, { includeMetadataChanges: true }, (snapshot) => {
      const msgs = mapSnapshotToMessages(snapshot.docs);
      if (msgs.length > 0) {
        setChatMessages(msgs);
      }
    }, (err) => console.warn("Sisterhood chat listener notice:", err?.message || err));

    const messagesRef = collection(db, 'women_chat');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const msgs = mapSnapshotToMessages(snapshot.docs);
      if (msgs.length > 0) {
        setChatMessages(msgs);
      }
    }, (err) => console.warn("Realtime chat notice:", err?.message || err));

    return () => {
      try { unsubscribeSisterhood(); } catch {}
      try { unsubscribe(); } catch {}
    };
  }, []);

  // Reload events from storage
  const reloadEvents = () => {
    const all = getStoredGatheringEvents();
    setGatheringEvents(all.filter(e => e.groupTag === '#WomenIgnited' || e.targetAudience === 'women'));
  };

  useEffect(() => {
    const handleEventsUpdated = () => {
      reloadEvents();
    };
    window.addEventListener('sanctuary_calendar_events_updated', handleEventsUpdated);
    return () => window.removeEventListener('sanctuary_calendar_events_updated', handleEventsUpdated);
  }, []);

  // Real-Time Roster Listener ('sanctuary_disciples')
  useEffect(() => {
    deduplicateSanctuaryDisciples().catch(() => {});
    const disciplesRef = collection(db, 'sanctuary_disciples');
    const q = query(disciplesRef, orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const memberMap = new Map();
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        // Enforce deduplication by email in memory
        const key = (data.email || docSnap.id).toLowerCase().trim();
        if (!memberMap.has(key)) {
          memberMap.set(key, { id: docSnap.id, ...data });
        }
      });

      const disciples = Array.from(memberMap.values());
      const sisterhoodDisciples = disciples.filter((d: any) =>
        d.gender === 'sister' ||
        d.gender === 'female' ||
        ((d.role === 'Lead Facilitator' || d.role === 'Overseer') && d.gender !== 'brother' && d.gender !== 'male') ||
        ['white.whitney91@gmail.com'].includes(d.email?.toLowerCase()?.trim())
      );
      setSisterhoodRoster(sisterhoodDisciples);
    }, (err) => {
      console.warn("Roster sync notice:", err?.message || err);
    });

    return () => unsubscribe();
  }, []);

  // Save Chat to storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('youngfire_chat_threads_v2');
      const parsed = saved ? JSON.parse(saved) : {};
      parsed.women = chatMessages;
      localStorage.setItem('youngfire_chat_threads_v2', JSON.stringify(parsed));
    } catch {}
  }, [chatMessages]);

  // If unauthorized male non-admin user
  if (!isAuthorized) {
    return (
      <div className="bg-[#0a0a0a] border border-rose-500/40 rounded-3xl p-8 text-center space-y-4 shadow-2xl max-w-lg mx-auto my-12 animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 font-bold">
            Access Restricted &bull; Gender Isolation Gate
          </span>
          <h3 className="text-xl font-black uppercase text-white font-['Outfit']">
            Women Ignited Sacred Space
          </h3>
        </div>
        <p className="text-sm font-mono text-rose-300 font-semibold">
          Women Ignited is a sacred space reserved for female disciples and sisterhood facilitators.
        </p>
        <p className="text-xs text-slate-400 leading-relaxed font-serif">
          Brother disciples are warmly encouraged in their dedicated brotherhood cohort: Men On Fire, where armor studies, brotherly accountability, and dedicated reading plans await.
        </p>
        {onBack && (
          <button
            onClick={onBack}
            className="px-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold font-mono text-xs cursor-pointer shadow-lg shadow-rose-500/20 transition-all inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Fellowship Hub</span>
          </button>
        )}
      </div>
    );
  }

  // Handle Create Gathering Event
  const handleCreateGathering = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) {
      setFormError('Event title is required.');
      return;
    }
    if (!eventScripture.trim()) {
      setFormError('Scripture reference is required.');
      return;
    }
    if (!eventFocus.trim()) {
      setFormError('Focus / topic is required.');
      return;
    }
    if (!eventDate) {
      setFormError('Date is required.');
      return;
    }

    const isLeadAdmin = Boolean(
      currentUser?.isAdmin ||
      currentUser?.accountType === 'administrator' ||
      currentUser?.role === 'Administrator' ||
      currentUser?.role === 'Lead Facilitator' ||
      currentUser?.role === 'Overseer' ||
      ['trentwhite0308@gmail.com', 'trentwhitemba@yahoo.com', 'white.whitney91@gmail.com', 'luislopez567@hotmail.com'].includes((currentUser?.email || '').toLowerCase().trim())
    );
    const currentUserId = (currentUser as any)?.id || (currentUser as any)?.uid || currentUser?.email || currentUser?.name || 'guest_sister';

    const newEvt: GatheringEvent = {
      id: `wi_evt_${Date.now()}`,
      title: eventTitle.trim(),
      scriptureRef: eventScripture.trim(),
      focusTopic: eventFocus.trim(),
      dateTime: `${eventDate}T${eventTime.includes('6') ? '18:30' : '19:00'}`,
      date: eventDate,
      time: eventTime.trim() || '6:30 PM CST',
      zoomUrl: eventZoomUrl.trim() || 'https://us05web.zoom.us/j/8785161298?pwd=e0zBTD2QHIHfx0AzjzXG7EHQno9Oig.1&omn=85728476365',
      zoomMeetingId: '878 516 1298',
      zoomPasscode: 'FIRE2026',
      groupTag: '#WomenIgnited',
      targetAudience: 'women',
      createdBy: currentUser?.name || 'Sister Disciple',
      createdById: currentUserId,
      createdRole: currentUser?.role || 'Sisterhood Disciple',
      location: 'Virtual Sanctuary Zoom Bridge & Living Room',
      description: `${eventFocus.trim()} (Scripture: ${eventScripture.trim()}). Consecrated sisterhood gathering for prayer and scripture reflection.`,
      status: isLeadAdmin ? 'active' : 'pending',
      approvalStatus: isLeadAdmin ? 'approved' : 'pending',
      approved: isLeadAdmin
    };

    saveGatheringEvent(newEvt);
    reloadEvents();
    setIsAddEventOpen(false);
    setEventTitle('');
    setEventFocus('');
    setFormError('');
    setSuccessToast(
      isLeadAdmin
        ? `Gathering "${newEvt.title}" scheduled and synchronized to Master Sanctuary Calendar with Rose #WomenIgnited badge!`
        : `Gathering "${newEvt.title}" submitted for Lead Facilitator approval!`
    );
    setTimeout(() => setSuccessToast(null), 5000);
  };

  // Handle Delete Gathering Event
  const handleDeleteGathering = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to remove this sisterhood gathering event from the Sanctuary Calendar?')) {
      deleteGatheringEvent(id);
      reloadEvents();
    }
  };

  // Handle Add Member to Sisterhood Roster
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const cleanName = newMemberName.trim();
    const cleanEmail = newMemberEmail.trim();
    const fallbackUid = `sister_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const targetId = getProfileDocId(cleanEmail, fallbackUid);

    const newDoc: RosterMember = {
      id: targetId,
      fullName: cleanName,
      name: cleanName,
      role: newMemberRole.trim() || 'Sister',
      calling: newMemberCalling.trim() || 'Sisterhood Prayer & Intercession',
      group: 'Women Ignited',
      gender: 'female',
      churchMembership: 'Joshua House of Worship',
      residence: newMemberResidence.trim() || 'San Antonio, TX',
      email: cleanEmail,
      phone: newMemberPhone.trim(),
      birthday: newMemberBirthday.trim(),
      avatar: newMemberAvatar
    };

    const uploadedAvatar = newMemberAvatar;
    setIsAddMemberOpen(false);
    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberPhone('');
    setNewMemberBirthday('');
    setNewMemberAvatar('');

    try {
      await upsertDiscipleProfile({
        email: cleanEmail,
        name: cleanName,
        uid: targetId,
        role: newDoc.role || 'YoungFire Member',
        calling: newDoc.calling || 'Member',
        gender: 'sister',
        avatarUrl: uploadedAvatar,
        residence: newDoc.residence,
        phone: newDoc.phone,
        birthday: newDoc.birthday
      });
    } catch {}

    setSuccessToast(`Sister ${newDoc.fullName} registered to Sisterhood Roster!`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleDeleteMember = async (targetDocId: string) => {
    if (!targetDocId) return;
    try {
      await deleteDoc(doc(db, 'sanctuary_disciples', targetDocId));
      if (currentUser?.id === targetDocId || (currentUser as any)?.uid === targetDocId) {
        localStorage.removeItem('youngfire_auth_session');
        localStorage.removeItem('youngfire_user_doc_id');
        localStorage.removeItem('youngfire_user_avatar');
        sessionStorage.clear();
      }
    } catch {}
  };

  // Handle Send Chat (Instant Real-Time Firestore Sync)
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const messageText = newChatText.trim();
    if (!messageText) return;

    const senderId = currentUser?.id || (currentUser as any)?.uid || 'sister_disciple';
    const senderName = currentUser?.name || (currentUser as any)?.displayName || currentUser?.fullName || 'Sister Disciple';
    const senderRole = currentUser?.role || 'YoungFire Member';
    const avatarUrl = (currentUser as any)?.avatarUrl || currentUser?.avatar || '';

    setNewChatText('');

    try {
      const msgId = doc(collection(db, 'sanctuary_sisterhood_chat')).id;
      const chatPayload = {
        text: messageText,
        senderId,
        senderName,
        sender: senderName,
        senderRole,
        role: senderRole,
        avatarUrl,
        timestamp: Date.now(),
        createdAt: serverTimestamp(),
        reactions: {}
      };
      await Promise.all([
        setDoc(doc(db, 'sanctuary_sisterhood_chat', msgId), chatPayload).catch(() => {}),
        setDoc(doc(db, 'women_chat', msgId), chatPayload).catch(() => {})
      ]);
    } catch (err) {
      console.warn("Realtime chat send notice:", err);
    }
  };

  // Filtered Roster Members
  const filteredRoster = useMemo(() => {
    if (!rosterSearch.trim()) return rosterMembers;
    const q = rosterSearch.toLowerCase();
    return rosterMembers.filter(m => 
      (m.fullName || m.name || '').toLowerCase().includes(q) ||
      (m.calling || '').toLowerCase().includes(q) ||
      (m.role || '').toLowerCase().includes(q) ||
      (m.residence || '').toLowerCase().includes(q)
    );
  }, [rosterMembers, rosterSearch]);

  const [customWomenPlans, setCustomWomenPlans] = useState<ReadingPlan[]>(() => {
    try {
      const savedWomen = localStorage.getItem('youngfire_custom_plans_women');
      if (savedWomen) {
        return JSON.parse(savedWomen);
      }
      const saved = localStorage.getItem('youngfire_custom_reading_plans');
      if (saved) {
        const parsed: ReadingPlan[] = JSON.parse(saved);
        return parsed.filter(p => p.category === 'women');
      }
    } catch {}
    return [];
  });
  const [isCustomPlanModalOpen, setIsCustomPlanModalOpen] = useState(false);

  const womenPlans = useMemo(() => {
    const builtin = READING_PLANS.filter(p => p.category === 'women');
    return [...customWomenPlans, ...builtin];
  }, [customWomenPlans]);

  const handleSaveCustomPlan = (newCustomPlan: CustomReadingPlan) => {
    const mappedPlan: ReadingPlan = {
      id: newCustomPlan.id,
      title: newCustomPlan.title,
      subtitle: newCustomPlan.focusTheme || `${newCustomPlan.totalDays}-Day Sisterhood Blueprint`,
      category: 'women',
      durationDays: newCustomPlan.totalDays,
      badge: `${newCustomPlan.totalDays}-DAY WOMEN IGNITED`,
      description: `Tailored spiritual blueprint by ${newCustomPlan.createdBy}. Focus: ${newCustomPlan.focusTheme || 'Consecrated sisters of virtue, prayer, and daily biblical discipleship.'}`,
      accentColor: 'rose',
      themeScripture: 'Proverbs 31:26 — She openeth her mouth with wisdom; and in her tongue is the law of kindness.',
      days: newCustomPlan.scriptureMilestones.map((m) => ({
        dayNumber: m.day,
        title: m.reading || `Day ${m.day} Milestone`,
        scriptureReference: m.reading || 'Proverbs 31',
        bookId: 'PRO',
        chapter: 31,
        devotionalFocus: m.notes || `Day ${m.day} dedicated focus on ${newCustomPlan.focusTheme || 'Consecration, spiritual virtue, and sisterhood encouragement.'}`,
        keyVerse: 'Proverbs 31:26',
        reflectionPrompt: 'Reflect on how this scripture milestone deepens your daily walk with the Lord and your sisters.',
        practicalAction: 'Take 10 minutes of intentional prayer and apply this truth today.'
      }))
    };

    const updated = [mappedPlan, ...customWomenPlans];
    setCustomWomenPlans(updated);

    try {
      localStorage.setItem('youngfire_custom_plans_women', JSON.stringify(updated));
      const saved = localStorage.getItem('youngfire_custom_reading_plans');
      const allCustom: ReadingPlan[] = saved ? JSON.parse(saved) : [];
      localStorage.setItem('youngfire_custom_reading_plans', JSON.stringify([mappedPlan, ...allCustom]));
    } catch {}

    setSuccessToast(`Plan "${newCustomPlan.title}" published successfully!`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  return (
    <div className="relative space-y-6 animate-fadeIn pb-12">
      {/* STATIONARY BACKGROUND MAP: Stays pinned to screen viewport when scrolling */}
      <SanAntonioVectorMap opacity={0.45} className="fixed inset-0 z-0 pointer-events-none" />
      <div className="relative z-10 space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 rounded-xl bg-[#0a0a0a] border border-white/15 text-slate-200 hover:text-white hover:border-rose-500/40 cursor-pointer transition-all shadow-md"
              title="Return to Fellowship Hub"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30">
                Sisterhood Cohort &bull; Led by Whitney White
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                #WomenIgnited
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-['Outfit'] uppercase text-white tracking-wide mt-1 flex items-center gap-2">
              <span>Women Ignited Sanctuary Hub</span>
              <Heart className="w-5 h-5 text-rose-400" />
            </h2>
          </div>
        </div>

        {/* Quick Action: Schedule Gathering Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddEventOpen(true)}
            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold font-mono text-xs flex items-center gap-1.5 shadow-lg shadow-rose-500/20 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Gathering</span>
          </button>
        </div>
      </div>

      {/* Success Notification Toast */}
      {successToast && (
        <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/60 text-rose-200 text-xs font-mono flex items-center justify-between gap-3 shadow-xl animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <Check className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{successToast}</span>
          </div>
          <button 
            onClick={() => setSuccessToast(null)}
            className="p-1 text-rose-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dynamic Cover Banner with Dark Gradient Scrim */}
      <div className="relative w-full h-44 sm:h-56 rounded-3xl overflow-hidden border border-rose-500/40 shadow-2xl bg-black group">
        <img
          src={womenCover}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/image_2.png';
          }}
          alt="Women Ignited Sisterhood Cover"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          style={{ objectPosition: '50% 25%' }}
        />
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{
            background: 'linear-gradient(180deg, rgba(4, 7, 17, 0.35) 0%, rgba(4, 7, 17, 0.8) 65%, #000000 100%)'
          }}
        />
        <div className="absolute inset-0 p-5 sm:p-6 flex flex-col justify-end">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/25 border border-rose-500/50 text-rose-300 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Heart className="w-3 h-3 text-rose-400" />
              <span>Proverbs 31 Sacred Flame</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-black/60 border border-white/10 text-white/80 font-mono text-[9px]">
              Holy Sisterhood Sanctuary
            </span>
          </div>
          <h3 className="text-lg sm:text-2xl font-black font-['Outfit'] uppercase text-white tracking-wide drop-shadow-md">
            Women Ignited Sisterhood
          </h3>
          <p className="text-xs sm:text-sm text-slate-200 font-serif line-clamp-1 sm:line-clamp-none drop-shadow">
            "Favour is deceitful, and beauty is vain: but a woman that feareth the Lord, she shall be praised." — Proverbs 31:30
          </p>
        </div>
      </div>

      {/* Persistent Women Ignited Zoom HUD Card */}
      <div className="bg-[#0a0a0a] border border-rose-500/40 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 flex-shrink-0 shadow-inner">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase text-rose-400 font-bold block">
                Consecrated Sisterhood Gathering
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold">
                Thursdays @ 6:30 PM CST
              </span>
            </div>
            <p className="text-sm text-white font-mono font-bold mt-0.5">
              Meeting ID: <span className="text-rose-300">878 516 1298</span> &bull; Passcode: <span className="text-rose-300">FIRE2026</span>
            </p>
            <p className="text-xs text-slate-400 font-serif">Living room & video sanctuary bridge with Sister Whitney White</p>
          </div>
        </div>

        <a
          href="https://us05web.zoom.us/j/8785161298?pwd=e0zBTD2QHIHfx0AzjzXG7EHQno9Oig.1&omn=85728476365"
          target="_blank"
          rel="noreferrer"
          className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-black font-['Outfit'] uppercase text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-500/30 self-start sm:self-center cursor-pointer"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Launch Zoom Huddle</span>
        </a>
      </div>

      {/* Sister Hub Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-[#080E21] border border-white/10 rounded-2xl overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'events'
              ? 'bg-rose-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Gathering Events ({gatheringEvents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'roster'
              ? 'bg-rose-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          <div className="font-mono text-xs uppercase tracking-wider">
            SISTERHOOD ROSTER ({sisterhoodRoster.length})
          </div>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'plans'
              ? 'bg-rose-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Reading Plans ({womenPlans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'chat'
              ? 'bg-rose-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Live Chat ({chatMessages.length})</span>
        </button>
      </div>

      {/* TAB 1: GATHERING EVENTS */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div>
              <h3 className="text-base font-black font-['Outfit'] uppercase text-white tracking-wide flex items-center gap-2">
                <Calendar className="w-5 h-5 text-rose-400" />
                <span>Sisterhood Gathering Events</span>
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                Synchronized directly with the Master Fellowship Sanctuary Calendar with Rose <span className="text-rose-400 font-bold">#WomenIgnited</span> badge.
              </p>
            </div>
            <button
              onClick={() => setIsAddEventOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-mono font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Event</span>
            </button>
          </div>

          {gatheringEvents.length === 0 ? (
            <div className="p-8 text-center bg-[#0a0a0a] border border-white/10 rounded-3xl space-y-3">
              <Calendar className="w-10 h-10 text-rose-400/50 mx-auto" />
              <p className="text-sm text-slate-300 font-serif">No custom sisterhood gatherings scheduled yet.</p>
              <button
                onClick={() => setIsAddEventOpen(true)}
                className="px-4 py-2 rounded-xl bg-rose-500 text-slate-950 font-bold text-xs font-mono cursor-pointer"
              >
                + Schedule First Sisterhood Gathering
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gatheringEvents.map((evt) => {
                const scriptureNav = parseScriptureRefToNav(evt.scriptureRef);
                const isLeadAdmin = Boolean(
                  currentUser?.isAdmin ||
                  currentUser?.accountType === 'administrator' ||
                  currentUser?.role === 'Administrator' ||
                  currentUser?.role === 'Lead Facilitator' ||
                  currentUser?.role === 'Overseer' ||
                  ['trentwhite0308@gmail.com', 'trentwhitemba@yahoo.com', 'white.whitney91@gmail.com', 'luislopez567@hotmail.com'].includes((currentUser?.email || '').toLowerCase().trim())
                );
                const currentUserId = (currentUser as any)?.id || (currentUser as any)?.uid || currentUser?.email || currentUser?.name || '';
                const isEventAuthor = Boolean(
                  (currentUserId && evt.createdById && currentUserId === evt.createdById) ||
                  (currentUser?.name && evt.createdBy && currentUser.name.trim().toLowerCase() === evt.createdBy.trim().toLowerCase())
                );
                const isPending = evt.status === 'pending' || evt.approvalStatus === 'pending' || evt.approved === false;

                return (
                  <div
                    key={evt.id}
                    className="p-5 rounded-3xl bg-[#0a0a0a] border border-rose-500/30 hover:border-rose-500/60 transition-all shadow-xl space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold uppercase">
                              {evt.groupTag || '#WomenIgnited'}
                            </span>
                            {isPending && (
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase">
                                Pending Approval
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-slate-400">
                              {evt.date} &bull; {evt.time}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-white font-['Outfit'] mt-1">
                            {evt.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-1">
                          {isPending && isLeadAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                approveGatheringEvent(evt.id);
                                reloadEvents();
                                setSuccessToast(`Approved gathering "${evt.title}"!`);
                                setTimeout(() => setSuccessToast(null), 4000);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold uppercase cursor-pointer flex items-center gap-1"
                              title="Approve Gathering Event"
                            >
                              <Check className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                          )}
                          {(isEventAuthor || isLeadAdmin) && (
                            <button
                              onClick={(e) => handleDeleteGathering(evt.id, e)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Delete Gathering Event"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Scripture Reference Badge with Deep Link */}
                      {evt.scriptureRef && (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-xs font-mono font-bold text-rose-300 flex items-center gap-1.5 bg-rose-950/40 px-2.5 py-1 rounded-xl border border-rose-500/30">
                            <BookOpen className="w-3.5 h-3.5 text-rose-400" />
                            <span>Scripture: {evt.scriptureRef}</span>
                          </span>

                          {scriptureNav && onNavigateToScripture && (
                            <button
                              onClick={() => onNavigateToScripture(scriptureNav.bookId, scriptureNav.chapter)}
                              className="text-[10px] font-mono text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <span>Open in Reader &rarr;</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Focus / Topic */}
                      <div className="p-3 rounded-2xl bg-black/60 border border-white/5 space-y-1">
                        <span className="text-[10px] font-mono uppercase text-rose-400 font-bold block">
                          Focus & Sacred Topic:
                        </span>
                        <p className="text-xs text-slate-200 font-serif leading-relaxed">
                          {evt.focusTopic}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/10 gap-2">
                      <span className="text-[10px] font-mono text-slate-400">
                        Host: {evt.createdBy || 'Whitney White'}
                      </span>

                      <a
                        href={evt.zoomUrl || 'https://us05web.zoom.us/j/8785161298?pwd=e0zBTD2QHIHfx0AzjzXG7EHQno9Oig.1&omn=85728476365'}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Launch Zoom</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SISTERHOOD ROSTER */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Users className="w-5 h-5 text-rose-400" />
                <span>SISTERHOOD ROSTER ({sisterhoodRoster.length})</span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-1">
                Registered female disciples, leadership facilitators, contact directory and kingdom callings.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search sisters..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-[#0a0a0a] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50 w-44 sm:w-56"
                />
              </div>

              {currentUser && !currentUser.isGuest && (
                <label className="px-3 py-1.5 rounded-xl bg-black/80 hover:bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{isUploadingSisterPhoto ? 'Uploading...' : 'Upload My Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQuickSelfSisterPhotoUpload}
                    className="sr-only"
                  />
                </label>
              )}

              <button
                onClick={() => setIsAddMemberOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Register Sister</span>
              </button>
            </div>
          </div>

          {/* 3D Cutout Roster Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 justify-items-center">
            {filteredRoster.map((member) => {
              const ADMIN_EMAILS = [
                'trentwhite0308@gmail.com',
                'trentwhitemba@yahoo.com',
                'white.whitney91@gmail.com',
                'luislopez567@hotmail.com'
              ];
              const isLeadAdmin =
                Boolean(currentUser?.isAdmin) ||
                currentUser?.accountType === 'administrator' ||
                currentUser?.role === 'Administrator' ||
                currentUser?.role === 'Lead Facilitator' ||
                currentUser?.role === 'Overseer' ||
                ADMIN_EMAILS.includes(currentUser?.email?.toLowerCase()?.trim() || '');
              const isAuthorizedMember = Boolean(
                isLeadAdmin ||
                (currentUser?.email &&
                  member.email &&
                  currentUser.email.toLowerCase().trim() === member.email.toLowerCase().trim())
              );
              return (
                <DiscipleCutoutCard
                  key={member.id}
                  member={member}
                  canEdit={isAuthorizedMember}
                  canDelete={Boolean(
                    isAuthorizedMember ||
                    currentUser?.id === member.id ||
                    (currentUser as any)?.uid === member.id
                  )}
                  onDelete={handleDeleteMember}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: READING PLANS */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-rose-400" />
              <h3 className="text-base font-black font-['Outfit'] uppercase text-white tracking-wide">
                Women Ignited Dedicated Reading Plans
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-rose-300 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 font-bold">
                {womenPlans.length} Consecrated Plans
              </span>
              <button
                onClick={() => setIsCustomPlanModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-mono text-xs font-black uppercase flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Plan</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {womenPlans.map(plan => (
              <ReadingPlanCard
                key={plan.id}
                plan={plan}
                onNavigateToScripture={onNavigateToScripture}
                defaultExpanded={true}
              />
            ))}
          </div>

          <CustomPlanCreatorModal
            groupTarget="women"
            isOpen={isCustomPlanModalOpen}
            onClose={() => setIsCustomPlanModalOpen(false)}
            onSavePlan={handleSaveCustomPlan}
          />
        </div>
      )}

      {/* TAB 4: SISTERHOOD LIVE CHAT */}
      {activeTab === 'chat' && (
        <div className="bg-[#0a0a0a] border border-rose-500/30 rounded-3xl p-5 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-400" />
              <span>Women Ignited Sisterhood Chat</span>
              <span className="text-[10px] text-slate-400">({chatMessages.length} Messages)</span>
            </h4>
          </div>

          <div className="h-64 overflow-y-auto space-y-2.5 pr-1">
            {chatMessages.map((msg) => {
              const reactionUserIdentifier =
                currentUser?.email?.toLowerCase().trim() ||
                currentUser?.id ||
                (currentUser as any)?.uid ||
                'sister_disciple';
              const isSenderMatch = Boolean(
                msg.senderId && (currentUser?.id === msg.senderId || (currentUser as any)?.uid === msg.senderId)
              );
              const isAdminUser = Boolean(
                currentUser?.isAdmin ||
                currentUser?.accountType === 'administrator' ||
                currentUser?.role === 'Administrator' ||
                ['trentwhite0308@gmail.com', 'trentwhitemba@yahoo.com', 'white.whitney91@gmail.com', 'jhowyoungfire@gmail.com', 'luislopez567@hotmail.com'].includes((currentUser?.email || '').toLowerCase().trim())
              );

              return (
              <div key={msg.id} className="p-3 bg-black/70 rounded-2xl border border-white/5 text-xs flex items-start gap-3">
                {msg.avatarUrl ? (
                  <img 
                    src={msg.avatarUrl} 
                    alt={msg.sender} 
                    className="w-8 h-8 rounded-full object-cover border border-rose-500/40 flex-shrink-0 mt-0.5" 
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center text-[11px] font-bold font-mono flex-shrink-0 mt-0.5">
                    {msg.avatarText || (msg.sender || 'S').slice(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mb-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <strong className="text-rose-400">{msg.sender}</strong>
                      {msg.role && (
                        <span className="text-[9px] text-slate-400 px-1.5 py-0.2 rounded bg-white/5 border border-white/10">
                          {msg.role}
                        </span>
                      )}
                    </div>
                    <span>{formatChatTimestamp(msg.createdAt || msg.timestamp)}</span>
                  </div>

                  {editingChatId === msg.id && isSenderMatch ? (
                    <div className="flex gap-2 mt-1">
                      <input
                        type="text"
                        value={editingChatText}
                        onChange={(e) => setEditingChatText(e.target.value)}
                        className="flex-1 bg-black border border-rose-400 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                      <button
                        onClick={async () => {
                          if (!isSenderMatch || !editingChatText.trim()) return;
                          const updatedText = editingChatText.trim();
                          setEditingChatId(null);
                          try {
                            await Promise.all([
                              updateDoc(doc(db, 'sanctuary_sisterhood_chat', msg.id), { text: updatedText }).catch(() => {}),
                              updateDoc(doc(db, 'women_chat', msg.id), { text: updatedText }).catch(() => {})
                            ]);
                          } catch (err) {
                            console.warn("Error updating chat message:", err);
                          }
                        }}
                        className="px-3 py-1 bg-rose-500 text-slate-950 font-bold rounded-lg text-[10px] cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingChatId(null)}
                        className="px-2 py-1 bg-white/10 text-slate-300 rounded-lg text-[10px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <p className="text-slate-200 leading-relaxed font-serif select-text whitespace-pre-wrap break-words">{msg.text}</p>
                  )}

                  <ChatReactionAndCopyBar
                    messageId={msg.id}
                    messageText={msg.text}
                    reactions={msg.reactions}
                    userIdentifier={reactionUserIdentifier}
                    accentColor="rose"
                    onToggleReaction={(reactionKey) => {
                      setChatMessages((prev) =>
                        getOptimisticMessageReactions(prev, msg.id, reactionKey, reactionUserIdentifier)
                      );
                      toggleChatReaction('sanctuary_sisterhood_chat', msg.id, reactionKey, reactionUserIdentifier, chatMessages);
                    }}
                  />
                </div>

                {(isSenderMatch || isAdminUser === true) && (
                  <div className="flex items-center gap-1 opacity-60 hover:opacity-100 flex-shrink-0">
                    {isSenderMatch && (
                      <button
                        onClick={() => {
                          if (!isSenderMatch) return;
                          setEditingChatId(msg.id);
                          setEditingChatText(msg.text);
                        }}
                        className="p-1 hover:text-amber-300 cursor-pointer"
                        title="Edit Message"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    )}
                    {(isSenderMatch || isAdminUser === true) && (
                      <button
                        onClick={async () => {
                          if (!isSenderMatch && !(isAdminUser === true)) return;
                          try {
                            await Promise.all([
                              deleteDoc(doc(db, 'sanctuary_sisterhood_chat', msg.id)).catch(() => {}),
                              deleteDoc(doc(db, 'women_chat', msg.id)).catch(() => {})
                            ]);
                          } catch (err) {
                            console.warn("Error deleting chat message:", err);
                          }
                        }}
                        className="p-1 hover:text-rose-400 cursor-pointer"
                        title="Delete Message"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
            })}
          </div>

          <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-white/5">
            <input
              type="text"
              placeholder="Post sisterhood encouragement, verse meditation, or prayer request..."
              value={newChatText}
              onChange={(e) => setNewChatText(e.target.value)}
              className="flex-1 bg-[#000000] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
            />
            <ChatPasteButton
              onPasteText={(pasted) =>
                setNewChatText((prev) => (prev ? `${prev} ${pasted}` : pasted))
              }
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}

      {/* MODAL 1: SCHEDULE SISTERHOOD GATHERING EVENT */}
      {isAddEventOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsAddEventOpen(false)}
        >
          <div 
            className="w-full max-w-lg bg-[#0a0a0a] border border-rose-500/50 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl relative text-white animate-scaleUp"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black font-['Outfit'] uppercase text-white">
                    Schedule Women Ignited Gathering
                  </h3>
                  <span className="text-[10px] font-mono text-rose-400 font-bold">
                    Automatically syncs with Sanctuary Calendar as #WomenIgnited
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setIsAddEventOpen(false)}
                className="p-1.5 rounded-xl bg-[#0a0a0a] border border-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs font-mono">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateGathering} className="space-y-3.5">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-slate-300 font-bold flex items-center justify-between">
                  <span>1. Gathering Title *</span>
                  <span className="text-[10px] text-rose-400">Required</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Proverbs 31 Sacred Flame: Sisterhood Prayer Circle"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full bg-[#000000] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              {/* Scripture Reference */}
              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-slate-300 font-bold flex items-center justify-between">
                  <span>2. Scripture Reference *</span>
                  <span className="text-[10px] text-rose-400">Required &bull; Deep-linked</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Proverbs 31:25–26, Luke 1:45, Esther 4:14, Psalm 46:5"
                  value={eventScripture}
                  onChange={(e) => setEventScripture(e.target.value)}
                  className="w-full bg-[#000000] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  required
                />
                {/* Scripture Quick Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['Proverbs 31:25–26', 'Esther 4:14', 'Luke 1:45', 'Psalm 46:5'].map(ref => (
                    <button
                      type="button"
                      key={ref}
                      onClick={() => setEventScripture(ref)}
                      className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-[10px] font-mono text-slate-300 hover:text-rose-300 border border-white/5 transition-colors cursor-pointer"
                    >
                      {ref}
                    </button>
                  ))}
                </div>
              </div>

              {/* Focus / Topic */}
              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-slate-300 font-bold flex items-center justify-between">
                  <span>3. Focus / Topic *</span>
                  <span className="text-[10px] text-rose-400">Required</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Strength, Dignity, and Living Without Fear of the Future"
                  value={eventFocus}
                  onChange={(e) => setEventFocus(e.target.value)}
                  className="w-full bg-[#000000] border border-white/15 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-slate-300 font-bold">
                    4. Gathering Date *
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full bg-[#000000] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-slate-300 font-bold">
                    5. Time Cadence *
                  </label>
                  <input
                    type="text"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full bg-[#000000] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                    placeholder="e.g. 6:30 PM CST"
                    required
                  />
                </div>
              </div>

              {/* Optional Zoom Meeting URL */}
              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-slate-300 font-bold flex items-center justify-between">
                  <span>6. Zoom Meeting URL</span>
                  <span className="text-[10px] text-slate-400">Optional (Pre-filled)</span>
                </label>
                <input
                  type="url"
                  value={eventZoomUrl}
                  onChange={(e) => setEventZoomUrl(e.target.value)}
                  className="w-full bg-[#000000] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  placeholder="https://us05web.zoom.us/..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddEventOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#0a0a0a] text-slate-400 hover:text-white text-xs font-mono cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold font-mono text-xs flex items-center gap-1.5 shadow-lg shadow-rose-500/20 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Publish to Calendar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTER SISTER TO SISTERHOOD ROSTER */}
      {isAddMemberOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsAddMemberOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-[#0a0a0a] border border-rose-500/50 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl relative text-white animate-scaleUp"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-black font-['Outfit'] uppercase text-white">
                  Register Sister
                </h3>
              </div>
              <button 
                onClick={() => setIsAddMemberOpen(false)}
                className="p-1.5 rounded-xl bg-[#0a0a0a] border border-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3">
              {/* Profile Picture Upload (Mobile & Desktop) */}
              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-black/70 border border-white/10">
                <label
                  className="relative w-14 h-14 rounded-2xl bg-stone-900 border border-rose-500/40 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer"
                  title="Tap to upload photo from Mobile or Desktop"
                >
                  {newMemberAvatar ? (
                    <img src={newMemberAvatar} alt={newMemberName || 'Sister'} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-mono text-sm font-extrabold text-rose-400">
                      {(newMemberName || 'SR').slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <span className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-black border border-rose-400 text-rose-400 flex items-center justify-center">
                    <Camera className="w-2.5 h-2.5" />
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSisterModalPhotoUpload}
                    className="sr-only"
                  />
                </label>
                <div className="flex-1 space-y-1">
                  <div className="text-[11px] font-mono font-bold text-slate-200 uppercase">
                    Sisterhood Cutout / Profile Photo
                  </div>
                  <label className="inline-flex px-3 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-mono text-[10px] font-bold uppercase tracking-wider items-center gap-1.5 cursor-pointer transition-colors">
                    <Camera className="w-3 h-3" />
                    <span>{isUploadingSisterPhoto ? 'Optimizing...' : newMemberAvatar ? 'Change Photo' : 'Upload Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSisterModalPhotoUpload}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-slate-300 font-bold">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Lydia Priscille"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full bg-[#000000] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-slate-300 font-bold">Role</label>
                  <input
                    type="text"
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="w-full bg-[#000000] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-slate-300 font-bold">Birthday (MM-DD)</label>
                  <input
                    type="text"
                    placeholder="06-15"
                    value={newMemberBirthday}
                    onChange={(e) => setNewMemberBirthday(e.target.value)}
                    className="w-full bg-[#000000] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-slate-300 font-bold">Spiritual Calling</label>
                <input
                  type="text"
                  placeholder="e.g. Intercessory Prayer, Praise, Hospitality"
                  value={newMemberCalling}
                  onChange={(e) => setNewMemberCalling(e.target.value)}
                  className="w-full bg-[#000000] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-slate-300 font-bold">Email</label>
                  <input
                    type="email"
                    placeholder="lydia@example.com"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="w-full bg-[#000000] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-slate-300 font-bold">Phone</label>
                  <input
                    type="tel"
                    placeholder="(210) 555-0100"
                    value={newMemberPhone}
                    onChange={(e) => setNewMemberPhone(e.target.value)}
                    className="w-full bg-[#000000] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-slate-300 font-bold">Residence City</label>
                <input
                  type="text"
                  value={newMemberResidence}
                  onChange={(e) => setNewMemberResidence(e.target.value)}
                  className="w-full bg-[#000000] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#0a0a0a] text-slate-400 hover:text-white text-xs font-mono cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold font-mono text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register Sister</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
