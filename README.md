# HTML 文件编辑器 / HTML File Editor

[中文](#中文) | [English](#english)

---

<a id="中文"></a>

## 中文

一个基于 Manifest V3 的 Chrome 扩展，可对本地 HTML 文件（`file://` 页面）进行可视化拖拽编辑，并将修改直接保存回文件。无需任何第三方库，纯原生 JavaScript 实现。

### ✨ 功能特性

- **可视化编辑**：单击选中元素，出现蓝色选框
- **自由拖拽**：拖动选中元素调整位置
- **8 向缩放**：通过缩放手柄调整元素大小
- **双击编辑文字**：直接修改文字内容
- **删除元素**：按 <kbd>Delete</kbd> 删除选中元素
- **撤销 / 重做**：<kbd>Ctrl</kbd>+<kbd>Z</kbd> 撤销操作
- **一键保存**：<kbd>Ctrl</kbd>+<kbd>S</kbd> 或点击保存，修改写回原 HTML 文件
- **悬浮球模式**：工具栏可收起为悬浮球，不影响页面阅读

### 📦 安装方法

1. 下载或克隆本仓库：
   ```bash
   git clone https://github.com/kevinmeikevin/html_editor.git
   ```
2. 打开 Chrome，访问 `chrome://extensions/`
3. 打开右上角的 **开发者模式**
4. 点击 **加载已解压的扩展程序**，选择项目根目录
5. **开启文件访问权限**（必须）：
   - 在扩展管理页找到「HTML 文件编辑器」
   - 点击 **详细信息** → 开启 **允许访问文件网址**

### 🚀 使用方法

1. 在 Chrome 地址栏打开本地 HTML 文件（如 `file:///D:/demo/index.html`）
2. 点击工具栏图标，在弹出窗口中点击 **开始编辑**（或按 <kbd>Ctrl</kbd>+<kbd>E</kbd>）
3. 编辑页面内容：
   - **单击** 元素选中
   - **双击** 文字直接编辑
   - **拖拽** 移动元素位置
   - 拖动 **缩放手柄** 调整大小
   - <kbd>Delete</kbd> 删除元素
4. 按 <kbd>Ctrl</kbd>+<kbd>S</kbd> 或点击 **保存文件** 保存修改

### ⌨️ 快捷键

| 快捷键 | 功能 |
| --- | --- |
| <kbd>Ctrl</kbd>+<kbd>E</kbd> | 进入 / 退出编辑模式 |
| <kbd>Ctrl</kbd>+<kbd>Z</kbd> | 撤销 |
| <kbd>Ctrl</kbd>+<kbd>S</kbd> | 保存修改 |
| <kbd>Delete</kbd> | 删除选中元素 |
| <kbd>Esc</kbd> | 取消选中 |

### 🔐 权限说明

| 权限 | 用途 |
| --- | --- |
| `file:///*` | 访问本地 HTML 文件以注入编辑器并保存修改 |
| `downloads` | 通过下载机制将修改后的文件写回磁盘 |
| `activeTab` | 获取当前标签页状态 |
| `scripting` | 按需注入内容脚本 |
| `storage` | 存储扩展运行时状态 |

### 📁 项目结构

```
html_editor/
├── manifest.json      # 扩展清单（Manifest V3）
├── background.js      # 后台 service worker：下载与脚本注入
├── content.js         # 内容脚本：核心编辑逻辑
├── content.css        # 编辑器界面样式
├── popup.html         # 弹出窗口页面
├── popup.js           # 弹出窗口逻辑
├── popup.css          # 弹出窗口样式
├── icons/             # 扩展图标
└── generate-icons.ps1 # 图标生成脚本（PowerShell）
```

### 🛠️ 技术栈

- Chrome Extension Manifest V3
- 原生 JavaScript（零依赖）
- chrome.runtime 消息通信
- chrome.downloads 文件保存

---

<a id="english"></a>

## English

A Chrome extension based on Manifest V3 that allows visual drag-and-drop editing of local HTML files (`file://` pages) and saves changes directly back to the file. Built with pure vanilla JavaScript — zero third-party dependencies.

### ✨ Features

- **Visual editing**: Click to select an element with a blue highlight box
- **Free dragging**: Move selected elements anywhere on the page
- **8-direction resize**: Adjust element size via resize handles
- **Inline text editing**: Double-click to edit text content directly
- **Delete elements**: Press <kbd>Delete</kbd> to remove the selected element
- **Undo / Redo**: <kbd>Ctrl</kbd>+<kbd>Z</kbd> to undo operations
- **One-click save**: <kbd>Ctrl</kbd>+<kbd>S</kbd> or click Save to write changes back to the HTML file
- **Floating ball mode**: Collapse the toolbar into a floating ball that doesn't block reading

### 📦 Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/kevinmeikevin/html_editor.git
   ```
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the project root directory
5. **Enable file access** (required):
   - Find "HTML File Editor" on the extensions page
   - Click **Details** → enable **Allow access to file URLs**

### 🚀 Usage

1. Open a local HTML file in Chrome (e.g. `file:///D:/demo/index.html`)
2. Click the toolbar icon, then click **Start Editing** in the popup (or press <kbd>Ctrl</kbd>+<kbd>E</kbd>)
3. Edit the page:
   - **Click** an element to select it
   - **Double-click** text to edit it
   - **Drag** to move elements
   - Drag **resize handles** to resize
   - Press <kbd>Delete</kbd> to delete an element
4. Press <kbd>Ctrl</kbd>+<kbd>S</kbd> or click **Save File** to save changes

### ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| <kbd>Ctrl</kbd>+<kbd>E</kbd> | Toggle edit mode |
| <kbd>Ctrl</kbd>+<kbd>Z</kbd> | Undo |
| <kbd>Ctrl</kbd>+<kbd>S</kbd> | Save changes |
| <kbd>Delete</kbd> | Delete selected element |
| <kbd>Esc</kbd> | Deselect |

### 🔐 Permissions

| Permission | Purpose |
| --- | --- |
| `file:///*` | Access local HTML files to inject the editor and save changes |
| `downloads` | Write modified files back to disk via the download mechanism |
| `activeTab` | Query the current tab state |
| `scripting` | Inject content scripts on demand |
| `storage` | Store extension runtime state |

### 📁 Project Structure

```
html_editor/
├── manifest.json      # Extension manifest (Manifest V3)
├── background.js      # Background service worker: downloads & script injection
├── content.js         # Content script: core editing logic
├── content.css        # Editor UI styles
├── popup.html         # Popup page
├── popup.js           # Popup logic
├── popup.css          # Popup styles
├── icons/             # Extension icons
└── generate-icons.ps1 # Icon generation script (PowerShell)
```

### 🛠️ Tech Stack

- Chrome Extension Manifest V3
- Vanilla JavaScript (zero dependencies)
- chrome.runtime messaging
- chrome.downloads file saving

## License

MIT
