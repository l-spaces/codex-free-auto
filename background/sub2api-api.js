(function attachBackgroundSub2ApiApi(root, factory) {
  root.MultiPageBackgroundSub2ApiApi = factory();
})(typeof self !== 'undefined' ? self : globalThis, function createBackgroundSub2ApiApiModule() {
  function createSub2ApiApi(deps = {}) {
    const {
      addLog = async () => {},
      normalizeSub2ApiUrl = (value) => value,
      DEFAULT_SUB2API_GROUP_NAME = 'codex',
      fetchImpl = (...args) => fetch(...args),
    } = deps;

    const DEFAULT_REDIRECT_URI = 'http://localhost:1455/auth/callback';
    const DEFAULT_PROXY_NAME = '';
    const DEFAULT_CONCURRENCY = 10;
    const DEFAULT_PRIORITY = 1;
    const DEFAULT_RATE_MULTIPLIER = 1;

    function normalizeString(value = '') {
      return String(value || '').trim();
    }

    function extractStateFromAuthUrl(authUrl = '') {
      try {
        return new URL(authUrl).searchParams.get('state') || '';
      } catch {
        return '';
      }
    }

    function normalizeRedirectUri(input = DEFAULT_REDIRECT_URI) {
      const withProtocol = /^https?:\/\//i.test(input) ? input : `http://${input}`;
      const parsed = new URL(withProtocol);
      if (!parsed.pathname || parsed.pathname === '/') {
        parsed.pathname = '/auth/callback';
      }
      if (parsed.pathname !== '/auth/callback') {
        throw new Error('SUB2API 回调地址必须是 /auth/callback，例如 http://localhost:1455/auth/callback');
      }
      return parsed.toString();
    }

    function getSub2ApiOrigin(rawUrl = '') {
      const sub2apiUrl = normalizeSub2ApiUrl(rawUrl);
      if (!sub2apiUrl) {
        throw new Error('SUB2API URL is not configured. Please fill it in the side panel first.');
      }
      try {
        return new URL(sub2apiUrl).origin;
      } catch {
        throw new Error('SUB2API URL 格式无效，请先在侧边栏检查。');
      }
    }

    function getSub2ApiErrorMessage(payload, responseStatus = 500, path = '') {
      const candidates = [
        payload?.message,
        payload?.detail,
        payload?.error,
        payload?.reason,
      ];
      const message = candidates.map(normalizeString).find(Boolean);
      return message || `SUB2API 请求失败（HTTP ${responseStatus}）：${path}`;
    }

    async function requestJson(origin, path, options = {}) {
      const controller = new AbortController();
      const timeoutMs = Math.max(1000, Math.floor(Number(options.timeoutMs) || 30000));
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const token = normalizeString(options.token);
        const response = await fetchImpl(`${origin}${path}`, {
          method: options.method || 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          signal: controller.signal,
        });

        const text = await response.text();
        let payload = null;
        try {
          payload = text ? JSON.parse(text) : null;
        } catch {
          payload = null;
        }

        if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'code')) {
          if (Number(payload.code) === 0) {
            return payload.data;
          }
          throw new Error(getSub2ApiErrorMessage(payload, response.status, path));
        }

        if (!response.ok) {
          throw new Error(getSub2ApiErrorMessage(payload, response.status, path));
        }

        return payload;
      } catch (error) {
        if (error?.name === 'AbortError') {
          throw new Error(`SUB2API 请求超时：${path}`);
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    }

    async function loginSub2Api(state = {}, options = {}) {
      const email = normalizeString(state.sub2apiEmail);
      const password = String(state.sub2apiPassword || '');
      const origin = getSub2ApiOrigin(state.sub2apiUrl);

      if (!email) {
        throw new Error('尚未配置 SUB2API 登录邮箱，请先在侧边栏填写。');
      }
      if (!password) {
        throw new Error('尚未配置 SUB2API 登录密码，请先在侧边栏填写。');
      }

      const loginData = await requestJson(origin, '/api/v1/auth/login', {
        method: 'POST',
        timeoutMs: options.timeoutMs,
        body: { email, password },
      });

      const token = normalizeString(loginData?.access_token || loginData?.accessToken);
      if (!token) {
        throw new Error('SUB2API 登录返回缺少 access_token。');
      }

      return {
        origin,
        token,
        user: loginData?.user || null,
      };
    }

    function normalizeSub2ApiGroupNames(value) {
      const source = Array.isArray(value)
        ? value
        : String(value || '').split(/[\r\n,，;；]+/);
      const seen = new Set();
      const names = [];
      for (const item of source) {
        const name = normalizeString(item);
        const key = name.toLowerCase();
        if (!name || seen.has(key)) continue;
        seen.add(key);
        names.push(name);
      }
      return names.length ? names : [DEFAULT_SUB2API_GROUP_NAME];
    }

    async function getGroupsByNames(origin, token, groupNames, options = {}) {
      const targetNames = normalizeSub2ApiGroupNames(groupNames);
      const groups = await requestJson(origin, '/api/v1/admin/groups/all', {
        method: 'GET',
        token,
        timeoutMs: options.timeoutMs,
      });
      const matched = [];
      const missing = [];

      for (const targetName of targetNames) {
        const normalized = targetName.toLowerCase();
        const group = (Array.isArray(groups) ? groups : []).find((item) => {
          const itemName = normalizeString(item?.name).toLowerCase();
          if (!itemName || itemName !== normalized) return false;
          return !item.platform || item.platform === 'openai';
        });
        if (group) {
          matched.push(group);
        } else {
          missing.push(targetName);
        }
      }

      if (missing.length) {
        throw new Error(`SUB2API 中未找到以下 openai 分组：${missing.join('、')}。`);
      }

      return matched;
    }

    function normalizeSub2ApiProxyPreference(value) {
      return normalizeString(value);
    }

    function resolveSub2ApiProxyPreference(state = {}) {
      if (state.sub2apiDefaultProxyName !== undefined) {
        return normalizeSub2ApiProxyPreference(state.sub2apiDefaultProxyName);
      }
      return DEFAULT_PROXY_NAME;
    }

    function resolveSub2ApiAccountPriority(state = {}) {
      const rawValue = normalizeString(state.sub2apiAccountPriority);
      if (!rawValue) {
        return DEFAULT_PRIORITY;
      }
      const numeric = Number(rawValue);
      if (!Number.isSafeInteger(numeric) || numeric < 1) {
        throw new Error('SUB2API 账号优先级必须是大于等于 1 的整数。');
      }
      return numeric;
    }

    function normalizeProxyId(value) {
      if (value === undefined || value === null || value === '') {
        return null;
      }
      const normalized = Number(value);
      if (!Number.isSafeInteger(normalized) || normalized <= 0) {
        return null;
      }
      return normalized;
    }

    function buildProxyDisplayName(proxy = {}) {
      const id = normalizeProxyId(proxy.id);
      const name = normalizeString(proxy.name);
      const protocol = normalizeString(proxy.protocol);
      const host = normalizeString(proxy.host);
      const port = proxy.port === undefined || proxy.port === null ? '' : normalizeString(proxy.port);
      const address = protocol && host && port ? `${protocol}://${host}:${port}` : '';
      return [
        name || '(未命名代理)',
        id ? `#${id}` : '',
        address,
      ].filter(Boolean).join(' ');
    }

    function buildProxySearchText(proxy = {}) {
      return [
        proxy.id,
        proxy.name,
        proxy.protocol,
        proxy.host,
        proxy.port,
        buildProxyDisplayName(proxy),
      ]
        .filter((value) => value !== undefined && value !== null && value !== '')
        .map((value) => normalizeString(value).toLowerCase())
        .filter(Boolean)
        .join(' ');
    }

    function isActiveProxy(proxy = {}) {
      const status = normalizeString(proxy.status).toLowerCase();
      return !status || status === 'active';
    }

    function findSub2ApiProxy(proxies = [], preference = '') {
      const activeProxies = (Array.isArray(proxies) ? proxies : [])
        .filter(isActiveProxy)
        .filter((proxy) => normalizeProxyId(proxy.id));
      const normalizedPreference = normalizeSub2ApiProxyPreference(preference).toLowerCase();
      const preferredId = normalizeProxyId(normalizedPreference);

      if (preferredId) {
        const matchedById = activeProxies.find((proxy) => normalizeProxyId(proxy.id) === preferredId);
        return {
          proxy: matchedById || null,
          reason: matchedById ? 'id' : 'missing-id',
          candidates: activeProxies,
        };
      }

      if (normalizedPreference) {
        const exactMatches = activeProxies.filter((proxy) => normalizeString(proxy.name).toLowerCase() === normalizedPreference);
        if (exactMatches.length === 1) {
          return { proxy: exactMatches[0], reason: 'name', candidates: activeProxies };
        }
        if (exactMatches.length > 1) {
          return { proxy: null, reason: 'ambiguous-name', candidates: exactMatches };
        }

        const fuzzyMatches = activeProxies.filter((proxy) => buildProxySearchText(proxy).includes(normalizedPreference));
        if (fuzzyMatches.length === 1) {
          return { proxy: fuzzyMatches[0], reason: 'fuzzy', candidates: activeProxies };
        }
        if (fuzzyMatches.length > 1) {
          return { proxy: null, reason: 'ambiguous-fuzzy', candidates: fuzzyMatches };
        }

        return { proxy: null, reason: 'missing-name', candidates: activeProxies };
      }

      if (activeProxies.length === 1) {
        return { proxy: activeProxies[0], reason: 'single-active', candidates: activeProxies };
      }
      return {
        proxy: null,
        reason: activeProxies.length ? 'no-preference' : 'none-active',
        candidates: activeProxies,
      };
    }

    async function resolveSub2ApiProxy(origin, token, preference = '', options = {}) {
      const proxies = await requestJson(origin, '/api/v1/admin/proxies/all?with_count=true', {
        method: 'GET',
        token,
        timeoutMs: options.timeoutMs,
      });
      if (!Array.isArray(proxies)) {
        throw new Error('SUB2API 代理列表返回格式异常，无法自动选择代理。');
      }

      const { proxy, reason, candidates } = findSub2ApiProxy(proxies, preference);
      if (proxy) {
        return proxy;
      }

      const configured = normalizeSub2ApiProxyPreference(preference) || '(未配置)';
      const available = (candidates || [])
        .slice(0, 8)
        .map(buildProxyDisplayName)
        .join('；') || '无可用代理';
      if (reason === 'ambiguous-name' || reason === 'ambiguous-fuzzy') {
        throw new Error(`SUB2API 默认代理“${configured}”匹配到多个代理，请改填代理 ID。候选：${available}`);
      }
      if (reason === 'missing-id') {
        throw new Error(`SUB2API 默认代理 ID “${configured}”不存在或未启用。可用代理：${available}`);
      }
      if (reason === 'missing-name') {
        throw new Error(`SUB2API 默认代理“${configured}”不存在或未启用。可用代理：${available}`);
      }
      if (reason === 'no-preference') {
        throw new Error(`SUB2API 存在多个可用代理，请在侧边栏填写默认代理名称或 ID；留空则不使用代理。可用代理：${available}`);
      }
      throw new Error('SUB2API 没有可用代理；请检查默认代理配置，或将其留空以禁用代理。');
    }

    function buildDraftAccountName(groupName) {
      const prefix = normalizeString(groupName || DEFAULT_SUB2API_GROUP_NAME)
        .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
        .replace(/^-+|-+$/g, '') || DEFAULT_SUB2API_GROUP_NAME;
      const stamp = new Date().toISOString().replace(/\D/g, '').slice(2, 14);
      const random = Math.floor(Math.random() * 9000 + 1000);
      return `${prefix}-${stamp}-${random}`;
    }

    function parseLocalhostCallback(rawUrl, visibleStep = 10) {
      let parsed;
      try {
        parsed = new URL(rawUrl);
      } catch {
        throw new Error(`步骤 ${visibleStep} 捕获到的 localhost OAuth 回调地址格式无效。`);
      }

      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('回调 URL 协议不正确。');
      }
      if (!['localhost', '127.0.0.1'].includes(parsed.hostname)) {
        throw new Error(`步骤 ${visibleStep} 只接受 localhost / 127.0.0.1 回调地址。`);
      }
      if (parsed.pathname !== '/auth/callback') {
        throw new Error('回调 URL 路径必须是 /auth/callback。');
      }

      const code = normalizeString(parsed.searchParams.get('code'));
      const state = normalizeString(parsed.searchParams.get('state'));
      if (!code || !state) {
        throw new Error('回调 URL 中缺少 code 或 state。');
      }

      return {
        url: parsed.toString(),
        code,
        state,
      };
    }

    function buildOpenAiCredentials(exchangeData) {
      const credentials = {};
      const allowedKeys = [
        'access_token',
        'refresh_token',
        'id_token',
        'expires_at',
        'email',
        'chatgpt_account_id',
        'chatgpt_user_id',
        'organization_id',
        'plan_type',
        'client_id',
      ];

      for (const key of allowedKeys) {
        if (exchangeData?.[key] !== undefined && exchangeData?.[key] !== null && exchangeData?.[key] !== '') {
          credentials[key] = exchangeData[key];
        }
      }

      if (!credentials.access_token) {
        throw new Error('SUB2API 交换授权码后未返回 access_token。');
      }

      return credentials;
    }

    function buildOpenAiExtra(exchangeData) {
      const extra = {};
      const allowedKeys = ['email', 'name', 'privacy_mode'];

      for (const key of allowedKeys) {
        if (exchangeData?.[key] !== undefined && exchangeData?.[key] !== null && exchangeData?.[key] !== '') {
          extra[key] = exchangeData[key];
        }
      }

      return Object.keys(extra).length ? extra : undefined;
    }

    async function logWithOptions(message, level = 'info', options = {}) {
      await addLog(message, level, options.logOptions || {});
    }

    async function generateOpenAiAuthUrl(state = {}, options = {}) {
      const logLabel = normalizeString(options.logLabel) || 'OAuth 刷新';
      const redirectUri = normalizeRedirectUri(options.redirectUri || DEFAULT_REDIRECT_URI);
      const groupNames = normalizeSub2ApiGroupNames(state.sub2apiGroupName || DEFAULT_SUB2API_GROUP_NAME);
      const groupName = groupNames[0] || DEFAULT_SUB2API_GROUP_NAME;

      await logWithOptions(`${logLabel}：正在通过 SUB2API 管理接口登录并生成 OpenAI Auth 链接...`, 'info', options);
      const { origin, token } = await loginSub2Api(state, options);
      const groups = await getGroupsByNames(origin, token, groupNames, options);
      const group = groups[0];
      const proxyPreference = resolveSub2ApiProxyPreference(state);
      const proxy = proxyPreference ? await resolveSub2ApiProxy(origin, token, proxyPreference, options) : null;
      const proxyId = normalizeProxyId(proxy?.id);
      const draftName = buildDraftAccountName(group.name || groupName);
      const groupLabel = groups.map((item) => `${item.name}（#${item.id}）`).join('、');

      await logWithOptions(`${logLabel}：已登录 SUB2API，使用分组 ${groupLabel}。`, 'info', options);
      if (proxy) {
        await logWithOptions(`${logLabel}：已选择 SUB2API 默认代理 ${buildProxyDisplayName(proxy)}。`, 'info', options);
      } else {
        await logWithOptions(`${logLabel}：未配置 SUB2API 默认代理，本次将不使用代理。`, 'info', options);
      }

      const authRequestBody = { redirect_uri: redirectUri };
      if (proxyId) {
        authRequestBody.proxy_id = proxyId;
      }

      const authData = await requestJson(origin, '/api/v1/admin/openai/generate-auth-url', {
        method: 'POST',
        token,
        timeoutMs: options.timeoutMs,
        body: authRequestBody,
      });

      const oauthUrl = normalizeString(authData?.auth_url || authData?.authUrl);
      const sessionId = normalizeString(authData?.session_id || authData?.sessionId);
      const oauthState = normalizeString(authData?.state || extractStateFromAuthUrl(oauthUrl));

      if (!oauthUrl || !sessionId) {
        throw new Error('SUB2API 未返回完整的 auth_url / session_id。');
      }

      await logWithOptions(`${logLabel}：已获取 SUB2API OAuth 链接：${oauthUrl.slice(0, 96)}...`, 'ok', options);
      return {
        oauthUrl,
        sub2apiSessionId: sessionId,
        sub2apiOAuthState: oauthState,
        sub2apiGroupId: group.id,
        sub2apiGroupIds: groups.map((item) => item.id),
        sub2apiDraftName: draftName,
        sub2apiProxyId: proxyId,
      };
    }

    async function submitOpenAiCallback(state = {}, options = {}) {
      const visibleStep = Number(options.visibleStep || state.visibleStep) || 10;
      const callback = parseLocalhostCallback(state.localhostUrl || '', visibleStep);
      const flowEmail = normalizeString(state.email);
      const sessionId = normalizeString(state.sub2apiSessionId);
      const expectedState = normalizeString(state.sub2apiOAuthState);
      const logLabel = normalizeString(options.logLabel) || `步骤 ${visibleStep}`;

      if (!sessionId) {
        throw new Error('缺少 SUB2API session_id，请重新执行步骤 1。');
      }
      if (expectedState && expectedState !== callback.state) {
        throw new Error('本次 localhost 回调中的 state 与步骤 1 生成的 state 不一致，请重新执行步骤 1。');
      }

      const { origin, token } = await loginSub2Api(state, options);
      const proxyPreference = resolveSub2ApiProxyPreference(state);
      const preferredProxyId = normalizeProxyId(state.sub2apiProxyId);
      const proxySelector = preferredProxyId || proxyPreference;
      const proxy = proxySelector ? await resolveSub2ApiProxy(origin, token, proxySelector, options) : null;
      const proxyId = normalizeProxyId(proxy?.id);
      const accountPriority = resolveSub2ApiAccountPriority(state);
      const storedGroupIds = Array.isArray(state.sub2apiGroupIds) ? state.sub2apiGroupIds : [];
      const groupIdsFromState = storedGroupIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0);
      const groups = groupIdsFromState.length
        ? groupIdsFromState.map((id) => ({ id }))
        : (state.sub2apiGroupId
          ? [{ id: state.sub2apiGroupId, name: state.sub2apiGroupName || DEFAULT_SUB2API_GROUP_NAME }]
          : await getGroupsByNames(origin, token, state.sub2apiGroupName || DEFAULT_SUB2API_GROUP_NAME, options));

      await logWithOptions(`${logLabel}：正在通过 SUB2API 管理接口交换 OpenAI 授权码...`, 'info', options);
      if (proxy) {
        await logWithOptions(`${logLabel}：使用 SUB2API 默认代理 ${buildProxyDisplayName(proxy)}。`, 'info', options);
      } else {
        await logWithOptions(`${logLabel}：未配置 SUB2API 默认代理，本次将不使用代理。`, 'info', options);
      }

      const exchangeRequestBody = {
        session_id: sessionId,
        code: callback.code,
        state: callback.state,
      };
      if (proxyId) {
        exchangeRequestBody.proxy_id = proxyId;
      }

      const exchangeData = await requestJson(origin, '/api/v1/admin/openai/exchange-code', {
        method: 'POST',
        token,
        timeoutMs: options.timeoutMs,
        body: exchangeRequestBody,
      });

      const credentials = buildOpenAiCredentials(exchangeData);
      const extra = buildOpenAiExtra(exchangeData);
      const resolvedEmail = normalizeString(exchangeData?.email || credentials?.email);
      const groupIds = groups
        .map((group) => Number(group.id))
        .filter((id) => Number.isFinite(id) && id > 0);
      if (!groupIds.length) {
        throw new Error('SUB2API 返回的目标分组 ID 无效。');
      }

      const accountName = resolvedEmail
        || flowEmail
        || normalizeString(state.sub2apiDraftName)
        || buildDraftAccountName(state.sub2apiGroupName || DEFAULT_SUB2API_GROUP_NAME);
      const createPayload = {
        name: accountName,
        notes: '',
        platform: 'openai',
        type: 'oauth',
        credentials,
        concurrency: DEFAULT_CONCURRENCY,
        priority: accountPriority,
        rate_multiplier: DEFAULT_RATE_MULTIPLIER,
        group_ids: groupIds,
        auto_pause_on_expired: true,
      };
      if (proxyId) {
        createPayload.proxy_id = proxyId;
      }
      if (extra) {
        createPayload.extra = extra;
      }

      await logWithOptions(`${logLabel}：授权码交换成功，正在创建 SUB2API 账号（名称：${accountName}）...`, 'info', options);
      const createdAccount = await requestJson(origin, '/api/v1/admin/accounts', {
        method: 'POST',
        token,
        timeoutMs: options.createTimeoutMs,
        body: createPayload,
      });

      const verifiedStatus = `SUB2API 已创建账号 #${createdAccount?.id || 'unknown'}`;
      await logWithOptions(verifiedStatus, 'ok', options);
      return {
        localhostUrl: callback.url,
        verifiedStatus,
      };
    }

    return {
      buildDraftAccountName,
      buildOpenAiCredentials,
      buildOpenAiExtra,
      buildProxyDisplayName,
      extractStateFromAuthUrl,
      generateOpenAiAuthUrl,
      getGroupsByNames,
      loginSub2Api,
      normalizeProxyId,
      normalizeRedirectUri,
      normalizeSub2ApiGroupNames,
      parseLocalhostCallback,
      requestJson,
      resolveSub2ApiAccountPriority,
      resolveSub2ApiProxy,
      submitOpenAiCallback,
    };
  }

  return {
    createSub2ApiApi,
  };
});
