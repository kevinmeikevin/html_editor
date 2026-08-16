---
kind: error_handling
name: Chrome 扩展中的轻量级错误处理：基于 chrome.runtime.lastError 与用户提示的容错策略
category: error_handling
scope:
    - '**'
source_files:
    - background.js
    - content.js
    - popup.js
    - manifest.json
---

## 1. 采用的系统/方法

该仓库是一个 Manifest V3 的 Chrome 扩展，没有引入任何第三方错误库或自定义错误类型。错误处理完全依赖浏览器原生能力：
- 通过 `chrome.runtime.lastError` 检查异步 API（`chrome.downloads.download`、`chrome.scripting.executeScript`、`chrome.tabs.sendMessage`）调用是否失败。
- 使用 `try/catch` 捕获 Web API 异常（主要是 `window.showSaveFilePicker` 和 `Blob` 下载流程）。
- 通过 DOM 层 UI 反馈错误：在 content script 中用 `showToast(msg, isError)` 显示带 `he-error` 类的 toast；在 popup 中修改状态文本并显示警告区域。

没有发现 `throw new Error(...)` 的自定义错误对象、全局 `unhandledrejection` 监听、`panic/recover` 模式（JS 无此概念），也没有集中式的错误码定义文件。

## 2. 关键文件与位置

| 文件 | 职责 | 错误处理要点 |
|---|---|---|
| `background.js` | Service Worker，处理保存与注入 | 检查 `chrome.runtime.lastError` 后通过 `sendResponse({ success: false, error })` 回传 |
| `content.js` | 页面内编辑器，负责拖拽/编辑/保存 | 捕获 `showSaveFilePicker` 异常，区分 `AbortError`（用户取消）与普通错误；Blob 下载失败时 toast 提示 |
| `popup.js` | 弹出窗口 UI 与控制 | 检测 `file://` 协议、内容脚本加载失败、消息发送失败，更新状态文字与禁用按钮 |
| `manifest.json` | 权限声明 | 声明 `downloads`、`scripting`、`activeTab`、`storage` 及 `file:///*` host 权限，这些权限缺失会直接导致相关 API 报错 |

## 3. 架构与约定

### 3.1 跨进程通信的错误传播
- **popup → content**：`chrome.tabs.sendMessage` 回调中统一检查 `chrome.runtime.lastError`，若存在则设置状态为“无法连接到编辑器”并禁用操作按钮。
- **content → background**：`chrome.runtime.onMessage` 监听器对 `download` 和 `inject` 两种消息分别处理，均通过 `sendResponse` 返回 `{ success, ... }` 结构，失败时附带 `error` 字段。
- **background → popup**：popup 不直接消费 background 响应，而是由 content 自行完成保存逻辑，background 仅作为下载桥接。

### 3.2 保存流程的降级与容错
`content.js` 的 `save()` 函数体现了明确的降级链：
1. 优先尝试 `window.showSaveFilePicker`（可原地覆盖原文件）。
2. 捕获异常后，若 `err.name === 'AbortError'` 视为用户主动取消，静默返回。
3. 其他异常或 API 不可用时，回退到 `Blob + URL.createObjectURL + <a download>` 触发下载。
4. 若 Blob 路径也失败，toast 以 `isError=true` 显示“保存失败: …”。

### 3.3 UI 层的错误呈现约定
- 成功/普通提示：`showToast('...')`，默认样式。
- 错误提示：`showToast('...', true)`，添加 `he-error` 类名（对应 `content.css` 中的样式）。
- 长时间自动消失（2500ms），避免阻塞用户。
- popup 侧通过改变 `status-dot` 的 class（`inactive` / `active`）和文案表达状态。

### 3.4 防御性编程约定
- 所有 DOM 引用在使用前进行空值检查（如 `if (!toast) return;`、`if (!state.selectedEl) return;`）。
- 事件处理器普遍采用早返回（guard clause）模式，避免无效状态下继续执行。
- 撤销历史有上限（`maxHistory = 80`），超出时截断，防止内存增长。

## 4. 约定与约束

### 观察到的约定（描述性）
- 所有 Chrome API 异步回调均以 `chrome.runtime.lastError` 作为失败判断依据，而非依赖返回值。
- 用户可感知的错误一律通过 UI 反馈（toast 或状态文案），不在控制台输出详细堆栈。
- 用户主动取消操作（如关闭文件选择器）不被视为错误，静默忽略。
- 保存失败时优先尝试更强大的 API，再回退到兼容方案，保证基本可用性。

### 明确存在的约束（来自代码实现）
- 扩展仅在 `file://` 协议页面生效（`manifest.json` 的 `matches` 与 `host_permissions` 限制），非本地 HTML 页面会禁用所有编辑功能。
- 内容脚本通过 `document_idle` 注入，若页面未就绪则不会执行。
- 保存操作依赖 `downloads` 权限；若权限被拒绝，`chrome.downloads.download` 将产生 `lastError`。
- 不存在全局错误边界：每个模块独立处理自身可能抛出的异常，没有统一的 try/catch 包裹入口。

## 5. 不足与风险

- 没有针对 `chrome.storage` 操作的错误处理（虽然 manifest 声明了 storage 权限，但当前代码未使用该 API）。
- `content.js` 中大量 DOM 操作未包裹 try/catch，若目标页面结构异常可能导致编辑器崩溃。
- 未捕获 `unhandledrejection`，Promise 拒绝会以浏览器默认方式记录，用户不可见。
- 错误信息对用户不够友好（例如直接拼接 `err.message`），缺乏本地化或引导说明。
