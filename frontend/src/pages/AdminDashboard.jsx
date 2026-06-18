import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HttpUtil } from '../utils/HttpUtil';
import { formatDate, getDateTimestamp } from '../utils/dateUtils';
import { Shield, Edit3, Eye, Clock, User as UserIcon, Trash2, Search, Filter, ArrowUpDown, FileText, AlertTriangle } from 'lucide-react';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        const fetchArticles = async () => {
            setLoading(true);
            try {
                const data = await HttpUtil.get('/article');
                setArticles(data);
            } catch (error) {
                console.error("Failed to fetch articles", error);
                alert('获取文章列表失败');
            } finally {
                setLoading(false);
            }
        };
        fetchArticles();
    }, []);

    const handleDelete = async (articleId, e) => {
        e.stopPropagation();
        if (!window.confirm('确定要删除这篇文章吗？此操作不可撤销。')) return;
        
        setDeletingId(articleId);
        try {
            await HttpUtil.delete(`/article/${articleId}`);
            setArticles(prev => prev.filter(a => a.id !== articleId));
        } catch (error) {
            console.error("Failed to delete article", error);
            alert('删除失败: ' + error.message);
        } finally {
            setDeletingId(null);
        }
    };

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    const filteredArticles = articles
        .filter(article => {
            const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 article.user?.username?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || article.status === statusFilter;
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            let aVal, bVal;
            switch (sortBy) {
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
            if (sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            }
            return aVal < bVal ? 1 : -1;
        });

    const stats = {
        total: articles.length,
        published: articles.filter(a => a.status === 'published').length,
        draft: articles.filter(a => a.status === 'draft').length,
        totalLikes: articles.reduce((sum, a) => sum + (a.likeCount || 0), 0)
    };

    if (loading) {
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
                        <p className="text-gray-500 font-medium mt-1">管理所有文章内容，支持编辑和删除操作</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass rounded-2xl p-5 border border-white/60">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
                            <FileText size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500">全部文章</p>
                            <p className="text-2xl font-extrabold text-gray-800">{stats.total}</p>
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
                            <p className="text-2xl font-extrabold text-emerald-600">{stats.published}</p>
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
                            <p className="text-2xl font-extrabold text-amber-600">{stats.draft}</p>
                        </div>
                    </div>
                </div>
                <div className="glass rounded-2xl p-5 border border-white/60">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600">
                            <Shield size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500">总点赞</p>
                            <p className="text-2xl font-extrabold text-rose-600">{stats.totalLikes}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass rounded-2xl p-5 border border-white/60">
                <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="搜索文章标题或作者..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
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
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gradient-to-r from-gray-50/80 to-gray-100/50 border-b border-gray-100">
                                <th 
                                    className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 transition-colors"
                                    onClick={() => handleSort('title')}
                                >
                                    <div className="flex items-center gap-1.5">
                                        文章标题
                                        <ArrowUpDown size={12} className={sortBy === 'title' ? 'text-purple-600' : 'text-gray-400'} />
                                    </div>
                                </th>
                                <th 
                                    className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 transition-colors hidden md:table-cell"
                                    onClick={() => handleSort('username')}
                                >
                                    <div className="flex items-center gap-1.5">
                                        作者
                                        <ArrowUpDown size={12} className={sortBy === 'username' ? 'text-purple-600' : 'text-gray-400'} />
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
                                    onClick={() => handleSort('likeCount')}
                                >
                                    <div className="flex items-center justify-center gap-1.5">
                                        点赞
                                        <ArrowUpDown size={12} className={sortBy === 'likeCount' ? 'text-purple-600' : 'text-gray-400'} />
                                    </div>
                                </th>
                                <th 
                                    className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 transition-colors hidden md:table-cell"
                                    onClick={() => handleSort('commentCount')}
                                >
                                    <div className="flex items-center justify-center gap-1.5">
                                        评论
                                        <ArrowUpDown size={12} className={sortBy === 'commentCount' ? 'text-purple-600' : 'text-gray-400'} />
                                    </div>
                                </th>
                                <th 
                                    className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 transition-colors hidden lg:table-cell"
                                    onClick={() => handleSort('createdAt')}
                                >
                                    <div className="flex items-center gap-1.5">
                                        创建时间
                                        <ArrowUpDown size={12} className={sortBy === 'createdAt' ? 'text-purple-600' : 'text-gray-400'} />
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
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                    {article.user?.username?.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm font-medium text-gray-700">{article.user?.username}</span>
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
                                        <td className="px-6 py-4 hidden lg:table-cell">
                                            <div className="flex items-center gap-1.5 text-gray-500">
                                                <Clock size={13} />
                                                <span className="text-xs font-medium">{formatDate(article.createdAt)}</span>
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
                                                    onClick={(e) => handleDelete(article.id, e)}
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
                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100/60 flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-500">
                        显示 <span className="text-purple-600 font-bold">{filteredArticles.length}</span> / <span className="text-gray-700 font-bold">{articles.length}</span> 篇文章
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
