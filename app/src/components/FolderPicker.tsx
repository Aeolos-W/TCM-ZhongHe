import { useDataStore } from '@/lib/dataStore';
import { useEffect, useState } from 'react';

const FIRST_RUN_KEY = 'zhongjing_first_run';

/** Traditional Chinese tower SVG icon */
function TowerIcon() {
  return (
    <svg viewBox="0 0 200 240" className="w-40 h-48 sm:w-48 sm:h-56">
      {/* Roof layers */}
      <path d="M100 10 L100 25" stroke="#802008" strokeWidth="2" />
      <circle cx="100" cy="8" r="3" fill="#c49a3c" />
      {/* Top roof */}
      <path d="M100 25 Q70 45 40 55 Q70 50 100 48 Q130 50 160 55 Q130 45 100 25" fill="#802008" />
      {/* Second roof */}
      <path d="M100 55 Q75 75 50 85 Q75 80 100 78 Q125 80 150 85 Q125 75 100 55" fill="#802008" />
      {/* Third roof */}
      <path d="M100 85 Q80 105 55 115 Q80 110 100 108 Q120 110 145 115 Q120 105 100 85" fill="#802008" />
      {/* Body */}
      <rect x="75" y="108" width="50" height="60" rx="2" fill="#802008" />
      {/* Door */}
      <rect x="88" y="148" width="24" height="20" rx="2" fill="#fdfbf7" />
      {/* Steps */}
      <rect x="70" y="168" width="60" height="4" rx="1" fill="#a03520" />
      <rect x="65" y="174" width="70" height="4" rx="1" fill="#a03520" />
      <rect x="60" y="180" width="80" height="4" rx="1" fill="#a03520" />
      {/* "众" character strokes integrated into tower */}
      <text x="100" y="80" textAnchor="middle" fill="#fdfbf7" fontSize="28" fontFamily="serif" fontWeight="bold">众</text>
      <text x="100" y="135" textAnchor="middle" fill="#fdfbf7" fontSize="32" fontFamily="serif" fontWeight="bold">合</text>
    </svg>
  );
}

/** Chinese seal stamp */
function SealStamp() {
  return (
    <div className="absolute right-8 top-28 sm:right-16 sm:top-32">
      <div className="border-2 border-[#802008] rounded-md px-2 py-3 bg-[#fdfbf7]/80">
        <div className="text-[#802008] text-sm font-bold writing-vertical" style={{ writingMode: 'vertical-rl' }}>中医</div>
      </div>
    </div>
  );
}

/** Mountain silhouette */
function MountainLeft() {
  return (
    <svg viewBox="0 0 120 80" className="absolute left-0 bottom-32 w-28 h-20 sm:w-36 sm:h-24 opacity-40">
      <path d="M0 80 L20 35 L40 50 L55 20 L80 45 L100 30 L120 80 Z" fill="#c4b49a" />
      <path d="M20 35 L25 45 L30 38 L35 48 L40 50" fill="none" stroke="#a09078" strokeWidth="0.5" />
    </svg>
  );
}

function MountainRight() {
  return (
    <svg viewBox="0 0 100 70" className="absolute right-0 bottom-32 w-24 h-16 sm:w-32 sm:h-20 opacity-40">
      <path d="M0 70 L25 25 L45 45 L60 15 L80 35 L100 70 Z" fill="#c4b49a" />
    </svg>
  );
}

/** Cloud decoration */
function CloudLeft() {
  return (
    <svg viewBox="0 0 100 40" className="absolute left-4 top-36 w-20 h-8 sm:w-28 sm:h-10 opacity-30">
      <path d="M10 30 Q20 10 40 20 Q55 5 75 18 Q90 12 95 25 Q85 35 60 32 Q35 38 10 30" fill="#d4c4a8" />
    </svg>
  );
}

function CloudRight() {
  return (
    <svg viewBox="0 0 80 35" className="absolute right-6 top-44 w-16 h-7 sm:w-24 sm:h-9 opacity-30">
      <path d="M5 25 Q15 8 35 15 Q50 5 70 16 Q78 12 75 22 Q65 30 40 28 Q15 32 5 25" fill="#d4c4a8" />
    </svg>
  );
}

export default function FolderPicker() {
  const { selectFolder } = useDataStore();
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setFadeOut(true), 2000);
    const timer2 = setTimeout(() => {
      localStorage.setItem(FIRST_RUN_KEY, 'true');
      selectFolder();
    }, 2500);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [selectFolder]);

  return (
    <div
      className={`flex flex-col items-center justify-center h-full w-full relative overflow-hidden transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'linear-gradient(180deg, #f5f0e6 0%, #f8f4ec 50%, #fdfbf7 100%)' }}
    >
      {/* Decorative elements */}
      <CloudLeft />
      <CloudRight />
      <MountainLeft />
      <MountainRight />
      <SealStamp />

      {/* Main content */}
      <div className="flex flex-col items-center z-10">
        {/* Tower icon */}
        <div className="mb-6">
          <TowerIcon />
        </div>
      </div>

      {/* Bottom text */}
      <div className="absolute bottom-16 sm:bottom-20 flex flex-col items-center z-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-[0.3em] text-[#802008] mb-3" style={{ fontFamily: 'serif' }}>
          众合
        </h1>
        <p className="text-sm sm:text-base text-[#802008] tracking-wider" style={{ fontFamily: 'serif' }}>
          —集众腋之裘，合众家之籍。—
        </p>
      </div>
    </div>
  );
}
