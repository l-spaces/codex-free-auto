(function attachStepDefinitions(root, factory) {
  root.MultiPageStepDefinitions = factory();
})(typeof self !== 'undefined' ? self : globalThis, function createStepDefinitionsModule() {
  const rootScope = typeof self !== 'undefined' ? self : globalThis;
  const flowsIndexApi = rootScope.MultiPageFlowsIndex || {};

  const DEFAULT_ACTIVE_FLOW_ID = 'openai';
  const SIGNUP_METHOD_EMAIL = 'email';
  const SIGNUP_METHOD_PHONE = 'phone';

  function normalizeRegisteredFlowIds(values = []) {
    if (!Array.isArray(values)) {
      return [];
    }
    const seen = new Set();
    return values
      .map((value) => String(value || '').trim().toLowerCase())
      .filter((value) => {
        if (!value || seen.has(value)) {
          return false;
        }
        seen.add(value);
        return true;
      });
  }

  function getRegisteredFlowIds() {
    return normalizeRegisteredFlowIds(
      typeof flowsIndexApi.getRegisteredFlowIds === 'function'
        ? flowsIndexApi.getRegisteredFlowIds()
        : [DEFAULT_ACTIVE_FLOW_ID]
    ).filter((flowId) => Boolean(getFlowWorkflow(flowId)));
  }

  function getFlowWorkflow(flowId) {
    return typeof flowsIndexApi.getFlowWorkflow === 'function'
      ? flowsIndexApi.getFlowWorkflow(flowId)
      : null;
  }

  function hasFlow(flowId) {
    return Boolean(getFlowWorkflow(flowId));
  }

  function normalizeActiveFlowId(value = '', fallback = DEFAULT_ACTIVE_FLOW_ID) {
    const normalized = String(value || '').trim().toLowerCase();
    if (hasFlow(normalized)) {
      return normalized;
    }
    const fallbackValue = String(fallback || '').trim().toLowerCase();
    if (hasFlow(fallbackValue)) {
      return fallbackValue;
    }
    return getRegisteredFlowIds()[0] || DEFAULT_ACTIVE_FLOW_ID;
  }

  function hasExplicitActiveFlowId(options = {}) {
    return Boolean(
      options
      && typeof options === 'object'
      && Object.prototype.hasOwnProperty.call(options, 'activeFlowId')
      && String(options.activeFlowId || '').trim()
    );
  }

  function getFlowDefinitionBuilder(options = {}) {
    const rawFlowId = String(options?.activeFlowId || '').trim().toLowerCase();
    if (hasExplicitActiveFlowId(options) && rawFlowId && !hasFlow(rawFlowId)) {
      return {
        flowId: rawFlowId,
        builder: null,
      };
    }
    const flowId = normalizeActiveFlowId(rawFlowId, DEFAULT_ACTIVE_FLOW_ID);
    return {
      flowId,
      builder: getFlowWorkflow(flowId),
    };
  }

  function cloneSteps(steps = [], options = {}, flowId = DEFAULT_ACTIVE_FLOW_ID) {
    const { builder } = getFlowDefinitionBuilder({ activeFlowId: flowId });
    return steps.map((step) => ({
      ...step,
      flowId,
      title: builder?.resolveStepTitle ? builder.resolveStepTitle(step, options) : step.title,
    }));
  }

  function cloneNodes(steps = [], options = {}, flowId = DEFAULT_ACTIVE_FLOW_ID) {
    const { builder } = getFlowDefinitionBuilder({ activeFlowId: flowId });
    return steps.map((step) => ({
      nodeId: String(step.key || '').trim(),
      flowId,
      title: builder?.resolveStepTitle ? builder.resolveStepTitle(step, options) : step.title,
      displayOrder: Number.isFinite(Number(step.id)) ? Number(step.id) : Number(step.order),
      nodeType: 'task',
      sourceId: step.sourceId || '',
      driverId: step.driverId || '',
      executeKey: String(step.key || '').trim(),
      command: String(step.command || step.key || '').trim(),
      mailRuleId: String(step.mailRuleId || '').trim(),
      next: Array.isArray(step.next) ? [...step.next] : [],
      retryPolicy: step.retryPolicy && typeof step.retryPolicy === 'object' ? { ...step.retryPolicy } : {},
      recoveryPolicy: step.recoveryPolicy && typeof step.recoveryPolicy === 'object' ? { ...step.recoveryPolicy } : {},
      ui: step.ui && typeof step.ui === 'object' ? { ...step.ui } : {},
    })).filter((node) => Boolean(node.nodeId));
  }

  function getSteps(options = {}) {
    const { flowId, builder } = getFlowDefinitionBuilder(options);
    if (!builder?.getModeStepDefinitions) {
      return [];
    }
    return cloneSteps(builder.getModeStepDefinitions(options), options, flowId);
  }

  function linkLinearNodes(nodes = []) {
    return nodes.map((node, index) => ({
      ...node,
      next: Array.isArray(node.next) && node.next.length
        ? [...node.next]
        : (nodes[index + 1]?.nodeId ? [nodes[index + 1].nodeId] : []),
    }));
  }

  function getNodes(options = {}) {
    const { flowId, builder } = getFlowDefinitionBuilder(options);
    if (!builder?.getModeStepDefinitions) {
      return [];
    }
    return linkLinearNodes(cloneNodes(builder.getModeStepDefinitions(options), options, flowId));
  }

  function getAllSteps(options = {}) {
    const { flowId, builder } = getFlowDefinitionBuilder(options);
    if (!builder?.getAllSteps) {
      return [];
    }
    return cloneSteps(builder.getAllSteps(options), options, flowId);
  }

  function getAllNodes(options = {}) {
    const { flowId, builder } = getFlowDefinitionBuilder(options);
    if (!builder?.getAllSteps) {
      return [];
    }
    return cloneNodes(builder.getAllSteps(options), options, flowId)
      .sort((left, right) => {
        if (left.displayOrder !== right.displayOrder) {
          return left.displayOrder - right.displayOrder;
        }
        return left.nodeId.localeCompare(right.nodeId);
      });
  }

  function getStepIds(options = {}) {
    return getSteps(options)
      .map((step) => Number(step.id))
      .filter(Number.isFinite)
      .sort((left, right) => left - right);
  }

  function getNodeIds(options = {}) {
    return getNodes(options).map((node) => node.nodeId);
  }

  function getLastStepId(options = {}) {
    const ids = getStepIds(options);
    return ids[ids.length - 1] || 0;
  }

  function getStepById(id, options = {}) {
    const numericId = Number(id);
    const { flowId, builder } = getFlowDefinitionBuilder(options);
    if (!builder?.getModeStepDefinitions) {
      return null;
    }
    const match = builder.getModeStepDefinitions(options).find((step) => step.id === numericId);
    return match ? cloneSteps([match], options, flowId)[0] : null;
  }

  function getNodeById(nodeId, options = {}) {
    const normalizedNodeId = String(nodeId || '').trim();
    if (!normalizedNodeId) {
      return null;
    }
    return getNodes(options).find((node) => node.nodeId === normalizedNodeId) || null;
  }

  function getNodeByDisplayOrder(displayOrder, options = {}) {
    const normalizedOrder = Number(displayOrder);
    if (!Number.isFinite(normalizedOrder)) {
      return null;
    }
    return getNodes(options).find((node) => node.displayOrder === normalizedOrder) || null;
  }

  function getWorkflow(options = {}) {
    const { flowId } = getFlowDefinitionBuilder(options);
    const nodes = getNodes(options);
    return {
      flowId,
      workflowVersion: 1,
      nodes,
      nodeIds: nodes.map((node) => node.nodeId),
    };
  }

  const defaultWorkflowBuilder = getFlowWorkflow(DEFAULT_ACTIVE_FLOW_ID);
  const STEP_DEFINITIONS = cloneSteps(
    defaultWorkflowBuilder?.getVariantStepDefinitions
      ? defaultWorkflowBuilder.getVariantStepDefinitions('normal')
      : (defaultWorkflowBuilder?.getModeStepDefinitions?.({ activeFlowId: DEFAULT_ACTIVE_FLOW_ID }) || []),
    {},
    DEFAULT_ACTIVE_FLOW_ID
  );
  const NORMAL_STEP_DEFINITIONS = STEP_DEFINITIONS;

  return {
    DEFAULT_ACTIVE_FLOW_ID,
    NORMAL_STEP_DEFINITIONS,
    SIGNUP_METHOD_EMAIL,
    SIGNUP_METHOD_PHONE,
    STEP_DEFINITIONS,
    getAllNodes,
    getAllSteps,
    getLastStepId,
    getNodeByDisplayOrder,
    getNodeById,
    getNodeIds,
    getNodes,
    getRegisteredFlowIds,
    getStepById,
    getStepIds,
    getSteps,
    getWorkflow,
    hasFlow,
    normalizeActiveFlowId,
  };
});
