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
      className={`h-full w-full flex flex-col items-center transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'linear-gradient(180deg, #f5f0e6 0%, #f8f4ec 50%, #fdfbf7 100%)' }}
    >
      {/* Top section: icon image centered */}
      <div className="flex-1 flex items-center justify-center w-full px-8 pt-8">
        <img
          src="/splash-icon.png"
          alt="众合中医"
          className="max-w-full max-h-full object-contain"
          style={{ maxHeight: '55vh' }}
        />
      </div>

      {/* Bottom section: text */}
      <div className="shrink-0 pb-12 pt-4 flex items-center justify-center w-full px-8">
        <img
          src="/splash-text.png"
          alt="众合 — 集众腋之裘，合众家之籍。"
          className="max-w-full object-contain"
          style={{ maxWidth: '280px' }}
        />
      </div>
    </div>
  );
}
