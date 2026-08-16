---
kind: frontend_style
name: Chrome 扩展前端样式：BEM 风格 CSS + 暗色工具栏/浅色 Popup 双主题
category: frontend_style
scope:
    - '**'
source_files:
    - content.css
    - popup.css
    - popup.html
    - manifest.json
---

## 1. 使用的系统与方法

仓库是一个基于 Manifest V3 的 Chrome 扩展，UI 由两部分组成：
- **Popup（弹出面板）**：`popup.html` + `popup.css` + `popup.js`，用于检测当前标签页、切换编辑模式与保存文件。
- **Content Script UI（注入到目标页面）**：`content.css` + `content.js`，在本地 `file://` HTML 页面中注入浮动工具栏、选框、缩放手柄、提示条与 Toast。

样式方案是**纯原生 CSS**，没有引入任何框架或预处理器（无 SCSS/Tailwind/Less），也没有设计令牌文件。所有视觉表现直接写在两个 CSS 文件中。

## 2. 关键文件

- `content.css`：注入到目标页面的样式，定义编辑器工具栏、选中框、拖拽手柄、提示条、Toast 等。
- `popup.css`：扩展弹出窗口的样式，定义状态面板、操作按钮、说明区块与警告区块。
- `popup.html`：弹出窗口结构，引用 `popup.css` 与 `icons/icon48.png`。
- `manifest.json`：声明 MV3 权限与资源入口（样式通过 content script 注入）。

## 3. 架构与约定

### 命名约定：类前缀 `he-`
内容脚本注入的所有 DOM 节点统一使用 `he-` 前缀，避免与宿主页面冲突：
- 容器：`#he-toolbar`、`#he-selection`、`#he-hint`、`#he-toast`
- 组件：`.he-btn`、`.he-handle`、`.he-selectable`、`.he-divider`、`.he-title`、`.he-label`
- 变体：`.he-btn-success` / `.he-btn-warning` / `.he-btn-danger` / `.he-active` / `.he-on` / `.he-dragging` / `.he-hidden`
- 状态类：`body.he-editing` 控制编辑模式下的光标与高亮行为。

这种命名方式使注入样式天然隔离，不会污染宿主页面，也不会被宿主覆盖。

### 颜色体系：Tailwind 风格的语义色
两个 CSS 文件共享同一套近似 Tailwind 的颜色语义：
- 背景/边框：`#0f172a`、`#1e293b`、`#334155`、`#e2e8f0`、`#f8fafc`
- 主色（蓝色）：`#3b82f6` / `#2563eb`（hover）
- 成功（绿色）：`#22c55e` / `#16a34a`
- 警告（琥珀）：`#f59e0b` / `#d97706` / `#fbbf24`
- 危险（红色）：`#ef4444` / `#dc2626`
- 文字灰阶：`#94a3b8`、`#64748b`、`#334155`、`#1e293b`、`#e2e8f0`

这些值以硬编码形式散布在两个文件中，未集中为 CSS 变量，但语义一致。

### 字体策略
- 正文：`-apple-system, 'Segoe UI', system-ui, sans-serif`，跨平台优先使用系统字体栈。
- 代码/快捷键：`'Consolas', 'Monaco', monospace`，用于 `<kbd>` 和 `<code>`。

### 布局方法
- 工具栏：`position: fixed; top: 10px; left: 50%; transform: translateX(-50%);` 水平居中悬浮。
- 提示条：底部居中固定定位。
- 选框/手柄：绝对定位叠加在目标元素上。
- Popup：固定宽度 `380px`，Flex 纵向排列，无响应式媒体查询。

### z-index 层级
注入层使用接近浏览器上限的 z-index 保证浮层始终可见：
- `#he-toolbar`、`#he-hint`、`#he-toast`：`z-index: 2147483647`
- `#he-selection`：`2147483646`
- `.he-handle`：`2147483647`

### 交互反馈约定
- 按钮 hover：`background` 加深；active：`transform: scale(0.97)`。
- 禁用态：`opacity: 0.4; cursor: not-allowed`。
- 编辑模式：`body.he-editing [contenteditable="true"]` 加蓝色 outline 与文本光标。
- 可点击元素：`.he-selectable:hover` 虚线蓝色轮廓。
- Toast：通过 `.he-show` 切换 opacity 与 translateY 动画。

## 4. 约束与规则

- **无 CSS 预处理/构建步骤**：CSS 文件直接由浏览器加载，无编译管线。
- **注入样式必须带 `he-` 前缀**：这是避免与宿主页面冲突的硬性约定，所有 content script 生成的节点都遵循此命名。
- **Popup 不响应式**：固定 `380px` 宽度，无媒体查询，适配桌面端扩展弹窗尺寸。
- **颜色硬编码**：未发现 `:root` 自定义属性或集中调色板，新增颜色需手动同步到两个文件。
- **图标仅 PNG**：`icons/` 目录提供 `icon16.png`、`icon48.png`、`icon128.png`，无 SVG 或内联图标。
- **语言与方向**：`popup.html` 声明 `lang="zh-CN"`，文案为中文，未做 i18n 机制。

总体而言，该项目的样式系统是轻量、自包含的原生 CSS，通过 `he-` 命名空间实现注入隔离，并使用一套统一的蓝/绿/琥珀/红语义色维持视觉一致性。