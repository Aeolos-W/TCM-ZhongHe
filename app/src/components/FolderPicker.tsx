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
      className={`h-full w-full transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      <img
        src="/splash-bg.png"
        alt="众合中医"
        className="w-full h-full object-cover"
      />
    </div>
  );
}
