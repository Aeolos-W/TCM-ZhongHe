import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { fetchPosts } from '@/lib/supabase';
import type { CommunityPost } from '@/types/community';
import { MessageSquare, Eye, Clock, User, Plus, Search, X, Stethoscope, FileText, HelpCircle, BookOpen } from 'lucide-react';

interface PostListProps {
  onSelectPost: (post: CommunityPost) => void;
  onCreatePost: () => void;
  refreshTrigger?: number;
}

const FILTERS = [
  { key: 'all', label: '全部', icon: null },
  { key: 'record', label: '医案分享', icon: <Stethoscope className="w-3 h-3" /> },
  { key: 'post', label: '帖子', icon: <FileText className="w-3 h-3" /> },
  { key: 'qa', label: '答疑', icon: <HelpCircle className="w-3 h-3" /> },
  { key: 'experience', label: '体会经验', icon: <BookOpen className="w-3 h-3" /> },
];

const typeColor: Record<string, string> = {
  record: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  post: 'bg-blue-50 text-blue-700 border-blue-200',
  qa: 'bg-purple-50 text-purple-700 border-purple-200',
  experience: 'bg-[#fdf2f2] text-[#601005] border-[#f5b5b5]',
};

const typeLabel: Record<string, string> = {
  record: '医案分享',
  post: '帖子',
  qa: '答疑',
  experience: '体会经验',
};

export default function PostList({ onSelectPost, onCreatePost, refreshTrigger = 0 }: PostListProps) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    loadPosts();
  }, [refreshTrigger, activeFilter]);

  async function loadPosts() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchPosts(activeFilter === 'all' ? undefined : activeFilter);
      setPosts(data);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  const filtered = posts.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.content.toLowerCase().includes(search.toLowerCase()) ||
    p.author.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 顶部栏 */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-1.5">
            <MessageSquare className="w-5 h-5 text-[#802008]" />
            仲景社区
          </h2>
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索帖子、医案、标签..."
              className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c94d4d] focus:ring-1 focus:ring-[#c94d4d]/20"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={onCreatePost}
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-[#802008] text-white text-sm rounded-lg hover:bg-[#601005] transition-colors"
          >
            <Plus className="w-4 h-4" />发布
          </button>
        </div>
        {/* 分类筛选 */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`shrink-0 flex items-center gap-1 px-3 py-1 text-xs rounded-full border transition-colors ${
                activeFilter === f.key
                  ? 'bg-[#802008] text-white border-[#802008]'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">加载中...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {search ? '没有匹配的帖子' : '暂无帖子，点击右上角发布'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((post) => (
              <div
                key={post.id}
                onClick={() => onSelectPost(post)}
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-1.5 py-0.5 text-[10px] rounded border ${typeColor[post.type] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                    {typeLabel[post.type] || '帖子'}
                  </span>
                  <h3 className="text-sm font-medium text-gray-800 line-clamp-1 flex-1">{post.title}</h3>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 mb-2">{post.content.replace(/[#*<>\[\]`]/g, ' ').slice(0, 120)}</p>
                <div className="flex items-center gap-3 text-[11px] text-gray-400">
                  <span className="flex items-center gap-0.5"><User className="w-3 h-3" />{post.author}</span>
                  <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{format(new Date(post.created_at), 'MM-dd HH:mm', { locale: zhCN })}</span>
                  <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{post.view_count}</span>
                  <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{(post as any).comment_count || 0}</span>
                </div>
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {post.tags.slice(0, 3).map((t, i) => (
                      <span key={i} className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
