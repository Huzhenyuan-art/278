import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { HttpUtil } from '../utils/HttpUtil';
import { formatRelativeTime } from '../utils/dateUtils';
import { MessageSquare, Send, Trash2, Loader2, User as UserIcon, ChevronDown, Edit2, Reply, X, Check } from 'lucide-react';
import Modal from './Modal';
import DOMPurify from 'dompurify';

const PAGE_SIZE = 5;

// ---------- Tree helpers (immutable) ----------

const insertReplyIntoTree = (nodes, parentId, reply) => {
    return nodes.map(node => {
        if (node.id === parentId) {
            return { ...node, replies: [...(node.replies || []), reply] };
        }
        if (node.replies && node.replies.length > 0) {
            return { ...node, replies: insertReplyIntoTree(node.replies, parentId, reply) };
        }
        return node;
    });
};

const updateCommentInTree = (nodes, id, mutator) => {
    return nodes.map(node => {
        if (node.id === id) {
            return { ...node, ...mutator(node) };
        }
        if (node.replies && node.replies.length > 0) {
            return { ...node, replies: updateCommentInTree(node.replies, id, mutator) };
        }
        return node;
    });
};

const removeCommentFromTree = (nodes, id) => {
    return nodes
        .filter(node => node.id !== id)
        .map(node => node.replies
            ? { ...node, replies: removeCommentFromTree(node.replies, id) }
            : node);
};

// ---------- Single Comment Item ----------

const CommentItem = ({ comment, depth, articleId, onReplySubmit, onEditSubmit, onDeleteRequest, replyingId, setReplyingId, editingId, setEditingId, isLoggedIn }) => {
    const [replyContent, setReplyContent] = useState('');
    const [replySubmitting, setReplySubmitting] = useState(false);
    const [replyError, setReplyError] = useState('');
    const replyInputRef = useRef(null);

    const [editContent, setEditContent] = useState(comment.content);
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editError, setEditError] = useState('');

    const isReplyingThis = replyingId === comment.id;
    const isEditingThis = editingId === comment.id;
    const isSoftDeleted = comment.isDeleted;

    // When opening reply input, auto focus
    useEffect(() => {
        if (isReplyingThis && replyInputRef.current) {
            replyInputRef.current.focus();
        }
    }, [isReplyingThis]);

    // When opening edit, reset content to original
    useEffect(() => {
        if (isEditingThis) {
            setEditContent(comment.content);
            setEditError('');
        }
    }, [isEditingThis, comment.content]);

    const handleReplySubmit = async (e) => {
        e.preventDefault();
        const trimmed = replyContent.trim();
        if (!trimmed || replySubmitting) return;
        setReplySubmitting(true);
        setReplyError('');
        try {
            const payload = {
                content: trimmed,
                parentId: comment.id,
                replyToUserId: comment.user?.id || null,
            };
            const newReply = await HttpUtil.post(`/comment/article/${articleId}`, payload);
            setReplyContent('');
            setReplyingId(null);
            onReplySubmit(comment.id, newReply);
        } catch (err) {
            setReplyError(err.message || '回复发表失败');
        } finally {
            setReplySubmitting(false);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        const trimmed = editContent.trim();
        if (!trimmed || editSubmitting) return;
        if (trimmed === comment.content) {
            setEditingId(null);
            return;
        }
        setEditSubmitting(true);
        setEditError('');
        try {
            const updated = await HttpUtil.put(`/comment/${comment.id}`, { content: trimmed });
            onEditSubmit(comment.id, updated);
            setEditingId(null);
        } catch (err) {
            setEditError(err.message || '编辑失败');
        } finally {
            setEditSubmitting(false);
        }
    };

    const userInitial = comment.user?.username?.charAt(0).toUpperCase() || '?';
    const indentClass = depth === 0
        ? 'ml-0 border-l-0 pl-0'
        : 'md:ml-5 md:border-l-2 md:pl-5 ml-3 border-l border-indigo-100 pl-3 md:border-indigo-100';

    return (
        <div className={`group flex flex-col ${indentClass} first:pt-0`}>
            <div className="flex gap-3 p-3 md:p-4 rounded-2xl bg-white/60 border border-gray-100/70 hover:border-blue-100 transition-all">
                <div className="flex-shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-tr from-blue-50 to-indigo-50 flex items-center justify-center text-blue-600 font-bold text-xs md:text-sm ring-1 ring-black/5">
                    {isSoftDeleted ? '!' : userInitial}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`text-sm font-bold ${isSoftDeleted ? 'text-gray-400 italic' : 'text-gray-700'}`}>
                            {isSoftDeleted ? '占位评论' : comment.user?.username || '匿名用户'}
                        </span>
                        {!isSoftDeleted && comment.replyToUser && comment.replyToUser.username && (
                            <span className="text-xs text-gray-400">
                                回复 <Link
                                    to="#"
                                    onClick={(e) => { e.preventDefault(); setReplyingId(comment.id); }}
                                    className="text-indigo-500 font-semibold hover:underline"
                                >
                                    @{comment.replyToUser.username}
                                </Link>
                            </span>
                        )}
                        <span className="text-[11px] text-gray-400">{formatRelativeTime(comment.createdAt)}</span>
                    </div>

                    {isEditingThis ? (
                        <form onSubmit={handleEditSubmit} className="space-y-2">
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                rows={2}
                                maxLength={1000}
                                className="w-full resize-none rounded-xl border border-blue-200 bg-blue-50/50 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                                autoFocus
                            />
                            <div className="flex items-center justify-between">
                                {editError ? (
                                    <span className="text-[11px] text-red-500">{editError}</span>
                                ) : (
                                    <span className="text-[11px] text-gray-400">{editContent.length}/1000</span>
                                )}
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditingId(null)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 transition-all"
                                    >
                                        <X size={13} /> 取消
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!editContent.trim() || editSubmitting}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                                    >
                                        {editSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
                                        {editSubmitting ? '保存中...' : '保存'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${isSoftDeleted ? 'text-gray-400 italic' : 'text-gray-600'}`}>
                            {DOMPurify.sanitize(comment.content || '')}
                        </p>
                    )}

                    {!isSoftDeleted && !isEditingThis && (
                        <div className="mt-2 flex items-center gap-3">
                            {isLoggedIn && (
                                <button
                                    onClick={() => {
                                        if (isReplyingThis) {
                                            setReplyingId(null);
                                        } else {
                                            setReplyingId(comment.id);
                                            setEditingId(null);
                                        }
                                    }}
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                                        isReplyingThis
                                            ? 'bg-blue-100 text-blue-600'
                                            : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                                    }`}
                                    title="回复"
                                >
                                    <Reply size={12} /> 回复
                                </button>
                            )}
                            {comment.canEdit && (
                                <button
                                    onClick={() => {
                                        if (isEditingThis) {
                                            setEditingId(null);
                                        } else {
                                            setEditingId(comment.id);
                                            setReplyingId(null);
                                        }
                                    }}
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                                        isEditingThis
                                            ? 'bg-indigo-100 text-indigo-600'
                                            : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 opacity-0 group-hover:opacity-100'
                                    }`}
                                    title="编辑"
                                >
                                    <Edit2 size={12} /> 编辑
                                </button>
                            )}
                            {comment.canDelete && (
                                <button
                                    onClick={() => onDeleteRequest(comment.id)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                    title="删除"
                                >
                                    <Trash2 size={12} /> 删除
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Reply input box */}
            {isReplyingThis && !isSoftDeleted && (
                <div className="mt-2 ml-0 md:ml-12">
                    <form onSubmit={handleReplySubmit} className="p-3 rounded-xl bg-blue-50/40 border border-blue-100 space-y-2">
                        <textarea
                            ref={replyInputRef}
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder={`回复 ${comment.replyToUser?.username || comment.user?.username || '评论者'}...`}
                            rows={2}
                            maxLength={1000}
                            className="w-full resize-none rounded-lg border border-blue-200 bg-white/80 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                        />
                        <div className="flex items-center justify-between">
                            {replyError ? (
                                <span className="text-[11px] text-red-500">{replyError}</span>
                            ) : (
                                <span className="text-[11px] text-gray-400">{replyContent.length}/1000</span>
                            )}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setReplyingId(null); setReplyContent(''); setReplyError(''); }}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-white hover:bg-gray-50 border border-gray-200 transition-all"
                                >
                                    <X size={12} /> 取消
                                </button>
                                <button
                                    type="submit"
                                    disabled={!replyContent.trim() || replySubmitting}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                                >
                                    {replySubmitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                    {replySubmitting ? '发送中...' : '回复'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Nested replies (recursive) */}
            {comment.replies && comment.replies.length > 0 && (
                <div className="mt-2 space-y-2 md:space-y-3">
                    {comment.replies.map(child => (
                        <CommentItem
                            key={child.id}
                            comment={child}
                            depth={depth + 1}
                            articleId={articleId}
                            onReplySubmit={onReplySubmit}
                            onEditSubmit={onEditSubmit}
                            onDeleteRequest={onDeleteRequest}
                            replyingId={replyingId}
                            setReplyingId={setReplyingId}
                            editingId={editingId}
                            setEditingId={setEditingId}
                            isLoggedIn={isLoggedIn}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// ---------- Main Comment Section ----------

const CommentSection = ({ articleId }) => {
    const [comments, setComments] = useState([]);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [content, setContent] = useState('');
    const [error, setError] = useState('');

    // Modal state for delete confirmation
    const [deletingId, setDeletingId] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // UI state for inline inputs (one open at a time to keep DOM tidy)
    const [replyingId, setReplyingId] = useState(null);
    const [editingId, setEditingId] = useState(null);

    const isLoggedIn = useMemo(() => !!localStorage.getItem('token'), []);

    const fetchInitial = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await HttpUtil.get(`/comment/article/${articleId}?limit=${PAGE_SIZE}`);
            setComments(data.comments);
            setTotal(data.total);
            setHasMore(data.hasMore);
            setNextCursor(data.nextCursor);
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
        if (loadingMore || !hasMore || !nextCursor) return;
        setLoadingMore(true);
        try {
            const data = await HttpUtil.get(`/comment/article/${articleId}?limit=${PAGE_SIZE}&beforeId=${nextCursor}`);
            setComments(prev => [...prev, ...data.comments]);
            setHasMore(data.hasMore);
            setNextCursor(data.nextCursor);
            setTotal(data.total);
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

    const handleReplySubmit = useCallback((parentId, reply) => {
        setComments(prev => insertReplyIntoTree(prev, parentId, reply));
    }, []);

    const handleEditSubmit = useCallback((id, updated) => {
        setComments(prev => updateCommentInTree(prev, id, () => updated));
    }, []);

    const handleDeleteRequest = useCallback((commentId) => {
        setDeletingId(commentId);
        setIsDeleteModalOpen(true);
    }, []);

    const handleDeleteConfirm = async () => {
        if (!deletingId) return;
        try {
            await HttpUtil.delete(`/comment/${deletingId}`);
            // Try full re-fetch to correctly reflect hard/soft delete state changes
            await fetchInitial();
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
                message="确定要删除这条评论吗？若该评论有回复，内容将被替换为「该评论已删除」占位符以保留对话结构。"
            />

            <div className="px-5 md:px-8 py-5 border-b border-gray-100/70 flex items-center gap-2 bg-gradient-to-r from-blue-50/40 to-indigo-50/40">
                <MessageSquare size={20} className="text-indigo-500" />
                <h2 className="text-lg font-bold text-gray-800">评论区</h2>
                <span className="ml-auto text-xs font-medium text-gray-500 bg-white/70 px-2.5 py-0.5 rounded-full border border-gray-100">
                    共 {total} 条
                </span>
            </div>

            {/* Comment input */}
            <div className="px-5 md:px-8 py-5">
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
            <div className="px-5 md:px-8 pb-6 space-y-3">
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
                        {comments.map(c => (
                            <CommentItem
                                key={c.id}
                                comment={c}
                                depth={0}
                                articleId={articleId}
                                onReplySubmit={handleReplySubmit}
                                onEditSubmit={handleEditSubmit}
                                onDeleteRequest={handleDeleteRequest}
                                replyingId={replyingId}
                                setReplyingId={setReplyingId}
                                editingId={editingId}
                                setEditingId={setEditingId}
                                isLoggedIn={isLoggedIn}
                            />
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
