const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const logger = require('koa-logger');
const serve = require('koa-static');
const path = require('path');

const env = process.env.NODE_ENV || 'development';
let config;
try {
  config = require(`./config/${env}`);
} catch (e) {
  console.warn(`未找到 ${env} 环境配置，使用默认配置`);
  config = require('./config/default');
}

console.log(`当前运行环境: ${env}`);

const app = new Koa();

// Middleware
app.use(logger());
app.use(bodyParser({
  enableTypes: ['json', 'form'],
  jsonLimit: '10mb',
  formLimit: '10mb',
}));
app.use(serve(path.join(__dirname, 'public')));

// Error Handling
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = {
      error: err.message,
    };
    ctx.app.emit('error', err, ctx);
  }
});

const { initDb } = require('./models');
const authRoutes = require('./routes/user');
const articleRoutes = require('./routes/article');
const tagRoutes = require('./routes/tag');
const commentRoutes = require('./routes/comment');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');
const uploadRoutes = require('./routes/upload');
const notificationRoutes = require('./routes/notification');

// Initialize DB
initDb();

// Routes
app.use(authRoutes.routes()).use(authRoutes.allowedMethods());
app.use(articleRoutes.routes()).use(articleRoutes.allowedMethods());
app.use(tagRoutes.routes()).use(tagRoutes.allowedMethods());
app.use(commentRoutes.routes()).use(commentRoutes.allowedMethods());
app.use(adminRoutes.routes()).use(adminRoutes.allowedMethods());
app.use(profileRoutes.routes()).use(profileRoutes.allowedMethods());
app.use(uploadRoutes.routes()).use(uploadRoutes.allowedMethods());
app.use(notificationRoutes.routes()).use(notificationRoutes.allowedMethods());

app.use(async ctx => {
    if (ctx.path === '/') {
        ctx.body = 'Hello Koa 5160';
    } else {
        ctx.status = 404;
        ctx.body = { error: 'API 接口不存在', path: ctx.path };
    }
});


const port = config.port || 5160;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;
