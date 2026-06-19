import { useEffect, useCallback, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const useUnsavedChanges = (isDirty) => {
    const location = useLocation();
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const pendingTargetRef = useRef(null);
    const skipNextRef = useRef(false);
    const unmountedRef = useRef(false);
    const dirtyPathRef = useRef(null);

    useEffect(() => {
        unmountedRef.current = false;
        return () => {
            unmountedRef.current = true;
        };
    }, []);

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '您有未保存的更改，确定要离开吗？';
                return e.returnValue;
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    useEffect(() => {
        if (!isDirty) {
            dirtyPathRef.current = null;
            return;
        }
        dirtyPathRef.current = location.pathname + location.search + location.hash;
    }, [isDirty, location.pathname, location.search, location.hash]);

    useEffect(() => {
        if (!isDirty) return;

        const originalPush = window.history.pushState;
        const originalReplace = window.history.replaceState;

        window.history.pushState = function (state, title, url) {
            if (skipNextRef.current) {
                skipNextRef.current = false;
                return originalPush.apply(this, arguments);
            }
            pendingTargetRef.current = { type: 'push', url };
            setShowLeaveDialog(true);
            return originalPush.call(this, window.history.state, title, window.location.href);
        };

        window.history.replaceState = function (state, title, url) {
            if (skipNextRef.current) {
                skipNextRef.current = false;
                return originalReplace.apply(this, arguments);
            }
            return originalReplace.apply(this, arguments);
        };

        const handlePopState = () => {
            if (skipNextRef.current) {
                skipNextRef.current = false;
                return;
            }
            if (unmountedRef.current) return;
            const currentHref = window.location.pathname + window.location.search + window.location.hash;
            pendingTargetRef.current = { type: 'pop', from: dirtyPathRef.current, to: currentHref };
            window.history.pushState(window.history.state, '', currentHref);
            setShowLeaveDialog(true);
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.history.pushState = originalPush;
            window.history.replaceState = originalReplace;
            window.removeEventListener('popstate', handlePopState);
        };
    }, [isDirty]);

    const confirmLeave = useCallback(() => {
        setShowLeaveDialog(false);
        const pending = pendingTargetRef.current;
        skipNextRef.current = true;
        if (pending?.type === 'push') {
            if (pending.url) {
                window.location.assign(pending.url);
            }
        } else if (pending?.type === 'pop') {
            window.history.back();
        }
        pendingTargetRef.current = null;
    }, []);

    const cancelLeave = useCallback(() => {
        setShowLeaveDialog(false);
        pendingTargetRef.current = null;
    }, []);

    const handleBackClick = useCallback((navigateFn) => {
        if (!isDirty) {
            navigateFn();
            return;
        }
        const confirmed = window.confirm('您有未保存的更改，确定要离开吗？');
        if (confirmed) {
            skipNextRef.current = true;
            navigateFn();
        }
    }, [isDirty]);

    const allowNavigation = useCallback(() => {
        skipNextRef.current = true;
    }, []);

    return {
        isDirty,
        showLeaveDialog,
        confirmLeave,
        cancelLeave,
        handleBackClick,
        allowNavigation
    };
};

export default useUnsavedChanges;
