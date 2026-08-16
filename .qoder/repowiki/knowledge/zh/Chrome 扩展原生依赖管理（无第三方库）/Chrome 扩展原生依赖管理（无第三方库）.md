---
kind: dependency_management
name: Chrome 扩展原生依赖管理（无第三方库）
category: dependency_management
scope:
    - '**'
source_files:
    - manifest.json
---

## 1. 使用的系统/方法

该仓库是一个基于 Manifest V3 的 Chrome 扩展，**没有使用任何第三方包管理器或外部依赖**。项目完全由原生 JavaScript、CSS、HTML 和 PNG 图标组成，所有功能通过 Chrome Extension APIs（`downloads`、`activeTab`、`scripting`、`storage`）实现。

- 不存在 `package.json`、`go.mod`、`requirements.txt`、`yarn.lock`、`pnpm-lock.yaml` 等依赖清单文件。
- 不存在 `vendor/`、`node_modules/`、`lib/` 等 vendoring 目录。
- 不存在私有 npm registry、Go module proxy、pip index 等配置。

## 2. 关键文件

- `manifest.json`：唯一声明扩展自身资源与权限的文件，定义了 background service worker、popup、content scripts、icons 以及所需的 Chrome API 权限。这是本仓库中唯一的“依赖声明”位置——它声明的是对浏览器内置 API 的运行时依赖。
- `background.js` / `content.js` / `popup.js`：纯 JS 逻辑，未 import/require 任何外部模块。
- `content.css` / `popup.css`：样式文件，未使用 CSS 预处理器或框架。
- `icons/icon*.png`：静态资源，作为扩展图标被 manifest 引用。

## 3. 架构与约定

- **零外部依赖策略**：整个扩展不引入任何第三方库，所有能力均通过 Chrome Extension APIs 提供。这种设计使扩展天然具备可移植性——只需一个文件夹即可安装到任意支持 MV3 的 Chromium 内核浏览器。
- **资源内联式组织**：所有脚本、样式、图标都直接放在仓库根目录或 `icons/` 子目录中，由 `manifest.json` 通过相对路径引用，无需构建步骤或打包工具。
- **版本管理在 manifest**：扩展版本号位于 `manifest.json` 的 `version` 字段（当前为 `1.0.0`），而非通过 npm/go 等包的版本机制管理。

## 4. 约定与约束

- 新增功能时如需引入外部库，应遵循现有模式：将脚本放入仓库并更新 `manifest.json` 中的 `content_scripts` 或 `background.service_worker` 引用的脚本列表，而不是引入包管理器。
- 由于没有锁文件或 vendoring，不存在“依赖升级”流程；若未来引入第三方脚本，建议将其源码直接纳入仓库以保持零外部依赖的策略。
- 权限最小化约定体现在 `manifest.json` 的 `permissions` 和 `host_permissions` 中，仅声明了 `downloads`、`activeTab`、`scripting`、`storage` 及 `file:///*` 主机权限，符合本地 HTML 编辑场景的最小权限需求。

## 5. 置信度说明

本仓库是纯前端 Chrome 扩展，不包含任何第三方依赖管理机制。因此关于“依赖管理”的结论是：**该项目采用零外部依赖策略，所有“依赖”均为 Chrome 内置 API，通过 `manifest.json` 声明。**

confidence: "high"