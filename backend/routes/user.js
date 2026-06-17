const Router = require('koa-router');
const { User } = require('../models');
const { signToken } = require('../utils/jwt');
const bcrypt = require('bcryptjs');

const router = new Router({
    prefix: '/auth'
});

router.post('/register', async (ctx) => {
    const { username, password, email } = ctx.request.body;
    try {
        if (!username || !password) {
            ctx.throw(400, '用户名和密码不能为空');
        }
        
        // Length Validation
        if (username.length < 3 || username.length > 20) {
            ctx.throw(400, '用户名长度必须在 3 到 20 个字符之间');
        }
        if (password.length < 6 || password.length > 20) {
            ctx.throw(400, '密码长度必须在 6 到 20 个字符之间');
        }

        const existing = await User.findOne({ where: { username } });
        if (existing) {
            ctx.throw(400, '该用户名已被占用');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            username,
            password: hashedPassword,
            email
        });

        const token = signToken({ id: newUser.id, username: newUser.username, role: newUser.role });
        ctx.body = { token, user: { id: newUser.id, username: newUser.username, role: newUser.role } };
    } catch (err) {
        ctx.status = err.status || 500;
        ctx.body = { error: err.message };
    }
});

router.post('/login', async (ctx) => {
    const { username, password } = ctx.request.body;
    try {
        const user = await User.findOne({ where: { username } });
        if (!user) {
            ctx.throw(401, '用户名或密码错误');
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
             ctx.throw(401, '用户名或密码错误');
        }

        const token = signToken({ id: user.id, username: user.username, role: user.role });
        ctx.body = { token, user: { id: user.id, username: user.username, role: user.role } };
    } catch (err) {
        ctx.status = err.status || 500;
        ctx.body = { error: err.message };
    }
});

module.exports = router;
