import React, { useState, useEffect } from 'react';
import { Trash2, Mail, Phone, Edit3, X, Camera, Check, Sparkles, Shield } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getProfileDocId, updateDiscipleProfileGlobal } from '../services/profileService';
import { checkIsAdmin, grantAdminByEmail, revokeAdminByEmail } from '../services/authService';
import { compressImageFile } from '../utils/imageUtils';

export const getInitials = (name: string) => {
  if (!name) return 'YF';
  const parts = name.trim().split(' ').filter(Boolean);
  return parts.length >= 2 
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() 
    : parts[0].slice(0, 2).toUpperCase();
};

export interface DiscipleMember {
  id?: string;
  name: string;
  fullName?: string;
  email?: string;
  role?: string;
  calling?: string;
  gender?: 'brother' | 'sister' | 'male' | 'female' | string;
  avatarUrl?: string;
  avatar?: string;
  residence?: string;
  phone?: string;
  birthday?: string;
  scriptureAnchor?: string;
  bio?: string;
  chaptersRead?: number;
  streakDays?: number;
  prayerWatches?: number;
  updatedAt?: number;
}

interface DiscipleCutoutCardProps {
  member: DiscipleMember;
  onClick?: () => void;
  onDelete?: (memberId: string) => void;
  canDelete?: boolean;
  onEdit?: (member: DiscipleMember) => void;
  canEdit?: boolean;
}

export const DiscipleCutoutCard: React.FC<DiscipleCutoutCardProps> = ({
  member,
  onClick,
  onDelete,
  canDelete = false,
  onEdit,
  canEdit
}) => {
  const displayName = member.name || member.fullName || 'Sanctuary Disciple';
  const photoUrl = member.avatarUrl || member.avatar || '';
  const roleLower = (member.role || '').toLowerCase();
  const emailLower = (member.email || '').toLowerCase().trim();
  const nameLower = (member.name || member.fullName || '').toLowerCase();
  const isWhitney = emailLower === 'white.whitney91@gmail.com' || nameLower.includes('whitney white');
  const isOverseer =
    roleLower === 'overseer' ||
    roleLower.includes('overseer') ||
    isWhitney;
  const isLeadFacilitator =
    (member as any).isAdmin === true ||
    (member as any).accountType === 'administrator' ||
    roleLower === 'lead facilitator' ||
    roleLower.includes('lead facilitator') ||
    roleLower.includes('admin') ||
    checkIsAdmin(emailLower) ||
    ['trentwhite0308@gmail.com', 'trentwhitemba@yahoo.com', 'white.whitney91@gmail.com', 'luislopez567@hotmail.com'].includes(emailLower);
  const isLeadership = isLeadFacilitator || isOverseer;
  const leadershipBadgeText = isOverseer
    ? 'OVERSEER'
    : roleLower === 'administrator' || emailLower === 'luislopez567@hotmail.com'
    ? 'ADMINISTRATOR'
    : 'LEAD FACILITATOR';

  const ADMIN_EMAILS = [
    'trentwhite0308@gmail.com',
    'trentwhitemba@yahoo.com',
    'white.whitney91@gmail.com',
    'luislopez567@hotmail.com'
  ];
  const activeSessionUser = (() => {
    try {
      const raw =
        (typeof window !== 'undefined' && localStorage.getItem('youngfire_auth_session')) ||
        (typeof window !== 'undefined' && localStorage.getItem('youngfire_user_session'));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();
  const isAdmin =
    Boolean(activeSessionUser?.isAdmin) ||
    activeSessionUser?.accountType === 'administrator' ||
    activeSessionUser?.role === 'Administrator' ||
    activeSessionUser?.role === 'Lead Facilitator' ||
    activeSessionUser?.role === 'Overseer' ||
    checkIsAdmin(activeSessionUser?.email) ||
    ADMIN_EMAILS.includes(activeSessionUser?.email?.toLowerCase()?.trim() || '');

  const isAuthorizedToEdit =
    canEdit !== undefined
      ? canEdit
      : Boolean(
          isAdmin ||
            (activeSessionUser?.email &&
              member.email &&
              activeSessionUser.email.toLowerCase().trim() === member.email.toLowerCase().trim())
        );

  // Inline Edit Discipleship Card Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(displayName);
  const [editEmail, setEditEmail] = useState(member.email || '');
  const [editPhone, setEditPhone] = useState(member.phone || '');
  const [editGender, setEditGender] = useState<'brother' | 'sister'>(
    member.gender === 'sister' || member.gender === 'female' || isWhitney ? 'sister' : 'brother'
  );
  const [editRole, setEditRole] = useState(
    isWhitney && (!member.role || member.role === 'YoungFire Member') ? 'Overseer' : (member.role || 'YoungFire Member')
  );
  const [editIsAdmin, setEditIsAdmin] = useState<boolean>(() =>
    Boolean(
      (member as any).isAdmin ||
      (member as any).accountType === 'administrator' ||
      member.role === 'Administrator' ||
      member.role === 'Lead Facilitator' ||
      member.role === 'Overseer' ||
      checkIsAdmin(member.email)
    )
  );
  const [editCalling, setEditCalling] = useState(member.calling || 'Member');
  const [editScriptureAnchor, setEditScriptureAnchor] = useState(member.scriptureAnchor || 'Ephesians 4:16');
  const [editResidence, setEditResidence] = useState(member.residence || 'San Antonio, TX');
  const [editBio, setEditBio] = useState(
    member.bio || 'Faithful consecrated disciple growing in the word and assembly at Joshua House of Worship.'
  );
  const [editChaptersRead, setEditChaptersRead] = useState<number>(member.chaptersRead || 0);
  const [editStreakDays, setEditStreakDays] = useState<number>(member.streakDays || 0);
  const [editPrayerWatches, setEditPrayerWatches] = useState<number>(member.prayerWatches || 0);
  const [newAvatarBase64, setNewAvatarBase64] = useState('');
  const [localPhotoOverride, setLocalPhotoOverride] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const effectivePhotoUrl = localPhotoOverride || photoUrl;

  useEffect(() => {
    setEditName(member.name || member.fullName || 'Sanctuary Disciple');
    setEditEmail(member.email || '');
    setEditPhone(member.phone || '');
    setEditGender(member.gender === 'sister' || member.gender === 'female' || isWhitney ? 'sister' : 'brother');
    setEditRole(
      isWhitney && (!member.role || member.role === 'YoungFire Member') ? 'Overseer' : (member.role || 'YoungFire Member')
    );
    setEditIsAdmin(
      Boolean(
        (member as any).isAdmin ||
        (member as any).accountType === 'administrator' ||
        member.role === 'Administrator' ||
        member.role === 'Lead Facilitator' ||
        member.role === 'Overseer' ||
        checkIsAdmin(member.email)
      )
    );
    setEditCalling(member.calling || 'Member');
    setEditScriptureAnchor(member.scriptureAnchor || 'Ephesians 4:16');
    setEditResidence(member.residence || 'San Antonio, TX');
    setEditBio(
      member.bio || 'Faithful consecrated disciple growing in the word and assembly at Joshua House of Worship.'
    );
    setEditChaptersRead(member.chaptersRead || 0);
    setEditStreakDays(member.streakDays || 0);
    setEditPrayerWatches(member.prayerWatches || 0);
    setNewAvatarBase64('');
    setLocalPhotoOverride('');
  }, [member, isWhitney]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const base64 = await compressImageFile(file, 420, 420, 0.82);
      if (base64) {
        setNewAvatarBase64(base64);
        setLocalPhotoOverride(base64);
        const cleanEmail = (editEmail || member.email || '').toLowerCase().trim();
        const fallbackId = `disciple_${displayName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const docId = member.id || getProfileDocId(cleanEmail, fallbackId);
        const updatedPayload: Record<string, any> = {
          id: docId,
          name: editName.trim() || displayName,
          email: cleanEmail,
          gender: editGender || (member.gender === 'sister' || member.gender === 'female' || isWhitney ? 'sister' : 'brother'),
          role: editRole || member.role || 'YoungFire Member',
          calling: editCalling || member.calling || 'Member',
          avatarUrl: base64,
          avatar: base64,
          updatedAt: Date.now()
        };
        await updateDiscipleProfileGlobal(cleanEmail, docId, updatedPayload);
        try {
          window.dispatchEvent(new CustomEvent('yf_disciple_card_updated', { detail: updatedPayload }));
        } catch {}
      }
    } catch (err) {
      console.error('Error compressing profile photo:', err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleDirectCardPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const base64 = await compressImageFile(file, 420, 420, 0.82);
      if (!base64) return;
      setLocalPhotoOverride(base64);
      setNewAvatarBase64(base64);

      const cleanEmail = (member.email || '').toLowerCase().trim();
      const fallbackId = `disciple_${displayName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const docId = member.id || getProfileDocId(cleanEmail, fallbackId);

      const updatedPayload: Record<string, any> = {
        id: docId,
        name: displayName,
        email: cleanEmail,
        gender: member.gender === 'sister' || member.gender === 'female' || isWhitney ? 'sister' : 'brother',
        role: member.role || 'YoungFire Member',
        calling: member.calling || 'Member',
        avatarUrl: base64,
        avatar: base64,
        updatedAt: Date.now()
      };

      await updateDiscipleProfileGlobal(cleanEmail, docId, updatedPayload);

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
        const savedRoster = localStorage.getItem('youngfire_member_roster_v2');
        if (savedRoster) {
          const parsedRoster = JSON.parse(savedRoster);
          if (Array.isArray(parsedRoster)) {
            const nextRoster = parsedRoster.map((m: any) =>
              m.id === docId || (cleanEmail && m.email?.toLowerCase()?.trim() === cleanEmail)
                ? { ...m, avatar: base64, avatarUrl: base64 }
                : m
            );
            localStorage.setItem('youngfire_member_roster_v2', JSON.stringify(nextRoster));
          }
        }
        window.dispatchEvent(new CustomEvent('yf_disciple_card_updated', { detail: updatedPayload }));
      } catch {}
    } catch (err) {
      console.error('Error uploading card profile photo:', err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSaving(true);
    try {
      const cleanEmail = editEmail.toLowerCase().trim();
      const docId = member.id || getProfileDocId(cleanEmail, member.id);
      const preservedAvatar = newAvatarBase64 || effectivePhotoUrl || '';

      const resolvedRole = isAdmin
        ? editIsAdmin && (!editRole || editRole === 'YoungFire Member')
          ? 'Administrator'
          : editRole || 'YoungFire Member'
        : member.role || 'YoungFire Member';
      const resolvedAdminFlag = isAdmin
        ? Boolean(
            editIsAdmin ||
            resolvedRole === 'Administrator' ||
            resolvedRole === 'Lead Facilitator' ||
            resolvedRole === 'Overseer' ||
            ADMIN_EMAILS.includes(cleanEmail)
          )
        : Boolean((member as any).isAdmin || checkIsAdmin(cleanEmail));

      const updatedPayload: Record<string, any> = {
        id: docId,
        name: editName.trim() || 'Sanctuary Disciple',
        email: cleanEmail,
        phone: editPhone.trim(),
        gender: editGender,
        role: resolvedRole,
        isAdmin: resolvedAdminFlag,
        accountType: resolvedAdminFlag ? 'administrator' : 'member',
        calling: editCalling.trim() || 'Member',
        scriptureAnchor: editScriptureAnchor.trim() || 'Ephesians 4:16',
        residence: editResidence.trim() || 'San Antonio, TX',
        bio: editBio.trim(),
        chaptersRead: Number(editChaptersRead) || 0,
        streakDays: Number(editStreakDays) || 0,
        prayerWatches: Number(editPrayerWatches) || 0,
        avatarUrl: preservedAvatar,
        avatar: preservedAvatar,
        updatedAt: Date.now()
      };

      await updateDiscipleProfileGlobal(cleanEmail, docId, updatedPayload);

      if (isAdmin && cleanEmail) {
        if (resolvedAdminFlag) {
          await grantAdminByEmail(cleanEmail, editName.trim(), docId);
        } else if (!ADMIN_EMAILS.includes(cleanEmail)) {
          await revokeAdminByEmail(cleanEmail, docId);
        }
      }

      // If this card belongs to the active signed-in user, sync localStorage session
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

      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Error saving discipleship card:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        onClick={onClick}
        className={`relative group w-full max-w-[280px] h-[360px] rounded-2xl p-4 bg-gradient-to-b from-stone-900/90 to-black/95 ${
          isLeadership
            ? 'border-2 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.45),0_10px_30px_rgba(0,0,0,0.85)] ring-1 ring-amber-300/40'
            : 'border border-amber-500/20 shadow-[0_10px_30px_rgba(0,0,0,0.8)]'
        } overflow-hidden transition-all duration-300 hover:border-amber-500/50 hover:scale-[1.02] flex flex-col justify-between mx-auto cursor-pointer`}
      >
        {/* Ambient 3D Rim Glow Behind Headshot */}
        <div
          className={`absolute top-8 left-1/2 -translate-x-1/2 w-44 h-44 rounded-full blur-2xl pointer-events-none transition-all ${
            isLeadership ? 'bg-amber-400/25 group-hover:bg-amber-400/35' : 'bg-amber-500/10 group-hover:bg-amber-500/20'
          }`}
        />

        {/* Edit Discipleship Card & Direct Photo Upload Buttons (Top-Left) */}
        {isAuthorizedToEdit && (
          <div
            className="absolute top-3 left-3 z-30 flex items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!isAuthorizedToEdit) return;
                if (onEdit) {
                  onEdit(member);
                } else {
                  setIsEditModalOpen(true);
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-black/80 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 border border-amber-500/40 transition-colors cursor-pointer flex items-center gap-1 shadow-md"
              title="Edit Profile"
            >
              <Edit3 className="w-3 h-3" />
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider">Edit Profile</span>
            </button>

            <label
              onClick={(e) => e.stopPropagation()}
              className="px-2 py-1 rounded-lg bg-black/80 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 border border-amber-500/40 transition-colors cursor-pointer flex items-center gap-1 shadow-md"
              title="Upload Profile Picture (Mobile & Desktop)"
            >
              <Camera className="w-3 h-3" />
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider">
                {isUploadingPhoto ? '...' : 'Photo'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleDirectCardPhotoUpload}
                className="sr-only"
              />
            </label>
          </div>
        )}

        {/* Optional Delete Button for Self / Admin (Top-Right) */}
        {canDelete && onDelete && member.id && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(member.id!);
            }}
            className="absolute top-3 right-3 z-30 p-1.5 rounded-lg bg-black/70 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/10 transition-colors cursor-pointer"
            title="Delete Profile from Roster"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* 3D Cutout / Monogram Projection Layer */}
        <div className="relative z-10 w-full h-56 flex items-center justify-center">
          {effectivePhotoUrl ? (
            <img 
              src={effectivePhotoUrl} 
              alt={displayName}
              className={`max-h-52 object-contain filter group-hover:scale-105 transition-transform duration-300 ${
                isLeadership
                  ? 'drop-shadow-[0_0_18px_rgba(245,158,11,0.65)] rounded-xl ring-2 ring-amber-400/70'
                  : 'drop-shadow-[0_15px_15px_rgba(0,0,0,0.9)]'
              }`}
            />
          ) : (
            <div
              className={`w-28 h-28 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center ${
                isLeadership
                  ? 'border-2 border-amber-200 ring-2 ring-amber-400/70 shadow-[0_0_30px_rgba(245,158,11,0.65)]'
                  : 'border-2 border-amber-300/40 shadow-[0_0_25px_rgba(245,158,11,0.4)]'
              }`}
            >
              <span className="font-mono text-3xl font-extrabold text-black tracking-wider">
                {getInitials(displayName)}
              </span>
            </div>
          )}
        </div>

        {/* Disciple Plaque */}
        <div className="relative z-20 mt-2 text-center">
          <div className="font-mono text-xs uppercase tracking-widest text-amber-400 font-bold truncate">
            {displayName}
          </div>
          {isLeadership ? (
            <div className="mt-0.5 inline-block px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/30 to-yellow-500/20 border border-amber-400 text-[10px] font-mono font-black uppercase tracking-widest text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.4)] max-w-full truncate">
              {leadershipBadgeText}
            </div>
          ) : (
            <div className="mt-0.5 inline-block px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono uppercase tracking-wider text-amber-300 max-w-full truncate">
              {member.role || 'YoungFire Member'}
            </div>
          )}
          <div className="mt-1 text-[11px] font-mono text-slate-400 truncate">
            {member.calling || 'Member'}
          </div>
          {(member.email || member.phone) && (
            <div className="mt-2 flex items-center justify-center gap-2 text-[10px] font-mono text-slate-400">
              {member.email && (
                <a
                  href={`mailto:${member.email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-amber-500/20 hover:text-amber-300 flex items-center gap-1 transition-colors truncate max-w-[130px]"
                  title={member.email}
                >
                  <Mail className="w-2.5 h-2.5 flex-shrink-0" />
                  <span className="truncate">{member.email}</span>
                </a>
              )}
              {member.phone && (
                <a
                  href={`tel:${member.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-amber-500/20 hover:text-amber-300 flex items-center gap-1 transition-colors"
                  title={member.phone}
                >
                  <Phone className="w-2.5 h-2.5 flex-shrink-0" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Discipleship Card Modal */}
      {isEditModalOpen && (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditModalOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-[#050811] border-2 border-amber-500/50 p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] text-white space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="font-['Barlow_Condensed'] font-black text-xl uppercase tracking-wider text-white">
                  Edit Discipleship Card
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="space-y-3.5 text-left">
              {/* Avatar / Cutout Photo Upload */}
              <div className="flex items-center gap-4 p-3 rounded-2xl bg-black/60 border border-white/10">
                <label
                  className="relative w-16 h-16 rounded-2xl overflow-hidden bg-stone-900 border border-amber-500/40 flex items-center justify-center shrink-0 cursor-pointer group"
                  title="Tap to upload photo from mobile or desktop"
                >
                  {newAvatarBase64 || effectivePhotoUrl ? (
                    <img
                      src={newAvatarBase64 || effectivePhotoUrl}
                      alt={editName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-mono text-lg font-extrabold text-amber-400">
                      {getInitials(editName)}
                    </span>
                  )}
                  <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-black/85 border border-amber-400 text-amber-400 flex items-center justify-center shadow">
                    <Camera className="w-2.5 h-2.5" />
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="sr-only"
                  />
                </label>
                <div className="flex-1 space-y-1.5">
                  <div className="text-xs font-mono font-bold text-slate-200 uppercase">
                    Disciple Cutout / Profile Photo
                  </div>
                  <label className="inline-flex px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 font-mono text-[10px] font-bold uppercase tracking-wider items-center gap-1.5 cursor-pointer transition-colors">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isUploadingPhoto ? 'Optimizing Photo...' : 'Upload / Change Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
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
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
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
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
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
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as 'brother' | 'sister')}
                    className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="brother">Brotherhood (Men On Fire)</option>
                    <option value="sister">Sisterhood (Women Ignited)</option>
                  </select>
                </div>
                <div>
                  {isAdmin ? (
                    <>
                      <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                        Sanctuary Role
                      </label>
                      <select
                        value={editRole}
                        onChange={(e) => {
                          const nextRole = e.target.value;
                          setEditRole(nextRole);
                          if (
                            nextRole === 'Administrator' ||
                            nextRole === 'Lead Facilitator' ||
                            nextRole === 'Overseer'
                          ) {
                            setEditIsAdmin(true);
                          }
                        }}
                        className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      >
                        <option value="YoungFire Member">YoungFire Member</option>
                        <option value="Facilitator">Facilitator</option>
                        <option value="Lead Facilitator">Lead Facilitator</option>
                        <option value="Overseer">Overseer</option>
                        <option value="Administrator">Administrator</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !editIsAdmin;
                          setEditIsAdmin(nextVal);
                          if (nextVal && (!editRole || editRole === 'YoungFire Member')) {
                            setEditRole('Administrator');
                          } else if (!nextVal && editRole === 'Administrator') {
                            setEditRole('YoungFire Member');
                          }
                        }}
                        className={`mt-2 w-full px-3 py-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          editIsAdmin
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                            : 'bg-black/60 border-white/15 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider">
                          <Shield className="w-3.5 h-3.5 text-amber-400" />
                          <span>{editIsAdmin ? 'Administrator Access Enabled' : 'Grant Administrator Access'}</span>
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                          editIsAdmin ? 'bg-amber-400 text-black' : 'bg-white/10 text-slate-400'
                        }`}>
                          {editIsAdmin ? 'ADMIN' : 'MEMBER'}
                        </span>
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col space-y-1">
                      <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">
                        Sanctuary Role
                      </span>
                      <div className="px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-amber-400 font-bold uppercase tracking-wider">
                        {editRole || member.role || 'YoungFire Member'}
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
                    value={editCalling}
                    onChange={(e) => setEditCalling(e.target.value)}
                    placeholder="e.g. Member, Intercessor, Worship"
                    className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                    Scripture Anchor
                  </label>
                  <input
                    type="text"
                    value={editScriptureAnchor}
                    onChange={(e) => setEditScriptureAnchor(e.target.value)}
                    placeholder="e.g. Ephesians 4:16"
                    className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="(210) 555-0199"
                    className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={editResidence}
                    onChange={(e) => setEditResidence(e.target.value)}
                    placeholder="San Antonio, TX"
                    className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                  Discipleship Bio
                </label>
                <textarea
                  rows={2}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full bg-black/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="block font-mono text-[9px] uppercase tracking-wider text-slate-400 mb-1">
                    Chapters Read
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editChaptersRead}
                    onChange={(e) => setEditChaptersRead(parseInt(e.target.value, 10) || 0)}
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
                    value={editStreakDays}
                    onChange={(e) => setEditStreakDays(parseInt(e.target.value, 10) || 0)}
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
                    value={editPrayerWatches}
                    onChange={(e) => setEditPrayerWatches(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-black/80 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 font-mono text-xs uppercase tracking-wider text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 font-['Barlow_Condensed'] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Disciple Card'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default DiscipleCutoutCard;
