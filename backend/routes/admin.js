const Router = require('koa-router');
const { User, Article, Like, Tag, ArticleTag, Comment } = require('../models');
const { adminMiddleware, ROLES } = require('../utils/rbac');
const { sanitizeMarkdown } = require('../utils/sanitize');
const { Op } = require('sequelize');

const router = new Router({
    prefix: '/admin'
});

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

router.get('/users', adminMiddleware, async (ctx) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'email', 'role', 'createdAt', 'updatedAt'],
            order: [['createdAt', 'DESC']]
        });

        const userStats = await Promise.all(users.map(async (user) => {
            const articleCount = await Article.count({ where: { authorId: user.id } });
            return {
                ...user.toJSON(),
                articleCount
            };
        }));

        ctx.body = userStats;
    } catch (err) {
        ctx.status = err.status || 500;
        ctx.body = { error: err.message };
    }
});

router.patch('/users/:id/role', adminMiddleware, async (ctx) => {
    try {
        const { role } = ctx.request.body;
        const validRoles = Object.values(ROLES);

        if (!role || !validRoles.includes(role)) {
            ctx.throw(400, `无效的角色值，仅允许：${validRoles.join('、')}`);
        }

        const targetUser = await User.findByPk(ctx.params.id);
        if (!targetUser) {
            ctx.throw(404, '用户不存在');
        }

        if (targetUser.id === ctx.state.user.id && role !== ROLES.ADMIN) {
            ctx.throw(400, '不能降低自己的管理员权限');
        }

        const oldRole = targetUser.role;
        await targetUser.update({ role });

        ctx.body = {
            id: targetUser.id,
            username: targetUser.username,
            role: targetUser.role,
            oldRole,
            message: `用户角色已从${oldRole === 'admin' ? '管理员' : '普通用户'}修改为${role === 'admin' ? '管理员' : '普通用户'}`
        };
    } catch (err) {
        ctx.status = err.status || 500;
        ctx.body = { error: err.message };
    }
});

router.get('/articles', adminMiddleware, async (ctx) => {
    try {
        const { status, sort } = ctx.query;
        const userId = ctx.state.user.id;

        let where = {};
        if (status && ['draft', 'published'].includes(status)) {
            where.status = status;
        }

        const sortOrder = sort === 'asc' ? 'ASC' : 'DESC';

        const articles = await Article.findAll({
            where,
            include: [
                { model: User, attributes: ['id', 'username'] },
                { model: Tag, through: { attributes: [] }, attributes: ['id', 'name', 'color'] }
            ],
            order: [['createdAt', sortOrder]],
            distinct: true
        });

        const articlesWithTags = await attachTagsToArticles(articles);
        const plainArticles = articlesWithTags.map(a => Article.build(a, { isNewRecord: false }));
        const likedArticles = await attachLikeInfo(plainArticles, userId);
        const articlesWithComments = await attachCommentCount(likedArticles);

        ctx.body = articlesWithComments.map((a, i) => ({
            ...a,
            tags: articlesWithTags[i].tags
        }));
    } catch (err) {
        ctx.status = err.status || 500;
        ctx.body = { error: err.message };
    }
});

router.delete('/articles/:id', adminMiddleware, async (ctx) => {
    try {
        const article = await Article.findByPk(ctx.params.id);
        if (!article) {
            ctx.throw(404, '文章未找到');
        }
        await article.destroy();
        ctx.body = { message: '文章已删除' };
    } catch (err) {
        ctx.status = err.status || 500;
        ctx.body = { error: err.message };
    }
});

router.get('/stats', adminMiddleware, async (ctx) => {
    try {
        const [totalUsers, totalArticles, totalComments, totalLikes] = await Promise.all([
            User.count(),
            Article.count(),
            Comment.count(),
            Like.count()
        ]);

        const adminCount = await User.count({ where: { role: 'admin' } });
        const publishedCount = await Article.count({ where: { status: 'published' } });
        const draftCount = await Article.count({ where: { status: 'draft' } });

        ctx.body = {
            totalUsers,
            adminCount,
            regularUserCount: totalUsers - adminCount,
            totalArticles,
            publishedCount,
            draftCount,
            totalComments,
            totalLikes
        };
    } catch (err) {
        ctx.status = err.status || 500;
        ctx.body = { error: err.message };
    }
});

module.exports = router;
