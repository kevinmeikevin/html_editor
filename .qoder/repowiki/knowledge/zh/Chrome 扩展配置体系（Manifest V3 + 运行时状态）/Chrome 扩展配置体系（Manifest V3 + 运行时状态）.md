---
kind: configuration_system
name: Chrome 扩展配置体系（Manifest V3 + 运行时状态）
category: configuration_system
scope:
    - '**'
source_files:
    - manifest.json
    - background.js
    - popup.js
    - content.js
---

## 1. 使用的系统/方法

本仓库是一个基于 **Manifest V3** 的 Chrome 扩展，没有引入第三方配置库或外部配置文件。所有“配置”以以下形式存在：
- **声明式配置**：集中在 `manifest.json`，描述扩展元数据、权限、background service worker、popup、content scripts 注入规则等。
- **运行时状态配置**：通过 `chrome.storage` 权限声明（见 manifest），但当前代码中并未实际使用；编辑模式开关、选中元素、撤销历史等全部保存在 content script 的内存 `state` 对象中。
- **无外部配置文件**：仓库中没有 `.env`、`.yaml`、`.toml`、`config/` 目录、`application.properties` 等任何外部配置文件。

## 2. 关键文件

| 文件 | 角色 |
|---|---|
| `manifest.json` | 扩展唯一声明式配置入口：版本、权限、background、action/popup、content_scripts 注入匹配与资源 |
| `background.js` | Service Worker，处理 `chrome.downloads` 下载和 `chrome.scripting.executeScript` 动态注入 |
| `popup.js` | 弹出窗口脚本，查询当前 tab、检测是否为 `file://`、向 content script 发送消息切换编辑/保存 |
| `content.js` | 内容脚本，维护编辑器内存状态 `state`（editing、selectedEl、history、maxHistory=80 等），实现拖拽、文本编辑、撤销、保存 |
| `popup.html` / `popup.css` | 弹出界面 UI |
| `content.css` | 编辑器工具栏、选择框、手柄、提示、Toast 样式 |
| `test.html` | 用于本地测试的目标 HTML 页面 |

## 3. 架构与设计约定

### 3.1 声明式配置（manifest.json）
- 使用 `manifest_version: 3`，background 通过 `service_worker` 字段指向 `background.js`。
- 权限集中声明在 `permissions`：`downloads`、`activeTab`、`scripting`、`storage`。
- 主机权限 `host_permissions: ["file:///*"]` 允许对本地文件操作。
- Content script 通过 `matches: ["file:///*"]` 仅注入到本地 HTML 页面，`run_at: "document_idle"` 保证 DOM 已就绪。
- Popup 通过 `action.default_popup` 指定 `popup.html`。

### 3.2 进程间通信作为“配置通道”
扩展各组件之间不共享全局变量，而是通过 Chrome Messaging API 传递“配置型消息”：
- popup → content script：`toggleEdit`、`getStatus`、`save`。
- content script → background：`download`（触发下载）、`inject`（按需注入 content script）。
- 这些消息类型是硬编码字符串常量，由调用方直接传入，没有被集中定义为一个配置模块。

### 3.3 运行时状态管理（content.js 中的 `state`）
编辑器核心状态集中在一个 `state` 对象中，包括：
- `editing`：是否处于编辑模式
- `selectedEl`：当前选中的 DOM 元素
- `textEditing`：是否正在编辑文字
- `isDragging` / `isResizing` / `dragData` / `resizeData`：拖拽与缩放状态
- `history` / `historyIndex` / `maxHistory=80`：撤销栈及最大步数
- `initialized`：初始化标志
该状态完全驻留在内存中，随页面刷新丢失，没有持久化逻辑。

### 3.4 保存策略的“降级配置”
`save()` 函数内置了两种保存路径，按浏览器能力自动选择：
1. 优先尝试 `window.showSaveFilePicker`（File System Access API），可直接覆盖原文件。
2. 失败或不可用时回退到 Blob + `<a download>` 下载方式，提示用户手动替换原文件。
这是运行时行为分支，不是可编辑的外部配置项。

## 4. 约定与约束

- **所有扩展级配置必须写在 `manifest.json`**：新增权限、新 content script、新 popup 都需要在此声明，否则不会生效。
- **Content script 仅注入 `file://` 协议页面**：`matches` 限制为 `file:///*`，对远程网页无效。
- **编辑状态不持久化**：`state` 是纯内存结构，刷新后重置；仓库未使用 `chrome.storage` 做设置持久化（尽管声明了该权限）。
- **消息类型是字符串字面量**：`toggleEdit`、`getStatus`、`save`、`download`、`inject` 等消息类型在 popup.js、content.js、background.js 中分散出现，没有统一的枚举或常量文件。
- **编辑器 UI 通过 `data-he` 属性标记**：工具栏、选择框、手柄、提示、Toast 均带有 `data-he="..."` 属性，用于在清理/撤销时识别并移除编辑器注入的 DOM。
- **撤销历史上限固定为 80**：`maxHistory = 80` 是硬编码常量，无法从外部调整。
- **保存文件名推导规则**：取当前 URL pathname 最后一部分作为文件名，若不以 `.html`/`.htm` 结尾则追加 `.html`。

## 5. 结论

该仓库不存在传统意义上的“配置系统”——没有配置文件、没有环境变量加载器、没有 feature flag 机制。它的“配置”体现在三部分：`manifest.json` 的声明式扩展配置、content script 内存中的运行时状态对象、以及 popup/background/content 之间的消息协议。如果需要扩展功能（如新增保存格式、自定义快捷键、持久化设置），应遵循现有模式：在对应脚本中以常量/状态变量的形式添加，并通过 Chrome Messaging 在各组件间传递。