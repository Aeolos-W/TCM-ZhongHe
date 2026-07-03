import { useState, useEffect, useRef } from 'react';
import type { Book } from '@/types/book';
import { loadBooks, importBookFromFile, deleteBook, saveBook } from '@/lib/bookService';
import { isWebView } from '@/lib/fileSystemService';
import { Search, Upload, Trash2, BookOpen, ArrowLeft, Download, FolderPlus } from 'lucide-react';

// Declare the global callback for book import
declare global {
  interface Window {
    onBookImportComplete?: (fileName: string, content: string) => void;
    onImportComplete?: (jsonContent: string) => void;
  }
}

interface BookShelfProps {
  onOpenBook: (bookId: string) => void;
  onBack: () => void;
  onGlobalSearch?: (query: string) => void; // Search across all books
}

/** Generate a traditional Chinese book cover as SVG data URL */
function generateBookCover(title: string, color: string): string {
  const shortTitle = title.slice(0, 6);
  const chars = shortTitle.split('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160" viewBox="0 0 120 160">
    <rect width="120" height="160" fill="${color}" rx="2"/>
    <rect x="8" y="8" width="104" height="144" fill="none" stroke="#f5e6c8" stroke-width="1.5" rx="1"/>
    <rect x="12" y="20" width="30" height="120" fill="#f5e6c8" rx="1" opacity="0.9"/>
    ${chars.map((c, i) => `<text x="27" y="${42 + i * 22}" font-family="serif" font-size="16" fill="#333" text-anchor="middle" font-weight="bold">${c}</text>`).join('')}
    <line x1="100" y1="15" x2="100" y2="145" stroke="#f5e6c8" stroke-width="0.5" opacity="0.3"/>
    <line x1="102" y1="15" x2="102" y2="145" stroke="#f5e6c8" stroke-width="0.5" opacity="0.3"/>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

export default function BookShelf({ onOpenBook, onBack, onGlobalSearch }: BookShelfProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBooks().then((b) => { setBooks(b); setLoading(false); });
  }, []);

  const refresh = async () => {
    setLoading(true);
    const b = await loadBooks();
    setBooks(b);
    setLoading(false);
  };

  // Browser: handle file input change
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importBookFromFile(file);
    await refresh();
    e.target.value = '';
  };

  // WebView: use JS Bridge native file picker
  const handleImportClick = () => {
    if (isWebView()) {
      // Register callback for native to call back with file content
      window.onBookImportComplete = async (fileName: string, content: string) => {
        try {
          const { importBookFromText } = await import('@/lib/bookService');
          await importBookFromText(fileName, content);
          await refresh();
          if (window.AndroidBridge) {
            window.AndroidBridge.showToast(`《${fileName.replace(/\.md$|\.txt$/i, '')}》导入成功`);
          }
        } catch (err: any) {
          if (window.AndroidBridge) {
            window.AndroidBridge.showToast('导入失败：' + (err.message || '未知错误'));
          }
        }
        window.onBookImportComplete = undefined;
      };
      // Call native to open file picker
      if (window.AndroidBridge) {
        window.AndroidBridge.importData();
      }
    } else {
      // Browser: use hidden file input
      fileInputRef.current?.click();
    }
  };

  // 批量导出
  const handleBatchExport = async () => {
    const allBooks = await loadBooks();
    if (allBooks.length === 0) {
      alert('书架为空，没有可导出的书籍');
      return;
    }
    const json = JSON.stringify(allBooks, null, 2);
    if (isWebView() && window.AndroidBridge) {
      window.AndroidBridge.exportData(json);
    } else {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `书架备份_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // 批量导入（浏览器模式）
  const handleBatchFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    let success = 0;
    for (const file of Array.from(files)) {
      try {
        await importBookFromFile(file);
        success++;
      } catch (err) {
        console.error('导入失败:', file.name, err);
      }
    }
    await refresh();
    alert(`成功导入 ${success} / ${files.length} 本书籍`);
    e.target.value = '';
  };

  // WebView: batch import via native bridge
  const handleBatchImportClick = () => {
    if (isWebView()) {
      // Handle JSON book array / single book object (imported as medical-record JSON by native)
      window.onImportComplete = async (jsonContent: string) => {
        try {
          const data = JSON.parse(jsonContent);
          let count = 0;
          if (Array.isArray(data)) {
            for (const item of data) {
              if (item.id && item.title && typeof item.content === 'string') {
                await saveBook(item as Book);
                count++;
              }
            }
          } else if (data.id && data.title && typeof data.content === 'string') {
            await saveBook(data as Book);
            count = 1;
          }
          await refresh();
          if (count > 0) {
            window.AndroidBridge?.showToast(`成功导入 ${count} 本书籍`);
          } else {
            window.AndroidBridge?.showToast('导入失败：未识别到有效的书籍数据');
          }
        } catch (err: any) {
          window.AndroidBridge?.showToast('导入失败：' + (err.message || '格式错误'));
        }
        window.onImportComplete = undefined;
      };
      // Handle plain text / markdown files
      window.onBookImportComplete = async (fileName: string, content: string) => {
        try {
          const { importBookFromText } = await import('@/lib/bookService');
          await importBookFromText(fileName, content);
          await refresh();
          if (window.AndroidBridge) {
            window.AndroidBridge.showToast(`《${fileName.replace(/\.md$|\.txt$/i, '')}》导入成功`);
          }
        } catch (err: any) {
          if (window.AndroidBridge) {
            window.AndroidBridge.showToast('导入失败：' + (err.message || '未知错误'));
          }
        }
      };
      if (window.AndroidBridge) {
        window.AndroidBridge.importData();
      }
    } else {
      batchFileInputRef.current?.click();
    }
      };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`确定删除《${title}》？`)) return;
    await deleteBook(id);
    await refresh();
  };

  const filteredBooks = filter
    ? books.filter((b) => b.title.includes(filter) || b.author.includes(filter) || b.content.includes(filter))
    : books;

  return (
    <div className="h-screen flex flex-col bg-[#fdfbf7]">
      {/* Header */}
      <div className="shrink-0 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-1.5 text-gray-600 hover:text-[#802008] hover:bg-[#fdf2f2] rounded transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold text-gray-800">本地书架</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleBatchExport} className="flex items-center gap-1 px-3 py-1.5 text-xs text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-md transition-colors">
              <Download className="w-3.5 h-3.5" />批量导出
            </button>
            <button onClick={handleBatchImportClick} className="flex items-center gap-1 px-3 py-1.5 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors">
              <FolderPlus className="w-3.5 h-3.5" />批量导入
            </button>
            <input ref={batchFileInputRef} type="file" accept=".md,.txt,.json" multiple onChange={handleBatchFileChange} className="hidden" />
            <button onClick={handleImportClick} className="flex items-center gap-1 px-3 py-1.5 text-xs text-[#601005] bg-[#fdf2f2] hover:bg-[#f9d6d6] rounded-md transition-colors">
              <Upload className="w-3.5 h-3.5" />导入书籍
            </button>
            <input ref={fileInputRef} type="file" accept=".md,.txt,.json" onChange={handleFileChange} className="hidden" />
          </div>
        </div>
        {/* Search - filters bookshelf locally, Enter triggers global search */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filter.trim() && onGlobalSearch) {
                    onGlobalSearch(filter.trim());
                  }
                }}
                placeholder="搜索书名，回车全文检索..."
                className="flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
              />
            </div>
            <button
              onClick={() => { if (filter.trim() && onGlobalSearch) onGlobalSearch(filter.trim()); }}
              className="px-3 py-2 text-xs bg-[#802008] text-white rounded-lg hover:bg-[#601005] transition-colors shrink-0"
            >
              全文检索
            </button>
          </div>
        </div>
      </div>

      {/* Book Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">加载中...</div>
        ) : books.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-gray-400">
            <BookOpen className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm mb-2">书架为空</p>
            <p className="text-xs">点击"导入书籍"添加 Markdown 或文本文件</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {filteredBooks.map((book) => (
              <div key={book.id} className="group flex flex-col items-center">
                <button
                  onClick={() => onOpenBook(book.id)}
                  className="relative w-full aspect-[3/4] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <img
                    src={generateBookCover(book.title, book.coverColor || '#8B4513')}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(book.id, book.title); }}
                    className="absolute top-1 right-1 p-1 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </button>
                </button>
                <span className="mt-2 text-xs text-gray-700 text-center line-clamp-2 leading-tight" style={{ fontFamily: 'serif' }}>
                  {book.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
