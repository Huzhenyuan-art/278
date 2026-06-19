const Router = require('koa-router');
const { User, Article, Like, Comment, Tag, ArticleTag } = require('../models');
const { authMiddleware } = require('../utils/rbac');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

const router = new Router({
    prefix: '/user'
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

    const articleCount = await Article.count({ where: { authorId: userId } });
    const publishedArticleCount = await Article.count({ 
        where: { authorId: userId, status: 'published' } 
    });
    const draftArticleCount = await Article.count({ 
        where: { authorId: userId, status: 'draft' } 
    });

    const commentCount = await Comment.count({ where: { userId, isDeleted: false } });

    const userArticles = await Article.findAll({
        where: { authorId: userId },
        attributes: ['id']
    });
    const articleIds = userArticles.map(a => a.id);

    const likeReceivedCount = articleIds.length > 0 
        ? await Like.count({ where: { articleId: { [Op.in]: articleIds } } })
        : 0;

    const likeGivenCount = await Like.count({ where: { userId } });

    let totalViews = 0;
    let totalWordCount = 0;
    if (articleIds.length > 0) {
        const articles = await Article.findAll({
            where: { id: { [Op.in]: articleIds }, status: 'published' },
            attributes: ['content']
        });
        articles.forEach(article => {
            const words = article.content.replace(/\s/g, '').length;
            totalWordCount += words;
        });
    }

    ctx.body = {
        articleCount,
        publishedArticleCount,
        draftArticleCount,
        commentCount,
        likeReceivedCount,
        likeGivenCount,
        totalViews,
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
