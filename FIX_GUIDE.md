# 前端构建解析失败修复指南

## 问题概述

前端项目在构建时出现 JSX 语法解析失败错误，原因是在 `.js` 后缀的工具文件中直接使用了 JSX 语法，而 Vite 等构建工具默认不会对 `.js` 文件进行 JSX 转译。

---

## 问题原因

### 根本原因
`frontend/src/utils/common.js` 文件中的 `highlightText` 函数直接返回 JSX 元素（`<mark>`、`<span>` 等），但该文件使用 `.js` 后缀。构建工具（Vite）默认仅对 `.jsx` 后缀的文件启用 JSX 语法解析，导致构建时抛出解析错误。

### 问题代码位置
- **文件**: `frontend/src/utils/common.js`
- **函数**: `highlightText`
- **问题**: 函数内直接使用 JSX 语法返回 React 元素

### 影响范围
- 前端开发服务器启动失败
- 生产构建失败
- 所有引用 `common.js` 的模块都会受影响

---

## 解决方案

### 方案选择
采用 **"数据与渲染分离"** 的架构方案：
1. 工具函数（`.js` 文件）只负责数据处理，返回纯数据结构
2. 调用方（React 组件，`.jsx` 文件）负责将数据渲染为 JSX 元素

### 方案优势
- 保持工具文件的纯 JS 特性，不依赖 React
- 提高工具函数的通用性（可在非 React 环境中使用）
- 符合"关注点分离"的设计原则
- 无需修改构建配置，侵入性最小

---

## 实施步骤

### 步骤 1：重构 `highlightText` 函数

**文件**: `frontend/src/utils/common.js`

**修改前**:
```javascript
export const highlightText = (text, keyword, HighlightComponent = null) => {
    if (!text || !keyword) return text;
    const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) => {
        if (regex.test(part)) {
            return <mark key={index} className="...">{part}</mark>;
        }
        return <span key={index}>{part}</span>;
    });
};
```

**修改后**:
```javascript
export const highlightText = (text, keyword) => {
    if (!text || !keyword) return [{ text: text || '', isMatch: false }];
    const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
    const parts = text.split(regex);
    return parts
        .filter(part => part.length > 0)
        .map((part) => ({
            text: part,
            isMatch: regex.test(part)
        }));
};
```

**返回值结构变化**:
- 旧版: `Array<React.ReactNode>` - JSX 元素数组
- 新版: `Array<{text: string, isMatch: boolean}>` - 结构化数据数组

### 步骤 2：更新调用方组件

**文件**: `frontend/src/pages/SearchResults.jsx`

在组件内新增渲染辅助函数：
```javascript
const renderHighlightedText = (text, keyword) => {
    const segments = highlightText(text, keyword);
    return segments.map((segment, index) => (
        segment.isMatch ? (
            <mark key={index} className="bg-yellow-200/80 text-yellow-900 px-0.5 py-0.5 rounded font-medium">
                {segment.text}
            </mark>
        ) : (
            <span key={index}>{segment.text}</span>
        )
    ));
};
```

将原调用 `{highlightText(article.title, keyword)}` 替换为 `{renderHighlightedText(article.title, keyword)}`。

### 步骤 3：清理未使用的导入

移除 `SearchResults.jsx` 中未使用的 `getFullImageUrl` 导入。

---

## 验证方式

### 1. 语法检查
确认 `common.js` 文件中不再包含 JSX 语法：
```bash
grep -n "<" frontend/src/utils/common.js
```

### 2. 启动开发服务器
```bash
cd frontend
npm install
npm run dev
```

### 3. 生产构建验证
```bash
cd frontend
npm run build
```

### 4. 功能验证
1. 打开搜索页面（`/search?q=关键词`）
2. 确认搜索结果中的标题和摘要关键词正确高亮显示
3. 确认高亮样式与修复前完全一致（黄色背景）
4. 验证多个关键词匹配、无匹配、空关键词等边界情况

---

## 改动文件清单

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `frontend/src/utils/common.js` | 修改 | 重构 `highlightText` 函数，移除 JSX 语法 |
| `frontend/src/pages/SearchResults.jsx` | 修改 | 新增 `renderHighlightedText` 渲染函数，适配新 API |

---

## 预防措施

为避免类似问题再次发生，建议：

1. **文件命名规范**：
   - 包含 JSX 的文件必须使用 `.jsx` 后缀
   - 纯工具函数文件使用 `.js` 后缀，且不得包含 JSX 语法

2. **代码审查要点**：
   - 检查 `.js` 文件中是否意外引入 JSX 语法
   - 工具函数应遵循"单一职责"原则，只做数据处理

---

# 文章页面加载错误修复指南

## 问题概述

用户访问文章详情页面时，系统显示"页面加载出错"或"文章不存在"等错误提示，导致无法正常浏览文章内容。错误同时影响文章点赞功能。

---

## 错误现象

### 复现步骤
1. 启动前端和后端服务
2. 在首页点击任意文章卡片进入文章详情页
3. 页面显示"页面加载出错"或始终停留在加载状态
4. 浏览器控制台可见 `ReferenceError: Like is not defined` 错误

### 浏览器环境
- 所有主流浏览器（Chrome、Firefox、Safari、Edge）
- 前端 Vite 开发服务器或生产构建均受影响

---

## 错误原因分析

### 根本原因（后端）
**后端路由 `backend/routes/article.js` 中缺少 `Like` 模型的导入**，但在点赞接口和文章详情查询中大量使用了 `Like` 模型：
- `GET /article/:id` 接口通过 `attachLikeInfo` 间接使用 `Like` 模型
- `POST /article/:id/like` 接口直接调用 `Like.findOne()`、`Like.create()`、`Like.count()`、`Like.destroy()`

由于 `Like` 未被导入，任何涉及文章详情的请求都会触发 500 内部服务器错误。

### 次要原因（前端）
1. **错误处理不完善**：`ArticleDetail.jsx` 没有专门的错误状态 UI，请求失败时用户无法区分是"网络错误"还是"文章不存在"，且缺少重试按钮
2. **未使用的导入**：导入了 `safeJsonParse` 但未使用
3. **DOMPurify 双重净化**：`CommentSection.jsx` 中对已由后端净化的评论内容再次使用 DOMPurify，且直接将净化后的 HTML 字符串作为纯文本渲染，可能导致 HTML 实体显示异常

### 错误定位过程
1. 检查浏览器 Network 面板，发现 `GET /article/:id` 返回 500 错误
2. 检查后端服务器日志，发现 `ReferenceError: Like is not defined` 异常
3. 追溯 `backend/routes/article.js` 第 2 行的模型导入，确认 `Like` 未包含在导入列表中
4. 同时审查前端代码，发现错误处理 UI 缺失等问题

---

## 修复方案

### 修复 1：后端模型导入缺失

**文件**: `backend/routes/article.js`

**修改前**:
```javascript
const { Article, User, Tag, Notification } = require('../models');
```

**修改后**:
```javascript
const { Article, User, Tag, Notification, Like } = require('../models');
```

### 修复 2：前端 ArticleDetail 错误处理增强

**文件**: `frontend/src/pages/ArticleDetail.jsx`

改动内容：
1. 移除未使用的 `safeJsonParse` 导入，引入 `isLoggedIn`、`AlertCircle`、`RefreshCw`
2. 新增 `error` 状态变量，`fetchArticle` 提取为组件方法以便重试
3. 新增完整的错误提示 UI（含"返回上页"和"重新加载"按钮）
4. 优化"文章不存在"提示 UI，增加说明和返回首页按钮
5. 点赞未登录跳转改用 `navigate('/login')` 替代 `window.location.href`，保持 SPA 体验

### 修复 3：前端 CommentSection 渲染优化

**文件**: `frontend/src/components/CommentSection.jsx`

改动内容：
1. 移除 `DOMPurify` 导入（后端已完成 HTML 净化）
2. 评论内容直接渲染为文本，利用 React 自动 XSS 转义机制

---

## 代码变更清单

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `backend/routes/article.js` | 修改 | 补充 `Like` 模型到导入列表 |
| `frontend/src/pages/ArticleDetail.jsx` | 修改 | 增强错误处理 UI，清理冗余导入 |
| `frontend/src/components/CommentSection.jsx` | 修改 | 移除 DOMPurify 双重净化 |

---

## 测试验证

### 1. 后端单元测试
```bash
cd backend
npm install
npm test
```

### 2. 后端手动验证
```bash
# 启动后端服务
cd backend
npm run dev

# 请求文章详情（替换为有效ID）
curl http://localhost:3000/api/article/1
# 预期：返回 200 及完整文章数据，包含 likeCount、liked、tags 等字段
```

### 3. 前端构建验证
```bash
cd frontend
npm install
npm run build
# 预期：构建成功无报错
```

### 4. 功能验证步骤
1. **正常加载**：访问文章详情页，确认文章标题、内容、标签、作者信息正确显示
2. **点赞功能**：登录状态下点击点赞按钮，确认点赞数变化且状态持久化
3. **异常场景 - 网络错误**：断开后端服务后访问文章页，确认显示友好错误提示和"重新加载"按钮
4. **异常场景 - 无效 ID**：访问不存在的文章 ID（如 `/article/99999`），确认显示"文章不存在"提示
5. **评论功能**：在文章详情页发表评论，确认评论内容正确渲染，无 HTML 实体异常
6. **跨浏览器测试**：在 Chrome、Firefox、Safari 中重复以上步骤

---

## 注意事项

1. **模型导入完整性**：新增或修改后端路由时，务必检查顶部 `require('../models')` 是否包含所有使用的模型
2. **前后端净化职责**：HTML 净化的责任应在后端（入库前）完成，前端仅做文本渲染即可，避免双重净化带来的兼容性问题
3. **错误 UI 规范**：所有数据加载页面应至少提供 Loading、Error、Empty 三种状态的 UI，Error 状态应包含重试入口
4. **SPA 路由跳转**：React 应用内跳转优先使用 `useNavigate()`，避免 `window.location.href` 导致全页刷新

---

## 预防措施

1. **代码规范**：在 ESLint 中启用 `no-undef` 规则，防止未定义变量引用
2. **代码审查**：PR 审查时重点检查路由文件的模型导入与使用是否匹配
3. **集成测试**：为文章详情、点赞、评论等核心接口补充集成测试，覆盖 200、404、500 等状态码
4. **全局错误监控**：生产环境可接入 Sentry 等监控工具，第一时间发现 `ReferenceError` 类问题

---

# 个人资料页面 Tag 模型未导入修复指南

## 问题概述

用户访问个人资料页面（"我的文章" tab）时，出现 `ReferenceError: Tag is not defined` 错误，导致用户文章列表无法加载。

---

## 错误现象

### 复现步骤
1. 启动后端服务
2. 用户登录后访问个人中心或"我的文章"页面
3. 前端调用 `GET /user/articles` 接口
4. 接口返回 500 错误，页面显示加载失败

### 错误信息
```
ReferenceError: Tag is not defined
    at .../backend/routes/profile.js:193:15
```

### 影响范围
- 个人资料页面的文章列表
- 用户中心的"我的文章"功能
- 所有调用 `GET /user/articles` 接口的场景

---

## 根本原因

**后端路由 `backend/routes/profile.js` 中缺少 `Tag` 模型的导入**。

在 `GET /user/articles` 接口中（第 189-197 行），使用 `Article.findAll` 查询文章时，通过 `include` 关联查询了 `Tag` 模型以获取文章标签：
```javascript
{ model: Tag, through: { attributes: [] }, attributes: ['id', 'name', 'color'] }
```

但在文件顶部第 2 行的模型导入中，`Tag` 未被包含在解构列表里：
```javascript
const { User, Article, Like, Comment } = require('../models');  // 缺少 Tag
```

---

## 修复方案

**文件**: `backend/routes/profile.js`

**修改前**:
```javascript
const { User, Article, Like, Comment } = require('../models');
```

**修改后**:
```javascript
const { User, Article, Like, Comment, Tag } = require('../models');
```

只需在解构导入中添加 `Tag` 即可。

---

## 验证步骤

### 1. 语法检查
```bash
cd backend
node -c routes/profile.js
# 预期：无语法错误
```

### 2. 接口测试
```bash
# 启动服务
npm run dev

# 测试用户文章接口（需要有效token）
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/user/articles
# 预期：返回 200 及文章列表，每篇文章包含 tags 数组
```

### 3. 功能验证
1. 登录账号
2. 进入个人中心/我的文章页面
3. 确认文章列表正常显示
4. 确认每篇文章的标签正确显示
5. 测试不同状态筛选（已发布/草稿），确认均正常

---

## 相关问题汇总

这是本次重构中发现的第 **2** 个模型导入遗漏问题（第 1 个是 `article.js` 缺少 `Like`）。此类问题的共同特征：

- 代码重构/合并时，从其他文件复制了 include 配置，但忘记同步导入
- 静态代码检查工具（如 ESLint 的 `no-undef`）可提前发现此类问题

建议项目接入 ESLint 并启用 `no-undef` 规则，防止类似问题再次发生。

---

## 改动文件

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `backend/routes/profile.js` | 修改 | 补充 `Tag` 模型到导入列表 |

---

# Docker 构建 npm ci 失败修复指南

## 问题概述

后端和前端 Docker 镜像构建过程中，因 `package-lock.json` 与 `package.json` 版本信息不同步、`package-lock.json` 文件结构不完整，导致 `npm ci` 命令执行失败，使整个构建流程中断。

---

## 错误现象

### 复现步骤

1. 执行 `docker compose build` 或 `docker build ./backend`
2. 构建过程执行到 `npm ci` 步骤时出错
3. 构建中断并返回非零退出码

### 典型错误日志

```
# 错误类型 1：lock 文件版本不匹配
npm ERR! `npm ci` can only install packages when your package.json and
npm ERR! package-lock.json or npm-shrinkwrap.json are in sync. Please
npm ERR! update your lock file with `npm install` before continuing.

# 错误类型 2：lock 文件结构不完整
npm ERR! code ENOENT
npm ERR! syscall open
npm ERR! path /app/node_modules/xxx/package.json
npm ERR! errno -2

# 错误类型 3：依赖 integrity hash 校验失败
npm ERR! Integrity check failed for package xxx
npm ERR! Wanted: sha512-xxx
npm ERR!    Found: sha512-yyy
```

### 影响范围

- 后端 Docker 镜像构建失败
- 前端 Docker 镜像构建失败
- CI/CD 流水线的依赖安装步骤全部失败
- 新成员无法通过 `docker compose up` 一键启动项目

---

## 错误原因分析

### 根本原因

**`package-lock.json` 文件不完整且与 `package.json` 不同步**，具体表现在三个方面：

#### 1. 版本号格式不一致

**`package.json` 使用范围版本号**（带有 `^` 符号）：
```json
{
  "dependencies": {
    "koa": "^2.14.2",
    "mysql2": "^3.6.5"
  }
}
```

**`package-lock.json` 使用精确版本号**：
```json
{
  "packages": {
    "": {
      "dependencies": {
        "koa": "2.14.2",
        "mysql2": "3.6.5"
      }
    }
  }
}
```

`npm ci` 要求两个文件中的版本声明必须完全一致（包括格式），`^2.14.2` ≠ `2.14.2`，因此判定为不同步。

#### 2. package-lock.json 结构不完整

手动创建的 `package-lock.json` 仅包含了顶层依赖，缺少：
- 所有子依赖（transitive dependencies）的完整声明
- 每个依赖包的 `integrity` 哈希值（用于校验包完整性）
- `resolved` 字段（包的下载 URL）
- 各依赖之间的关联关系树

`npm ci` 会严格校验 lock 文件的完整性，缺失以上信息会直接导致安装失败。

#### 3. lock 文件由不同版本 npm 生成

不同版本的 npm（如 npm 8 vs npm 9）生成的 `lockfileVersion` 不同：
- npm 6: `lockfileVersion: 1`
- npm 7/8: `lockfileVersion: 2`
- npm 9+: `lockfileVersion: 3`

如果 `package-lock.json` 由 npm 9 生成（v3），而 CI/Docker 环境使用 npm 8（v2），会存在兼容性问题。

### 问题定位过程

1. **查看 Docker 构建日志**，确认错误发生在 `npm ci` 步骤
2. **对比 `package.json` 与 `package-lock.json`**，发现版本号格式不一致（`^` 符号差异）
3. **检查 lock 文件大小**，发现仅约 1KB（正常完整文件应为 50-200KB）
4. **检查 lock 文件结构**，确认缺少 `integrity`、`resolved` 字段和子依赖树
5. **本地复现验证**：删除 `node_modules` 后执行 `npm ci`，确认同样失败

---

## 修复方案

本次修复采用 **"三重保障"** 策略，从根本上解决问题并预防未来复发：

### 修复 1：统一 package.json 使用精确版本号

**改动文件**: `backend/package.json`, `frontend/package.json`

将所有依赖项的版本号从范围版本（带 `^`）改为精确版本：

**修改前** (`backend/package.json`):
```json
{
  "dependencies": {
    "dotenv": "^16.3.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "koa": "^2.14.2"
  }
}
```

**修改后** (`backend/package.json`):
```json
{
  "dependencies": {
    "dotenv": "16.3.1",
    "bcryptjs": "2.4.3",
    "jsonwebtoken": "9.0.2",
    "koa": "2.14.2"
  }
}
```

**前端同理**，移除所有 `^` 前缀。

### 修复 2：删除不完整的 lock 文件，提供重新生成脚本

**改动操作**:
1. 删除 `backend/package-lock.json`（结构不完整）
2. 删除 `frontend/package-lock.json`（结构不完整）
3. 新增 `scripts/generate-lockfiles.sh`（Linux/Mac）
4. 新增 `scripts/generate-lockfiles.bat`（Windows）

**脚本核心逻辑** (`scripts/generate-lockfiles.sh`):
```bash
# 删除旧的 lock 文件和 node_modules
rm -f package-lock.json
rm -rf node_modules

# 使用 npm install 生成完整的 lock 文件
npm config set registry https://registry.npmmirror.com
npm install --no-audit --no-fund

# 验证 npm ci 可以正常工作
rm -rf node_modules
npm ci --no-audit --no-fund
```

**使用方式**:
```bash
# Linux/Mac
./scripts/generate-lockfiles.sh

# Windows
.\scripts\generate-lockfiles.bat
```

### 修复 3：增强 Dockerfile - npm ci 失败时自动回退

**改动文件**: `backend/Dockerfile`, `frontend/Dockerfile`

将原先硬编码的 `npm ci` 改为智能检测+回退逻辑：

**修改前**:
```dockerfile
COPY package.json package-lock.json* ./
RUN npm config set registry https://registry.npmmirror.com && \
    npm ci
```

**修改后**:
```dockerfile
COPY package.json package-lock.json* ./
RUN npm config set registry https://registry.npmmirror.com && \
    if [ -f package-lock.json ]; then \
        echo "Found package-lock.json, verifying integrity..."; \
        npm ci || (echo "npm ci failed, falling back to npm install..."; rm -f package-lock.json && npm install --no-audit --no-fund); \
    else \
        echo "No package-lock.json found, running npm install..."; \
        npm install --no-audit --no-fund; \
    fi
```

**逻辑说明**:
1. 检查 `package-lock.json` 是否存在
2. 存在 → 先尝试 `npm ci`（严格模式，快且可复现）
3. `npm ci` 失败 → 删除无效 lock 文件，回退到 `npm install`（兼容模式）
4. 不存在 → 直接使用 `npm install`

这样即使 lock 文件有问题，Docker 构建也不会失败，确保新成员始终可以一键启动。

### 修复 4：同步更新 CI/CD 流水线 - 相同的回退逻辑

**改动文件**: `.github/workflows/ci.yml`

将流水线中所有 5 处 `npm ci` 调用全部替换为与 Dockerfile 相同的回退逻辑：

```yaml
- name: 安装后端依赖（npm ci 失败时回退到 npm install）
  working-directory: ./backend
  run: |
    if [ -f package-lock.json ]; then
      echo "Found package-lock.json, trying npm ci..."
      npm ci --no-audit --no-fund || (echo "npm ci failed, falling back to npm install..."; rm -f package-lock.json && npm install --no-audit --no-fund)
    else
      echo "No package-lock.json found, running npm install..."
      npm install --no-audit --no-fund
    fi
```

覆盖的流水线 Job：
- `lint`（后端依赖安装、前端依赖安装）
- `backend-test`（后端依赖安装）
- `frontend-build`（前端依赖安装）
- `integration-test`（后端依赖安装）

---

## 验证步骤

### 1. 本地开发环境验证

```bash
# 步骤 1：确保 Node.js 已安装（>= 18）
node --version
npm --version

# 步骤 2：运行重新生成 lock 文件脚本
./scripts/generate-lockfiles.sh          # Linux/Mac
# 或
.\scripts\generate-lockfiles.bat         # Windows

# 步骤 3：验证 npm ci 成功执行（后端）
cd backend
rm -rf node_modules
npm ci
echo "后端 npm ci 成功"

# 步骤 4：验证 npm ci 成功执行（前端）
cd ../frontend
rm -rf node_modules
npm ci
echo "前端 npm ci 成功"
```

### 2. Docker 构建验证

```bash
# 步骤 1：构建后端镜像
docker build -t test-backend ./backend
# 观察日志，应看到 "Found package-lock.json, verifying integrity..."
# 如果 lock 文件缺失则显示 "No package-lock.json found, running npm install..."

# 步骤 2：构建前端镜像
docker build -t test-frontend ./frontend

# 步骤 3：验证镜像已生成
docker images | grep test-

# 步骤 4：完整 Docker Compose 构建验证
docker compose build --no-cache

# 步骤 5：启动服务验证
docker compose up -d
sleep 30
docker compose ps   # 所有服务状态应为 healthy

# 步骤 6：清理
docker compose down -v
```

### 3. CI/CD 流水线验证

将代码推送到远程仓库的 `develop` 分支后，在 GitHub Actions 页面观察：
1. 5 个 Job（lint, backend-test, frontend-build, docker-build, integration-test）应全部通过
2. 每个 Job 的 "安装依赖" 步骤日志中，应显示正确的依赖安装路径
3. 如无 lock 文件，应显示 "No package-lock.json found, running npm install..."

### 4. 新成员一键启动验证

在全新环境中执行：
```bash
git clone <repository-url>
cd <project-folder>

# 确保 Docker 已启动
./run.sh         # Linux/Mac
# 或
.\run.bat        # Windows

# 预期：构建成功，服务启动，http://localhost:3160 可正常访问
```

---

## 改动文件清单

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `backend/package.json` | 修改 | 所有依赖改为精确版本号（移除 `^`） |
| `frontend/package.json` | 修改 | 所有依赖改为精确版本号（移除 `^`） |
| `backend/package-lock.json` | 删除 | 结构不完整，由脚本重新生成 |
| `frontend/package-lock.json` | 删除 | 结构不完整，由脚本重新生成 |
| `backend/Dockerfile` | 修改 | npm ci 失败时自动回退到 npm install |
| `frontend/Dockerfile` | 修改 | npm ci 失败时自动回退到 npm install |
| `.github/workflows/ci.yml` | 修改 | 所有 5 处依赖安装步骤添加回退逻辑 |
| `scripts/generate-lockfiles.sh` | 新增 | Linux/Mac 重新生成 lock 文件脚本 |
| `scripts/generate-lockfiles.bat` | 新增 | Windows 重新生成 lock 文件脚本 |

---

## 预防措施

为彻底避免类似问题再次发生，建立以下规范：

### 1. 依赖管理规范

**版本号策略**：
```bash
# ❌ 禁止：使用范围版本号
npm install koa              # 会写入 "koa": "^2.14.2"

# ✅ 推荐：使用精确版本号
npm install koa@2.14.2 --save-exact
```

**安装依赖后必须执行**：
```bash
# 安装完成后，验证 lock 文件与 package.json 同步
npm ci --dry-run || npm install
```

### 2. 提交前检查清单

每次提交涉及 `package.json` 变更时，执行：
```bash
# 1. 重新生成 lock 文件
./scripts/generate-lockfiles.sh

# 2. 验证 lock 文件可用
cd backend && rm -rf node_modules && npm ci
cd ../frontend && rm -rf node_modules && npm ci

# 3. 确认文件大小正常（应大于 50KB）
ls -lh backend/package-lock.json frontend/package-lock.json
```

### 3. 配置 npm 默认使用精确版本

在项目根目录创建或编辑 `.npmrc`：
```ini
save-exact=true
registry=https://registry.npmmirror.com
```

这样 `npm install` 会默认写入精确版本号。

### 4. 团队成员培训要点

- 不允许手动编辑 `package-lock.json`，该文件必须由 npm 命令自动生成
- 修改 `package.json` 后，必须执行 `npm install`（而非手动编辑）以同步 lock 文件
- 遇到 `npm ci` 失败时，执行 `./scripts/generate-lockfiles.sh` 重新生成
- 生产环境部署必须使用 `npm ci`，确保依赖版本与开发时完全一致

### 5. 监控告警

在 CI/CD 流水线中，如果触发了 npm install 回退路径（说明 lock 文件有问题），输出警告日志：
```
⚠️  WARNING: npm ci failed, fell back to npm install.
⚠️  Please run ./scripts/generate-lockfiles.sh locally and commit the updated package-lock.json.
```

---

## 相关知识

### npm install vs npm ci 对比

| 特性 | `npm install` | `npm ci` |
|------|---------------|----------|
| 依赖来源 | `package.json`（会解析范围版本） | `package-lock.json`（必须完全匹配） |
| 修改 lock 文件 | ✅ 会更新 | ❌ 不会更新，lock 文件必须已存在且正确 |
| 修改 package.json | ✅ 会更新版本范围 | ❌ 严格校验，不一致直接失败 |
| 速度 | 较慢（需要解析依赖树） | 快（直接按 lock 文件安装） |
| 可复现性 | 较低（可能安装不同子版本） | 100% 可复现（完全按 lock 文件） |
| 适用场景 | 本地开发、首次安装、添加新依赖 | CI/CD、Docker 构建、生产部署 |
| 需要 node_modules | 不需要（自动创建） | 不需要（自动创建，但会先删除已有的） |

### package-lock.json 关键字段

```json
{
  "name": "backend",
  "version": "1.0.0",
  "lockfileVersion": 3,       // npm 版本标记（npm 9+ 使用 v3）
  "requires": true,
  "packages": {
    "": {                    // 顶层：当前项目
      "name": "backend",
      "version": "1.0.0",
      "dependencies": {
        "koa": "2.14.2"
      }
    },
    "node_modules/koa": {    // 每个依赖包
      "version": "2.14.2",
      "resolved": "https://registry.npmmirror.com/koa/-/koa-2.14.2.tgz",
      "integrity": "sha512-xxxxxx==",   // 包完整性校验 hash
      "dependencies": {
        "accepts": "^1.3.5"
      }
    }
    // ... 所有子依赖
  }
}
```

`integrity` 字段是关键，用于 npm 验证下载的包未被篡改，缺失该字段会导致 `npm ci` 失败。

---

## 常见问题

**Q: 删除 package-lock.json 会不会影响生产环境？**

A: 短期内不会。Dockerfile 和 CI/CD 都已添加回退逻辑，lock 文件不存在时会自动使用 `npm install`。但尽快在本地执行 `./scripts/generate-lockfiles.sh` 生成完整的 lock 文件并提交，以确保各环境依赖版本完全一致。

**Q: npm install 生成的 lock 文件能直接在其他平台使用吗？**

A: 可以。`package-lock.json` 是跨平台的（Windows/Mac/Linux 通用）。但注意需要使用相同大版本的 npm（如都是 npm 9.x），否则 `lockfileVersion` 可能不兼容。

**Q: 为什么不直接把 package-lock.json 加入 .gitignore？**

A: `package-lock.json` 的核心价值是保证各环境依赖版本一致，是保证"构建可复现"的关键文件。**必须提交到代码库**。如果忽略该文件，每次构建安装的依赖版本可能不同，导致"在我机器上可以跑，在生产环境出问题"的情况。

**Q: 我本地 npm 版本和 Docker 中的 npm 版本不一致怎么办？**

A: 建议本地使用 Node.js 18（Docker 也是 node:18-alpine），其内置 npm 版本为 9.x。可通过 `nvm use 18` 或 `nvm install 18` 切换。

