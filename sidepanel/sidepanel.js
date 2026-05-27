// sidepanel/sidepanel.js — Side Panel logic

const STATUS_ICONS = {
  pending: '',
  running: '',
  completed: '\u2713',  // ✓
  failed: '\u2717',     // ✗
  stopped: '\u25A0',    // ■
  manual_completed: '跳',
  skipped: '跳',
};

const logArea = document.getElementById('log-area');
const currentRegistrationEmail = document.getElementById('current-registration-email');
const btnOpenAccountRecords = document.getElementById('btn-open-account-records');
const accountRecordsOverlay = document.getElementById('account-records-overlay');
const accountRecordsMeta = document.getElementById('account-records-meta');
const accountRecordsStats = document.getElementById('account-records-stats');
const accountRecordsList = document.getElementById('account-records-list');
const accountRecordsPageLabel = document.getElementById('account-records-page-label');
const btnAccountRecordsPrev = document.getElementById('btn-account-records-prev');
const btnAccountRecordsNext = document.getElementById('btn-account-records-next');
const btnCloseAccountRecords = document.getElementById('btn-close-account-records');
const btnClearAccountRecords = document.getElementById('btn-clear-account-records');
const btnToggleAccountRecordsSelection = document.getElementById('btn-toggle-account-records-selection');
const btnDeleteSelectedAccountRecords = document.getElementById('btn-delete-selected-account-records');
const settingsCard = document.getElementById('settings-card');
const displayOauthUrl = document.getElementById('display-oauth-url');
const displayLocalhostUrl = document.getElementById('display-localhost-url');
const displayStatus = document.getElementById('display-status');
const statusBar = document.getElementById('status-bar');
const inputEmail = document.getElementById('input-email');
const inputSignupPhone = null;
const inputPassword = document.getElementById('input-password');
const btnToggleVpsUrl = document.getElementById('btn-toggle-vps-url');
const btnToggleVpsPassword = document.getElementById('btn-toggle-vps-password');
const btnFetchEmail = document.getElementById('btn-fetch-email');
const btnTogglePassword = document.getElementById('btn-toggle-password');
const btnSaveSettings = document.getElementById('btn-save-settings');
const btnStop = document.getElementById('btn-stop');
const btnReset = document.getElementById('btn-reset');
const stepsProgress = document.getElementById('steps-progress');
const btnAutoRun = document.getElementById('btn-auto-run');
const btnAutoContinue = document.getElementById('btn-auto-continue');
const autoContinueBar = document.getElementById('auto-continue-bar');
const autoScheduleBar = document.getElementById('auto-schedule-bar');
const autoScheduleTitle = document.getElementById('auto-schedule-title');
const autoScheduleMeta = document.getElementById('auto-schedule-meta');
const btnAutoRunNow = document.getElementById('btn-auto-run-now');
const btnAutoCancelSchedule = document.getElementById('btn-auto-cancel-schedule');
const btnClearLog = document.getElementById('btn-clear-log');
const configMenuShell = document.getElementById('config-menu-shell');
const btnConfigMenu = document.getElementById('btn-config-menu');
const configMenu = document.getElementById('config-menu');
const btnExportSettings = document.getElementById('btn-export-settings');
const btnImportSettings = document.getElementById('btn-import-settings');
const inputImportSettingsFile = document.getElementById('input-import-settings-file');
const selectFlow = document.getElementById('select-flow');
const btnExportAccounts = document.getElementById('btn-export-accounts');
const btnImportAccounts = document.getElementById('btn-import-accounts');
const accountWriteControl = document.getElementById('account-write-control');
const labelWriteAccounts = document.getElementById('label-write-accounts');
// 写入账号开关：开启时选择目录，关闭时阻断后续账号写入。
const inputWriteAccountsEnabled = document.getElementById('input-write-accounts-enabled');
const selectPanelMode = document.getElementById('select-panel-mode');
const rowVpsUrl = document.getElementById('row-vps-url');
const inputVpsUrl = document.getElementById('input-vps-url');
const rowVpsPassword = document.getElementById('row-vps-password');
const inputVpsPassword = document.getElementById('input-vps-password');
const rowLocalCpaStep9Mode = document.getElementById('row-local-cpa-step9-mode');
const localCpaStep9ModeButtons = Array.from(document.querySelectorAll('[data-local-cpa-step9-mode]'));
const rowSub2ApiUrl = document.getElementById('row-sub2api-url');
const inputSub2ApiUrl = document.getElementById('input-sub2api-url');
const rowSub2ApiEmail = document.getElementById('row-sub2api-email');
const inputSub2ApiEmail = document.getElementById('input-sub2api-email');
const rowSub2ApiPassword = document.getElementById('row-sub2api-password');
const inputSub2ApiPassword = document.getElementById('input-sub2api-password');
const rowSub2ApiGroup = document.getElementById('row-sub2api-group');
const inputSub2ApiGroup = document.getElementById('input-sub2api-group');
const sub2ApiGroupPickerRoot = document.getElementById('sub2api-group-picker');
const btnSub2ApiGroupMenu = document.getElementById('btn-sub2api-group-menu');
const sub2ApiGroupCurrent = document.getElementById('sub2api-group-current');
const sub2ApiGroupMenu = document.getElementById('sub2api-group-menu');
const btnAddSub2ApiGroup = document.getElementById('btn-add-sub2api-group');
const rowSub2ApiAccountPriority = document.getElementById('row-sub2api-account-priority');
const inputSub2ApiAccountPriority = document.getElementById('input-sub2api-account-priority');
const rowSub2ApiDefaultProxy = document.getElementById('row-sub2api-default-proxy');
const inputSub2ApiDefaultProxy = document.getElementById('input-sub2api-default-proxy');
const rowCodex2ApiUrl = document.getElementById('row-codex2api-url');
const inputCodex2ApiUrl = document.getElementById('input-codex2api-url');
const rowCodex2ApiAdminKey = document.getElementById('row-codex2api-admin-key');
const inputCodex2ApiAdminKey = document.getElementById('input-codex2api-admin-key');
const rowCustomPassword = document.getElementById('row-custom-password');
const selectMailProvider = document.getElementById('select-mail-provider');
const btnMailLogin = document.getElementById('btn-mail-login');
const rowCustomMailProviderPool = document.getElementById('row-custom-mail-provider-pool');
const inputCustomMailProviderPool = document.getElementById('input-custom-mail-provider-pool');
const rowMail2925Mode = document.getElementById('row-mail-2925-mode');
const rowMail2925PoolSettings = document.getElementById('row-mail2925-pool-settings');
const mail2925ModeButtons = Array.from(document.querySelectorAll('[data-mail2925-mode]'));
const rowEmailGenerator = document.getElementById('row-email-generator');
const selectEmailGenerator = document.getElementById('select-email-generator');
const rowDuckApiAuthorization = document.getElementById('row-duck-api-authorization');
const inputDuckApiAuthorization = document.getElementById('input-duck-api-authorization');
const rowCustomEmailPool = document.getElementById('row-custom-email-pool');
const inputCustomEmailPool = document.getElementById('input-custom-email-pool');
const btnCustomEmailPoolRefresh = document.getElementById('btn-custom-email-pool-refresh');
const btnCustomEmailPoolClearUsed = document.getElementById('btn-custom-email-pool-clear-used');
const btnCustomEmailPoolDeleteAll = document.getElementById('btn-custom-email-pool-delete-all');
const inputCustomEmailPoolImport = document.getElementById('input-custom-email-pool-import');
const btnCustomEmailPoolImport = document.getElementById('btn-custom-email-pool-import');
const customEmailPoolSummary = document.getElementById('custom-email-pool-summary');
const inputCustomEmailPoolSearch = document.getElementById('input-custom-email-pool-search');
const selectCustomEmailPoolFilter = document.getElementById('select-custom-email-pool-filter');
const checkboxCustomEmailPoolSelectAll = document.getElementById('checkbox-custom-email-pool-select-all');
const customEmailPoolSelectionSummary = document.getElementById('custom-email-pool-selection-summary');
const btnCustomEmailPoolBulkUsed = document.getElementById('btn-custom-email-pool-bulk-used');
const btnCustomEmailPoolBulkUnused = document.getElementById('btn-custom-email-pool-bulk-unused');
const btnCustomEmailPoolBulkEnable = document.getElementById('btn-custom-email-pool-bulk-enable');
const btnCustomEmailPoolBulkDisable = document.getElementById('btn-custom-email-pool-bulk-disable');
const btnCustomEmailPoolBulkDelete = document.getElementById('btn-custom-email-pool-bulk-delete');
const customEmailPoolList = document.getElementById('custom-email-pool-list');
const rowTempEmailBaseUrl = document.getElementById('row-temp-email-base-url');
const inputTempEmailBaseUrl = document.getElementById('input-temp-email-base-url');
const rowTempEmailAdminAuth = document.getElementById('row-temp-email-admin-auth');
const inputTempEmailAdminAuth = document.getElementById('input-temp-email-admin-auth');
const rowTempEmailCustomAuth = document.getElementById('row-temp-email-custom-auth');
const inputTempEmailCustomAuth = document.getElementById('input-temp-email-custom-auth');
const rowTempEmailLookupMode = document.getElementById('row-temp-email-lookup-mode');
const tempEmailLookupModeButtons = Array.from(document.querySelectorAll('[data-temp-email-lookup-mode]'));
const rowTempEmailReceiveMailbox = document.getElementById('row-temp-email-receive-mailbox');
const inputTempEmailReceiveMailbox = document.getElementById('input-temp-email-receive-mailbox');
const rowTempEmailRandomSubdomainToggle = document.getElementById('row-temp-email-random-subdomain-toggle');
const inputTempEmailUseRandomSubdomain = document.getElementById('input-temp-email-use-random-subdomain');
const rowTempEmailDomain = document.getElementById('row-temp-email-domain');
const selectTempEmailDomain = document.getElementById('select-temp-email-domain');
const tempEmailDomainPickerRoot = document.getElementById('temp-email-domain-picker');
const btnTempEmailDomainMenu = document.getElementById('btn-temp-email-domain-menu');
const tempEmailDomainCurrent = document.getElementById('temp-email-domain-current');
const tempEmailDomainMenu = document.getElementById('temp-email-domain-menu');
const inputTempEmailDomain = document.getElementById('input-temp-email-domain');
const btnTempEmailDomainMode = document.getElementById('btn-temp-email-domain-mode');
const rowTempEmailFixedMailbox = document.getElementById('row-temp-email-fixed-mailbox');
const inputTempEmailFixedMailbox = document.getElementById('input-temp-email-fixed-mailbox');
const cloudflareTempEmailSection = document.getElementById('cloudflare-temp-email-section');
const btnCloudflareTempEmailGithub = document.getElementById('btn-cloudflare-temp-email-github');
const cloudMailSection = document.getElementById('cloud-mail-section');
const rowCloudMailBaseUrl = document.getElementById('row-cloud-mail-base-url');
const rowCloudMailAdminEmail = document.getElementById('row-cloud-mail-admin-email');
const rowCloudMailAdminPassword = document.getElementById('row-cloud-mail-admin-password');
const rowCloudMailReceiveMailbox = document.getElementById('row-cloud-mail-receive-mailbox');
const rowCloudMailDomain = document.getElementById('row-cloud-mail-domain');
const inputCloudMailBaseUrl = document.getElementById('input-cloud-mail-base-url');
const inputCloudMailAdminEmail = document.getElementById('input-cloud-mail-admin-email');
const inputCloudMailAdminPassword = document.getElementById('input-cloud-mail-admin-password');
const inputCloudMailReceiveMailbox = document.getElementById('input-cloud-mail-receive-mailbox');
const inputCloudMailDomain = document.getElementById('input-cloud-mail-domain');
const yydsMailSection = document.getElementById('yyds-mail-section');
const inputYydsMailApiKey = document.getElementById('input-yyds-mail-api-key');
const inputYydsMailBaseUrl = document.getElementById('input-yyds-mail-base-url');
const hotmailSection = document.getElementById('hotmail-section');
const mail2925Section = document.getElementById('mail2925-section');
const luckmailSection = document.getElementById('luckmail-section');
const gptmailSection = document.getElementById('gptmail-section');
const icloudSection = document.getElementById('icloud-section');
const icloudSummary = document.getElementById('icloud-summary');
const icloudList = document.getElementById('icloud-list');
const icloudLoginHelp = document.getElementById('icloud-login-help');
const icloudLoginHelpTitle = document.getElementById('icloud-login-help-title');
const icloudLoginHelpText = document.getElementById('icloud-login-help-text');
const btnIcloudLoginDone = document.getElementById('btn-icloud-login-done');
const btnIcloudRefresh = document.getElementById('btn-icloud-refresh');
const btnIcloudDeleteUsed = document.getElementById('btn-icloud-delete-used');
const selectIcloudHostPreference = document.getElementById('select-icloud-host-preference');
const rowIcloudTargetMailboxType = document.getElementById('row-icloud-target-mailbox-type');
const selectIcloudTargetMailboxType = document.getElementById('select-icloud-target-mailbox-type');
const rowIcloudForwardMailProvider = document.getElementById('row-icloud-forward-mail-provider');
const selectIcloudForwardMailProvider = document.getElementById('select-icloud-forward-mail-provider');
const selectIcloudFetchMode = document.getElementById('select-icloud-fetch-mode');
const checkboxAutoDeleteIcloud = document.getElementById('checkbox-auto-delete-icloud');
const inputIcloudSearch = document.getElementById('input-icloud-search');
const selectIcloudFilter = document.getElementById('select-icloud-filter');
const checkboxIcloudSelectAll = document.getElementById('checkbox-icloud-select-all');
const icloudSelectionSummary = document.getElementById('icloud-selection-summary');
const btnIcloudBulkUsed = document.getElementById('btn-icloud-bulk-used');
const btnIcloudBulkUnused = document.getElementById('btn-icloud-bulk-unused');
const btnIcloudBulkPreserve = document.getElementById('btn-icloud-bulk-preserve');
const btnIcloudBulkUnpreserve = document.getElementById('btn-icloud-bulk-unpreserve');
const btnIcloudBulkDelete = document.getElementById('btn-icloud-bulk-delete');
const rowHotmailServiceMode = document.getElementById('row-hotmail-service-mode');
const hotmailServiceModeButtons = Array.from(document.querySelectorAll('[data-hotmail-service-mode]'));
const rowHotmailRemoteBaseUrl = document.getElementById('row-hotmail-remote-base-url');
const inputHotmailRemoteBaseUrl = document.getElementById('input-hotmail-remote-base-url');
const rowHotmailLocalBaseUrl = document.getElementById('row-hotmail-local-base-url');
const inputHotmailLocalBaseUrl = document.getElementById('input-hotmail-local-base-url');
const inputHotmailEmail = document.getElementById('input-hotmail-email');
const inputHotmailClientId = document.getElementById('input-hotmail-client-id');
const inputHotmailPassword = document.getElementById('input-hotmail-password');
const inputHotmailRefreshToken = document.getElementById('input-hotmail-refresh-token');
const inputHotmailImport = document.getElementById('input-hotmail-import');
const inputHotmailSearch = document.getElementById('input-hotmail-search');
const selectHotmailFilter = document.getElementById('select-hotmail-filter');
const btnAddHotmailAccount = document.getElementById('btn-add-hotmail-account');
const btnImportHotmailAccounts = document.getElementById('btn-import-hotmail-accounts');
const btnToggleHotmailForm = document.getElementById('btn-toggle-hotmail-form');
const btnHotmailUsageGuide = document.getElementById('btn-hotmail-usage-guide');
const btnClearUsedHotmailAccounts = document.getElementById('btn-clear-used-hotmail-accounts');
const btnDeleteAllHotmailAccounts = document.getElementById('btn-delete-all-hotmail-accounts');
const btnToggleHotmailList = document.getElementById('btn-toggle-hotmail-list');
const hotmailFormShell = document.getElementById('hotmail-form-shell');
const hotmailListShell = document.getElementById('hotmail-list-shell');
const hotmailAccountsList = document.getElementById('hotmail-accounts-list');
const inputMail2925Email = document.getElementById('input-mail2925-email');
const inputMail2925Password = document.getElementById('input-mail2925-password');
const inputMail2925Import = document.getElementById('input-mail2925-import');
const inputMail2925Search = document.getElementById('input-mail2925-search');
const selectMail2925Filter = document.getElementById('select-mail2925-filter');
const btnAddMail2925Account = document.getElementById('btn-add-mail2925-account');
const btnToggleMail2925Form = document.getElementById('btn-toggle-mail2925-form');
const btnImportMail2925Accounts = document.getElementById('btn-import-mail2925-accounts');
const btnDeleteAllMail2925Accounts = document.getElementById('btn-delete-all-mail2925-accounts');
const btnToggleMail2925List = document.getElementById('btn-toggle-mail2925-list');
const mail2925FormShell = document.getElementById('mail2925-form-shell');
const mail2925ListShell = document.getElementById('mail2925-list-shell');
const mail2925AccountsList = document.getElementById('mail2925-accounts-list');
const inputLuckmailApiKey = document.getElementById('input-luckmail-api-key');
const inputLuckmailBaseUrl = document.getElementById('input-luckmail-base-url');
const selectLuckmailEmailType = document.getElementById('select-luckmail-email-type');
const inputLuckmailDomain = document.getElementById('input-luckmail-domain');
const inputGptmailApiKey = document.getElementById('input-gptmail-api-key');
const inputGptmailBaseUrl = document.getElementById('input-gptmail-base-url');
const inputGptmailDomain = document.getElementById('input-gptmail-domain');
const gptmailApiUsage = document.getElementById('gptmail-api-usage');
const btnLuckmailRefresh = document.getElementById('btn-luckmail-refresh');
const btnLuckmailDisableUsed = document.getElementById('btn-luckmail-disable-used');
const luckmailSummary = document.getElementById('luckmail-summary');
const inputLuckmailSearch = document.getElementById('input-luckmail-search');
const selectLuckmailFilter = document.getElementById('select-luckmail-filter');
const checkboxLuckmailSelectAll = document.getElementById('checkbox-luckmail-select-all');
const luckmailSelectionSummary = document.getElementById('luckmail-selection-summary');
const btnLuckmailBulkUsed = document.getElementById('btn-luckmail-bulk-used');
const btnLuckmailBulkUnused = document.getElementById('btn-luckmail-bulk-unused');
const btnLuckmailBulkPreserve = document.getElementById('btn-luckmail-bulk-preserve');
const btnLuckmailBulkUnpreserve = document.getElementById('btn-luckmail-bulk-unpreserve');
const btnLuckmailBulkDisable = document.getElementById('btn-luckmail-bulk-disable');
const btnLuckmailBulkEnable = document.getElementById('btn-luckmail-bulk-enable');
const luckmailList = document.getElementById('luckmail-list');
const rowEmailPrefix = document.getElementById('row-email-prefix');
const labelEmailPrefix = document.getElementById('label-email-prefix');
const inputEmailPrefix = document.getElementById('input-email-prefix');
const selectMail2925PoolAccount = document.getElementById('select-mail2925-pool-account');
const inputMail2925UseAccountPool = document.getElementById('input-mail2925-use-account-pool');
const labelMail2925UseAccountPool = document.getElementById('label-mail2925-use-account-pool');
const rowInbucketHost = document.getElementById('row-inbucket-host');
const inputInbucketHost = document.getElementById('input-inbucket-host');
const rowInbucketMailbox = document.getElementById('row-inbucket-mailbox');
const inputInbucketMailbox = document.getElementById('input-inbucket-mailbox');
const rowCfDomain = document.getElementById('row-cf-domain');
const selectCfDomain = document.getElementById('select-cf-domain');
const cfDomainPickerRoot = document.getElementById('cf-domain-picker');
const btnCfDomainMenu = document.getElementById('btn-cf-domain-menu');
const cfDomainCurrent = document.getElementById('cf-domain-current');
const cfDomainMenu = document.getElementById('cf-domain-menu');
const inputCfDomain = document.getElementById('input-cf-domain');
const btnCfDomainMode = document.getElementById('btn-cf-domain-mode');
const inputRunCount = document.getElementById('input-run-count');
const inputAutoSkipFailures = document.getElementById('input-auto-skip-failures');
const inputAutoSkipFailuresThreadIntervalMinutes = document.getElementById('input-auto-skip-failures-thread-interval-minutes');
const inputStep6CookieCleanupEnabled = document.getElementById('input-step6-cookie-cleanup-enabled');
const inputAutoDelayMinutes = document.getElementById('input-auto-delay-minutes');
const inputAutoStepDelaySeconds = document.getElementById('input-auto-step-delay-seconds');
const inputOperationDelayEnabled = document.getElementById('input-operation-delay-enabled');
const inputOAuthFlowTimeoutEnabled = document.getElementById('input-oauth-flow-timeout-enabled');
const inputVerificationResendCount = null;
const rowSignupMethod = null;
const inputPhoneSignupReloginAfterBindEmail = null;
const rowSignupPhone = null;
const signupMethodButtons = Array.from(document.querySelectorAll('[data-signup-method]'));
const rowAccountRunHistoryHelperBaseUrl = document.getElementById('row-account-run-history-helper-base-url');
const inputAccountRunHistoryHelperBaseUrl = document.getElementById('input-account-run-history-helper-base-url');
const autoStartModal = document.getElementById('auto-start-modal');
const sharedFormModal = document.getElementById('shared-form-modal');
const sharedFormModalTitle = document.getElementById('shared-form-modal-title');
const btnSharedFormModalClose = document.getElementById('btn-shared-form-modal-close');
const sharedFormModalMessage = document.getElementById('shared-form-modal-message');
const sharedFormModalAlert = document.getElementById('shared-form-modal-alert');
const sharedFormModalFields = document.getElementById('shared-form-modal-fields');
const btnSharedFormModalCancel = document.getElementById('btn-shared-form-modal-cancel');
const btnSharedFormModalConfirm = document.getElementById('btn-shared-form-modal-confirm');
const autoStartTitle = autoStartModal?.querySelector('.modal-title');
const autoStartMessage = document.getElementById('auto-start-message');
const autoStartAlert = document.getElementById('auto-start-alert');
const modalOptionRow = document.getElementById('modal-option-row');
const modalOptionInput = document.getElementById('modal-option-input');
const modalOptionText = document.getElementById('modal-option-text');
const btnAutoStartClose = document.getElementById('btn-auto-start-close');
const btnAutoStartCancel = document.getElementById('btn-auto-start-cancel');
const btnAutoStartRestart = document.getElementById('btn-auto-start-restart');
const btnAutoStartContinue = document.getElementById('btn-auto-start-continue');
const autoHintText = document.querySelector('.auto-hint');
const stepsList = document.querySelector('.steps-list');
const SIGNUP_METHOD_EMAIL = 'email';
const DEFAULT_SIGNUP_METHOD = SIGNUP_METHOD_EMAIL;
const DEFAULT_ACTIVE_FLOW_ID = 'openai';
const ACCOUNT_WRITE_FLOW_TYPE_FULL = 'full';
const ACCOUNT_WRITE_FLOW_TYPE_GPT = 'gpt';
const ACCOUNT_WRITE_FLOW_TYPE_CODEX = 'codex';
const EXECUTION_MODE_FULL = 'full';
const EXECUTION_MODE_REGISTER_GPT = 'register_gpt';
const EXECUTION_MODE_AUTHORIZE_CODEX = 'authorize_codex';
const ACCOUNT_WRITE_FLOW_PREFIX_BY_SELECT_FLOW = Object.freeze({
  'full-flow': ACCOUNT_WRITE_FLOW_TYPE_FULL,
  'register-gpt': ACCOUNT_WRITE_FLOW_TYPE_GPT,
  'authorize-codex': ACCOUNT_WRITE_FLOW_TYPE_CODEX,
});
const EXECUTION_MODE_BY_SELECT_FLOW = Object.freeze({
  'full-flow': EXECUTION_MODE_FULL,
  'register-gpt': EXECUTION_MODE_REGISTER_GPT,
  'authorize-codex': EXECUTION_MODE_AUTHORIZE_CODEX,
});
const SELECT_FLOW_BY_EXECUTION_MODE = Object.freeze({
  [EXECUTION_MODE_FULL]: 'full-flow',
  [EXECUTION_MODE_REGISTER_GPT]: 'register-gpt',
  [EXECUTION_MODE_AUTHORIZE_CODEX]: 'authorize-codex',
});
const EXECUTION_STEP_RANGE_BY_MODE = Object.freeze({
  [EXECUTION_MODE_FULL]: Object.freeze({ startStep: 1, endStep: 11 }),
  [EXECUTION_MODE_REGISTER_GPT]: Object.freeze({ startStep: 1, endStep: 6 }),
  [EXECUTION_MODE_AUTHORIZE_CODEX]: Object.freeze({ startStep: 7, endStep: 11 }),
});
const ACCOUNT_WRITE_DB_NAME = 'codexfree-sidepanel-db';
const ACCOUNT_WRITE_DB_VERSION = 1;
const ACCOUNT_WRITE_DB_STORE = 'sidepanel-kv';
const ACCOUNT_WRITE_DB_DIRECTORY_HANDLE_KEY = 'account-write-directory-handle';
let latestState = null;
let currentSignupMethod = DEFAULT_SIGNUP_METHOD;
// 写入账号运行时状态：仅在 sidepanel 中保存目录句柄，不进入 chrome.storage。
let accountWriteDirectoryHandle = null;
let accountWriteDbPromise = null;
let lastConfirmedOperationDelayEnabled = true;
let stepDefinitions = getStepDefinitionsForMode({
  signupMethod: currentSignupMethod,
});
let workflowNodes = getWorkflowNodesForMode({
  signupMethod: currentSignupMethod,
});
let STEP_IDS = stepDefinitions.map((step) => Number(step.id)).filter(Number.isFinite);
let STEP_DEFAULT_STATUSES = Object.fromEntries(STEP_IDS.map((stepId) => [stepId, 'pending']));
let SKIPPABLE_STEPS = new Set(STEP_IDS);
let NODE_IDS = workflowNodes.map((node) => String(node.nodeId || '').trim()).filter(Boolean);
let NODE_DEFAULT_STATUSES = Object.fromEntries(NODE_IDS.map((nodeId) => [nodeId, 'pending']));
let SKIPPABLE_NODES = new Set(NODE_IDS);
const AUTO_DELAY_MIN_MINUTES = 0;
const AUTO_DELAY_MAX_MINUTES = 1440;
const AUTO_DELAY_DEFAULT_MINUTES = 0;
const AUTO_FALLBACK_THREAD_INTERVAL_MIN_MINUTES = 0;
const AUTO_FALLBACK_THREAD_INTERVAL_MAX_MINUTES = 1440;
const AUTO_FALLBACK_THREAD_INTERVAL_DEFAULT_MINUTES = 0;
const AUTO_RUN_MAX_RETRIES_PER_ROUND = 3;
const AUTO_STEP_DELAY_MIN_SECONDS = 0;
const AUTO_STEP_DELAY_MAX_SECONDS = 600;
const VERIFICATION_RESEND_COUNT_MIN = 0;
const VERIFICATION_RESEND_COUNT_MAX = 20;
const DEFAULT_VERIFICATION_RESEND_COUNT = 4;
const DEFAULT_LOCAL_CPA_STEP9_MODE = 'submit';
const DEFAULT_CPA_CALLBACK_MODE = 'step8';
const MAIL_2925_MODE_PROVIDE = 'provide';
const MAIL_2925_MODE_RECEIVE = 'receive';
const DEFAULT_MAIL_2925_MODE = MAIL_2925_MODE_PROVIDE;
const CLOUDFLARE_TEMP_EMAIL_LOOKUP_MODE_RECEIVE_MAILBOX = 'receive-mailbox';
const CLOUDFLARE_TEMP_EMAIL_LOOKUP_MODE_REGISTRATION_EMAIL = 'registration-email';
const DEFAULT_CLOUDFLARE_TEMP_EMAIL_LOOKUP_MODE = CLOUDFLARE_TEMP_EMAIL_LOOKUP_MODE_RECEIVE_MAILBOX;
const AUTO_SKIP_FAILURES_PROMPT_DISMISSED_STORAGE_KEY = 'multipage-auto-skip-failures-prompt-dismissed';
const AUTO_RUN_FALLBACK_RISK_PROMPT_DISMISSED_STORAGE_KEY = 'multipage-auto-run-fallback-risk-prompt-dismissed';
const CLOUDFLARE_TEMP_EMAIL_REGISTRATION_LOOKUP_PROMPT_DISMISSED_STORAGE_KEY = 'multipage-cloudflare-temp-email-registration-lookup-prompt-dismissed';
const RESTORING_UI_CLASS = 'is-restoring';

function setRestoringUiState(isRestoring) {
  const target = document.body;
  if (!target) {
    return;
  }
  target.classList.toggle(RESTORING_UI_CLASS, Boolean(isRestoring));
}

function getStepDefinitionsForMode(options = {}) {
  const defaultFlowId = typeof DEFAULT_ACTIVE_FLOW_ID !== 'undefined' ? DEFAULT_ACTIVE_FLOW_ID : 'openai';
  const rawSignupMethod = typeof options === 'string'
    ? currentSignupMethod
    : (options.signupMethod || currentSignupMethod || DEFAULT_SIGNUP_METHOD);
  const activeFlowId = typeof options === 'string'
    ? ((typeof latestState !== 'undefined' ? latestState?.activeFlowId : '') || defaultFlowId)
    : (options.activeFlowId || (typeof latestState !== 'undefined' ? latestState?.activeFlowId : '') || defaultFlowId);
  return (window.MultiPageStepDefinitions?.getSteps?.({
    activeFlowId: String(activeFlowId || '').trim().toLowerCase() || defaultFlowId,
    signupMethod: normalizeSignupMethod(rawSignupMethod),
  }) || [])
    .sort((left, right) => {
      const leftOrder = Number.isFinite(left.order) ? left.order : left.id;
      const rightOrder = Number.isFinite(right.order) ? right.order : right.id;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.id - right.id;
    });
}

function getWorkflowNodesForMode(options = {}) {
  const defaultFlowId = typeof DEFAULT_ACTIVE_FLOW_ID !== 'undefined' ? DEFAULT_ACTIVE_FLOW_ID : 'openai';
  const rawSignupMethod = typeof options === 'string'
    ? currentSignupMethod
    : (options.signupMethod || currentSignupMethod || DEFAULT_SIGNUP_METHOD);
  const activeFlowId = typeof options === 'string'
    ? ((typeof latestState !== 'undefined' ? latestState?.activeFlowId : '') || defaultFlowId)
    : (options.activeFlowId || (typeof latestState !== 'undefined' ? latestState?.activeFlowId : '') || defaultFlowId);
  const nodes = window.MultiPageStepDefinitions?.getNodes?.({
    activeFlowId: String(activeFlowId || '').trim().toLowerCase() || defaultFlowId,
    signupMethod: normalizeSignupMethod(rawSignupMethod),
  });
  if (Array.isArray(nodes) && nodes.length) {
    return nodes.slice().sort((left, right) => {
      const leftOrder = Number.isFinite(Number(left.displayOrder)) ? Number(left.displayOrder) : Number(left.legacyStepId);
      const rightOrder = Number.isFinite(Number(right.displayOrder)) ? Number(right.displayOrder) : Number(right.legacyStepId);
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return String(left.nodeId || '').localeCompare(String(right.nodeId || ''));
    });
  }

  return getStepDefinitionsForMode(options).map((step) => ({
    legacyStepId: Number(step.id),
    nodeId: String(step.key || '').trim(),
    title: step.title,
    displayOrder: Number.isFinite(Number(step.order)) ? Number(step.order) : Number(step.id),
    executeKey: String(step.key || '').trim(),
  })).filter((node) => node.nodeId);
}

function getStepIdByKeyForCurrentMode(stepKey = '') {
  const normalizedKey = String(stepKey || '').trim();
  if (!normalizedKey) {
    return 0;
  }
  const match = (stepDefinitions || []).find((step) => String(step?.key || '') === normalizedKey);
  return Number(match?.id) || 0;
}

function getNodeIdByStepForCurrentMode(step) {
  const numericStep = Number(step);
  const node = (workflowNodes || []).find((candidate) => Number(candidate?.legacyStepId) === numericStep);
  if (node?.nodeId) {
    return String(node.nodeId).trim();
  }
  const definition = (stepDefinitions || []).find((candidate) => Number(candidate?.id) === numericStep);
  return String(definition?.key || '').trim();
}

function getStepIdByNodeIdForCurrentMode(nodeId = '') {
  const normalizedNodeId = String(nodeId || '').trim();
  if (!normalizedNodeId) {
    return 0;
  }
  const node = (workflowNodes || []).find((candidate) => String(candidate?.nodeId || '').trim() === normalizedNodeId);
  const legacyStepId = Number(node?.legacyStepId);
  if (Number.isInteger(legacyStepId) && legacyStepId > 0) {
    return legacyStepId;
  }
  return getStepIdByKeyForCurrentMode(normalizedNodeId);
}

function rebuildStepDefinitionState(options = {}) {
  const rawSignupMethod = typeof options === 'string'
    ? currentSignupMethod
    : (options.signupMethod || currentSignupMethod || DEFAULT_SIGNUP_METHOD);
  currentSignupMethod = normalizeSignupMethod(rawSignupMethod);
  stepDefinitions = getStepDefinitionsForMode({
    activeFlowId: options?.activeFlowId,
    signupMethod: currentSignupMethod,
  });
  const nextWorkflowNodes = typeof getWorkflowNodesForMode === 'function'
    ? getWorkflowNodesForMode({
      activeFlowId: options?.activeFlowId,
      signupMethod: currentSignupMethod,
    })
    : stepDefinitions.map((step) => ({
      legacyStepId: Number(step.id),
      nodeId: String(step.key || step.id || '').trim(),
      title: step.title,
      displayOrder: Number.isFinite(Number(step.order)) ? Number(step.order) : Number(step.id),
    }));
  if (typeof workflowNodes !== 'undefined') {
    workflowNodes = nextWorkflowNodes;
  }
  STEP_IDS = stepDefinitions.map((step) => Number(step.id)).filter(Number.isFinite);
  STEP_DEFAULT_STATUSES = Object.fromEntries(STEP_IDS.map((stepId) => [stepId, 'pending']));
  SKIPPABLE_STEPS = new Set(STEP_IDS);
  if (typeof NODE_IDS !== 'undefined') {
    NODE_IDS = nextWorkflowNodes.map((node) => String(node.nodeId || '').trim()).filter(Boolean);
  }
  if (typeof NODE_DEFAULT_STATUSES !== 'undefined') {
    NODE_DEFAULT_STATUSES = Object.fromEntries((typeof NODE_IDS !== 'undefined' ? NODE_IDS : []).map((nodeId) => [nodeId, 'pending']));
  }
  if (typeof SKIPPABLE_NODES !== 'undefined') {
    SKIPPABLE_NODES = new Set(typeof NODE_IDS !== 'undefined' ? NODE_IDS : []);
  }
}
const AUTO_RUN_FALLBACK_RISK_WARNING_MIN_RUNS = 3;
const HOTMAIL_SERVICE_MODE_REMOTE = 'remote';
const HOTMAIL_SERVICE_MODE_LOCAL = 'local';
const ICLOUD_PROVIDER = 'icloud';
const GMAIL_PROVIDER = 'gmail';
const GMAIL_ALIAS_GENERATOR = 'gmail-alias';
const LUCKMAIL_PROVIDER = 'luckmail-api';
const GPTMAIL_PROVIDER = 'gptmail';
const YYDS_MAIL_PROVIDER = 'yyds-mail';
const CUSTOM_EMAIL_POOL_GENERATOR = 'custom-pool';
const DEFAULT_LUCKMAIL_BASE_URL = 'https://mails.luckyous.com';
const DEFAULT_LUCKMAIL_EMAIL_TYPE = 'ms_graph';
const DEFAULT_GPTMAIL_BASE_URL = 'https://mail.chatgpt.org.uk';
const DEFAULT_YYDS_MAIL_BASE_URL = window.YydsMailUtils?.DEFAULT_YYDS_MAIL_BASE_URL || 'https://maliapi.215.im/v1';
const DISPLAY_TIMEZONE = 'Asia/Shanghai';
const DEFAULT_ACCOUNT_RUN_HISTORY_HELPER_BASE_URL = 'http://127.0.0.1:17373';
function getManagedAliasUtils() {
  return window.MultiPageManagedAliasUtils || null;
}

function isManagedAliasProvider(provider = selectMailProvider.value, mail2925Mode = getSelectedMail2925Mode()) {
  const utils = getManagedAliasUtils();
  if (utils?.usesManagedAliasGeneration) {
    return utils.usesManagedAliasGeneration(provider, { mail2925Mode });
  }
  if (utils?.isManagedAliasProvider) {
    const normalizedProvider = String(provider || '').trim().toLowerCase();
    if (normalizedProvider === '2925') {
      return utils.isManagedAliasProvider(provider)
        && normalizeMail2925Mode(mail2925Mode) === MAIL_2925_MODE_PROVIDE;
    }
    return utils.isManagedAliasProvider(provider);
  }
  const normalizedProvider = String(provider || '').trim().toLowerCase();
  if (normalizedProvider === '2925') {
    return normalizeMail2925Mode(mail2925Mode) === MAIL_2925_MODE_PROVIDE;
  }
  return normalizedProvider === GMAIL_PROVIDER;
}

function parseManagedAliasBaseEmail(rawValue, provider = selectMailProvider.value) {
  const utils = getManagedAliasUtils();
  if (utils?.parseManagedAliasBaseEmail) {
    return utils.parseManagedAliasBaseEmail(rawValue, provider);
  }
  return null;
}

function isManagedAliasEmail(value, baseEmail = '', provider = selectMailProvider.value) {
  const utils = getManagedAliasUtils();
  if (utils?.isManagedAliasEmail) {
    return utils.isManagedAliasEmail(value, provider, baseEmail);
  }
  return false;
}

function getManagedAliasProviderUiCopy(provider = selectMailProvider.value, mail2925Mode = getSelectedMail2925Mode()) {
  if (!isManagedAliasProvider(provider, mail2925Mode)) {
    return null;
  }
  const utils = getManagedAliasUtils();
  if (utils?.getManagedAliasProviderUiCopy) {
    return utils.getManagedAliasProviderUiCopy(provider);
  }
  if (String(provider || '').trim().toLowerCase() === GMAIL_PROVIDER) {
    return {
      baseLabel: '基邮箱',
      basePlaceholder: '例如 yourname@gmail.com',
      buttonLabel: '生成',
      successVerb: '生成',
      label: 'Gmail +tag 邮箱',
      placeholder: '点击生成 Gmail +tag 邮箱，或手动填写完整邮箱',
      hint: '先填写基邮箱后点“生成”，也可以直接手动填写完整的 Gmail 邮箱。',
    };
  }
  if (String(provider || '').trim().toLowerCase() === '2925') {
    return {
      baseLabel: '基邮箱',
      basePlaceholder: '例如 yourname@2925.com',
      buttonLabel: '生成',
      successVerb: '生成',
      label: '2925 邮箱',
      placeholder: '点击生成 2925 邮箱，或手动填写完整邮箱',
      hint: '先填写基邮箱后点“生成”，也可以直接手动填写完整的 2925 邮箱。',
    };
  }
  return null;
}

function getManagedAliasBaseEmailKey(provider = selectMailProvider.value) {
  const normalizedProvider = String(provider || '').trim().toLowerCase();
  if (normalizedProvider === GMAIL_PROVIDER) {
    return 'gmailBaseEmail';
  }
  if (normalizedProvider === '2925') {
    return 'mail2925BaseEmail';
  }
  return '';
}

function isMail2925AccountPoolEnabled(state = latestState) {
  return Boolean(state?.mail2925UseAccountPool);
}

function getPreferredMail2925PoolAccountId(state = latestState) {
  const currentId = String(state?.currentMail2925AccountId || '').trim();
  if (currentId && getMail2925Accounts(state).some((account) => account.id === currentId)) {
    return currentId;
  }
  return '';
}

function syncMail2925PoolAccountOptions(state = latestState) {
  if (!selectMail2925PoolAccount) {
    return;
  }

  const accounts = getMail2925Accounts(state);
  const selectedId = getPreferredMail2925PoolAccountId(state);
  const options = ['<option value="">请选择号池邮箱</option>'].concat(
    accounts.map((account) => `<option value="${escapeHtml(account.id)}">${escapeHtml(account.email || '(未命名账号)')}</option>`)
  );
  selectMail2925PoolAccount.innerHTML = options.join('');
  selectMail2925PoolAccount.value = selectedId;
}

async function syncSelectedMail2925PoolAccount(options = {}) {
  const { silent = false } = options;
  if (!selectMail2925PoolAccount || !isMail2925AccountPoolEnabled(latestState)) {
    return null;
  }

  const accountId = String(selectMail2925PoolAccount.value || '').trim();
  if (!accountId) {
    syncLatestState({ currentMail2925AccountId: null });
    setManagedAliasBaseEmailInputForProvider('2925', latestState);
    return null;
  }

  const response = await chrome.runtime.sendMessage({
    type: 'SELECT_MAIL2925_ACCOUNT',
    source: 'sidepanel',
    payload: { accountId },
  });
  if (response?.error) {
    throw new Error(response.error);
  }

  syncLatestState({
    currentMail2925AccountId: response.account?.id || accountId,
    ...(response.account?.email ? { mail2925BaseEmail: String(response.account.email).trim() } : {}),
  });
  setManagedAliasBaseEmailInputForProvider('2925', latestState);
  if (!silent) {
    showToast(`已切换当前 2925 号池邮箱为 ${response.account?.email || accountId}`, 'success', 1800);
  }
  return response.account || null;
}

function getManagedAliasBaseEmailForProvider(provider = selectMailProvider.value, state = latestState) {
  if (String(provider || '').trim().toLowerCase() === '2925' && isMail2925AccountPoolEnabled(state)) {
    const currentMail2925Email = getCurrentMail2925Email(state);
    if (currentMail2925Email) {
      return currentMail2925Email;
    }
  }

  const key = getManagedAliasBaseEmailKey(provider);
  if (!key) {
    return '';
  }

  const providerValue = String(state?.[key] || '').trim();
  if (providerValue) {
    return providerValue;
  }

  const legacyEmailPrefix = String(state?.emailPrefix || '').trim();
  return parseManagedAliasBaseEmail(legacyEmailPrefix, provider) ? legacyEmailPrefix : '';
}

function buildManagedAliasBaseEmailPayload(state = latestState) {
  const payload = {
    gmailBaseEmail: String(state?.gmailBaseEmail || '').trim(),
    mail2925BaseEmail: String(state?.mail2925BaseEmail || '').trim(),
    mail2925UseAccountPool: Boolean(state?.mail2925UseAccountPool),
    emailPrefix: '',
  };
  const key = getManagedAliasBaseEmailKey();
  if (key) {
    if (key === 'mail2925BaseEmail' && isMail2925AccountPoolEnabled(state)) {
      payload[key] = String(state?.mail2925BaseEmail || '').trim();
    } else {
      payload[key] = inputEmailPrefix.value.trim();
    }
  }
  return payload;
}

function syncManagedAliasBaseEmailDraftFromInput(provider = selectMailProvider.value) {
  const key = getManagedAliasBaseEmailKey(provider);
  if (!key) {
    return;
  }
  if (key === 'mail2925BaseEmail' && isMail2925AccountPoolEnabled(latestState)) {
    return;
  }
  syncLatestState({ [key]: inputEmailPrefix.value.trim() });
}

function setManagedAliasBaseEmailInputForProvider(provider = selectMailProvider.value, state = latestState) {
  syncMail2925PoolAccountOptions(state);
  inputEmailPrefix.value = getManagedAliasBaseEmailForProvider(provider, state);
}

function getCurrentRegistrationEmailUiCopy() {
  if (isCustomMailProvider()) {
    return getCustomMailProviderUiCopy();
  }
  const useYydsMail = typeof isYydsMailProvider === 'function'
    ? isYydsMailProvider()
    : String(selectMailProvider.value || '').trim().toLowerCase() === 'yyds-mail';
  if (useYydsMail) {
    return {
      buttonLabel: '获取',
      placeholder: '点击获取 YYDS Mail 邮箱，或手动粘贴邮箱',
      successVerb: '获取',
      label: 'YYDS Mail',
    };
  }
  if (usesGeneratedAliasMailProvider()) {
    return getManagedAliasProviderUiCopy();
  }
  return getEmailGeneratorUiCopy();
}

function isCurrentRegistrationEmailCompatible(email = inputEmail.value.trim(), provider = selectMailProvider.value, state = latestState) {
  if (!usesGeneratedAliasMailProvider(provider, getSelectedMail2925Mode()) || !email) {
    return true;
  }
  const baseEmail = getManagedAliasBaseEmailForProvider(provider, state);
  return isManagedAliasEmail(email, baseEmail, provider);
}

function validateCurrentRegistrationEmail(email = inputEmail.value.trim(), options = {}) {
  const { showToastOnFailure = false } = options;
  if (isCurrentRegistrationEmailCompatible(email)) {
    return true;
  }

  if (showToastOnFailure) {
    const uiCopy = getManagedAliasProviderUiCopy();
    const baseEmail = getManagedAliasBaseEmailForProvider();
    showToast(
      baseEmail
        ? `当前邮箱服务为“${uiCopy?.label || '别名邮箱'}”，注册邮箱需与 ${uiCopy?.baseLabel || '基邮箱'} 对应。`
        : `当前邮箱服务为“${uiCopy?.label || '别名邮箱'}”，请直接填写完整邮箱，或先填写基邮箱后点击“生成”。`,
      'warn'
    );
  }
  return false;
}

let currentAutoRun = {
  autoRunning: false,
  phase: 'idle',
  currentRun: 0,
  totalRuns: 1,
  attemptRun: 0,
  scheduledAt: null,
  countdownAt: null,
  countdownTitle: '',
  countdownNote: '',
};
let pendingAutoRunStartTotalRuns = 0;
let pendingAutoRunStartExpiresAt = 0;
let settingsDirty = false;
let settingsSaveInFlight = false;
let settingsAutoSaveTimer = null;
let settingsSaveRevision = 0;
let cloudflareDomainEditMode = false;
let cloudflareTempEmailDomainEditMode = false;
let modalChoiceResolver = null;
let currentModalActions = [];
let modalResultBuilder = null;
let scheduledCountdownTimer = null;
let configMenuOpen = false;
let configActionInFlight = false;

function normalizeAutomationWindowId(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= 0 ? numeric : null;
}

async function getCurrentSidepanelWindowId() {
  if (chrome?.windows?.getCurrent) {
    try {
      const currentWindow = await chrome.windows.getCurrent();
      const windowId = normalizeAutomationWindowId(currentWindow?.id);
      if (windowId !== null) {
        return windowId;
      }
    } catch (error) {
      console.warn('Failed to get current sidepanel window:', error?.message || error);
    }
  }

  return normalizeAutomationWindowId(latestState?.automationWindowId);
}

function shouldAttachAutomationWindow(message = {}) {
  const source = String(message?.source || '').trim();
  if (source && source !== 'sidepanel') {
    return false;
  }
  return [
    'EXECUTE_NODE',
    'AUTO_RUN',
    'SCHEDULE_AUTO_RUN',
    'RESUME_AUTO_RUN',
    'START_SCHEDULED_AUTO_RUN_NOW',
    'SKIP_AUTO_RUN_COUNTDOWN',
  ].includes(String(message?.type || '').trim());
}

async function sendSidepanelMessage(message = {}) {
  const payload = {
    ...(message || {}),
    source: message?.source || 'sidepanel',
  };
  if (shouldAttachAutomationWindow(payload)) {
    const windowId = await getCurrentSidepanelWindowId();
    if (windowId !== null) {
      payload.payload = {
        ...(payload.payload || {}),
        automationWindowId: windowId,
      };
      syncLatestState({ automationWindowId: windowId });
    }
  }
  return chrome.runtime.sendMessage(payload);
}

window.sendSidepanelMessage = sendSidepanelMessage;

const DEFAULT_SUB2API_GROUP_OPTIONS = ['codex'];
const editableListPickerModule = window.SidepanelEditableListPicker || {};
const normalizeEditableListValues = editableListPickerModule.normalizeEditableListValues
  || ((...sources) => {
    const values = [];
    const seen = new Set();
    const append = (value) => {
      const items = Array.isArray(value)
        ? value
        : String(value || '').split(/[\r\n,，、]+/);
      items.forEach((item) => {
        const normalized = String(item || '').trim();
        const key = normalized.toLowerCase();
        if (key && !seen.has(key)) {
          seen.add(key);
          values.push(normalized);
        }
      });
    };
    sources.forEach(append);
    return values;
  });
const createEditableListPicker = editableListPickerModule.createEditableListPicker
  || (() => ({
    close() { },
    render() { },
    setOpen() { },
    setSelection() { },
    setVisible() { },
  }));
const closeEditableListPickers = editableListPickerModule.closeEditableListPickers || (() => { });
const isClickInsideEditableListPicker = editableListPickerModule.isClickInsideEditableListPicker || (() => false);

function normalizeSub2ApiGroupOptions(...sources) {
  return normalizeEditableListValues(...sources);
}

function normalizeSub2ApiAccountPriorityValue(value) {
  const rawValue = String(value ?? '').trim();
  const numeric = Number(rawValue);
  if (!rawValue || !Number.isSafeInteger(numeric) || numeric < 1) {
    return 1;
  }
  return numeric;
}

function getSelectedSub2ApiGroupName() {
  return String(inputSub2ApiGroup?.value || '').trim()
    || DEFAULT_SUB2API_GROUP_OPTIONS[0];
}

function getSub2ApiGroupOptionsState(state = latestState) {
  const options = normalizeSub2ApiGroupOptions(
    state?.sub2apiGroupNames,
    state?.sub2apiGroupName
  );
  return options.length ? options : [...DEFAULT_SUB2API_GROUP_OPTIONS];
}

const sub2ApiGroupPicker = createEditableListPicker({
  root: sub2ApiGroupPickerRoot,
  input: inputSub2ApiGroup,
  trigger: btnSub2ApiGroupMenu,
  current: sub2ApiGroupCurrent,
  menu: sub2ApiGroupMenu,
  fallbackItems: DEFAULT_SUB2API_GROUP_OPTIONS,
  minItems: 1,
  itemLabel: '分组',
  onDelete: handleDeleteSub2ApiGroup,
  onDeleteError: (error) => showToast(error?.message || '删除 SUB2API 分组失败。', 'error'),
});

const cfDomainPicker = createEditableListPicker({
  root: cfDomainPickerRoot,
  input: selectCfDomain,
  trigger: btnCfDomainMenu,
  current: cfDomainCurrent,
  menu: cfDomainMenu,
  emptyLabel: '请先添加域名',
  itemLabel: '域名',
  normalizeItems: normalizeCloudflareDomains,
  normalizeValue: normalizeCloudflareDomainValue,
  onDelete: handleDeleteCloudflareDomain,
  onDeleteError: (error) => showToast(error?.message || '删除 Cloudflare 域名失败。', 'error'),
});

const tempEmailDomainPicker = createEditableListPicker({
  root: tempEmailDomainPickerRoot,
  input: selectTempEmailDomain,
  trigger: btnTempEmailDomainMenu,
  current: tempEmailDomainCurrent,
  menu: tempEmailDomainMenu,
  emptyLabel: '请先更新域名',
  itemLabel: '域名',
  normalizeItems: normalizeCloudflareTempEmailDomains,
  normalizeValue: normalizeCloudflareTempEmailDomainValue,
  onDelete: handleDeleteCloudflareTempEmailDomain,
  onDeleteError: (error) => showToast(error?.message || '删除 Cloudflare Temp Email 域名失败。', 'error'),
});

function renderSub2ApiGroupOptions(state = latestState, selectedValue = '') {
  if (!inputSub2ApiGroup) {
    return;
  }

  const selected = String(selectedValue || state?.sub2apiGroupName || '').trim();
  const options = getSub2ApiGroupOptionsState({
    ...(state || {}),
    sub2apiGroupName: selected || state?.sub2apiGroupName,
  });
  if (selected && !options.some((name) => name.toLowerCase() === selected.toLowerCase())) {
    options.unshift(selected);
  }

  sub2ApiGroupPicker.render(options, selected || options[0] || DEFAULT_SUB2API_GROUP_OPTIONS[0]);
}
let customEmailPoolEntriesState = [];

const EYE_OPEN_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_CLOSED_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C5 19 1 12 1 12a21.77 21.77 0 0 1 5.06-6.94"/><path d="M9.9 4.24A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a21.86 21.86 0 0 1-2.16 3.19"/><path d="M1 1l22 22"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>';
const COPY_ICON = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const parseHotmailImportText = window.HotmailUtils?.parseHotmailImportText;
const normalizeHotmailServiceModeFromUtils = window.HotmailUtils?.normalizeHotmailServiceMode;
const shouldClearHotmailCurrentSelection = window.HotmailUtils?.shouldClearHotmailCurrentSelection;
const upsertHotmailAccountInList = window.HotmailUtils?.upsertHotmailAccountInList;
const filterHotmailAccountsByUsage = window.HotmailUtils?.filterHotmailAccountsByUsage;
const getHotmailBulkActionLabel = window.HotmailUtils?.getHotmailBulkActionLabel;
const getHotmailListToggleLabel = window.HotmailUtils?.getHotmailListToggleLabel;
const normalizeLuckmailTimestampValue = window.LuckMailUtils?.normalizeTimestamp
  || ((value) => {
    const timestamp = Date.parse(String(value || ''));
    return Number.isFinite(timestamp) ? timestamp : 0;
  });
const sharedFormDialog = window.SidepanelFormDialog?.createFormDialog?.({
  overlay: sharedFormModal,
  titleNode: sharedFormModalTitle,
  closeButton: btnSharedFormModalClose,
  messageNode: sharedFormModalMessage,
  alertNode: sharedFormModalAlert,
  fieldsContainer: sharedFormModalFields,
  cancelButton: btnSharedFormModalCancel,
  confirmButton: btnSharedFormModalConfirm,
});
const DEFAULT_LUCKMAIL_PRESERVE_TAG_NAME = window.LuckMailUtils?.DEFAULT_LUCKMAIL_PRESERVE_TAG_NAME || '保留';
const normalizeIcloudHost = window.IcloudUtils?.normalizeIcloudHost
  || ((value) => {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'icloud.com' || normalized === 'icloud.com.cn' ? normalized : '';
  });
const normalizeIcloudFetchMode = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'always_new' ? 'always_new' : 'reuse_existing';
};
const normalizeIcloudTargetMailboxType = window.MailProviderUtils?.normalizeIcloudTargetMailboxType
  || ((value) => String(value || '').trim().toLowerCase() === 'forward-mailbox'
    ? 'forward-mailbox'
    : 'icloud-inbox');
const getIcloudForwardMailProviderOptions = window.MailProviderUtils?.getIcloudForwardMailProviderOptions
  || (() => Array.from(selectIcloudForwardMailProvider?.options || [])
    .map((option) => ({
      value: String(option?.value || '').trim().toLowerCase(),
      label: String(option?.textContent || option?.label || option?.value || '').trim(),
    }))
    .filter((option) => option.value));
const normalizeIcloudForwardMailProvider = window.MailProviderUtils?.normalizeIcloudForwardMailProvider
  || ((value) => {
    const normalized = String(value || '').trim().toLowerCase();
    const options = getIcloudForwardMailProviderOptions();
    return options.some((option) => option.value === normalized)
      ? normalized
      : (options[0]?.value || 'qq');
  });
const ICLOUD_FORWARD_MAIL_PROVIDER_LABELS = Object.fromEntries(
  getIcloudForwardMailProviderOptions().map((option) => [option.value, option.label])
);
const getIcloudLoginUrlForHost = window.IcloudUtils?.getIcloudLoginUrlForHost
  || ((host) => host === 'icloud.com.cn' ? 'https://www.icloud.com.cn/' : (host === 'icloud.com' ? 'https://www.icloud.com/' : ''));

btnAutoCancelSchedule?.remove();
const MAIL_PROVIDER_LOGIN_CONFIGS = {
  [ICLOUD_PROVIDER]: {
    label: 'iCloud 邮箱',
    buttonLabel: '登录',
  },
  [GMAIL_PROVIDER]: {
    label: 'Gmail 邮箱',
    url: 'https://mail.google.com/mail/u/0/#inbox',
    buttonLabel: '登录',
  },
  '163': {
    label: '163 邮箱',
    url: 'https://mail.163.com/',
    buttonLabel: '登录',
  },
  '163-vip': {
    label: '163 VIP 邮箱',
    url: 'https://webmail.vip.163.com/',
    buttonLabel: '登录',
  },
  '126': {
    label: '126 邮箱',
    url: 'https://mail.126.com/',
    buttonLabel: '登录',
  },
  qq: {
    label: 'QQ 邮箱',
    url: 'https://wx.mail.qq.com/',
    buttonLabel: '登录',
  },
  'cloudflare-temp-email': {
    label: 'Cloudflare Temp Email 部署',
    url: 'https://github.com/QLHazyCoder/cloudflare_temp_email',
    buttonLabel: '部署',
  },
  [GPTMAIL_PROVIDER]: {
    label: 'GPTMail',
    url: 'https://mail.chatgpt.org.uk/zh/api',
    buttonLabel: '获取key',
  },
  [YYDS_MAIL_PROVIDER]: {
    label: 'YYDS Mail',
    url: 'https://vip.215.im/docs',
    buttonLabel: '文档',
  },
  '2925': {
    label: '2925 邮箱',
    url: 'https://2925.com/#/mailList',
  },
};

// ============================================================
// Toast Notifications
// ============================================================

const toastContainer = document.getElementById('toast-container');

const TOAST_ICONS = {
  error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  warn: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
};

const LOG_LEVEL_LABELS = {
  info: '信息',
  ok: '成功',
  warn: '警告',
  error: '错误',
};

function resolveLogKeywordClass(message = '') {
  const normalized = String(message || '').trim();
  // 关键词样式优先级高于普通 level 样式：用于突出“开始执行/已完成”关键节点日志。
  if (/^(?:【步骤\d+】)?开始执行$/.test(normalized)) {
    return 'log-keyword-start';
  }
  if (/^(?:【步骤\d+】)?已完成$/.test(normalized)) {
    return 'log-keyword-done';
  }
  return '';
}

const CLOUDFLARE_TEMP_EMAIL_REPOSITORY_URL = 'https://github.com/QLHazyCoder/cloudflare_temp_email';

function usesGeneratedAliasMailProvider(
  provider,
  mail2925Mode = getSelectedMail2925Mode(),
  generator = undefined
) {
  const customEmailPoolGenerator = typeof CUSTOM_EMAIL_POOL_GENERATOR === 'string'
    ? CUSTOM_EMAIL_POOL_GENERATOR
    : 'custom-pool';
  const resolvedGenerator = generator !== undefined
    ? generator
    : (typeof getSelectedEmailGenerator === 'function' ? getSelectedEmailGenerator() : '');
  return resolvedGenerator !== customEmailPoolGenerator
    && isManagedAliasProvider(provider, mail2925Mode);
}

function parseGmailBaseEmail(rawValue = '') {
  const value = String(rawValue || '').trim().toLowerCase();
  const match = value.match(/^([^@\s+]+)@((?:gmail|googlemail)\.com)$/i);
  if (!match) return null;

  return {
    localPart: match[1],
    domain: match[2].toLowerCase(),
  };
}

function isManagedGmailAlias(value, baseEmail) {
  const parsedBase = parseGmailBaseEmail(baseEmail);
  if (!parsedBase) return false;

  const match = String(value || '').trim().toLowerCase().match(/^([^@\s+]+)(?:\+[^@\s]+)?@((?:gmail|googlemail)\.com)$/i);
  if (!match) return false;

  return match[1] === parsedBase.localPart && match[2] === parsedBase.domain;
}

function showToast(message, type = 'error', duration = 4000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `${TOAST_ICONS[type] || ''}<span class="toast-msg">${escapeHtml(message)}</span><button class="toast-close">&times;</button>`;

  toast.querySelector('.toast-close').addEventListener('click', () => dismissToast(toast));
  toastContainer.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => dismissToast(toast), duration);
  }
}

function dismissToast(toast) {
  if (!toast.parentNode) return;
  toast.classList.add('toast-exit');
  toast.addEventListener('animationend', () => toast.remove());
}

function resetActionModalOption() {
  if (!modalOptionRow || !modalOptionInput || !modalOptionText) {
    return;
  }

  modalOptionRow.hidden = true;
  modalOptionInput.checked = false;
  modalOptionInput.disabled = false;
  modalOptionText.textContent = '不再提示';
}

function resetActionModalAlert() {
  if (!autoStartAlert) {
    return;
  }

  autoStartAlert.hidden = true;
  autoStartAlert.textContent = '';
  autoStartAlert.className = 'modal-alert';
}

function setActionModalMessageContent({ text = '', html = '' } = {}) {
  if (!autoStartMessage) {
    return;
  }

  if (html) {
    autoStartMessage.innerHTML = html;
    return;
  }

  autoStartMessage.textContent = text;
}

function resetActionModalButtons() {
  const buttons = [btnAutoStartCancel, btnAutoStartRestart, btnAutoStartContinue];
  buttons.forEach((button) => {
    if (!button) return;
    button.hidden = true;
    button.disabled = false;
    button.onclick = null;
  });
  currentModalActions = [];
}

function configureActionModalButton(button, action) {
  if (!button) return;
  if (!action) {
    button.hidden = true;
    button.onclick = null;
    return;
  }

  button.hidden = false;
  button.disabled = false;
  button.textContent = action.label;
  button.className = `btn ${action.variant || 'btn-outline'} btn-sm`;
  button.onclick = () => resolveModalChoice(action.id);
}

function configureActionModalOption(option) {
  if (!modalOptionRow || !modalOptionInput || !modalOptionText) {
    return;
  }

  if (!option) {
    resetActionModalOption();
    return;
  }

  modalOptionRow.hidden = false;
  modalOptionInput.checked = Boolean(option.checked);
  modalOptionInput.disabled = Boolean(option.disabled);
  modalOptionText.textContent = option.label || '不再提示';
}

function configureActionModalAlert(alert) {
  if (!autoStartAlert) {
    return;
  }

  if (!alert?.text) {
    resetActionModalAlert();
    return;
  }

  autoStartAlert.hidden = false;
  autoStartAlert.textContent = alert.text;
  autoStartAlert.className = `modal-alert${alert.tone === 'danger' ? ' is-danger' : ''}`;
}

function resolveModalChoice(choice) {
  const optionChecked = Boolean(modalOptionInput?.checked);
  const result = typeof modalResultBuilder === 'function'
    ? modalResultBuilder(choice, { optionChecked })
    : choice;
  if (modalChoiceResolver) {
    modalChoiceResolver(result);
    modalChoiceResolver = null;
  }
  modalResultBuilder = null;
  resetActionModalButtons();
  resetActionModalAlert();
  resetActionModalOption();
  if (autoStartModal) {
    autoStartModal.hidden = true;
  }
}

function openActionModal({ title, message, messageHtml, actions, option, alert, buildResult }) {
  if (!autoStartModal) {
    return Promise.resolve(null);
  }

  if (modalChoiceResolver) {
    resolveModalChoice(null);
  }

  resetActionModalButtons();
  autoStartTitle.textContent = title;
  setActionModalMessageContent({ text: message, html: messageHtml });
  currentModalActions = actions || [];
  modalResultBuilder = typeof buildResult === 'function' ? buildResult : null;
  const buttonSlots = currentModalActions.length <= 2
    ? [btnAutoStartCancel, btnAutoStartContinue]
    : [btnAutoStartCancel, btnAutoStartRestart, btnAutoStartContinue];
  buttonSlots.forEach((button, index) => {
    configureActionModalButton(button, currentModalActions[index]);
  });
  configureActionModalAlert(alert);
  configureActionModalOption(option);
  autoStartModal.hidden = false;

  return new Promise((resolve) => {
    modalChoiceResolver = resolve;
  });
}

function openAutoStartChoiceDialog(startStep, options = {}) {
  const runningStep = Number.isInteger(options.runningStep) ? options.runningStep : null;
  const continueMessage = runningStep
    ? `继续当前会先等待步骤 ${runningStep} 完成，再按最新进度自动执行。`
    : `继续当前会从步骤 ${startStep} 开始自动执行。`;
  return openActionModal({
    title: '启动自动',
    message: `检测到当前已有流程进度。${continueMessage}重新开始会清空当前流程进度并从步骤 1 新开一轮。`,
    actions: [
      { id: null, label: '取消', variant: 'btn-ghost' },
      { id: 'restart', label: '重新开始', variant: 'btn-outline' },
      { id: 'continue', label: '继续当前', variant: 'btn-primary' },
    ],
  });
}

async function openConfirmModal({ title, message, confirmLabel = '确认', confirmVariant = 'btn-primary', alert = null }) {
  const choice = await openActionModal({
    title,
    message,
    alert,
    actions: [
      { id: null, label: '取消', variant: 'btn-ghost' },
      { id: 'confirm', label: confirmLabel, variant: confirmVariant },
    ],
  });
  return choice === 'confirm';
}

async function openConfirmModalWithOption({
  title,
  message,
  messageHtml = '',
  confirmLabel = '确认',
  confirmVariant = 'btn-primary',
  alert = null,
  optionLabel = '不再提示',
  optionChecked = false,
  optionDisabled = false,
}) {
  const result = await openActionModal({
    title,
    message,
    messageHtml,
    alert,
    actions: [
      { id: null, label: '取消', variant: 'btn-ghost' },
      { id: 'confirm', label: confirmLabel, variant: confirmVariant },
    ],
    option: {
      label: optionLabel,
      checked: optionChecked,
      disabled: optionDisabled,
    },
    buildResult: (choice, meta) => ({
      choice,
      optionChecked: Boolean(meta?.optionChecked),
    }),
  });

  return {
    confirmed: result?.choice === 'confirm',
    optionChecked: Boolean(result?.optionChecked),
  };
}



function isPromptDismissed(storageKey) {
  return localStorage.getItem(storageKey) === '1';
}

function setPromptDismissed(storageKey, dismissed) {
  if (dismissed) {
    localStorage.setItem(storageKey, '1');
  } else {
    localStorage.removeItem(storageKey);
  }
}

function isAutoSkipFailuresPromptDismissed() {
  return isPromptDismissed(AUTO_SKIP_FAILURES_PROMPT_DISMISSED_STORAGE_KEY);
}

function setAutoSkipFailuresPromptDismissed(dismissed) {
  setPromptDismissed(AUTO_SKIP_FAILURES_PROMPT_DISMISSED_STORAGE_KEY, dismissed);
}

function isAutoRunFallbackRiskPromptDismissed() {
  return isPromptDismissed(AUTO_RUN_FALLBACK_RISK_PROMPT_DISMISSED_STORAGE_KEY);
}

function setAutoRunFallbackRiskPromptDismissed(dismissed) {
  setPromptDismissed(AUTO_RUN_FALLBACK_RISK_PROMPT_DISMISSED_STORAGE_KEY, dismissed);
}

function isCloudflareTempEmailRegistrationLookupPromptDismissed() {
  return isPromptDismissed(CLOUDFLARE_TEMP_EMAIL_REGISTRATION_LOOKUP_PROMPT_DISMISSED_STORAGE_KEY);
}

function setCloudflareTempEmailRegistrationLookupPromptDismissed(dismissed) {
  setPromptDismissed(CLOUDFLARE_TEMP_EMAIL_REGISTRATION_LOOKUP_PROMPT_DISMISSED_STORAGE_KEY, dismissed);
}

function shouldWarnAutoRunFallbackRisk(totalRuns, autoRunSkipFailures) {
  return totalRuns >= AUTO_RUN_FALLBACK_RISK_WARNING_MIN_RUNS;
}

function buildCloudflareTempEmailRegistrationLookupPromptHtml() {
  const cloudflareRepoLink = escapeHtml(CLOUDFLARE_TEMP_EMAIL_REPOSITORY_URL);
  return `需要部署本扩展作者修改后的 <a href="${cloudflareRepoLink}" target="_blank" rel="noopener noreferrer" data-external-url="${cloudflareRepoLink}">Cloudflare Temp Email</a>；部署后可支持多线程收码。`;
}

async function confirmCloudflareTempEmailRegistrationLookupIfNeeded() {
  if (isCloudflareTempEmailRegistrationLookupPromptDismissed()) {
    return true;
  }

  const result = await openConfirmModalWithOption({
    title: '注册邮箱查信',
    messageHtml: buildCloudflareTempEmailRegistrationLookupPromptHtml(),
    confirmLabel: '我已知晓',
    optionLabel: '不再提醒',
  });

  if (result.confirmed && result.optionChecked) {
    setCloudflareTempEmailRegistrationLookupPromptDismissed(true);
  }

  return result.confirmed;
}

async function openAutoSkipFailuresConfirmModal() {
  const result = await openConfirmModalWithOption({
    title: '自动重试说明',
    message: `开启后，自动模式在某一轮失败时，会先在当前轮自动重试；单轮最多重试 ${AUTO_RUN_MAX_RETRIES_PER_ROUND} 次，仍失败则放弃当前轮并继续下一轮。线程间隔只在开启自动重试且总轮数大于 1 时生效。`,
    confirmLabel: '确认开启',
  });

  return {
    confirmed: result.confirmed,
    dismissPrompt: result.optionChecked,
  };
}

async function openAutoRunFallbackRiskConfirmModal(totalRuns) {
  const result = await openConfirmModalWithOption({
    title: '自动运行风险提醒',
    message: `当前轮数已经不适合单节点情况，请确保已经配置并打开节点轮询功能，避免连续使用一个节点注册，导致出现手机号验证。`,
    confirmLabel: '继续',
  });

  return {
    confirmed: result.confirmed,
    dismissPrompt: result.optionChecked,
  };
}

function updateConfigMenuControls() {
  const disabled = configActionInFlight || settingsSaveInFlight;
  const importLocked = disabled
    || currentAutoRun.autoRunning
    || Object.values(getStepStatuses()).some((status) => status === 'running');
  if (btnConfigMenu) {
    btnConfigMenu.disabled = disabled;
    btnConfigMenu.setAttribute('aria-expanded', String(configMenuOpen));
  }
  if (configMenu) {
    configMenu.hidden = !configMenuOpen;
  }
  if (btnExportSettings) {
    btnExportSettings.disabled = disabled;
  }
  if (btnImportSettings) {
    btnImportSettings.disabled = importLocked;
  }
}

function closeConfigMenu() {
  configMenuOpen = false;
  updateConfigMenuControls();
}

function openConfigMenu() {
  configMenuOpen = true;
  updateConfigMenuControls();
}

function toggleConfigMenu() {
  configMenuOpen ? closeConfigMenu() : openConfigMenu();
}

async function waitForSettingsSaveIdle() {
  while (settingsSaveInFlight) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

async function flushPendingSettingsBeforeExport() {
  clearTimeout(settingsAutoSaveTimer);
  await waitForSettingsSaveIdle();
  if (settingsDirty) {
    await saveSettings({ silent: true });
  }
}

async function settlePendingSettingsBeforeImport() {
  clearTimeout(settingsAutoSaveTimer);
  await waitForSettingsSaveIdle();
}

function downloadTextFile(content, fileName, mimeType = 'application/json;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

function isDoneStatus(status) {
  return status === 'completed' || status === 'manual_completed' || status === 'skipped';
}

function escapeCssValue(value = '') {
  const raw = String(value || '');
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(raw);
  }
  return raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function getNodeStatuses(state = latestState) {
  const merged = { ...NODE_DEFAULT_STATUSES, ...(state?.nodeStatuses || {}) };
  return Object.fromEntries(NODE_IDS.map((nodeId) => [nodeId, merged[nodeId] || 'pending']));
}

function getStepStatuses(state = latestState) {
  const merged = { ...STEP_DEFAULT_STATUSES };
  if (typeof getNodeStatuses === 'function') {
    const nodeStatuses = getNodeStatuses(state);
    for (const [nodeId, status] of Object.entries(nodeStatuses)) {
      const step = getStepIdByNodeIdForCurrentMode(nodeId);
      if (step) {
        merged[step] = status || 'pending';
      }
    }
  }
  return Object.fromEntries(STEP_IDS.map((stepId) => [stepId, merged[stepId] || 'pending']));
}

function getFirstUnfinishedNode(state = latestState) {
  const statuses = getNodeStatuses(state);
  for (const nodeId of NODE_IDS) {
    if (!isDoneStatus(statuses[nodeId])) {
      return nodeId;
    }
  }
  return '';
}

function getFirstUnfinishedStep(state = latestState) {
  const nodeId = getFirstUnfinishedNode(state);
  return nodeId ? getStepIdByNodeIdForCurrentMode(nodeId) : null;
}

function getRunningNodes(state = latestState) {
  const statuses = getNodeStatuses(state);
  return Object.entries(statuses)
    .filter(([, status]) => status === 'running')
    .map(([nodeId]) => nodeId);
}

function getRunningSteps(state = latestState) {
  return getRunningNodes(state)
    .map((nodeId) => getStepIdByNodeIdForCurrentMode(nodeId))
    .filter((step) => Number.isInteger(step) && step > 0)
    .sort((a, b) => a - b);
}

function hasSavedProgress(state = latestState) {
  const statuses = getNodeStatuses(state);
  return Object.values(statuses).some((status) => status !== 'pending');
}

function shouldOfferAutoModeChoice(state = latestState) {
  return hasSavedProgress(state) && getFirstUnfinishedStep(state) !== null;
}

function resolveCurrentRegistrationEmailDisplay(state = {}) {
  const currentEmail = String(state?.registrationEmailState?.current || '').trim();
  if (currentEmail) {
    return currentEmail;
  }
  return String(state?.email || '').trim();
}

function renderCurrentRegistrationEmail(state = latestState) {
  if (!currentRegistrationEmail) {
    return;
  }
  // 只显示当前邮箱，不回退到 previous，避免恢复/清空流程时展示过期注册邮箱。
  const email = resolveCurrentRegistrationEmailDisplay(state);
  const text = email ? `当前邮箱：${email}` : '当前邮箱：未生成';
  currentRegistrationEmail.textContent = text;
  currentRegistrationEmail.title = text;
  if (email) {
    currentRegistrationEmail.classList.add('has-value');
  } else {
    currentRegistrationEmail.classList.remove('has-value');
  }
}

function syncLatestState(nextState) {
  const mergedNodeStatuses = nextState?.nodeStatuses
    ? { ...NODE_DEFAULT_STATUSES, ...(latestState?.nodeStatuses || {}), ...nextState.nodeStatuses }
    : getNodeStatuses(latestState);

  latestState = {
    ...(latestState || {}),
    ...(nextState || {}),
    nodeStatuses: mergedNodeStatuses,
  };

  renderCurrentRegistrationEmail(latestState);
  renderAccountRecords(latestState);
}

function getAccountWriteLocalDateText(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeAccountWriteFlowType(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === ACCOUNT_WRITE_FLOW_TYPE_GPT) return ACCOUNT_WRITE_FLOW_TYPE_GPT;
  if (normalized === ACCOUNT_WRITE_FLOW_TYPE_CODEX) return ACCOUNT_WRITE_FLOW_TYPE_CODEX;
  return ACCOUNT_WRITE_FLOW_TYPE_FULL;
}

function resolveAccountWriteFlowTypeFromSelectFlow(selectFlowValue = '') {
  const mapped = ACCOUNT_WRITE_FLOW_PREFIX_BY_SELECT_FLOW[String(selectFlowValue || '').trim()];
  return normalizeAccountWriteFlowType(mapped);
}

function normalizeExecutionMode(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === EXECUTION_MODE_REGISTER_GPT) return EXECUTION_MODE_REGISTER_GPT;
  if (normalized === EXECUTION_MODE_AUTHORIZE_CODEX) return EXECUTION_MODE_AUTHORIZE_CODEX;
  return EXECUTION_MODE_FULL;
}

function resolveExecutionModeFromSelectFlow(selectFlowValue = '') {
  const mapped = EXECUTION_MODE_BY_SELECT_FLOW[String(selectFlowValue || '').trim()];
  return normalizeExecutionMode(mapped);
}

function resolveSelectFlowValueFromExecutionMode(mode = '') {
  const normalizedMode = normalizeExecutionMode(mode);
  return SELECT_FLOW_BY_EXECUTION_MODE[normalizedMode] || 'full-flow';
}

function resolveExecutionStepRange(mode = '') {
  const normalizedMode = normalizeExecutionMode(mode);
  const resolvedRange = EXECUTION_STEP_RANGE_BY_MODE[normalizedMode] || EXECUTION_STEP_RANGE_BY_MODE[EXECUTION_MODE_FULL];
  return {
    startStep: resolvedRange.startStep,
    endStep: resolvedRange.endStep,
  };
}

function isBasicEmailFormat(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function normalizeImportedAccounts(value = []) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function normalizeAccountRecordIdentifierType(value = '') {
  return String(value || '').trim().toLowerCase() === 'phone' ? 'phone' : 'email';
}

// 从账号记录提取可导出的邮箱：支持 email 字段与 email 类型 accountIdentifier。
function extractAccountRecordEmail(record = {}) {
  if (!record || typeof record !== 'object') {
    return '';
  }
  const normalizedEmail = String(record.email || '').trim().toLowerCase();
  if (normalizedEmail) {
    return normalizedEmail;
  }

  const identifierType = normalizeAccountRecordIdentifierType(record.accountIdentifierType);
  const accountIdentifier = String(record.accountIdentifier || '').trim().toLowerCase();
  if (identifierType !== 'email' || !accountIdentifier) {
    return '';
  }
  return accountIdentifier;
}

// 汇总账号记录中的邮箱（去重后导出）。
function collectExportableAccountEmails(state = latestState) {
  const historyRecords = Array.isArray(state?.accountRunHistory) ? state.accountRunHistory : [];
  const exportedEmails = [];
  const seenEmails = new Set();
  for (const record of historyRecords) {
    const email = extractAccountRecordEmail(record);
    if (!email || !isBasicEmailFormat(email) || seenEmails.has(email)) {
      continue;
    }
    seenEmails.add(email);
    exportedEmails.push(email);
  }
  return exportedEmails;
}

function buildAccountsExportFileName(date = new Date()) {
  const safeDate = date instanceof Date ? date : new Date(date);
  const pad = (value) => String(value).padStart(2, '0');
  return `accounts-${safeDate.getFullYear()}${pad(safeDate.getMonth() + 1)}${pad(safeDate.getDate())}-${pad(safeDate.getHours())}${pad(safeDate.getMinutes())}${pad(safeDate.getSeconds())}.json`;
}

async function handleExportAccountsButtonClick() {
  try {
    const exportedEmails = collectExportableAccountEmails(latestState);
    if (!exportedEmails.length) {
      showToast('账号记录中暂无可导出的邮箱。', 'warn', 2000);
      return;
    }

    const fileName = buildAccountsExportFileName();
    downloadTextFile(JSON.stringify(exportedEmails, null, 2), fileName, 'application/json;charset=utf-8');
    showToast(`已导出 ${exportedEmails.length} 个账号：${fileName}`, 'success', 2200);
  } catch (error) {
    showToast(`导出账号失败：${error?.message || error}`, 'error');
  }
}

function getImportedAccountsFromState(state = latestState) {
  return normalizeImportedAccounts(state?.importedAccounts);
}

function getImportedAccountsCount(state = latestState) {
  return getImportedAccountsFromState(state).length;
}

function syncRunCountFromImportedAccounts(state = latestState) {
  const selectedFlow = String(selectFlow?.value || '').trim();
  if (selectedFlow !== 'authorize-codex') {
    return;
  }
  const importedCount = getImportedAccountsCount(state);
  if (importedCount > 0) {
    inputRunCount.value = String(importedCount);
  }
}

// 根据执行流程与日期生成写入账号文件名。
function buildAccountOutputFileName(flowType, dateText) {
  const normalizedFlowType = normalizeAccountWriteFlowType(flowType);
  const normalizedDateText = String(dateText || '').trim() || getAccountWriteLocalDateText();
  return `${normalizedFlowType}-${normalizedDateText}.json`;
}

function openAccountWriteDb() {
  if (accountWriteDbPromise) {
    return accountWriteDbPromise;
  }

  accountWriteDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(ACCOUNT_WRITE_DB_NAME, ACCOUNT_WRITE_DB_VERSION);
    request.onerror = () => reject(request.error || new Error('打开写入账号本地数据库失败'));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ACCOUNT_WRITE_DB_STORE)) {
        db.createObjectStore(ACCOUNT_WRITE_DB_STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });

  return accountWriteDbPromise;
}

async function readAccountWriteDirectoryHandleFromDb() {
  const db = await openAccountWriteDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ACCOUNT_WRITE_DB_STORE, 'readonly');
    const store = tx.objectStore(ACCOUNT_WRITE_DB_STORE);
    const request = store.get(ACCOUNT_WRITE_DB_DIRECTORY_HANDLE_KEY);
    request.onerror = () => reject(request.error || new Error('读取写入目录句柄失败'));
    request.onsuccess = () => resolve(request.result?.value || null);
  });
}

async function saveAccountWriteDirectoryHandleToDb(directoryHandle) {
  const db = await openAccountWriteDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ACCOUNT_WRITE_DB_STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('保存写入目录句柄失败'));
    tx.objectStore(ACCOUNT_WRITE_DB_STORE).put({
      key: ACCOUNT_WRITE_DB_DIRECTORY_HANDLE_KEY,
      value: directoryHandle || null,
    });
  });
}

async function clearAccountWriteDirectoryHandleFromDb() {
  const db = await openAccountWriteDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ACCOUNT_WRITE_DB_STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('清理写入目录句柄失败'));
    tx.objectStore(ACCOUNT_WRITE_DB_STORE).delete(ACCOUNT_WRITE_DB_DIRECTORY_HANDLE_KEY);
  });
}

async function ensureAccountWriteDirectoryPermission(directoryHandle, options = {}) {
  const { mode = 'readwrite', requestIfNeeded = false } = options;
  if (!directoryHandle || typeof directoryHandle.queryPermission !== 'function') {
    return Boolean(directoryHandle);
  }

  const descriptor = { mode };
  let permission = await directoryHandle.queryPermission(descriptor);
  if (permission === 'granted') {
    return true;
  }

  if (requestIfNeeded && typeof directoryHandle.requestPermission === 'function') {
    permission = await directoryHandle.requestPermission(descriptor);
    return permission === 'granted';
  }

  return false;
}

// 确保目标文件存在，首次创建或空文件时写入默认 JSON 数组 []。
async function ensureAccountOutputFile(directoryHandle, fileName) {
  if (!directoryHandle?.getFileHandle) {
    throw new Error('目录句柄无效，无法创建写入账号文件。');
  }
  const normalizedFileName = String(fileName || '').trim();
  if (!normalizedFileName) {
    throw new Error('写入账号文件名不能为空。');
  }

  const fileHandle = await directoryHandle.getFileHandle(normalizedFileName, { create: true });
  const file = await fileHandle.getFile();
  if (file.size === 0) {
    const writable = await fileHandle.createWritable();
    await writable.write('[]');
    await writable.close();
  }
  return fileHandle;
}

// 将注册邮箱追加写入 JSON 数组文件。
async function appendRegisteredEmailToFile(email, options = {}) {
  const normalizedEmail = String(email || '').trim();
  if (!normalizedEmail) {
    throw new Error('注册邮箱为空，无法写入账号文件。');
  }

  const {
    directoryHandle = accountWriteDirectoryHandle,
    fileName = latestState?.accountWriteFileName,
  } = options;
  if (!directoryHandle) {
    throw new Error('尚未选择写入目录。');
  }

  const normalizedFileName = String(fileName || '').trim();
  if (!normalizedFileName) {
    throw new Error('写入账号文件名为空。');
  }

  const fileHandle = await ensureAccountOutputFile(directoryHandle, normalizedFileName);
  const currentFile = await fileHandle.getFile();
  const rawText = await currentFile.text();
  let emailList = [];
  if (rawText.trim()) {
    try {
      const parsed = JSON.parse(rawText);
      if (!Array.isArray(parsed)) {
        throw new Error('写入账号文件内容不是 JSON 数组。');
      }
      emailList = parsed;
    } catch (error) {
      throw new Error(`解析写入账号文件失败：${error.message}`);
    }
  }

  emailList.push(normalizedEmail);
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(emailList, null, 2));
  await writable.close();
  return {
    fileName: normalizedFileName,
    totalCount: emailList.length,
  };
}

async function saveAccountWriteSettingsPatch(patch = {}) {
  const response = await chrome.runtime.sendMessage({
    type: 'SAVE_SETTING',
    source: 'sidepanel',
    payload: patch,
  });
  if (response?.error) {
    throw new Error(response.error);
  }

  syncLatestState({
    ...(patch || {}),
  });
  markSettingsDirty(false);
  updateAccountWriteButtonState();
  return response;
}

function updateAccountWriteButtonState() {
  if (!accountWriteControl && !inputWriteAccountsEnabled) {
    return;
  }
  const enabled = Boolean(latestState?.isAccountWriteEnabled) && Boolean(accountWriteDirectoryHandle);
  const title = enabled
    ? `已启用写入账号：${latestState?.accountWriteFileName || '当日文件'}`
    : '开启后选择目录并启用写入账号，关闭后不写入账号';
  if (accountWriteControl) {
    accountWriteControl.classList.toggle('is-account-write-enabled', enabled);
    accountWriteControl.title = title;
  }
  if (labelWriteAccounts) {
    labelWriteAccounts.title = title;
  }
  if (inputWriteAccountsEnabled) {
    inputWriteAccountsEnabled.checked = enabled;
    inputWriteAccountsEnabled.title = title;
  }
}

async function ensureAndPersistAccountWriteFile(options = {}) {
  const {
    selectFlowValue = selectFlow?.value,
    flowType = '',
    requestPermission = false,
    persistState = true,
  } = options;

  if (!accountWriteDirectoryHandle) {
    throw new Error('尚未选择写入目录。');
  }

  const hasPermission = await ensureAccountWriteDirectoryPermission(accountWriteDirectoryHandle, {
    mode: 'readwrite',
    requestIfNeeded: requestPermission,
  });
  if (!hasPermission) {
    throw new Error('当前目录尚未授予读写权限。');
  }

  const resolvedFlowType = String(flowType || '').trim()
    ? normalizeAccountWriteFlowType(flowType)
    : resolveAccountWriteFlowTypeFromSelectFlow(selectFlowValue);
  const fileName = buildAccountOutputFileName(resolvedFlowType, getAccountWriteLocalDateText());
  await ensureAccountOutputFile(accountWriteDirectoryHandle, fileName);

  const patch = {
    isAccountWriteEnabled: true,
    accountWriteFlowType: resolvedFlowType,
    accountWriteFileName: fileName,
    accountWriteSelectedAt: Date.now(),
  };
  if (persistState) {
    await saveAccountWriteSettingsPatch(patch);
  } else {
    syncLatestState(patch);
    updateAccountWriteButtonState();
  }

  return patch;
}

async function disableAccountWriteState(options = {}) {
  const {
    clearDirectoryHandle = false,
    clearDirectoryHandleInDb = false,
    persistState = true,
  } = options;

  if (clearDirectoryHandle) {
    accountWriteDirectoryHandle = null;
  }
  if (clearDirectoryHandleInDb) {
    await clearAccountWriteDirectoryHandleFromDb().catch(() => {});
  }

  const patch = {
    isAccountWriteEnabled: false,
    accountWriteFlowType: '',
    accountWriteFileName: '',
    accountWriteSelectedAt: 0,
  };
  if (persistState) {
    await saveAccountWriteSettingsPatch(patch);
  } else {
    syncLatestState(patch);
    updateAccountWriteButtonState();
  }
}

async function initializeAccountWriteDirectoryState() {
  try {
    accountWriteDirectoryHandle = await readAccountWriteDirectoryHandleFromDb();
    if (!accountWriteDirectoryHandle) {
      if (latestState?.isAccountWriteEnabled) {
        await disableAccountWriteState({ persistState: true });
      } else {
        updateAccountWriteButtonState();
      }
      return;
    }

    const granted = await ensureAccountWriteDirectoryPermission(accountWriteDirectoryHandle, {
      mode: 'readwrite',
      requestIfNeeded: false,
    });
    if (!granted) {
      await disableAccountWriteState({
        clearDirectoryHandle: true,
        clearDirectoryHandleInDb: true,
        persistState: true,
      });
      return;
    }

    if (latestState?.isAccountWriteEnabled) {
      await ensureAndPersistAccountWriteFile({
        flowType: latestState?.accountWriteFlowType,
        selectFlowValue: selectFlow?.value,
        requestPermission: false,
        persistState: true,
      });
    } else {
      updateAccountWriteButtonState();
    }
  } catch (error) {
    console.warn('初始化写入账号目录失败：', error);
    updateAccountWriteButtonState();
  }
}

// 打开写入账号开关时，选择本地目录并创建当前流程的写入文件。
async function enableAccountWriteFromDirectoryPicker() {
  if (!inputWriteAccountsEnabled) {
    return;
  }
  if (typeof window.showDirectoryPicker !== 'function') {
    showToast('当前浏览器不支持目录选择，请升级到支持 File System Access API 的版本。', 'error');
    await disableAccountWriteState({
      clearDirectoryHandle: true,
      clearDirectoryHandleInDb: true,
      persistState: true,
    });
    return;
  }

  try {
    const directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    accountWriteDirectoryHandle = directoryHandle;
    await saveAccountWriteDirectoryHandleToDb(directoryHandle);
    const patch = await ensureAndPersistAccountWriteFile({
      selectFlowValue: selectFlow?.value,
      requestPermission: true,
      persistState: true,
    });
    showToast(`写入账号已启用：${patch.accountWriteFileName}`, 'success', 1800);
  } catch (error) {
    if (error?.name === 'AbortError') {
      await disableAccountWriteState({
        persistState: true,
      });
      return;
    }
    await disableAccountWriteState({
      clearDirectoryHandle: true,
      clearDirectoryHandleInDb: true,
      persistState: true,
    });
    showToast(`启用写入账号失败：${error?.message || error}`, 'error');
    updateAccountWriteButtonState();
  }
}

// 同步写入账号开关：开启选择目录，关闭后持久化为不写入账号。
async function handleWriteAccountsToggleChange() {
  if (!inputWriteAccountsEnabled) {
    return;
  }

  inputWriteAccountsEnabled.disabled = true;
  try {
    if (inputWriteAccountsEnabled.checked) {
      await enableAccountWriteFromDirectoryPicker();
    } else {
      await disableAccountWriteState({
        persistState: true,
      });
      showToast('写入账号已关闭，后续不会写入账号。', 'info', 1600);
    }
  } finally {
    inputWriteAccountsEnabled.disabled = false;
    updateAccountWriteButtonState();
  }
}

async function handleWriteAccountStep6Request(payload = {}) {
  const email = String(payload?.email || '').trim();
  if (!email) {
    return { ok: true, skipped: true, reason: 'empty_email' };
  }
  if (!latestState?.isAccountWriteEnabled) {
    return { ok: true, skipped: true, reason: 'not_enabled' };
  }
  if (!accountWriteDirectoryHandle) {
    return { ok: true, skipped: true, reason: 'missing_directory_handle' };
  }

  const hasPermission = await ensureAccountWriteDirectoryPermission(accountWriteDirectoryHandle, {
    mode: 'readwrite',
    requestIfNeeded: false,
  });
  if (!hasPermission) {
    throw new Error('写入目录权限已失效，请重新点击“写入账号”选择目录。');
  }

  const flowType = normalizeAccountWriteFlowType(payload?.flowType || latestState?.accountWriteFlowType);
  const fileName = buildAccountOutputFileName(flowType, getAccountWriteLocalDateText());
  await appendRegisteredEmailToFile(email, {
    directoryHandle: accountWriteDirectoryHandle,
    fileName,
  });

  if (latestState?.accountWriteFileName !== fileName || latestState?.accountWriteFlowType !== flowType) {
    await saveAccountWriteSettingsPatch({
      isAccountWriteEnabled: true,
      accountWriteFlowType: flowType,
      accountWriteFileName: fileName,
      accountWriteSelectedAt: latestState?.accountWriteSelectedAt || Date.now(),
    });
  } else {
    updateAccountWriteButtonState();
  }

  return {
    ok: true,
    written: true,
    fileName,
    flowType,
  };
}

async function pickImportedAccountsFile() {
  if (typeof window.showOpenFilePicker === 'function') {
    const handles = await window.showOpenFilePicker({
      multiple: false,
      types: [{
        description: '账号 JSON 文件',
        accept: {
          'application/json': ['.json'],
        },
      }],
      excludeAcceptAllOption: false,
    });
    if (!Array.isArray(handles) || !handles[0]) {
      return null;
    }
    return handles[0].getFile();
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', () => {
      const file = input.files?.[0] || null;
      input.remove();
      resolve(file);
    }, { once: true });
    input.click();
  });
}

function parseImportedAccountsFromText(rawText = '') {
  let parsedPayload = null;
  try {
    parsedPayload = JSON.parse(rawText);
  } catch {
    throw new Error('导入账号文件不是有效的 JSON。');
  }
  if (!Array.isArray(parsedPayload)) {
    throw new Error('导入账号文件必须是 JSON 数组，例如 [\"a@example.com\",\"b@example.com\"]。');
  }

  const normalizedAccounts = normalizeImportedAccounts(parsedPayload);
  if (!normalizedAccounts.length) {
    throw new Error('导入账号列表为空，请至少提供 1 个邮箱账号。');
  }

  const invalidAccount = normalizedAccounts.find((email) => !isBasicEmailFormat(email));
  if (invalidAccount) {
    throw new Error(`导入账号包含非法邮箱：${invalidAccount}`);
  }

  return normalizedAccounts;
}

async function handleImportAccountsButtonClick() {
  try {
    const file = await pickImportedAccountsFile();
    if (!file) {
      return;
    }
    const rawText = await file.text();
    const importedAccounts = parseImportedAccountsFromText(rawText);

    syncLatestState({ importedAccounts });
    inputRunCount.value = String(importedAccounts.length);
    clearPendingAutoRunStartRunCount();
    updateFallbackThreadIntervalInputState();

    markSettingsDirty(true);
    await saveSettings({ silent: true });
    showToast(`已导入 ${importedAccounts.length} 个账号，运行次数已同步为 ${importedAccounts.length}。`, 'success', 2200);
  } catch (error) {
    if (error?.name === 'AbortError') {
      return;
    }
    showToast(`导入账号失败：${error?.message || error}`, 'error');
  }
}

let accountRunHistoryRefreshTimer = null;

function scheduleAccountRunHistoryRefresh(delayMs = 150) {
  if (accountRunHistoryRefreshTimer) {
    clearTimeout(accountRunHistoryRefreshTimer);
  }
  accountRunHistoryRefreshTimer = setTimeout(() => {
    accountRunHistoryRefreshTimer = null;
    chrome.runtime.sendMessage({ type: 'GET_STATE', source: 'sidepanel' }).then(state => {
      syncLatestState(state);
      syncAutoRunState(state);
      updateStatusDisplay(latestState);
      updateButtonStates();
    }).catch(() => { });
  }, Math.max(0, Number(delayMs) || 0));
}

function normalizeOperationDelayEnabled(value) {
  return typeof value === 'boolean' ? value : true;
}

function appendOperationDelayLog(enabled, level = 'info', message = '') {
  appendLog({
    timestamp: Date.now(),
    level,
    message: message || (enabled
      ? '操作间延迟已开启：页面输入、选择、点击、提交、继续、授权后按操作类型分级等待（0.3~2 秒）。'
      : '操作间延迟已关闭：页面操作将连续执行。'),
  });
}

function applyOperationDelayState(state = latestState, options = {}) {
  const enabled = options.restoreFailed ? true : normalizeOperationDelayEnabled(state?.operationDelayEnabled);
  lastConfirmedOperationDelayEnabled = enabled;
  if (inputOperationDelayEnabled) inputOperationDelayEnabled.checked = enabled;
  if (typeof syncLatestState === 'function') {
    syncLatestState({ operationDelayEnabled: enabled });
  }
  if (options.restoreFailed) {
    appendOperationDelayLog(true, 'warn', '操作间延迟设置读取失败，已回退为默认开启。');
  }
}

async function persistOperationDelayToggle() {
  const nextEnabled = normalizeOperationDelayEnabled(inputOperationDelayEnabled?.checked);
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_SETTING',
      source: 'sidepanel',
      payload: { operationDelayEnabled: nextEnabled },
    });
    if (response?.error) throw new Error(response.error);
    const confirmed = normalizeOperationDelayEnabled(response?.state?.operationDelayEnabled ?? nextEnabled);
    lastConfirmedOperationDelayEnabled = confirmed;
    if (inputOperationDelayEnabled) inputOperationDelayEnabled.checked = confirmed;
    syncLatestState({ operationDelayEnabled: confirmed });
    appendOperationDelayLog(confirmed);
  } catch (error) {
    if (inputOperationDelayEnabled) inputOperationDelayEnabled.checked = lastConfirmedOperationDelayEnabled;
    appendOperationDelayLog(lastConfirmedOperationDelayEnabled, 'error', `操作间延迟设置保存失败，已恢复为上一次确认的状态：${error.message}`);
    throw error;
  }
}

function hasOwnStateValue(source, key) {
  return Object.prototype.hasOwnProperty.call(source, key);
}

function readAutoRunStateValue(source, keys, fallback) {
  for (const key of keys) {
    if (hasOwnStateValue(source, key)) {
      return source[key];
    }
  }
  return fallback;
}

function normalizePendingAutoRunStartRunCount(value) {
  const numeric = Math.floor(Number(value) || 0);
  return numeric > 0 ? numeric : 0;
}

function registerPendingAutoRunStartRunCount(totalRuns) {
  pendingAutoRunStartTotalRuns = normalizePendingAutoRunStartRunCount(totalRuns);
  pendingAutoRunStartExpiresAt = pendingAutoRunStartTotalRuns > 0
    ? Date.now() + 30000
    : 0;
}

function clearPendingAutoRunStartRunCount() {
  pendingAutoRunStartTotalRuns = 0;
  pendingAutoRunStartExpiresAt = 0;
}

function getPendingAutoRunStartRunCount() {
  if (pendingAutoRunStartTotalRuns > 0 && pendingAutoRunStartExpiresAt > 0 && Date.now() > pendingAutoRunStartExpiresAt) {
    clearPendingAutoRunStartRunCount();
  }
  return pendingAutoRunStartTotalRuns;
}

function getAutoRunSourceTotalRuns(source = {}) {
  return normalizePendingAutoRunStartRunCount(readAutoRunStateValue(source, ['autoRunTotalRuns', 'totalRuns'], 0));
}

function syncAutoRunState(source = {}) {
  const phase = source.autoRunPhase ?? source.phase ?? currentAutoRun.phase;
  const autoRunning = source.autoRunning !== undefined
    ? Boolean(source.autoRunning)
    : (source.autoRunPhase !== undefined || source.phase !== undefined
      ? ['scheduled', 'running', 'waiting_step', 'waiting_email', 'retrying', 'waiting_interval'].includes(phase)
      : currentAutoRun.autoRunning);

  currentAutoRun = {
    autoRunning,
    phase,
    currentRun: readAutoRunStateValue(source, ['autoRunCurrentRun', 'currentRun'], currentAutoRun.currentRun),
    totalRuns: readAutoRunStateValue(source, ['autoRunTotalRuns', 'totalRuns'], currentAutoRun.totalRuns),
    attemptRun: readAutoRunStateValue(source, ['autoRunAttemptRun', 'attemptRun'], currentAutoRun.attemptRun),
    scheduledAt: readAutoRunStateValue(source, ['scheduledAutoRunAt', 'scheduledAt'], currentAutoRun.scheduledAt),
    countdownAt: readAutoRunStateValue(source, ['autoRunCountdownAt', 'countdownAt'], currentAutoRun.countdownAt),
    countdownTitle: readAutoRunStateValue(source, ['autoRunCountdownTitle', 'countdownTitle'], currentAutoRun.countdownTitle),
    countdownNote: readAutoRunStateValue(source, ['autoRunCountdownNote', 'countdownNote'], currentAutoRun.countdownNote),
  };
}

function isAutoRunLockedPhase() {
  return currentAutoRun.phase === 'running'
    || currentAutoRun.phase === 'waiting_step'
    || currentAutoRun.phase === 'retrying'
    || currentAutoRun.phase === 'waiting_interval';
}

function isAutoRunPausedPhase() {
  return currentAutoRun.phase === 'waiting_email';
}

function isAutoRunWaitingStepPhase() {
  return currentAutoRun.phase === 'waiting_step';
}

function isAutoRunScheduledPhase() {
  return currentAutoRun.phase === 'scheduled';
}

function isAutoRunSourceSyncPhase(phase) {
  return ['scheduled', 'running', 'waiting_step', 'waiting_email', 'retrying', 'waiting_interval'].includes(phase);
}

function shouldSyncRunCountFromAutoRunSource(source = {}) {
  const phase = source.autoRunPhase ?? source.phase ?? currentAutoRun.phase;
  const autoRunning = source.autoRunning !== undefined
    ? Boolean(source.autoRunning)
    : isAutoRunSourceSyncPhase(phase);
  const shouldSync = autoRunning || isAutoRunSourceSyncPhase(phase);
  if (!shouldSync) {
    return false;
  }

  const pendingTotalRuns = getPendingAutoRunStartRunCount();
  if (pendingTotalRuns > 0) {
    const sourceTotalRuns = getAutoRunSourceTotalRuns(source);
    if (sourceTotalRuns > 0 && sourceTotalRuns !== pendingTotalRuns) {
      return false;
    }
    if (sourceTotalRuns === pendingTotalRuns) {
      clearPendingAutoRunStartRunCount();
    }
  }
  return true;
}

function getAutoRunLabel(payload = currentAutoRun) {
  if ((payload.phase ?? currentAutoRun.phase) === 'scheduled') {
    return (payload.totalRuns || 1) > 1 ? ` (${payload.totalRuns}轮)` : '';
  }
  const attemptLabel = payload.attemptRun ? ` · 尝试${payload.attemptRun}` : '';
  if ((payload.totalRuns || 1) > 1) {
    return ` (${payload.currentRun}/${payload.totalRuns}${attemptLabel})`;
  }
  return attemptLabel ? ` (${attemptLabel.slice(3)})` : '';
}

function normalizeAutoDelayMinutes(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return AUTO_DELAY_DEFAULT_MINUTES;
  }
  return Math.min(AUTO_DELAY_MAX_MINUTES, Math.max(AUTO_DELAY_MIN_MINUTES, Math.floor(numeric)));
}

function normalizeAutoRunThreadIntervalMinutes(value) {
  const rawValue = String(value ?? '').trim();
  if (!rawValue) {
    return AUTO_FALLBACK_THREAD_INTERVAL_DEFAULT_MINUTES;
  }

  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric)) {
    return AUTO_FALLBACK_THREAD_INTERVAL_DEFAULT_MINUTES;
  }

  return Math.min(
    AUTO_FALLBACK_THREAD_INTERVAL_MAX_MINUTES,
    Math.max(AUTO_FALLBACK_THREAD_INTERVAL_MIN_MINUTES, Math.floor(numeric))
  );
}

function normalizeAutoStepDelaySeconds(value) {
  const rawValue = String(value ?? '').trim();
  if (!rawValue) {
    return null;
  }

  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return Math.min(AUTO_STEP_DELAY_MAX_SECONDS, Math.max(AUTO_STEP_DELAY_MIN_SECONDS, Math.floor(numeric)));
}

function normalizeVerificationResendCount(value, fallback) {
  const rawValue = String(value ?? '').trim();
  if (!rawValue) {
    return fallback;
  }

  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(
    VERIFICATION_RESEND_COUNT_MAX,
    Math.max(VERIFICATION_RESEND_COUNT_MIN, Math.floor(numeric))
  );
}

function formatAutoStepDelayInputValue(value) {
  const normalized = normalizeAutoStepDelaySeconds(value);
  return normalized === null ? '' : String(normalized);
}

function normalizeCustomEmailPoolEntries(value = '') {
  const source = Array.isArray(value)
    ? value
    : String(value || '').split(/[\r\n,，;；]+/);

  return source
    .map((item) => String(item || '').trim().toLowerCase())
    .filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item));
}

function normalizeCustomEmailPoolEntryEmail(value = '') {
  return String(value || '').trim().toLowerCase();
}

function createCustomEmailPoolEntryId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `custom-pool-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeCustomEmailPoolEntryObjects(value = []) {
  const source = Array.isArray(value) ? value : [];
  const seenEmails = new Set();
  const entries = [];

  for (const rawEntry of source) {
    const asObject = rawEntry && typeof rawEntry === 'object'
      ? rawEntry
      : { email: rawEntry };
    const email = normalizeCustomEmailPoolEntryEmail(asObject.email || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      continue;
    }
    if (seenEmails.has(email)) {
      continue;
    }
    seenEmails.add(email);
    entries.push({
      id: String(asObject.id || createCustomEmailPoolEntryId()),
      email,
      enabled: asObject.enabled !== undefined ? Boolean(asObject.enabled) : true,
      used: Boolean(asObject.used),
      note: String(asObject.note || '').trim(),
      lastUsedAt: Number.isFinite(Number(asObject.lastUsedAt)) ? Number(asObject.lastUsedAt) : 0,
    });
  }

  return entries;
}

function getNormalizedCustomEmailPoolEntriesState() {
  const entries = (typeof customEmailPoolEntriesState !== 'undefined' && Array.isArray(customEmailPoolEntriesState))
    ? customEmailPoolEntriesState
    : [];
  return normalizeCustomEmailPoolEntryObjects(entries);
}

function getActiveCustomEmailPoolEmails(entries = getNormalizedCustomEmailPoolEntriesState()) {
  return normalizeCustomEmailPoolEntryObjects(entries)
    .filter((entry) => entry.enabled && !entry.used)
    .map((entry) => entry.email);
}

function setCustomEmailPoolEntriesState(entries = [], options = {}) {
  const { syncInput = true } = options;
  customEmailPoolEntriesState = normalizeCustomEmailPoolEntryObjects(entries);
  if (syncInput && inputCustomEmailPool) {
    inputCustomEmailPool.value = getActiveCustomEmailPoolEmails(customEmailPoolEntriesState).join('\n');
  }
}

function restoreCustomEmailPoolEntriesFromState(state = {}) {
  const rawEntries = Array.isArray(state?.customEmailPoolEntries)
    ? state.customEmailPoolEntries
    : [];
  if (rawEntries.length > 0) {
    return normalizeCustomEmailPoolEntryObjects(rawEntries);
  }
  return normalizeCustomEmailPoolEntries(state?.customEmailPool).map((email) => ({
    id: createCustomEmailPoolEntryId(),
    email,
    enabled: true,
    used: false,
    note: '',
    lastUsedAt: 0,
  }));
}

function usesCustomEmailPoolGenerator(provider = selectMailProvider.value) {
  const providerUsesYydsMail = typeof isYydsMailProvider === 'function'
    ? isYydsMailProvider(provider)
    : String(provider || '').trim().toLowerCase() === 'yyds-mail';
  return !isCustomMailProvider(provider)
    && !isLuckmailProvider(provider)
    && !providerUsesYydsMail
    && getSelectedEmailGenerator() === CUSTOM_EMAIL_POOL_GENERATOR;
}

function getCustomMailProviderPoolSize() {
  return normalizeCustomEmailPoolEntries(inputCustomMailProviderPool?.value).length;
}

function usesCustomMailProviderPool(provider = selectMailProvider.value) {
  return isCustomMailProvider(provider) && getCustomMailProviderPoolSize() > 0;
}

function getCustomEmailPoolSize() {
  if (typeof customEmailPoolEntriesState !== 'undefined' && Array.isArray(customEmailPoolEntriesState)) {
    const activeEntries = getActiveCustomEmailPoolEmails(customEmailPoolEntriesState);
    if (activeEntries.length > 0 || customEmailPoolEntriesState.length > 0) {
      return activeEntries.length;
    }
  }
  return normalizeCustomEmailPoolEntries(inputCustomEmailPool?.value).length;
}

function getLockedRunCountFromEmailPool(provider = selectMailProvider.value) {
  const resolveExecutionModeFromSelectFlowSafe = typeof resolveExecutionModeFromSelectFlow === 'function'
    ? resolveExecutionModeFromSelectFlow
    : ((selectFlowValue = '') => {
      const normalized = String(selectFlowValue || '').trim().toLowerCase();
      if (normalized === 'register-gpt' || normalized === 'register_gpt') {
        return 'register_gpt';
      }
      if (normalized === 'authorize-codex' || normalized === 'authorize_codex') {
        return 'authorize_codex';
      }
      return 'full';
    });
  const executionModeAuthorizeCodex = (typeof EXECUTION_MODE_AUTHORIZE_CODEX === 'string' && EXECUTION_MODE_AUTHORIZE_CODEX.trim())
    ? EXECUTION_MODE_AUTHORIZE_CODEX
    : 'authorize_codex';
  const executionMode = resolveExecutionModeFromSelectFlowSafe(
    typeof selectFlow !== 'undefined' ? selectFlow?.value : ''
  );
  if (executionMode === executionModeAuthorizeCodex) {
    return 0;
  }
  if (usesCustomMailProviderPool(provider)) {
    return getCustomMailProviderPoolSize();
  }
  if (usesCustomEmailPoolGenerator(provider)) {
    return getCustomEmailPoolSize();
  }
  return 0;
}

function shouldLockRunCountToEmailPool(provider = (typeof selectMailProvider !== 'undefined' ? selectMailProvider?.value : undefined)) {
  return getLockedRunCountFromEmailPool(provider) > 0;
}

function syncRunCountFromCustomEmailPool() {
  if (!usesCustomEmailPoolGenerator()) {
    return;
  }
  inputRunCount.value = String(getCustomEmailPoolSize());
}

function syncRunCountFromCustomMailProviderPool() {
  if (!usesCustomMailProviderPool()) {
    return;
  }
  inputRunCount.value = String(getCustomMailProviderPoolSize());
}

function syncRunCountFromConfiguredEmailPool(provider = selectMailProvider.value) {
  const poolSize = getLockedRunCountFromEmailPool(provider);
  if (poolSize > 0) {
    inputRunCount.value = String(poolSize);
  }
}

function getRunCountValue() {
  const lockedRunCount = typeof getLockedRunCountFromEmailPool === 'function'
    ? getLockedRunCountFromEmailPool()
    : 0;
  if (lockedRunCount > 0) {
    return lockedRunCount;
  }
  return Math.max(1, parseInt(inputRunCount.value, 10) || 1);
}

function updateFallbackThreadIntervalInputState() {
  if (!inputAutoSkipFailuresThreadIntervalMinutes) {
    return;
  }

  inputAutoSkipFailuresThreadIntervalMinutes.disabled = Boolean(inputAutoSkipFailures.disabled);
}

function updateAutoDelayInputState() {
  const scheduled = isAutoRunScheduledPhase();
  inputAutoDelayMinutes.disabled = scheduled;
}

function formatCountdown(remainingMs) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatScheduleTime(timestamp) {
  return new Date(timestamp).toLocaleString('zh-CN', {
    hour12: false,
    timeZone: DISPLAY_TIMEZONE,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function stopScheduledCountdownTicker() {
  clearInterval(scheduledCountdownTimer);
  scheduledCountdownTimer = null;
}

function getActiveAutoRunCountdown() {
  if (isAutoRunScheduledPhase() && Number.isFinite(currentAutoRun.scheduledAt)) {
    return {
      at: currentAutoRun.scheduledAt,
      title: '已计划自动运行',
      note: `计划于 ${formatScheduleTime(currentAutoRun.scheduledAt)} 开始`,
      tone: 'scheduled',
    };
  }

  if (currentAutoRun.phase !== 'waiting_interval') {
    return null;
  }

  if (!Number.isFinite(currentAutoRun.countdownAt)) {
    return null;
  }

  return {
    at: currentAutoRun.countdownAt,
    title: currentAutoRun.countdownTitle || '等待中',
    note: currentAutoRun.countdownNote || '',
    tone: 'running',
  };
}

function renderScheduledAutoRunInfo() {
  if (!autoScheduleBar) {
    return;
  }

  const countdown = getActiveAutoRunCountdown();
  if (!countdown) {
    autoScheduleBar.style.display = 'none';
    return;
  }

  const remainingMs = countdown.at - Date.now();
  autoScheduleBar.style.display = 'flex';
  if (btnAutoRunNow) {
    btnAutoRunNow.hidden = false;
    btnAutoRunNow.textContent = currentAutoRun.phase === 'waiting_interval' ? '立即继续' : '立即开始';
  }
  if (btnAutoCancelSchedule) {
    btnAutoCancelSchedule.hidden = true;
  }
  autoScheduleTitle.textContent = countdown.title;
  autoScheduleMeta.textContent = remainingMs > 0
    ? `${countdown.note ? `${countdown.note}，` : ''}剩余 ${formatCountdown(remainingMs)}`
    : '倒计时即将结束，正在准备继续...';
  return;
}

function syncScheduledCountdownTicker() {
  renderScheduledAutoRunInfo();
  if (getActiveAutoRunCountdown()) {
    if (scheduledCountdownTimer) {
      return;
    }

    scheduledCountdownTimer = setInterval(() => {
      renderScheduledAutoRunInfo();
      updateStatusDisplay(latestState);
    }, 1000);
    return;
  }

  stopScheduledCountdownTicker();
  return;
}

function setDefaultAutoRunButton() {
  btnAutoRun.disabled = false;
  inputRunCount.disabled = shouldLockRunCountToEmailPool();
  btnAutoRun.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> 自动';
}

function normalizeCloudflareDomainValue(value = '') {
  let normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  normalized = normalized.replace(/^@+/, '');
  normalized = normalized.replace(/^https?:\/\//, '');
  normalized = normalized.replace(/\/.*$/, '');
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(normalized)) {
    return '';
  }
  return normalized;
}

function normalizeCloudflareDomains(values = []) {
  const seen = new Set();
  const domains = [];
  for (const value of Array.isArray(values) ? values : []) {
    const normalized = normalizeCloudflareDomainValue(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    domains.push(normalized);
  }
  return domains;
}

function normalizeCloudflareTempEmailBaseUrlValue(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const candidate = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    parsed.hash = '';
    parsed.search = '';
    const pathname = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
    return `${parsed.origin}${pathname}`;
  } catch {
    return '';
  }
}

function normalizeCloudflareTempEmailReceiveMailboxValue(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : '';
}

function normalizeCloudflareTempEmailFixedMailboxValue(value = '') {
  // 固定收件箱需要填写完整邮箱，用于覆盖 /admin/mails 的 address 查询字段。
  return normalizeCloudflareTempEmailReceiveMailboxValue(value);
}

function normalizeCloudflareTempEmailDomainValue(value = '') {
  return normalizeCloudflareDomainValue(value);
}

function normalizeCloudflareTempEmailDomains(values = []) {
  const seen = new Set();
  const domains = [];
  for (const value of Array.isArray(values) ? values : []) {
    const normalized = normalizeCloudflareTempEmailDomainValue(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    domains.push(normalized);
  }
  return domains;
}

function normalizeCloudMailBaseUrlValue(value = '') {
  return normalizeCloudflareTempEmailBaseUrlValue(value);
}

function normalizeCloudMailReceiveMailboxValue(value = '') {
  return normalizeCloudflareTempEmailReceiveMailboxValue(value);
}

function normalizeCloudMailDomainValue(value = '') {
  return normalizeCloudflareDomainValue(value);
}

function getCloudflareDomainsFromState() {
  const domains = normalizeCloudflareDomains(latestState?.cloudflareDomains || []);
  const activeDomain = normalizeCloudflareDomainValue(latestState?.cloudflareDomain || '');
  if (activeDomain && !domains.includes(activeDomain)) {
    domains.unshift(activeDomain);
  }
  return { domains, activeDomain: activeDomain || domains[0] || '' };
}

function getCloudflareTempEmailDomainsFromState() {
  const domains = normalizeCloudflareTempEmailDomains(latestState?.cloudflareTempEmailDomains || []);
  const activeDomain = normalizeCloudflareTempEmailDomainValue(latestState?.cloudflareTempEmailDomain || '');
  if (activeDomain && !domains.includes(activeDomain)) {
    domains.unshift(activeDomain);
  }
  return { domains, activeDomain: activeDomain || domains[0] || '' };
}

function renderCloudflareDomainOptions(preferredDomain = '') {
  const preferred = normalizeCloudflareDomainValue(preferredDomain);
  const { domains, activeDomain } = getCloudflareDomainsFromState();
  const selected = preferred || activeDomain;
  cfDomainPicker.render(domains, domains.includes(selected) ? selected : domains[0] || '');
}

function renderCloudflareTempEmailDomainOptions(preferredDomain = '') {
  const preferred = normalizeCloudflareTempEmailDomainValue(preferredDomain);
  const { domains, activeDomain } = getCloudflareTempEmailDomainsFromState();
  const selected = preferred || activeDomain;
  tempEmailDomainPicker.render(domains, domains.includes(selected) ? selected : domains[0] || '');
}

function setCloudflareDomainEditMode(editing, options = {}) {
  const { clearInput = false } = options;
  cloudflareDomainEditMode = Boolean(editing);
  cfDomainPicker.setVisible(!cloudflareDomainEditMode);
  inputCfDomain.style.display = cloudflareDomainEditMode ? '' : 'none';
  btnCfDomainMode.textContent = cloudflareDomainEditMode ? '保存' : '添加';
  if (cloudflareDomainEditMode) {
    if (clearInput) {
      inputCfDomain.value = '';
    }
    inputCfDomain.focus();
  } else if (clearInput) {
    inputCfDomain.value = '';
  }
}

function setCloudflareTempEmailDomainEditMode(editing, options = {}) {
  const { clearInput = false } = options;
  cloudflareTempEmailDomainEditMode = false;
  tempEmailDomainPicker.setVisible(true);
  inputTempEmailDomain.style.display = 'none';
  btnTempEmailDomainMode.textContent = '更新';
  if (clearInput) {
    inputTempEmailDomain.value = '';
  }
}

function applyCloudflareTempEmailSettingsState(state = {}) {
  inputTempEmailBaseUrl.value = state?.cloudflareTempEmailBaseUrl || '';
  inputTempEmailAdminAuth.value = state?.cloudflareTempEmailAdminAuth || '';
  inputTempEmailCustomAuth.value = state?.cloudflareTempEmailCustomAuth || '';
  inputTempEmailReceiveMailbox.value = state?.cloudflareTempEmailReceiveMailbox || '';
  if (typeof inputTempEmailFixedMailbox !== 'undefined' && inputTempEmailFixedMailbox) {
    inputTempEmailFixedMailbox.value = state?.cloudflareTempEmailFixedMailbox || '';
  }
  setCloudflareTempEmailLookupMode(state?.cloudflareTempEmailLookupMode);
  if (inputTempEmailUseRandomSubdomain) {
    inputTempEmailUseRandomSubdomain.checked = Boolean(state?.cloudflareTempEmailUseRandomSubdomain);
  }
  renderCloudflareTempEmailDomainOptions(state?.cloudflareTempEmailDomain || '');
  setCloudflareTempEmailDomainEditMode(false, { clearInput: true });
}

function applyCloudMailSettingsState(state = {}) {
  if (inputCloudMailBaseUrl) {
    inputCloudMailBaseUrl.value = state?.cloudMailBaseUrl || '';
  }
  if (inputCloudMailAdminEmail) {
    inputCloudMailAdminEmail.value = state?.cloudMailAdminEmail || '';
  }
  if (inputCloudMailAdminPassword) {
    inputCloudMailAdminPassword.value = state?.cloudMailAdminPassword || '';
  }
  if (inputCloudMailReceiveMailbox) {
    inputCloudMailReceiveMailbox.value = state?.cloudMailReceiveMailbox || '';
  }
  if (inputCloudMailDomain) {
    inputCloudMailDomain.value = state?.cloudMailDomain || '';
  }
}

function applyYydsMailSettingsState(state = {}) {
  const normalizeYydsBaseUrlValue = typeof normalizeYydsMailBaseUrl === 'function'
    ? normalizeYydsMailBaseUrl
    : ((value) => String(value || '').trim() || 'https://maliapi.215.im/v1');
  if (inputYydsMailApiKey) {
    inputYydsMailApiKey.value = state?.yydsMailApiKey || '';
  }
  if (inputYydsMailBaseUrl) {
    inputYydsMailBaseUrl.value = normalizeYydsBaseUrlValue(state?.yydsMailBaseUrl);
  }
}

function collectSettingsPayload() {
  const normalizeYydsBaseUrlValue = typeof normalizeYydsMailBaseUrl === 'function'
    ? normalizeYydsMailBaseUrl
    : ((value) => String(value || '').trim() || 'https://maliapi.215.im/v1');
  const { domains, activeDomain } = getCloudflareDomainsFromState();
  const selectedCloudflareDomain = normalizeCloudflareDomainValue(
    !cloudflareDomainEditMode ? selectCfDomain.value : activeDomain
  ) || activeDomain;
  const { domains: tempEmailDomains, activeDomain: tempEmailActiveDomain } = getCloudflareTempEmailDomainsFromState();
  const selectedCloudflareTempEmailDomain = normalizeCloudflareTempEmailDomainValue(
    !cloudflareTempEmailDomainEditMode ? selectTempEmailDomain.value : tempEmailActiveDomain
  ) || tempEmailActiveDomain;
  const normalizeCloudMailBaseUrlInput = typeof normalizeCloudMailBaseUrlValue === 'function'
    ? normalizeCloudMailBaseUrlValue
    : normalizeCloudflareTempEmailBaseUrlValue;
  const normalizeCloudMailReceiveMailboxInput = typeof normalizeCloudMailReceiveMailboxValue === 'function'
    ? normalizeCloudMailReceiveMailboxValue
    : normalizeCloudflareTempEmailReceiveMailboxValue;
  const normalizeCloudMailDomainInput = typeof normalizeCloudMailDomainValue === 'function'
    ? normalizeCloudMailDomainValue
    : normalizeCloudflareTempEmailDomainValue;
  const icloudFetchModeRawValue = typeof selectIcloudFetchMode !== 'undefined'
    ? String(selectIcloudFetchMode?.value || '')
    : '';
  const icloudTargetMailboxTypeValue = typeof selectIcloudTargetMailboxType !== 'undefined'
    ? selectIcloudTargetMailboxType?.value
    : '';
  const icloudForwardMailProviderValue = typeof selectIcloudForwardMailProvider !== 'undefined'
    ? selectIcloudForwardMailProvider?.value
    : '';
  const normalizedIcloudTargetMailboxType = normalizeIcloudTargetMailboxType(icloudTargetMailboxTypeValue);
  const normalizedIcloudForwardMailProvider = normalizeIcloudForwardMailProvider(icloudForwardMailProviderValue);
  const normalizeGpcOtpChannelSafe = typeof normalizeGpcOtpChannelValue === 'function'
    ? normalizeGpcOtpChannelValue
    : ((value = '') => {
      const rootScope = typeof window !== 'undefined' ? window : globalThis;
      if (rootScope.GoPayUtils?.normalizeGpcOtpChannel) {
        return rootScope.GoPayUtils.normalizeGpcOtpChannel(value);
      }
      return String(value || '').trim().toLowerCase() === 'sms' ? 'sms' : 'whatsapp';
    });
  const normalizeGpcLocalSmsHelperBaseUrlSafe = typeof normalizeGpcLocalSmsHelperBaseUrlValue === 'function'
    ? normalizeGpcLocalSmsHelperBaseUrlValue
    : ((value = '') => {
      const fallback = 'http://127.0.0.1:18767';
      const rawValue = String(value || fallback).trim();
      try {
        const parsed = new URL(rawValue);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return fallback;
        }
        const endpointPath = parsed.pathname.replace(/\/+$/g, '') || '/';
        if (['/otp', '/latest-otp', '/health'].includes(endpointPath)) {
          parsed.pathname = '';
          parsed.search = '';
          parsed.hash = '';
        }
        return parsed.toString().replace(/\/$/, '');
      } catch {
        return fallback;
      }
    });
  const mail2925UseAccountPool = typeof inputMail2925UseAccountPool !== 'undefined'
    ? Boolean(inputMail2925UseAccountPool?.checked)
    : Boolean(latestState?.mail2925UseAccountPool);
  const selectedSignupMethod = 'email';
  const normalizedCustomEmailPool = typeof getActiveCustomEmailPoolEmails === 'function'
    ? getActiveCustomEmailPoolEmails()
    : (typeof normalizeCustomEmailPoolEntries === 'function'
      ? normalizeCustomEmailPoolEntries(inputCustomEmailPool?.value)
      : []);
  const normalizedCustomEmailPoolEntries = typeof getNormalizedCustomEmailPoolEntriesState === 'function'
    ? getNormalizedCustomEmailPoolEntriesState()
    : [];
  const normalizePanelModeSafe = typeof normalizePanelMode === 'function'
    ? normalizePanelMode
    : ((value = '') => {
      const normalized = String(value || '').trim().toLowerCase();
      return normalized === 'sub2api' || normalized === 'codex2api' ? normalized : 'cpa';
    });
  const rawPanelMode = normalizePanelModeSafe(selectPanelMode?.value || latestState?.panelMode || 'cpa');
  const capabilityState = typeof resolveCurrentSidepanelCapabilities === 'function'
    ? resolveCurrentSidepanelCapabilities({
      panelMode: rawPanelMode,
      signupMethod: selectedSignupMethod,
      state: {
        ...(latestState || {}),
        panelMode: rawPanelMode,
        signupMethod: selectedSignupMethod,
      },
    })
    : (() => {
      const rootScope = typeof window !== 'undefined' ? window : globalThis;
      const registry = rootScope.MultiPageFlowCapabilities?.createFlowCapabilityRegistry?.({
        defaultFlowId: typeof DEFAULT_ACTIVE_FLOW_ID === 'string' ? DEFAULT_ACTIVE_FLOW_ID : 'openai',
      }) || null;
      return registry?.resolveSidepanelCapabilities
        ? registry.resolveSidepanelCapabilities({
          activeFlowId: latestState?.activeFlowId,
          panelMode: rawPanelMode,
          signupMethod: selectedSignupMethod,
          state: {
            ...(latestState || {}),
            panelMode: rawPanelMode,
            signupMethod: selectedSignupMethod,
          },
        })
        : null;
    })();
  const effectivePanelMode = capabilityState?.effectivePanelMode || capabilityState?.panelMode || rawPanelMode;
  const selectedSub2ApiGroupName = String(inputSub2ApiGroup.value || '').trim();
  const sub2apiGroupNames = [];
  const seenSub2ApiGroupNames = new Set();
  const appendSub2ApiGroupNames = (value) => {
    if (Array.isArray(value)) {
      value.forEach(appendSub2ApiGroupNames);
      return;
    }
    String(value || '')
      .split(/[\r\n,，、]+/)
      .map((name) => name.trim())
      .filter(Boolean)
      .forEach((name) => {
        const key = name.toLowerCase();
        if (!key || seenSub2ApiGroupNames.has(key)) {
          return;
        }
        seenSub2ApiGroupNames.add(key);
        sub2apiGroupNames.push(name);
      });
  };
  [
    latestState?.sub2apiGroupNames,
    latestState?.sub2apiGroupName,
    selectedSub2ApiGroupName,
  ].forEach(appendSub2ApiGroupNames);
  if (sub2apiGroupNames.length === 0) {
    appendSub2ApiGroupNames(['codex']);
  }
  const sub2apiAccountPriorityNormalizer = typeof normalizeSub2ApiAccountPriorityValue === 'function'
    ? normalizeSub2ApiAccountPriorityValue
    : ((value) => {
      const numeric = Number(String(value ?? '').trim());
      return Number.isSafeInteger(numeric) && numeric >= 1 ? numeric : 1;
    });
  const accountWriteEnabled = Boolean(latestState?.isAccountWriteEnabled) && Boolean(accountWriteDirectoryHandle);
  const accountWriteFlowType = accountWriteEnabled
    ? normalizeAccountWriteFlowType(latestState?.accountWriteFlowType)
    : '';
  const accountWriteFileName = accountWriteEnabled
    ? String(latestState?.accountWriteFileName || '').trim()
    : '';
  const accountWriteSelectedAt = accountWriteEnabled
    ? Math.max(0, Number(latestState?.accountWriteSelectedAt) || 0)
    : 0;
  const resolveExecutionModeFromSelectFlowSafe = typeof resolveExecutionModeFromSelectFlow === 'function'
    ? resolveExecutionModeFromSelectFlow
    : ((selectFlowValue = '') => {
      const normalized = String(selectFlowValue || '').trim().toLowerCase();
      if (normalized === 'register-gpt' || normalized === 'register_gpt') {
        return 'register_gpt';
      }
      if (normalized === 'authorize-codex' || normalized === 'authorize_codex') {
        return 'authorize_codex';
      }
      return 'full';
    });
  const resolveExecutionStepRangeSafe = typeof resolveExecutionStepRange === 'function'
    ? resolveExecutionStepRange
    : ((mode = '') => {
      const normalized = String(mode || '').trim().toLowerCase();
      if (normalized === 'register_gpt') {
        return { startStep: 1, endStep: 6 };
      }
      if (normalized === 'authorize_codex') {
        return { startStep: 7, endStep: 11 };
      }
      return { startStep: 1, endStep: 11 };
    });
  const getImportedAccountsFromStateSafe = typeof getImportedAccountsFromState === 'function'
    ? getImportedAccountsFromState
    : ((state = latestState) => {
      if (!Array.isArray(state?.importedAccounts)) {
        return [];
      }
      return state.importedAccounts
        .map((item) => String(item || '').trim())
        .filter(Boolean);
    });
  const executionMode = resolveExecutionModeFromSelectFlowSafe(
    typeof selectFlow !== 'undefined' ? selectFlow?.value : ''
  );
  const executionRange = resolveExecutionStepRangeSafe(executionMode);
  const importedAccounts = getImportedAccountsFromStateSafe(latestState);
  const autoRunDelayMinutes = normalizeAutoDelayMinutes(inputAutoDelayMinutes.value);
  return {
    panelMode: effectivePanelMode,
    vpsUrl: inputVpsUrl.value.trim(),
    vpsPassword: inputVpsPassword.value,
    localCpaStep9Mode: getSelectedLocalCpaStep9Mode(),
    sub2apiUrl: inputSub2ApiUrl.value.trim(),
    sub2apiEmail: inputSub2ApiEmail.value.trim(),
    sub2apiPassword: inputSub2ApiPassword.value,
    sub2apiGroupName: selectedSub2ApiGroupName,
    sub2apiGroupNames,
    sub2apiAccountPriority: sub2apiAccountPriorityNormalizer(
      typeof inputSub2ApiAccountPriority !== 'undefined' && inputSub2ApiAccountPriority
        ? inputSub2ApiAccountPriority.value
        : latestState?.sub2apiAccountPriority
    ),
    sub2apiDefaultProxyName: inputSub2ApiDefaultProxy.value.trim(),
    codex2apiUrl: inputCodex2ApiUrl.value.trim(),
    codex2apiAdminKey: inputCodex2ApiAdminKey.value.trim(),
    customPassword: inputPassword.value,
    mailProvider: selectMailProvider.value,
    mail2925Mode: getSelectedMail2925Mode(),
    mail2925UseAccountPool,
    currentMail2925AccountId: String(latestState?.currentMail2925AccountId || '').trim(),
    emailGenerator: selectEmailGenerator.value,
    duckApiAuthorization: typeof inputDuckApiAuthorization !== 'undefined' && inputDuckApiAuthorization
      ? String(inputDuckApiAuthorization.value || '').trim()
      : String(latestState?.duckApiAuthorization || '').trim(),
    customMailProviderPool: typeof normalizeCustomEmailPoolEntries === 'function'
      ? normalizeCustomEmailPoolEntries(inputCustomMailProviderPool?.value)
      : [],
    customEmailPool: normalizedCustomEmailPool,
    customEmailPoolEntries: normalizedCustomEmailPoolEntries,
    autoDeleteUsedIcloudAlias: checkboxAutoDeleteIcloud?.checked,
    icloudHostPreference: selectIcloudHostPreference?.value || 'auto',
    icloudTargetMailboxType: normalizedIcloudTargetMailboxType,
    icloudForwardMailProvider: normalizedIcloudForwardMailProvider,
    icloudFetchMode: (icloudFetchModeRawValue.trim().toLowerCase() === 'always_new'
      ? 'always_new'
      : 'reuse_existing'),
    accountRunHistoryTextEnabled: true,
    accountRunHistoryHelperBaseUrl: normalizeAccountRunHistoryHelperBaseUrlValue(inputAccountRunHistoryHelperBaseUrl?.value),
    ...buildManagedAliasBaseEmailPayload(),
    inbucketHost: inputInbucketHost.value.trim(),
    inbucketMailbox: inputInbucketMailbox.value.trim(),
    hotmailServiceMode: getSelectedHotmailServiceMode(),
    hotmailRemoteBaseUrl: inputHotmailRemoteBaseUrl.value.trim(),
    hotmailLocalBaseUrl: inputHotmailLocalBaseUrl.value.trim(),
    luckmailApiKey: inputLuckmailApiKey.value,
    luckmailBaseUrl: normalizeLuckmailBaseUrl(inputLuckmailBaseUrl.value),
    luckmailEmailType: normalizeLuckmailEmailType(selectLuckmailEmailType.value),
    luckmailDomain: inputLuckmailDomain.value.trim(),
    gptmailApiKey: (typeof inputGptmailApiKey !== 'undefined' && inputGptmailApiKey)
      ? inputGptmailApiKey.value
      : '',
    gptmailBaseUrl: (typeof normalizeGptmailBaseUrl === 'function' ? normalizeGptmailBaseUrl : ((value) => String(value || '').trim() || (
      typeof DEFAULT_GPTMAIL_BASE_URL !== 'undefined'
        ? DEFAULT_GPTMAIL_BASE_URL
        : 'https://mail.chatgpt.org.uk'
    )))(
      (typeof inputGptmailBaseUrl !== 'undefined' && inputGptmailBaseUrl)
        ? inputGptmailBaseUrl.value
        : ''
    ),
    gptmailDomain: (typeof normalizeGptmailDomain === 'function' ? normalizeGptmailDomain : ((value) => {
      const normalized = String(value || '').trim().replace(/^@+/, '').toLowerCase();
      return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(normalized) ? normalized : '';
    }))(
      (typeof inputGptmailDomain !== 'undefined' && inputGptmailDomain)
        ? inputGptmailDomain.value
        : ''
    ),
    cloudflareDomain: selectedCloudflareDomain,
    cloudflareDomains: domains,
    cloudflareTempEmailBaseUrl: normalizeCloudflareTempEmailBaseUrlValue(inputTempEmailBaseUrl.value),
    cloudflareTempEmailAdminAuth: inputTempEmailAdminAuth.value,
    cloudflareTempEmailCustomAuth: inputTempEmailCustomAuth.value,
    cloudflareTempEmailLookupMode: typeof getSelectedCloudflareTempEmailLookupMode === 'function'
      ? getSelectedCloudflareTempEmailLookupMode()
      : 'receive-mailbox',
    cloudflareTempEmailReceiveMailbox: normalizeCloudflareTempEmailReceiveMailboxValue(inputTempEmailReceiveMailbox.value),
    cloudflareTempEmailFixedMailbox: normalizeCloudflareTempEmailReceiveMailboxValue(
      (typeof inputTempEmailFixedMailbox !== 'undefined' && inputTempEmailFixedMailbox) ? inputTempEmailFixedMailbox.value : ''
    ),
    cloudflareTempEmailUseRandomSubdomain: Boolean(inputTempEmailUseRandomSubdomain?.checked),
    cloudflareTempEmailDomain: selectedCloudflareTempEmailDomain,
    cloudflareTempEmailDomains: tempEmailDomains,
    cloudMailBaseUrl: normalizeCloudMailBaseUrlInput((typeof inputCloudMailBaseUrl !== 'undefined' && inputCloudMailBaseUrl) ? inputCloudMailBaseUrl.value : ''),
    cloudMailAdminEmail: ((typeof inputCloudMailAdminEmail !== 'undefined' && inputCloudMailAdminEmail) ? inputCloudMailAdminEmail.value : '').trim(),
    cloudMailAdminPassword: (typeof inputCloudMailAdminPassword !== 'undefined' && inputCloudMailAdminPassword) ? inputCloudMailAdminPassword.value : '',
    cloudMailReceiveMailbox: normalizeCloudMailReceiveMailboxInput((typeof inputCloudMailReceiveMailbox !== 'undefined' && inputCloudMailReceiveMailbox) ? inputCloudMailReceiveMailbox.value : ''),
    cloudMailDomain: normalizeCloudMailDomainInput((typeof inputCloudMailDomain !== 'undefined' && inputCloudMailDomain) ? inputCloudMailDomain.value : ''),
    yydsMailApiKey: (typeof inputYydsMailApiKey !== 'undefined' && inputYydsMailApiKey) ? inputYydsMailApiKey.value.trim() : '',
    yydsMailBaseUrl: normalizeYydsBaseUrlValue((typeof inputYydsMailBaseUrl !== 'undefined' && inputYydsMailBaseUrl) ? inputYydsMailBaseUrl.value : ''),
    autoRunSkipFailures: inputAutoSkipFailures.checked,
    autoRunFallbackThreadIntervalMinutes: normalizeAutoRunThreadIntervalMinutes(inputAutoSkipFailuresThreadIntervalMinutes.value),
    step6CookieCleanupEnabled: typeof inputStep6CookieCleanupEnabled !== 'undefined' && inputStep6CookieCleanupEnabled
      ? Boolean(inputStep6CookieCleanupEnabled.checked)
      : false,
    // 是否启用写入账号：由是否成功选择目录并可写决定。
    isAccountWriteEnabled: accountWriteEnabled,
    // 当前写入账号文件对应的流程前缀（full/gpt/codex）。
    accountWriteFlowType,
    // 当前写入账号文件名，例如 full-2026-05-17.json。
    accountWriteFileName,
    accountWriteSelectedAt,
    // 执行流程模式：full / register_gpt / authorize_codex。
    executionMode,
    // 从“2.导入账号”读取的账号邮箱数组。
    importedAccounts,
    // 自动运行的起始步骤编号。
    startStep: executionRange.startStep,
    // 自动运行的结束步骤编号。
    endStep: executionRange.endStep,
    // 自动运行前延迟分钟数，0 表示立即开始。
    autoRunDelayMinutes,
    // 兼容历史字段：由延迟分钟数推导，>0 视为启用倒计时。
    autoRunDelayEnabled: autoRunDelayMinutes > 0,
    autoStepDelaySeconds: normalizeAutoStepDelaySeconds(inputAutoStepDelaySeconds.value),
    oauthFlowTimeoutEnabled: typeof inputOAuthFlowTimeoutEnabled !== 'undefined' && inputOAuthFlowTimeoutEnabled
      ? Boolean(inputOAuthFlowTimeoutEnabled.checked)
      : true,
    signupMethod: 'email',
  };
}

function normalizeLocalCpaStep9Mode(value = '') {
  return String(value || '').trim().toLowerCase() === 'bypass'
    ? 'bypass'
    : DEFAULT_LOCAL_CPA_STEP9_MODE;
}

function normalizeMail2925Mode(value = '') {
  return String(value || '').trim().toLowerCase() === MAIL_2925_MODE_RECEIVE
    ? MAIL_2925_MODE_RECEIVE
    : DEFAULT_MAIL_2925_MODE;
}

function normalizeCloudflareTempEmailLookupMode(value = '') {
  return String(value || '').trim().toLowerCase() === CLOUDFLARE_TEMP_EMAIL_LOOKUP_MODE_REGISTRATION_EMAIL
    ? CLOUDFLARE_TEMP_EMAIL_LOOKUP_MODE_REGISTRATION_EMAIL
    : DEFAULT_CLOUDFLARE_TEMP_EMAIL_LOOKUP_MODE;
}

function normalizeHotmailServiceMode(value = '') {
  if (typeof normalizeHotmailServiceModeFromUtils === 'function') {
    return normalizeHotmailServiceModeFromUtils(value);
  }
  return String(value || '').trim().toLowerCase() === HOTMAIL_SERVICE_MODE_REMOTE
    ? HOTMAIL_SERVICE_MODE_REMOTE
    : HOTMAIL_SERVICE_MODE_LOCAL;
}

function normalizeAccountRunHistoryHelperBaseUrlValue(value = '') {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return DEFAULT_ACCOUNT_RUN_HISTORY_HELPER_BASE_URL;
  }

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return DEFAULT_ACCOUNT_RUN_HISTORY_HELPER_BASE_URL;
    }

    if (parsed.pathname === '/append-account-log' || parsed.pathname === '/sync-account-run-records') {
      parsed.pathname = '';
      parsed.search = '';
      parsed.hash = '';
    }

    return parsed.toString().replace(/\/$/, '');
  } catch {
    return DEFAULT_ACCOUNT_RUN_HISTORY_HELPER_BASE_URL;
  }
}


function getSelectedLocalCpaStep9Mode() {
  const activeButton = localCpaStep9ModeButtons.find((button) => button.classList.contains('is-active'));
  return normalizeLocalCpaStep9Mode(activeButton?.dataset.localCpaStep9Mode);
}

function setLocalCpaStep9Mode(mode) {
  const resolvedMode = normalizeLocalCpaStep9Mode(mode);
  localCpaStep9ModeButtons.forEach((button) => {
    const active = button.dataset.localCpaStep9Mode === resolvedMode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function getSelectedMail2925Mode() {
  const activeButton = mail2925ModeButtons.find((button) => button.classList.contains('is-active'));
  return normalizeMail2925Mode(activeButton?.dataset.mail2925Mode);
}

function setMail2925Mode(mode) {
  const resolvedMode = normalizeMail2925Mode(mode);
  mail2925ModeButtons.forEach((button) => {
    const active = button.dataset.mail2925Mode === resolvedMode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function getSelectedCloudflareTempEmailLookupMode() {
  const activeButton = tempEmailLookupModeButtons.find((button) => button.classList.contains('is-active'));
  return normalizeCloudflareTempEmailLookupMode(activeButton?.dataset.tempEmailLookupMode);
}

function setCloudflareTempEmailLookupMode(mode) {
  const resolvedMode = normalizeCloudflareTempEmailLookupMode(mode);
  tempEmailLookupModeButtons.forEach((button) => {
    const active = button.dataset.tempEmailLookupMode === resolvedMode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function getSelectedHotmailServiceMode() {
  const activeButton = hotmailServiceModeButtons.find((button) => button.classList.contains('is-active'));
  return normalizeHotmailServiceMode(activeButton?.dataset.hotmailServiceMode);
}

function setHotmailServiceMode(mode) {
  const resolvedMode = normalizeHotmailServiceMode(mode);
  hotmailServiceModeButtons.forEach((button) => {
    const active = button.dataset.hotmailServiceMode === resolvedMode;
    button.disabled = false;
    button.setAttribute('aria-disabled', 'false');
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function updateAccountRunHistorySettingsUI() {
  if (!rowAccountRunHistoryHelperBaseUrl) {
    return;
  }

  rowAccountRunHistoryHelperBaseUrl.style.display = 'none';
}

function normalizeSignupMethod(value = '') {
  void value;
  return SIGNUP_METHOD_EMAIL;
}

function normalizePanelMode(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'sub2api' || normalized === 'codex2api') {
    return normalized;
  }
  return 'cpa';
}

let flowCapabilityRegistry = null;

function getFlowCapabilityRegistry() {
  if (flowCapabilityRegistry) {
    return flowCapabilityRegistry;
  }
  const rootScope = typeof window !== 'undefined' ? window : globalThis;
  flowCapabilityRegistry = rootScope.MultiPageFlowCapabilities?.createFlowCapabilityRegistry?.({
    defaultFlowId: DEFAULT_ACTIVE_FLOW_ID,
  }) || null;
  return flowCapabilityRegistry;
}

function resolveCurrentSidepanelCapabilities(options = {}) {
  const registry = getFlowCapabilityRegistry();
  if (!registry?.resolveSidepanelCapabilities) {
    return null;
  }
  const state = {
    ...(latestState || {}),
    ...(options?.state || {}),
  };
  return registry.resolveSidepanelCapabilities({
    activeFlowId: options?.activeFlowId ?? state?.activeFlowId,
    panelMode: options?.panelMode ?? state?.panelMode,
    signupMethod: options?.signupMethod ?? state?.signupMethod,
    state,
  });
}

function resolveStepDefinitionCapabilityState(state = latestState, options = {}) {
  const nextState = {
    ...(state || {}),
    ...(options?.state || {}),
  };
  const capabilityState = resolveCurrentSidepanelCapabilities({
    activeFlowId: options?.activeFlowId ?? nextState?.activeFlowId,
    panelMode: options?.panelMode ?? nextState?.panelMode,
    signupMethod: options?.signupMethod ?? nextState?.signupMethod,
    state: nextState,
  });
  return {
    capabilityState,
    signupMethod: capabilityState?.effectiveSignupMethod
      || normalizeSignupMethod((options?.signupMethod ?? nextState?.signupMethod) || DEFAULT_SIGNUP_METHOD),
  };
}

function getSelectedPanelMode() {
  const selectedValue = typeof selectPanelMode !== 'undefined' && selectPanelMode
    ? selectPanelMode.value
    : (typeof latestState !== 'undefined' ? latestState?.panelMode : '');
  const resolvedPanelMode = normalizePanelMode(selectedValue || 'cpa');
  const capabilityState = typeof resolveCurrentSidepanelCapabilities === 'function'
    ? resolveCurrentSidepanelCapabilities({ panelMode: resolvedPanelMode })
    : null;
  return capabilityState?.effectivePanelMode || capabilityState?.panelMode || resolvedPanelMode;
}

function getSelectedSignupMethod() {
  const activeButton = signupMethodButtons.find((button) => button.classList.contains('is-active'));
  return normalizeSignupMethod(activeButton?.dataset.signupMethod || latestState?.signupMethod || DEFAULT_SIGNUP_METHOD);
}

function setSignupMethod(method) {
  const resolvedMethod = normalizeSignupMethod(method);
  signupMethodButtons.forEach((button) => {
    const active = normalizeSignupMethod(button.dataset.signupMethod) === resolvedMethod;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  syncLatestState({ signupMethod: resolvedMethod });
  return resolvedMethod;
}

function isSignupMethodSwitchLocked() {
  return isAutoRunLockedPhase() || isAutoRunPausedPhase() || isAutoRunScheduledPhase();
}

function updateSignupMethodUI(options = {}) {
  if (!signupMethodButtons.length) {
    if (typeof syncSignupPhoneInputFromState === 'function') {
      syncSignupPhoneInputFromState(latestState);
    }
    return;
  }

  const showSignupMethod = false;
  if (rowSignupMethod) {
    rowSignupMethod.style.display = showSignupMethod ? '' : 'none';
  }

  const selectedMethod = setSignupMethod(SIGNUP_METHOD_EMAIL);

  const locked = isSignupMethodSwitchLocked();
  signupMethodButtons.forEach((button) => {
    const method = normalizeSignupMethod(button.dataset.signupMethod);
    const disabled = locked || method !== SIGNUP_METHOD_EMAIL;
    button.disabled = disabled;
    button.setAttribute('aria-disabled', String(disabled));
    if (disabled && method !== SIGNUP_METHOD_EMAIL) {
      button.title = '当前仅支持邮箱注册';
      return;
    }
    button.title = locked ? '自动流程运行中不能切换注册方式' : '';
  });
  const stepDefinitionState = typeof resolveStepDefinitionCapabilityState === 'function'
    ? resolveStepDefinitionCapabilityState({
      ...(latestState || {}),
      signupMethod: selectedMethod,
    }, {
      signupMethod: selectedMethod,
    })
    : {
      signupMethod: selectedMethod,
    };
  syncStepDefinitionsForMode({
    signupMethod: selectedMethod,
  });
  if (typeof syncSignupPhoneInputFromState === 'function') {
    syncSignupPhoneInputFromState(latestState);
  }
}

function setSettingsCardLocked(locked) {
  if (!settingsCard) {
    return;
  }
  settingsCard.classList.toggle('is-locked', locked);
  settingsCard.toggleAttribute('inert', false);
  Array.from(settingsCard.children).forEach((child) => {
    const keepInteractive = child?.id === 'row-custom-email-pool';
    child.toggleAttribute('inert', Boolean(locked && !keepInteractive));
  });
}

async function setRuntimeEmailState(email) {
  const normalizedEmail = String(email || '').trim() || null;
  const response = await chrome.runtime.sendMessage({
    type: 'SET_EMAIL_STATE',
    source: 'sidepanel',
    payload: { email: normalizedEmail },
  });

  if (response?.error) {
    throw new Error(response.error);
  }

  return normalizedEmail;
}

function getRuntimeSignupPhoneValue(state = latestState) {
  void state;
  return '';
}

function shouldExecuteStep3WithSignupPhoneIdentity(state = latestState) {
  void state;
  return false;
}

function getSignupPhoneInputValue() {
  return '';
}

function shouldPreserveSignupPhoneInputValue(stateSignupPhone = '') {
  void stateSignupPhone;
  return false;
}

function syncSignupPhoneInputFromState(state = latestState) {
  void state;
  if (typeof rowSignupPhone !== 'undefined' && rowSignupPhone) {
    rowSignupPhone.style.display = 'none';
  }
}

async function persistSignupPhoneInputValue(options = {}) {
  void options;
  return '';
}

async function persistSignupPhoneInputForAction() {
  return undefined;
}








async function clearRegistrationEmail(options = {}) {
  const { silent = false } = options;
  if (!inputEmail.value.trim() && !latestState?.email) {
    return;
  }

  inputEmail.value = '';
  syncLatestState({ email: null });

  try {
    await setRuntimeEmailState(null);
  } catch (err) {
    if (!silent) {
      showToast(`清空邮箱失败：${err.message}`, 'error');
    }
    throw err;
  }
}

function markSettingsDirty(isDirty = true) {
  settingsDirty = isDirty;
  if (isDirty) {
    settingsSaveRevision += 1;
  }
  updateSaveButtonState();
}

function updateSaveButtonState() {
  btnSaveSettings.disabled = settingsSaveInFlight || !settingsDirty;
  updateConfigMenuControls();
  btnSaveSettings.textContent = settingsSaveInFlight ? '保存中' : '保存';
}

// 判断当前焦点是否在设置卡片的可编辑控件中，避免自动保存回刷打断输入。
function isEditableElementInSettingsCard(element) {
  if (!element || typeof Element === 'undefined' || !(element instanceof Element)) {
    return false;
  }
  const tagName = String(element.tagName || '').toLowerCase();
  const isEditableInput = (
    tagName === 'textarea'
    || (tagName === 'input' && !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'file', 'color'].includes(String(element.type || '').toLowerCase()))
    || Boolean(element.isContentEditable)
  );
  if (!isEditableInput) {
    return false;
  }
  return !settingsCard || settingsCard.contains(element);
}

function scheduleSettingsAutoSave() {
  clearTimeout(settingsAutoSaveTimer);
  settingsAutoSaveTimer = setTimeout(() => {
    saveSettings({ silent: true, source: 'autosave' }).catch(() => { });
  }, 1200);
}

async function saveSettings(options = {}) {
  const { silent = false, force = false, source = '' } = options;
  clearTimeout(settingsAutoSaveTimer);

  if (!force && !settingsDirty && !settingsSaveInFlight && silent) {
    return;
  }

  const payload = collectSettingsPayload();
  const saveRevision = settingsSaveRevision;
  settingsSaveInFlight = true;
  updateSaveButtonState();

  const shouldSkipStateApplyForFocusedEditor = (() => {
    if (!silent || source !== 'autosave') {
      return false;
    }
    const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
    return isEditableElementInSettingsCard(activeEl);
  })();

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_SETTING',
      source: 'sidepanel',
      payload,
    });

    if (response?.error) {
      throw new Error(response.error);
    }

    if (response?.state && saveRevision === settingsSaveRevision) {
      if (shouldSkipStateApplyForFocusedEditor) {
        syncLatestState(response.state);
        markSettingsDirty(false);
      } else {
        applySettingsState(response.state);
      }
    } else {
      syncLatestState(payload);
      if (saveRevision === settingsSaveRevision) {
        markSettingsDirty(false);
      }
      updatePanelModeUI();
      updateMailProviderUI();
      updateButtonStates();
    }
    if (!silent) {
      showToast('配置已保存', 'success', 1800);
    }
  } catch (err) {
    markSettingsDirty(true);
    if (!silent) {
      showToast(`保存失败：${err.message}`, 'error');
    }
    throw err;
  } finally {
    settingsSaveInFlight = false;
    updateSaveButtonState();
  }
}

async function persistCurrentSettingsForAction() {
  clearTimeout(settingsAutoSaveTimer);
  await waitForSettingsSaveIdle();
  await persistSignupPhoneInputForAction();
  await saveSettings({ silent: true, force: true });
}

function applyAutoRunStatus(payload = currentAutoRun) {
  syncAutoRunState(payload);
  const runLabel = getAutoRunLabel(currentAutoRun);
  const locked = isAutoRunLockedPhase();
  const paused = isAutoRunPausedPhase();
  const scheduled = isAutoRunScheduledPhase();
  const settingsCardLocked = scheduled || locked;

  setSettingsCardLocked(settingsCardLocked);

  inputRunCount.disabled = currentAutoRun.autoRunning || (
    typeof shouldLockRunCountToEmailPool === 'function'
      ? shouldLockRunCountToEmailPool()
      : getLockedRunCountFromEmailPool() > 0
  );
  btnAutoRun.disabled = currentAutoRun.autoRunning;
  btnFetchEmail.disabled = locked
    || isCustomMailProvider()
    || usesCustomEmailPoolGenerator();
  inputEmail.disabled = locked;
  if (typeof inputSub2ApiAccountPriority !== 'undefined' && inputSub2ApiAccountPriority) {
    inputSub2ApiAccountPriority.disabled = locked;
  }
  inputAutoSkipFailures.disabled = scheduled;

  const lockedRunCount = typeof getLockedRunCountFromEmailPool === 'function'
    ? getLockedRunCountFromEmailPool()
    : 0;
  const isSyncPhase = typeof isAutoRunSourceSyncPhase === 'function'
    ? isAutoRunSourceSyncPhase
    : (phase) => ['scheduled', 'running', 'waiting_step', 'waiting_email', 'retrying', 'waiting_interval'].includes(phase);
  const shouldSyncRunCount = typeof shouldSyncRunCountFromAutoRunSource === 'function'
    ? shouldSyncRunCountFromAutoRunSource(currentAutoRun)
    : (currentAutoRun.autoRunning || isSyncPhase(currentAutoRun.phase));
  if (lockedRunCount > 0) {
    inputRunCount.value = String(lockedRunCount);
  } else if (shouldSyncRunCount && currentAutoRun.totalRuns > 0) {
    inputRunCount.value = String(currentAutoRun.totalRuns);
  }

  switch (currentAutoRun.phase) {
    case 'scheduled':
      autoContinueBar.style.display = 'none';
      btnAutoRun.innerHTML = `已计划${runLabel}`;
      break;
    case 'waiting_step':
      autoContinueBar.style.display = 'none';
      btnAutoRun.innerHTML = `等待中${runLabel}`;
      break;
    case 'waiting_email':
      autoContinueBar.style.display = 'flex';
      btnAutoRun.innerHTML = `已暂停${runLabel}`;
      break;
    case 'running':
      autoContinueBar.style.display = 'none';
      btnAutoRun.innerHTML = `运行中${runLabel}`;
      break;
    case 'retrying':
      autoContinueBar.style.display = 'none';
      btnAutoRun.innerHTML = `重试中${runLabel}`;
      break;
    case 'waiting_interval':
      autoContinueBar.style.display = 'none';
      btnAutoRun.innerHTML = `等待中${runLabel}`;
      break;
    default:
      autoContinueBar.style.display = 'none';
      setDefaultAutoRunButton();
      inputEmail.disabled = false;
      if (!locked) {
        btnFetchEmail.disabled = isCustomMailProvider() || usesCustomEmailPoolGenerator();
      }
      break;
  }

  updateAutoDelayInputState();
  updateFallbackThreadIntervalInputState();
  syncScheduledCountdownTicker();
  updateStopButtonState(scheduled || paused || locked || Object.values(getStepStatuses()).some(status => status === 'running'));
  updateConfigMenuControls();
}

function initializeManualStepActions() {
  document.querySelectorAll('.step-row').forEach((row) => {
    if (row.querySelector('.step-actions')) {
      return;
    }
    const step = Number(row.dataset.step);
    const nodeId = String(row.dataset.nodeId || getNodeIdByStepForCurrentMode(step) || '').trim();
    const statusEl = row.querySelector('.step-status');
    if (!statusEl) return;

    const actions = document.createElement('div');
    actions.className = 'step-actions';

    const manualBtn = document.createElement('button');
    manualBtn.type = 'button';
    manualBtn.className = 'step-manual-btn';
    manualBtn.dataset.step = String(step);
    manualBtn.dataset.nodeId = nodeId;
    manualBtn.title = '跳过此节点';
    manualBtn.setAttribute('aria-label', `跳过节点 ${nodeId || step}`);
    manualBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>';
    manualBtn.addEventListener('click', async (event) => {
      event.stopPropagation();
      try {
        await handleSkipNode(nodeId || getNodeIdByStepForCurrentMode(step));
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    statusEl.parentNode.replaceChild(actions, statusEl);
    actions.appendChild(manualBtn);
    actions.appendChild(statusEl);
  });
}

function renderStepsList() {
  if (!stepsList) return;

  stepsList.innerHTML = workflowNodes.map((node) => {
    const step = getStepIdByNodeIdForCurrentMode(node.nodeId);
    const nodeId = String(node.nodeId || '').trim();
    return `
    <div class="step-row" data-step="${step}" data-node-id="${escapeHtml(nodeId)}" data-step-key="${escapeHtml(node.executeKey || nodeId)}">
      <div class="step-indicator" data-step="${step}" data-node-id="${escapeHtml(nodeId)}"><span class="step-num">${step || node.displayOrder || ''}</span></div>
      <button class="step-btn" data-step="${step}" data-node-id="${escapeHtml(nodeId)}" data-step-key="${escapeHtml(node.executeKey || nodeId)}">${escapeHtml(node.title)}</button>
      <span class="step-status" data-step="${step}" data-node-id="${escapeHtml(nodeId)}"></span>
    </div>
  `;
  }).join('');

  if (stepsProgress) {
    stepsProgress.textContent = `0 / ${NODE_IDS.length}`;
  }

  initializeManualStepActions();
  renderStepStatuses();
  updateButtonStates();
}

function syncStepDefinitionsForMode(options = {}) {
  const defaultFlowId = typeof DEFAULT_ACTIVE_FLOW_ID !== 'undefined' ? DEFAULT_ACTIVE_FLOW_ID : 'openai';
  const nextSignupMethod = normalizeSignupMethod(options.signupMethod || currentSignupMethod || DEFAULT_SIGNUP_METHOD);
  const nextActiveFlowId = String(
    options.activeFlowId
    || (typeof latestState !== 'undefined' ? latestState?.activeFlowId : '')
    || defaultFlowId
  ).trim().toLowerCase() || defaultFlowId;
  const shouldRender = Boolean(options.render)
    || nextSignupMethod !== currentSignupMethod;
  if (!shouldRender) {
    return;
  }

  rebuildStepDefinitionState({
    activeFlowId: nextActiveFlowId,
    signupMethod: nextSignupMethod,
  });
  renderStepsList();
}

// ============================================================
// State Restore on load
// ============================================================

function applySettingsState(state) {
  if (typeof syncStepDefinitionsForMode === 'function') {
    const stepDefinitionState = typeof resolveStepDefinitionCapabilityState === 'function'
      ? resolveStepDefinitionCapabilityState(state, {
        signupMethod: state?.signupMethod,
      })
      : {
        signupMethod: normalizeSignupMethod(state?.signupMethod || DEFAULT_SIGNUP_METHOD),
      };
    syncStepDefinitionsForMode({
      activeFlowId: state?.flowId || state?.activeFlowId,
      signupMethod: stepDefinitionState.signupMethod,
    });
  }
  syncLatestState(state);
  if (typeof applyOperationDelayState === 'function') {
    applyOperationDelayState(state);
  }
  syncAutoRunState(state);
  renderStepStatuses(latestState);

  inputEmail.value = state?.email || '';
  if (typeof syncSignupPhoneInputFromState === 'function') {
    syncSignupPhoneInputFromState(state);
  }
  syncPasswordField(state || {});
  inputVpsUrl.value = state?.vpsUrl || '';
  inputVpsPassword.value = state?.vpsPassword || '';
  setLocalCpaStep9Mode(state?.localCpaStep9Mode);
  selectPanelMode.value = normalizePanelMode(state?.panelMode || 'cpa');
  if (typeof selectFlow !== 'undefined' && selectFlow) {
    const resolveSelectFlowValueFromExecutionModeSafe = typeof resolveSelectFlowValueFromExecutionMode === 'function'
      ? resolveSelectFlowValueFromExecutionMode
      : ((mode = '') => {
        const normalized = String(mode || '').trim().toLowerCase();
        if (normalized === 'register_gpt') return 'register-gpt';
        if (normalized === 'authorize_codex') return 'authorize-codex';
        return 'full-flow';
      });
    selectFlow.value = resolveSelectFlowValueFromExecutionModeSafe(state?.executionMode);
  }
  if (typeof updateAccountTransferButtonsVisibility === 'function') {
    updateAccountTransferButtonsVisibility();
  }
  inputSub2ApiUrl.value = state?.sub2apiUrl || '';
  inputSub2ApiEmail.value = state?.sub2apiEmail || '';
  inputSub2ApiPassword.value = state?.sub2apiPassword || '';
  renderSub2ApiGroupOptions(state, state?.sub2apiGroupName || '');
  if (typeof inputSub2ApiAccountPriority !== 'undefined' && inputSub2ApiAccountPriority) {
    inputSub2ApiAccountPriority.value = String(normalizeSub2ApiAccountPriorityValue(state?.sub2apiAccountPriority));
  }
  inputSub2ApiDefaultProxy.value = state?.sub2apiDefaultProxyName || '';
  inputCodex2ApiUrl.value = state?.codex2apiUrl || '';
  inputCodex2ApiAdminKey.value = state?.codex2apiAdminKey || '';
  const yydsMailProvider = typeof YYDS_MAIL_PROVIDER === 'string'
    ? YYDS_MAIL_PROVIDER
    : 'yyds-mail';
  const restoredMailProvider = isCustomMailProvider(state?.mailProvider)
    || [ICLOUD_PROVIDER, 'hotmail-api', GMAIL_PROVIDER, 'luckmail-api', 'gptmail', yydsMailProvider, '163', '163-vip', '126', 'qq', 'inbucket', '2925', 'cloudflare-temp-email', 'cloudmail'].includes(String(state?.mailProvider || '').trim())
    ? String(state?.mailProvider || '163').trim()
    : (String(state?.emailGenerator || '').trim().toLowerCase() === 'custom'
      || String(state?.emailGenerator || '').trim().toLowerCase() === 'manual'
      ? 'custom'
      : '163');
  selectMailProvider.value = restoredMailProvider;
  setMail2925Mode(state?.mail2925Mode);
  {
    const restoredEmailGenerator = String(state?.emailGenerator || '').trim().toLowerCase();
    if (restoredMailProvider === GMAIL_PROVIDER) {
      selectEmailGenerator.value = restoredEmailGenerator === CUSTOM_EMAIL_POOL_GENERATOR
        ? CUSTOM_EMAIL_POOL_GENERATOR
        : GMAIL_ALIAS_GENERATOR;
    } else if (restoredEmailGenerator === CUSTOM_EMAIL_POOL_GENERATOR) {
      selectEmailGenerator.value = CUSTOM_EMAIL_POOL_GENERATOR;
    } else if (restoredEmailGenerator === 'icloud') {
      selectEmailGenerator.value = 'icloud';
    } else if (restoredEmailGenerator === 'cloudflare') {
      selectEmailGenerator.value = 'cloudflare';
    } else if (restoredEmailGenerator === 'cloudflare-temp-email') {
      selectEmailGenerator.value = 'cloudflare-temp-email';
    } else if (restoredEmailGenerator === 'cloudmail') {
      selectEmailGenerator.value = 'cloudmail';
    } else {
      selectEmailGenerator.value = 'duck';
    }
  }
  if (
    typeof inputDuckApiAuthorization !== 'undefined'
    && inputDuckApiAuthorization
    && Object.prototype.hasOwnProperty.call(state || {}, 'duckApiAuthorization')
  ) {
    const nextDuckAuthorization = String(state?.duckApiAuthorization || '').trim();
    const isEditingDuckAuthorization = typeof document !== 'undefined'
      && document?.activeElement === inputDuckApiAuthorization;
    if (!isEditingDuckAuthorization || !settingsDirty) {
      inputDuckApiAuthorization.value = nextDuckAuthorization;
    }
  }
  if (selectIcloudHostPreference) {
    selectIcloudHostPreference.value = String(state?.icloudHostPreference || '').trim().toLowerCase() === 'icloud.com'
      ? 'icloud.com'
      : (String(state?.icloudHostPreference || '').trim().toLowerCase() === 'icloud.com.cn' ? 'icloud.com.cn' : 'auto');
  }
  if (selectIcloudFetchMode) {
    selectIcloudFetchMode.value = normalizeIcloudFetchMode(state?.icloudFetchMode);
  }
  if (selectIcloudTargetMailboxType) {
    selectIcloudTargetMailboxType.value = normalizeIcloudTargetMailboxType(state?.icloudTargetMailboxType);
  }
  if (selectIcloudForwardMailProvider) {
    selectIcloudForwardMailProvider.value = normalizeIcloudForwardMailProvider(state?.icloudForwardMailProvider);
  }
  if (checkboxAutoDeleteIcloud) {
    checkboxAutoDeleteIcloud.checked = Boolean(state?.autoDeleteUsedIcloudAlias);
  }
  if (inputAccountRunHistoryHelperBaseUrl) {
    inputAccountRunHistoryHelperBaseUrl.value = normalizeAccountRunHistoryHelperBaseUrlValue(state?.accountRunHistoryHelperBaseUrl);
  }
  if (inputMail2925UseAccountPool) {
    inputMail2925UseAccountPool.checked = Boolean(state?.mail2925UseAccountPool);
  }
  setManagedAliasBaseEmailInputForProvider(restoredMailProvider, state);
  inputInbucketHost.value = state?.inbucketHost || '';
  inputInbucketMailbox.value = state?.inbucketMailbox || '';
  if (inputCustomMailProviderPool) {
    inputCustomMailProviderPool.value = normalizeCustomEmailPoolEntries(state?.customMailProviderPool).join('\n');
  }
  const restoredCustomEmailPoolEntries = typeof restoreCustomEmailPoolEntriesFromState === 'function'
    ? restoreCustomEmailPoolEntriesFromState(state)
    : normalizeCustomEmailPoolEntries(state?.customEmailPool);
  if (typeof setCustomEmailPoolEntriesState === 'function') {
    setCustomEmailPoolEntriesState(restoredCustomEmailPoolEntries);
  } else if (inputCustomEmailPool) {
    inputCustomEmailPool.value = restoredCustomEmailPoolEntries.join('\n');
  }
  setHotmailServiceMode(state?.hotmailServiceMode);
  inputHotmailRemoteBaseUrl.value = state?.hotmailRemoteBaseUrl || '';
  inputHotmailLocalBaseUrl.value = state?.hotmailLocalBaseUrl || '';
  inputLuckmailApiKey.value = state?.luckmailApiKey || '';
  inputLuckmailBaseUrl.value = normalizeLuckmailBaseUrl(state?.luckmailBaseUrl);
  selectLuckmailEmailType.value = normalizeLuckmailEmailType(state?.luckmailEmailType);
  inputLuckmailDomain.value = state?.luckmailDomain || '';
  if (typeof inputGptmailApiKey !== 'undefined' && inputGptmailApiKey) {
    inputGptmailApiKey.value = state?.gptmailApiKey || '';
  }
  if (typeof inputGptmailBaseUrl !== 'undefined' && inputGptmailBaseUrl) {
    inputGptmailBaseUrl.value = normalizeGptmailBaseUrl(state?.gptmailBaseUrl);
  }
  if (typeof inputGptmailDomain !== 'undefined' && inputGptmailDomain) {
    inputGptmailDomain.value = normalizeGptmailDomain(state?.gptmailDomain);
  }
  if (typeof updateGptmailUsageDisplay === 'function') {
    updateGptmailUsageDisplay(state);
  }
  applyCloudflareTempEmailSettingsState(state);
  if (typeof applyCloudMailSettingsState === 'function') {
    applyCloudMailSettingsState(state);
  }
  if (typeof applyYydsMailSettingsState === 'function') {
    applyYydsMailSettingsState(state);
  }
  renderCloudflareDomainOptions(state?.cloudflareDomain || '');
  setCloudflareDomainEditMode(false, { clearInput: true });
  inputAutoSkipFailures.checked = Boolean(state?.autoRunSkipFailures);
  inputAutoSkipFailuresThreadIntervalMinutes.value = String(normalizeAutoRunThreadIntervalMinutes(state?.autoRunFallbackThreadIntervalMinutes));
  if (typeof inputStep6CookieCleanupEnabled !== 'undefined' && inputStep6CookieCleanupEnabled) {
    inputStep6CookieCleanupEnabled.checked = Boolean(state?.step6CookieCleanupEnabled);
  }
  inputAutoDelayMinutes.value = String(normalizeAutoDelayMinutes(state?.autoRunDelayMinutes));
  inputAutoStepDelaySeconds.value = formatAutoStepDelayInputValue(state?.autoStepDelaySeconds);
  if (typeof inputOAuthFlowTimeoutEnabled !== 'undefined' && inputOAuthFlowTimeoutEnabled) {
    inputOAuthFlowTimeoutEnabled.checked = state?.oauthFlowTimeoutEnabled !== undefined
      ? Boolean(state.oauthFlowTimeoutEnabled)
      : true;
  }
  const isSyncPhase = typeof isAutoRunSourceSyncPhase === 'function'
    ? isAutoRunSourceSyncPhase
    : (phase) => ['scheduled', 'running', 'waiting_step', 'waiting_email', 'retrying', 'waiting_interval'].includes(phase);
  const shouldSyncInitialRunCount = typeof shouldSyncRunCountFromAutoRunSource === 'function'
    ? shouldSyncRunCountFromAutoRunSource(state)
    : (Boolean(state?.autoRunning) || isSyncPhase(state?.autoRunPhase ?? state?.phase));
  if (state?.autoRunTotalRuns && shouldSyncInitialRunCount) {
    inputRunCount.value = String(state.autoRunTotalRuns);
  } else if (typeof syncRunCountFromImportedAccounts === 'function') {
    syncRunCountFromImportedAccounts(state);
  }

  applyAutoRunStatus(state);
  markSettingsDirty(false);
  updateAutoDelayInputState();
  updateFallbackThreadIntervalInputState();
  updateAccountRunHistorySettingsUI();
  updatePanelModeUI();
  updateMailProviderUI();
  updateAccountWriteButtonState();
  if (typeof queueCustomEmailPoolRefresh === 'function') {
    queueCustomEmailPoolRefresh();
  }
  if (isLuckmailProvider(state?.mailProvider)) {
    if (typeof queueLuckmailPurchaseRefresh === 'function') {
      queueLuckmailPurchaseRefresh();
    }
  }
  updateButtonStates();
}

async function restoreState() {
  try {
    const state = await chrome.runtime.sendMessage({ type: 'GET_STATE', source: 'sidepanel' });
    applySettingsState(state);
    await initializeAccountWriteDirectoryState();
    if (getSelectedEmailGenerator() === 'icloud' && icloudSection?.style.display !== 'none') {
      refreshIcloudAliases({ silent: true }).catch(() => { });
    }

    if (state.oauthUrl) {
      displayOauthUrl.textContent = state.oauthUrl;
      displayOauthUrl.classList.add('has-value');
    }
    if (state.localhostUrl) {
      displayLocalhostUrl.textContent = state.localhostUrl;
      displayLocalhostUrl.classList.add('has-value');
    }

    if (Array.isArray(state.logs) && state.logs.length > 0) {
      const restoreLogs = state.logs.length > LOG_DOM_LIMIT
        ? state.logs.slice(-LOG_DOM_LIMIT)
        : state.logs;
      appendLogsBatch(restoreLogs, { scrollToBottom: true, forceScrollToBottom: true });
    }

    updateStatusDisplay(latestState);
    updateProgressCounter();
  } catch (err) {
    console.error('Failed to restore state:', err);
    if (typeof applyOperationDelayState === 'function') {
      applyOperationDelayState(undefined, { restoreFailed: true });
    }
  }
}

function openExternalUrl(url) {
  const targetUrl = String(url || '').trim();
  if (!targetUrl) {
    return;
  }

  if (chrome?.tabs?.create) {
    chrome.tabs.create({ url: targetUrl, active: true }).catch(() => {
      window.open(targetUrl, '_blank', 'noopener');
    });
    return;
  }

  window.open(targetUrl, '_blank', 'noopener');
}

function openCloudflareTempEmailRepositoryPage() {
  openExternalUrl(CLOUDFLARE_TEMP_EMAIL_REPOSITORY_URL);
}

function syncPasswordField(state) {
  inputPassword.value = state.customPassword || state.password || '';
}

function isCustomMailProvider(provider = selectMailProvider.value) {
  return String(provider || '').trim().toLowerCase() === 'custom';
}

function isLuckmailProvider(provider = selectMailProvider.value) {
  return String(provider || '').trim().toLowerCase() === LUCKMAIL_PROVIDER;
}

function isGptmailProvider(provider = selectMailProvider.value) {
  return String(provider || '').trim().toLowerCase() === GPTMAIL_PROVIDER;
}

function isYydsMailProvider(provider = selectMailProvider.value) {
  const yydsMailProvider = typeof YYDS_MAIL_PROVIDER === 'string'
    ? YYDS_MAIL_PROVIDER
    : 'yyds-mail';
  return String(provider || '').trim().toLowerCase() === yydsMailProvider;
}

function isIcloudMailProvider(provider = selectMailProvider.value) {
  return String(provider || '').trim().toLowerCase() === ICLOUD_PROVIDER;
}

function normalizeLuckmailBaseUrl(value = '') {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return DEFAULT_LUCKMAIL_BASE_URL;
  }

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return DEFAULT_LUCKMAIL_BASE_URL;
    }
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return DEFAULT_LUCKMAIL_BASE_URL;
  }
}

function normalizeLuckmailEmailType(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  return ['self_built', 'ms_imap', 'ms_graph', 'google_variant'].includes(normalized)
    ? normalized
    : DEFAULT_LUCKMAIL_EMAIL_TYPE;
}

function normalizeGptmailBaseUrl(value = '') {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return DEFAULT_GPTMAIL_BASE_URL;
  }

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return DEFAULT_GPTMAIL_BASE_URL;
    }
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return DEFAULT_GPTMAIL_BASE_URL;
  }
}

function normalizeGptmailDomain(value = '') {
  const normalized = String(value || '').trim().replace(/^@+/, '').toLowerCase();
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(normalized) ? normalized : '';
}

function normalizeYydsMailBaseUrl(value = '') {
  if (window.YydsMailUtils?.normalizeYydsMailBaseUrl) {
    return window.YydsMailUtils.normalizeYydsMailBaseUrl(value);
  }
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return DEFAULT_YYDS_MAIL_BASE_URL;
  }
  const candidate = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return DEFAULT_YYDS_MAIL_BASE_URL;
    }
    parsed.hash = '';
    parsed.search = '';
    parsed.pathname = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
    return `${parsed.origin}${parsed.pathname}` || DEFAULT_YYDS_MAIL_BASE_URL;
  } catch {
    return DEFAULT_YYDS_MAIL_BASE_URL;
  }
}

function formatGptmailUsageText(usage = null) {
  if (!usage || typeof usage !== 'object' || Array.isArray(usage)) {
    return '剩余：--';
  }
  const remainingTotal = Number(usage.remaining_total);
  if (Number.isFinite(remainingTotal)) {
    return `剩余：${remainingTotal}`;
  }
  const remainingToday = Number(usage.remaining_today);
  if (Number.isFinite(remainingToday)) {
    return `今日：${remainingToday}`;
  }
  return '剩余：--';
}

function updateGptmailUsageDisplay(state = latestState) {
  if (!gptmailApiUsage) {
    return;
  }
  const usage = state?.gptmailUsage || null;
  gptmailApiUsage.textContent = formatGptmailUsageText(usage);
  if (usage && typeof usage === 'object') {
    const usedTotal = Number(usage.total_usage);
    const remainingTotal = Number(usage.remaining_total);
    const totalLimit = Number(usage.total_limit);
    gptmailApiUsage.title = [
      Number.isFinite(remainingTotal) && Number.isFinite(totalLimit) && totalLimit > 0
        ? `总剩余 ${remainingTotal}/${totalLimit}`
        : '',
      Number.isFinite(usedTotal) ? `总已用 ${usedTotal}` : '',
    ].filter(Boolean).join('；') || 'GPTMail API 使用额度';
  } else {
    gptmailApiUsage.title = '等待 GPTMail API 返回使用额度';
  }
}

function getSelectedEmailGenerator() {
  const generator = String(selectEmailGenerator.value || '').trim().toLowerCase();
  if (generator === 'custom' || generator === 'manual') {
    return 'custom';
  }
  if (generator === GMAIL_ALIAS_GENERATOR) {
    return GMAIL_ALIAS_GENERATOR;
  }
  if (generator === CUSTOM_EMAIL_POOL_GENERATOR) {
    return CUSTOM_EMAIL_POOL_GENERATOR;
  }
  if (generator === 'icloud') {
    return 'icloud';
  }
  if (generator === 'cloudflare') return 'cloudflare';
  if (generator === 'cloudflare-temp-email') return 'cloudflare-temp-email';
  if (generator === 'cloudmail') return 'cloudmail';
  return 'duck';
}

function getEmailGeneratorUiCopy() {
  if (getSelectedEmailGenerator() === 'custom') {
    return getCustomMailProviderUiCopy();
  }
  if (getSelectedEmailGenerator() === GMAIL_ALIAS_GENERATOR) {
    return {
      buttonLabel: '生成',
      placeholder: '步骤 3 自动生成 Gmail +tag 邮箱并回填',
      successVerb: '生成',
      label: 'Gmail +tag 邮箱',
    };
  }
  if (getSelectedEmailGenerator() === CUSTOM_EMAIL_POOL_GENERATOR) {
    return {
      buttonLabel: '取下一个',
      placeholder: '按邮箱池顺序自动回填，也可以手动粘贴当前轮邮箱',
      successVerb: '取用',
      label: '自定义邮箱池',
    };
  }
  if (getSelectedEmailGenerator() === 'icloud') {
    return {
      buttonLabel: '获取',
      placeholder: '点击获取 iCloud 隐私邮箱，或手动粘贴邮箱',
      successVerb: '获取',
      label: 'iCloud 隐私邮箱',
    };
  }
  if (getSelectedEmailGenerator() === 'cloudflare') {
    return {
      buttonLabel: '生成',
      placeholder: '点击生成 Cloudflare 邮箱，或手动粘贴邮箱',
      successVerb: '生成',
      label: 'Cloudflare 邮箱',
    };
  }
  if (getSelectedEmailGenerator() === 'cloudflare-temp-email') {
    return {
      buttonLabel: '生成 Temp',
      placeholder: '点击生成 Cloudflare Temp Email，或手动粘贴邮箱',
      successVerb: '生成',
      label: 'Cloudflare Temp Email',
    };
  }
  if (getSelectedEmailGenerator() === 'cloudmail') {
    return {
      buttonLabel: '生成',
      placeholder: '点击生成 Cloud Mail 邮箱，或手动粘贴邮箱',
      successVerb: '生成',
      label: 'Cloud Mail',
    };
  }

  return {
    buttonLabel: '获取',
    placeholder: '点击获取 DuckDuckGo 邮箱，或手动粘贴邮箱',
    successVerb: '获取',
    label: 'Duck 邮箱',
  };
}

function getCustomMailProviderUiCopy() {
  if (usesCustomMailProviderPool()) {
    return {
      buttonLabel: '自定义邮箱',
      placeholder: '号池会按顺序自动回填，也可以手动覆盖当前轮邮箱',
      successVerb: '使用',
      label: '自定义邮箱',
    };
  }
  return {
    buttonLabel: '自定义邮箱',
    placeholder: '请填写本轮要使用的注册邮箱',
    successVerb: '使用',
    label: '自定义邮箱',
  };
}

function getCustomVerificationPromptCopy(step) {
  const verificationLabel = step === 4 ? '注册验证码' : '登录验证码';
  const isLoginVerificationStep = step === 8 || step === 11;
  return {
    title: `手动处理${verificationLabel}`,
    message: `当前邮箱服务为“自定义邮箱”。请先在页面中手动输入${verificationLabel}，并确认已经进入下一页面后，再点击确认。`,
    alert: {
      text: `点击确认后会跳过步骤 ${step}。`,
      tone: 'danger',
    },
    ...(isLoginVerificationStep ? {
      phoneActionLabel: '出现手机号验证',
      phoneActionAlert: {
        text: '如果当前页面已经进入手机号验证，可直接标记为失败并继续下一个邮箱。',
        tone: 'danger',
      },
    } : {}),
  };
}



async function openCustomVerificationConfirmDialog(step) {
  const promptCopy = getCustomVerificationPromptCopy(step);
  if (step === 8 || step === 11) {
    return openActionModal({
      title: promptCopy.title,
      message: promptCopy.message,
      alert: promptCopy.alert,
      actions: [
        { id: null, label: '取消', variant: 'btn-ghost' },
        { id: 'add_phone', label: promptCopy.phoneActionLabel || '出现手机号验证', variant: 'btn-outline' },
        { id: 'confirm', label: '确认跳过', variant: 'btn-danger' },
      ],
      buildResult: (choice) => ({
        confirmed: choice === 'confirm',
        addPhoneDetected: choice === 'add_phone',
      }),
    });
  }

  const confirmed = await openConfirmModal({
    title: promptCopy.title,
    message: promptCopy.message,
    confirmLabel: '确认跳过',
    confirmVariant: 'btn-danger',
    alert: promptCopy.alert,
  });
  return { confirmed, addPhoneDetected: false };
}

function getHotmailAccounts(state = latestState) {
  return Array.isArray(state?.hotmailAccounts) ? state.hotmailAccounts : [];
}

function getCurrentHotmailAccount(state = latestState) {
  const currentId = state?.currentHotmailAccountId;
  return getHotmailAccounts(state).find((account) => account.id === currentId) || null;
}

function getCurrentHotmailEmail(state = latestState) {
  return String(getCurrentHotmailAccount(state)?.email || '').trim();
}

function getMail2925Accounts(state = latestState) {
  return Array.isArray(state?.mail2925Accounts) ? state.mail2925Accounts : [];
}

function getCurrentMail2925Account(state = latestState) {
  const currentId = state?.currentMail2925AccountId;
  return getMail2925Accounts(state).find((account) => account.id === currentId) || null;
}

function getCurrentMail2925Email(state = latestState) {
  return String(getCurrentMail2925Account(state)?.email || '').trim();
}

function syncMail2925BaseEmailFromCurrentAccount(state = latestState, options = {}) {
  const { persist = false } = options;
  if (!isMail2925AccountPoolEnabled(state)) {
    return false;
  }

  const currentEmail = getCurrentMail2925Email(state);
  if (!currentEmail || currentEmail === String(state?.mail2925BaseEmail || '').trim()) {
    return false;
  }

  syncLatestState({ mail2925BaseEmail: currentEmail });
  if (persist) {
    saveSettings({ silent: true }).catch(() => { });
  }
  return true;
}

function getCurrentLuckmailPurchase(state = latestState) {
  return state?.currentLuckmailPurchase || null;
}

function getCurrentLuckmailEmail(state = latestState) {
  return String(getCurrentLuckmailPurchase(state)?.email_address || '').trim();
}

function getLuckmailUsedPurchases(state = latestState) {
  const rawValue = state?.luckmailUsedPurchases;
  if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
    return {};
  }

  return Object.entries(rawValue).reduce((result, [key, value]) => {
    const numeric = Number(key);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return result;
    }
    result[String(Math.floor(numeric))] = Boolean(value);
    return result;
  }, {});
}

function normalizeLuckmailProjectName(value = '') {
  return String(value || '').trim().toLowerCase();
}

function getLuckmailPreserveTagName(state = latestState) {
  return String(state?.luckmailPreserveTagName || '').trim() || DEFAULT_LUCKMAIL_PRESERVE_TAG_NAME;
}

function formatLuckmailDateTime(value) {
  const timestamp = normalizeLuckmailTimestampValue(value);
  if (!timestamp) {
    return String(value || '').trim() || '未知';
  }
  return new Date(timestamp).toLocaleString('zh-CN', {
    hour12: false,
    timeZone: DISPLAY_TIMEZONE,
  });
}

function getMailProviderLoginConfig(provider = selectMailProvider.value) {
  return MAIL_PROVIDER_LOGIN_CONFIGS[String(provider || '').trim()] || null;
}

function getSelectedIcloudHostPreference() {
  return normalizeIcloudHost(selectIcloudHostPreference?.value || latestState?.icloudHostPreference || '')
    || normalizeIcloudHost(latestState?.preferredIcloudHost)
    || 'icloud.com';
}

function getMailProviderLoginUrl(provider = selectMailProvider.value) {
  const config = getMailProviderLoginConfig(provider);
  if (String(provider || '').trim() === ICLOUD_PROVIDER) {
    return getIcloudLoginUrlForHost(getSelectedIcloudHostPreference());
  }
  const url = String(config?.url || '').trim();
  return url ? url : '';
}



function isCurrentEmailManagedByHotmail(state = latestState) {
  const hotmailEmail = getCurrentHotmailEmail(state);
  if (!hotmailEmail) {
    return false;
  }

  const inputEmailValue = String(inputEmail.value || '').trim();
  const stateEmailValue = String(state?.email || '').trim();
  return inputEmailValue === hotmailEmail || stateEmailValue === hotmailEmail;
}

function isCurrentEmailManagedByLuckmail(state = latestState) {
  const luckmailEmail = getCurrentLuckmailEmail(state);
  if (!luckmailEmail) {
    return false;
  }

  const inputEmailValue = String(inputEmail.value || '').trim();
  const stateEmailValue = String(state?.email || '').trim();
  return inputEmailValue === luckmailEmail || stateEmailValue === luckmailEmail;
}

function isCurrentEmailManagedByGptmail(state = latestState) {
  const gptmailEmail = String(state?.currentGptmailAddress || '').trim();
  if (!gptmailEmail) {
    return false;
  }

  const inputEmailValue = String(inputEmail.value || '').trim();
  const stateEmailValue = String(state?.email || '').trim();
  return inputEmailValue === gptmailEmail || stateEmailValue === gptmailEmail;
}

function isCurrentEmailManagedByGeneratedAlias(
  provider = latestState?.mailProvider,
  state = latestState,
  mail2925Mode = latestState?.mail2925Mode
) {
  const normalizedProvider = String(provider || '').trim();
  if (!usesGeneratedAliasMailProvider(normalizedProvider, mail2925Mode)) {
    return false;
  }

  const inputEmailValue = String(inputEmail.value || '').trim().toLowerCase();
  const stateEmailValue = String(state?.email || '').trim().toLowerCase();
  const baseEmail = getManagedAliasBaseEmailForProvider(normalizedProvider, state);
  return isManagedAliasEmail(inputEmailValue, baseEmail, normalizedProvider)
    || isManagedAliasEmail(stateEmailValue, baseEmail, normalizedProvider);
}

async function maybeClearGeneratedAliasAfterEmailPrefixChange() {
  const provider = selectMailProvider.value;
  if (!usesGeneratedAliasMailProvider(provider, latestState?.mail2925Mode)) {
    return;
  }

  const previousPrefix = getManagedAliasBaseEmailForProvider(provider, latestState);
  const nextPrefix = inputEmailPrefix.value.trim();
  if (previousPrefix === nextPrefix) {
    return;
  }

  if (!previousPrefix) {
    return;
  }

  if (!isCurrentEmailManagedByGeneratedAlias(provider, latestState, latestState?.mail2925Mode)) {
    return;
  }

  await clearRegistrationEmail({ silent: true });
}

function updateMailLoginButtonState() {
  if (!btnMailLogin) {
    return;
  }

  const config = getMailProviderLoginConfig();
  const loginUrl = getMailProviderLoginUrl();
  btnMailLogin.disabled = !loginUrl;
  btnMailLogin.textContent = config?.buttonLabel || '登录';
  btnMailLogin.title = loginUrl ? `打开 ${config.label} 登录页` : '当前邮箱服务没有可跳转的登录页';
}


function updateMailProviderUI() {
  const normalizeIcloudHostValue = typeof normalizeIcloudHost === 'function'
    ? normalizeIcloudHost
    : ((value) => {
      const normalized = String(value || '').trim().toLowerCase();
      return normalized === 'icloud.com' || normalized === 'icloud.com.cn' ? normalized : '';
    });
  const icloudTargetMailboxTypeValue = typeof selectIcloudTargetMailboxType !== 'undefined'
    ? selectIcloudTargetMailboxType?.value
    : latestState?.icloudTargetMailboxType;
  const icloudForwardMailProviderValue = typeof selectIcloudForwardMailProvider !== 'undefined'
    ? selectIcloudForwardMailProvider?.value
    : latestState?.icloudForwardMailProvider;
  const icloudHostPreferenceValue = typeof selectIcloudHostPreference !== 'undefined'
    ? selectIcloudHostPreference?.value
    : latestState?.icloudHostPreference;
  const capabilityState = typeof resolveCurrentSidepanelCapabilities === 'function'
    ? resolveCurrentSidepanelCapabilities({
      panelMode: typeof getSelectedPanelMode === 'function' ? getSelectedPanelMode() : latestState?.panelMode,
      state: latestState || {},
    })
    : null;
  const canShowLuckmail = capabilityState
    ? Boolean(capabilityState.canShowLuckmail)
    : true;
  const mailProviderOptions = Array.from(selectMailProvider?.options || []);
  mailProviderOptions.forEach((option) => {
    if (!option) {
      return;
    }
    if (String(option.value || '').trim().toLowerCase() === 'luckmail-api') {
      option.hidden = !canShowLuckmail;
    }
  });
  if (!canShowLuckmail && String(selectMailProvider?.value || '').trim().toLowerCase() === 'luckmail-api') {
    const fallbackOption = mailProviderOptions.find((option) => option && !option.hidden);
    if (fallbackOption) {
      selectMailProvider.value = String(fallbackOption.value || '').trim();
    }
  }
  const use2925 = selectMailProvider.value === '2925';
  const useGmail = selectMailProvider.value === GMAIL_PROVIDER;
  const useMail2925 = selectMailProvider.value === '2925';
  const useMail2925AccountPool = useMail2925 && Boolean(inputMail2925UseAccountPool?.checked);
  const mail2925Mode = getSelectedMail2925Mode();
  const gmailAliasGenerator = typeof GMAIL_ALIAS_GENERATOR === 'string'
    ? GMAIL_ALIAS_GENERATOR
    : 'gmail-alias';
  const customEmailPoolGenerator = typeof CUSTOM_EMAIL_POOL_GENERATOR === 'string'
    ? CUSTOM_EMAIL_POOL_GENERATOR
    : 'custom-pool';
  const gmailOnlyGenerators = new Set([gmailAliasGenerator, customEmailPoolGenerator]);
  Array.from(selectEmailGenerator?.options || []).forEach((option) => {
    if (!option) return;
    if (useGmail) {
      option.hidden = !gmailOnlyGenerators.has(String(option.value || '').trim().toLowerCase());
      return;
    }
    option.hidden = String(option.value || '').trim().toLowerCase() === gmailAliasGenerator;
  });
  if (useGmail && !gmailOnlyGenerators.has(String(selectEmailGenerator.value || '').trim().toLowerCase())) {
    selectEmailGenerator.value = gmailAliasGenerator;
  }
  if (!useGmail && String(selectEmailGenerator.value || '').trim().toLowerCase() === gmailAliasGenerator) {
    selectEmailGenerator.value = 'duck';
  }
  const selectedGenerator = getSelectedEmailGenerator();
  const useGeneratedAlias = usesGeneratedAliasMailProvider(selectMailProvider.value, mail2925Mode, selectedGenerator);
  const useInbucket = selectMailProvider.value === 'inbucket';
  const useHotmail = selectMailProvider.value === 'hotmail-api';
  const useLuckmail = canShowLuckmail && isLuckmailProvider();
  const useGptmail = typeof isGptmailProvider === 'function'
    ? isGptmailProvider()
    : String(selectMailProvider?.value || '').trim().toLowerCase() === 'gptmail';
  const useYydsMail = typeof isYydsMailProvider === 'function'
    ? isYydsMailProvider()
    : String(selectMailProvider.value || '').trim().toLowerCase() === 'yyds-mail';
  const useCustomEmail = isCustomMailProvider();
  const useCustomMailProviderPool = useCustomEmail && usesCustomMailProviderPool(selectMailProvider.value);
  const useIcloudProvider = isIcloudMailProvider();
  const useEmailGenerator = !useHotmail && !useLuckmail && !useGptmail && !useYydsMail && !useCustomEmail && (!useGeneratedAlias || useGmail);
  const useCloudflareTempEmailProvider = selectMailProvider.value === 'cloudflare-temp-email';
  const useCloudMailProvider = selectMailProvider.value === 'cloudmail';
  const aliasUiCopy = useGeneratedAlias
    ? getManagedAliasProviderUiCopy(selectMailProvider.value, mail2925Mode)
    : null;
  const uiCopy = getCurrentRegistrationEmailUiCopy();
  updateMailLoginButtonState();
  if (rowMail2925Mode) {
    rowMail2925Mode.style.display = use2925 ? '' : 'none';
  }
  if (rowMail2925PoolSettings) {
    rowMail2925PoolSettings.style.display = useMail2925 ? '' : 'none';
  }
  if (typeof rowCustomMailProviderPool !== 'undefined' && rowCustomMailProviderPool) {
    rowCustomMailProviderPool.style.display = useCustomEmail ? '' : 'none';
  }
  rowEmailPrefix.style.display = useGeneratedAlias && !useMail2925AccountPool ? '' : 'none';
  const hotmailServiceMode = getSelectedHotmailServiceMode();
  rowInbucketHost.style.display = useInbucket ? '' : 'none';
  rowInbucketMailbox.style.display = useInbucket ? '' : 'none';
  const useCustomEmailPool = useEmailGenerator && selectedGenerator === customEmailPoolGenerator;
  const useDuckGenerator = selectedGenerator === 'duck';
  const useCloudflare = selectedGenerator === 'cloudflare';
  const useIcloud = selectedGenerator === 'icloud';
  const useCloudflareTempEmailGenerator = selectedGenerator === 'cloudflare-temp-email';
  const useCloudMailGenerator = selectedGenerator === 'cloudmail';
  const showCloudflareDomain = useEmailGenerator && useCloudflare;
  const showCloudflareTempEmailSettings = useCloudflareTempEmailProvider || (useEmailGenerator && useCloudflareTempEmailGenerator);
  const showCloudflareTempEmailLookupMode = useCloudflareTempEmailProvider && !useCloudflareTempEmailGenerator;
  const selectedCloudflareTempEmailLookupMode = typeof getSelectedCloudflareTempEmailLookupMode === 'function'
    ? getSelectedCloudflareTempEmailLookupMode()
    : 'receive-mailbox';
  const cloudflareTempEmailRegistrationLookupMode = typeof CLOUDFLARE_TEMP_EMAIL_LOOKUP_MODE_REGISTRATION_EMAIL === 'string'
    ? CLOUDFLARE_TEMP_EMAIL_LOOKUP_MODE_REGISTRATION_EMAIL
    : 'registration-email';
  const useCloudflareTempEmailRegistrationLookup = showCloudflareTempEmailLookupMode
    && selectedCloudflareTempEmailLookupMode === cloudflareTempEmailRegistrationLookupMode;
  const showCloudflareTempEmailReceiveMailbox = showCloudflareTempEmailLookupMode
    && !useCloudflareTempEmailRegistrationLookup;
  const showCloudMailSettings = useCloudMailProvider || (useEmailGenerator && useCloudMailGenerator);
  const showCloudMailReceiveMailbox = useCloudMailProvider && !useCloudMailGenerator;
  const showCloudMailDomain = useEmailGenerator && useCloudMailGenerator;
  const selectedIcloudHost = typeof getSelectedIcloudHostPreference === 'function'
    ? getSelectedIcloudHostPreference()
    : (normalizeIcloudHostValue(icloudHostPreferenceValue || latestState?.icloudHostPreference || '')
      || normalizeIcloudHostValue(latestState?.preferredIcloudHost)
      || 'icloud.com');
  const icloudTargetMailboxType = normalizeIcloudTargetMailboxType(icloudTargetMailboxTypeValue);
  const isIcloudComCnHost = selectedIcloudHost === 'icloud.com.cn';
  const showIcloudTargetMailboxType = useIcloudProvider;
  const showIcloudForwardMailProvider = useIcloudProvider && icloudTargetMailboxType === 'forward-mailbox';
  const showCloudflareTempEmailRandomSubdomainToggle = useEmailGenerator && useCloudflareTempEmailGenerator;
  const showCloudflareTempEmailDomain = useEmailGenerator && useCloudflareTempEmailGenerator;
  const showCloudflareTempEmailFixedMailbox = useCloudflareTempEmailProvider && useCloudflareTempEmailGenerator;
  const showDuckApiAuthorization = useEmailGenerator && useDuckGenerator;
  if (rowEmailGenerator) {
    rowEmailGenerator.style.display = useEmailGenerator ? '' : 'none';
  }
  if (typeof rowDuckApiAuthorization !== 'undefined' && rowDuckApiAuthorization) {
    rowDuckApiAuthorization.style.display = showDuckApiAuthorization ? '' : 'none';
  }
  if (typeof rowCustomEmailPool !== 'undefined' && rowCustomEmailPool) {
    rowCustomEmailPool.style.display = useCustomEmailPool ? '' : 'none';
    if (useCustomEmailPool) {
      queueCustomEmailPoolRefresh();
    } else {
      resetCustomEmailPoolManager();
    }
  }
  if (cloudflareTempEmailSection) {
    cloudflareTempEmailSection.style.display = showCloudflareTempEmailSettings ? '' : 'none';
  }
  if (typeof cloudMailSection !== 'undefined' && cloudMailSection) {
    cloudMailSection.style.display = showCloudMailSettings ? '' : 'none';
  }
  if (typeof yydsMailSection !== 'undefined' && yydsMailSection) {
    yydsMailSection.style.display = useYydsMail ? '' : 'none';
  }
  if (typeof rowCloudMailBaseUrl !== 'undefined' && rowCloudMailBaseUrl) rowCloudMailBaseUrl.style.display = showCloudMailSettings ? '' : 'none';
  if (typeof rowCloudMailAdminEmail !== 'undefined' && rowCloudMailAdminEmail) rowCloudMailAdminEmail.style.display = showCloudMailSettings ? '' : 'none';
  if (typeof rowCloudMailAdminPassword !== 'undefined' && rowCloudMailAdminPassword) rowCloudMailAdminPassword.style.display = showCloudMailSettings ? '' : 'none';
  if (typeof rowCloudMailReceiveMailbox !== 'undefined' && rowCloudMailReceiveMailbox) rowCloudMailReceiveMailbox.style.display = showCloudMailReceiveMailbox ? '' : 'none';
  if (typeof rowCloudMailDomain !== 'undefined' && rowCloudMailDomain) rowCloudMailDomain.style.display = showCloudMailDomain ? '' : 'none';
  if (icloudSection) {
    const showIcloudSection = (useEmailGenerator && useIcloud) || useIcloudProvider;
    icloudSection.style.display = showIcloudSection ? '' : 'none';
    if (showIcloudSection) {
      queueIcloudAliasRefresh();
    }
    if (!showIcloudSection) {
      hideIcloudLoginHelp();
    }
  }
  if (typeof rowIcloudTargetMailboxType !== 'undefined' && rowIcloudTargetMailboxType) {
    rowIcloudTargetMailboxType.style.display = showIcloudTargetMailboxType ? '' : 'none';
  }
  if (typeof rowIcloudForwardMailProvider !== 'undefined' && rowIcloudForwardMailProvider) {
    rowIcloudForwardMailProvider.style.display = showIcloudForwardMailProvider ? '' : 'none';
  }
  rowCfDomain.style.display = showCloudflareDomain ? '' : 'none';
  const { domains } = getCloudflareDomainsFromState();
  if (showCloudflareDomain) {
    setCloudflareDomainEditMode(cloudflareDomainEditMode || domains.length === 0, { clearInput: false });
  } else {
    setCloudflareDomainEditMode(false, { clearInput: false });
  }
  rowTempEmailBaseUrl.style.display = showCloudflareTempEmailSettings ? '' : 'none';
  rowTempEmailAdminAuth.style.display = showCloudflareTempEmailSettings ? '' : 'none';
  rowTempEmailCustomAuth.style.display = showCloudflareTempEmailSettings ? '' : 'none';
  if (typeof rowTempEmailLookupMode !== 'undefined' && rowTempEmailLookupMode) {
    rowTempEmailLookupMode.style.display = showCloudflareTempEmailLookupMode ? '' : 'none';
  }
  rowTempEmailReceiveMailbox.style.display = showCloudflareTempEmailReceiveMailbox ? '' : 'none';
  if (rowTempEmailRandomSubdomainToggle) {
    rowTempEmailRandomSubdomainToggle.style.display = showCloudflareTempEmailRandomSubdomainToggle ? '' : 'none';
  }
  rowTempEmailDomain.style.display = showCloudflareTempEmailDomain ? '' : 'none';
  if (typeof rowTempEmailFixedMailbox !== 'undefined' && rowTempEmailFixedMailbox) {
    rowTempEmailFixedMailbox.style.display = showCloudflareTempEmailFixedMailbox ? '' : 'none';
  }
  const { domains: tempEmailDomains } = getCloudflareTempEmailDomainsFromState();
  if (showCloudflareTempEmailDomain) {
    setCloudflareTempEmailDomainEditMode(cloudflareTempEmailDomainEditMode || tempEmailDomains.length === 0, { clearInput: false });
  } else {
    setCloudflareTempEmailDomainEditMode(false, { clearInput: false });
  }

  if (hotmailSection) {
    hotmailSection.style.display = useHotmail ? '' : 'none';
  }
  if (mail2925Section) {
    mail2925Section.style.display = useMail2925AccountPool ? '' : 'none';
  }
  if (luckmailSection) {
    luckmailSection.style.display = useLuckmail ? '' : 'none';
  }
  if (typeof gptmailSection !== 'undefined' && gptmailSection) {
    gptmailSection.style.display = useGptmail ? '' : 'none';
  }
  labelEmailPrefix.textContent = '邮箱前缀';
  inputEmailPrefix.placeholder = '例如 abc';
  if (labelMail2925UseAccountPool) {
    labelMail2925UseAccountPool.style.display = useMail2925 ? '' : 'none';
  }
  syncMail2925PoolAccountOptions(latestState);
  if (selectMail2925PoolAccount) {
    selectMail2925PoolAccount.style.display = useMail2925AccountPool ? '' : 'none';
    selectMail2925PoolAccount.disabled = !useMail2925AccountPool || getMail2925Accounts().length === 0;
  }
  inputEmailPrefix.style.display = '';
  inputEmailPrefix.readOnly = false;
  selectEmailGenerator.disabled = useHotmail || useLuckmail || useGptmail || useYydsMail || useCustomEmail || (useGeneratedAlias && !useGmail);
  if (useGmail) {
    labelEmailPrefix.textContent = 'Gmail 原邮箱';
    inputEmailPrefix.placeholder = '例如 yourname@gmail.com';
  }
  labelEmailPrefix.textContent = aliasUiCopy?.baseLabel || labelEmailPrefix.textContent;
  inputEmailPrefix.placeholder = aliasUiCopy?.basePlaceholder || inputEmailPrefix.placeholder;
  if (rowHotmailServiceMode) {
    rowHotmailServiceMode.style.display = useHotmail ? '' : 'none';
  }
  if (rowHotmailRemoteBaseUrl) {
    rowHotmailRemoteBaseUrl.style.display = useHotmail && hotmailServiceMode === HOTMAIL_SERVICE_MODE_REMOTE ? '' : 'none';
  }
  if (rowHotmailLocalBaseUrl) {
    rowHotmailLocalBaseUrl.style.display = useHotmail && hotmailServiceMode === HOTMAIL_SERVICE_MODE_LOCAL ? '' : 'none';
  }
  btnFetchEmail.hidden = useHotmail || useLuckmail || useGptmail || useCustomEmail || useCustomEmailPool;
  inputEmail.readOnly = useHotmail || useLuckmail || useGptmail;
  inputEmail.placeholder = useHotmail
    ? '由 Hotmail 账号池自动分配'
    : (useLuckmail
      ? '步骤 3 自动购买 LuckMail 邮箱并回填'
      : (useGptmail
        ? '步骤 3 自动生成 GPTMail 邮箱并回填'
        : (useGeneratedAlias ? '步骤 3 自动生成 2925 邮箱并回填' : uiCopy.placeholder)));
  if (useGmail && useGeneratedAlias) {
    inputEmail.placeholder = '步骤 3 自动生成 Gmail +tag 邮箱并回填';
  }
  if (!useHotmail && !useLuckmail && !useGptmail) {
    inputEmail.placeholder = uiCopy.placeholder;
  }
  if (useCustomEmail && useCustomMailProviderPool) {
    inputEmail.placeholder = '号池会按顺序自动回填当前轮邮箱，也可以手动覆盖';
  }
  btnFetchEmail.disabled = useLuckmail || useGptmail || useCustomEmail || useCustomEmailPool || isAutoRunLockedPhase();
  if (!btnFetchEmail.disabled) {
    btnFetchEmail.textContent = uiCopy.buttonLabel;
  }
  if (autoHintText) {
    autoHintText.textContent = useHotmail
      ? '请先校验并选择一个 Hotmail 账号'
      : (useLuckmail
        ? '步骤 3 会自动购买 LuckMail 邮箱并用于收码'
        : (useGptmail
          ? '步骤 3 会自动生成 GPTMail 邮箱并用于收码'
          : (useGeneratedAlias
            ? '步骤 3 会自动生成邮箱，无需手动获取'
            : (useCustomEmail ? '请先填写自定义注册邮箱，成功一轮后会自动清空' : `先自动获取${uiCopy.label}，或手动粘贴邮箱后再继续`))));
  }
  if (autoHintText && useCustomEmailPool) {
    autoHintText.textContent = getCustomEmailPoolSize() > 0
      ? `当前邮箱池共 ${getCustomEmailPoolSize()} 个邮箱，自动轮数会跟随数量；实际收码仍走当前邮箱服务`
      : '请先在邮箱池里每行填写一个邮箱，自动轮数会跟随数量';
  }
  if (autoHintText && useCustomEmail && useCustomMailProviderPool) {
    autoHintText.textContent = `当前自定义号池共 ${getCustomMailProviderPoolSize()} 个邮箱，自动轮数会跟随数量；第 4/8 步仍需手动输入验证码`;
  }
  if (autoHintText && useGmail && useGeneratedAlias) {
    autoHintText.textContent = '请先填写 Gmail 原邮箱，步骤 3 会自动生成 Gmail +tag 地址';
  }
  if (autoHintText && useGeneratedAlias && aliasUiCopy?.hint) {
    autoHintText.textContent = aliasUiCopy.hint;
  }
  if (autoHintText && useMail2925AccountPool && !useCustomEmailPool) {
    autoHintText.textContent = getMail2925Accounts().length
      ? (useGeneratedAlias
        ? '当前已启用 2925 号池模式，步骤 3 会基于下拉框选中的号池邮箱生成别名地址'
        : '当前已启用 2925 号池模式，步骤 4 / 8 遇到登录页时会优先使用下拉框选中的账号自动登录')
      : '当前已启用 2925 号池模式，请先在下方 2925 账号池中添加账号并选择邮箱';
  }
  if (autoHintText && showCloudflareTempEmailReceiveMailbox && !useCustomEmailPool) {
    autoHintText.textContent = '若注册邮箱会转发到 Cloudflare Temp Email，请在“邮件接收”中填写实际接收转发邮件的邮箱。';
  }
  if (autoHintText && showCloudflareTempEmailRandomSubdomainToggle && inputTempEmailUseRandomSubdomain?.checked) {
    autoHintText.textContent = '已启用随机子域名：扩展会按当前选中的 Temp 域名提交，并额外携带 enableRandomSubdomain；是否生效取决于后端 RANDOM_SUBDOMAIN_DOMAINS 配置。';
  }
  if (autoHintText && useIcloudProvider && showIcloudForwardMailProvider) {
    const forwardProvider = normalizeIcloudForwardMailProvider(icloudForwardMailProviderValue);
    const forwardProviderLabel = ICLOUD_FORWARD_MAIL_PROVIDER_LABELS[forwardProvider]
      || MAIL_PROVIDER_LOGIN_CONFIGS[forwardProvider]?.label
      || '目标邮箱';
    autoHintText.textContent = `iCloud ${isIcloudComCnHost ? 'com.cn' : ''} 当前使用转发收码：第 4/8 步会从 ${forwardProviderLabel} 轮询验证码。`;
  }
  if (useHotmail) {
    inputEmail.value = getCurrentHotmailEmail();
  } else if (useLuckmail) {
    inputEmail.value = getCurrentLuckmailEmail();
  } else if (useGptmail) {
    inputEmail.value = latestState?.currentGptmailAddress || latestState?.email || '';
  }
  if (useCustomEmailPool) {
    syncRunCountFromCustomEmailPool();
    if (typeof queueCustomEmailPoolRefresh === 'function') {
      queueCustomEmailPoolRefresh();
    }
  }
  if (useCustomMailProviderPool) {
    syncRunCountFromCustomMailProviderPool();
  }
  if (typeof inputRunCount !== 'undefined' && inputRunCount) {
    inputRunCount.disabled = currentAutoRun.autoRunning || shouldLockRunCountToEmailPool();
  }
  renderHotmailAccounts();
  if (useMail2925) {
    renderMail2925Accounts();
  }
  if (useLuckmail) {
    renderLuckmailPurchases();
  }
}

async function saveCloudflareDomainSettings(domains, activeDomain, options = {}) {
  const { silent = false } = options;
  const normalizedDomains = normalizeCloudflareDomains(domains);
  const normalizedActiveDomain = normalizeCloudflareDomainValue(activeDomain) || normalizedDomains[0] || '';
  const payload = {
    cloudflareDomain: normalizedActiveDomain,
    cloudflareDomains: normalizedDomains,
  };

  const response = await chrome.runtime.sendMessage({
    type: 'SAVE_SETTING',
    source: 'sidepanel',
    payload,
  });

  if (response?.error) {
    throw new Error(response.error);
  }

  syncLatestState({
    ...payload,
  });
  renderCloudflareDomainOptions(normalizedActiveDomain);
  setCloudflareDomainEditMode(false, { clearInput: true });
  markSettingsDirty(false);
  updateMailProviderUI();

  if (!silent) {
    showToast('Cloudflare 域名已保存', 'success', 1800);
  }
}

async function saveCloudflareTempEmailDomainSettings(domains, activeDomain, options = {}) {
  const { silent = false } = options;
  const normalizedDomains = normalizeCloudflareTempEmailDomains(domains);
  const normalizedActiveDomain = normalizeCloudflareTempEmailDomainValue(activeDomain) || normalizedDomains[0] || '';
  const payload = {
    cloudflareTempEmailDomain: normalizedActiveDomain,
    cloudflareTempEmailDomains: normalizedDomains,
  };

  const response = await chrome.runtime.sendMessage({
    type: 'SAVE_SETTING',
    source: 'sidepanel',
    payload,
  });

  if (response?.error) {
    throw new Error(response.error);
  }

  syncLatestState({
    ...payload,
  });
  renderCloudflareTempEmailDomainOptions(normalizedActiveDomain);
  setCloudflareTempEmailDomainEditMode(false, { clearInput: true });
  markSettingsDirty(false);
  updateMailProviderUI();

  if (!silent) {
    showToast('Cloudflare Temp Email 域名已保存', 'success', 1800);
  }
}

function joinCloudflareTempEmailSettingsUrl(baseUrl, path) {
  const normalizedBaseUrl = normalizeCloudflareTempEmailBaseUrlValue(baseUrl);
  const normalizedPath = String(path || '').trim();
  if (!normalizedBaseUrl || !normalizedPath) {
    return normalizedBaseUrl || '';
  }
  return `${normalizedBaseUrl}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`;
}

function buildCloudflareTempEmailSyncHeaders(options = {}) {
  const { includeAdminAuth = false } = options;
  const headers = {
    Accept: 'application/json',
  };
  const customAuth = String(inputTempEmailCustomAuth?.value || '').trim();
  if (customAuth) {
    headers['x-custom-auth'] = customAuth;
  }
  if (includeAdminAuth) {
    const adminAuth = String(inputTempEmailAdminAuth?.value || '').trim();
    if (adminAuth) {
      headers['x-admin-auth'] = adminAuth;
    }
  }
  return headers;
}

async function requestCloudflareTempEmailSyncPayload(baseUrl, path, options = {}) {
  const url = joinCloudflareTempEmailSettingsUrl(baseUrl, path);
  if (!url) {
    throw new Error('Cloudflare Temp Email 服务地址为空或格式无效。');
  }

  const response = await fetch(url, {
    cache: 'no-store',
    headers: buildCloudflareTempEmailSyncHeaders(options),
  });
  const rawText = await response.text();
  let payload = rawText;
  try {
    payload = rawText ? JSON.parse(rawText) : {};
  } catch {
    payload = rawText;
  }

  if (!response.ok) {
    const message = typeof payload === 'object' && payload
      ? (payload.message || payload.error || payload.msg)
      : '';
    throw new Error(message || `HTTP ${response.status}`);
  }

  return payload;
}

function mergeCloudflareTempEmailDomains(existingDomains, fetchedDomains) {
  const mergedDomains = [];
  const seen = new Set();
  for (const domain of normalizeCloudflareTempEmailDomains(fetchedDomains)) {
    if (seen.has(domain)) continue;
    seen.add(domain);
    mergedDomains.push(domain);
  }
  for (const domain of normalizeCloudflareTempEmailDomains(existingDomains)) {
    if (seen.has(domain)) continue;
    seen.add(domain);
    mergedDomains.push(domain);
  }
  return mergedDomains;
}

async function fetchCloudflareTempEmailAvailableDomains(baseUrl) {
  let openSettingsError = null;
  try {
    const payload = await requestCloudflareTempEmailSyncPayload(baseUrl, '/open_api/settings');
    const domains = normalizeCloudflareTempEmailDomains(payload?.domains || []);
    if (domains.length) {
      return {
        domains,
        source: 'open_api/settings',
      };
    }
    openSettingsError = new Error('公开设置未返回可用域名。');
  } catch (error) {
    openSettingsError = error;
  }

  const adminAuth = String(inputTempEmailAdminAuth?.value || '').trim();
  if (!adminAuth) {
    throw openSettingsError || new Error('未获取到可用域名。');
  }

  const payload = await requestCloudflareTempEmailSyncPayload(baseUrl, '/admin/worker/configs', {
    includeAdminAuth: true,
  });
  const domains = normalizeCloudflareTempEmailDomains(payload?.DOMAINS || []);
  if (!domains.length) {
    throw openSettingsError || new Error('管理配置未返回可用域名。');
  }
  return {
    domains,
    source: 'admin/worker/configs',
  };
}

async function syncCloudflareTempEmailDomainsFromService() {
  const normalizedBaseUrl = normalizeCloudflareTempEmailBaseUrlValue(inputTempEmailBaseUrl?.value || '');
  if (!normalizedBaseUrl) {
    throw new Error('请先填写有效的 Cloudflare Temp Email 服务地址。');
  }

  const previousButtonText = btnTempEmailDomainMode.textContent;
  btnTempEmailDomainMode.disabled = true;
  btnTempEmailDomainMode.textContent = '更新中...';

  try {
    const { domains: fetchedDomains, source } = await fetchCloudflareTempEmailAvailableDomains(normalizedBaseUrl);
    const { domains: existingDomains, activeDomain } = getCloudflareTempEmailDomainsFromState();
    const currentDomain = normalizeCloudflareTempEmailDomainValue(selectTempEmailDomain.value || activeDomain);
    const mergedDomains = mergeCloudflareTempEmailDomains(existingDomains, fetchedDomains);
    const nextActiveDomain = mergedDomains.includes(currentDomain)
      ? currentDomain
      : (fetchedDomains[0] || mergedDomains[0] || '');
    const existingSet = new Set(normalizeCloudflareTempEmailDomains(existingDomains));
    const addedCount = fetchedDomains.filter((domain) => !existingSet.has(domain)).length;

    await saveCloudflareTempEmailDomainSettings(mergedDomains, nextActiveDomain, { silent: true });
    if (addedCount > 0) {
      showToast(`已更新 Cloudflare Temp Email 域名，新增 ${addedCount} 个。`, 'success', 2200);
    } else {
      showToast('已同步 Cloudflare Temp Email 域名，暂无新增项。', 'info', 2200);
    }
    return {
      domains: mergedDomains,
      activeDomain: nextActiveDomain,
      source,
    };
  } catch (error) {
    const message = error?.message || String(error || '未知错误');
    throw new Error(`更新 Cloudflare Temp Email 域名失败：${message}`);
  } finally {
    btnTempEmailDomainMode.disabled = false;
    btnTempEmailDomainMode.textContent = previousButtonText || '更新';
  }
}

async function handleDeleteCloudflareDomain(domain) {
  const targetDomain = normalizeCloudflareDomainValue(domain);
  if (!targetDomain) {
    return;
  }

  const { domains, activeDomain } = getCloudflareDomainsFromState();
  const nextDomains = domains.filter((item) => item !== targetDomain);
  if (nextDomains.length === domains.length) {
    return;
  }

  const currentDomain = normalizeCloudflareDomainValue(selectCfDomain.value || activeDomain);
  const nextActiveDomain = currentDomain === targetDomain
    ? (nextDomains[0] || '')
    : (nextDomains.includes(currentDomain) ? currentDomain : nextDomains[0] || '');
  await saveCloudflareDomainSettings(nextDomains, nextActiveDomain, { silent: true });
  showToast(`已删除 Cloudflare 域名：${targetDomain}`, 'success', 1600);
}

async function handleDeleteCloudflareTempEmailDomain(domain) {
  const targetDomain = normalizeCloudflareTempEmailDomainValue(domain);
  if (!targetDomain) {
    return;
  }

  const { domains, activeDomain } = getCloudflareTempEmailDomainsFromState();
  const nextDomains = domains.filter((item) => item !== targetDomain);
  if (nextDomains.length === domains.length) {
    return;
  }

  const currentDomain = normalizeCloudflareTempEmailDomainValue(selectTempEmailDomain.value || activeDomain);
  const nextActiveDomain = currentDomain === targetDomain
    ? (nextDomains[0] || '')
    : (nextDomains.includes(currentDomain) ? currentDomain : nextDomains[0] || '');
  await saveCloudflareTempEmailDomainSettings(nextDomains, nextActiveDomain, { silent: true });
  showToast(`已删除 Cloudflare Temp Email 域名：${targetDomain}`, 'success', 1600);
}

async function handleAddSub2ApiGroup() {
  if (!sharedFormDialog?.open) {
    showToast('表单弹窗未加载，请刷新扩展后重试。', 'error');
    return;
  }

  const result = await sharedFormDialog.open({
    title: '添加 SUB2API 分组',
    confirmLabel: '添加',
    confirmVariant: 'btn-primary',
    fields: [
      {
        key: 'groupName',
        label: '分组',
        type: 'text',
        placeholder: '例如 codex',
        autocomplete: 'off',
        required: true,
        requiredMessage: '请先填写 SUB2API 分组名称。',
        validate: (value) => {
          const names = normalizeSub2ApiGroupOptions(value);
          return names.length ? '' : '请先填写 SUB2API 分组名称。';
        },
      },
    ],
  });
  if (!result) {
    return;
  }

  const newGroups = normalizeSub2ApiGroupOptions(result.groupName);
  if (!newGroups.length) {
    return;
  }

  const selectedGroup = newGroups[0];
  const nextGroups = normalizeSub2ApiGroupOptions(
    getSub2ApiGroupOptionsState(latestState),
    newGroups
  );
  syncLatestState({
    sub2apiGroupName: selectedGroup,
    sub2apiGroupNames: nextGroups,
  });
  renderSub2ApiGroupOptions(latestState, selectedGroup);
  markSettingsDirty(true);
  await saveSettings({ silent: true }).catch(() => { });
  showToast(`已添加并切换到 SUB2API 分组：${selectedGroup}`, 'success', 1800);
}

async function handleDeleteSub2ApiGroup(groupName) {
  const targetName = String(groupName || '').trim();
  if (!targetName) {
    return;
  }

  const currentGroups = getSub2ApiGroupOptionsState(latestState);
  if (currentGroups.length <= 1) {
    showToast('至少保留一个 SUB2API 分组。', 'warn', 1800);
    return;
  }

  const targetKey = targetName.toLowerCase();
  const nextGroups = currentGroups.filter((name) => name.toLowerCase() !== targetKey);
  if (nextGroups.length === currentGroups.length) {
    return;
  }

  const currentGroup = getSelectedSub2ApiGroupName();
  const nextSelectedGroup = currentGroup.toLowerCase() === targetKey
    ? nextGroups[0]
    : (nextGroups.find((name) => name.toLowerCase() === currentGroup.toLowerCase()) || nextGroups[0]);

  syncLatestState({
    sub2apiGroupName: nextSelectedGroup,
    sub2apiGroupNames: nextGroups,
  });
  renderSub2ApiGroupOptions(latestState, nextSelectedGroup);
  sub2ApiGroupPicker.setOpen(true);
  markSettingsDirty(true);
  await saveSettings({ silent: true }).catch(() => { });
  showToast(`已删除 SUB2API 分组：${targetName}`, 'success', 1600);
}

function updateAccountTransferButtonsVisibility() {
  if (!btnImportAccounts && !accountWriteControl) {
    return;
  }
  const selectedFlow = String(selectFlow?.value || '').trim();
  // 仅在“授权Codex”流程中显示“导入账号”按钮，其它流程隐藏。
  if (btnImportAccounts) {
    btnImportAccounts.hidden = selectedFlow !== 'authorize-codex';
  }
  // 当执行流程为“授权Codex”时隐藏“写入账号”开关，其它流程显示。
  if (accountWriteControl) {
    accountWriteControl.hidden = selectedFlow === 'authorize-codex';
  }
}

function updatePanelModeUI() {
  const rawPanelMode = normalizePanelMode(selectPanelMode?.value || latestState?.panelMode || 'cpa');
  const capabilityState = typeof resolveCurrentSidepanelCapabilities === 'function'
    ? resolveCurrentSidepanelCapabilities({
      panelMode: rawPanelMode,
      state: {
        ...(latestState || {}),
        panelMode: rawPanelMode,
      },
    })
    : null;
  const supportedPanelModes = Array.isArray(capabilityState?.supportedPanelModes)
    ? capabilityState.supportedPanelModes
    : [];
  if (selectPanelMode?.options && supportedPanelModes.length) {
    Array.from(selectPanelMode.options).forEach((option) => {
      if (!option) {
        return;
      }
      const optionMode = normalizePanelMode(option.value || '');
      const enabled = supportedPanelModes.includes(optionMode);
      option.disabled = !enabled;
      option.hidden = !enabled;
    });
  } else if (selectPanelMode?.options) {
    Array.from(selectPanelMode.options).forEach((option) => {
      if (!option) {
        return;
      }
      option.disabled = false;
      option.hidden = false;
    });
  }
  const panelMode = capabilityState?.effectivePanelMode || capabilityState?.panelMode || getSelectedPanelMode();
  if (selectPanelMode) {
    selectPanelMode.value = panelMode;
  }
  const useSub2Api = panelMode === 'sub2api';
  const useCodex2Api = panelMode === 'codex2api';
  const useCpa = !useSub2Api && !useCodex2Api;
  rowVpsUrl.style.display = useCpa ? '' : 'none';
  rowVpsPassword.style.display = useCpa ? '' : 'none';
  rowLocalCpaStep9Mode.style.display = useCpa ? '' : 'none';
  rowSub2ApiUrl.style.display = useSub2Api ? '' : 'none';
  rowSub2ApiEmail.style.display = useSub2Api ? '' : 'none';
  rowSub2ApiPassword.style.display = useSub2Api ? '' : 'none';
  rowSub2ApiGroup.style.display = useSub2Api ? '' : 'none';
  rowSub2ApiAccountPriority.style.display = useSub2Api ? '' : 'none';
  rowSub2ApiDefaultProxy.style.display = useSub2Api ? '' : 'none';
  rowCodex2ApiUrl.style.display = useCodex2Api ? '' : 'none';
  rowCodex2ApiAdminKey.style.display = useCodex2Api ? '' : 'none';

  const step9Btn = document.querySelector('.step-btn[data-step-key="platform-verify"]');
  if (step9Btn) {
    step9Btn.textContent = useSub2Api
      ? 'SUB2API 回调验证'
      : (useCodex2Api ? 'Codex2API 回调验证' : 'CPA 回调验证');
  }
}

// ============================================================
// UI Updates
// ============================================================

function updateNodeUI(nodeId, status) {
  const normalizedNodeId = String(nodeId || '').trim();
  if (!normalizedNodeId) return;
  syncLatestState({
    nodeStatuses: {
      ...getNodeStatuses(),
      [normalizedNodeId]: status,
    },
  });

  renderSingleNodeStatus(normalizedNodeId, status);
  updateButtonStates();
  updateProgressCounter();
  updateConfigMenuControls();
}

function updateStepUI(step, status) {
  const nodeId = getNodeIdByStepForCurrentMode(step);
  if (nodeId) {
    updateNodeUI(nodeId, status);
    return;
  }
  updateButtonStates();
  updateProgressCounter();
  updateConfigMenuControls();
}

function renderSingleNodeStatus(nodeId, status) {
  const normalizedStatus = status || 'pending';
  const normalizedNodeId = String(nodeId || '').trim();
  const selectorNodeId = escapeCssValue(normalizedNodeId);
  const statusEl = document.querySelector(`.step-status[data-node-id="${selectorNodeId}"]`);
  const row = document.querySelector(`.step-row[data-node-id="${selectorNodeId}"]`);

  if (statusEl) statusEl.textContent = STATUS_ICONS[normalizedStatus] || '';
  if (row) {
    row.className = `step-row ${normalizedStatus}`;
  }
}

function renderSingleStepStatus(step, status) {
  const nodeId = typeof getNodeIdByStepForCurrentMode === 'function'
    ? getNodeIdByStepForCurrentMode(step)
    : '';
  if (nodeId && typeof renderSingleNodeStatus === 'function') {
    renderSingleNodeStatus(nodeId, status);
    return;
  }
  const normalizedStatus = status || 'pending';
  const statusEl = document.querySelector(`.step-status[data-step="${step}"]`);
  const row = document.querySelector(`.step-row[data-step="${step}"]`);

  if (statusEl) statusEl.textContent = STATUS_ICONS[normalizedStatus] || '';
  if (row) {
    row.className = `step-row ${normalizedStatus}`;
  }
}

function renderStepStatuses(state = latestState) {
  if (typeof getNodeStatuses === 'function' && typeof NODE_IDS !== 'undefined') {
    const statuses = getNodeStatuses(state);
    for (const nodeId of NODE_IDS) {
      renderSingleNodeStatus(nodeId, statuses[nodeId]);
    }
  } else {
    const statuses = getStepStatuses(state);
    for (const step of STEP_IDS) {
      renderSingleStepStatus(step, statuses[step]);
    }
  }
  updateProgressCounter();
}

function updateProgressCounter() {
  if (typeof getNodeStatuses === 'function' && typeof NODE_IDS !== 'undefined') {
    const completed = Object.values(getNodeStatuses()).filter(isDoneStatus).length;
    stepsProgress.textContent = `${completed} / ${NODE_IDS.length}`;
    return;
  }
  const completed = Object.values(getStepStatuses()).filter(isDoneStatus).length;
  stepsProgress.textContent = `${completed} / ${STEP_IDS.length}`;
}

function updateButtonStates() {
  const statuses = getNodeStatuses();
  const anyRunning = Object.values(statuses).some(s => s === 'running');
  const autoLocked = isAutoRunLockedPhase();
  const autoScheduled = isAutoRunScheduledPhase();
  const icloudTargetMailboxTypeValue = typeof selectIcloudTargetMailboxType !== 'undefined'
    ? selectIcloudTargetMailboxType?.value
    : latestState?.icloudTargetMailboxType;

  for (const nodeId of NODE_IDS) {
    const step = getStepIdByNodeIdForCurrentMode(nodeId);
    const btn = document.querySelector(`.step-btn[data-node-id="${escapeCssValue(nodeId)}"]`);
    if (!btn) continue;

    if (anyRunning || autoLocked || autoScheduled) {
      btn.disabled = true;
    } else if (NODE_IDS.indexOf(nodeId) === 0) {
      btn.disabled = false;
    } else {
      const currentIndex = NODE_IDS.indexOf(nodeId);
      const prevNodeId = currentIndex > 0 ? NODE_IDS[currentIndex - 1] : null;
      const prevStatus = prevNodeId === null ? 'completed' : statuses[prevNodeId];
      const currentStatus = statuses[nodeId];
      btn.disabled = !(isDoneStatus(prevStatus) || currentStatus === 'failed' || isDoneStatus(currentStatus) || currentStatus === 'stopped');
    }
  }

  document.querySelectorAll('.step-manual-btn').forEach((btn) => {
    const step = Number(btn.dataset.step);
    const nodeId = String(btn.dataset.nodeId || getNodeIdByStepForCurrentMode(step) || '').trim();
    const currentStatus = statuses[nodeId];
    const currentIndex = NODE_IDS.indexOf(nodeId);
    const prevNodeId = currentIndex > 0 ? NODE_IDS[currentIndex - 1] : null;
    const prevStatus = prevNodeId === null ? 'completed' : statuses[prevNodeId];

    if (!SKIPPABLE_NODES.has(nodeId) || anyRunning || autoLocked || autoScheduled || currentStatus === 'running' || isDoneStatus(currentStatus)) {
      btn.style.display = 'none';
      btn.disabled = true;
      btn.title = '当前不可跳过';
      return;
    }

    if (prevNodeId !== null && !isDoneStatus(prevStatus)) {
      btn.style.display = 'none';
      btn.disabled = true;
      btn.title = `请先完成节点 ${prevNodeId}`;
      return;
    }

    btn.style.display = '';
    btn.disabled = false;
    btn.title = `跳过节点 ${nodeId}`;
  });

  btnReset.disabled = anyRunning || autoScheduled || isAutoRunPausedPhase() || autoLocked;
  const disableIcloudControls = anyRunning || autoScheduled || autoLocked;
  if (btnIcloudRefresh) btnIcloudRefresh.disabled = disableIcloudControls;
  if (btnIcloudDeleteUsed) btnIcloudDeleteUsed.disabled = disableIcloudControls || !hasDeletableUsedIcloudAliases();
  if (selectIcloudHostPreference) selectIcloudHostPreference.disabled = disableIcloudControls;
  if (typeof selectIcloudTargetMailboxType !== 'undefined' && selectIcloudTargetMailboxType) {
    selectIcloudTargetMailboxType.disabled = disableIcloudControls;
  }
  if (typeof selectIcloudForwardMailProvider !== 'undefined' && selectIcloudForwardMailProvider) {
    const normalizedIcloudTargetMailboxType = normalizeIcloudTargetMailboxType(icloudTargetMailboxTypeValue);
    const allowIcloudForwardMailProvider = isIcloudMailProvider()
      && normalizedIcloudTargetMailboxType === 'forward-mailbox';
    selectIcloudForwardMailProvider.disabled = disableIcloudControls || !allowIcloudForwardMailProvider;
  }
  if (selectIcloudFetchMode) {
    const allowIcloudFetchMode = getSelectedEmailGenerator() === ICLOUD_PROVIDER
      && !isCustomMailProvider()
      && !isManagedAliasProvider();
    selectIcloudFetchMode.disabled = disableIcloudControls || !allowIcloudFetchMode;
  }
  if (checkboxAutoDeleteIcloud) checkboxAutoDeleteIcloud.disabled = disableIcloudControls;
  updateStopButtonState(anyRunning || autoScheduled || isAutoRunPausedPhase() || autoLocked);
}

function updateStopButtonState(active) {
  btnStop.disabled = !active;
}

function updateStatusDisplay(state) {
  if (!state || !state.nodeStatuses) return;

  statusBar.className = 'status-bar';
  const nodeStatuses = getNodeStatuses(state);

  const countdown = getActiveAutoRunCountdown();
  if (countdown) {
    const remainingMs = countdown.at - Date.now();
    displayStatus.textContent = remainingMs > 0
      ? `${countdown.title}，剩余 ${formatCountdown(remainingMs)}`
      : `${countdown.title}，即将结束...`;
    statusBar.classList.add(countdown.tone === 'scheduled' ? 'scheduled' : 'running');
    return;
  }

  if (isAutoRunScheduledPhase()) {
    const remainingMs = Number.isFinite(currentAutoRun.scheduledAt)
      ? currentAutoRun.scheduledAt - Date.now()
      : 0;
    displayStatus.textContent = remainingMs > 0
      ? `自动计划中，剩余 ${formatCountdown(remainingMs)}`
      : '倒计时即将结束，正在准备启动...';
    statusBar.classList.add('scheduled');
    return;
  }

  if (isAutoRunPausedPhase()) {
    displayStatus.textContent = `自动已暂停${getAutoRunLabel()}，等待邮箱后继续`;
    statusBar.classList.add('paused');
    return;
  }

  if (isAutoRunWaitingStepPhase()) {
    const runningNodes = getRunningNodes(state);
    displayStatus.textContent = runningNodes.length
      ? `自动等待节点 ${runningNodes.join(', ')} 完成后继续${getAutoRunLabel()}`
      : `自动正在按最新进度准备继续${getAutoRunLabel()}`;
    statusBar.classList.add('running');
    return;
  }

  const running = Object.entries(nodeStatuses).find(([, s]) => s === 'running');
  if (running) {
    displayStatus.textContent = `节点 ${running[0]} 运行中...`;
    statusBar.classList.add('running');
    return;
  }

  if (isAutoRunLockedPhase()) {
    displayStatus.textContent = `${currentAutoRun.phase === 'retrying' ? '自动重试中' : '自动运行中'}${getAutoRunLabel()}`;
    statusBar.classList.add('running');
    return;
  }

  const failed = Object.entries(nodeStatuses).find(([, s]) => s === 'failed');
  if (failed) {
    displayStatus.textContent = `节点 ${failed[0]} 失败`;
    statusBar.classList.add('failed');
    return;
  }

  const stopped = Object.entries(nodeStatuses).find(([, s]) => s === 'stopped');
  if (stopped) {
    displayStatus.textContent = `节点 ${stopped[0]} 已停止`;
    statusBar.classList.add('stopped');
    return;
  }

  const lastCompleted = Object.entries(nodeStatuses)
    .filter(([, s]) => isDoneStatus(s))
    .map(([nodeId]) => nodeId)
    .sort((left, right) => NODE_IDS.indexOf(right) - NODE_IDS.indexOf(left))[0];

  if (lastCompleted === NODE_IDS[NODE_IDS.length - 1]) {
    displayStatus.textContent = (nodeStatuses[lastCompleted] === 'manual_completed' || nodeStatuses[lastCompleted] === 'skipped') ? '全部节点已跳过/完成' : '全部节点已完成';
    statusBar.classList.add('completed');
  } else if (lastCompleted) {
    displayStatus.textContent = (nodeStatuses[lastCompleted] === 'manual_completed' || nodeStatuses[lastCompleted] === 'skipped')
      ? `节点 ${lastCompleted} 已跳过`
      : `节点 ${lastCompleted} 已完成`;
  } else {
    displayStatus.textContent = '就绪';
  }
}

const LOG_DOM_LIMIT = 500;
const LOG_AUTO_SCROLL_THRESHOLD_PX = 24;
const LOG_REALTIME_CLASS = 'log-realtime';

const logLineById = new Map();
let queuedRealtimeLogs = [];
let queuedRealtimeLogRepeats = new Map();
let realtimeLogFlushHandle = null;
let realtimeLogFlushMode = '';
let logAreaPinnedToBottom = true;

function getLogMessageDisplayText(entry = {}) {
  const message = String(entry?.message || '');
  const repeatCount = Math.floor(Number(entry?.repeatCount) || 1);
  if (repeatCount > 1) {
    return `${message}（重复 x${repeatCount}）`;
  }
  return message;
}

function createLogLine(entry) {
  const normalizedEntry = entry || {};
  const time = new Date(normalizedEntry.timestamp).toLocaleTimeString('zh-CN', {
    hour12: false,
    timeZone: DISPLAY_TIMEZONE,
  });
  const levelLabel = LOG_LEVEL_LABELS[normalizedEntry.level] || normalizedEntry.level;
  const line = document.createElement('div');
  const keywordClass = resolveLogKeywordClass(normalizedEntry.message);
  line.className = `log-line log-${normalizedEntry.level}${keywordClass ? ` ${keywordClass}` : ''}`;
  if (normalizedEntry.id) {
    const logId = String(normalizedEntry.id);
    line.dataset.logId = logId;
    logLineById.set(logId, line);
  }

  const normalizedStep = Math.floor(Number(normalizedEntry.step) || 0);
  const stepNum = normalizedStep > 0 ? String(normalizedStep) : null;
  const messageText = getLogMessageDisplayText(normalizedEntry);

  let html = `<span class="log-time">${time}</span> `;
  html += `<span class="log-level log-level-${normalizedEntry.level}">${levelLabel}</span> `;
  if (stepNum) {
    html += `<span class="log-step-tag step-${stepNum}">步${stepNum}</span>`;
  }
  html += `<span class="log-msg">${escapeHtml(messageText)}</span>`;
  line.innerHTML = html;
  return line;
}

function ensureRealtimeLogMode() {
  if (!logArea) return;
  logArea.classList.add(LOG_REALTIME_CLASS);
}

function updateLogAreaPinnedState(thresholdPx = LOG_AUTO_SCROLL_THRESHOLD_PX) {
  if (!logArea) {
    logAreaPinnedToBottom = false;
    return logAreaPinnedToBottom;
  }
  const threshold = Math.max(0, Number(thresholdPx) || 0);
  const distanceToBottom = logArea.scrollHeight - logArea.clientHeight - logArea.scrollTop;
  logAreaPinnedToBottom = distanceToBottom <= threshold;
  return logAreaPinnedToBottom;
}

function isLogAreaNearBottom(thresholdPx = LOG_AUTO_SCROLL_THRESHOLD_PX) {
  const threshold = Math.max(0, Number(thresholdPx) || 0);
  if (threshold !== LOG_AUTO_SCROLL_THRESHOLD_PX) {
    return updateLogAreaPinnedState(threshold);
  }
  return logAreaPinnedToBottom;
}

function trimLogAreaOverflow(limit = LOG_DOM_LIMIT) {
  if (!logArea) return;
  const safeLimit = Math.max(1, Math.floor(Number(limit) || LOG_DOM_LIMIT));
  let overflowCount = logArea.childElementCount - safeLimit;
  while (overflowCount > 0) {
    const firstLine = logArea.firstElementChild;
    if (!firstLine) break;
    const logId = String(firstLine.dataset?.logId || '').trim();
    if (logId) {
      logLineById.delete(logId);
    }
    firstLine.remove();
    overflowCount -= 1;
  }
}

function appendLogsBatch(entries = [], options = {}) {
  const {
    scrollToBottom = true,
    forceScrollToBottom = false,
  } = options;
  if (!logArea || !Array.isArray(entries) || entries.length === 0) {
    return;
  }
  ensureRealtimeLogMode();
  const shouldAutoScroll = scrollToBottom && (forceScrollToBottom || isLogAreaNearBottom(LOG_AUTO_SCROLL_THRESHOLD_PX));
  const fragment = document.createDocumentFragment();
  entries.forEach((entry) => {
    fragment.appendChild(createLogLine(entry));
  });
  logArea.appendChild(fragment);
  trimLogAreaOverflow(LOG_DOM_LIMIT);
  if (shouldAutoScroll) {
    logArea.scrollTop = logArea.scrollHeight;
    logAreaPinnedToBottom = true;
  } else {
    updateLogAreaPinnedState();
  }
}

function scheduleRealtimeLogFlush() {
  if (realtimeLogFlushHandle != null) return;
  if (typeof requestAnimationFrame === 'function') {
    realtimeLogFlushMode = 'raf';
    realtimeLogFlushHandle = requestAnimationFrame(flushRealtimeLogQueue);
    return;
  }
  realtimeLogFlushMode = 'timeout';
  realtimeLogFlushHandle = setTimeout(flushRealtimeLogQueue, 16);
}

function flushRealtimeLogQueue() {
  const entries = queuedRealtimeLogs;
  const repeatEntries = Array.from(queuedRealtimeLogRepeats.values());
  queuedRealtimeLogs = [];
  queuedRealtimeLogRepeats.clear();
  realtimeLogFlushHandle = null;
  realtimeLogFlushMode = '';
  appendLogsBatch(entries, { scrollToBottom: true });
  if (repeatEntries.length > 0) {
    const missingEntries = [];
    repeatEntries.forEach((entry) => {
      if (!updateLogLine(entry)) {
        missingEntries.push(entry);
      }
    });
    if (missingEntries.length > 0) {
      appendLogsBatch(missingEntries, { scrollToBottom: true });
    }
  }
}

function queueRealtimeLogEntry(entry) {
  queuedRealtimeLogs.push(entry);
  scheduleRealtimeLogFlush();
}

function queueRealtimeLogRepeat(entry) {
  const logId = String(entry?.id || '').trim();
  if (!logId) {
    queueRealtimeLogEntry(entry);
    return;
  }
  queuedRealtimeLogRepeats.set(logId, entry);
  scheduleRealtimeLogFlush();
}

function clearLogRealtimeQueue() {
  if (realtimeLogFlushHandle != null) {
    if (realtimeLogFlushMode === 'raf' && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(realtimeLogFlushHandle);
    } else {
      clearTimeout(realtimeLogFlushHandle);
    }
  }
  realtimeLogFlushHandle = null;
  realtimeLogFlushMode = '';
  queuedRealtimeLogs = [];
  queuedRealtimeLogRepeats.clear();
}

function resetLogView() {
  clearLogRealtimeQueue();
  logLineById.clear();
  logAreaPinnedToBottom = true;
  if (logArea) {
    ensureRealtimeLogMode();
    logArea.innerHTML = '';
  }
}

function updateLogLine(entry = {}) {
  const logId = String(entry?.id || '').trim();
  if (!logId) return false;
  const line = logLineById.get(logId);
  if (!line) return false;

  const timeEl = line.querySelector('.log-time');
  if (timeEl) {
    timeEl.textContent = new Date(entry.timestamp).toLocaleTimeString('zh-CN', {
      hour12: false,
      timeZone: DISPLAY_TIMEZONE,
    });
  }
  const msgEl = line.querySelector('.log-msg');
  if (msgEl) {
    msgEl.textContent = getLogMessageDisplayText(entry);
  }
  const keywordClass = resolveLogKeywordClass(entry.message);
  line.classList.remove('log-keyword-start', 'log-keyword-done');
  if (keywordClass) {
    line.classList.add(keywordClass);
  }
  return true;
}

function appendLog(entry) {
  appendLogsBatch([entry], { scrollToBottom: true });
}

if (logArea) {
  logArea.addEventListener('scroll', () => {
    updateLogAreaPinnedState();
  }, { passive: true });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function fetchGeneratedEmail(options = {}) {
  const { showFailureToast = true } = options;
  const uiCopy = getCurrentRegistrationEmailUiCopy();
  if (isCustomMailProvider()) {
    throw new Error('当前邮箱服务为自定义邮箱，请直接填写注册邮箱。');
  }
  const defaultLabel = uiCopy.buttonLabel;
  btnFetchEmail.disabled = true;
  btnFetchEmail.textContent = '...';

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'FETCH_GENERATED_EMAIL',
      source: 'sidepanel',
      payload: {
        generateNew: true,
        currentEmail: inputEmail.value.trim(),
        generator: selectEmailGenerator.value,
        mailProvider: selectMailProvider.value,
        mail2925Mode: getSelectedMail2925Mode(),
        ...(getSelectedEmailGenerator() === CUSTOM_EMAIL_POOL_GENERATOR
          ? {
              customEmailPool: getActiveCustomEmailPoolEmails(),
            }
          : {}),
        ...buildManagedAliasBaseEmailPayload(),
      },
    });

    if (response?.error) {
      throw new Error(response.error);
    }
    if (!response?.email) {
      throw new Error('未返回可用邮箱。');
    }

    inputEmail.value = response.email;
    renderCurrentRegistrationEmail({
      ...(latestState || {}),
      email: response.email,
      registrationEmailState: {
        ...(latestState?.registrationEmailState || {}),
        current: response.email,
      },
    });
    if (getSelectedEmailGenerator() === 'icloud') {
      queueIcloudAliasRefresh();
    }
    showToast(`已${uiCopy.successVerb} ${uiCopy.label}：${response.email}`, 'success', 2500);
    return response.email;
  } catch (err) {
    if (showFailureToast) {
      showToast(`${uiCopy.label}${uiCopy.successVerb}失败：${err.message}`, 'error');
    }
    throw err;
  } finally {
    btnFetchEmail.disabled = false;
    btnFetchEmail.textContent = defaultLabel;
  }
}

function syncToggleButtonLabel(button, input, labels) {
  if (!button || !input) return;

  const isHidden = input.type === 'password';
  button.innerHTML = isHidden ? EYE_OPEN_ICON : EYE_CLOSED_ICON;
  button.setAttribute('aria-label', isHidden ? labels.show : labels.hide);
  button.title = isHidden ? labels.show : labels.hide;
}

function getPasswordToggleLabels(button) {
  if (!button) {
    return {
      show: '\u663e\u793a\u5185\u5bb9',
      hide: '\u9690\u85cf\u5185\u5bb9',
    };
  }
  const show = button.dataset?.showLabel
    || button.getAttribute('aria-label')
    || button.title
    || '\u663e\u793a\u5185\u5bb9';
  const hide = button.dataset?.hideLabel
    || String(show).replace(/^\u663e\u793a/, '\u9690\u85cf')
    || '\u9690\u85cf\u5185\u5bb9';
  return { show, hide };
}

function syncPasswordVisibilityToggle(button) {
  const targetId = String(button?.dataset?.passwordToggle || '').trim();
  const input = targetId ? document.getElementById(targetId) : null;
  if (!button || !input) return;
  syncToggleButtonLabel(button, input, getPasswordToggleLabels(button));
}

function syncPasswordVisibilityToggles(root = document) {
  root.querySelectorAll?.('[data-password-toggle]').forEach(syncPasswordVisibilityToggle);
}

function bindPasswordVisibilityToggles(root = document) {
  root.querySelectorAll?.('[data-password-toggle]').forEach((button) => {
    if (button.dataset?.passwordToggleBound === 'true') {
      syncPasswordVisibilityToggle(button);
      return;
    }
    if (button.dataset) {
      button.dataset.passwordToggleBound = 'true';
    }
    syncPasswordVisibilityToggle(button);
    button.addEventListener('click', () => {
      const targetId = String(button.dataset?.passwordToggle || '').trim();
      const input = targetId ? document.getElementById(targetId) : null;
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      syncPasswordVisibilityToggle(button);
    });
  });
}

async function copyTextToClipboard(text) {
  const value = String(text || '').trim();
  if (!value) {
    throw new Error('没有可复制的内容。');
  }
  if (!navigator.clipboard?.writeText) {
    throw new Error('当前环境不支持剪贴板复制。');
  }
  await navigator.clipboard.writeText(value);
}

const hotmailManager = window.SidepanelHotmailManager?.createHotmailManager({
  state: {
    getLatestState: () => latestState,
    syncLatestState,
  },
  dom: {
    btnAddHotmailAccount,
    btnClearUsedHotmailAccounts,
    btnDeleteAllHotmailAccounts,
    btnHotmailUsageGuide,
    btnImportHotmailAccounts,
    btnToggleHotmailForm,
    btnToggleHotmailList,
    hotmailFormShell,
    hotmailAccountsList,
    hotmailListShell,
    inputEmail,
    inputHotmailClientId,
    inputHotmailEmail,
    inputHotmailImport,
    inputHotmailPassword,
    inputHotmailRefreshToken,
    inputHotmailSearch,
    selectHotmailFilter,
    selectMailProvider,
  },
  helpers: {
    copyTextToClipboard,
    escapeHtml,
    getCurrentHotmailEmail,
    getHotmailAccounts,
    openConfirmModal,
    showToast,
  },
  runtime: {
    sendMessage: (message) => chrome.runtime.sendMessage(message),
  },
  constants: {
    copyIcon: COPY_ICON,
    displayTimeZone: DISPLAY_TIMEZONE,
    expandedStorageKey: 'multipage-hotmail-list-expanded',
  },
  hotmailUtils: {
    filterHotmailAccountsByUsage,
    getHotmailBulkActionLabel,
    getHotmailListToggleLabel,
    parseHotmailImportText,
    shouldClearHotmailCurrentSelection,
    upsertHotmailAccountInList,
  },
});
const initHotmailListExpandedState = hotmailManager?.initHotmailListExpandedState
  || (() => { });
const renderHotmailAccounts = hotmailManager?.renderHotmailAccounts
  || (() => { });
const bindHotmailEvents = hotmailManager?.bindHotmailEvents
  || (() => { });
bindHotmailEvents();

const mail2925Manager = window.SidepanelMail2925Manager?.createMail2925Manager({
  state: {
    getLatestState: () => latestState,
    syncLatestState,
  },
  dom: {
    btnAddMail2925Account,
    btnDeleteAllMail2925Accounts,
    btnImportMail2925Accounts,
    btnToggleMail2925Form,
    btnToggleMail2925List,
    inputMail2925Email,
    inputMail2925Import,
    inputMail2925Password,
    inputMail2925Search,
    selectMail2925Filter,
    mail2925AccountsList,
    mail2925FormShell,
    mail2925ListShell,
  },
  helpers: {
    copyTextToClipboard,
    escapeHtml,
    getMail2925Accounts,
    openConfirmModal,
    refreshManagedAliasBaseEmail: () => {
      syncMail2925BaseEmailFromCurrentAccount(latestState, { persist: true });
      setManagedAliasBaseEmailInputForProvider('2925', latestState);
    },
    showToast,
  },
  runtime: {
    sendMessage: (message) => chrome.runtime.sendMessage(message),
  },
  constants: {
    copyIcon: COPY_ICON,
    displayTimeZone: DISPLAY_TIMEZONE,
    expandedStorageKey: 'multipage-mail2925-list-expanded',
  },
  mail2925Utils: window.Mail2925Utils || {},
});
const initMail2925ListExpandedState = mail2925Manager?.initMail2925ListExpandedState
  || (() => { });
const renderMail2925Accounts = mail2925Manager?.renderMail2925Accounts
  || (() => { });
const bindMail2925Events = mail2925Manager?.bindMail2925Events
  || (() => { });
bindMail2925Events();

const icloudManager = window.SidepanelIcloudManager?.createIcloudManager({
  dom: {
    btnIcloudBulkDelete,
    btnIcloudBulkPreserve,
    btnIcloudBulkUnpreserve,
    btnIcloudBulkUnused,
    btnIcloudBulkUsed,
    btnIcloudDeleteUsed,
    btnIcloudLoginDone,
    btnIcloudRefresh,
    checkboxIcloudSelectAll,
    icloudList,
    icloudLoginHelp,
    icloudLoginHelpText,
    icloudLoginHelpTitle,
    icloudSection,
    icloudSelectionSummary,
    icloudSummary,
    inputIcloudSearch,
    selectIcloudFilter,
  },
  helpers: {
    copyTextToClipboard,
    escapeHtml,
    openConfirmModal,
    showToast,
  },
  runtime: {
    sendMessage: (message) => chrome.runtime.sendMessage(message),
  },
});
const hideIcloudLoginHelp = icloudManager?.hideIcloudLoginHelp
  || (() => { });
const hasDeletableUsedIcloudAliases = icloudManager?.hasDeletableUsedAliases
  || (() => false);
const queueIcloudAliasRefresh = icloudManager?.queueIcloudAliasRefresh
  || (() => { });
const refreshIcloudAliases = icloudManager?.refreshIcloudAliases
  || (async () => { });
const renderIcloudAliases = icloudManager?.renderIcloudAliases
  || (() => { });
const resetIcloudManager = icloudManager?.reset
  || (() => { });
const showIcloudLoginHelp = icloudManager?.showIcloudLoginHelp
  || (() => { });
const updateIcloudBulkUI = icloudManager?.updateIcloudBulkUI
  || (() => { });
const bindIcloudEvents = icloudManager?.bindIcloudEvents
  || (() => { });
bindIcloudEvents();

const luckmailManager = window.SidepanelLuckmailManager?.createLuckmailManager({
  dom: {
    btnLuckmailBulkDisable,
    btnLuckmailBulkEnable,
    btnLuckmailBulkPreserve,
    btnLuckmailBulkUnpreserve,
    btnLuckmailBulkUnused,
    btnLuckmailBulkUsed,
    btnLuckmailDisableUsed,
    btnLuckmailRefresh,
    checkboxLuckmailSelectAll,
    inputEmail,
    inputLuckmailSearch,
    luckmailList,
    luckmailSection,
    luckmailSelectionSummary,
    luckmailSummary,
    selectLuckmailFilter,
  },
  helpers: {
    copyTextToClipboard,
    escapeHtml,
    formatLuckmailDateTime,
    getLuckmailPreserveTagName,
    normalizeLuckmailProjectName,
    openConfirmModal,
    showToast,
  },
  runtime: {
    sendMessage: (message) => chrome.runtime.sendMessage(message),
  },
  constants: {
    copyIcon: COPY_ICON,
  },
});
const queueLuckmailPurchaseRefresh = luckmailManager?.queueLuckmailPurchaseRefresh
  || (() => { });
const refreshLuckmailPurchases = luckmailManager?.refreshLuckmailPurchases
  || (async () => { });
const renderLuckmailPurchases = luckmailManager?.renderLuckmailPurchases
  || (() => { });
const resetLuckmailManager = luckmailManager?.reset
  || (() => { });
const bindLuckmailEvents = luckmailManager?.bindLuckmailEvents
  || (() => { });
bindLuckmailEvents();

const customEmailPoolManager = window.SidepanelCustomEmailPoolManager?.createCustomEmailPoolManager({
  dom: {
    btnCustomEmailPoolRefresh,
    btnCustomEmailPoolClearUsed,
    btnCustomEmailPoolDeleteAll,
    inputCustomEmailPoolImport,
    btnCustomEmailPoolImport,
    customEmailPoolSummary,
    inputCustomEmailPoolSearch,
    selectCustomEmailPoolFilter,
    checkboxCustomEmailPoolSelectAll,
    customEmailPoolSelectionSummary,
    btnCustomEmailPoolBulkUsed,
    btnCustomEmailPoolBulkUnused,
    btnCustomEmailPoolBulkEnable,
    btnCustomEmailPoolBulkDisable,
    btnCustomEmailPoolBulkDelete,
    customEmailPoolList,
  },
  helpers: {
    copyTextToClipboard,
    escapeHtml,
    openConfirmModal,
    showToast,
  },
  state: {
    getEntries: () => getNormalizedCustomEmailPoolEntriesState(),
    setEntries: (entries) => {
      setCustomEmailPoolEntriesState(entries);
    },
    getCurrentEmail: () => String(inputEmail?.value || latestState?.email || '').trim().toLowerCase(),
    isVisible: () => Boolean(rowCustomEmailPool) && rowCustomEmailPool.style.display !== 'none',
  },
  actions: {
    persistEntries: async () => {
      syncRunCountFromConfiguredEmailPool();
      updateMailProviderUI();
      markSettingsDirty(true);
      await saveSettings({ silent: true });
    },
    setRuntimeEmail: async (email) => {
      await setRuntimeEmailState(email);
      syncLatestState({ email });
      if (inputEmail) {
        inputEmail.value = email || '';
      }
    },
  },
  constants: {
    copyIcon: COPY_ICON,
  },
});
const queueCustomEmailPoolRefresh = customEmailPoolManager?.queueCustomEmailPoolRefresh
  || (() => { });
const refreshCustomEmailPoolEntries = customEmailPoolManager?.refreshCustomEmailPoolEntries
  || (async () => { });
const renderCustomEmailPoolEntries = customEmailPoolManager?.renderCustomEmailPoolEntries
  || (() => { });
const resetCustomEmailPoolManager = customEmailPoolManager?.reset
  || (() => { });
const bindCustomEmailPoolEvents = customEmailPoolManager?.bindEvents
  || (() => { });
bindCustomEmailPoolEvents();

const accountRecordsManager = window.SidepanelAccountRecordsManager?.createAccountRecordsManager({
  state: {
    getLatestState: () => latestState,
    syncLatestState,
  },
  dom: {
    accountRecordsList,
    accountRecordsMeta,
    accountRecordsOverlay,
    accountRecordsPageLabel,
    accountRecordsStats,
    btnAccountRecordsNext,
    btnAccountRecordsPrev,
    btnClearAccountRecords,
    btnDeleteSelectedAccountRecords,
    btnCloseAccountRecords,
    btnOpenAccountRecords,
    btnToggleAccountRecordsSelection,
  },
  helpers: {
    escapeHtml,
    openConfirmModal,
    showToast,
  },
  runtime: {
    sendMessage: (message) => chrome.runtime.sendMessage(message),
  },
  constants: {
    displayTimeZone: DISPLAY_TIMEZONE,
    pageSize: 10,
  },
});
const renderAccountRecords = accountRecordsManager?.render
  || (() => { });
const bindAccountRecordEvents = accountRecordsManager?.bindEvents
  || (() => { });
const closeAccountRecordsPanel = accountRecordsManager?.closePanel
  || (() => { });
bindAccountRecordEvents();
renderStepsList();

async function exportSettingsFile() {
  closeConfigMenu();
  configActionInFlight = true;
  updateConfigMenuControls();

  try {
    await flushPendingSettingsBeforeExport();
    const response = await chrome.runtime.sendMessage({
      type: 'EXPORT_SETTINGS',
      source: 'sidepanel',
      payload: {},
    });

    if (response?.error) {
      throw new Error(response.error);
    }
    if (!response?.fileContent || !response?.fileName) {
      throw new Error('\u672a\u751f\u6210\u53ef\u4e0b\u8f7d\u7684\u914d\u7f6e\u6587\u4ef6\u3002');
    }

    downloadTextFile(response.fileContent, response.fileName);
    showToast('\u914d\u7f6e\u5df2\u5bfc\u51fa\uff1a' + response.fileName, 'success', 2200);
  } catch (err) {
    showToast('\u5bfc\u51fa\u914d\u7f6e\u5931\u8d25\uff1a' + err.message, 'error');
  } finally {
    configActionInFlight = false;
    updateConfigMenuControls();
  }
}

async function importSettingsFromFile(file) {
  if (!file) return;

  configActionInFlight = true;
  closeConfigMenu();
  updateConfigMenuControls();

  try {
    await settlePendingSettingsBeforeImport();
    const rawText = await file.text();

    let parsedConfig = null;
    try {
      parsedConfig = JSON.parse(rawText);
    } catch {
      throw new Error('\u914d\u7f6e\u6587\u4ef6\u4e0d\u662f\u6709\u6548\u7684 JSON\u3002');
    }

    const confirmed = await openConfirmModal({
      title: '\u5bfc\u5165\u914d\u7f6e',
      message: '\u786e\u8ba4\u5bfc\u5165\u914d\u7f6e\u6587\u4ef6 "' + file.name + '" \u5417\uff1f\u5bfc\u5165\u540e\u4f1a\u8986\u76d6\u5f53\u524d\u914d\u7f6e\u3002',
      confirmLabel: '\u786e\u8ba4\u8986\u76d6\u5bfc\u5165',
      confirmVariant: 'btn-danger',
    });
    if (!confirmed) {
      return;
    }

    const response = await chrome.runtime.sendMessage({
      type: 'IMPORT_SETTINGS',
      source: 'sidepanel',
      payload: {
        config: parsedConfig,
      },
    });

    if (response?.error) {
      throw new Error(response.error);
    }
    if (!response?.state) {
      throw new Error('\u5bfc\u5165\u540e\u672a\u8fd4\u56de\u6700\u65b0\u914d\u7f6e\u72b6\u6001\u3002');
    }

    applySettingsState(response.state);
    updateStatusDisplay(latestState);
    showToast('\u914d\u7f6e\u5df2\u5bfc\u5165\uff0c\u5f53\u524d\u914d\u7f6e\u5df2\u8986\u76d6\u3002', 'success', 2200);
  } catch (err) {
    showToast('\u5bfc\u5165\u914d\u7f6e\u5931\u8d25\uff1a' + err.message, 'error');
  } finally {
    configActionInFlight = false;
    updateConfigMenuControls();
    if (inputImportSettingsFile) {
      inputImportSettingsFile.value = '';
    }
  }
}

function syncPasswordToggleLabel() {
  syncToggleButtonLabel(btnTogglePassword, inputPassword, {
    show: '显示密码',
    hide: '隐藏密码',
  });
}

function syncVpsUrlToggleLabel() {
  syncToggleButtonLabel(btnToggleVpsUrl, inputVpsUrl, {
    show: '显示 CPA 地址',
    hide: '隐藏 CPA 地址',
  });
}

function syncVpsPasswordToggleLabel() {
  syncToggleButtonLabel(btnToggleVpsPassword, inputVpsPassword, {
    show: '显示管理密钥',
    hide: '隐藏管理密钥',
  });
}




async function maybeTakeoverAutoRun(actionLabel) {
  if (!isAutoRunPausedPhase()) {
    return true;
  }

  const confirmed = await openConfirmModal({
    title: '接管自动',
    message: `当前自动流程已暂停。若继续${actionLabel}，将停止自动流程并切换为手动控制。是否继续？`,
    confirmLabel: '确认接管',
    confirmVariant: 'btn-primary',
  });
  if (!confirmed) {
    return false;
  }

  await chrome.runtime.sendMessage({ type: 'TAKEOVER_AUTO_RUN', source: 'sidepanel', payload: {} });
  return true;
}

async function handleSkipNode(nodeId) {
  const normalizedNodeId = String(nodeId || '').trim();
  if (!normalizedNodeId) {
    throw new Error('缺少要跳过的节点。');
  }
  if (isAutoRunPausedPhase()) {
    const takeoverResponse = await chrome.runtime.sendMessage({
      type: 'TAKEOVER_AUTO_RUN',
      source: 'sidepanel',
      payload: {},
    });
    if (takeoverResponse?.error) {
      throw new Error(takeoverResponse.error);
    }
  }

  await persistCurrentSettingsForAction();

  const response = await chrome.runtime.sendMessage({
    type: 'SKIP_NODE',
    source: 'sidepanel',
    payload: {
      nodeId: normalizedNodeId,
      step: getStepIdByNodeIdForCurrentMode(normalizedNodeId),
    },
  });

  if (response?.error) {
    throw new Error(response.error);
  }

  showToast(`节点 ${normalizedNodeId} 已跳过`, 'success', 2200);
}

async function handleSkipStep(step) {
  const nodeId = getNodeIdByStepForCurrentMode(step);
  if (!nodeId) {
    throw new Error(`无效步骤：${step}`);
  }
  return handleSkipNode(nodeId);
}

// ============================================================
// Button Handlers
// ============================================================

stepsList?.addEventListener('click', async (event) => {
  const btn = event.target.closest('.step-btn');
  if (!btn) {
    return;
  }
  try {
    const step = Number(btn.dataset.step);
    const nodeId = String(btn.dataset.nodeId || getNodeIdByStepForCurrentMode(step) || '').trim();
    if (!(await maybeTakeoverAutoRun(`执行节点 ${nodeId || step}`))) {
      return;
    }
    await persistCurrentSettingsForAction();
    if (step === 3) {
      if (inputPassword.value !== (latestState?.customPassword || '')) {
        await chrome.runtime.sendMessage({
          type: 'SAVE_SETTING',
          source: 'sidepanel',
          payload: { customPassword: inputPassword.value },
        });
        syncLatestState({ customPassword: inputPassword.value });
      }
      if (shouldExecuteStep3WithSignupPhoneIdentity(latestState)) {
        const response = await sendSidepanelMessage({ type: 'EXECUTE_NODE', source: 'sidepanel', payload: { nodeId } });
        if (response?.error) {
          throw new Error(response.error);
        }
      } else if (selectMailProvider.value === 'hotmail-api' || isLuckmailProvider() || isGptmailProvider()) {
        const response = await sendSidepanelMessage({ type: 'EXECUTE_NODE', source: 'sidepanel', payload: { nodeId } });
        if (response?.error) {
          throw new Error(response.error);
        }
      } else if (false && usesGeneratedAliasMailProvider(selectMailProvider.value)) {
        const emailPrefix = inputEmailPrefix.value.trim();
        if (!emailPrefix) {
          showToast(selectMailProvider.value === GMAIL_PROVIDER ? '请先填写 Gmail 原邮箱。' : '请先填写 2925 邮箱前缀。', 'warn');
          return;
        }
        const response = await sendSidepanelMessage({ type: 'EXECUTE_NODE', source: 'sidepanel', payload: { nodeId, emailPrefix } });
        if (response?.error) {
          throw new Error(response.error);
        }
      } else {
        let email = inputEmail.value.trim();
        if (!email) {
          if (isCustomMailProvider()) {
            showToast('当前邮箱服务为自定义邮箱，请先填写注册邮箱后再执行第 3 步。', 'warn');
            return;
          }
          try {
            email = await fetchGeneratedEmail({ showFailureToast: false });
          } catch (err) {
            showToast(`自动获取失败：${err.message}，请手动粘贴邮箱后重试。`, 'warn');
            return;
          }
        }
        if (!validateCurrentRegistrationEmail(email, { showToastOnFailure: true })) {
          return;
        }
        const response = await sendSidepanelMessage({ type: 'EXECUTE_NODE', source: 'sidepanel', payload: { nodeId, email } });
        if (response?.error) {
          throw new Error(response.error);
        }
      }
    } else {
      const response = await sendSidepanelMessage({ type: 'EXECUTE_NODE', source: 'sidepanel', payload: { nodeId } });
      if (response?.error) {
        throw new Error(response.error);
      }
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
});

btnFetchEmail.addEventListener('click', async () => {
  if (selectMailProvider.value === 'hotmail-api' || isLuckmailProvider() || isGptmailProvider() || isCustomMailProvider()) {
    return;
  }
  try {
    await persistCurrentSettingsForAction();
    await fetchGeneratedEmail();
  } catch {
    // fetchGeneratedEmail / saveSettings already surface the failure to the user.
  }
});

btnTogglePassword.addEventListener('click', () => {
  inputPassword.type = inputPassword.type === 'password' ? 'text' : 'password';
  syncPasswordToggleLabel();
});

btnToggleVpsUrl.addEventListener('click', () => {
  inputVpsUrl.type = inputVpsUrl.type === 'password' ? 'text' : 'password';
  syncVpsUrlToggleLabel();
});

btnToggleVpsPassword.addEventListener('click', () => {
  inputVpsPassword.type = inputVpsPassword.type === 'password' ? 'text' : 'password';
  syncVpsPasswordToggleLabel();
});

btnMailLogin?.addEventListener('click', async () => {
  const config = getMailProviderLoginConfig();
  const loginUrl = getMailProviderLoginUrl();
  if (!config || !loginUrl) {
    return;
  }

  try {
    await chrome.tabs.create({ url: loginUrl, active: true });
  } catch (err) {
    showToast(`打开${config.label}失败：${err.message}`, 'error');
  }
});


localCpaStep9ModeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const nextMode = button.dataset.localCpaStep9Mode;
    if (getSelectedLocalCpaStep9Mode() === normalizeLocalCpaStep9Mode(nextMode)) {
      return;
    }
    setLocalCpaStep9Mode(nextMode);
    markSettingsDirty(true);
    saveSettings({ silent: true }).catch(() => { });
  });
});

hotmailServiceModeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (button.disabled) {
      return;
    }
    const nextMode = button.dataset.hotmailServiceMode;
    if (getSelectedHotmailServiceMode() === normalizeHotmailServiceMode(nextMode)) {
      return;
    }
    setHotmailServiceMode(nextMode);
    updateMailProviderUI();
    markSettingsDirty(true);
    saveSettings({ silent: true }).catch(() => { });
  });
});

btnSaveSettings.addEventListener('click', async () => {
  if (!settingsDirty) {
    showToast('配置已是最新', 'info', 1400);
    return;
  }
  await saveSettings({ silent: false }).catch(() => { });
});

btnStop.addEventListener('click', async () => {
  btnStop.disabled = true;
  await chrome.runtime.sendMessage({ type: 'STOP_FLOW', source: 'sidepanel', payload: {} });
  showToast(isAutoRunScheduledPhase() ? '正在取消倒计时计划...' : '正在停止当前流程...', 'warn', 2000);
});

btnConfigMenu?.addEventListener('click', (event) => {
  event.stopPropagation();
  toggleConfigMenu();
});

btnCloudflareTempEmailGithub?.addEventListener('click', () => {
  openCloudflareTempEmailRepositoryPage();
});

configMenu?.addEventListener('click', (event) => {
  event.stopPropagation();
});

btnExportSettings?.addEventListener('click', async () => {
  if (configActionInFlight || settingsSaveInFlight) {
    return;
  }
  await exportSettingsFile();
});

btnImportSettings?.addEventListener('click', async () => {
  if (configActionInFlight || settingsSaveInFlight) {
    return;
  }
  closeConfigMenu();
  if (inputImportSettingsFile) {
    inputImportSettingsFile.value = '';
    inputImportSettingsFile.click();
  }
});

inputImportSettingsFile?.addEventListener('change', async () => {
  const file = inputImportSettingsFile.files?.[0] || null;
  await importSettingsFromFile(file);
});

autoStartModal?.addEventListener('click', (event) => {
  if (event.target === autoStartModal) {
    resolveModalChoice(null);
  }
});
autoStartMessage?.addEventListener('click', (event) => {
  const link = event.target?.closest?.('a[data-external-url]');
  if (!link) return;
  event.preventDefault();
  openExternalUrl(link.dataset.externalUrl || link.href);
});
btnAutoStartClose?.addEventListener('click', () => resolveModalChoice(null));

async function startAutoRunFromCurrentSettings() {
  const executionMode = resolveExecutionModeFromSelectFlow(selectFlow?.value);
  const executionRange = resolveExecutionStepRange(executionMode);
  const importedAccounts = getImportedAccountsFromState(latestState);
  const isAuthorizeCodexMode = executionMode === EXECUTION_MODE_AUTHORIZE_CODEX;
  const initialLockedRunCount = typeof getLockedRunCountFromEmailPool === 'function'
    ? (isAuthorizeCodexMode ? 0 : getLockedRunCountFromEmailPool())
    : 0;
  const requestedTotalRuns = initialLockedRunCount > 0
    ? initialLockedRunCount
    : getRunCountValue();
  registerPendingAutoRunStartRunCount(requestedTotalRuns);

  if (typeof persistCurrentSettingsForAction === 'function') {
    await persistCurrentSettingsForAction();
  }
  const autoRunStartValidation = (() => {
    const rootScope = typeof window !== 'undefined' ? window : globalThis;
    const registry = rootScope.MultiPageFlowCapabilities?.createFlowCapabilityRegistry?.({
      defaultFlowId: typeof DEFAULT_ACTIVE_FLOW_ID === 'string' ? DEFAULT_ACTIVE_FLOW_ID : 'openai',
    }) || null;
    if (!registry?.validateAutoRunStart) {
      return { ok: true, errors: [] };
    }
    const validationState = {
      ...(latestState || {}),
      panelMode: typeof getSelectedPanelMode === 'function' ? getSelectedPanelMode() : latestState?.panelMode,
      signupMethod: typeof getSelectedSignupMethod === 'function' ? getSelectedSignupMethod() : latestState?.signupMethod,
    };
    return registry.validateAutoRunStart({
      activeFlowId: validationState.activeFlowId,
      panelMode: validationState.panelMode,
      signupMethod: validationState.signupMethod,
      state: validationState,
    });
  })();
  if (autoRunStartValidation?.ok === false) {
    clearPendingAutoRunStartRunCount();
    throw new Error(autoRunStartValidation.errors?.[0]?.message || '当前设置不支持启动自动流程。');
  }

  const customEmailPoolEnabled = typeof usesCustomEmailPoolGenerator === 'function'
    && !isAuthorizeCodexMode
    && usesCustomEmailPoolGenerator();
  const lockedRunCount = typeof getLockedRunCountFromEmailPool === 'function'
    ? (isAuthorizeCodexMode ? 0 : getLockedRunCountFromEmailPool())
    : 0;
  if (customEmailPoolEnabled && lockedRunCount <= 0) {
    throw new Error('请先在邮箱池里至少填写 1 个邮箱。');
  }
  const totalRuns = lockedRunCount > 0 ? lockedRunCount : requestedTotalRuns;
  if (isAuthorizeCodexMode) {
    if (!importedAccounts.length) {
      throw new Error('“授权Codex”流程需要先点击“2.导入账号”并导入邮箱 JSON。');
    }
    const invalidAccount = importedAccounts.find((email) => !isBasicEmailFormat(email));
    if (invalidAccount) {
      throw new Error(`导入账号存在非法邮箱：${invalidAccount}`);
    }
    if (totalRuns > importedAccounts.length) {
      throw new Error(`运行次数（${totalRuns}）不能超过导入账号数量（${importedAccounts.length}）。`);
    }
  }
  registerPendingAutoRunStartRunCount(totalRuns);
  if (lockedRunCount > 0) {
    inputRunCount.value = String(lockedRunCount);
  }
  let mode = 'restart';
  const autoRunSkipFailures = inputAutoSkipFailures.checked;
  const fallbackThreadIntervalMinutes = normalizeAutoRunThreadIntervalMinutes(
    inputAutoSkipFailuresThreadIntervalMinutes.value
  );
  inputAutoSkipFailuresThreadIntervalMinutes.value = String(fallbackThreadIntervalMinutes);

  if (shouldOfferAutoModeChoice()) {
    const startStep = getFirstUnfinishedStep();
    const runningStep = getRunningSteps()[0] ?? null;
    const choice = await openAutoStartChoiceDialog(startStep, { runningStep });
    if (!choice) {
      clearPendingAutoRunStartRunCount();
      return false;
    }
    mode = choice;
  }

  if (shouldWarnAutoRunFallbackRisk(totalRuns, autoRunSkipFailures)
    && !isAutoRunFallbackRiskPromptDismissed()) {
    const result = await openAutoRunFallbackRiskConfirmModal(totalRuns);
    if (!result.confirmed) {
      clearPendingAutoRunStartRunCount();
      return false;
    }
    if (result.dismissPrompt) {
      setAutoRunFallbackRiskPromptDismissed(true);
    }
  }

  btnAutoRun.disabled = true;
  inputRunCount.disabled = true;
  const delayMinutes = normalizeAutoDelayMinutes(inputAutoDelayMinutes.value);
  // 延迟分钟数 > 0 时走计划启动，否则立即开始自动运行。
  const delayEnabled = delayMinutes > 0;
  inputAutoDelayMinutes.value = String(delayMinutes);
  btnAutoRun.innerHTML = delayEnabled
    ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> 计划中...'
    : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> 运行中...';
  const response = await sendSidepanelMessage({
    type: delayEnabled ? 'SCHEDULE_AUTO_RUN' : 'AUTO_RUN',
    source: 'sidepanel',
    payload: {
      totalRuns,
      delayMinutes,
      autoRunSkipFailures,
      mode,
      // 执行流程模式：full / register_gpt / authorize_codex。
      executionMode,
      // 自动运行的起始步骤编号。
      startStep: executionRange.startStep,
      // 自动运行的结束步骤编号。
      endStep: executionRange.endStep,
      // 从“2.导入账号”读取的账号邮箱数组。
      importedAccounts,
    },
  });
  if (response?.error) {
    clearPendingAutoRunStartRunCount();
    throw new Error(response.error);
  }
  return true;
}

// Auto Run
btnAutoRun.addEventListener('click', async () => {
  try {
    await startAutoRunFromCurrentSettings();
  } catch (err) {
    clearPendingAutoRunStartRunCount();
    setDefaultAutoRunButton();
    inputRunCount.disabled = shouldLockRunCountToEmailPool();
    showToast(err.message, 'error');
  }
});

btnAutoContinue.addEventListener('click', async () => {
  const email = inputEmail.value.trim();
  if (!email) {
    showToast(
      isCustomMailProvider() ? '请先填写自定义注册邮箱。' : '请先获取或粘贴邮箱。',
      'warn'
    );
    return;
  }
  autoContinueBar.style.display = 'none';
  await sendSidepanelMessage({ type: 'RESUME_AUTO_RUN', source: 'sidepanel', payload: { email } });
});

btnAutoRunNow?.addEventListener('click', async () => {
  try {
    btnAutoRunNow.disabled = true;
    const waitingInterval = currentAutoRun.phase === 'waiting_interval';
    await sendSidepanelMessage({
      type: waitingInterval ? 'SKIP_AUTO_RUN_COUNTDOWN' : 'START_SCHEDULED_AUTO_RUN_NOW',
      source: 'sidepanel',
      payload: {},
    });
    if (waitingInterval) {
      showToast('已跳过当前倒计时，自动流程将立即继续。', 'info', 1800);
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btnAutoRunNow.disabled = false;
  }
});

btnAutoCancelSchedule?.addEventListener('click', async () => {
  try {
    btnAutoCancelSchedule.disabled = true;
    await chrome.runtime.sendMessage({ type: 'CANCEL_SCHEDULED_AUTO_RUN', source: 'sidepanel', payload: {} });
    showToast('已取消倒计时计划。', 'info', 1800);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btnAutoCancelSchedule.disabled = false;
  }
});

// Reset
btnReset.addEventListener('click', async () => {
  const confirmed = await openConfirmModal({
    title: '重置流程',
    message: '确认重置全部步骤和数据吗？',
    confirmLabel: '确认重置',
    confirmVariant: 'btn-danger',
  });
  if (!confirmed) {
    return;
  }

  await chrome.runtime.sendMessage({ type: 'RESET', source: 'sidepanel' });
  syncLatestState({
    nodeStatuses: NODE_DEFAULT_STATUSES,
    currentHotmailAccountId: null,
    currentLuckmailPurchase: null,
    currentLuckmailMailCursor: null,
    email: null,
    registrationEmailState: {
      current: '',
      previous: '',
      source: '',
      updatedAt: 0,
    },
    accountIdentifierType: null,
    accountIdentifier: '',
    logs: [],
    accountRunHistory: [],
  });
  syncAutoRunState({
    autoRunning: false,
    autoRunPhase: 'idle',
    autoRunCurrentRun: 0,
    autoRunTotalRuns: 1,
    autoRunAttemptRun: 0,
    scheduledAutoRunAt: null,
    autoRunCountdownAt: null,
    autoRunCountdownTitle: '',
    autoRunCountdownNote: '',
  });
  displayOauthUrl.textContent = '等待中...';
  displayOauthUrl.classList.remove('has-value');
  displayLocalhostUrl.textContent = '等待中...';
  displayLocalhostUrl.classList.remove('has-value');
  inputEmail.value = '';
  displayStatus.textContent = '就绪';
  statusBar.className = 'status-bar';
  logArea.innerHTML = '';
  resetLogView();
  resetIcloudManager();
  document.querySelectorAll('.step-row').forEach(row => row.className = 'step-row');
  document.querySelectorAll('.step-status').forEach(el => el.textContent = '');
  setDefaultAutoRunButton();
  applyAutoRunStatus(currentAutoRun);
  markSettingsDirty(false);
  updateStopButtonState(false);
  updateButtonStates();
  updateProgressCounter();
  renderHotmailAccounts();
  resetLuckmailManager();
  if (isLuckmailProvider()) {
    queueLuckmailPurchaseRefresh();
  }
});

// Clear log
btnClearLog.addEventListener('click', () => {
  resetLogView();
});

// Save settings on change
inputEmail.addEventListener('change', async () => {
  if (selectMailProvider.value === 'hotmail-api' || isLuckmailProvider()) {
    return;
  }
  const email = inputEmail.value.trim();
  inputEmail.value = email;
  try {
    if (email) {
      if (!validateCurrentRegistrationEmail(email, { showToastOnFailure: true })) {
        return;
      }
      const response = await chrome.runtime.sendMessage({ type: 'SAVE_EMAIL', source: 'sidepanel', payload: { email } });
      if (response?.error) {
        throw new Error(response.error);
      }
      renderCurrentRegistrationEmail({
        ...(latestState || {}),
        email,
        registrationEmailState: {
          ...(latestState?.registrationEmailState || {}),
          current: email,
        },
      });
    } else {
      await setRuntimeEmailState(null);
      renderCurrentRegistrationEmail({
        ...(latestState || {}),
        email: '',
        registrationEmailState: {
          ...(latestState?.registrationEmailState || {}),
          current: '',
        },
      });
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
});
inputEmail.addEventListener('input', updateButtonStates);
inputVpsUrl.addEventListener('input', () => {
  markSettingsDirty(true);
  scheduleSettingsAutoSave();
});
inputVpsUrl.addEventListener('blur', () => {
  saveSettings({ silent: true }).catch(() => { });
});

inputVpsPassword.addEventListener('input', () => {
  markSettingsDirty(true);
  scheduleSettingsAutoSave();
});
inputVpsPassword.addEventListener('blur', () => {
  saveSettings({ silent: true }).catch(() => { });
});

inputDuckApiAuthorization?.addEventListener('input', () => {
  markSettingsDirty(true);
  scheduleSettingsAutoSave();
});
inputDuckApiAuthorization?.addEventListener('blur', () => {
  saveSettings({ silent: true }).catch(() => { });
});

[inputHotmailRemoteBaseUrl, inputHotmailLocalBaseUrl].forEach((input) => {
  input?.addEventListener('input', () => {
    markSettingsDirty(true);
    scheduleSettingsAutoSave();
  });
  input?.addEventListener('blur', () => {
    saveSettings({ silent: true }).catch(() => { });
  });
});

[inputLuckmailApiKey, inputLuckmailBaseUrl, inputLuckmailDomain].forEach((input) => {
  input?.addEventListener('input', () => {
    markSettingsDirty(true);
    scheduleSettingsAutoSave();
  });
  input?.addEventListener('blur', () => {
    saveSettings({ silent: true }).catch(() => { });
  });
});

[inputGptmailApiKey, inputGptmailBaseUrl, inputGptmailDomain].forEach((input) => {
  input?.addEventListener('input', () => {
    markSettingsDirty(true);
    if (input === inputGptmailDomain && isGptmailProvider() && latestState?.currentGptmailAddress) {
      clearRegistrationEmail({ silent: true }).catch(() => { });
    }
    scheduleSettingsAutoSave();
  });
  input?.addEventListener('blur', () => {
    saveSettings({ silent: true }).catch(() => { });
  });
});

[inputYydsMailApiKey, inputYydsMailBaseUrl].forEach((input) => {
  input?.addEventListener('input', () => {
    markSettingsDirty(true);
    scheduleSettingsAutoSave();
  });
  input?.addEventListener('blur', () => {
    saveSettings({ silent: true }).catch(() => { });
  });
});

selectLuckmailEmailType?.addEventListener('change', () => {
  markSettingsDirty(true);
  saveSettings({ silent: true }).catch(() => { });
});

inputPassword.addEventListener('input', () => {
  markSettingsDirty(true);
  updateButtonStates();
  scheduleSettingsAutoSave();
});
inputPassword.addEventListener('blur', () => {
  saveSettings({ silent: true }).catch(() => { });
});

inputOperationDelayEnabled?.addEventListener('change', () => {
  persistOperationDelayToggle().catch(() => { });
});

selectMailProvider.addEventListener('change', async () => {
  const previousProvider = latestState?.mailProvider || '';
  const previousMail2925Mode = latestState?.mail2925Mode;
  const nextProvider = selectMailProvider.value;
  syncManagedAliasBaseEmailDraftFromInput(previousProvider);
  setManagedAliasBaseEmailInputForProvider(nextProvider, latestState);
  updateMailProviderUI();
  const leavingHotmail = previousProvider === 'hotmail-api'
    && nextProvider !== 'hotmail-api'
    && isCurrentEmailManagedByHotmail();
  const leavingLuckmail = previousProvider === LUCKMAIL_PROVIDER
    && nextProvider !== LUCKMAIL_PROVIDER
    && isCurrentEmailManagedByLuckmail();
  const leavingGeneratedAlias = (
    previousProvider !== nextProvider
    || (previousProvider === '2925' && normalizeMail2925Mode(previousMail2925Mode) !== getSelectedMail2925Mode())
  ) && usesGeneratedAliasMailProvider(previousProvider, previousMail2925Mode)
    && isCurrentEmailManagedByGeneratedAlias(previousProvider, latestState, previousMail2925Mode);
  const leavingGptmail = previousProvider === GPTMAIL_PROVIDER
    && nextProvider !== GPTMAIL_PROVIDER
    && isCurrentEmailManagedByGptmail();
  if (leavingHotmail || leavingLuckmail || leavingGptmail || leavingGeneratedAlias) {
    await clearRegistrationEmail({ silent: true }).catch(() => { });
  }
  if (nextProvider === GPTMAIL_PROVIDER && latestState?.email && !latestState?.currentGptmailAddress) {
    await clearRegistrationEmail({ silent: true }).catch(() => { });
  }
  if (nextProvider === '2925' && Boolean(inputMail2925UseAccountPool?.checked)) {
    syncMail2925PoolAccountOptions(latestState);
    if (!selectMail2925PoolAccount.value && getMail2925Accounts().length > 0) {
      selectMail2925PoolAccount.value = String(getMail2925Accounts()[0]?.id || '');
    }
    await syncSelectedMail2925PoolAccount({ silent: true }).catch(() => { });
  }
  if (nextProvider === LUCKMAIL_PROVIDER) {
    queueLuckmailPurchaseRefresh();
  }
  markSettingsDirty(true);
  saveSettings({ silent: true }).catch(() => { });
});

mail2925ModeButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    const nextMode = normalizeMail2925Mode(button.dataset.mail2925Mode);
    const previousMode = normalizeMail2925Mode(latestState?.mail2925Mode);
    if (nextMode === getSelectedMail2925Mode()) {
      return;
    }

    setMail2925Mode(nextMode);
    updateMailProviderUI();

    const leavingGeneratedAlias = selectMailProvider.value === '2925'
      && previousMode === MAIL_2925_MODE_PROVIDE
      && nextMode !== MAIL_2925_MODE_PROVIDE
      && isCurrentEmailManagedByGeneratedAlias('2925', latestState, previousMode);
    if (leavingGeneratedAlias) {
      await clearRegistrationEmail({ silent: true }).catch(() => { });
    }

    markSettingsDirty(true);
    saveSettings({ silent: true }).catch(() => { });
  });
});

tempEmailLookupModeButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    const nextMode = normalizeCloudflareTempEmailLookupMode(button.dataset.tempEmailLookupMode);
    const previousMode = getSelectedCloudflareTempEmailLookupMode();
    if (nextMode === previousMode) {
      return;
    }

    if (nextMode === CLOUDFLARE_TEMP_EMAIL_LOOKUP_MODE_REGISTRATION_EMAIL) {
      const confirmed = await confirmCloudflareTempEmailRegistrationLookupIfNeeded();
      if (!confirmed) {
        setCloudflareTempEmailLookupMode(previousMode);
        updateMailProviderUI();
        return;
      }
    }

    setCloudflareTempEmailLookupMode(nextMode);
    updateMailProviderUI();
    markSettingsDirty(true);
    saveSettings({ silent: true }).catch(() => { });
  });
});

selectEmailGenerator.addEventListener('change', () => {
  updateMailProviderUI();
  clearRegistrationEmail({ silent: true }).catch(() => { });
  markSettingsDirty(true);
  saveSettings({ silent: true }).catch(() => { });
});

selectIcloudHostPreference?.addEventListener('change', () => {
  updateMailProviderUI();
  markSettingsDirty(true);
  saveSettings({ silent: true }).catch(() => { });
  if (getSelectedEmailGenerator() === 'icloud') {
    queueIcloudAliasRefresh();
  }
});

selectIcloudTargetMailboxType?.addEventListener('change', () => {
  updateMailProviderUI();
  markSettingsDirty(true);
  saveSettings({ silent: true }).catch(() => { });
});

selectIcloudForwardMailProvider?.addEventListener('change', () => {
  updateMailProviderUI();
  markSettingsDirty(true);
  saveSettings({ silent: true }).catch(() => { });
});

selectIcloudFetchMode?.addEventListener('change', () => {
  markSettingsDirty(true);
  saveSettings({ silent: true }).catch(() => { });
});

checkboxAutoDeleteIcloud?.addEventListener('change', () => {
  markSettingsDirty(true);
  saveSettings({ silent: true }).catch(() => { });
});

selectPanelMode.addEventListener('change', async () => {
  const rawNextPanelMode = normalizePanelMode(selectPanelMode.value);
  selectPanelMode.value = rawNextPanelMode;
  const nextPanelMode = getSelectedPanelMode();
  selectPanelMode.value = nextPanelMode;
  syncLatestState({ panelMode: nextPanelMode });
  updatePanelModeUI();
  markSettingsDirty(true);
  saveSettings({ silent: true }).catch(() => { });
});

selectFlow?.addEventListener('change', async () => {
  updateAccountTransferButtonsVisibility();
  syncRunCountFromImportedAccounts();
  clearPendingAutoRunStartRunCount();
  updateFallbackThreadIntervalInputState();
  markSettingsDirty(true);
  if (!latestState?.isAccountWriteEnabled || !accountWriteDirectoryHandle) {
    updateAccountWriteButtonState();
    saveSettings({ silent: true }).catch((error) => {
      console.warn('切换执行流程后保存设置失败：', error);
    });
    return;
  }

  try {
    await ensureAndPersistAccountWriteFile({
      selectFlowValue: selectFlow?.value,
      requestPermission: false,
      persistState: true,
    });
  } catch (error) {
    console.warn('切换执行流程后刷新写入账号文件失败：', error);
    showToast(`切换流程后刷新写入账号文件失败：${error?.message || error}`, 'warn', 2600);
  }
  saveSettings({ silent: true }).catch((error) => {
    console.warn('切换执行流程后保存设置失败：', error);
  });
});

inputWriteAccountsEnabled?.addEventListener('change', () => {
  handleWriteAccountsToggleChange().catch((error) => {
    showToast(`切换写入账号失败：${error?.message || error}`, 'error');
  });
});

btnExportAccounts?.addEventListener('click', () => {
  handleExportAccountsButtonClick().catch((error) => {
    showToast(`导出账号失败：${error?.message || error}`, 'error');
  });
});

btnImportAccounts?.addEventListener('click', () => {
  handleImportAccountsButtonClick().catch((error) => {
    showToast(`导入账号失败：${error?.message || error}`, 'error');
  });
});



selectCfDomain.addEventListener('change', () => {
  if (selectCfDomain.disabled) {
    return;
  }
  markSettingsDirty(true);
  saveSettings({ silent: true }).catch(() => { });
});

selectTempEmailDomain.addEventListener('change', () => {
  if (selectTempEmailDomain.disabled) {
    return;
  }
  markSettingsDirty(true);
  saveSettings({ silent: true }).catch(() => { });
});

btnCfDomainMode.addEventListener('click', async () => {
  try {
    if (!cloudflareDomainEditMode) {
      setCloudflareDomainEditMode(true, { clearInput: true });
      return;
    }

    const newDomain = normalizeCloudflareDomainValue(inputCfDomain.value);
    if (!newDomain) {
      showToast('请输入有效的 Cloudflare 域名。', 'warn');
      inputCfDomain.focus();
      return;
    }

    const { domains } = getCloudflareDomainsFromState();
    await saveCloudflareDomainSettings([...domains, newDomain], newDomain);
  } catch (err) {
    showToast(err.message, 'error');
  }
});

btnTempEmailDomainMode.addEventListener('click', async () => {
  try {
    await syncCloudflareTempEmailDomainsFromService();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

inputCfDomain.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    btnCfDomainMode.click();
  }
});

inputTempEmailDomain.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    btnTempEmailDomainMode.click();
  }
});

inputSub2ApiUrl.addEventListener('input', () => {
  markSettingsDirty(true);
  scheduleSettingsAutoSave();
});
inputSub2ApiUrl.addEventListener('blur', () => {
  saveSettings({ silent: true }).catch(() => { });
});

inputSub2ApiEmail.addEventListener('input', () => {
  markSettingsDirty(true);
  scheduleSettingsAutoSave();
});
inputSub2ApiEmail.addEventListener('blur', () => {
  saveSettings({ silent: true }).catch(() => { });
});

inputSub2ApiPassword.addEventListener('input', () => {
  markSettingsDirty(true);
  scheduleSettingsAutoSave();
});
inputSub2ApiPassword.addEventListener('blur', () => {
  saveSettings({ silent: true }).catch(() => { });
});

inputSub2ApiGroup.addEventListener('change', () => {
  syncLatestState({
    sub2apiGroupName: getSelectedSub2ApiGroupName(),
    sub2apiGroupNames: normalizeSub2ApiGroupOptions(
      getSub2ApiGroupOptionsState(latestState),
      getSelectedSub2ApiGroupName()
    ),
  });
  markSettingsDirty(true);
  saveSettings({ silent: true }).catch(() => { });
});

inputSub2ApiAccountPriority.addEventListener('input', () => {
  markSettingsDirty(true);
  scheduleSettingsAutoSave();
});
inputSub2ApiAccountPriority.addEventListener('blur', () => {
  inputSub2ApiAccountPriority.value = String(normalizeSub2ApiAccountPriorityValue(inputSub2ApiAccountPriority.value));
  saveSettings({ silent: true }).catch(() => { });
});

btnAddSub2ApiGroup?.addEventListener('click', () => {
  handleAddSub2ApiGroup().catch((error) => {
    showToast(error?.message || '添加 SUB2API 分组失败。', 'error');
  });
});

inputSub2ApiDefaultProxy.addEventListener('input', () => {
  markSettingsDirty(true);
  scheduleSettingsAutoSave();
});
inputSub2ApiDefaultProxy.addEventListener('blur', () => {
  saveSettings({ silent: true }).catch(() => { });
});

inputCodex2ApiUrl.addEventListener('input', () => {
  markSettingsDirty(true);
  scheduleSettingsAutoSave();
});
inputCodex2ApiUrl.addEventListener('blur', () => {
  saveSettings({ silent: true }).catch(() => { });
});

inputCodex2ApiAdminKey.addEventListener('input', () => {
  markSettingsDirty(true);
  scheduleSettingsAutoSave();
});
inputCodex2ApiAdminKey.addEventListener('blur', () => {
  saveSettings({ silent: true }).catch(() => { });
});


inputEmailPrefix.addEventListener('input', () => {
  maybeClearGeneratedAliasAfterEmailPrefixChange().catch(() => { });
  syncManagedAliasBaseEmailDraftFromInput();
  markSettingsDirty(true);
  scheduleSettingsAutoSave();
});
inputEmailPrefix.addEventListener('blur', () => {
  maybeClearGeneratedAliasAfterEmailPrefixChange().catch(() => { });
  syncManagedAliasBaseEmailDraftFromInput();
  saveSettings({ silent: true }).catch(() => { });
});

inputCustomEmailPool?.addEventListener('input', () => {
  syncRunCountFromConfiguredEmailPool();
  updateMailProviderUI();
  markSettingsDirty(true);
  scheduleSettingsAutoSave();
});
inputCustomEmailPool?.addEventListener('blur', () => {
  inputCustomEmailPool.value = normalizeCustomEmailPoolEntries(inputCustomEmailPool.value).join('\n');
  syncRunCountFromConfiguredEmailPool();
  updateMailProviderUI();
  saveSettings({ silent: true }).catch(() => { });
});

inputCustomMailProviderPool?.addEventListener('input', () => {
  syncRunCountFromConfiguredEmailPool();
  updateMailProviderUI();
  markSettingsDirty(true);
  scheduleSettingsAutoSave();
});
inputCustomMailProviderPool?.addEventListener('blur', () => {
  inputCustomMailProviderPool.value = normalizeCustomEmailPoolEntries(inputCustomMailProviderPool.value).join('\n');
  syncRunCountFromConfiguredEmailPool();
  updateMailProviderUI();
  saveSettings({ silent: true }).catch(() => { });
});

selectMail2925PoolAccount?.addEventListener('change', async () => {
  try {
    await syncSelectedMail2925PoolAccount();
    markSettingsDirty(true);
    saveSettings({ silent: true }).catch(() => { });
  } catch (err) {
    showToast(err.message, 'error');
  }
});

inputMail2925UseAccountPool?.addEventListener('change', async () => {
  const enabled = Boolean(inputMail2925UseAccountPool.checked);
  syncLatestState({ mail2925UseAccountPool: enabled });
  if (enabled) {
    syncMail2925PoolAccountOptions(latestState);
    if (!selectMail2925PoolAccount.value && getMail2925Accounts().length > 0) {
      selectMail2925PoolAccount.value = String(getMail2925Accounts()[0]?.id || '');
    }
    try {
      await syncSelectedMail2925PoolAccount({ silent: true });
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
  setManagedAliasBaseEmailInputForProvider('2925', latestState);
  updateMailProviderUI();
  markSettingsDirty(true);
  saveSettings({ silent: true }).catch(() => { });
});

inputInbucketMailbox.addEventListener('input', () => {
  markSettingsDirty(true);
  scheduleSettingsAutoSave();
});
inputInbucketMailbox.addEventListener('blur', () => {
  saveSettings({ silent: true }).catch(() => { });
});

inputInbucketHost.addEventListener('input', () => {
  markSettingsDirty(true);
  scheduleSettingsAutoSave();
});
inputInbucketHost.addEventListener('blur', () => {
  saveSettings({ silent: true }).catch(() => { });
});

inputRunCount.addEventListener('input', () => {
  clearPendingAutoRunStartRunCount();
  updateFallbackThreadIntervalInputState();
});
inputRunCount.addEventListener('blur', () => {
  if (shouldLockRunCountToEmailPool()) {
    syncRunCountFromConfiguredEmailPool();
    updateFallbackThreadIntervalInputState();
    return;
  }
  inputRunCount.value = String(getRunCountValue());
  updateFallbackThreadIntervalInputState();
});

inputAutoSkipFailures.addEventListener('change', async () => {
  if (inputAutoSkipFailures.checked && !isAutoSkipFailuresPromptDismissed()) {
    const result = await openAutoSkipFailuresConfirmModal();
    if (!result.confirmed) {
      inputAutoSkipFailures.checked = false;
      updateFallbackThreadIntervalInputState();
      return;
    }
    if (result.dismissPrompt) {
      setAutoSkipFailuresPromptDismissed(true);
    }
  }
  updateFallbackThreadIntervalInputState();
  markSettingsDirty(true);
  saveSettings({ silent: true }).catch(() => { });
});

inputTempEmailBaseUrl.addEventListener('input', () => {
  markSettingsDirty(true);
  scheduleSettingsAutoSave();
});
inputTempEmailBaseUrl.addEventListener('blur', () => {
  inputTempEmailBaseUrl.value = normalizeCloudflareTempEmailBaseUrlValue(inputTempEmailBaseUrl.value);
  saveSettings({ silent: true }).catch(() => { });
});

inputTempEmailAdminAuth.addEventListener('input', () => {
  markSettingsDirty(true);
  scheduleSettingsAutoSave();
});
inputTempEmailAdminAuth.addEventListener('blur', () => {
  saveSettings({ silent: true }).catch(() => { });
});

inputTempEmailCustomAuth.addEventListener('input', () => {
  markSettingsDirty(true);
  scheduleSettingsAutoSave();
});
inputTempEmailCustomAuth.addEventListener('blur', () => {
  saveSettings({ silent: true }).catch(() => { });
});

inputTempEmailReceiveMailbox.addEventListener('input', () => {
  markSettingsDirty(true);
  scheduleSettingsAutoSave();
});
inputTempEmailReceiveMailbox.addEventListener('blur', () => {
  inputTempEmailReceiveMailbox.value = normalizeCloudflareTempEmailReceiveMailboxValue(inputTempEmailReceiveMailbox.value);
  saveSettings({ silent: true }).catch(() => { });
});

inputTempEmailFixedMailbox?.addEventListener('input', () => {
  markSettingsDirty(true);
  scheduleSettingsAutoSave();
});
inputTempEmailFixedMailbox?.addEventListener('blur', () => {
  inputTempEmailFixedMailbox.value = normalizeCloudflareTempEmailFixedMailboxValue(inputTempEmailFixedMailbox.value);
  saveSettings({ silent: true }).catch(() => { });
});

inputTempEmailUseRandomSubdomain?.addEventListener('change', () => {
  updateMailProviderUI();
  clearRegistrationEmail({ silent: true }).catch(() => { });
  markSettingsDirty(true);
  saveSettings({ silent: true }).catch(() => { });
});

inputAutoSkipFailuresThreadIntervalMinutes.addEventListener('input', () => {
  markSettingsDirty(true);
  scheduleSettingsAutoSave();
});
inputAutoSkipFailuresThreadIntervalMinutes.addEventListener('blur', () => {
  inputAutoSkipFailuresThreadIntervalMinutes.value = String(
    normalizeAutoRunThreadIntervalMinutes(inputAutoSkipFailuresThreadIntervalMinutes.value)
  );
  saveSettings({ silent: true }).catch(() => { });
});

inputStep6CookieCleanupEnabled?.addEventListener('change', () => {
  markSettingsDirty(true);
  saveSettings({ silent: true }).catch(() => { });
});

inputAutoDelayMinutes.addEventListener('input', () => {
  markSettingsDirty(true);
  scheduleSettingsAutoSave();
});
inputAutoDelayMinutes.addEventListener('blur', () => {
  inputAutoDelayMinutes.value = String(normalizeAutoDelayMinutes(inputAutoDelayMinutes.value));
  saveSettings({ silent: true }).catch(() => { });
});

inputAccountRunHistoryHelperBaseUrl?.addEventListener('input', () => {
  markSettingsDirty(true);
  scheduleSettingsAutoSave();
});

inputAccountRunHistoryHelperBaseUrl?.addEventListener('blur', () => {
  inputAccountRunHistoryHelperBaseUrl.value = normalizeAccountRunHistoryHelperBaseUrlValue(inputAccountRunHistoryHelperBaseUrl.value);
  saveSettings({ silent: true }).catch(() => { });
});

function syncAutoStepDelayInputs() {
  inputAutoStepDelaySeconds.value = formatAutoStepDelayInputValue(inputAutoStepDelaySeconds.value);
}

inputAutoStepDelaySeconds.addEventListener('input', () => {
  markSettingsDirty(true);
  scheduleSettingsAutoSave();
});
inputAutoStepDelaySeconds.addEventListener('blur', () => {
  syncAutoStepDelayInputs();
  saveSettings({ silent: true }).catch(() => { });
});

// ============================================================
// Listen for Background broadcasts
// ============================================================

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'REQUEST_CUSTOM_VERIFICATION_BYPASS_CONFIRMATION': {
      (async () => {
        const step = Number(message.payload?.step);
        const result = await openCustomVerificationConfirmDialog(step);
        sendResponse(result || { confirmed: false, addPhoneDetected: false });
      })().catch((err) => {
        sendResponse({ error: err.message });
      });
      return true;
    }

    case 'ACCOUNT_WRITE_ON_STEP6': {
      (async () => {
        const result = await handleWriteAccountStep6Request(message.payload || {});
        sendResponse(result || { ok: true, skipped: true });
      })().catch((err) => {
        sendResponse({ error: err.message });
      });
      return true;
    }

    case 'SECURITY_BLOCKED_ALERT': {
      openConfirmModal({
        title: message.payload?.title || '流程已完全停止',
        message: message.payload?.message || '检测到安全风控，当前流程已完全停止。',
        alert: message.payload?.alert || { text: '检测到 Cloudflare 风控，请暂停当前操作。', tone: 'danger' },
        confirmLabel: '我知道了',
        confirmVariant: 'btn-danger',
      }).catch(() => { });
      break;
    }

    case 'LOG_ENTRY':
      queueRealtimeLogEntry(message.payload);
      if (message.payload.level === 'error') {
        showToast(message.payload.message, 'error');
        scheduleAccountRunHistoryRefresh();
      }
      break;

    case 'LOG_ENTRY_REPEAT':
      queueRealtimeLogRepeat(message.payload);
      break;

    case 'NODE_STATUS_CHANGED': {
      const { nodeId, status } = message.payload;
      updateNodeUI(nodeId, status);
      chrome.runtime.sendMessage({ type: 'GET_STATE', source: 'sidepanel' }).then(state => {
        syncLatestState(state);
        syncAutoRunState(state);
        updateStatusDisplay(latestState);
        updateButtonStates();
        if (status === 'completed' || status === 'manual_completed' || status === 'skipped') {
          syncPasswordField(state);
          if (state.oauthUrl) {
            displayOauthUrl.textContent = state.oauthUrl;
            displayOauthUrl.classList.add('has-value');
          }
          if (state.localhostUrl) {
            displayLocalhostUrl.textContent = state.localhostUrl;
            displayLocalhostUrl.classList.add('has-value');
          }
        }
      }
      ).catch(() => { });
      break;
    }

    case 'AUTO_RUN_RESET': {
      // Full UI reset for next run
      syncLatestState({
        oauthUrl: null,
        localhostUrl: null,
        email: null,
        password: null,
        nodeStatuses: NODE_DEFAULT_STATUSES,
        logs: [],
        scheduledAutoRunAt: null,
        autoRunCountdownAt: null,
        autoRunCountdownTitle: '',
        autoRunCountdownNote: '',
      });
      displayOauthUrl.textContent = '等待中...';
      displayOauthUrl.classList.remove('has-value');
      displayLocalhostUrl.textContent = '等待中...';
      displayLocalhostUrl.classList.remove('has-value');
      inputEmail.value = '';
      syncLatestState({
        accountIdentifierType: null,
        accountIdentifier: '',
      });
      displayStatus.textContent = '就绪';
      statusBar.className = 'status-bar';
      logArea.innerHTML = '';
      resetLogView();
      resetIcloudManager();
      resetLuckmailManager();
      resetCustomEmailPoolManager();
      document.querySelectorAll('.step-row').forEach(row => row.className = 'step-row');
      document.querySelectorAll('.step-status').forEach(el => el.textContent = '');
      syncAutoRunState({
        autoRunning: false,
        autoRunPhase: 'idle',
        autoRunCurrentRun: 0,
        autoRunTotalRuns: 1,
        autoRunAttemptRun: 0,
        scheduledAutoRunAt: null,
        autoRunCountdownAt: null,
        autoRunCountdownTitle: '',
        autoRunCountdownNote: '',
      });
      applyAutoRunStatus(currentAutoRun);
      updateProgressCounter();
      updateButtonStates();
      renderHotmailAccounts();
      renderMail2925Accounts();
      if (isLuckmailProvider()) {
        queueLuckmailPurchaseRefresh();
      }
      break;
    }

    case 'DATA_UPDATED': {
      syncLatestState(message.payload);
      const activeSettingsEditor = typeof document !== 'undefined' ? document.activeElement : null;
      const shouldDeferDataUpdatedUiApply = settingsSaveInFlight
        && isEditableElementInSettingsCard(activeSettingsEditor);
      if (shouldDeferDataUpdatedUiApply) {
        if (message.payload.operationDelayEnabled !== undefined && typeof applyOperationDelayState === 'function') {
          applyOperationDelayState(message.payload);
        }
        updateAccountRunHistorySettingsUI();
        updateAccountWriteButtonState();
        break;
      }
      if (message.payload.operationDelayEnabled !== undefined && typeof applyOperationDelayState === 'function') {
        applyOperationDelayState(message.payload);
      }
      if (message.payload.email !== undefined) {
        inputEmail.value = message.payload.email || '';
        queueCustomEmailPoolRefresh();
      }
      if (
        message.payload.password !== undefined
        || message.payload.customPassword !== undefined
      ) {
        syncPasswordField(latestState || {});
      }
      if (message.payload.localCpaStep9Mode !== undefined) {
        setLocalCpaStep9Mode(message.payload.localCpaStep9Mode);
      }
      if (message.payload.panelMode !== undefined) {
        selectPanelMode.value = normalizePanelMode(message.payload.panelMode || 'cpa');
        updatePanelModeUI();
      }
      if (
        message.payload.sub2apiGroupName !== undefined
        || message.payload.sub2apiGroupNames !== undefined
      ) {
        renderSub2ApiGroupOptions(latestState, latestState?.sub2apiGroupName || '');
      }
      if (message.payload.oauthUrl !== undefined) {
        displayOauthUrl.textContent = message.payload.oauthUrl || '等待中...';
        displayOauthUrl.classList.toggle('has-value', Boolean(message.payload.oauthUrl));
      }
      if (message.payload.localhostUrl !== undefined) {
        displayLocalhostUrl.textContent = message.payload.localhostUrl || '等待中...';
        displayLocalhostUrl.classList.toggle('has-value', Boolean(message.payload.localhostUrl));
      }
      if (message.payload.cloudflareTempEmailBaseUrl !== undefined) {
        inputTempEmailBaseUrl.value = message.payload.cloudflareTempEmailBaseUrl || '';
      }
      if (message.payload.cloudflareTempEmailAdminAuth !== undefined) {
        inputTempEmailAdminAuth.value = message.payload.cloudflareTempEmailAdminAuth || '';
      }
      if (message.payload.cloudflareTempEmailCustomAuth !== undefined) {
        inputTempEmailCustomAuth.value = message.payload.cloudflareTempEmailCustomAuth || '';
      }
      if (message.payload.cloudflareTempEmailLookupMode !== undefined) {
        setCloudflareTempEmailLookupMode(message.payload.cloudflareTempEmailLookupMode);
      }
      if (message.payload.cloudflareTempEmailReceiveMailbox !== undefined) {
        inputTempEmailReceiveMailbox.value = message.payload.cloudflareTempEmailReceiveMailbox || '';
      }
      if (message.payload.cloudflareTempEmailFixedMailbox !== undefined && inputTempEmailFixedMailbox) {
        inputTempEmailFixedMailbox.value = message.payload.cloudflareTempEmailFixedMailbox || '';
      }
      if (message.payload.cloudflareTempEmailUseRandomSubdomain !== undefined && inputTempEmailUseRandomSubdomain) {
        inputTempEmailUseRandomSubdomain.checked = Boolean(message.payload.cloudflareTempEmailUseRandomSubdomain);
      }
      if (message.payload.cloudflareTempEmailDomain !== undefined || message.payload.cloudflareTempEmailDomains !== undefined) {
        renderCloudflareTempEmailDomainOptions(message.payload.cloudflareTempEmailDomain || latestState?.cloudflareTempEmailDomain || '');
      }
      if (
        message.payload.cloudflareTempEmailUseRandomSubdomain !== undefined
        || message.payload.cloudflareTempEmailLookupMode !== undefined
        || message.payload.cloudflareTempEmailFixedMailbox !== undefined
        || message.payload.cloudflareTempEmailDomain !== undefined
        || message.payload.cloudflareTempEmailDomains !== undefined
      ) {
        updateMailProviderUI();
      }
      if (message.payload.cloudMailBaseUrl !== undefined && inputCloudMailBaseUrl) {
        inputCloudMailBaseUrl.value = message.payload.cloudMailBaseUrl || '';
      }
      if (message.payload.cloudMailAdminEmail !== undefined && inputCloudMailAdminEmail) {
        inputCloudMailAdminEmail.value = message.payload.cloudMailAdminEmail || '';
      }
      if (message.payload.cloudMailAdminPassword !== undefined && inputCloudMailAdminPassword) {
        inputCloudMailAdminPassword.value = message.payload.cloudMailAdminPassword || '';
      }
      if (message.payload.cloudMailReceiveMailbox !== undefined && inputCloudMailReceiveMailbox) {
        inputCloudMailReceiveMailbox.value = message.payload.cloudMailReceiveMailbox || '';
      }
      if (message.payload.cloudMailDomain !== undefined && inputCloudMailDomain) {
        inputCloudMailDomain.value = message.payload.cloudMailDomain || '';
      }
      if (message.payload.currentHotmailAccountId !== undefined || message.payload.hotmailAccounts !== undefined) {
        renderHotmailAccounts();
        if (selectMailProvider.value === 'hotmail-api') {
          inputEmail.value = getCurrentHotmailEmail();
        }
      }
      if (message.payload.currentMail2925AccountId !== undefined || message.payload.mail2925Accounts !== undefined) {
        renderMail2925Accounts();
        if (selectMailProvider.value === '2925') {
          setManagedAliasBaseEmailInputForProvider('2925', latestState);
        }
      }
      if (message.payload.customEmailPoolEntries !== undefined || message.payload.customEmailPool !== undefined) {
        setCustomEmailPoolEntriesState(restoreCustomEmailPoolEntriesFromState({
          ...latestState,
          ...message.payload,
        }));
        syncRunCountFromConfiguredEmailPool();
        queueCustomEmailPoolRefresh();
      }
      if (message.payload.luckmailApiKey !== undefined) {
        inputLuckmailApiKey.value = message.payload.luckmailApiKey || '';
      }
      if (message.payload.luckmailBaseUrl !== undefined) {
        inputLuckmailBaseUrl.value = normalizeLuckmailBaseUrl(message.payload.luckmailBaseUrl);
      }
      if (message.payload.luckmailEmailType !== undefined) {
        selectLuckmailEmailType.value = normalizeLuckmailEmailType(message.payload.luckmailEmailType);
      }
      if (message.payload.luckmailDomain !== undefined) {
        inputLuckmailDomain.value = message.payload.luckmailDomain || '';
      }
      if (message.payload.gptmailApiKey !== undefined && inputGptmailApiKey) {
        inputGptmailApiKey.value = message.payload.gptmailApiKey || '';
      }
      if (message.payload.gptmailBaseUrl !== undefined && inputGptmailBaseUrl) {
        inputGptmailBaseUrl.value = normalizeGptmailBaseUrl(message.payload.gptmailBaseUrl);
      }
      if (message.payload.gptmailDomain !== undefined && inputGptmailDomain) {
        inputGptmailDomain.value = normalizeGptmailDomain(message.payload.gptmailDomain);
      }
      if (message.payload.gptmailUsage !== undefined) {
        updateGptmailUsageDisplay(latestState);
      }
      if (message.payload.currentGptmailAddress !== undefined && isGptmailProvider()) {
        inputEmail.value = message.payload.currentGptmailAddress || message.payload.email || '';
      }
      if (message.payload.luckmailUsedPurchases !== undefined && isLuckmailProvider()) {
        queueLuckmailPurchaseRefresh();
      }
      if (message.payload.currentLuckmailPurchase !== undefined && isLuckmailProvider()) {
        inputEmail.value = getCurrentLuckmailEmail();
        queueLuckmailPurchaseRefresh();
      }
      if (message.payload.autoDeleteUsedIcloudAlias !== undefined && checkboxAutoDeleteIcloud) {
        checkboxAutoDeleteIcloud.checked = Boolean(message.payload.autoDeleteUsedIcloudAlias);
      }
      if (message.payload.accountRunHistoryHelperBaseUrl !== undefined && inputAccountRunHistoryHelperBaseUrl) {
        inputAccountRunHistoryHelperBaseUrl.value = normalizeAccountRunHistoryHelperBaseUrlValue(message.payload.accountRunHistoryHelperBaseUrl);
        updateAccountRunHistorySettingsUI();
      }
      if (message.payload.icloudHostPreference !== undefined && selectIcloudHostPreference) {
        const hostPreference = String(message.payload.icloudHostPreference || '').trim().toLowerCase();
        selectIcloudHostPreference.value = hostPreference === 'icloud.com'
          ? 'icloud.com'
          : (hostPreference === 'icloud.com.cn' ? 'icloud.com.cn' : 'auto');
        updateMailProviderUI();
      }
      if (message.payload.icloudTargetMailboxType !== undefined && selectIcloudTargetMailboxType) {
        selectIcloudTargetMailboxType.value = normalizeIcloudTargetMailboxType(message.payload.icloudTargetMailboxType);
        updateMailProviderUI();
      }
      if (message.payload.icloudForwardMailProvider !== undefined && selectIcloudForwardMailProvider) {
        selectIcloudForwardMailProvider.value = normalizeIcloudForwardMailProvider(message.payload.icloudForwardMailProvider);
        updateMailProviderUI();
      }
      if (message.payload.icloudFetchMode !== undefined && selectIcloudFetchMode) {
        selectIcloudFetchMode.value = normalizeIcloudFetchMode(message.payload.icloudFetchMode);
      }
      if (message.payload.autoRunSkipFailures !== undefined) {
        inputAutoSkipFailures.checked = Boolean(message.payload.autoRunSkipFailures);
        updateFallbackThreadIntervalInputState();
      }
      if (
        message.payload.step6CookieCleanupEnabled !== undefined
        && typeof inputStep6CookieCleanupEnabled !== 'undefined'
        && inputStep6CookieCleanupEnabled
      ) {
        inputStep6CookieCleanupEnabled.checked = Boolean(message.payload.step6CookieCleanupEnabled);
      }
      if (message.payload.autoRunDelayMinutes !== undefined) {
        inputAutoDelayMinutes.value = String(normalizeAutoDelayMinutes(message.payload.autoRunDelayMinutes));
      }
      if (message.payload.autoRunFallbackThreadIntervalMinutes !== undefined) {
        inputAutoSkipFailuresThreadIntervalMinutes.value = String(
          normalizeAutoRunThreadIntervalMinutes(message.payload.autoRunFallbackThreadIntervalMinutes)
        );
        updateFallbackThreadIntervalInputState();
      }
      if (message.payload.autoStepDelaySeconds !== undefined) {
        inputAutoStepDelaySeconds.value = formatAutoStepDelayInputValue(message.payload.autoStepDelaySeconds);
      }
      if (message.payload.oauthFlowTimeoutEnabled !== undefined && typeof inputOAuthFlowTimeoutEnabled !== 'undefined' && inputOAuthFlowTimeoutEnabled) {
        inputOAuthFlowTimeoutEnabled.checked = Boolean(message.payload.oauthFlowTimeoutEnabled);
      }
      updateAccountRunHistorySettingsUI();
      updateAccountWriteButtonState();
      break;
    }

    case 'ICLOUD_LOGIN_REQUIRED': {
      const loginMessage = '需要登录 iCloud，我已经为你打开登录页。';
      showToast(loginMessage, 'warn', 5000);
      if (icloudSummary) {
        icloudSummary.textContent = loginMessage;
      }
      showIcloudLoginHelp(message.payload || {});
      break;
    }

    case 'ICLOUD_ALIASES_CHANGED': {
      queueIcloudAliasRefresh();
      break;
    }

    case 'AUTO_RUN_STATUS': {
      syncLatestState({
        autoRunning: ['scheduled', 'running', 'waiting_step', 'waiting_email', 'retrying', 'waiting_interval'].includes(message.payload.phase),
        autoRunPhase: message.payload.phase,
        autoRunCurrentRun: message.payload.currentRun,
        autoRunTotalRuns: message.payload.totalRuns,
        autoRunAttemptRun: message.payload.attemptRun,
        scheduledAutoRunAt: message.payload.scheduledAt ?? null,
        autoRunCountdownAt: message.payload.countdownAt ?? null,
        autoRunCountdownTitle: message.payload.countdownTitle ?? '',
        autoRunCountdownNote: message.payload.countdownNote ?? '',
      });
      applyAutoRunStatus(message.payload);
      updateStatusDisplay(latestState);
      updateButtonStates();
      if (!['scheduled', 'running', 'waiting_step', 'waiting_email', 'retrying', 'waiting_interval'].includes(message.payload.phase)) {
        scheduleAccountRunHistoryRefresh();
      }
      break;
    }
  }
});

// ============================================================
// Theme Toggle
// ============================================================

const btnTheme = document.getElementById('btn-theme');

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('multipage-theme', theme);
}

function initTheme() {
  const saved = localStorage.getItem('multipage-theme');
  if (saved) {
    setTheme(saved);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    setTheme('dark');
  }
}

btnTheme.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
});

document.addEventListener('click', (event) => {
  const clickedInsideConfigMenu = Boolean(configMenuShell?.contains(event.target));
  const clickedInsideEditableListPicker = isClickInsideEditableListPicker(event.target);

  if (configMenuOpen && !clickedInsideConfigMenu) {
    closeConfigMenu();
  }

  if (!clickedInsideEditableListPicker) {
    closeEditableListPickers();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') {
    return;
  }
  if (configMenuOpen) {
    closeConfigMenu();
  }
  closeEditableListPickers();
});

// ============================================================
// Init
// ============================================================

initializeManualStepActions();
bindPasswordVisibilityToggles();
initTheme();
initHotmailListExpandedState();
initMail2925ListExpandedState();
updateSaveButtonState();
updateConfigMenuControls();
setLocalCpaStep9Mode(DEFAULT_LOCAL_CPA_STEP9_MODE);
setMail2925Mode(DEFAULT_MAIL_2925_MODE);
setCloudflareTempEmailLookupMode(DEFAULT_CLOUDFLARE_TEMP_EMAIL_LOOKUP_MODE);
updateAccountTransferButtonsVisibility();
updateAccountWriteButtonState();
setRestoringUiState(true);
restoreState().then(() => {
  syncPasswordToggleLabel();
  syncVpsUrlToggleLabel();
  syncVpsPasswordToggleLabel();
  syncPasswordVisibilityToggles();
  updatePanelModeUI();
  updateButtonStates();
  return null;
}).catch((err) => {
  console.error('Failed to initialize sidepanel state:', err);
}).finally(() => {
  setRestoringUiState(false);
});
