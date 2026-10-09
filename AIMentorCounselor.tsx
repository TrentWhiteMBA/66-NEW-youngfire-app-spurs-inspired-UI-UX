import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Sparkles, Send, Volume2, VolumeX, 
  BookOpen, Heart, Shield, RefreshCw, Compass, MessageSquare,
  Paperclip, Camera, X, Flame, Image as ImageIcon, Upload, Check,
  Plus, Trash2, Edit3, Clock, ChevronRight, MessageCircle
} from 'lucide-react';
import { setActiveFlyer, compressImageFile } from '../data/broadcastMeetingData';
import { generateDiscipleshipCounsel } from '../services/aiMentorService';

export interface Message {
  id: string;
  sender: 'user' | 'mentor';
  text: string;
  imageUrl?: string;
  isFlyerUpdate?: boolean;
  scriptures?: string[];
  timestamp: string;
}

export interface ConversationThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

interface AIMentorCounselorProps {
  onBack?: () => void;
  onAudioDucking?: (shouldDuck: boolean) => void;
  onNavigateToScripture?: (bookId: string, chapter: number) => void;
  currentUser?: { id: string; name?: string; isAdmin?: boolean; email?: string } | null;
}

const COUNSEL_STARTERS = [
  "How do I balance high-demand work with spiritual discipline?",
  "What scriptures guide purity and intentional dating for young adults?",
  "How do I discover my calling and spiritual gifts in YoungFire?",
  "I am feeling anxious about future career decisions and feeling alone.",
  "How do I overcome spiritual warfare and daily temptation?"
];

const INITIAL_WELCOME_MESSAGE: Message = {
  id: 'welcome',
  sender: 'mentor',
  text: "Share what is on your heart—whether career stewardship, purity, discerning your spiritual calling, or walking through trials—and we will examine it directly through the New King James Version (NKJV) Scriptures.",
  scriptures: ["Proverbs 3:5–6", "2 Timothy 3:16–17"],
  timestamp: "Just now"
};

export const AIMentorCounselor: React.FC<AIMentorCounselorProps> = ({
  onBack,
  onAudioDucking,
  onNavigateToScripture,
  currentUser: propUser
}) => {
  // Determine if current user has administrative permissions
  const isAuthorizedAdmin = Boolean(
    propUser?.isAdmin ||
    propUser?.email?.toLowerCase().includes('trent') ||
    propUser?.email?.toLowerCase().includes('whitney') ||
    propUser?.name?.toLowerCase().includes('trent') ||
    propUser?.name?.toLowerCase().includes('whitney') ||
    (() => {
      try {
        const saved = localStorage.getItem('youngfire_device_session_v1') || localStorage.getItem('youngfire_user_session');
        if (saved) {
          const u = JSON.parse(saved);
          return u.isAdmin || u.email?.toLowerCase().includes('trent') || u.email?.toLowerCase().includes('whitney');
        }
      } catch {}
      return false;
    })()
  );

  // Multi-Conversation Threads State (Copilot / ChatGPT style)
  const [conversations, setConversations] = useState<ConversationThread[]>(() => {
    try {
      const saved = localStorage.getItem('youngfire_ai_conversations_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return [
      {
        id: 'initial_convo',
        title: 'New Discipleship Counsel',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [INITIAL_WELCOME_MESSAGE]
      }
    ];
  });

  const [activeConvoId, setActiveConvoId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('youngfire_ai_active_convo_id');
      if (saved) return saved;
    } catch {}
    return 'initial_convo';
  });

  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState('');
  const [isRenamingActiveBar, setIsRenamingActiveBar] = useState(false);
  const [activeBarTitleInput, setActiveBarTitleInput] = useState('');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => {
      setStatusNotice(prev => (prev === msg ? null : prev));
    }, 3000);
  };

  // Active conversation helper
  const activeConversation = conversations.find(c => c.id === activeConvoId) || conversations[0] || {
    id: 'initial_convo',
    title: 'New Discipleship Counsel',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [INITIAL_WELCOME_MESSAGE]
  };

  const messages = activeConversation.messages;

  // Persist conversations & active conversation ID to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('youngfire_ai_conversations_v2', JSON.stringify(conversations));
      localStorage.setItem('youngfire_ai_active_convo_id', activeConvoId);
    } catch {}
  }, [conversations, activeConvoId]);

  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // Attachment & Drag-and-Drop state
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Administrative Flyer Intent Prompt state
  const [pendingFlyerAction, setPendingFlyerAction] = useState<{
    messageId: string;
    imageUrl: string;
    text: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingFlyerAction, isTyping]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (onAudioDucking) onAudioDucking(false);
    };
  }, [onAudioDucking]);

  // Update active conversation's messages
  const updateActiveMessages = (updater: (prev: Message[]) => Message[]) => {
    setConversations(prev => {
      return prev.map(c => {
        if (c.id === activeConversation.id) {
          const updatedMsgs = updater(c.messages);
          let title = c.title;
          const firstUserMsg = updatedMsgs.find(m => m.sender === 'user');
          if ((title === 'New Discipleship Counsel' || title === 'New Chat') && firstUserMsg?.text) {
            title = firstUserMsg.text.slice(0, 32) + (firstUserMsg.text.length > 32 ? '...' : '');
          }
          return {
            ...c,
            title,
            updatedAt: new Date().toISOString(),
            messages: updatedMsgs
          };
        }
        return c;
      });
    });
  };

  // Create brand new conversation thread
  const handleCreateNewConversation = () => {
    const newId = `convo_${Date.now()}`;
    const newConvo: ConversationThread = {
      id: newId,
      title: 'New Discipleship Counsel',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `welcome_${Date.now()}`,
          sender: 'mentor',
          text: "What question or burden would you like to bring before the Word of God (NKJV) today?",
          scriptures: ["2 Timothy 3:16–17", "James 1:5"],
          timestamp: "Just now"
        }
      ]
    };

    setConversations(prev => [newConvo, ...prev]);
    setActiveConvoId(newId);
    setIsHistoryDrawerOpen(false);
    setInputValue('');
    setAttachedImage(null);
    showNotice('Started new conversation');
  };

  // Delete conversation thread (works immediately without blocked window.confirm)
  const handleDeleteConversation = (convoId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      setIsVoiceActive(false);
    }
    const remaining = conversations.filter(c => c.id !== convoId);
    if (remaining.length === 0) {
      const fresh: ConversationThread = {
        id: `convo_${Date.now()}`,
        title: 'New Discipleship Counsel',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [INITIAL_WELCOME_MESSAGE]
      };
      setConversations([fresh]);
      setActiveConvoId(fresh.id);
    } else {
      setConversations(remaining);
      if (activeConvoId === convoId || activeConversation.id === convoId) {
        setActiveConvoId(remaining[0].id);
      }
    }
    showNotice('Conversation deleted');
  };

  // Clear / Delete all conversations
  const handleDeleteAllConversations = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      setIsVoiceActive(false);
    }
    const fresh: ConversationThread = {
      id: `convo_${Date.now()}`,
      title: 'New Discipleship Counsel',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [INITIAL_WELCOME_MESSAGE]
    };
    setConversations([fresh]);
    setActiveConvoId(fresh.id);
    setIsHistoryDrawerOpen(false);
    showNotice('All chat history cleared');
  };

  // Delete an individual message from the active conversation
  const handleDeleteMessage = (msgId: string) => {
    updateActiveMessages(prev => {
      const filtered = prev.filter(m => m.id !== msgId);
      return filtered.length > 0 ? filtered : [INITIAL_WELCOME_MESSAGE];
    });
    showNotice('Message removed');
  };

  // Rename conversation
  const handleSaveRename = (convoId: string) => {
    if (!editingTitleText.trim()) {
      setEditingTitleId(null);
      return;
    }
    setConversations(prev => prev.map(c => c.id === convoId ? { ...c, title: editingTitleText.trim() } : c));
    setEditingTitleId(null);
    showNotice('Chat renamed');
  };

  // Handle Image File selection and compression
  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showNotice("Please upload a valid image file (PNG, JPG, WebP).");
      return;
    }

    try {
      setIsCompressing(true);
      const compressedDataUrl = await compressImageFile(file, 1200, 0.85);
      setAttachedImage(compressedDataUrl);
    } catch (err: any) {
      showNotice(`Could not process image: ${err.message}`);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    if (e.target) e.target.value = '';
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Speech Synthesis
  const handleToggleVoice = (msgId: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert("Voice speech synthesis is not supported on this device.");
      return;
    }

    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      setIsVoiceActive(false);
      if (onAudioDucking) onAudioDucking(false);
      return;
    }

    window.speechSynthesis.cancel();
    if (onAudioDucking) onAudioDucking(true);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setSpeakingMessageId(null);
      setIsVoiceActive(false);
      if (onAudioDucking) onAudioDucking(false);
    };

    utterance.onerror = () => {
      setSpeakingMessageId(null);
      setIsVoiceActive(false);
      if (onAudioDucking) onAudioDucking(false);
    };

    setSpeakingMessageId(msgId);
    setIsVoiceActive(true);
    window.speechSynthesis.speak(utterance);
  };

  // Message Send Handler
  const handleSend = async (textToSend?: string) => {
    const q = textToSend !== undefined ? textToSend : inputValue;
    if (!q.trim() && !attachedImage) return;

    const userMessageId = `u-${Date.now()}`;
    const imageToAttach = attachedImage;
    const currentText = q.trim();

    const userMsg: Message = {
      id: userMessageId,
      sender: 'user',
      text: currentText || (imageToAttach ? "Uploaded image attachment" : ""),
      imageUrl: imageToAttach || undefined,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };

    updateActiveMessages(prev => [...prev, userMsg]);
    if (textToSend === undefined) setInputValue('');
    setAttachedImage(null);

    // Admin Intent Detection & Broadcast Flyer Override:
    const textLower = currentText.toLowerCase();
    const hasFlyerKeywords = ['flyer', 'meeting', 'zoom', 'broadcast', 'schedule', 'assembly'].some(kw => textLower.includes(kw));

    if (isAuthorizedAdmin && imageToAttach && (hasFlyerKeywords || currentText.length < 5)) {
      setPendingFlyerAction({
        messageId: userMessageId,
        imageUrl: imageToAttach,
        text: currentText
      });
      return;
    }

    setIsTyping(true);

    // Build conversation history
    const historyPayload = messages.slice(-8).map(m => ({
      role: (m.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
      text: m.text
    }));

    const promptWithMediaNotice = imageToAttach 
      ? `${currentText} [Disciple attached photo/media for counsel]`
      : currentText;

    const counsel = await generateDiscipleshipCounsel(promptWithMediaNotice, historyPayload);

    const mentorMsg: Message = {
      id: `m-${Date.now()}`,
      sender: 'mentor',
      text: counsel.text,
      scriptures: counsel.scriptures,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };

    updateActiveMessages(prev => [...prev, mentorMsg]);
    setIsTyping(false);
  };

  return (
    <div 
      className="space-y-4 max-w-4xl mx-auto pb-20 select-none px-2 sm:px-4"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Top Header & Conversation Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-[#0a0a0a] border border-white/15 text-slate-200 hover:text-white cursor-pointer transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h2 className="text-base sm:text-lg font-black uppercase font-['Outfit'] text-white">
                SCRIPTURE COUNSELOR & MENTOR
              </h2>
              {isAuthorizedAdmin && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                  <Flame className="w-2.5 h-2.5 fill-current" />
                  Admin Mode
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              Grounded Exclusively in Holy Scripture &bull; Discipleship Care for Ages 18–35
            </p>
          </div>
        </div>

        {/* Conversation Thread Controls (Copilot / ChatGPT style) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* New Conversation Button */}
          <button
            onClick={handleCreateNewConversation}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
            title="Start a new discipleship counsel conversation"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>+ New Chat</span>
          </button>

          {/* Saved Conversations Drawer Toggle */}
          <button
            onClick={() => setIsHistoryDrawerOpen(!isHistoryDrawerOpen)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              isHistoryDrawerOpen 
                ? 'bg-purple-500 text-white border-purple-400 shadow-md' 
                : 'bg-[#0a0a0a] border-white/10 hover:border-purple-400 text-slate-300 hover:text-white'
            }`}
            title="View saved conversation threads"
          >
            <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
            <span>Chats ({conversations.length})</span>
          </button>

          {/* Direct Delete Active Chat Button */}
          <button
            onClick={(e) => handleDeleteConversation(activeConversation.id, e)}
            className="px-3 py-1.5 rounded-xl bg-[#0a0a0a] hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/50 text-rose-400 hover:text-rose-300 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Delete current chat conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Chat</span>
          </button>

          {isVoiceActive && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-[10px] font-mono font-bold animate-pulse">
              <Volume2 className="w-3 h-3" />
              <span>Voice</span>
            </div>
          )}
        </div>
      </div>

      {/* Inline Status Notice Toast */}
      {statusNotice && (
        <div className="px-3.5 py-2 rounded-xl bg-purple-950/60 border border-purple-400/40 text-purple-200 text-xs font-mono flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{statusNotice}</span>
          </div>
          <button
            onClick={() => setStatusNotice(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Slide-Down or Drawer: Saved Conversations History (Copilot / ChatGPT style) */}
      {isHistoryDrawerOpen && (
        <div className="p-4 bg-[#000000] border border-purple-500/30 rounded-3xl shadow-2xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-purple-400" />
              <h4 className="text-xs font-bold uppercase font-mono text-white">
                Saved Conversation Threads ({conversations.length})
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteAllConversations}
                className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 hover:text-white text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Delete all saved conversation threads"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete All Chats</span>
              </button>
              <button
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
            {conversations.map((convo) => {
              const isActive = convo.id === activeConvoId;
              const isEditingThis = editingTitleId === convo.id;

              return (
                <div
                  key={convo.id}
                  onClick={() => {
                    setActiveConvoId(convo.id);
                    setIsHistoryDrawerOpen(false);
                  }}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-2 group ${
                    isActive
                      ? 'bg-purple-950/40 border-purple-400 shadow-md ring-1 ring-purple-500/50'
                      : 'bg-[#0a0a0a] border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    {isEditingThis ? (
                      <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingTitleText}
                          onChange={(e) => setEditingTitleText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(convo.id);
                            if (e.key === 'Escape') setEditingTitleId(null);
                          }}
                          autoFocus
                          className="w-full bg-[#000000] border border-purple-400 rounded-lg px-2 py-1 text-xs text-white"
                        />
                        <button
                          onClick={() => handleSaveRename(convo.id)}
                          className="p-1 rounded bg-purple-500 text-white text-xs cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs font-bold text-white truncate font-['Outfit'] group-hover:text-purple-300">
                          {convo.title}
                        </h5>
                        <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                          {convo.messages.length} messages &bull; {new Date(convo.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {!isEditingThis && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setEditingTitleId(convo.id);
                            setEditingTitleText(convo.title);
                          }}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                          title="Rename thread"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteConversation(convo.id, e)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                          title="Delete conversation thread"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Conversation Title Header Indicator */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0a0a0a]/90 border border-white/10 rounded-xl text-xs font-mono text-slate-400 gap-2">
        {isRenamingActiveBar ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={activeBarTitleInput}
              onChange={(e) => setActiveBarTitleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && activeBarTitleInput.trim()) {
                  setConversations(prev => prev.map(c => c.id === activeConversation.id ? { ...c, title: activeBarTitleInput.trim() } : c));
                  setIsRenamingActiveBar(false);
                  showNotice('Chat renamed');
                }
                if (e.key === 'Escape') setIsRenamingActiveBar(false);
              }}
              autoFocus
              className="flex-1 bg-black border border-purple-400 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
            />
            <button
              onClick={() => {
                if (activeBarTitleInput.trim()) {
                  setConversations(prev => prev.map(c => c.id === activeConversation.id ? { ...c, title: activeBarTitleInput.trim() } : c));
                  showNotice('Chat renamed');
                }
                setIsRenamingActiveBar(false);
              }}
              className="px-2.5 py-1 rounded-lg bg-purple-500 text-white text-[10px] font-bold cursor-pointer"
            >
              Save
            </button>
            <button
              onClick={() => setIsRenamingActiveBar(false)}
              className="px-2 py-1 rounded-lg bg-white/10 text-slate-300 text-[10px] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 truncate">
              <span className="text-slate-500">Active Chat:</span>
              <span className="font-bold text-white truncate">{activeConversation.title}</span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => {
                  setActiveBarTitleInput(activeConversation.title);
                  setIsRenamingActiveBar(true);
                }}
                className="text-[10px] text-purple-400 hover:text-purple-300 cursor-pointer flex items-center gap-1"
                title="Rename this conversation"
              >
                <Edit3 className="w-3 h-3" />
                <span>Rename</span>
              </button>
              <button
                onClick={(e) => handleDeleteConversation(activeConversation.id, e)}
                className="text-[10px] text-rose-400 hover:text-rose-300 cursor-pointer flex items-center gap-1"
                title="Delete this conversation"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Suggested Prompt Pills */}
      <div className="flex flex-wrap gap-2 pt-1">
        {COUNSEL_STARTERS.map((starter, i) => (
          <button
            key={i}
            onClick={() => handleSend(starter)}
            className="text-[11px] font-mono text-slate-300 bg-[#0a0a0a] hover:bg-purple-950/40 border border-white/10 hover:border-purple-400/40 px-3 py-1.5 rounded-full transition-all cursor-pointer text-left"
          >
            "{starter}"
          </button>
        ))}
      </div>

      {/* Chat Messages Feed */}
      <div className={`bg-[#0a0a0a] border ${isDragging ? 'border-amber-400 bg-amber-950/20 ring-4 ring-amber-500/30' : 'border-white/10'} rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4 min-h-[380px] max-h-[500px] overflow-y-auto transition-all relative`}>
        {isDragging && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center border-2 border-dashed border-amber-400 rounded-3xl p-6 text-center">
            <Upload className="w-12 h-12 text-amber-400 animate-bounce mb-2" />
            <h3 className="text-sm font-bold text-white uppercase font-mono">
              Drop Flyer or Image Here
            </h3>
            <p className="text-xs text-amber-300/80 mt-1">
              Supports JPEG, PNG & WebP (Automatic Compression)
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isMentor = msg.sender === 'mentor';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isMentor ? 'justify-start' : 'justify-end'}`}
            >
              {isMentor && (
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center flex-shrink-0 text-purple-300 mt-1">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-[88%] space-y-2.5 ${
                isMentor 
                  ? 'bg-[#0a0a0a]/90 border border-purple-500/20 text-slate-100' 
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-medium'
              } p-4 rounded-2xl shadow-md text-left`}>
                {/* Image attachment if provided */}
                {msg.imageUrl && (
                  <div className="rounded-xl overflow-hidden border border-white/15 max-w-sm mb-2 shadow-lg">
                    <img 
                      src={msg.imageUrl} 
                      alt="Attachment" 
                      className="w-full h-auto max-h-56 object-cover" 
                    />
                  </div>
                )}

                <div className="whitespace-pre-line text-xs sm:text-sm font-serif leading-relaxed">
                  {msg.text}
                </div>

                {/* Scripture anchors pills */}
                {msg.scriptures && msg.scriptures.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-white/10">
                    {msg.scriptures.map((sc, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (onNavigateToScripture) {
                            const match = sc.match(/^([A-Za-z0-9\s]+?)\s+(\d+)/);
                            if (match) {
                              const book = match[1].trim().slice(0, 3).toUpperCase();
                              const ch = parseInt(match[2], 10) || 1;
                              onNavigateToScripture(book, ch);
                            }
                          }
                        }}
                        className="px-2 py-0.5 rounded-md bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 text-[10px] font-mono border border-purple-500/30 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <BookOpen className="w-2.5 h-2.5" />
                        <span>{sc}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Footer timestamp, text-to-speech & message delete */}
                <div className="flex items-center justify-between text-[10px] font-mono opacity-75 pt-1 gap-3">
                  <span>{msg.timestamp}</span>
                  <div className="flex items-center gap-3">
                    {isMentor && (
                      <button
                        onClick={() => handleToggleVoice(msg.id, msg.text)}
                        className="hover:opacity-100 transition-opacity cursor-pointer flex items-center gap-1"
                        title={speakingMessageId === msg.id ? "Stop voice recitation" : "Listen to audio counsel"}
                      >
                        {speakingMessageId === msg.id ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                            <span className="text-rose-400">Stop Voice</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="text-cyan-400">Listen</span>
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className={`hover:opacity-100 transition-opacity cursor-pointer flex items-center gap-1 ${
                        isMentor ? 'text-slate-400 hover:text-rose-400' : 'text-slate-900/70 hover:text-slate-950'
                      }`}
                      title="Delete this message"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex gap-2 items-center text-xs font-mono text-purple-400 animate-pulse pl-11">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Discipleship Counselor is seeking scripture rhema...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer Bar */}
      <div className="space-y-2">
        {/* Attached thumbnail preview if uploaded */}
        {attachedImage && (
          <div className="relative inline-block border border-amber-400/80 rounded-xl overflow-hidden shadow-lg p-1 bg-[#0a0a0a] animate-fadeIn">
            <img 
              src={attachedImage} 
              alt="Attached flyer" 
              className="w-16 h-16 object-cover rounded-lg"
            />
            <button
              onClick={() => setAttachedImage(null)}
              className="absolute -top-1 -right-1 p-0.5 bg-rose-500 text-white rounded-full shadow cursor-pointer"
              title="Remove attachment"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* File Attachment Input (hidden) */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-2xl bg-[#0a0a0a] border border-white/10 hover:border-amber-400 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer flex-shrink-0"
            title="Upload meeting flyer or photo"
            disabled={isCompressing}
          >
            {isCompressing ? (
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              <Paperclip className="w-4 h-4" />
            )}
          </button>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isTyping && handleSend()}
            placeholder="Ask for discipleship counsel, scripture guidance, or attach meeting flyer..."
            className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-purple-400 shadow-inner"
          />

          <button
            onClick={() => handleSend()}
            disabled={(!inputValue.trim() && !attachedImage) || isTyping}
            className="p-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:from-purple-400 hover:to-indigo-400 transition-all flex-shrink-0 shadow-lg shadow-purple-500/20"
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
