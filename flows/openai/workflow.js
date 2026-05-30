(function attachMultiPageOpenAiWorkflow(root, factory) {
  root.MultiPageOpenAiWorkflow = factory();
})(typeof self !== 'undefined' ? self : globalThis, function createMultiPageOpenAiWorkflow() {
  const SIGNUP_METHOD_EMAIL = 'email';
  const SIGNUP_METHOD_PHONE = 'phone';

  function freezeDeep(entry) {
    if (!entry || typeof entry !== 'object' || Object.isFrozen(entry)) {
      return entry;
    }
    Object.getOwnPropertyNames(entry).forEach((key) => {
      freezeDeep(entry[key]);
    });
    return Object.freeze(entry);
  }

  const STEP_VARIANTS = freezeDeep({
    "normal": [
      {
        "id": 1,
        "order": 10,
        "key": "open-chatgpt",
        "title": "打开 ChatGPT 官网",
        "sourceId": "chatgpt",
        "driverId": null,
        "command": "open-chatgpt",
        "flowId": "openai"
      },
      {
        "id": 2,
        "order": 20,
        "key": "submit-signup-email",
        "title": "注册并输入邮箱",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "submit-signup-email",
        "flowId": "openai"
      },
      {
        "id": 3,
        "order": 30,
        "key": "fill-password",
        "title": "填写密码并继续",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "fill-password",
        "flowId": "openai"
      },
      {
        "id": 4,
        "order": 40,
        "key": "fetch-signup-code",
        "title": "获取注册验证码",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "submit-verification-code",
        "mailRuleId": "openai-signup-code",
        "flowId": "openai"
      },
      {
        "id": 5,
        "order": 50,
        "key": "fill-profile",
        "title": "填写姓名和生日",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "fill-profile",
        "flowId": "openai"
      },
      {
        "id": 6,
        "order": 60,
        "key": "wait-registration-success",
        "title": "等待注册成功",
        "sourceId": "chatgpt",
        "driverId": null,
        "command": "wait-registration-success",
        "flowId": "openai"
      },
      {
        "id": 7,
        "order": 70,
        "key": "oauth-login",
        "title": "刷新 OAuth 并登录",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "oauth-login",
        "flowId": "openai"
      },
      {
        "id": 8,
        "order": 80,
        "key": "fetch-login-code",
        "title": "获取登录验证码",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "submit-verification-code",
        "mailRuleId": "openai-login-code",
        "flowId": "openai"
      },
      {
        "id": 9,
        "order": 90,
        "key": "post-login-phone-verification",
        "title": "手机号验证",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "post-login-phone-verification",
        "flowId": "openai"
      },
      {
        "id": 10,
        "order": 100,
        "key": "confirm-oauth",
        "title": "自动确认 OAuth",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "confirm-oauth",
        "flowId": "openai"
      },
      {
        "id": 11,
        "order": 110,
        "key": "platform-verify",
        "title": "平台回调验证",
        "sourceId": "platform-panel",
        "driverId": "content/platform-panel",
        "command": "platform-verify",
        "flowId": "openai"
      }
    ],
    "normalPhone": [
      {
        "id": 1,
        "order": 10,
        "key": "open-chatgpt",
        "title": "打开 ChatGPT 官网",
        "sourceId": "chatgpt",
        "driverId": null,
        "command": "open-chatgpt",
        "flowId": "openai"
      },
      {
        "id": 2,
        "order": 20,
        "key": "submit-signup-email",
        "title": "注册并输入手机号",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "submit-signup-email",
        "flowId": "openai"
      },
      {
        "id": 3,
        "order": 30,
        "key": "fill-password",
        "title": "填写密码并继续",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "fill-password",
        "flowId": "openai"
      },
      {
        "id": 4,
        "order": 40,
        "key": "fetch-signup-code",
        "title": "获取手机验证码",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "submit-verification-code",
        "mailRuleId": "openai-signup-code",
        "flowId": "openai"
      },
      {
        "id": 5,
        "order": 50,
        "key": "fill-profile",
        "title": "填写姓名和生日",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "fill-profile",
        "flowId": "openai"
      },
      {
        "id": 6,
        "order": 60,
        "key": "wait-registration-success",
        "title": "等待注册成功",
        "sourceId": "chatgpt",
        "driverId": null,
        "command": "wait-registration-success",
        "flowId": "openai"
      },
      {
        "id": 7,
        "order": 70,
        "key": "oauth-login",
        "title": "刷新 OAuth 并登录",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "oauth-login",
        "flowId": "openai"
      },
      {
        "id": 8,
        "order": 80,
        "key": "fetch-login-code",
        "title": "获取登录验证码",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "submit-verification-code",
        "mailRuleId": "openai-login-code",
        "flowId": "openai"
      },
      {
        "id": 9,
        "order": 90,
        "key": "bind-email",
        "title": "绑定邮箱",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "bind-email",
        "flowId": "openai"
      },
      {
        "id": 10,
        "order": 100,
        "key": "fetch-bind-email-code",
        "title": "获取绑定邮箱验证码",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "fetch-bind-email-code",
        "mailRuleId": "openai-login-code",
        "flowId": "openai"
      },
      {
        "id": 11,
        "order": 110,
        "key": "confirm-oauth",
        "title": "自动确认 OAuth",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "confirm-oauth",
        "flowId": "openai"
      },
      {
        "id": 12,
        "order": 120,
        "key": "platform-verify",
        "title": "平台回调验证",
        "sourceId": "platform-panel",
        "driverId": "content/platform-panel",
        "command": "platform-verify",
        "flowId": "openai"
      }
    ],
    "normalPhoneRelogin": [
      {
        "id": 1,
        "order": 10,
        "key": "open-chatgpt",
        "title": "打开 ChatGPT 官网",
        "sourceId": "chatgpt",
        "driverId": null,
        "command": "open-chatgpt",
        "flowId": "openai"
      },
      {
        "id": 2,
        "order": 20,
        "key": "submit-signup-email",
        "title": "注册并输入手机号",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "submit-signup-email",
        "flowId": "openai"
      },
      {
        "id": 3,
        "order": 30,
        "key": "fill-password",
        "title": "填写密码并继续",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "fill-password",
        "flowId": "openai"
      },
      {
        "id": 4,
        "order": 40,
        "key": "fetch-signup-code",
        "title": "获取手机验证码",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "submit-verification-code",
        "mailRuleId": "openai-signup-code",
        "flowId": "openai"
      },
      {
        "id": 5,
        "order": 50,
        "key": "fill-profile",
        "title": "填写姓名和生日",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "fill-profile",
        "flowId": "openai"
      },
      {
        "id": 6,
        "order": 60,
        "key": "wait-registration-success",
        "title": "等待注册成功",
        "sourceId": "chatgpt",
        "driverId": null,
        "command": "wait-registration-success",
        "flowId": "openai"
      },
      {
        "id": 7,
        "order": 70,
        "key": "oauth-login",
        "title": "刷新 OAuth 并登录",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "oauth-login",
        "flowId": "openai"
      },
      {
        "id": 8,
        "order": 80,
        "key": "fetch-login-code",
        "title": "获取登录验证码",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "submit-verification-code",
        "mailRuleId": "openai-login-code",
        "flowId": "openai"
      },
      {
        "id": 9,
        "order": 90,
        "key": "bind-email",
        "title": "绑定邮箱",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "bind-email",
        "flowId": "openai"
      },
      {
        "id": 10,
        "order": 100,
        "key": "fetch-bind-email-code",
        "title": "获取绑定邮箱验证码",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "fetch-bind-email-code",
        "mailRuleId": "openai-login-code",
        "flowId": "openai"
      },
      {
        "id": 11,
        "order": 110,
        "key": "relogin-bound-email",
        "title": "绑定邮箱后刷新 OAuth 并登录（邮箱）",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "oauth-login",
        "flowId": "openai"
      },
      {
        "id": 12,
        "order": 120,
        "key": "fetch-bound-email-login-code",
        "title": "获取登录验证码（邮箱）",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "submit-verification-code",
        "mailRuleId": "openai-login-code",
        "flowId": "openai"
      },
      {
        "id": 13,
        "order": 130,
        "key": "post-bound-email-phone-verification",
        "title": "手机号验证",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "post-login-phone-verification",
        "flowId": "openai"
      },
      {
        "id": 14,
        "order": 140,
        "key": "confirm-oauth",
        "title": "自动确认 OAuth",
        "sourceId": "openai-auth",
        "driverId": "flows/openai/content/openai-auth",
        "command": "confirm-oauth",
        "flowId": "openai"
      },
      {
        "id": 15,
        "order": 150,
        "key": "platform-verify",
        "title": "平台回调验证",
        "sourceId": "platform-panel",
        "driverId": "content/platform-panel",
        "command": "platform-verify",
        "flowId": "openai"
      }
    ]
  });

  const POST_LOGIN_PHONE_VERIFICATION_STEP_KEYS = Object.freeze([
    'post-login-phone-verification',
    'post-bound-email-phone-verification',
  ]);

  function omitPostLoginPhoneVerificationSteps(steps = []) {
    return steps.filter((step) => !POST_LOGIN_PHONE_VERIFICATION_STEP_KEYS.includes(String(step?.key || '').trim()));
  }

  function reindexModeStepDefinitions(steps = []) {
    return (Array.isArray(steps) ? steps : []).map((step, index) => ({
      ...step,
      id: index + 1,
      order: (index + 1) * 10,
    }));
  }

  function normalizeSignupMethod(value = '') {
    return String(value || '').trim().toLowerCase() === SIGNUP_METHOD_PHONE
      ? SIGNUP_METHOD_PHONE
      : SIGNUP_METHOD_EMAIL;
  }

  function isPhoneSignupReloginAfterBindEmailEnabled(options = {}) {
    return Boolean(options?.phoneSignupReloginAfterBindEmailEnabled);
  }

  function isPhoneVerificationEnabled(options = {}) {
    if (Object.prototype.hasOwnProperty.call(options || {}, 'phoneVerificationEnabled')) {
      return Boolean(options.phoneVerificationEnabled);
    }
    return true;
  }

  function resolveVariantKey(options = {}) {
    const signupMethod = normalizeSignupMethod(options?.resolvedSignupMethod || options?.signupMethod);
    if (signupMethod === SIGNUP_METHOD_PHONE) {
      return isPhoneSignupReloginAfterBindEmailEnabled(options) ? 'normalPhoneRelogin' : 'normalPhone';
    }
    return 'normal';
  }

  function getVariantStepDefinitions(variantKey) {
    return Array.isArray(STEP_VARIANTS[variantKey]) ? STEP_VARIANTS[variantKey] : STEP_VARIANTS.normal;
  }

  function getModeStepDefinitions(options = {}) {
    let steps = getVariantStepDefinitions(resolveVariantKey(options));
    if (!isPhoneVerificationEnabled(options)) {
      steps = omitPostLoginPhoneVerificationSteps(steps);
    }
    return reindexModeStepDefinitions(steps);
  }

  function getAllSteps() {
    const keyed = new Map();
    Object.values(STEP_VARIANTS).forEach((steps) => {
      reindexModeStepDefinitions(steps).forEach((step) => {
        keyed.set(`${step.id}:${step.key}`, step);
      });
    });
    return Array.from(keyed.values()).sort((left, right) => {
      const leftOrder = Number.isFinite(left.order) ? left.order : left.id;
      const rightOrder = Number.isFinite(right.order) ? right.order : right.id;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.id - right.id;
    });
  }

  function resolveStepTitle(step = {}) {
    return step?.title || '';
  }

  return {
    flowId: 'openai',
    getAllSteps,
    getModeStepDefinitions,
    getVariantStepDefinitions,
    normalizeSignupMethod,
    resolveStepTitle,
  };
});
