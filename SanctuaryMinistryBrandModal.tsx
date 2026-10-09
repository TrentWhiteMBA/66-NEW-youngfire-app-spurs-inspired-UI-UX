import React from 'react';
import { X, Flame, ExternalLink } from 'lucide-react';
import { AppTheme } from '../data/appThemes';

interface SanctuaryMinistryBrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTheme?: AppTheme;
}

const JHOW_OFFICIAL_URL = 'https://joshuahouseofworship.org/?gad_source=1&gad_campaignid=22511961809&gbraid=0AAAAAokP8Rtag-bQ4B5HexneQH2q_p6gR&gclid=CjwKCAjwifjVBhBKEiwAYx4K9KTNMzVQV4-sStkh5TAvmskt4kTQ9-W6OXXTR5fWVfJlrHlJor6TkRoCSoAQAvD_BwE';

export const SanctuaryMinistryBrandModal: React.FC<SanctuaryMinistryBrandModalProps> = ({
  isOpen,
  onClose,
  activeTheme
}) => {
  if (!isOpen) return null;

  const accentColor = activeTheme?.accentHex || '#00B2A9';
  const borderColor = activeTheme?.borderHex || `${accentColor}70`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none font-['Outfit']">
      <div 
        className="w-full max-w-sm bg-[#080808] border rounded-3xl p-6 shadow-2xl text-white space-y-6 relative overflow-hidden"
        style={{
          borderColor,
          boxShadow: `0 20px 50px ${accentColor}25`
        }}
      >
        {/* Close Button */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-bold">
            Sanctuary Ministry Covenant
          </span>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. YoungFire Ministry Section */}
        <div className="flex flex-col items-center text-center space-y-3 pt-1">
          <div 
            className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center shadow-xl border-2"
            style={{ borderColor: accentColor }}
          >
            <Flame className="w-9 h-9 text-black fill-current drop-shadow" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-[0.2em] text-white">
              YOUNG<span style={{ color: accentColor }}>FIRE</span>
            </h2>
            <p className="text-xs font-semibold text-slate-300 tracking-wider uppercase mt-0.5">
              YoungFire Discipleship Ministry
            </p>
            <p className="text-[10px] text-slate-400 max-w-xs mt-1 leading-relaxed">
              Empowering next-generation disciples through passionate worship, holy fire, and the unaltered Word of God.
            </p>
          </div>
        </div>

        {/* Divider with subtle liturgical styling */}
        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-px bg-white/15" />
          <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase">SANCTUARY ROOT</span>
          <div className="flex-1 h-px bg-white/15" />
        </div>

        {/* 2. Joshua House of Worship Section below it */}
        <div className="flex flex-col items-center text-center space-y-3 pb-1">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-800 via-slate-900 to-black border-2 border-white/30 flex items-center justify-center shadow-xl ring-2 ring-white/10">
            <span className="font-['Barlow_Condensed',sans-serif] font-black text-xl tracking-wider text-white">
              JHOW
            </span>
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-wider text-white">
              JOSHUA HOUSE OF WORSHIP
            </h3>
            <p className="text-xs font-semibold text-slate-300 tracking-wide mt-0.5">
              San Antonio, Texas &bull; Senior Leadership
            </p>
            <p className="text-[10px] text-slate-400 max-w-xs mt-1 leading-relaxed">
              A Christ-centered apostolic and prophetic sanctuary dedicated to holiness, discipleship, and city-wide outreach.
            </p>
          </div>

          {/* Official Website Link matching user's URL */}
          <a
            href={JHOW_OFFICIAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full mt-3 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg hover:scale-102"
            style={{
              backgroundColor: accentColor,
              color: activeTheme?.id === 'spurs_stealth' ? '#000000' : '#FFFFFF'
            }}
          >
            <span>Visit JoshuaHouseOfWorship.org</span>
            <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
          </a>
        </div>

      </div>
    </div>
  );
};

export default SanctuaryMinistryBrandModal;
