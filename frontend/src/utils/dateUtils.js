const parseDate = (dateInput) => {
    if (!dateInput) return null;

    if (dateInput instanceof Date) {
        return isNaN(dateInput.getTime()) ? null : dateInput;
    }

    if (typeof dateInput === 'number') {
        const d = new Date(dateInput);
        return isNaN(d.getTime()) ? null : d;
    }

    if (typeof dateInput === 'string') {
        const trimmed = dateInput.trim();
        if (!trimmed) return null;

        if (/^\d+$/.test(trimmed)) {
            const d = new Date(parseInt(trimmed, 10));
            return isNaN(d.getTime()) ? null : d;
        }

        let normalized = trimmed;
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
            normalized = trimmed.replace(' ', 'T');
        }
        if (/^\d{4}\/\d{2}\/\d{2}/.test(trimmed)) {
            normalized = trimmed.replace(/\//g, '-');
            if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
                normalized = normalized.replace(' ', 'T');
            }
        }

        const d = new Date(normalized);
        if (!isNaN(d.getTime())) return d;

        const fallback = new Date(trimmed);
        return isNaN(fallback.getTime()) ? null : fallback;
    }

    return null;
};

export const formatDate = (dateInput, options = {}) => {
    const { showTime = false, fallback = '-' } = options;

    const d = parseDate(dateInput);
    if (!d) return fallback;

    try {
        if (showTime) {
            return d.toLocaleString();
        }
        return d.toLocaleDateString();
    } catch (e) {
        console.warn('Date formatting failed:', e);
        return fallback;
    }
};

export const getDateTimestamp = (dateInput) => {
    const d = parseDate(dateInput);
    return d ? d.getTime() : 0;
};

export const formatRelativeTime = (dateInput) => {
    const d = parseDate(dateInput);
    if (!d) return '-';

    const now = new Date();
    const diff = (now - d) / 1000;

    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`;

    return formatDate(dateInput);
};
