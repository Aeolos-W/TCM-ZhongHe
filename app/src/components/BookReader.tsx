import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { Book, BookComment } from '@/types/book';
import { loadBooks, saveBook, extractTOC, addComment, deleteComment, searchBooks } from '@/lib/bookService';
import {
  ArrowLeft, Search, MessageCircle, ChevronUp, ChevronDown, X,
  Send, Trash2
} from 'lucide-react';

// Configure DOMPurify to allow our highlight spans
const purifyConfig = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'mark', 'span',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'pre', 'code',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'a', 'img', 'hr'
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'style'],
};

interface BookReaderProps {
  bookId: string;
  onBack: () => void;
  initialSearchQuery?: string;
  initialLineIndex?: number;
}

export default function BookReader({ bookId, onBack, initialSearchQuery, initialLineIndex }: BookReaderProps) {
  const [book, setBook] = useState<Book | null>(null);
  const [showTOC, setShowTOC] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [searchResults, setSearchResults] = useState<ReturnType<typeof searchBooks>>([]);
  const [currentResultIdx, setCurrentResultIdx] = useState(0);
  const [activeSearch, setActiveSearch] = useState(!!initialSearchQuery);
  const [commentChapter, setCommentChapter] = useState('');
  const [commentText, setCommentText] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const hasInitRef = useRef(false);

  // Load book
  useEffect(() => {
    loadBooks().then((books) => {
      const b = books.find((x) => x.id === bookId);
      if (b) setBook(b);
    });
  }, [bookId]);

  // Initial search from navigation
  useEffect(() => {
    if (book && initialSearchQuery && !hasInitRef.current) {
      hasInitRef.current = true;
      const results = searchBooks([book], initialSearchQuery, bookId);
      setSearchResults(results);
      if (results.length > 0) {
        setActiveSearch(true);
        // Find the result closest to initialLineIndex
        let closestIdx = 0;
        if (initialLineIndex !== undefined) {
          let minDist = Infinity;
          results.forEach((r, i) => {
            const dist = Math.abs(r.lineNumber - initialLineIndex);
            if (dist < minDist) { minDist = dist; closestIdx = i; }
          });
        }
        setCurrentResultIdx(closestIdx);
        setTimeout(() => jumpToLine(results[closestIdx]?.lineNumber ?? initialLineIndex ?? 0), 300);
      }
    }
  }, [book, initialSearchQuery, initialLineIndex, bookId]);

  const toc = useMemo(() => book ? extractTOC(book.content) : [], [book]);
  const keywords = useMemo(() => searchQuery.trim().split(/\s+/).filter(Boolean), [searchQuery]);

  // Render HTML: highlight keywords with brown-red bold style in reader
  const renderedHtml = useMemo(() => {
    if (!book) return '';
    let md = book.content;
    if (keywords.length > 0 && activeSearch) {
      // Highlight keywords BEFORE markdown parsing
      const lines = md.split('\n');
      const processed = lines.map((line) => {
        // Don't touch headings
        if (line.match(/^#{1,6}\s/)) return line;
        // Wrap each keyword occurrence
        for (const kw of keywords) {
          if (!kw.trim()) continue;
          const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const re = new RegExp(`(${esc})`, 'gi');
          line = line.replace(re, '<span class="reader-keyword-hl">$1</span>');
        }
        return line;
      });
      md = processed.join('\n');
    }
    return DOMPurify.sanitize(marked.parse(md) as string, purifyConfig);
  }, [book, keywords, activeSearch]);

  // Jump to a specific line by scrolling
  const jumpToLine = useCallback((lineIdx: number) => {
    if (!contentRef.current || !book) return;
    const lines = book.content.split('\n');
    let charCount = 0;
    for (let i = 0; i < Math.min(lineIdx, lines.length); i++) {
      charCount += lines[i].length + 1; // +1 for newline
    }
    // Approximate scroll position based on character ratio
    const totalChars = book.content.length;
    const container = contentRef.current;
    const ratio = charCount / totalChars;
    const targetScroll = ratio * (container.scrollHeight - container.clientHeight);
    container.scrollTo({ top: Math.max(0, targetScroll - 100), behavior: 'smooth' });
  }, [book]);

  // Scroll to TOC section
  const scrollToChapter = useCallback((lineIndex: number) => {
    jumpToLine(lineIndex);
    setShowTOC(false);
  }, [jumpToLine]);

  // In-book search
  const handleSearch = useCallback(() => {
    if (!book || !searchQuery.trim()) return;
    const results = searchBooks([book], searchQuery, book.id);
    setSearchResults(results);
    setActiveSearch(true);
    if (results.length > 0) {
      setCurrentResultIdx(0);
      setTimeout(() => jumpToLine(results[0].lineNumber), 300);
    }
  }, [book, searchQuery, jumpToLine]);

  // Navigate results
  const goNext = useCallback(() => {
    if (searchResults.length === 0) return;
    const next = (currentResultIdx + 1) % searchResults.length;
    setCurrentResultIdx(next);
    jumpToLine(searchResults[next].lineNumber);
  }, [currentResultIdx, searchResults, jumpToLine]);

  const goPrev = useCallback(() => {
    if (searchResults.length === 0) return;
    const prev = (currentResultIdx - 1 + searchResults.length) % searchResults.length;
    setCurrentResultIdx(prev);
    jumpToLine(searchResults[prev].lineNumber);
  }, [currentResultIdx, searchResults, jumpToLine]);

  const clearSearch = useCallback(() => {
    setActiveSearch(false);
    setSearchResults([]);
    setCurrentResultIdx(0);
  }, []);

  // Comments
  const handleAddComment = async () => {
    if (!book || !commentText.trim() || !commentChapter) return;
    await addComment(book.id, commentChapter, commentText.trim());
    setCommentText('');
    const books = await loadBooks();
    const updated = books.find((b) => b.id === bookId);
    if (updated) setBook(updated);
  };

  const commentsByChapter = useMemo(() => {
    const map = new Map<string, BookComment[]>();
    if (!book) return map;
    for (const c of book.comments) {
      const arr = map.get(c.chapterTitle) || [];
      arr.push(c);
      map.set(c.chapterTitle, arr);
    }
    return map;
  }, [book]);

  // Save read position on scroll
  const handleScroll = useCallback(() => {
    if (!contentRef.current || !book) return;
    const scrollRatio = contentRef.current.scrollTop / (contentRef.current.scrollHeight - contentRef.current.clientHeight || 1);
    book.readPosition = scrollRatio;
    saveBook(book).catch(() => {});
  }, [book]);

  // Restore scroll position
  useEffect(() => {
    if (book?.readPosition && contentRef.current && !initialSearchQuery) {
      const container = contentRef.current;
      const target = book.readPosition * (container.scrollHeight - container.clientHeight);
      container.scrollTop = target;
    }
  }, [book, initialSearchQuery]);

  if (!book) {
    return <div className="h-screen flex items-center justify-center text-gray-400"><p>加载中...</p></div>;
  }

  return (
    <div className="h-screen flex flex-col bg-[#fdfbf7] relative">
      {/* Top Nav */}
      <div className="shrink-0 bg-white border-b border-gray-200 z-20">
        <div className="flex items-center justify-between px-3 h-11">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={onBack} className="p-1.5 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-bold text-gray-800 truncate" style={{ fontFamily: 'serif' }}>{book.title}</h1>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={() => setShowSearchBar(!showSearchBar)} className={`p-1.5 rounded ${showSearchBar ? 'text-amber-700 bg-amber-50' : 'text-gray-500 hover:bg-gray-50'}`}>
              <Search className="w-4 h-4" />
            </button>
            <button onClick={() => setShowComments(!showComments)} className={`p-1.5 rounded relative ${showComments ? 'text-amber-700 bg-amber-50' : 'text-gray-500 hover:bg-gray-50'}`}>
              <MessageCircle className="w-4 h-4" />
              {book.comments.length > 0 && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 text-white text-[9px] rounded-full flex items-center justify-center">{book.comments.length}</span>}
            </button>
            <button onClick={() => setShowTOC(!showTOC)} className={`p-1.5 rounded ${showTOC ? 'text-amber-700 bg-amber-50' : 'text-gray-500 hover:bg-gray-50'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>
        </div>

        {/* Search input bar */}
        {showSearchBar && (
          <div className="px-3 pb-2 flex items-center gap-2">
            <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
              <Search className="w-3.5 h-3.5 text-gray-400 mr-2" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                placeholder="输入关键词检索本书..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400" />
            </div>
            <button onClick={handleSearch} className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded-md">搜索</button>
          </div>
        )}

        {/* Result counter: "关键词 1/13" navigation bar */}
        {activeSearch && searchResults.length > 0 && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-amber-50 border-t border-amber-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-800" style={{ fontFamily: '"Microsoft YaHei", sans-serif' }}>{searchQuery}</span>
              <span className="text-sm font-bold text-amber-700">{currentResultIdx + 1}/{searchResults.length}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <button onClick={goPrev} className="p-1 text-gray-500 hover:text-amber-600"><ChevronUp className="w-4 h-4" /></button>
              <button onClick={goNext} className="p-1 text-gray-500 hover:text-amber-600"><ChevronDown className="w-4 h-4" /></button>
              <button onClick={clearSearch} className="p-1 text-gray-400 hover:text-gray-600 ml-1"><X className="w-4 h-4" /></button>
            </div>
          </div>
        )}
        {activeSearch && searchResults.length === 0 && (
          <div className="px-3 py-1.5 text-xs text-gray-400 border-t border-gray-100">未找到「{searchQuery}」</div>
        )}
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* TOC */}
        {showTOC && (
          <div className="absolute inset-y-0 left-0 z-10 w-56 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100">目录</div>
            {toc.map((item) => (
              <button key={item.lineIndex} onClick={() => scrollToChapter(item.lineIndex)}
                className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-amber-50 hover:text-amber-700 transition-colors ${
                  item.level === 1 ? 'font-medium text-gray-800' : item.level === 2 ? 'pl-5 text-gray-600' : 'pl-8 text-gray-500'
                }`}>{item.title}</button>
            ))}
          </div>
        )}

        {/* Comments */}
        {showComments && (
          <div className="absolute inset-y-0 right-0 z-10 w-64 bg-white border-l border-gray-200 overflow-y-auto">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100 flex justify-between">
              <span>章节评论</span><span className="text-amber-600">{book.comments.length}条</span>
            </div>
            <div className="p-3 border-b border-gray-100">
              <select value={commentChapter} onChange={(e) => setCommentChapter(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 mb-2 outline-none">
                <option value="">选择章节...</option>
                {toc.map((t) => <option key={t.lineIndex} value={t.title}>{t.title}</option>)}
              </select>
              <div className="flex gap-1">
                <input value={commentText} onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(); }}
                  placeholder="输入评论..." className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 outline-none" />
                <button onClick={handleAddComment} className="p-1.5 bg-amber-600 text-white rounded hover:bg-amber-700"><Send className="w-3 h-3" /></button>
              </div>
            </div>
            {Array.from(commentsByChapter.entries()).map(([ch, cs]) => (
              <div key={ch} className="border-b border-gray-50">
                <div className="px-3 py-1.5 text-[11px] font-medium text-amber-700 bg-amber-50/50">{ch}</div>
                {cs.map((c) => (
                  <div key={c.id} className="px-3 py-2 flex items-start gap-2">
                    <p className="flex-1 text-xs text-gray-600 leading-relaxed">{c.content}</p>
                    <button onClick={async () => { await deleteComment(book.id, c.id); const bs = await loadBooks(); const u = bs.find((b) => b.id === bookId); if (u) setBook(u); }} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            ))}
            {book.comments.length === 0 && <p className="p-4 text-xs text-gray-400 text-center">暂无评论</p>}
          </div>
        )}

        {/* Content */}
        <div ref={contentRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="prose prose-sm max-w-none mx-auto" style={{ fontFamily: '"FangSong", "STFangSong", "仿宋", serif', lineHeight: '2.0' }}
            dangerouslySetInnerHTML={{ __html: renderedHtml }} />
        </div>
      </div>

      {/* Red-brown keyword highlight style */}
      <style>{`
        .reader-keyword-hl {
          color: #8B4513 !important;
          font-weight: bold !important;
          font-family: "Microsoft YaHei", "微软雅黑", sans-serif !important;
          background: none !important;
          border-bottom: 1px solid #DEB887;
        }
      `}</style>
    </div>
  );
}
