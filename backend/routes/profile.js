const Router = require('koa-router');
const { User, Article, Like, Comment } = require('../models');
const { authMiddleware } = require('../utils/rbac');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const {
    attachLikeInfo,
    attachTagsToArticles,
    buildArticleListResponse
} = require('../utils/articleUtils');

const router = new Router({
    prefix: '/user'
});

router.get('/profile', authMiddleware, async (ctx) => {
    const userId = ctx.state.user.id;
    const user = await User.findByPk(userId, {
        attributes: { exclude: ['password'] }
    });
    
    if (!user) {
        ctx.throw(404, '用户不存在');
    }

    ctx.body = user.toJSON();
});

router.put('/profile', authMiddleware, async (ctx) => {
    const userId = ctx.state.user.id;
    const { nickname, avatar, bio, phone, location, website, email } = ctx.request.body;

    const user = await User.findByPk(userId);
    if (!user) {
        ctx.throw(404, '用户不存在');
    }

    const updateData = {};
    if (nickname !== undefined) {
        if (nickname && nickname.length > 50) {
            ctx.throw(400, '昵称长度不能超过50个字符');
        }
        updateData.nickname = nickname;
    }
    if (avatar !== undefined) {
        updateData.avatar = avatar;
    }
    if (bio !== undefined) {
        if (bio && bio.length > 500) {
            ctx.throw(400, '个人简介长度不能超过500个字符');
        }
        updateData.bio = bio;
    }
    if (phone !== undefined) {
        if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
            ctx.throw(400, '请输入有效的手机号码');
        }
        updateData.phone = phone;
    }
    if (location !== undefined) {
        if (location && location.length > 100) {
            ctx.throw(400, '所在地长度不能超过100个字符');
        }
        updateData.location = location;
    }
    if (website !== undefined) {
        if (website && !/^https?:\/\/.+/.test(website)) {
            ctx.throw(400, '网站地址必须以 http:// 或 https:// 开头');
        }
        updateData.website = website;
    }
    if (email !== undefined) {
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            ctx.throw(400, '请输入有效的邮箱地址');
        }
        updateData.email = email;
    }

    await user.update(updateData);

    const updatedUser = await User.findByPk(userId, {
        attributes: { exclude: ['password'] }
    });

    ctx.body = updatedUser.toJSON();
});

router.put('/password', authMiddleware, async (ctx) => {
    const userId = ctx.state.user.id;
    const { oldPassword, newPassword, confirmPassword } = ctx.request.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
        ctx.throw(400, '请填写完整的密码信息');
    }

    if (newPassword.length < 6 || newPassword.length > 20) {
        ctx.throw(400, '新密码长度必须在 6 到 20 个字符之间');
    }

    if (newPassword !== confirmPassword) {
        ctx.throw(400, '两次输入的新密码不一致');
    }

    if (oldPassword === newPassword) {
        ctx.throw(400, '新密码不能与旧密码相同');
    }

    const user = await User.findByPk(userId);
    if (!user) {
        ctx.throw(404, '用户不存在');
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
        ctx.throw(400, '原密码错误');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });

    ctx.body = { message: '密码修改成功' };
});

router.get('/stats', authMiddleware, async (ctx) => {
    const userId = ctx.state.user.id;

    const [
        articleStats,
        commentCount,
        likeGivenCount,
        userArticles
    ] = await Promise.all([
        Article.findAll({
            attributes: [
                'status',
                [Article.sequelize.fn('COUNT', '*'), 'count']
            ],
            where: { authorId: userId },
            group: ['status'],
            raw: true
        }),
        Comment.count({ where: { userId, isDeleted: false } }),
        Like.count({ where: { userId } }),
        Article.findAll({
            where: { authorId: userId },
            attributes: ['id', 'content', 'status']
        })
    ]);

    const articleCount = articleStats.reduce((sum, s) => sum + parseInt(s.count), 0);
    const publishedArticleCount = articleStats.find(s => s.status === 'published')?.count || 0;
    const draftArticleCount = articleStats.find(s => s.status === 'draft')?.count || 0;

    const articleIds = userArticles.map(a => a.id);
    const likeReceivedCount = articleIds.length > 0
        ? await Like.count({ where: { articleId: { [Op.in]: articleIds } } })
        : 0;

    let totalWordCount = 0;
    userArticles.forEach(article => {
        if (article.status === 'published') {
            totalWordCount += article.content.replace(/\s/g, '').length;
        }
    });

    ctx.body = {
        articleCount,
        publishedArticleCount,
        draftArticleCount,
        commentCount,
        likeReceivedCount,
        likeGivenCount,
        totalViews: 0,
        totalWordCount
    };
});

router.get('/articles', authMiddleware, async (ctx) => {
    const userId = ctx.state.user.id;
    const { status, sort } = ctx.query;

    let where = { authorId: userId };
    if (status && ['published', 'draft'].includes(status)) {
        where.status = status;
    }

    const sortOrder = sort === 'asc' ? 'ASC' : 'DESC';

    const articles = await Article.findAll({
        where,
        include: [
            { model: User, attributes: ['username', 'nickname', 'avatar'] },
            { model: Tag, through: { attributes: [] }, attributes: ['id', 'name', 'color'] }
        ],
        order: [['createdAt', sortOrder]],
        distinct: true
    });

    const articlesWithTags = await attachTagsToArticles(articles);
    const plainArticles = articlesWithTags.map(a => Article.build(a, { isNewRecord: false }));
    const likedArticles = await attachLikeInfo(plainArticles, userId);

    ctx.body = likedArticles.map((a, i) => ({ 
        ...a, 
        tags: articlesWithTags[i].tags 
    }));
});

module.exports = router;
