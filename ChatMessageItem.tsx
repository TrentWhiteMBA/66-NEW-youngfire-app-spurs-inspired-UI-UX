import React, { useState } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Copy, Check, ClipboardPaste, Lock, ShieldAlert, ArrowLeft } from 'lucide-react';
import { db } from '../services/firebase';

export type ReactionKey = 'like' | 'love' | 'amen' | 'fire' | 'pray';

export type ChatCollectionName =
  | 'sanctuary_brotherhood_chat'
  | 'sanctuary_sisterhood_chat'
  | 'fellowship_chat'
  | 'men_chat'
  | 'women_chat';

export const CHAT_REACTION_OPTIONS: Array<{
  key: ReactionKey;
  emoji: string;
  label: string;
}> = [
  { key: 'like', emoji: '👍', label: 'Like' },
  { key: 'love', emoji: '❤️', label: 'Love' },
  { key: 'amen', emoji: '🙌', label: 'Amen' },
  { key: 'fire', emoji: '🔥', label: 'Fire' },
  { key: 'pray', emoji: '🙏', label: 'Pray' }
];

export const ADMIN_EMAILS = [
  'trentwhite0308@gmail.com',
  'trentwhitemba@yahoo.com',
  'white.whitney91@gmail.com',
  'jhowyoungfire@gmail.com',
  'luislopez567@hotmail.com'
];

/**
 * Centralized Cohort Access Guard Logic:
 * Administrators, Lead Facilitators, and Overseers have full oversight across both hubs.
 * Brotherhood hub is restricted to brothers; Sisterhood hub is restricted to sisters.
 */
export const checkHubAccess = (
  hubType: 'brotherhood' | 'sisterhood',
  currentUser: { email?: string | null; role?: string | null; gender?: string | null; isAdmin?: boolean; accountType?: string } | null | undefined
): boolean => {
  if (!currentUser) return false;

  const email = currentUser.email?.toLowerCase().trim() || '';
  let isCustomAdmin = false;
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('youngfire_custom_admin_emails');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          isCustomAdmin = parsed.map((e: any) => String(e).toLowerCase().trim()).includes(email);
        }
      }
    }
  } catch {}

  const isAdmin =
    currentUser.isAdmin === true ||
    currentUser.accountType === 'administrator' ||
    currentUser.role === 'Administrator' ||
    currentUser.role === 'Lead Facilitator' ||
    currentUser.role === 'Overseer' ||
    ADMIN_EMAILS.includes(email) ||
    isCustomAdmin;

  // Administrators and Lead Facilitators have full oversight across both hubs
  if (isAdmin) return true;

  const normalizedGender = (currentUser.gender || '').toLowerCase().trim();

  if (hubType === 'brotherhood') {
    return normalizedGender === 'brother' || normalizedGender === 'male';
  }

  if (hubType === 'sisterhood') {
    return normalizedGender === 'sister' || normalizedGender === 'female';
  }

  return false;
};

/**
 * Standardized Date & Time Formatting Helper:
 * Incorporates a reliable timestamp formatter that handles Firestore ServerTimestamps,
 * JS Date objects, epoch numbers, and ISO strings -> "Oct 7, 2026 • 9:15 AM"
 */
export const formatChatTimestamp = (timestamp: any): string => {
  if (!timestamp) return 'Just now';

  let date: Date;
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    // Firestore Timestamp object
    date = timestamp.toDate();
  } else if (typeof timestamp.seconds === 'number') {
    date = new Date(timestamp.seconds * 1000);
  } else if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === 'string') {
    if (timestamp.includes('•')) return timestamp;
    const parsed = new Date(timestamp);
    if (!isNaN(parsed.getTime())) {
      date = parsed;
    } else {
      return timestamp;
    }
  } else {
    return 'Just now';
  }

  if (isNaN(date.getTime())) return 'Just now';

  // Format: "Oct 7, 2026 • 9:15 AM"
  const datePart = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const timePart = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return `${datePart} • ${timePart}`;
};

export const getOptimisticMessageReactions = <T extends { id: string; reactions?: Record<string, string[]> }>(
  messages: T[],
  messageId: string,
  reactionKey: ReactionKey,
  userIdentifier: string
): T[] => {
  if (!messageId || !userIdentifier) return messages;
  return messages.map((msg) => {
    if (msg.id !== messageId) return msg;
    const existingReactions = msg.reactions || {};
    const currentList = Array.isArray(existingReactions[reactionKey]) ? existingReactions[reactionKey] : [];
    const alreadyReacted = currentList.includes(userIdentifier);
    const nextList = alreadyReacted
      ? currentList.filter((u) => u !== userIdentifier)
      : [...currentList, userIdentifier];
    return {
      ...msg,
      reactions: {
        ...existingReactions,
        [reactionKey]: nextList
      }
    };
  });
};

/**
 * Atomic Reaction Toggle Function:
 * Updates reactions.<key> via arrayUnion / arrayRemove in Firestore.
 */
export const toggleChatReaction = async (
  collectionName: ChatCollectionName,
  messageId: string,
  reactionKey: ReactionKey,
  userIdentifier: string,
  messages?: Array<{ id: string; reactions?: Record<string, string[]> }>
): Promise<void> => {
  if (!messageId || !userIdentifier) return;
  const currentMsg = messages?.find((m) => m.id === messageId);
  const alreadyReacted = Boolean(currentMsg?.reactions?.[reactionKey]?.includes(userIdentifier));

  const fieldUpdate = alreadyReacted
    ? { [`reactions.${reactionKey}`]: arrayRemove(userIdentifier) }
    : { [`reactions.${reactionKey}`]: arrayUnion(userIdentifier) };

  const targetCollections: ChatCollectionName[] =
    collectionName === 'sanctuary_brotherhood_chat' || collectionName === 'men_chat'
      ? ['sanctuary_brotherhood_chat', 'men_chat']
      : collectionName === 'sanctuary_sisterhood_chat' || collectionName === 'women_chat'
      ? ['sanctuary_sisterhood_chat', 'women_chat']
      : [collectionName];

  await Promise.all(
    targetCollections.map((col) =>
      updateDoc(doc(db, col, messageId), fieldUpdate).catch(() => {})
    )
  );
};

export const copyTextToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  } catch {
    return false;
  }
};

interface ChatReactionBarProps {
  messageId: string;
  messageText: string;
  reactions?: Record<string, string[]>;
  userIdentifier: string;
  accentColor?: 'orange' | 'rose' | 'purple' | 'amber';
  onToggleReaction: (reactionKey: ReactionKey) => void;
}

export const ChatReactionAndCopyBar: React.FC<ChatReactionBarProps> = ({
  messageText,
  reactions = {},
  userIdentifier,
  accentColor = 'amber',
  onToggleReaction
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyTextToClipboard(messageText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const activePillTheme =
    accentColor === 'orange'
      ? 'bg-orange-500/25 border-orange-400/70 text-orange-200'
      : accentColor === 'rose'
      ? 'bg-rose-500/25 border-rose-400/70 text-rose-200'
      : accentColor === 'purple'
      ? 'bg-purple-500/25 border-purple-400/70 text-purple-200'
      : 'bg-amber-500/25 border-amber-400/70 text-amber-200';

  return (
    <div className="flex flex-wrap items-center justify-between gap-1.5 mt-2 pt-1.5 border-t border-white/5 select-none">
      <div className="flex flex-wrap items-center gap-1">
        {CHAT_REACTION_OPTIONS.map((opt) => {
          const list = Array.isArray(reactions?.[opt.key]) ? reactions[opt.key] : [];
          const count = list.length;
          const hasReacted = Boolean(userIdentifier && list.includes(userIdentifier));
          return (
            <button
              key={opt.key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleReaction(opt.key);
              }}
              title={`${opt.label} (${count})`}
              className={`px-2 py-0.5 rounded-full border text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-all active:scale-95 ${
                hasReacted
                  ? `${activePillTheme} font-bold shadow-sm`
                  : count > 0
                  ? 'bg-white/10 border-white/20 text-slate-200 hover:bg-white/15'
                  : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10'
              }`}
            >
              <span>{opt.emoji}</span>
              <span className="hidden sm:inline text-[9px] uppercase tracking-wider">{opt.label}</span>
              {count > 0 && <span className="font-bold">{count}</span>}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleCopy}
        title="Copy message text"
        className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-all ${
          copied
            ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300 font-bold'
            : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 hover:text-white'
        }`}
      >
        {copied ? (
          <>
            <Check className="w-3 h-3 text-emerald-400" />
            <span>Copied</span>
          </>
        ) : (
          <>
            <Copy className="w-3 h-3" />
            <span>Copy</span>
          </>
        )}
      </button>
    </div>
  );
};

interface ChatPasteButtonProps {
  onPasteText: (pasted: string) => void;
}

export const ChatPasteButton: React.FC<ChatPasteButtonProps> = ({ onPasteText }) => {
  const handlePasteClick = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          onPasteText(text);
        }
      }
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={handlePasteClick}
      title="Paste from clipboard"
      className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-[10px] font-mono uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors shrink-0"
    >
      <ClipboardPaste className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Paste</span>
    </button>
  );
};

interface CohortAccessLockViewProps {
  hubType: 'brotherhood' | 'sisterhood';
  onBack?: () => void;
}

export const CohortAccessLockView: React.FC<CohortAccessLockViewProps> = ({ hubType, onBack }) => {
  const isBrotherhood = hubType === 'brotherhood';
  return (
    <div className="w-full max-w-lg mx-auto my-8 p-6 sm:p-8 rounded-3xl bg-[#070B14] border-2 border-amber-500/60 shadow-[0_20px_60px_rgba(0,0,0,0.95)] text-center space-y-4">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 border border-amber-400/50 flex items-center justify-center shadow-lg">
        <Lock className="w-7 h-7 text-amber-400" />
      </div>
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-amber-400 font-bold block">
          Consecrated Cohort Access Lock
        </span>
        <h3 className="font-['Outfit'] text-xl font-black uppercase tracking-wider text-white">
          {isBrotherhood ? 'Men On Fire Brotherhood Hub' : 'Women Ignited Sisterhood Hub'}
        </h3>
        <p className="text-xs font-mono text-slate-300">
          {isBrotherhood
            ? 'Restricted to YoungFire Brothers & Sanctuary Leadership'
            : 'Restricted to YoungFire Sisters & Sanctuary Leadership'}
        </p>
      </div>
      <p className="text-xs text-slate-300 leading-relaxed font-serif">
        {isBrotherhood
          ? 'The Men On Fire hub is a consecrated space reserved for YoungFire Brothers, Lead Facilitators, and Sanctuary Administrators.'
          : 'The Women Ignited hub is a consecrated space reserved for YoungFire Sisters, Lead Facilitators, and Sanctuary Administrators.'}
      </p>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mt-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-wider text-xs font-['Outfit'] inline-flex items-center gap-2 cursor-pointer shadow-lg transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Sanctuary</span>
        </button>
      )}
    </div>
  );
};
