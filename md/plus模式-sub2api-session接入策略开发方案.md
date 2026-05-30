# Plus 模式 SUB2API Session 接入策略开发方案

## 1. 文档定位

本文档只做完整开发设计，不修改功能代码。

本文档中的“开发阶段”仅表示**实施顺序和每阶段自检顺序**，不是产品分期，不表示“先做一半、后面再补”。

本方案的目标是把 `OpenAI flow + Plus 模式 + SUB2API` 的账号接入方式，从当前固定的 OAuth 尾链，扩展为一个正式的“账号接入策略”能力，并且一次性把相关联的 UI、步骤、后台状态、自动运行、测试、自检边界全部设计完整。

## 2. 分析基线

### 2.1 当前分析基线

- `codex注册扩展` 当前工作树与本地 `dev` 指向同一提交 `4aa459e`，本地 `dev` 比 `origin/dev` 还新 8 个提交，因此本次分析不需要先回退或切换到远端 `origin/dev`
- `sub2api` 已在本次分析前同步到远端最新 `main`，当前基线为 `1d78dde8`
- `GPTSession2CPAandSub2API` 已本地拉取，用于分析“session 导入类逻辑”的取精华方向，而不是复制其代码

### 2.2 已完整阅读的关联代码范围

主仓库 `codex注册扩展` 已重点阅读：

- `data/step-definitions.js`
- `core/flow-kernel/flow-capabilities.js`
- `core/flow-kernel/flow-registry.js`
- `core/flow-kernel/settings-schema.js`
- `sidepanel/sidepanel.html`
- `sidepanel/sidepanel.js`
- `background.js`
- `core/flow-kernel/runtime-state.js`
- `background/message-router.js`
- `background/panel-bridge.js`
- `background/sub2api-api.js`
- `flows/openai/background/steps/platform-verify.js`
- `flows/openai/background/steps/create-plus-checkout.js`
- `flows/openai/background/steps/fill-plus-checkout.js`
- `flows/openai/background/steps/plus-return-confirm.js`
- `flows/openai/content/plus-checkout.js`
- `tests/step-definitions-module.test.js`
- `tests/sidepanel-plus-payment-method.test.js`
- `tests/flow-capabilities-module.test.js`
- `tests/background-settings-schema-persistence.test.js`
- `tests/background-account-history-settings.test.js`
- `tests/background-message-router-module.test.js`
- `tests/background-message-router-plus-final-step.test.js`
- `tests/background-auth-chain-guard.test.js`
- `tests/auto-run-step6-restart.test.js`

接入端 `sub2api` 已重点阅读：

- `backend/internal/server/routes/admin.go`
- `backend/internal/handler/admin/account_codex_import.go`
- `frontend/src/api/admin/accounts.ts`

参考项目 `GPTSession2CPAandSub2API` 已重点阅读：

- `README.md`

## 3. 需求校准与硬边界

本方案按以下真实需求设计，不能偏离：

1. 这不是新增一个独立 flow，而是 **OpenAI flow 的 Plus 模式下，替换账号接入尾链策略**
2. Plus 流程不是固定步骤号流程，必须按**动态步骤定义**设计，不能写死“第几步一定是什么”
3. Plus 模式不能走手机号注册，本方案只围绕 **Plus + 邮箱注册 + sub2api** 设计，不再扩展任何手机号分支
4. 新功能名按你的要求设计成 **Plus 模式下的“账号接入策略”**
5. 当前只允许 `sub2api` 真正切换到 session 导入策略；`cpa / codex2api` 在 Plus 下仍固定走 OAuth，UI 上直接禁用策略切换
6. 这里说的“使用拉下来的项目逻辑”，是**借用其 session 导入思路和行为结论**，不是把外部项目代码复制进来
7. 必须走 `sub2api` 自己的账号导入逻辑，即调用其原生 `import/codex-session`，而不是扩展自己再手写一套 token 转换器
8. 方案必须把和本功能无关、但逻辑有关联的地方一并覆盖，例如：
   - 动态步骤切换
   - 设置持久化与导入导出
   - 自动运行重开
   - 最终成功节点判定
   - 固定 OAuth 文案
   - runtime 清理
   - 测试基线

## 4. 当前真实实现现状

### 4.1 Plus 步骤是动态生成的，不是固定步号

`data/step-definitions.js` 当前会根据以下条件动态生成 OpenAI 步骤集合：

- `plusModeEnabled`
- `plusPaymentMethod`
- `signupMethod`
- `phoneSignupReloginAfterBindEmailEnabled`

当前 Plus 邮箱链路的尾部不是单个“平台验证”，而是一段完整 OAuth 尾链：

- `oauth-login`
- `fetch-login-code`
- `post-login-phone-verification`
- `confirm-oauth`
- `platform-verify`

不同 Plus 支付方式的接入锚点也不同：

- PayPal：接在 `plus-checkout-return` 后
- GoPay：接在 `gopay-subscription-confirm` 后
- GPC：接在 `plus-checkout-billing` 后

因此本次改造不能说“替换第 10 步”，必须说：

- **替换 Plus 动态步骤集合中的 OAuth 尾链插槽**

### 4.2 Plus 模式当前不允许手机号注册

现有能力注册表和侧栏逻辑已经明确限制：

- Plus 开启时，手机号注册不可选
- 如果当前选中手机号，再开 Plus，会被切回邮箱注册

所以本方案不再设计任何：

- Plus 手机号注册
- Plus 手机绑定后再改邮箱
- Plus 手机验证码尾链兼容

### 4.3 当前 SUB2API 主链路是 OAuth，不是 session 导入

当前 SUB2API Plus 尾链的真实做法是：

1. 通过 `background/panel-bridge.js` 请求 `background/sub2api-api.js` 生成 OAuth URL
2. 保存 `oauthUrl / sub2apiSessionId / sub2apiOAuthState`
3. 页面完成 OAuth 回调，拿到 `localhostUrl`
4. `flows/openai/background/steps/platform-verify.js` 调 `submitOpenAiCallback`
5. SUB2API 用 `exchange-code` 交换 OAuth code，再创建账号

这条链路是“完整 OAuth 账号创建”，不是导入现有 ChatGPT Web session。

### 4.4 扩展本身已经具备读取 ChatGPT session 的能力

当前项目并不是没有 session 能力，已有代码已经能在 ChatGPT 页面读取：

- `/api/auth/session`
- `session`
- `accessToken`

现成能力位置：

- `flows/openai/content/plus-checkout.js`
- `flows/openai/background/steps/create-plus-checkout.js`

这意味着新功能不需要再发明“如何拿 session”，只需要把这份能力接到 Plus 尾链上。

### 4.5 SUB2API 已原生支持 codex session 导入

`sub2api` 当前已原生提供：

- 路由：`POST /api/v1/admin/accounts/import/codex-session`
- 前端 API：`importCodexSession`

其导入逻辑当前已支持：

- 直接导入 raw `accessToken`
- 导入完整 session JSON
- 导入 JSON 数组
- 导入多行混合内容
- 自动从 JWT claims 补 `email / account_id / plan_type`
- 忽略 `sessionToken`
- 没有 `refresh_token` 时，按 access token 过期时间处理，并开启过期自动暂停
- 默认 `update_existing = true`，同身份账号会走“更新已有账号”语义，而不是强制重复创建

这说明本次扩展应该做的是：

- 读取当前 ChatGPT Web session
- 直接调用 `sub2api` 原生导入接口

而不是：

- 在扩展里复制外部项目的 JSON 转换代码
- 在扩展里伪造一套 OAuth 账号结构

### 4.6 外部参考项目给出的结论必须正视

`GPTSession2CPAandSub2API` 的核心结论很明确：

- ChatGPT Web session 通常没有真实 `refresh_token`
- 这类导入数据主要依赖 `access_token`
- `access_token` 过期后不能自动刷新

所以本方案必须明确接受一个事实：

- **Plus 下走 session 导入策略时，导入到 SUB2API 的将是“当前 Web session 账号”，不是“可长期自动刷新的 OAuth 完整账号”**

这不是缺陷描述，而是该策略的真实工作方式，必须在设计里被明确建模，而不是模糊带过。

## 5. 最终设计

## 5.1 功能命名与策略枚举

新功能统一命名为：

- `Plus 模式 -> 账号接入策略`

新增设置字段建议命名为：

- `plusAccountAccessStrategy`

枚举值建议固定为：

- `oauth`
- `sub2api_codex_session`

命名原则：

- `oauth` 保持通用
- `sub2api_codex_session` 明确说明这是 **SUB2API + Codex Session 导入**
- 不用泛化的 `session` 或 `import`，避免以后 CPA/Codex2API 也有 session 方案时语义冲突

默认值：

- `oauth`

## 5.2 请求值与生效值分离

这里不能简单把 `plusAccountAccessStrategy` 当成“永远立即生效值”，而应沿用现有 `signupMethod` 的思路，区分：

- **用户请求值**：持久化保存在设置中的选择
- **当前生效值**：根据 flow、target、plus 开关、注册方式实时归一化后的结果

最终规则：

1. 持久化字段只保存用户偏好值
2. 当 `activeFlowId !== openai` 时，生效值强制为 `oauth`
3. 当 `plusModeEnabled !== true` 时，生效值强制为 `oauth`
4. 当 `panelMode !== sub2api` 时，生效值强制为 `oauth`
5. 当 `signupMethod !== email` 时，生效值强制为 `oauth`
6. 只有同时满足：
   - `openai`
   - `plusModeEnabled = true`
   - `panelMode = sub2api`
   - `signupMethod = email`
   时，才允许 `sub2api_codex_session` 真正生效

这样设计的好处是：

- 切到 `cpa / codex2api` 时，不会把用户原来的 sub2api strategy 偏好永久覆盖掉
- 切回 `sub2api` 时，可以恢复原来的选择
- 运行时又不会真的拿着 session strategy 去跑不支持的目标

## 5.3 侧栏 UI 设计

### 5.3.1 位置

新 UI 放在 Plus 设置组内，紧跟在：

- `Plus 模式`
- `Plus 支付`

之后。

新增行建议：

- `row-plus-account-access-strategy`
- `select-plus-account-access-strategy`
- `plus-account-access-strategy-caption`

`core/flow-kernel/flow-registry.js` 的 `openai-plus` 设置组应扩展为同时包含：

- `row-plus-mode`
- `row-plus-payment-method`
- `row-plus-account-access-strategy`

### 5.3.2 展示与禁用规则

展示规则：

1. 只有 `supportsPlusMode = true` 时显示整组 Plus 控件
2. `plusModeEnabled = false` 时隐藏“支付方式”和“账号接入策略”两行
3. `plusModeEnabled = true` 且 `panelMode = sub2api` 时，策略选择器启用
4. `plusModeEnabled = true` 且 `panelMode = cpa / codex2api` 时，策略选择器显示但禁用，视觉值固定显示 `oauth`

文案建议：

- 标签：`账号接入策略`
- 选项 1：`OAuth`
- 选项 2：`导入当前 ChatGPT 会话到 SUB2API`

禁用态说明建议：

- `当前来源仅支持 OAuth`

`sub2api` 可用态说明建议：

- `复用当前 Plus 已登录会话，直接导入到 SUB2API，不再走 OAuth 回调`

### 5.3.3 不允许继续保留的 UI 文案问题

当前代码里有多处 Plus 相关文案写死了“第 10 步 OAuth 登录”或“继续 OAuth 登录”，这些在新策略下都会变错。

本次必须统一改为：

- 通过当前动态尾链的**下一节点标题**
- 或当前**账号接入策略标签**

生成文案，不能继续写死：

- `第 10 步`
- `OAuth 登录`

尤其要覆盖：

- Plus 手动确认弹窗
- GoPay/GPC 支付完成后的 toast
- Plus 模式切换日志

## 5.4 步骤与节点设计

### 5.4.1 不新增独立 flow，只替换 Plus 尾链

本方案不创建新 flow，不额外创建“Plus-Session flow”。

最终做法是：

- 在 `data/step-definitions.js` 中，为 Plus 动态步骤集合增加 `plusAccountAccessStrategy` 维度
- 当策略为 `oauth` 时，保留现有 OAuth 尾链
- 当策略为 `sub2api_codex_session` 时，用新的 session 导入尾节点替换整段 OAuth 尾链

### 5.4.2 新尾节点设计

建议新增单节点：

- `sub2api-session-import`

标题建议：

- `导入当前 ChatGPT 会话到 SUB2API`

这里刻意设计成**单节点**，而不是再拆成“读取 session”“上传 session”两个节点，原因是：

1. 当前 session 获取能力已经是内聚能力，不值得再拆成一个对外步骤
2. 该尾链不再需要 OAuth 多步状态机
3. 节点越多，自动运行重试、成功判定、模式切换、node status 重建越复杂
4. 单节点更符合“支付完成后直接接入账号”的实际语义

### 5.4.3 替换锚点

Session 导入策略生效时，替换锚点如下：

- PayPal：`plus-checkout-return` 后接 `sub2api-session-import`
- GoPay：`gopay-subscription-confirm` 后接 `sub2api-session-import`
- GPC：`plus-checkout-billing` 后接 `sub2api-session-import`

因此这次不是“替换 platform-verify”，而是：

- **按支付链路不同，替换整段 OAuth 尾链接入口**

### 5.4.4 Plus 下不再保留任何手机号 session 分支

即使代码层面未来仍存在 phone 相关动态定义，这次策略分支也必须硬性限制为：

- 只支持 `signupMethod = email`

如果后续状态异常导致 `plusModeEnabled = true` 且 `signupMethod = phone` 同时出现，也必须在步骤解析时回退到：

- `oauth`

不能让 session strategy 意外落到 phone 分支。

## 5.5 新节点执行逻辑

建议新增后台执行器文件：

- `flows/openai/background/steps/sub2api-session-import.js`

执行器职责：

1. 定位当前 Plus 会话页对应 tab
2. 确认当前 tab 已回到 ChatGPT / OpenAI 域名页面，且可访问 `/api/auth/session`
3. 通过现有 `flows/openai/content/plus-checkout.js` 能力读取：
   - `session`
   - `accessToken`
4. 用现有 `background/sub2api-api.js` 登录 SUB2API
5. 解析当前配置的：
   - 分组
   - 默认代理
   - 优先级
6. 调用 SUB2API 的 `import/codex-session`
7. 解析返回的 created/updated 结果
8. 用 `completeNodeFromBackground('sub2api-session-import', payload)` 收尾

### 5.5.1 Tab 选择原则

该节点不应新开 tab，而应复用当前 Plus 付款结束后已经存在的 tab。

候选顺序建议：

1. `plusCheckoutTabId`
2. `plus-return-confirm` 已解析到的返回 tab
3. 当前 `plus-checkout` source 绑定 tab

如果拿到的页面不在：

- `chatgpt.com`
- `chat.openai.com`
- `openai.com`

则直接失败，不进入导入。

### 5.5.2 Session 组装原则

扩展不要自己做外部项目那种“多平台 JSON 转换器”。

扩展只做最小组装：

1. 优先传完整 `session` JSON
2. 若 `session.accessToken` 为空，但独立读到了 `accessToken`，则把 `accessToken` 补回 session payload 再提交
3. 不伪造 `refresh_token`
4. 不把 `sessionToken` 当作 `refresh_token`
5. 不生成占位 `refresh_token`
6. 不构造伪 OAuth 交换结果

### 5.5.3 SUB2API 请求体设计

建议调用 `import/codex-session` 时传：

- `content`: 完整 session JSON 字符串
- `group_ids`: 由现有 group name 配置解析出的 group id 数组
- `proxy_id`: 由现有默认代理解析出的 proxy id
- `priority`: 复用当前 `sub2apiAccountPriority`
- `auto_pause_on_expired`: `true`

可以不新增任何新配置字段。

关于导入语义，本方案明确采用：

- **沿用 sub2api 原生导入逻辑**

也就是：

- 不强制改成“永远创建新账号”
- 接受 `update_existing` 默认值为 `true`

这意味着：

- 同身份账号重复跑流程时，SUB2API 更可能更新已有账号，而不是无限重复创建

这属于该策略的既定行为，不再在扩展里另造一套“重复创建模式”。

### 5.5.4 成功判定

单条 session 导入的成功判定建议统一为：

1. HTTP 成功
2. `failed = 0`
3. `created > 0` 或 `updated > 0`

日志层面建议区分：

- `created`：新建成功
- `updated`：更新已有账号成功
- `warnings`：照常记日志，但不判失败

### 5.5.5 关于 access token 生命周期

这里必须作为功能设计的一部分明确下来：

- `sub2api_codex_session` 策略导入的是当前 Web session
- 通常只有 `access_token`，没有真实 `refresh_token`
- 因此账号生命周期取决于当前 access token
- token 过期后，SUB2API 应按其原生逻辑自动暂停

扩展侧不做以下事情：

- 不假装它是完整 OAuth 账号
- 不伪造 refresh token 续期能力
- 不偷偷降级回 OAuth 交换

## 5.6 SUB2API API 层设计

新逻辑应当落在：

- `background/sub2api-api.js`

而不是去复用旧的：

- `flows/openai/content/sub2api-panel.js`

原因：

1. 当前主链路已迁移到 `background/sub2api-api.js`
2. session 导入需要登录、查分组、查代理、发导入请求，这些都属于后台 API 编排
3. 继续往 `flows/openai/content/sub2api-panel.js` 塞逻辑会造成双实现

建议新增 API 方法：

- `importCodexSessionAccount`
- 或 `importCurrentChatGptSession`

该方法内部复用已有：

- `loginSub2Api`
- `getGroupsByNames`
- `resolveSub2ApiProxy`
- `resolveSub2ApiAccountPriority`

不要重复造这几套解析逻辑。

同时需要明确职责边界：

- `background/panel-bridge.js` 继续只负责“跨 target 的 OAuth URL 申请桥接”
- session 导入不要硬塞进 `requestOAuthUrlFromPanel`
- `flows/openai/background/steps/platform-verify.js` 继续只处理 callback 型平台验证
- `sub2api-session-import` 走独立后台执行器，不混进 `platform-verify`

## 5.7 后台总控与运行态设计

### 5.7.1 OAuth 相关总控必须按策略显式分流

当前后台总控明显带有强 OAuth 假设：

- `refreshOAuthUrlBeforeStep6`
- `AUTH_CHAIN_NODE_IDS`
- OAuth 总超时窗口
- localhost callback 捕获与恢复
- `platform-verify` 失败后的 auth-chain 重开

这些逻辑在 session strategy 下都不能继续生效。

最终要求：

1. `oauth` 策略时，保持现有行为
2. `sub2api_codex_session` 策略时：
   - 不刷新 OAuth URL
   - 不进入 AUTH_CHAIN
   - 不等待 localhost callback
   - 不启动 OAuth 总超时
   - 不走 confirm/platform-verify 的重开策略

### 5.7.2 新策略不属于 AUTH_CHAIN

`sub2api-session-import` 不能被加入：

- `AUTH_CHAIN_NODE_IDS`

原因：

1. 它不是 OAuth 过程
2. 它没有 localhost callback
3. 它的失败不应该触发“回到 oauth-login / confirm-oauth 重试”

其失败处理方式应为：

- 节点内部有限次网络重试
- 最终失败则停止当前流程，保留现场，不自动回退到支付或 OAuth 节点

这是必须明确的边界，否则会把“已支付成功的账号接入失败”错误地重开成“重新支付/重新授权类流程”。

### 5.7.3 runtime state 处理原则

这次不建议新增一套新的 session runtime 大字段组。

原因是：

- session 获取可以现读现用
- 分组、代理、优先级都来自现有设置
- 单节点完成，不需要跨多个中间节点传递临时状态

因此运行态设计应尽量简化为：

1. 新增持久化设置字段 `plusAccountAccessStrategy`
2. 不新增 OAuth 等价的 session 中间态字段
3. 切换到 session strategy 时，需要清理旧 OAuth 残留字段
4. 切回 OAuth 时，也要让旧 session 节点状态失效并重建 `nodeStatuses`

必须清理或确保失效的旧字段包括：

- `oauthUrl`
- `localhostUrl`
- `sub2apiSessionId`
- `sub2apiOAuthState`
- 以及围绕 OAuth deadline 的状态

### 5.7.4 nodeStatuses 重建规则

当前 `message-router` 已在以下变更时重建节点状态：

- `plusModeEnabled`
- `plusPaymentMethod`
- `phoneSignupReloginAfterBindEmailEnabled`

本次必须补上：

- `plusAccountAccessStrategy`

因为它直接改变尾链拓扑。

否则会出现：

- 新步骤定义已经换成 session tail
- 旧的 `oauth-login / confirm-oauth / platform-verify` 状态还残留在 `nodeStatuses`

导致自动运行、最终成功判定、跳步恢复全部错位。

## 5.8 settings schema / 持久化 / 导入导出设计

### 5.8.1 settings-schema

`core/flow-kernel/settings-schema.js` 需要在：

- `flows.openai.plus`

下新增：

- `plusAccountAccessStrategy`

并同步到扁平导出字段：

- `next.plusAccountAccessStrategy`

同时需要处理：

- 默认值
- 旧状态兼容
- 扁平导入
- `settingsState` 嵌套结构

### 5.8.2 background normalizePersistentSettingValue

`background.js` 当前有显式的持久化字段归一化开关，必须新增：

- `case 'plusAccountAccessStrategy'`

非法值一律回退到：

- `oauth`

### 5.8.3 历史记录与设置导出测试

当前已有针对以下方向的测试：

- settings 持久化
- account history 归一化
- flow settings schema 映射

因此本次不能只改 schema 而不补测试，否则很容易出现：

- UI 能选
- 但设置导出没带上
- 设置导入后丢失
- background state 恢复后策略回默认

## 5.9 flow capability 设计

### 5.9.1 不要把策略可用性写死在 UI

应扩展 `core/flow-kernel/flow-capabilities.js`，让它输出：

- `requestedPlusAccountAccessStrategy`
- `effectivePlusAccountAccessStrategy`
- `availablePlusAccountAccessStrategies`
- `canEditPlusAccountAccessStrategy`

目标能力建议定义为：

- `cpa`: 只支持 `oauth`
- `sub2api`: 支持 `oauth` 和 `sub2api_codex_session`
- `codex2api`: 只支持 `oauth`

这样可以把：

- UI 可编辑性
- 实际步骤生效值
- 后台模式归一化

统一建立在同一套 capability 结论上，避免 sidepanel / background / step-definitions 三边各写一套 if 判断。

## 5.10 message-router 设计

本方案不建议为了 session import 再新增一套复杂 `handleStepData(step, payload)` 分支。

更合理的做法是：

- `sub2api-session-import` 作为后台节点，直接在执行器内完成 session 读取和 SUB2API 导入
- 完成后直接 `completeNodeFromBackground`

这样 `message-router` 主要需要承担的是：

1. 保存新设置字段
2. 模式切换时重建 nodeStatuses
3. 最终成功节点判定不能再隐式依赖 `platform-verify`
4. Plus 相关日志、提示语不能再硬编码 OAuth

### 5.10.1 最终成功节点判定

当前已有测试说明“Plus 最终成功记录不能写死某个固定 step”。

本次需要继续泛化为：

- 以当前动态步骤集合的**最后一个节点**为准

这样 session strategy 下最后一步可以自然变为：

- `sub2api-session-import`

而不需要继续假设最后节点一定是：

- `platform-verify`

## 5.11 自动运行与重试设计

### 5.11.1 OAuth 失败重开逻辑只保留给 OAuth

当前自动运行在 Plus 后半段有大量“回到 oauth-login / confirm-oauth 重开”的逻辑。

session strategy 下这些逻辑全部不适用。

必须改为：

- **仅当当前策略生效值为 `oauth` 时，才进入原有 OAuth 重开路径**

### 5.11.2 session import 节点的重试策略

`sub2api-session-import` 节点建议只做：

- 有限次的 API 级重试

可重试错误类型：

- SUB2API 登录瞬时失败
- 分组/代理查询瞬时失败
- 导入接口的短暂网络波动

不自动重试的错误类型：

- session 为空
- access token 不可解析或已过期
- 当前 tab 不在可读 session 的域名页面
- 分组不存在
- 配置缺失
- 后端明确业务错误

最终失败后直接停止，不自动回退到支付链路，也不自动跳回 OAuth 节点。

## 6. 方案自检结论

### 6.1 是否符合需求

符合，原因如下：

- 名称已按要求设计成“Plus 模式下的账号接入策略”
- 只对 `sub2api` 真正开放 session 导入
- `cpa / codex2api` 保持 OAuth，UI 禁用
- 明确采用 `sub2api` 原生导入逻辑
- 没有再引入 Plus 手机号注册方案
- 没有再按固定步号设计

### 6.2 是否完整

完整，覆盖了：

- UI
- schema
- settings 持久化
- capability
- step definitions
- 节点执行器
- sub2api API 封装
- runtime 清理
- message-router
- auto-run
- 最终成功判定
- 文案修正
- 测试与验收

### 6.3 是否存在上下冲突

当前方案内部无冲突，关键原因：

1. “请求策略”和“生效策略”分离，避免 target 切换时既要禁用又要保留用户偏好的矛盾
2. session strategy 只在 Plus 邮箱链路下生效，避免与 phone 分支冲突
3. session strategy 不加入 AUTH_CHAIN，避免与 OAuth 重开机制冲突
4. 不新增独立 flow，只替换动态尾链，避免与现有 flow registry 冲突

### 6.4 是否存在逻辑遗漏

当前已主动补齐的高风险遗漏点有：

- Plus 手动确认弹窗的固定“第 10 步 OAuth 登录”文案
- 最终成功节点不能假设是 `platform-verify`
- `nodeStatuses` 必须把 `plusAccountAccessStrategy` 纳入重建条件
- `settings-schema` 的扁平导出与导入恢复
- `normalizePersistentSettingValue` 的新字段归一化
- 旧 OAuth runtime 字段切换时的清理
- session 导入并不具备 refresh_token 自动续期能力

### 6.5 是否存在规范不一致风险

有风险，但已在方案中明确规避路径：

1. 代码库当前存在 `background.js` 与模块文件并存的结构，修改时必须按仓库现有组织方式保持一致，不能只改其中一处
2. Plus 文案当前在多个入口分散存在，新增策略后必须统一改成基于“当前尾链/当前策略”的动态文案
3. 任何新增枚举值都必须同时同步：
   - schema
   - capability
   - sidepanel
   - background normalize
   - tests

### 6.6 是否有乱码风险

有，需要明确纳入开发自检：

1. 新增和改动文件统一使用 UTF-8
2. 新增中文文案直接写 UTF-8，不要复制外部工具里的转码残留
3. 更新测试断言时，不要引入乱码字符串快照
4. Markdown 文档、HTML 文案、JS 字符串三处都要做肉眼检查

## 7. 开发清单

以下阶段仅表示**实施顺序与每阶段自检顺序**。

## 阶段 A：设置模型、能力注册、UI 入口

### 目标

让 Plus 模式先具备正式的“账号接入策略”配置入口，并且在 `sub2api / cpa / codex2api` 三种 target 下表现正确。

### 涉及文件

- `core/flow-kernel/settings-schema.js`
- `core/flow-kernel/flow-capabilities.js`
- `core/flow-kernel/flow-registry.js`
- `sidepanel/sidepanel.html`
- `sidepanel/sidepanel.js`
- `background.js`

### 完成标准

1. 新增 `plusAccountAccessStrategy`
2. 默认值为 `oauth`
3. Plus 开启后显示策略行
4. `sub2api` 下可编辑
5. `cpa / codex2api` 下显示但禁用，运行生效值固定为 `oauth`
6. Plus 关闭时该行隐藏
7. 所有相关文案不再写死“第 10 步 OAuth”

### 阶段自检

1. 检查 schema 嵌套结构和扁平结构是否双向一致
2. 检查导入导出设置后，新字段是否保留
3. 检查 UI 显隐是否跟 `plusModeEnabled` 和 target 联动，而不是只靠写死判断
4. 检查 target 从 `sub2api` 切到 `cpa/codex2api` 时，UI 是否禁用且展示值正确
5. 检查从 `cpa/codex2api` 切回 `sub2api` 时，用户原来的偏好是否能恢复
6. 检查中文文案是否有乱码

## 阶段 B：动态步骤与节点拓扑切换

### 目标

让 Plus 模式在 session strategy 生效时，真正替换掉 OAuth 尾链，而不是只在 UI 上多一个选择框。

### 涉及文件

- `data/step-definitions.js`
- `sidepanel/sidepanel.js`
- `background.js`
- 相关 step definitions / sidepanel 测试

### 完成标准

1. `plusAccountAccessStrategy` 被纳入步骤定义选项
2. PayPal / GoPay / GPC 三条 Plus 前缀链路都能在正确锚点接入 `sub2api-session-import`
3. session strategy 下不再出现：
   - `oauth-login`
   - `fetch-login-code`
   - `post-login-phone-verification`
   - `confirm-oauth`
   - `platform-verify`
4. Plus 手机号链路不会意外生成 session tail

### 阶段自检

1. 检查三种支付方式的尾链是否都正确替换
2. 检查“步骤标题 / 最后一步 / 节点列表 / step ids”是否都随策略变化
3. 检查切换策略后 `nodeStatuses` 是否被重建
4. 检查没有任何代码还在用固定 step number 判断 Plus 尾链
5. 检查 session strategy 下的最后节点是否已经是 `sub2api-session-import`

## 阶段 C：SUB2API session 导入执行器与 API 封装

### 目标

真正接上“读取当前 ChatGPT 会话并导入到 SUB2API”的执行逻辑。

### 涉及文件

- `background/sub2api-api.js`
- `flows/openai/background/steps/sub2api-session-import.js`
- `core/flow-kernel/step-registry.js` 或后台节点注册处
- `flows/openai/content/plus-checkout.js`
- `flows/openai/background/steps/create-plus-checkout.js`

### 完成标准

1. 能从当前 Plus 会话页读出 `session/accessToken`
2. 能复用现有 SUB2API 登录、查分组、查代理逻辑
3. 能调用 `import/codex-session`
4. 能正确处理 `created / updated / warnings / failed`
5. 成功后以 `sub2api-session-import` 节点完成

### 阶段自检

1. 检查没有复制外部项目的转换代码
2. 检查没有把 `sessionToken` 当 `refresh_token`
3. 检查没有伪造 placeholder refresh token
4. 检查 group/proxy/priority 是否复用了现有设置，不新增重复配置
5. 检查 session 为空、tab 域名不对、access token 过期时是否能直接明确失败
6. 检查日志是否能区分 created 和 updated

## 阶段 D：后台总控、自动运行、状态清理

### 目标

让 session strategy 在后台真正成为一条独立于 OAuth 的 Plus 尾链，而不是继续被旧 OAuth 控制逻辑误伤。

### 涉及文件

- `background.js`
- `core/flow-kernel/runtime-state.js`
- `background/message-router.js`
- `flows/openai/background/steps/platform-verify.js`
- `background/panel-bridge.js`
- 自动运行 / auth-chain 相关测试

### 完成标准

1. session strategy 下不会再刷新 OAuth URL
2. session strategy 下不会再依赖 localhost callback
3. session strategy 下不会进入 AUTH_CHAIN
4. 切换到 session strategy 时会清理旧 OAuth 残留状态
5. 最终成功节点判定支持 `sub2api-session-import`
6. auto-run 不会把 session import 失败错误地重开到 OAuth 或支付节点

### 阶段自检

1. 检查 `AUTH_CHAIN_NODE_IDS` 是否仍然只包含 OAuth 节点
2. 检查 `refreshOAuthUrlBeforeStep6` 是否已经按策略分流
3. 检查 `oauthFlowDeadlineAt / oauthFlowDeadlineSourceUrl / localhostUrl / oauthUrl` 等状态在 session strategy 下不会继续参与流程
4. 检查 `message-router` 的 Plus 模式日志和成功判定没有写死 OAuth
5. 检查从 `oauth -> session`、`session -> oauth` 双向切换时，状态清理是否完整

## 阶段 E：测试补齐、回归验证、编码自检

### 目标

把所有会被此次设计影响的行为补成自动测试，并做最终一致性回归。

### 涉及文件

- `tests/step-definitions-module.test.js`
- `tests/sidepanel-plus-payment-method.test.js`
- `tests/flow-capabilities-module.test.js`
- `tests/background-settings-schema-persistence.test.js`
- `tests/background-account-history-settings.test.js`
- `tests/background-message-router-module.test.js`
- `tests/background-message-router-plus-final-step.test.js`
- `tests/background-auth-chain-guard.test.js`
- `tests/auto-run-step6-restart.test.js`
- 新增的 `sub2api session import` 相关测试文件

### 完成标准

1. UI、schema、步骤、后台、auto-run 都有对应测试
2. session strategy 下的最终成功节点有专门测试
3. OAuth 旧行为回归不被破坏
4. Plus 不走手机号注册的约束仍然成立

### 阶段自检

1. 检查所有新增测试都不是基于固定步号，而是基于动态 step key / last step 推导
2. 检查 `sub2api`、`cpa`、`codex2api` 三种 target 都覆盖到
3. 检查 `paypal / gopay / gpc-helper` 三种 Plus 支付方式都覆盖到
4. 检查 session strategy 下没有任何测试仍假设最后节点是 `platform-verify`
5. 检查断言文案和快照没有乱码

## 8. 验收标准

以下条件全部满足，才算本功能真正做完：

1. Plus 模式新增“账号接入策略”配置
2. `sub2api` 下可以在 `OAuth` 与 `导入当前 ChatGPT 会话到 SUB2API` 之间切换
3. `cpa / codex2api` 下该策略显示但禁用，实际始终走 OAuth
4. Plus 下仍只允许邮箱注册
5. session strategy 下，Plus 尾链不再出现 OAuth 节点
6. session strategy 下，导入逻辑走 `sub2api` 原生 `import/codex-session`
7. session strategy 下，不依赖 `oauthUrl / localhostUrl / sub2apiSessionId / sub2apiOAuthState`
8. session strategy 下，最终成功节点为 `sub2api-session-import`
9. session strategy 下失败不会误触发 OAuth auth-chain 重开
10. 设置导出、导入、恢复后，新策略不会丢失
11. 所有新增中文文案无乱码
12. 旧 OAuth Plus 路径在 `sub2api / cpa / codex2api` 下仍可正常工作

## 9. 明确禁止事项

本次开发明确禁止以下做法：

1. 复制 `GPTSession2CPAandSub2API` 的前端转换代码进入扩展
2. 在扩展里自己手搓一套 sub2api 导入 JSON 转换器来替代 `import/codex-session`
3. 把 `sessionToken` 当作 `refresh_token`
4. 伪造 placeholder `refresh_token`
5. 继续把 Plus 尾链写死为固定步骤号
6. 在 Plus 模式下再设计手机号注册兼容路径
7. 让 session strategy 继续复用 OAuth 的 localhost 回调、auth-chain 超时、step7/step9 重开逻辑
8. 只改 UI 不改后台，或者只改步骤定义不改总控

## 10. 最终结论

这项功能应该按“**Plus 模式账号接入策略**”来做，而不是“在某个固定步骤后插一个小补丁”。

从当前代码结构看，正确实现方式不是复制外部项目代码，而是：

1. 复用扩展现有的 ChatGPT session 读取能力
2. 复用 `sub2api` 原生 `import/codex-session`
3. 在 Plus 动态步骤体系里，用 `sub2api-session-import` 替换整段 OAuth 尾链
4. 把设置、能力、步骤、后台状态、自动运行、最终成功判定、测试一起改完整

只要按本方案实施，就能在不破坏现有 OAuth 方案的前提下，把 `sub2api` 的 Plus 账号接入正式扩展成一套完整、闭环、可维护的策略能力。
