import React from 'react';

interface SanAntonioVectorMapProps {
  className?: string;
  opacity?: number;
  maskId?: string;
  show3dDepth?: boolean;
}

export const SanAntonioVectorMap: React.FC<SanAntonioVectorMapProps> = ({
  className = '',
  opacity = 1
}) => {
  return (
    <div 
      id="san-antonio-stationary-background"
      className={`fixed inset-0 w-full h-full pointer-events-none select-none overflow-hidden bg-black ${className}`}
      style={{
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        opacity
      }}
      aria-hidden="true"
    >
      {/* 1. High-Contrast San Antonio Dark Street Map Screenshot (Stationary Viewport Backdrop) */}
      <img
        src="/san_antonio_dark_map.png"
        alt="San Antonio Dark Street Map"
        className="w-full h-full object-cover object-center filter brightness-95 contrast-125 select-none pointer-events-none"
        referrerPolicy="no-referrer"
      />

      {/* 2. Precision Contrast Vignette (Preserves Map Visibility while Ensuring Window & Card Legibility) */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/25 to-black/75 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,0.75)_95%)] pointer-events-none" />

      {/* 3. San Antonio Metropolitan HUD Overlay with Real Expressways & Sanctuary Pin */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-80"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="saCoreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.28" />
            <stop offset="40%" stopColor="#38BDF8" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Downtown Core Radiant Halo */}
        <circle cx="500" cy="500" r="320" fill="url(#saCoreGlow)" />

        {/* Outer Loop 1604 Indicator */}
        <ellipse
          cx="500"
          cy="500"
          rx="430"
          ry="400"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="1.2"
          strokeDasharray="16 8"
          strokeOpacity="0.45"
        />

        {/* Inner Loop 410 Indicator */}
        <ellipse
          cx="500"
          cy="500"
          rx="265"
          ry="250"
          fill="none"
          stroke="#38BDF8"
          strokeWidth="1.4"
          strokeDasharray="12 6"
          strokeOpacity="0.55"
        />

        {/* Highway Emblem Badges & Identifiers */}
        <g fontFamily="monospace" fontSize="9" fontWeight="bold" fill="#F8FAFC" textAnchor="middle">
          {/* Loop 1604 North & South */}
          <rect x="460" y="88" width="80" height="18" rx="4" fill="#0A0F1D" stroke="#F59E0B" strokeWidth="1.5" />
          <text x="500" y="101" fill="#F59E0B" fontSize="9" letterSpacing="1">LOOP 1604</text>

          <rect x="460" y="882" width="80" height="18" rx="4" fill="#0A0F1D" stroke="#F59E0B" strokeWidth="1.5" />
          <text x="500" y="895" fill="#F59E0B" fontSize="9" letterSpacing="1">LOOP 1604</text>

          {/* Loop 410 North & South */}
          <rect x="465" y="240" width="70" height="16" rx="4" fill="#0A0F1D" stroke="#38BDF8" strokeWidth="1.4" />
          <text x="500" y="252" fill="#38BDF8" fontSize="8.5" letterSpacing="1">LOOP 410</text>

          <rect x="465" y="732" width="70" height="16" rx="4" fill="#0A0F1D" stroke="#38BDF8" strokeWidth="1.4" />
          <text x="500" y="744" fill="#38BDF8" fontSize="8.5" letterSpacing="1">LOOP 410</text>
        </g>

        {/* Interstate Route Shields */}
        <g fontFamily="sans-serif" fontSize="9" fontWeight="900" textAnchor="middle">
          {/* I-10 West Shield */}
          <rect x="150" y="200" width="34" height="20" rx="4" fill="#1E3A8A" stroke="#FFFFFF" strokeWidth="1.2" />
          <text x="167" y="214" fill="#FFFFFF">I-10</text>

          {/* I-10 East Shield */}
          <rect x="820" y="560" width="34" height="20" rx="4" fill="#1E3A8A" stroke="#FFFFFF" strokeWidth="1.2" />
          <text x="837" y="574" fill="#FFFFFF">I-10</text>

          {/* I-35 North Shield */}
          <rect x="800" y="210" width="34" height="20" rx="4" fill="#1E3A8A" stroke="#FFFFFF" strokeWidth="1.2" />
          <text x="817" y="224" fill="#FFFFFF">I-35</text>

          {/* I-35 South Shield */}
          <rect x="200" y="770" width="34" height="20" rx="4" fill="#1E3A8A" stroke="#FFFFFF" strokeWidth="1.2" />
          <text x="217" y="784" fill="#FFFFFF">I-35</text>
        </g>

        {/* Downtown San Antonio YoungFire Sanctuary Beacon Pin */}
        <g>
          <circle cx="500" cy="500" r="32" fill="none" stroke="#F59E0B" strokeWidth="1.2" opacity="0.4" className="animate-ping" />
          <circle cx="500" cy="500" r="20" fill="none" stroke="#F59E0B" strokeWidth="1.6" opacity="0.8" />
          <circle cx="500" cy="500" r="8" fill="#F59E0B" />
          <circle cx="500" cy="500" r="3.5" fill="#000000" />
        </g>

        {/* Downtown Sanctuary Core Label */}
        <g textAnchor="middle">
          <text
            x="500"
            y="445"
            fill="#F8FAFC"
            fontFamily="sans-serif"
            fontSize="11"
            fontWeight="900"
            letterSpacing="2.5"
            opacity="0.95"
          >
            DOWNTOWN SAN ANTONIO
          </text>
          <text
            x="500"
            y="570"
            fill="#F59E0B"
            fontFamily="monospace"
            fontSize="9"
            fontWeight="bold"
            letterSpacing="2"
            opacity="0.95"
          >
            SANCTUARY HUB &bull; JOSHUA HOUSE OF WORSHIP
          </text>
        </g>

        {/* Cartographic Coordinates Footer */}
        <g fontFamily="monospace" fontSize="8.5" fill="#94A3B8" opacity="0.85">
          <text x="24" y="36">SAN ANTONIO METROPOLITAN GRID &bull; BEXAR COUNTY, TEXAS</text>
          <text x="24" y="52">LAT: 29.4241&deg; N &bull; LON: 98.4936&deg; W &bull; ELEV: 650 FT</text>
          <text x="976" y="36" textAnchor="end">HEMISFAIR &bull; ALAMO PLAZA &bull; STONE OAK</text>
          <text x="976" y="52" textAnchor="end">EST. 1718 &bull; JHOW EST. 2015</text>
        </g>
      </svg>
    </div>
  );
};

export default SanAntonioVectorMap;
