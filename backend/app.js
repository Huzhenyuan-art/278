const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const logger = require('koa-logger');
const serve = require('koa-static');
const path = require('path');
const config = require('./config/default');

const app = new Koa();

// Middleware
app.use(logger());
app.use(bodyParser());
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

// Initialize DB
initDb();

// Routes
app.use(authRoutes.routes()).use(authRoutes.allowedMethods());
app.use(articleRoutes.routes()).use(articleRoutes.allowedMethods());
app.use(tagRoutes.routes()).use(tagRoutes.allowedMethods());

app.use(async ctx => {
    if (ctx.path === '/') {
        ctx.body = 'Hello Koa 5160';
    }
});


const port = config.port || 5160;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;
