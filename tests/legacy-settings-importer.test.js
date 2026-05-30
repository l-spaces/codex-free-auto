const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { readFlowRegistryBundle } = require('./helpers/script-bundles.js');

const flowRegistrySource = readFlowRegistryBundle();
const settingsSchemaSource = fs.readFileSync('core/flow-kernel/settings-schema.js', 'utf8');
const settingsImporterSource = fs.readFileSync('imports/legacy/settings-importer.js', 'utf8');

function loadImporterApi() {
  const scope = {};
  return new Function('self', `
${flowRegistrySource}
${settingsSchemaSource}
${settingsImporterSource}
return {
  flowRegistry: self.MultiPageFlowRegistry,
  settingsSchema: self.MultiPageSettingsSchema,
  importer: self.MultiPageLegacySettingsImporter,
};
`)(scope);
}


test('legacy settings importer preserves canonical settingsState without reintroducing old fields', () => {
  const { flowRegistry, settingsSchema, importer } = loadImporterApi();
  const schema = settingsSchema.createSettingsSchema({ flowRegistry });
  const importerApi = importer.createSettingsImporter({
    flowRegistry,
    settingsSchemaApi: schema,
  });
  const canonicalState = schema.normalizeSettingsState({
    settingsState: schema.buildDefaultSettingsState(),
  });

  const imported = importerApi.importSettings({
    settingsSchemaVersion: 5,
    settingsState: canonicalState,
  });

  assert.deepEqual(imported.settingsState, canonicalState);
  assert.deepEqual(imported.legacyFieldHits, []);
});
