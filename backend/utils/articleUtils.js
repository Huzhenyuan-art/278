const { Like, ArticleTag, Tag, Comment, Article } = require('../models');
const { Op } = require('sequelize');

/**
 * 为文章列表附加点赞数量和当前用户是否已点赞的信息
 * @param {Array} articles - 文章模型实例数组
 * @param {number|null} userId - 当前用户ID（可选）
 * @returns {Promise<Array>} 附加了 likeCount 和 liked 字段的文章对象数组
 */
const attachLikeInfo = async (articles, userId) => {
    const articleIds = articles.map(a => a.id);
    const likeCounts = await Like.findAll({
        attributes: ['articleId', [Like.sequelize.fn('COUNT', '*'), 'count']],
        where: { articleId: { [Op.in]: articleIds } },
        group: ['articleId']
    });
    const countMap = Object.fromEntries(
        likeCounts.map(l => [l.articleId, parseInt(l.get('count'))])
    );

    let likedMap = {};
    if (userId) {
        const userLikes = await Like.findAll({
            attributes: ['articleId'],
            where: { articleId: { [Op.in]: articleIds }, userId }
        });
        likedMap = Object.fromEntries(
            userLikes.map(l => [l.articleId, true])
        );
    }

    return articles.map(article => ({
        ...article.toJSON(),
        likeCount: countMap[article.id] || 0,
        liked: !!likedMap[article.id]
    }));
};

/**
 * 为文章列表附加标签信息
 * @param {Array} articles - 文章模型实例或普通对象数组
 * @returns {Promise<Array>} 附加了 tags 字段的文章对象数组
 */
const attachTagsToArticles = async (articles) => {
    const articleIds = articles.map(a => a.id);
    const articleTags = await ArticleTag.findAll({
        where: { articleId: { [Op.in]: articleIds } },
        include: [{
            model: Tag,
            attributes: ['id', 'name', 'color'],
            required: false
        }]
    });
    const tagsMap = {};
    articleTags.forEach(at => {
        if (!tagsMap[at.articleId]) {
            tagsMap[at.articleId] = [];
        }
        if (at.tag) {
            tagsMap[at.articleId].push(at.tag.toJSON());
        }
    });
    return articles.map(article => {
        const data = article.toJSON ? article.toJSON() : article;
        return { ...data, tags: tagsMap[article.id] || [] };
    });
};

/**
 * 为文章列表附加评论数量
 * @param {Array} articles - 文章对象数组
 * @returns {Promise<Array>} 附加了 commentCount 字段的文章对象数组
 */
const attachCommentCount = async (articles) => {
    const articleIds = articles.map(a => a.id);
    const commentCounts = await Comment.findAll({
        attributes: ['articleId', [Comment.sequelize.fn('COUNT', '*'), 'count']],
        where: { articleId: { [Op.in]: articleIds } },
        group: ['articleId']
    });
    const countMap = Object.fromEntries(
        commentCounts.map(c => [c.articleId, parseInt(c.get('count'))])
    );
    return articles.map(article => ({
        ...article,
        commentCount: countMap[article.id] || 0
    }));
};

/**
 * 检查当前用户是否有权限修改文章
 * @param {Object} article - 文章对象（需包含 authorId 字段）
 * @param {Object} user - 当前用户对象（需包含 id 和 role 字段）
 * @returns {boolean} 是否有权限
 */
const canModifyArticle = (article, user) => {
    if (!article || !user) return false;
    return article.authorId === user.id || user.role === 'admin';
};

/**
 * 移除 Markdown 格式标记，返回纯文本
 * @param {string} text - 包含 Markdown 的文本
 * @returns {string} 纯文本内容
 */
const stripMarkdown = (text) => {
    if (!text) return '';
    return text
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
};

/**
 * 从文章内容中提取搜索摘要
 * @param {string} text - 文章内容（Markdown 格式）
 * @param {string} keyword - 搜索关键词
 * @param {number} snippetLength - 摘要长度，默认 150
 * @returns {string} 包含关键词的摘要文本
 */
const extractSnippet = (text, keyword, snippetLength = 150) => {
    const plainText = stripMarkdown(text);
    const lowerText = plainText.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();
    const index = lowerText.indexOf(lowerKeyword);

    if (index === -1) {
        return plainText.length > snippetLength
            ? plainText.slice(0, snippetLength) + '...'
            : plainText;
    }

    const halfSnippet = Math.floor(snippetLength / 2);
    let start = Math.max(0, index - halfSnippet);
    let end = Math.min(plainText.length, index + keyword.length + halfSnippet);

    if (start > 0) start = plainText.indexOf(' ', start) !== -1 ? plainText.indexOf(' ', start) + 1 : start;
    if (end < plainText.length) end = plainText.lastIndexOf(' ', end) !== -1 ? plainText.lastIndexOf(' ', end) : end;

    let snippet = plainText.slice(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < plainText.length) snippet = snippet + '...';

    return snippet;
};

/**
 * 批量获取用户的文章统计数据，避免 N+1 查询
 * @param {Array<number>} userIds - 用户ID数组
 * @returns {Promise<Object>} 以用户ID为键的统计对象映射 { [userId]: { articleCount } }
 */
const getUserArticleStats = async (userIds) => {
    if (!userIds || userIds.length === 0) return {};
    
    const stats = await Article.findAll({
        attributes: ['authorId', [Article.sequelize.fn('COUNT', '*'), 'articleCount']],
        where: { authorId: { [Op.in]: userIds } },
        group: ['authorId'],
        raw: true
    });

    return Object.fromEntries(
        stats.map(s => [s.authorId, { articleCount: parseInt(s.articleCount) }])
    );
};

/**
 * 构建完整的文章列表响应数据（统一处理标签、点赞、评论数）
 * @param {Array} articles - 文章模型实例数组
 * @param {number|null} userId - 当前用户ID（可选）
 * @param {Object} options - 配置选项
 * @param {boolean} options.includeTags - 是否包含标签，默认 true
 * @param {boolean} options.includeLikes - 是否包含点赞信息，默认 true
 * @param {boolean} options.includeCommentCount - 是否包含评论数，默认 false
 * @returns {Promise<Array>} 完整的文章数据数组
 */
const buildArticleListResponse = async (articles, userId, options = {}) => {
    const { includeTags = true, includeLikes = true, includeCommentCount = false } = options;
    
    let result = articles;
    
    if (includeTags) {
        result = await attachTagsToArticles(result);
    }
    
    if (includeLikes) {
        const plainArticles = result.map(a => Article.build(a, { isNewRecord: false }));
        const likedArticles = await attachLikeInfo(plainArticles, userId);
        result = likedArticles.map((a, i) => ({ ...a, tags: result[i].tags }));
    }
    
    if (includeCommentCount) {
        result = await attachCommentCount(result);
    }
    
    return result;
};

module.exports = {
    attachLikeInfo,
    attachTagsToArticles,
    attachCommentCount,
    canModifyArticle,
    stripMarkdown,
    extractSnippet,
    getUserArticleStats,
    buildArticleListResponse
};
