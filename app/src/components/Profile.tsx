import { useState, useEffect } from 'react';
import { signUp, signIn, signOut, getCurrentUser, getDisplayName, getVisitorName, getUsername, setUsername, fetchFavorites } from '@/lib/supabase';
import type { CommunityPost } from '@/types/community';
import { User, LogIn, LogOut, Edit3, Save, KeyRound, Mail, ArrowRightCircle, Bookmark, MessageSquare, Clock } from 'lucide-react';

type ProfileMode = 'visitor' | 'login' | 'register' | 'logged-in';
type ProfileSubView = 'main' | 'favorites';

interface ProfileProps {
  onOpenPost?: (postId: string) => void;
}

export default function Profile({ onOpenPost }: ProfileProps) {
  const [mode, setMode] = useState<ProfileMode>('visitor');
  const [visitorName, setVisitorName] = useState(getVisitorName());
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(visitorName);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsernameState] = useState(getUsername());
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [subView, setSubView] = useState<ProfileSubView>('main');
  const [favorites, setFavorites] = useState<CommunityPost[]>([]);
  const [favLoading, setFavLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (subView === 'favorites') loadFavorites();
  }, [subView]);

  async function loadFavorites() {
    setFavLoading(true);
    try {
      const data = await fetchFavorites();
      setFavorites(data);
    } catch (err) {
      console.error('加载收藏失败', err);
    } finally {
      setFavLoading(false);
    }
  }

  async function checkAuth() {
    setAuthChecking(true);
    try {
      const user = await getCurrentUser();
      if (user) {
        setMode('logged-in');
        setUserEmail(user.email || '');
        const name = await getDisplayName();
        setUserName(name);
      }
    } finally {
      setAuthChecking(false);
    }
  }

  async function handleVisitorEnter() {
    if (tempName.trim()) {
      setVisitorName(tempName.trim());
      setVisitorName(tempName.trim());
      setEditingName(false);
      alert('已进入访客模式，可以使用社区功能');
    }
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) { alert('请输入邮箱和密码'); return; }
    setLoading(true);
    try {
      await signIn(email.trim(), password.trim());
      if (username.trim()) setUsername(username.trim());
      await checkAuth();
    } catch (err: any) {
      alert('登录失败: ' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!email.trim() || !password.trim() || !displayName.trim()) {
      alert('请填写完整信息'); return;
    }
    if (password.length < 6) { alert('密码至少6位'); return; }
    setLoading(true);
    try {
      await signUp(email.trim(), password.trim(), displayName.trim());
      if (username.trim()) setUsername(username.trim());
      alert('注册成功！请查收邮箱验证邮件（如未开启验证则可直接登录）');
      setMode('login');
    } catch (err: any) {
      alert('注册失败: ' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await signOut();
    setMode('visitor');
    setUserName('');
    setUserEmail('');
  }

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="px-4 py-6">
        {/* 顶部标题 */}
        <h2 className="text-lg font-semibold text-gray-800 text-center mb-6">我的</h2>

        {/* 加载中状态 */}
        {authChecking && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-[#f5b5b5] border-t-[#802008] rounded-full animate-spin mb-3" />
            <p className="text-xs text-gray-400">加载中...</p>
          </div>
        )}

        {/* 访客模式 */}
        {!authChecking && mode === 'visitor' && (
          <div className="bg-gradient-to-br from-[#fdf2f2] to-orange-50 border border-[#f9d6d6] rounded-xl p-5 mb-4">
            <div className="flex flex-col items-center mb-4">
              <div className="w-16 h-16 rounded-full bg-[#f5b5b5] flex items-center justify-center text-[#601005] text-2xl font-bold mb-2">
                <User className="w-8 h-8" />
              </div>
              <h3 className="text-base font-medium text-gray-800">访客模式</h3>
              <p className="text-xs text-gray-500">无需注册，输入昵称即可使用</p>
            </div>
            {editingName ? (
              <div className="flex items-center gap-2 mb-3">
                <input
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleVisitorEnter(); }}
                  placeholder="请输入昵称..."
                  className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-[#c94d4d]"
                  autoFocus
                />
                <button onClick={handleVisitorEnter} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded">
                  <Save className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 mb-3 border border-[#f5b5b5]/60">
                <span className="text-sm text-gray-700">当前昵称：{visitorName}</span>
                <button onClick={() => { setTempName(visitorName); setEditingName(true); }} className="p-1 text-gray-400 hover:text-gray-600">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <button
              onClick={handleVisitorEnter}
              className="w-full py-2 bg-[#802008] text-white text-sm rounded-lg hover:bg-[#601005] transition-colors mb-3"
            >
              <ArrowRightCircle className="w-4 h-4 inline mr-1" />进入访客模式
            </button>
          </div>
        )}

        {/* 已登录状态 */}
        {mode === 'logged-in' && (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-5 mb-4">
            <div className="flex flex-col items-center mb-4">
              <div className="w-16 h-16 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 text-2xl font-bold mb-2">
                <User className="w-8 h-8" />
              </div>
              <h3 className="text-base font-medium text-gray-800">{userName || '用户'}</h3>
              <p className="text-xs text-gray-500">{userEmail}</p>
            </div>
            <button
              onClick={() => setSubView('favorites')}
              className="w-full py-2 mb-2 bg-white text-[#601005] border border-[#f5b5b5] text-sm rounded-lg hover:bg-[#fdf2f2] transition-colors flex items-center justify-center gap-1"
            >
              <Bookmark className="w-4 h-4" />我的收藏
            </button>
            <button
              onClick={handleLogout}
              className="w-full py-2 bg-white text-gray-700 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              <LogOut className="w-4 h-4 inline mr-1" />退出登录
            </button>
          </div>
        )}

        {/* 登录 / 注册 切换 */}
        {mode !== 'logged-in' && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2 text-sm rounded-lg transition-colors ${mode === 'login' ? 'bg-[#802008] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <LogIn className="w-4 h-4 inline mr-1" />登录
              </button>
              <button
                onClick={() => setMode('register')}
                className={`flex-1 py-2 text-sm rounded-lg transition-colors ${mode === 'register' ? 'bg-[#802008] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <KeyRound className="w-4 h-4 inline mr-1" />注册
              </button>
            </div>

            {mode === 'login' && (
              <div className="space-y-3">
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsernameState(e.target.value)}
                    placeholder="用户名（用于发帖署名）"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c94d4d]"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="邮箱地址"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c94d4d]"
                  />
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="密码"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c94d4d]"
                  />
                </div>
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full py-2 bg-[#802008] text-white text-sm rounded-lg hover:bg-[#601005] disabled:opacity-50 transition-colors"
                >
                  {loading ? '登录中...' : '登录'}
                </button>
              </div>
            )}

            {mode === 'register' && (
              <div className="space-y-3">
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsernameState(e.target.value)}
                    placeholder="用户名（用于发帖署名）"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c94d4d]"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="邮箱地址"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c94d4d]"
                  />
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="密码（至少6位）"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c94d4d]"
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="显示昵称"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c94d4d]"
                  />
                </div>
                <button
                  onClick={handleRegister}
                  disabled={loading}
                  className="w-full py-2 bg-[#802008] text-white text-sm rounded-lg hover:bg-[#601005] disabled:opacity-50 transition-colors"
                >
                  {loading ? '注册中...' : '注册'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 关于 */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-2">关于</h4>
          <p className="text-xs text-gray-500 leading-relaxed">
            仲景医案录 - 社区版<br />
            支持 Markdown 编辑、帖子引用、Supabase 云端同步。<br />
            登录后可同步医案数据到云端。
          </p>
        </div>
      </div>

      {/* 收藏列表子视图 */}
      {subView === 'favorites' && (
        <div className="absolute inset-0 bg-white z-10 flex flex-col">
          <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-gray-200">
            <button onClick={() => setSubView('main')} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
              <ArrowRightCircle className="w-4 h-4 rotate-180" />
            </button>
            <h3 className="flex-1 text-sm font-medium text-gray-800">我的收藏</h3>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {favLoading ? (
              <p className="text-xs text-gray-400 text-center py-4">加载中...</p>
            ) : favorites.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">暂无收藏帖子</p>
            ) : (
              <div className="space-y-2">
                {favorites.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => { onOpenPost?.(post.id); setSubView('main'); }}
                    className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-[#fdf2f2] transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-800 line-clamp-1">{post.title}</span>
                      <span className="text-[10px] text-gray-400 shrink-0">{post.author}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-gray-400">
                      <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{post.type === 'record' ? '医案' : post.type === 'qa' ? '答疑' : post.type === 'experience' ? '体会' : '帖子'}</span>
                      <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
