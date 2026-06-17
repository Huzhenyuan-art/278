# IT技术交流和分享平台

## 🛠 技术栈
- Frontend: React + Vite + WindiCSS
- Backend: Koa.js + Sequelize (MySQL)
- Database: MySQL 8.0

## 🚀 启动指南 (How to Run)
1. 确保 Docker Desktop 已启动。
2. 在根目录执行：`docker compose up --build`
3. 等待容器启动完成...

## 🔗 服务地址 (Services)
- Frontend: http://localhost:3160
- Backend API: http://localhost:5160
- Database: localhost:3306 (user: root / pass: root)

## 🧪 测试账号
- 请在登录页面直接点击 "立即注册" 创建账号进行测试。
- Admin: 无预设，注册的第一个用户即可具备完整权限 (根据业务逻辑)。

---

## 🐳 Docker 镜像源配置 (Docker Registry Configuration)

### 推荐配置（基于实际项目验证）

#### 1. Docker 镜像源
**使用官方 Docker Hub 镜像**（已验证稳定可用）

```yaml
# docker-compose.yml 示例
services:
  db:
    image: mysql:8.0                    # MySQL 数据库
  
  backend:
    build: ./backend
  
  frontend:
    build: ./frontend
```

#### 2. npm 依赖源
**使用淘宝镜像**（国内访问快）

在 `Dockerfile` 中添加：
```dockerfile
RUN npm config set registry https://registry.npmmirror.com
```

#### 3. 前端构建加速规范 (Fast Build)

为了极致的构建速度和依赖一致性，建议在本地生成 lock 文件并提交。本项目已包含 `pnpm-lock.yaml`。
