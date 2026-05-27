(function attachBackgroundAutoRunController(root, factory) {
  root.MultiPageBackgroundAutoRunController = factory();
})(typeof self !== 'undefined' ? self : globalThis, function createBackgroundAutoRunControllerModule() {
  function createAutoRunController(deps = {}) {
    const {
      addLog,
      appendAccountRunRecord,
      AUTO_RUN_MAX_RETRIES_PER_ROUND,
      AUTO_RUN_RETRY_DELAY_MS,
      AUTO_RUN_TIMER_KIND_BEFORE_RETRY,
      AUTO_RUN_TIMER_KIND_BETWEEN_ROUNDS,
      broadcastAutoRunStatus,
      broadcastStopToContentScripts,
      cancelPendingCommands,
      clearStopRequest,
      createAutoRunSessionId,
      ensureHotmailMailboxReadyForAutoRunRound,
      getAutoRunStatusPayload,
      getErrorMessage,
      getFirstUnfinishedNodeId,
      getPendingAutoRunTimerPlan,
      getRunningNodeIds,
      getState,
      hasSavedNodeProgress,
      isAddPhoneAuthFailure,
      isGptmailApiKeyUsageLimitError = () => false,
      isRestartCurrentAttemptError,
      isStep4Route405RecoveryLimitFailure,
      isSignupUserAlreadyExistsFailure,
      isStopError,
      launchAutoRunTimerPlan,
      normalizeAutoRunFallbackThreadIntervalMinutes,
      persistAutoRunTimerPlan,
      resetState,
      runAutoSequenceFromNode,
      runtime,
      setNodeStatus,
      setState,
      sleepWithStop,
      throwIfAutoRunSessionStopped,
      waitForRunningNodesToFinish,
    } = deps;

    function getRunningWorkflowNodes(state = {}) {
      if (typeof getRunningNodeIds === 'function') {
        return getRunningNodeIds(state.nodeStatuses || {}, state);
      }
      return [];
    }

    async function markRunningWorkflowNodesStopped() {
      const state = await getState();
      const runningNodeIds = getRunningWorkflowNodes(state);
      if (!runningNodeIds.length) {
        return;
      }

      if (typeof setNodeStatus === 'function') {
        for (const nodeId of runningNodeIds) {
          await setNodeStatus(nodeId, 'stopped');
        }
        return;
      }

      const nodeStatuses = { ...(state.nodeStatuses || {}) };
      for (const nodeId of runningNodeIds) {
        nodeStatuses[nodeId] = 'stopped';
      }
      await setState({ nodeStatuses });
    }

    function getFirstUnfinishedWorkflowNode(state = {}) {
      if (typeof getFirstUnfinishedNodeId === 'function') {
        return getFirstUnfinishedNodeId(state.nodeStatuses || {}, state);
      }
      return null;
    }

    function hasSavedWorkflowProgress(state = {}) {
      if (typeof hasSavedNodeProgress === 'function') {
        return hasSavedNodeProgress(state.nodeStatuses || {}, state);
      }
      return false;
    }

    async function waitForRunningWorkflowNodesToFinish(payload = {}) {
      if (typeof waitForRunningNodesToFinish === 'function') {
        return waitForRunningNodesToFinish(payload);
      }
      return getState();
    }

    async function runAutoSequenceFromWorkflowNode(startNodeId, context = {}) {
      if (typeof runAutoSequenceFromNode === 'function') {
        return runAutoSequenceFromNode(startNodeId, context);
      }
      throw new Error('自动运行节点执行器未接入。');
    }

    function normalizeExecutionMode(value = '') {
      const normalized = String(value || '').trim().toLowerCase();
      if (normalized === 'register_gpt') {
        return 'register_gpt';
      }
      if (normalized === 'authorize_codex') {
        return 'authorize_codex';
      }
      return 'full';
    }

    function normalizeImportedAccounts(value = []) {
      if (!Array.isArray(value)) {
        return [];
      }
      return value
        .map((item) => String(item || '').trim())
        .filter(Boolean);
    }

    function resolveExecutionStepRange(mode = 'full', startStep, endStep) {
      const normalizedMode = normalizeExecutionMode(mode);
      const defaultRange = normalizedMode === 'register_gpt'
        ? { startStep: 1, endStep: 6 }
        : (normalizedMode === 'authorize_codex'
          ? { startStep: 7, endStep: 11 }
          : { startStep: 1, endStep: 11 });
      let normalizedStartStep = Math.max(1, Math.floor(Number(startStep) || defaultRange.startStep));
      let normalizedEndStep = Math.max(1, Math.floor(Number(endStep) || defaultRange.endStep));
      if (normalizedStartStep > normalizedEndStep) {
        normalizedStartStep = defaultRange.startStep;
        normalizedEndStep = defaultRange.endStep;
      }
      return {
        startStep: normalizedStartStep,
        endStep: normalizedEndStep,
      };
    }

    function createAutoRunRoundSummary(round) {
      return {
        round,
        status: 'pending',
        attempts: 0,
        failureReasons: [],
        failureReasonCodes: [],
        finalFailureReason: '',
        finalFailureReasonCode: '',
      };
    }

    function normalizeFailureReasonCode(value = '') {
      return String(value || '').trim().toUpperCase();
    }

    function extractFailureReasonCode(reason = '') {
      const normalizedReason = String(reason || '').trim();
      const match = normalizedReason.match(/^([A-Z][A-Z0-9_]+)::/);
      return match ? normalizeFailureReasonCode(match[1]) : '';
    }

    function appendRoundFailureReason(summary, reason = '') {
      const normalizedReason = String(reason || '').trim() || '未知错误';
      summary.failureReasons.push(normalizedReason);
      const reasonCode = extractFailureReasonCode(normalizedReason);
      if (reasonCode) {
        summary.failureReasonCodes.push(reasonCode);
      }
      return { reason: normalizedReason, code: reasonCode };
    }

    function setRoundFinalFailureReason(summary, reason = '', explicitCode = '') {
      summary.finalFailureReason = String(reason || '').trim();
      const normalizedExplicitCode = normalizeFailureReasonCode(explicitCode);
      if (normalizedExplicitCode) {
        summary.finalFailureReasonCode = normalizedExplicitCode;
        if (!summary.failureReasonCodes.includes(normalizedExplicitCode)) {
          summary.failureReasonCodes.push(normalizedExplicitCode);
        }
        return;
      }

      const finalReasonCode = extractFailureReasonCode(summary.finalFailureReason)
        || summary.failureReasonCodes[summary.failureReasonCodes.length - 1]
        || '';
      summary.finalFailureReasonCode = finalReasonCode;
    }

    function normalizeAutoRunRoundSummary(summary, round) {
      const base = createAutoRunRoundSummary(round);
      if (!summary || typeof summary !== 'object') {
        return base;
      }

      const status = String(summary.status || '').trim().toLowerCase();
      const failureReasons = Array.isArray(summary.failureReasons)
        ? summary.failureReasons.map((item) => String(item || '').trim()).filter(Boolean)
        : [];
      const failureReasonCodes = Array.isArray(summary.failureReasonCodes)
        ? summary.failureReasonCodes.map((item) => normalizeFailureReasonCode(item)).filter(Boolean)
        : [];
      const finalFailureReason = String(summary.finalFailureReason || '').trim();
      const finalFailureReasonCode = normalizeFailureReasonCode(summary.finalFailureReasonCode)
        || extractFailureReasonCode(finalFailureReason)
        || failureReasonCodes[failureReasonCodes.length - 1]
        || '';
      return {
        round,
        status: ['pending', 'success', 'failed'].includes(status) ? status : base.status,
        attempts: Math.max(0, Math.floor(Number(summary.attempts) || 0)),
        failureReasons,
        failureReasonCodes,
        finalFailureReason,
        finalFailureReasonCode,
      };
    }

    function buildAutoRunRoundSummaries(totalRuns, rawSummaries = []) {
      return Array.from({ length: totalRuns }, (_, index) => normalizeAutoRunRoundSummary(rawSummaries[index], index + 1));
    }

    function serializeAutoRunRoundSummaries(totalRuns, roundSummaries = []) {
      return buildAutoRunRoundSummaries(totalRuns, roundSummaries).map((summary) => ({
        ...summary,
        failureReasons: [...summary.failureReasons],
        failureReasonCodes: [...summary.failureReasonCodes],
      }));
    }

    function getAutoRunRoundRetryCount(summary) {
      return Math.max(0, Number(summary?.attempts || 0) - 1);
    }

    function normalizeRecordNode(value = '') {
      return String(value || '').trim();
    }

    function extractNodeFromRecordStatus(status = '') {
      const match = String(status || '').trim().match(/^node:([^:]+):(failed|stopped)$/i);
      return match ? normalizeRecordNode(match[1]) : '';
    }

    function getKnownNodeIdsFromState(state = {}) {
      const ids = new Set();
      for (const key of Object.keys(state?.nodeStatuses || {})) {
        const nodeId = normalizeRecordNode(key);
        if (nodeId) {
          ids.add(nodeId);
        }
      }

      const currentNodeId = normalizeRecordNode(state?.currentNodeId);
      if (currentNodeId) {
        ids.add(currentNodeId);
      }

      return Array.from(ids);
    }

    function inferRecordNodeFromState(state = {}, preferredStatuses = []) {
      const statuses = state?.nodeStatuses || {};
      const preferredStatusSet = new Set(preferredStatuses.map((item) => String(item || '').trim()).filter(Boolean));
      const nodeIds = getKnownNodeIdsFromState(state);
      const currentNodeId = normalizeRecordNode(state?.currentNodeId);

      if (currentNodeId && preferredStatusSet.has(String(statuses[currentNodeId] || '').trim())) {
        return currentNodeId;
      }

      const matchingNodes = nodeIds.filter((nodeId) => preferredStatusSet.has(String(statuses[nodeId] || '').trim()));
      if (matchingNodes.length) {
        return matchingNodes[matchingNodes.length - 1];
      }

      if (currentNodeId) {
        const currentStatus = String(statuses[currentNodeId] || '').trim();
        if (!['', 'pending', 'completed', 'manual_completed', 'skipped'].includes(currentStatus)) {
          return currentNodeId;
        }
      }

      return '';
    }

    function inferRecordNodeFromError(errorLike = null, state = {}) {
      if (!errorLike || typeof errorLike !== 'object') {
        return '';
      }

      return normalizeRecordNode(errorLike.failedNodeId)
        || normalizeRecordNode(errorLike.nodeId)
        || normalizeRecordNode(errorLike.currentNodeId);
    }

    function resolveAutoRunAccountRecordStatus(status, state = {}, errorLike = null) {
      const normalizedStatus = String(status || '').trim().toLowerCase();
      const explicitNode = extractNodeFromRecordStatus(status);
      if (explicitNode) {
        return `node:${explicitNode}:${normalizedStatus.endsWith(':stopped') ? 'stopped' : 'failed'}`;
      }
      if (normalizedStatus === 'failed') {
        const failedNode = inferRecordNodeFromError(errorLike, state)
          || inferRecordNodeFromState(state, ['failed', 'running']);
        return failedNode ? `node:${failedNode}:failed` : status;
      }

      if (normalizedStatus === 'stopped') {
        const stoppedNode = inferRecordNodeFromError(errorLike, state)
          || inferRecordNodeFromState(state, ['stopped', 'running']);
        return stoppedNode ? `node:${stoppedNode}:stopped` : status;
      }

      return status;
    }

    function formatAutoRunFailureReasons(reasons = []) {
      if (!Array.isArray(reasons) || !reasons.length) {
        return '未知错误';
      }

      const counts = new Map();
      for (const reason of reasons) {
        const normalized = String(reason || '').trim() || '未知错误';
        counts.set(normalized, (counts.get(normalized) || 0) + 1);
      }

      return Array.from(counts.entries())
        .map(([reason, count]) => (count > 1 ? `${reason}（${count}次）` : reason))
        .join('；');
    }

    function shouldKeepCustomMailProviderPoolEmail(state = {}) {
      return String(state?.mailProvider || '').trim().toLowerCase() === 'custom'
        && Array.isArray(state?.customMailProviderPool)
        && state.customMailProviderPool.length > 0;
    }

    async function logAutoRunFinalSummary(totalRuns, roundSummaries = []) {
      const summaries = buildAutoRunRoundSummaries(totalRuns, roundSummaries);
      const successRounds = summaries.filter((item) => item.status === 'success');
      const failedRounds = summaries.filter((item) => item.status === 'failed');
      const pendingRounds = summaries.filter((item) => item.status === 'pending');

      await addLog('=== 自动运行汇总 ===', failedRounds.length ? 'warn' : 'ok');
      await addLog(
        `总轮数：${totalRuns}；成功：${successRounds.length}；失败：${failedRounds.length}；未完成：${pendingRounds.length}`,
        failedRounds.length ? 'warn' : 'ok'
      );

      if (successRounds.length) {
        await addLog(
          `成功轮次：${successRounds
            .map((item) => `第 ${item.round} 轮（重试 ${getAutoRunRoundRetryCount(item)} 次）`)
            .join('；')}`,
          'ok'
        );
      }

      if (failedRounds.length) {
        await addLog(
          `失败轮次：${failedRounds
            .map((item) => {
              const retryCount = getAutoRunRoundRetryCount(item);
              const finalReason = item.finalFailureReason || item.failureReasons[item.failureReasons.length - 1] || '未知错误';
              const reasonSummary = formatAutoRunFailureReasons(item.failureReasons);
              return !reasonSummary || reasonSummary === finalReason
                ? `第 ${item.round} 轮（重试 ${retryCount} 次，最终原因：${finalReason}）`
                : `第 ${item.round} 轮（重试 ${retryCount} 次，最终原因：${finalReason}；失败记录：${reasonSummary}）`;
            })
            .join('；')}`,
          'error'
        );
      }

      if (pendingRounds.length) {
        await addLog(
          `未完成轮次：${pendingRounds.map((item) => `第 ${item.round} 轮`).join('；')}`,
          'warn'
        );
      }
    }

    async function skipAutoRunCountdown() {
      const state = await getState();
      const plan = getPendingAutoRunTimerPlan(state);
      if (!plan || state.autoRunPhase !== 'waiting_interval') {
        return false;
      }

      return launchAutoRunTimerPlan('manual', {
        expectedKinds: [
          AUTO_RUN_TIMER_KIND_BETWEEN_ROUNDS,
          AUTO_RUN_TIMER_KIND_BEFORE_RETRY,
        ],
      });
    }

    async function waitBetweenAutoRunRounds(targetRun, totalRuns, roundSummary, options = {}) {
      const {
        autoRunSkipFailures = false,
        roundSummaries = [],
        executionMode = 'full',
        importedAccounts = [],
        startStep = 1,
        endStep = 11,
        authorizationEmail = '',
      } = options;
      if (totalRuns <= 1 || targetRun >= totalRuns) {
        return false;
      }

      const fallbackThreadIntervalMinutes = normalizeAutoRunFallbackThreadIntervalMinutes(
        (await getState()).autoRunFallbackThreadIntervalMinutes
      );
      if (fallbackThreadIntervalMinutes <= 0) {
        return false;
      }

      const currentRuntime = runtime.get();
      const statusLabel = roundSummary?.status === 'failed' ? '失败' : '完成';
      await addLog(
        `线程间隔：第 ${targetRun}/${totalRuns} 轮已${statusLabel}，等待 ${fallbackThreadIntervalMinutes} 分钟后开始下一轮。`,
        'info'
      );
      await persistAutoRunTimerPlan({
        kind: AUTO_RUN_TIMER_KIND_BETWEEN_ROUNDS,
        fireAt: Date.now() + fallbackThreadIntervalMinutes * 60 * 1000,
        currentRun: targetRun,
        totalRuns,
        attemptRun: currentRuntime.autoRunAttemptRun,
        autoRunSessionId: currentRuntime.autoRunSessionId,
        autoRunSkipFailures,
        executionMode,
        importedAccounts,
        startStep,
        endStep,
        authorizationEmail,
        roundSummaries,
        countdownTitle: '线程间隔中',
        countdownNote: `第 ${Math.min(targetRun + 1, totalRuns)}/${totalRuns} 轮即将开始`,
      }, {
        autoRunSkipFailures,
        autoRunRoundSummaries: serializeAutoRunRoundSummaries(totalRuns, roundSummaries),
        executionMode,
        importedAccounts,
        startStep,
        endStep,
        authorizationEmail,
      });
      runtime.set({ autoRunActive: false });
      return true;
    }

    async function waitBeforeAutoRunRetry(targetRun, totalRuns, nextAttemptRun, options = {}) {
      const {
        autoRunSkipFailures = false,
        roundSummaries = [],
        executionMode = 'full',
        importedAccounts = [],
        startStep = 1,
        endStep = 11,
        authorizationEmail = '',
      } = options;
      const fallbackThreadIntervalMinutes = normalizeAutoRunFallbackThreadIntervalMinutes(
        (await getState()).autoRunFallbackThreadIntervalMinutes
      );
      if (fallbackThreadIntervalMinutes <= 0) {
        return false;
      }

      await addLog(
        `线程间隔：等待 ${fallbackThreadIntervalMinutes} 分钟后开始第 ${targetRun}/${totalRuns} 轮第 ${nextAttemptRun} 次尝试。`,
        'info'
      );
      await persistAutoRunTimerPlan({
        kind: AUTO_RUN_TIMER_KIND_BEFORE_RETRY,
        fireAt: Date.now() + fallbackThreadIntervalMinutes * 60 * 1000,
        currentRun: targetRun,
        totalRuns,
        attemptRun: nextAttemptRun,
        autoRunSessionId: runtime.get().autoRunSessionId,
        autoRunSkipFailures,
        executionMode,
        importedAccounts,
        startStep,
        endStep,
        authorizationEmail,
        roundSummaries,
        countdownTitle: '线程间隔中',
        countdownNote: `第 ${targetRun}/${totalRuns} 轮第 ${nextAttemptRun} 次尝试即将开始`,
      }, {
        autoRunSkipFailures,
        autoRunRoundSummaries: serializeAutoRunRoundSummaries(totalRuns, roundSummaries),
        executionMode,
        importedAccounts,
        startStep,
        endStep,
        authorizationEmail,
      });
      runtime.set({ autoRunActive: false });
      return true;
    }

    async function handleAutoRunLoopUnhandledError(error) {
      const currentRuntime = runtime.get();
      console.error('Auto run loop crashed:', error);
      if (!isStopError(error)) {
        await addLog(`自动运行异常终止：${getErrorMessage(error) || '未知错误'}`, 'error');
      }

      runtime.set({ autoRunActive: false, autoRunSessionId: 0 });
      await broadcastAutoRunStatus('stopped', {
        currentRun: currentRuntime.autoRunCurrentRun,
        totalRuns: currentRuntime.autoRunTotalRuns,
        attemptRun: currentRuntime.autoRunAttemptRun,
        sessionId: 0,
      }, {
        autoRunSessionId: 0,
        autoRunTimerPlan: null,
        scheduledAutoRunPlan: null,
      });
      clearStopRequest();
    }

    function startAutoRunLoop(totalRuns, options = {}) {
      autoRunLoop(totalRuns, options).catch((error) => {
        handleAutoRunLoopUnhandledError(error).catch(() => {});
      });
    }

    async function autoRunLoop(totalRuns, options = {}) {
      let currentRuntime = runtime.get();
      if (currentRuntime.autoRunActive) {
        await addLog('自动运行已在进行中', 'warn');
        return;
      }

      let sessionId = Number.isInteger(options.autoRunSessionId) && options.autoRunSessionId > 0
        ? options.autoRunSessionId
        : 0;
      if (sessionId) {
        throwIfAutoRunSessionStopped(sessionId);
      } else {
        sessionId = createAutoRunSessionId();
      }

      clearStopRequest();
      runtime.set({
        autoRunActive: true,
        autoRunTotalRuns: totalRuns,
        autoRunCurrentRun: 0,
        autoRunAttemptRun: 0,
        autoRunSessionId: sessionId,
      });
      currentRuntime = runtime.get();

      const autoRunSkipFailures = Boolean(options.autoRunSkipFailures);
      const executionMode = normalizeExecutionMode(options.executionMode);
      const importedAccounts = normalizeImportedAccounts(options.importedAccounts);
      const executionStepRange = resolveExecutionStepRange(executionMode, options.startStep, options.endStep);
      const authorizationEmail = String(options.authorizationEmail || '').trim();
      const initialMode = options.mode === 'continue' ? 'continue' : 'restart';
      const resumeCurrentRun = Number.isInteger(options.resumeCurrentRun) && options.resumeCurrentRun > 0
        ? Math.min(totalRuns, options.resumeCurrentRun)
        : 1;
      const resumeAttemptRun = Number.isInteger(options.resumeAttemptRun) && options.resumeAttemptRun > 0
        ? Math.min(AUTO_RUN_MAX_RETRIES_PER_ROUND + 1, options.resumeAttemptRun)
        : 1;
      let continueCurrentOnFirstAttempt = initialMode === 'continue';
      let forceFreshTabsNextRun = false;
      let stoppedEarly = false;
      let parkedByTimer = false;
      const roundSummaries = buildAutoRunRoundSummaries(totalRuns, options.resumeRoundSummaries);

      if (continueCurrentOnFirstAttempt && resumeCurrentRun > 1) {
        for (let round = 1; round < resumeCurrentRun; round += 1) {
          const summary = roundSummaries[round - 1];
          if (summary.status === 'pending') {
            summary.status = 'success';
            if (!summary.attempts) {
              summary.attempts = 1;
            }
          }
        }
      }

      let successfulRuns = roundSummaries.filter((item) => item.status === 'success').length;
      const initialState = await getState();
      const initialPhase = continueCurrentOnFirstAttempt && getRunningWorkflowNodes(initialState).length
        ? 'waiting_step'
        : 'running';
      const showResumePosition = continueCurrentOnFirstAttempt || resumeCurrentRun > 1 || resumeAttemptRun > 1;

      await setState({
        autoRunSessionId: sessionId,
        autoRunSkipFailures,
        autoRunRoundSummaries: serializeAutoRunRoundSummaries(totalRuns, roundSummaries),
        executionMode,
        importedAccounts,
        startStep: executionStepRange.startStep,
        endStep: executionStepRange.endStep,
        authorizationEmail,
        ...getAutoRunStatusPayload(initialPhase, {
          currentRun: showResumePosition ? resumeCurrentRun : 0,
          totalRuns,
          attemptRun: showResumePosition ? resumeAttemptRun : 0,
          sessionId,
        }),
      });

      for (let targetRun = resumeCurrentRun; targetRun <= totalRuns; targetRun += 1) {
        const roundSummary = roundSummaries[targetRun - 1];
        let roundRecordAppended = false;
        const resumingCurrentRound = continueCurrentOnFirstAttempt && targetRun === resumeCurrentRun;
        let attemptRun = resumingCurrentRound ? resumeAttemptRun : 1;
        let reuseExistingProgress = resumingCurrentRound;
        const currentRoundState = await getState();
        const keepSameEmailUntilAddPhone = autoRunSkipFailures && shouldKeepCustomMailProviderPoolEmail(currentRoundState);
        const maxAttemptsForRound = autoRunSkipFailures
          ? (keepSameEmailUntilAddPhone ? Number.MAX_SAFE_INTEGER : AUTO_RUN_MAX_RETRIES_PER_ROUND + 1)
          : Math.max(1, attemptRun);

        while (attemptRun <= maxAttemptsForRound) {
          runtime.set({
            autoRunCurrentRun: targetRun,
            autoRunAttemptRun: attemptRun,
          });
          roundSummary.attempts = attemptRun;
          const defaultStartNodeId = typeof runAutoSequenceFromNode === 'function' ? 'open-chatgpt' : 1;
          let startNodeId = defaultStartNodeId;
          let useExistingProgress = false;

          if (reuseExistingProgress) {
            let currentState = await getState();
            if (getRunningWorkflowNodes(currentState).length) {
              currentState = await waitForRunningWorkflowNodesToFinish({
                currentRun: targetRun,
                totalRuns,
                attemptRun,
              });
            }
            const resumeNodeId = getFirstUnfinishedWorkflowNode(currentState);
            if (resumeNodeId && hasSavedWorkflowProgress(currentState)) {
              startNodeId = resumeNodeId;
              useExistingProgress = true;
            } else if (hasSavedWorkflowProgress(currentState)) {
              await addLog('检测到当前流程已处理完成，本轮将改为从首个节点重新开始。', 'info');
            }
          }

          if (!useExistingProgress) {
            const prevState = await getState();
            const keepSettings = {
              vpsUrl: prevState.vpsUrl,
              vpsPassword: prevState.vpsPassword,
              customPassword: prevState.customPassword,
              autoRunSkipFailures: prevState.autoRunSkipFailures,
              executionMode,
              importedAccounts,
              startStep: executionStepRange.startStep,
              endStep: executionStepRange.endStep,
              authorizationEmail,
              autoRunFallbackThreadIntervalMinutes: prevState.autoRunFallbackThreadIntervalMinutes,
              autoRunDelayEnabled: prevState.autoRunDelayEnabled,
              autoRunDelayMinutes: prevState.autoRunDelayMinutes,
              autoStepDelaySeconds: prevState.autoStepDelaySeconds,
              signupMethod: prevState.signupMethod,
              mailProvider: prevState.mailProvider,
              emailGenerator: prevState.emailGenerator,
              gmailBaseEmail: prevState.gmailBaseEmail,
              mail2925BaseEmail: prevState.mail2925BaseEmail,
              currentMail2925AccountId: prevState.currentMail2925AccountId,
              emailPrefix: prevState.emailPrefix,
              inbucketHost: prevState.inbucketHost,
              inbucketMailbox: prevState.inbucketMailbox,
              cloudflareDomain: prevState.cloudflareDomain,
              cloudflareDomains: prevState.cloudflareDomains,
              autoRunRoundSummaries: serializeAutoRunRoundSummaries(totalRuns, roundSummaries),
              autoRunSessionId: sessionId,
              tabRegistry: {},
              sourceLastUrls: {},
              ...getAutoRunStatusPayload('running', { currentRun: targetRun, totalRuns, attemptRun, sessionId }),
            };
            await resetState();
            await setState(keepSettings);
            deps.chrome.runtime.sendMessage({ type: 'AUTO_RUN_RESET' }).catch(() => { });
            await sleepWithStop(500);
          } else {
            await setState({
              autoRunSessionId: sessionId,
              autoRunSkipFailures,
              autoRunRoundSummaries: serializeAutoRunRoundSummaries(totalRuns, roundSummaries),
              executionMode,
              importedAccounts,
              startStep: executionStepRange.startStep,
              endStep: executionStepRange.endStep,
              authorizationEmail,
              ...getAutoRunStatusPayload('running', { currentRun: targetRun, totalRuns, attemptRun, sessionId }),
            });
          }

          if (forceFreshTabsNextRun) {
            await addLog(`上一轮尝试已放弃，当前开始第 ${targetRun}/${totalRuns} 轮第 ${attemptRun} 次尝试。`, 'warn');
            forceFreshTabsNextRun = false;
          }

          const appendRoundRecordIfNeeded = async (status, reason = '', errorLike = null) => {
            if (roundRecordAppended) {
              return;
            }

            if (typeof appendAccountRunRecord !== 'function') {
              return;
            }

            const recordState = await getState();
            const recordStatus = resolveAutoRunAccountRecordStatus(status, recordState, errorLike);
            const record = await appendAccountRunRecord(recordStatus, recordState, reason);
            if (record) {
              roundRecordAppended = true;
            }
          };

          try {
            throwIfAutoRunSessionStopped(sessionId);
            await broadcastAutoRunStatus('running', {
              currentRun: targetRun,
              totalRuns,
              attemptRun,
              sessionId,
            });

            if (!useExistingProgress && startNodeId === defaultStartNodeId && typeof ensureHotmailMailboxReadyForAutoRunRound === 'function') {
              await ensureHotmailMailboxReadyForAutoRunRound({
                targetRun,
                totalRuns,
                attemptRun,
                sessionId,
              });
            }

            await runAutoSequenceFromWorkflowNode(startNodeId, {
              targetRun,
              totalRuns,
              attemptRuns: attemptRun,
              continued: useExistingProgress,
              executionMode,
              importedAccounts,
              startStep: executionStepRange.startStep,
              endStep: executionStepRange.endStep,
              authorizationEmail,
            });

            // register_gpt 分段流程在步骤 6 提前结束，需主动收敛账号记录状态，覆盖前序 running。
            if (executionMode === 'register_gpt') {
              await appendRoundRecordIfNeeded('success', '注册GPT流程完成');
            }

            roundSummary.status = 'success';
            roundSummary.finalFailureReason = '';
            roundSummary.finalFailureReasonCode = '';
            successfulRuns += 1;
            await setState({
              autoRunRoundSummaries: serializeAutoRunRoundSummaries(totalRuns, roundSummaries),
            });
            await addLog(`=== 第 ${targetRun}/${totalRuns} 轮完成（第 ${attemptRun} 次尝试成功）===`, 'ok');
            break;
          } catch (err) {
            if (isStopError(err)) {
              stoppedEarly = true;
              await appendRoundRecordIfNeeded('stopped', getErrorMessage(err), err);
              await addLog(`第 ${targetRun}/${totalRuns} 轮已被用户停止`, 'warn');
              await broadcastAutoRunStatus('stopped', {
                currentRun: targetRun,
                totalRuns,
                attemptRun,
                sessionId: 0,
              });
              break;
            }

            const reason = getErrorMessage(err);
            appendRoundFailureReason(roundSummary, reason);
            const blockedByAddPhone = typeof isAddPhoneAuthFailure === 'function'
              && isAddPhoneAuthFailure(err);
            const blockedBySignupUserAlreadyExists = typeof isSignupUserAlreadyExistsFailure === 'function'
              && !keepSameEmailUntilAddPhone
              && isSignupUserAlreadyExistsFailure(err);
            const blockedByStep4Route405 = typeof isStep4Route405RecoveryLimitFailure === 'function'
              && isStep4Route405RecoveryLimitFailure(err);
            const blockedByGptmailUsageLimit = typeof isGptmailApiKeyUsageLimitError === 'function'
              && isGptmailApiKeyUsageLimitError(err);
            const canRetry = !blockedByAddPhone
              && !blockedBySignupUserAlreadyExists
              && !blockedByGptmailUsageLimit
              && autoRunSkipFailures
              && attemptRun < maxAttemptsForRound;

            await setState({
              autoRunRoundSummaries: serializeAutoRunRoundSummaries(totalRuns, roundSummaries),
            });

            if (blockedByAddPhone) {
              roundSummary.status = 'failed';
              setRoundFinalFailureReason(roundSummary, reason, 'ADD_PHONE_REQUIRED');
              await setState({
                autoRunRoundSummaries: serializeAutoRunRoundSummaries(totalRuns, roundSummaries),
              });
              await appendRoundRecordIfNeeded('failed', reason, err);
              cancelPendingCommands('当前轮因认证流程进入 add-phone 已终止。');
              await broadcastStopToContentScripts();

              await addLog('步骤9：触发 add-phone/手机号验证。', 'warn');
              forceFreshTabsNextRun = true;
              break;
            }

            if (blockedBySignupUserAlreadyExists) {
              // register_gpt 模式命中 user_already_exists 时，按需求直接结束当前轮并进入下一轮，
              // 不受 autoRunSkipFailures 开关影响；full/其它模式维持原有开关行为。
              const shouldContinueForRegisterGpt = executionMode === 'register_gpt';
              const shouldStopAutoRun = !autoRunSkipFailures && !shouldContinueForRegisterGpt;
              roundSummary.status = 'failed';
              setRoundFinalFailureReason(roundSummary, reason);
              await setState({
                autoRunRoundSummaries: serializeAutoRunRoundSummaries(totalRuns, roundSummaries),
              });
              await appendRoundRecordIfNeeded('failed', reason, err);
              cancelPendingCommands('当前轮因 user_already_exists 已终止。');
              await broadcastStopToContentScripts();
              await addLog('触发 user_already_exists。', 'warn');
              if (shouldStopAutoRun) {
                stoppedEarly = true;
                await broadcastAutoRunStatus('stopped', {
                  currentRun: targetRun,
                  totalRuns,
                  attemptRun,
                  sessionId: 0,
                });
                break;
              }
              forceFreshTabsNextRun = true;
              break;
            }

            if (blockedByGptmailUsageLimit) {
              roundSummary.status = 'failed';
              setRoundFinalFailureReason(roundSummary, reason);
              await setState({
                autoRunRoundSummaries: serializeAutoRunRoundSummaries(totalRuns, roundSummaries),
              });
              await appendRoundRecordIfNeeded('failed', reason, err);
              cancelPendingCommands('当前轮因 GPTMail API Key 使用额度耗尽已停止。');
              await broadcastStopToContentScripts();
              await markRunningWorkflowNodesStopped();
              runtime.set({ autoRunActive: false, autoRunSessionId: 0 });
              await addLog('GPTMail API Key 使用额度已耗尽，自动流程已停止。请更换 API Key 或处理额度后再重新开始。', 'warn');
              stoppedEarly = true;
              await broadcastAutoRunStatus('stopped', {
                currentRun: targetRun,
                totalRuns,
                attemptRun,
                sessionId: 0,
              }, {
                autoRunSessionId: 0,
                autoRunTimerPlan: null,
                scheduledAutoRunPlan: null,
              });
              break;
            }

            if (blockedByStep4Route405) {
              roundSummary.status = 'failed';
              setRoundFinalFailureReason(roundSummary, reason);
              await setState({
                autoRunRoundSummaries: serializeAutoRunRoundSummaries(totalRuns, roundSummaries),
              });
              await appendRoundRecordIfNeeded('failed', reason, err);
              cancelPendingCommands('当前轮因步骤 4 连续 405 错误已终止。');
              await broadcastStopToContentScripts();
              if (!autoRunSkipFailures) {
                await addLog(
                  `第 ${targetRun}/${totalRuns} 轮步骤 4 连续 405 恢复失败，自动重试未开启，当前自动运行将停止。`,
                  'warn'
                );
                stoppedEarly = true;
                await broadcastAutoRunStatus('stopped', {
                  currentRun: targetRun,
                  totalRuns,
                  attemptRun,
                  sessionId: 0,
                });
                break;
              }

              await addLog(`第 ${targetRun}/${totalRuns} 轮步骤 4 连续 405 恢复失败，本轮将直接失败并跳过剩余重试。`, 'warn');
              await addLog(
                targetRun < totalRuns
                  ? `第 ${targetRun}/${totalRuns} 轮因步骤 4 连续 405 提前结束，自动流程将继续下一轮。`
                  : `第 ${targetRun}/${totalRuns} 轮因步骤 4 连续 405 提前结束，已无后续轮次，本次自动运行结束。`,
                'warn'
              );
              forceFreshTabsNextRun = true;
              break;
            }

            if (canRetry) {
              const retryIndex = attemptRun;
              if (isRestartCurrentAttemptError(err)) {
                await addLog(`第 ${targetRun}/${totalRuns} 轮第 ${attemptRun} 次尝试需要整轮重开：${reason}`, 'warn');
              } else {
                await addLog(`第 ${targetRun}/${totalRuns} 轮第 ${attemptRun} 次尝试失败：${reason}`, 'error');
              }
              cancelPendingCommands('当前尝试已放弃。');
              await broadcastStopToContentScripts();
              await broadcastAutoRunStatus('retrying', {
                currentRun: targetRun,
                totalRuns,
                attemptRun,
                sessionId,
              });
              forceFreshTabsNextRun = true;
              await addLog(
                keepSameEmailUntilAddPhone
                  ? `自动重试：${Math.round(AUTO_RUN_RETRY_DELAY_MS / 1000)} 秒后继续使用当前邮箱，开始第 ${targetRun}/${totalRuns} 轮第 ${attemptRun + 1} 次尝试。`
                  : `自动重试：${Math.round(AUTO_RUN_RETRY_DELAY_MS / 1000)} 秒后开始第 ${targetRun}/${totalRuns} 轮第 ${attemptRun + 1} 次尝试（第 ${retryIndex}/${AUTO_RUN_MAX_RETRIES_PER_ROUND} 次重试）。`,
                'warn'
              );
              try {
                await sleepWithStop(AUTO_RUN_RETRY_DELAY_MS);
              } catch (sleepError) {
                if (isStopError(sleepError)) {
                  stoppedEarly = true;
                  await appendRoundRecordIfNeeded('stopped', getErrorMessage(sleepError), sleepError);
                  await addLog(`第 ${targetRun}/${totalRuns} 轮已被用户停止`, 'warn');
                  await broadcastAutoRunStatus('stopped', {
                    currentRun: targetRun,
                    totalRuns,
                    attemptRun,
                    sessionId: 0,
                  });
                  break;
                }
                throw sleepError;
              }
              try {
                const parkedForRetry = await waitBeforeAutoRunRetry(targetRun, totalRuns, attemptRun + 1, {
                  autoRunSkipFailures,
                  roundSummaries,
                  executionMode,
                  importedAccounts,
                  startStep: executionStepRange.startStep,
                  endStep: executionStepRange.endStep,
                  authorizationEmail,
                });
                if (parkedForRetry) {
                  parkedByTimer = true;
                  break;
                }
              } catch (sleepError) {
                if (isStopError(sleepError)) {
                  stoppedEarly = true;
                  await appendRoundRecordIfNeeded('stopped', getErrorMessage(sleepError), sleepError);
                  await addLog(`第 ${targetRun}/${totalRuns} 轮已被用户停止`, 'warn');
                  await broadcastAutoRunStatus('stopped', {
                    currentRun: targetRun,
                    totalRuns,
                    attemptRun,
                    sessionId: 0,
                  });
                  break;
                }
                throw sleepError;
              }
              attemptRun += 1;
              reuseExistingProgress = false;
              continue;
            }

            roundSummary.status = 'failed';
            setRoundFinalFailureReason(roundSummary, reason);
            await setState({
              autoRunRoundSummaries: serializeAutoRunRoundSummaries(totalRuns, roundSummaries),
            });
            await appendRoundRecordIfNeeded('failed', reason, err);
            if (!autoRunSkipFailures) {
              cancelPendingCommands('当前轮执行失败。');
              await broadcastStopToContentScripts();
              await addLog('自动重试未开启，自动运行将在当前失败后停止。', 'warn');
              stoppedEarly = true;
              await broadcastAutoRunStatus('stopped', {
                currentRun: targetRun,
                totalRuns,
                attemptRun,
                sessionId: 0,
              });
              break;
            }
            await addLog(`第 ${targetRun}/${totalRuns} 轮最终失败：${reason}`, 'error');
            await addLog(
              targetRun < totalRuns
                ? `第 ${targetRun}/${totalRuns} 轮已达到 ${AUTO_RUN_MAX_RETRIES_PER_ROUND} 次重试上限，继续下一轮。`
                : `第 ${targetRun}/${totalRuns} 轮已达到 ${AUTO_RUN_MAX_RETRIES_PER_ROUND} 次重试上限，本次自动运行结束。`,
              'warn'
            );
            cancelPendingCommands('当前轮已达到重试上限。');
            await broadcastStopToContentScripts();
            forceFreshTabsNextRun = true;
            break;
          } finally {
            reuseExistingProgress = false;
            continueCurrentOnFirstAttempt = false;
          }
        }

        if (stoppedEarly || parkedByTimer) {
          break;
        }

        try {
          const parkedForNextRound = await waitBetweenAutoRunRounds(targetRun, totalRuns, roundSummary, {
            autoRunSkipFailures,
            roundSummaries,
            executionMode,
            importedAccounts,
            startStep: executionStepRange.startStep,
            endStep: executionStepRange.endStep,
            authorizationEmail,
          });
          if (parkedForNextRound) {
            parkedByTimer = true;
            break;
          }
        } catch (sleepError) {
          if (isStopError(sleepError)) {
            stoppedEarly = true;
            await addLog(`第 ${targetRun}/${totalRuns} 轮已被用户停止`, 'warn');
            await broadcastAutoRunStatus('stopped', {
              currentRun: targetRun,
              totalRuns,
              attemptRun: runtime.get().autoRunAttemptRun,
              sessionId: 0,
            });
            break;
          }
          throw sleepError;
        }
      }

      if (parkedByTimer) {
        runtime.set({ autoRunActive: false });
        clearStopRequest();
        return;
      }

      await setState({
        autoRunRoundSummaries: serializeAutoRunRoundSummaries(totalRuns, roundSummaries),
      });
      await logAutoRunFinalSummary(totalRuns, roundSummaries);

      const finalRuntime = runtime.get();
      if (deps.getStopRequested() || stoppedEarly) {
        await addLog(`=== 已停止，完成 ${successfulRuns}/${finalRuntime.autoRunTotalRuns} 轮 ===`, 'warn');
        await broadcastAutoRunStatus('stopped', {
          currentRun: finalRuntime.autoRunCurrentRun,
          totalRuns: finalRuntime.autoRunTotalRuns,
          attemptRun: finalRuntime.autoRunAttemptRun,
          sessionId: 0,
        });
      } else {
        await addLog(`=== 全部 ${finalRuntime.autoRunTotalRuns} 轮已执行完成，成功 ${successfulRuns} 轮 ===`, 'ok');
        await broadcastAutoRunStatus('complete', {
          currentRun: finalRuntime.autoRunTotalRuns,
          totalRuns: finalRuntime.autoRunTotalRuns,
          attemptRun: finalRuntime.autoRunAttemptRun,
          sessionId: 0,
        });
      }
      runtime.set({ autoRunActive: false, autoRunSessionId: 0 });
      const afterRuntime = runtime.get();
      await setState({
        autoRunSessionId: 0,
        autoRunRoundSummaries: serializeAutoRunRoundSummaries(totalRuns, roundSummaries),
        executionMode,
        importedAccounts,
        startStep: executionStepRange.startStep,
        endStep: executionStepRange.endStep,
        authorizationEmail,
        autoRunTimerPlan: null,
        scheduledAutoRunPlan: null,
        ...getAutoRunStatusPayload(deps.getStopRequested() || stoppedEarly ? 'stopped' : 'complete', {
          currentRun: deps.getStopRequested() || stoppedEarly ? afterRuntime.autoRunCurrentRun : afterRuntime.autoRunTotalRuns,
          totalRuns: afterRuntime.autoRunTotalRuns,
          attemptRun: afterRuntime.autoRunAttemptRun,
          sessionId: 0,
        }),
      });
      clearStopRequest();
    }

    return {
      autoRunLoop,
      buildAutoRunRoundSummaries,
      createAutoRunRoundSummary,
      formatAutoRunFailureReasons,
      getAutoRunRoundRetryCount,
      handleAutoRunLoopUnhandledError,
      logAutoRunFinalSummary,
      normalizeAutoRunRoundSummary,
      resolveAutoRunAccountRecordStatus,
      serializeAutoRunRoundSummaries,
      skipAutoRunCountdown,
      startAutoRunLoop,
      waitBetweenAutoRunRounds,
      waitBeforeAutoRunRetry,
    };
  }

  return {
    createAutoRunController,
  };
});
