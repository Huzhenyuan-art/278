const Router = require('koa-router');
const { Article, User, Like } = require('../models');
const { verifyToken } = require('../utils/jwt');
const { Op } = require('sequelize');

const router = new Router({
    prefix: '/article' // Singular path
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

// Attach like count and liked status to articles
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

// List all articles
router.get('/', optionalAuthMiddleware, async (ctx) => {
    const articles = await Article.findAll({
        include: [{ model: User, attributes: ['username'] }],
        order: [['createdAt', 'DESC']]
    });
    const userId = ctx.state.user?.id;
    ctx.body = await attachLikeInfo(articles, userId);
});

// Get single article
router.get('/:id', optionalAuthMiddleware, async (ctx) => {
    const article = await Article.findByPk(ctx.params.id, {
        include: [{ model: User, attributes: ['username'] }]
    });
    if (!article) {
        ctx.throw(404, '文章未找到');
    }
    const userId = ctx.state.user?.id;
    const [result] = await attachLikeInfo([article], userId);
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
        ctx.body = { liked: false, likeCount: await Like.count({ where: { articleId } }) };
    } else {
        await Like.create({ userId, articleId });
        ctx.body = { liked: true, likeCount: await Like.count({ where: { articleId } }) };
    }
});

// Create article
router.post('/', authMiddleware, async (ctx) => {
    const { title, content } = ctx.request.body;
    if (!title || !content) {
        ctx.throw(400, '标题和内容为必填项');
    }
    const article = await Article.create({
        title,
        content,
        authorId: ctx.state.user.id
    });
    ctx.body = article;
});

// Update article
router.put('/:id', authMiddleware, async (ctx) => {
    const article = await Article.findByPk(ctx.params.id);
    if (!article) {
        ctx.throw(404, '文章未找到');
    }
    if (article.authorId !== ctx.state.user.id) {
        ctx.throw(403, '权限不足');
    }
    const { title, content, status } = ctx.request.body;
    await article.update({ title, content, status });
    ctx.body = article;
});

// Delete article
router.delete('/:id', authMiddleware, async (ctx) => {
    const article = await Article.findByPk(ctx.params.id);
    if (!article) {
        ctx.throw(404, '文章未找到');
    }
    if (article.authorId !== ctx.state.user.id) {
        ctx.throw(403, '权限不足');
    }
    await article.destroy();
    ctx.body = { message: 'Article deleted' };
});

module.exports = router;
