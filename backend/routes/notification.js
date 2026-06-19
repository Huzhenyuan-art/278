const Router = require('koa-router');
const { Notification, User } = require('../models');
const { authMiddleware } = require('../utils/rbac');
const { Op } = require('sequelize');

const router = new Router({
    prefix: '/notification'
});

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

router.get('/', authMiddleware, async (ctx) => {
    const userId = ctx.state.user.id;
    const page = Math.max(1, parseInt(ctx.query.page, 10) || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(ctx.query.pageSize, 10) || DEFAULT_PAGE_SIZE));
    const offset = (page - 1) * limit;

    const { count, rows } = await Notification.findAndCountAll({
        where: { recipientId: userId },
        include: [
            { model: User, as: 'triggerUser', attributes: ['id', 'username', 'avatar'] },
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
    });

    ctx.body = {
        total: count,
        page,
        pageSize: limit,
        totalPages: Math.ceil(count / limit),
        results: rows,
    };
});

router.get('/unread-count', authMiddleware, async (ctx) => {
    const userId = ctx.state.user.id;
    const count = await Notification.count({
        where: { recipientId: userId, isRead: false },
    });
    ctx.body = { unreadCount: count };
});

router.patch('/:id/read', authMiddleware, async (ctx) => {
    const notificationId = parseInt(ctx.params.id, 10);
    if (isNaN(notificationId)) {
        ctx.throw(400, '无效的通知 ID');
    }

    const notification = await Notification.findOne({
        where: { id: notificationId, recipientId: ctx.state.user.id },
    });

    if (!notification) {
        ctx.throw(404, '通知未找到');
    }

    notification.isRead = true;
    await notification.save();

    ctx.body = { message: '已标记为已读', id: notification.id };
});

router.patch('/read-all', authMiddleware, async (ctx) => {
    const userId = ctx.state.user.id;
    const [updatedCount] = await Notification.update(
        { isRead: true },
        { where: { recipientId: userId, isRead: false } }
    );

    ctx.body = { message: '全部标记为已读', updatedCount };
});

module.exports = router;
