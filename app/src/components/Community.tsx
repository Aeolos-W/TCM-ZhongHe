import { useState, useEffect, useCallback } from 'react';
import type { CommunityPost } from '@/types/community';
import PostList from './PostList';
import PostDetail from './PostDetail';
import PostEditor from './PostEditor';

type CommunityView = 'list' | 'detail' | 'editor';

export default function Community() {
  const [view, setView] = useState<CommunityView>('list');
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [editPost, setEditPost] = useState<CommunityPost | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const handler = (e: CustomEvent<string>) => {
      // 帖子引用跳转：重新加载该帖子并显示详情
      const postId = e.detail;
      import('@/lib/supabase').then(({ fetchPostById }) => {
        fetchPostById(postId).then((post) => {
          if (post) {
            setSelectedPost(post);
            setView('detail');
          }
        });
      });
    };
    window.addEventListener('navigate-to-post', handler as EventListener);
    return () => window.removeEventListener('navigate-to-post', handler as EventListener);
  }, []);

  const handleSelectPost = useCallback((post: CommunityPost) => {
    setSelectedPost(post);
    setView('detail');
  }, []);

  const handleCreatePost = useCallback(() => {
    setEditPost(null);
    setView('editor');
  }, []);

  const handleEditPost = useCallback((post: CommunityPost) => {
    setEditPost(post);
    setView('editor');
  }, []);

  const handleBackToList = useCallback(() => {
    setView('list');
    setSelectedPost(null);
    setEditPost(null);
  }, []);

  const handleSaved = useCallback(() => {
    setView('list');
    setEditPost(null);
    setRefreshTrigger((v) => v + 1);
  }, []);

  return (
    <div className="h-full">
      {view === 'list' && (
        <PostList
          onSelectPost={handleSelectPost}
          onCreatePost={handleCreatePost}
          refreshTrigger={refreshTrigger}
        />
      )}
      {view === 'detail' && selectedPost && (
        <PostDetail
          post={selectedPost}
          onBack={handleBackToList}
          onEdit={handleEditPost}
        />
      )}
      {view === 'editor' && (
        <PostEditor
          editPost={editPost}
          onBack={handleBackToList}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
