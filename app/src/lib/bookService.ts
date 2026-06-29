import type { Book, BookComment, SearchResult } from '@/types/book';

const BOOKS_DIR = 'books';

// ========== JS Bridge Interface ==========
interface AndroidBridgeInterface {
  readFile(path: string): string | null;
  writeFile(path: string, content: string): boolean;
  deleteFile(path: string): boolean;
  listFiles(dir: string): string;
  fileExists(path: string): boolean;
  getBasePath(): string;
  showToast(message: string): void;
  exportData(jsonContent: string): void;
  importData(): void;
}

declare global {
  interface Window {
    AndroidBridge?: AndroidBridgeInterface;
    onBookImportComplete?: (fileName: string, content: string) => void;
  }
}

function isWebView(): boolean {
  return typeof window !== 'undefined' && !!window.AndroidBridge;
}

function getBackend() {
  return {
    async readFile(path: string): Promise<string | null> {
      if (!window.AndroidBridge) return null;
      return window.AndroidBridge.readFile(path);
    },
    async writeFile(path: string, content: string): Promise<void> {
      if (!window.AndroidBridge) throw new Error('No bridge');
      window.AndroidBridge.writeFile(path, content);
    },
    async deleteFile(path: string): Promise<void> {
      if (window.AndroidBridge) window.AndroidBridge.deleteFile(path);
    },
    async listFiles(dir: string): Promise<string[]> {
      if (!window.AndroidBridge) return [];
      try { return JSON.parse(window.AndroidBridge.listFiles(dir)); } catch { return []; }
    },
  };
}

// ========== Book CRUD ==========
export async function loadBooks(): Promise<Book[]> {
  const backend = getBackend();
  const books: Book[] = [];
  try {
    const files = await backend.listFiles(BOOKS_DIR);
    console.log('[BookService] listFiles("books") =>', files.length, 'files:', files);
    for (const name of files) {
      if (name.endsWith('.json')) {
        const text = await backend.readFile(`${BOOKS_DIR}/${name}`);
        if (text) {
          try {
            const book = JSON.parse(text);
            if (book.id && book.title && typeof book.content === 'string') {
              books.push(book);
              console.log('[BookService] Loaded book:', book.title, `(${book.content.length} chars)`);
            } else {
              console.warn('[BookService] Invalid book format:', name);
            }
          } catch (e) {
            console.error('[BookService] Failed to parse book:', name, e);
          }
        }
      }
    }
  } catch (e) {
    console.error('[BookService] loadBooks error:', e);
  }
  console.log('[BookService] Total loaded books:', books.length);
  return books.sort((a, b) => new Date(b.importDate).getTime() - new Date(a.importDate).getTime());
}

export async function saveBook(book: Book): Promise<void> {
  const backend = getBackend();
  await backend.writeFile(`${BOOKS_DIR}/${book.id}.json`, JSON.stringify(book));
}

export async function deleteBook(id: string): Promise<void> {
  await getBackend().deleteFile(`${BOOKS_DIR}/${id}.json`);
}

export async function importBookFromFile(file: File): Promise<Book> {
  const text = await file.text();
  return importBookFromText(file.name, text);
}

export async function importBookFromText(fileName: string, content: string): Promise<Book> {
  const title = fileName.replace(/\.md$|\.txt$|\.json$/i, '');
  const book: Book = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title,
    author: '',
    content,
    importDate: new Date().toISOString(),
    coverColor: generateCoverColor(title),
    comments: [],
  };
  await saveBook(book);
  return book;
}

function generateCoverColor(title: string): string {
  const colors = ['#8B4513', '#A0522D', '#CD853F', '#D2691E', '#B8860B', '#DAA520', '#BC8F8F', '#F4A460', '#D2B48C', '#C19A6B', '#8B7355', '#A0785A'];
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ========== TOC Extraction ==========
export function extractTOC(content: string): { level: number; title: string; lineIndex: number }[] {
  const lines = content.split('\n');
  const toc: { level: number; title: string; lineIndex: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,3})\s+(.+)$/);
    if (m) toc.push({ level: m[1].length, title: m[2].trim(), lineIndex: i });
  }
  return toc;
}

// ========== Yellow highlight for search results ==========
export function yellowHighlight(text: string, keywords: string[]): string {
  if (!keywords.length) return text;
  let result = text;
  for (const kw of keywords) {
    if (!kw.trim()) continue;
    const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(${esc})`, 'gi');
    result = result.replace(re, '<mark class="search-hl-yellow">$1</mark>');
  }
  return result;
}

// ========== Full-Text Search with 3-level structure ==========
export interface BookSearchGroup {
  bookId: string;
  bookTitle: string;
  count: number;
  chapters: ChapterSearchGroup[];
}

export interface ChapterSearchGroup {
  chapterTitle: string;
  count: number;
  snippets: SearchSnippet[];
}

export interface SearchSnippet {
  excerpt: string;
  keywords: string[];
  lineIndex: number;
  snippetIndex: number;
  category?: string; // e.g. "方药", "禁忌"
}

export function searchBooksV2(books: Book[], query: string): { groups: BookSearchGroup[]; total: number; keywords: string[] } {
  console.log('[Search] query="' + query + '", books=' + books.length);
  if (!query.trim()) return { groups: [], total: 0, keywords: [] };
  const keywords = query.trim().split(/\s+/).filter((k) => k.length > 0);
  if (keywords.length === 0) return { groups: [], total: 0, keywords: [] };
  console.log('[Search] keywords:', keywords);

  let globalSnippetIndex = 0;
  const bookGroups: BookSearchGroup[] = [];

  for (const book of books) {
    const lines = book.content.split('\n');
    const chapterGroups: ChapterSearchGroup[] = [];
    let currentChapter = book.title;
    let currentCategory = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Track chapter from headings
      const hm = line.match(/^#{1,3}\s+(.+)$/);
      if (hm) {
        currentChapter = hm[1].trim();
        currentCategory = '';
        continue;
      }

      // Track category from special markers like **方药** or *禁忌*
      const cm = line.match(/^\*\*(.+?)\*\*\s*$/);
      if (cm) {
        currentCategory = cm[1].trim();
        continue;
      }

      // Check if line contains ALL keywords (跨行多关键词)
      const lineLower = line.toLowerCase();
      const allMatch = keywords.every((k) => lineLower.includes(k.toLowerCase()));
      if (!allMatch) continue;

      // Build excerpt: ~200 chars around match, extending to neighboring lines
      let excerpt = line;
      let charsUsed = line.length;
      // Add previous line context
      if (i > 0 && lines[i - 1].length > 0 && !lines[i - 1].match(/^#{1,3}\s/)) {
        const prev = lines[i - 1];
        if (prev.length < 100) {
          excerpt = prev + ' ' + excerpt;
          charsUsed += prev.length + 1;
        }
      }
      // Add next line context
      if (charsUsed < 150 && i + 1 < lines.length && lines[i + 1].length > 0 && !lines[i + 1].match(/^#{1,3}\s/)) {
        const next = lines[i + 1];
        if (next.length < 100) {
          excerpt = excerpt + ' ' + next;
          charsUsed += next.length + 1;
        }
      }
      if (excerpt.length > 200) excerpt = excerpt.slice(0, 200) + '...';

      // Find or create chapter group
      let chGroup = chapterGroups.find((c) => c.chapterTitle === currentChapter);
      if (!chGroup) {
        chGroup = { chapterTitle: currentChapter, count: 0, snippets: [] };
        chapterGroups.push(chGroup);
      }

      chGroup.snippets.push({
        excerpt: yellowHighlight(excerpt, keywords),
        keywords: [...keywords],
        lineIndex: i,
        snippetIndex: ++globalSnippetIndex,
        category: currentCategory || undefined,
      });
      chGroup.count++;
    }

    if (chapterGroups.length > 0) {
      const totalCount = chapterGroups.reduce((s, c) => s + c.count, 0);
      bookGroups.push({
        bookId: book.id,
        bookTitle: book.title,
        count: totalCount,
        chapters: chapterGroups,
      });
    }
  }

  const total = bookGroups.reduce((s, b) => s + b.count, 0);
  console.log('[Search] Result: ' + total + ' snippets in ' + bookGroups.length + ' books');
  return { groups: bookGroups, total, keywords };
}

// Also keep old search for compatibility
export function searchBooks(books: Book[], query: string, bookId?: string): SearchResult[] {
  const { groups } = searchBooksV2(bookId ? books.filter((b) => b.id === bookId) : books, query);
  const results: SearchResult[] = [];
  for (const bg of groups) {
    for (const cg of bg.chapters) {
      for (const s of cg.snippets) {
        results.push({
          bookId: bg.bookId,
          bookTitle: bg.bookTitle,
          chapterTitle: cg.chapterTitle,
          excerpt: s.excerpt,
          keywords: s.keywords,
          position: s.lineIndex,
          lineNumber: s.lineIndex,
        });
      }
    }
  }
  return results;
}

// ========== Export ==========
export function exportSearchResults(groups: BookSearchGroup[], query: string, total: number): void {
  const lines = [
    `# 检索结果：${query}`,
    `> 共 ${total} 条结果，${groups.length} 本书`,
    `> 导出时间：${new Date().toLocaleString('zh-CN')}`,
    '',
  ];
  for (const bg of groups) {
    lines.push(`## 《${bg.bookTitle}》(${bg.count}条)`);
    for (const cg of bg.chapters) {
      lines.push(`### ${cg.chapterTitle} (${cg.count}段)`);
      for (const s of cg.snippets) {
        const tag = s.category ? `【${s.category}】` : `【节选${s.snippetIndex}】`;
        lines.push(`${tag} ${s.excerpt.replace(/<[^>]+>/g, '')}`);
      }
    }
    lines.push('');
  }
  const md = lines.join('\n');

  if (isWebView() && window.AndroidBridge) {
    window.AndroidBridge.exportData(md);
  } else {
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `检索结果_${query}_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// ========== Comments ==========
export async function addComment(bookId: string, chapterTitle: string, content: string): Promise<BookComment> {
  const books = await loadBooks();
  const book = books.find((b) => b.id === bookId);
  if (!book) throw new Error('Book not found');
  const comment: BookComment = {
    id: Date.now().toString(36),
    chapterTitle,
    content,
    createdAt: new Date().toISOString(),
  };
  book.comments.push(comment);
  await saveBook(book);
  return comment;
}

export async function deleteComment(bookId: string, commentId: string): Promise<void> {
  const books = await loadBooks();
  const book = books.find((b) => b.id === bookId);
  if (!book) return;
  book.comments = book.comments.filter((c) => c.id !== commentId);
  await saveBook(book);
}
