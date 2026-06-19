@echo off
setlocal enabledelayedexpansion

REM ==============================================================================
REM 重新生成 package-lock.json 文件脚本 (Windows)
REM ==============================================================================

echo ╔══════════════════════════════════════════════════════════════╗
echo ║         重新生成 package-lock.json 文件                      ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM 检查 Node.js 环境
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未检测到 Node.js，请先安装 Node.js 18+
    pause
    exit /b 1
)

for /f "delims=" %%v in ('node --version') do set "NODE_VERSION=%%v"
echo ✅ Node.js 版本: %NODE_VERSION%

npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未检测到 npm
    pause
    exit /b 1
)

for /f "delims=" %%v in ('npm --version') do set "NPM_VERSION=%%v"
echo ✅ npm 版本: %NPM_VERSION%
echo.

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."

REM ------------------------------------------------------------------------------
REM 生成后端 package-lock.json
REM ------------------------------------------------------------------------------
echo 🔄 正在处理后端依赖...
cd /d "%PROJECT_ROOT%\backend"

if exist package-lock.json (
    echo    删除旧的 package-lock.json...
    del /f /q package-lock.json
)

if exist node_modules (
    echo    清理 node_modules...
    rmdir /s /q node_modules
)

echo    配置 npm 镜像源...
call npm config set registry https://registry.npmmirror.com

echo    执行 npm install 生成 lock 文件...
call npm install --no-audit --no-fund

if exist package-lock.json (
    echo    ✅ 后端 package-lock.json 已生成
) else (
    echo    ❌ 后端 package-lock.json 生成失败
    pause
    exit /b 1
)

echo    验证 npm ci...
if exist node_modules rmdir /s /q node_modules
call npm ci --no-audit --no-fund
if %errorlevel% equ 0 (
    echo    ✅ 后端 npm ci 验证通过
) else (
    echo    ⚠️  后端 npm ci 验证失败，但 lock 文件已生成
)

echo.

REM ------------------------------------------------------------------------------
REM 生成前端 package-lock.json
REM ------------------------------------------------------------------------------
echo 🔄 正在处理前端依赖...
cd /d "%PROJECT_ROOT%\frontend"

if exist package-lock.json (
    echo    删除旧的 package-lock.json...
    del /f /q package-lock.json
)

if exist node_modules (
    echo    清理 node_modules...
    rmdir /s /q node_modules
)

echo    配置 npm 镜像源...
call npm config set registry https://registry.npmmirror.com

echo    执行 npm install 生成 lock 文件...
call npm install --no-audit --no-fund

if exist package-lock.json (
    echo    ✅ 前端 package-lock.json 已生成
) else (
    echo    ❌ 前端 package-lock.json 生成失败
    pause
    exit /b 1
)

echo    验证 npm ci...
if exist node_modules rmdir /s /q node_modules
call npm ci --no-audit --no-fund
if %errorlevel% equ 0 (
    echo    ✅ 前端 npm ci 验证通过
) else (
    echo    ⚠️  前端 npm ci 验证失败，但 lock 文件已生成
)

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                   package-lock.json 生成完成                 ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║  下一步操作:                                                 ║
echo ║  1. 验证构建: docker compose build                           ║
echo ║  2. 提交文件: git add backend\package-lock.json              ║
echo ║                frontend\package-lock.json                    ║
echo ║  3. 提交代码: git commit -m "chore: sync package-lock.json"  ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
pause
