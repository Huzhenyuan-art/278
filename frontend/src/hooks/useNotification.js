import { useState, useEffect, useCallback, useRef } from 'react';
import { HttpUtil } from '../utils/HttpUtil';

const POLL_INTERVAL = 15000;

export const useNotification = () => {
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const timerRef = useRef(null);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const data = await HttpUtil.get('/notification/unread-count');
            setUnreadCount(data.unreadCount);
        } catch {
        }
    }, []);

    const fetchNotifications = useCallback(async (pageNum = 1) => {
        setLoading(true);
        try {
            const data = await HttpUtil.get(`/notification?page=${pageNum}&pageSize=10`);
            setNotifications(data.results);
            setTotalPages(data.totalPages);
            setTotal(data.total);
            setPage(pageNum);
        } catch {
        } finally {
            setLoading(false);
        }
    }, []);

    const markAsRead = useCallback(async (id) => {
        try {
            await HttpUtil.patch(`/notification/${id}/read`);
            setUnreadCount(prev => Math.max(0, prev - 1));
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, isRead: true } : n)
            );
        } catch {
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            await HttpUtil.patch('/notification/read-all');
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch {
        }
    }, []);

    useEffect(() => {
        const token = HttpUtil.getToken();
        if (!token) return;

        fetchUnreadCount();
        timerRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [fetchUnreadCount]);

    return {
        unreadCount,
        notifications,
        loading,
        page,
        totalPages,
        total,
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        markAllAsRead,
    };
};
