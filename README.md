# 再熬一下 — Windows 桌面版

一个放在电脑桌面上的打工人情绪陪伴工具。把上班转换成实时可视化的收入、进度、目标和游戏反馈。

## 技术栈

- **Tauri 2** — 跨平台桌面框架（无边框悬浮窗 + 系统托盘 + 开机启动）
- **React 18 + TypeScript + Vite 5** — 前端
- **Tailwind CSS 3** — 样式
- **Zustand 5** — 状态管理 + localStorage 持久化
- **Rust** — 后端（托盘、窗口管理、命令）

## 构建 Windows 安装包

### 方式一：本地构建

1. 安装 [Node.js](https://nodejs.org/) 18+
2. 安装 [Rust](https://rustup.rs/)
3. 安装 [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)（Tauri 编译需要 MSVC）
4. 双击运行 `build.bat`，或手动执行：

```bash
npm install
npm run build      # 构建前端
npx tauri build    # 构建 Windows 安装包（首次需 10-20 分钟）
```

安装包输出位置：
- `src-tauri/target/release/bundle/nsis/*.exe`（NSIS 安装程序）
- `src-tauri/target/release/bundle/msi/*.msi`（MSI 安装包）

### 方式二：GitHub Actions 自动构建

1. 将本项目推送到 GitHub 仓库
2. 在仓库 `Settings → Actions → General` 中允许 workflow
3. 推送到 `main` 分支或手动触发 `Build Windows Installer` workflow
4. 构建完成后在 `Actions` 页面下载 artifact

## 开发模式

```bash
npm install
npm run tauri dev   # 同时启动前端 dev server 和 Tauri 窗口
```

## 桌面特性

| 特性 | 实现 |
|------|------|
| 无边框悬浮窗 | widget 窗口 `decorations: false, transparent: true` |
| 始终置顶 | `alwaysOnTop: true`，可在设置中开关 |
| 可拖动 | 前端 `startDragging()` + 控制区 `data-nodrag` |
| 可缩放 | hover 显示 S/M/L 切换按钮，调用 `setSize` |
| 系统托盘 | Rust `TrayIconBuilder` + 菜单（今日收入/打开主界面/显示隐藏/摸鱼/目标/设置/退出） |
| 开机启动 | `tauri-plugin-autostart`，设置页开关 |
| 隐藏到托盘 | 主窗口关闭拦截 → hide 而非 exit |
| 单实例 | `tauri-plugin-single-instance` |

## 核心引擎

- **TimeService（WorkTimeEngine）**：统一时间计算，支持多段工作时间、午休排除、实时收入
- **engine.ts**：每秒 tick → 按分钟节流执行成就检测、升级、目标完成、托盘更新
- **金额处理**：内部以"分"（整数）存储，避免浮点误差

## 项目结构

```
src/
├── components/       # UI 基础组件（ProgressBar, Ring, Modal, Toast）
├── pages/            # 主界面页面（Today, Goals, Achievements, DesktopSettings, Settings, Onboarding）
├── stores/          # Zustand 状态（user, goal, progress, widget, theme, fish, toast）
├── services/         # TimeService, engine, tauri 桥接, data 导入导出, todayStatus, companion
├── hooks/            # useClock（唯一时钟）
├── constants/        # levels, achievements, quotes, themes
├── types/            # TypeScript 类型定义
├── utils/            # money, format 工具
├── widget/           # WidgetApp（S/M/L 三种尺寸悬浮卡片）
└── App.tsx           # 根组件（按窗口 label 分流 widget / main）

src-tauri/
├── src/main.rs       # Rust 入口（托盘、窗口、命令）
├── tauri.conf.json   # Tauri 配置（双窗口、打包目标）
├── capabilities/     # 权限配置
└── icons/            # 应用图标（PNG + ICO）
```

## 主题

Midnight（黑紫）· Mint（薄荷）· Sakura（粉紫）· Sunset（橙暖）· Cyber（霓虹紫）

所有颜色定义为 CSS 变量（design tokens），切换主题即时生效。
