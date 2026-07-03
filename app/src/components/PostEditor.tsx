import { useState, useEffect } from 'react';
import type { CommunityPost } from '@/types/community';
import { createPost, updatePost, getDisplayName } from '@/lib/supabase';
import MarkdownEditor from './MarkdownEditor';
import { ArrowLeft, Save, Stethoscope, FileText, HelpCircle, BookOpen } from 'lucide-react';

interface PostEditorProps {
  editPost?: CommunityPost | null;
  onBack: () => void;
  onSaved: () => void;
}

const TYPE_OPTIONS = [
  { value: 'record' as const, label: '医案分享', icon: <Stethoscope className="w-3.5 h-3.5" /> },
  { value: 'post' as const, label: '帖子', icon: <FileText className="w-3.5 h-3.5" /> },
  { value: 'qa' as const, label: '答疑', icon: <HelpCircle className="w-3.5 h-3.5" /> },
  { value: 'experience' as const, label: '体会经验', icon: <BookOpen className="w-3.5 h-3.5" /> },
];

export default function PostEditor({ editPost, onBack, onSaved }: PostEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<CommunityPost['type']>('post');
  const [author, setAuthor] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const isEditing = !!editPost;

  useEffect(() => {
    if (editPost) {
      setTitle(editPost.title);
      setContent(editPost.content);
      setType(editPost.type);
      setAuthor(editPost.author || '');
      setTags(editPost.tags || []);
    } else {
      setTitle('');
      setContent('');
      setType('post');
      setAuthor('');
      setTags([]);
      // 自动填充默认署名
      getDisplayName().then((name) => {
        if (!editPost) setAuthor(name);
      });
    }
  }, [editPost?.id]);

  async function handleSave() {
    if (!title.trim()) { alert('请输入标题'); return; }
    if (!content.trim()) { alert('请输入内容'); return; }
    setSaving(true);
    try {
      const displayName = author.trim() || (await getDisplayName());
      if (isEditing && editPost) {
        await updatePost(editPost.id, {
          title: title.trim(),
          content: content.trim(),
          type,
          author: displayName,
          tags,
        });
      } else {
        await createPost({
          title: title.trim(),
          content: content.trim(),
          type,
          author: displayName,
          tags,
          source_record_id: null,
          source_record_title: null,
        });
      }
      onSaved();
    } catch (err: any) {
      alert('保存失败: ' + (err.message || '未知错误'));
    } finally {
      setSaving(false);
    }
  }

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) { setTags([...tags, t]); }
    setTagInput('');
  }

  function removeTag(i: number) { setTags(tags.filter((_, idx) => idx !== i)); }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 顶部栏 */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-gray-200">
        <button onClick={onBack} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="flex-1 text-sm font-medium text-gray-800">{isEditing ? '编辑帖子' : '发布帖子'}</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#802008] text-white text-xs rounded-lg hover:bg-[#601005] disabled:opacity-50 transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? '保存中...' : '发布'}
        </button>
      </div>

      {/* 编辑区 */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* 内容类型 */}
        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-1.5 block">内容类型</label>
          <div className="flex items-center gap-2 flex-wrap">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setType(opt.value)}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  type === opt.value
                    ? 'bg-[#fdf2f2] text-[#601005] border-[#f5b5b5]'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 标题 */}
        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-1 block">标题</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="请输入标题..."
            className="w-full text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#c94d4d] focus:ring-1 focus:ring-[#c94d4d]/20 transition-all"
          />
        </div>

        {/* 内容 - Markdown 编辑器 */}
        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-1 block">内容</label>
          <MarkdownEditor
            value={content}
            onChange={setContent}
            onSave={handleSave}
            enableExtended={true}
            placeholder="在此输入内容，支持 Markdown 格式..."
          />
        </div>

        {/* 署名 */}
        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-1 block">署名（选填）</label>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="请输入署名（选填）..."
            className="w-full text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#c94d4d] focus:ring-1 focus:ring-[#c94d4d]/20 transition-all"
          />
        </div>

        {/* 标签 */}
        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-1 block">标签</label>
          <div className="flex items-center gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              placeholder="输入标签，按回车添加..."
              className="flex-1 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#c94d4d] focus:ring-1 focus:ring-[#c94d4d]/20 transition-all"
            />
            <button onClick={addTag} className="px-3 py-2 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200">添加</button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {tags.map((tag, i) => (
                <span key={`${tag}-${i}`} className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs bg-[#fdf2f2] text-[#601005] border border-[#f5b5b5]/60 rounded-md">
                  {tag}
                  <button onClick={() => removeTag(i)} className="text-[#c94d4d] hover:text-[#802008]">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
