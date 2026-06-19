import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { HttpUtil } from '../utils/HttpUtil';
import { formatDate, getDateTimestamp } from '../utils/dateUtils';
import { 
    Shield, Edit3, Eye, Clock, User as UserIcon, Trash2, Search, Filter, ArrowUpDown, 
    FileText, AlertTriangle, Users, Settings, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('articles');
    
    const [articles, setArticles] = useState([]);
    const [articlesLoading, setArticlesLoading] = useState(true);
    const [articlePage, setArticlePage] = useState(1);
    const [articleTotal, setArticleTotal] = useState(0);
    const [articleTotalPages, setArticleTotalPages] = useState(1);
    const [articlePageSize] = useState(10);
    const [articleSearchTerm, setArticleSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [articleSortBy, setArticleSortBy] = useState('createdAt');
    const [articleSortOrder, setArticleSortOrder] = useState('desc');
    const [deletingId, setDeletingId] = useState(null);

    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [userSortBy, setUserSortBy] = useState('createdAt');
    const [userSortOrder, setUserSortOrder] = useState('desc');
    const [updatingUserId, setUpdatingUserId] = useState(null);

    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        fetchStats();
        if (activeTab === 'articles') {
            fetchArticles(1);
        } else {
            fetchUsers();
        }
    }, [activeTab, fetchArticles]);

    const fetchStats = async () => {
        try {
            const data = await HttpUtil.get('/admin/stats');
            setStats(data);
        } catch (error) {
            console.error("Failed to fetch stats", error);
        } finally {
            setStatsLoading(false);
        }
    };

    const fetchArticles = useCallback(async (pageNum = 1) => {
        setArticlesLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', pageNum);
            params.append('pageSize', articlePageSize);
            if (statusFilter !== 'all') params.append('status', statusFilter);
            params.append('sort', articleSortOrder);
            const url = `/admin/articles?${params.toString()}`;
            const data = await HttpUtil.get(url);
            const { results, total, totalPages } = data;
            setArticles(results);
            setArticleTotal(total);
            setArticleTotalPages(totalPages);
            setArticlePage(pageNum);
        } catch (error) {
            console.error("Failed to fetch articles", error);
            alert('获取文章列表失败: ' + error.message);
        } finally {
            setArticlesLoading(false);
        }
    }, [articlePageSize, statusFilter, articleSortOrder]);

    const fetchUsers = async () => {
        setUsersLoading(true);
        try {
            const data = await HttpUtil.get('/admin/users');
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users", error);
            alert('获取用户列表失败: ' + error.message);
        } finally {
            setUsersLoading(false);
        }
    };

    const handleDeleteArticle = async (articleId, e) => {
        e.stopPropagation();
        if (!window.confirm('确定要删除这篇文章吗？此操作不可撤销。')) return;
        
        setDeletingId(articleId);
        try {
            await HttpUtil.delete(`/admin/articles/${articleId}`);
            const newArticles = articles.filter(a => a.id !== articleId);
            if (stats) {
                setStats(prev => ({
                    ...prev,
                    totalArticles: prev.totalArticles - 1
                }));
            }
            if (newArticles.length === 0 && articlePage > 1) {
                fetchArticles(articlePage - 1);
            } else {
                setArticles(newArticles);
                setArticleTotal(prev => prev - 1);
            }
        } catch (error) {
            console.error("Failed to delete article", error);
            alert('删除失败: ' + error.message);
        } finally {
            setDeletingId(null);
        }
    };

    const handleUpdateUserRole = async (userId, newRole) => {
        const roleText = newRole === 'admin' ? '管理员' : '普通用户';
        if (!window.confirm(`确定要将该用户角色修改为${roleText}吗？`)) return;

        setUpdatingUserId(userId);
        try {
            const result = await HttpUtil.patch(`/admin/users/${userId}/role`, { role: newRole });
            setUsers(prev => prev.map(u => 
                u.id === userId ? { ...u, role: newRole } : u
            ));
            if (stats) {
                setStats(prev => ({
                    ...prev,
                    adminCount: newRole === 'admin' ? prev.adminCount + 1 : prev.adminCount - 1,
                    regularUserCount: newRole === 'user' ? prev.regularUserCount + 1 : prev.regularUserCount - 1
                }));
            }
        } catch (error) {
            console.error("Failed to update user role", error);
            alert('修改角色失败: ' + error.message);
        } finally {
            setUpdatingUserId(null);
        }
    };

    const handleArticleSort = (field) => {
        if (articleSortBy === field) {
            setArticleSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
        } else {
            setArticleSortBy(field);
            setArticleSortOrder('desc');
        }
    };

    const handleUserSort = (field) => {
        if (userSortBy === field) {
            setUserSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
        } else {
            setUserSortBy(field);
            setUserSortOrder('desc');
        }
    };

    const filteredArticles = articles
        .filter(article => {
            const matchesSearch = article.title.toLowerCase().includes(articleSearchTerm.toLowerCase()) ||
                                 article.user?.username?.toLowerCase().includes(articleSearchTerm.toLowerCase());
            return matchesSearch;
        })
        .sort((a, b) => {
            let aVal, bVal;
            switch (articleSortBy) {
                case 'title':
                    aVal = a.title;
                    bVal = b.title;
                    break;
                case 'username':
                    aVal = a.user?.username || '';
                    bVal = b.user?.username || '';
                    break;
                case 'likeCount':
                    aVal = a.likeCount || 0;
                    bVal = b.likeCount || 0;
                    break;
                case 'commentCount':
                    aVal = a.commentCount || 0;
                    bVal = b.commentCount || 0;
                    break;
                case 'createdAt':
                default:
                    aVal = getDateTimestamp(a.createdAt);
                    bVal = getDateTimestamp(b.createdAt);
            }
            if (articleSortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            }
            return aVal < bVal ? 1 : -1;
        });

    const filteredUsers = users
        .filter(user => {
            const matchesSearch = user.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                                 (user.email && user.email.toLowerCase().includes(userSearchTerm.toLowerCase()));
            const matchesRole = roleFilter === 'all' || user.role === roleFilter;
            return matchesSearch && matchesRole;
        })
        .sort((a, b) => {
            let aVal, bVal;
            switch (userSortBy) {
                case 'username':
                    aVal = a.username;
                    bVal = b.username;
                    break;
                case 'articleCount':
                    aVal = a.articleCount || 0;
                    bVal = b.articleCount || 0;
                    break;
                case 'createdAt':
                default:
                    aVal = getDateTimestamp(a.createdAt);
                    bVal = getDateTimestamp(b.createdAt);
            }
            if (userSortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            }
            return aVal < bVal ? 1 : -1;
        });

    const SortIcon = ({ active, order }) => (
        active ? (order === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) 
               : <ArrowUpDown size={12} className="text-gray-400" />
    );

    if (!stats && statsLoading) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                 <div className="relative">
                    <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                    <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-b-indigo-400 rounded-full animate-spin opacity-50" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
                 </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="relative py-8 px-8 rounded-3xl overflow-hidden glass shadow-lg border border-purple-100/60">
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-indigo-400/20 to-blue-400/20 rounded-full blur-3xl -ml-20 -mb-20"></div>
                
                <div className="relative z-10 flex items-center gap-4">
                    <div className="p-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-purple-500/20">
                        <Shield size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">管理控制台</h1>
                        <p className="text-gray-500 font-medium mt-1">管理所有用户、文章内容，支持角色修改和删除操作</p>
                    </div>
                </div>
            </header>

            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div className="glass rounded-2xl p-5 border border-white/60">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
                                <Users size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-500">总用户</p>
                                <p className="text-2xl font-extrabold text-gray-800">{stats.totalUsers}</p>
                            </div>
                        </div>
                    </div>
                    <div className="glass rounded-2xl p-5 border border-white/60">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600">
                                <Shield size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-500">管理员</p>
                                <p className="text-2xl font-extrabold text-purple-600">{stats.adminCount}</p>
                            </div>
                        </div>
                    </div>
                    <div className="glass rounded-2xl p-5 border border-white/60">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-slate-50 rounded-xl text-slate-600">
                                <UserIcon size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-500">普通用户</p>
                                <p className="text-2xl font-extrabold text-slate-600">{stats.regularUserCount}</p>
                            </div>
                        </div>
                    </div>
                    <div className="glass rounded-2xl p-5 border border-white/60">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
                                <FileText size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-500">全部文章</p>
                                <p className="text-2xl font-extrabold text-gray-800">{stats.totalArticles}</p>
                            </div>
                        </div>
                    </div>
                    <div className="glass rounded-2xl p-5 border border-white/60">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
                                <Eye size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-500">已发布</p>
                                <p className="text-2xl font-extrabold text-emerald-600">{stats.publishedCount}</p>
                            </div>
                        </div>
                    </div>
                    <div className="glass rounded-2xl p-5 border border-white/60">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
                                <Clock size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-500">草稿</p>
                                <p className="text-2xl font-extrabold text-amber-600">{stats.draftCount}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="glass rounded-2xl p-2 border border-white/60">
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('articles')}
                        className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                            activeTab === 'articles'
                                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
                                : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <FileText size={18} />
                        文章管理
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                            activeTab === 'users'
                                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
                                : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <Users size={18} />
                        用户管理
                    </button>
                </div>
            </div>

            {activeTab === 'articles' && (
                <>
                    <div className="glass rounded-2xl p-5 border border-white/60">
                        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                            <div className="relative flex-1">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="搜索文章标题或作者..."
                                    value={articleSearchTerm}
                                    onChange={e => setArticleSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white/50 focus:bg-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all duration-300 placeholder-gray-400 text-sm font-medium"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Filter size={16} className="text-gray-500" />
                                <select
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value)}
                                    className="px-4 py-3 rounded-xl border border-gray-200 bg-white/50 focus:bg-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all duration-300 text-sm font-medium text-gray-700 cursor-pointer"
                                >
                                    <option value="all">全部状态</option>
                                    <option value="published">已发布</option>
                                    <option value="draft">草稿</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="glass rounded-3xl overflow-hidden border border-white/60 shadow-lg">
                        {articlesLoading ? (
                            <div className="flex justify-center items-center py-20">
                                <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gradient-to-r from-gray-50/80 to-gray-100/50 border-b border-gray-100">
                                                <th 
                                                    className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 transition-colors"
                                                    onClick={() => handleArticleSort('title')}
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        文章标题
                                                        <span className={articleSortBy === 'title' ? 'text-purple-600' : ''}>
                                                            <SortIcon active={articleSortBy === 'title'} order={articleSortOrder} />
                                                        </span>
                                                    </div>
                                                </th>
                                                <th 
                                                    className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 transition-colors"
                                                    onClick={() => handleArticleSort('username')}
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        作者
                                                        <span className={articleSortBy === 'username' ? 'text-purple-600' : ''}>
                                                            <SortIcon active={articleSortBy === 'username'} order={articleSortOrder} />
                                                        </span>
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                                                    标签
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                                    状态
                                                </th>
                                                <th 
                                                    className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 transition-colors hidden sm:table-cell"
                                                    onClick={() => handleArticleSort('likeCount')}
                                                >
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        点赞
                                                        <span className={articleSortBy === 'likeCount' ? 'text-purple-600' : ''}>
                                                            <SortIcon active={articleSortBy === 'likeCount'} order={articleSortOrder} />
                                                        </span>
                                                    </div>
                                                </th>
                                                <th 
                                                    className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 transition-colors hidden md:table-cell"
                                                    onClick={() => handleArticleSort('commentCount')}
                                                >
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        评论
                                                        <span className={articleSortBy === 'commentCount' ? 'text-purple-600' : ''}>
                                                            <SortIcon active={articleSortBy === 'commentCount'} order={articleSortOrder} />
                                                        </span>
                                                    </div>
                                                </th>
                                                <th 
                                                    className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 transition-colors hidden md:table-cell"
                                                    onClick={() => handleArticleSort('createdAt')}
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        创建时间
                                                        <span className={articleSortBy === 'createdAt' ? 'text-purple-600' : ''}>
                                                            <SortIcon active={articleSortBy === 'createdAt'} order={articleSortOrder} />
                                                        </span>
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                                    操作
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100/60">
                                            {filteredArticles.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="px-6 py-16">
                                                        <div className="text-center">
                                                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                                <AlertTriangle size={28} className="text-gray-400" />
                                                            </div>
                                                            <p className="text-gray-500 font-medium">暂无符合条件的文章</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredArticles.map((article, index) => (
                                                    <tr 
                                                        key={article.id} 
                                                        className="hover:bg-purple-50/30 transition-colors duration-200 group"
                                                        style={{ animationDelay: `${index * 20}ms` }}
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-purple-50 to-indigo-50 flex items-center justify-center text-purple-600 font-bold text-xs ring-1 ring-black/5 shadow-inner shrink-0">
                                                                    {article.title.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-bold text-gray-800 truncate max-w-xs group-hover:text-purple-600 transition-colors">
                                                                        {article.title}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                                    {article.user?.username?.charAt(0).toUpperCase()}
                                                                </div>
                                                                <span className="text-sm font-medium text-gray-700 truncate max-w-[120px]">{article.user?.username || '未知作者'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 hidden lg:table-cell">
                                                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                                                                {article.tags && article.tags.slice(0, 2).map(tag => (
                                                                    <span
                                                                        key={tag.id}
                                                                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                                                                        style={{ backgroundColor: tag.color }}
                                                                    >
                                                                        {tag.name}
                                                                    </span>
                                                                ))}
                                                                {article.tags && article.tags.length > 2 && (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-gray-500 bg-gray-100">
                                                                        +{article.tags.length - 2}
                                                                    </span>
                                                                )}
                                                                {(!article.tags || article.tags.length === 0) && (
                                                                    <span className="text-xs text-gray-400">无标签</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                                                article.status === 'draft'
                                                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                            }`}>
                                                                {article.status === 'draft' ? '草稿' : '已发布'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center hidden sm:table-cell">
                                                            <span className="text-sm font-bold text-gray-700">{article.likeCount || 0}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center hidden md:table-cell">
                                                            <span className="text-sm font-bold text-gray-700">{article.commentCount || 0}</span>
                                                        </td>
                                                        <td className="px-6 py-4 hidden md:table-cell">
                                                            <div className="flex items-center gap-1.5 text-gray-500">
                                                                <Clock size={13} />
                                                                <span className="text-xs font-medium">{formatDate(article.createdAt, { showTime: true })}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <button
                                                                    onClick={() => navigate(`/article/${article.id}`)}
                                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                                                    title="查看文章"
                                                                >
                                                                    <Eye size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => navigate(`/article/edit/${article.id}`)}
                                                                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
                                                                    title="编辑文章"
                                                                >
                                                                    <Edit3 size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => handleDeleteArticle(article.id, e)}
                                                                    disabled={deletingId === article.id}
                                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                                                                    title="删除文章"
                                                                >
                                                                    {deletingId === article.id ? (
                                                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                        </svg>
                                                                    ) : (
                                                                        <Trash2 size={16} />
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <p className="text-xs font-medium text-gray-500">
                                        第 <span className="text-purple-600 font-bold">{articlePage}</span> / {articleTotalPages} 页，共 <span className="text-gray-700 font-bold">{articleTotal}</span> 篇文章
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => fetchArticles(1)}
                                            disabled={articlePage <= 1 || articlesLoading}
                                            className="p-2 rounded-lg text-gray-500 hover:bg-white hover:text-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                            title="首页"
                                        >
                                            <ChevronLeft size={16} />
                                            <ChevronLeft size={16} className="-ml-2" />
                                        </button>
                                        <button
                                            onClick={() => fetchArticles(articlePage - 1)}
                                            disabled={articlePage <= 1 || articlesLoading}
                                            className="p-2 rounded-lg text-gray-500 hover:bg-white hover:text-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                            title="上一页"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <div className="flex items-center gap-1 mx-2">
                                            {articlesLoading ? (
                                                <Loader2 size={16} className="animate-spin text-purple-600" />
                                            ) : (
                                                <span className="text-sm font-bold text-purple-600 min-w-[30px] text-center">{articlePage}</span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => fetchArticles(articlePage + 1)}
                                            disabled={articlePage >= articleTotalPages || articlesLoading}
                                            className="p-2 rounded-lg text-gray-500 hover:bg-white hover:text-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                            title="下一页"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                        <button
                                            onClick={() => fetchArticles(articleTotalPages)}
                                            disabled={articlePage >= articleTotalPages || articlesLoading}
                                            className="p-2 rounded-lg text-gray-500 hover:bg-white hover:text-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                            title="末页"
                                        >
                                            <ChevronRight size={16} className="-mr-2" />
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}

            {activeTab === 'users' && (
                <>
                    <div className="glass rounded-2xl p-5 border border-white/60">
                        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                            <div className="relative flex-1">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="搜索用户名或邮箱..."
                                    value={userSearchTerm}
                                    onChange={e => setUserSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white/50 focus:bg-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all duration-300 placeholder-gray-400 text-sm font-medium"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Filter size={16} className="text-gray-500" />
                                <select
                                    value={roleFilter}
                                    onChange={e => setRoleFilter(e.target.value)}
                                    className="px-4 py-3 rounded-xl border border-gray-200 bg-white/50 focus:bg-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all duration-300 text-sm font-medium text-gray-700 cursor-pointer"
                                >
                                    <option value="all">全部角色</option>
                                    <option value="admin">管理员</option>
                                    <option value="user">普通用户</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="glass rounded-3xl overflow-hidden border border-white/60 shadow-lg">
                        {usersLoading ? (
                            <div className="flex justify-center items-center py-20">
                                <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gradient-to-r from-gray-50/80 to-gray-100/50 border-b border-gray-100">
                                                <th 
                                                    className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 transition-colors"
                                                    onClick={() => handleUserSort('username')}
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        用户
                                                        <span className={userSortBy === 'username' ? 'text-purple-600' : ''}>
                                                            <SortIcon active={userSortBy === 'username'} order={userSortOrder} />
                                                        </span>
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                                                    邮箱
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                                    角色
                                                </th>
                                                <th 
                                                    className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 transition-colors"
                                                    onClick={() => handleUserSort('articleCount')}
                                                >
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        文章数
                                                        <span className={userSortBy === 'articleCount' ? 'text-purple-600' : ''}>
                                                            <SortIcon active={userSortBy === 'articleCount'} order={userSortOrder} />
                                                        </span>
                                                    </div>
                                                </th>
                                                <th 
                                                    className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 transition-colors hidden lg:table-cell"
                                                    onClick={() => handleUserSort('createdAt')}
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        注册时间
                                                        <span className={userSortBy === 'createdAt' ? 'text-purple-600' : ''}>
                                                            <SortIcon active={userSortBy === 'createdAt'} order={userSortOrder} />
                                                        </span>
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                                    操作
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100/60">
                                            {filteredUsers.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-16">
                                                        <div className="text-center">
                                                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                                <Users size={28} className="text-gray-400" />
                                                            </div>
                                                            <p className="text-gray-500 font-medium">暂无符合条件的用户</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredUsers.map((user, index) => (
                                                    <tr 
                                                        key={user.id} 
                                                        className="hover:bg-purple-50/30 transition-colors duration-200 group"
                                                        style={{ animationDelay: `${index * 20}ms` }}
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm ring-1 ring-black/5 shadow-inner shrink-0 ${
                                                                    user.role === 'admin' 
                                                                        ? 'bg-gradient-to-br from-purple-500 to-indigo-600' 
                                                                        : 'bg-gradient-to-br from-blue-400 to-indigo-500'
                                                                }`}>
                                                                    {user.username.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-bold text-gray-800 truncate group-hover:text-purple-600 transition-colors">
                                                                        {user.username}
                                                                    </p>
                                                                    <p className="text-xs text-gray-400">ID: {user.id}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 hidden md:table-cell">
                                                            <span className="text-sm text-gray-600">{user.email || '未设置'}</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                                                user.role === 'admin'
                                                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                                                    : 'bg-slate-50 text-slate-600 border border-slate-200'
                                                            }`}>
                                                                {user.role === 'admin' ? '管理员' : '普通用户'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="text-sm font-bold text-gray-700">{user.articleCount || 0}</span>
                                                        </td>
                                                        <td className="px-6 py-4 hidden lg:table-cell">
                                                            <div className="flex items-center gap-1.5 text-gray-500">
                                                                <Clock size={13} />
                                                                <span className="text-xs font-medium">{formatDate(user.createdAt)}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center justify-center gap-1">
                                                                {updatingUserId === user.id ? (
                                                                    <div className="p-2">
                                                                        <svg className="animate-spin h-4 w-4 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                        </svg>
                                                                    </div>
                                                                ) : user.role === 'admin' ? (
                                                                    <button
                                                                        onClick={() => handleUpdateUserRole(user.id, 'user')}
                                                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-all duration-200"
                                                                        title="降级为普通用户"
                                                                    >
                                                                        <Settings size={12} />
                                                                        降级
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleUpdateUserRole(user.id, 'admin')}
                                                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-all duration-200"
                                                                        title="升级为管理员"
                                                                    >
                                                                        <Shield size={12} />
                                                                        升级
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100/60 flex items-center justify-between">
                                    <p className="text-xs font-medium text-gray-500">
                                        显示 <span className="text-purple-600 font-bold">{filteredUsers.length}</span> / <span className="text-gray-700 font-bold">{users.length}</span> 个用户
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminDashboard;
