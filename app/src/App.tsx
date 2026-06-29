import { useState, useCallback, useEffect, useRef } from 'react';
import { DataStoreProvider, useDataStore } from '@/lib/dataStore';
import FolderPicker from '@/components/FolderPicker';
import WorkspaceLayout from '@/components/WorkspaceLayout';
import BookShelf from '@/components/BookShelf';
import BookReader from '@/components/BookReader';
import BookSearch from '@/components/BookSearch';
import Community from '@/components/Community';
import Profile from '@/components/Profile';
import { loadBooks } from '@/lib/bookService';
import { fetchLatestUpdate } from '@/lib/supabase';
import type { Book } from '@/types/book';

const FIRST_RUN_KEY = 'zhongjing_first_run';

type Page = 'yian' | 'bookshelf' | 'reader' | 'book-search';
type MainTab = 'yian' | 'dianji' | 'community' | 'profile';

interface NavState {
  page: Page;
  bookId?: string;
  searchQuery?: string;
  lineIndex?: number;
  globalQuery?: string;
}

const CURRENT_VERSION_CODE = 10200;

function AppContent() {
  const { state, selectFolder } = useDataStore();

  const [navStack, setNavStack] = useState<NavState[]>([{ page: 'yian' }]);
  const [activeTab, setActiveTab] = useState<MainTab>('yian');
  const [books, setBooks] = useState<Book[]>([]);
  const [updateInfo, setUpdateInfo] = useState<{ version: string; url: string; force: boolean } | null>(null);

  const current = navStack.length > 0 ? navStack[navStack.length - 1] : { page: 'yian' as Page };

  // 非首次使用时自动初始化，跳过"开始使用"页面
  useEffect(() => {
    if (!state.isFolderSelected && localStorage.getItem(FIRST_RUN_KEY)) {
      selectFolder();
    }
  }, [state.isFolderSelected, selectFolder]);

  useEffect(() => {
    if (activeTab === 'dianji') {
      loadBooks().then((loaded) => {
        setBooks(loaded);
      }).catch((err) => {
        console.error('[App] Failed to load books:', err);
      });
    }
  }, [activeTab, current?.page]);

  // 热更新检查
  useEffect(() => {
    let cancelled = false;
    async function checkUpdate() {
      try {
        const update = await fetchLatestUpdate(CURRENT_VERSION_CODE);
        if (cancelled || !update) return;
        setUpdateInfo({
          version: update.version,
          url: update.apk_url,
          force: update.force_update,
        });
      } catch {
        // ignore network errors
      }
    }
    checkUpdate();
    const timer = setInterval(checkUpdate, 1000 * 60 * 30); // 每30分钟检查一次
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  const navigateTo = useCallback((newState: NavState) => {
    setNavStack((prev) => [...prev, newState]);
  }, []);

  const goBack = useCallback(() => {
    setNavStack((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.slice(0, -1);
      const target = next[next.length - 1];
      if (target.page === 'yian') setActiveTab('yian');
      else if (target.page === 'bookshelf') setActiveTab('dianji');
      return next;
    });
  }, []);

  const handleTabSwitch = useCallback((tab: MainTab) => {
    setActiveTab(tab);
    if (tab === 'yian') {
      setNavStack([{ page: 'yian' }]);
    } else if (tab === 'dianji') {
      setNavStack([{ page: 'bookshelf' }]);
      loadBooks().then(setBooks);
    } else {
      setNavStack([]);
    }
  }, []);

  function handleDownloadUpdate() {
    if (!updateInfo?.url) return;
    if (typeof window !== 'undefined' && (window as any).AndroidBridge?.installApk) {
      (window as any).AndroidBridge.installApk(updateInfo.url);
      return;
    }
    // 降级方案：尝试多种方式触发系统下载
    try {
      // 方式1：直接跳转，让 WebView/系统处理下载
      window.location.href = updateInfo.url;
      alert('正在跳转下载，请在通知栏查看下载进度。');
      return;
    } catch {
      // ignore
    }
    // 方式2：尝试用 intent 协议唤起系统浏览器/下载器
    try {
      const intentUrl = `intent:${updateInfo.url}#Intent;action=android.intent.action.VIEW;type=application/vnd.android.package-archive;end;`;
      window.location.href = intentUrl;
      return;
    } catch {
      // ignore
    }
    // 方式3：最后尝试新窗口打开
    window.open(updateInfo.url, '_blank');
    alert('请在新页面中点击下载 APK 文件。');
  }

  // 边缘滑动返回上一级
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const startX = touchStartX.current;
    const screenWidth = window.innerWidth;
    // 水平滑动且从屏幕边缘（左30px或右30px）开始，滑动距离>60px
    if (Math.abs(dx) > 60 && Math.abs(dy) < 100) {
      if ((startX < 30 && dx > 0) || (startX > screenWidth - 30 && dx < 0)) {
        goBack();
      }
    }
  }

  if (!state.isFolderSelected) {
    return <FolderPicker />;
  }

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 热更新提示条 */}
      {updateInfo && (
        <div className="shrink-0 px-3 py-1.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
          <span className="text-xs text-amber-800">
            发现新版本 {updateInfo.version} {updateInfo.force ? '(强制更新)' : ''}
          </span>
          <button
            onClick={handleDownloadUpdate}
            className="text-xs px-2 py-0.5 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
          >
            立即更新
          </button>
        </div>
      )}

      {/* Global Tab Bar */}
      <div className="shrink-0 flex items-center justify-between px-4 h-11 bg-white border-b border-gray-200 z-30">
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleTabSwitch('yian')}
            className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'yian' ? 'text-amber-700 bg-amber-50 font-medium' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            医案库{state.records.length > 0 && <span className="ml-0.5 text-[10px]">({state.records.length})</span>}
          </button>
          <button
            onClick={() => handleTabSwitch('dianji')}
            className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'dianji' ? 'text-amber-700 bg-amber-50 font-medium' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            典籍库{books.length > 0 && <span className="ml-0.5 text-[10px]">({books.length})</span>}
          </button>
          <button
            onClick={() => handleTabSwitch('community')}
            className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'community' ? 'text-amber-700 bg-amber-50 font-medium' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            社区
          </button>
          <button
            onClick={() => handleTabSwitch('profile')}
            className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'profile' ? 'text-amber-700 bg-amber-50 font-medium' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            我的
          </button>
        </div>
      </div>

      {/* Page Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'yian' && current.page === 'yian' && <WorkspaceLayout />}

        {activeTab === 'dianji' && current.page === 'bookshelf' && (
          <BookShelf
            onOpenBook={(bookId) => navigateTo({ page: 'reader', bookId })}
            onBack={goBack}
            onGlobalSearch={(query) => {
              navigateTo({ page: 'book-search', globalQuery: query });
            }}
          />
        )}

        {activeTab === 'dianji' && current.page === 'reader' && current.bookId && (
          <BookReader
            bookId={current.bookId}
            onBack={goBack}
            initialSearchQuery={current.searchQuery}
            initialLineIndex={current.lineIndex}
          />
        )}

        {activeTab === 'dianji' && current.page === 'book-search' && (
          <BookSearch
            books={books}
            initialQuery={current.globalQuery || ''}
            onOpenBook={(bookId, query, lineIdx) => navigateTo({ page: 'reader', bookId, searchQuery: query, lineIndex: lineIdx })}
            onBack={goBack}
          />
        )}

        {activeTab === 'community' && <Community />}
        {activeTab === 'profile' && <Profile onOpenPost={(postId) => { setActiveTab('community'); setTimeout(() => { window.dispatchEvent(new CustomEvent('navigate-to-post', { detail: postId })); }, 100); }} />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <DataStoreProvider>
      <AppContent />
    </DataStoreProvider>
  );
}
