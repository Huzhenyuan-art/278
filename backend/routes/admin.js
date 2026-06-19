const Router = require('koa-router');
const { User, Article } = require('../models');
const { adminMiddleware, ROLES } = require('../utils/rbac');
const { sanitizeMarkdown } = require('../utils/sanitize');
const {
    attachLikeInfo,
    attachTagsToArticles,
    attachCommentCount,
    getUserArticleStats,
    buildArticleListResponse
} = require('../utils/articleUtils');

const router = new Router({
    prefix: '/admin'
});

router.get('/users', adminMiddleware, async (ctx) => {
    const users = await User.findAll({
        attributes: ['id', 'username', 'email', 'role', 'createdAt', 'updatedAt'],
        order: [['createdAt', 'DESC']]
    });

    const userIds = users.map(u => u.id);
    const statsMap = await getUserArticleStats(userIds);

    const userStats = users.map(user => ({
        ...user.toJSON(),
        articleCount: statsMap[user.id]?.articleCount || 0
    }));

    ctx.body = userStats;
});

router.patch('/users/:id/role', adminMiddleware, async (ctx) => {
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
});

router.get('/articles', adminMiddleware, async (ctx) => {
    const { status, sort, page = 1, pageSize = 10 } = ctx.query;
    const userId = ctx.state.user.id;

    const currentPage = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(pageSize) || 10));
    const offset = (currentPage - 1) * limit;

    let where = {};
    if (status && ['draft', 'published'].includes(status)) {
        where.status = status;
    }

    const sortOrder = sort === 'asc' ? 'ASC' : 'DESC';

    const { count, rows: articles } = await Article.findAndCountAll({
        where,
        include: [
            { model: User, attributes: ['id', 'username'] }
        ],
        order: [['createdAt', sortOrder]],
        distinct: true,
        limit,
        offset
    });

    const results = await buildArticleListResponse(articles, userId, {
        includeTags: true,
        includeLikes: true,
        includeCommentCount: true
    });

    ctx.body = {
        total: count,
        page: currentPage,
        pageSize: limit,
        totalPages: Math.ceil(count / limit),
        results
    };
});

router.delete('/articles/:id', adminMiddleware, async (ctx) => {
    const article = await Article.findByPk(ctx.params.id);
    if (!article) {
        ctx.throw(404, '文章未找到');
    }
    await article.destroy();
    ctx.body = { message: '文章已删除' };
});

router.get('/stats', adminMiddleware, async (ctx) => {
    const { Like, Comment } = require('../models');
    
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
});

module.exports = router;
