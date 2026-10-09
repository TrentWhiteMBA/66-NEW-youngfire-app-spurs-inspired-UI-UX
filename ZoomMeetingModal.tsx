import React, { useState } from 'react';
import { X, Video, ExternalLink, Copy, Check, Shield } from 'lucide-react';

interface ZoomMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  gatheringTitle?: string;
  zoomUrl?: string;
  meetingId?: string;
  passcode?: string;
  [key: string]: any;
}

export const ZoomMeetingModal: React.FC<ZoomMeetingModalProps> = ({
  isOpen,
  onClose,
  gatheringTitle = 'YoungFire Ministry Zoom Sanctuary',
  zoomUrl = 'https://us05web.zoom.us/j/8785161298?pwd=e0zBTD2QHIHfx0AzjzXG7EHQno9Oig.1&omn=85728476365',
  meetingId = '878 516 1298',
  passcode = 'FIRE2026'
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const directZoomLink = zoomUrl || 'https://us05web.zoom.us/j/8785161298?pwd=e0zBTD2QHIHfx0AzjzXG7EHQno9Oig.1&omn=85728476365';
  const homeZoomLink = 'https://us05web.zoom.us/myhome';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-[#070b14] border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-white space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Video className="w-4 h-4 text-black stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-['Outfit'] font-black text-sm uppercase tracking-wider text-white">
                YoungFire Zoom Sanctuary
              </h3>
              <span className="text-[10px] font-mono text-amber-400 block tracking-widest uppercase">
                Official Live Bridge
              </span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h4 className="font-bold text-base text-white">{gatheringTitle}</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            Join our live interactive video fellowship, intercessory prayer, and discipleship huddles.
          </p>
        </div>

        {/* Meeting Credentials Card */}
        <div className="p-4 rounded-2xl bg-black/70 border border-white/10 space-y-3 font-mono">
          {/* Meeting ID */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 uppercase text-[11px]">Meeting ID:</span>
            <div className="flex items-center gap-2">
              <span className="text-amber-300 font-bold text-sm tracking-widest">{meetingId}</span>
              <button
                onClick={() => handleCopy('8785161298', 'id')}
                className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Copy Meeting ID"
              >
                {copiedField === 'id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Passcode */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 uppercase text-[11px]">Passcode:</span>
            <div className="flex items-center gap-2">
              <span className="text-emerald-300 font-bold text-sm tracking-widest">{passcode}</span>
              <button
                onClick={() => handleCopy(passcode, 'passcode')}
                className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Copy Passcode"
              >
                {copiedField === 'passcode' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Launch Buttons */}
        <div className="space-y-2 pt-1">
          {/* Direct 1-Tap Join */}
          <a 
            href={directZoomLink} 
            target="_blank" 
            rel="noreferrer"
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/25 transition-all active:scale-98"
          >
            <span>Launch Zoom Meeting Now</span>
            <ExternalLink className="w-4 h-4 stroke-[2.5]" />
          </a>

          {/* Alternate Zoom Portal */}
          <a 
            href={homeZoomLink} 
            target="_blank" 
            rel="noreferrer"
            className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-mono text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
          >
            <span>Open Zoom Web Portal (My Home)</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>

      </div>
    </div>
  );
};

export default ZoomMeetingModal;
