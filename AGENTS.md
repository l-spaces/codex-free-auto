# Repository Guidelines

## AI 协作语言与执行入口

- 默认使用中文沟通。
- 当用户提出开发任务时，先执行以下流程，再开始改代码：
  1. 用一句话复述原始需求。
  2. 输出“优化后的提示词”（不扩需求、可执行、保留原意；必要方法和属性字段补中文注释）。
  3. 询问是否执行，只有用户回复 `1` 或 `是` 才进入实现。

## 项目结构与模块职责

本项目是 Chrome Manifest V3 扩展，源码由 `manifest.json` 直接加载，无打包步骤。

- `background.js`：Service Worker 入口，负责流程编排、状态机、消息路由、自动运行调度与日志落盘。
- `background/`：后台能力模块与步骤实现（如 `message-router.js`、`auto-run-controller.js`、`verification-flow.js`、`steps/*.js`）。
- `content/`：页面内容脚本与页面自动化动作（注册页、OAuth 页、邮箱页、平台页）。
- `sidepanel/`：侧边栏 UI 与配置管理（账号池、运行记录、自动运行配置）。
- `shared/`：跨上下文共享注册表（如 flow capability/source registry）。
- `data/`：静态数据与流程定义（`step-definitions.js`、地址源等）。
- `utils/`：通用工具模块（已从仓库根目录迁移），包含邮件服务与别名/Provider 归一化逻辑：
  - `managed-alias-utils.js`
  - `mail2925-utils.js`
  - `hotmail-utils.js`
  - `microsoft-email.js`
  - `luckmail-utils.js`
  - `cloudflare-temp-email-utils.js`
  - `cloudmail-utils.js`
  - `yyds-mail-utils.js`
  - `icloud-utils.js`
  - `mail-provider-utils.js`
- `flows/`：流程规则（如 `flows/openai/mail-rules.js`）。
- `scripts/`：辅助脚本（如 `hotmail_helper.py`）。
- `tests/`：Node 测试集合，命名为 `*.test.js`。

## 运行关键路径（当前代码）

1. `manifest.json` 注册 `background.service_worker = background.js` 与 `side_panel.default_path = sidepanel/sidepanel.html`。
2. `background.js` 通过 `importScripts(...)` 加载 `shared/*`、`background/*`、`background/steps/*`、`utils/*`。
3. `content_scripts` 注入注册页、OAuth 页、邮箱页脚本，向后台发送 `NODE_COMPLETE/NODE_ERROR/LOG` 等消息。
4. `background/message-router.js` 处理步骤结果，写入状态、驱动下一步、广播侧边栏数据。
5. `sidepanel/sidepanel.js` 与后台通信，展示步骤状态、日志、账号记录并触发手动/自动执行。

## 开发与测试命令

- 全量测试：`npm test`（实际执行 `node --test tests/*.test.js`）。
- 单测聚焦：`node --test tests/<file>.test.js`。
- 本地运行：在 `chrome://extensions/` 打开开发者模式并加载仓库根目录；改动后点击“重新加载”。

## 代码风格与命名约定

- JavaScript：2 空格缩进、单引号、保留分号、`camelCase` 命名。
- Node 可测模块优先 CommonJS 导出；浏览器上下文沿用当前 IIFE/全局挂载模式。
- 文件命名使用 kebab-case（例如 `background-mail2925-session-module.test.js`）。
- 新增逻辑优先抽成纯函数，便于在 `tests/` 做行为级验证。
- 不要引入构建链或大型重构脚本，保持“源码直载”模型。

## 步骤状态与字段语义（AI/开发必遵守）

### 字段定义

- `status`：步骤执行状态。
  - `passed`：仅用于“步骤语义成功”的表达（面向文案/协议时）。
  - `failed`：步骤失败，需给出可排障原因。
  - `skipped`：按条件跳过，不代表失败，也不代表执行通过。
  - 代码内部节点状态常见值还包括：`pending`、`running`、`completed`、`manual_completed`、`stopped`。
- `step`：当前流程步骤编号（例如 1-11），用于日志定位和路由关联。
- `reason`：状态变更原因，要求可定位（触发条件、页面状态、错误关键词）。

### 使用边界

- 当步骤“未执行且符合跳过条件”时，必须写 `skipped`，不能写 `passed/completed`。
- Step 9（`post-login-phone-verification`）若未进入手机号验证页，应标记为 `skipped` 并进入下一步；不得显示“通过”。
- Step 8/Step 3 若页面直接跳转导致当前步骤无需执行，也应统一标记 `skipped`，保持 UI 与自动运行语义一致。
- 自动运行统计中，`skipped` 不计为失败；失败统计只由 `failed`（或映射后的节点失败态）驱动。

## 测试策略

- 每次改动至少覆盖以下之一：
  - 对应模块单测（优先）。
  - 或全量 `npm test`。
- 涉及步骤状态流转（特别是 3/8/9/10）时，必须补或更新状态流转测试。
- 涉及路径迁移/模块重组时，必须检查：
  - `background.js` 的 `importScripts` 路径；
  - `sidepanel/sidepanel.html` 的 `<script src>` 路径；
  - `tests/` 中 `require(...)` 与 fixture 路径。

## 提交与 PR 规范

- Commit 信息可用中文或 Conventional Commit（如 `fix:`、`chore:`），要求“短、准、可追溯”。
- PR 说明至少包含：
  - 影响流程（哪些步骤/模块）。
  - 验证命令与结果。
  - UI 变更截图/录屏（若改动 sidepanel 或页面交互）。
- 不要把无关重构与功能修复混在同一个提交中。

## 安全与配置注意事项

- 禁止提交本地敏感信息：`config.json`、OAuth token、账号导出数据、运行时缓存。
- 保持以下忽略项有效：`.runtime/`、`node_modules/`、`data/account-run-history.*`、`_metadata/`、`.ai/`、`.playwright-mcp/` 等。
- 仅在合法、授权环境中使用自动化能力，遵守目标平台与邮箱服务条款。
