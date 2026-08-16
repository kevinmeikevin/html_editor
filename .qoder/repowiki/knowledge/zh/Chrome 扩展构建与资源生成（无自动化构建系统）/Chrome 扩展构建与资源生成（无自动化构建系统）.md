---
kind: build_system
name: Chrome 扩展构建与资源生成（无自动化构建系统）
category: build_system
scope:
    - '**'
source_files:
    - manifest.json
    - generate-icons.ps1
    - icons/icon16.png
    - icons/icon48.png
    - icons/icon128.png
---

## 1. 使用的系统/方法

该项目是一个基于 Manifest V3 的 Chrome 扩展，**没有传统的编译型构建系统**（无 Makefile、build.sh、Dockerfile、webpack/vite 等）。扩展由纯静态文件组成：JavaScript、CSS、HTML 和 PNG 图标，直接打包为 zip 或加载到 Chrome 开发者模式即可安装。唯一的“构建”环节是图标资源的生成。

## 2. 关键文件

- `manifest.json`：扩展清单，声明 manifest_version=3、权限（downloads、activeTab、scripting、storage）、background service_worker、action popup、content_scripts 匹配 `file:///*`、以及 icons 路径映射。版本号硬编码为 `1.0.0`。
- `generate-icons.ps1`：PowerShell 脚本，使用 .NET `System.Drawing` 动态绘制蓝底白线代码符号，输出 16×16、48×48、128×128 三种尺寸的 PNG 到 `icons/` 目录。脚本中硬编码了输出路径 `d:\projects\html_editor\icons`，仅适用于该仓库路径。
- `icons/icon16.png`、`icons/icon48.png`、`icons/icon128.png`：预生成的图标资源，被 manifest.json 的 action.default_icon 和 top-level icons 引用。
- `background.js`、`content.js`、`popup.js`、`content.css`、`popup.css`、`popup.html`、`test.html`：扩展的全部源码，无需编译。

## 3. 架构与约定

- **零构建步骤**：所有 JS/CSS/HTML 均为明文文本，直接作为扩展源文件分发。开发流程即编辑 → 在 Chrome 中以“加载已解压的扩展程序”方式加载根目录。
- **资源生成脚本**：图标通过 PowerShell 脚本从矢量逻辑（线条坐标）重新生成位图，而非维护多份手工绘制的源图。但脚本依赖 Windows + .NET System.Drawing，不具备跨平台能力。
- **版本管理**：版本号仅在 `manifest.json` 中单点声明（`"version": "1.0.0"`），没有其他脚本同步版本号，发布时需手动更新。
- **内容脚本注入**：通过 manifest 的 `content_scripts.matches: ["file:///*"]` 将 `content.js` 和 `content.css` 注入本地 HTML 页面，运行时机为 `document_idle`。

## 4. 约定与约束

- **无 CI/CD**：仓库中不存在 `.github/workflows`、`.gitlab-ci.yml`、Jenkinsfile 或其他持续集成配置。
- **无包管理器/依赖**：项目不引入 npm/yarn/pip 等依赖，全部功能由浏览器 API 提供。
- **图标生成约束**：`generate-icons.ps1` 中的输出目录硬编码为 `d:\projects\html_editor\icons`，若迁移到其他路径需先修改脚本；且该脚本只能在 Windows 上运行（依赖 .NET System.Drawing）。
- **Manifest V3 强制要求**：background 必须使用 `service_worker` 字段（而非旧版 `scripts`），content_scripts 必须显式声明匹配规则。
- **本地文件访问权限**：通过 `host_permissions: ["file:///*"]` 显式声明对本地文件的访问，这是 Manifest V3 下访问 file:// 页面的必要配置。

总体而言，该项目的“构建系统”本质上就是**直接分发源码 + 一个可选的图标生成脚本**，没有任何自动化打包、压缩、校验或发布流水线。