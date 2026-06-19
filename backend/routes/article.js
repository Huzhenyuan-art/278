const Router = require('koa-router');
const { Article, User, Tag, Notification, Like } = require('../models');
const { authMiddleware, optionalAuthMiddleware, ROLES } = require('../utils/rbac');
const { sanitizeMarkdown } = require('../utils/sanitize');
const { Op } = require('sequelize');
const {
    attachLikeInfo,
    attachTagsToArticles,
    canModifyArticle,
    stripMarkdown,
    extractSnippet
} = require('../utils/articleUtils');

const router = new Router({
    prefix: '/article'
});

const ARTICLE_STATUS = {
    DRAFT: 'draft',
    PUBLISHED: 'published'
};

const VALID_STATUSES = Object.values(ARTICLE_STATUS);

const isValidStatus = (status) => VALID_STATUSES.includes(status);

// List all articles with pagination
router.get('/', optionalAuthMiddleware, async (ctx) => {
    const { tagId, tagName, sort, page = 1, pageSize = 10 } = ctx.query;
    const userId = ctx.state.user?.id;

    const currentPage = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(pageSize) || 10));
    const offset = (currentPage - 1) * limit;
    
    let where = {};
    if (userId) {
        where = {
            [Op.or]: [
                { status: 'published' },
                { status: 'draft', authorId: userId }
            ]
        };
    } else {
        where = { status: 'published' };
    }
    
    let include = [{ model: User, attributes: ['username'] }];

    if (tagId || tagName) {
        let tagCondition = {};
        if (tagId) tagCondition.id = tagId;
        if (tagName) tagCondition.name = tagName;
        include.push({
            model: Tag,
            where: tagCondition,
            through: { attributes: [] },
            attributes: []
        });
    }

    const sortOrder = sort === 'asc' ? 'ASC' : 'DESC';

    const { count, rows: articles } = await Article.findAndCountAll({
        where,
        include,
        order: [['createdAt', sortOrder]],
        distinct: true,
        limit,
        offset
    });

    const articlesWithTags = await attachTagsToArticles(articles);
    const plainArticles = articlesWithTags.map(a => Article.build(a, { isNewRecord: false }));
    const likedArticles = await attachLikeInfo(plainArticles, userId);

    const results = likedArticles.map((a, i) => ({ ...a, tags: articlesWithTags[i].tags }));

    ctx.body = {
        total: count,
        page: currentPage,
        pageSize: limit,
        totalPages: Math.ceil(count / limit),
        results
    };
});

// Get single article
router.get('/:id', optionalAuthMiddleware, async (ctx) => {
    const article = await Article.findByPk(ctx.params.id, {
        include: [
            { model: User, attributes: ['username'] },
            { model: Tag, through: { attributes: [] }, attributes: ['id', 'name', 'color'] }
        ]
    });
    if (!article) {
        ctx.throw(404, '文章未找到');
    }
    const userId = ctx.state.user?.id;
    if (article.status === 'draft' && article.authorId !== userId) {
        ctx.throw(404, '文章未找到');
    }
    const [result] = await attachLikeInfo([article], userId);
    result.tags = article.tags ? article.tags.map(t => t.toJSON()) : [];
    ctx.body = result;
});

// Toggle like on article
router.post('/:id/like', authMiddleware, async (ctx) => {
    const article = await Article.findByPk(ctx.params.id);
    if (!article) {
        ctx.throw(404, '文章未找到');
    }
    const userId = ctx.state.user.id;
    const articleId = article.id;

    const existingLike = await Like.findOne({ where: { userId, articleId } });
    if (existingLike) {
        await existingLike.destroy();
        await Notification.destroy({
            where: { type: 'like', recipientId: article.authorId, triggerUserId: userId, articleId },
        });
        ctx.body = { liked: false, likeCount: await Like.count({ where: { articleId } }) };
    } else {
        await Like.create({ userId, articleId });
        if (article.authorId !== userId) {
            await Notification.create({
                type: 'like',
                recipientId: article.authorId,
                triggerUserId: userId,
                articleId,
                articleTitle: article.title,
            });
        }
        ctx.body = { liked: true, likeCount: await Like.count({ where: { articleId } }) };
    }
});

// Get current user's articles (with status filter) - with pagination
router.get('/mine/list', authMiddleware, async (ctx) => {
    const { status, sort, page = 1, pageSize = 10 } = ctx.query;
    const userId = ctx.state.user.id;

    const currentPage = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(pageSize) || 10));
    const offset = (currentPage - 1) * limit;

    let where = { authorId: userId };
    if (status && isValidStatus(status)) {
        where.status = status;
    }

    const sortOrder = sort === 'asc' ? 'ASC' : 'DESC';

    const { count, rows: articles } = await Article.findAndCountAll({
        where,
        include: [
            { model: User, attributes: ['username'] },
            { model: Tag, through: { attributes: [] }, attributes: ['id', 'name', 'color'] }
        ],
        order: [['createdAt', sortOrder]],
        distinct: true,
        limit,
        offset
    });

    const articlesWithLike = await attachLikeInfo(articles, userId);
    const results = articlesWithLike.map(a => ({
        ...a,
        tags: a.tags ? a.tags.map(t => t.toJSON ? t.toJSON() : t) : []
    }));

    ctx.body = {
        total: count,
        page: currentPage,
        pageSize: limit,
        totalPages: Math.ceil(count / limit),
        results
    };
});

// Toggle article status (draft <-> published)
router.patch('/:id/status', authMiddleware, async (ctx) => {
    const article = await Article.findByPk(ctx.params.id);
    if (!article) {
        ctx.throw(404, '文章未找到');
    }
    if (!canModifyArticle(article, ctx.state.user)) {
        ctx.throw(403, '权限不足，仅作者或管理员可修改此文的状态');
    }

    const { status } = ctx.request.body;
    if (!status || !isValidStatus(status)) {
        ctx.throw(400, `无效的状态值，仅允许：${VALID_STATUSES.join('、')}`);
    }

    const oldStatus = article.status;
    if (oldStatus === status) {
        ctx.body = {
            id: article.id,
            status: article.status,
            changed: false,
            message: '文章状态未发生变化'
        };
        return;
    }

    await article.update({ status });

    ctx.body = {
        id: article.id,
        status: article.status,
        oldStatus,
        changed: true,
        message: `文章已${status === ARTICLE_STATUS.PUBLISHED ? '发布' : '转为草稿'}`
    };
});

// Create article
router.post('/', authMiddleware, async (ctx) => {
    const { title, content, status, tagIds, coverImage } = ctx.request.body;
    if (!title || !content) {
        ctx.throw(400, '标题和内容为必填项');
    }
    if (status !== undefined && !isValidStatus(status)) {
        ctx.throw(400, `无效的状态值，仅允许：${VALID_STATUSES.join('、')}`);
    }
    const sanitizedTitle = String(title).trim().slice(0, 100);
    const sanitizedContent = sanitizeMarkdown(content);
    const createData = {
        title: sanitizedTitle,
        content: sanitizedContent,
        status: status || ARTICLE_STATUS.PUBLISHED,
        authorId: ctx.state.user.id
    };
    if (coverImage !== undefined && coverImage !== null) {
        createData.coverImage = String(coverImage).trim();
    }
    const article = await Article.create(createData);

    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
        const tags = await Tag.findAll({ where: { id: { [Op.in]: tagIds } } });
        await article.addTags(tags);
    }

    const articleWithTags = await Article.findByPk(article.id, {
        include: [
            { model: User, attributes: ['username'] },
            { model: Tag, through: { attributes: [] }, attributes: ['id', 'name', 'color'] }
        ]
    });

    ctx.body = {
        ...articleWithTags.toJSON(),
        tags: articleWithTags.tags ? articleWithTags.tags.map(t => t.toJSON()) : []
    };
});

// Update article
router.put('/:id', authMiddleware, async (ctx) => {
    const article = await Article.findByPk(ctx.params.id);
    if (!article) {
        ctx.throw(404, '文章未找到');
    }
    if (!canModifyArticle(article, ctx.state.user)) {
        ctx.throw(403, '权限不足，仅作者或管理员可编辑此文');
    }
    const { title, content, status, tagIds, coverImage } = ctx.request.body;
    const updateData = {};
    if (title !== undefined) {
        updateData.title = String(title).trim().slice(0, 100);
    }
    if (content !== undefined) {
        updateData.content = sanitizeMarkdown(content);
    }
    if (status !== undefined) {
        if (!isValidStatus(status)) {
            ctx.throw(400, `无效的状态值，仅允许：${VALID_STATUSES.join('、')}`);
        }
        updateData.status = status;
    }
    if (coverImage !== undefined) {
        updateData.coverImage = coverImage ? String(coverImage).trim() : null;
    }
    await article.update(updateData);

    if (tagIds !== undefined) {
        if (Array.isArray(tagIds) && tagIds.length > 0) {
            const tags = await Tag.findAll({ where: { id: { [Op.in]: tagIds } } });
            await article.setTags(tags);
        } else {
            await article.setTags([]);
        }
    }

    const articleWithTags = await Article.findByPk(article.id, {
        include: [
            { model: User, attributes: ['username'] },
            { model: Tag, through: { attributes: [] }, attributes: ['id', 'name', 'color'] }
        ]
    });

    ctx.body = {
        ...articleWithTags.toJSON(),
        tags: articleWithTags.tags ? articleWithTags.tags.map(t => t.toJSON()) : []
    };
});

// Delete article
router.delete('/:id', authMiddleware, async (ctx) => {
    const article = await Article.findByPk(ctx.params.id);
    if (!article) {
        ctx.throw(404, '文章未找到');
    }
    if (!canModifyArticle(article, ctx.state.user)) {
        ctx.throw(403, '权限不足，仅作者或管理员可删除此文');
    }
    await article.destroy();
    ctx.body = { message: '文章已删除' };
});

// Search articles
router.get('/search/list', optionalAuthMiddleware, async (ctx) => {
    const { q, page = 1, pageSize = 10 } = ctx.query;
    const userId = ctx.state.user?.id;

    if (!q || !String(q).trim()) {
        ctx.throw(400, '搜索关键词不能为空');
    }

    const keyword = String(q).trim();
    const likePattern = `%${keyword}%`;
    const currentPage = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(pageSize) || 10));
    const offset = (currentPage - 1) * limit;

    let statusWhere = { status: 'published' };
    if (userId) {
        statusWhere = {
            [Op.or]: [
                { status: 'published' },
                { status: 'draft', authorId: userId }
            ]
        };
    }

    const where = {
        [Op.and]: [
            statusWhere,
            {
                [Op.or]: [
                    { title: { [Op.like]: likePattern } },
                    { content: { [Op.like]: likePattern } }
                ]
            }
        ]
    };

    const include = [
        { model: User, attributes: ['username'] },
        { model: Tag, through: { attributes: [] }, attributes: ['id', 'name', 'color'] }
    ];

    const { count, rows: articles } = await Article.findAndCountAll({
        where,
        include,
        order: [['createdAt', 'DESC']],
        distinct: true,
        limit,
        offset
    });

    const results = articles.map(article => {
        const data = article.toJSON();
        const titleMatch = data.title.toLowerCase().includes(keyword.toLowerCase());
        const contentMatch = data.content.toLowerCase().includes(keyword.toLowerCase());

        let matchScore = 0;
        if (titleMatch) matchScore += 2;
        if (contentMatch) matchScore += 1;

        return {
            ...data,
            snippet: extractSnippet(data.content, keyword),
            matchScore,
            titleMatch,
            contentMatch,
            tags: data.tags ? data.tags.map(t => t) : []
        };
    });

    results.sort((a, b) => b.matchScore - a.matchScore || new Date(b.createdAt) - new Date(a.createdAt));

    ctx.body = {
        total: count,
        page: currentPage,
        pageSize: limit,
        totalPages: Math.ceil(count / limit),
        keyword,
        results
    };
});

module.exports = router;
