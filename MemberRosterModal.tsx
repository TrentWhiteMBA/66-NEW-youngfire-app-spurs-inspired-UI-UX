import React, { useState, useEffect } from 'react';
import { 
  X, Users, UserPlus, Search, Phone, Mail, MapPin, 
  Shield, Heart, Flame, Trash2, Edit3, Check, RefreshCw,
  ShieldAlert, Camera, Calendar, Music, Sparkles
} from 'lucide-react';
import { CurrentUser } from './SettingsHUDModal';
import {
  saveRosterMemberToCloud,
  deleteRosterMemberFromCloud
} from '../services/firebaseSyncService';
import { db } from '../services/firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getProfileDocId, upsertDiscipleProfile, deduplicateSanctuaryDisciples, updateDiscipleProfileGlobal } from '../services/profileService';
import { checkIsAdmin, grantAdminByEmail, revokeAdminByEmail } from '../services/authService';
import { compressImageFile } from '../utils/imageUtils';
import { 
  MINISTRY_ROLES, 
  getRoleById, 
  getRoleByLabel, 
  MinistryRoleOption 
} from '../data/ministryRoles';

export interface RosterMember {
  id: string;
  fullName: string;
  name?: string;
  role: string;
  calling: string;
  group: 'YoungFire' | 'Men On Fire' | 'Women Ignited' | 'All';
  churchMembership?: string;
  residence?: string;
  email?: string;
  phone?: string;
  gender?: 'male' | 'female';
  avatar?: string;
  birthday?: string; // MM-DD
  accountType?: 'member' | 'administrator';
  isAdmin?: boolean;
  ministryRole?: string;
  prayerRequests?: string;
  notes?: string;
}

interface MemberRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: CurrentUser | null;
  initialGroup?: 'YoungFire' | 'Men On Fire' | 'Women Ignited' | 'All';
}

const ROLE_FILTERS = [
  { id: 'all', label: 'All Roles' },
  { id: 'administrator', label: '👑 Administrators' },
  { id: 'prayer_warrior', label: '🔥 Prayer Warriors' },
  { id: 'disciple', label: '🛡️ Disciples' },
  { id: 'photographer', label: '📸 Photographers & Media' },
  { id: 'event_facilitator', label: '📅 Event Facilitators' },
  { id: 'worship_minister', label: '🎵 Worship Ministers' },
  { id: 'member', label: '👥 Members' }
];

export const MemberRosterModal: React.FC<MemberRosterModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialGroup = 'All'
}) => {
  const [members, setMembers] = useState<RosterMember[]>(() => {
    try {
      const saved = localStorage.getItem('youngfire_member_roster_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(m => !['roster_trent', 'roster_whitney', 'roster_caleb', 'roster_maya'].includes(m.id));
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const [selectedGroup, setSelectedGroup] = useState<'YoungFire' | 'Men On Fire' | 'Women Ignited' | 'All'>(initialGroup);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [group, setGroup] = useState<'YoungFire' | 'Men On Fire' | 'Women Ignited' | 'All'>('YoungFire');
  const [accountType, setAccountType] = useState<'member' | 'administrator'>('member');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('disciple');
  const [role, setRole] = useState('Disciple');
  const [calling, setCalling] = useState('Word Discipleship & Small Group Growth');
  const [churchMembership, setChurchMembership] = useState('Joshua House of Worship');
  const [residence, setResidence] = useState('San Antonio, TX');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [prayerRequests, setPrayerRequests] = useState('');
  const [existingAvatarUrl, setExistingAvatarUrl] = useState('');
  const [newAvatarBase64, setNewAvatarBase64] = useState('');
  const [isUploadingRosterPhoto, setIsUploadingRosterPhoto] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleRosterPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploadingRosterPhoto(true);
    try {
      const base64 = await compressImageFile(file, 420, 420, 0.82);
      if (base64) {
        setNewAvatarBase64(base64);
        if (editingMemberId) {
          const cleanName = (fullName || 'Sanctuary Disciple').trim();
          const cleanEmail = (email || '').toLowerCase().trim();
          const docId = getProfileDocId(cleanEmail, editingMemberId);
          await updateDiscipleProfileGlobal(cleanEmail, editingMemberId, {
            id: docId,
            name: cleanName,
            email: cleanEmail,
            avatarUrl: base64,
            avatar: base64
          });
          try {
            window.dispatchEvent(
              new CustomEvent('yf_disciple_card_updated', {
                detail: { id: docId, email: cleanEmail, name: cleanName, avatarUrl: base64, avatar: base64 }
              })
            );
          } catch {}
        }
      }
    } catch (err) {
      console.error('Error compressing roster photo:', err);
    } finally {
      setIsUploadingRosterPhoto(false);
    }
  };

  const handleDirectDirectoryPhotoUpload = async (m: RosterMember, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploadingRosterPhoto(true);
    try {
      const base64 = await compressImageFile(file, 420, 420, 0.82);
      if (!base64) return;
      const cleanName = (m.fullName || m.name || 'Sanctuary Disciple').trim();
      const cleanEmail = (m.email || '').toLowerCase().trim();
      const docId = getProfileDocId(cleanEmail, m.id || `disciple_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`);
      const resolvedGender: 'brother' | 'sister' = m.group === 'Women Ignited' || m.gender === 'female' ? 'sister' : 'brother';

      const updatedPayload = {
        id: docId,
        name: cleanName,
        email: cleanEmail,
        calling: m.calling || 'Member',
        gender: resolvedGender,
        role: m.role || 'YoungFire Member',
        avatarUrl: base64,
        updatedAt: Date.now()
      };

      await updateDiscipleProfileGlobal(cleanEmail, docId, updatedPayload);

      const updatedList = members.map((item) =>
        item.id === m.id || item.id === docId ? { ...item, avatar: base64 } : item
      );
      setMembers(updatedList);
      try {
        localStorage.setItem('youngfire_member_roster_v2', JSON.stringify(updatedList));
        if (
          currentUser &&
          (currentUser.id === docId ||
            (currentUser as any).uid === docId ||
            (cleanEmail && currentUser.email?.toLowerCase().trim() === cleanEmail))
        ) {
          localStorage.setItem('youngfire_auth_session', JSON.stringify({ ...updatedPayload }));
          localStorage.setItem('youngfire_user_avatar', base64);
        }
        window.dispatchEvent(new CustomEvent('yf_disciple_card_updated', { detail: updatedPayload }));
      } catch {}
    } catch (err) {
      console.error('Error uploading directory member photo:', err);
    } finally {
      setIsUploadingRosterPhoto(false);
    }
  };

  // Synchronize with Firestore 'sanctuary_disciples' real-time listener
  useEffect(() => {
    if (!isOpen) return;
    deduplicateSanctuaryDisciples().catch(() => {});
    const disciplesRef = collection(db, 'sanctuary_disciples');
    const q = query(disciplesRef, orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const memberMap = new Map();
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const key = (data.email || docSnap.id).toLowerCase().trim();
        if (!memberMap.has(key)) {
          const isSister = data.gender === 'sister' || data.gender === 'female';
          const isMemberAdmin = Boolean(
            data.isAdmin ||
            data.accountType === 'administrator' ||
            data.role === 'Administrator' ||
            data.role === 'Lead Facilitator' ||
            data.role === 'Overseer' ||
            checkIsAdmin(data.email)
          );
          memberMap.set(key, {
            id: docSnap.id,
            fullName: data.name || data.fullName || 'Sanctuary Disciple',
            name: data.name || data.fullName || 'Sanctuary Disciple',
            role: data.role || (isMemberAdmin ? 'Administrator' : 'YoungFire Member'),
            calling: data.calling || 'Member',
            group: isSister ? 'Women Ignited' : 'Men On Fire',
            gender: isSister ? 'female' : 'male',
            avatar: data.avatarUrl || '',
            email: data.email || '',
            phone: data.phone || '',
            birthday: data.birthday || '',
            residence: data.residence || 'San Antonio, TX',
            churchMembership: data.churchMembership || 'Joshua House of Worship',
            isAdmin: isMemberAdmin,
            accountType: isMemberAdmin ? 'administrator' : 'member'
          });
        }
      });

      const uniqueMembers = Array.from(memberMap.values());
      setMembers(uniqueMembers);
      try {
        localStorage.setItem('youngfire_member_roster_v2', JSON.stringify(uniqueMembers));
      } catch {}
    }, (err) => {
      console.error("Roster sync error:", err);
    });

    return () => unsubscribe();
  }, [isOpen]);

  useEffect(() => {
    setSelectedGroup(initialGroup);
  }, [initialGroup]);

  if (!isOpen) return null;

  const ADMIN_EMAILS = [
    'trentwhite0308@gmail.com',
    'trentwhitemba@yahoo.com',
    'white.whitney91@gmail.com',
    'luislopez567@hotmail.com'
  ];
  const isAdmin = Boolean(
    currentUser?.isAdmin ||
    currentUser?.accountType === 'administrator' ||
    currentUser?.role === 'Administrator' ||
    currentUser?.role === 'Lead Facilitator' ||
    currentUser?.role === 'Overseer' ||
    checkIsAdmin(currentUser?.email) ||
    ADMIN_EMAILS.includes((currentUser?.email || '').toLowerCase().trim())
  );

  const handleToggleMemberAdmin = async (m: RosterMember) => {
    if (!isAdmin) return;
    const cleanEmail = (m.email || '').toLowerCase().trim();
    const currentlyAdmin = Boolean(m.isAdmin || m.accountType === 'administrator' || checkIsAdmin(cleanEmail));
    const nextAdmin = !currentlyAdmin;
    const nextRole = nextAdmin ? 'Administrator' : 'YoungFire Member';
    const docId = getProfileDocId(cleanEmail, m.id);

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
          await grantAdminByEmail(cleanEmail, m.fullName || m.name, docId);
        } else {
          await revokeAdminByEmail(cleanEmail, docId);
        }
      }
      setMembers((prev) =>
        prev.map((item) =>
          item.id === m.id || item.id === docId
            ? { ...item, isAdmin: nextAdmin, accountType: nextAdmin ? 'administrator' : 'member', role: nextRole }
            : item
        )
      );
    } catch (err) {
      console.error('Failed to toggle member admin role:', err);
    }
  };

  const handleRoleSelection = (roleId: string) => {
    setSelectedRoleId(roleId);
    const r = getRoleById(roleId);
    setRole(r.label);
    setCalling(r.defaultCalling);
  };

  const handleOpenAddForm = () => {
    setEditingMemberId(null);
    setFullName('');
    setGroup(selectedGroup === 'All' ? 'YoungFire' : selectedGroup);
    setAccountType('member');
    handleRoleSelection('disciple');
    setChurchMembership('Joshua House of Worship');
    setResidence('San Antonio, TX');
    setEmail('');
    setPhone('');
    setBirthday('');
    setPrayerRequests('');
    setExistingAvatarUrl('');
    setNewAvatarBase64('');
    setIsRegisterOpen(true);
  };

  const handleEditMember = (m: RosterMember) => {
    setEditingMemberId(m.id);
    setFullName(m.fullName || m.name || '');
    setGroup(m.group || 'YoungFire');
    setAccountType(m.accountType || (m.isAdmin ? 'administrator' : 'member'));
    
    const roleObj = getRoleByLabel(m.ministryRole || m.role);
    setSelectedRoleId(roleObj.id);
    setRole(m.role || roleObj.label);
    setCalling(m.calling || roleObj.defaultCalling);

    setChurchMembership(m.churchMembership || 'Joshua House of Worship');
    setResidence(m.residence || 'San Antonio, TX');
    setEmail(m.email || '');
    setPhone(m.phone || '');
    setBirthday(m.birthday || '');
    setPrayerRequests(m.prayerRequests || '');
    setExistingAvatarUrl((m as any).avatarUrl || m.avatar || '');
    setNewAvatarBase64('');
    setIsRegisterOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    const roleObj = getRoleById(selectedRoleId);
    const isMemberAdmin = accountType === 'administrator';
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = fullName.trim();
    const docId = getProfileDocId(cleanEmail, editingMemberId || `disciple_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`);

    const matchedExisting = members.find(
      m => m.id === editingMemberId || m.id === docId || (cleanEmail && m.email && m.email.toLowerCase().trim() === cleanEmail)
    );
    const preservedAvatar =
      newAvatarBase64 ||
      existingAvatarUrl ||
      (matchedExisting as any)?.avatarUrl ||
      matchedExisting?.avatar ||
      '';

    const resolvedGender: 'brother' | 'sister' = group === 'Women Ignited' ? 'sister' : 'brother';
    const resolvedRole = isMemberAdmin
      ? 'Administrator'
      : roleObj.id === 'event_facilitator'
      ? 'Overseer'
      : `${roleObj.label} • Member`;

    const updatedPayload = {
      name: cleanName,
      email: cleanEmail,
      calling: calling.trim() || roleObj.defaultCalling || 'Member',
      gender: resolvedGender,
      role: resolvedRole,
      isAdmin: isMemberAdmin,
      accountType: isMemberAdmin ? 'administrator' : 'member',
      avatarUrl: preservedAvatar,
      residence: residence.trim(),
      phone: phone.trim(),
      birthday: birthday.trim(),
      updatedAt: Date.now()
    };

    const memberPayload: RosterMember = {
      id: docId,
      fullName: cleanName,
      name: cleanName,
      group,
      accountType,
      isAdmin: isMemberAdmin,
      ministryRole: roleObj.label,
      role: resolvedRole,
      calling: updatedPayload.calling,
      churchMembership: churchMembership.trim(),
      residence: residence.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      birthday: birthday.trim(),
      prayerRequests: prayerRequests.trim(),
      gender: resolvedGender === 'sister' ? 'female' : 'male',
      avatar: preservedAvatar
    };

    try {
      await updateDiscipleProfileGlobal(cleanEmail, docId, { id: docId, ...updatedPayload });
      if (isAdmin && cleanEmail) {
        if (isMemberAdmin) {
          await grantAdminByEmail(cleanEmail, cleanName, docId);
        } else if (!ADMIN_EMAILS.includes(cleanEmail)) {
          await revokeAdminByEmail(cleanEmail, docId);
        }
      }
      if (
        currentUser &&
        (currentUser.id === docId ||
          (currentUser as any).uid === docId ||
          (cleanEmail && currentUser.email?.toLowerCase().trim() === cleanEmail))
      ) {
        localStorage.setItem('youngfire_auth_session', JSON.stringify({ id: docId, ...updatedPayload }));
        localStorage.setItem('youngfire_user_doc_id', docId);
        if (preservedAvatar) {
          localStorage.setItem('youngfire_user_avatar', preservedAvatar);
        }
      }
    } catch (err) {
      console.error('Error upserting disciple profile:', err);
    }

    let updatedList: RosterMember[];
    if (editingMemberId) {
      updatedList = members.map(m => m.id === editingMemberId ? memberPayload : m);
    } else {
      updatedList = [memberPayload, ...members];
    }

    setMembers(updatedList);
    saveRosterMemberToCloud(memberPayload).catch(() => {});
    try {
      localStorage.setItem('youngfire_member_roster_v2', JSON.stringify(updatedList));
      await fetch('/api/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberPayload)
      });
    } catch (err) {
      console.error('Error saving roster member:', err);
    }

    setSuccessMessage(editingMemberId ? 'Member details updated!' : 'Successfully registered in Fellowship Roster!');
    setTimeout(() => {
      setSuccessMessage('');
      setIsRegisterOpen(false);
    }, 1200);
  };

  const handleDeleteMember = async (id: string) => {
    if (!window.confirm('Remove this member from the fellowship roster?')) return;
    const updated = members.filter(m => m.id !== id);
    setMembers(updated);
    try {
      await deleteDoc(doc(db, 'sanctuary_disciples', id));
    } catch {}
    if (currentUser?.id === id || (currentUser as any)?.uid === id) {
      try {
        localStorage.removeItem('youngfire_auth_session');
        localStorage.removeItem('youngfire_user_doc_id');
        localStorage.removeItem('youngfire_user_avatar');
        sessionStorage.clear();
      } catch {}
    }
    deleteRosterMemberFromCloud(id).catch(() => {});
    try {
      localStorage.setItem('youngfire_member_roster_v2', JSON.stringify(updated));
      await fetch(`/api/roster/${id}`, { method: 'DELETE' });
    } catch {}
  };

  const filteredMembers = members.filter(m => {
    const matchesGroup = selectedGroup === 'All' || m.group === selectedGroup || m.group === 'All';
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (m.fullName || m.name || '').toLowerCase().includes(query) ||
      (m.calling || '').toLowerCase().includes(query) ||
      (m.role || '').toLowerCase().includes(query) ||
      (m.ministryRole || '').toLowerCase().includes(query) ||
      (m.residence || '').toLowerCase().includes(query) ||
      (m.email || '').toLowerCase().includes(query);

    const matchesRole = selectedRoleFilter === 'all' || (() => {
      if (selectedRoleFilter === 'administrator') {
        return m.isAdmin || m.accountType === 'administrator' || (m.role || '').toLowerCase().includes('admin');
      }
      const roleTarget = (m.ministryRole || m.role || '').toLowerCase();
      if (selectedRoleFilter === 'prayer_warrior') return roleTarget.includes('prayer');
      if (selectedRoleFilter === 'disciple') return roleTarget.includes('disciple');
      if (selectedRoleFilter === 'photographer') return roleTarget.includes('photo') || roleTarget.includes('media');
      if (selectedRoleFilter === 'event_facilitator') return roleTarget.includes('facilitat') || roleTarget.includes('event');
      if (selectedRoleFilter === 'worship_minister') return roleTarget.includes('worship') || roleTarget.includes('music');
      if (selectedRoleFilter === 'member') return roleTarget.includes('member');
      return true;
    })();

    return matchesGroup && matchesSearch && matchesRole;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-fadeIn">
      <div className="bg-[#0a0a0a] border border-amber-500/40 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header Bar */}
        <div className="bg-[#000000] px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black uppercase font-['Outfit'] text-white">
                  YoungFire Fellowship Roster
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {members.length} Disciples &amp; Admins
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                Joshua House of Worship &bull; Role &amp; Access Directory
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAddForm}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-mono font-bold flex items-center gap-1.5 shadow-md hover:opacity-90 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Register</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Group Filter Tabs */}
        <div className="px-5 py-2.5 bg-[#080E21] border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            <button
              onClick={() => setSelectedGroup('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                selectedGroup === 'All'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              <span>🌐 All Groups</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/30">
                {members.length}
              </span>
            </button>

            <button
              onClick={() => setSelectedGroup('YoungFire')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                selectedGroup === 'YoungFire'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md font-bold'
                  : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30'
              }`}
            >
              <span>🔥 YoungFire</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/30">
                {members.filter(m => m.group === 'YoungFire' || m.group === 'All').length}
              </span>
            </button>

            <button
              onClick={() => setSelectedGroup('Men On Fire')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                selectedGroup === 'Men On Fire'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-slate-950 shadow-md font-bold'
                  : 'bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 border border-orange-500/30'
              }`}
            >
              <span>⚔️ Men On Fire</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/30">
                {members.filter(m => m.group === 'Men On Fire' || m.group === 'All').length}
              </span>
            </button>

            <button
              onClick={() => setSelectedGroup('Women Ignited')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                selectedGroup === 'Women Ignited'
                  ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-slate-950 shadow-md font-bold'
                  : 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30'
              }`}
            >
              <span>👑 Women Ignited</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/30">
                {members.filter(m => m.group === 'Women Ignited' || m.group === 'All').length}
              </span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[180px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, role, calling..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#000000] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Secondary Role Filter Bar */}
        <div className="px-5 py-2 bg-[#060B1A] border-b border-white/10 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[10px] font-mono">
          <span className="text-slate-400 font-bold uppercase mr-1 flex-shrink-0">Role Filter:</span>
          {ROLE_FILTERS.map((rf) => (
            <button
              key={rf.id}
              onClick={() => setSelectedRoleFilter(rf.id)}
              className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                selectedRoleFilter === rf.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {rf.label}
            </button>
          ))}
        </div>

        {/* Modal Form for Registration / Editing */}
        {isRegisterOpen ? (
          <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="text-sm font-bold uppercase font-mono text-amber-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>{editingMemberId ? 'Edit Disciple & Role Record' : 'Register New Member / Administrator'}</span>
              </h4>
              <button
                onClick={() => setIsRegisterOpen(false)}
                className="text-xs font-mono text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            {successMessage && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-400 rounded-xl text-emerald-300 text-xs font-mono font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveMember} className="space-y-4">
              {/* Profile Picture / Disciple Cutout Upload (Mobile & Desktop) */}
              <div className="p-3.5 bg-[#000000] rounded-2xl border border-white/10 flex items-center gap-4">
                <label
                  className="relative w-16 h-16 rounded-2xl bg-[#151515] border border-amber-500/40 flex items-center justify-center font-bold text-amber-400 text-lg overflow-hidden shrink-0 cursor-pointer group"
                  title="Tap to upload photo from Mobile or Desktop"
                >
                  {newAvatarBase64 || existingAvatarUrl ? (
                    <img
                      src={newAvatarBase64 || existingAvatarUrl}
                      alt={fullName || 'Disciple'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{(fullName || 'YF').slice(0, 2).toUpperCase()}</span>
                  )}
                  <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-black/90 border border-amber-400 text-amber-400 flex items-center justify-center shadow">
                    <Camera className="w-2.5 h-2.5" />
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleRosterPhotoUpload}
                    className="sr-only"
                  />
                </label>

                <div className="flex-1 space-y-1.5">
                  <div className="text-[11px] font-mono text-slate-200 font-bold uppercase">
                    Profile Picture / 3D Cutout Photo
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="inline-flex px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 font-mono text-[10px] font-bold uppercase tracking-wider items-center gap-1.5 cursor-pointer transition-colors">
                      <Camera className="w-3.5 h-3.5" />
                      <span>
                        {isUploadingRosterPhoto
                          ? 'Optimizing Photo...'
                          : newAvatarBase64 || existingAvatarUrl
                          ? 'Change Profile Photo'
                          : 'Upload Profile Photo'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleRosterPhotoUpload}
                        className="sr-only"
                      />
                    </label>
                  </div>
                  <p className="text-[10px] font-mono text-slate-400">
                    Works on Mobile Camera, Photo Library &amp; Desktop File Picker
                  </p>
                </div>
              </div>

              {/* Account Type Selector (Member vs Administrator) */}
              <div className="p-3.5 bg-[#000000] rounded-2xl border border-white/10 space-y-2">
                <label className="text-[11px] font-mono text-slate-300 font-bold block">
                  Account Registration Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAccountType('member')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                      accountType === 'member'
                        ? 'bg-amber-500/20 border-amber-400 shadow-md ring-1 ring-amber-400 text-white'
                        : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold font-['Outfit']">YoungFire Member</div>
                      <div className="text-[9px] font-mono text-slate-400">Sanctuary Disciple Access</div>
                    </div>
                    {accountType === 'member' && <Check className="w-4 h-4 text-amber-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccountType('administrator')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                      accountType === 'administrator'
                        ? 'bg-gradient-to-r from-amber-600/30 to-orange-600/30 border-amber-400 shadow-md ring-1 ring-amber-400 text-white'
                        : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold font-['Outfit']">Administrator</div>
                      <div className="text-[9px] font-mono text-amber-300/80">Executive Leadership Controls</div>
                    </div>
                    {accountType === 'administrator' && <Check className="w-4 h-4 text-amber-400" />}
                  </button>
                </div>
              </div>

              {/* Select Ministry Role */}
              <div className="p-3.5 bg-[#000000] rounded-2xl border border-white/10 space-y-2">
                <label className="text-[11px] font-mono text-slate-300 font-bold block">
                  Ministry Role &amp; Calling *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {MINISTRY_ROLES.map((r) => {
                    const isSelected = selectedRoleId === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleRoleSelection(r.id)}
                        className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? `${r.badgeBg} ${r.borderColor} ring-1 ring-amber-400 shadow`
                            : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="text-[10px] font-mono font-bold text-white truncate">
                          {r.label}
                        </div>
                        <div className="text-[8px] text-slate-400 truncate mt-0.5">
                          {r.category}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jordan Matthews"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Group / Fellowship Space *</label>
                  <select
                    value={group}
                    onChange={(e) => setGroup(e.target.value as any)}
                    className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="YoungFire">🔥 YoungFire (18–35)</option>
                    <option value="Men On Fire">⚔️ Men On Fire</option>
                    <option value="Women Ignited">👑 Women Ignited</option>
                    <option value="All">🌐 All Fellowship Groups</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Calling &amp; Spiritual Focus</label>
                  <input
                    type="text"
                    placeholder="e.g. Prayer Watch, Worship, Media"
                    value={calling}
                    onChange={(e) => setCalling(e.target.value)}
                    className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="disciple@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="(210) 555-0199"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Birthday (MM-DD)</label>
                  <input
                    type="text"
                    placeholder="09-14"
                    maxLength={5}
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Prayer Watch &amp; Notes</label>
                <textarea
                  rows={2}
                  placeholder="Personal prayer focus or spiritual goals..."
                  value={prayerRequests}
                  onChange={(e) => setPrayerRequests(e.target.value)}
                  className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs font-mono cursor-pointer shadow-md"
                >
                  Save to Roster &rarr;
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Members Directory List */
          <div className="p-5 overflow-y-auto max-h-[70vh] space-y-3">
            {filteredMembers.length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-[#000000] border border-dashed border-white/15 space-y-3">
                <Users className="w-10 h-10 text-slate-500 mx-auto" />
                <h4 className="text-sm font-bold text-slate-300 font-mono">
                  No Disciples Found in Selected Filter
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No matching members for this filter criteria. Register new fellowship members or select another role filter!
                </p>
                <button
                  onClick={handleOpenAddForm}
                  className="mt-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-mono font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-md"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register First Member</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredMembers.map((m) => {
                  const isMen = m.group === 'Men On Fire';
                  const isWomen = m.group === 'Women Ignited';
                  const roleObj = getRoleByLabel(m.ministryRole || m.role);
                  const isAdministrator = m.isAdmin || m.accountType === 'administrator';
                  const isAuthorizedMember = Boolean(
                    isAdmin ||
                    (currentUser?.email &&
                      m.email &&
                      currentUser.email.toLowerCase().trim() === m.email.toLowerCase().trim())
                  );

                  return (
                    <div
                      key={m.id}
                      className="p-4 rounded-2xl bg-[#000000] border border-white/10 hover:border-amber-500/40 transition-all flex flex-col justify-between gap-3 shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          {isAuthorizedMember ? (
                            <label
                              onClick={(e) => e.stopPropagation()}
                              className="relative w-10 h-10 rounded-full bg-[#151515] border border-white/15 flex items-center justify-center font-bold text-amber-400 text-sm overflow-visible flex-shrink-0 cursor-pointer group"
                              title="Tap to upload or change profile photo"
                            >
                              {m.avatar ? (
                                <img src={m.avatar} alt={m.fullName || m.name} className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                (m.fullName || m.name || 'D').charAt(0)
                              )}
                              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-black border border-amber-400 text-amber-400 flex items-center justify-center shadow">
                                <Camera className="w-2.5 h-2.5" />
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleDirectDirectoryPhotoUpload(m, e)}
                                className="sr-only"
                              />
                            </label>
                          ) : (
                            <div className="relative w-10 h-10 rounded-full bg-[#151515] border border-white/15 flex items-center justify-center font-bold text-amber-400 text-sm overflow-hidden flex-shrink-0">
                              {m.avatar ? (
                                <img src={m.avatar} alt={m.fullName || m.name} className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                (m.fullName || m.name || 'D').charAt(0)
                              )}
                            </div>
                          )}
                          <div>
                            <h4 className="text-sm font-bold text-white font-['Outfit']">
                              {m.fullName || m.name}
                            </h4>
                            
                            {/* Badges: Account Type + Ministry Role */}
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                              {isAdministrator ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400 text-amber-300 font-bold uppercase">
                                  <ShieldAlert className="w-3 h-3 text-amber-400" />
                                  <span>Administrator</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#151515]/80 border border-white/10 text-slate-300">
                                  <Users className="w-3 h-3 text-slate-400" />
                                  <span>Member</span>
                                </span>
                              )}

                              <span className={`inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full border ${roleObj.badgeBg} ${roleObj.badgeText} ${roleObj.borderColor} font-bold`}>
                                <span>{roleObj.label}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {isAdmin && !((m.fullName || m.name || '').toLowerCase().includes('trent') || (m.fullName || m.name || '').toLowerCase().includes('whitney')) && (
                            <button
                              type="button"
                              onClick={() => handleToggleMemberAdmin(m)}
                              className={`px-2 py-1 rounded-lg text-[9px] font-mono font-bold uppercase cursor-pointer border transition-colors ${
                                isAdministrator
                                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 hover:bg-amber-500/30'
                                  : 'bg-white/5 border-white/15 text-slate-300 hover:border-amber-400 hover:text-amber-300'
                              }`}
                              title={isAdministrator ? 'Revoke Administrator Access' : 'Promote Member to Administrator'}
                            >
                              {isAdministrator ? '★ Admin' : '+ Make Admin'}
                            </button>
                          )}
                          {isAuthorizedMember && (
                            <button
                              onClick={() => handleEditMember(m)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-white/5 cursor-pointer"
                              title="Edit Profile"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isAdmin && !((m.fullName || m.name || '').toLowerCase().includes('trent') || (m.fullName || m.name || '').toLowerCase().includes('whitney')) && (
                            <button
                              onClick={() => handleDeleteMember(m.id)}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-300 font-mono pt-2 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">Calling:</span>
                          <span className="text-white font-semibold truncate">{m.calling || roleObj.defaultCalling}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">Group:</span>
                          <span className="text-amber-300 font-semibold">{m.group}</span>
                        </div>
                        {m.email && (
                          <div className="flex items-center gap-2 truncate">
                            <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <a href={`mailto:${m.email}`} className="text-cyan-400 hover:underline truncate">
                              {m.email}
                            </a>
                          </div>
                        )}
                        {m.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span>{m.phone}</span>
                          </div>
                        )}
                        {m.birthday && (
                          <div className="flex items-center gap-2 text-amber-300 font-bold">
                            <span>🎂 Birthday:</span>
                            <span>{m.birthday}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer Info */}
        <div className="px-5 py-3 bg-[#060B1A] border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Joshua House of Worship &bull; YoungFire Ministry</span>
          <span>Ephesians 4:16 &bull; Rebuilding Better Together</span>
        </div>

      </div>
    </div>
  );
};
