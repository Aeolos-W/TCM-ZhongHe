import { useState, useCallback, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { searchPostByTitle } from '@/lib/supabase';
import type { CommunityPost } from '@/types/community';
import {
  Bold, Italic, Underline, Heading1, Heading2, Heading3, Quote, List, ListOrdered,
  Thermometer, Stethoscope, Pill, ImagePlus, Eye, Edit3, Link2, Type, Palette, Search, X
} from 'lucide-react';

type EditorMode = 'edit' | 'preview';

interface MarkdownEditorProps {
  value: string;
  onChange: (v: string) => void;
  onSave?: () => void;
  /** 是否启用社区扩展工具（颜色、字号、帖子引用） */
  enableExtended?: boolean;
  placeholder?: string;
}

export default function MarkdownEditor({ value, onChange, onSave, enableExtended = false, placeholder }: MarkdownEditorProps) {
  const [mode, setMode] = useState<EditorMode>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showTitleSearch, setShowTitleSearch] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<CommunityPost[]>([]);
  const [searching, setSearching] = useState(false);

  const insert = useCallback((before: string, after: string = '') => {
    const t = textareaRef.current; if (!t) return;
    const start = t.selectionStart, end = t.selectionEnd, sel = value.slice(start, end);
    onChange(value.slice(0, start) + before + sel + after + value.slice(end));
    setTimeout(() => {
      const c = start + before.length + sel.length;
      t.focus({ preventScroll: true });
      t.setSelectionRange(c, c);
    }, 0);
  }, [value, onChange]);

  const insertImage = useCallback(() => {
    const url = prompt('请输入图片短链/URL：');
    if (url) insert(`\n![图片](${url})\n`, '');
  }, [insert]);

  const insertPostRef = useCallback(() => {
    const postId = prompt('请输入帖子 UUID：');
    if (postId) insert(`[post:${postId}]`, '');
  }, [insert]);

  const insertColor = useCallback((color: string) => {
    if (!color) return;
    insert(`<span style="color:${color}">`, '</span>');
  }, [insert]);

  const insertSize = useCallback((size: string) => {
    if (!size) return;
    insert(`<span style="font-size:${size}px">`, '</span>');
  }, [insert]);

  async function handleTitleSearch() {
    if (!searchKeyword.trim()) return;
    setSearching(true);
    try {
      const results = await searchPostByTitle(searchKeyword.trim());
      setSearchResults(results);
    } catch (err: any) {
      alert('搜索失败: ' + (err.message || '未知错误'));
    } finally {
      setSearching(false);
    }
  }

  function selectPost(post: CommunityPost) {
    insert(`[post:${post.id}]`, '');
    setShowTitleSearch(false);
    setSearchKeyword('');
    setSearchResults([]);
  }

  const baseTools = [
    { icon: <Bold className="w-4 h-4" />, action: () => insert('**', '**'), tip: '加粗' },
    { icon: <Italic className="w-4 h-4" />, action: () => insert('*', '*'), tip: '斜体' },
    { icon: <Underline className="w-4 h-4" />, action: () => insert('<u>', '</u>'), tip: '下划线' },
    { icon: <Heading1 className="w-4 h-4" />, action: () => insert('# ', '\n'), tip: 'H1' },
    { icon: <Heading2 className="w-4 h-4" />, action: () => insert('## ', '\n'), tip: 'H2' },
    { icon: <Heading3 className="w-4 h-4" />, action: () => insert('### ', '\n'), tip: 'H3' },
    { icon: <Quote className="w-4 h-4" />, action: () => insert('> ', '\n'), tip: '引用' },
    { icon: <List className="w-4 h-4" />, action: () => insert('- ', '\n'), tip: '列表' },
    { icon: <ListOrdered className="w-4 h-4" />, action: () => insert('1. ', '\n'), tip: '有序' },
  ];

  const templates = [
    { icon: <Thermometer className="w-4 h-4" />, action: () => insert('## 望闻问切\n\n**望诊**：\n**闻诊**：\n**问诊**：\n**切诊**：\n\n', ''), tip: '四诊' },
    { icon: <Stethoscope className="w-4 h-4" />, action: () => insert('## 辨证分析\n\n**主诉**：\n**辨证**：\n**治法**：\n\n', ''), tip: '辨证' },
    { icon: <Pill className="w-4 h-4" />, action: () => insert('## 处方用药\n\n| 药物 | 剂量 | 用法 |\n|------|------|------|\n|  |  |  |\n\n', ''), tip: '处方' },
    { icon: <ImagePlus className="w-4 h-4" />, action: insertImage, tip: '插入图片' },
  ];

  const defaultPlaceholder = `在此录入医案正文，支持 Markdown 语法...

## 示例
**望诊**：面色萎黄，舌质淡红，苔薄白
**闻诊**：语声低微，少气懒言
**问诊**：自述乏力纳差，大便溏薄
**切诊**：脉细弱

## 处方用药
| 药物 | 剂量 | 用法 |
|------|------|------|
| 黄芪 | 15g | 水煎服 |
| 党参 | 12g | 水煎服 |`;

  // 渲染预览：社区模式下使用自定义渲染器处理 [post:UUID]
  const previewHtml = (() => {
    if (!value) return '<em class="text-gray-400">暂无内容...</em>';
    let processed = value;
    if (enableExtended) {
      processed = value.replace(/\[post:([a-f0-9-]+)\]/g, '[引用帖子](post:$1)');
    }
    const renderer = new marked.Renderer();
    const originalLink = renderer.link.bind(renderer);
    renderer.link = function(token: any) {
      const { href, tokens } = token;
      const text = this.parser.parseInline(tokens);
      if (href.startsWith('post:')) {
        return `<span class="post-reference text-sky-600 underline decoration-sky-200 underline-offset-2">${text}</span>`;
      }
      return originalLink(token);
    };
    const html = marked.parse(processed, { renderer, breaks: true, gfm: true }) as string;
    return DOMPurify.sanitize(html);
  })();

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* 工具栏 */}
      <div className="shrink-0 flex items-center justify-between px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-0.5 overflow-x-auto">
          {baseTools.map((t, i) => <button key={i} onClick={t.action} title={t.tip} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-200/60 rounded shrink-0">{t.icon}</button>)}

          {enableExtended && (
            <>
              <div className="w-px h-4 bg-gray-200 mx-1 shrink-0" />
              {/* 字号 */}
              <div className="flex items-center gap-0.5 shrink-0" title="字号">
                <Type className="w-3.5 h-3.5 text-gray-400 ml-1" />
                <select
                  onChange={(e) => { insertSize(e.target.value); e.target.value = ''; }}
                  className="text-xs bg-white border border-gray-200 rounded px-1 py-1 text-gray-600 outline-none focus:border-amber-400"
                  defaultValue=""
                >
                  <option value="" disabled>字号</option>
                  <option value="12">12px</option>
                  <option value="14">14px</option>
                  <option value="16">16px</option>
                  <option value="18">18px</option>
                  <option value="20">20px</option>
                  <option value="24">24px</option>
                </select>
              </div>
              {/* 颜色 */}
              <div className="flex items-center gap-0.5 shrink-0" title="颜色">
                <Palette className="w-3.5 h-3.5 text-gray-400 ml-1" />
                <select
                  onChange={(e) => { insertColor(e.target.value); e.target.value = ''; }}
                  className="text-xs bg-white border border-gray-200 rounded px-1 py-1 text-gray-600 outline-none focus:border-amber-400"
                  defaultValue=""
                >
                  <option value="" disabled>颜色</option>
                  <option value="#ef4444">红色</option>
                  <option value="#f97316">橙色</option>
                  <option value="#eab308">黄色</option>
                  <option value="#22c55e">绿色</option>
                  <option value="#3b82f6">蓝色</option>
                  <option value="#a855f7">紫色</option>
                  <option value="#ec4899">粉色</option>
                  <option value="#6b7280">灰色</option>
                  <option value="#000000">黑色</option>
                </select>
              </div>
              {/* 帖子引用 */}
              <button onClick={() => setShowTitleSearch(true)} title="按标题引用帖子" className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded shrink-0"><Search className="w-4 h-4" /></button>
              <button onClick={insertPostRef} title="输入UUID引用帖子" className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded shrink-0"><Link2 className="w-4 h-4" /></button>
            </>
          )}

          <div className="w-px h-4 bg-gray-200 mx-1 shrink-0" />
          {templates.map((t, i) => <button key={`t-${i}`} onClick={t.action} title={t.tip} className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded shrink-0">{t.icon}</button>)}
        </div>
        {/* 编辑/预览切换 */}
        <div className="flex items-center bg-gray-100 rounded-md p-0.5 shrink-0 ml-2">
          <button onClick={() => setMode('edit')} className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${mode === 'edit' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Edit3 className="w-3 h-3" />编辑</button>
          <button onClick={() => setMode('preview')} className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${mode === 'preview' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Eye className="w-3 h-3" />预览</button>
        </div>
      </div>

      {/* 编辑/预览区域 */}
      <div className="bg-white">
        {mode === 'edit' ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 's' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSave?.(); } if (e.key === 'Tab') { e.preventDefault(); insert('  ', ''); } }}
            onFocus={(e) => {
              // 键盘弹出时滚动到光标位置，防止遮挡
              setTimeout(() => {
                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 300);
            }}
            placeholder={placeholder || defaultPlaceholder}
            className="w-full min-h-[300px] p-4 text-sm font-mono leading-relaxed text-gray-800 bg-[#fafafa] outline-none resize-y"
            spellCheck={false}
          />
        ) : (
          <div className="markdown-preview min-h-[300px] p-4 prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-p:leading-[1.8] prose-strong:!text-black prose-blockquote:border-l-amber-400 prose-blockquote:bg-amber-50/30 prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:rounded-r prose-table:text-sm prose-th:bg-gray-50 prose-th:font-medium prose-td:border-gray-100"
            style={{ fontFamily: '"Noto Serif SC", "Songti SC", serif' }}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        )}
        <style>{`
          .markdown-preview strong {
            font-family: "Microsoft YaHei", "PingFang SC", sans-serif !important;
            color: #000000 !important;
            font-weight: 700 !important;
          }
        `}</style>
      </div>
      {/* 底部信息栏 */}
      <div className="shrink-0 flex items-center justify-between px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-[11px] text-gray-400">
        <span>Markdown | Tab 缩进 | Ctrl+S 保存{enableExtended && ' | [post:UUID] 或 [[标题]] 引用帖子'}</span>
        <span>{value.length} 字符</span>
      </div>

      {/* 标题搜索弹窗 */}
      {showTitleSearch && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowTitleSearch(false)}>
          <div className="bg-white rounded-xl shadow-lg w-[90%] max-w-md p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-800">按标题引用帖子</h3>
              <button onClick={() => setShowTitleSearch(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <input
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSearch(); }}
                placeholder="输入帖子标题关键词..."
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-amber-400"
                autoFocus
              />
              <button
                onClick={handleTitleSearch}
                disabled={searching}
                className="px-3 py-2 bg-amber-600 text-white text-xs rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {searching ? '搜索中...' : '搜索'}
              </button>
            </div>
            <div className="max-h-[200px] overflow-y-auto space-y-1">
              {searchResults.length === 0 && !searching && searchKeyword.trim() && (
                <p className="text-xs text-gray-400 text-center py-2">未找到匹配的帖子</p>
              )}
              {searchResults.map((post) => (
                <button
                  key={post.id}
                  onClick={() => selectPost(post)}
                  className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-amber-50 rounded-lg transition-colors"
                >
                  <span className="font-medium">{post.title}</span>
                  <span className="text-gray-400 ml-2">{post.author}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
