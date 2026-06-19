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

