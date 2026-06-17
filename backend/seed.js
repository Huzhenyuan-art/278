const bcrypt = require('bcryptjs');
const config = require('./config/default');
const User = require('./models/user');
const Article = require('./models/article');

const createUser = async ({ username, password, email, role }) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashedPassword, email, role });
    console.log(`Seed ${role} created: username="${username}"`);
    return user;
};

const sampleArticles = [
    {
        authorUsername: 'admin',
        title: 'React 18 并发特性入门',
        status: 'published',
        content: `React 18 引入了并发渲染（Concurrent Rendering），让应用在高负载下仍能保持响应流畅。

核心 API 包括 startTransition 和 useDeferredValue。startTransition 可将非紧急的状态更新标记为「过渡更新」，React 会优先处理用户输入等紧急更新。

useDeferredValue 则用于延迟展示某个值的 UI 反馈，适合搜索框、大列表过滤等场景。配合 Suspense，还能在数据加载时展示 fallback 界面。

建议从「搜索防抖 + useDeferredValue」这类小场景开始实践，逐步体会并发模式带来的体验提升。`,
    },
    {
        authorUsername: 'admin',
        title: 'Docker Compose 多服务编排实践',
        status: 'published',
        content: `Docker Compose 是本地开发与小型部署的利器，用一份 YAML 即可定义多个相互依赖的服务。

典型结构包含 db、backend、frontend 三层：数据库提供持久化，后端通过服务名（如 db）访问数据库，前端通过 Nginx 反向代理 /api 到后端。

depends_on 只保证启动顺序，不保证服务就绪。数据库类服务建议在后端加入重试逻辑，避免「连接被拒绝」导致启动失败。

数据卷（volumes）用于持久化 MySQL 数据。开发环境重置数据时可执行 docker compose down -v 清空卷后重新启动。`,
    },
    {
        authorUsername: 'user',
        title: 'MySQL 索引优化常见思路',
        status: 'published',
        content: `索引是 MySQL 查询性能的关键。最基础的原则是：为 WHERE、JOIN、ORDER BY 中频繁出现的列建立合适索引。

联合索引遵循最左前缀原则。例如 (a, b, c) 索引可加速 a、a+b、a+b+c 条件，但单独 b 或 c 无法利用该索引。

避免在索引列上使用函数或隐式类型转换，否则索引会失效。EXPLAIN 是排查慢查询的必备工具，重点关注 type、key、rows、Extra 字段。

写多读少的场景要权衡索引维护成本，不是索引越多越好。`,
    },
    {
        authorUsername: 'user',
        title: 'JWT 认证在前后端分离项目中的应用',
        status: 'published',
        content: `JWT（JSON Web Token）是无状态认证的常见方案。登录成功后服务端签发 Token，客户端存储并在后续请求 Header 中携带 Authorization: Bearer <token>。

Payload 通常包含用户 id、角色等声明，服务端用密钥验签即可识别身份，无需服务端会话存储。

注意 Token 过期策略与安全存储：浏览器端常用 localStorage，需防范 XSS；生产环境务必使用强密钥并通过环境变量注入。

权限控制应在服务端强制执行，前端路由守卫仅用于改善体验，不能替代后端鉴权。`,
    },
    {
        authorUsername: 'user',
        title: 'Koa 中间件洋葱模型理解',
        status: 'draft',
        content: `Koa 的中间件采用洋葱模型：请求从外层中间件进入，逐层向内执行 await next()，再逐层向外返回。

这种设计让 logger、bodyParser、错误处理、鉴权等横切逻辑可以清晰组合。每个中间件只需关注自己的职责，通过 ctx 传递上下文。

错误处理中间件通常放在最外层，用 try/catch 包裹 await next()，统一格式化错误响应。

相比 Express 的 callback 风格，Koa 的 async/await 更易读，也更适合现代 Node.js 项目。`,
    },
];

const seedUsers = async () => {
    const count = await User.count();
    if (count > 0) {
        return;
    }

    await createUser({ ...config.seedAdmin, role: 'admin' });
    await createUser({ ...config.seedUser, role: 'user' });
};

const seedArticles = async () => {
    const count = await Article.count();
    if (count > 0) {
        return;
    }

    const users = await User.findAll({ attributes: ['id', 'username'] });
    const userByName = Object.fromEntries(users.map((u) => [u.username, u.id]));

    for (const item of sampleArticles) {
        const authorId = userByName[item.authorUsername];
        if (!authorId) {
            console.warn(`Skip article "${item.title}": author "${item.authorUsername}" not found`);
            continue;
        }

        await Article.create({
            title: item.title,
            content: item.content,
            status: item.status,
            authorId,
        });
    }

    console.log(`Seed articles created: ${sampleArticles.length} items`);
};

const seed = async () => {
    await seedUsers();
    await seedArticles();
};

module.exports = { seed };
