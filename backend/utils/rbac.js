const { verifyToken } = require('./jwt');

const ROLES = {
    ADMIN: 'admin',
    USER: 'user'
};

/**
 * 从请求头中提取并验证 JWT Token
 * @param {Object} ctx - Koa 上下文对象
 * @returns {Object|null} 解码后的用户信息，验证失败返回 null
 */
const extractAndVerifyToken = (ctx) => {
    const token = ctx.header.authorization?.replace('Bearer ', '');
    if (!token) return null;
    return verifyToken(token);
};

/**
 * 必须登录中间件 - 验证用户身份
 */
const authMiddleware = async (ctx, next) => {
    const decoded = extractAndVerifyToken(ctx);
    if (!decoded) {
        ctx.throw(401, '需要身份验证');
    }
    ctx.state.user = decoded;
    await next();
};

/**
 * 管理员中间件 - 验证用户身份且必须是管理员角色
 */
const adminMiddleware = async (ctx, next) => {
    const decoded = extractAndVerifyToken(ctx);
    if (!decoded) {
        ctx.throw(401, '需要身份验证');
    }
    if (decoded.role !== ROLES.ADMIN) {
        ctx.throw(403, '权限不足，需要管理员权限');
    }
    ctx.state.user = decoded;
    await next();
};

/**
 * 可选登录中间件 - 有 token 则验证，无 token 则继续（匿名访问）
 */
const optionalAuthMiddleware = async (ctx, next) => {
    const decoded = extractAndVerifyToken(ctx);
    if (decoded) {
        ctx.state.user = decoded;
    }
    await next();
};

module.exports = {
    ROLES,
    authMiddleware,
    adminMiddleware,
    optionalAuthMiddleware,
    extractAndVerifyToken
};
