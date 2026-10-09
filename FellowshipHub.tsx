import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Shield, Heart, Users, MessageSquare, 
  Send, Sparkles, Video, Calendar, ArrowRight, 
  BookOpen, Radio, Music, Briefcase, HandHeart, 
  Camera, Flame, Check, ChevronDown, ChevronUp, 
  ExternalLink, Layers, Disc, Upload, Image as ImageIcon,
  Plus, Trash2, Edit3, ThumbsUp, ThumbsDown, CheckCircle, FileText,
  Bookmark, Award, Star, FolderUp, Maximize2, Clock,
  Sun, Moon, Sunrise, Sunset, X, RotateCcw, Save
} from 'lucide-react';
import { WheelHub } from './WheelHub';
import { OrbitWheelHub } from './OrbitWheelHub';
import { PrayerDock } from './PrayerDock';
import { OpenBibleThursdays } from './OpenBibleThursdays';
import { FellowshipCalendar } from './FellowshipCalendar';
import { INITIAL_AUTHENTIC_LESSONS, DiscipleshipLesson, LessonAttachment } from '../data/lessonsData';
import { CurrentUser } from './SettingsHUDModal';
import { READING_PLANS } from '../data/readingPlansData';
import { ReadingPlanCard } from './ReadingPlanCard';
import { ReadingPlansHub } from './ReadingPlansHub';
import { MenOnFireHub } from './MenOnFireHub';
import { WomenIgnitedHub } from './WomenIgnitedHub';
import { DailyBreadHub } from './DailyBreadHub';
import { useAppCover } from '../data/appCoverAssets';
import { SanAntonioVectorMap } from './SanAntonioVectorMap';
import {
  formatChatTimestamp,
  toggleChatReaction,
  getOptimisticMessageReactions,
  ChatReactionAndCopyBar,
  ChatPasteButton,
  checkHubAccess
} from './ChatMessageItem';
import { db } from '../services/firebase';
import { dispatchSanctuaryNotification } from '../services/notificationService';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  doc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';

interface FellowshipHubProps {
  onNavigate: (dest: string, subView?: any) => void;
  onBack?: () => void;
  initialDrillDown?: string | null;
  currentUser?: CurrentUser | null;
  onNavigateToScripture?: (bookId: string, chapter: number, verse?: number, origin?: any) => void;
}

interface ChatMessage {
  id: string;
  senderId?: string;
  senderName?: string;
  sender?: string;
  role?: string;
  avatarText?: string;
  avatarUrl?: string;
  text: string;
  timestamp: number | string;
  createdAt?: any;
  reactions?: Record<string, string[]>;
}

interface PhotoMoment {
  id: string;
  title: string;
  category: string;
  caption: string;
  scripture: string;
  imageUrl: string;
  date: string;
}

interface FellowshipIdea {
  id: string;
  title: string;
  description: string;
  author: string;
  authorId?: string;
  status?: 'pending' | 'approved';
  votes: number;
  date: string;
  scheduledDate?: string;
  scheduledStatus?: boolean;
}

interface PrayerItem {
  id: string;
  date: string;
  names: string[];
  cause: string;
  status: string;
  completed?: boolean;
  authorId?: string;
  authorName?: string;
  intercessorsCount?: number;
  intercessors?: string[];
  prayedBy?: string[];
}

interface ReadingPlan {
  id: string;
  title: string;
  category: string;
  durationDays: number;
  days: Array<{
    day: number;
    title: string;
    scripture: string;
    devotional: string;
    challenge: string;
    completed?: boolean;
  }>;
}

// ALL 27 Authentic HD Photos Uploaded by Trent White
const INITIAL_AUTHENTIC_PHOTOS: PhotoMoment[] = [
  { id: 'p3519', title: 'YoungFire Sanctuary Fellowship Huddle', category: 'Small Groups', caption: 'Disciples gathered in fellowship, sharing spiritual encouragement and dinner.', scripture: 'Ephesians 4:16 — From whom the whole body fitly joined together.', imageUrl: '/IMG_3519.jpg', date: 'Living Room Huddle' },
  { id: 'p3520', title: 'Living Room Prayer Circle Huddle', category: 'Prayer Tower', caption: 'Consecrated disciples locked in fervent prayer and holy intercession.', scripture: '1 Thessalonians 5:17 — Pray without ceasing.', imageUrl: '/IMG_3520.jpg', date: 'Prayer Circle' },
  { id: 'p3521', title: 'Living Room Discipleship Warmth', category: 'Small Groups', caption: 'Deep discipleship fellowship, joy, and spiritual growth at small groups.', scripture: 'Hebrews 10:24-25 — Exhorting one another daily.', imageUrl: '/IMG_3521.jpg', date: 'Discipleship Fellowship' },
  { id: 'p3522', title: 'Easter Resurrection Church Family Gathering', category: 'Sanctuary', caption: 'All saints and disciples gathered in sacred corporate assembly.', scripture: '2 Timothy 4:2 — Preach the word; be instant in season, out of season.', imageUrl: '/IMG_3522.jpg', date: 'Easter Resurrection Gathering' },
  { id: 'p3523', title: 'Consecrated Fellowship Hallway Huddle', category: 'Brotherhood', caption: 'Brothers standing together in unity, honor, and biblical brotherhood.', scripture: 'Proverbs 27:17 — Iron sharpeneth iron.', imageUrl: '/IMG_3523.jpg', date: 'Hallway Huddle' },
  { id: 'p3524', title: 'Lead Facilitators Trent D. White & Whitney White', category: 'Leadership', caption: 'Lead facilitators guiding young adults in holy discipleship and leadership.', scripture: 'Romans 15:7 — Wherefore receive ye one another, as Christ also received us.', imageUrl: '/IMG_3524.jpg', date: 'Lead Facilitators' },
  { id: 'p3525', title: 'Backyard Yard Games & Fellowship Laughter', category: 'Fellowship Nights', caption: 'Community joy, laughter, and fellowship games outdoors.', scripture: 'Proverbs 17:22 — A merry heart doeth good like a medicine.', imageUrl: '/IMG_3525.jpg', date: 'Lawn Fellowship' },
  { id: 'p3526', title: 'Sacred Fellowship Prayer Consecration Circle', category: 'Prayer Tower', caption: 'Consecrated prayer watch and sacred intercession for our church family.', scripture: 'Colossians 4:2 — Continue in prayer, and watch in the same with thanksgiving.', imageUrl: '/IMG_3526.jpg', date: 'Consecration Watch' },
  { id: 'p3527', title: 'Sanctuary Worship & Altar Celebration', category: 'Worship', caption: 'Fervent worship and celebratory praise at the altar.', scripture: 'Psalm 100:2 — Serve the LORD with gladness: come before his presence with singing.', imageUrl: '/IMG_3527.jpg', date: 'Altar Celebration' },
  { id: 'p3528', title: 'Young Adults Discipleship Cohort', category: 'Small Groups', caption: 'YoungFire young adult disciples standing strong in Christ.', scripture: '1 Timothy 4:12 — Let no man despise thy youth; but be thou an example.', imageUrl: '/IMG_3528.jpg', date: 'Discipleship Cohort' },
  { id: 'p3529', title: 'Sanctuary Brothers Fellowship', category: 'Brotherhood', caption: 'Men On Fire cohort gathering in fellowship and spiritual brotherhood.', scripture: 'Psalm 133:1 — Behold, how good and how pleasant it is for brethren to dwell together in unity!', imageUrl: '/IMG_3529.jpg', date: 'Men On Fire' },
  { id: 'p3530', title: 'Sanctuary Pulpit Celebration', category: 'Sanctuary', caption: 'Celebrating the ministry of the Word from the sacred pulpit.', scripture: 'Nehemiah 8:8 — So they read in the book in the law of God distinctly.', imageUrl: '/IMG_3530.jpg', date: 'Pulpit Assembly' },
  { id: 'p3531', title: 'Living Room Bible Discipleship Circle', category: 'Small Groups', caption: 'Expository scripture study and open reflection around God\'s Word.', scripture: 'Acts 2:42 — And they continued stedfastly in the apostles\' doctrine and fellowship.', imageUrl: '/IMG_3531.jpg', date: 'Living Room Study' },
  { id: 'p3532', title: 'Women Ignited Sisterhood Fellowship', category: 'Sisterhood', caption: 'Women Ignited sisterhood gathered in grace, wisdom, and prayer.', scripture: 'Proverbs 31:25-26 — Strength and honour are her clothing.', imageUrl: '/IMG_3532.jpg', date: 'Women Ignited' },
  { id: 'p3533', title: 'Open Bible Study Discussions', category: 'Open Bible', caption: 'Interactive Bible reflections and scripture discussion Thursday night.', scripture: 'Acts 17:11 — They received the word with all readiness of mind, and searched the scriptures daily.', imageUrl: '/IMG_3533.jpg', date: 'Open Bible Thursdays' },
  { id: 'p3534', title: 'Word Deep-Dive & Scripture Exploration', category: 'Open Bible', caption: 'Diving deep into the 66-Book Imperial Scripture Canon.', scripture: '2 Timothy 3:16-17 — All scripture is given by inspiration of God.', imageUrl: '/IMG_3534.jpg', date: 'Scripture Exploration' },
  { id: 'p3535', title: 'Sanctuary Entrance Welcome Portal', category: 'Sanctuary', caption: 'Welcoming brothers and sisters into the house of worship with love.', scripture: 'Psalm 84:10 — For a day in thy courts is better than a thousand.', imageUrl: '/IMG_3535.jpg', date: 'Sanctuary Welcome' },
  { id: 'p3536', title: 'Living Room Prayer Fellowship', category: 'Prayer Tower', caption: 'United in hearts and prayer before the throne of grace.', scripture: 'Matthew 18:20 — For where two or three are gathered together in my name, there am I in the midst.', imageUrl: '/IMG_3536.jpg', date: 'Prayer Fellowship' },
  { id: 'p3537', title: 'Small Group Living Room Circle', category: 'Small Groups', caption: 'Bi-weekly Monday fellowship and discipleship discussion in San Antonio.', scripture: 'Colossians 3:16 — Let the word of Christ dwell in you richly in all wisdom.', imageUrl: '/IMG_3537.jpg', date: 'Small Group Circle' },
  { id: 'p3538', title: 'Fellowship Warmth & Joy', category: 'Fellowship Nights', caption: 'Laughter, sincere fellowship, and Christian love shared among disciples.', scripture: 'Romans 12:10 — Be kindly affectioned one to another with brotherly love.', imageUrl: '/IMG_3538.jpg', date: 'Fellowship Joy' },
  { id: 'p3539', title: 'Church Mass Fellowship', category: 'Sanctuary', caption: 'Mass sanctuary fellowship following Sunday service.', scripture: 'Hebrews 12:1-2 — Looking unto Jesus the author and finisher of our faith.', imageUrl: '/IMG_3539.jpg', date: 'Corporate Fellowship' },
  { id: 'p3540', title: 'Brotherhood Intercession Circle', category: 'Brotherhood', caption: 'Men of God lifting up holy hands in fervent prayer.', scripture: '1 Timothy 2:8 — I will therefore that men pray every where, lifting up holy hands.', imageUrl: '/IMG_3540.jpg', date: 'Brotherhood Intercession' },
  { id: 'p3541', title: 'Ministry Overseers Consecration', category: 'Leadership', caption: 'Ministry leaders consecrated for faithful kingdom service.', scripture: 'Titus 1:7-9 — Holding fast the faithful word as he hath been taught.', imageUrl: '/IMG_3541.jpg', date: 'Overseer Consecration' },
  { id: 'p3542', title: 'Outdoor Fellowship & Lawn Activities', category: 'Fellowship Nights', caption: 'Youth and young adult fellowship in fellowship outdoor setting.', scripture: 'Ecclesiastes 3:12 — Rejoice, and to do good in his life.', imageUrl: '/IMG_3542.jpg', date: 'Outdoor Activities' },
  { id: 'p3543', title: 'Altar Consecration Gathering', category: 'Worship', caption: 'Disciples dedicating their lives and hearts at the altar of God.', scripture: 'Romans 12:1 — Present your bodies a living sacrifice, holy, acceptable unto God.', imageUrl: '/IMG_3543.jpg', date: 'Altar Consecration' },
  { id: 'p3544', title: 'Sanctuary Assembly & Sacred Welcome', category: 'Sanctuary', caption: 'Trent White and the sanctuary assembly rejoicing in holy fellowship.', scripture: 'Psalm 122:1 — I was glad when they said unto me, Let us go into the house of the LORD.', imageUrl: '/IMG_3544.jpg', date: 'Sanctuary Presentation' },
  { id: 'p3545', title: 'Discipleship Gathering Moment', category: 'Small Groups', caption: 'Disciples united in heart, intentional walk, and spiritual integrity.', scripture: 'John 13:34-35 — By this shall all men know that ye are my disciples, if ye have love one to another.', imageUrl: '/IMG_3545.jpg', date: 'Discipleship Gathering' }
];

export const FellowshipHub: React.FC<FellowshipHubProps> = ({ 
  onNavigate, 
  onBack,
  initialDrillDown = null,
  currentUser = null,
  onNavigateToScripture
}) => {
  const [hubViewMode, setHubViewMode] = useState<'grid' | 'wheel'>('grid');
  const [activeDrillDown, setActiveDrillDown] = useState<string | null>(initialDrillDown);
  const [planCategoryFilter, setPlanCategoryFilter] = useState<'all' | 'general' | 'men' | 'women'>('all');

  const smallGroupsCover = useAppCover('small_groups_cover');
  const openBibleCover = useAppCover('open_bible_cover');
  const fellowshipHubCover = useAppCover('fellowship_hub_cover');
  const menOnFireCover = useAppCover('men_on_fire_cover');
  const womenIgnitedCover = useAppCover('women_ignited_cover');

  const activeUser = currentUser || (() => {
    try {
      const s = localStorage.getItem('youngfire_user_session');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  })();

  const handleEnterMenOnFire = () => {
    if (
      !activeUser ||
      (activeUser as any).isGuest ||
      activeUser.accountType === 'guest' ||
      (activeUser.id && activeUser.id.startsWith('guest_'))
    ) {
      window.dispatchEvent(new CustomEvent('yf_guest_restriction', { detail: { feature: 'Men On Fire Brotherhood Hub' } }));
      return;
    }
    if (checkHubAccess('brotherhood', activeUser)) {
      setActiveDrillDown('men');
    } else {
      window.dispatchEvent(new CustomEvent('yf_guest_restriction', { detail: { feature: 'Men On Fire Brotherhood Hub (Brothers Only)' } }));
    }
  };

  const handleEnterWomenIgnited = () => {
    if (
      !activeUser ||
      (activeUser as any).isGuest ||
      activeUser.accountType === 'guest' ||
      (activeUser.id && activeUser.id.startsWith('guest_'))
    ) {
      window.dispatchEvent(new CustomEvent('yf_guest_restriction', { detail: { feature: 'Women Ignited Sisterhood Hub' } }));
      return;
    }
    if (checkHubAccess('sisterhood', activeUser)) {
      setActiveDrillDown('women');
    } else {
      window.dispatchEvent(new CustomEvent('yf_guest_restriction', { detail: { feature: 'Women Ignited Sisterhood Hub (Sisters Only)' } }));
    }
  };

  useEffect(() => {
    if (initialDrillDown === 'men') {
      if (checkHubAccess('brotherhood', activeUser)) {
        setActiveDrillDown('men');
      } else {
        setActiveDrillDown(null);
      }
    } else if (initialDrillDown === 'women') {
      if (checkHubAccess('sisterhood', activeUser)) {
        setActiveDrillDown('women');
      } else {
        setActiveDrillDown(null);
      }
    } else if (initialDrillDown) {
      setActiveDrillDown(initialDrillDown);
    }
  }, [initialDrillDown, activeUser]);

  const handleOrbitSelect = (hubId: string) => {
    if (hubId === 'men_on_fire') {
      handleEnterMenOnFire();
    } else if (hubId === 'women_ignited') {
      handleEnterWomenIgnited();
    } else if (hubId === 'open_bible') {
      setActiveDrillDown('openbible');
    } else if (hubId === 'prayer') {
      setActiveDrillDown('prayer_dock');
    } else if (hubId === 'calendar') {
      setHubViewMode('grid');
      setTimeout(() => {
        const el = document.getElementById('sanctuary-calendar-section') || document.querySelector('[data-section="calendar"]');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else if (hubId === 'tv') {
      onNavigate('tv');
    } else if (hubId === 'radio') {
      onNavigate('radio');
    } else if (hubId === 'youngfire') {
      setActiveDrillDown('discipleship');
    }
  };

  // Gallery Photos (ALL 27 authentic uploaded photos)
  const [galleryPhotos, setGalleryPhotos] = useState<PhotoMoment[]>(() => {
    try {
      const saved = localStorage.getItem('youngfire_gallery_photos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return INITIAL_AUTHENTIC_PHOTOS;
    } catch {
      return INITIAL_AUTHENTIC_PHOTOS;
    }
  });

  const [activeLightboxPhoto, setActiveLightboxPhoto] = useState<PhotoMoment | null>(null);
  const [isUploadingBatch, setIsUploadingBatch] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  // Edit Photo State
  const [editingPhoto, setEditingPhoto] = useState<PhotoMoment | null>(null);
  const [editPhotoTitle, setEditPhotoTitle] = useState('');
  const [editPhotoCategory, setEditPhotoCategory] = useState('');
  const [editPhotoCaption, setEditPhotoCaption] = useState('');
  const [editPhotoScripture, setEditPhotoScripture] = useState('');
  const [editPhotoDate, setEditPhotoDate] = useState('');
  const [editPhotoImageUrl, setEditPhotoImageUrl] = useState('');

  // Delete Confirmation State
  const [photoToDelete, setPhotoToDelete] = useState<PhotoMoment | null>(null);

  // 12 Authentic Lessons State
  const [lessons, setLessons] = useState<DiscipleshipLesson[]>(() => {
    try {
      const saved = localStorage.getItem('youngfire_authentic_lessons');
      return saved ? JSON.parse(saved) : INITIAL_AUTHENTIC_LESSONS;
    } catch {
      return INITIAL_AUTHENTIC_LESSONS;
    }
  });
  const [selectedLessonIndex, setSelectedLessonIndex] = useState(0);
  const [expandedLessonSection, setExpandedLessonSection] = useState<'core' | 'notes' | 'keypoints' | 'questions' | 'application' | 'handouts' | 'video'>('core');

  // New Lesson Modal
  const [isNewLessonModalOpen, setIsNewLessonModalOpen] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonSeries, setNewLessonSeries] = useState('YoungFire Discipleship');
  const [newLessonTeachingDate, setNewLessonTeachingDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [newLessonPassage, setNewLessonPassage] = useState('');
  const [newLessonTeachers, setNewLessonTeachers] = useState('Trent White & Whitney White (YoungFire Discipleship Leaders)');
  const [newLessonTheme, setNewLessonTheme] = useState('');
  const [newLessonSummary, setNewLessonSummary] = useState('');
  const [newLessonNotes, setNewLessonNotes] = useState('');
  const [newLessonVideoUrl, setNewLessonVideoUrl] = useState('');

  // Edit Lesson Modal (Two-Way Lesson Link & Sync)
  const [isEditLessonModalOpen, setIsEditLessonModalOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editLessonTitle, setEditLessonTitle] = useState('');
  const [editLessonSeries, setEditLessonSeries] = useState('');
  const [editLessonTeachingDate, setEditLessonTeachingDate] = useState('');
  const [editLessonPassage, setEditLessonPassage] = useState('');
  const [editLessonTeachers, setEditLessonTeachers] = useState('');
  const [editLessonTheme, setEditLessonTheme] = useState('');
  const [editLessonSummary, setEditLessonSummary] = useState('');
  const [editLessonNotes, setEditLessonNotes] = useState('');
  const [editLessonVideoUrl, setEditLessonVideoUrl] = useState('');

  // Facilitator Idea Scheduling to Sanctuary Calendar
  const [schedulingIdea, setSchedulingIdea] = useState<FellowshipIdea | null>(null);
  const [schedulingDate, setSchedulingDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Facilitator detection (Restricted strictly to verified administrators)
  const isFacilitator = (() => {
    if (!activeUser) return false;
    const emailLower = (activeUser.email || '').toLowerCase().trim();
    return Boolean(
      activeUser.isAdmin ||
      emailLower === 'trentwhite0308@gmail.com' ||
      emailLower === 'trentwhitemba@yahoo.com'
    );
  })();

  // Guest detection (Read-Only Preview Mode)
  const isGuestUser = Boolean(
    !activeUser ||
    (activeUser as any).isGuest ||
    activeUser.accountType === 'guest' ||
    (activeUser.id && activeUser.id.startsWith('guest_'))
  );

  // Guest / Authenticated Identity Resolver (Never defaults to Trent White)
  const resolveDiscipleIdentity = () => {
    let guestName = sessionStorage.getItem('youngfire_guest_name');
    let guestId = sessionStorage.getItem('youngfire_guest_id');
    if (!guestName) {
      guestName = `Disciple-${Math.floor(1000 + Math.random() * 9000)}`;
      try {
        sessionStorage.setItem('youngfire_guest_name', guestName);
      } catch {}
    }
    if (!guestId) {
      guestId = `guest-${Date.now()}`;
      try {
        sessionStorage.setItem('youngfire_guest_id', guestId);
      } catch {}
    }

    const senderName =
      localStorage.getItem('youngfire_user_name') ||
      (activeUser?.name && activeUser.name !== 'Lead Facilitator Trent D. White' && activeUser.name !== 'YoungFire Guest Disciple'
        ? activeUser.name
        : activeUser?.email?.toLowerCase().trim() === 'trentwhite0308@gmail.com' ||
          activeUser?.email?.toLowerCase().trim() === 'trentwhitemba@yahoo.com'
        ? activeUser.name
        : '') ||
      guestName;

    const senderId =
      localStorage.getItem('youngfire_user_id') ||
      (activeUser?.id && activeUser.id !== 'roster_lead_trent'
        ? activeUser.id
        : activeUser?.email?.toLowerCase().trim() === 'trentwhite0308@gmail.com' ||
          activeUser?.email?.toLowerCase().trim() === 'trentwhitemba@yahoo.com'
        ? activeUser.id
        : '') ||
      guestId;

    return { senderName, senderId };
  };

  // Attachment upload on existing lesson
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Real-Time Firebase Fellowship Chat State
  const [activeChatThread, setActiveChatThread] = useState<'men' | 'women' | 'groups'>('groups');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newChatInput, setNewChatInput] = useState('');
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingChatText, setEditingChatText] = useState('');
  const isInitialChatSnapRef = useRef(true);
  const seenChatIdsRef = useRef<Set<string>>(new Set());
  const isInitialPrayerSnapRef = useRef(true);
  const seenPrayerIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const messagesRef = collection(db, 'fellowship_chat');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      if (isInitialChatSnapRef.current) {
        snapshot.docs.forEach((d) => seenChatIdsRef.current.add(d.id));
        isInitialChatSnapRef.current = false;
      } else {
        const myId = currentUser?.id || (currentUser as any)?.uid || activeUser?.id || '';
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' && !seenChatIdsRef.current.has(change.doc.id)) {
            seenChatIdsRef.current.add(change.doc.id);
            const data = change.doc.data() as any;
            if (!myId || data.senderId !== myId) {
              dispatchSanctuaryNotification(
                `💬 ${data.senderName || data.sender || 'Sanctuary Disciple'}`,
                data.text || 'New message in YoungFire Fellowship Chat',
                'message'
              );
            }
          }
        });
      }

      const msgs = snapshot.docs.map(docSnap => {
        const data = docSnap.data({ serverTimestamps: 'estimate' }) as any;
        const createdMs = data.createdAt?.toMillis
          ? data.createdAt.toMillis()
          : typeof data.timestamp === 'number'
            ? data.timestamp
            : Date.now();
        return {
          id: docSnap.id,
          ...data,
          senderName: data.senderName || data.sender || 'Sanctuary Disciple',
          senderRole: data.senderRole || data.role || 'YoungFire Member',
          avatarUrl: data.avatarUrl || '',
          timestamp: formatChatTimestamp(data.createdAt || data.timestamp || createdMs),
          createdAt: data.createdAt,
          reactions: data.reactions || {}
        } as ChatMessage;
      });
      setChatMessages(msgs);
    }, (err) => {
      console.warn("Realtime chat notice:", err?.message || err);
    });

    return () => unsubscribe();
  }, []);

  // 24/7 Prayer Tower & Dock (Standardized on collection(db, 'prayers') ordered by timestamp desc)
  const [prayers, setPrayers] = useState<PrayerItem[]>(() => {
    try {
      const saved = localStorage.getItem('youngfire_prayers_dock');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newPrayerName, setNewPrayerName] = useState('');
  const [newPrayerCause, setNewPrayerCause] = useState('');
  const [isPrayerModalOpen, setIsPrayerModalOpen] = useState(false);
  const [prayerFilter, setPrayerFilter] = useState<'all' | 'active' | 'answered'>('all');
  const [editingPrayer, setEditingPrayer] = useState<PrayerItem | null>(null);
  const [editPrayerNames, setEditPrayerNames] = useState('');
  const [editPrayerCause, setEditPrayerCause] = useState('');

  useEffect(() => {
    const prayersRef = collection(db, 'prayers');
    const q = query(prayersRef, orderBy('timestamp', 'desc'), limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isInitialPrayerSnapRef.current) {
        snapshot.docs.forEach((d) => seenPrayerIdsRef.current.add(d.id));
        isInitialPrayerSnapRef.current = false;
      } else {
        const myId = currentUser?.id || (currentUser as any)?.uid || activeUser?.id || '';
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' && !seenPrayerIdsRef.current.has(change.doc.id)) {
            seenPrayerIdsRef.current.add(change.doc.id);
            const data = change.doc.data() as any;
            if (!myId || (data.authorId && data.authorId !== myId)) {
              dispatchSanctuaryNotification(
                '🙏 24/7 Prayer Wall Intercession',
                `${data.authorName || 'Sanctuary Disciple'}: ${data.cause || data.text || 'New prayer request posted'}`,
                'prayer'
              );
            }
          }
        });
      }

      const livePrayers = snapshot.docs.map(docSnap => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          date: data.date || new Date(data.timestamp || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          names: Array.isArray(data.names) ? data.names : [data.names || data.authorName || 'Sanctuary Disciple'],
          cause: data.cause || data.text || '',
          status: data.status || (data.completed ? 'Answered Praise' : 'Active Intercession'),
          completed: Boolean(data.completed),
          authorId: data.authorId || data.senderId,
          authorName: data.authorName || data.senderName || 'Sanctuary Disciple',
          intercessorsCount: data.intercessorsCount || 1,
          intercessors: data.intercessors || [],
          prayedBy: data.prayedBy || []
        } as PrayerItem;
      });
      setPrayers(livePrayers);
    }, (error) => {
      console.warn("Firebase Prayers Sync Notice:", error?.message || error);
    });

    return () => unsubscribe();
  }, []);

  // Dual Daily Bread Feed State ('morning' | 'evening')
  const [dailyBreadTab, setDailyBreadTab] = useState<'morning' | 'evening'>('morning');

  // Fellowship Ideas & Voting
  const [ideas, setIdeas] = useState<FellowshipIdea[]>(() => {
    try {
      const saved = localStorage.getItem('youngfire_fellowship_ideas');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [newIdeaDesc, setNewIdeaDesc] = useState('');
  const [isIdeaFormOpen, setIsIdeaFormOpen] = useState(false);

  // Sync with backend API
  useEffect(() => {
    // Load prayers
    fetch('/api/prayers')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.prayers) && data.prayers.length > 0) {
          setPrayers(data.prayers);
        }
      })
      .catch(() => {});

    // Load gallery
    fetch('/api/gallery')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.gallery) && data.gallery.length > 0) {
          setGalleryPhotos(data.gallery);
        }
      })
      .catch(() => {});

    // Load ideas
    fetch('/api/fellowship/ideas')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.ideas) && data.ideas.length > 0) {
          setIdeas(data.ideas);
        }
      })
      .catch(() => {});

    // Load lessons
    fetch('/api/lessons')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.lessons) && data.lessons.length > 0) {
          setLessons(data.lessons);
        }
      })
      .catch(() => {});
  }, []);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem('youngfire_gallery_photos', JSON.stringify(galleryPhotos));
    } catch {}
  }, [galleryPhotos]);

  useEffect(() => {
    try {
      localStorage.setItem('youngfire_authentic_lessons', JSON.stringify(lessons));
    } catch {}
  }, [lessons]);

  useEffect(() => {
    try {
      localStorage.setItem('youngfire_prayers_dock', JSON.stringify(prayers));
    } catch {}
  }, [prayers]);

  useEffect(() => {
    try {
      localStorage.setItem('youngfire_fellowship_ideas', JSON.stringify(ideas));
    } catch {}
  }, [ideas]);

  // --- Photo Upload Handler (Supports Multi-File and Entire Folders for 160+ photos) ---
  const handleBatchPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingBatch(true);
    setUploadProgress(`Processing ${files.length} photos...`);

    const newPhotoList: PhotoMoment[] = [];
    let loadedCount = 0;

    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const dataUrl = uploadEvent.target?.result as string;
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        
        newPhotoList.push({
          id: `photo_${Date.now()}_${index}`,
          title: cleanName || `YoungFire Moment ${galleryPhotos.length + index + 1}`,
          category: 'Sanctuary Life',
          caption: 'Authentic fellowship moment captured with YoungFire disciples.',
          scripture: 'Psalm 133:1 — Behold, how good and how pleasant it is for brethren to dwell together in unity!',
          imageUrl: dataUrl,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        });

        loadedCount++;
        setUploadProgress(`Uploaded ${loadedCount} of ${files.length} photos...`);

        if (loadedCount === files.length) {
          const combined = [...newPhotoList, ...galleryPhotos];
          setGalleryPhotos(combined);
          setIsUploadingBatch(false);
          setUploadProgress('');

          // Sync to backend API
          fetch('/api/gallery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newPhotoList)
          }).catch(() => {});
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleOpenEditPhoto = (photo: PhotoMoment, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingPhoto(photo);
    setEditPhotoTitle(photo.title || '');
    setEditPhotoCategory(photo.category || 'Sanctuary Life');
    setEditPhotoCaption(photo.caption || '');
    setEditPhotoScripture(photo.scripture || '');
    setEditPhotoDate(photo.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
    setEditPhotoImageUrl(photo.imageUrl);
  };

  const handleSaveEditPhoto = () => {
    if (!editingPhoto) return;
    const updated = galleryPhotos.map(p => {
      if (p.id === editingPhoto.id) {
        return {
          ...p,
          title: editPhotoTitle.trim() || p.title,
          category: editPhotoCategory.trim() || p.category,
          caption: editPhotoCaption.trim(),
          scripture: editPhotoScripture.trim(),
          date: editPhotoDate.trim() || p.date,
          imageUrl: editPhotoImageUrl.trim() || p.imageUrl
        };
      }
      return p;
    });
    setGalleryPhotos(updated);
    try {
      localStorage.setItem('youngfire_gallery_photos', JSON.stringify(updated));
    } catch {}

    if (activeLightboxPhoto?.id === editingPhoto.id) {
      setActiveLightboxPhoto({
        ...activeLightboxPhoto,
        title: editPhotoTitle.trim() || activeLightboxPhoto.title,
        category: editPhotoCategory.trim() || activeLightboxPhoto.category,
        caption: editPhotoCaption.trim(),
        scripture: editPhotoScripture.trim(),
        date: editPhotoDate.trim() || activeLightboxPhoto.date,
        imageUrl: editPhotoImageUrl.trim() || activeLightboxPhoto.imageUrl
      });
    }
    setEditingPhoto(null);
  };

  const handleRequestDeletePhoto = (photo: PhotoMoment, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPhotoToDelete(photo);
  };

  const handleConfirmDeletePhoto = () => {
    if (!photoToDelete) return;
    const photoId = photoToDelete.id;
    const updated = galleryPhotos.filter(p => p.id !== photoId);
    setGalleryPhotos(updated);
    try {
      localStorage.setItem('youngfire_gallery_photos', JSON.stringify(updated));
    } catch {}

    if (activeLightboxPhoto?.id === photoId) {
      setActiveLightboxPhoto(null);
    }
    setPhotoToDelete(null);
    fetch(`/api/gallery/${photoId}`, { method: 'DELETE' }).catch(() => {});
  };

  const handleDeletePhoto = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const photo = galleryPhotos.find(p => p.id === id);
    if (photo) {
      setPhotoToDelete(photo);
    } else {
      const updated = galleryPhotos.filter(p => p.id !== id);
      setGalleryPhotos(updated);
      try {
        localStorage.setItem('youngfire_gallery_photos', JSON.stringify(updated));
      } catch {}
      if (activeLightboxPhoto?.id === id) {
        setActiveLightboxPhoto(null);
      }
      fetch(`/api/gallery/${id}`, { method: 'DELETE' }).catch(() => {});
    }
  };

  const handleResetToDefaultPhotos = () => {
    if (window.confirm('Restore all original 27 authentic sanctuary photos?')) {
      setGalleryPhotos(INITIAL_AUTHENTIC_PHOTOS);
      try {
        localStorage.setItem('youngfire_gallery_photos', JSON.stringify(INITIAL_AUTHENTIC_PHOTOS));
      } catch {}
      if (activeLightboxPhoto) setActiveLightboxPhoto(null);
    }
  };

  // --- Chat Handlers (Real-Time Firestore Handshake on fellowship_chat) ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuestUser) {
      window.dispatchEvent(new CustomEvent('yf_guest_restriction', { detail: { feature: 'Fellowship Chat Posting' } }));
      return;
    }
    const messageText = newChatInput.trim();
    if (!messageText) return;

    const { senderName, senderId } = resolveDiscipleIdentity();
    const currentUserName = currentUser?.name || (currentUser as any)?.displayName || senderName;
    const currentUserId = currentUser?.id || (currentUser as any)?.uid || senderId;
    const currentUserRole = currentUser?.role || 'YoungFire Member';
    const currentUserAvatar = (currentUser as any)?.avatarUrl || currentUser?.avatar || '';

    setNewChatInput('');

    try {
      await addDoc(collection(db, 'fellowship_chat'), {
        text: messageText.trim(),
        senderId: currentUserId,
        senderName: currentUserName,
        senderRole: currentUserRole,
        avatarUrl: currentUserAvatar,
        timestamp: Date.now(),
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Firebase Fellowship Chat Write Error:", error);
    }
  };

  const handleDeleteChatMessage = async (_thread: string, id: string, msgSenderId?: string) => {
    const isSenderMatch = Boolean(
      msgSenderId && (currentUser?.id === msgSenderId || (currentUser as any)?.uid === msgSenderId)
    );
    const isAdminUser = Boolean(
      currentUser?.isAdmin ||
      currentUser?.accountType === 'administrator' ||
      currentUser?.role === 'Administrator' ||
      activeUser?.role === 'Administrator' ||
      ['trentwhite0308@gmail.com', 'trentwhitemba@yahoo.com', 'white.whitney91@gmail.com', 'jhowyoungfire@gmail.com', 'luislopez567@hotmail.com'].includes(
        (currentUser?.email || activeUser?.email || '').toLowerCase().trim()
      )
    );
    if (!isSenderMatch && !(isAdminUser === true)) return;

    setChatMessages(prev => prev.filter(m => m.id !== id));
    try {
      await deleteDoc(doc(db, 'fellowship_chat', id));
    } catch (error) {
      console.error("Firebase Fellowship Chat Delete Error:", error);
    }
  };

  const handleStartEditChatMessage = (msg: ChatMessage) => {
    const isSenderMatch = Boolean(
      msg.senderId && (currentUser?.id === msg.senderId || (currentUser as any)?.uid === msg.senderId)
    );
    if (!isSenderMatch) return;
    setEditingChatId(msg.id);
    setEditingChatText(msg.text);
  };

  const handleSaveEditChatMessage = async (_thread: string, id: string, msgSenderId?: string) => {
    const isSenderMatch = Boolean(
      msgSenderId && (currentUser?.id === msgSenderId || (currentUser as any)?.uid === msgSenderId)
    );
    if (!isSenderMatch) {
      setEditingChatId(null);
      setEditingChatText('');
      return;
    }
    if (!editingChatText.trim()) return;
    const updatedText = editingChatText.trim();
    setChatMessages(prev => prev.map(m => m.id === id ? { ...m, text: updatedText } : m));
    setEditingChatId(null);
    setEditingChatText('');
    try {
      await updateDoc(doc(db, 'fellowship_chat', id), { text: updatedText });
    } catch (error) {
      console.error("Firebase Fellowship Chat Edit Error:", error);
    }
  };

  const handleClearChatThread = async (_thread: string) => {
    const current = [...chatMessages];
    setChatMessages([]);
    try {
      await Promise.all(current.map(m => deleteDoc(doc(db, 'fellowship_chat', m.id))));
    } catch (error) {
      console.error("Firebase Fellowship Chat Clear Error:", error);
    }
  };

  // --- Prayer Dock Handlers (With Green Checkmarks) ---
  const handleTogglePrayerCompleted = (id: string) => {
    const updated = prayers.map(p => {
      if (p.id === id) {
        const isNowCompleted = !p.completed;
        return {
          ...p,
          completed: isNowCompleted,
          status: isNowCompleted ? 'Answered Praise' : 'Active Intercession'
        };
      }
      return p;
    });
    setPrayers(updated);

    const target = updated.find(p => p.id === id);
    if (target) {
      fetch('/api/prayers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target)
      }).catch(() => {});
    }
  };

  const canModifyPrayer = (prayer: PrayerItem) => {
    if (!activeUser) return true;
    const role = (activeUser.role || '').toLowerCase();
    const isAdmin = role.includes('admin') || role.includes('overseer') || role.includes('facilitator') || role.includes('leader');
    const isAuthor = (prayer.authorId && prayer.authorId === activeUser.id) ||
                     (prayer.authorName && prayer.authorName.toLowerCase() === activeUser.name?.toLowerCase()) ||
                     (Array.isArray(prayer.names) && prayer.names.some(n => n.toLowerCase().includes(activeUser.name?.toLowerCase())));
    return isAdmin || isAuthor;
  };

  const handlePrayForRequest = async (id: string) => {
    const updated = prayers.map(p => {
      if (p.id === id) {
        const curIntercessors = Array.isArray(p.intercessors) ? [...p.intercessors] : [];
        const userKey = activeUser?.id || activeUser?.name || 'disciple';
        if (!curIntercessors.includes(userKey)) {
          curIntercessors.push(userKey);
        }
        const curCount = Math.max(p.intercessorsCount || 0, curIntercessors.length);
        return {
          ...p,
          intercessors: curIntercessors,
          intercessorsCount: curCount + 1
        };
      }
      return p;
    });
    setPrayers(updated);
    try {
      localStorage.setItem('youngfire_prayers_dock', JSON.stringify(updated));
      await fetch(`/api/prayers/${id}/pray`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUser?.id, userName: activeUser?.name })
      });
    } catch {}
  };

  const handleStartEditPrayer = (prayer: PrayerItem) => {
    setEditingPrayer(prayer);
    setEditPrayerNames(Array.isArray(prayer.names) ? prayer.names.join(', ') : prayer.names);
    setEditPrayerCause(prayer.cause);
  };

  const handleSaveEditPrayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrayer || !editPrayerCause.trim()) return;

    const updatedNames = editPrayerNames.trim()
      ? editPrayerNames.split(',').map(s => s.trim()).filter(Boolean)
      : editingPrayer.names;

    const updated = prayers.map(p => {
      if (p.id === editingPrayer.id) {
        return {
          ...p,
          names: updatedNames,
          cause: editPrayerCause.trim()
        };
      }
      return p;
    });

    setPrayers(updated);
    const target = updated.find(p => p.id === editingPrayer.id);
    setEditingPrayer(null);

    if (target) {
      try {
        localStorage.setItem('youngfire_prayers_dock', JSON.stringify(updated));
        fetch(`/api/prayers/${target.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(target)
        }).catch(() => {});
      } catch {}
    }
  };

  const handleAddPrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuestUser) {
      setIsPrayerModalOpen(false);
      window.dispatchEvent(new CustomEvent('yf_guest_restriction', { detail: { feature: 'Sanctuary Prayer Wall Posting' } }));
      return;
    }
    if (!newPrayerCause.trim()) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const { senderName, senderId } = resolveDiscipleIdentity();

    const prayerPayload = {
      date: dateStr,
      names: newPrayerName.trim() ? [newPrayerName.trim()] : [senderName],
      cause: newPrayerCause.trim(),
      status: 'Active Intercession',
      completed: false,
      authorId: senderId,
      authorName: senderName,
      intercessorsCount: 1,
      intercessors: [senderId],
      timestamp: Date.now(),
      createdAt: serverTimestamp()
    };

    setNewPrayerName('');
    setNewPrayerCause('');
    setIsPrayerModalOpen(false);

    try {
      await addDoc(collection(db, 'prayers'), prayerPayload);
    } catch (err) {
      console.error('Firebase Prayer Write Error:', err);
    }

    fetch('/api/prayers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: `prayer_${Date.now()}`, ...prayerPayload })
    }).catch(() => {});
  };

  const handleDeletePrayer = async (id: string) => {
    const updated = prayers.filter(p => p.id !== id);
    setPrayers(updated);
    try {
      localStorage.setItem('youngfire_prayers_dock', JSON.stringify(updated));
    } catch {}
    try {
      await deleteDoc(doc(db, 'prayers', id));
    } catch {}
    fetch(`/api/prayers/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  // --- Lesson Handlers (Create, Upload Attachments & Videos) ---
  const handleCreateLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonTitle.trim() || !newLessonPassage.trim()) return;

    const teachingDateValue = newLessonTeachingDate.trim() || new Date().toISOString().split('T')[0];

    const newLesson: DiscipleshipLesson = {
      id: `lesson_${Date.now()}`,
      title: newLessonTitle.trim(),
      lessonTitle: newLessonTitle.trim(),
      teachingDate: teachingDateValue,
      facilitator: newLessonTeachers || 'Trent White',
      description: newLessonSummary.trim() || 'Biblical study and practical discipleship application.',
      scripturePassage: newLessonPassage.trim(),
      studyNotes: newLessonNotes.trim() || 'Lesson notes taken during discipleship gathering.',
      attachmentUrls: [],
      youtubeUrl: newLessonVideoUrl || undefined,
      seriesTitle: newLessonSeries || 'YoungFire Discipleship',
      dateOrSeason: `${teachingDateValue} • Taught Session`,
      primaryPassage: newLessonPassage.trim(),
      bookId: 'EPH',
      chapter: 4,
      teachers: newLessonTeachers || 'Trent White & Whitney White (YoungFire Discipleship Leaders)',
      theme: newLessonTheme || 'Kingdom Character & Discipleship',
      summary: newLessonSummary.trim() || 'Biblical study and practical discipleship application.',
      notesContent: newLessonNotes.trim() || 'Lesson notes taken during discipleship gathering.',
      youtubeId: newLessonVideoUrl ? (newLessonVideoUrl.match(/v=([a-zA-Z0-9_-]+)/)?.[1] || newLessonVideoUrl) : undefined,
      videoUrl: newLessonVideoUrl,
      questions: [
        'How does this Scripture challenge your daily walk?',
        'What step of obedience is God calling you to take this week?'
      ],
      challenge: 'Apply this truth directly in your workplace, school, or home today.',
      attachments: [],
      canEdit: true
    };

    const updated = [newLesson, ...lessons];
    setLessons(updated);
    setIsNewLessonModalOpen(false);
    setSelectedLessonIndex(0);

    fetch('/api/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLesson)
    }).catch(() => {});
  };

  const handleStartEditLesson = (lesson: DiscipleshipLesson) => {
    setEditingLessonId(lesson.id);
    setEditLessonTitle(lesson.lessonTitle || lesson.title || '');
    setEditLessonSeries(lesson.seriesTitle || '');
    setEditLessonTeachingDate(lesson.teachingDate || new Date().toISOString().split('T')[0]);
    setEditLessonPassage(lesson.primaryPassage || lesson.scripturePassage || '');
    setEditLessonTeachers(lesson.teachers || lesson.facilitator || '');
    setEditLessonTheme(lesson.theme || '');
    setEditLessonSummary(lesson.summary || lesson.description || '');
    setEditLessonNotes(lesson.notesContent || lesson.studyNotes || '');
    setEditLessonVideoUrl(lesson.videoUrl || lesson.youtubeUrl || '');
    setIsEditLessonModalOpen(true);
  };

  const handleSaveLessonEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLessonId) return;

    const targetIdx = lessons.findIndex(l => l.id === editingLessonId);
    if (targetIdx === -1) return;

    const current = lessons[targetIdx];
    const updated: DiscipleshipLesson = {
      ...current,
      title: editLessonTitle.trim(),
      lessonTitle: editLessonTitle.trim(),
      seriesTitle: editLessonSeries.trim() || current.seriesTitle,
      teachingDate: editLessonTeachingDate || current.teachingDate,
      dateOrSeason: `${editLessonTeachingDate} • Taught Session`,
      scripturePassage: editLessonPassage.trim() || current.scripturePassage,
      primaryPassage: editLessonPassage.trim() || current.primaryPassage,
      facilitator: editLessonTeachers.trim() || current.facilitator,
      teachers: editLessonTeachers.trim() || current.teachers,
      theme: editLessonTheme.trim() || current.theme,
      description: editLessonSummary.trim() || current.description,
      summary: editLessonSummary.trim() || current.summary,
      studyNotes: editLessonNotes.trim() || current.studyNotes,
      notesContent: editLessonNotes.trim() || current.notesContent,
      youtubeUrl: editLessonVideoUrl.trim() || current.youtubeUrl,
      videoUrl: editLessonVideoUrl.trim() || current.videoUrl,
      youtubeId: editLessonVideoUrl ? (editLessonVideoUrl.match(/v=([a-zA-Z0-9_-]+)/)?.[1] || editLessonVideoUrl) : current.youtubeId
    };

    const updatedLessons = lessons.map(l => l.id === editingLessonId ? updated : l);
    setLessons(updatedLessons);
    setIsEditLessonModalOpen(false);

    fetch(`/api/lessons/${editingLessonId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});
  };

  const handleUploadLessonAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const activeLesson = lessons[selectedLessonIndex];
    if (!activeLesson) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const fileUrl = loadEvt.target?.result as string;
        const newAttachment: LessonAttachment = {
          name: file.name,
          url: fileUrl,
          size: `${Math.round(file.size / 1024)} KB`,
          type: file.type || 'application/octet-stream'
        };

        const updatedLesson = {
          ...activeLesson,
          attachments: [...(activeLesson.attachments || []), newAttachment]
        };

        const updatedLessons = lessons.map((l, idx) => idx === selectedLessonIndex ? updatedLesson : l);
        setLessons(updatedLessons);

        fetch(`/api/lessons/${activeLesson.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedLesson)
        }).catch(() => {});
      };
      reader.readAsDataURL(file);
    });
  };

  // --- Fellowship Ideas Handlers ---
  const handleAddIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdeaTitle.trim()) return;

    const { senderName, senderId } = resolveDiscipleIdentity();
    const ideaPayload: FellowshipIdea = {
      id: `idea_${Date.now()}`,
      title: newIdeaTitle.trim(),
      description: newIdeaDesc.trim() || 'Gathering idea proposed by YoungFire disciple.',
      author: senderName || 'YoungFire Disciple',
      authorId: senderId,
      status: isFacilitator ? 'approved' : 'pending',
      votes: 1,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };

    setIdeas([ideaPayload, ...ideas]);
    setNewIdeaTitle('');
    setNewIdeaDesc('');
    setIsIdeaFormOpen(false);

    fetch('/api/fellowship/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ideaPayload)
    }).catch(() => {});
  };

  const handleApproveIdea = (id: string) => {
    if (!isFacilitator) return;
    const updated = ideas.map(i => i.id === id ? { ...i, status: 'approved' as const } : i);
    setIdeas(updated);
    try {
      localStorage.setItem('youngfire_fellowship_ideas', JSON.stringify(updated));
    } catch {}
  };

  const handleVoteIdea = (id: string) => {
    const updated = ideas.map(i => i.id === id ? { ...i, votes: i.votes + 1 } : i);
    setIdeas(updated);
    fetch(`/api/fellowship/ideas/${id}/vote`, { method: 'POST' }).catch(() => {});
  };

  const handleDownvoteIdea = (id: string) => {
    const updated = ideas.map(i => i.id === id ? { ...i, votes: Math.max(0, i.votes - 1) } : i);
    setIdeas(updated);
    fetch(`/api/fellowship/ideas/${id}/downvote`, { method: 'POST' }).catch(() => {});
  };

  const handleDeleteIdea = (id: string) => {
    const updated = ideas.filter(i => i.id !== id);
    setIdeas(updated);
    try {
      localStorage.setItem('youngfire_fellowship_ideas', JSON.stringify(updated));
    } catch {}
  };

  const handleScheduleIdeaToCalendar = (idea: FellowshipIdea, targetDate: string) => {
    const updatedIdea = { ...idea, scheduledDate: targetDate, scheduledStatus: true };
    const updated = ideas.map(i => i.id === idea.id ? updatedIdea : i);
    setIdeas(updated);
    setSchedulingIdea(null);
    fetch(`/api/fellowship/ideas/${idea.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedIdea)
    }).catch(() => {});
  };

  return (
    <div className="relative w-full">
      <div className="relative z-10 w-full max-w-5xl mx-auto space-y-6 pb-24 select-none px-2 sm:px-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-[#0a0a0a] border border-white/15 text-slate-200 hover:text-white cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-black uppercase font-['Outfit'] text-white">
                YOUNGFIRE FELLOWSHIP SANCTUARY
              </h2>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              Brotherhood &bull; Sisterhood &bull; Discipleship Lessons &bull; 24/7 Prayer Dock
            </p>
          </div>
        </div>

        {/* View Switcher: [ Grid Hubs ] | [ ☸ Orbit Wheel Hub ] */}
        <div className="flex items-center gap-2">
          <div className="flex bg-[#0a0a0a] p-1 rounded-xl border border-white/10 text-xs font-mono">
            <button
              onClick={() => { setHubViewMode('grid'); setActiveDrillDown(null); }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                hubViewMode === 'grid'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Grid View
            </button>
            <button
              onClick={() => { setHubViewMode('wheel'); setActiveDrillDown(null); }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                hubViewMode === 'wheel'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ☸ Orbit Wheel
            </button>
          </div>
        </div>
      </div>

      {/* WHEEL VIEW MODE */}
      {hubViewMode === 'wheel' && !activeDrillDown && (
        <div className="bg-[#0a0a0a] border border-amber-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col items-center justify-center space-y-4">
          <WheelHub onSelectHub={handleOrbitSelect} />
          <p className="text-xs font-mono text-slate-400 text-center max-w-md">
            Interactive Orbit Wheel: Drag to spin the wheel or tap any orbital node above to navigate to that pillar!
          </p>
        </div>
      )}

      {/* MAIN HUBS OVERVIEW (GRID VIEW) */}
      {hubViewMode === 'grid' && !activeDrillDown && (
        <div className="space-y-6">
          {/* Hero Card with Dynamic Fellowship Pulpit/Gathering Photo - Show all faces without cropping */}
          <div className="relative rounded-3xl overflow-hidden border border-amber-500/40 shadow-2xl bg-[#060a14] group">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
              {/* Left/Content Column */}
              <div className="lg:col-span-6 p-6 sm:p-8 space-y-3 z-10">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] font-mono tracking-widest uppercase">
                    SANCTUARY DISCIPLESHIP
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[10px] uppercase font-bold">
                    Joshua House of Worship
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black font-['Outfit'] uppercase text-white leading-tight">
                  EVERY JOINT SUPPLIES
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 font-serif leading-relaxed">
                  Led by Trent & Whitney White alongside Joshua House of Worship, YoungFire exists to ignite young adult disciples into holy boldness, prayerful accountability, and authentic brotherhood and sisterhood.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-3 text-[11px] font-mono text-amber-400/90 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    Authentic Fellowship
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    Discipleship & Community
                  </span>
                </div>
              </div>

              {/* Right Photo Column - Showing 100% of all faces in the fellowship photo */}
              <div className="lg:col-span-6 relative p-3 sm:p-5 flex items-center justify-center bg-black/40">
                <div className="relative w-full max-w-md mx-auto rounded-2xl overflow-hidden border border-amber-500/25 shadow-xl bg-[#040711]">
                  <img
                    src={fellowshipHubCover}
                    alt="Every Joint Supplies - YoungFire Fellowship Gathering"
                    className="w-full h-auto max-h-[420px] object-contain mx-auto transition-transform duration-700 group-hover:scale-[1.02]"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/IMG_3525.jpg';
                    }}
                  />
                  <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Core 4 Interactive Fellowship Cards with Dynamic Cover Banners */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Men On Fire (NO PICTURE) */}
            <div 
              onClick={handleEnterMenOnFire}
              className="rounded-3xl bg-[#0a0a0a] border border-orange-500/40 hover:border-orange-500/70 cursor-pointer transition-all hover:bg-orange-950/20 shadow-xl group overflow-hidden border-t border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] flex flex-col p-5 sm:p-6 justify-between relative"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-orange-500/20 border border-orange-400/50 flex items-center justify-center text-orange-400 shadow-md group-hover:scale-105 transition-transform">
                    <Shield className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono text-orange-300 font-bold uppercase px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/40">
                    Brotherhood Cohort
                  </span>
                </div>
                <div>
                  <h4 className="text-xl font-black uppercase text-white font-['Outfit'] flex items-center gap-2">
                    <span>Men On Fire</span>
                    <span className="text-xs text-orange-400 font-mono font-normal">⚔️</span>
                  </h4>
                  <p className="text-xs text-slate-300 font-serif mt-2 leading-relaxed">
                    7-Day Spiritual Armor Plan, weekly Monday Zoom huddle, and iron-sharpens-iron brotherhood discussion and discipleship.
                  </p>
                </div>
              </div>
              <div className="flex items-center text-orange-400 text-xs font-mono font-bold group-hover:translate-x-1.5 transition-transform pt-4 border-t border-white/5 mt-3">
                <span>Enter Brotherhood Space &rarr;</span>
              </div>
            </div>

            {/* Card 2: Women Ignited (NO PICTURE) */}
            <div 
              onClick={handleEnterWomenIgnited}
              className="rounded-3xl bg-[#0a0a0a] border border-rose-500/40 hover:border-rose-500/70 cursor-pointer transition-all hover:bg-rose-950/20 shadow-xl group overflow-hidden border-t border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] flex flex-col p-5 sm:p-6 justify-between relative"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-400/50 flex items-center justify-center text-rose-400 shadow-md group-hover:scale-105 transition-transform">
                    <Heart className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono text-rose-300 font-bold uppercase px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/40">
                    Sisterhood Cohort
                  </span>
                </div>
                <div>
                  <h4 className="text-xl font-black uppercase text-white font-['Outfit'] flex items-center gap-2">
                    <span>Women Ignited</span>
                    <span className="text-xs text-rose-400 font-mono font-normal">🕊️</span>
                  </h4>
                  <p className="text-xs text-slate-300 font-serif mt-2 leading-relaxed">
                    7-Day Proverbs 31 Sacred Plan, Thursday Zoom prayer circle, and holy sisterhood encouragement and covenant community.
                  </p>
                </div>
              </div>
              <div className="flex items-center text-rose-400 text-xs font-mono font-bold group-hover:translate-x-1.5 transition-transform pt-4 border-t border-white/5 mt-3">
                <span>Enter Sisterhood Space &rarr;</span>
              </div>
            </div>

            {/* Card 3: Discipleship Lessons Vault */}
            <div 
              onClick={() => setActiveDrillDown('discipleship')}
              className="rounded-3xl bg-[#0a0a0a] border border-amber-500/30 hover:border-amber-500/60 cursor-pointer transition-all hover:bg-amber-950/20 shadow-xl group overflow-hidden border-t border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] flex flex-col"
            >
              <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-black/40 flex items-center justify-center">
                <img 
                  src={smallGroupsCover} 
                  alt="Small Groups & Lessons Vault" 
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/IMG_3521.jpg'; }}
                  className="w-full h-full object-cover object-top filter contrast-110 brightness-105 transition-transform duration-500 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/30 to-transparent" />
                <div className="absolute top-3 left-3 w-9 h-9 rounded-xl bg-amber-500/30 backdrop-blur-md border border-amber-400/50 flex items-center justify-center text-amber-300">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] font-mono text-amber-300 font-bold uppercase px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-amber-500/30">
                    {lessons.length} Lessons
                  </span>
                </div>
              </div>
              <div className="p-5 pt-2 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-base font-black uppercase text-white font-['Outfit']">Small Groups & Lessons Vault</h4>
                  <p className="text-xs text-slate-300 font-serif mt-1">
                    Expository studies, PDF attachments, video uploads, and ability for viewers and leaders to create and edit lessons.
                  </p>
                </div>
                <div className="flex items-center text-amber-400 text-xs font-mono font-bold group-hover:translate-x-1 transition-transform">
                  <span>Open Discipleship Vault &rarr;</span>
                </div>
              </div>
            </div>

            {/* Card 4: Fellowship Hub, Ideas & Schedule */}
            <div 
              onClick={() => setActiveDrillDown('fellowship_hub')}
              className="rounded-3xl bg-[#0a0a0a] border border-amber-500/30 hover:border-amber-500/60 cursor-pointer transition-all hover:bg-amber-950/20 shadow-xl group overflow-hidden border-t border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] flex flex-col"
            >
              <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-black/40 flex items-center justify-center">
                <img 
                  src={fellowshipHubCover} 
                  alt="Fellowship Hub & Gatherings" 
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/IMG_3525.jpg'; }}
                  className="w-full h-full object-cover object-top filter contrast-110 brightness-105 transition-transform duration-500 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/30 to-transparent" />
                <div className="absolute top-3 left-3 w-9 h-9 rounded-xl bg-amber-500/30 backdrop-blur-md border border-amber-400/50 flex items-center justify-center text-amber-300">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] font-mono text-amber-300 font-bold uppercase px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-amber-500/30">
                    Community Hub
                  </span>
                </div>
              </div>
              <div className="p-5 pt-2 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-base font-black uppercase text-white font-['Outfit']">Fellowship Hub & Gatherings</h4>
                  <p className="text-xs text-slate-300 font-serif mt-1">
                    Weekly gathering schedule, YoungFire community chat, user-submitted idea list with voting, and events RSVP.
                  </p>
                </div>
                <div className="flex items-center text-amber-400 text-xs font-mono font-bold group-hover:translate-x-1 transition-transform">
                  <span>View Schedule & Idea List &rarr;</span>
                </div>
              </div>
            </div>
          </div>

          {/* Fellowship Sanctuary Calendar & Two-Way Lesson Sync */}
          <FellowshipCalendar
            lessons={lessons}
            ideas={ideas}
            onSelectLesson={(lessonIdx) => {
              setSelectedLessonIndex(lessonIdx);
              setActiveDrillDown('discipleship');
            }}
            currentUser={activeUser}
            onNavigateToScripture={onNavigateToScripture}
          />

          {/* ALL 12 REORGANIZED HUBS & PILLARS */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold px-1">
              All 12 Sanctuary Pillars & Hubs
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {/* 1. Men On Fire */}
              <div 
                onClick={handleEnterMenOnFire}
                className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 hover:border-orange-500/50 cursor-pointer transition-all hover:bg-orange-950/20 group border-t border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
              >
                <Shield className="w-5 h-5 text-orange-400 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="text-xs font-black uppercase text-white font-['Outfit']">Men On Fire</h4>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">7-Day Armor & Brotherhood</p>
              </div>

              {/* 2. Women Ignited */}
              <div 
                onClick={handleEnterWomenIgnited}
                className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 hover:border-rose-500/50 cursor-pointer transition-all hover:bg-rose-950/20 group border-t border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
              >
                <Heart className="w-5 h-5 text-rose-400 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="text-xs font-black uppercase text-white font-['Outfit']">Women Ignited</h4>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">7-Day Proverbs 31 Plan</p>
              </div>

              {/* 3. Open Bible Thursdays */}
              <div 
                onClick={() => setActiveDrillDown('openbible')}
                className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 hover:border-amber-500/50 cursor-pointer transition-all hover:bg-amber-950/20 group border-t border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
              >
                <BookOpen className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="text-xs font-black uppercase text-white font-['Outfit']">Open Bible Thursdays</h4>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">All Day • Anytime • 66-Book Engine</p>
              </div>

              {/* 4. Small Groups Lessons Vault */}
              <div 
                onClick={() => setActiveDrillDown('discipleship')}
                className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 hover:border-amber-500/50 cursor-pointer transition-all hover:bg-amber-950/20 group border-t border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
              >
                <Users className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="text-xs font-black uppercase text-white font-['Outfit']">Lessons Vault</h4>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{lessons.length} Taught Lessons</p>
              </div>

              {/* 5. Fellowship Hub (Replaces Creative Arts) */}
              <div 
                onClick={() => setActiveDrillDown('fellowship_hub')}
                className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 hover:border-purple-500/50 cursor-pointer transition-all hover:bg-purple-950/20 group border-t border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
              >
                <Calendar className="w-5 h-5 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="text-xs font-black uppercase text-white font-['Outfit']">Fellowship Hub</h4>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Ideas, Voting & Schedule</p>
              </div>

              {/* 6. Daily Bread Hub (Replaces Young Professionals) */}
              <div 
                onClick={() => setActiveDrillDown('daily_bread')}
                className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 hover:border-amber-500/50 cursor-pointer transition-all hover:bg-amber-950/20 group border-t border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
              >
                <BookOpen className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="text-xs font-black uppercase text-white font-['Outfit']">Daily Bread Hub</h4>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Verse of the Day & Manna</p>
              </div>

              {/* 7. 24/7 Prayer Tower & Dock */}
              <div 
                onClick={() => setActiveDrillDown('prayer_dock')}
                className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 hover:border-emerald-500/50 cursor-pointer transition-all hover:bg-emerald-950/20 group border-t border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
              >
                <Flame className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="text-xs font-black uppercase text-white font-['Outfit']">24/7 Prayer Dock</h4>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Intercession & Praise Check</p>
              </div>

              {/* 8. Bible Tracker Analytics (Replaces Marriage Covenant) */}
              <div 
                onClick={() => setActiveDrillDown('bible_analytics')}
                className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 hover:border-amber-500/50 cursor-pointer transition-all hover:bg-amber-950/20 group border-t border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
              >
                <Award className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="text-xs font-black uppercase text-white font-['Outfit']">Tracker Analytics</h4>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">52-Wk Goals & Badges</p>
              </div>

              {/* 9. Reading Plans Hub (Replaces City Outreach) */}
              <div 
                onClick={() => setActiveDrillDown('reading_plans')}
                className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 hover:border-teal-500/50 cursor-pointer transition-all hover:bg-teal-950/20 group border-t border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
              >
                <FileText className="w-5 h-5 text-teal-400 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="text-xs font-black uppercase text-white font-['Outfit']">Reading Plans</h4>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">5-Day, 7-Day & Custom</p>
              </div>

              {/* 10. Authentic Photo Gallery (Multi-file & Folders) */}
              <div 
                onClick={() => setActiveDrillDown('wall')}
                className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 hover:border-pink-500/50 cursor-pointer transition-all hover:bg-pink-950/20 group border-t border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
              >
                <Camera className="w-5 h-5 text-pink-400 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="text-xs font-black uppercase text-white font-['Outfit']">Photo Vault</h4>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{galleryPhotos.length} HD Photos Uploaded</p>
              </div>

              {/* 11. Kingdom Video Vault & TV */}
              <div 
                onClick={() => onNavigate('tv')}
                className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 hover:border-rose-500/50 cursor-pointer transition-all hover:bg-rose-950/20 group border-t border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
              >
                <Video className="w-5 h-5 text-rose-400 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="text-xs font-black uppercase text-white font-['Outfit']">Kingdom TV</h4>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">200+ Praise & JHOW Live</p>
              </div>

              {/* 12. 24/7 Gospel Radio */}
              <div 
                onClick={() => onNavigate('radio')}
                className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 hover:border-amber-500/50 cursor-pointer transition-all hover:bg-amber-950/20 group border-t border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
              >
                <Radio className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="text-xs font-black uppercase text-white font-['Outfit']">Gospel Radio</h4>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">8 Global Stations 24/7</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRILL DOWN SUBVIEW 1: OPEN BIBLE THURSDAYS */}
      {activeDrillDown === 'openbible' && (
        <OpenBibleThursdays
          onBack={() => setActiveDrillDown(null)}
          onNavigateToScripture={(bookId, chapter, verse, origin) => {
            if (onNavigateToScripture) {
              onNavigateToScripture(bookId, chapter, verse, origin || {
                tab: 'fellowship',
                drillDown: 'openbible',
                label: 'Back to Open Bible'
              });
            } else {
              onNavigate('word', 'bible');
            }
          }}
          currentUser={activeUser}
        />
      )}

      {/* DRILL DOWN SUBVIEW 2: MEN ON FIRE */}
      {activeDrillDown === 'men' && (
        <MenOnFireHub
          onBack={() => setActiveDrillDown(null)}
          currentUser={activeUser}
          onNavigateToScripture={onNavigateToScripture}
        />
      )}

      {/* DRILL DOWN SUBVIEW 3: WOMEN IGNITED */}
      {activeDrillDown === 'women' && (
        <WomenIgnitedHub
          onBack={() => setActiveDrillDown(null)}
          currentUser={activeUser}
          onNavigateToScripture={onNavigateToScripture}
        />
      )}

      {/* DRILL DOWN SUBVIEW 4: DISCIPLESHIP LESSONS VAULT (12 Authentic Lessons + Add/Edit + Uploads) */}
      {activeDrillDown === 'discipleship' && (() => {
        const activeLesson = lessons[selectedLessonIndex] || lessons[0] || INITIAL_AUTHENTIC_LESSONS[0];
        return (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveDrillDown(null)}
                  className="p-2 rounded-xl bg-[#0a0a0a] border border-white/15 text-slate-200 hover:text-white cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                    Discipleship Lessons Vault &bull; {lessons.length} Taught Sessions
                  </span>
                  <h3 className="text-base sm:text-lg font-black font-['Outfit'] uppercase text-white">
                    {activeLesson.lessonTitle}
                  </h3>
                </div>
              </div>

              {/* Add New Lesson Button for Viewers & Administrators */}
              <button
                onClick={() => setIsNewLessonModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 shadow-md self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Add New Lesson</span>
              </button>
            </div>

            {/* Horizontal Session Selector (All 12 Lessons) */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {lessons.map((les, idx) => (
                <button
                  key={les.id}
                  onClick={() => {
                    setSelectedLessonIndex(idx);
                    setExpandedLessonSection('core');
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-mono font-bold whitespace-nowrap cursor-pointer transition-all border ${
                    selectedLessonIndex === idx
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md'
                      : 'bg-[#0a0a0a] text-slate-300 hover:text-white border-white/10'
                  }`}
                >
                  <span>{idx + 1}. {les.lessonTitle.length > 25 ? `${les.lessonTitle.slice(0, 25)}...` : les.lessonTitle}</span>
                </button>
              ))}
            </div>

            {/* Lesson Metadata Header */}
            <div className="p-4 bg-[#0a0a0a] border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 block">{activeLesson.dateOrSeason} &bull; {activeLesson.teachers}</span>
                <span className="text-amber-400 font-bold">Theme: {activeLesson.theme}</span>
                {activeLesson.teachingDate && (
                  <span className="text-amber-400 text-[10px] font-mono flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    <span>Teaching Date: {activeLesson.teachingDate} (2-Way Calendar Sync)</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleStartEditLesson(activeLesson)}
                  className="px-3 py-1.5 rounded-xl bg-[#0a0a0a] hover:bg-[#1a1a1a] border border-white/20 text-slate-200 hover:text-white font-mono text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                  title="Edit lesson details and teaching date"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Edit Lesson</span>
                </button>

                <button
                  onClick={() => {
                    const updated = lessons.filter(l => l.id !== activeLesson.id);
                    setLessons(updated);
                    setSelectedLessonIndex(0);
                    try {
                      localStorage.setItem('youngfire_authentic_lessons', JSON.stringify(updated));
                      fetch(`/api/lessons/${activeLesson.id}`, { method: 'DELETE' });
                    } catch {}
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 hover:text-white font-mono text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                  title="Delete Lesson"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Delete</span>
                </button>

                <button
                  onClick={() => onNavigate('word', 'bible')}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Open {activeLesson.primaryPassage}</span>
                </button>
              </div>
            </div>

            {/* Video Section (if attached or embedded) */}
            {activeLesson.youtubeId && (
              <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${activeLesson.youtubeId}?rel=0`}
                  title={activeLesson.lessonTitle}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            {/* Vertical Flow Sections */}
            <div className="space-y-3">
              {/* 1. Core Scripture Passage & Exposition */}
              <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedLessonSection(expandedLessonSection === 'core' ? ('' as any) : 'core')}
                  className="w-full p-4 flex items-center justify-between text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold font-['Outfit'] uppercase text-white">
                      1. Core Scripture & Summary ({activeLesson.primaryPassage})
                    </span>
                  </div>
                  {expandedLessonSection === 'core' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedLessonSection === 'core' && (
                  <div className="p-4 pt-0 text-xs text-slate-200 space-y-3 border-t border-white/5">
                    <p className="leading-relaxed font-serif text-slate-200 text-sm">
                      {activeLesson.summary}
                    </p>
                  </div>
                )}
              </div>

              {/* 2. Verbatim Lesson Notes & Outline */}
              <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedLessonSection(expandedLessonSection === 'notes' ? ('' as any) : 'notes')}
                  className="w-full p-4 flex items-center justify-between text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold font-['Outfit'] uppercase text-white">
                      2. Detailed Teaching Notes & Scripture Outline
                    </span>
                  </div>
                  {expandedLessonSection === 'notes' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedLessonSection === 'notes' && (
                  <div className="p-4 pt-0 text-xs text-slate-200 border-t border-white/5">
                    <pre className="whitespace-pre-wrap font-serif text-xs leading-relaxed text-slate-200 bg-black/60 p-4 rounded-xl border border-white/5">
                      {activeLesson.notesContent}
                    </pre>
                  </div>
                )}
              </div>

              {/* 3. Small Group Discussion Questions */}
              <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedLessonSection(expandedLessonSection === 'questions' ? ('' as any) : 'questions')}
                  className="w-full p-4 flex items-center justify-between text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-bold font-['Outfit'] uppercase text-white">
                      3. Small Group Discussion Questions ({activeLesson.questions?.length || 0})
                    </span>
                  </div>
                  {expandedLessonSection === 'questions' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedLessonSection === 'questions' && (
                  <div className="p-4 pt-0 text-xs text-slate-200 space-y-2 border-t border-white/5">
                    {(activeLesson.questions || []).map((q: any, idx: number) => (
                      <div key={idx} className="p-3 bg-black/70 rounded-xl border border-white/5 flex gap-2">
                        <span className="text-amber-400 font-bold font-mono">{idx + 1}.</span>
                        <p className="font-serif text-slate-200">{q}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Action Challenge & Consecration */}
              <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedLessonSection(expandedLessonSection === 'application' ? ('' as any) : 'application')}
                  className="w-full p-4 flex items-center justify-between text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold font-['Outfit'] uppercase text-white">
                      4. Today's Kingdom Challenge & Practical Consecration
                    </span>
                  </div>
                  {expandedLessonSection === 'application' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedLessonSection === 'application' && (
                  <div className="p-4 pt-0 text-xs text-slate-200 space-y-2 border-t border-white/5">
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 font-serif leading-relaxed">
                      <span className="font-bold uppercase font-mono text-emerald-400 block mb-1 text-[11px]">Today's Action Mandate:</span>
                      {activeLesson.challenge}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Attachments & Study Handouts (With Direct Upload) */}
              <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedLessonSection(expandedLessonSection === 'handouts' ? ('' as any) : 'handouts')}
                  className="w-full p-4 flex items-center justify-between text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold font-['Outfit'] uppercase text-white">
                      5. Lesson Attachments & Handouts ({activeLesson.attachments?.length || 0})
                    </span>
                  </div>
                  {expandedLessonSection === 'handouts' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedLessonSection === 'handouts' && (
                  <div className="p-4 pt-0 text-xs text-slate-200 space-y-3 border-t border-white/5">
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[11px] font-mono text-slate-400">PDFs, Word Docs & Images for this lesson:</span>
                      <label className="px-3 py-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Attachment</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.txt,image/*"
                          onChange={handleUploadLessonAttachment}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {activeLesson.attachments && activeLesson.attachments.length > 0 ? (
                      <div className="space-y-2">
                        {activeLesson.attachments.map((att: any, idx: number) => (
                          <div key={idx} className="p-3 bg-black/70 rounded-xl border border-white/5 flex items-center justify-between">
                            <span className="text-slate-300 font-mono text-[11px] truncate">{att.name} ({att.size})</span>
                            <a
                              href={att.url}
                              download={att.name}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold cursor-pointer hover:bg-amber-500/30"
                            >
                              Download Handout
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400 italic bg-black/40 rounded-xl border border-white/5">
                        No attachments uploaded yet. Tap <strong>Upload Attachment</strong> to attach your lesson notes, PDF, or study guide!
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* DRILL DOWN SUBVIEW 5: FELLOWSHIP HUB (Schedule, YoungFire Chat, Idea List with Voting) */}
      {activeDrillDown === 'fellowship_hub' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-white/10">
            <button
              onClick={() => setActiveDrillDown(null)}
              className="p-2 rounded-xl bg-[#0a0a0a] border border-white/15 text-slate-200 hover:text-white cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-purple-400 font-bold">
                Community Life &bull; Ideas & Gatherings
              </span>
              <h3 className="text-lg font-black font-['Outfit'] uppercase text-white">
                Fellowship Hub & Schedule
              </h3>
            </div>
          </div>

          {/* Dynamic Fellowship Cover Banner with Dark Gradient Scrim */}
          <div className="relative w-full h-40 sm:h-52 rounded-3xl overflow-hidden border border-amber-500/30 shadow-2xl bg-black group">
            <img
              src={fellowshipHubCover}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/IMG_3525.jpg';
              }}
              alt="Fellowship Hub & Gatherings Cover"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              style={{ objectPosition: '50% 30%' }}
            />
            <div 
              className="absolute inset-0 pointer-events-none" 
              style={{
                background: 'linear-gradient(180deg, rgba(4, 7, 17, 0.3) 0%, rgba(4, 7, 17, 0.8) 65%, #000000 100%)'
              }}
            />
            <div className="absolute inset-0 p-5 sm:p-6 flex flex-col justify-end">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/25 border border-amber-500/50 text-amber-300 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Consecrated Fellowship & Idea Wall</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-black/60 border border-white/10 text-white/80 font-mono text-[9px]">
                  Acts 2:42 Community
                </span>
              </div>
              <h3 className="text-lg sm:text-2xl font-black font-['Outfit'] uppercase text-white tracking-wide drop-shadow-md">
                YoungFire Fellowship & Gatherings
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 font-serif line-clamp-1 sm:line-clamp-none drop-shadow">
                "And they continued stedfastly in the apostles' doctrine and fellowship, and in breaking of bread, and in prayers." — Acts 2:42
              </p>
            </div>
          </div>

          {/* Interactive Sanctuary Calendar with Two-Way Lesson Sync */}
          <FellowshipCalendar
            lessons={lessons}
            ideas={ideas}
            onSelectLesson={(lessonIdx) => {
              setSelectedLessonIndex(lessonIdx);
              setActiveDrillDown('discipleship');
            }}
            currentUser={activeUser}
            onNavigateToScripture={onNavigateToScripture}
          />

          {/* Gathering Schedule Card */}
          <div className="bg-[#0a0a0a] border border-purple-500/30 rounded-3xl p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span>Unified YoungFire Sanctuary Schedule</span>
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-black/60 rounded-xl border border-white/5">
                <span className="text-[10px] font-mono text-orange-400 font-bold block">BI-WEEKLY MONDAYS @ 7:00 PM CST</span>
                <h5 className="text-xs font-bold text-white mt-1">YoungFire Small Group Huddle</h5>
                <p className="text-[11px] text-slate-400 font-serif">The White&apos;s Residence &amp; Live Zoom Broadcast</p>
              </div>

              <div className="p-3 bg-black/60 rounded-xl border border-white/5">
                <span className="text-[10px] font-mono text-amber-400 font-bold block">ALL DAY THURSDAYS (ANY TIME)</span>
                <h5 className="text-xs font-bold text-white mt-1">Open Bible Thursdays</h5>
                <p className="text-[11px] text-slate-400 font-serif">All-day expository study &amp; timestamped reflections</p>
              </div>

              <div className="p-3 bg-black/60 rounded-xl border border-white/5">
                <span className="text-[10px] font-mono text-amber-400 font-bold block">SUNDAYS @ 11:00 AM CST</span>
                <h5 className="text-xs font-bold text-white mt-1">Sunday Corporate Worship</h5>
                <p className="text-[11px] text-slate-400 font-serif">Joshua House of Worship Main Sanctuary &bull; San Antonio, TX</p>
              </div>
            </div>
          </div>

          {/* Fellowship Idea List with Community Voting */}
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div>
                <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Community Fellowship Ideas & Voting</span>
                </h4>
                <p className="text-[10px] font-mono text-slate-400">Propose gathering ideas; top voted ideas get placed on the schedule!</p>
              </div>

              <button
                onClick={() => setIsIdeaFormOpen(!isIdeaFormOpen)}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono cursor-pointer"
              >
                {isIdeaFormOpen ? 'Close' : '+ Propose Idea'}
              </button>
            </div>

            {isIdeaFormOpen && (
              <form onSubmit={handleAddIdea} className="p-4 bg-black/80 rounded-2xl border border-amber-500/30 space-y-3">
                <input
                  type="text"
                  placeholder="Idea Title (e.g. Park Volleyball & Worship Picnic)"
                  value={newIdeaTitle}
                  onChange={(e) => setNewIdeaTitle(e.target.value)}
                  className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  required
                />
                <textarea
                  placeholder="Details, location idea, and what we will do..."
                  value={newIdeaDesc}
                  onChange={(e) => setNewIdeaDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-[#000000] border border-white/10 rounded-xl p-3 text-xs text-white"
                />
                <div className="flex justify-end gap-2">
                  <button type="submit" className="px-4 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl cursor-pointer">
                    Submit Idea for Voting
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {ideas.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 font-serif">
                  No ideas submitted yet. Be the first to propose a fellowship event!
                </div>
              ) : (
                ideas.map((idea) => {
                  const isTopVoted = idea.votes >= 3;
                  const currentUserId = currentUser?.id || (currentUser as any)?.uid || activeUser?.id || resolveDiscipleIdentity().senderId;
                  const isIdeaAuthor = Boolean(currentUserId && idea.authorId && currentUserId === idea.authorId);
                  const isLeadAdmin =
                    isFacilitator ||
                    Boolean(currentUser?.isAdmin) ||
                    currentUser?.accountType === 'administrator' ||
                    currentUser?.role === 'Administrator' ||
                    ['trentwhite0308@gmail.com', 'trentwhitemba@yahoo.com', 'white.whitney91@gmail.com', 'luislopez567@hotmail.com'].includes(
                      (currentUser?.email || activeUser?.email || '').toLowerCase().trim()
                    );
                  return (
                    <div key={idea.id} className="p-3.5 bg-black/70 rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h5 className="text-xs font-bold text-white font-['Outfit']">{idea.title}</h5>
                          {idea.status === 'pending' && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-mono text-[9px] font-bold border border-amber-500/40">
                              ⏳ Pending Approval
                            </span>
                          )}
                          {isTopVoted && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[9px] font-bold border border-amber-500/40">
                              🔥 Top Voted
                            </span>
                          )}
                          {idea.scheduledDate && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[9px] font-bold border border-emerald-500/40 flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" />
                              <span>On Calendar: {idea.scheduledDate}</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 font-serif">{idea.description}</p>
                        <span className="text-[10px] font-mono text-slate-400">Proposed by {idea.author} &bull; {idea.date}</span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center">
                        {/* Upvote button */}
                        <button
                          onClick={() => handleVoteIdea(idea.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-all"
                          title="Upvote gathering idea"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>{idea.votes}</span>
                        </button>

                        {/* Downvote button */}
                        <button
                          onClick={() => handleDownvoteIdea(idea.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#0a0a0a] hover:bg-[#1a1a1a] border border-white/10 text-slate-400 hover:text-rose-400 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-all"
                          title="Downvote gathering idea"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete idea button (Only author or Lead Admin) */}
                        {(isIdeaAuthor || isLeadAdmin) && (
                          <button
                            onClick={() => handleDeleteIdea(idea.id)}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/5 text-xs cursor-pointer transition-colors"
                            title="Delete this fellowship idea"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Facilitator Approve & Add to Calendar buttons */}
                        {isLeadAdmin && idea.status === 'pending' && (
                          <button
                            onClick={() => handleApproveIdea(idea.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer shadow"
                            title="Approve proposed fellowship idea"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        )}

                        {isLeadAdmin && (
                          <button
                            onClick={() => {
                              setSchedulingIdea(idea);
                              setSchedulingDate(idea.scheduledDate || new Date().toISOString().split('T')[0]);
                            }}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all ${
                              idea.scheduledStatus
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-500/40'
                            }`}
                            title="Schedule this idea on the Fellowship Sanctuary Calendar"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{idea.scheduledStatus ? 'Reschedule' : 'Add to Calendar'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* General YoungFire Fellowship Live Chat */}
          <div className="bg-[#0a0a0a] border border-purple-500/30 rounded-3xl p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <span>YoungFire General Fellowship Chat</span>
                <span className="text-[10px] text-slate-400">({chatMessages.length} Messages)</span>
              </h4>
              {isFacilitator && (
                <button
                  onClick={() => handleClearChatThread('groups')}
                  className="text-[10px] font-mono text-slate-400 hover:text-rose-400 cursor-pointer"
                >
                  Clear Space
                </button>
              )}
            </div>

            <div className="h-44 overflow-y-auto space-y-2">
              {chatMessages.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 font-serif">
                  Clean space active. No messages yet. Say hello to your YoungFire family!
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const displaySender = msg.senderName || msg.sender || 'Sanctuary Disciple';
                  const displayTime = formatChatTimestamp(msg.createdAt || msg.timestamp);
                  const reactionUserIdentifier =
                    currentUser?.email?.toLowerCase().trim() ||
                    activeUser?.email?.toLowerCase().trim() ||
                    currentUser?.id ||
                    (currentUser as any)?.uid ||
                    resolveDiscipleIdentity().senderId;
                  const isSenderMatch = Boolean(
                    msg.senderId && (currentUser?.id === msg.senderId || (currentUser as any)?.uid === msg.senderId)
                  );
                  const isAdminUser = Boolean(
                    currentUser?.isAdmin ||
                    currentUser?.accountType === 'administrator' ||
                    currentUser?.role === 'Administrator' ||
                    activeUser?.role === 'Administrator' ||
                    ['trentwhite0308@gmail.com', 'trentwhitemba@yahoo.com', 'white.whitney91@gmail.com', 'jhowyoungfire@gmail.com', 'luislopez567@hotmail.com'].includes(
                      (currentUser?.email || activeUser?.email || '').toLowerCase().trim()
                    )
                  );
                  return (
                    <div key={msg.id} className="p-2.5 bg-black/70 rounded-xl border border-white/5 text-xs group">
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mb-1">
                        <strong className="text-purple-400">{displaySender}</strong>
                        <div className="flex items-center gap-2">
                          <span>{displayTime}</span>
                          {isSenderMatch && (
                            <button
                              onClick={() => handleStartEditChatMessage(msg)}
                              className="hover:text-amber-300 opacity-60 hover:opacity-100 cursor-pointer"
                              title="Edit Message"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                          {(isSenderMatch || isAdminUser === true) && (
                            <button
                              onClick={() => handleDeleteChatMessage('groups', msg.id, msg.senderId)}
                              className="hover:text-rose-400 opacity-60 hover:opacity-100 cursor-pointer"
                              title="Delete Message"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      {editingChatId === msg.id && isSenderMatch ? (
                        <div className="flex gap-2 mt-1">
                          <input
                            type="text"
                            value={editingChatText}
                            onChange={(e) => setEditingChatText(e.target.value)}
                            className="flex-1 bg-black border border-purple-400 rounded-lg px-2 py-1 text-xs text-white"
                          />
                          <button
                            onClick={() => handleSaveEditChatMessage('groups', msg.id, msg.senderId)}
                            className="px-2 py-1 bg-purple-500 text-white font-bold rounded-lg text-[10px] cursor-pointer"
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
                        <p className="text-slate-200 select-text whitespace-pre-wrap break-words">{msg.text}</p>
                      )}
                      <ChatReactionAndCopyBar
                        messageId={msg.id}
                        messageText={msg.text}
                        reactions={msg.reactions}
                        userIdentifier={reactionUserIdentifier}
                        accentColor="purple"
                        onToggleReaction={(reactionKey) => {
                          setChatMessages((prev) =>
                            getOptimisticMessageReactions(prev, msg.id, reactionKey, reactionUserIdentifier)
                          );
                          toggleChatReaction('fellowship_chat', msg.id, reactionKey, reactionUserIdentifier, chatMessages);
                        }}
                      />
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={(e) => {
              setActiveChatThread('groups');
              handleSendMessage(e);
            }} className="flex gap-2">
              <input
                type="text"
                placeholder="Share a thought with the whole fellowship..."
                value={newChatInput}
                onChange={(e) => setNewChatInput(e.target.value)}
                className="flex-1 bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
              />
              <ChatPasteButton
                onPasteText={(pasted) =>
                  setNewChatInput((prev) => (prev ? `${prev} ${pasted}` : pasted))
                }
              />
              <button type="submit" className="p-2.5 rounded-xl bg-purple-500 text-white font-bold cursor-pointer">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DRILL DOWN SUBVIEW 6: 24/7 PRAYER TOWER & DOCK (With Green Checkmarks & Avatars) */}
      {activeDrillDown === 'prayer_dock' && (
        <PrayerDock
          onBack={() => setActiveDrillDown(null)}
          currentUser={activeUser}
        />
      )}

      {/* DRILL DOWN SUBVIEW 7: DAILY BREAD HUB (Replaces Young Professionals) */}
      {/* DRILL DOWN SUBVIEW 6: DAILY BREAD HUB (Morning Manna & Evening Solace) */}
      {activeDrillDown === 'daily_bread' && (
        <DailyBreadHub
          onBack={() => setActiveDrillDown(null)}
          onNavigateToScripture={(bookId, chapter, verse) => {
            if (onNavigateToScripture) {
              onNavigateToScripture(bookId, chapter, verse, {
                tab: 'fellowship',
                drillDown: 'daily_bread',
                label: 'Back to Daily Bread'
              });
            } else {
              onNavigate('word', 'bible');
            }
          }}
          currentUser={activeUser}
        />
      )}

      {/* DRILL DOWN SUBVIEW 8: BIBLE TRACKER ANALYTICS (Replaces Marriage Covenant) */}
      {activeDrillDown === 'bible_analytics' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-white/10">
            <button
              onClick={() => setActiveDrillDown(null)}
              className="p-2 rounded-xl bg-[#0a0a0a] border border-white/15 text-slate-200 hover:text-white cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                Paper Sword Check-In & Annual Goals
              </span>
              <h3 className="text-lg font-black font-['Outfit'] uppercase text-white">
                Bible Tracker Analytics Hub
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-amber-500/30 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Annual Goal</span>
              <h4 className="text-xl font-black text-amber-400 font-mono">52 WEEKS</h4>
              <p className="text-[11px] text-slate-300">Target for physical Bible sessions</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-amber-500/30 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Current Milestone</span>
              <h4 className="text-xl font-black text-amber-400 font-mono">LIVING WORD</h4>
              <p className="text-[11px] text-slate-300">Scripture Faithful Badge Unlocked</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-emerald-500/30 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Community Tracking</span>
              <h4 className="text-xl font-black text-emerald-400 font-mono">100% PAPER SWORD</h4>
              <p className="text-[11px] text-slate-300">Physical Bible discipleship</p>
            </div>
          </div>

          <div className="p-5 bg-[#0a0a0a] border border-white/10 rounded-3xl space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase text-white">Open Physical Bible Tracker</h4>
            <p className="text-xs text-slate-300 font-serif">
              Log each time you bring your physical Bible to church, small group, or personal study!
            </p>
            <button
              onClick={() => onNavigate('bibletracker')}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono cursor-pointer shadow-md inline-flex items-center gap-1.5"
            >
              <span>Launch Paper Sword Check-In &rarr;</span>
            </button>
          </div>
        </div>
      )}

      {/* DRILL DOWN SUBVIEW 9: READING PLANS HUB (5-Day, 7-Day & Custom Plan Creator) */}
      {activeDrillDown === 'reading_plans' && (
        <ReadingPlansHub
          onBack={() => setActiveDrillDown(null)}
          currentUser={currentUser}
          onNavigateToScripture={onNavigateToScripture}
          initialCategory="all"
        />
      )}

      {/* DRILL DOWN SUBVIEW 10: AUTHENTIC HD PHOTO GALLERY & FOLDERS UPLOAD */}
      {activeDrillDown === 'wall' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveDrillDown(null)}
                className="p-2 rounded-xl bg-[#0a0a0a] border border-white/15 text-slate-200 hover:text-white cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h3 className="text-base font-black font-['Outfit'] uppercase text-white">
                  Authentic HD Photo Gallery & Vault ({galleryPhotos.length} Photos)
                </h3>
                <p className="text-[10px] font-mono text-slate-400">
                  Joshua House of Worship &bull; YoungFire Discipleship Moments
                </p>
              </div>
            </div>

            {/* Upload Buttons: Single, Multiple, or Entire Folder (Supports 160+ files!) & Restore */}
            <div className="flex items-center gap-2 flex-wrap">
              <label className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Photos</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleBatchPhotoUpload}
                  className="hidden"
                />
              </label>

              <label className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95">
                <FolderUp className="w-3.5 h-3.5" />
                <span>Upload Entire Folder</span>
                <input
                  type="file"
                  // @ts-ignore
                  webkitdirectory=""
                  directory=""
                  multiple
                  onChange={handleBatchPhotoUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleResetToDefaultPhotos}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Restore all original 27 authentic sanctuary photos"
              >
                <RotateCcw className="w-3 h-3 text-amber-400" />
                <span>Reset 27 Originals</span>
              </button>
            </div>
          </div>

          {isUploadingBatch && (
            <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
              <span>{uploadProgress || 'Processing photos...'}</span>
            </div>
          )}

          {/* Photos Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {galleryPhotos.map((photo) => (
              <div 
                key={photo.id} 
                onClick={() => setActiveLightboxPhoto(photo)}
                className="rounded-3xl overflow-hidden border border-white/10 bg-[#0a0a0a] shadow-xl flex flex-col justify-between group cursor-pointer hover:border-amber-400/50 transition-all"
              >
                <div className="relative aspect-[4/3] sm:aspect-[4/3] overflow-hidden bg-black/40 flex items-center justify-center">
                  <img 
                    src={photo.imageUrl} 
                    alt={photo.title} 
                    className="w-full h-full object-cover object-top filter contrast-110 brightness-105"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[9px] font-mono text-amber-300 font-bold backdrop-blur-xs">
                    {photo.category}
                  </span>

                  {/* Photo Action Buttons: Edit and Delete with touch support */}
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => handleOpenEditPhoto(photo, e)}
                      className="p-1.5 rounded-full bg-black/80 hover:bg-amber-500 text-amber-400 hover:text-black border border-white/20 shadow-md cursor-pointer transition-colors"
                      title="Edit photo details"
                      aria-label="Edit photo"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleRequestDeletePhoto(photo, e)}
                      className="p-1.5 rounded-full bg-black/80 hover:bg-rose-600 text-rose-400 hover:text-white border border-white/20 shadow-md cursor-pointer transition-colors"
                      title="Delete photo"
                      aria-label="Delete photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-white font-['Outfit'] truncate">{photo.title}</h4>
                    <span className="text-[9px] font-mono text-slate-500 flex-shrink-0">{photo.date}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-serif leading-snug line-clamp-2">{photo.caption}</p>
                  <p className="text-[10px] font-mono text-amber-400 font-bold pt-1 border-t border-white/5 truncate">
                    {photo.scripture}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Fullscreen HD Lightbox Modal */}
          {activeLightboxPhoto && (
            <div 
              className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none"
              onClick={() => setActiveLightboxPhoto(null)}
            >
              <div 
                className="w-full max-w-4xl bg-[#0a0a0a] border border-white/20 rounded-3xl overflow-hidden shadow-2xl space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative aspect-video max-h-[70vh] bg-black flex items-center justify-center overflow-hidden">
                  <img
                    src={activeLightboxPhoto.imageUrl}
                    alt={activeLightboxPhoto.title}
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={() => setActiveLightboxPhoto(null)}
                    className="absolute top-4 right-4 p-2 rounded-full bg-black/70 hover:bg-black text-white cursor-pointer border border-white/10"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-base font-bold text-white font-['Outfit']">{activeLightboxPhoto.title}</h3>
                      <span className="text-xs font-mono text-amber-400 font-bold">{activeLightboxPhoto.category} &bull; {activeLightboxPhoto.date}</span>
                    </div>

                    {/* Lightbox Edit and Delete Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditPhoto(activeLightboxPhoto)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-black border border-amber-500/30 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRequestDeletePhoto(activeLightboxPhoto)}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Photo</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 font-serif leading-relaxed">{activeLightboxPhoto.caption}</p>
                  <p className="text-xs font-mono text-amber-300 font-bold">{activeLightboxPhoto.scripture}</p>
                </div>
              </div>
            </div>
          )}

          {/* EDIT PHOTO MODAL */}
          {editingPhoto && (
            <div 
              className="fixed inset-0 z-[160] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none"
              onClick={() => setEditingPhoto(null)}
            >
              <div 
                className="w-full max-w-lg bg-[#0e0e0e] border border-white/20 rounded-3xl p-5 sm:p-6 shadow-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar font-['Outfit']"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <Edit3 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase text-white tracking-wide">Edit Sanctuary Photo</h3>
                      <p className="text-[10px] font-mono text-slate-400">Update photo details, scripture, and metadata</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setEditingPhoto(null)}
                    className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Image Preview & Replace Option */}
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/50 flex items-center justify-center group">
                  <img 
                    src={editPhotoImageUrl} 
                    alt={editPhotoTitle} 
                    className="w-full h-full object-contain"
                  />
                  <label className="absolute bottom-2 right-2 px-3 py-1 rounded-xl bg-black/80 hover:bg-black text-amber-400 text-xs font-mono font-bold border border-white/20 flex items-center gap-1.5 cursor-pointer backdrop-blur-sm transition-all shadow-lg">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Replace Image</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (typeof ev.target?.result === 'string') {
                              setEditPhotoImageUrl(ev.target.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Form Fields */}
                <div className="space-y-3 text-xs font-mono">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Photo Title</label>
                    <input 
                      type="text"
                      value={editPhotoTitle}
                      onChange={(e) => setEditPhotoTitle(e.target.value)}
                      placeholder="e.g. Young Adults Worship Altar"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Category</label>
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {['Sanctuary Life', 'Apostolic Fellowship', 'Worship & Altar', 'Youth Gathering', 'Outreach & Missions', 'Baptism & Dedication'].map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setEditPhotoCategory(cat)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-colors cursor-pointer ${
                            editPhotoCategory === cat 
                              ? 'bg-amber-500 text-black font-bold' 
                              : 'bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <input 
                      type="text"
                      value={editPhotoCategory}
                      onChange={(e) => setEditPhotoCategory(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Fellowship Caption / Description</label>
                    <textarea 
                      rows={3}
                      value={editPhotoCaption}
                      onChange={(e) => setEditPhotoCaption(e.target.value)}
                      placeholder="Describe this moment of discipleship..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Scripture Reference</label>
                      <input 
                        type="text"
                        value={editPhotoScripture}
                        onChange={(e) => setEditPhotoScripture(e.target.value)}
                        placeholder="e.g. Psalm 133:1"
                        className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Date</label>
                      <input 
                        type="text"
                        value={editPhotoDate}
                        onChange={(e) => setEditPhotoDate(e.target.value)}
                        placeholder="e.g. Oct 5, 2026"
                        className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      const current = editingPhoto;
                      setEditingPhoto(null);
                      if (current) handleRequestDeletePhoto(current);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Photo</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingPhoto(null)}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEditPhoto}
                      className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-lg transition-transform active:scale-95"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DELETE PHOTO CONFIRMATION MODAL */}
          {photoToDelete && (
            <div 
              className="fixed inset-0 z-[170] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none"
              onClick={() => setPhotoToDelete(null)}
            >
              <div 
                className="w-full max-w-md bg-[#0e0e0e] border border-rose-500/30 rounded-3xl p-6 shadow-2xl text-white space-y-4 font-['Outfit']"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase text-white">Delete Sanctuary Photo?</h3>
                    <p className="text-xs text-slate-400 font-mono">This photo will be permanently removed from the photo vault.</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-black/60 border border-white/10 flex items-center gap-3">
                  <img 
                    src={photoToDelete.imageUrl} 
                    alt={photoToDelete.title} 
                    className="w-14 h-14 rounded-xl object-cover border border-white/10 flex-shrink-0"
                  />
                  <div className="overflow-hidden">
                    <h4 className="text-xs font-bold text-white truncate">{photoToDelete.title}</h4>
                    <span className="text-[10px] text-amber-400 font-mono block">{photoToDelete.category}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{photoToDelete.date}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPhotoToDelete(null)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeletePhoto}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-900/40 transition-transform active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* NEW LESSON MODAL (Allows Viewers & Admins to Enter Lessons) */}
      {isNewLessonModalOpen && (
        <div 
          className="fixed inset-0 z-[140] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none"
          onClick={() => setIsNewLessonModalOpen(false)}
        >
          <div 
            className="w-full max-w-2xl bg-[#0a0a0a] border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white font-['Outfit'] uppercase">
                Add Discipleship Lesson
              </h3>
              <button 
                onClick={() => setIsNewLessonModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLesson} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Lesson Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Walking in Resurrection Power"
                    value={newLessonTitle}
                    onChange={(e) => setNewLessonTitle(e.target.value)}
                    className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-amber-400 block mb-1 font-bold">Teaching Date (Calendar Sync)</label>
                  <input
                    type="date"
                    value={newLessonTeachingDate}
                    onChange={(e) => setNewLessonTeachingDate(e.target.value)}
                    className="w-full bg-[#000000] border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Series Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Seven Churches or Soli Deo Gloria"
                    value={newLessonSeries}
                    onChange={(e) => setNewLessonSeries(e.target.value)}
                    className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Teachers / Leaders</label>
                  <input
                    type="text"
                    placeholder="Trent White & Whitney White (YoungFire Discipleship Leaders)"
                    value={newLessonTeachers}
                    onChange={(e) => setNewLessonTeachers(e.target.value)}
                    className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Primary Scripture Passage</label>
                <input
                  type="text"
                  placeholder="e.g. Ephesians 4:11-16"
                  value={newLessonPassage}
                  onChange={(e) => setNewLessonPassage(e.target.value)}
                  className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Thematic Focus</label>
                <input
                  type="text"
                  placeholder="e.g. Covenant Unity, Spiritual Warfare & Prayer"
                  value={newLessonTheme}
                  onChange={(e) => setNewLessonTheme(e.target.value)}
                  className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Summary Overview</label>
                <textarea
                  placeholder="Overview of what was taught..."
                  value={newLessonSummary}
                  onChange={(e) => setNewLessonSummary(e.target.value)}
                  rows={2}
                  className="w-full bg-[#000000] border border-white/10 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Verbatim Lesson Notes & Outline</label>
                <textarea
                  placeholder="Full teaching notes, Scripture quotes, illustrations..."
                  value={newLessonNotes}
                  onChange={(e) => setNewLessonNotes(e.target.value)}
                  rows={5}
                  className="w-full bg-[#000000] border border-white/10 rounded-xl p-3 text-xs text-white font-serif"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Video Link or YouTube ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. https://www.youtube.com/watch?v=KwX1f2gYKZ4 or video ID"
                  value={newLessonVideoUrl}
                  onChange={(e) => setNewLessonVideoUrl(e.target.value)}
                  className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsNewLessonModalOpen(false)}
                  className="px-4 py-2 bg-white/10 text-slate-300 rounded-xl text-xs font-mono cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs font-mono cursor-pointer shadow-md"
                >
                  Save & Publish Lesson
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT LESSON MODAL (Two-Way Lesson Link & Sync) */}
      {isEditLessonModalOpen && (
        <div 
          className="fixed inset-0 z-[140] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none"
          onClick={() => setIsEditLessonModalOpen(false)}
        >
          <div 
            className="w-full max-w-2xl bg-[#0a0a0a] border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white font-['Outfit'] uppercase flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-400" />
                  <span>Edit Discipleship Lesson</span>
                </h3>
                <p className="text-[10px] font-mono text-amber-400 mt-0.5">
                  Two-Way Calendar Sync: Modifying teaching date will update its placement on the monthly calendar.
                </p>
              </div>
              <button 
                onClick={() => setIsEditLessonModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLessonEdit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Lesson Title</label>
                  <input
                    type="text"
                    value={editLessonTitle}
                    onChange={(e) => setEditLessonTitle(e.target.value)}
                    className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-amber-400 block mb-1 font-bold">Teaching Date (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    value={editLessonTeachingDate}
                    onChange={(e) => setEditLessonTeachingDate(e.target.value)}
                    className="w-full bg-[#000000] border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Series Title</label>
                  <input
                    type="text"
                    value={editLessonSeries}
                    onChange={(e) => setEditLessonSeries(e.target.value)}
                    className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Teachers / Leaders</label>
                  <input
                    type="text"
                    value={editLessonTeachers}
                    onChange={(e) => setEditLessonTeachers(e.target.value)}
                    className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Primary Scripture Passage</label>
                <input
                  type="text"
                  value={editLessonPassage}
                  onChange={(e) => setEditLessonPassage(e.target.value)}
                  className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Theme</label>
                <input
                  type="text"
                  value={editLessonTheme}
                  onChange={(e) => setEditLessonTheme(e.target.value)}
                  className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Summary Overview</label>
                <textarea
                  value={editLessonSummary}
                  onChange={(e) => setEditLessonSummary(e.target.value)}
                  rows={2}
                  className="w-full bg-[#000000] border border-white/10 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Verbatim Lesson Notes & Outline</label>
                <textarea
                  value={editLessonNotes}
                  onChange={(e) => setEditLessonNotes(e.target.value)}
                  rows={5}
                  className="w-full bg-[#000000] border border-white/10 rounded-xl p-3 text-xs text-white font-serif"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Video Link or YouTube ID</label>
                <input
                  type="text"
                  value={editLessonVideoUrl}
                  onChange={(e) => setEditLessonVideoUrl(e.target.value)}
                  className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditLessonModalOpen(false)}
                  className="px-4 py-2 bg-white/10 text-slate-300 rounded-xl text-xs font-mono cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs font-mono cursor-pointer shadow-md"
                >
                  Update Lesson & Sync Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULING IDEA TO SANCTUARY CALENDAR MODAL */}
      {schedulingIdea && (
        <div 
          className="fixed inset-0 z-[140] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none"
          onClick={() => setSchedulingIdea(null)}
        >
          <div 
            className="w-full max-w-md bg-[#0a0a0a] border border-purple-500/40 rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white font-['Outfit'] uppercase flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span>Schedule Idea to Calendar</span>
                </h3>
                <p className="text-[10px] font-mono text-purple-300 mt-0.5">
                  Facilitator Tool: Places event onto the Sanctuary Calendar
                </p>
              </div>
              <button 
                onClick={() => setSchedulingIdea(null)}
                className="text-slate-400 hover:text-white cursor-pointer font-mono"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-black/70 rounded-xl border border-white/5 space-y-1">
                <span className="text-xs font-bold text-white block">{schedulingIdea.title}</span>
                <p className="text-[11px] text-slate-300 font-serif">{schedulingIdea.description}</p>
                <span className="text-[10px] font-mono text-amber-400 block">{schedulingIdea.votes} Community Votes</span>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Select Event Date (YYYY-MM-DD)</label>
                <input
                  type="date"
                  value={schedulingDate}
                  onChange={(e) => setSchedulingDate(e.target.value)}
                  className="w-full bg-[#000000] border border-purple-500/40 rounded-xl px-3 py-2 text-xs text-purple-300 font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSchedulingIdea(null)}
                  className="px-4 py-2 bg-white/10 text-slate-300 rounded-xl text-xs font-mono cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleScheduleIdeaToCalendar(schedulingIdea, schedulingDate)}
                  className="px-5 py-2 bg-purple-500 hover:bg-purple-400 text-white font-bold rounded-xl text-xs font-mono cursor-pointer shadow-md"
                >
                  Confirm & Place on Calendar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
