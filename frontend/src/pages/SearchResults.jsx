import React, { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { HttpUtil } from '../utils/HttpUtil';
import { formatDate } from '../utils/dateUtils';
import { highlightText, getFullImageUrl } from '../utils/common';
import { Search, Clock, User as UserIcon, ArrowLeft, FileText, AlertCircle, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

const SearchResults = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const keyword = searchParams.get('q') || '';

    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        if (!keyword.trim()) {
            setResults([]);
            setTotal(0);
            return;
        }

        const currentPage = parseInt(searchParams.get('page')) || 1;
        setPage(currentPage);

        const fetchResults = async () => {
            setLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams({
                    q: keyword,
                    page: currentPage.toString(),
                    pageSize: pageSize.toString()
                });
                const data = await HttpUtil.get(`/article/search/list?${params.toString()}`);
                setResults(data.results || []);
                setTotal(data.total || 0);
                setTotalPages(data.totalPages || 0);
                setPageSize(data.pageSize || 10);
            } catch (err) {
                setError(err.message || '搜索失败，请稍后重试');
                setResults([]);
                setTotal(0);
            } finally {
                setLoading(false);
            }
        };

        const debounce = setTimeout(fetchResults, 200);
        return () => clearTimeout(debounce);
    }, [keyword, searchParams]);

    const handlePageChange = (newPage) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', newPage.toString());
        navigate(`/search?${params.toString()}`);
    };

    const Pagination = useMemo(() => {
        if (totalPages <= 1) return null;

        const pages = [];
        const maxVisible = 5;
        let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        return (
            <div className="flex items-center justify-center gap-2 mt-10">
                <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                    className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        page <= 1
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200'
                    }`}
                >
                    <ChevronLeft size={16} />
                    上一页
                </button>

                {startPage > 1 && (
                    <>
                        <button
                            onClick={() => handlePageChange(1)}
                            className="w-9 h-9 rounded-xl text-sm font-medium text-gray-600 hover:bg-white hover:shadow-sm transition-all"
                        >
                            1
                        </button>
                        {startPage > 2 && (
                            <span className="text-gray-400 px-1">...</span>
                        )}
                    </>
                )}

                {pages.map((p) => (
                    <button
                        key={p}
                        onClick={() => handlePageChange(p)}
                        className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${
                            p === page
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/30'
                                : 'text-gray-600 hover:bg-white hover:shadow-sm'
                        }`}
                    >
                        {p}
                    </button>
                ))}

                {endPage < totalPages && (
                    <>
                        {endPage < totalPages - 1 && (
                            <span className="text-gray-400 px-1">...</span>
                        )}
                        <button
                            onClick={() => handlePageChange(totalPages)}
                            className="w-9 h-9 rounded-xl text-sm font-medium text-gray-600 hover:bg-white hover:shadow-sm transition-all"
                        >
                            {totalPages}
                        </button>
                    </>
                )}

                <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                    className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        page >= totalPages
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200'
                    }`}
                >
                    下一页
                    <ChevronRight size={16} />
                </button>
            </div>
        );
    }, [page, totalPages, navigate, searchParams]);

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
        <div className="space-y-6 max-w-4xl mx-auto w-full">
            <div className="flex items-center gap-3 mb-2">
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-white hover:text-gray-700 hover:shadow-sm transition-all"
                >
                    <ArrowLeft size={16} />
                    返回
                </button>
            </div>

            <div className="glass rounded-2xl p-6 border border-white/60">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Search size={20} className="text-blue-500" />
                            <h1 className="text-2xl font-bold text-gray-800">搜索结果</h1>
                        </div>
                        <p className="text-sm text-gray-500">
                            关键词：<span className="font-medium text-gray-700">"{keyword}"</span>
                        </p>
                    </div>
                    {!error && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium">
                            <FileText size={16} />
                            共找到 {total} 篇相关文章
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="glass rounded-2xl p-8 border border-red-100 text-center">
                    <div className="w-14 h-14 bg-red-50 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={28} />
                    </div>
                    <p className="text-red-600 font-medium mb-2">搜索出错了</p>
                    <p className="text-gray-500 text-sm">{error}</p>
                </div>
            )}

            {!error && results.length === 0 && (
                <div className="glass rounded-2xl p-12 border border-dashed border-gray-300/50 text-center">
                    <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search size={32} />
                    </div>
                    <p className="text-gray-700 font-bold text-lg mb-2">未找到相关文章</p>
                    <p className="text-gray-500 text-sm mb-6">
                        没有找到包含 "{keyword}" 的文章，请尝试其他关键词
                    </p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all text-sm no-underline"
                    >
                        <Sparkles size={16} />
                        返回首页浏览
                    </Link>
                </div>
            )}

            {!error && results.length > 0 && (
                <div className="space-y-4">
                    {results.map((article) => (
                        <Link
                            key={article.id}
                            to={`/article/${article.id}`}
                            className="group block glass rounded-2xl p-5 border border-white/60 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl no-underline"
                        >
                            <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-50 to-indigo-50 flex items-center justify-center text-blue-600 font-bold text-xs ring-1 ring-black/5 shadow-inner">
                                        {article.user?.username?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-gray-700">{article.user?.username}</span>
                                        <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                                            <Clock size={10} />
                                            {formatDate(article.createdAt)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {article.titleMatch && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                                            标题匹配
                                        </span>
                                    )}
                                    {article.contentMatch && !article.titleMatch && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                            内容匹配
                                        </span>
                                    )}
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        article.status === 'draft'
                                            ? 'bg-amber-50 text-amber-600 border border-amber-200'
                                            : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                    }`}>
                                        {article.status === 'draft' ? '草稿' : '已发布'}
                                    </span>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors leading-snug">
                                {highlightText(article.title, keyword)}
                            </h3>

                            {article.tags && article.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-3">
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

                            <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                                {highlightText(article.snippet, keyword)}
                            </p>
                        </Link>
                    ))}

                    {Pagination}
                </div>
            )}
        </div>
    );
};

export default SearchResults;
