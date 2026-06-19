# IT技术交流和分享平台

一个基于 React + Koa.js + MySQL 的 IT 技术交流和分享平台，支持文章发布、评论互动、标签管理等功能。

## 🛠 技术栈

- **前端**: React 18 + Vite + WindiCSS + React Router
- **后端**: Koa.js + Sequelize ORM + JWT 认证
- **数据库**: MySQL 8.0
- **容器化**: Docker + Docker Compose
- **CI/CD**: GitHub Actions

## 📋 项目结构

```
├── backend/                 # 后端代码
│   ├── config/             # 配置文件
│   │   ├── default.js      # 默认配置
│   │   ├── development.js  # 开发环境配置
│   │   ├── production.js   # 生产环境配置
│   │   └── test.js         # 测试环境配置
│   ├── models/             # 数据模型
│   ├── routes/             # API 路由
│   ├── tests/              # 单元测试
│   ├── utils/              # 工具函数
│   ├── Dockerfile          # 后端 Dockerfile
│   ├── package.json        # 后端依赖
│   └── app.js              # 后端入口
├── frontend/               # 前端代码
│   ├── src/                # 源代码
│   ├── .env.development    # 开发环境变量
│   ├── .env.production     # 生产环境变量
│   ├── Dockerfile          # 前端 Dockerfile
│   ├── nginx.conf          # Nginx 配置
│   └── package.json        # 前端依赖
├── .github/
│   └── workflows/
│       └── ci.yml          # CI/CD 流水线配置
├── .env.example            # 环境变量模板
├── docker-compose.yml      # Docker Compose 配置
├── run.sh                  # Linux/Mac 启动脚本
├── run.bat                 # Windows 启动脚本
├── ENVIRONMENT.md          # 环境配置详细说明
└── README.md               # 本文件
```

## 🚀 快速开始（一键启动）

### 前置要求

- Docker Desktop 4.0+
- Docker Compose v2+

### 方式一：使用启动脚本（推荐）

**Linux/Mac:**
```bash
./run.sh
```

**Windows (PowerShell):**
```powershell
.\run.bat
```

**脚本选项:**
```
-c, --clean      清理模式：停止服务并删除所有数据卷
-r, --rebuild    重建模式：无缓存重新构建镜像并启动
-s, --stop       停止模式：仅停止所有服务
-h, --help       显示帮助信息
```

### 方式二：使用 Docker Compose 命令

1. **复制环境变量配置**
   ```bash
   cp .env.example .env
   # 根据需要修改 .env 文件中的配置
   ```

2. **启动所有服务**
   ```bash
   docker compose up --build -d
   ```

3. **等待服务启动**
   首次启动需要约 2-3 分钟进行数据库初始化和数据填充。

4. **验证服务状态**
   ```bash
   docker compose ps
   ```

### 方式三：本地开发（不使用 Docker）

**启动后端:**
```bash
cd backend
npm install
npm run dev
```

**启动前端:**
```bash
cd frontend
npm install
npm run dev
```

**启动数据库:**
需要本地安装 MySQL 8.0 并创建数据库 `it_platform`。

## 🔗 服务地址

启动成功后，可通过以下地址访问：

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端应用 | http://localhost:3160 | Web 界面 |
| 后端 API | http://localhost:5160 | API 接口 |
| 数据库 | localhost:3306 | MySQL 数据库 |
| API 健康检查 | http://localhost:5160/ | 验证后端是否正常运行 |

## 👤 测试账号

首次启动（数据库无用户时）会自动创建以下测试账号：

| 角色 | 用户名 | 密码 | 邮箱 |
|------|--------|------|------|
| 管理员 | `admin` | `admin123` | admin@example.com |
| 普通用户 | `user` | `user123` | user@example.com |

首次启动还会自动创建 **5 篇示例文章**（admin 2 篇、user 3 篇，含 1 篇草稿状态）。

## 🔧 常用命令

### Docker Compose 命令

```bash
# 查看服务状态
docker compose ps

# 查看服务日志
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend

# 重启服务
docker compose restart

# 停止服务
docker compose down

# 停止服务并删除数据卷（⚠️ 会清空所有数据）
docker compose down -v

# 重新构建镜像
docker compose build
docker compose build --no-cache
```

### 后端命令

```bash
# 开发模式
npm run dev

# 生产模式
npm start

# 运行测试
npm test
npm run test:watch
npm run test:coverage

# 语法检查
node --check app.js
```

### 前端命令

```bash
# 开发模式
npm run dev

# 生产构建
npm run build

# 预览构建产物
npm run preview

# 代码检查
npm run lint
```

## ⚙️ 环境变量配置

所有环境变量均可通过 `.env` 文件配置。复制 `.env.example` 为 `.env` 并根据需要修改。

### 核心环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `NODE_ENV` | `development` | 运行环境：development/test/production |
| `BACKEND_PORT` | `5160` | 后端端口 |
| `FRONTEND_PORT` | `3160` | 前端端口 |
| `DB_HOST` | `db` | 数据库主机 |
| `DB_PORT` | `3306` | 数据库端口 |
| `DB_USER` | `root` | 数据库用户名 |
| `DB_PASSWORD` | `root` | 数据库密码 |
| `DB_NAME` | `it_platform` | 数据库名 |
| `JWT_SECRET` | `...` | JWT 密钥（生产环境必须修改） |
| `VITE_API_BASE_URL` | `http://localhost:5160` | 前端 API 地址 |

**详细的环境变量说明请参阅 [ENVIRONMENT.md](ENVIRONMENT.md)**

## 🔒 生产环境部署

### 安全配置

1. **修改默认密码和密钥**
   ```dotenv
   JWT_SECRET=your_very_long_and_complex_random_string
   DB_PASSWORD=your_strong_password
   SEED_ADMIN_PASSWORD=your_strong_admin_password
   ```

2. **生成安全的 JWT 密钥**
   ```bash
   openssl rand -hex 32
   ```

3. **配置 HTTPS**
   建议使用 Nginx 或 Traefik 作为反向代理，配置 SSL 证书。

### 部署步骤

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 更新环境变量配置
cp .env.example .env
# 编辑 .env 文件，修改生产环境配置

# 3. 构建并启动
docker compose up --build -d

# 4. 验证服务状态
docker compose ps

# 5. 查看日志确认无错误
docker compose logs -f --tail=100
```

## 🧪 CI/CD 流水线

项目配置了 GitHub Actions 自动化流水线，在代码提交或 PR 时自动执行以下检查：

1. **代码质量检查** - 语法检查、Lint 检查
2. **后端单元测试** - 运行 Jest 测试套件
3. **前端构建测试** - 验证生产构建是否成功
4. **Docker 镜像构建** - 验证 Docker 镜像能否正常构建
5. **集成测试** - 启动完整服务栈进行验证
6. **部署校验** - main 分支合并时生成部署报告

**流水线配置文件**: `.github/workflows/ci.yml`

## 📦 依赖版本锁定

为确保各环境行为一致，项目使用以下策略：

1. **package-lock.json** - 使用 `npm ci` 安装依赖，确保版本完全一致
2. **固定版本号** - `package.json` 中使用精确版本号，避免 `^` 或 `~`
3. **统一包管理器** - 使用 npm，不混用 yarn 或 pnpm

**安装依赖方式:**
```bash
# 使用锁定的版本安装（推荐）
npm ci

# 或更新依赖并生成新的 lock 文件
npm install
```

## 🔄 重新初始化数据

如需清空所有数据并重新初始化：

```bash
# Linux/Mac
./run.sh --clean

# Windows
.\run.bat --clean

# 或手动执行
docker compose down -v
docker compose up --build -d
```

## 📚 更多文档

- [环境配置详细说明](ENVIRONMENT.md) - 完整的环境变量和配置文件说明
- [FIX_GUIDE.md](FIX_GUIDE.md) - 常见问题修复指南

## 🤝 新成员入门指南

1. **克隆代码**
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. **安装 Docker**
   下载并安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)

3. **一键启动**
   ```bash
   # Linux/Mac
   ./run.sh
   
   # Windows
   .\run.bat
   ```

4. **访问应用**
   打开浏览器访问 http://localhost:3160

5. **使用测试账号登录**
   - 管理员：admin / admin123
   - 普通用户：user / user123

## 📝 开发规范

### 代码提交

- 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范
- 提交前确保本地测试通过
- PR 需要通过 CI 流水线检查才能合并

### 分支策略

- `main` - 生产环境分支，保护分支
- `develop` - 开发环境分支
- `feature/*` - 功能分支
- `bugfix/*` - 修复分支

### 依赖管理

- 使用 `npm ci` 安装依赖，确保版本一致
- 添加新依赖时使用 `npm install <package>@<version>`
- 更新依赖后提交新的 `package-lock.json`

## 🐛 常见问题

**Q: 启动后前端无法连接后端？**

A: 检查 `docker-compose ps` 确认所有服务状态为 `healthy`，查看后端日志确认服务已启动。

**Q: 数据库连接失败？**

A: 确保 MySQL 容器已启动，检查 `.env` 文件中的数据库配置是否正确。

**Q: 如何修改端口？**

A: 修改 `.env` 文件中的 `BACKEND_PORT` 和 `FRONTEND_PORT`，然后重启服务。

**Q: 如何查看后端日志？**

A: `docker compose logs -f backend`

**更多问题请参阅 [FIX_GUIDE.md](FIX_GUIDE.md)**

## 📄 许可证

ISC License
