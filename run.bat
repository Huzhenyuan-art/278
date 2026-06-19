@echo off
setlocal enabledelayedexpansion

REM ==============================================================================
REM IT 技术交流平台 - 一键启动脚本 (Windows)
REM ------------------------------------------------------------------------------
REM 功能：
REM   1. 检查 Docker 环境
REM   2. 自动创建 .env 文件（如不存在）
REM   3. 停止并清理旧容器
REM   4. 构建并启动所有服务
REM   5. 显示服务访问信息
REM ==============================================================================

echo ╔══════════════════════════════════════════════════════════════╗
echo ║          IT 技术交流平台 - 一键启动脚本                      ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM 检查 Docker 是否安装
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未检测到 Docker，请先安装 Docker Desktop
    pause
    exit /b 1
)

REM 检查 Docker Compose 是否可用
docker compose version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: Docker Compose 不可用，请检查 Docker 安装
    pause
    exit /b 1
)

echo ✅ Docker 环境检测通过
echo.

REM 检查 .env 文件，如不存在则从 .env.example 复制
if not exist .env (
    echo 📝 未找到 .env 文件，正在从 .env.example 创建...
    copy .env.example .env >nul
    echo ✅ .env 文件已创建，请根据需要修改其中的配置
    echo.
)

REM 解析命令行参数
set "MODE=normal"
:parse_args
if "%~1"=="" goto end_parse
if /i "%~1"=="--clean" set "MODE=clean"
if /i "%~1"=="-c" set "MODE=clean"
if /i "%~1"=="--rebuild" set "MODE=rebuild"
if /i "%~1"=="-r" set "MODE=rebuild"
if /i "%~1"=="--stop" set "MODE=stop"
if /i "%~1"=="-s" set "MODE=stop"
if /i "%~1"=="--help" goto show_help
if /i "%~1"=="-h" goto show_help
shift
goto parse_args
:end_parse

REM 停止模式
if "%MODE%"=="stop" (
    echo 🛑 正在停止所有服务...
    docker compose down
    echo ✅ 所有服务已停止
    pause
    exit /b 0
)

REM 清理模式
if "%MODE%"=="clean" (
    echo ⚠️  清理模式：将删除所有数据卷，此操作不可恢复！
    set /p confirm=确定要继续吗？(y/N): 
    if /i not "!confirm!"=="y" (
        echo 已取消
        pause
        exit /b 0
    )
    echo 🧹 正在清理旧容器和数据卷...
    docker compose down -v --remove-orphans
    echo ✅ 清理完成
)

REM 停止旧容器
echo 🧹 停掉旧容器...
docker compose down --remove-orphans

REM 构建镜像
if "%MODE%"=="rebuild" (
    echo 🔥 无缓存构建镜像...
    docker compose build --no-cache
) else (
    echo 🔨 构建镜像...
    docker compose build
)

REM 启动服务
echo 🚀 启动服务...
if "%MODE%"=="clean" (
    docker compose up --force-recreate --renew-anon-volumes -d
) else if "%MODE%"=="rebuild" (
    docker compose up --force-recreate --renew-anon-volumes -d
) else (
    docker compose up -d
)

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                      服务启动完成！                           ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║  🌐 前端地址:    http://localhost:3160                       ║
echo ║  🔧 后端 API:    http://localhost:5160                       ║
echo ║  📦 数据库:      localhost:3306                              ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║  👤 管理员账号:  admin / admin123                           ║
echo ║  👤 普通用户:    user / user123                             ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║  查看日志:  docker compose logs -f [服务名]                  ║
echo ║  停止服务:  %~nx0 --stop                                     ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
pause
exit /b 0

:show_help
echo.
echo 用法: %~nx0 [选项]
echo.
echo 选项:
echo   -c, --clean      清理模式：停止服务并删除所有数据卷
echo   -r, --rebuild    重建模式：无缓存重新构建镜像并启动
echo   -s, --stop       停止模式：仅停止所有服务
echo   -h, --help       显示此帮助信息
echo.
pause
exit /b 0
