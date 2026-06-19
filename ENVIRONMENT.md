# 环境配置说明

本文档详细说明 IT 技术交流平台的所有环境变量配置。

## 目录
- [环境配置说明
  - [目录](#目录)
  - [1. 配置加载优先级](#1-配置加载优先级)
  - [2. 环境变量清单](#2-环境变量清单)
    - [2.1 通用配置](#21-通用配置)
    - [2.2 数据库配置](#22-数据库配置)
    - [2.3 JWT 配置](#23-jwt-配置)
    - [2.4 文件上传配置](#24-文件上传配置)
    - [2.5 初始数据配置](#25-初始数据配置)
    - [2.6 前端配置](#26-前端配置)
  - [3. 配置文件说明](#3-配置文件说明)
    - [3.1 后端配置文件](#31-后端配置文件)
    - [3.2 前端配置文件](#32-前端配置文件)
  - [4. 各环境配置指南](#4-各环境配置指南)
    - [4.1 开发环境 (Development)](#41-开发环境-development)
    - [4.2 测试环境 (Test)](#42-测试环境-test)
    - [4.3 生产环境 (Production)](#43-生产环境-production)
  - [5. Docker Compose 环境变量](#5-docker-compose-环境变量)
  - [6. 安全注意事项](#6-安全注意事项)
  - [7. 配置验证](#7-配置验证)

---

## 1. 配置加载优先级

系统按以下优先级加载配置（优先级从高到低）：

1. **系统环境变量
2. `.env` 文件中的变量
3. 环境专属配置文件（`development.js`, `production.js`, `test.js`）
4. 默认配置文件（`default.js`）
5. 代码中的默认值

---

## 2. 环境变量清单

### 2.1 通用配置

| 变量名 | 默认值 | 说明 | 必需 |
|---------|--------|------|------|
| `NODE_ENV` | `development` | 运行环境，可选值：`development`, `test`, `production` | 否 |
| `BACKEND_PORT` | `5160` | 后端服务监听端口 | 否 |
| `FRONTEND_PORT` | `3160` | 前端服务监听端口 | 否 |

### 2.2 数据库配置

| 变量名 | 默认值 | 说明 | 必需 |
|---------|--------|------|------|
| `DB_HOST` | `localhost` | 数据库主机地址 | 否 |
| `DB_PORT` | `3306` | 数据库端口 | 否 |
| `DB_USER` | `root` | 数据库用户名 | 否 |
| `DB_PASSWORD` | `root` | 数据库密码 | 生产环境是 |
| `DB_NAME` | `it_platform` | 数据库名称 | 否 |

### 2.3 JWT 配置

| 变量名 | 默认值 | 说明 | 必需 |
|---------|--------|------|------|
| `JWT_SECRET` | `your_super_secret_jwt_key_should_be_changed` | JWT 签名密钥 | 生产环境是 |
| `JWT_EXPIRES_IN` | `24h` | JWT 过期时间 | 否 |

**JWT 过期时间格式**：
- 秒：`60s`
- 分钟：`30m`
- 小时：`24h`
- 天：`7d`

### 2.4 文件上传配置

| 变量名 | 默认值 | 说明 | 必需 |
|---------|--------|------|------|
| `UPLOAD_MAX_SIZE` | `5242880` (5MB) | 上传文件最大大小（字节） | 否 |
| `UPLOAD_ALLOWED_TYPES` | `image/jpeg,image/png,image/gif,image/webp,image/jpg` | 允许的文件 MIME 类型，多个用逗号分隔 | 否 |

### 2.5 初始数据配置

首次启动时自动创建的用户账号（仅当数据库中无数据时生效）：

| 变量名 | 默认值 | 说明 | 必需 |
|---------|--------|------|------|
| `SEED_ADMIN_USERNAME` | `admin` | 管理员用户名 | 否 |
| `SEED_ADMIN_PASSWORD` | `admin123` | 管理员密码 | 否 |
| `SEED_ADMIN_EMAIL` | `admin@example.com` | 管理员邮箱 | 否 |
| `SEED_USER_USERNAME` | `user` | 普通用户名 | 否 |
| `SEED_USER_PASSWORD` | `user123` | 普通用户密码 | 否 |
| `SEED_USER_EMAIL` | `user@example.com` | 普通用户邮箱 | 否 |

### 2.6 前端配置

前端环境变量必须以 `VITE_` 开头才能在客户端代码中访问：

| 变量名 | 默认值 | 说明 | 必需 |
|---------|--------|------|------|
| `VITE_API_BASE_URL` | `http://localhost:5160` | 后端 API 基础地址 | 否 |
| `VITE_APP_NAME` | `IT技术交流平台` | 应用名称 | 否 |
| `VITE_APP_VERSION` | `1.0.0` | 应用版本号 | 否 |

---

## 3. 配置文件说明

### 3.1 后端配置文件

后端配置文件位于 `backend/config/` 目录下：

```
backend/config/
├── default.js          # 默认配置（所有环境共享的基础配置）
├── development.js    # 开发环境配置
├── production.js     # 生产环境配置
└── test.js          # 测试环境配置
```

**配置文件加载逻辑**（在 `app.js` 中实现）：

```javascript
const env = process.env.NODE_ENV || 'development';
let config;
try {
  config = require(`./config/${env}`);
} catch (e) {
  config = require('./config/default');
}
```

### 3.2 前端配置文件

前端配置文件位于 `frontend/` 目录下：

```
frontend/
├── .env.example       # 环境变量模板
├── .env.development   # 开发环境变量
├── .env.production    # 生产环境变量
```

Vite 会自动加载对应环境的 `.env` 文件：
- `npm run dev` → 加载 `.env.development`
- `npm run build` → 加载 `.env.production`

---

## 4. 各环境配置指南

### 4.1 开发环境 (Development)

**推荐的 `.env` 配置示例：

```dotenv
NODE_ENV=development

# 后端配置
BACKEND_PORT=5160
JWT_SECRET=dev_jwt_secret_key_for_development_only
JWT_EXPIRES_IN=7d

# 数据库配置（本地）
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=it_platform

# 文件上传
UPLOAD_MAX_SIZE=10485760

# 初始数据
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=admin123
SEED_ADMIN_EMAIL=admin@example.com
SEED_USER_USERNAME=user
SEED_USER_PASSWORD=user123
SEED_USER_EMAIL=user@example.com

# 前端配置
FRONTEND_PORT=3160
VITE_API_BASE_URL=http://localhost:5160
```

### 4.2 测试环境 (Test)

测试环境使用内存数据库，无需外部 MySQL：

```dotenv
NODE_ENV=test
BACKEND_PORT=5161
JWT_SECRET=test_jwt_secret_key_for_testing_only
```

### 4.3 生产环境 (Production)

**生产环境必须修改以下配置：**

```dotenv
NODE_ENV=production

# 后端配置
BACKEND_PORT=5160
JWT_SECRET=your_very_long_and_complex_random_string_here_change_this_in_production
JWT_EXPIRES_IN=1h

# 数据库配置（生产环境务必使用强密码）
DB_HOST=your_production_db_host
DB_PORT=3306
DB_USER=it_platform_user
DB_PASSWORD=your_strong_password_here
DB_NAME=it_platform

# 文件上传
UPLOAD_MAX_SIZE=5242880

# 生产环境不建议使用初始数据配置
# 首次部署后可删除或注释以下配置
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=your_strong_admin_password
SEED_ADMIN_EMAIL=admin@yourdomain.com

# 前端配置
FRONTEND_PORT=80
VITE_API_BASE_URL=https://api.yourdomain.com
```

**生产环境安全建议：

1. **JWT 密钥**：使用至少 32 位的随机字符串
   ```bash
   # 生成安全的 JWT 密钥
   openssl rand -hex 32
   ```

2. **数据库密码**：使用强密码，避免使用默认密码

3. **初始数据**：首次部署后删除初始用户创建逻辑或修改默认密码

4. **HTTPS**：生产环境必须使用 HTTPS

5. **防火墙**：限制数据库端口访问

---

## 5. Docker Compose 环境变量

Docker Compose 会自动读取项目根目录下的 `.env` 文件。

**在 `docker-compose.yml` 中使用环境变量：

```yaml
services:
  backend:
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      DB_HOST: db
      DB_PASSWORD: ${DB_PASSWORD:-root}
      JWT_SECRET: ${JWT_SECRET:-default_secret}
```

**语法说明**：
- `${VARIABLE_NAME:-default_value}`：如果变量未设置则使用默认值
- `${VARIABLE_NAME}`：直接使用变量值，如果未设置则为空

---

## 6. 配置验证

启动服务后，可以通过以下方式验证配置：

**1. 检查后端启动日志**：

```
当前运行环境: production
Server running on port 5160
```

**2. 调用后端健康检查接口**：

```bash
curl http://localhost:5160/
# 应返回: Hello Koa 5160
```

**3. 检查 Docker 容器环境变量**：

```bash
# 查看后端容器环境变量
docker exec it_platform_backend env
```

**4. 查看配置（开发辅助脚本**：

```bash
# 检查 .env 文件是否存在
ls -la .env

# 检查环境变量是否正确
cat .env | grep -E "^[A-Z_]+=" | head -10
```

---

## 7. 常见问题

**Q: 修改了 .env 文件后如何生效？**

A: 需要重启服务：
```bash
# Docker 方式
docker compose restart

# 或完整重启
docker compose up --build -d
```

**Q: 如何查看当前生效的配置？**

A: 可以在后端代码中添加调试接口，或查看启动日志确认运行环境。

**Q: 不同环境的配置文件会被提交到代码库吗？**

A: `.env` 文件已加入 `.gitignore`，不会被提交。但配置模板文件（`.env.example`）和各环境的默认配置文件会被提交。

**Q: 如何确保所有环境行为一致？**

A:
1. 使用 `npm ci` 而非 `npm install` 安装依赖，确保依赖版本一致
2. 使用 Docker 容器化部署
3. CI/CD 流水线自动验证各环境构建
4. 配置文件保持结构一致
5. 环境变量命名和默认值在各环境保持一致
