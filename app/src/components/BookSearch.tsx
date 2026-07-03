import { useState, useMemo, useEffect } from 'react';
import type { Book } from '@/types/book';
import { searchBooksV2, type BookSearchGroup } from '@/lib/bookService';
import { exportSearchResults } from '@/lib/bookService';
import { Search, ArrowLeft, ChevronDown, ChevronUp, Share2 } from 'lucide-react';

interface BookSearchProps {
  books: Book[];
  initialQuery?: string;
  onOpenBook: (bookId: string, searchQuery: string, lineIndex: number) => void;
  onBack: () => void;
}

export default function BookSearch({ books, initialQuery = '', onOpenBook, onBack }: BookSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [searched, setSearched] = useState(!!initialQuery);
  const [collapsedBooks, setCollapsedBooks] = useState<Set<string>>(new Set());
  const [collapsedChapters, setCollapsedChapters] = useState<Set<string>>(new Set());

  // Perform search
  const { groups, total } = useMemo(() => {
    if (!searched || !query.trim()) return { groups: [] as BookSearchGroup[], total: 0 };
    const result = searchBooksV2(books, query);
    return { groups: result.groups, total: result.total };
  }, [books, query, searched]);

  const handleSearch = () => {
    if (!query.trim()) return;
    setSearched(true);
    setCollapsedBooks(new Set());
    setCollapsedChapters(new Set());
  };

  // Auto-search when initialQuery changes
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      setQuery(initialQuery);
      setSearched(true);
      setCollapsedBooks(new Set());
      setCollapsedChapters(new Set());
    }
  }, [initialQuery]);

  // Toggle book collapse
  const toggleBook = (bookId: string) => {
    setCollapsedBooks((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) next.delete(bookId); else next.add(bookId);
      return next;
    });
  };

  // Toggle chapter collapse
  const toggleChapter = (key: string) => {
    setCollapsedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Handle export
  const handleExport = () => {
    if (groups.length === 0) return;
    exportSearchResults(groups, query, total);
  };

  // Count books
  const bookCount = groups.length;

  return (
    <div className="h-screen flex flex-col bg-[#fdfbf7]">
      {/* Header with search query */}
      <div className="shrink-0 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3 px-4 h-12">
          <button onClick={onBack} className="p-1.5 text-gray-600 hover:text-[#802008] hover:bg-[#fdf2f2] rounded">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              placeholder="输入关键词检索..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>
          <button onClick={handleSearch} className="px-4 py-1.5 text-sm font-medium text-white bg-[#802008] hover:bg-[#601005] rounded-lg">
            检索
          </button>
        </div>

        {/* Stats bar */}
        {searched && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              找到 <span className="text-[#601005] font-bold">{total}</span> 条段落结果
              {bookCount > 0 && <span> · <span className="text-[#601005] font-bold">{bookCount}</span> 本书</span>}
            </div>
            {total > 0 && (
              <button onClick={handleExport} className="flex items-center gap-1 text-xs text-[#601005] hover:text-[#400803]">
                <Share2 className="w-3.5 h-3.5" />导出并分享
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {!searched ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <Search className="w-10 h-10 mb-2 text-gray-300" />
            <p className="text-sm">输入关键词开始全文检索</p>
            <p className="text-xs mt-1">支持跨文件、跨行多关键词检索</p>
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            {books.length === 0 ? (
              <>
                <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                <p className="text-sm">书架为空，请先导入书籍</p>
                <p className="text-xs mt-1 text-gray-300">导入后返回此处重新检索</p>
              </>
            ) : (
              <>
                <Search className="w-10 h-10 mb-2 text-gray-300" />
                <p className="text-sm">未找到包含「{query}」的内容</p>
                <p className="text-xs mt-1 text-gray-300">共检索了 {books.length} 本书</p>
              </>
            )}
          </div>
        ) : (
          <div className="py-2">
            {groups.map((bg) => {
              const isBookCollapsed = collapsedBooks.has(bg.bookId);
              return (
                <div key={bg.bookId} className="mb-1">
                  {/* Level 1: Book header */}
                  <button
                    onClick={() => toggleBook(bg.bookId)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      {isBookCollapsed ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      <span className="text-base font-bold text-gray-800" style={{ fontFamily: 'serif' }}>《{bg.bookTitle}》</span>
                      <span className="text-xs text-gray-400">{bg.count} 条结果</span>
                    </div>
                  </button>

                  {/* Level 2: Chapters */}
                  {!isBookCollapsed && bg.chapters.map((cg) => {
                    const chKey = `${bg.bookId}-${cg.chapterTitle}`;
                    const isChCollapsed = collapsedChapters.has(chKey);
                    return (
                      <div key={chKey}>
                        {/* Chapter header */}
                        <button
                          onClick={() => toggleChapter(chKey)}
                          className="w-full flex items-center justify-between px-8 py-2 bg-gray-50/50 border-b border-gray-50"
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                            <span className="text-sm font-medium text-gray-700">{cg.chapterTitle}</span>
                            <span className="text-xs text-gray-400">{cg.count} 段</span>
                          </div>
                          {isChCollapsed ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                        </button>

                        {/* Level 3: Snippets */}
                        {!isChCollapsed && (
                          <div>
                            {cg.snippets.map((s) => (
                              <button
                                key={s.snippetIndex}
                                onClick={() => onOpenBook(bg.bookId, query, s.lineIndex)}
                                className="block w-full text-left px-6 py-3 border-b border-gray-50 hover:bg-[#fdf2f2]/20 transition-colors"
                              >
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded">节选{s.snippetIndex}</span>
                                  {s.category && <span className="px-2 py-0.5 text-[10px] bg-[#fdf2f2] text-[#601005] rounded">{s.category}</span>}
                                </div>
                                <p
                                  className="text-sm text-gray-700 leading-relaxed"
                                  dangerouslySetInnerHTML={{ __html: s.excerpt }}
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Yellow highlight style */}
      <style>{`
        .search-hl-yellow {
          background-color: #FFE566 !important;
          color: #333 !important;
          font-weight: 500 !important;
          padding: 1px 2px !important;
          border-radius: 2px !important;
          font-family: "Microsoft YaHei", "微软雅黑", sans-serif !important;
        }
        mark.search-hl-yellow {
          background-color: #FFE566;
        }
      `}</style>
    </div>
  );
}
