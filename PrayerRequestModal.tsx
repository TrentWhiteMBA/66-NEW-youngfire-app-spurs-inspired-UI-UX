import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { PrayerSubmission, submitSanctuaryPrayer } from '../services/prayerService';

export interface PrayerRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: (submission: PrayerSubmission) => void;
  defaultName?: string;
  authorPhotoUrl?: string;
  isGuest?: boolean;
}

export const PrayerRequestModal: React.FC<PrayerRequestModalProps> = ({
  isOpen,
  onClose,
  onSubmitted,
  defaultName = '',
  authorPhotoUrl,
  isGuest = true
}) => {
  const [guestName, setGuestName] = useState(defaultName);
  const [prayerBody, setPrayerBody] = useState('');
  const [wantsContact, setWantsContact] = useState(false);
  const [contactInfo, setContactInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && defaultName && !guestName) {
      setGuestName(defaultName);
    }
  }, [isOpen, defaultName]);

  if (!isOpen) return null;

  const handlePrayerSubmit = async () => {
    if (!guestName.trim() || !prayerBody.trim() || isSubmitting) return;
    setIsSubmitting(true);

    const payload: PrayerSubmission = {
      id: `prayer_${Date.now()}`,
      title: `Prayer Intercession • ${guestName.trim()}`,
      requestText: prayerBody.trim(),
      authorName: guestName.trim(),
      contactChannel: wantsContact && contactInfo.trim() ? contactInfo.trim() : undefined,
      wantsFollowUp: wantsContact,
      authorPhotoUrl: authorPhotoUrl || undefined,
      isGuest,
      createdAt: new Date().toISOString()
    };

    try {
      await submitSanctuaryPrayer(payload);
    } catch (err) {
      console.warn('Prayer submission warning:', err);
    } finally {
      setIsSubmitting(false);
    }

    try {
      const savedRaw = localStorage.getItem('youngfire_prayer_dock_v2');
      const existingList = savedRaw ? JSON.parse(savedRaw) : [];
      const newEntry = {
        id: payload.id || `prayer_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        names: payload.authorName,
        cause: payload.requestText,
        status: 'active',
        completed: false,
        authorId: payload.isGuest ? 'guest-disciple' : 'sanctuary-disciple',
        authorName: payload.authorName,
        authorPhotoUrl: payload.authorPhotoUrl,
        contactChannel: payload.contactChannel,
        wantsFollowUp: payload.wantsFollowUp,
        isGuest: payload.isGuest,
        intercessorsCount: 1,
        prayedBy: [],
        prayedByUsers: []
      };
      const updatedList = Array.isArray(existingList)
        ? [newEntry, ...existingList.filter((item: any) => item?.id !== newEntry.id)]
        : [newEntry];
      localStorage.setItem('youngfire_prayer_dock_v2', JSON.stringify(updatedList));
      localStorage.setItem('youngfire_prayers_list', JSON.stringify(updatedList));
      localStorage.setItem('youngfire_prayers_v2', JSON.stringify(updatedList));
      window.dispatchEvent(new CustomEvent('yf_prayer_submitted', { detail: { submission: payload, item: newEntry } }));
    } catch {}

    if (onSubmitted) {
      onSubmitted(payload);
    }

    setPrayerBody('');
    setWantsContact(false);
    setContactInfo('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[220] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="p-6 bg-stone-950 border border-amber-500/40 rounded-2xl shadow-2xl space-y-4 max-w-md w-full relative"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <h3 className="font-mono text-sm uppercase tracking-wider text-slate-100 font-bold">
              Sanctuary Prayer Wall Intercession
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Name Field (Required for personal prayer) */}
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-slate-400 block mb-1">
            Your Name *
          </label>
          <input
            type="text"
            required
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="e.g., Brother Marcus"
            className="w-full bg-black/70 border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Prayer Request Body */}
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-slate-400 block mb-1">
            Prayer Request / Need *
          </label>
          <textarea
            required
            rows={3}
            value={prayerBody}
            onChange={(e) => setPrayerBody(e.target.value)}
            placeholder="Describe your situation or intercession need..."
            className="w-full bg-black/70 border border-white/15 rounded-xl px-3 py-2 text-xs font-sans text-slate-100 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Leadership Follow-Up Bridge */}
        <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-amber-300 font-bold">
              Request Personal Follow-Up
            </span>
            <input
              type="checkbox"
              checked={wantsContact}
              onChange={(e) => setWantsContact(e.target.checked)}
              className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
            />
          </div>

          {wantsContact && (
            <input
              type="text"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="Phone number or email address"
              className="w-full mt-2 bg-stone-900 border border-white/20 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-400"
            />
          )}
        </div>

        {/* Submit Action */}
        <button
          type="button"
          onClick={handlePrayerSubmit}
          disabled={!guestName.trim() || !prayerBody.trim() || isSubmitting}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-black font-mono text-xs uppercase font-bold tracking-widest disabled:opacity-40 transition-all cursor-pointer"
        >
          {isSubmitting ? 'Releasing Prayer...' : 'Release Prayer to Sanctuary'}
        </button>
      </div>
    </div>
  );
};

export default PrayerRequestModal;
