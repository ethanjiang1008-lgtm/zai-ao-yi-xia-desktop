@echo off
chcp 65001 >nul 2>nul
echo ============================================
echo   《再熬一下》Windows 桌面版构建
echo ============================================
echo.

REM 检查 Node.js
where npm >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Node.js，请先安装：https://nodejs.org/
  pause
  exit /b 1
)

REM 检查 Rust
where cargo >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Rust，请先安装：https://rustup.rs/
  echo   安装后重新运行本脚本
  pause
  exit /b 1
)

echo [1/3] 安装前端依赖...
call npm install
if errorlevel 1 (
  echo [错误] npm install 失败
  pause
  exit /b 1
)

echo.
echo [2/3] 构建前端（TypeScript + Vite）...
call npm run build
if errorlevel 1 (
  echo [错误] 前端构建失败
  pause
  exit /b 1
)

echo.
echo [3/3] 构建 Windows 安装包（Tauri）...
echo   首次编译需要下载依赖，可能需要 10-20 分钟...
call npx tauri build
if errorlevel 1 (
  echo [错误] Tauri 构建失败
  echo   常见原因：缺少 WebView2 运行时或 Visual Studio C++ 构建工具
  pause
  exit /b 1
)

echo.
echo ============================================
echo   构建成功！
echo   安装包位于：
echo   src-tauri\target\release\bundle\nsis\*.exe
echo   src-tauri\target\release\bundle\msi\*.msi
echo ============================================
echo.
pause
