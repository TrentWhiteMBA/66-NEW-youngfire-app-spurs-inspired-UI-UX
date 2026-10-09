import React, { useState, useEffect, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { CurrentUser, SettingsHUDModal } from './SettingsHUDModal';
import { getProfileDocId } from '../services/profileService';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CurrentUser | null;
  setCurrentUser?: React.Dispatch<React.SetStateAction<any>>;
  onUpdateUser?: (updated: CurrentUser) => void;
  [key: string]: any;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  setCurrentUser,
  onUpdateUser,
  ...rest
}) => {
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    calling: currentUser?.calling || 'Member',
    gender: (currentUser?.gender === 'sister' || currentUser?.gender === 'female' ? 'sister' : 'brother') as 'brother' | 'sister',
    role: currentUser?.role || 'YoungFire Member'
  });
  const [newAvatarBase64, setNewAvatarBase64] = useState('');
  const existingAvatarUrl =
    (currentUser as any)?.avatarUrl ||
    currentUser?.avatar ||
    (typeof window !== 'undefined' ? localStorage.getItem('youngfire_user_avatar') || '' : '');

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        calling: currentUser.calling || 'Member',
        gender: currentUser.gender === 'sister' || currentUser.gender === 'female' ? 'sister' : 'brother',
        role: currentUser.role || 'YoungFire Member'
      });
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const handleSaveProfile = async (updatedUser?: CurrentUser) => {
    const targetUser = updatedUser || currentUser;
    if (!targetUser) return;

    const resolvedAvatar =
      newAvatarBase64 ||
      (updatedUser as any)?.avatarUrl ||
      updatedUser?.avatar ||
      existingAvatarUrl ||
      '';

    const resolvedGender: 'brother' | 'sister' =
      (updatedUser?.gender || formData.gender) === 'sister' || (updatedUser?.gender || formData.gender) === 'female'
        ? 'sister'
        : 'brother';

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
      ADMIN_EMAILS.includes(currentUser?.email?.toLowerCase()?.trim() || '');

    const updatedPayload = {
      name: (updatedUser?.name || formData.name || 'Sanctuary Disciple').trim(),
      email: (updatedUser?.email || formData.email || '').toLowerCase().trim(),
      calling: updatedUser?.calling || formData.calling || 'Member',
      gender: resolvedGender, // strictly 'brother' or 'sister'
      role: isAdmin
        ? (updatedUser?.role || formData.role || 'YoungFire Member')
        : (currentUser?.role || 'YoungFire Member'),
      avatarUrl: resolvedAvatar, // NEVER overwrite with undefined
      updatedAt: Date.now()
    };

    const docId = getProfileDocId(updatedPayload.email, (currentUser as any)?.uid || currentUser?.id);
    await setDoc(doc(db, 'sanctuary_disciples', docId), updatedPayload, { merge: true });

    try {
      localStorage.setItem('youngfire_auth_session', JSON.stringify({ id: docId, ...updatedPayload }));
      localStorage.setItem('youngfire_user_doc_id', docId);
      if (updatedPayload.avatarUrl) {
        localStorage.setItem('youngfire_user_avatar', updatedPayload.avatarUrl);
      }
    } catch {}

    if (setCurrentUser) {
      setCurrentUser((prev: any) => ({ ...prev, ...updatedPayload }));
    }

    if (onUpdateUser) {
      onUpdateUser({
        ...targetUser,
        id: docId,
        ...updatedPayload,
        fullName: updatedPayload.name,
        avatar: updatedPayload.avatarUrl
      });
    }
  };

  return (
    <SettingsHUDModal
      isOpen={isOpen}
      onClose={onClose}
      currentUser={currentUser}
      onUpdateUser={(u) => {
        handleSaveProfile(u).catch(() => {});
      }}
      {...rest}
    />
  );
};

export default UserProfileModal;
