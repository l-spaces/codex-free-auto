# 🔥 Codex Free 注册机

> 基于 FlowPilot 二次开发的纯 GPT Free 号抽奖注册机。删除不必要功能并优化性能。平均注册授权时间约 80 秒一个。本项目不保证 100% 成功率根据域名不同而不同。平均成功率约 10%。授权成功及时使用，避免被封禁。

✨ Codex Free 注册机是一个 Chrome Manifest V3 侧边栏扩展，用于自动注册 GPT 账号，并将账号授权到 Codex 相关平台。项目源码由 `manifest.json` 直接加载，没有打包步骤。

扩展的核心职责是把浏览器页面、邮箱验证码、平台后台和本地辅助服务串成可单步执行、可自动重试的工作流。请仅在你有权限管理的账号、邮箱和平台环境中使用，并遵守相关服务条款。

### 免费域名获取

- [DigitalPlat 免费域名](https://dash.domain.digitalplat.org/signup?ref=5Y5z6H7Jy5)
- [dnshe 免费域名](https://my.dnshe.com/aff.php?aff=153577)


## 📚 目录

- [🔥 Codex Free 注册机](#-codex-free-注册机)
    - [免费域名获取](#免费域名获取)
  - [📚 目录](#-目录)
  - [✨ 功能概览](#-功能概览)
  - [⚠️ 使用边界](#️-使用边界)
  - [🚀 快速开始](#-快速开始)
    - [环境要求](#环境要求)
    - [安装扩展](#安装扩展)
    - [本地开发](#本地开发)
  - [🧭 执行流程](#-执行流程)
  - [🔗 平台来源](#-平台来源)
  - [📮 邮箱与验证码](#-邮箱与验证码)
    - [邮箱服务](#邮箱服务)
    - [邮箱生成](#邮箱生成)
  - [⚙️ 自动运行配置](#️-自动运行配置)
  - [🧰 Hotmail 本地助手](#-hotmail-本地助手)
  - [🗂️ 项目结构](#️-项目结构)
  - [🧪 开发说明](#-开发说明)
  - [🛠️ 调试建议](#️-调试建议)
  - [🔐 安全与本地数据](#-安全与本地数据)
  - [🙏 来源与致谢](#-来源与致谢)
  - [📄 许可证](#-许可证)

<a id="功能概览"></a>

## ✨ 功能概览

- **流程编排：** 支持 `全流程`、`注册GPT`、`授权Codex` 3 种执行范围。
- **平台来源：** 支持 `CPA 面板`、`SUB2API`、`Codex2API`。
- **邮箱收码：** 支持 Hotmail、LuckMail、GPTMail、YYDS Mail、iCloud、2925、Gmail、Cloudflare Temp Email、Cloud Mail、QQ、163、126、Inbucket 和自定义邮箱。
- **邮箱生成：** 支持 Gmail +tag、DuckDuckGo、自定义邮箱池、Cloudflare 域名随机邮箱、iCloud 隐私邮箱、Cloudflare Temp Email 和 Cloud Mail。
- **自动运行：** 支持多轮执行、延迟启动、步间间隔、线程间隔、自动重试、暂停等待邮箱和手动继续。
- **状态与记录：** 支持步骤状态、运行日志、账号运行记录、配置导入导出，以及本地 helper 账号记录同步。
- **恢复能力：** 覆盖认证重试页、验证码页状态确认、OAuth 总超时、Cloudflare 风控提示、手机号验证拦截等场景。

<a id="使用边界"></a>

## ⚠️ 使用边界

- 本项目依赖第三方页面 DOM、邮箱服务登录态和平台后台接口；相关页面结构或接口变化时，需要同步维护 content script、Provider 或平台适配逻辑。
- 旧版网页邮箱链路（QQ / 163 / 126）已在侧边栏标注为老旧链路，建议优先使用账号池或 API 型邮箱服务。
- `授权Codex` 模式需要先导入账号邮箱 JSON；`注册GPT` 模式只执行步骤 1 到 6，不会提交平台授权回调。

<a id="快速开始"></a>

## 🚀 快速开始

### 环境要求

- Chrome 浏览器，并开启扩展开发者模式。
- Node.js 18+，建议 20+，用于运行 `node --test` 测试。
- Python 3.10+，仅在使用 Hotmail 本地助手时需要。
- 至少一种可用的验证码接收方式。

### 安装扩展

1. 打开 `chrome://extensions/`。
2. 开启「开发者模式」。
3. 点击「加载已解压的扩展程序」。
4. 选择本仓库根目录。
5. 打开扩展侧边栏，填写平台来源、邮箱服务和账号相关配置。

### 本地开发

项目没有构建命令。修改源文件后，在 `chrome://extensions/` 中重新加载扩展即可。

运行全部 JavaScript 测试：

```bash
npm test  # 运行全部测试（node --test tests/*.test.js）
```

运行单个测试文件：

```bash
node --test tests/activation-utils.test.js  # 运行 activation-utils 相关测试
```

<a id="执行流程"></a>

## 🧭 执行流程

工作流定义在 `data/step-definitions.js`，当前默认 flow 为 `openai`，固定使用邮箱注册。

| 步骤 | 节点 | 页面 / 驱动 | 说明 |
| --- | --- | --- | --- |
| 1 | `open-chatgpt` | `chatgpt` | 打开 ChatGPT 官网入口。 |
| 2 | `submit-signup-email` | `content/signup-page` | 进入注册流程并提交注册邮箱。 |
| 3 | `fill-password` | `content/signup-page` | 填写自定义密码或自动生成密码。 |
| 4 | `fetch-signup-code` | 邮箱 Provider + `content/signup-page` | 获取并提交注册验证码。 |
| 5 | `fill-profile` | `content/signup-page` | 填写姓名、生日或年龄。 |
| 6 | `wait-registration-success` | `chatgpt` | 等待注册成功，并按配置处理授权前 Cookies。 |
| 7 | `oauth-login` | `content/signup-page` | 刷新 OAuth 链接并登录账号。 |
| 8 | `fetch-login-code` | 邮箱 Provider + `content/signup-page` | 获取并提交登录验证码。 |
| 9 | `post-login-phone-verification` | `content/signup-page` | 检测手机号验证 / add-phone 状态。 |
| 10 | `confirm-oauth` | `content/signup-page` | 自动确认 OAuth，并捕获 localhost 回调。 |
| 11 | `platform-verify` | `content/platform-panel` | 将回调提交到 CPA / SUB2API / Codex2API。 |

侧边栏 `执行流程` 会限制自动运行范围：

| 执行流程 | 范围 | 典型用途 |
| --- | --- | --- |
| `全流程` | 步骤 1 到 11 | 从注册到 Codex 授权完整跑通。 |
| `注册GPT` | 步骤 1 到 6 | 只批量注册 ChatGPT 账号。 |
| `授权Codex` | 步骤 7 到 11 | 对导入账号执行 OAuth 授权。 |

<a id="平台来源"></a>

## 🔗 平台来源

侧边栏 `来源` 支持 3 种平台模式：

| 来源 | 关键配置 | 说明 |
| --- | --- | --- |
| `CPA 面板` | `CPA`、`管理密钥`、`回调方式` | 使用 CPA 管理面板生成 OAuth 链接并提交回调。 |
| `SUB2API` | `SUB2API`、`账号`、`密码`、`分组`、`优先级`、`默认代理` | 登录 SUB2API 后台，生成 OAuth 链接并创建账号。 |
| `Codex2API` | `Codex2API`、`管理密钥` | 通过 Codex2API 管理接口生成授权链接并交换回调 code。 |

常用字段说明：

| 字段 | 说明 |
| --- | --- |
| `CPA` | CPA OAuth 页面地址，例如 `http://ip:port/management.html#/oauth`。 |
| `管理密钥` | CPA 或 Codex2API 的管理员密钥。 |
| `回调方式` | `服务器部署` 会提交平台回调；`本地部署` 可在本地 CPA 且已有 callback 时跳过提交。 |
| `分组` | SUB2API 目标分组，默认值为 `codex`。 |
| `默认代理` | SUB2API 代理名称或代理 ID；留空表示不传代理。 |
| `优先级` | SUB2API 创建账号时使用的账号优先级，要求为大于等于 1 的整数。 |

<a id="邮箱与验证码"></a>

## 📮 邮箱与验证码

### 邮箱服务

| 邮箱服务 | 用途 |
| --- | --- |
| `自定义邮箱` | 手动填写注册邮箱；可维护自定义号池，第 4 / 8 步由人工处理验证码。 |
| `Hotmail（账号池）` | 使用邮箱、Client ID、Refresh Token 收码，支持 API 对接和本地助手。 |
| `LuckMail（API 购邮）` | 通过 LuckMail API 购买或复用 `openai` 项目邮箱。 |
| `iCloud 邮箱` | 使用 iCloud Hide My Email 别名，可查 iCloud 收件箱或转发到其他邮箱。 |
| `Gmail 邮箱` | 使用 Gmail 原邮箱生成 +tag 别名。 |
| `Cloud Mail` | 对接 skymail.ink API，用于生成邮箱或接收转发邮件。 |
| `QQ / 163 / 163 VIP / 126` | 通过网页邮箱轮询验证码；界面标注为老旧链路，需要自行维护可用性。 |
| `Inbucket` | 读取自定义 Inbucket 主机下的 mailbox。 |
| `2925 邮箱` | 支持提供邮箱和接收邮箱两种模式，并支持 2925 账号池。 |
| `Cloudflare Temp Email` | 用于生成临时邮箱或接收转发邮件。（自建） |
| `GPTMail` | 通过 GPTMail API 自动生成邮箱并轮询验证码。（免费） |
| `YYDS Mail` | 通过 YYDS Mail API 创建临时邮箱并收码。（免费） |

### 邮箱生成

| 生成方式 | 说明 |
| --- | --- |
| `Gmail +tag` | 基于 Gmail 原邮箱生成 `name+tag@gmail.com`。 |
| `DuckDuckGo` | 通过 DuckDuckGo Email Protection 获取地址。 |
| `自定义邮箱池` | 按行导入邮箱，多轮运行时按顺序分配。 |
| `Cloudflare` | 基于配置的 `CF 域名` 生成随机前缀邮箱；转发规则需要自行在 Cloudflare 配好。 |
| `iCloud 隐私邮箱` | 使用 iCloud Hide My Email 别名。 |
| `Cloudflare Temp Email` | 通过 Cloudflare Temp Email 服务生成或查询邮箱。 |
| `Cloud Mail` | 通过 Cloud Mail 服务生成邮箱或查询转发收件箱。 |

部分邮箱服务会锁定生成方式。例如 Hotmail、LuckMail、GPTMail、YYDS Mail 会直接使用自身分配的邮箱；Gmail 会使用 Gmail +tag；2925 在「提供邮箱」模式下使用别名基邮箱。

<a id="自动运行配置"></a>

## ⚙️ 自动运行配置

| 字段 | 说明 |
| --- | --- |
| `运行次数` | 自动执行轮数。启用自定义邮箱池或自定义号池时，会按可用邮箱数量锁定。 |
| `延迟执行` | 自动运行启动前等待的分钟数，`0` 表示立即执行。 |
| `授权前清 Cookies` | 在授权阶段前清理 ChatGPT / OpenAI 相关 Cookies。 |
| `操作间延迟` | 默认开启。页面输入、选择、点击、提交、继续等操作会按类型等待约 0.3 到 2 秒；分格 OTP / 验证码会先整组填完，再等待一次。该开关不影响邮箱、短信或其他轮询、后台 API、网络重试、后台定时器、存储持久化，也不影响 `confirm-oauth` 和 `platform-verify` 的交互节奏。 |
| `自动重试` | 当前轮失败后先重试同一轮，达到上限后再进入下一轮或停止。 |
| `步间间隔` | 自动运行每个步骤开始前额外等待的秒数，`0` 或留空表示不额外等待。 |
| `授权总超` | 控制 OAuth 授权链总预算；关闭后仍保留页面等待、点击和回调等局部超时。 |
| `线程间隔` | 自动重试模式下，不同轮次或重试尝试之间的等待分钟数。 |

<a id="hotmail-本地助手"></a>

## 🧰 Hotmail 本地助手

Hotmail 本地助手位于 `scripts/hotmail_helper.py`，默认监听 `http://127.0.0.1:17373`，用于本机读取 Outlook / Hotmail 邮箱并同步账号运行记录。

Windows：

```powershell
.\start-hotmail-helper.bat  # 启动 Hotmail 本地助手
```

macOS / Linux：

```bash
chmod +x ./start-hotmail-helper.command  # 添加可执行权限
./start-hotmail-helper.command           # 启动 Hotmail 本地助手
```

也可以直接运行脚本：

```bash
python scripts/hotmail_helper.py  # 直接启动 helper
```

启动成功后会看到：

```text
Hotmail helper listening on http://127.0.0.1:17373
```

helper 会写入以下本地运行文件，这些文件已在 `.gitignore` 中排除：

- `data/account-run-history.txt`
- `data/account-run-history.json`

<a id="项目结构"></a>

## 🗂️ 项目结构

```text
manifest.json                  Chrome MV3 扩展清单
background.js                  Service Worker 入口，负责导入后台模块
background/                    后台状态、消息路由、自动运行、邮箱 Provider、步骤编排
background/steps/              11 个工作流节点的后台执行模块
content/                       注入 OpenAI、网页邮箱和平台页面的 content script；部分 Provider 由后台动态注入或 API 轮询
sidepanel/                     侧边栏 UI、配置管理、账号池、运行记录面板
shared/                        flow 能力、来源注册表等跨上下文模块
flows/openai/                  OpenAI 验证码邮件规则
data/                          步骤定义、姓名和地址等静态数据
scripts/                       Hotmail 本地助手和 Chrome 调试启动脚本
tests/                         Node.js 测试，以及少量 Python helper 测试
icons/                         扩展图标
rules.json                     iCloud 相关 declarativeNetRequest 规则
```

<a id="开发说明"></a>

## 🧪 开发说明

- 代码风格以现有 JavaScript 为准：2 空格缩进、分号、单引号、CommonJS / IIFE 混合模块模式。
- 浏览器扩展源码直接加载，无 bundler。新增文件需要确认 `manifest.json`、`importScripts` 或动态注入逻辑是否接入。
- Node 可测试逻辑优先抽成纯函数或模块，测试放在 `tests/*.test.js`。
- 侧边栏变更需要关注 `sidepanel/sidepanel.html`、`sidepanel/sidepanel.css`、`sidepanel/sidepanel.js` 以及对应 manager 模块。
- 后台流程变更需要同步检查 `data/step-definitions.js`、`background/workflow-engine.js`、`background/message-router.js` 和 `background/steps/`。
- README 中的 `操作间延迟` 文案由 `tests/operation-delay-docs.test.js` 覆盖；修改相关说明时，需要保留默认开启、等待时长、验证码、轮询和 `confirm-oauth` / `platform-verify` 的语义。

<a id="调试建议"></a>

## 🛠️ 调试建议

- 扩展侧边栏日志区用于查看流程进度、失败原因和自动运行汇总。
- Chrome 扩展详情页可打开 Service Worker 控制台，排查后台状态、消息路由和网络请求。
- 目标页面控制台可查看 content script 日志。
- 页面 DOM 变化时，优先检查对应 content script 的选择器和状态检测逻辑。
- 邮件迟迟不到时，优先检查邮箱服务登录态、转发规则、验证码时间窗口和收件箱过滤条件。
- OAuth 授权异常时，重点检查 localhost callback 是否包含 `code` 和 `state`，以及平台来源是否仍处于可验证状态。

<a id="安全与本地数据"></a>

## 🔐 安全与本地数据

- 扩展申请了 `debugger`、`cookies`、`browsingData`、`tabs`、`webNavigation`、`storage`、`scripting`、`activeTab` 和 `<all_urls>` 等权限，加载前请确认使用环境可信。
- 不要提交邮箱令牌、OAuth refresh token、账号历史、导出的配置文件或 `config.json`。
- Hotmail / 2925 / LuckMail 等账号池通常包含邮箱凭证或接口令牌；导出配置、截图或共享日志前需要先确认是否脱敏。
- `.gitignore` 已排除 `.runtime/`、`node_modules/`、`data/account-run-history.*`、`config.json`、`.playwright-mcp/` 等本地文件。
- 运行时状态主要保存在 `chrome.storage.session`，持久配置主要保存在 `chrome.storage.local`。
- `Duck Auth` 属于本机敏感配置，导出配置时会按当前实现排除。

<a id="来源与致谢"></a>

## 🙏 来源与致谢

本项目基于 [QLHazyCoder/FlowPilot](https://github.com/QLHazyCoder/FlowPilot) 进行二次开发，当前定位为纯 GPT Free 号抽奖注册机。

感谢 QLHazyCoder 及 FlowPilot 项目贡献者的开源工作与持续维护。

<a id="许可证"></a>

## 📄 许可证

[MIT](LICENSE)
