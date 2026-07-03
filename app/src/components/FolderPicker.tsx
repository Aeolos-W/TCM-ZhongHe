import { useDataStore } from '@/lib/dataStore';
import { useEffect, useState } from 'react';

const FIRST_RUN_KEY = 'zhongjing_first_run';

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
      className={`h-full w-full relative overflow-hidden transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{ backgroundColor: '#F7EEDD' }}
    >
      {/* Left mountain */}
      <img
        src="./splash-assets/asset_2_0.png"
        alt=""
        className="absolute left-0 opacity-90"
        style={{ bottom: '38%', width: '35%', maxWidth: '200px' }}
      />

      {/* Left cloud */}
      <img
        src="./splash-assets/asset_3_0.png"
        alt=""
        className="absolute opacity-80"
        style={{ left: '5%', top: '32%', width: '28%', maxWidth: '160px' }}
      />

      {/* Right mountain */}
      <img
        src="./splash-assets/asset_4_0.png"
        alt=""
        className="absolute right-0 opacity-90"
        style={{ bottom: '36%', width: '32%', maxWidth: '180px' }}
      />

      {/* Right cloud */}
      <img
        src="/splash-assets/asset_3_0.png"
        alt=""
        className="absolute opacity-80"
        style={{ right: '8%', top: '36%', width: '24%', maxWidth: '140px', transform: 'scaleX(-1)' }}
      />

      {/* Main tower icon - centered */}
      <img
        src="./splash-assets/asset_1_0.png"
        alt="众合"
        className="absolute"
        style={{
          left: '50%',
          top: '28%',
          transform: 'translateX(-50%)',
          width: '55%',
          maxWidth: '280px',
        }}
      />

      {/* Seal stamp - top right */}
      <img
        src="./splash-assets/asset_5_0.png"
        alt="中医"
        className="absolute"
        style={{
          right: '12%',
          top: '26%',
          width: '14%',
          maxWidth: '70px',
        }}
      />

      {/* Bottom text area */}
      <div
        className="absolute w-full flex flex-col items-center"
        style={{ bottom: '12%' }}
      >
        {/* 众合 text */}
        <div className="flex items-center justify-center gap-1 mb-2">
          <span
            className="font-bold"
            style={{
              color: '#831806',
              fontSize: 'clamp(32px, 8vw, 48px)',
              fontFamily: 'serif',
              letterSpacing: '0.15em',
            }}
          >
            众合
          </span>
        </div>

        {/* Slogan */}
        <p
          className="text-center whitespace-nowrap"
          style={{
            color: '#831806',
            fontSize: 'clamp(12px, 3.5vw, 18px)',
            fontFamily: 'serif',
            letterSpacing: '0.05em',
          }}
        >
          —集众腋之裘，合众家之籍。—
        </p>
      </div>
    </div>
  );
}
