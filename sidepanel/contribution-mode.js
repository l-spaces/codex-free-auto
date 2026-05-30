  (function attachSidepanelContributionMode(globalScope) {
    const ACTIVE_STATUSES = new Set(['started', 'waiting', 'processing']);
    const FINAL_STATUSES = new Set(['auto_approved', 'auto_rejected', 'expired', 'error']);
    const DEFAULT_COPY = '当前账号将用于支持项目维护。扩展会自动申请贡献登录地址并持续跟踪授权状态；如检测到回调地址，会自动提交，并继续等待服务端确认。';
    const CONTRIBUTION_SOURCE_CPA = 'cpa';
    const CONTRIBUTION_SOURCE_SUB2API = 'sub2api';
    const CONTRIBUTION_SUB2API_DEFAULT_GROUP_NAME = 'codex号池';

  function createContributionModeManager(context = {}) {
    const {
      state,
      dom,
      helpers,
      runtime,
      constants = {},
    } = context;

    const contributionPortalUrl = constants.contributionPortalUrl || 'https://flowpilot.qlhazycoder.top';
    const contributionUploadUrl = constants.contributionUploadUrl || 'https://flowpilot.qlhazycoder.top/upload';
    const pollIntervalMs = Math.max(1500, Math.floor(Number(constants.pollIntervalMs) || 2500));

    const hiddenRows = [
      dom.rowVpsUrl,
      dom.rowVpsPassword,
      dom.rowLocalCpaStep9Mode,
      dom.rowSub2ApiUrl,
      dom.rowSub2ApiEmail,
      dom.rowSub2ApiPassword,
      dom.rowSub2ApiGroup,
      dom.rowSub2ApiDefaultProxy,
      dom.rowCodex2ApiUrl,
      dom.rowCodex2ApiAdminKey,
      dom.rowCustomPassword,
      dom.rowAccountRunHistoryHelperBaseUrl,
    ].filter(Boolean);

    let actionInFlight = false;
    let pollInFlight = false;
    let pollTimer = null;

    function getLatestState() {
      return state.getLatestState?.() || {};
    }

    function normalizeString(value = '') {
      return String(value || '').trim();
    }

    function normalizeStatus(value = '') {
      const normalized = normalizeString(value).toLowerCase();
      if (ACTIVE_STATUSES.has(normalized) || FINAL_STATUSES.has(normalized)) {
        return normalized;
      }
      return '';
    }

    function normalizeCallbackStatus(value = '') {
      const normalized = normalizeString(value).toLowerCase();
      switch (normalized) {
        case 'waiting':
        case 'captured':
        case 'submitting':
        case 'submitted':
        case 'failed':
        case 'idle':
          return normalized;
        default:
          return '';
      }
    }

    function normalizeContributionSource(value = '') {
      const normalized = normalizeString(value).toLowerCase();
      return normalized === CONTRIBUTION_SOURCE_SUB2API
        ? CONTRIBUTION_SOURCE_SUB2API
        : CONTRIBUTION_SOURCE_CPA;
    }

    function getContributionSource(currentState = getLatestState()) {
      return normalizeContributionSource(currentState.contributionSource || getActiveTargetId(currentState));
    }

    function getContributionSourceLabel(currentState = getLatestState()) {
      if (getActiveFlowId(currentState) !== 'openai') {
        const rootScope = typeof window !== 'undefined' ? window : globalThis;
        const registry = rootScope.MultiPageContributionRegistry || {};
        const adapter = typeof registry.getAdapterDefinition === 'function'
          ? registry.getAdapterDefinition(currentState.contributionAdapterId || '', { flowId: getActiveFlowId(currentState) })
          : null;
        return normalizeString(adapter?.label) || '账号贡献';
      }
      return getContributionSource(currentState) === CONTRIBUTION_SOURCE_SUB2API ? 'SUB2API' : 'CPA';
    }

    function getActiveFlowId(currentState = getLatestState()) {
      const selectedFlowId = typeof helpers.getSelectedFlowId === 'function'
        ? normalizeString(helpers.getSelectedFlowId(currentState)).toLowerCase()
        : '';
      return selectedFlowId || normalizeString(currentState.activeFlowId || currentState.flowId).toLowerCase() || 'openai';
    }

    function getActiveTargetId(currentState = getLatestState()) {
      const activeFlowId = getActiveFlowId(currentState);
      const selectedTargetId = typeof helpers.getSelectedTargetId === 'function'
        ? normalizeString(helpers.getSelectedTargetId(activeFlowId, currentState)).toLowerCase()
        : '';
      if (selectedTargetId) {
        return selectedTargetId;
      }
      return normalizeString(currentState.targetId).toLowerCase()
        || 'cpa';
    }

    function applySelectedFlowToState(nextState = {}, flowId = 'openai', targetId = '') {
      const selectedFlowId = normalizeString(flowId).toLowerCase() || 'openai';
      const selectedTargetId = normalizeString(targetId).toLowerCase();
      const baseState = nextState && typeof nextState === 'object' ? nextState : {};
      return {
        ...baseState,
        activeFlowId: selectedFlowId,
        flowId: selectedFlowId,
        targetId: selectedTargetId || normalizeString(baseState.targetId).toLowerCase() || 'cpa',
      };
    }

    function getContributionTutorialEntry(currentState = getLatestState()) {
      const rootScope = typeof window !== 'undefined' ? window : globalThis;
      const registry = rootScope.MultiPageContributionRegistry || {};
      const activeFlowId = getActiveFlowId(currentState);
      if (typeof registry.getContributionTutorialEntry === 'function') {
        return registry.getContributionTutorialEntry(activeFlowId, {
          adapterId: currentState.contributionAdapterId,
          portalBaseUrl: contributionPortalUrl,
          targetId: getActiveTargetId(currentState),
        });
      }
      return {
        flowId: activeFlowId,
        targetId: getActiveTargetId(currentState),
        contributionAdapterId: normalizeString(currentState.contributionAdapterId),
        portalUrl: normalizeString(contributionPortalUrl),
      };
    }

    function getContributionEntryAdapterId(currentState = getLatestState()) {
      return normalizeString(getContributionTutorialEntry(currentState)?.contributionAdapterId);
    }

    function isContributionModeAvailable(currentState = getLatestState()) {
      const rootScope = typeof window !== 'undefined' ? window : globalThis;
      const registry = rootScope.MultiPageFlowCapabilities?.createFlowCapabilityRegistry?.({
        defaultFlowId: 'openai',
      }) || null;
      if (registry?.resolveSidepanelCapabilities) {
        return Boolean(registry.resolveSidepanelCapabilities({
          activeFlowId: getActiveFlowId(currentState),
          targetId: getActiveTargetId(currentState),
          state: currentState,
        })?.canShowContributionMode);
      }
      return Boolean(currentState?.supportsAccountContribution || getActiveFlowId(currentState) === 'openai');
    }

    function isContributionModeEnabled(currentState = getLatestState()) {
      return isContributionModeAvailable(currentState) && Boolean(currentState.accountContributionEnabled);
    }

    function hasActiveContributionSession(currentState = getLatestState()) {
      const status = normalizeStatus(currentState.contributionStatus);
      return Boolean(normalizeString(currentState.contributionSessionId) && status && !FINAL_STATUSES.has(status));
    }

    function isModeSwitchBlocked() {
      return Boolean(helpers.isModeSwitchBlocked?.(getLatestState()));
    }

    function setContributionHidden(element, hidden) {
      element?.classList.toggle('is-contribution-hidden', hidden);
    }

    function syncContributionRows(enabled) {
      hiddenRows.forEach((row) => {
        setContributionHidden(row, enabled);
      });
    }

    function syncContributionButton(enabled, blocked, available = true) {
      if (!dom.btnContributionMode) {
        return;
      }

      dom.btnContributionMode.classList.toggle('is-active', enabled);
      dom.btnContributionMode.setAttribute('aria-pressed', String(enabled));
      if (!available) {
        dom.btnContributionMode.disabled = true;
        dom.btnContributionMode.title = '当前 flow 不支持贡献模式';
        return;
      }
      dom.btnContributionMode.disabled = actionInFlight;
      dom.btnContributionMode.title = enabled
        ? '打开当前 flow 教程；当前已在贡献模式'
        : (blocked ? '打开当前 flow 教程；当前流程运行中暂时不能进入贡献模式' : '打开当前 flow 教程并进入贡献模式');
    }

    function stopPolling() {
      if (pollTimer) {
        clearTimeout(pollTimer);
        pollTimer = null;
      }
    }

    function schedulePolling(delayMs = pollIntervalMs) {
      stopPolling();
      if (!isContributionModeEnabled() || !hasActiveContributionSession()) {
        return;
      }

      pollTimer = setTimeout(() => {
        pollOnce({ silentError: true }).catch(() => {});
      }, delayMs);
    }

    function ensurePolling() {
      if (!isContributionModeEnabled() || !hasActiveContributionSession()) {
        stopPolling();
        return;
      }

      if (!pollTimer && !pollInFlight) {
        schedulePolling(1200);
      }
    }

    function getOauthStatusText(currentState = getLatestState()) {
      if (getActiveFlowId(currentState) !== 'openai') {
        const flowRuntime = getCurrentFlowContributionRuntime(currentState);
        const status = normalizeString(flowRuntime.status).toLowerCase();
        if (status === 'submitting') {
          return '正在提交账号产物';
        }
        if (status === 'submitted') {
          return '账号产物已提交';
        }
        if (status === 'skipped') {
          return '账号产物未就绪';
        }
        if (status === 'error') {
          return '账号产物提交失败';
        }
        return isContributionModeEnabled(currentState) ? '等待账号产物' : '未开启贡献模式';
      }
      const status = normalizeStatus(currentState.contributionStatus);
      const hasAuthUrl = Boolean(normalizeString(currentState.contributionAuthUrl));
      if (!normalizeString(currentState.contributionSessionId) || !hasAuthUrl) {
        return '未生成登录地址';
      }
      if (status === 'waiting') {
        return '等待提交回调';
      }
      if (status === 'processing' || status === 'auto_approved' || status === 'auto_rejected') {
        return status === 'processing' ? '已提交回调' : '授权已结束';
      }
      if (status === 'expired' || status === 'error') {
        return '授权失败';
      }
      if (Number(currentState.contributionAuthOpenedAt) > 0) {
        return '已打开授权页';
      }
      return '登录地址已生成';
    }

    function getCallbackStatusText(currentState = getLatestState()) {
      if (getActiveFlowId(currentState) !== 'openai') {
        const flowRuntime = getCurrentFlowContributionRuntime(currentState);
        return normalizeString(flowRuntime.lastMessage || flowRuntime.error) || '账号产物就绪后会自动提交';
      }
      const status = normalizeCallbackStatus(currentState.contributionCallbackStatus);
      switch (status) {
        case 'captured':
          return '已捕获回调地址';
        case 'submitting':
          return '正在提交回调';
        case 'submitted':
          return '已提交回调';
        case 'failed':
          return '回调提交失败';
        case 'waiting':
        case 'idle':
        default:
          return normalizeString(currentState.contributionCallbackUrl)
            ? '已捕获回调地址'
            : '等待回调';
      }
    }

    function getSummaryText(currentState = getLatestState()) {
      const statusMessage = normalizeString(currentState.contributionStatusMessage);
      if (statusMessage) {
        return statusMessage;
      }
      if (getActiveFlowId(currentState) !== 'openai') {
        return '当前账号将用于支持项目维护。扩展会按当前 flow 的贡献适配器收集并提交账号产物，提交过程不会依赖 OpenAI OAuth 配置。';
      }
      if (getContributionSource(currentState) === CONTRIBUTION_SOURCE_SUB2API) {
        const groupName = normalizeString(currentState.contributionTargetGroupName) || CONTRIBUTION_SUB2API_DEFAULT_GROUP_NAME;
        return `当前账号将用于支持项目维护。贡献会通过 SUB2API 完成，并固定写入 ${groupName} 分组；如检测到回调地址，扩展会自动提交并等待服务端确认。`;
      }
      return DEFAULT_COPY;
    }

    function getCurrentFlowContributionRuntime(currentState = getLatestState()) {
      const runtime = currentState?.flowContributionRuntime;
      if (!runtime || typeof runtime !== 'object') {
        return {};
      }
      const flowRuntime = runtime[getActiveFlowId(currentState)];
      return flowRuntime && typeof flowRuntime === 'object' ? flowRuntime : {};
    }

    function getContributionPortalPageUrl() {
      return normalizeString(getContributionTutorialEntry()?.portalUrl || contributionPortalUrl);
    }

    function getContributionUploadPageUrl() {
      return normalizeString(contributionUploadUrl || contributionPortalUrl);
    }

    function openContributionPortalPage() {
      const targetUrl = getContributionPortalPageUrl();
      if (!targetUrl) {
        return;
      }
      helpers.openExternalUrl?.(targetUrl);
    }

    function openContributionUploadPage() {
      const targetUrl = getContributionUploadPageUrl();
      if (!targetUrl) {
        return;
      }
      helpers.openExternalUrl?.(targetUrl);
    }

    async function syncContributionProfile(partial = {}) {
      const nickname = normalizeString(partial.nickname);
      const qq = normalizeString(partial.qq);
      if (qq && !/^\d{1,20}$/.test(qq)) {
        throw new Error('QQ 只能填写数字，且长度不能超过 20 位。');
      }
      helpers.applySettingsState?.({
        ...getLatestState(),
        contributionNickname: nickname,
        contributionQq: qq,
      });
    }

    async function requestContributionMode(enabled) {
      const selectedFlowId = getActiveFlowId();
      const selectedTargetId = getActiveTargetId();
      if (typeof helpers.persistCurrentSettingsForAction === 'function') {
        await helpers.persistCurrentSettingsForAction();
      }
      const response = await runtime.sendMessage({
        type: 'SET_ACCOUNT_CONTRIBUTION_MODE',
        source: 'sidepanel',
        payload: {
          enabled: Boolean(enabled),
          flowId: selectedFlowId,
          adapterId: getContributionEntryAdapterId(),
        },
      });

      if (response?.error) {
        throw new Error(response.error);
      }
      if (!response?.state) {
        throw new Error('贡献模式切换后未返回最新状态。');
      }

      const nextState = applySelectedFlowToState(response.state, selectedFlowId, selectedTargetId);
      helpers.applySettingsState?.(nextState);
      helpers.updateStatusDisplay?.(nextState);
      render();
    }

    async function pollOnce(options = {}) {
      if (pollInFlight || !isContributionModeEnabled() || !hasActiveContributionSession()) {
        if (!hasActiveContributionSession()) {
          stopPolling();
        }
        return;
      }

      pollInFlight = true;
      try {
        const response = await runtime.sendMessage({
          type: 'POLL_FLOW_CONTRIBUTION_STATUS',
          source: 'sidepanel',
          payload: {
            reason: options.reason || 'sidepanel_poll',
          },
        });

        if (response?.error) {
          throw new Error(response.error);
        }
        if (response?.state) {
          helpers.applySettingsState?.(response.state);
          helpers.updateStatusDisplay?.(response.state);
        }
      } finally {
        pollInFlight = false;
        render();
        if (hasActiveContributionSession()) {
          schedulePolling();
        } else {
          stopPolling();
        }
      }
    }

    async function startAccountContributionFlow() {
      if (typeof helpers.startContributionAutoRun !== 'function') {
        throw new Error('贡献模式尚未接入主自动流程启动能力。');
      }

      const profile = helpers.getContributionProfile?.() || {};
      const qq = normalizeString(profile.qq);
      if (qq && !/^\d{1,20}$/.test(qq)) {
        throw new Error('QQ 只能填写数字，且长度不能超过 20 位。');
      }
      await syncContributionProfile(profile);
      const started = await helpers.startContributionAutoRun();
      if (!started) {
        return;
      }

      helpers.showToast?.('贡献自动流程已启动。', 'info', 1800);
      render();
    }

    async function enterContributionMode() {
      await requestContributionMode(true);
      helpers.showToast?.('已进入贡献模式。', 'success', 1800);
    }

    async function exitContributionMode() {
      stopPolling();
      await requestContributionMode(false);
      helpers.showToast?.('已退出贡献模式。', 'info', 1800);
    }

    function render() {
      const currentState = getLatestState();
      const available = isContributionModeAvailable(currentState);
      const enabled = isContributionModeEnabled(currentState);
      const activeFlowId = getActiveFlowId(currentState);
      const blocked = available ? isModeSwitchBlocked() : false;
      const activeElement = typeof document !== 'undefined' ? document.activeElement : null;
      const sourceLabel = available ? getContributionSourceLabel(currentState) : '';

      if (enabled && activeFlowId === 'openai' && dom.selectPanelMode) {
        dom.selectPanelMode.value = getContributionSource(currentState);
      }

      helpers.updatePanelModeUI?.();
      helpers.updateAccountRunHistorySettingsUI?.();

      if (dom.accountContributionPanel) {
        dom.accountContributionPanel.hidden = !available || !enabled;
      }
      if (dom.accountContributionText) {
        dom.accountContributionText.textContent = getSummaryText(currentState);
      }
      if (dom.accountContributionBadge) {
        dom.accountContributionBadge.textContent = enabled ? sourceLabel : '';
      }
      if (dom.inputContributionNickname && activeElement !== dom.inputContributionNickname) {
        const nextNickname = normalizeString(currentState.contributionNickname);
        if (nextNickname || !normalizeString(dom.inputContributionNickname.value)) {
          dom.inputContributionNickname.value = nextNickname;
        }
      }
      if (dom.inputContributionQq && activeElement !== dom.inputContributionQq) {
        const nextQq = normalizeString(currentState.contributionQq);
        if (nextQq || !normalizeString(dom.inputContributionQq.value)) {
          dom.inputContributionQq.value = nextQq;
        }
      }
      if (dom.contributionOauthStatus) {
        dom.contributionOauthStatus.textContent = getOauthStatusText(currentState);
      }
      if (dom.contributionPrimaryStatusLabel) {
        dom.contributionPrimaryStatusLabel.textContent = activeFlowId === 'openai' ? 'OAUTH' : '账号产物';
      }
      if (dom.contributionCallbackStatus) {
        dom.contributionCallbackStatus.textContent = getCallbackStatusText(currentState);
      }
      if (dom.contributionSecondaryStatusLabel) {
        dom.contributionSecondaryStatusLabel.textContent = activeFlowId === 'openai' ? '回调' : '提交';
      }
      if (dom.accountContributionSummary) {
        dom.accountContributionSummary.textContent = getSummaryText(currentState);
      }

      syncContributionRows(enabled && activeFlowId === 'openai');
      syncContributionButton(enabled, blocked, available);

      if (dom.selectPanelMode) {
        dom.selectPanelMode.disabled = activeFlowId === 'openai' && available && enabled;
      }

      if (dom.btnStartContribution) {
        dom.btnStartContribution.disabled = !available || actionInFlight || blocked;
      }

      if (dom.btnOpenContributionUpload) {
        dom.btnOpenContributionUpload.hidden = !available;
        dom.btnOpenContributionUpload.disabled = !available;
        dom.btnOpenContributionUpload.textContent = '已有认证文件？前往上传';
      }

      if (dom.btnExitContributionMode) {
        dom.btnExitContributionMode.disabled = !available || actionInFlight || blocked;
        dom.btnExitContributionMode.title = blocked ? '当前流程运行中，暂时不能退出贡献模式' : '退出贡献模式';
      }

      if (dom.btnOpenAccountRecords) {
        dom.btnOpenAccountRecords.disabled = enabled;
      }

      if (available && enabled) {
        helpers.closeConfigMenu?.();
        helpers.closeAccountRecordsPanel?.();
        ensurePolling();
      } else {
        stopPolling();
      }

      helpers.updateConfigMenuControls?.();
    }

    function bindEvents() {
      dom.btnContributionMode?.addEventListener('click', async () => {
        if (actionInFlight) {
          return;
        }
        actionInFlight = true;
        try {
          openContributionPortalPage();
        } catch (error) {
          helpers.showToast?.(`打开官网页面失败：${error.message}`, 'error');
        }
        render();
        try {
          if (isContributionModeEnabled()) {
            helpers.showToast?.('已打开当前 flow 教程。', 'info', 1800);
          } else if (isModeSwitchBlocked()) {
            helpers.showToast?.('已打开当前 flow 教程；当前流程运行中，暂时不能进入贡献模式。', 'warning', 2200);
          } else {
            await enterContributionMode();
          }
        } catch (error) {
          helpers.showToast?.(error.message, 'error');
        } finally {
          actionInFlight = false;
          render();
        }
      });

      dom.btnStartContribution?.addEventListener('click', async () => {
        if (actionInFlight) {
          return;
        }
        actionInFlight = true;
        render();
        try {
          await startAccountContributionFlow();
        } catch (error) {
          helpers.showToast?.(error.message, 'error');
        } finally {
          actionInFlight = false;
          render();
        }
      });

      dom.inputContributionNickname?.addEventListener('change', async () => {
        try {
          await syncContributionProfile({
            nickname: dom.inputContributionNickname?.value,
            qq: dom.inputContributionQq?.value,
          });
        } catch (error) {
          helpers.showToast?.(error.message, 'error');
        } finally {
          render();
        }
      });

      dom.inputContributionQq?.addEventListener('change', async () => {
        try {
          await syncContributionProfile({
            nickname: dom.inputContributionNickname?.value,
            qq: dom.inputContributionQq?.value,
          });
        } catch (error) {
          helpers.showToast?.(error.message, 'error');
        } finally {
          render();
        }
      });

      dom.btnOpenContributionUpload?.addEventListener('click', () => {
        try {
          openContributionUploadPage();
        } catch (error) {
          helpers.showToast?.(`打开上传页面失败：${error.message}`, 'error');
        }
      });

      dom.btnExitContributionMode?.addEventListener('click', async () => {
        if (actionInFlight) {
          return;
        }
        actionInFlight = true;
        render();
        try {
          await exitContributionMode();
        } catch (error) {
          helpers.showToast?.(error.message, 'error');
        } finally {
          actionInFlight = false;
          render();
        }
      });
    }

    return {
      bindEvents,
      pollOnce,
      render,
      stopPolling,
    };
  }

  globalScope.SidepanelContributionMode = {
    createContributionModeManager,
  };
})(typeof window !== 'undefined' ? window : globalThis);
