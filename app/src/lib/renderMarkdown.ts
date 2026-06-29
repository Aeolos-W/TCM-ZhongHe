import { marked } from 'marked';
import DOMPurify from 'dompurify';

export function renderMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';
  // 先处理 [post:UUID] 为 markdown 链接格式
  const processed = markdown.replace(/\[post:([a-f0-9-]+)\]/g, '[引用帖子](post:$1)');
  const renderer = new marked.Renderer();
  const originalLink = renderer.link.bind(renderer);
  renderer.link = function(token: any) {
    const { href, tokens } = token;
    const text = this.parser.parseInline(tokens);
    if (href.startsWith('post:')) {
      const postId = href.slice(5);
      return `<a href="javascript:void(0)" data-post-id="${postId}" class="post-reference inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-sm hover:bg-amber-100 transition-colors" onclick="window.dispatchEvent(new CustomEvent('navigate-to-post',{detail:'${postId}'}))">📄 ${text || '引用帖子'}</a>`;
    }
    return originalLink(token);
  };
  const html = marked.parse(processed, { renderer, breaks: true, gfm: true }) as string;
  return DOMPurify.sanitize(html);
}
