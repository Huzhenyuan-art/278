#!/usr/bin/env bash
set -e

# ==============================================================================
# IT 技术交流平台 - 一键启动脚本 (Linux/Mac)
# ------------------------------------------------------------------------------
# 功能：
#   1. 检查 Docker 环境
#   2. 自动创建 .env 文件（如不存在）
#   3. 停止并清理旧容器
#   4. 构建并启动所有服务
#   5. 显示服务访问信息
# ==============================================================================

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          IT 技术交流平台 - 一键启动脚本                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未检测到 Docker，请先安装 Docker Desktop"
    exit 1
fi

# 检查 Docker Compose 是否可用
if ! docker compose version &> /dev/null; then
    echo "❌ 错误: Docker Compose 不可用，请检查 Docker 安装"
    exit 1
fi

echo "✅ Docker 环境检测通过"

# 检查 .env 文件，如不存在则从 .env.example 复制
if [ ! -f .env ]; then
    echo "📝 未找到 .env 文件，正在从 .env.example 创建..."
    cp .env.example .env
    echo "✅ .env 文件已创建，请根据需要修改其中的配置"
fi

# 解析命令行参数
MODE="normal"
for arg in "$@"; do
    case $arg in
        --clean|-c)
            MODE="clean"
            shift
            ;;
        --rebuild|-r)
            MODE="rebuild"
            shift
            ;;
        --stop|-s)
            MODE="stop"
            shift
            ;;
        --help|-h)
            echo ""
            echo "用法: $0 [选项]"
            echo ""
            echo "选项:"
            echo "  -c, --clean      清理模式：停止服务并删除所有数据卷"
            echo "  -r, --rebuild    重建模式：无缓存重新构建镜像并启动"
            echo "  -s, --stop       停止模式：仅停止所有服务"
            echo "  -h, --help       显示此帮助信息"
            echo ""
            exit 0
            ;;
    esac
done

# 停止模式
if [ "$MODE" = "stop" ]; then
    echo "🛑 正在停止所有服务..."
    docker compose down
    echo "✅ 所有服务已停止"
    exit 0
fi

# 清理模式
if [ "$MODE" = "clean" ]; then
    echo "⚠️  清理模式：将删除所有数据卷，此操作不可恢复！"
    read -p "确定要继续吗？(y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "已取消"
        exit 0
    fi
    echo "🧹 正在清理旧容器和数据卷..."
    docker compose down -v --remove-orphans
    echo "✅ 清理完成"
fi

# 停止旧容器
echo "🧹 停掉旧容器..."
docker compose down --remove-orphans

# 构建镜像
if [ "$MODE" = "rebuild" ]; then
    echo "🔥 无缓存构建镜像..."
    docker compose build --no-cache
else
    echo "🔨 构建镜像..."
    docker compose build
fi

# 启动服务
echo "🚀 启动服务..."
if [ "$MODE" = "clean" ] || [ "$MODE" = "rebuild" ]; then
    docker compose up --force-recreate --renew-anon-volumes -d
else
    docker compose up -d
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                      服务启动完成！                           ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  🌐 前端地址:    http://localhost:${FRONTEND_PORT:-3160}          ║"
echo "║  🔧 后端 API:    http://localhost:${BACKEND_PORT:-5160}          ║"
echo "║  📦 数据库:      localhost:${DB_PORT:-3306}                     ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  👤 管理员账号:  admin / admin123                           ║"
echo "║  👤 普通用户:    user / user123                             ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  查看日志:  docker compose logs -f [服务名]                  ║"
echo "║  停止服务:  $0 --stop                                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
