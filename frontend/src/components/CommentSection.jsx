import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { HttpUtil } from '../utils/HttpUtil';
import { MessageSquare, Send, Trash2, Loader2, User as UserIcon, ChevronDown } from 'lucide-react';
import Modal from './Modal';

const PAGE_SIZE = 5;

const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`;
    return d.toLocaleDateString();
};

const CommentSection = ({ articleId }) => {
    const [comments, setComments] = useState([]);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [content, setContent] = useState('');
    const [error, setError] = useState('');
    const [deletingId, setDeletingId] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const isLoggedIn = !!localStorage.getItem('token');

    const fetchInitial = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await HttpUtil.get(`/comment/article/${articleId}?limit=${PAGE_SIZE}`);
            setComments(data.comments);
            setTotal(data.total);
            setHasMore(data.hasMore);
        } catch (err) {
            console.error('Failed to fetch comments', err);
        } finally {
            setLoading(false);
        }
    }, [articleId]);

    useEffect(() => {
        fetchInitial();
    }, [fetchInitial]);

    const loadMore = async () => {
        if (loadingMore || !hasMore || comments.length === 0) return;
        setLoadingMore(true);
        try {
            const beforeId = comments[comments.length - 1].id;
            const data = await HttpUtil.get(`/comment/article/${articleId}?limit=${PAGE_SIZE}&beforeId=${beforeId}`);
            setComments(prev => [...prev, ...data.comments]);
            setTotal(data.total);
            setHasMore(data.hasMore);
        } catch (err) {
            console.error('Failed to load more comments', err);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmed = content.trim();
        if (!trimmed || submitting) return;
        setSubmitting(true);
        setError('');
        try {
            const newComment = await HttpUtil.post(`/comment/article/${articleId}`, { content: trimmed });
            setComments(prev => [newComment, ...prev]);
            setTotal(prev => prev + 1);
            setContent('');
        } catch (err) {
            setError(err.message || '评论发表失败');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteClick = (commentId) => {
        setDeletingId(commentId);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!deletingId) return;
        try {
            await HttpUtil.delete(`/comment/${deletingId}`);
            setComments(prev => prev.filter(c => c.id !== deletingId));
            setTotal(prev => Math.max(0, prev - 1));
        } catch (err) {
            alert('删除失败: ' + err.message);
        } finally {
            setIsDeleteModalOpen(false);
            setDeletingId(null);
        }
    };

    return (
        <section className="glass rounded-3xl shadow-xl border border-white/60 overflow-hidden">
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => { setIsDeleteModalOpen(false); setDeletingId(null); }}
                onConfirm={handleDeleteConfirm}
                title="确认删除评论"
                message="确定要删除这条评论吗？此操作无法撤销。"
            />

            <div className="px-6 md:px-8 py-5 border-b border-gray-100/70 flex items-center gap-2 bg-gradient-to-r from-blue-50/40 to-indigo-50/40">
                <MessageSquare size={20} className="text-indigo-500" />
                <h2 className="text-lg font-bold text-gray-800">评论区</h2>
                <span className="ml-auto text-xs font-medium text-gray-500 bg-white/70 px-2.5 py-0.5 rounded-full border border-gray-100">
                    共 {total} 条
                </span>
            </div>

            {/* Comment input */}
            <div className="px-6 md:px-8 py-5">
                {isLoggedIn ? (
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="写下你的想法..."
                            rows={3}
                            maxLength={1000}
                            className="w-full resize-none rounded-xl border border-gray-200 bg-white/70 px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                        />
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] text-gray-400">{content.length}/1000</span>
                            <button
                                type="submit"
                                disabled={!content.trim() || submitting}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                            >
                                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                                {submitting ? '发表中...' : '发表评论'}
                            </button>
                        </div>
                        {error && <p className="text-xs text-red-500">{error}</p>}
                    </form>
                ) : (
                    <div className="text-center text-sm text-gray-500 py-3 bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
                        <UserIcon size={20} className="inline-block mb-1 text-gray-400" />
                        <p className="mt-1">
                            <Link to="/login" className="text-blue-600 font-bold hover:underline">登录</Link> 后参与评论
                        </p>
                    </div>
                )}
            </div>

            {/* Comment list */}
            <div className="px-6 md:px-8 pb-6 space-y-4">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 size={24} className="animate-spin text-blue-400" />
                    </div>
                ) : comments.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <MessageSquare size={32} className="mx-auto mb-2 text-gray-300" />
                        <p className="text-sm font-medium">还没有评论，来抢沙发吧！</p>
                    </div>
                ) : (
                    <>
                        {comments.map(comment => (
                            <div key={comment.id} className="group flex gap-3 p-4 rounded-2xl bg-white/60 border border-gray-100/70 hover:border-blue-100 transition-all">
                                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-tr from-blue-50 to-indigo-50 flex items-center justify-center text-blue-600 font-bold text-sm ring-1 ring-black/5">
                                    {comment.user?.username?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-bold text-gray-700">{comment.user?.username || '匿名用户'}</span>
                                        <span className="text-[11px] text-gray-400">{formatTime(comment.createdAt)}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap break-words">{comment.content}</p>
                                </div>
                                {comment.canDelete && (
                                    <button
                                        onClick={() => handleDeleteClick(comment.id)}
                                        className="flex-shrink-0 self-start p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                        title="删除评论"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                )}
                            </div>
                        ))}

                        {hasMore && (
                            <div className="flex justify-center pt-2">
                                <button
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium text-blue-600 bg-blue-50/60 hover:bg-blue-100 border border-blue-100 transition-all disabled:opacity-60"
                                >
                                    {loadingMore ? <Loader2 size={15} className="animate-spin" /> : <ChevronDown size={15} />}
                                    {loadingMore ? '加载中...' : '加载更多'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
};

export default CommentSection;
