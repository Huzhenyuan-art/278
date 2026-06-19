# 前端构建解析失败修复指南

## 问题概述

前端项目在构建时出现 JSX 语法解析失败错误，原因是在 `.js` 后缀的工具文件中直接使用了 JSX 语法，而 Vite 等构建工具默认不会对 `.js` 文件进行 JSX 转译。

---

## 问题原因

### 根本原因
`frontend/src/utils/common.js` 文件中的 `highlightText` 函数直接返回 JSX 元素（`<mark>`、`<span>` 等），但该文件使用 `.js` 后缀。构建工具（Vite）默认仅对 `.jsx` 后缀的文件启用 JSX 语法解析，导致构建时抛出解析错误。

### 问题代码位置
- **文件**: `frontend/src/utils/common.js`
- **函数**: `highlightText` (第 104-126 行，修复前)
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
- ✅ 保持工具文件的纯 JS 特性，不依赖 React
- ✅ 提高工具函数的通用性（可在非 React 环境中使用）
- ✅ 符合"关注点分离"的设计原则
- ✅ 无需修改构建配置，侵入性最小

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
            if (HighlightComponent) {
                return <HighlightComponent key={index}>{part}</HighlightComponent>;
            }
            return (
                <mark key={index} className="...">
                    {part}
                </mark>
            );
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
            <mark
                key={index}
                className="bg-yellow-200/80 text-yellow-900 px-0.5 py-0.5 rounded font-medium"
            >
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

移除 `SearchResults.jsx` 中未使用的 `getFullImageUrl` 导入（代码审查时发现的冗余导入）。

---

## 验证方式

### 1. 语法检查
确认 `common.js` 文件中不再包含 JSX 语法：
```bash
# 在项目根目录执行
grep -n "<" frontend/src/utils/common.js
# 预期结果：仅在字符串和注释中出现 < 符号，无 JSX 标签
```

### 2. 启动开发服务器
```bash
cd frontend
npm install
npm run dev
# 预期结果：开发服务器正常启动，无编译错误
```

### 3. 生产构建验证
```bash
cd frontend
npm run build
# 预期结果：构建成功，无报错
```

### 4. 功能验证
1. 打开搜索页面（`/search?q=关键词`）
2. 确认搜索结果中的标题和摘要关键词正确高亮显示
3. 确认高亮样式与修复前完全一致（黄色背景）
4. 验证多个关键词匹配、无匹配、空关键词等边界情况

### 5. 回归测试
- 验证其他引用 `common.js` 的页面功能正常
- 验证所有工具函数（`truncateContent`、`getCurrentUser` 等）正常工作

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

3. **可选：ESLint 规则**：
   - 可配置 `eslint-plugin-react` 的相关规则
   - 或使用 `no-restricted-syntax` 规则禁止在 `.js` 文件中使用 JSX

---

## 备选方案（未采用）

### 方案 A：将文件重命名为 `.jsx`
- 优点：改动最小
- 缺点：工具文件依赖 React，降低通用性；不符合架构分层原则

### 方案 B：配置 Vite 支持 `.js` 文件的 JSX 转译
- 优点：无需修改业务代码
- 缺点：构建配置复杂化，可能引发其他问题；不符合社区最佳实践

### 方案 C：使用 `React.createElement` 替代 JSX
- 优点：保持返回 React 元素的 API
- 缺点：代码可读性差，仍依赖 React

---

## 相关参考

- [Vite 官方文档 - JSX 支持](https://vitejs.dev/guide/features.html#jsx)
- [React 官方文档 - JSX 简介](https://react.dev/learn/writing-markup-with-jsx)
