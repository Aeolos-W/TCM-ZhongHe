import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { CommunityPost, CommunityComment } from '@/types/community';
import { fetchPostById, fetchComments, createComment, incrementViewCount, getCurrentUser, getDisplayName, addFavorite, removeFavorite, checkFavorite } from '@/lib/supabase';
import { ArrowLeft, MessageCircle, Send, User, Clock, Eye, ThumbsUp, Edit3, Bookmark } from 'lucide-react';

interface PostDetailProps {
  post: CommunityPost;
  onBack: () => void;
  onEdit: (post: CommunityPost) => void;
}

/** 生成 GitHub 风格 Identicon */
function generateIdenticon(seed: string, size = 36) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  const color = `hsl(${hue}, 55%, 45%)`;
  const bg = '#f3f4f6';
  const cellSize = Math.floor(size / 5);

  let rects = '';
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      const bit = (hash >> (y * 3 + x)) & 1;
      if (bit) {
        rects += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${color}"/>`;
        if (x !== 2) {
          rects += `<rect x="${(4 - x) * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${color}"/>`;
        }
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${bg}"/>${rects}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export default function PostDetail({ post, onBack, onEdit }: PostDetailProps) {
  const [fullPost, setFullPost] = useState<CommunityPost>(post);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [refTitles, setRefTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    loadDetail();
    checkOwner();
    checkFav();
  }, [post.id]);

  // 加载引用帖子的标题
  useEffect(() => {
    async function loadRefTitles() {
      const matches = fullPost.content?.match(/\[post:([a-f0-9-]+)\]/g);
      if (!matches) return;
      const ids = matches.map((m) => m.slice(6, -1));
      const uniqueIds = [...new Set(ids)];
      const titles: Record<string, string> = {};
      await Promise.all(
        uniqueIds.map(async (id) => {
          try {
            const p = await fetchPostById(id);
            if (p) titles[id] = p.title;
          } catch {
            // ignore
          }
        })
      );
      setRefTitles(titles);
    }
    loadRefTitles();
  }, [fullPost.content]);

  async function checkFav() {
    try {
      const fav = await checkFavorite(post.id);
      setIsFav(fav);
    } catch {
      // ignore
    }
  }

  async function toggleFavorite() {
    setFavLoading(true);
    try {
      if (isFav) {
        await removeFavorite(post.id);
        setIsFav(false);
      } else {
        await addFavorite(post.id);
        setIsFav(true);
      }
    } catch (err: any) {
      alert(err.message || '操作失败');
    } finally {
      setFavLoading(false);
    }
  }

  async function checkOwner() {
    const currentUser = await getCurrentUser();
    if (currentUser && post.user_id === currentUser.id) {
      setIsOwner(true);
    } else {
      setIsOwner(false);
    }
  }

  async function loadDetail() {
    try {
      await incrementViewCount(post.id);
      const [p, c] = await Promise.all([
        fetchPostById(post.id),
        fetchComments(post.id),
      ]);
      if (p) setFullPost(p);
      setComments(c);
    } catch (err) {
      console.error('加载详情失败', err);
    }
  }

  async function handleSendComment() {
    if (!commentText.trim()) return;
    setSending(true);
    try {
      const name = await getDisplayName();
      const newComment = await createComment({
        post_id: fullPost.id,
        content: commentText.trim(),
        author: name,
      });
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
    } catch (err: any) {
      alert('评论失败: ' + (err.message || '未知错误'));
    } finally {
      setSending(false);
    }
  }

  function handleContentClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    const link = target.closest('.post-reference') as HTMLElement | null;
    if (link) {
      e.preventDefault();
      const postId = link.dataset.postId;
      if (postId) {
        window.dispatchEvent(new CustomEvent('navigate-to-post', { detail: postId }));
      }
    }
  }

  // 渲染 Markdown，处理帖子引用 [post:UUID]
  const renderedContent = (() => {
    if (!fullPost.content) return '';
    const processed = fullPost.content.replace(/\[post:([a-f0-9-]+)\]/g, (_match, id) => {
      const title = refTitles[id];
      return `[${title || '引用帖子'}](post:${id})`;
    });
    const renderer = new marked.Renderer();
    const originalLink = renderer.link.bind(renderer);
    renderer.link = function(token: any) {
      const { href, tokens } = token;
      const text = this.parser.parseInline(tokens);
      if (href.startsWith('post:')) {
        const postId = href.slice(5);
        return `<a href="#" data-post-id="${postId}" class="post-reference text-sky-600 underline decoration-sky-200 underline-offset-2 hover:text-sky-700 cursor-pointer">${text}</a>`;
      }
      return originalLink(token);
    };
    const html = marked.parse(processed, { renderer, breaks: true, gfm: true }) as string;
    return DOMPurify.sanitize(html);
  })();

  const typeLabel = {
    record: '医案分享',
    post: '帖子',
    qa: '答疑',
    experience: '体会经验',
  }[fullPost.type] || '帖子';

  const typeColor = {
    record: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    post: 'bg-blue-50 text-blue-700 border-blue-200',
    qa: 'bg-purple-50 text-purple-700 border-purple-200',
    experience: 'bg-amber-50 text-amber-700 border-amber-200',
  }[fullPost.type] || 'bg-gray-50 text-gray-700 border-gray-200';

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 顶部栏 */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-gray-200">
        <button onClick={onBack} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="flex-1 text-sm font-medium text-gray-800 truncate">{fullPost.title}</h2>
        <button
          onClick={toggleFavorite}
          disabled={favLoading}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors ${isFav ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-gray-400 bg-white border-gray-200 hover:text-amber-600 hover:border-amber-300'}`}
          title={isFav ? '取消收藏' : '收藏'}
        >
          <Bookmark className="w-3 h-3" fill={isFav ? 'currentColor' : 'none'} />{isFav ? '已收藏' : '收藏'}
        </button>
        {isOwner && (
          <button
            onClick={() => onEdit(fullPost)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200"
          >
            <Edit3 className="w-3 h-3" />编辑
          </button>
        )}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 text-[10px] rounded border ${typeColor}`}>{typeLabel}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
            <span className="flex items-center gap-0.5"><User className="w-3.5 h-3.5" />{fullPost.author}</span>
            <span className="flex items-center gap-0.5"><Clock className="w-3.5 h-3.5" />{format(new Date(fullPost.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })}</span>
            <span className="flex items-center gap-0.5"><Eye className="w-3.5 h-3.5" />{fullPost.view_count}</span>
            <span className="flex items-center gap-0.5"><ThumbsUp className="w-3.5 h-3.5" />{fullPost.like_count}</span>
          </div>
          {fullPost.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {fullPost.tags.map((t, i) => (
                <span key={i} className="px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded">{t}</span>
              ))}
            </div>
          )}

          <div
            className="post-content prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-p:leading-[1.8] prose-strong:!text-black prose-blockquote:border-l-amber-400 prose-blockquote:bg-amber-50/30 prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:rounded-r prose-table:text-sm prose-th:bg-gray-50 prose-th:font-medium prose-td:border-gray-100"
            style={{ fontFamily: '"Noto Serif SC", "Songti SC", serif' }}
            dangerouslySetInnerHTML={{ __html: renderedContent }}
            onClick={handleContentClick}
          />
          <style>{`
            .post-content strong {
              font-family: "Microsoft YaHei", "PingFang SC", sans-serif !important;
              color: #000000 !important;
              font-weight: 700 !important;
            }
          `}</style>
        </div>

        {/* 评论区 */}
        <div className="border-t border-gray-200 px-4 py-3">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />评论 ({comments.length})
          </h4>

          {comments.length === 0 ? (
            <p className="text-xs text-gray-400 mb-3">暂无评论，来说两句吧</p>
          ) : (
            <div className="space-y-3 mb-4">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  {/* 头像 */}
                  <img
                    src={generateIdenticon(c.author || '匿名', 36)}
                    alt="avatar"
                    className="w-9 h-9 rounded-lg shrink-0 border border-gray-100"
                  />
                  {/* 内容区 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-amber-700">{c.author}</span>
                      <span className="text-[10px] text-gray-400">
                        {format(new Date(c.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                      </span>
                      <button
                        onClick={() => {
                          setReplyTo(c.author);
                          setCommentText(`@${c.author}: `);
                        }}
                        className="text-[10px] text-gray-400 hover:text-amber-600 ml-auto"
                      >
                        回复
                      </button>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 评论输入 */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              {replyTo && (
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[10px] text-amber-600">回复 @{replyTo}</span>
                  <button
                    onClick={() => { setReplyTo(null); setCommentText(''); }}
                    className="text-[10px] text-gray-400 hover:text-gray-600"
                  >
                    取消
                  </button>
                </div>
              )}
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="写下你的评论..."
                className="w-full min-h-[60px] max-h-[120px] p-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-amber-400 resize-y"
              />
            </div>
            <button
              onClick={handleSendComment}
              disabled={sending || !commentText.trim()}
              className="shrink-0 px-3 py-2 bg-amber-600 text-white text-xs rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
