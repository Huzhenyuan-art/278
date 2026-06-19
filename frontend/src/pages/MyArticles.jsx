import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HttpUtil } from '../utils/HttpUtil';
import { formatDate } from '../utils/dateUtils';
import {
    FileText, Clock, Edit3, Trash2, Eye, EyeOff,
    Sparkles, ChevronRight, AlertCircle, Loader2,
    BookOpen, Archive, RefreshCw
} from 'lucide-react';

const TABS = [
    { key: 'all', label: '全部', icon: FileText, status: null },
    { key: 'published', label: '已发布', icon: BookOpen, status: 'published' },
    { key: 'draft', label: '草稿', icon: Archive, status: 'draft' },
];

const MyArticles = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('all');
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actioningIds, setActioningIds] = useState(new Set());
    const [deletingId, setDeletingId] = useState(null);

    const fetchArticles = useCallback(async () => {
        setLoading(true);
        try {
            const tab = TABS.find(t => t.key === activeTab);
            const params = new URLSearchParams();
            if (tab?.status) params.append('status', tab.status);
            const url = `/article/mine/list${params.toString() ? `?${params.toString()}` : ''}`;
            const data = await HttpUtil.get(url);
            setArticles(data);
        } catch (error) {
            console.error('Failed to fetch my articles', error);
            alert('获取文章列表失败：' + error.message);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchArticles();
    }, [fetchArticles]);

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

    const toggleStatus = async (article) => {
        const newStatus = article.status === 'published' ? 'draft' : 'published';
        if (actioningIds.has(article.id)) return;

        setActioningIds(prev => new Set(prev).add(article.id));
        try {
            const result = await HttpUtil.patch(`/article/${article.id}/status`, { status: newStatus });
            setArticles(prev => prev.map(a =>
                a.id === article.id ? { ...a, status: result.status } : a
            ));
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

    const handleDelete = async (article) => {
        const confirmed = window.confirm(
            `确定要删除文章「${article.title}」吗？\n此操作不可撤销！`
        );
        if (!confirmed) return;
        if (deletingId) return;

        setDeletingId(article.id);
        try {
            await HttpUtil.delete(`/article/${article.id}`);
            setArticles(prev => prev.filter(a => a.id !== article.id));
        } catch (error) {
            console.error('Failed to delete article', error);
            alert('删除失败：' + error.message);
        } finally {
            setDeletingId(null);
        }
    };

    const tabCounts = TABS.reduce((acc, tab) => {
        if (tab.key === 'all') {
            acc[tab.key] = articles.length;
        } else {
            acc[tab.key] = articles.filter(a => a.status === tab.status).length;
        }
        return acc;
    }, {});

    const filteredArticles = activeTab === 'all'
        ? articles
        : articles.filter(a => a.status === activeTab);

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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                        <FileText className="text-blue-600" size={28} />
                        我的文章
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 font-medium">
                        管理你的所有文章，草稿与已发布一目了然
                    </p>
                </div>
                <button
                    onClick={fetchArticles}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 bg-white/80 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all"
                    title="刷新列表"
                >
                    <RefreshCw size={16} />
                    刷新
                </button>
            </div>

            <div className="glass rounded-2xl border border-white/60 p-1.5 inline-flex gap-1 shadow-sm">
                {TABS.map(tab => {
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
                            <span className={`inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-[11px] font-bold ${
                                isActive
                                    ? 'bg-white/20 text-white'
                                    : 'bg-gray-200/80 text-gray-600'
                            }`}>
                                {tabCounts[tab.key] || 0}
                            </span>
                        </button>
                    );
                })}
            </div>

            {filteredArticles.length === 0 ? (
                <div className="text-center py-20 glass rounded-3xl border border-dashed border-gray-300/50">
                    <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        {activeTab === 'draft' ? (
                            <Archive size={32} />
                        ) : activeTab === 'published' ? (
                            <BookOpen size={32} />
                        ) : (
                            <FileText size={32} />
                        )}
                    </div>
                    <p className="text-gray-600 text-base font-bold mb-2">
                        {activeTab === 'all' ? '你还没有创建任何文章' :
                         activeTab === 'draft' ? '没有草稿文章' : '没有已发布的文章'}
                    </p>
                    <p className="text-gray-400 text-sm mb-5">
                        {activeTab === 'draft' ? '开始写文章时可以先保存为草稿哦' :
                         activeTab === 'published' ? '发布你的第一篇技术分享吧！' :
                         '现在就开始创作你的第一篇技术文章吧'}
                    </p>
                    <Link
                        to="/article/create"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all text-sm no-underline"
                    >
                        <Sparkles size={16} />
                        写文章
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredArticles.map((article) => {
                        const isActioning = actioningIds.has(article.id);
                        const isDeleting = deletingId === article.id;
                        const isPublished = article.status === 'published';

                        return (
                            <div
                                key={article.id}
                                className={`glass-card rounded-2xl p-5 border transition-all duration-200 hover:shadow-lg group ${
                                    isDeleting ? 'opacity-50 pointer-events-none' : ''
                                } ${
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
                                            <Archive size={22} strokeWidth={2} />
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
                                            <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                                                <span className="inline-flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {formatDate(article.createdAt)}
                                                </span>
                                                {article.updatedAt && article.updatedAt !== article.createdAt && (
                                                    <span className="inline-flex items-center gap-1 text-gray-300">
                                                        <RefreshCw size={12} />
                                                        更新于 {formatDate(article.updatedAt)}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => toggleStatus(article)}
                                                    disabled={isActioning}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                                                        isPublished
                                                            ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                                                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                                                    } ${isActioning ? 'opacity-50' : ''}`}
                                                    title={isPublished ? '转为草稿（仅自己可见）' : '发布文章（所有人可见）'}
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
                                                    title="编辑文章"
                                                >
                                                    <Edit3 size={14} />
                                                    编辑
                                                </Link>

                                                <Link
                                                    to={`/article/${article.id}`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all no-underline"
                                                    title="查看文章"
                                                >
                                                    <ChevronRight size={14} />
                                                    查看
                                                </Link>

                                                <button
                                                    onClick={() => handleDelete(article)}
                                                    disabled={!!deletingId}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="删除文章"
                                                >
                                                    {isDeleting ? (
                                                        <Loader2 size={14} className="animate-spin" />
                                                    ) : (
                                                        <Trash2 size={14} />
                                                    )}
                                                    删除
                                                </button>
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
};

export default MyArticles;
