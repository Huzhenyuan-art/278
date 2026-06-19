import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { HttpUtil } from '../utils/HttpUtil';
import { formatDate } from '../utils/dateUtils';
import {
    User, Mail, Phone, MapPin, Link as LinkIcon, FileText,
    Edit3, Save, X, Eye, EyeOff, Clock, Heart, MessageSquare,
    BookOpen, Type, Loader2, AlertCircle, CheckCircle2,
    Lock, RefreshCw, ChevronRight, PenLine, Award
} from 'lucide-react';

const PROFILE_TABS = [
    { key: 'profile', label: '个人资料', icon: User },
    { key: 'password', label: '修改密码', icon: Lock },
    { key: 'stats', label: '数据统计', icon: Award },
    { key: 'articles', label: '我的文章', icon: FileText },
];

const Profile = () => {
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [editData, setEditData] = useState({});
    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [stats, setStats] = useState(null);
    const [articles, setArticles] = useState([]);
    const [articlesLoading, setArticlesLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
    const [actioningIds, setActioningIds] = useState(new Set());

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        try {
            const data = await HttpUtil.get('/user/profile');
            setProfile(data);
            setEditData({
                nickname: data.nickname || '',
                avatar: data.avatar || '',
                bio: data.bio || '',
                phone: data.phone || '',
                location: data.location || '',
                website: data.website || '',
                email: data.email || ''
            });
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            setMessage({ type: 'error', text: '获取个人资料失败：' + error.message });
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            const data = await HttpUtil.get('/user/stats');
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    }, []);

    const fetchArticles = useCallback(async () => {
        setArticlesLoading(true);
        try {
            const data = await HttpUtil.get('/user/articles');
            setArticles(data);
        } catch (error) {
            console.error('Failed to fetch articles:', error);
        } finally {
            setArticlesLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfile();
        fetchStats();
        fetchArticles();
    }, [fetchProfile, fetchStats, fetchArticles]);

    const handleEditChange = (field, value) => {
        setEditData(prev => ({ ...prev, [field]: value }));
    };

    const handlePasswordChange = (field, value) => {
        setPasswordData(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            const data = await HttpUtil.put('/user/profile', editData);
            setProfile(data);
            
            const localUser = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...localUser, ...data }));
            
            setEditMode(false);
            setMessage({ type: 'success', text: '个人资料更新成功！' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error('Failed to update profile:', error);
            setMessage({ type: 'error', text: '更新失败：' + error.message });
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setSaving(true);
        setPasswordMessage({ type: '', text: '' });
        
        try {
            await HttpUtil.put('/user/password', passwordData);
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
            setPasswordMessage({ type: 'success', text: '密码修改成功！' });
            setTimeout(() => setPasswordMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error('Failed to change password:', error);
            setPasswordMessage({ type: 'error', text: '修改失败：' + error.message });
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (article) => {
        const newStatus = article.status === 'published' ? 'draft' : 'published';
        if (actioningIds.has(article.id)) return;

        setActioningIds(prev => new Set(prev).add(article.id));
        try {
            const result = await HttpUtil.patch(`/article/${article.id}/status`, { status: newStatus });
            setArticles(prev => prev.map(a =>
                a.id === article.id ? { ...a, status: result.status } : a
            ));
            fetchStats();
        } catch (error) {
            console.error('Failed to toggle status', error);
            alert('状态切换失败：' + error.message);
        } finally {
            setActioningIds(prev => {
                const next = new Set(prev);
                next.delete(article.id);
                return next;
            });
        }
    };

    const truncateContent = (content, maxLength = 80) => {
        if (!content) return '';
        let plainText = content
            .replace(/```[\s\S]*?```/g, ' ')
            .replace(/`[^`]*`/g, ' ')
            .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
            .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
            .replace(/^#{1,6}\s+/gm, '')
            .replace(/^\s*[-*+]\s+/gm, '')
            .replace(/^\s*\d+\.\s+/gm, '')
            .replace(/^>\s?/gm, '')
            .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1')
            .replace(/\|.+\|/g, ' ')
            .replace(/^---+$/gm, ' ')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (plainText.length <= maxLength) return plainText;
        return plainText.slice(0, maxLength) + '...';
    };

    const cancelEdit = () => {
        setEditData({
            nickname: profile?.nickname || '',
            avatar: profile?.avatar || '',
            bio: profile?.bio || '',
            phone: profile?.phone || '',
            location: profile?.location || '',
            website: profile?.website || '',
            email: profile?.email || ''
        });
        setEditMode(false);
        setMessage({ type: '', text: '' });
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-b-indigo-400 rounded-full animate-spin opacity-50" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
                </div>
            </div>
        );
    }

    const renderProfileTab = () => (
        <div className="space-y-6">
            {message.text && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${
                    message.type === 'success' 
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
                        : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                    {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            <div className="glass rounded-2xl p-6 border border-white/60">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                        <User className="text-blue-600" size={24} />
                        个人资料
                    </h2>
                    {!editMode ? (
                        <button
                            onClick={() => setEditMode(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-100 transition-all border border-blue-200"
                        >
                            <Edit3 size={16} />
                            编辑资料
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={cancelEdit}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-100 transition-all border border-gray-200"
                            >
                                <X size={16} />
                                取消
                            </button>
                            <button
                                onClick={handleSaveProfile}
                                disabled={saving}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {saving ? '保存中...' : '保存'}
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                        <div className="flex flex-col items-center">
                            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-extrabold shadow-xl shadow-blue-500/30">
                                {profile?.nickname?.[0] || profile?.username?.[0] || 'U'}
                            </div>
                            <div className="mt-4 text-center">
                                <div className="text-xl font-extrabold text-gray-800">
                                    {profile?.nickname || profile?.username}
                                </div>
                                <div className="text-sm text-gray-500 font-medium">@{profile?.username}</div>
                                <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600">
                                    {profile?.role === 'admin' ? '管理员' : '普通用户'}
                                </div>
                            </div>
                            {editMode && (
                                <div className="mt-4 w-full">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">头像链接</label>
                                    <input
                                        type="text"
                                        value={editData.avatar}
                                        onChange={(e) => handleEditChange('avatar', e.target.value)}
                                        placeholder="输入头像URL（可选）"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="md:col-span-2 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                                    <PenLine size={14} />
                                    昵称
                                </label>
                                {editMode ? (
                                    <input
                                        type="text"
                                        value={editData.nickname}
                                        onChange={(e) => handleEditChange('nickname', e.target.value)}
                                        placeholder="输入昵称"
                                        maxLength={50}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                                    />
                                ) : (
                                    <div className="px-4 py-2.5 bg-gray-50 rounded-xl text-gray-800 font-medium">
                                        {profile?.nickname || '-'}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                                    <Mail size={14} />
                                    邮箱
                                </label>
                                {editMode ? (
                                    <input
                                        type="email"
                                        value={editData.email}
                                        onChange={(e) => handleEditChange('email', e.target.value)}
                                        placeholder="输入邮箱地址"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                                    />
                                ) : (
                                    <div className="px-4 py-2.5 bg-gray-50 rounded-xl text-gray-800 font-medium">
                                        {profile?.email || '-'}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                                    <Phone size={14} />
                                    手机
                                </label>
                                {editMode ? (
                                    <input
                                        type="tel"
                                        value={editData.phone}
                                        onChange={(e) => handleEditChange('phone', e.target.value)}
                                        placeholder="输入手机号码"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                                    />
                                ) : (
                                    <div className="px-4 py-2.5 bg-gray-50 rounded-xl text-gray-800 font-medium">
                                        {profile?.phone || '-'}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                                    <MapPin size={14} />
                                    所在地
                                </label>
                                {editMode ? (
                                    <input
                                        type="text"
                                        value={editData.location}
                                        onChange={(e) => handleEditChange('location', e.target.value)}
                                        placeholder="输入所在城市"
                                        maxLength={100}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                                    />
                                ) : (
                                    <div className="px-4 py-2.5 bg-gray-50 rounded-xl text-gray-800 font-medium">
                                        {profile?.location || '-'}
                                    </div>
                                )}
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                                    <LinkIcon size={14} />
                                    个人网站
                                </label>
                                {editMode ? (
                                    <input
                                        type="url"
                                        value={editData.website}
                                        onChange={(e) => handleEditChange('website', e.target.value)}
                                        placeholder="https://your-website.com"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                                    />
                                ) : (
                                    <div className="px-4 py-2.5 bg-gray-50 rounded-xl text-gray-800 font-medium">
                                        {profile?.website ? (
                                            <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                {profile.website}
                                            </a>
                                        ) : '-'}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">个人简介</label>
                            {editMode ? (
                                <textarea
                                    value={editData.bio}
                                    onChange={(e) => handleEditChange('bio', e.target.value)}
                                    placeholder="介绍一下你自己..."
                                    rows={4}
                                    maxLength={500}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm resize-none"
                                />
                            ) : (
                                <div className="px-4 py-3 bg-gray-50 rounded-xl text-gray-700 leading-relaxed min-h-[80px]">
                                    {profile?.bio || '这个人很懒，什么都没有留下~'}
                                </div>
                            )}
                            {editMode && (
                                <div className="text-right text-xs text-gray-400 mt-1">
                                    {editData.bio?.length || 0}/500
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <div className="text-gray-400 font-medium">注册时间</div>
                                    <div className="text-gray-800 font-bold">{formatDate(profile?.createdAt)}</div>
                                </div>
                                <div>
                                    <div className="text-gray-400 font-medium">用户ID</div>
                                    <div className="text-gray-800 font-bold">#{profile?.id}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderPasswordTab = () => (
        <div className="glass rounded-2xl p-6 border border-white/60 max-w-2xl mx-auto">
            <h2 className="text-xl font-extrabold text-gray-800 flex items-center gap-2 mb-6">
                <Lock className="text-blue-600" size={24} />
                修改密码
            </h2>

            {passwordMessage.text && (
                <div className={`p-4 rounded-xl flex items-center gap-3 mb-6 ${
                    passwordMessage.type === 'success' 
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
                        : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                    {passwordMessage.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span className="font-medium">{passwordMessage.text}</span>
                </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-5">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">原密码</label>
                    <input
                        type="password"
                        value={passwordData.oldPassword}
                        onChange={(e) => handlePasswordChange('oldPassword', e.target.value)}
                        placeholder="请输入原密码"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">新密码</label>
                    <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                        placeholder="请输入新密码（6-20位）"
                        required
                        minLength={6}
                        maxLength={20}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">确认新密码</label>
                    <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                        placeholder="请再次输入新密码"
                        required
                        minLength={6}
                        maxLength={20}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                    />
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                        {saving ? '修改中...' : '确认修改密码'}
                    </button>
                </div>
            </form>

            <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-700">
                        <div className="font-bold mb-1">安全提示</div>
                        <ul className="space-y-1 text-amber-600">
                            <li>• 密码长度应为 6-20 个字符</li>
                            <li>• 建议使用大小写字母、数字和特殊字符的组合</li>
                            <li>• 修改密码后，需要重新登录</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStatsTab = () => (
        <div className="space-y-6">
            <div className="glass rounded-2xl p-6 border border-white/60">
                <h2 className="text-xl font-extrabold text-gray-800 flex items-center gap-2 mb-6">
                    <Award className="text-blue-600" size={24} />
                    数据统计
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                                <FileText size={20} />
                            </div>
                            <div className="text-3xl font-extrabold text-gray-800">{stats?.articleCount || 0}</div>
                        </div>
                        <div className="text-sm text-gray-600 font-medium">文章总数</div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-5 border border-emerald-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                                <BookOpen size={20} />
                            </div>
                            <div className="text-3xl font-extrabold text-gray-800">{stats?.publishedArticleCount || 0}</div>
                        </div>
                        <div className="text-sm text-gray-600 font-medium">已发布</div>
                    </div>

                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
                                <EyeOff size={20} />
                            </div>
                            <div className="text-3xl font-extrabold text-gray-800">{stats?.draftArticleCount || 0}</div>
                        </div>
                        <div className="text-sm text-gray-600 font-medium">草稿</div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border border-purple-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                                <MessageSquare size={20} />
                            </div>
                            <div className="text-3xl font-extrabold text-gray-800">{stats?.commentCount || 0}</div>
                        </div>
                        <div className="text-sm text-gray-600 font-medium">评论数</div>
                    </div>

                    <div className="bg-gradient-to-br from-rose-50 to-red-50 rounded-2xl p-5 border border-rose-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-rose-500/30">
                                <Heart size={20} />
                            </div>
                            <div className="text-3xl font-extrabold text-gray-800">{stats?.likeReceivedCount || 0}</div>
                        </div>
                        <div className="text-sm text-gray-600 font-medium">获赞数</div>
                    </div>

                    <div className="bg-gradient-to-br from-cyan-50 to-sky-50 rounded-2xl p-5 border border-cyan-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-sky-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
                                <Heart size={20} />
                            </div>
                            <div className="text-3xl font-extrabold text-gray-800">{stats?.likeGivenCount || 0}</div>
                        </div>
                        <div className="text-sm text-gray-600 font-medium">点赞数</div>
                    </div>

                    <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-2xl p-5 border border-violet-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-violet-500/30">
                                <Type size={20} />
                            </div>
                            <div className="text-3xl font-extrabold text-gray-800">{stats?.totalWordCount?.toLocaleString() || 0}</div>
                        </div>
                        <div className="text-sm text-gray-600 font-medium">总字数</div>
                    </div>

                    <div className="bg-gradient-to-br from-lime-50 to-green-50 rounded-2xl p-5 border border-lime-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-lime-500 to-green-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-lime-500/30">
                                <Eye size={20} />
                            </div>
                            <div className="text-3xl font-extrabold text-gray-800">{stats?.totalViews || 0}</div>
                        </div>
                        <div className="text-sm text-gray-600 font-medium">总浏览</div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderArticlesTab = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                    <FileText className="text-blue-600" size={24} />
                    我的文章
                </h2>
                <button
                    onClick={fetchArticles}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 bg-white/80 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                    <RefreshCw size={16} />
                    刷新
                </button>
            </div>

            {articlesLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 size={32} className="animate-spin text-blue-600" />
                </div>
            ) : articles.length === 0 ? (
                <div className="text-center py-20 glass rounded-3xl border border-dashed border-gray-300/50">
                    <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FileText size={32} />
                    </div>
                    <p className="text-gray-600 text-base font-bold mb-2">你还没有创建任何文章</p>
                    <p className="text-gray-400 text-sm mb-5">现在就开始创作你的第一篇技术文章吧</p>
                    <Link
                        to="/article/create"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all text-sm no-underline"
                    >
                        <PenLine size={16} />
                        写文章
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {articles.map((article) => {
                        const isActioning = actioningIds.has(article.id);
                        const isPublished = article.status === 'published';

                        return (
                            <div
                                key={article.id}
                                className={`glass rounded-2xl p-5 border transition-all duration-200 hover:shadow-lg group ${
                                    isPublished
                                        ? 'border-emerald-100/60'
                                        : 'border-amber-100/60'
                                }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                                        isPublished
                                            ? 'bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 ring-1 ring-emerald-100'
                                            : 'bg-gradient-to-br from-amber-50 to-orange-50 text-amber-600 ring-1 ring-amber-100'
                                    }`}>
                                        {isPublished ? (
                                            <BookOpen size={22} strokeWidth={2} />
                                        ) : (
                                            <EyeOff size={22} strokeWidth={2} />
                                        )}
                                    </div>

                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                                                <Link
                                                    to={`/article/${article.id}`}
                                                    className="text-lg font-extrabold text-gray-800 hover:text-blue-600 transition-colors line-clamp-1 leading-tight no-underline group-hover:translate-x-0.5 transition-transform"
                                                >
                                                    {article.title}
                                                </Link>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                                                    isPublished
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                }`}>
                                                    {isPublished ? (
                                                        <><Eye size={10} /> 已发布</>
                                                    ) : (
                                                        <><EyeOff size={10} /> 草稿</>
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        {article.tags && article.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-2">
                                                {article.tags.slice(0, 4).map(tag => (
                                                    <span
                                                        key={tag.id}
                                                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                                                        style={{ backgroundColor: tag.color }}
                                                    >
                                                        {tag.name}
                                                    </span>
                                                ))}
                                                {article.tags.length > 4 && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-gray-500 bg-gray-100">
                                                        +{article.tags.length - 4}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed mb-3">
                                            {truncateContent(article.content)}
                                        </p>

                                        <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100/60">
                                            <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                                                <span className="inline-flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {formatDate(article.createdAt)}
                                                </span>
                                                <span className="inline-flex items-center gap-1">
                                                    <Heart size={12} />
                                                    {article.likeCount || 0}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => toggleStatus(article)}
                                                    disabled={isActioning}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                                                        isPublished
                                                            ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                                                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                                                    }`}
                                                >
                                                    {isActioning ? (
                                                        <Loader2 size={14} className="animate-spin" />
                                                    ) : (
                                                        isPublished ? <EyeOff size={14} /> : <Eye size={14} />
                                                    )}
                                                    {isPublished ? '转为草稿' : '立即发布'}
                                                </button>

                                                <Link
                                                    to={`/article/edit/${article.id}`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all no-underline"
                                                >
                                                    <Edit3 size={14} />
                                                    编辑
                                                </Link>

                                                <Link
                                                    to={`/article/${article.id}`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all no-underline"
                                                >
                                                    <ChevronRight size={14} />
                                                    查看
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    const renderTabContent = () => {
        switch (activeTab) {
            case 'profile': return renderProfileTab();
            case 'password': return renderPasswordTab();
            case 'stats': return renderStatsTab();
            case 'articles': return renderArticlesTab();
            default: return renderProfileTab();
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                    <User className="text-blue-600" size={28} />
                    个人中心
                </h1>
                <p className="text-sm text-gray-500 mt-1 font-medium">
                    管理你的个人信息、账号安全和创作数据
                </p>
            </div>

            <div className="glass rounded-2xl border border-white/60 p-1.5 inline-flex gap-1 shadow-sm">
                {PROFILE_TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                                isActive
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                                    : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-800'
                            }`}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {renderTabContent()}
        </div>
    );
};

export default Profile;
