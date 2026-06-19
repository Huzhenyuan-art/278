import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, MessageCircle, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNotification } from '../hooks/useNotification';

const Notifications = () => {
    const navigate = useNavigate();
    const {
        unreadCount,
        notifications,
        loading,
        page,
        totalPages,
        total,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
    } = useNotification();

    useEffect(() => {
        fetchNotifications(1);
    }, [fetchNotifications]);

    const handleNotifClick = useCallback((notification) => {
        if (!notification.isRead) {
            markAsRead(notification.id);
        }
        navigate(`/article/${notification.articleId}`);
    }, [markAsRead, navigate]);

    const goPage = (p) => {
        if (p >= 1 && p <= totalPages) {
            fetchNotifications(p);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <Bell size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">我的通知</h1>
                        <p className="text-xs text-gray-400">
                            共 {total} 条通知，{unreadCount} 条未读
                        </p>
                    </div>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                    >
                        <CheckCheck size={16} />
                        全部标记已读
                    </button>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-gray-400">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3" />
                        加载中...
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Bell size={48} className="mb-3 opacity-20" />
                        <p className="text-lg font-medium">暂无通知</p>
                        <p className="text-sm mt-1">当有人评论或点赞你的文章时，你会在这里收到通知</p>
                    </div>
                ) : (
                    <>
                        {notifications.map((n, idx) => {
                            const Icon = n.type === 'comment' ? MessageCircle : Heart;
                            const iconBg = n.type === 'comment'
                                ? 'bg-blue-50 text-blue-500'
                                : 'bg-red-50 text-red-500';
                            const action = n.type === 'comment' ? '评论了' : '赞了';

                            return (
                                <div
                                    key={n.id}
                                    onClick={() => handleNotifClick(n)}
                                    className={`flex items-start gap-4 px-6 py-4 cursor-pointer transition-colors hover:bg-gray-50 ${!n.isRead ? 'bg-blue-50/30' : ''} ${idx < notifications.length - 1 ? 'border-b border-gray-50' : ''}`}
                                >
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${iconBg}`}>
                                        <Icon size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-800 leading-relaxed">
                                            <span className="font-semibold">{n.triggerUser?.username || '用户'}</span>
                                            {' '}{action}你的文章{' '}
                                            <span className="font-medium text-blue-600">「{n.articleTitle}」</span>
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1.5">
                                            {new Date(n.createdAt).toLocaleString('zh-CN')}
                                        </p>
                                    </div>
                                    {!n.isRead && (
                                        <div className="flex-shrink-0 w-2.5 h-2.5 bg-blue-500 rounded-full mt-2" />
                                    )}
                                </div>
                            );
                        })}

                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-3 py-4 border-t border-gray-100">
                                <button
                                    onClick={() => goPage(page - 1)}
                                    disabled={page <= 1}
                                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="text-sm text-gray-500 font-medium">
                                    {page} / {totalPages}
                                </span>
                                <button
                                    onClick={() => goPage(page + 1)}
                                    disabled={page >= totalPages}
                                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Notifications;
