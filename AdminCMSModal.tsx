import React, { useState, useEffect } from 'react';
import { 
  X, ShieldAlert, Calendar, Users, 
  Trash2, CheckCircle2, Save, Video, Sparkles, AlertTriangle,
  Image as ImageIcon, Upload, RotateCcw, Link as LinkIcon, RefreshCw, Eye,
  Flame, Download, ExternalLink, Radio, Send, Palette, Edit3, Plus, EyeOff,
  ArrowUp, ArrowDown, Camera
} from 'lucide-react';
import { RosterMember } from './MemberRosterModal';
import { db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { getProfileDocId } from '../services/profileService';
import { checkIsAdmin, getAllAdminEmails, grantAdminByEmail, revokeAdminByEmail } from '../services/authService';
import { compressImageFile as compressAvatarFile } from '../utils/imageUtils';
import { FirebaseStatusBadge } from './FirebaseStatusBadge';
import { 
  AppTheme, 
  getStoredThemes, 
  saveTheme, 
  deleteTheme, 
  resetThemes 
} from '../data/appThemes';
import { 
  COVER_ASSET_SLOTS, 
  getAllCoverOverrides, 
  setAppCoverOverride, 
  resetAppCover, 
  uploadCoverImage,
  useFanDeckPhotos,
  saveFanDeckPhotos,
  DEFAULT_FAN_DECK_PHOTOS
} from '../data/appCoverAssets';
import {
  BroadcastMeetingPayload,
  getBroadcastMeeting,
  saveBroadcastMeeting,
  getActiveFlyerUrl,
  setActiveFlyer,
  downloadFlyer,
  compressImageFile,
  deactivateBroadcastMeeting
} from '../data/broadcastMeetingData';

interface AdminCMSModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { id: string; name?: string; isAdmin?: boolean; email?: string } | null;
}

interface ZoomGroupConfig {
  title: string;
  inviteLink: string;
  meetingId: string;
  passcode: string;
}

export const AdminCMSModal: React.FC<AdminCMSModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'theme' | 'palettes' | 'zoom' | 'roster' | 'broadcast' | 'covers'>('broadcast');
  const [toastMsg, setToastMsg] = useState('');
  const [newAdminEmailCms, setNewAdminEmailCms] = useState('');
  const [newAdminNameCms, setNewAdminNameCms] = useState('');
  const [adminEmailsList, setAdminEmailsList] = useState<string[]>(() => getAllAdminEmails());

  useEffect(() => {
    const refresh = () => setAdminEmailsList(getAllAdminEmails());
    window.addEventListener('yf_admin_registry_updated', refresh);
    if (isOpen) refresh();
    return () => window.removeEventListener('yf_admin_registry_updated', refresh);
  }, [isOpen]);

  // 0. Dedicated Ministry Meeting & Flyer Broadcast State
  const [broadcastMeeting, setBroadcastMeeting] = useState<BroadcastMeetingPayload>(() => getBroadcastMeeting());
  const [currentFlyerUrl, setCurrentFlyerUrl] = useState<string>(() => getActiveFlyerUrl());
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [flyerUploading, setFlyerUploading] = useState(false);

  // Palettes / Hues State (Full Admin Control)
  const [cmsThemes, setCmsThemes] = useState<AppTheme[]>(() => getStoredThemes());
  const [editingTheme, setEditingTheme] = useState<AppTheme | null>(null);
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeSubtitle, setNewThemeSubtitle] = useState('');
  const [newThemeBadge, setNewThemeBadge] = useState('');
  const [newBgHex, setNewBgHex] = useState('#000000');
  const [newCardHex, setNewCardHex] = useState('#0a0a0a');
  const [newAccentHex, setNewAccentHex] = useState('#F59E0B');
  const [newBorderHex, setNewBorderHex] = useState('#334155');
  const [isCreatingTheme, setIsCreatingTheme] = useState(false);

  // 1. Annual Theme State
  const [annualThemeTitle, setAnnualThemeTitle] = useState(() => {
    return localStorage.getItem('youngfire_annual_theme_title') || 'Rebuilding Better Together';
  });
  const [annualThemeScripture, setAnnualThemeScripture] = useState(() => {
    return localStorage.getItem('youngfire_annual_theme_scripture') || 'Ephesians 4:16';
  });
  const [annualThemeDeclaration, setAnnualThemeDeclaration] = useState(() => {
    return localStorage.getItem('youngfire_annual_theme_decl') || 'According to the effectual working in the measure of every part, maketh increase of the body unto the edifying of itself in love.';
  });

  // Small Groups Gathering Location (Changes dynamically, editable by Lead Facilitators)
  const [smallGroupLocation, setSmallGroupLocation] = useState(() => {
    return localStorage.getItem('youngfire_small_group_location') || "The White's Residence";
  });

  const handleSmallGroupLocationChange = (val: string) => {
    setSmallGroupLocation(val);
    localStorage.setItem('youngfire_small_group_location', val);
    window.dispatchEvent(new CustomEvent('yf_small_group_location_updated', {
      detail: { location: val }
    }));
  };

  // Custom Sanctuary Schedule Gatherings
  const [customGatherings, setCustomGatherings] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('youngfire_sanctuary_custom_gatherings');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newGatheringTitle, setNewGatheringTitle] = useState('');
  const [newGatheringDate, setNewGatheringDate] = useState('');
  const [newGatheringTime, setNewGatheringTime] = useState('7:00 PM CST');
  const [newGatheringCategory, setNewGatheringCategory] = useState<'small-group' | 'open-bible' | 'special'>('small-group');
  const [newGatheringLoc, setNewGatheringLoc] = useState("The White's Residence");
  const [newGatheringDesc, setNewGatheringDesc] = useState('');

  const handleAddGathering = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGatheringTitle || !newGatheringDate) return;
    const parts = newGatheringDate.split('-');
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
    const item = {
      id: `custom-${Date.now()}`,
      year,
      month,
      dayNumber: day,
      dateStr,
      timeStr: newGatheringTime,
      title: newGatheringTitle.toUpperCase(),
      category: newGatheringCategory,
      badge: newGatheringCategory === 'small-group' ? 'Small Group' : newGatheringCategory === 'open-bible' ? 'Open Bible' : 'Special Gathering',
      locationName: newGatheringLoc,
      address: newGatheringLoc.toLowerCase().includes('white') ? 'San Antonio, TX' : 'San Antonio, TX (Live Zoom Broadcast)',
      description: newGatheringDesc || 'Consecrated YoungFire sanctuary gathering and fellowship.',
      hasZoom: true,
      hostLeader: 'Lead Facilitators Trent & Whitney White',
      isAtWhites: newGatheringLoc.toLowerCase().includes('white'),
      isUpcoming: true,
      isCustom: true
    };
    const updated = [...customGatherings, item];
    setCustomGatherings(updated);
    localStorage.setItem('youngfire_sanctuary_custom_gatherings', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('youngfire_gatherings_updated'));
    setToastMsg(`Gathering "${item.title}" added to Sanctuary Calendar`);
    setTimeout(() => setToastMsg(''), 3000);
    setNewGatheringTitle('');
    setNewGatheringDesc('');
  };

  const handleDeleteGathering = (id: string) => {
    const updated = customGatherings.filter(g => g.id !== id);
    setCustomGatherings(updated);
    localStorage.setItem('youngfire_sanctuary_custom_gatherings', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('youngfire_gatherings_updated'));
    setToastMsg('Gathering removed from calendar');
    setTimeout(() => setToastMsg(''), 3000);
  };

  // 2. Dedicated Zoom Configs (3 distinct groups)
  const [generalZoom, setGeneralZoom] = useState<ZoomGroupConfig>({
    title: 'YoungFire General Small Group Zoom (Bi-weekly Mondays @ 7:00 PM CST)',
    inviteLink: 'https://us05web.zoom.us/j/8785161298?pwd=e0zBTD2QHIHfx0AzjzXG7EHQno9Oig.1&omn=85728476365',
    meetingId: '878 516 1298',
    passcode: 'FIRE2026'
  });

  const [menZoom, setMenZoom] = useState<ZoomGroupConfig>({
    title: 'Men On Fire Brotherhood Zoom Huddle',
    inviteLink: 'https://us05web.zoom.us/j/8785161298?pwd=e0zBTD2QHIHfx0AzjzXG7EHQno9Oig.1&omn=85728476365',
    meetingId: '878 516 1298',
    passcode: 'FIRE2026'
  });

  const [womenZoom, setWomenZoom] = useState<ZoomGroupConfig>({
    title: 'Women Ignited Sisterhood Zoom Huddle',
    inviteLink: 'https://us05web.zoom.us/j/8785161298?pwd=e0zBTD2QHIHfx0AzjzXG7EHQno9Oig.1&omn=85728476365',
    meetingId: '878 516 1298',
    passcode: 'FIRE2026'
  });

  // 3. Live Roster State (Clean slate + persistent API)
  const [rosterMembers, setRosterMembers] = useState<RosterMember[]>([]);
  const [memberToDelete, setMemberToDelete] = useState<RosterMember | null>(null);

  // 4. Dynamic Cover Photos & Media Assets State
  const [coverOverrides, setCoverOverrides] = useState<Record<string, string>>(() => getAllCoverOverrides());
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
  const [uploadingSlotKey, setUploadingSlotKey] = useState<string | null>(null);

  const handleApplyUrl = async (slotKey: string) => {
    const url = (urlInputs[slotKey] || '').trim();
    if (!url) return;
    await setAppCoverOverride(slotKey, url);
    setCoverOverrides(getAllCoverOverrides());
    setUrlInputs(prev => ({ ...prev, [slotKey]: '' }));
    setToastMsg(`Cover photo updated for ${slotKey}`);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const handleFileUpload = async (slotKey: string, file: File) => {
    try {
      setUploadingSlotKey(slotKey);
      await uploadCoverImage(slotKey, file);
      setCoverOverrides(getAllCoverOverrides());
      setToastMsg(`Photo uploaded & optimized for ${slotKey}`);
      setTimeout(() => setToastMsg(''), 2500);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploadingSlotKey(null);
    }
  };

  const handleResetSlot = async (slotKey: string) => {
    await resetAppCover(slotKey);
    setCoverOverrides(getAllCoverOverrides());
    setToastMsg(`Reset ${slotKey} to default cover`);
    setTimeout(() => setToastMsg(''), 2500);
  };

  // 5. Dynamic Sanctuary Fan Deck Gallery State (Unlimited multi-photo carousel)
  const [fanDeckPhotos, setFanDeckPhotos] = useFanDeckPhotos();
  const [newFanPhotoUrl, setNewFanPhotoUrl] = useState('');
  const [isUploadingFanPhoto, setIsUploadingFanPhoto] = useState(false);

  const handleAddFanPhotoUrl = () => {
    const trimmed = newFanPhotoUrl.trim();
    if (!trimmed) return;
    const updated = [...fanDeckPhotos, trimmed];
    saveFanDeckPhotos(updated);
    setFanDeckPhotos(updated);
    setNewFanPhotoUrl('');
    setToastMsg('Added photo to Sanctuary Fan Deck');
    setTimeout(() => setToastMsg(''), 2500);
  };

  const handleUploadFanPhoto = async (file: File) => {
    try {
      setIsUploadingFanPhoto(true);
      const dataUrl = await compressImageFile(file, 1600, 0.85);
      const updated = [...fanDeckPhotos, dataUrl];
      saveFanDeckPhotos(updated);
      setFanDeckPhotos(updated);
      setToastMsg('Uploaded and added photo to Fan Deck');
      setTimeout(() => setToastMsg(''), 2500);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploadingFanPhoto(false);
    }
  };

  const handleMoveFanPhoto = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= fanDeckPhotos.length) return;
    const updated = [...fanDeckPhotos];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    saveFanDeckPhotos(updated);
    setFanDeckPhotos(updated);
    setToastMsg(`Reordered photo #${idx + 1}`);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const handleDeleteFanPhoto = (idx: number) => {
    if (fanDeckPhotos.length <= 1) {
      alert('The fan deck must contain at least 1 photo.');
      return;
    }
    const updated = fanDeckPhotos.filter((_, i) => i !== idx);
    saveFanDeckPhotos(updated);
    setFanDeckPhotos(updated);
    setToastMsg('Photo removed from Fan Deck');
    setTimeout(() => setToastMsg(''), 2500);
  };

  const handleResetFanPhotos = () => {
    if (window.confirm('Reset fan deck to built-in default photos?')) {
      saveFanDeckPhotos(DEFAULT_FAN_DECK_PHOTOS);
      setFanDeckPhotos(DEFAULT_FAN_DECK_PHOTOS);
      setToastMsg('Reset fan deck to default repository photos');
      setTimeout(() => setToastMsg(''), 2500);
    }
  };

  // Sync initial data from backend / localStorage
  useEffect(() => {
    if (!isOpen) return;

    // Load Zoom
    fetch('/api/zoom')
      .then(res => res.json())
      .then(data => {
        if (data?.config) {
          const cfg = data.config;
          setGeneralZoom({
            title: 'YoungFire General Small Group Zoom (Bi-weekly Mondays @ 7:00 PM CST)',
            inviteLink: cfg.inviteLink || generalZoom.inviteLink,
            meetingId: cfg.meetingId || generalZoom.meetingId,
            passcode: cfg.passcode || generalZoom.passcode
          });
          setMenZoom({
            title: 'Men On Fire Brotherhood Zoom Huddle',
            inviteLink: cfg.menOnFireInviteLink || cfg.inviteLink || menZoom.inviteLink,
            meetingId: cfg.menOnFireMeetingId || cfg.meetingId || menZoom.meetingId,
            passcode: cfg.menOnFirePasscode || cfg.passcode || menZoom.passcode
          });
          setWomenZoom({
            title: 'Women Ignited Sisterhood Zoom Huddle',
            inviteLink: cfg.womenIgnitedInviteLink || cfg.inviteLink || womenZoom.inviteLink,
            meetingId: cfg.womenIgnitedMeetingId || cfg.meetingId || womenZoom.meetingId,
            passcode: cfg.womenIgnitedPasscode || cfg.passcode || womenZoom.passcode
          });
        }
      })
      .catch(() => {});

    // Load Roster
    fetch('/api/roster')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.members)) {
          setRosterMembers(data.members);
        } else {
          try {
            const saved = localStorage.getItem('youngfire_member_roster_v2');
            if (saved) setRosterMembers(JSON.parse(saved));
          } catch {}
        }
      })
      .catch(() => {
        try {
          const saved = localStorage.getItem('youngfire_member_roster_v2');
          if (saved) setRosterMembers(JSON.parse(saved));
        } catch {}
      });
  }, [isOpen]);

  // Sync flyer if updated externally (Registered unconditionally before early returns)
  useEffect(() => {
    const handleFlyerUpdate = (e: Event) => {
      const customEv = e as CustomEvent<{ flyerUrl: string }>;
      if (customEv.detail?.flyerUrl) {
        setCurrentFlyerUrl(customEv.detail.flyerUrl);
      }
    };
    window.addEventListener('yf_active_flyer_updated', handleFlyerUpdate);
    return () => window.removeEventListener('yf_active_flyer_updated', handleFlyerUpdate);
  }, []);

  if (!isOpen) return null;

  const isAuthorizedAdmin = Boolean(
    currentUser?.isAdmin ||
    (currentUser as any)?.accountType === 'administrator' ||
    (currentUser as any)?.role === 'Administrator' ||
    (currentUser as any)?.role === 'Lead Facilitator' ||
    (currentUser as any)?.role === 'Overseer' ||
    checkIsAdmin(currentUser?.email) ||
    currentUser?.email?.toLowerCase().includes('trent') ||
    currentUser?.email?.toLowerCase().includes('whitney') ||
    currentUser?.name?.toLowerCase().includes('trent') ||
    currentUser?.name?.toLowerCase().includes('whitney')
  );

  // Strict Security Gate for Administrators
  if (!isAuthorizedAdmin) {
    return (
      <div className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#0a0a0a] border border-rose-500/40 rounded-3xl p-6 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="text-base font-bold text-white">Restricted Administrator Console</h3>
          <p className="text-xs text-slate-300">
            Access to the Executive Admin CMS is reserved for registered YoungFire Administrators and Facilitators.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#151515] text-white rounded-xl text-xs font-mono font-bold cursor-pointer"
          >
            Return to Sanctuary
          </button>
        </div>
      </div>
    );
  }

  // 1. Save Annual Theme & Small Groups Location
  const handleSaveTheme = () => {
    localStorage.setItem('youngfire_annual_theme_title', annualThemeTitle);
    localStorage.setItem('youngfire_annual_theme_scripture', annualThemeScripture);
    localStorage.setItem('youngfire_annual_theme_decl', annualThemeDeclaration);
    localStorage.setItem('youngfire_small_group_location', smallGroupLocation);
    window.dispatchEvent(new CustomEvent('yf_small_group_location_updated', {
      detail: { location: smallGroupLocation }
    }));
    setToastMsg('Sanctuary Theme & Small Groups Location Updated Successfully');
    setTimeout(() => setToastMsg(''), 2500);
  };

  // 2. Save Dedicated Zoom Configs
  const handleSaveZoom = async () => {
    try {
      await fetch('/api/zoom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: generalZoom.meetingId,
          passcode: generalZoom.passcode,
          inviteLink: generalZoom.inviteLink,
          menOnFireMeetingId: menZoom.meetingId,
          menOnFirePasscode: menZoom.passcode,
          menOnFireInviteLink: menZoom.inviteLink,
          womenIgnitedMeetingId: womenZoom.meetingId,
          womenIgnitedPasscode: womenZoom.passcode,
          womenIgnitedInviteLink: womenZoom.inviteLink
        })
      });
      setToastMsg('All 3 Zoom Configurations Synchronized Globally');
      setTimeout(() => setToastMsg(''), 2500);
    } catch (err) {
      console.error('Failed to sync Zoom:', err);
    }
  };

  // 2.5 Broadcast Ministry Meeting & Flyer Handlers
  const handleBroadcastMeeting = async () => {
    setIsBroadcasting(true);
    try {
      await saveBroadcastMeeting({
        ...broadcastMeeting,
        flyerUrl: currentFlyerUrl
      });
      setToastMsg('🔥 Meeting Broadcast Sent! All Sanctuary Devices Updated');
      setTimeout(() => setToastMsg(''), 3000);
    } catch (err: any) {
      setToastMsg(`Broadcast failed: ${err.message}`);
      setTimeout(() => setToastMsg(''), 3500);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleUploadBroadcastFlyer = async (file: File) => {
    try {
      setFlyerUploading(true);
      const compressed = await compressImageFile(file, 1200, 0.85);
      await setActiveFlyer(compressed);
      setCurrentFlyerUrl(compressed);
      setToastMsg('Official Ministry Zoom Flyer Updated & Broadcast');
      setTimeout(() => setToastMsg(''), 2500);
    } catch (err: any) {
      setToastMsg(`Flyer upload failed: ${err.message}`);
      setTimeout(() => setToastMsg(''), 3500);
    } finally {
      setFlyerUploading(false);
    }
  };

  // 3. Confirm Delete Roster Member
  const handleAdminRosterPhotoUpload = async (member: RosterMember, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const base64 = await compressAvatarFile(file, 420, 420, 0.82);
      if (!base64) return;
      const cleanName = (member.fullName || member.name || 'Sanctuary Disciple').trim();
      const cleanEmail = (member.email || '').toLowerCase().trim();
      const docId = getProfileDocId(cleanEmail, member.id || `disciple_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`);
      const updatedPayload = {
        id: docId,
        name: cleanName,
        email: cleanEmail,
        calling: member.calling || 'Member',
        gender: member.gender === 'female' ? 'sister' : 'brother',
        role: member.role || 'YoungFire Member',
        avatarUrl: base64,
        updatedAt: Date.now()
      };
      await setDoc(doc(db, 'sanctuary_disciples', docId), updatedPayload, { merge: true });
      const updated = rosterMembers.map(m => (m.id === member.id || m.id === docId ? { ...m, avatar: base64 } : m));
      setRosterMembers(updated);
      try {
        localStorage.setItem('youngfire_member_roster_v2', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('yf_disciple_card_updated', { detail: updatedPayload }));
      } catch {}
      setToastMsg(`Updated profile photo for ${cleanName}`);
      setTimeout(() => setToastMsg(''), 2500);
    } catch (err) {
      console.error('Error uploading admin roster photo:', err);
    }
  };

  const handleConfirmDeleteMember = async () => {
    if (!memberToDelete) return;

    const updated = rosterMembers.filter(m => m.id !== memberToDelete.id);
    setRosterMembers(updated);
    try {
      localStorage.setItem('youngfire_member_roster_v2', JSON.stringify(updated));
      await fetch(`/api/roster/${memberToDelete.id}`, { method: 'DELETE' });
    } catch {}

    setToastMsg(`Removed ${memberToDelete.fullName || memberToDelete.name} from Roster`);
    setMemberToDelete(null);
    setTimeout(() => setToastMsg(''), 2500);
  };

  return (
    <div 
      className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-[#0a0a0a] border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-5 text-white max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-['Outfit'] uppercase text-white">
                ADMINISTRATOR CMS PORTAL
              </h2>
              <p className="text-[10px] font-mono text-amber-300">
                Executive Leadership Console &bull; For Administrators Only
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer"
            aria-label="Close Admin CMS"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast */}
        {toastMsg && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-400 rounded-xl text-emerald-300 text-xs font-mono font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Global Real-Time Cloud Sync Diagnostic Badge */}
        <FirebaseStatusBadge variant="compact" showDetails={true} />

        {/* Tab Buttons */}
        <div className="flex bg-[#000000] p-1 rounded-xl border border-white/10 text-xs font-mono flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('theme')}
            className={`flex-1 min-w-[120px] py-1.5 px-2 rounded-lg cursor-pointer transition-colors text-center ${
              activeTab === 'theme' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Gatherings & Schedules
          </button>
          <button
            onClick={() => {
              setActiveTab('palettes');
              setCmsThemes(getStoredThemes());
            }}
            className={`flex-1 min-w-[130px] py-1.5 px-2 rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'palettes' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Theme Hues ({cmsThemes.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('zoom')}
            className={`flex-1 min-w-[100px] py-1.5 px-2 rounded-lg cursor-pointer transition-colors text-center ${
              activeTab === 'zoom' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Zoom Controls (3)
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`flex-1 min-w-[100px] py-1.5 px-2 rounded-lg cursor-pointer transition-colors text-center ${
              activeTab === 'roster' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Disciples Roster ({rosterMembers.length})
          </button>
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`flex-1 min-w-[150px] py-1.5 px-2 rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'broadcast' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Ministry Meetings & Flyer</span>
          </button>
          <button
            onClick={() => setActiveTab('covers')}
            className={`flex-1 min-w-[140px] py-1.5 px-2 rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'covers' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Cover Photos & Media Assets</span>
          </button>
        </div>

        {/* TAB 1: ANNUAL THEME CONTROLS */}
        {activeTab === 'theme' && (
          <div className="p-4 bg-black/60 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase font-mono">
              <Sparkles className="w-4 h-4" />
              <span>Sanctuary Annual Theme Proclamation</span>
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Theme Title</label>
              <input
                type="text"
                value={annualThemeTitle}
                onChange={(e) => setAnnualThemeTitle(e.target.value)}
                className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Scripture Anchor</label>
              <input
                type="text"
                value={annualThemeScripture}
                onChange={(e) => setAnnualThemeScripture(e.target.value)}
                className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Foundational Declaration Text</label>
              <textarea
                rows={3}
                value={annualThemeDeclaration}
                onChange={(e) => setAnnualThemeDeclaration(e.target.value)}
                className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-white leading-relaxed"
              />
            </div>

            {/* YoungFire Small Groups Gathering Location (Editable by Lead Facilitators) */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider block">
                  Small Groups Gathering Location
                </label>
                <span className="text-[10px] font-mono text-slate-400">Saves dynamically on change</span>
              </div>
              <input
                type="text"
                value={smallGroupLocation}
                onChange={(e) => handleSmallGroupLocationChange(e.target.value)}
                className="w-full bg-[#000000] border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-400"
                placeholder="The White's Residence"
              />
              <p className="text-[10px] text-slate-400 font-serif">
                YoungFire Small Groups gathering location defaults to The White's Residence (Bi-Weekly Mondays @ 7:00 PM CST).
              </p>
            </div>

            {/* Sanctuary Gatherings & 12-Month Calendar Management */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase font-mono">
                  <Calendar className="w-4 h-4" />
                  <span>Sanctuary Schedule &amp; Gatherings Manager</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">12-Month Infinite Calendar</span>
              </div>

              {/* Add New Gathering Form */}
              <form onSubmit={handleAddGathering} className="p-3 bg-black/60 rounded-xl border border-white/10 space-y-2.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300 font-bold block">
                  [ + ] Schedule New Gathering
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. YoungFire Small Group"
                      value={newGatheringTitle}
                      onChange={(e) => setNewGatheringTitle(e.target.value)}
                      className="w-full bg-[#000000] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Date</label>
                    <input
                      type="date"
                      required
                      value={newGatheringDate}
                      onChange={(e) => setNewGatheringDate(e.target.value)}
                      className="w-full bg-[#000000] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Time</label>
                    <input
                      type="text"
                      required
                      value={newGatheringTime}
                      onChange={(e) => setNewGatheringTime(e.target.value)}
                      className="w-full bg-[#000000] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Category</label>
                    <select
                      value={newGatheringCategory}
                      onChange={(e) => setNewGatheringCategory(e.target.value as any)}
                      className="w-full bg-[#000000] border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white"
                    >
                      <option value="small-group">Small Group (Mondays)</option>
                      <option value="open-bible">Open Bible Study (Thursdays)</option>
                      <option value="special">Special Sanctuary Gathering</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Location</label>
                    <input
                      type="text"
                      required
                      value={newGatheringLoc}
                      onChange={(e) => setNewGatheringLoc(e.target.value)}
                      className="w-full bg-[#000000] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg uppercase tracking-wider font-mono cursor-pointer transition-colors shadow"
                >
                  Save &amp; Broadcast Gathering To Calendar
                </button>
              </form>

              {/* List of Custom Gatherings */}
              {customGatherings.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider">
                    Scheduled Custom Gatherings ({customGatherings.length})
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-1.5">
                    {customGatherings.map((g) => (
                      <div key={g.id} className="p-2 bg-black/40 rounded-lg border border-white/10 flex items-center justify-between text-xs font-mono">
                        <div>
                          <span className="text-white font-bold">{g.title}</span>
                          <span className="text-slate-400 text-[10px] block">{g.dateStr} &bull; {g.timeStr} &bull; {g.locationName}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteGathering(g.id)}
                          className="p-1 rounded bg-red-950/40 text-red-400 hover:bg-red-900/60 cursor-pointer"
                          title="Delete Gathering"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleSaveTheme}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs rounded-xl cursor-pointer shadow-md uppercase tracking-wider font-mono"
            >
              Update Sanctuary Theme &amp; Small Groups Location Across All Screens &rarr;
            </button>
          </div>
        )}

        {/* TAB 1.5: LITURGICAL PALETTES & HUES MANAGEMENT */}
        {activeTab === 'palettes' && (
          <div className="space-y-4">
            <div className="p-4 bg-black/60 rounded-2xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-xs font-bold text-amber-400 uppercase font-mono flex items-center gap-1.5">
                    <Palette className="w-4 h-4" />
                    <span>Liturgical Sanctuary Hues ({cmsThemes.length})</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Administrators have full authority to edit hues, add new custom palettes, or delete color schemes.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingTheme(null);
                      setNewThemeName('New Apostolic Hue');
                      setNewThemeSubtitle('Custom prophetic color scheme');
                      setNewThemeBadge('Custom Hue');
                      setNewBgHex('#000000');
                      setNewCardHex('#0F172A');
                      setNewAccentHex('#F59E0B');
                      setNewBorderHex('#38BDF8');
                      setIsCreatingTheme(true);
                    }}
                    className="py-1.5 px-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add New Hue</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Reset all sanctuary color hues back to default 10 liturgical palettes?')) {
                        const restored = resetThemes();
                        setCmsThemes(restored);
                        setToastMsg('Theme hues reset to defaults');
                        setTimeout(() => setToastMsg(''), 2500);
                      }
                    }}
                    className="py-1.5 px-2.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Defaults</span>
                  </button>
                </div>
              </div>

              {/* Creator / Editor Modal Panel */}
              {(isCreatingTheme || editingTheme) && (
                <div className="p-4 bg-[#000000] border border-amber-500/40 rounded-2xl space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                      <span>{editingTheme ? `Edit Theme: ${editingTheme.name}` : 'Create New Theme Hue'}</span>
                    </h5>
                    <button
                      onClick={() => {
                        setIsCreatingTheme(false);
                        setEditingTheme(null);
                      }}
                      className="text-xs text-slate-400 hover:text-white font-mono cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Name</label>
                      <input
                        type="text"
                        value={newThemeName}
                        onChange={(e) => setNewThemeName(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white"
                        placeholder="Palette Name"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Subtitle</label>
                      <input
                        type="text"
                        value={newThemeSubtitle}
                        onChange={(e) => setNewThemeSubtitle(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white"
                        placeholder="Prophetic Description"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Badge</label>
                      <input
                        type="text"
                        value={newThemeBadge}
                        onChange={(e) => setNewThemeBadge(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white"
                        placeholder="Season Badge"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Background</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={newBgHex}
                          onChange={(e) => setNewBgHex(e.target.value)}
                          className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <input
                          type="text"
                          value={newBgHex}
                          onChange={(e) => setNewBgHex(e.target.value)}
                          className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Card Background</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={newCardHex}
                          onChange={(e) => setNewCardHex(e.target.value)}
                          className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <input
                          type="text"
                          value={newCardHex}
                          onChange={(e) => setNewCardHex(e.target.value)}
                          className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Accent Color</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={newAccentHex}
                          onChange={(e) => setNewAccentHex(e.target.value)}
                          className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <input
                          type="text"
                          value={newAccentHex}
                          onChange={(e) => setNewAccentHex(e.target.value)}
                          className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Border Color</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={newBorderHex}
                          onChange={(e) => setNewBorderHex(e.target.value)}
                          className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <input
                          type="text"
                          value={newBorderHex}
                          onChange={(e) => setNewBorderHex(e.target.value)}
                          className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => {
                        if (!newThemeName.trim()) return;
                        const targetId = editingTheme ? editingTheme.id : `custom-hue-${Date.now()}`;
                        const themeToSave: AppTheme = {
                          id: targetId,
                          name: newThemeName.trim(),
                          subtitle: newThemeSubtitle.trim() || 'Custom sanctuary color scheme',
                          badge: newThemeBadge.trim() || 'Custom Hue',
                          bgHex: newBgHex.trim(),
                          cardHex: newCardHex.trim(),
                          accentHex: newAccentHex.trim(),
                          borderHex: newBorderHex.trim(),
                          isCustom: true
                        };
                        const updated = saveTheme(themeToSave);
                        setCmsThemes(updated);
                        setIsCreatingTheme(false);
                        setEditingTheme(null);
                        setToastMsg(editingTheme ? 'Theme Hue Updated' : 'New Theme Hue Created');
                        setTimeout(() => setToastMsg(''), 2500);
                      }}
                      className="py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs font-mono uppercase cursor-pointer"
                    >
                      Save Theme Hue &rarr;
                    </button>
                    <button
                      onClick={() => {
                        setIsCreatingTheme(false);
                        setEditingTheme(null);
                      }}
                      className="py-2 px-3 rounded-xl bg-white/10 text-slate-300 font-mono text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Grid of All Themes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                {cmsThemes.map((th) => (
                  <div
                    key={th.id}
                    className="p-3 bg-[#000000] border border-white/10 rounded-2xl flex items-center justify-between gap-3 text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: th.bgHex, borderColor: th.borderHex }}
                      >
                        <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: th.accentHex }} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h5 className="text-xs font-bold text-white font-['Outfit'] truncate">{th.name}</h5>
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/10 text-slate-300">
                            {th.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{th.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => {
                          setEditingTheme(th);
                          setNewThemeName(th.name);
                          setNewThemeSubtitle(th.subtitle || '');
                          setNewThemeBadge(th.badge || '');
                          setNewBgHex(th.bgHex);
                          setNewCardHex(th.cardHex);
                          setNewAccentHex(th.accentHex);
                          setNewBorderHex(th.borderHex);
                          setIsCreatingTheme(false);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 cursor-pointer transition-colors"
                        title="Edit theme hue"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete the "${th.name}" liturgical theme hue?`)) {
                            const updated = deleteTheme(th.id);
                            setCmsThemes(updated);
                            setToastMsg(`Deleted ${th.name}`);
                            setTimeout(() => setToastMsg(''), 2500);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 cursor-pointer transition-colors"
                        title="Delete theme hue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DEDICATED ZOOM CONTROLS (3 DISTINCT HUBS) */}
        {activeTab === 'zoom' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-300 font-mono">
              Configure independent Zoom credentials for YoungFire, Men On Fire, and Women Ignited:
            </p>

            {/* 1. General YoungFire Zoom */}
            <div className="p-4 bg-black/60 rounded-2xl border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase font-mono">
                <Video className="w-4 h-4" />
                <span>1. YoungFire General Small Group Zoom</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Schedule: Every other Monday @ 7:00 PM CST</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block">Meeting ID</label>
                  <input
                    type="text"
                    value={generalZoom.meetingId}
                    onChange={(e) => setGeneralZoom({ ...generalZoom, meetingId: e.target.value })}
                    className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block">Passcode</label>
                  <input
                    type="text"
                    value={generalZoom.passcode}
                    onChange={(e) => setGeneralZoom({ ...generalZoom, passcode: e.target.value })}
                    className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block">Invite URL</label>
                <input
                  type="url"
                  value={generalZoom.inviteLink}
                  onChange={(e) => setGeneralZoom({ ...generalZoom, inviteLink: e.target.value })}
                  className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-mono"
                />
              </div>
            </div>

            {/* 2. Men On Fire Brotherhood Zoom */}
            <div className="p-4 bg-black/60 rounded-2xl border border-orange-500/30 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase font-mono">
                <Video className="w-4 h-4" />
                <span>2. Men On Fire Brotherhood Zoom</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block">Meeting ID</label>
                  <input
                    type="text"
                    value={menZoom.meetingId}
                    onChange={(e) => setMenZoom({ ...menZoom, meetingId: e.target.value })}
                    className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block">Passcode</label>
                  <input
                    type="text"
                    value={menZoom.passcode}
                    onChange={(e) => setMenZoom({ ...menZoom, passcode: e.target.value })}
                    className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block">Invite URL</label>
                <input
                  type="url"
                  value={menZoom.inviteLink}
                  onChange={(e) => setMenZoom({ ...menZoom, inviteLink: e.target.value })}
                  className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-mono"
                />
              </div>
            </div>

            {/* 3. Women Ignited Sisterhood Zoom */}
            <div className="p-4 bg-black/60 rounded-2xl border border-rose-500/30 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase font-mono">
                <Video className="w-4 h-4" />
                <span>3. Women Ignited Sisterhood Zoom</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block">Meeting ID</label>
                  <input
                    type="text"
                    value={womenZoom.meetingId}
                    onChange={(e) => setWomenZoom({ ...womenZoom, meetingId: e.target.value })}
                    className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block">Passcode</label>
                  <input
                    type="text"
                    value={womenZoom.passcode}
                    onChange={(e) => setWomenZoom({ ...womenZoom, passcode: e.target.value })}
                    className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block">Invite URL</label>
                <input
                  type="url"
                  value={womenZoom.inviteLink}
                  onChange={(e) => setWomenZoom({ ...womenZoom, inviteLink: e.target.value })}
                  className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-mono"
                />
              </div>
            </div>

            <button
              onClick={handleSaveZoom}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md"
            >
              Sync All 3 Zoom Channels Across Clients &rarr;
            </button>
          </div>
        )}

        {/* TAB 3: DISCIPLES ROSTER MANAGEMENT (WITH ADMIN PROMOTION & DELETION) */}
        {activeTab === 'roster' && (
          <div className="space-y-3">
            {/* Add Administrator by Email Quick Bar */}
            <div className="p-3.5 rounded-2xl bg-black/70 border border-amber-500/30 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-amber-300 uppercase font-bold">
                  Grant Administrator Access by Email
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {adminEmailsList.length} Active Admins
                </span>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const clean = newAdminEmailCms.toLowerCase().trim();
                  if (!clean || !clean.includes('@')) return;
                  await grantAdminByEmail(clean, newAdminNameCms.trim() || undefined);
                  setAdminEmailsList(getAllAdminEmails());
                  setRosterMembers((prev) =>
                    prev.map((m) =>
                      m.email?.toLowerCase()?.trim() === clean
                        ? { ...m, isAdmin: true, accountType: 'administrator', role: 'Administrator' }
                        : m
                    )
                  );
                  setNewAdminEmailCms('');
                  setNewAdminNameCms('');
                  setToastMsg(`Granted Administrator privileges to ${clean}`);
                  setTimeout(() => setToastMsg(''), 3000);
                }}
                className="flex flex-col sm:flex-row gap-2"
              >
                <input
                  type="email"
                  required
                  value={newAdminEmailCms}
                  onChange={(e) => setNewAdminEmailCms(e.target.value)}
                  placeholder="Member email (e.g. luislopez567@hotmail.com)"
                  className="flex-1 bg-[#000000] border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                />
                <input
                  type="text"
                  value={newAdminNameCms}
                  onChange={(e) => setNewAdminNameCms(e.target.value)}
                  placeholder="Member Name (Optional)"
                  className="sm:w-44 bg-[#000000] border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-black uppercase tracking-wider cursor-pointer whitespace-nowrap shadow"
                >
                  + Add Admin
                </button>
              </form>
            </div>

            <div className="flex justify-between items-center px-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase font-bold">
                Registered Disciples ({rosterMembers.length})
              </span>
              <span className="text-[10px] font-mono text-amber-400 font-bold">
                Admin Promotion &amp; Deletion Active
              </span>
            </div>

            {rosterMembers.length === 0 ? (
              <div className="p-8 bg-black/40 rounded-2xl border border-dashed border-white/10 text-center space-y-2">
                <Users className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-mono text-slate-400">
                  Roster is clean! As real disciples register in the app, their profiles appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {rosterMembers.map((member) => {
                  const isTrent = (member.fullName || member.name || '').toLowerCase().includes('trent') || (member.email || '').toLowerCase().includes('trent');
                  const isWhitney = (member.fullName || member.name || '').toLowerCase().includes('whitney') || (member.email || '').toLowerCase().includes('whitney');
                  const isPrimaryOverseer = isTrent || isWhitney;

                  const displayName = isTrent 
                    ? 'Lead Facilitator Trent D. White' 
                    : isWhitney 
                      ? 'Lead Facilitator Whitney White' 
                      : (member.fullName || member.name);

                  const displayRole = isPrimaryOverseer ? 'Lead Facilitator' : (member.ministryRole || member.role);

                  return (
                    <div 
                      key={member.id}
                      className="p-3 bg-black/70 rounded-xl border border-white/5 flex items-center justify-between gap-3 hover:border-white/15 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <label
                          className="relative w-8 h-8 rounded-full flex-shrink-0 cursor-pointer group"
                          title={`Upload profile photo for ${displayName}`}
                        >
                          {member.avatar ? (
                            <img 
                              src={member.avatar} 
                              alt={displayName} 
                              className="w-8 h-8 rounded-full object-cover border border-white/20 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xs font-bold font-mono flex-shrink-0">
                              {(displayName || 'D').slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-black border border-amber-400 text-amber-400 flex items-center justify-center">
                            <Camera className="w-2 h-2" />
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleAdminRosterPhotoUpload(member, e)}
                            className="sr-only"
                          />
                        </label>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h5 className="font-bold text-white text-xs truncate font-['Outfit']">
                              {displayName}
                            </h5>
                            {(member.accountType === 'administrator' || member.isAdmin || isPrimaryOverseer) ? (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                                Administrator
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#151515] text-slate-300">
                                Member
                              </span>
                            )}
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-amber-300 font-semibold">
                              {displayRole}
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                              {member.group || 'YoungFire'}
                            </span>
                            {member.gender && (
                              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                                (isWhitney || member.gender === 'female') ? 'bg-rose-500/20 text-rose-300' : 'bg-orange-500/20 text-orange-300'
                              }`}>
                                {(isWhitney || member.gender === 'female') ? 'Sister' : 'Brother'}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            {member.calling || 'Disciple'} &bull; {member.email || 'No email provided'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isAuthorizedAdmin && !isPrimaryOverseer ? (
                          <>
                            <button
                              type="button"
                              onClick={async () => {
                                const cleanEmail = (member.email || '').toLowerCase().trim();
                                const currentlyAdmin = Boolean(
                                  member.accountType === 'administrator' ||
                                  member.isAdmin ||
                                  checkIsAdmin(cleanEmail)
                                );
                                const nextAdmin = !currentlyAdmin;
                                const nextRole = nextAdmin ? 'Administrator' : 'YoungFire Member';
                                const docId = getProfileDocId(cleanEmail, member.id);
                                try {
                                  await setDoc(
                                    doc(db, 'sanctuary_disciples', docId),
                                    {
                                      id: docId,
                                      role: nextRole,
                                      isAdmin: nextAdmin,
                                      accountType: nextAdmin ? 'administrator' : 'member',
                                      updatedAt: Date.now()
                                    },
                                    { merge: true }
                                  );
                                  if (cleanEmail) {
                                    if (nextAdmin) {
                                      await grantAdminByEmail(cleanEmail, member.fullName || member.name, docId);
                                    } else {
                                      await revokeAdminByEmail(cleanEmail, docId);
                                    }
                                  }
                                  setRosterMembers((prev) =>
                                    prev.map((m) =>
                                      m.id === member.id
                                        ? {
                                            ...m,
                                            isAdmin: nextAdmin,
                                            accountType: nextAdmin ? 'administrator' : 'member',
                                            role: nextRole
                                          }
                                        : m
                                    )
                                  );
                                  setToastMsg(
                                    nextAdmin
                                      ? `${member.fullName || member.name} promoted to Administrator`
                                      : `Administrator access revoked for ${member.fullName || member.name}`
                                  );
                                  setTimeout(() => setToastMsg(''), 3000);
                                } catch (err) {
                                  console.error('Failed to update admin status:', err);
                                }
                              }}
                              className={`px-2.5 py-1.5 rounded-xl font-mono text-[10px] font-bold transition-colors cursor-pointer border ${
                                member.accountType === 'administrator' || member.isAdmin || checkIsAdmin(member.email)
                                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 hover:bg-amber-500/30'
                                  : 'bg-white/5 border-white/15 text-slate-300 hover:border-amber-400 hover:text-amber-300'
                              }`}
                              title="Toggle Administrator Privileges"
                            >
                              {member.accountType === 'administrator' || member.isAdmin || checkIsAdmin(member.email)
                                ? '★ Admin'
                                : '+ Make Admin'}
                            </button>
                            <button
                              onClick={() => setMemberToDelete(member)}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-rose-950/40 border border-rose-500"
                              title={`Delete ${member.fullName || member.name} from Roster`}
                            >
                              <Trash2 className="w-3 h-3 text-white" />
                              <span>Delete Member</span>
                            </button>
                          </>
                        ) : isPrimaryOverseer ? (
                          <span className="text-[10px] font-mono text-amber-300 font-bold px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30">
                            Protected Lead
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MINISTRY MEETINGS & FLYER (ADMINISTRATIVE BROADCAST HUB) */}
        {activeTab === 'broadcast' && isAuthorizedAdmin && (
          <div className="p-4 sm:p-5 bg-black/60 rounded-2xl border border-white/5 space-y-5">
            {/* Distinct Purpose Banner */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300 block font-mono uppercase text-[11px] mb-0.5">
                  Distinct Ministry Calling & Assembly Purpose
                </strong>
                Separated from recurring Small Groups. Reserved strictly for administrative ministry calls, special gatherings, and leadership huddles with Lead Facilitator Trent D. White &amp; Lead Facilitator Whitney White.
              </div>
            </div>

            {/* Flyer Showcase & Actions */}
            <div className="p-4 rounded-2xl bg-[#000000] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Official YoungFire Ministry Zoom Flyer
                  </span>
                </div>
                <span className="text-[10px] font-mono text-amber-400/80">
                  {currentFlyerUrl.startsWith('data:') ? 'Custom Active Flyer' : 'Default /youngfire_zoom_flyer.png'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                {/* Flyer Preview Card with Rounded-2xl & Gold Rim Glow */}
                <div className="sm:col-span-5 flex justify-center">
                  <div className="relative group w-full max-w-[240px] aspect-[3/4] rounded-2xl overflow-hidden border-2 border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.25)] bg-black/80 flex items-center justify-center">
                    <img 
                      src={currentFlyerUrl} 
                      alt="Official Ministry Zoom Flyer" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (img.src !== window.location.origin + '/youngfire_zoom_flyer.png') {
                          img.src = '/youngfire_zoom_flyer.png';
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 text-center pointer-events-none">
                      <span className="text-[10px] font-mono text-amber-300 font-bold">
                        Live Sanctuary Preview
                      </span>
                    </div>
                  </div>
                </div>

                {/* Flyer Management Buttons */}
                <div className="sm:col-span-7 space-y-2.5">
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    This official graphic flyer is showcased across user devices upon receiving an administrative broadcast. Disciples can view it in full resolution and download it directly.
                  </p>

                  <div className="flex flex-col gap-2 pt-1">
                    {/* Direct Download Flyer Button */}
                    <button
                      type="button"
                      onClick={() => downloadFlyer(currentFlyerUrl, 'youngfire_zoom_assembly_flyer.png')}
                      className="w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Download className="w-4 h-4 text-amber-400" />
                      <span>Download Flyer (.png)</span>
                    </button>

                    {/* Upload / Switch Flyer */}
                    <label className={`w-full py-2.5 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                      flyerUploading
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 animate-pulse'
                        : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-300'
                    }`}>
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span>{flyerUploading ? 'Optimizing Image...' : 'Upload & Set New Flyer Image'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadBroadcastFlyer(file);
                        }}
                      />
                    </label>

                    {/* Reset to Default Flyer if customized */}
                    {currentFlyerUrl !== '/youngfire_zoom_flyer.png' && (
                      <button
                        type="button"
                        onClick={async () => {
                          localStorage.removeItem('youngfire_active_ministry_flyer');
                          setCurrentFlyerUrl('/youngfire_zoom_flyer.png');
                          await setActiveFlyer('/youngfire_zoom_flyer.png');
                          setToastMsg('Reset to default /youngfire_zoom_flyer.png');
                          setTimeout(() => setToastMsg(''), 2500);
                        }}
                        className="w-full py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 text-[11px] font-mono flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset to Default Flyer Asset</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Meeting Scheduler Form */}
            <div className="p-4 rounded-2xl bg-[#000000] border border-white/10 space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase">
                <Calendar className="w-4 h-4" />
                <span>Special Gathering Scheduler</span>
              </div>

              {/* Title */}
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  Gathering Title
                </label>
                <input
                  type="text"
                  value={broadcastMeeting.title}
                  onChange={(e) => setBroadcastMeeting(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. YoungFire Ministry-Wide Zoom Assembly"
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Date & Time */}
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  Meeting Date &amp; Time
                </label>
                <input
                  type="text"
                  value={broadcastMeeting.dateTime}
                  onChange={(e) => setBroadcastMeeting(prev => ({ ...prev, dateTime: e.target.value }))}
                  placeholder="e.g. Monday, Sept 29, 2026 @ 7:30 PM CST"
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Direct Zoom URL */}
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  Zoom Direct Invite URL
                </label>
                <input
                  type="text"
                  value={broadcastMeeting.zoomUrl}
                  onChange={(e) => setBroadcastMeeting(prev => ({ ...prev, zoomUrl: e.target.value }))}
                  placeholder="https://us05web.zoom.us/j/..."
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              {/* Meeting ID & Passcode in 2 cols */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Meeting ID
                  </label>
                  <input
                    type="text"
                    value={broadcastMeeting.meetingId}
                    onChange={(e) => setBroadcastMeeting(prev => ({ ...prev, meetingId: e.target.value }))}
                    placeholder="878 516 1298"
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Meeting Passcode
                  </label>
                  <input
                    type="text"
                    value={broadcastMeeting.passcode}
                    onChange={(e) => setBroadcastMeeting(prev => ({ ...prev, passcode: e.target.value }))}
                    placeholder="FIRE2026"
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              {/* Target Audience Selector */}
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1.5">
                  Target Audience
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBroadcastMeeting(prev => ({ ...prev, targetAudience: 'All Ministry Disciples' }))}
                    className={`py-2 px-3 rounded-xl text-xs font-mono font-bold border transition-colors cursor-pointer text-center ${
                      broadcastMeeting.targetAudience === 'All Ministry Disciples'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                        : 'bg-[#0a0a0a] border-white/10 text-slate-300 hover:text-white'
                    }`}
                  >
                    All Ministry Disciples
                  </button>
                  <button
                    type="button"
                    onClick={() => setBroadcastMeeting(prev => ({ ...prev, targetAudience: 'Leaders & Facilitators Only' }))}
                    className={`py-2 px-3 rounded-xl text-xs font-mono font-bold border transition-colors cursor-pointer text-center ${
                      broadcastMeeting.targetAudience === 'Leaders & Facilitators Only'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                        : 'bg-[#0a0a0a] border-white/10 text-slate-300 hover:text-white'
                    }`}
                  >
                    Leaders &amp; Facilitators Only
                  </button>
                </div>
              </div>
            </div>

            {/* One-Tap Sanctuary Broadcast Action Button */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleBroadcastMeeting}
                  disabled={isBroadcasting}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-sm uppercase tracking-wider font-mono shadow-[0_0_30px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2.5 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <Flame className={`w-5 h-5 text-slate-950 fill-current ${isBroadcasting ? 'animate-spin' : ''}`} />
                  <span>{isBroadcasting ? 'Broadcasting to All Devices...' : '🔥 Broadcast Meeting to All Devices'}</span>
                  <Send className="w-4 h-4 ml-1 text-slate-950" />
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await deactivateBroadcastMeeting();
                    setBroadcastMeeting(prev => ({ ...prev, active: false }));
                    setToastMsg("Broadcast Meeting Deactivated & Beacon Turned Off");
                    setTimeout(() => setToastMsg(''), 2500);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-rose-500/20 text-rose-300 border border-white/10 hover:border-rose-400/50 font-mono text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>End Meeting Broadcast / Hide Beacon Now</span>
                </button>

                <p className="text-[10px] font-mono text-center text-slate-400 mt-2">
                  Broadcasts immediately trigger the top beacon. When the meeting concludes, tap &quot;End Meeting Broadcast&quot; or allow the auto-expire setting to dismiss it.
                </p>
              </div>
          </div>
        )}

        {/* TAB 5: COVER PHOTOS & MEDIA ASSETS MANAGER */}
        {activeTab === 'covers' && isAuthorizedAdmin && (
          <div className="p-4 sm:p-5 bg-black/60 rounded-2xl border border-white/5 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase font-mono">
                <ImageIcon className="w-4 h-4" />
                <span>Sanctuary Cover Photos & Media Asset Controller</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold self-start sm:self-auto">
                Lead Facilitator Trent D. White & Lead Facilitator Whitney White Live Media CMS
              </span>
            </div>

            <p className="text-[11px] text-slate-300 font-mono leading-relaxed">
              Swap any hero banner or feature cover live across the application without redeploying code.
              Choose between pasting a direct CDN/Cloud image URL or uploading an optimized image directly from your phone/desktop.
            </p>

            {/* DEDICATED SECTION 1: SANCTUARY FAN DECK GALLERY (EXPANDABLE MULTI-PHOTO CAROUSEL) */}
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-[#0a0a0a] to-[#000000] border border-amber-500/40 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase font-mono">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>SANCTUARY FAN DECK GALLERY (2.0s 3D CAROUSEL)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                    {fanDeckPhotos.length} Active Photos
                  </span>
                  <button
                    onClick={handleResetFanPhotos}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-[10px] font-mono transition-colors cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-300 font-mono leading-relaxed">
                Add, reorder, or remove photos displayed in the 3D rotating fan deck on the homepage. Photos rotate smoothly every 2.0 seconds with zero text overlays.
              </p>

              {/* Add New Photo Controls */}
              <div className="p-3.5 rounded-2xl bg-[#040817] border border-amber-500/30 space-y-3">
                <span className="text-[10px] font-mono text-amber-400 uppercase font-bold tracking-wider block">
                  + Add New Photo to Rotating Fan Deck
                </span>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      placeholder="Paste high-res image URL (https://...)"
                      value={newFanPhotoUrl}
                      onChange={(e) => setNewFanPhotoUrl(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-white/15 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <button
                    onClick={handleAddFanPhotoUrl}
                    disabled={!newFanPhotoUrl.trim()}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs font-mono cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md flex-shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Photo</span>
                  </button>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="file"
                    accept="image/*"
                    id="fan_deck_add_file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadFanPhoto(file);
                    }}
                  />
                  <label
                    htmlFor="fan_deck_add_file"
                    className={`px-3.5 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isUploadingFanPhoto
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
                        : 'bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border-white/15'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isUploadingFanPhoto ? 'Optimizing Image...' : 'Upload from Phone/Desktop'}</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                    Auto-compresses to lightweight WebP
                  </span>
                </div>
              </div>

              {/* Photos Grid with Live 3:4 Preview, Move Up, Move Down, Delete */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                {fanDeckPhotos.map((url, idx) => (
                  <div
                    key={`${url.slice(0, 30)}_${idx}`}
                    className="p-2.5 rounded-2xl bg-[#040817] border border-white/10 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-2 group shadow-md"
                  >
                    {/* Position Badge & Status */}
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="w-5 h-5 rounded-full bg-[#0a0a0a] border border-amber-500/40 text-amber-400 font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <span className="text-slate-400 text-[9px]">3:4 Ratio</span>
                    </div>

                    {/* 3:4 Portrait Preview */}
                    <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-black border border-white/15 shadow-md">
                      <img
                        src={url}
                        alt={`Sanctuary Moment #${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/image_4.png';
                        }}
                      />
                    </div>

                    {/* Reorder and Delete Actions */}
                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-white/5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveFanPhoto(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-20 text-slate-300 hover:text-white disabled:cursor-not-allowed transition-colors cursor-pointer"
                          title="Move Earlier in Rotation"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleMoveFanPhoto(idx, 'down')}
                          disabled={idx === fanDeckPhotos.length - 1}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-20 text-slate-300 hover:text-white disabled:cursor-not-allowed transition-colors cursor-pointer"
                          title="Move Later in Rotation"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleDeleteFanPhoto(idx)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                        title="Remove Photo from Carousel"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DEDICATED SECTION 2: SANCTUARY COVER BANNERS & FEATURE CARDS */}
            <div className="border-t border-white/10 pt-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase font-mono">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span>Sanctuary Section Banners & Feature Cards (16:9 / 4:3)</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Banners displayed across the Welcome Center, Fellowship Hub, Open Bible, and Sisterhood/Brotherhood cohorts.
              </p>
            </div>

            <div className="space-y-6">
              {COVER_ASSET_SLOTS.filter(s => !s.key.startsWith('fan_deck_card_')).map((slot) => {
                const activeUrl = coverOverrides[slot.key] || slot.defaultUrl;
                const isCustom = Boolean(coverOverrides[slot.key]);
                const isUploading = uploadingSlotKey === slot.key;

                return (
                  <div
                    key={slot.key}
                    className="p-4 sm:p-5 rounded-2xl bg-[#000000] border border-white/10 hover:border-amber-500/30 transition-all space-y-4"
                  >
                    {/* Slot Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white font-['Outfit'] uppercase">
                            {slot.title}
                          </h4>
                          {isCustom ? (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                              ● Custom Override Active
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#151515] text-slate-400 border border-white/10">
                              Built-In Default
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-amber-400/90">{slot.subtitle}</p>
                      </div>

                      <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-1 rounded-lg border border-white/5 self-start sm:self-auto">
                        Ratio: {slot.recommendedAspect}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 font-serif leading-relaxed">
                      {slot.description}
                    </p>

                    {/* Live 16:9 Thumbnail Preview */}
                    <div className="relative aspect-video w-full max-w-md mx-auto sm:mx-0 rounded-2xl overflow-hidden border-2 border-white/15 bg-black shadow-lg group">
                      <img
                        src={activeUrl}
                        alt={slot.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90 pointer-events-none" />
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-white/90">
                        <span className="truncate pr-2 font-bold">{slot.title}</span>
                        <span className="px-1.5 py-0.5 rounded bg-black/60 border border-white/20 text-[9px]">
                          Live Preview
                        </span>
                      </div>
                    </div>

                    {/* Update Controls: URL Input & Device Upload */}
                    <div className="pt-2 border-t border-white/10 space-y-3">
                      {/* Mechanism 1: Direct URL Input */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="relative flex-1">
                          <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="url"
                            placeholder="Paste high-res image URL (https://...)"
                            value={urlInputs[slot.key] || ''}
                            onChange={(e) => setUrlInputs({ ...urlInputs, [slot.key]: e.target.value })}
                            className="w-full bg-[#0a0a0a] border border-white/15 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>
                        <button
                          onClick={() => handleApplyUrl(slot.key)}
                          disabled={!urlInputs[slot.key]?.trim()}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs font-mono cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Apply URL</span>
                        </button>
                      </div>

                      {/* Mechanism 2: Device File Upload & Reset */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            id={`cover_file_${slot.key}`}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(slot.key, file);
                            }}
                          />
                          <label
                            htmlFor={`cover_file_${slot.key}`}
                            className={`px-3.5 py-2 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              isUploading
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
                                : 'bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border-white/15'
                            }`}
                          >
                            <Upload className="w-3.5 h-3.5 text-amber-400" />
                            <span>{isUploading ? 'Optimizing Image...' : 'Upload from Device'}</span>
                          </label>

                          <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                            Auto-optimizes to WebP/JPEG
                          </span>
                        </div>

                        {/* Reset to Default Button */}
                        {isCustom && (
                          <button
                            onClick={() => handleResetSlot(slot.key)}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                            title="Reset to built-in default photo"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset to Default</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Confirmation Modal for Roster Deletion */}
        {memberToDelete && (
          <div className="fixed inset-0 z-[120] bg-black/90 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#0a0a0a] border border-rose-500/50 rounded-3xl p-5 space-y-4 text-center">
              <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
              <h4 className="text-sm font-bold text-white uppercase font-['Outfit']">
                Confirm Disciple Removal
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Remove <strong className="text-white">{memberToDelete.fullName || memberToDelete.name}</strong> from the YoungFire Fellowship Roster?
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setMemberToDelete(null)}
                  className="flex-1 py-2 bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-mono rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteMember}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs font-mono rounded-xl cursor-pointer"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
