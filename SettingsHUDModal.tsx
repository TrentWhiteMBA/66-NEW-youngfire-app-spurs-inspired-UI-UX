import React, { useState, useRef, useEffect } from 'react';
import { 
  X, User, Volume2, Shield, Moon, Trash2, 
  CheckCircle2, AlertTriangle, Sparkles, Sliders, LogOut, Flame, Heart, PenTool, Camera,
  Bell, BellRing, BellOff, Vibrate
} from 'lucide-react';
import { AppTheme } from '../data/appThemes';
import { db } from '../services/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import {
  savePersistentAuthSession,
  clearPersistentAuthSession,
  checkIsAdmin,
  getAllAdminEmails,
  grantAdminByEmail,
  revokeAdminByEmail
} from '../services/authService';
import { getProfileDocId, upsertDiscipleProfile, hardDeleteUserProfile, updateDiscipleProfileGlobal } from '../services/profileService';
import { compressImageFile } from '../utils/imageUtils';
import {
  NotificationAlertMode,
  NotificationSettings,
  getNotificationSettings,
  saveNotificationSettings,
  playSanctuaryChime,
  requestNotificationPermission,
  dispatchSanctuaryNotification
} from '../services/notificationService';

export interface CurrentUser {
  id: string;
  name: string;
  fullName?: string;
  email: string;
  role?: string;
  ministryRole?: string;
  calling?: string;
  group?: string;
  gender?: 'male' | 'female' | string;
  avatar?: string;
  churchMembership?: string;
  residence?: string;
  phone?: string;
  notes?: string;
  prayerRequests?: string;
  accountType?: string;
  birthday?: string;
  ministryRoleId?: string;
  ministryRoleLabel?: string;
  joinedAt?: string;
  isAdmin?: boolean;
  isGuest?: boolean;
}

interface SettingsHUDModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CurrentUser | null;
  onUpdateUser?: (updated: CurrentUser) => void;
  onSignOut?: () => void;
  onDeleteProfile?: () => void;
  masterVolume?: number;
  onVolumeChange?: (vol: number) => void;
  activeTheme?: AppTheme;
  onOpenThemeModal?: () => void;
  [key: string]: any;
}

export const SettingsHUDModal: React.FC<SettingsHUDModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  onSignOut,
  onDeleteProfile,
  masterVolume,
  appVolume,
  onVolumeChange,
  activeTheme,
  onOpenThemeModal
}) => {
  const resolvedPropVolume = typeof appVolume === 'number' ? appVolume : (typeof masterVolume === 'number' ? masterVolume : 0.85);
  const [audioVolume, setAudioVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('sanctuary_audio_volume');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed)) return Math.max(0, Math.min(100, parsed));
      }
    } catch {}
    return Math.round(resolvedPropVolume * 100);
  });

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseInt(e.target.value, 10);
    setAudioVolume(newVol);
    const globalAudio = document.getElementById('sanctuary-bg-audio') as HTMLAudioElement;
    if (globalAudio) {
      globalAudio.volume = Math.max(0, Math.min(1, newVol / 100));
    }
    if (onVolumeChange) {
      onVolumeChange(Math.max(0, Math.min(1, newVol / 100)));
    }
    localStorage.setItem('sanctuary_audio_volume', newVol.toString());
  };
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedName, setEditedName] = useState(currentUser?.fullName || currentUser?.name || '');
  const [editedEmail, setEditedEmail] = useState(currentUser?.email || '');
  const [editedCalling, setEditedCalling] = useState(currentUser?.calling || 'Young Adult Disciple');
  const [editedRole, setEditedRole] = useState(currentUser?.role || 'YoungFire Member');
  const [editedGender, setEditedGender] = useState<'brother' | 'sister'>(
    currentUser?.gender === 'sister' || currentUser?.gender === 'female' ? 'sister' : 'brother'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const existingAvatarUrl =
    (currentUser as any)?.avatarUrl ||
    currentUser?.avatar ||
    (typeof window !== 'undefined' ? localStorage.getItem('youngfire_user_avatar') || '' : '');
  const [newAvatarBase64, setNewAvatarBase64] = useState<string>('');
  const [profileSaveFeedback, setProfileSaveFeedback] = useState<string | null>(null);
  const [alertActionFeedback, setAlertActionFeedback] = useState<string | null>(null);
  const [chimePlaying, setChimePlaying] = useState<boolean>(false);
  const [profileAvatar, setProfileAvatar] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('youngfire_user_avatar') || '';
      const currentAv = (currentUser as any)?.avatarUrl || currentUser?.avatar || '';
      if (stored && !stored.startsWith('data:image/svg+xml')) return stored;
      if (currentAv && !currentAv.startsWith('data:image/svg+xml')) return currentAv;
      return stored || currentAv;
    } catch {
      return (currentUser as any)?.avatarUrl || currentUser?.avatar || '';
    }
  });

  useEffect(() => {
    if (currentUser) {
      setEditedName(currentUser.fullName || currentUser.name || '');
      setEditedEmail(currentUser.email || '');
      setEditedCalling(currentUser.calling || 'Member');
      setEditedRole(currentUser.role || 'YoungFire Member');
      setEditedGender(currentUser.gender === 'sister' || currentUser.gender === 'female' ? 'sister' : 'brother');
    }
    try {
      const stored = localStorage.getItem('youngfire_user_avatar') || '';
      const currentAv = (currentUser as any)?.avatarUrl || currentUser?.avatar || '';
      if (newAvatarBase64) {
        setProfileAvatar(newAvatarBase64);
      } else if (stored && !stored.startsWith('data:image/svg+xml')) {
        setProfileAvatar(stored);
      } else if (currentAv && !currentAv.startsWith('data:image/svg+xml')) {
        setProfileAvatar(currentAv);
      } else if (stored || currentAv) {
        setProfileAvatar(stored || currentAv);
      }
    } catch {}
  }, [currentUser, isOpen, newAvatarBase64]);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const base64String = await compressImageFile(file, 420, 420, 0.82);
      if (!base64String) return;

      setNewAvatarBase64(base64String);
      setProfileAvatar(base64String);
      try {
        localStorage.setItem('youngfire_user_avatar', base64String);
      } catch {}

      if (currentUser) {
        const cleanEmail = (currentUser.email || '').toLowerCase().trim();
        const docId = getProfileDocId(cleanEmail, (currentUser as any)?.uid || currentUser.id);
        const updatedPayload = {
          id: docId,
          name: (currentUser.fullName || currentUser.name || 'Sanctuary Disciple').trim(),
          fullName: (currentUser.fullName || currentUser.name || 'Sanctuary Disciple').trim(),
          email: cleanEmail,
          calling: currentUser.calling || 'Member',
          gender: currentUser.gender === 'female' || currentUser.gender === 'sister' ? 'sister' : 'brother',
          role: currentUser.role || 'YoungFire Member',
          avatarUrl: base64String,
          avatar: base64String,
          updatedAt: Date.now()
        };
        const updated: CurrentUser = {
          ...currentUser,
          id: docId,
          ...updatedPayload,
          avatar: base64String
        };
        try {
          localStorage.setItem('youngfire_auth_session', JSON.stringify({ id: docId, uid: docId, ...updatedPayload }));
          localStorage.setItem('youngfire_user_doc_id', docId);
          localStorage.setItem('youngfire_device_session_v1', JSON.stringify(updated));
          localStorage.setItem('youngfire_user_session', JSON.stringify(updated));
          const savedRoster = localStorage.getItem('youngfire_member_roster_v2');
          if (savedRoster) {
            const parsedRoster = JSON.parse(savedRoster);
            if (Array.isArray(parsedRoster)) {
              const nextRoster = parsedRoster.map((m: any) =>
                m.id === docId || m.id === currentUser.id || (cleanEmail && m.email?.toLowerCase()?.trim() === cleanEmail)
                  ? { ...m, avatar: base64String, avatarUrl: base64String }
                  : m
              );
              localStorage.setItem('youngfire_member_roster_v2', JSON.stringify(nextRoster));
            }
          }
          await updateDiscipleProfileGlobal(cleanEmail, currentUser.id || docId, updatedPayload);
          window.dispatchEvent(new CustomEvent('yf_disciple_card_updated', { detail: updatedPayload }));
        } catch (err) {
          console.warn('Firestore profile avatar sync warning:', err);
        }
        if (onUpdateUser) onUpdateUser(updated);
      }
      setProfileSaveFeedback('✓ Profile photo saved to your account!');
      setTimeout(() => setProfileSaveFeedback(null), 4500);
    } catch (err) {
      console.error('Error compressing avatar in Settings:', err);
    }
  };
  
  const [autoplayEnabled, setAutoplayEnabled] = useState<boolean>(() => {
    return localStorage.getItem('youngfire_autoplay_worship') === 'true';
  });

  const [soundEffects, setSoundEffects] = useState<boolean>(() => {
    return localStorage.getItem('youngfire_sound_effects') !== 'false';
  });

  const [hideNotesIcon, setHideNotesIcon] = useState<boolean>(() => {
    try {
      return localStorage.getItem('youngfire_hide_notes_icon') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleHideNotesIcon = () => {
    const next = !hideNotesIcon;
    setHideNotesIcon(next);
    try {
      localStorage.setItem('youngfire_hide_notes_icon', String(next));
    } catch {}
    window.dispatchEvent(new CustomEvent('yf_notes_icon_visibility_changed', { detail: { hidden: next } }));
  };

  const [notificationConfig, setNotificationConfig] = useState<NotificationSettings>(() =>
    getNotificationSettings()
  );
  const [browserPermissionStatus, setBrowserPermissionStatus] = useState<string>(() => {
    try {
      if (localStorage.getItem('youngfire_push_alerts_enabled') === 'true') {
        return 'granted';
      }
    } catch {}
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  useEffect(() => {
    if (isOpen) {
      setNotificationConfig(getNotificationSettings());
      try {
        if (localStorage.getItem('youngfire_push_alerts_enabled') === 'true') {
          setBrowserPermissionStatus('granted');
          return;
        }
      } catch {}
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setBrowserPermissionStatus(Notification.permission);
      }
    }
  }, [isOpen]);

  const updateNotificationConfig = (partial: Partial<NotificationSettings>) => {
    const next: NotificationSettings = {
      ...notificationConfig,
      ...partial
    };
    setNotificationConfig(next);
    saveNotificationSettings(next);
    if (currentUser && !currentUser.isGuest && currentUser.email) {
      updateDiscipleProfileGlobal(currentUser.email, currentUser.id, {
        notificationSettings: next
      }).catch(() => {});
    }
  };

  const handleSelectAlertMode = (mode: NotificationAlertMode) => {
    updateNotificationConfig({ alertMode: mode, enabled: mode !== 'mute' });
    if (mode === 'ring') {
      playSanctuaryChime();
    } else if (mode === 'vibrate' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch {}
    }
  };

  const handleRequestPushPermission = async () => {
    const nextConfig: NotificationSettings = {
      ...notificationConfig,
      enabled: true,
      alertMode: notificationConfig.alertMode === 'mute' ? 'ring' : notificationConfig.alertMode
    };
    setNotificationConfig(nextConfig);
    saveNotificationSettings(nextConfig);

    await requestNotificationPermission();
    setBrowserPermissionStatus('granted');
    playSanctuaryChime();
    dispatchSanctuaryNotification(
      'YoungFire Sanctuary Alerts Active',
      'Real-time chat, calendar, and prayer wall alerts are now enabled on this device.',
      'event'
    );
    setAlertActionFeedback('✓ Sanctuary Alerts Enabled! Chime & real-time push notifications are active.');
    setTimeout(() => setAlertActionFeedback(null), 5000);
  };

  const handleTestChimeButton = () => {
    setChimePlaying(true);
    playSanctuaryChime();
    try {
      window.dispatchEvent(
        new CustomEvent('yf_in_app_notification', {
          detail: {
            title: '🔔 Sanctuary Golden Chime Test',
            body: 'Audio chime (698Hz → 880Hz) & haptic alert verified on this device.',
            category: 'event'
          }
        })
      );
    } catch {}
    setAlertActionFeedback('🔔 Sanctuary Golden Chime played! Audio & haptic alert verified.');
    setTimeout(() => setChimePlaying(false), 900);
    setTimeout(() => setAlertActionFeedback(null), 4500);
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [adminRegistryEmails, setAdminRegistryEmails] = useState<string[]>(() => getAllAdminEmails());
  const [newAdminEmailInput, setNewAdminEmailInput] = useState('');
  const [newAdminNameInput, setNewAdminNameInput] = useState('');
  const [adminActionToast, setAdminActionToast] = useState('');

  useEffect(() => {
    const refreshAdmins = () => setAdminRegistryEmails(getAllAdminEmails());
    window.addEventListener('yf_admin_registry_updated', refreshAdmins);
    if (isOpen) refreshAdmins();
    return () => window.removeEventListener('yf_admin_registry_updated', refreshAdmins);
  }, [isOpen]);

  const handleAddAdministratorByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newAdminEmailInput.toLowerCase().trim();
    if (!clean || !clean.includes('@')) return;
    await grantAdminByEmail(clean, newAdminNameInput.trim() || undefined);
    setAdminRegistryEmails(getAllAdminEmails());
    setNewAdminEmailInput('');
    setNewAdminNameInput('');
    setAdminActionToast(`Granted Administrator privileges to ${clean}`);
    setTimeout(() => setAdminActionToast(''), 4000);
  };

  const handleRevokeAdministratorByEmail = async (targetEmail: string) => {
    const clean = targetEmail.toLowerCase().trim();
    const PROTECTED_CORE = [
      'trentwhite0308@gmail.com',
      'trentwhitemba@yahoo.com',
      'white.whitney91@gmail.com',
      'jhowyoungfire@gmail.com',
      'luislopez567@hotmail.com'
    ];
    if (PROTECTED_CORE.includes(clean)) return;
    await revokeAdminByEmail(clean);
    setAdminRegistryEmails(getAllAdminEmails());
    setAdminActionToast(`Revoked Administrator privileges for ${clean}`);
    setTimeout(() => setAdminActionToast(''), 4000);
  };

  if (!isOpen) return null;

  const accentColor = activeTheme?.accentHex || '#F59E0B';

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
    currentUser?.role === 'Overseer' ||
    checkIsAdmin(currentUser?.email) ||
    ADMIN_EMAILS.includes(currentUser?.email?.toLowerCase()?.trim() || '');

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    const formData = {
      name: editedName.trim() || currentUser.name || 'Sanctuary Disciple',
      email: (editedEmail.trim() || currentUser.email || '').toLowerCase().trim(),
      calling: editedCalling.trim() || currentUser.calling || 'Member',
      gender: editedGender,
      role: isAdmin ? (editedRole || currentUser.role || 'YoungFire Member') : (currentUser.role || 'YoungFire Member')
    };

    const cleanSavedAvatar =
      newAvatarBase64 ||
      (profileAvatar && !profileAvatar.startsWith('data:image/svg+xml') ? profileAvatar : '') ||
      (existingAvatarUrl && !existingAvatarUrl.startsWith('data:image/svg+xml') ? existingAvatarUrl : '') ||
      profileAvatar ||
      existingAvatarUrl ||
      '';

    const docId = getProfileDocId(formData.email, (currentUser as any)?.uid || currentUser.id);

    const updatedPayload = {
      id: docId,
      name: formData.name.trim(),
      fullName: formData.name.trim(),
      email: formData.email.toLowerCase().trim(),
      calling: formData.calling || 'Member',
      gender: formData.gender, // strictly 'brother' or 'sister'
      role: formData.role, // e.g. 'Lead Facilitator', 'Overseer', or 'YoungFire Member'
      avatarUrl: cleanSavedAvatar, // NEVER overwrite with undefined
      avatar: cleanSavedAvatar,
      updatedAt: Date.now()
    };

    try {
      await updateDiscipleProfileGlobal(updatedPayload.email, currentUser.id || docId, updatedPayload);
      localStorage.setItem('youngfire_auth_session', JSON.stringify({ id: docId, uid: docId, ...updatedPayload }));
      localStorage.setItem('youngfire_user_doc_id', docId);
      localStorage.setItem('youngfire_user_name', updatedPayload.name);
      if (cleanSavedAvatar && !cleanSavedAvatar.startsWith('data:image/svg+xml')) {
        localStorage.setItem('youngfire_user_avatar', cleanSavedAvatar);
      }
      window.dispatchEvent(new CustomEvent('yf_disciple_card_updated', { detail: updatedPayload }));
    } catch {}

    const updated: CurrentUser = {
      ...currentUser,
      id: docId,
      ...updatedPayload,
      fullName: updatedPayload.name,
      avatar: updatedPayload.avatarUrl
    };
    try {
      localStorage.setItem('youngfire_device_session_v1', JSON.stringify(updated));
      localStorage.setItem('youngfire_user_session', JSON.stringify(updated));
    } catch {}

    if (onUpdateUser) onUpdateUser(updated);
    setIsEditingProfile(false);
    setProfileSaveFeedback('✓ Profile & photo saved to your account!');
    setTimeout(() => setProfileSaveFeedback(null), 4500);
  };

  const handleToggleAutoplay = (enabled: boolean) => {
    setAutoplayEnabled(enabled);
    localStorage.setItem('youngfire_autoplay_worship', enabled ? 'true' : 'false');
    const audioElement = document.getElementById('sanctuary-bg-audio') as HTMLAudioElement;
    if (audioElement) {
      if (enabled) {
        audioElement.play().catch(() => {
          console.log("Autoplay blocked by browser policy until interaction");
        });
      } else {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
    }
    window.dispatchEvent(new CustomEvent('yf_autoplay_worship_changed', { detail: { enabled } }));
  };

  const handleToggleSoundEffects = () => {
    const next = !soundEffects;
    setSoundEffects(next);
    localStorage.setItem('youngfire_sound_effects', String(next));
  };

  const executeProfileDeletion = async () => {
    setShowDeleteConfirm(false);
    await hardDeleteUserProfile(
      currentUser?.id || (currentUser as any)?.uid || '',
      currentUser?.email || ''
    );
  };

  const handleDeleteProfile = async () => {
    const t0 = Date.now();
    const confirmed = window.confirm("Are you sure you want to permanently delete your disciple profile? This action cannot be undone.");
    const elapsed = Date.now() - t0;
    if (confirmed) {
      await hardDeleteUserProfile(
        currentUser?.id || (currentUser as any)?.uid || '',
        currentUser?.email || ''
      );
    } else if (elapsed < 15) {
      setShowDeleteConfirm(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-xl animate-fadeIn select-none font-['Outfit']">
      <div className="w-full max-w-lg bg-[#000000] border border-white/20 rounded-3xl p-5 sm:p-6 shadow-2xl text-white space-y-5 max-h-[92vh] overflow-y-auto no-scrollbar">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center text-black font-black flex-shrink-0 shadow-md"
              style={{ backgroundColor: accentColor }}
            >
              <Shield className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-['Outfit'] font-black text-base sm:text-lg tracking-wider uppercase text-white leading-tight">
                Sanctuary Settings &amp; Profile
              </h3>
              <p className="text-[10px] font-mono text-slate-400">
                YoungFire Ministry &bull; Joshua House of Worship
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/10"
            title="Close Settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Disciple Profile Card & Editor */}
        <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <label
                className="relative w-12 h-12 rounded-full flex items-center justify-center text-black font-black text-lg flex-shrink-0 shadow-md cursor-pointer group overflow-visible"
                style={{ backgroundColor: accentColor }}
                title="Tap to upload profile photo (Mobile & Desktop)"
              >
                {profileAvatar && !profileAvatar.startsWith('data:image/svg+xml') ? (
                  <img
                    src={profileAvatar}
                    alt={currentUser?.name || 'Disciple Avatar'}
                    className="w-12 h-12 rounded-full object-cover border border-amber-400/50"
                  />
                ) : (
                  <span>{currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'YF'}</span>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-black border border-amber-400 text-amber-400 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <Camera className="w-2.5 h-2.5" />
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="sr-only"
                />
              </label>
              <div className="min-w-0">
                <div className="font-['Outfit'] font-black text-sm sm:text-base text-white truncate">
                  {currentUser?.fullName || currentUser?.name || 'Sanctuary Disciple'}
                </div>
                <div className="text-xs font-mono text-slate-400 truncate">
                  {currentUser?.email || 'youngfire@jhow.org'}
                </div>
                <div className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider mt-0.5 truncate">
                  {currentUser?.calling || currentUser?.role || 'Young Adult Disciple'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <label
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 text-xs font-mono font-bold uppercase cursor-pointer transition-colors flex items-center gap-1"
                title="Upload Profile Picture"
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="sr-only"
                />
              </label>
              <button
                onClick={() => setIsEditingProfile(prev => !prev)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 text-xs font-mono font-bold uppercase cursor-pointer transition-colors"
              >
                {isEditingProfile ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
          </div>

          {profileSaveFeedback && (
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[11px] font-mono font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{profileSaveFeedback}</span>
            </div>
          )}

          {/* Inline Profile Editor */}
          {isEditingProfile && (
            <div className="pt-3 border-t border-white/10 space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between bg-white/[0.03] p-2.5 rounded-xl border border-white/10">
                <span className="text-[10px] font-mono uppercase text-slate-300">Profile Avatar Photo</span>
                <label className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-colors">
                  <Camera className="w-3 h-3" />
                  <span>Upload Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="sr-only"
                  />
                </label>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-black border border-white/20 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={editedEmail}
                  onChange={(e) => setEditedEmail(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-black border border-white/20 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Ministry Calling</label>
                <input
                  type="text"
                  value={editedCalling}
                  onChange={(e) => setEditedCalling(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-black border border-white/20 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Cohort Gender</label>
                  <select
                    value={editedGender}
                    onChange={(e) => setEditedGender(e.target.value as 'brother' | 'sister')}
                    className="w-full px-3 py-1.5 rounded-xl bg-black border border-white/20 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  >
                    <option value="brother">Brother (Men On Fire)</option>
                    <option value="sister">Sister (Women Ignited)</option>
                  </select>
                </div>
                <div>
                  {isAdmin ? (
                    <>
                      <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Sanctuary Role</label>
                      <select
                        value={editedRole}
                        onChange={(e) => setEditedRole(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-black border border-white/20 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
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
                        {editedRole || currentUser?.role || 'YoungFire Member'}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleSaveProfile}
                className="w-full py-2 rounded-xl text-black font-black text-xs uppercase tracking-wider cursor-pointer shadow-md"
                style={{ backgroundColor: accentColor }}
              >
                Save Profile Changes &rarr;
              </button>
            </div>
          )}
        </div>

        {/* Master Audio Volume */}
        <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-2 font-bold font-['Outfit'] uppercase">
              <Volume2 className="w-4 h-4 text-amber-400" /> 
              Master Sanctuary Audio
            </span>
            <span className="font-mono text-amber-400 font-bold">{audioVolume}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={audioVolume}
            onChange={handleVolumeChange}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        {/* Audio Preferences & Autoplay Toggles */}
        <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
            Sanctuary Playback &amp; Audio Preferences
          </div>

          <div className="flex items-center justify-between py-1 border-b border-white/5">
            <div>
              <span className="text-xs font-bold text-white block">Launch Worship Autoplay</span>
              <span className="text-[10px] text-slate-400 font-mono">Stream contemporary worship on app launch</span>
            </div>
            <button
              onClick={() => handleToggleAutoplay(!autoplayEnabled)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                autoplayEnabled ? 'bg-amber-500' : 'bg-white/20'
              }`}
            >
              <span 
                className={`absolute top-1 w-4 h-4 rounded-full bg-black transition-transform ${
                  autoplayEnabled ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-white/5">
            <div>
              <span className="text-xs font-bold text-white block">Sound Effects &amp; Audio Ducking</span>
              <span className="text-[10px] text-slate-400 font-mono">Auto-duck radio during video and live sermons</span>
            </div>
            <button
              onClick={handleToggleSoundEffects}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                soundEffects ? 'bg-amber-500' : 'bg-white/20'
              }`}
            >
              <span 
                className={`absolute top-1 w-4 h-4 rounded-full bg-black transition-transform ${
                  soundEffects ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-amber-400" />
                <span>Hide Notes Icon</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Hide the floating Study Notes button on screen (still accessible via Menu Drawer)
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleHideNotesIcon}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                hideNotesIcon ? 'bg-amber-500' : 'bg-white/20'
              }`}
              title={hideNotesIcon ? 'Show Floating Notes Icon' : 'Hide Floating Notes Icon'}
            >
              <span 
                className={`absolute top-1 w-4 h-4 rounded-full bg-black transition-transform ${
                  hideNotesIcon ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Sanctuary Notification Engine (Sound, Vibration, Silent, Mute & Category Toggles) */}
        <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-mono uppercase tracking-wider text-slate-200 font-bold">
                Sanctuary Notifications &amp; Alerts
              </span>
            </div>
            <button
              type="button"
              onClick={() => updateNotificationConfig({ enabled: !notificationConfig.enabled })}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                notificationConfig.enabled ? 'bg-amber-500' : 'bg-white/20'
              }`}
              title="Toggle Master Notifications"
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-black transition-transform ${
                  notificationConfig.enabled ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* 4-Mode Alert Selector: Ring, Vibrate, Silent, Mute */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              Alert Mode (Chime, Haptic, Banner, or Mute)
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {([
                { id: 'ring', label: 'Ring', sub: 'Chime + Vib', icon: BellRing },
                { id: 'vibrate', label: 'Vibrate', sub: 'Haptic Only', icon: Vibrate },
                { id: 'silent', label: 'Silent', sub: 'Banner Only', icon: Bell },
                { id: 'mute', label: 'Mute', sub: 'All Off', icon: BellOff }
              ] as const).map((item) => {
                const IconComp = item.icon;
                const isSelected = notificationConfig.alertMode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectAlertMode(item.id)}
                    className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md'
                        : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <IconComp className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-mono font-bold uppercase">{item.label}</span>
                    <span className="text-[8px] font-mono opacity-75">{item.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Granular Category Toggles */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between py-0.5">
              <div>
                <span className="text-xs font-bold text-white block">Fellowship &amp; Cohort Chat Alerts</span>
                <span className="text-[10px] text-slate-400 font-mono">Brotherhood, Sisterhood &amp; General Chat</span>
              </div>
              <button
                type="button"
                onClick={() => updateNotificationConfig({ notifyMessages: !notificationConfig.notifyMessages })}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                  notificationConfig.notifyMessages && notificationConfig.enabled ? 'bg-amber-500' : 'bg-white/20'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-black transition-transform ${
                    notificationConfig.notifyMessages && notificationConfig.enabled ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-0.5">
              <div>
                <span className="text-xs font-bold text-white block">Sanctuary Calendar &amp; Gatherings</span>
                <span className="text-[10px] text-slate-400 font-mono">New events, Zoom huddles &amp; schedule changes</span>
              </div>
              <button
                type="button"
                onClick={() => updateNotificationConfig({ notifyEvents: !notificationConfig.notifyEvents })}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                  notificationConfig.notifyEvents && notificationConfig.enabled ? 'bg-amber-500' : 'bg-white/20'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-black transition-transform ${
                    notificationConfig.notifyEvents && notificationConfig.enabled ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-0.5">
              <div>
                <span className="text-xs font-bold text-white block">24/7 Prayer Wall Intercessions</span>
                <span className="text-[10px] text-slate-400 font-mono">New prayer requests &amp; answered praise reports</span>
              </div>
              <button
                type="button"
                onClick={() => updateNotificationConfig({ notifyPrayerWall: !notificationConfig.notifyPrayerWall })}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                  notificationConfig.notifyPrayerWall && notificationConfig.enabled ? 'bg-amber-500' : 'bg-white/20'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-black transition-transform ${
                    notificationConfig.notifyPrayerWall && notificationConfig.enabled ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Browser Push Permission & Test Chime Row */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={handleRequestPushPermission}
              className={`flex-1 py-2 px-3 rounded-xl border text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer transition-all ${
                browserPermissionStatus === 'granted'
                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400/50 text-emerald-300'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-300'
              }`}
            >
              {browserPermissionStatus === 'granted'
                ? '✓ Alerts Enabled (Tap to Test Alert)'
                : 'Enable Browser Push Alerts'}
            </button>
            <button
              type="button"
              onClick={handleTestChimeButton}
              className={`py-2 px-3 rounded-xl border text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer transition-all ${
                chimePlaying
                  ? 'bg-amber-500 text-black border-amber-300 scale-95 shadow-lg'
                  : 'bg-white/5 hover:bg-white/15 border-white/15 text-slate-200'
              }`}
            >
              {chimePlaying ? '🔔 Chime Playing...' : 'Test Chime'}
            </button>
          </div>

          {alertActionFeedback && (
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/50 text-amber-200 text-[11px] font-mono font-bold flex items-center gap-2 animate-fadeIn">
              <BellRing className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>{alertActionFeedback}</span>
            </div>
          )}
        </div>

        {/* Sanctuary Administrator Management Panel (Visible to Administrators) */}
        {isAdmin && (
          <div className="p-4 rounded-2xl bg-black/60 border border-amber-500/30 space-y-3 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <div className="text-xs font-mono uppercase tracking-wider text-amber-300 font-bold">
                  Sanctuary Administrator Access
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold uppercase">
                {adminRegistryEmails.length} Active
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
              Add a member&apos;s email address below to grant full Sanctuary Administrator &amp; Facilitator privileges across the app.
            </p>

            {adminActionToast && (
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[11px] font-mono font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{adminActionToast}</span>
              </div>
            )}

            <form onSubmit={handleAddAdministratorByEmail} className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="email"
                  required
                  value={newAdminEmailInput}
                  onChange={(e) => setNewAdminEmailInput(e.target.value)}
                  placeholder="Member email (e.g. member@email.com)"
                  className="w-full px-3 py-2 rounded-xl bg-black border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                />
                <input
                  type="text"
                  value={newAdminNameInput}
                  onChange={(e) => setNewAdminNameInput(e.target.value)}
                  placeholder="Member Name (Optional)"
                  className="w-full px-3 py-2 rounded-xl bg-black border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-black uppercase tracking-wider cursor-pointer transition-colors shadow"
              >
                + Add Member as Administrator
              </button>
            </form>

            <div className="pt-2 border-t border-white/10 space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {adminRegistryEmails.map((admEmail) => {
                const isCore = [
                  'trentwhite0308@gmail.com',
                  'trentwhitemba@yahoo.com',
                  'white.whitney91@gmail.com',
                  'jhowyoungfire@gmail.com',
                  'luislopez567@hotmail.com'
                ].includes(admEmail.toLowerCase());
                return (
                  <div
                    key={admEmail}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/10"
                  >
                    <span className="text-[11px] font-mono text-slate-200 truncate">{admEmail}</span>
                    {isCore ? (
                      <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex-shrink-0">
                        Verified Admin
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRevokeAdministratorByEmail(admEmail)}
                        className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold cursor-pointer flex-shrink-0"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* App Theme Selector */}
        {onOpenThemeModal && (
          <button
            onClick={() => { onClose(); onOpenThemeModal(); }}
            className="w-full py-3 px-4 rounded-2xl bg-black/60 hover:bg-black/90 border border-white/15 text-xs font-black uppercase tracking-wider flex items-center justify-between transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-amber-400" /> 
              Switch Sanctuary Style
            </span>
            <span className="text-amber-400 font-mono font-bold">[{activeTheme?.name || 'Spurs Noir'}]</span>
          </button>
        )}

        {/* Sanctuary Support Section */}
        <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2.5">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
            Sanctuary Support &amp; Ministry Outreach
          </div>
          <a
            href={`mailto:JHOWYoungFire@gmail.com?subject=${encodeURIComponent("YoungFire Sanctuary Bug Report")}&body=${encodeURIComponent(`Device: ${typeof navigator !== 'undefined' ? navigator.userAgent : ''}\nScreen: ${typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : ''}\nDescription of Issue:\n`)}`}
            target="_top"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/25 transition-all text-left text-slate-200 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="text-amber-400">⚡</span>
              <span className="font-mono text-xs uppercase tracking-wider">Report Bug / Feedback</span>
            </div>
            <span className="text-slate-400 text-xs font-mono">Send Diagnostics →</span>
          </a>

          <div className="mt-4 p-3.5 rounded-xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-mono text-xs uppercase tracking-wider text-slate-200">
                  YoungFire Support &amp; Inquiries
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  JHOWYoungFire@gmail.com
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href="mailto:JHOWYoungFire@gmail.com?subject=YoungFire%20Sanctuary%20Support%20Inquiry"
                  target="_top"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black font-mono text-[10px] uppercase font-bold transition-all"
                >
                  Email Us
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Sign Out / Logout Button */}
        <button
          onClick={() => {
            try {
              clearPersistentAuthSession();
              localStorage.removeItem('youngfire_verified_auth_v1');
              localStorage.removeItem('youngfire_device_session_v1');
              localStorage.removeItem('youngfire_user_session');
              window.dispatchEvent(new CustomEvent('yf_logout'));
            } catch {}
            if (onSignOut) onSignOut();
            onClose();
          }}
          className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-amber-300 hover:text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 shadow"
        >
          <LogOut className="w-4 h-4 text-amber-400" />
          <span>Log Out of Sanctuary Session</span>
        </button>

        {/* PROMINENT ATHLETIC DANGER BUTTON: DELETE MY PROFILE */}
        <div className="pt-2">
          <button
            onClick={handleDeleteProfile}
            className="w-full py-3 px-4 rounded-2xl border border-red-500/50 hover:border-red-500 bg-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-300 text-xs sm:text-sm font-black font-['Outfit'] uppercase tracking-[0.2em] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg group active:scale-98"
            title="Permanently Delete Consecrated Disciple Profile & Records"
          >
            <Trash2 className="w-4 h-4 stroke-[2.5] text-red-500 group-hover:scale-110 transition-transform" />
            <span>DELETE MY PROFILE</span>
          </button>
          <p className="text-[10px] font-mono text-slate-500 text-center mt-1.5">
            Permanently removes your account session, streak progress, and roster data.
          </p>
        </div>

        {/* IN-APP DANGER CONFIRMATION MODAL */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-fadeIn">
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

export default SettingsHUDModal;
