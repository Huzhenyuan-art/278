import { useEffect, useCallback, useState, useRef } from 'react';
import { useBlocker } from 'react-router-dom';

const useUnsavedChanges = (isDirty, onConfirmedLeave) => {
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState(null);
    const skipNextBlockRef = useRef(false);

    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) => {
            if (skipNextBlockRef.current) {
                skipNextBlockRef.current = false;
                return false;
            }
            if (!isDirty) return false;
            if (currentLocation.pathname === nextLocation.pathname) return false;
            setPendingNavigation(nextLocation);
            setShowLeaveDialog(true);
            return true;
        }
    );

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '您有未保存的更改，确定要离开吗？';
                return '您有未保存的更改，确定要离开吗？';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isDirty]);

    const confirmLeave = useCallback(() => {
        setShowLeaveDialog(false);
        if (blocker.state === 'blocked') {
            blocker.proceed();
        }
        if (onConfirmedLeave) {
            onConfirmedLeave();
        }
    }, [blocker, onConfirmedLeave]);

    const cancelLeave = useCallback(() => {
        setShowLeaveDialog(false);
        setPendingNavigation(null);
        if (blocker.state === 'blocked') {
            blocker.reset();
        }
    }, [blocker]);

    const handleBackClick = useCallback((navigateFn) => {
        if (!isDirty) {
            navigateFn();
            return;
        }
        const confirmed = window.confirm('您有未保存的更改，确定要离开吗？');
        if (confirmed) {
            navigateFn();
        }
    }, [isDirty]);

    const allowNavigation = useCallback(() => {
        skipNextBlockRef.current = true;
    }, []);

    return {
        isDirty,
        showLeaveDialog,
        pendingNavigation,
        confirmLeave,
        cancelLeave,
        handleBackClick,
        allowNavigation,
        blocker
    };
};

export default useUnsavedChanges;
