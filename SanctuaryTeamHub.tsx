import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Shield, Flame, Search, ChevronLeft, ChevronRight, 
  Sparkles, CheckCircle2, Award, Calendar, BookOpen, Heart, 
  MapPin, Clock, ArrowUpRight, Share2, Filter, X, Edit3, Camera, Check
} from 'lucide-react';
import { CurrentUser } from './SettingsHUDModal';
import { AppTheme } from '../data/appThemes';
import { SanAntonioVectorMap } from './SanAntonioVectorMap';
import { TEAM_HUB_MOSAIC_PHOTOS } from '../data/fellowshipPhotos';
import { db } from '../services/firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { deduplicateSanctuaryDisciples, getProfileDocId, updateDiscipleProfileGlobal } from '../services/profileService';
import { grantAdminByEmail, revokeAdminByEmail } from '../services/authService';
import { DiscipleCutoutCard, getInitials } from './DiscipleCutoutCard';
import { compressImageFile } from '../utils/imageUtils';

interface SanctuaryTeamHubProps {
  currentUser?: CurrentUser | null;
  activeTheme?: AppTheme;
  onNavigateToScripture?: (bookId: string, chapter: number, verse?: number) => void;
  onNavigate?: (tab: string) => void;
  onOpenRosterModal?: () => void;
  [key: string]: any;
}

export interface TeamMember {
  id: string;
  name: string;
  displayName: string;
  role: string;
  positionCode: 'L' | 'F' | 'M' | 'I' | 'B' | 'S' | 'A'; // A = Administrator, L = Lead Overseer, F = Facilitator, M = Media, I = Intercessor, B = Brother, S = Sister
  badgeLabel: string;
  calling: string;
  scriptureAnchor: string;
  cutoutImage: string;
  headshotImage: string;
  avatarUrl?: string;
  email?: string;
  gender?: string;
  outlineColor: string; // Vibrant single-person body contour outline stroke
  streakDays: number;
  chaptersRead: number;
  prayerWatches: number;
  smallGroupAttendance: string;
  residence: string;
  bio: string;
  isRegistered?: boolean;
}

// STRICTLY ONLY TRENTON AND WHITNEY WHITE EXIST INITIALLY (ZERO MOCK MEMBERS)
export const CANONICAL_LEADERSHIP: TeamMember[] = [
  {
    id: 'trent_white',
    name: 'Trenton White',
    displayName: 'TRENTON WHITE',
    role: 'Lead Facilitator / Administrator',
    positionCode: 'A',
    badgeLabel: 'ADMINISTRATOR',
    calling: 'Lead Facilitator / Administrator • Sanctuary Overseer',
    scriptureAnchor: 'Romans 12:1-2',
    cutoutImage: '/IMG_3524.jpg',
    headshotImage: '/IMG_3524.jpg',
    outlineColor: '#F59E0B', // Gold accent
    streakDays: 0,
    chaptersRead: 0,
    prayerWatches: 0,
    smallGroupAttendance: "0 Check-Ins (The White's Residence)",
    residence: 'San Antonio, TX (EST. 2015)',
    bio: 'Lead Facilitator and Executive Administrator stewarding the YoungFire movement at Joshua House of Worship since 2015. Guiding disciples through holiness, biblical literacy, and bold faith.'
  },
  {
    id: 'whitney_white',
    name: 'Whitney White',
    displayName: 'WHITNEY WHITE',
    role: 'Overseer',
    positionCode: 'L',
    badgeLabel: 'OVERSEER',
    calling: 'Lead Facilitator & Overseer • Sanctuary Shepherdess',
    scriptureAnchor: 'Proverbs 31:25-26',
    cutoutImage: '/IMG_3524.jpg',
    headshotImage: '/IMG_3532.jpg',
    outlineColor: '#F59E0B', // Gold accent
    streakDays: 0,
    chaptersRead: 0,
    prayerWatches: 0,
    smallGroupAttendance: "0 Check-Ins (The White's Residence)",
    residence: 'San Antonio, TX (EST. 2015)',
    bio: 'Lead Facilitator and Overseer cultivating authentic sisterhood and spiritual depth across YoungFire young adults. Co-hosting bi-weekly small groups with spiritual discernment and fervent prayer.'
  }
];

export const SanctuaryTeamHub: React.FC<SanctuaryTeamHubProps> = ({
  currentUser,
  activeTheme,
  onNavigateToScripture,
  onNavigate,
  onOpenRosterModal
}) => {
  const accentColor = activeTheme?.accentHex || '#F59E0B';
  const secondaryColor = activeTheme?.secondaryHex || '#EA580C';

  // 3-Way Segmented Control: [ ROSTER ] | [ FAITHFULNESS ] | [ STATS ]
  const [activeSegment, setActiveSegment] = useState<'roster' | 'faithfulness' | 'stats'>('roster');

  const [brotherhoodRoster, setBrotherhoodRoster] = useState<any[]>([]);

  // Real-Time Firestore Listener ('sanctuary_disciples') with Email Deduplication
  useEffect(() => {
    deduplicateSanctuaryDisciples().catch(() => {});
    const disciplesRef = collection(db, 'sanctuary_disciples');
    // Order by latest activity, or query by gender filter
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

      const uniqueMembers = Array.from(memberMap.values());
      setBrotherhoodRoster(uniqueMembers);
    }, (err) => {
      console.error("Roster sync error:", err);
    });

    return () => unsubscribe();
  }, []);

  const teamMembers: TeamMember[] = brotherhoodRoster.map((m: any, idx: number): TeamMember => {
    const emailLower = (m.email || '').toLowerCase().trim();
    const roleLower = (m.role || '').toLowerCase();
    const nameLower = (m.name || m.fullName || '').toLowerCase();
    const isWhitney = ['white.whitney91@gmail.com'].includes(emailLower) || nameLower.includes('whitney white');
    const isFemale =
      m.gender === 'sister' ||
      m.gender === 'female' ||
      isWhitney;
    const isMale = !isFemale;
    const isOverseer =
      roleLower === 'overseer' ||
      roleLower.includes('overseer') ||
      isWhitney;
    const isLeadFacilitator =
      m.isAdmin ||
      m.accountType === 'administrator' ||
      roleLower === 'lead facilitator' ||
      roleLower.includes('lead facilitator') ||
      roleLower.includes('admin') ||
      ['trentwhite0308@gmail.com', 'trentwhitemba@yahoo.com', 'white.whitney91@gmail.com', 'luislopez567@hotmail.com'].includes(emailLower);
    const isLeader = isLeadFacilitator || isOverseer;
    const rawAvatar = m.avatarUrl || '';
    return {
      id: m.id || `reg_disciple_${idx}`,
      name: m.name || m.fullName || 'Sanctuary Disciple',
      displayName: (m.name || m.fullName || 'SANCTUARY DISCIPLE').toUpperCase(),
      email: m.email || '',
      gender: isFemale ? 'sister' : 'brother',
      role: isWhitney && (!m.role || m.role === 'YoungFire Member' || m.role === 'Administrator') ? 'Overseer' : (m.role || 'YoungFire Member'),
      positionCode: (isLeader ? 'L' : isMale ? 'B' : 'S') as any,
      badgeLabel: isOverseer ? 'OVERSEER' : isLeadFacilitator ? 'LEAD FACILITATOR' : (isMale ? 'BROTHER' : 'SISTER'),
      calling: m.calling || (isWhitney ? 'Sanctuary Leadership & Overseer' : 'Member'),
      scriptureAnchor: m.scriptureAnchor || (isWhitney ? 'Proverbs 31:25-26' : isLeader ? 'Romans 12:1-2' : 'Ephesians 4:16'),
      avatarUrl: rawAvatar,
      cutoutImage: rawAvatar,
      headshotImage: rawAvatar,
      outlineColor: m.outlineColor || (isLeader ? '#F59E0B' : isMale ? '#06B6D4' : '#14B8A6'),
      streakDays: m.streakDays || 0,
      chaptersRead: m.chaptersRead || 0,
      prayerWatches: m.prayerWatches || 0,
      smallGroupAttendance: m.smallGroupAttendance || "0 Check-Ins (The White's Residence)",
      residence: m.residence || 'San Antonio, TX',
      bio: m.bio || 'Faithful consecrated disciple growing in the word and assembly at Joshua House of Worship.',
      isRegistered: true
    };
  });

  const handleDeleteDisciple = async (targetDocId: string) => {
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

  // Selected Member for Highlight & Modal
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [selectedMemberModal, setSelectedMemberModal] = useState<TeamMember | null>(null);
  const [isEditingCardModal, setIsEditingCardModal] = useState(false);
  const [cardEditName, setCardEditName] = useState('');
  const [cardEditEmail, setCardEditEmail] = useState('');
  const [cardEditGender, setCardEditGender] = useState<'brother' | 'sister'>('brother');
  const [cardEditRole, setCardEditRole] = useState('YoungFire Member');
  const [cardEditCalling, setCardEditCalling] = useState('Member');
  const [cardEditScripture, setCardEditScripture] = useState('Ephesians 4:16');
  const [cardEditResidence, setCardEditResidence] = useState('San Antonio, TX');
  const [cardEditBio, setCardEditBio] = useState('');
  const [cardEditChapters, setCardEditChapters] = useState(0);
  const [cardEditStreak, setCardEditStreak] = useState(0);
  const [cardEditHuddles, setCardEditHuddles] = useState(0);
  const [cardNewAvatarBase64, setCardNewAvatarBase64] = useState('');
  const [isSavingCardModal, setIsSavingCardModal] = useState(false);
  const [isUploadingTeamPhoto, setIsUploadingTeamPhoto] = useState(false);

  useEffect(() => {
    if (selectedMemberModal) {
      setIsEditingCardModal(false);
      setCardEditName(selectedMemberModal.name || '');
      setCardEditEmail(selectedMemberModal.email || '');
      setCardEditGender(selectedMemberModal.gender === 'sister' ? 'sister' : 'brother');
      setCardEditRole(selectedMemberModal.role || 'YoungFire Member');
      setCardEditCalling(selectedMemberModal.calling || 'Member');
      setCardEditScripture(selectedMemberModal.scriptureAnchor || 'Ephesians 4:16');
      setCardEditResidence(selectedMemberModal.residence || 'San Antonio, TX');
      setCardEditBio(selectedMemberModal.bio || '');
      setCardEditChapters(selectedMemberModal.chaptersRead || 0);
      setCardEditStreak(selectedMemberModal.streakDays || 0);
      setCardEditHuddles(selectedMemberModal.prayerWatches || 0);
      setCardNewAvatarBase64('');
    }
  }, [selectedMemberModal]);

  const handleCardModalPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploadingTeamPhoto(true);
    try {
      const base64 = await compressImageFile(file, 420, 420, 0.82);
      if (base64) {
        setCardNewAvatarBase64(base64);
        if (selectedMemberModal) {
          const cleanName = (cardEditName || selectedMemberModal.name || 'Sanctuary Disciple').trim();
          const cleanEmail = (cardEditEmail || selectedMemberModal.email || '').toLowerCase().trim();
          const fallbackId = `disciple_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          const docId = selectedMemberModal.id || getProfileDocId(cleanEmail, fallbackId);
          const updatedPayload: Record<string, any> = {
            id: docId,
            name: cleanName,
            email: cleanEmail,
            gender: cardEditGender || (selectedMemberModal.gender === 'sister' ? 'sister' : 'brother'),
            role: cardEditRole || selectedMemberModal.role || 'YoungFire Member',
            calling: cardEditCalling || selectedMemberModal.calling || 'Member',
            avatarUrl: base64,
            avatar: base64,
            updatedAt: Date.now()
          };
          await updateDiscipleProfileGlobal(cleanEmail, docId, updatedPayload);
          setSelectedMemberModal((prev) =>
            prev ? { ...prev, avatarUrl: base64, cutoutImage: base64, headshotImage: base64 } : prev
          );
          try {
            window.dispatchEvent(new CustomEvent('yf_disciple_card_updated', { detail: updatedPayload }));
          } catch {}
        }
      }
    } catch (err) {
      console.error('Error compressing photo in Team Hub modal:', err);
    } finally {
      setIsUploadingTeamPhoto(false);
    }
  };

  const handleQuickMemberPhotoUpload = async (
    target: { id?: string; name?: string; email?: string; gender?: string; role?: string; calling?: string } | null,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const resolvedTarget = target || (currentUser ? {
      id: currentUser.id || (currentUser as any).uid,
      name: currentUser.fullName || currentUser.name || 'Sanctuary Disciple',
      email: currentUser.email || '',
      gender: currentUser.gender === 'female' || currentUser.gender === 'sister' ? 'sister' : 'brother',
      role: currentUser.role || 'YoungFire Member',
      calling: currentUser.calling || 'Member'
    } : null);

    if (!resolvedTarget) return;

    setIsUploadingTeamPhoto(true);
    try {
      const base64 = await compressImageFile(file, 420, 420, 0.82);
      if (!base64) return;

      const cleanName = (resolvedTarget.name || 'Sanctuary Disciple').trim();
      const cleanEmail = (resolvedTarget.email || '').toLowerCase().trim();
      const fallbackId = `disciple_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const docId = resolvedTarget.id || getProfileDocId(cleanEmail, fallbackId);

      const updatedPayload: Record<string, any> = {
        id: docId,
        name: cleanName,
        email: cleanEmail,
        gender: resolvedTarget.gender === 'sister' || resolvedTarget.gender === 'female' ? 'sister' : 'brother',
        role: resolvedTarget.role || 'YoungFire Member',
        calling: resolvedTarget.calling || 'Member',
        avatarUrl: base64,
        avatar: base64,
        updatedAt: Date.now()
      };

      await updateDiscipleProfileGlobal(cleanEmail, docId, updatedPayload);

      setBrotherhoodRoster((prev) =>
        prev.map((m: any) =>
          m.id === docId || (cleanEmail && m.email?.toLowerCase()?.trim() === cleanEmail)
            ? { ...m, avatarUrl: base64 }
            : m
        )
      );

      setSelectedMemberModal((prev) =>
        prev && (prev.id === docId || (cleanEmail && prev.email?.toLowerCase()?.trim() === cleanEmail))
          ? { ...prev, avatarUrl: base64, cutoutImage: base64, headshotImage: base64 }
          : prev
      );
      setCardNewAvatarBase64(base64);

      try {
        const activeDocId = localStorage.getItem('youngfire_user_doc_id');
        const rawAuth = localStorage.getItem('youngfire_auth_session');
        const parsedAuth = rawAuth ? JSON.parse(rawAuth) : null;
        if (
          activeDocId === docId ||
          (parsedAuth && (parsedAuth.id === docId || (cleanEmail && parsedAuth.email?.toLowerCase()?.trim() === cleanEmail)))
        ) {
          localStorage.setItem('youngfire_auth_session', JSON.stringify({ ...parsedAuth, id: docId, ...updatedPayload }));
          localStorage.setItem('youngfire_user_avatar', base64);
        }
        window.dispatchEvent(new CustomEvent('yf_disciple_card_updated', { detail: updatedPayload }));
      } catch {}
    } catch (err) {
      console.error('Error uploading quick member photo in Team Hub:', err);
    } finally {
      setIsUploadingTeamPhoto(false);
    }
  };

  const handleSaveSelectedMemberCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberModal) return;
    setIsSavingCardModal(true);
    try {
      const ADMIN_EMAILS = [
        'trentwhite0308@gmail.com',
        'trentwhitemba@yahoo.com',
        'white.whitney91@gmail.com',
        'luislopez567@hotmail.com'
      ];
      const isAdmin =
        Boolean(currentUser?.isAdmin) ||
        currentUser?.accountType === 'administrator' ||
        currentUser?.role === 'Administrator' ||
        currentUser?.role === 'Lead Facilitator' ||
        ADMIN_EMAILS.includes(currentUser?.email?.toLowerCase()?.trim() || '');

      const cleanEmail = cardEditEmail.toLowerCase().trim();
      const docId = selectedMemberModal.id || getProfileDocId(cleanEmail, selectedMemberModal.id);
      const preservedAvatar = cardNewAvatarBase64 || selectedMemberModal.avatarUrl || '';

      const resolvedRole = isAdmin ? (cardEditRole || 'YoungFire Member') : (selectedMemberModal.role || 'YoungFire Member');
      const isRoleAdmin =
        resolvedRole === 'Administrator' ||
        resolvedRole === 'Lead Facilitator' ||
        resolvedRole === 'Overseer' ||
        ADMIN_EMAILS.includes(cleanEmail);

      const updatedPayload: Record<string, any> = {
        id: docId,
        name: cardEditName.trim() || 'Sanctuary Disciple',
        email: cleanEmail,
        gender: cardEditGender,
        role: resolvedRole,
        isAdmin: isRoleAdmin,
        accountType: isRoleAdmin ? 'administrator' : 'member',
        calling: cardEditCalling.trim() || 'Member',
        scriptureAnchor: cardEditScripture.trim() || 'Ephesians 4:16',
        residence: cardEditResidence.trim() || 'San Antonio, TX',
        bio: cardEditBio.trim(),
        chaptersRead: Number(cardEditChapters) || 0,
        streakDays: Number(cardEditStreak) || 0,
        prayerWatches: Number(cardEditHuddles) || 0,
        avatarUrl: preservedAvatar,
        avatar: preservedAvatar,
        updatedAt: Date.now()
      };

      await updateDiscipleProfileGlobal(cleanEmail, docId, updatedPayload);

      if (isAdmin && cleanEmail) {
        if (isRoleAdmin) {
          await grantAdminByEmail(cleanEmail, cardEditName.trim(), docId);
        } else if (!ADMIN_EMAILS.includes(cleanEmail)) {
          await revokeAdminByEmail(cleanEmail, docId);
        }
      }

      try {
        const activeDocId = localStorage.getItem('youngfire_user_doc_id');
        const rawAuth = localStorage.getItem('youngfire_auth_session');
        const parsedAuth = rawAuth ? JSON.parse(rawAuth) : null;
        if (
          activeDocId === docId ||
          (parsedAuth && (parsedAuth.id === docId || (cleanEmail && parsedAuth.email?.toLowerCase()?.trim() === cleanEmail)))
        ) {
          localStorage.setItem('youngfire_auth_session', JSON.stringify({ id: docId, ...updatedPayload }));
          if (preservedAvatar) {
            localStorage.setItem('youngfire_user_avatar', preservedAvatar);
          }
          localStorage.setItem('youngfire_user_name', updatedPayload.name);
        }
        window.dispatchEvent(new CustomEvent('yf_disciple_card_updated', { detail: updatedPayload }));
      } catch {}

      setSelectedMemberModal((prev) =>
        prev
          ? {
              ...prev,
              ...updatedPayload,
              displayName: updatedPayload.name.toUpperCase(),
              cutoutImage: preservedAvatar,
              headshotImage: preservedAvatar
            }
          : null
      );
      setIsEditingCardModal(false);
    } catch (err) {
      console.error('Error saving disciple card:', err);
    } finally {
      setIsSavingCardModal(false);
    }
  };

  useEffect(() => {
    if (teamMembers.length > 0 && !selectedMember) {
      setSelectedMember(teamMembers[0]);
    }
  }, [teamMembers, selectedMember]);

  // Roster Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState<'ALL' | 'L' | 'B' | 'S'>('ALL');

  // Featured Member Carousel State & Touch Swipe Engine
  const [featuredIndex, setFeaturedIndex] = useState<number>(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchCurrentX = useRef<number>(0);

  // Synchronize carousel slide scroll when featuredIndex changes
  useEffect(() => {
    if (carouselRef.current && carouselRef.current.children[featuredIndex]) {
      const slide = carouselRef.current.children[featuredIndex] as HTMLElement;
      slide.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
    const mem = teamMembers[featuredIndex];
    if (mem) {
      setSelectedMember(prev => (prev?.id === mem.id ? prev : mem));
    }
  }, [featuredIndex, teamMembers]);

  // Touch gesture listeners tracking deltaX
  const handleCarouselTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
  };

  const handleCarouselTouchMove = (e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
  };

  const handleCarouselTouchEnd = () => {
    const deltaX = touchCurrentX.current - touchStartX.current;
    if (deltaX < -40) {
      // Swipe Left: advances to next featured member
      setFeaturedIndex(prev => (prev + 1) % teamMembers.length);
    } else if (deltaX > 40) {
      // Swipe Right: returns to previous featured member
      setFeaturedIndex(prev => (prev - 1 + teamMembers.length) % teamMembers.length);
    }
  };

  const handlePrevMember = () => {
    setFeaturedIndex(prev => (prev - 1 + teamMembers.length) % teamMembers.length);
  };

  const handleNextMember = () => {
    setFeaturedIndex(prev => (prev + 1) % teamMembers.length);
  };

  // Strict Brotherhood & Sisterhood Categorization
  const brotherhoodDisciples = teamMembers.filter((d) =>
    (d.gender === 'brother' ||
      d.role === 'Lead Facilitator' ||
      d.role === 'Overseer' ||
      ['trentwhite0308@gmail.com', 'trentwhitemba@yahoo.com'].includes(d.email?.toLowerCase()?.trim() || '')) &&
    d.gender !== 'sister' &&
    !['white.whitney91@gmail.com'].includes(d.email?.toLowerCase()?.trim() || '')
  );

  const sisterhoodDisciples = teamMembers.filter((d) =>
    d.gender === 'sister' ||
    ((d.role === 'Lead Facilitator' || d.role === 'Overseer') && d.gender === 'sister') ||
    ['white.whitney91@gmail.com'].includes(d.email?.toLowerCase()?.trim() || '')
  );

  // Filtered Roster
  const filteredRoster = teamMembers.filter((m) => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.calling.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPosition =
      positionFilter === 'ALL'
        ? true
        : positionFilter === 'B'
        ? brotherhoodDisciples.some(b => b.id === m.id)
        : positionFilter === 'S'
        ? sisterhoodDisciples.some(s => s.id === m.id)
        : m.positionCode === 'L' || m.role === 'Lead Facilitator' || m.role === 'Overseer';
    return matchesSearch && matchesPosition;
  });

  return (
    <div className="relative min-h-screen text-slate-100 pb-28 font-['Outfit'] select-none">
      
      {/* 0. Restored Full-Screen Map Backdrop: Real Dark-Mode San Antonio Road Geometry */}
      <SanAntonioVectorMap opacity={0.55} className="fixed inset-0 z-0 pointer-events-none" />

      {/* 1. Header Title: "Team" clean & centered at top, matching Spurs app */}
      <div className="relative z-10 text-center pt-4 pb-2">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-['Barlow_Condensed'] font-black tracking-wider uppercase text-white drop-shadow-md">
          Team
        </h1>
      </div>

      {/* 2. Top Team Hub Collage: EXTENDS AS WIDE AS SCREEN WITH NO BORDER */}
      {/* Touch Grab & Swiped scrolling pathway where all members stand close together */}
      <div className="relative w-full overflow-hidden bg-[#000000] select-none border-none shadow-[0_20px_60px_rgba(0,0,0,0.95)] z-10">
        
        {/* Top Spurs-Style Repeating Text Ticker Bar */}
        <div className="absolute top-0 inset-x-0 h-7 bg-black/80 border-b border-white/10 z-10 flex items-center overflow-hidden pointer-events-none">
          <div className="whitespace-nowrap font-mono text-[10px] tracking-[0.25em] text-slate-400 uppercase flex items-center gap-6 px-4 animate-none opacity-80">
            <span>YOUNGFIRE SANCTUARY</span>
            <span>&bull;</span>
            <span className="text-amber-400 font-bold">EST. 2015</span>
            <span>&bull;</span>
            <span>JOSHUA HOUSE OF WORSHIP</span>
            <span>&bull;</span>
            <span className="text-amber-400 font-bold">ACTS 2:42</span>
            <span>&bull;</span>
            <span>LEAD FACILITATORS TRENT &amp; WHITNEY WHITE</span>
            <span>&bull;</span>
            <span>SAN ANTONIO, TX</span>
            <span>&bull;</span>
            <span className="text-amber-400 font-bold">EST. 2015</span>
          </div>
        </div>

        {/* Background Layer: High-Contrast Black & White Authentic Fellowship Mosaic with Solid Black Borders */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-black">
          <div className="grid grid-cols-4 sm:grid-cols-8 h-full w-full gap-0">
            {TEAM_HUB_MOSAIC_PHOTOS.map((photoUrl, idx) => (
              <div key={idx} className="relative h-full w-full overflow-hidden border-2 border-black rounded-none bg-black">
                <img 
                  src={photoUrl} 
                  alt="" 
                  className="w-full h-full object-cover object-center rounded-none filter grayscale contrast-125 brightness-95 transition-transform duration-500 hover:scale-105" 
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/IMG_3520.jpg';
                  }}
                />
              </div>
            ))}
          </div>

          {/* Obsidian Gradient Scrims: Balanced so B&W mosaic photos shine through cleanly */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/30 pointer-events-none" />
        </div>

        {/* Foreground Layer: ACTIVE CSS SCROLL-SNAP CAROUSEL & SWIPE ENGINE OR ZERO-MEMBER EMPTY STATE */}
        {teamMembers.length === 0 ? (
          <div className="relative z-20 w-full max-w-xl mx-auto py-16 px-6 text-center flex flex-col items-center justify-center space-y-4">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center border-2 bg-black/85 backdrop-blur-md shadow-2xl animate-pulse"
              style={{ borderColor: accentColor }}
            >
              <Users className="w-8 h-8" style={{ color: accentColor }} />
            </div>
            <div className="space-y-1">
              <span className="text-xs sm:text-sm font-mono tracking-[0.25em] text-amber-400 font-bold uppercase block">
                SANCTUARY ROSTER STANDING READY &bull; AWAITING DISCIPLE CHECK-IN &amp; CONSECRATION
              </span>
              <p className="text-xs font-mono text-slate-300 max-w-md mx-auto">
                No active placeholder profiles. Real disciples and facilitators will be recorded here dynamically upon official check-in and photo submission.
              </p>
            </div>
            {onOpenRosterModal && (
              <button
                onClick={onOpenRosterModal}
                className="px-5 py-2.5 rounded-full font-['Barlow_Condensed'] font-black text-sm tracking-wider uppercase bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                <span>CHECK IN / REGISTER DISCIPLE</span>
              </button>
            )}
          </div>
        ) : (
          <div 
            ref={carouselRef}
            onTouchStart={handleCarouselTouchStart}
            onTouchMove={handleCarouselTouchMove}
            onTouchEnd={handleCarouselTouchEnd}
            className="relative z-20 flex overflow-x-auto snap-x snap-mandatory no-scrollbar touch-pan-x select-none items-end pt-12 pb-5 w-full cursor-grab active:cursor-grabbing"
            style={{ scrollBehavior: 'smooth' }}
          >
            {teamMembers.map((member, index) => {
              const isSelected = selectedMember?.id === member.id || index === featuredIndex;
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
                ADMIN_EMAILS.includes(currentUser?.email?.toLowerCase()?.trim() || '');
              const isAuthorizedMember = Boolean(
                isLeadAdmin ||
                (currentUser?.email &&
                  member.email &&
                  currentUser.email.toLowerCase().trim() === member.email.toLowerCase().trim())
              );
              
              return (
                <div
                  key={member.id}
                  onClick={() => {
                    setFeaturedIndex(index);
                    setSelectedMember(member);
                    setSelectedMemberModal(member);
                  }}
                  className="snap-center flex-shrink-0 w-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group"
                >
                  {/* Individual Member Cutout or Monogram Fallback */}
                  <div className="relative w-52 sm:w-64 md:w-80 h-72 sm:h-84 md:h-96 flex items-center justify-center select-none pointer-events-none">
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 w-44 h-44 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-all" />
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.name}
                        className="w-full h-full object-contain object-bottom pointer-events-none transition-all duration-300 group-hover:scale-105"
                        style={{
                          filter: `drop-shadow(0 12px 24px rgba(0,0,0,0.85)) drop-shadow(2px 0 0 ${member.outlineColor}) drop-shadow(-2px 0 0 ${member.outlineColor}) drop-shadow(0 2px 0 ${member.outlineColor}) drop-shadow(0 -2px 0 ${member.outlineColor}) drop-shadow(0 0 16px ${member.outlineColor}80)`
                        }}
                      />
                    ) : (
                      <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-3xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center border-2 border-amber-300/40 shadow-[0_0_35px_rgba(245,158,11,0.5)] group-hover:scale-105 transition-transform duration-300">
                        <span className="font-mono text-4xl sm:text-5xl font-extrabold text-black tracking-wider">
                          {getInitials(member.name)}
                        </span>
                      </div>
                    )}

                    {/* Active Selection Glow Ring at bottom */}
                    {isSelected && (
                      <div 
                        className="absolute -bottom-1 w-32 sm:w-44 h-3 rounded-full blur-sm animate-pulse"
                        style={{ backgroundColor: member.outlineColor }}
                      />
                    )}

                    {/* Direct Mobile & Desktop Photo Upload Badge on Featured Stage (Authorized Only) */}
                    {isAuthorizedMember && (
                      <label
                        onClick={(e) => e.stopPropagation()}
                        className="pointer-events-auto absolute bottom-3 right-3 z-30 px-2.5 py-1.5 rounded-full bg-black/85 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-400/60 shadow-lg flex items-center gap-1.5 cursor-pointer transition-all"
                        title={`Upload / Change Photo for ${member.name}`}
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span className="font-mono text-[9px] font-bold uppercase tracking-wider">Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleQuickMemberPhotoUpload(member, e)}
                          className="sr-only"
                        />
                      </label>
                    )}
                  </div>

                  {/* Hand-Drawn / Curved Arrow pointing up to the body & Bold Athletic Name */}
                  <div className="flex flex-col items-center mt-2 -space-y-0.5 z-30">
                    {/* Curved arrow matching Spurs app */}
                    <svg 
                      className="w-6 h-6 transition-transform duration-300 group-hover:-translate-y-1"
                      style={{ color: isSelected ? member.outlineColor : '#FFFFFF' }}
                      viewBox="0 0 24 24" 
                      fill="none"
                    >
                      <path 
                        d="M7 17C10 15 15 12 18 6M18 6H11M18 6V13" 
                        stroke="currentColor" 
                        strokeWidth="2.75" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        />
                    </svg>

                    {/* All-Caps Condensed Athletic Name */}
                    <span className={`font-['Barlow_Condensed'] font-black text-2xl sm:text-3xl tracking-wider uppercase whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] transition-colors ${
                      isSelected ? 'text-white' : 'text-slate-100 group-hover:text-white'
                    }`}>
                      {member.displayName}
                    </span>

                    {/* Spiritual Calling and Ministry Role */}
                    <div className="flex flex-col items-center mt-1 space-y-0.5">
                      <span 
                        className="text-[9px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded"
                        style={{ 
                          backgroundColor: `${member.outlineColor}25`, 
                          color: member.outlineColor,
                          border: `1px solid ${member.outlineColor}50`
                        }}
                      >
                        {member.badgeLabel}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-300 tracking-tight max-w-[240px] text-center truncate">
                        {member.calling}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* 3. Below Collage: Responsive Controls & Roster List */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-5 space-y-5">
        
        {/* 3-Way Segmented Control: [ ROSTER ] | [ FAITHFULNESS ] | [ STATS ] (Spurs Stadium Pill Buttons) */}
        <div className="p-1.5 rounded-full bg-black/85 border border-white/15 max-w-md mx-auto grid grid-cols-3 gap-1 shadow-2xl backdrop-blur-xl">
          <button
            onClick={() => setActiveSegment('roster')}
            className={`py-2 px-3 rounded-full font-['Barlow_Condensed'] font-black text-sm tracking-widest uppercase transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSegment === 'roster'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/30 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>ROSTER</span>
          </button>

          <button
            onClick={() => setActiveSegment('faithfulness')}
            className={`py-2 px-3 rounded-full font-['Barlow_Condensed'] font-black text-sm tracking-widest uppercase transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSegment === 'faithfulness'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/30 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>FAITHFULNESS</span>
          </button>

          <button
            onClick={() => setActiveSegment('stats')}
            className={`py-2 px-3 rounded-full font-['Barlow_Condensed'] font-black text-sm tracking-widest uppercase transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSegment === 'stats'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/30 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>STATS</span>
          </button>
        </div>

        {/* Spurs App Callout: "TAP A MEMBER TO VIEW THEIR STATS" with Triple-Color Accent Bar (Render only when members exist) */}
        {teamMembers.length > 0 && (
          <div className="text-center pt-1 pb-1 space-y-2">
            <p className="font-['Outfit'] italic font-bold tracking-widest text-sm sm:text-base text-cyan-400 drop-shadow">
              TAP A MEMBER TO VIEW THEIR STATS
            </p>
            
            {/* Triple-Color Accent Divider Bar matching Spurs Fiesta/City Edition */}
            <div className="w-48 sm:w-64 h-1 mx-auto rounded-full bg-gradient-to-r from-orange-500 via-pink-500 to-teal-400 shadow-sm" />
            
            {/* Active SWIPE Action Controller with Animated Arrows & Dynamic Index Pips */}
            <div className="flex flex-col items-center justify-center gap-2 pt-2">
              <div className="flex items-center justify-center gap-2 sm:gap-4 text-xs font-mono tracking-widest text-slate-300 uppercase">
                <button
                  onClick={handlePrevMember}
                  className="py-1 px-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-amber-400 hover:text-white transition-all cursor-pointer flex items-center gap-1 active:scale-95 border border-white/10"
                  title="Previous Member (Swipe Right)"
                >
                  <ChevronLeft className="w-4 h-4 animate-pulse text-amber-400" />
                  <span className="hidden sm:inline text-[10px] font-bold">&lt;&lt; PREV</span>
                </button>

                <div className="text-amber-400 font-black tracking-[0.25em] flex items-center gap-1.5 font-['Outfit'] select-none px-2">
                  <span className="opacity-70">&lt;&lt;&lt;&lt;&lt;</span>
                  <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 bg-clip-text text-transparent text-sm sm:text-base font-extrabold animate-pulse">
                    SWIPE
                  </span>
                  <span className="opacity-70">&gt;&gt;&gt;&gt;&gt;</span>
                </div>

                <button
                  onClick={handleNextMember}
                  className="py-1 px-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-amber-400 hover:text-white transition-all cursor-pointer flex items-center gap-1 active:scale-95 border border-white/10"
                  title="Next Member (Swipe Left)"
                >
                  <span className="hidden sm:inline text-[10px] font-bold">NEXT &gt;&gt;</span>
                  <ChevronRight className="w-4 h-4 animate-pulse text-amber-400" />
                </button>
              </div>

              {/* Dynamic Index Pips beneath <<<<< SWIPE >>>>> */}
              <div className="flex items-center justify-center gap-1.5 pt-1">
                {teamMembers.map((m, idx) => {
                  const isActive = idx === featuredIndex;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setFeaturedIndex(idx);
                        setSelectedMember(m);
                      }}
                      className={`transition-all duration-300 rounded-full cursor-pointer ${
                        isActive
                          ? 'w-6 h-2 bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]'
                          : 'w-2 h-2 bg-white/20 hover:bg-white/40'
                      }`}
                      title={`View ${m.name} (${idx + 1}/${teamMembers.length})`}
                      aria-label={`View ${m.name}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: ROSTER VIEW */}
        {activeSegment === 'roster' && (
          <div className="space-y-4">
            {/* Dynamic Roster Count Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-4">
                <div className="font-mono text-xs uppercase tracking-wider text-slate-200">
                  BROTHERHOOD ROSTER ({brotherhoodDisciples.length})
                </div>
                <div className="font-mono text-xs uppercase tracking-wider text-slate-200">
                  SISTERHOOD ROSTER ({sisterhoodDisciples.length})
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {currentUser && !currentUser.isGuest && (
                  <label
                    className="px-3 py-1 rounded-lg bg-black/85 hover:bg-amber-500/20 text-amber-300 border border-amber-400/50 font-mono text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors flex items-center gap-1.5"
                    title="Upload your profile picture from Mobile or Desktop"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isUploadingTeamPhoto ? 'Uploading...' : 'Upload My Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleQuickMemberPhotoUpload(null, e)}
                      className="sr-only"
                    />
                  </label>
                )}
                {onOpenRosterModal && (
                  <button
                    onClick={onOpenRosterModal}
                    className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    + Manage Roster
                  </button>
                )}
              </div>
            </div>
            
            {/* Search & Role Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-[#000000]/90 border border-white/10 backdrop-blur-md">
              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search leadership & members..."
                  className="w-full pl-9 pr-3 py-1.5 bg-[#0a0a0a] border border-white/15 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Position Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
                {(['ALL', 'L', 'B', 'S'] as const).map((pos) => {
                  const labels: Record<string, string> = {
                    ALL: 'All',
                    L: 'Overseer',
                    B: 'Brother',
                    S: 'Sister'
                  };
                  return (
                    <button
                      key={pos}
                      onClick={() => setPositionFilter(pos)}
                      className={`px-3 py-1 rounded-lg font-['Barlow_Condensed'] font-black text-xs tracking-wider uppercase transition-colors whitespace-nowrap cursor-pointer ${
                        positionFilter === pos
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {labels[pos]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3D Cutout Roster Cards Grid */}
            <div>
              {filteredRoster.length === 0 ? (
                <div className="py-12 px-6 rounded-2xl bg-white text-slate-950 border border-slate-200 text-center space-y-3 shadow-lg">
                  <Shield className="w-10 h-10 mx-auto text-amber-500" />
                  <h3 className="font-['Barlow_Condensed'] font-black text-2xl uppercase tracking-wider text-slate-950">
                    SANCTUARY ROSTER STANDING READY &bull; AWAITING DISCIPLE CHECK-IN &amp; CONSECRATION
                  </h3>
                  <p className="text-xs font-mono text-slate-600 max-w-md mx-auto uppercase">
                    Zero static placeholders. Real disciples and facilitators will be recorded here dynamically upon official registration.
                  </p>
                  {onOpenRosterModal && (
                    <button
                      onClick={onOpenRosterModal}
                      className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-['Barlow_Condensed'] font-black text-sm tracking-wider uppercase bg-slate-950 text-white hover:bg-slate-800 transition-all cursor-pointer shadow-md"
                    >
                      <Users className="w-4 h-4 text-amber-400" />
                      <span>CHECK IN / REGISTER</span>
                    </button>
                  )}
                </div>
              ) : (
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
                        onClick={() => setSelectedMemberModal(member)}
                        canEdit={isAuthorizedMember}
                        canDelete={Boolean(
                          isAuthorizedMember ||
                          currentUser?.id === member.id ||
                          (currentUser as any)?.uid === member.id
                        )}
                        onDelete={handleDeleteDisciple}
                      />
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: FAITHFULNESS VIEW */}
        {activeSegment === 'faithfulness' && (
          <div className="space-y-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-[#000000]/90 border border-white/10 space-y-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" />
                <h2 className="font-['Barlow_Condensed'] font-black text-xl uppercase tracking-wider text-white">
                  Consecrated Disciple Walk &bull; Zero-Start Ledger
                </h2>
              </div>
              <p className="text-xs font-mono text-slate-300 leading-relaxed">
                As leaders and disciples at Joshua House of Worship, our devotion is grounded in daily physical sword reading, consecrated discipleship huddles, and faithful small group assembly.
              </p>
            </div>

            {teamMembers.length === 0 ? (
              <div className="py-12 px-6 rounded-2xl bg-white text-slate-950 border border-slate-200 text-center space-y-3 shadow-lg">
                <Shield className="w-10 h-10 mx-auto text-amber-500" />
                <h3 className="font-['Barlow_Condensed'] font-black text-2xl uppercase tracking-wider text-slate-950">
                  SANCTUARY ROSTER STANDING READY &bull; AWAITING DISCIPLE CHECK-IN &amp; CONSECRATION
                </h3>
                <p className="text-xs font-mono text-slate-600 max-w-md mx-auto uppercase">
                  Zero static placeholders. Disciples and facilitators will track chapters read and discipleship huddles dynamically once registered.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teamMembers.map((member) => {
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
                    ADMIN_EMAILS.includes(currentUser?.email?.toLowerCase()?.trim() || '');
                  const isAuthorizedMember = Boolean(
                    isLeadAdmin ||
                    (currentUser?.email &&
                      member.email &&
                      currentUser.email.toLowerCase().trim() === member.email.toLowerCase().trim())
                  );
                  return (
                  <div 
                    key={member.id}
                    className="bg-white text-slate-950 rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-200 transition-all space-y-3 relative overflow-hidden"
                    style={{
                      borderTop: `4px solid ${member.outlineColor || accentColor}`
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {isAuthorizedMember ? (
                          <label
                            className="relative w-12 h-12 rounded-xl overflow-hidden cursor-pointer group shrink-0"
                            title={`Tap to upload photo for ${member.name}`}
                          >
                            {member.avatarUrl ? (
                              <img 
                                src={member.avatarUrl} 
                                alt="" 
                                className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm" 
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center border border-amber-300/40 shadow-sm shrink-0">
                                <span className="font-mono text-sm font-extrabold text-black">
                                  {getInitials(member.name)}
                                </span>
                              </div>
                            )}
                            <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-slate-950 border border-amber-400 text-amber-400 flex items-center justify-center shadow">
                              <Camera className="w-2.5 h-2.5" />
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleQuickMemberPhotoUpload(member, e)}
                              className="sr-only"
                            />
                          </label>
                        ) : (
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0">
                            {member.avatarUrl ? (
                              <img 
                                src={member.avatarUrl} 
                                alt="" 
                                className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm" 
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center border border-amber-300/40 shadow-sm shrink-0">
                                <span className="font-mono text-sm font-extrabold text-black">
                                  {getInitials(member.name)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        <div>
                          <h4 className="text-slate-950 font-black tracking-wide font-['Barlow_Condensed',sans-serif] uppercase text-lg sm:text-xl">
                            {member.name}
                          </h4>
                          <span className="text-slate-600 font-mono text-xs uppercase block">
                            {member.calling}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-center justify-center shrink-0 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200">
                        <span 
                          className="font-['Barlow_Condensed'] font-black text-2xl leading-none"
                          style={{ color: member.outlineColor || accentColor }}
                        >
                          {member.positionCode}
                        </span>
                        <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider font-bold">
                          POS
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                        <span className="font-mono font-black text-lg text-slate-950 block">
                          {member.chaptersRead}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 uppercase font-semibold">
                          Chapters Read
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                        <span className="font-mono font-black text-lg text-slate-950 block">
                          {member.streakDays}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 uppercase font-semibold">
                          Consecrated Days
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                        <span className="font-mono font-black text-lg text-slate-950 block">
                          {member.prayerWatches}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 uppercase font-semibold">
                          Huddles
                        </span>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STATS VIEW */}
        {activeSegment === 'stats' && (
          <div className="space-y-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-[#000000]/90 border border-white/10 space-y-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h2 className="font-['Barlow_Condensed'] font-black text-xl uppercase tracking-wider text-white">
                  Corporate Sanctuary Metrics (Starting At Zero)
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 text-center">
                  <span className="font-['Barlow_Condensed'] font-black text-3xl text-amber-400 block">
                    0
                  </span>
                  <span className="text-[10px] font-mono text-slate-300 uppercase tracking-wider font-bold">
                    Chapters Completed
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 text-center">
                  <span className="font-['Barlow_Condensed'] font-black text-3xl text-amber-400 block">
                    0
                  </span>
                  <span className="text-[10px] font-mono text-slate-300 uppercase tracking-wider font-bold">
                    Streak Days
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 text-center">
                  <span className="font-['Barlow_Condensed'] font-black text-3xl text-amber-400 block">
                    0
                  </span>
                  <span className="text-[10px] font-mono text-slate-300 uppercase tracking-wider font-bold">
                    Prayers Interceded
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 text-center">
                  <span className="font-['Barlow_Condensed'] font-black text-3xl text-amber-400 block">
                    0
                  </span>
                  <span className="text-[10px] font-mono text-slate-300 uppercase tracking-wider font-bold">
                    Huddles Attended
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-center">
                <p className="text-xs font-mono text-slate-400">
                  All accounts start at zero. Disciples build their consecrated sword ledger daily through personal Bible tracking and corporate Monday/Thursday gatherings.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 4. Member Detail Modal */}
      {selectedMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-[#000000] border border-amber-500/30 p-6 space-y-5 shadow-2xl">
            
            {/* Top Accent Stripe */}
            <div 
              className="absolute top-0 inset-x-0 h-1.5"
              style={{ backgroundColor: selectedMemberModal.outlineColor }}
            />

            {/* Close Button */}
            <button
              onClick={() => setSelectedMemberModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {isEditingCardModal ? (
              <form onSubmit={handleSaveSelectedMemberCard} className="space-y-3.5 pt-2 text-left">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <Edit3 className="w-4 h-4 text-amber-400" />
                  <h3 className="font-['Barlow_Condensed'] font-black text-2xl uppercase tracking-wider text-white">
                    Edit Discipleship Card
                  </h3>
                </div>

                {/* Photo Upload */}
                <div className="flex items-center gap-4 p-3 rounded-2xl bg-black/60 border border-white/10">
                  <label
                    className="relative w-16 h-16 rounded-2xl overflow-hidden bg-stone-900 border border-amber-500/40 flex items-center justify-center shrink-0 cursor-pointer group"
                    title="Tap to upload photo from mobile or desktop"
                  >
                    {cardNewAvatarBase64 || selectedMemberModal.avatarUrl ? (
                      <img
                        src={cardNewAvatarBase64 || selectedMemberModal.avatarUrl}
                        alt={cardEditName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-mono text-lg font-extrabold text-amber-400">
                        {getInitials(cardEditName)}
                      </span>
                    )}
                    <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-black/85 border border-amber-400 text-amber-400 flex items-center justify-center shadow">
                      <Camera className="w-2.5 h-2.5" />
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCardModalPhotoUpload}
                      className="sr-only"
                    />
                  </label>
                  <div className="flex-1 space-y-1.5">
                    <div className="text-xs font-mono font-bold text-slate-200 uppercase">
                      Disciple Cutout / Profile Photo
                    </div>
                    <label className="inline-flex px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 font-mono text-[10px] font-bold uppercase tracking-wider items-center gap-1.5 cursor-pointer transition-colors">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{isUploadingTeamPhoto ? 'Optimizing Photo...' : 'Upload / Change Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCardModalPhotoUpload}
                        className="sr-only"
                      />
                    </label>
                    <p className="text-[10px] font-mono text-slate-400">
                      Supports Mobile Camera, Photo Library &amp; Desktop Upload
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={cardEditName}
                      onChange={(e) => setCardEditName(e.target.value)}
                      required
                      className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={cardEditEmail}
                      onChange={(e) => setCardEditEmail(e.target.value)}
                      className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                      Cohort Group
                    </label>
                    <select
                      value={cardEditGender}
                      onChange={(e) => setCardEditGender(e.target.value as 'brother' | 'sister')}
                      className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="brother">Brotherhood (Men On Fire)</option>
                      <option value="sister">Sisterhood (Women Ignited)</option>
                    </select>
                  </div>
                  <div>
                    {(Boolean(currentUser?.isAdmin) ||
                      currentUser?.accountType === 'administrator' ||
                      currentUser?.role === 'Administrator' ||
                      currentUser?.role === 'Lead Facilitator' ||
                      ['trentwhite0308@gmail.com', 'trentwhitemba@yahoo.com', 'white.whitney91@gmail.com', 'luislopez567@hotmail.com'].includes(
                        currentUser?.email?.toLowerCase()?.trim() || ''
                      )) ? (
                      <>
                        <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                          Sanctuary Role
                        </label>
                        <select
                          value={cardEditRole}
                          onChange={(e) => setCardEditRole(e.target.value)}
                          className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        >
                          <option value="YoungFire Member">YoungFire Member</option>
                          <option value="Facilitator">Facilitator</option>
                          <option value="Lead Facilitator">Lead Facilitator</option>
                          <option value="Overseer">Overseer</option>
                          <option value="Administrator">Administrator</option>
                        </select>
                      </>
                    ) : (
                      <div className="flex flex-col space-y-1">
                        <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">
                          Sanctuary Role
                        </span>
                        <div className="px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-amber-400 font-bold uppercase tracking-wider">
                          {cardEditRole || selectedMemberModal.role || 'YoungFire Member'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                      Sanctuary Calling
                    </label>
                    <input
                      type="text"
                      value={cardEditCalling}
                      onChange={(e) => setCardEditCalling(e.target.value)}
                      className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                      Scripture Anchor
                    </label>
                    <input
                      type="text"
                      value={cardEditScripture}
                      onChange={(e) => setCardEditScripture(e.target.value)}
                      className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={cardEditResidence}
                    onChange={(e) => setCardEditResidence(e.target.value)}
                    className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                    Discipleship Bio
                  </label>
                  <textarea
                    rows={2}
                    value={cardEditBio}
                    onChange={(e) => setCardEditBio(e.target.value)}
                    className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-wider text-slate-400 mb-1">
                      Chapters Read
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={cardEditChapters}
                      onChange={(e) => setCardEditChapters(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-black/80 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-wider text-slate-400 mb-1">
                      Streak Days
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={cardEditStreak}
                      onChange={(e) => setCardEditStreak(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-black/80 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-wider text-slate-400 mb-1">
                      Huddles
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={cardEditHuddles}
                      onChange={(e) => setCardEditHuddles(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-black/80 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingCardModal(false)}
                    className="w-full py-2.5 rounded-xl font-['Barlow_Condensed'] font-black text-sm tracking-widest uppercase bg-white/10 hover:bg-white/15 text-slate-200 cursor-pointer transition-all"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCardModal}
                    className="w-full py-2.5 rounded-xl font-['Barlow_Condensed'] font-black text-sm tracking-widest uppercase bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg cursor-pointer hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSavingCardModal ? 'SAVING...' : 'SAVE DISCIPLE CARD'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* Profile Overview */}
                <div className="flex items-center gap-4 pt-2">
                  {(Boolean(currentUser?.isAdmin) ||
                    currentUser?.accountType === 'administrator' ||
                    currentUser?.role === 'Administrator' ||
                    currentUser?.role === 'Lead Facilitator' ||
                    ['trentwhite0308@gmail.com', 'trentwhitemba@yahoo.com', 'white.whitney91@gmail.com', 'luislopez567@hotmail.com'].includes(
                      currentUser?.email?.toLowerCase()?.trim() || ''
                    ) ||
                    (currentUser?.email &&
                      selectedMemberModal.email &&
                      currentUser.email.toLowerCase().trim() === selectedMemberModal.email.toLowerCase().trim())) ? (
                    <label
                      className="relative w-20 h-20 rounded-2xl overflow-hidden bg-black border border-white/20 shrink-0 flex items-center justify-center cursor-pointer group"
                      title="Tap to upload or change profile photo"
                    >
                      {selectedMemberModal.avatarUrl ? (
                        <img
                          src={selectedMemberModal.avatarUrl}
                          alt={selectedMemberModal.name}
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
                          <span className="font-mono text-2xl font-extrabold text-black tracking-wider">
                            {getInitials(selectedMemberModal.name)}
                          </span>
                        </div>
                      )}
                      <span className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-black/90 border border-amber-400 text-amber-400 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                        <Camera className="w-3 h-3" />
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleQuickMemberPhotoUpload(selectedMemberModal, e)}
                        className="sr-only"
                      />
                    </label>
                  ) : (
                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-black border border-white/20 shrink-0 flex items-center justify-center">
                      {selectedMemberModal.avatarUrl ? (
                        <img
                          src={selectedMemberModal.avatarUrl}
                          alt={selectedMemberModal.name}
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
                          <span className="font-mono text-2xl font-extrabold text-black tracking-wider">
                            {getInitials(selectedMemberModal.name)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span 
                        className="text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
                        style={{ 
                          backgroundColor: `${selectedMemberModal.outlineColor}30`, 
                          color: selectedMemberModal.outlineColor 
                        }}
                      >
                        {selectedMemberModal.badgeLabel}
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-400">
                        {selectedMemberModal.calling}
                      </span>
                    </div>
                    <h3 className="font-['Barlow_Condensed'] font-black text-2xl sm:text-3xl uppercase tracking-wider text-white">
                      {selectedMemberModal.name}
                    </h3>
                    <p className="text-xs font-mono text-slate-300">
                      {selectedMemberModal.role}
                    </p>
                  </div>
                </div>

                {/* Scripture Anchor & Calling */}
                <div className="space-y-2 p-3.5 rounded-2xl bg-black/60 border border-white/10">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 uppercase">Scripture Anchor:</span>
                    <span className="text-amber-400 font-bold">{selectedMemberModal.scriptureAnchor}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 uppercase">Sanctuary Calling:</span>
                    <span className="text-white font-medium text-right max-w-[65%] truncate">{selectedMemberModal.calling}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 uppercase">Location:</span>
                    <span className="text-slate-300">{selectedMemberModal.residence}</span>
                  </div>
                </div>

                {/* Bio */}
                <p className="text-xs font-mono text-slate-300 leading-relaxed">
                  {selectedMemberModal.bio}
                </p>

                {/* Consecrated Metrics */}
                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-white/10">
                  <div className="p-2.5 rounded-xl bg-black/60 border border-white/5">
                    <span className="font-mono font-black text-xl text-white block">
                      {selectedMemberModal.chaptersRead}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 uppercase">
                      Chapters Read
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/60 border border-white/5">
                    <span className="font-mono font-black text-xl text-white block">
                      {selectedMemberModal.streakDays}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 uppercase">
                      Streak Days
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/60 border border-white/5">
                    <span className="font-mono font-black text-xl text-white block">
                      {selectedMemberModal.prayerWatches}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 uppercase">
                      Discipleship Huddles
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(Boolean(currentUser?.isAdmin) ||
                    currentUser?.accountType === 'administrator' ||
                    currentUser?.role === 'Administrator' ||
                    currentUser?.role === 'Lead Facilitator' ||
                    ['trentwhite0308@gmail.com', 'trentwhitemba@yahoo.com', 'white.whitney91@gmail.com', 'luislopez567@hotmail.com'].includes(
                      currentUser?.email?.toLowerCase()?.trim() || ''
                    ) ||
                    (currentUser?.email &&
                      selectedMemberModal.email &&
                      currentUser.email.toLowerCase().trim() === selectedMemberModal.email.toLowerCase().trim())) && (
                    <button
                      type="button"
                      onClick={() => setIsEditingCardModal(true)}
                      className="w-full py-3 rounded-xl font-['Barlow_Condensed'] font-black text-sm tracking-widest uppercase bg-white/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>EDIT PROFILE</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedMemberModal(null)}
                    className="w-full py-3 rounded-xl font-['Barlow_Condensed'] font-black text-sm tracking-widest uppercase bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg cursor-pointer hover:brightness-110 transition-all"
                  >
                    CLOSE DISCIPLE CARD
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default SanctuaryTeamHub;
