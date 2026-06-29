export interface Book {
  id: string;
  title: string;
  author: string;
  content: string;      // Markdown content
  importDate: string;
  lastRead?: string;
  readPosition?: number; // scroll position
  coverColor?: string;
  comments: BookComment[];
}

export interface BookComment {
  id: string;
  chapterTitle: string; // which heading this comment is attached to
  content: string;
  createdAt: string;
}

export interface SearchResult {
  bookId: string;
  bookTitle: string;
  chapterTitle: string;
  excerpt: string;      // ~200 chars around match
  keywords: string[];
  position: number;     // char position in content
  lineNumber: number;
}

export interface BookSearchState {
  query: string;
  results: SearchResult[];
  currentIndex: number;
  isGlobal: boolean;    // true = across all books, false = within current book
}
