(function attachMultiPageOpenAiFlowDefinition(root, factory) {
  root.MultiPageOpenAiFlowDefinition = factory();
})(typeof self !== 'undefined' ? self : globalThis, function createMultiPageOpenAiFlowDefinition() {
  function freezeDeep(entry) {
    if (!entry || typeof entry !== 'object' || Object.isFrozen(entry)) {
      return entry;
    }
    Object.getOwnPropertyNames(entry).forEach((key) => {
      freezeDeep(entry[key]);
    });
    return Object.freeze(entry);
  }

  const VALUE = freezeDeep({
    "id": "openai",
    "label": "Codex / OpenAI",
    "services": [
      "account",
      "email"
    ],
    "capabilities": {
      "supportsEmailSignup": true,
      "supportsPhoneSignup": true,
      "supportsPhoneVerificationSettings": true,
      "supportsContributionMode": true,
      "supportsAccountContribution": true,
      "supportsOpenAiOAuthContribution": true,
      "contributionAdapterIds": [
        "openai-oauth",
        "openai-codex-file",
        "openai-sub2api-file"
      ],
      "supportedTargetIds": [
        "cpa",
        "sub2api",
        "codex2api"
      ],
      "supportsLuckmail": true,
      "canSwitchFlow": true,
      "stepDefinitionMode": "openai-dynamic",
      "targetSelectorLabel": "来源"
    },
    "baseGroups": [
      "openai-phone",
      "shared-auto-run",
      "openai-oauth",
      "openai-step6",
      "shared-settings-actions"
    ],
    "targets": {
      "cpa": {
        "id": "cpa",
        "label": "CPA 面板",
        "defaultState": {
          "vpsUrl": "",
          "vpsPassword": "",
          "localCpaStep9Mode": "submit"
        },
        "groups": [
          "openai-target-cpa"
        ]
      },
      "sub2api": {
        "id": "sub2api",
        "label": "SUB2API",
        "defaultState": {
          "sub2apiUrl": "",
          "sub2apiEmail": "",
          "sub2apiPassword": "",
          "sub2apiGroupName": "codex",
          "sub2apiGroupNames": [
            "codex"
          ],
          "sub2apiAccountPriority": 1,
          "sub2apiDefaultProxyName": ""
        },
        "groups": [
          "openai-target-sub2api"
        ]
      },
      "codex2api": {
        "id": "codex2api",
        "label": "Codex2API",
        "defaultState": {
          "codex2apiUrl": "",
          "codex2apiAdminKey": ""
        },
        "groups": [
          "openai-target-codex2api"
        ]
      }
    },
    "settingsDefaults": {
      "signup": {
        "signupMethod": "email",
        "phoneVerificationEnabled": false,
        "phoneSignupReloginAfterBindEmailEnabled": false
      },
      "autoRun": {
        "stepExecutionRange": {
          "enabled": false,
          "fromStep": 1,
          "toStep": 11
        }
      }
    },
    "runtimeSources": {
      "openai-auth": {
        "flowId": "openai",
        "kind": "flow-page",
        "label": "认证页",
        "readyPolicy": "allow-child-frame",
        "family": "openai-auth-family",
        "driverId": "flows/openai/content/openai-auth",
        "cleanupScopes": [
          "oauth-localhost-callback"
        ],
        "detectionMatchers": [
          {
            "hostnames": [
              "auth0.openai.com",
              "auth.openai.com",
              "accounts.openai.com"
            ]
          }
        ],
        "familyMatchers": [
          {
            "hostnames": [
              "auth0.openai.com",
              "auth.openai.com",
              "accounts.openai.com"
            ]
          },
          {
            "hostnames": [
              "chatgpt.com",
              "www.chatgpt.com",
              "chat.openai.com"
            ]
          }
        ]
      },
      "chatgpt": {
        "flowId": "openai",
        "kind": "flow-entry",
        "label": "ChatGPT 首页",
        "readyPolicy": "allow-child-frame",
        "family": "chatgpt-entry-family",
        "driverId": null,
        "cleanupScopes": [],
        "detectionMatchers": [
          {
            "hostnames": [
              "chatgpt.com",
              "www.chatgpt.com",
              "chat.openai.com"
            ]
          }
        ],
        "familyMatchers": [
          {
            "hostnames": [
              "chatgpt.com",
              "www.chatgpt.com",
              "chat.openai.com"
            ]
          }
        ]
      },
      "vps-panel": {
        "flowId": "openai",
        "kind": "panel-page",
        "label": "CPA 面板",
        "readyPolicy": "allow-child-frame",
        "family": "vps-panel-family",
        "driverId": "flows/openai/content/vps-panel",
        "cleanupScopes": [],
        "familyMatchers": [
          {
            "originEqualsReference": true,
            "pathEqualsReference": true
          }
        ]
      },
      "platform-panel": {
        "flowId": "openai",
        "kind": "virtual-page",
        "label": "平台回调面板",
        "readyPolicy": "disabled",
        "family": "platform-panel-family",
        "driverId": "content/platform-panel",
        "cleanupScopes": [],
        "familyMatchers": []
      },
      "sub2api-panel": {
        "flowId": "openai",
        "kind": "panel-page",
        "label": "SUB2API 后台",
        "readyPolicy": "allow-child-frame",
        "family": "sub2api-panel-family",
        "driverId": "flows/openai/content/sub2api-panel",
        "cleanupScopes": [],
        "familyMatchers": [
          {
            "originEqualsReference": true,
            "pathPrefixes": [
              "/admin/accounts"
            ]
          },
          {
            "originEqualsReference": true,
            "pathPrefixes": [
              "/login"
            ]
          },
          {
            "originEqualsReference": true,
            "pathEqualsOneOf": [
              "/"
            ]
          }
        ]
      },
      "codex2api-panel": {
        "flowId": "openai",
        "kind": "panel-page",
        "label": "Codex2API 后台",
        "readyPolicy": "allow-child-frame",
        "family": "codex2api-panel-family",
        "driverId": "flows/openai/content/sub2api-panel",
        "cleanupScopes": [],
        "familyMatchers": [
          {
            "originEqualsReference": true,
            "pathPrefixes": [
              "/admin/accounts"
            ]
          },
          {
            "originEqualsReference": true,
            "pathEqualsOneOf": [
              "/admin",
              "/"
            ]
          }
        ]
      }
    },
    "driverDefinitions": {
      "flows/openai/content/openai-auth": {
        "sourceId": "openai-auth",
        "commands": [
          "submit-signup-email",
          "fill-password",
          "fill-profile",
          "oauth-login",
          "submit-verification-code",
          "post-login-phone-verification",
          "bind-email",
          "fetch-bind-email-code",
          "confirm-oauth",
          "detect-auth-state"
        ]
      },
      "flows/openai/content/sub2api-panel": {
        "sourceId": "sub2api-panel",
        "commands": [
          "open-panel",
          "fetch-oauth-url",
          "platform-verify"
        ]
      },
      "flows/openai/content/vps-panel": {
        "sourceId": "vps-panel",
        "commands": [
          "open-panel",
          "fetch-oauth-url",
          "platform-verify"
        ]
      },
      "content/platform-panel": {
        "sourceId": "platform-panel",
        "commands": [
          "platform-verify",
          "fetch-oauth-url"
        ]
      }
    },
    "defaultTargetId": "cpa",
    "settingsGroups": {
      "openai-target-cpa": {
        "id": "openai-target-cpa",
        "label": "CPA 来源",
        "rowIds": [
          "row-vps-url",
          "row-vps-password",
          "row-local-cpa-step9-mode"
        ]
      },
      "openai-target-sub2api": {
        "id": "openai-target-sub2api",
        "label": "SUB2API 来源",
        "rowIds": [
          "row-sub2api-url",
          "row-sub2api-email",
          "row-sub2api-password",
          "row-sub2api-group",
          "row-sub2api-account-priority",
          "row-sub2api-default-proxy"
        ]
      },
      "openai-target-codex2api": {
        "id": "openai-target-codex2api",
        "label": "Codex2API 来源",
        "rowIds": [
          "row-codex2api-url",
          "row-codex2api-admin-key"
        ]
      },
      "openai-phone": {
        "id": "openai-phone",
        "label": "接码设置",
        "sectionIds": [
          "phone-verification-section"
        ],
        "rowIds": []
      },
      "openai-oauth": {
        "id": "openai-oauth",
        "label": "OAuth",
        "rowIds": [
          "row-oauth-display",
          "row-oauth-callback"
        ]
      },
      "openai-step6": {
        "id": "openai-step6",
        "label": "第六步",
        "rowIds": [
          "row-step6-cookie-settings"
        ]
      }
    },
    "targetCapabilities": {
      "cpa": {
        "supportsPhoneSignup": true,
        "requiresPhoneSignupWarning": true,
        "usesOauthTimeoutBudget": true
      },
      "sub2api": {
        "supportsPhoneSignup": true,
        "requiresPhoneSignupWarning": false
      },
      "codex2api": {
        "supportsPhoneSignup": true,
        "requiresPhoneSignupWarning": false
      }
    }
  });

  return VALUE;
});
