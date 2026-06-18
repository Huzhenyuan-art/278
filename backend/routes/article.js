const Router = require('koa-router');
const { Article, User, Like, Tag, ArticleTag } = require('../models');
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

// List all articles
router.get('/', optionalAuthMiddleware, async (ctx) => {
    const { tagId, tagName, sort } = ctx.query;
    const userId = ctx.state.user?.id;
    
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

    const articles = await Article.findAll({
        where,
        include,
        order: [['createdAt', sortOrder]],
        distinct: true
    });

    const articlesWithTags = await attachTagsToArticles(articles);
    const plainArticles = articlesWithTags.map(a => Article.build(a, { isNewRecord: false }));
    const likedArticles = await attachLikeInfo(plainArticles, userId);

    ctx.body = likedArticles.map((a, i) => ({ ...a, tags: articlesWithTags[i].tags }));
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
        ctx.body = { liked: false, likeCount: await Like.count({ where: { articleId } }) };
    } else {
        await Like.create({ userId, articleId });
        ctx.body = { liked: true, likeCount: await Like.count({ where: { articleId } }) };
    }
});

// Create article
router.post('/', authMiddleware, async (ctx) => {
    const { title, content, tagIds } = ctx.request.body;
    if (!title || !content) {
        ctx.throw(400, '标题和内容为必填项');
    }
    const article = await Article.create({
        title,
        content,
        authorId: ctx.state.user.id
    });

    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
        const tags = await Tag.findAll({ where: { id: { [Op.in]: tagIds } } });
        await article.addTags(tags);
    }

    const articleWithTags = await Article.findByPk(article.id, {
        include: [{ model: Tag, through: { attributes: [] }, attributes: ['id', 'name', 'color'] }]
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
    if (article.authorId !== ctx.state.user.id) {
        ctx.throw(403, '权限不足');
    }
    const { title, content, status, tagIds } = ctx.request.body;
    await article.update({ title, content, status });

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
    if (article.authorId !== ctx.state.user.id) {
        ctx.throw(403, '权限不足');
    }
    await article.destroy();
    ctx.body = { message: 'Article deleted' };
});

module.exports = router;
