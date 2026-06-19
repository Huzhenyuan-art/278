import { HttpUtil } from './HttpUtil';

/**
 * 截断内容文本，超出长度显示省略号
 * @param {string} content - 原始内容
 * @param {number} maxLength - 最大长度，默认 120
 * @returns {string} 截断后的内容
 */
export const truncateContent = (content, maxLength = 120) => {
    if (!content) return '';
    const plainText = content
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

    return plainText.length > maxLength
        ? plainText.slice(0, maxLength) + '...'
        : plainText;
};

/**
 * 获取完整的图片 URL
 * @param {string} url - 图片路径（可能是相对路径）
 * @returns {string} 完整的图片 URL
 */
export const getFullImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    return `${HttpUtil.BASE_URL}${url.startsWith('/') ? url : '/' + url}`;
};

/**
 * 获取当前登录用户信息
 * @returns {Object|null} 用户信息对象，未登录返回 null
 */
export const getCurrentUser = () => {
    try {
        const userStr = localStorage.getItem('user');
        if (!userStr) return null;
        const user = JSON.parse(userStr);
        return user && typeof user === 'object' ? user : null;
    } catch (e) {
        console.warn('Failed to parse user from localStorage:', e);
        return null;
    }
};

/**
 * 保存当前登录用户信息
 * @param {Object} user - 用户信息对象
 */
export const setCurrentUser = (user) => {
    if (user && typeof user === 'object') {
        localStorage.setItem('user', JSON.stringify(user));
    }
};

/**
 * 清除当前登录用户信息和 token
 */
export const clearCurrentUser = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
};

/**
 * 检查用户是否已登录
 * @returns {boolean} 是否已登录
 */
export const isLoggedIn = () => {
    const token = localStorage.getItem('token');
    return HttpUtil.isTokenValid(token);
};

/**
 * 转义正则表达式特殊字符
 * @param {string} string - 原始字符串
 * @returns {string} 转义后的字符串
 */
export const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * 高亮文本中的关键词
 * @param {string} text - 原始文本
 * @param {string} keyword - 需要高亮的关键词
 * @param {React.ComponentType} [HighlightComponent] - 自定义高亮组件
 * @returns {Array<React.ReactNode>|string} 高亮后的内容
 */
export const highlightText = (text, keyword, HighlightComponent = null) => {
    if (!text || !keyword) return text;

    const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
        if (regex.test(part)) {
            if (HighlightComponent) {
                return <HighlightComponent key={index}>{part}</HighlightComponent>;
            }
            return (
                <mark
                    key={index}
                    className="bg-yellow-200/80 text-yellow-900 px-0.5 py-0.5 rounded font-medium"
                >
                    {part}
                </mark>
            );
        }
        return <span key={index}>{part}</span>;
    });
};

/**
 * 检查当前用户是否有权限修改文章
 * @param {Object} article - 文章对象（需包含 authorId 字段）
 * @returns {boolean} 是否有权限
 */
export const canModifyArticle = (article) => {
    if (!article) return false;
    const user = getCurrentUser();
    if (!user) return false;
    return article.authorId === user.id || user.role === 'admin';
};

/**
 * 防抖函数
 * @param {Function} func - 需要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export const debounce = (func, delay) => {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
};

/**
 * 节流函数
 * @param {Function} func - 需要节流的函数
 * @param {number} limit - 时间间隔（毫秒）
 * @returns {Function} 节流后的函数
 */
export const throttle = (func, limit) => {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
};

/**
 * 安全的 JSON 解析
 * @param {string} str - JSON 字符串
 * @param {*} defaultValue - 解析失败时的默认值
 * @returns {*} 解析结果或默认值
 */
export const safeJsonParse = (str, defaultValue = null) => {
    try {
        return JSON.parse(str);
    } catch (e) {
        console.warn('JSON parse failed:', e);
        return defaultValue;
    }
};

/**
 * 复制文本到剪贴板
 * @param {string} text - 要复制的文本
 * @returns {Promise<boolean>} 是否复制成功
 */
export const copyToClipboard = async (text) => {
    try {
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
    } catch (e) {
        console.error('Copy to clipboard failed:', e);
        return false;
    }
};
