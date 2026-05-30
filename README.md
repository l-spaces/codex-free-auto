# FlowPilot

`FlowPilot` 是一个 Chrome 侧边栏扩展，用来批量处理 ChatGPT / OpenAI 账号注册、授权、Plus 支付和平台接入流程。

它的定位不是“单个按钮脚本”，而是把注册、验证码、OAuth、Plus 支付、账号导入、自动重试和记录管理放进同一套可持续使用的工具里。

## 插件效果

一百五十个号，一个 401：

<div align="center">

# 交流群请进官网查看

### <a href="https://flowpilot.qlhazycoder.top/" target="_blank" rel="noreferrer">点击进入官网查看最新地址与交流群入口</a>

**最新地址、交流群入口、最新通知，统一以官网为准。**

</div>

## Star History

<a href="https://www.star-history.com/?repos=QLHazyCoder%2FFlowPilot&type=timeline&logscale&legend=top-left">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=QLHazyCoder/FlowPilot&type=timeline&logscale&theme=dark&legend=top-left" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=QLHazyCoder/FlowPilot&type=timeline&logscale&legend=top-left" />
    <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=QLHazyCoder/FlowPilot&type=timeline&logscale&legend=top-left" />
  </picture>
</a>

## 主要功能

- 支持普通注册授权链路，既可以单步执行，也可以整套 `Auto` 执行。
- 支持 Plus 模式，覆盖 `PayPal`、`GoPay`、`GPC` 三种支付链路。
- 支持 `账号接入策略`，可以在 Plus 模式下按来源选择继续走 `OAuth`，或直接导入当前 ChatGPT 已登录会话。
- 支持 `CPA`、`SUB2API`、`Codex2API` 三种 OpenAI 来源。
- 支持邮箱注册、验证码收取、登录验证码处理、OAuth 同意页确认和平台侧账号创建。
- 支持 `Hotmail`、`2925`、`QQ Mail`、`163 Mail`、`163 VIP Mail`、`126 Mail`、`Inbucket`、`Cloud Mail`、`YYDS Mail`、`iCloud` 等收码方式。
- 支持 `DuckDuckGo`、`Cloudflare`、`自定义邮箱池`、`自定义邮箱服务号池`、`Gmail / 2925 别名邮箱` 等注册邮箱生成方式。
- 支持接码平台、手机号验证、自动重试、执行范围限制、贡献模式和账号记录面板。
- 支持 `Stop`、暂停后继续、失败后重试，以及本地 helper 快照同步。

## 支持的来源

- `CPA`
  用于普通 OAuth 接入，也支持在 Plus 模式下直接导入当前 ChatGPT 会话到 CPA。

- `SUB2API`
  用于普通 OAuth 接入，也支持在 Plus 模式下直接导入当前 ChatGPT 会话到 SUB2API。

- `Codex2API`
  当前保持 OAuth 接入，不支持 Plus 会话直导。

## Plus 模式

- Plus 模式下，侧边栏会先显示 `账号接入策略`，再显示 `Plus 支付`。
- `账号接入策略` 只选择接入方式：`OAuth` 或 `使用会话 JSON 导入`；会话导入的目标由上方 `来源` 自动决定，`Codex2API` 当前仅支持 `OAuth`。
- Plus 模式下的步骤不是固定一套，系统会按支付方式和账号接入策略动态切换尾链。
- Plus 模式当前只支持邮箱注册，不支持手机号注册。

## 自动化能力

- 支持手动单步执行、自动整套执行、手动跳过、失败重试和中途停止。
- 支持在同一轮里保留账号身份，自动把邮箱、手机号、注册邮箱状态和平台回调状态串起来。
- 支持“记录”面板查看成功、失败、停止、重试次数，以及同一轮的邮箱/手机号组合身份。
- 支持把账号记录同步到本地 helper，方便直接查看 `data/account-run-history.json`。

## 邮箱与验证码能力

- 支持网页邮箱轮询、API 邮箱轮询和本地 helper 读取三类模式。
- 支持注册验证码、登录验证码、绑定邮箱验证码，以及 Plus / GPC 场景下的 OTP 处理。
- `2925` 支持多账号池、自动登录、自动切号、24 小时冷却。
- `Hotmail` 支持远程服务模式和本地 helper 模式。
- `自定义邮箱池` 和 `自定义邮箱服务号池` 都可以和自动运行轮数联动。

## 快速开始

1. 在 `chrome://extensions/` 打开开发者模式。
2. 点击“加载已解压的扩展程序”，选择本项目目录。
3. 打开扩展侧边栏，先选择当前要跑的 `flow` 和 `来源`。
4. 按你的使用方式配置邮箱、验证码来源、Plus 支付或平台参数。
5. 先手动跑通前几步，再使用 `Auto` 跑完整链路。

## 操作间延迟

- `操作间延迟` 默认开启，默认值是 `2 秒`。
- 它主要作用于页面里的点击、输入和短等待节奏，让操作更稳一些。
- 它不影响邮箱验证码轮询、短信验证码轮询、OTP 轮询，也不改变 `confirm-oauth` 和 `platform-verify` 这类后台步骤的执行节奏。

## 文档入口

- [项目文件结构说明.md](./项目文件结构说明.md)
- [项目完整链路说明.md](./项目完整链路说明.md)
- [项目开发规范（AI协作）.md](./项目开发规范（AI协作）.md)

如果你只想知道“这个扩展能做什么、该怎么开用”，看本 README 就够了。

如果你要继续开发、补链路、加步骤或排查运行态，请再看上面的两份技术文档。
