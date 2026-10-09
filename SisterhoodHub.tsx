import React, { useState, useEffect } from 'react';
import { Camera } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { deduplicateSanctuaryDisciples, getProfileDocId, upsertDiscipleProfile } from '../services/profileService';
import { DiscipleCutoutCard } from './DiscipleCutoutCard';
import { CurrentUser } from './SettingsHUDModal';
import { WomenIgnitedHub } from './WomenIgnitedHub';
import { compressImageFile } from '../utils/imageUtils';
import {
  formatChatTimestamp,
  toggleChatReaction,
  checkHubAccess,
  CohortAccessLockView
} from './ChatMessageItem';

interface SisterhoodHubProps {
  onBack?: () => void;
  currentUser?: CurrentUser | null;
  onNavigateToScripture?: (bookId: string, chapter: number) => void;
}

export const SisterhoodHub: React.FC<SisterhoodHubProps> = ({
  onBack,
  currentUser,
  onNavigateToScripture
}) => {
  const [sisterhoodRoster, setSisterhoodRoster] = useState<any[]>([]);
  const [sisterhoodMessages, setSisterhoodMessages] = useState<any[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    const chatRef = collection(db, 'sanctuary_sisterhood_chat');
    const q = query(chatRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const messages = snapshot.docs.map(docSnap => {
        const data = docSnap.data({ serverTimestamps: 'estimate' }) as any;
        return {
          id: docSnap.id,
          ...data,
          formattedTimestamp: formatChatTimestamp(data.createdAt || data.timestamp)
        };
      });
      setSisterhoodMessages(messages);
    }, (err) => {
      console.warn("Sisterhood chat listener notice:", err?.message || err);
    });

    return () => unsubscribe();
  }, []);

  const handleUploadSelfPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !currentUser) return;
    setIsUploadingPhoto(true);
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
    } catch (err) {
      console.error('Error uploading Sisterhood profile photo:', err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  useEffect(() => {
    deduplicateSanctuaryDisciples().catch(() => {});
    const disciplesRef = collection(db, 'sanctuary_disciples');
    // Order by latest activity, and filter/deduplicate in memory
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
      console.warn("Sisterhood roster sync notice:", err?.message || err);
    });

    return () => unsubscribe();
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="font-mono text-xs uppercase tracking-wider text-slate-200">
          SISTERHOOD ROSTER ({sisterhoodRoster.length})
        </div>
        {currentUser && !currentUser.isGuest && (
          <label className="px-3 py-1 rounded-xl bg-black/80 hover:bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors">
            <Camera className="w-3.5 h-3.5" />
            <span>{isUploadingPhoto ? 'Uploading...' : 'Upload My Photo'}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleUploadSelfPhoto}
              className="sr-only"
            />
          </label>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 justify-items-center">
        {sisterhoodRoster.map((member) => {
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
      <WomenIgnitedHub
        onBack={onBack}
        currentUser={currentUser}
        onNavigateToScripture={onNavigateToScripture}
      />
    </div>
  );
};

export default SisterhoodHub;
