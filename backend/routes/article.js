const Router = require('koa-router');
const { Article, User } = require('../models');
const { verifyToken } = require('../utils/jwt');

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

// List all articles
router.get('/', async (ctx) => {
    const articles = await Article.findAll({
        include: [{ model: User, attributes: ['username'] }],
        order: [['createdAt', 'DESC']]
    });
    ctx.body = articles;
});

// Get single article
router.get('/:id', async (ctx) => {
    const article = await Article.findByPk(ctx.params.id, {
        include: [{ model: User, attributes: ['username'] }]
    });
    if (!article) {
        ctx.throw(404, '文章未找到');
    }
    ctx.body = article;
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
