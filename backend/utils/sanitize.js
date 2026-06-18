const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const { marked } = require('marked');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

marked.setOptions({
    gfm: true,
    breaks: true,
    headerIds: false,
    mangle: false
});

const sanitizeMarkdown = (markdownContent) => {
    if (!markdownContent || typeof markdownContent !== 'string') {
        return '';
    }
    return markdownContent;
};

const renderMarkdownToSafeHtml = (markdownContent) => {
    if (!markdownContent || typeof markdownContent !== 'string') {
        return '';
    }
    const rawHtml = marked.parse(markdownContent);
    return DOMPurify.sanitize(rawHtml, {
        ADD_ATTR: ['target'],
        ADD_TAGS: ['iframe'],
        FORBID_TAGS: ['script', 'style', 'form', 'input', 'button'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus']
    });
};

const sanitizeHtml = (htmlContent) => {
    if (!htmlContent || typeof htmlContent !== 'string') {
        return '';
    }
    return DOMPurify.sanitize(htmlContent, {
        ADD_ATTR: ['target'],
        ADD_TAGS: ['iframe'],
        FORBID_TAGS: ['script', 'style', 'form', 'input', 'button'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus']
    });
};

module.exports = {
    sanitizeMarkdown,
    renderMarkdownToSafeHtml,
    sanitizeHtml
};
