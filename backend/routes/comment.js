const Router = require('koa-router');
const { Comment, User, Article } = require('../models');
const { verifyToken } = require('../utils/jwt');
const { Op } = require('sequelize');

const router = new Router({
    prefix: '/comment'
});

// Middleware to check auth
const authMiddleware = async (ctx, next) => {
    const token = ctx.header.authorization?.replace('Bearer ', '');
    if (!token) {
        ctx.throw(401, '需要身份验证');
    }
    const decoded = verifyToken(token);
    if (!decoded) {
        ctx.throw(401, '无效的令牌');
    }
    ctx.state.user = decoded;
    await next();
};

// Middleware to optionally get user (for public endpoints)
const optionalAuthMiddleware = async (ctx, next) => {
    const token = ctx.header.authorization?.replace('Bearer ', '');
    if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
            ctx.state.user = decoded;
        }
    }
    await next();
};

const DEFAULT_PAGE_SIZE = 5;
const MAX_PAGE_SIZE = 50;

// Decide whether the current user can delete a comment:
// the comment author OR the author of the article the comment belongs to.
const computeCanDelete = (commentUserId, articleAuthorId, currentUserId) => {
    return !!currentUserId && (commentUserId === currentUserId || articleAuthorId === currentUserId);
};

// List comments for an article (paginated, newest first)
router.get('/article/:articleId', optionalAuthMiddleware, async (ctx) => {
    const articleId = parseInt(ctx.params.articleId, 10);
    if (isNaN(articleId)) {
        ctx.throw(400, '无效的文章 ID');
    }

    const article = await Article.findByPk(articleId, { attributes: ['id', 'authorId'] });
    if (!article) {
        ctx.throw(404, '文章未找到');
    }

    const limit = Math.min(parseInt(ctx.query.limit, 10) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const beforeId = parseInt(ctx.query.beforeId, 10);

    const where = { articleId };
    if (!isNaN(beforeId)) {
        where.id = { [Op.lt]: beforeId };
    }

    const total = await Comment.count({ where: { articleId } });

    // Fetch one extra record to determine whether there is a next page.
    const rows = await Comment.findAll({
        where,
        include: [{ model: User, attributes: ['id', 'username'] }],
        order: [['id', 'DESC']],
        limit: limit + 1,
    });

    const hasMore = rows.length > limit;
    const comments = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = comments.length > 0 ? comments[comments.length - 1].id : null;

    const currentUserId = ctx.state.user?.id;
    const articleAuthorId = article.authorId;

    const result = comments.map(comment => {
        const data = comment.toJSON();
        return {
            ...data,
            canDelete: computeCanDelete(data.userId, articleAuthorId, currentUserId)
        };
    });

    ctx.body = {
        comments: result,
        total,
        hasMore,
        nextCursor,
    };
});

// Create a comment
router.post('/article/:articleId', authMiddleware, async (ctx) => {
    const articleId = parseInt(ctx.params.articleId, 10);
    if (isNaN(articleId)) {
        ctx.throw(400, '无效的文章 ID');
    }

    const article = await Article.findByPk(articleId, { attributes: ['id', 'authorId'] });
    if (!article) {
        ctx.throw(404, '文章未找到');
    }

    const { content } = ctx.request.body;
    if (!content || !content.trim()) {
        ctx.throw(400, '评论内容不能为空');
    }

    const comment = await Comment.create({
        content: content.trim(),
        userId: ctx.state.user.id,
        articleId,
    });

    const fullComment = await Comment.findByPk(comment.id, {
        include: [{ model: User, attributes: ['id', 'username'] }],
    });

    ctx.body = {
        ...fullComment.toJSON(),
        canDelete: true
    };
});

// Delete a comment
// Allowed for: the comment author OR the author of the article.
router.delete('/:id', authMiddleware, async (ctx) => {
    const comment = await Comment.findByPk(ctx.params.id);
    if (!comment) {
        ctx.throw(404, '评论未找到');
    }

    const userId = ctx.state.user.id;

    // 1. The commenter can delete their own comment.
    if (comment.userId === userId) {
        await comment.destroy();
        ctx.body = { message: '评论已删除' };
        return;
    }

    // 2. The article author can delete any comment under their article.
    const article = await Article.findByPk(comment.articleId, { attributes: ['id', 'authorId'] });
    if (article && article.authorId === userId) {
        await comment.destroy();
        ctx.body = { message: '评论已删除' };
        return;
    }

    ctx.throw(403, '权限不足');
});

module.exports = router;
