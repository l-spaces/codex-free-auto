(function attachBackgroundLoggingStatus(root, factory) {
  root.MultiPageBackgroundLoggingStatus = factory();
})(typeof self !== 'undefined' ? self : globalThis, function createBackgroundLoggingStatusModule() {
  function createLoggingStatus(deps = {}) {
    const {
      chrome,
      DEFAULT_STATE,
      getStepIdByNodeIdForState,
      getState,
      isRecoverableStep9AuthFailure,
      LOG_PREFIX,
      setLogsState = null,
      setState,
      sourceRegistry = null,
      STOP_ERROR_MESSAGE,
      logLimit = 500,
      logFlushIntervalMs = 200,
      logFlushBatchSize = 20,
      logMergeWindowMs = 1200,
      logMergeLevels = ['info', 'warn'],
    } = deps;
    const LOG_LIMIT = Math.max(1, Math.floor(Number(logLimit) || 500));
    const LOG_FLUSH_INTERVAL_MS = Math.max(0, Math.floor(Number(logFlushIntervalMs) || 0));
    const LOG_FLUSH_BATCH_SIZE = Math.max(1, Math.floor(Number(logFlushBatchSize) || 1));
    const LOG_MERGE_WINDOW_MS = Math.max(0, Math.floor(Number(logMergeWindowMs) || 0));
    const LOG_MERGE_LEVEL_SET = new Set(
      Array.isArray(logMergeLevels)
        ? logMergeLevels.map((level) => String(level || '').trim()).filter(Boolean)
        : ['info', 'warn']
    );

    let logsReady = false;
    let logsCache = [];
    let initLogsPromise = null;
    let pendingFlushCount = 0;
    let flushTimer = null;
    let flushQueue = Promise.resolve();
    let logEntrySeq = 0;
    let lastLogSignature = '';
    let lastLogAt = 0;
    let lastLogEntry = null;
    const persistLogsState = typeof setLogsState === 'function'
      ? setLogsState
      : async (logs) => setState({ logs });

    function nextLogEntryId() {
      logEntrySeq += 1;
      return `log-${Date.now().toString(36)}-${logEntrySeq.toString(36)}`;
    }

    function normalizeLogLevel(level) {
      const normalized = String(level || '').trim();
      return normalized || 'info';
    }

    function normalizeTimestamp(value) {
      const timestamp = Number(value);
      return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now();
    }

    function normalizeRepeatCount(value) {
      const count = Math.floor(Number(value) || 1);
      return count > 1 ? count : 1;
    }

    function normalizeLogEntry(entry = {}) {
      const step = normalizeLogStep(entry.step);
      const stepKey = String(entry.stepKey || '').trim();
      const nodeId = String(entry.nodeId || entry.nodeKey || stepKey || '').trim();
      return {
        id: String(entry.id || nextLogEntryId()),
        message: String(entry.message || ''),
        level: normalizeLogLevel(entry.level),
        timestamp: normalizeTimestamp(entry.timestamp),
        step,
        stepKey,
        nodeId,
        repeatCount: normalizeRepeatCount(entry.repeatCount),
      };
    }

    function buildLogSignature(entry = {}) {
      return [
        normalizeLogLevel(entry.level),
        String(entry.step || ''),
        String(entry.stepKey || ''),
        String(entry.nodeId || ''),
        String(entry.message || ''),
      ].join('|');
    }

    function setLastLogTracker(entry = null) {
      if (!entry) {
        lastLogSignature = '';
        lastLogAt = 0;
        lastLogEntry = null;
        return;
      }
      lastLogEntry = entry;
      lastLogSignature = buildLogSignature(entry);
      lastLogAt = normalizeTimestamp(entry.lastRepeatAt || entry.timestamp);
    }

    function trimLogs(logs = []) {
      if (!Array.isArray(logs)) return [];
      if (logs.length <= LOG_LIMIT) return logs;
      return logs.slice(logs.length - LOG_LIMIT);
    }

    async function ensureLogsReady() {
      if (logsReady) return;
      if (!initLogsPromise) {
        initLogsPromise = (async () => {
          const state = await getState();
          const rawLogs = Array.isArray(state?.logs) ? state.logs : [];
          logsCache = trimLogs(rawLogs.map((entry) => normalizeLogEntry(entry)));
          setLastLogTracker(logsCache[logsCache.length - 1] || null);
          logsReady = true;
        })().finally(() => {
          initLogsPromise = null;
        });
      }
      await initLogsPromise;
    }

    async function flushLogs() {
      await ensureLogsReady();
      if (pendingFlushCount <= 0) return;
      const persistLogs = trimLogs(logsCache);
      pendingFlushCount = 0;
      try {
        // 日志落盘走轻量路径，避免触发通用 setState 的全量读改写开销。
        await persistLogsState(persistLogs);
      } catch (error) {
        pendingFlushCount = 1;
        console.warn(LOG_PREFIX, 'flush logs failed:', error?.message || error);
      }
    }

    function queueFlush(forceNow = false) {
      if (forceNow && flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      if (!forceNow && flushTimer) return flushQueue;
      if (!forceNow && pendingFlushCount < LOG_FLUSH_BATCH_SIZE && LOG_FLUSH_INTERVAL_MS > 0) {
        flushTimer = setTimeout(() => {
          flushTimer = null;
          queueFlush(true);
        }, LOG_FLUSH_INTERVAL_MS);
        return flushQueue;
      }
      flushQueue = flushQueue
        .then(() => flushLogs())
        .catch((error) => {
          console.warn(LOG_PREFIX, 'queue flush logs failed:', error?.message || error);
        });
      return flushQueue;
    }

    function getSourceLabel(source) {
      if (sourceRegistry?.getSourceLabel) {
        return sourceRegistry.getSourceLabel(source);
      }
      const labels = {
        'openai-auth': '认证页',
        'gmail-mail': 'Gmail 邮箱',
        'sidepanel': '侧边栏',
        'signup-page': '认证页',
        'vps-panel': 'CPA 面板',
        'sub2api-panel': 'SUB2API 后台',
        'codex2api-panel': 'Codex2API 后台',
        'qq-mail': 'QQ 邮箱',
        'mail-163': '163 邮箱',
        'mail-2925': '2925 邮箱',
        'inbucket-mail': 'Inbucket 邮箱',
        'duck-mail': 'Duck 邮箱',
        'hotmail-api': 'Hotmail（API对接/本地助手）',
        'luckmail-api': 'LuckMail（API 购邮）',
        'cloudflare-temp-email': 'Cloudflare Temp Email',
        'cloudmail': 'Cloud Mail',
        'unknown-source': '未知来源',
      };
      return labels[source] || source || '未知来源';
    }

    function normalizeLogStep(value) {
      const step = Math.floor(Number(value) || 0);
      return step > 0 ? step : null;
    }

    function buildLogEntry(message, level = 'info', options = {}) {
      const normalizedOptions = options && typeof options === 'object' ? options : {};
      const step = normalizeLogStep(normalizedOptions.step);
      const stepKey = String(normalizedOptions.stepKey || '').trim();
      const nodeId = String(normalizedOptions.nodeId || normalizedOptions.nodeKey || stepKey || '').trim();
      return normalizeLogEntry({
        id: nextLogEntryId(),
        message,
        level,
        timestamp: normalizedOptions.timestamp,
        step,
        stepKey,
        nodeId,
      });
    }

    async function addLog(message, level = 'info', options = {}) {
      await ensureLogsReady();
      const entry = buildLogEntry(message, level, options);
      const signature = buildLogSignature(entry);
      const canMerge = LOG_MERGE_WINDOW_MS > 0
        && LOG_MERGE_LEVEL_SET.has(entry.level)
        && lastLogEntry
        && signature === lastLogSignature
        && Date.now() - lastLogAt <= LOG_MERGE_WINDOW_MS;
      if (canMerge) {
        lastLogEntry.repeatCount = normalizeRepeatCount(lastLogEntry.repeatCount) + 1;
        lastLogAt = Date.now();
        pendingFlushCount += 1;
        chrome.runtime.sendMessage({ type: 'LOG_ENTRY_REPEAT', payload: { ...lastLogEntry } }).catch(() => { });
        queueFlush(false);
        return;
      }

      logsCache.push(entry);
      logsCache = trimLogs(logsCache);
      setLastLogTracker(entry);
      pendingFlushCount += 1;
      chrome.runtime.sendMessage({ type: 'LOG_ENTRY', payload: entry }).catch(() => { });
      queueFlush(entry.level === 'error');
    }

    async function setNodeStatus(nodeId, status) {
      const normalizedNodeId = String(nodeId || '').trim();
      if (!normalizedNodeId) {
        throw new Error('setNodeStatus 缺少 nodeId。');
      }
      const state = await getState();
      const nodeStatuses = { ...(state.nodeStatuses || {}) };
      nodeStatuses[normalizedNodeId] = status;
      await setState({
        nodeStatuses,
        currentNodeId: normalizedNodeId,
      });
      chrome.runtime.sendMessage({
        type: 'NODE_STATUS_CHANGED',
        payload: { nodeId: normalizedNodeId, status },
      }).catch(() => { });
    }

    function getErrorMessage(error) {
      return String(typeof error === 'string' ? error : error?.message || '')
        .replace(/^AUTO_RUN_STEP_IDLE_RESTART::/i, '');
    }

    function isVerificationMailPollingError(error) {
      const message = getErrorMessage(error);
      return /未在 .*邮箱中找到新的匹配邮件|未在 Hotmail 收件箱中找到新的匹配验证码|邮箱轮询结束，但未获取到验证码|无法获取新的(?:注册|登录)验证码|页面未能重新就绪|页面通信异常|内容脚本\s+\d+(?:\.\d+)?\s*秒内未响应|did not respond in \d+s|405\s+method\s+not\s+allowed|route\s+error.*405|did\s+not\s+provide\s+an?\s+[`'"]?action|post\s+request\s+to\s+["']?\/(?:email|phone)-verification/i.test(message);
    }

    function isAddPhoneAuthFailure(error) {
      const message = getErrorMessage(error);
      if (/\u624b\u673a\u53f7\u8f93\u5165\u6a21\u5f0f|phone\s+entry/i.test(message)) {
        return false;
      }
      return /ADD_PHONE_REQUIRED::|https:\/\/auth\.openai\.com\/(?:add-phone|phone-verification)(?:[/?#]|$)|\badd-phone\b|phone-verification|\u6dfb\u52a0\u624b\u673a\u53f7|\u624b\u673a\u53f7\u7801|\u624b\u673a\u9a8c\u8bc1\u7801\u9875|\u624b\u673a\u9a8c\u8bc1\u9875|\u8fdb\u5165\u624b\u673a\u53f7\u9875\u9762|\u624b\u673a\u53f7\u9875|\u624b\u673a\u53f7\u9875\u9762|phone\s+number|telephone/i.test(message);
    }

    function getLoginAuthStateLabel(state) {
      switch (state) {
        case 'verification_page':
          return '登录验证码页';
        case 'password_page':
          return '密码页';
        case 'email_page':
          return '邮箱输入页';
        case 'login_timeout_error_page':
          return '登录超时报错页';
        case 'oauth_consent_page':
          return 'OAuth 授权页';
        case 'add_phone_page':
          return '手机号页';
        case 'add_email_page':
          return '添加邮箱页';
        case 'phone_verification_page':
          return '手机验证码页';
        default:
          return '未知页面';
      }
    }

    function isRestartCurrentAttemptError(error) {
      const message = String(typeof error === 'string' ? error : error?.message || '');
      return /当前邮箱已存在，需要重新开始新一轮|SIGNUP_PHONE_PASSWORD_MISMATCH::/i.test(message);
    }

    function isSignupUserAlreadyExistsFailure(error) {
      const message = getErrorMessage(error);
      return /SIGNUP_USER_ALREADY_EXISTS::|user_already_exists/i.test(message);
    }

    function isStep9RecoverableAuthError(error) {
      const message = String(typeof error === 'string' ? error : error?.message || '');
      return /STEP9_OAUTH_RETRY::/i.test(message)
        || isRecoverableStep9AuthFailure(message);
    }

    function isLegacyStep9RecoverableAuthError(error) {
      const message = String(typeof error === 'string' ? error : error?.message || '');
      return /STEP9_OAUTH_TIMEOUT::|认证失败:\s*(?:Timeout waiting for OAuth callback|timeout of \d+ms exceeded)/i.test(message);
    }

    function isStepDoneStatus(status) {
      return status === 'completed' || status === 'manual_completed' || status === 'skipped';
    }

    function getFirstUnfinishedStep(statuses = {}) {
      const nodeStatuses = statuses && typeof statuses === 'object' ? statuses : {};
      const nodeIds = Object.keys(DEFAULT_STATE.nodeStatuses || {});
      for (const nodeId of nodeIds) {
        if (!isStepDoneStatus(nodeStatuses[nodeId] || 'pending')) {
          return typeof getStepIdByNodeIdForState === 'function'
            ? getStepIdByNodeIdForState(nodeId, {})
            : null;
        }
      }
      return null;
    }

    function hasSavedProgress(statuses = {}) {
      return Object.values({ ...DEFAULT_STATE.nodeStatuses, ...statuses }).some((status) => status !== 'pending');
    }

    function getRunningSteps(statuses = {}) {
      return Object.entries({ ...DEFAULT_STATE.nodeStatuses, ...statuses })
        .filter(([, status]) => status === 'running')
        .map(([nodeId]) => (typeof getStepIdByNodeIdForState === 'function' ? getStepIdByNodeIdForState(nodeId, {}) : null))
        .filter((step) => Number.isInteger(step) && step > 0)
        .sort((a, b) => a - b);
    }

    function getFirstUnfinishedNode(statuses = {}) {
      const nodeIds = Object.keys(DEFAULT_STATE.nodeStatuses || {});
      for (const nodeId of nodeIds) {
        if (!isStepDoneStatus(statuses[nodeId] || 'pending')) {
          return nodeId;
        }
      }
      return '';
    }

    function hasSavedNodeProgress(statuses = {}) {
      return Object.values({ ...DEFAULT_STATE.nodeStatuses, ...statuses }).some((status) => status !== 'pending');
    }

    function getRunningNodes(statuses = {}) {
      return Object.entries({ ...DEFAULT_STATE.nodeStatuses, ...statuses })
        .filter(([, status]) => status === 'running')
        .map(([nodeId]) => nodeId);
    }

    function getAutoRunStatusPayload(phase, payload = {}) {
      return {
        autoRunning: phase === 'scheduled'
          || phase === 'running'
          || phase === 'waiting_step'
          || phase === 'waiting_email'
          || phase === 'retrying'
          || phase === 'waiting_interval',
        autoRunPhase: phase,
        autoRunCurrentRun: payload.currentRun ?? 0,
        autoRunTotalRuns: payload.totalRuns ?? 1,
        autoRunAttemptRun: payload.attemptRun ?? 0,
        autoRunSessionId: Math.max(0, Math.floor(Number(payload.sessionId ?? payload.autoRunSessionId) || 0)),
        scheduledAutoRunAt: Number.isFinite(Number(payload.scheduledAt)) ? Number(payload.scheduledAt) : null,
        autoRunCountdownAt: Number.isFinite(Number(payload.countdownAt)) ? Number(payload.countdownAt) : null,
        autoRunCountdownTitle: payload.countdownTitle === undefined ? '' : String(payload.countdownTitle || ''),
        autoRunCountdownNote: payload.countdownNote === undefined ? '' : String(payload.countdownNote || ''),
      };
    }

    return {
      addLog,
      flushLogs,
      getAutoRunStatusPayload,
      getFirstUnfinishedNode,
      isAddPhoneAuthFailure,
      getErrorMessage,
      getFirstUnfinishedStep,
      getLoginAuthStateLabel,
      getRunningNodes,
      getRunningSteps,
      getSourceLabel,
      hasSavedNodeProgress,
      hasSavedProgress,
      isLegacyStep9RecoverableAuthError,
      isRestartCurrentAttemptError,
      isSignupUserAlreadyExistsFailure,
      isStep9RecoverableAuthError,
      isStepDoneStatus,
      isVerificationMailPollingError,
      setNodeStatus,
    };
  }

  return {
    createLoggingStatus,
  };
});
