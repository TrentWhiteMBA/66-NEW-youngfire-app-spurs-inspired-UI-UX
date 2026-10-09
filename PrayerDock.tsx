import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Flame, Plus, Check, Trash2, Heart, 
  Sparkles, Users, UserCheck, ShieldCheck, CheckCircle2, Edit3 
} from 'lucide-react';
import { CurrentUser } from './SettingsHUDModal';
import confetti from 'canvas-confetti';
import {
  recordPrayerIntercession,
  savePrayerToCloud,
  deletePrayerFromCloud
} from '../services/firebaseSyncService';
import { db } from '../services/firebase';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import {
  PrayerSubmission,
  submitSanctuaryPrayer,
  subscribeToSanctuaryPrayers
} from '../services/prayerService';
import { PrayerRequestModal } from './PrayerRequestModal';

export interface PrayedUser {
  id: string;
  name: string;
  avatarUrl: string;
}

export interface PrayerItem {
  id: string;
  date: string;
  names: string[] | string;
  cause: string;
  status: string;
  completed?: boolean;
  authorId?: string;
  authorName?: string;
  authorPhotoUrl?: string;
  contactChannel?: string;
  wantsFollowUp?: boolean;
  isGuest?: boolean;
  intercessorsCount?: number;
  intercessors?: string[];
  prayedBy?: string[];
  prayedByUsers?: PrayedUser[];
}

export interface PrayerDockProps {
  onBack?: () => void;
  currentUser?: CurrentUser | null;
  onOpenPrayerModal?: () => void;
}

const INITIAL_PRAYERS: PrayerItem[] = [];

const getDeletedPrayerIds = (): string[] => {
  try {
    const saved = localStorage.getItem('youngfire_deleted_prayer_ids');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const recordDeletedPrayerId = (id: string) => {
  try {
    const list = getDeletedPrayerIds();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem('youngfire_deleted_prayer_ids', JSON.stringify(list));
    }
  } catch {}
};

export const PrayerDock: React.FC<PrayerDockProps> = ({ onBack, currentUser, onOpenPrayerModal }) => {
  const [prayers, setPrayers] = useState<PrayerItem[]>(() => {
    try {
      const deletedIds = new Set(getDeletedPrayerIds());
      const saved = localStorage.getItem('youngfire_prayer_dock_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Remove any mock prayers and persistently deleted prayers
          return parsed.filter(p => p.id !== 'pr_1' && p.id !== 'pr_2' && p.id !== 'pr_3' && !deletedIds.has(p.id));
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const [prayerFilter, setPrayerFilter] = useState<'all' | 'active' | 'answered'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCause, setNewCause] = useState('');
  const [deleteToast, setDeleteToast] = useState<string | null>(null);

  // Editing Prayer State
  const [editingPrayer, setEditingPrayer] = useState<PrayerItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editCause, setEditCause] = useState('');

  // Save to localStorage and state
  const savePrayers = (updated: PrayerItem[]) => {
    setPrayers(updated);
    try {
      localStorage.setItem('youngfire_prayer_dock_v2', JSON.stringify(updated));
      localStorage.setItem('youngfire_prayers_list', JSON.stringify(updated));
      localStorage.setItem('youngfire_prayers_v2', JSON.stringify(updated));
    } catch {}
  };

  const handleStartEditPrayer = (prayer: PrayerItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPrayer(prayer);
    setEditName(Array.isArray(prayer.names) ? prayer.names.join(', ') : prayer.names);
    setEditCause(prayer.cause);
  };

  const handleSaveEditPrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrayer || !editCause.trim()) return;

    const updated = prayers.map(p => {
      if (p.id !== editingPrayer.id) return p;
      return {
        ...p,
        names: editName.trim() || 'Fellowship Intercession',
        cause: editCause.trim()
      };
    });

    savePrayers(updated);
    setEditingPrayer(null);

    try {
      await fetch(`/api/prayers/${editingPrayer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          names: editName.trim(),
          cause: editCause.trim()
        })
      });
    } catch {}
  };

  // Sync with backend API and real-time Firebase prayer wall listener
  useEffect(() => {
    const deletedIds = new Set(getDeletedPrayerIds());
    fetch('/api/prayers')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.prayers) && data.prayers.length > 0) {
          // Merge server prayers with local additions, strictly ignoring deleted prayers
          setPrayers(prev => {
            const map = new Map<string, PrayerItem>();
            prev.forEach(p => {
              if (!deletedIds.has(p.id)) map.set(p.id, p);
            });
            data.prayers.forEach((sp: any) => {
              if (deletedIds.has(sp.id)) return; // Never resurrect deleted prayers
              const existing = map.get(sp.id);
              if (existing) {
                map.set(sp.id, {
                  ...existing,
                  cause: sp.cause || existing.cause,
                  names: sp.names || existing.names,
                  status: sp.status || existing.status,
                  completed: sp.status === 'answered' || existing.completed,
                  intercessorsCount: sp.prayedCount || existing.intercessorsCount
                });
              } else {
                map.set(sp.id, {
                  id: sp.id,
                  date: sp.date || new Date().toISOString().split('T')[0],
                  names: sp.names || sp.requestedBy || 'Prayer Intercession',
                  cause: sp.cause || sp.description || '',
                  status: sp.status || 'active',
                  completed: sp.status === 'answered',
                  authorId: sp.authorId,
                  authorName: sp.requestedBy || sp.authorName || 'Fellow Disciple',
                  intercessorsCount: sp.prayedCount || 1,
                  prayedByUsers: []
                });
              }
            });
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {});

    // Real-time listener for Firestore prayer_wall updates across devices
    const handlePrayerWallLive = (e: any) => {
      const livePrayers = e?.detail?.prayers;
      const currentDeleted = new Set(getDeletedPrayerIds());
      if (Array.isArray(livePrayers) && livePrayers.length > 0) {
        setPrayers(prev => {
          const map = new Map<string, PrayerItem>();
          prev.forEach(p => {
            if (!currentDeleted.has(p.id)) map.set(p.id, p);
          });
          livePrayers.forEach((lp: any) => {
            if (currentDeleted.has(lp.id)) return; // Ignore deleted prayers
            const existing = map.get(lp.id);
            map.set(lp.id, {
              ...(existing || {}),
              ...lp,
              id: lp.id,
              names: lp.names || existing?.names || 'Sanctuary Prayer',
              cause: lp.cause || existing?.cause || '',
              status: lp.status || existing?.status || 'active',
              prayedByUsers: lp.prayedByUsers || existing?.prayedByUsers || []
            });
          });
          return Array.from(map.values());
        });
      }
    };

    window.addEventListener('prayer_wall_updated', handlePrayerWallLive);

    // Unified Firestore 'prayers' collection listener
    let unsubFirestorePrayers: (() => void) | undefined;
    try {
      const q = query(collection(db, 'prayers'), orderBy('timestamp', 'desc'));
      unsubFirestorePrayers = onSnapshot(q, (snapshot) => {
        const currentDeleted = new Set(getDeletedPrayerIds());
        const cloudDocs: PrayerItem[] = [];
        snapshot.docs.forEach((docSnap) => {
          const d = docSnap.data();
          const pid = d.id || docSnap.id;
          if (currentDeleted.has(pid) || currentDeleted.has(docSnap.id)) return;
          cloudDocs.push({
            id: pid,
            date: d.date || (d.clientTimestamp ? new Date(d.clientTimestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
            names: d.names || d.authorName || 'Sanctuary Prayer',
            cause: d.cause || d.request || d.text || '',
            status: d.status || 'active',
            completed: d.status === 'answered' || Boolean(d.completed),
            authorId: d.authorId || 'guest-disciple',
            authorName: d.authorName || (Array.isArray(d.names) ? d.names.join(', ') : d.names) || 'Sanctuary Disciple',
            authorPhotoUrl: d.authorPhotoUrl || undefined,
            contactChannel: d.contactChannel || undefined,
            wantsFollowUp: Boolean(d.wantsFollowUp),
            isGuest: Boolean(d.isGuest),
            intercessorsCount: d.intercessorsCount || (Array.isArray(d.prayedByUsers) ? d.prayedByUsers.length : 1),
            prayedBy: Array.isArray(d.prayedBy) ? d.prayedBy : [],
            prayedByUsers: Array.isArray(d.prayedByUsers) ? d.prayedByUsers : []
          });
        });
        if (cloudDocs.length > 0) {
          setPrayers(prev => {
            const map = new Map<string, PrayerItem>();
            cloudDocs.forEach(cp => map.set(cp.id, cp));
            prev.forEach(p => {
              if (!currentDeleted.has(p.id) && !map.has(p.id)) {
                map.set(p.id, p);
              }
            });
            return Array.from(map.values());
          });
        }
      });
    } catch (err) {
      console.warn('PrayerDock Firestore listener warning:', err);
    }

    // Also subscribe to 'sanctuary_prayers' collection
    const unsubSanctuaryPrayers = subscribeToSanctuaryPrayers((submissions) => {
      const currentDeleted = new Set(getDeletedPrayerIds());
      if (submissions.length > 0) {
        setPrayers((prev) => {
          const map = new Map<string, PrayerItem>();
          prev.forEach((p) => {
            if (!currentDeleted.has(p.id)) map.set(p.id, p);
          });
          submissions.forEach((sub) => {
            const pid = sub.id || `prayer_${sub.authorName}`;
            if (currentDeleted.has(pid)) return;
            const existing = map.get(pid);
            map.set(pid, {
              ...(existing || {}),
              id: pid,
              date: existing?.date || new Date().toISOString().split('T')[0],
              names: sub.authorName,
              cause: sub.requestText,
              status: existing?.status || 'active',
              completed: existing?.completed || false,
              authorId: sub.isGuest ? 'guest-disciple' : existing?.authorId || 'sanctuary-disciple',
              authorName: sub.authorName,
              authorPhotoUrl: sub.authorPhotoUrl,
              contactChannel: sub.contactChannel,
              wantsFollowUp: sub.wantsFollowUp,
              isGuest: sub.isGuest,
              intercessorsCount: existing?.intercessorsCount || 1,
              prayedBy: existing?.prayedBy || [],
              prayedByUsers: existing?.prayedByUsers || []
            });
          });
          return Array.from(map.values());
        });
      }
    });

    const handlePrayerSubmittedEvent = (e: any) => {
      const submittedItem = e?.detail?.item;
      if (submittedItem && submittedItem.id) {
        setPrayers((prev) => {
          const exists = prev.some((p) => p.id === submittedItem.id);
          return exists ? prev : [submittedItem, ...prev];
        });
      }
    };
    window.addEventListener('yf_prayer_submitted', handlePrayerSubmittedEvent);

    return () => {
      window.removeEventListener('prayer_wall_updated', handlePrayerWallLive);
      window.removeEventListener('yf_prayer_submitted', handlePrayerSubmittedEvent);
      if (unsubFirestorePrayers) unsubFirestorePrayers();
      if (unsubSanctuaryPrayers) unsubSanctuaryPrayers();
    };
  }, []);

  const getActiveOrGuestIdentity = () => {
    if (currentUser && currentUser.id && currentUser.id !== 'roster_lead_trent') {
      return {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar || (currentUser as any)?.avatarUrl || ''
      };
    }
    if (currentUser && currentUser.id === 'roster_lead_trent' && (currentUser.email || '').toLowerCase() === 'trentwhite0308@gmail.com') {
      return {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar || '/IMG_3524.jpg'
      };
    }
    let guestHandle = localStorage.getItem('yf_guest_handle');
    let guestId = localStorage.getItem('yf_guest_id');
    if (!guestHandle || !guestId) {
      const code = Math.floor(1000 + Math.random() * 9000);
      guestHandle = `Disciple Guest #${code}`;
      guestId = `guest_disciple_${code}`;
      try {
        localStorage.setItem('yf_guest_handle', guestHandle);
        localStorage.setItem('yf_guest_id', guestId);
      } catch {}
    }
    return {
      id: guestId,
      name: guestHandle,
      avatar: ''
    };
  };

  const handleAddPrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCause.trim()) return;

    const identity = getActiveOrGuestIdentity();
    const userAvatar = identity.avatar;
    const userName = identity.name;
    const userId = identity.id;

    const newPrayer: PrayerItem = {
      id: `prayer_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      names: newName.trim() || userName,
      cause: newCause.trim(),
      status: 'active',
      completed: false,
      authorId: userId,
      authorName: userName,
      prayedBy: [userId],
      prayedByUsers: [
        { id: userId, name: userName, avatarUrl: userAvatar }
      ]
    };

    savePrayers([newPrayer, ...prayers]);
    setNewName('');
    setNewCause('');
    setIsModalOpen(false);

    // Sync to unified Firestore 'prayers' collection
    try {
      await addDoc(collection(db, 'prayers'), {
        ...newPrayer,
        request: newPrayer.cause,
        text: newPrayer.cause,
        timestamp: serverTimestamp(),
        clientTimestamp: Date.now()
      });
    } catch (err) {
      console.error('Error writing prayer to Firestore prayers collection:', err);
    }

    // Legacy cloud & API sync
    savePrayerToCloud(newPrayer).catch(() => {});

    try {
      await fetch('/api/prayers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newPrayer.id,
          requestedBy: userName,
          names: newPrayer.names,
          cause: newPrayer.cause,
          status: 'active'
        })
      });
    } catch {}
  };

  // "I Prayed For This" action
  const handleIPrayed = async (prayerId: string) => {
    const userId = currentUser?.id || 'current_user';
    const userName = currentUser?.name || 'Fellowship Intercessor';
    const userAvatar = currentUser?.avatar || (currentUser as any)?.avatarUrl || '/image_4.png';

    const updated = prayers.map(p => {
      if (p.id !== prayerId) return p;
      const currentList: PrayedUser[] = p.prayedByUsers || [];
      const alreadyPrayed = currentList.some(u => u.id === userId);

      let updatedList: PrayedUser[];
      if (alreadyPrayed) {
        // Toggle off if already prayed
        updatedList = currentList.filter(u => u.id !== userId);
      } else {
        // Append user to intercessors list
        updatedList = [...currentList, { id: userId, name: userName, avatarUrl: userAvatar }];
      }

      return {
        ...p,
        prayedByUsers: updatedList,
        prayedBy: updatedList.map(u => u.id)
      };
    });

    savePrayers(updated);

    // Real-time Firestore sync with arrayUnion
    recordPrayerIntercession(prayerId, {
      id: userId,
      name: userName,
      avatarUrl: userAvatar
    }).catch(() => {});

    // Minor celebratory micro-confetti on interceding
    try {
      confetti({
        particleCount: 25,
        spread: 45,
        origin: { y: 0.7 }
      });
    } catch {}
  };

  const handleToggleAnswered = (prayerId: string) => {
    const updated = prayers.map(p => {
      if (p.id !== prayerId) return p;
      const willBeCompleted = !p.completed;
      if (willBeCompleted) {
        try {
          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: 0.6 }
          });
        } catch {}
      }
      return {
        ...p,
        completed: willBeCompleted,
        status: willBeCompleted ? 'answered' : 'active'
      };
    });
    savePrayers(updated);
  };

  // Permanent Delete: open to disciples and administrators whether logged in or logged off
  const handleDeletePrayer = async (prayerId: string) => {
    recordDeletedPrayerId(prayerId);
    const updated = prayers.filter(p => p.id !== prayerId);
    savePrayers(updated);
    deletePrayerFromCloud(prayerId).catch(() => {});
    try {
      await fetch(`/api/prayers/${prayerId}`, { method: 'DELETE' });
    } catch {}
    setDeleteToast('Prayer request permanently deleted from dock');
    setTimeout(() => setDeleteToast(null), 3000);
  };

  const filtered = prayers.filter(p => {
    if (prayerFilter === 'active') return !p.completed;
    if (prayerFilter === 'answered') return p.completed;
    return true;
  });

  return (
    <div className="space-y-6 select-none">
      {/* Delete Feedback Toast */}
      {deleteToast && (
        <div className="p-3 bg-rose-500/20 border border-rose-400/50 rounded-2xl flex items-center justify-between gap-2 text-rose-300 text-xs font-mono font-bold animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>{deleteToast}</span>
          </div>
          <button 
            onClick={() => setDeleteToast(null)} 
            className="text-slate-400 hover:text-white text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

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
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
              24/7 Intercession Watch & Praise Altar
            </span>
            <h2 className="text-xl sm:text-2xl font-black font-['Outfit'] uppercase text-white tracking-wide">
              The Prayer Dock
            </h2>
          </div>
        </div>

        <button
          onClick={() => {
            if (onOpenPrayerModal) {
              onOpenPrayerModal();
            } else {
              setIsModalOpen(true);
            }
          }}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-2 shadow-lg shadow-emerald-500/20 self-start sm:self-auto cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Submit Prayer Request</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs font-mono">
        <button
          onClick={() => setPrayerFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer font-bold ${
            prayerFilter === 'all'
              ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
              : 'bg-[#0a0a0a] text-slate-300 border-white/10 hover:border-white/25'
          }`}
        >
          All Prayers ({prayers.length})
        </button>
        <button
          onClick={() => setPrayerFilter('active')}
          className={`px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer font-bold ${
            prayerFilter === 'active'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
              : 'bg-[#0a0a0a] text-slate-300 border-white/10 hover:border-white/25'
          }`}
        >
          Active Intercession ({prayers.filter(p => !p.completed).length})
        </button>
        <button
          onClick={() => setPrayerFilter('answered')}
          className={`px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer font-bold ${
            prayerFilter === 'answered'
              ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
              : 'bg-[#0a0a0a] text-slate-300 border-white/10 hover:border-white/25'
          }`}
        >
          Answered Praises ({prayers.filter(p => p.completed).length})
        </button>
      </div>

      {/* Guest & Disciple Prayer Submission Modal */}
      <PrayerRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultName={
          currentUser && !currentUser.isGuest && !String(currentUser.id || '').startsWith('guest_')
            ? currentUser.name || ''
            : ''
        }
        authorPhotoUrl={
          currentUser && !currentUser.isGuest
            ? currentUser.avatar || (currentUser as any)?.avatarUrl || undefined
            : undefined
        }
        isGuest={Boolean(
          !currentUser ||
            currentUser.isGuest ||
            (currentUser as any)?.accountType === 'guest' ||
            String(currentUser.id || '').startsWith('guest_')
        )}
        onSubmitted={(submission: PrayerSubmission) => {
          const identity = getActiveOrGuestIdentity();
          const newPrayer: PrayerItem = {
            id: submission.id || `prayer_${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            names: submission.authorName,
            cause: submission.requestText,
            status: 'active',
            completed: false,
            authorId: identity.id,
            authorName: submission.authorName,
            authorPhotoUrl: submission.authorPhotoUrl,
            contactChannel: submission.contactChannel,
            wantsFollowUp: submission.wantsFollowUp,
            isGuest: submission.isGuest,
            prayedBy: [identity.id],
            prayedByUsers: [
              {
                id: identity.id,
                name: submission.authorName,
                avatarUrl: submission.authorPhotoUrl || identity.avatar
              }
            ]
          };
          savePrayers([newPrayer, ...prayers]);
          savePrayerToCloud(newPrayer).catch(() => {});
        }}
      />

      {/* Editing Modal */}
      {editingPrayer && (
        <form onSubmit={handleSaveEditPrayer} className="p-5 bg-[#0a0a0a] border border-amber-500/40 rounded-3xl space-y-3 shadow-2xl animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h4 className="text-xs font-bold font-mono uppercase text-amber-400 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-amber-400" />
              <span>Edit Prayer Request / Burden</span>
            </h4>
            <span className="text-[10px] font-mono text-slate-400">Save Updates</span>
          </div>

          <input
            type="text"
            placeholder="Name of Believer / Family in Need"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full bg-[#000000] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />

          <textarea
            placeholder="Prayer request details..."
            value={editCause}
            onChange={(e) => setEditCause(e.target.value)}
            rows={3}
            className="w-full bg-[#000000] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            required
          />

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditingPrayer(null)}
              className="px-3.5 py-1.5 bg-white/10 hover:bg-white/15 text-slate-300 rounded-xl text-xs font-mono cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs font-mono cursor-pointer shadow-md"
            >
              Save Changes
            </button>
          </div>
        </form>
      )}

      {/* Prayers List */}
      <div className="space-y-3.5">
        {filtered.length === 0 ? (
          <div className="p-8 bg-[#0a0a0a] border border-white/10 rounded-3xl text-center space-y-3">
            <Flame className="w-8 h-8 text-emerald-400 mx-auto opacity-70" />
            <h5 className="text-sm font-bold text-white font-['Outfit']">Prayer Dock Clean Slate</h5>
            <p className="text-xs text-slate-300 font-serif max-w-sm mx-auto">
              No requests in this filter. Tap <strong>Submit Prayer Request</strong> to bring a need before the body!
            </p>
          </div>
        ) : (
          filtered.map((prayer) => {
            const intercessors = (prayer.prayedByUsers && prayer.prayedByUsers.length > 0)
              ? prayer.prayedByUsers
              : (prayer.intercessorsCount || (prayer as any).prayedCount)
                ? [{ id: 'intercessor_1', name: 'Fellowship Intercessor', avatarUrl: '/image_4.png' }]
                : [];
            const userHasPrayed = intercessors.some(u => u.id === (currentUser?.id || 'current_user'));
            const intercessorCount = Math.max(intercessors.length, prayer.intercessorsCount || 0, (prayer as any).prayedCount || 0);

            return (
              <div 
                key={prayer.id}
                className={`p-4 sm:p-5 rounded-3xl border transition-all space-y-3 ${
                  prayer.completed
                    ? 'bg-emerald-950/25 border-emerald-500/50 shadow-lg'
                    : 'bg-[#0a0a0a] border-white/10 hover:border-emerald-500/30'
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Author Photo or Fallback Flame Emblem */}
                    {prayer.authorPhotoUrl ? (
                      <img
                        src={prayer.authorPhotoUrl}
                        alt={prayer.authorName || 'Intercessor'}
                        className="w-9 h-9 rounded-full object-cover border border-amber-500/40 shrink-0 mt-0.5"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <Flame className="w-4 h-4 text-amber-400 fill-amber-400/30" />
                      </div>
                    )}

                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-black uppercase text-white font-['Outfit']">
                          {Array.isArray(prayer.names) ? prayer.names.join(', ') : prayer.names}
                        </h4>
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                          prayer.completed
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}>
                          {prayer.completed ? 'Answered Praise ✨' : 'Active Intercession 🔥'}
                        </span>
                        {prayer.wantsFollowUp && (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                            Follow-Up Requested
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-slate-200 font-serif leading-relaxed pt-0.5">
                        {prayer.cause}
                      </p>

                      {prayer.wantsFollowUp && prayer.contactChannel && (
                        <div className="pt-1">
                          <span className="inline-block text-[10px] font-mono px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200">
                            Leadership Follow-Up Contact: {prayer.contactChannel}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 pt-1">
                        <span>Posted by {prayer.authorName || 'Disciple'}</span>
                        <span>&bull;</span>
                        <span>{prayer.date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Mark Answered Button */}
                    <button
                      onClick={() => handleToggleAnswered(prayer.id)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1 text-xs font-mono font-bold ${
                        prayer.completed
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      }`}
                      title={prayer.completed ? 'Mark as active' : 'Mark as answered praise!'}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span className="hidden sm:inline">
                        {prayer.completed ? 'Answered' : 'Check Answered'}
                      </span>
                    </button>

                    {(() => {
                      const currentUserId = (currentUser as any)?.id || (currentUser as any)?.uid || currentUser?.email || localStorage.getItem('youngfire_user_email') || '';
                      const isAuthor = Boolean(
                        (currentUserId && prayer.authorId && prayer.authorId === currentUserId) ||
                        (currentUser?.name && prayer.authorName && currentUser.name.trim().toLowerCase() === prayer.authorName.trim().toLowerCase())
                      );
                      const isLeadAdmin = Boolean(
                        currentUser?.isAdmin ||
                        (currentUser as any)?.accountType === 'administrator' ||
                        (currentUser as any)?.role === 'Administrator' ||
                        (currentUser as any)?.role === 'Lead Facilitator' ||
                        (currentUser as any)?.role === 'Overseer' ||
                        (currentUser?.email && ['trentwhite0308@gmail.com', 'trentwhitemba@yahoo.com', 'white.whitney91@gmail.com', 'luislopez567@hotmail.com'].includes(currentUser.email.toLowerCase().trim()))
                      );
                      return (
                        <>
                          {/* Edit prayer button (Author only) */}
                          {isAuthor && (
                            <button
                              onClick={(e) => {
                                if (!isAuthor) return;
                                handleStartEditPrayer(prayer, e);
                              }}
                              className="p-2 rounded-xl text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 cursor-pointer transition-colors"
                              title="Edit prayer request"
                              aria-label="Edit prayer request"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete prayer button (Author or Lead Admin only) */}
                          {(isAuthor || isLeadAdmin) && (
                            <button
                              onClick={() => {
                                if (!isAuthor && !isLeadAdmin) return;
                                handleDeletePrayer(prayer.id);
                              }}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                              title="Permanently remove prayer request from dock"
                              aria-label="Delete prayer request"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* MODULE 4 REQUIREMENT: INTERACTIVE "I PRAYED" ENGINE & AVATARS STACK */}
                <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Avatar Stack + Live Count */}
                  <div className="flex items-center gap-2.5">
                    {intercessorCount > 0 ? (
                      <div className="flex -space-x-2 overflow-hidden">
                        {intercessors.slice(0, 5).map((user, idx) => (
                          <img
                            key={`${user.id}_${idx}`}
                            src={user.avatarUrl || '/image_4.png'}
                            alt={user.name}
                            title={`Intercessor: ${user.name}`}
                            className="inline-block w-6 h-6 rounded-full ring-2 ring-[#0a0a0a] object-cover bg-[#151515]"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[#151515] border border-white/10 flex items-center justify-center text-[10px] text-slate-500">
                        🕊️
                      </div>
                    )}

                    <span className="text-[11px] font-mono text-emerald-400 font-bold">
                      🕊️ {intercessorCount} {intercessorCount === 1 ? 'Intercessor' : 'Intercessors'} Standing in Faith
                    </span>
                  </div>

                  {/* "I Prayed For This" Interactive Button */}
                  <button
                    onClick={() => handleIPrayed(prayer.id)}
                    className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                      userHasPrayed
                        ? 'bg-amber-500 text-slate-950 shadow-amber-500/20'
                        : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    <span>🙏</span>
                    <span>{userHasPrayed ? 'You Prayed!' : 'I Prayed For This'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
