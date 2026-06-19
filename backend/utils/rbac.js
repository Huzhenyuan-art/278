const { verifyToken } = require('./jwt');

const ROLES = {
    ADMIN: 'admin',
    USER: 'user'
};

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

const adminMiddleware = async (ctx, next) => {
    const token = ctx.header.authorization?.replace('Bearer ', '');
    if (!token) {
        ctx.throw(401, '需要身份验证');
    }
    const decoded = verifyToken(token);
    if (!decoded) {
        ctx.throw(401, '无效的令牌');
    }
    if (decoded.role !== ROLES.ADMIN) {
        ctx.throw(403, '权限不足，需要管理员权限');
    }
    ctx.state.user = decoded;
    await next();
};

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

module.exports = {
    ROLES,
    authMiddleware,
    adminMiddleware,
    optionalAuthMiddleware
};
