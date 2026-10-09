import React from 'react';
import { AuthSecurityPortal } from './AuthSecurityPortal';
import { CurrentUser } from './SettingsHUDModal';
import { getProfileDocId, upsertDiscipleProfile } from '../services/profileService';

interface RegisterDiscipleModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onAuthenticated: (user: CurrentUser) => void;
  initialMode?: 'signin' | 'register' | 'forgot' | 'google';
}

export const RegisterDiscipleModal: React.FC<RegisterDiscipleModalProps> = ({
  isOpen = true,
  onClose,
  onAuthenticated,
  initialMode = 'register'
}) => {
  if (!isOpen) return null;

  const handleAuthenticated = async (user: CurrentUser) => {
    try {
      if (user.email) {
        const docId = await upsertDiscipleProfile({
          email: user.email,
          name: user.name || 'Sanctuary Disciple',
          uid: getProfileDocId(user.email, user.id),
          role: user.role || 'YoungFire Member',
          calling: user.calling || 'Member',
          gender: user.gender === 'female' || user.gender === 'sister' ? 'sister' : 'brother',
          avatarUrl: (user as any).avatarUrl !== undefined ? (user as any).avatarUrl : (user.avatar || '')
        });
        user = { ...user, id: docId };
      }
    } catch (err) {
      console.warn('RegisterDiscipleModal profile upsert warning:', err);
    }
    onAuthenticated(user);
  };

  return (
    <AuthSecurityPortal
      initialMode={initialMode}
      onAuthenticated={handleAuthenticated}
      onBackToWelcome={onClose}
    />
  );
};

export default RegisterDiscipleModal;
