const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('background node registry preserves node metadata even before an executor is registered', () => {
  const source = fs.readFileSync('core/flow-kernel/step-registry.js', 'utf8');
  const api = new Function('self', `${source}; return self.MultiPageBackgroundStepRegistry;`)({});
  const registry = api.createNodeRegistry([
    {
      flowId: 'openai',
      nodeId: 'open-chatgpt',
      displayOrder: 1,
      executeKey: 'open-chatgpt',
      title: '打开注册页',
    },
  ]);

  const node = registry.getNodeDefinition('open-chatgpt');

  assert.equal(node.flowId, 'openai');
  assert.equal(node.displayOrder, 1);
  assert.equal(node.title, '打开注册页');
  assert.throws(
    () => registry.executeNode('open-chatgpt', {}),
    /Missing node executor: open-chatgpt/
  );
});

test('background node registry executes registered nodes in display order', async () => {
  const source = fs.readFileSync('core/flow-kernel/step-registry.js', 'utf8');
  const api = new Function('self', `${source}; return self.MultiPageBackgroundStepRegistry;`)({});
  const events = [];
  const registry = api.createNodeRegistry([
    {
      flowId: 'openai',
      displayOrder: 2,
      nodeId: 'submit-signup-email',
      executeKey: 'submit-signup-email',
      title: 'Submit signup email',
      execute: async (state) => {
        events.push({ type: 'execute', state });
      },
    },
    {
      flowId: 'openai',
      displayOrder: 1,
      nodeId: 'open-chatgpt',
      executeKey: 'open-chatgpt',
      title: 'Open ChatGPT',
    },
  ]);

  assert.deepStrictEqual(
    registry.getOrderedNodes().map((node) => node.nodeId),
    ['open-chatgpt', 'submit-signup-email']
  );

  await registry.executeNode('submit-signup-email', { activeFlowId: 'openai' });

  assert.deepStrictEqual(events, [{ type: 'execute', state: { activeFlowId: 'openai' } }]);
});
