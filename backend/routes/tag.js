const Router = require('koa-router');
const { Tag, Article, ArticleTag, User } = require('../models');
const { authMiddleware } = require('../utils/rbac');
const { Op } = require('sequelize');

const router = new Router({
    prefix: '/tag'
});

router.get('/', async (ctx) => {
    const tags = await Tag.findAll({
        order: [['name', 'ASC']]
    });

    const tagIds = tags.map(t => t.id);
    const articleCounts = await ArticleTag.findAll({
        attributes: ['tagId', [ArticleTag.sequelize.fn('COUNT', '*'), 'count']],
        where: { tagId: { [Op.in]: tagIds } },
        group: ['tagId']
    });

    const countMap = Object.fromEntries(
        articleCounts.map(ac => [ac.tagId, parseInt(ac.get('count'))])
    );

    ctx.body = tags.map(tag => ({
        ...tag.toJSON(),
        articleCount: countMap[tag.id] || 0
    }));
});

router.get('/:id', async (ctx) => {
    const tag = await Tag.findByPk(ctx.params.id);
    if (!tag) {
        ctx.throw(404, '标签未找到');
    }
    ctx.body = tag;
});

router.post('/', authMiddleware, async (ctx) => {
    const { name, color } = ctx.request.body;
    if (!name || !name.trim()) {
        ctx.throw(400, '标签名称为必填项');
    }
    const existingTag = await Tag.findOne({ where: { name: name.trim() } });
    if (existingTag) {
        ctx.throw(400, '标签已存在');
    }
    const tag = await Tag.create({
        name: name.trim(),
        color: color || '#3b82f6'
    });
    ctx.body = tag;
});

router.put('/:id', authMiddleware, async (ctx) => {
    const tag = await Tag.findByPk(ctx.params.id);
    if (!tag) {
        ctx.throw(404, '标签未找到');
    }
    const { name, color } = ctx.request.body;
    if (name !== undefined) {
        if (!name.trim()) {
            ctx.throw(400, '标签名称不能为空');
        }
        const existingTag = await Tag.findOne({
            where: { name: name.trim(), id: { [Op.ne]: ctx.params.id } }
        });
        if (existingTag) {
            ctx.throw(400, '标签名称已存在');
        }
        tag.name = name.trim();
    }
    if (color !== undefined) {
        tag.color = color;
    }
    await tag.save();
    ctx.body = tag;
});

router.delete('/:id', authMiddleware, async (ctx) => {
    const tag = await Tag.findByPk(ctx.params.id);
    if (!tag) {
        ctx.throw(404, '标签未找到');
    }
    await ArticleTag.destroy({ where: { tagId: tag.id } });
    await tag.destroy();
    ctx.body = { message: '标签已删除' };
});

router.get('/:id/articles', async (ctx) => {
    const tag = await Tag.findByPk(ctx.params.id, {
        include: [{
            model: Article,
            include: [{ model: User, attributes: ['username'] }],
            through: { attributes: [] }
        }],
        order: [[Article, 'createdAt', 'DESC']]
    });
    if (!tag) {
        ctx.throw(404, '标签未找到');
    }
    ctx.body = tag.articles || [];
});

module.exports = router;
