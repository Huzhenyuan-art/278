# 文章标签系统关联错误修复指南

## 文档信息

| 项目 | 内容 |
|------|------|
| **问题编号** | FIX-001 |
| **问题类型** | Sequelize 模型关联错误 |
| **影响接口** | `GET /api/article` |
| **错误信息** | `tag is not associated to articleTag!` |
| **发现日期** | 2026-06-17 |
| **修复日期** | 2026-06-17 |
| **修复人员** | AI Assistant |

---

## 1. 问题现象

### 1.1 用户反馈
首页未能正确显示已发布的文章内容，经初步排查发现 API 请求 `/api/article` 返回错误信息：
```
"tag is not associated to articleTag!"
```

### 1.2 影响范围
- 首页文章列表无法显示
- 文章详情页无法显示标签
- 发布/编辑文章时标签关联可能存在问题

---

## 2. 问题原因分析

### 2.1 根本原因
Sequelize 多对多关联配置不完整。虽然定义了 `Article` 和 `Tag` 之间通过 `ArticleTag` 的多对多关联，但缺少 `ArticleTag` 中间表与 `Article`、`Tag` 的直接关联定义。

### 2.2 技术细节

**原有配置（不完整）**：
```javascript
// 仅定义了多对多关联
Article.belongsToMany(Tag, { through: ArticleTag, foreignKey: 'articleId', otherKey: 'tagId' });
Tag.belongsToMany(Article, { through: ArticleTag, foreignKey: 'tagId', otherKey: 'articleId' });
```

**触发错误的代码**（位于 `article.js` 第 68-70 行）：
```javascript
const articleTags = await ArticleTag.findAll({
    where: { articleId: { [Op.in]: articleIds } },
    include: [{ model: Tag, attributes: ['id', 'name', 'color'] }]  // 这里需要 ArticleTag 和 Tag 的直接关联
});
```

### 2.3 问题发生机理

1. 当调用 `ArticleTag.findAll({ include: [{ model: Tag }] })` 时，Sequelize 尝试查找 `ArticleTag` 与 `Tag` 之间的关联
2. 由于只定义了多对多关联（`Article <-> Tag`），没有定义中间表的直接关联（`ArticleTag -> Tag`、`ArticleTag -> Article`）
3. Sequelize 无法找到关联定义，因此抛出错误 `"tag is not associated to articleTag!"`

### 2.4 为什么之前没有发现？

- 多对多关联（`belongsToMany`）在通过主模型查询时可以正常工作，例如：
  ```javascript
  // 这种查询是正常的，因为使用的是 Article 和 Tag 之间的多对多关联
  Article.findAll({ include: [Tag] })
  ```
- 只有当直接查询中间表 `ArticleTag` 并尝试 `include` 其他模型时，才需要直接关联定义

---

## 3. 排查过程

### 3.1 错误定位步骤

1. **读取错误信息**：错误信息明确指出 "tag is not associated to articleTag!"，指向关联问题
2. **检查调用栈**：定位到 `attachTagsToArticles` 函数中的 `ArticleTag.findAll()` 查询
3. **检查模型定义**：查看 `models/index.js` 中的关联定义
4. **对比 Sequelize 文档**：确认多对多关联需要补充的配置

### 3.2 涉及的文件

| 文件路径 | 作用 |
|----------|------|
| `backend/models/index.js` | 模型关联定义 |
| `backend/models/articleTag.js` | 中间表模型 |
| `backend/routes/article.js` | 触发错误的查询代码 |

---

## 4. 解决方案

### 4.1 修复方案

为 `ArticleTag` 中间表添加与 `Article` 和 `Tag` 的直接关联（`belongsTo`），同时添加反向的 `hasMany` 关联。

### 4.2 修改的代码

**文件**：`backend/models/index.js`

**修改位置**：第 18-24 行

**修改前**：
```javascript
Article.belongsToMany(Tag, { through: ArticleTag, foreignKey: 'articleId', otherKey: 'tagId' });
Tag.belongsToMany(Article, { through: ArticleTag, foreignKey: 'tagId', otherKey: 'articleId' });
```

**修改后**：
```javascript
Article.belongsToMany(Tag, { through: ArticleTag, foreignKey: 'articleId', otherKey: 'tagId' });
Tag.belongsToMany(Article, { through: ArticleTag, foreignKey: 'tagId', otherKey: 'articleId' });

// 新增：中间表与主表的直接关联
ArticleTag.belongsTo(Article, { foreignKey: 'articleId' });
ArticleTag.belongsTo(Tag, { foreignKey: 'tagId' });
Article.hasMany(ArticleTag, { foreignKey: 'articleId' });
Tag.hasMany(ArticleTag, { foreignKey: 'tagId' });
```

### 4.3 额外优化

同时对 `attachTagsToArticles` 函数进行了小优化，添加 `required: false` 确保左连接：

**文件**：`backend/routes/article.js`，第 70-74 行

```javascript
include: [{
    model: Tag,
    attributes: ['id', 'name', 'color'],
    required: false  // 左连接，即使没有标签也返回 articleTag 记录
}]
```

---

## 5. 关联配置总览

修复后，完整的关联关系如下：

```
User ──hasMany──> Article
Article ──belongsTo──> User

User ──hasMany──> Like
Like ──belongsTo──> User

Article ──hasMany──> Like
Like ──belongsTo──> Article

Article ──belongsToMany──> Tag (through: ArticleTag)
Tag ──belongsToMany──> Article (through: ArticleTag)

ArticleTag ──belongsTo──> Article
ArticleTag ──belongsTo──> Tag
Article ──hasMany──> ArticleTag
Tag ──hasMany──> ArticleTag
```

---

## 6. 验证步骤

### 6.1 代码验证

1. **语法检查**：使用 IDE 的诊断工具检查是否有语法错误
   - 工具：GetDiagnostics
   - 结果：✅ 无错误

2. **关联完整性检查**：
   - 确认 `ArticleTag` 与 `Article` 的关联已定义
   - 确认 `ArticleTag` 与 `Tag` 的关联已定义
   - 确认反向关联（`hasMany`）已定义

### 6.2 运行时验证（需启动服务后执行）

1. **启动后端服务**：
   ```bash
   cd backend
   npm start
   ```

2. **测试接口**：
   - **测试 1**：获取所有文章（不带标签筛选）
     ```
     GET /api/article
     预期：返回文章列表，每篇文章包含 tags 字段
     ```
   
   - **测试 2**：按标签筛选文章
     ```
     GET /api/article?tagId=1
     预期：返回包含指定标签的文章列表
     ```
   
   - **测试 3**：获取单篇文章详情
     ```
     GET /api/article/1
     预期：返回文章详情，包含 tags 字段
     ```
   
   - **测试 4**：创建文章（带标签）
     ```
     POST /api/article
     Body: { "title": "测试", "content": "内容", "tagIds": [1, 2] }
     预期：创建成功，返回的文章包含指定标签
     ```
   
   - **测试 5**：获取所有标签
     ```
     GET /api/tag
     预期：返回标签列表，每个标签包含 articleCount 字段
     ```

3. **前端验证**：
   - 访问首页，确认文章列表正常显示
   - 确认文章卡片显示标签
   - 点击标签筛选，确认筛选功能正常
   - 发布新文章，确认标签选择功能正常
   - 查看文章详情，确认标签显示正常

### 6.3 数据库验证

1. **检查表结构**：
   - 确认 `tag` 表已创建
   - 确认 `articleTag` 表已创建
   - 确认 `articleTag` 表有 `articleId` 和 `tagId` 外键

2. **检查种子数据**：
   - 确认 `tag` 表中有 12 条预置标签记录
   - 确认 `articleTag` 表中有文章与标签的关联记录

---

## 7. 预防措施

### 7.1 开发规范

1. **多对多关联必须完整定义**：
   - 定义两个主模型的 `belongsToMany` 关联
   - 定义中间表的 `belongsTo` 关联（指向两个主模型）
   - 定义两个主模型的 `hasMany` 关联（指向中间表）

2. **代码审查清单**：
   - 新增模型时，检查关联定义是否完整
   - 使用 `include` 时，确认关联已正确定义
   - 中间表查询需特别注意关联配置

### 7.2 测试建议

1. **单元测试**：为每个模型的关联编写测试用例
2. **集成测试**：测试包含 `include` 的复杂查询
3. **回归测试**：修改模型关联后，运行所有相关接口测试

---

## 8. 相关知识

### 8.1 Sequelize 多对多关联最佳实践

当使用 `through` 模型（中间表）时，推荐的完整关联配置：

```javascript
// 1. 多对多关联
A.belongsToMany(B, { through: C, foreignKey: 'aId', otherKey: 'bId' });
B.belongsToMany(A, { through: C, foreignKey: 'bId', otherKey: 'aId' });

// 2. 中间表与主表的直接关联
C.belongsTo(A, { foreignKey: 'aId' });
C.belongsTo(B, { foreignKey: 'bId' });

// 3. 主表与中间表的反向关联
A.hasMany(C, { foreignKey: 'aId' });
B.hasMany(C, { foreignKey: 'bId' });
```

### 8.2 什么时候需要直接关联？

| 查询场景 | 是否需要直接关联 |
|----------|-----------------|
| `A.findAll({ include: [B] })` | ❌ 不需要（使用多对多关联） |
| `B.findAll({ include: [A] })` | ❌ 不需要（使用多对多关联） |
| `C.findAll({ include: [A] })` | ✅ 需要（使用 C.belongsTo(A)） |
| `C.findAll({ include: [B] })` | ✅ 需要（使用 C.belongsTo(B)） |
| `A.findAll({ include: [C] })` | ✅ 需要（使用 A.hasMany(C)） |

---

## 9. 修改文件清单

| 文件 | 修改类型 | 说明 |
|------|----------|------|
| `backend/models/index.js` | 🔧 修改 | 新增 4 个关联定义 |
| `backend/routes/article.js` | 🔧 优化 | 添加 `required: false` 参数 |

---

## 10. 参考资料

- [Sequelize 官方文档 - 多对多关联](https://sequelize.org/docs/v6/core-concepts/assocs/#many-to-many-relationships)
- [Sequelize 官方文档 - belongsTo](https://sequelize.org/docs/v6/core-concepts/assocs/#onetoone-belongsto)
- [Sequelize 官方文档 - hasMany](https://sequelize.org/docs/v6/core-concepts/assocs/#onetomany-hasmany)

---

**文档版本**：v1.0  
**最后更新**：2026-06-17

---

# 文章评论回复层级功能开发指南

## 文档信息

| 项目 | 内容 |
|------|------|
| **问题编号** | FIX-002 |
| **问题类型** | 新功能开发（评论回复 / 层级结构 / 编辑） |
| **涉及模块** | 后端 Model/Route + 前端 CommentSection 组件 |
| **发现日期** | 2026-06-18 |
| **完成日期** | 2026-06-18 |
| **开发人员** | AI Assistant |

---

## 1. 功能需求概述

原评论系统仅支持针对文章的"顶层评论"，缺少常见的社区功能：**针对他人评论进行回复**、**编辑自己的评论**、以及**对话式的层级展示**。本次开发补齐以下能力：

1. **评论回复**：用户可对任意评论进行回复，形成无限层级的对话树
2. **@某人提示**：回复时自动在 UI 中标注被回复者 `@username`，点击 `@` 可快速唤起回复
3. **评论编辑**：评论作者本人可对自己发表的评论进行文字修改
4. **删除增强**：若评论存在子回复，采用软删除（保留占位符）以维持对话结构；无子回复时直接硬删除
5. **响应式 UI**：桌面端用边框+缩进直观表达层级，移动端用更小缩进保证阅读宽度
6. **权限控制**：未登录用户只能浏览、不能回复/编辑/删除；编辑仅作者本人；删除允许评论作者或文章作者

---

## 2. 后端实现详解

### 2.1 模型升级（`backend/models/comment.js`）

在原有字段基础上新增 3 个字段：

| 字段 | 类型 | 可空 | 说明 |
|------|------|------|------|
| `parentId` | INTEGER / FK → comment.id | ✅ | 父评论 ID，为 `null` 表示顶层评论 |
| `replyToUserId` | INTEGER / FK → user.id | ✅ | 被回复者 ID，用于显示"回复 @xxx" |
| `isDeleted` | BOOLEAN | ❌（默认 false） | 软删除标记，有子回复的评论被删除时置为 true |

同时将 `userId` 改为 `allowNull: true`，用于软删除后清空作者信息以显示占位符。

### 2.2 关联注册（`backend/models/index.js`）

新增三条关联：

```javascript
// 评论自关联（用于 buildTree 校验 & include 场景）
Comment.belongsTo(Comment, { as: 'parent', foreignKey: 'parentId' });
Comment.hasMany(Comment, { as: 'children', foreignKey: 'parentId' });

// 被回复者的用户信息
Comment.belongsTo(User, { as: 'replyToUser', foreignKey: 'replyToUserId' });
```

### 2.3 路由接口详解（`backend/routes/comment.js`）

#### 2.3.1 GET `/comment/article/:articleId` - 列表（含层级）

**查询参数**：
- `limit`（可选，默认 5，最大 50）：顶层评论每页数量
- `beforeId`（可选，游标分页）：取 id < beforeId 的顶层评论

**核心算法**：
1. **Step 1**：对 `parentId IS NULL` 的顶层评论做游标分页（`ORDER BY id DESC`），取 `limit + 1` 条判断是否还有下一页
2. **Step 2**：基于第一步得到的顶层评论 ID 集合，迭代式拉取所有后代评论（最多 10 轮，覆盖任意深度）。每一轮 `WHERE parentId IN (上一轮的新 ID)`。相比单条 SQL 的递归 CTE，这种写法在 SQLite/MySQL/PostgreSQL 间兼容性更强
3. **Step 3**：将扁平列表 `buildTree` 为嵌套结构（`replies: []`），并按 id 升序排列每个节点的子回复（保证时间先后可读性）
4. **Step 4**：`annotateTree` 递归计算每个节点的 `canDelete` / `canEdit` 字段；`isDeleted=true` 的节点内容被替换为"该评论已删除"，用户名清空

**返回结构**：
```json
{
  "comments": [
    {
      "id": 1, "content": "...", "createdAt": "...",
      "user": { "id": 1, "username": "admin" },
      "replyToUser": null,
      "canDelete": true, "canEdit": true, "isDeleted": false,
      "replies": [
        {
          "id": 2, "content": "你说的对!",
          "user": { "id": 2, "username": "user" },
          "replyToUser": { "id": 1, "username": "admin" },
          "canDelete": true, "canEdit": true, "isDeleted": false,
          "replies": [ ... ]
        }
      ]
    }
  ],
  "total": 10, "hasMore": true, "nextCursor": 42
}
```

#### 2.3.2 POST `/comment/article/:articleId` - 发表（顶层评论 或 回复）

**请求体**：
```json
{
  "content": "内容",
  "parentId": 3,           // 可选；null/不传表示顶层评论
  "replyToUserId": 2       // 可选；若未提供但 parentId 存在，则自动取父评论作者
}
```

**校验规则**：
1. `content` 非空、去前后空格
2. 若提供 `parentId`：必须存在、必须属于同一篇文章（防越权串文章回复）
3. 若提供 `replyToUserId`：该用户必须存在；否则回退为父评论的作者

#### 2.3.3 PUT `/comment/:id` - 编辑（仅本人）

**请求体**：`{ "content": "修改后的内容" }`

**权限**：
- 已登录
- `comment.userId === ctx.state.user.id`（仅评论者本人）
- 评论未被软删除

#### 2.3.4 DELETE `/comment/:id` - 删除（作者 或 文章作者）

**权限判定顺序**：
1. 评论作者本人（`comment.userId === userId`）→ 允许
2. 文章作者（`article.authorId === userId`）→ 允许
3. 其他 → `403 权限不足`

**删除策略**：
- 若该评论有未被软删除的子回复（`Comment.count({parentId, isDeleted: false}) > 0`）：
  → **软删除**：`isDeleted = true; userId = null; replyToUserId = null`。保留记录保证树结构完整性，UI 显示"占位评论 / 该评论已删除"
- 否则：
  → **硬删除**：`destroy()` 物理移除

---

## 3. 前端实现详解（`frontend/src/components/CommentSection.jsx`）

### 3.1 组件架构

```
CommentSection (主组件)
├─ 顶部发表输入框（顶层评论）
├─ CommentItem[] 递归渲染（每条评论 + 嵌套回复）
│   ├─ 头像 / 用户名 / 回复 @xxx / 时间
│   ├─ 内容正文（普通文本态 ↔ 编辑 textarea 态）
│   ├─ 操作条：回复 / 编辑 / 删除（按权限渲染）
│   ├─ 回复输入框（点击"回复"后展开，可取消）
│   └─ 递归：{comment.replies.map(child => <CommentItem depth+1 />)}
└─ 加载更多（顶层游标分页按钮）
```

### 3.2 树形数据的不可变更新

采用 3 个纯函数对嵌套状态做不可变操作（配合 `useCallback` 避免闭包陷阱）：

| 函数 | 用途 | 触发时机 |
|------|------|---------|
| `insertReplyIntoTree(nodes, parentId, reply)` | 找到父节点 id 后在其 `replies` 尾部追加 | 回复提交成功 |
| `updateCommentInTree(nodes, id, mutator)` | 找到节点 id 后整体替换 | 编辑保存成功 |
| `removeCommentFromTree(nodes, id)` | 过滤目标节点并递归 | 理论备用；实际删除后走整树重拉 |

> 💡 **设计取舍**：删除成功后选择 `fetchInitial()` 全量重拉而非局部更新。原因：软删除会改变节点的 isDeleted 标记、且可能触发"父节点删除后仍保留子回复"的树结构变化，全量重拉得到的状态最准确，与服务端完全一致。

### 3.3 UI 交互设计

**回复输入框**：
- 点击评论下方"回复"按钮 → 该评论下方展开带浅蓝背景的浮动输入框
- 同一时刻至多 1 个回复框打开（state 存 `replyingId`），避免 DOM 膨胀
- placeholder 动态显示 `回复 @被回复者用户名...`
- 展开时 `autoFocus`
- 有发送 / 取消双按钮

**编辑态**：
- 仅 `canEdit=true` 才在 hover 时显示编辑按钮（group-hover 透明度 0→100）
- 点击后正文变为 textarea，预填原内容 + autoFocus，字数计数
- 内容未改变直接保存会静默关闭编辑态（减少无效网络请求）
- 同一时刻至多 1 个编辑框打开（state 存 `editingId`）

**响应式缩进**：

| 断点 | 层级样式（depth > 0） | 说明 |
|------|----------------------|------|
| 移动端（< md） | `ml-3 border-l pl-3` | 12px 左边距 + 1px 左边框，保证阅读宽度 |
| 桌面端（≥ md） | `md:ml-5 md:border-l-2 md:pl-5` | 20px 边距 + 2px 粗边框，层级视觉清晰 |

头像与内边距同样按断点缩放（`w-8 md:w-9`、`p-3 md:p-4`、`px-5 md:px-8`）。

### 3.4 登录态检查

- `isLoggedIn = !!localStorage.getItem('token')` 用 `useMemo` 缓存
- 未登录时：
  - 顶部输入框替换为 **"登录后参与评论"** 提示卡片（带跳转链接）
  - 每条评论下方的 **"回复" 按钮不渲染**
  - 编辑/删除按钮继续按后端返回的 canEdit/canDelete 渲染（两者都要求登录态，对未登录用户天然不出现）

---

## 4. 关键技术决策记录

### 4.1 游标分页 vs 页码分页（为什么用 beforeId）

| 方案 | 新评论置顶会不会导致数据重复 |
|------|---------------------------|
| `OFFSET N LIMIT M`（页码） | ✅ 会 —— 第 2 页 `OFFSET 5` 时若新插入了 1 条评论，原本第 6 条被推到第 7 位，导致漏一条或重复一条 |
| `WHERE id < beforeId ORDER BY id DESC`（游标） | ❌ 不会 —— 游标锚定具体 ID，不受前面新增数据影响 |

结论：评论属于"数据持续在头部追加 + 用户点击加载更多"的典型场景，**游标分页是唯一正确方案**。

### 4.2 软删除 vs 级联删除（有子回复时怎么办）

- **级联删除**：删除父评论时所有子回复一起消失。缺点：用户 A 回了一串有价值的讨论，被 B 的父评论作者随手删除，整段对话丢失，体验极差
- **软删除（占位）**：保留树结构，只把被删的节点内容换成不可操作的占位符。子回复关系依旧挂在该占位节点下，对话历史完整可追溯

结论：采用**软删除 + 有无子回复的分支策略**。无子回复硬删清理数据库碎片；有子回复软删保证对话连续性。

### 4.3 后端组树 vs 前端组树

- **后端组树**：一次性把该页顶层评论的所有后代都拉下来（迭代式 BFS），在 Node 里 `buildTree` 成嵌套 JSON 返回给前端。优点是前端递归渲染零逻辑、首屏响应快、接口语义清晰
- **前端组树**：返回扁平列表 + parentId，前端自己 for 循环组树。优点是 JSON 字节稍小（没嵌套的 replies key），但每个使用方都要写一次组树逻辑，容易出错

结论：后端组树，前端纯渲染。复杂度集中在一处，便于测试和后续扩展（例如加入"回复点赞"只需在 annotateTree 里加字段）。

### 4.4 单输入框 vs 多输入框（回复/编辑互斥）

- **多输入框同时打开**：视觉很乱，且每条评论里常驻一个 textarea 对长列表性能不友好
- **单一输入框（状态提升）**：父组件 `replyingId` / `editingId` 存正在操作的评论 ID，点击另一个会自动关闭前一个。视觉清爽，也降低误操作风险

结论：单一输入框策略，符合常见社区产品（知乎 / GitHub Issues）的交互习惯。

---

## 5. 权限矩阵

| 操作 | 未登录 | 任意登录用户 | 评论作者 | 文章作者 |
|------|--------|-------------|---------|---------|
| 浏览评论 / 查看层级 | ✅ | ✅ | ✅ | ✅ |
| 发表顶层评论 | ❌ | ✅ | ✅ | ✅ |
| 回复任意评论 | ❌ | ✅ | ✅ | ✅ |
| 编辑指定评论 | ❌ | ❌ | ✅（本人） | ❌ |
| 删除指定评论 | ❌ | ❌ | ✅（本人） | ✅（对该文章所有评论） |
| 软删除后再删除 | ❌ | ❌ | ❌ | ❌（已幂等返回成功，但不可进一步操作） |

后端每个接口都**独立鉴权**，前端权限标记仅用于 UI 隐藏，不能作为安全屏障。

---

## 6. 验证步骤

### 6.1 代码静态验证

1. VS Code 诊断（GetDiagnostics）：
   - `frontend/src/components/CommentSection.jsx` → ✅ 无错误
   - `frontend/src/pages/ArticleDetail.jsx` → ✅ 无错误
   - `backend/routes/comment.js` → ✅ 无错误
   - `backend/models/comment.js` → ✅ 无错误

2. Sequelize 模型字段检查：
   - `parentId` / `replyToUserId` / `isDeleted` 已定义
   - `userId` 为 `allowNull: true`（软删除配合）
   - `alter: true` 同步策略，重启后端自动新增列

### 6.2 运行时验证（Docker 启动后）

**前置条件**：`docker compose up --build` 启动前后端，等待数据库同步（有 `Database synchronized` 日志）。

| # | 场景 | 操作步骤 | 预期结果 |
|---|------|---------|---------|
| 1 | 发表顶层评论 | 登录 → 文章详情页 → 顶部输入内容 → 发表 | 评论出现在列表最顶部，作者显示自己，canEdit/canDelete=true |
| 2 | 回复他人评论 | 任意评论下点"回复" → 输入 → 发送 | 回复挂在父评论下方（有边框缩进），显示"回复 @父作者" |
| 3 | 深度嵌套 | 对回复再回复、继续再回复 ≥ 3 层 | 每层正确缩进，结构不变形 |
| 4 | 编辑自己评论 | 评论 hover → 点"编辑" → 修改文字 → 保存 | 内容立即更新；若内容未改直接保存则自动取消编辑态不发请求 |
| 5 | 删除无子回复评论 | 发一条没回复的评论 → 点删除 → 确认 | 评论从 DOM 完全消失（硬删除） |
| 6 | 删除有子回复评论 | 对有回复的父评论点删除 | 内容变为"该评论已删除"，用户名变"占位评论"，回复树仍完整可见（软删除） |
| 7 | 文章作者删除权限 | 用 admin 登录 → 打开 user 发布文章 → 删除 user 的评论 | ✅ 允许（文章作者可删除其文章下任意评论） |
| 8 | 跨文章越权回复 | 用 HTTP 客户端伪造 parentId=某文章评论，请求另一篇文章的评论接口 | `400 父评论不属于该文章` |
| 9 | 未登录验证 | 退出登录 → 查看文章详情 | 顶部为"登录后参与评论"，每条评论无"回复"按钮，编辑/删除按钮不可见 |
| 10 | 移动端响应式 | 浏览器 DevTools 切到 375px 宽度 | 输入框 / 评论卡片 / 缩进宽度全部自适应，无横向滚动 |
| 11 | 游标分页加载更多 | 预置 ≥ 6 条顶层评论 → 点底部"加载更多" | 下一页 5 条追加到底部，顺序稳定、无重复 |
| 12 | @某人快捷回复 | 点击一条回复里"回复 @xxx"中的蓝色 xxx 链接 | 自动打开该条回复的回复输入框，placeholder 包含目标用户名 |

---

## 7. 修改 / 新增文件清单

| 文件 | 修改类型 | 说明 |
|------|----------|------|
| `backend/models/comment.js` | 🔧 升级 | 新增 `parentId`、`replyToUserId`、`isDeleted` 字段；`userId` 改 allowNull |
| `backend/models/index.js` | 🔧 修改 | 注册 Comment 自关联 + replyToUser 关联；导出 Comment |
| `backend/routes/comment.js` | ➕ 重写 | 新增层级查询、回复、编辑接口；删除策略升级为软/硬删分支；权限扩展 |
| `backend/app.js` | 🔧 修改 | 注册 `commentRoutes` 路由 |
| `frontend/src/components/CommentSection.jsx` | ➕ 重写 | 递归渲染；回复/编辑/删除三态；单输入框管理；响应式布局 |
| `frontend/src/pages/ArticleDetail.jsx` | 🔧 修改 | 引入并在详情页底部挂载 `<CommentSection articleId={article.id} />` |

---

## 8. 使用说明（面向用户）

### 发表一条顶层评论

1. 点击文章详情页
2. 在"评论区"标题下方的大输入框输入内容（支持换行，最大 1000 字）
3. 点击右下"发表评论"按钮即可

### 回复某条评论

1. 将鼠标悬停在目标评论上（移动端直接点）
2. 点击评论下方浮现的"回复"按钮
3. 在该评论下方展开的回复框中输入内容
4. 点"回复"发送；或点"取消"关闭输入框
5. 新回复会出现在该评论的子回复区域（左侧带缩进边框）

### 编辑自己的评论

1. 在本人发表的评论上 hover → 出现"编辑"按钮
2. 点击后内容变为可编辑文本框
3. 修改后点"保存"；想取消则点"取消"

### 删除评论

1. 在可删除的评论上 hover → 出现"删除"按钮
2. 点击后会弹出二次确认弹窗（防止误删）
3. 若该评论**没有**回复：将被永久移除
4. 若该评论**有**回复：内容变为"该评论已删除"占位，但下面的所有回复保持可见

### 切换屏幕尺寸

- **大屏**：桌面浏览器全屏访问，评论层级使用 2px 粗边框 + 20px 左边距，视觉清晰
- **小屏**（手机 / 窄浏览器）：左边距自动收窄为 12px，边框 1px，头像缩小 1 号，保证阅读空间

---

## 9. 后续可扩展方向

1. **评论点赞**：仿照 `Like` 模型新建 `CommentLike`，在 `CommentItem` 里加红心按钮
2. **@mention 输入框自动补全**：回复时输入 `@` 弹出该对话中出现过的用户列表
3. **评论举报**：新增 report 表，文章作者和 admin 可审查
4. **深度阈值**：超过 N 层（例如 4 层）后 UI 不再继续缩进，改为统一加"查看对话"链接跳转单页
5. **未读通知**：评论被回复时，给 `replyToUserId` 对应用户推送站内信 / 邮件

---

**文档版本**：v1.0（评论回复模块）  
**最后更新**：2026-06-18

---

# 文章状态标签与草稿可见性修复指南

## 文档信息

| 项目 | 内容 |
|------|------|
| **问题编号** | FIX-003 |
| **问题类型** | 功能缺失 / 权限漏洞 / UI 不明显 |
| **涉及模块** | 后端 Route + 前端 Dashboard / ArticleDetail / ArticleCreate / ArticleEdit |
| **发现日期** | 2026-06-18 |
| **修复日期** | 2026-06-18 |
| **修复人员** | AI Assistant |

---

## 1. 问题现象

用户反馈以下 3 个问题：

### 问题 1：没有发现切换状态标签的地方
- **现象**：进入文章编辑页后，无法直观地找到"切换已发布/草稿"的入口
- **根因**：此前使用 `<select>` 下拉框且样式朴素，与表单其他控件视觉层次一致，不够突出

### 问题 2：文章没有保存草稿的按钮，只能直接发布
- **现象**：新建文章页底部只有一个"立即发布"按钮，无法先保存为草稿稍后再编辑发布
- **根因**：`ArticleCreate.jsx` 未提供状态选择 UI 与分支提交逻辑

### 问题 3：草稿状态的文章别人也能看到（安全漏洞）
- **现象**：任何用户（包括未登录）都能通过列表或直接输入 URL 访问 `status = 'draft'` 的文章
- **根因**：后端 `GET /article` 列表与 `GET /article/:id` 详情接口未根据 `status` 做可见性过滤

---

## 2. 修复方案总览

| # | 问题 | 修复方式 | 涉及文件 |
|---|------|---------|---------|
| 1 | 状态切换入口不明显 | 用双按钮卡片 + 实时徽章替换 `<select>`，视觉高亮 | `ArticleEdit.jsx`、`ArticleCreate.jsx` |
| 2 | 无保存草稿按钮 | 新增「保存草稿」「立即发布」双按钮；表单内增加状态切换卡片 | `ArticleCreate.jsx` |
| 3 | 草稿可见性越权 | 列表接口加 `Op.or` 过滤，详情接口加作者校验，非作者访问草稿返回 404 | `backend/routes/article.js` |

---

## 3. 详细修复说明

### 3.1 后端：草稿可见性过滤（核心安全修复）

#### 3.1.1 列表接口 `GET /article`

**修改位置**：[article.js](file:///d:/Desktop/新建文件夹 (2)/278-20260128-123520/278/backend/routes/article.js#L91-L136)

**逻辑**：
- 未登录用户：`WHERE status = 'published'`（只能看已发布）
- 已登录用户：`WHERE (status = 'published') OR (status = 'draft' AND authorId = 当前用户ID)`（能看到自己的草稿）

**关键代码**：
```javascript
const userId = ctx.state.user?.id;
let where = {};
if (userId) {
    where = {
        [Op.or]: [
            { status: 'published' },
            { status: 'draft', authorId: userId }
        ]
    };
} else {
    where = { status: 'published' };
}
```

#### 3.1.2 详情接口 `GET /article/:id`

**修改位置**：[article.js](file:///d:/Desktop/新建文件夹 (2)/278-20260128-123520/278/backend/routes/article.js#L139-L157)

**逻辑**：文章查询成功后额外检查一层 —— 若是草稿且访问者不是作者，直接抛 404（伪装成文章不存在，避免泄露"有这篇草稿"的信息）。

**关键代码**：
```javascript
const userId = ctx.state.user?.id;
if (article.status === 'draft' && article.authorId !== userId) {
    ctx.throw(404, '文章未找到');
}
```

#### 3.1.3 安全说明
- 编辑接口 `PUT /article/:id` 原本已有 `authorId !== userId → 403` 的校验，天然只有作者能改状态，无需额外加固
- 创建接口 `POST /article` 已接受 `status` 字段（model 有默认值 `'published'`），前端提交时覆盖即可

---

### 3.2 前端：状态选择 UI（从 select → 双按钮卡片）

为解决"看不见切换入口"的问题，将两个页面的状态选择器统一改造为**高亮卡片 + 双按钮**形式：

#### 视觉设计

```
┌──────────────────────────────────────────────────┐
│  ┌───────┐                                         │
│  │ 当前：已发布 │  ← 实时彩色徽章（绿=已发布，黄=草稿）  │
│  └───────┘                                         │
│  ┌─────────────┐  ┌─────────────┐                  │
│  │   已发布    │  │  存为草稿   │  ← 选中项有背景色+阴影   │
│  └─────────────┘  └─────────────┘                  │
│  💡 「草稿」仅您可见，「已发布」所有人可见              │
└──────────────────────────────────────────────────┘
```

**样式要点**：
- 卡片容器：`border-2 border-dashed bg-blue-50/40 border-blue-200/60`（虚线蓝边，区别于普通表单）
- 选中按钮：`bg-emerald-500 / bg-amber-500` + 实心边框 + 阴影（`shadow-md shadow-xxx/30`）
- 未选中按钮：白底灰边 + hover 时边框变为对应主题色

#### 3.2.1 `ArticleEdit.jsx` 修改

**修改位置**：[ArticleEdit.jsx](file:///d:/Desktop/新建文件夹 (2)/278-20260128-123520/278/frontend/src/pages/ArticleEdit.jsx)

| 改动点 | 说明 |
|--------|------|
| `formData` 初始化 | 新增 `status: 'published'` 默认值 |
| `fetchData` 赋值 | `setFormData({ ..., status: articleData.status \|\| 'published' })` |
| 状态选择区 | 替换为双按钮卡片（见上方视觉设计） |
| 提交逻辑 | 保持不变，`{ ...formData }` 展开会自动带上 status |

#### 3.2.2 `ArticleCreate.jsx` 修改

**修改位置**：[ArticleCreate.jsx](file:///d:/Desktop/新建文件夹 (2)/278-20260128-123520/278/frontend/src/pages/ArticleCreate.jsx)

| 改动点 | 说明 |
|--------|------|
| `formData` 初始化 | 新增 `status: 'published'` 默认值 |
| 状态选择区 | 在「标签」与「内容详情」之间插入双按钮卡片 |
| `handleSubmit` 签名 | 增加 `forceStatus` 参数：`handleSubmit(e, forceStatus = null)` |
| 提交逻辑 | `const submitStatus = forceStatus \|\| formData.status`，优先级：按钮参数 > 表单选择 |
| 底部按钮区 | 从单按钮改为**双按钮并排**：<br>• 左侧「保存草稿」（白底琥珀色边框），`onClick={e => handleSubmit(e, 'draft')}`<br>• 右侧「立即发布」（蓝紫渐变主按钮），`onClick={e => handleSubmit(e, 'published')}` |

> 💡 **设计意图**：即使状态选择器被用户忽略，底部两个独立提交按钮也能**强制指定最终状态**，避免"选了草稿却点了发布"之类的困惑。`forceStatus` 覆盖 `formData.status` 的策略是最终一致性保障。

---

### 3.3 前端：状态标签展示（已存在的补充验证）

此前已在两个页面添加展示标签，此次修复中一并确认存在：

| 页面 | 位置 | 样式 |
|------|------|------|
| `Dashboard.jsx` | 卡片中作者信息下方、标题上方 | `text-[10px]` 小徽章，琥珀/翡翠色 |
| `ArticleDetail.jsx` | 文章大标题上方居中 | `text-sm` 较大徽章，视觉突出 |

配色统一：
- **已发布**：`bg-emerald-50(+100/80) text-emerald-600(+700) border-emerald-200`
- **草稿**：`bg-amber-50(+100/80) text-amber-600(+700) border-amber-200`

---

## 4. 权限矩阵（修复后）

| 操作 | 未登录 | 其他登录用户 | 文章作者 |
|------|--------|-------------|---------|
| 查看已发布文章列表 | ✅ | ✅ | ✅ |
| 查看自己的草稿文章列表 | ❌（无身份） | ❌ | ✅ |
| 查看他人的草稿列表 | ❌ | ❌ | — |
| 访问已发布文章详情 | ✅ | ✅ | ✅ |
| 访问自己的草稿详情 | ❌（无身份） | ❌ | ✅ |
| 访问他人的草稿详情 | ❌（404） | ❌（404） | — |
| 修改文章状态 / 保存草稿 | ❌ | ❌（403） | ✅ |

---

## 5. 验证步骤

### 5.1 代码静态验证

用 IDE 诊断工具检查以下文件是否有语法/导入错误：
- `backend/routes/article.js` → ✅ 无错误
- `frontend/src/pages/Dashboard.jsx` → ✅ 无错误
- `frontend/src/pages/ArticleDetail.jsx` → ✅ 无错误
- `frontend/src/pages/ArticleCreate.jsx` → ✅ 无错误
- `frontend/src/pages/ArticleEdit.jsx` → ✅ 无错误

### 5.2 运行时验证（Docker 启动后）

**前置条件**：准备两个测试账号 —— `userA`、`userB`。

| # | 场景 | 操作步骤 | 预期结果 |
|---|------|---------|---------|
| 1 | Dashboard 状态标签 | 登录后进入首页 | 每篇文章卡片作者信息下方显示「已发布」或「草稿」徽章 |
| 2 | ArticleDetail 状态标签 | 打开任意文章 | 大标题上方居中显示对应状态徽章 |
| 3 | ArticleEdit 切换入口可见 | 打开自己的文章→编辑页 | 「标签」下方可见虚线蓝框的状态选择卡，当前状态有彩色徽章 |
| 4 | ArticleEdit 切换状态 | 编辑页点「存为草稿」→保存→返回 | 列表/详情显示「草稿」徽章 |
| 5 | ArticleCreate 双按钮 | 进入发布新文章页 | 底部有「保存草稿」（左，琥珀边）+「立即发布」（右，蓝紫渐变）两个按钮 |
| 6 | ArticleCreate 保存草稿 | 填标题内容→点「保存草稿」 | 列表显示为「草稿」，仅本人可见 |
| 7 | ArticleCreate 立即发布 | 填标题内容→点「立即发布」 | 列表显示为「已发布」，所有用户可见 |
| 8 | **安全测试** - 草稿列表隔离 | userA 发布一篇草稿 → 退出/换 userB 登录 → 访问首页 | userB 的列表中**看不到** userA 这篇草稿 |
| 9 | **安全测试** - 草稿直接访问 | userA 发布一篇草稿，记下 ID → 退出登录 → 浏览器直接访问 `/article/{id}` | 返回「文章不存在」（404，伪装成不存在） |
| 10 | **安全测试** - 跨用户改状态 | 用 HTTP 客户端以 userB 身份调用 `PUT /article/{userA文章ID}` 传 `status: 'draft'` | 返回 403 权限不足，文章状态保持不变 |

---

## 6. 修改文件清单

| 文件 | 修改类型 | 说明 |
|------|----------|------|
| `backend/routes/article.js` | 🔧 修复 | 列表接口加 status 过滤；详情接口加草稿作者校验 |
| `frontend/src/pages/Dashboard.jsx` | 🔧 保留 | 确认状态标签展示存在（此前已加） |
| `frontend/src/pages/ArticleDetail.jsx` | 🔧 保留 | 确认状态标签展示存在（此前已加） |
| `frontend/src/pages/ArticleEdit.jsx` | 🔧 优化 | formData 加 status；select → 双按钮卡片；fetchData 回填 status |
| `frontend/src/pages/ArticleCreate.jsx` | ➕ 改造 | formData 加 status；新增状态选择卡；handleSubmit 支持 forceStatus；底部改为"保存草稿 + 立即发布"双按钮 |
| `FIX_GUIDE.md` | 📝 文档 | 追加本次 FIX-003 记录 |

---

## 7. 后续可扩展方向

1. **个人中心「我的草稿」tab**：在 Dashboard 上方加筛选器，可只看自己的草稿
2. **自动草稿保存**：`ArticleCreate` / `ArticleEdit` 增加 `useEffect` 定时器，每 30 秒静默保存一次到 localStorage 或后端临时草稿接口
3. **定时发布**：新增 `status = 'scheduled'` + `publishAt` 字段，用 Cron job 到时自动改为 published
4. **审核流**：新增 `status = 'pending_review'`，仅 admin 可见并审核通过后变为 published

---

**文档版本**：v1.0（文章状态与草稿修复）  
**最后更新**：2026-06-18
