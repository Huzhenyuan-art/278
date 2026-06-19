#!/usr/bin/env bash
set -e

# ==============================================================================
# 重新生成 package-lock.json 文件脚本
# ------------------------------------------------------------------------------
# 用途：在本地开发环境中执行 npm install，生成完整且同步的 package-lock.json
# 适用场景：
#   1. 首次克隆项目后
#   2. package.json 依赖变更后
#   3. package-lock.json 与 package.json 不同步导致 npm ci 失败时
# ==============================================================================

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         重新生成 package-lock.json 文件                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# 检查 Node.js 环境
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未检测到 Node.js，请先安装 Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js 版本: $NODE_VERSION"

if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未检测到 npm"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo "✅ npm 版本: $NPM_VERSION"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# ------------------------------------------------------------------------------
# 生成后端 package-lock.json
# ------------------------------------------------------------------------------
echo "🔄 正在处理后端依赖..."
cd "$PROJECT_ROOT/backend"

# 删除旧的 lock 文件
if [ -f package-lock.json ]; then
    echo "   删除旧的 package-lock.json..."
    rm -f package-lock.json
fi

# 删除 node_modules 确保干净安装
if [ -d node_modules ]; then
    echo "   清理 node_modules..."
    rm -rf node_modules
fi

# 配置镜像源加速安装
echo "   配置 npm 镜像源..."
npm config set registry https://registry.npmmirror.com

# 执行 npm install 生成完整的 lock 文件
echo "   执行 npm install 生成 lock 文件..."
npm install --no-audit --no-fund

if [ -f package-lock.json ]; then
    LOCK_SIZE=$(wc -c < package-lock.json)
    echo "   ✅ 后端 package-lock.json 已生成 ($LOCK_SIZE bytes)"
else
    echo "   ❌ 后端 package-lock.json 生成失败"
    exit 1
fi

# 验证 npm ci 是否可以成功执行
echo "   验证 npm ci..."
rm -rf node_modules
if npm ci --no-audit --no-fund; then
    echo "   ✅ 后端 npm ci 验证通过"
else
    echo "   ⚠️  后端 npm ci 验证失败，但 lock 文件已生成"
fi

echo ""

# ------------------------------------------------------------------------------
# 生成前端 package-lock.json
# ------------------------------------------------------------------------------
echo "🔄 正在处理前端依赖..."
cd "$PROJECT_ROOT/frontend"

if [ -f package-lock.json ]; then
    echo "   删除旧的 package-lock.json..."
    rm -f package-lock.json
fi

if [ -d node_modules ]; then
    echo "   清理 node_modules..."
    rm -rf node_modules
fi

echo "   配置 npm 镜像源..."
npm config set registry https://registry.npmmirror.com

echo "   执行 npm install 生成 lock 文件..."
npm install --no-audit --no-fund

if [ -f package-lock.json ]; then
    LOCK_SIZE=$(wc -c < package-lock.json)
    echo "   ✅ 前端 package-lock.json 已生成 ($LOCK_SIZE bytes)"
else
    echo "   ❌ 前端 package-lock.json 生成失败"
    exit 1
fi

echo "   验证 npm ci..."
rm -rf node_modules
if npm ci --no-audit --no-fund; then
    echo "   ✅ 前端 npm ci 验证通过"
else
    echo "   ⚠️  前端 npm ci 验证失败，但 lock 文件已生成"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                   package-lock.json 生成完成                 ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  下一步操作:                                                 ║"
echo "║  1. 验证构建: docker compose build                           ║"
echo "║  2. 提交文件: git add backend/package-lock.json              ║"
echo "║                frontend/package-lock.json                    ║"
echo "║  3. 提交代码: git commit -m \"chore: sync package-lock.json\"  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
