const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function loadGeneratedEmailHelpersApi() {
  const source = fs.readFileSync('background/generated-email-helpers.js', 'utf8');
  const globalScope = {};
  return new Function('self', `${source}; return self.MultiPageGeneratedEmailHelpers;`)(globalScope);
}

test('background imports generated email helper module', () => {
  const source = fs.readFileSync('background.js', 'utf8');
  assert.match(source, /importScripts\([\s\S]*'background\/generated-email-helpers\.js'/);
});

test('generated email helper module exposes a factory', () => {
  const api = loadGeneratedEmailHelpersApi();

  assert.equal(typeof api?.createGeneratedEmailHelpers, 'function');
});

test('generated email helper falls back to Duck API generator when 2925 is in receive mode', async () => {
  const api = loadGeneratedEmailHelpersApi();
  const events = [];
  const requests = [];

  const helpers = api.createGeneratedEmailHelpers({
    addLog: async () => {},
    buildGeneratedAliasEmail: () => {
      throw new Error('should not build alias in receive mode');
    },
    buildCloudflareTempEmailHeaders: () => ({}),
    CLOUDFLARE_TEMP_EMAIL_GENERATOR: 'cloudflare-temp-email',
    fetch: async (url, options = {}) => {
      requests.push({
        url,
        method: options.method,
        headers: options.headers || {},
      });
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ address: 'duckalias001' }),
      };
    },
    fetchIcloudHideMyEmail: async () => {
      throw new Error('should not use icloud generator');
    },
    getCloudflareTempEmailAddressFromResponse: () => '',
    getCloudflareTempEmailConfig: () => ({ baseUrl: '', adminAuth: '', domain: '' }),
    getState: async () => ({
      mailProvider: '2925',
      mail2925Mode: 'receive',
      emailGenerator: 'duck',
      duckApiAuthorization: 'token-abc',
    }),
    ensureMail2925AccountForFlow: async () => {
      throw new Error('should not allocate 2925 account in receive mode');
    },
    joinCloudflareTempEmailUrl: () => '',
    normalizeCloudflareDomain: () => '',
    normalizeCloudflareTempEmailAddress: () => '',
    normalizeEmailGenerator: (value) => String(value || '').trim().toLowerCase(),
    isGeneratedAliasProvider: (_provider, mail2925Mode) => mail2925Mode === 'provide',
    setEmailState: async (email) => {
      events.push(['email', email]);
    },
    throwIfStopped: () => {},
  });

  const email = await helpers.fetchGeneratedEmail({
    mailProvider: '2925',
    mail2925Mode: 'receive',
    emailGenerator: 'duck',
    duckApiAuthorization: 'token-abc',
  }, {
    mailProvider: '2925',
    mail2925Mode: 'receive',
    generator: 'duck',
  });

  assert.equal(email, 'duckalias001@duck.com');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://quack.duckduckgo.com/api/email/addresses');
  assert.equal(requests[0].method, 'POST');
  assert.equal(requests[0].headers.Authorization, 'Bearer token-abc');
  assert.equal(requests[0].headers.Origin, 'https://duckduckgo.com');
  assert.equal(requests[0].headers.Referer, 'https://duckduckgo.com/');
  assert.deepStrictEqual(events, [
    ['email', 'duckalias001@duck.com'],
  ]);
});

test('generated email helper keeps Bearer prefix unchanged for Duck API authorization header', async () => {
  const api = loadGeneratedEmailHelpersApi();
  const requests = [];

  const helpers = api.createGeneratedEmailHelpers({
    addLog: async () => {},
    buildGeneratedAliasEmail: () => {
      throw new Error('should not build alias');
    },
    buildCloudflareTempEmailHeaders: () => ({}),
    CLOUDFLARE_TEMP_EMAIL_GENERATOR: 'cloudflare-temp-email',
    fetch: async (_url, options = {}) => {
      requests.push(options.headers || {});
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ address: 'fresh@duck.com' }),
      };
    },
    fetchIcloudHideMyEmail: async () => {
      throw new Error('should not use icloud generator');
    },
    getCloudflareTempEmailAddressFromResponse: () => '',
    getCloudflareTempEmailConfig: () => ({ baseUrl: '', adminAuth: '', domain: '' }),
    getState: async () => ({
      email: 'Previous@Duck.com',
      emailGenerator: 'duck',
      mailProvider: 'gmail',
      duckApiAuthorization: 'Bearer already-prefixed-token',
    }),
    ensureMail2925AccountForFlow: async () => {
      throw new Error('should not allocate 2925 account');
    },
    joinCloudflareTempEmailUrl: () => '',
    normalizeCloudflareDomain: () => '',
    normalizeCloudflareTempEmailAddress: () => '',
    normalizeEmailGenerator: (value) => String(value || '').trim().toLowerCase(),
    isGeneratedAliasProvider: () => false,
    setEmailState: async () => {},
    throwIfStopped: () => {},
  });

  const email = await helpers.fetchGeneratedEmail({
    email: 'Previous@Duck.com',
    emailGenerator: 'duck',
    mailProvider: 'gmail',
    duckApiAuthorization: 'Bearer already-prefixed-token',
  }, {
    generator: 'duck',
  });

  assert.equal(email, 'fresh@duck.com');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].Authorization, 'Bearer already-prefixed-token');
});

test('generated email helper throws a clear error when Duck API authorization is missing', async () => {
  const api = loadGeneratedEmailHelpersApi();

  const helpers = api.createGeneratedEmailHelpers({
    addLog: async () => {},
    buildGeneratedAliasEmail: () => {
      throw new Error('should not build alias');
    },
    buildCloudflareTempEmailHeaders: () => ({}),
    CLOUDFLARE_TEMP_EMAIL_GENERATOR: 'cloudflare-temp-email',
    fetch: async () => {
      throw new Error('should not call duck api without token');
    },
    fetchIcloudHideMyEmail: async () => {
      throw new Error('should not use icloud generator');
    },
    getCloudflareTempEmailAddressFromResponse: () => '',
    getCloudflareTempEmailConfig: () => ({ baseUrl: '', adminAuth: '', domain: '' }),
    getState: async () => ({
      emailGenerator: 'duck',
      mailProvider: 'gmail',
      duckApiAuthorization: '',
    }),
    ensureMail2925AccountForFlow: async () => {
      throw new Error('should not allocate 2925 account');
    },
    joinCloudflareTempEmailUrl: () => '',
    normalizeCloudflareDomain: () => '',
    normalizeCloudflareTempEmailAddress: () => '',
    normalizeEmailGenerator: (value) => String(value || '').trim().toLowerCase(),
    isGeneratedAliasProvider: () => false,
    setEmailState: async () => {},
    throwIfStopped: () => {},
  });

  await assert.rejects(
    () => helpers.fetchGeneratedEmail({
      emailGenerator: 'duck',
      mailProvider: 'gmail',
    }, { generator: 'duck' }),
    /Duck API Authorization 未配置/,
  );
});

test('generated email helper retries Duck API request on retryable status', async () => {
  const api = loadGeneratedEmailHelpersApi();
  const statuses = [];

  const helpers = api.createGeneratedEmailHelpers({
    addLog: async () => {},
    buildGeneratedAliasEmail: () => {
      throw new Error('should not build alias');
    },
    buildCloudflareTempEmailHeaders: () => ({}),
    CLOUDFLARE_TEMP_EMAIL_GENERATOR: 'cloudflare-temp-email',
    fetch: async () => {
      const status = statuses.length === 0 ? 500 : 200;
      statuses.push(status);
      if (status === 500) {
        return {
          ok: false,
          status: 500,
          text: async () => JSON.stringify({ error: 'internal error' }),
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ address: 'retry-success' }),
      };
    },
    fetchIcloudHideMyEmail: async () => {
      throw new Error('should not use icloud generator');
    },
    getCloudflareTempEmailAddressFromResponse: () => '',
    getCloudflareTempEmailConfig: () => ({ baseUrl: '', adminAuth: '', domain: '' }),
    getState: async () => ({
      emailGenerator: 'duck',
      mailProvider: 'gmail',
      duckApiAuthorization: 'token-retry',
    }),
    ensureMail2925AccountForFlow: async () => {
      throw new Error('should not allocate 2925 account');
    },
    joinCloudflareTempEmailUrl: () => '',
    normalizeCloudflareDomain: () => '',
    normalizeCloudflareTempEmailAddress: () => '',
    normalizeEmailGenerator: (value) => String(value || '').trim().toLowerCase(),
    isGeneratedAliasProvider: () => false,
    setEmailState: async () => {},
    throwIfStopped: () => {},
  });

  const email = await helpers.fetchGeneratedEmail({
    emailGenerator: 'duck',
    mailProvider: 'gmail',
    duckApiAuthorization: 'token-retry',
  }, {
    generator: 'duck',
  });

  assert.equal(email, 'retry-success@duck.com');
  assert.deepEqual(statuses, [500, 200]);
});

test('generated email helper preserves phone identity through the shared persistence helper during Duck add-email generation', async () => {
  const api = loadGeneratedEmailHelpersApi();
  const persistCalls = [];

  const helpers = api.createGeneratedEmailHelpers({
    addLog: async () => {},
    buildGeneratedAliasEmail: () => {
      throw new Error('should not build alias');
    },
    buildCloudflareTempEmailHeaders: () => ({}),
    CLOUDFLARE_TEMP_EMAIL_GENERATOR: 'cloudflare-temp-email',
    fetch: async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ address: 'fresh' }),
    }),
    fetchIcloudHideMyEmail: async () => {
      throw new Error('should not use icloud generator');
    },
    getCloudflareTempEmailAddressFromResponse: () => '',
    getCloudflareTempEmailConfig: () => ({ baseUrl: '', adminAuth: '', domain: '' }),
    getState: async () => ({}),
    ensureMail2925AccountForFlow: async () => {
      throw new Error('should not allocate 2925 account');
    },
    joinCloudflareTempEmailUrl: () => '',
    normalizeCloudflareDomain: () => '',
    normalizeCloudflareTempEmailAddress: () => '',
    normalizeEmailGenerator: (value) => String(value || '').trim().toLowerCase(),
    isGeneratedAliasProvider: () => false,
    persistRegistrationEmailState: async (state, email, options) => {
      persistCalls.push({ state, email, options });
    },
    setEmailState: async () => {
      throw new Error('preserveAccountIdentity should use shared persistence helper');
    },
    throwIfStopped: () => {},
  });

  const state = {
    email: '',
    emailGenerator: 'duck',
    mailProvider: 'gmail',
    accountIdentifierType: 'phone',
    accountIdentifier: '+447780579093',
    signupPhoneNumber: '+447780579093',
    duckApiAuthorization: 'token-identity',
    signupPhoneCompletedActivation: {
      activationId: 'done-1',
      phoneNumber: '+447780579093',
    },
  };
  const email = await helpers.fetchGeneratedEmail(state, {
    generator: 'duck',
    preserveAccountIdentity: true,
  });

  assert.equal(email, 'fresh@duck.com');
  assert.equal(persistCalls.length, 1);
  assert.equal(persistCalls[0].email, 'fresh@duck.com');
  assert.equal(persistCalls[0].options.source, 'generated:duck');
  assert.equal(persistCalls[0].options.preserveAccountIdentity, true);
  assert.equal(persistCalls[0].state.accountIdentifierType, 'phone');
  assert.equal(persistCalls[0].state.signupPhoneNumber, '+447780579093');
});

test('generated email helper can read the requested address from custom email pool', async () => {
  const api = loadGeneratedEmailHelpersApi();
  const events = [];

  const helpers = api.createGeneratedEmailHelpers({
    addLog: async () => {},
    buildGeneratedAliasEmail: () => {
      throw new Error('should not build alias');
    },
    buildCloudflareTempEmailHeaders: () => ({}),
    CLOUDFLARE_TEMP_EMAIL_GENERATOR: 'cloudflare-temp-email',
    CUSTOM_EMAIL_POOL_GENERATOR: 'custom-pool',
    DUCK_AUTOFILL_URL: 'https://duckduckgo.com/email',
    fetch: async () => ({ ok: true, text: async () => '{}' }),
    fetchIcloudHideMyEmail: async () => {
      throw new Error('should not use icloud generator');
    },
    getCloudflareTempEmailAddressFromResponse: () => '',
    getCloudflareTempEmailConfig: () => ({ baseUrl: '', adminAuth: '', domain: '' }),
    getCustomEmailPoolEmail: (state, targetRun) => state.customEmailPool?.[targetRun - 1] || '',
    getState: async () => ({
      customEmailPool: ['first@example.com', 'second@example.com'],
      emailGenerator: 'custom-pool',
      mailProvider: 'gmail',
    }),
    ensureMail2925AccountForFlow: async () => {
      throw new Error('should not allocate 2925 account');
    },
    joinCloudflareTempEmailUrl: () => '',
    normalizeCloudflareDomain: () => '',
    normalizeCloudflareTempEmailAddress: () => '',
    normalizeEmailGenerator: (value) => String(value || '').trim().toLowerCase(),
    isGeneratedAliasProvider: () => false,
    reuseOrCreateTab: async () => {},
    sendToContentScript: async () => {
      throw new Error('should not open duck tab');
    },
    setEmailState: async (email) => {
      events.push(['email', email]);
    },
    throwIfStopped: () => {},
  });

  const email = await helpers.fetchGeneratedEmail({
    customEmailPool: ['first@example.com', 'second@example.com'],
    emailGenerator: 'custom-pool',
    mailProvider: 'gmail',
  }, {
    generator: 'custom-pool',
    poolIndex: 1,
  });

  assert.equal(email, 'second@example.com');
  assert.deepStrictEqual(events, [
    ['email', 'second@example.com'],
  ]);
});

test('generated email helper respects runtime generator overrides when deciding alias flow', async () => {
  const api = loadGeneratedEmailHelpersApi();
  const aliasStates = [];
  const savedEmails = [];

  const helpers = api.createGeneratedEmailHelpers({
    addLog: async () => {},
    buildGeneratedAliasEmail: (state) => {
      aliasStates.push({ ...state });
      return 'base+tag@gmail.com';
    },
    buildCloudflareTempEmailHeaders: () => ({}),
    CLOUDFLARE_TEMP_EMAIL_GENERATOR: 'cloudflare-temp-email',
    CUSTOM_EMAIL_POOL_GENERATOR: 'custom-pool',
    DUCK_AUTOFILL_URL: 'https://duckduckgo.com/email',
    fetch: async () => ({ ok: true, text: async () => '{}' }),
    fetchIcloudHideMyEmail: async () => {
      throw new Error('should not use icloud generator');
    },
    getCloudflareTempEmailAddressFromResponse: () => '',
    getCloudflareTempEmailConfig: () => ({ baseUrl: '', adminAuth: '', domain: '' }),
    getCustomEmailPoolEmail: () => '',
    getState: async () => ({
      mailProvider: '163',
      emailGenerator: 'duck',
      gmailBaseEmail: '',
    }),
    ensureMail2925AccountForFlow: async () => {
      throw new Error('should not allocate mail2925 account');
    },
    joinCloudflareTempEmailUrl: () => '',
    normalizeCloudflareDomain: () => '',
    normalizeCloudflareTempEmailAddress: () => '',
    normalizeEmailGenerator: (value) => String(value || '').trim().toLowerCase(),
    isGeneratedAliasProvider: (stateOrProvider, mail2925Mode) => {
      const provider = typeof stateOrProvider === 'string'
        ? stateOrProvider
        : stateOrProvider?.mailProvider;
      const generator = typeof stateOrProvider === 'string'
        ? ''
        : stateOrProvider?.emailGenerator;
      return String(provider || '').trim().toLowerCase() === 'gmail'
        && String(generator || '').trim().toLowerCase() !== 'custom-pool'
        && String(mail2925Mode || '').trim().toLowerCase() !== 'receive';
    },
    reuseOrCreateTab: async () => {},
    sendToContentScript: async () => {
      throw new Error('should not use duck generator');
    },
    setEmailState: async (email) => {
      savedEmails.push(email);
    },
    throwIfStopped: () => {},
  });

  const email = await helpers.fetchGeneratedEmail({
    mailProvider: '163',
    emailGenerator: 'duck',
  }, {
    generator: 'gmail-alias',
    mailProvider: 'gmail',
    gmailBaseEmail: 'base@gmail.com',
  });

  assert.equal(email, 'base+tag@gmail.com');
  assert.deepEqual(savedEmails, ['base+tag@gmail.com']);
  assert.equal(aliasStates.length, 1);
  assert.equal(aliasStates[0].mailProvider, 'gmail');
  assert.equal(aliasStates[0].emailGenerator, 'gmail-alias');
  assert.equal(aliasStates[0].gmailBaseEmail, 'base@gmail.com');
});

test('generated email helper uses the regular temp email domain when random subdomain mode is disabled', async () => {
  const api = loadGeneratedEmailHelpersApi();
  const requests = [];
  const savedEmails = [];

  const helpers = api.createGeneratedEmailHelpers({
    addLog: async () => {},
    buildGeneratedAliasEmail: () => {
      throw new Error('should not build managed alias');
    },
    buildCloudflareTempEmailHeaders: () => ({ 'x-admin-auth': 'admin-secret' }),
    CLOUDFLARE_TEMP_EMAIL_GENERATOR: 'cloudflare-temp-email',
    DUCK_AUTOFILL_URL: 'https://duckduckgo.com/email',
    fetch: async (url, options = {}) => {
      requests.push({
        url,
        method: options.method,
        body: options.body ? JSON.parse(options.body) : null,
      });
      return {
        ok: true,
        text: async () => JSON.stringify({ address: 'user@mail.example.com' }),
      };
    },
    fetchIcloudHideMyEmail: async () => {
      throw new Error('should not use icloud generator');
    },
    getCloudflareTempEmailAddressFromResponse: (payload) => payload.address,
    getCloudflareTempEmailConfig: () => ({
      baseUrl: 'https://temp.example.com',
      adminAuth: 'admin-secret',
      customAuth: '',
      useRandomSubdomain: false,
      domain: 'mail.example.com',
    }),
    getState: async () => ({
      mailProvider: '163',
      emailGenerator: 'cloudflare-temp-email',
    }),
    ensureMail2925AccountForFlow: async () => {
      throw new Error('should not allocate mail2925 account');
    },
    joinCloudflareTempEmailUrl: (baseUrl, path) => `${baseUrl}${path}`,
    normalizeCloudflareDomain: () => '',
    normalizeCloudflareTempEmailAddress: (value) => String(value || '').trim().toLowerCase(),
    normalizeEmailGenerator: (value) => String(value || '').trim().toLowerCase(),
    isGeneratedAliasProvider: () => false,
    reuseOrCreateTab: async () => {},
    sendToContentScript: async () => {
      throw new Error('should not use duck generator');
    },
    setEmailState: async (email) => {
      savedEmails.push(email);
    },
    throwIfStopped: () => {},
  });

  const email = await helpers.fetchGeneratedEmail({
    emailGenerator: 'cloudflare-temp-email',
  }, {
    generator: 'cloudflare-temp-email',
  });

  assert.equal(email, 'user@mail.example.com');
  assert.deepEqual(savedEmails, ['user@mail.example.com']);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://temp.example.com/admin/new_address');
  assert.equal(requests[0].method, 'POST');
  assert.deepEqual(requests[0].body, {
    enablePrefix: true,
    enableRandomSubdomain: false,
    name: requests[0].body.name,
    domain: 'mail.example.com',
  });
  assert.match(requests[0].body.name, /^[a-z0-9]+$/);
});

test('generated email helper requests random subdomain creation while preserving the returned address', async () => {
  const api = loadGeneratedEmailHelpersApi();
  const requests = [];
  const savedEmails = [];

  const helpers = api.createGeneratedEmailHelpers({
    addLog: async () => {},
    buildGeneratedAliasEmail: () => {
      throw new Error('should not build managed alias');
    },
    buildCloudflareTempEmailHeaders: () => ({ 'x-admin-auth': 'admin-secret' }),
    CLOUDFLARE_TEMP_EMAIL_GENERATOR: 'cloudflare-temp-email',
    DUCK_AUTOFILL_URL: 'https://duckduckgo.com/email',
    fetch: async (url, options = {}) => {
      requests.push({
        url,
        method: options.method,
        body: options.body ? JSON.parse(options.body) : null,
      });
      return {
        ok: true,
        text: async () => JSON.stringify({ address: 'user@a1b2c3d4.example.com' }),
      };
    },
    fetchIcloudHideMyEmail: async () => {
      throw new Error('should not use icloud generator');
    },
    getCloudflareTempEmailAddressFromResponse: (payload) => payload.address,
    getCloudflareTempEmailConfig: () => ({
      baseUrl: 'https://temp.example.com',
      adminAuth: 'admin-secret',
      customAuth: '',
      useRandomSubdomain: true,
      domain: 'mail.example.com',
    }),
    getState: async () => ({
      mailProvider: '163',
      emailGenerator: 'cloudflare-temp-email',
    }),
    ensureMail2925AccountForFlow: async () => {
      throw new Error('should not allocate mail2925 account');
    },
    joinCloudflareTempEmailUrl: (baseUrl, path) => `${baseUrl}${path}`,
    normalizeCloudflareDomain: () => '',
    normalizeCloudflareTempEmailAddress: (value) => String(value || '').trim().toLowerCase(),
    normalizeEmailGenerator: (value) => String(value || '').trim().toLowerCase(),
    isGeneratedAliasProvider: () => false,
    reuseOrCreateTab: async () => {},
    sendToContentScript: async () => {
      throw new Error('should not use duck generator');
    },
    setEmailState: async (email) => {
      savedEmails.push(email);
    },
    throwIfStopped: () => {},
  });

  const email = await helpers.fetchGeneratedEmail({
    emailGenerator: 'cloudflare-temp-email',
  }, {
    generator: 'cloudflare-temp-email',
    localPart: 'user',
  });

  assert.equal(email, 'user@a1b2c3d4.example.com');
  assert.deepEqual(savedEmails, ['user@a1b2c3d4.example.com']);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://temp.example.com/admin/new_address');
  assert.equal(requests[0].method, 'POST');
  assert.deepEqual(requests[0].body, {
    enablePrefix: true,
    enableRandomSubdomain: true,
    name: 'user',
    domain: 'mail.example.com',
  });
});

test('generated email helper honors iCloud always-new fetch mode', async () => {
  const api = loadGeneratedEmailHelpersApi();
  const icloudOptions = [];

  const helpers = api.createGeneratedEmailHelpers({
    addLog: async () => {},
    buildGeneratedAliasEmail: () => {
      throw new Error('should not build managed alias');
    },
    buildCloudflareTempEmailHeaders: () => ({}),
    CLOUDFLARE_TEMP_EMAIL_GENERATOR: 'cloudflare-temp-email',
    DUCK_AUTOFILL_URL: 'https://duckduckgo.com/email',
    fetch: async () => ({ ok: true, text: async () => '{}' }),
    fetchIcloudHideMyEmail: async (options) => {
      icloudOptions.push(options);
      return 'fresh@icloud.example.com';
    },
    getCloudflareTempEmailAddressFromResponse: () => '',
    getCloudflareTempEmailConfig: () => ({ baseUrl: '', adminAuth: '', domain: '' }),
    getState: async () => ({
      emailGenerator: 'icloud',
      icloudFetchMode: 'always_new',
      mailProvider: 'gmail',
    }),
    ensureMail2925AccountForFlow: async () => {
      throw new Error('should not allocate mail2925 account');
    },
    joinCloudflareTempEmailUrl: () => '',
    normalizeCloudflareDomain: () => '',
    normalizeCloudflareTempEmailAddress: () => '',
    normalizeEmailGenerator: (value) => String(value || '').trim().toLowerCase(),
    isGeneratedAliasProvider: () => false,
    reuseOrCreateTab: async () => {},
    sendToContentScript: async () => {
      throw new Error('should not use duck generator');
    },
    setEmailState: async () => {},
    throwIfStopped: () => {},
  });

  const email = await helpers.fetchGeneratedEmail({
    emailGenerator: 'icloud',
    icloudFetchMode: 'always_new',
    mailProvider: 'gmail',
  }, {
    generator: 'icloud',
  });

  assert.equal(email, 'fresh@icloud.example.com');
  assert.equal(icloudOptions.length, 1);
  assert.equal(icloudOptions[0].generateNew, true);
  assert.equal(icloudOptions[0].preserveAccountIdentity, false);
  assert.equal(icloudOptions[0].source, 'generated:icloud');
  assert.equal(icloudOptions[0].state.emailGenerator, 'icloud');
});

test('generated email helper forwards preserve identity context to the iCloud generator', async () => {
  const api = loadGeneratedEmailHelpersApi();
  const icloudOptions = [];

  const helpers = api.createGeneratedEmailHelpers({
    addLog: async () => {},
    buildGeneratedAliasEmail: () => {
      throw new Error('should not build managed alias');
    },
    buildCloudflareTempEmailHeaders: () => ({}),
    CLOUDFLARE_TEMP_EMAIL_GENERATOR: 'cloudflare-temp-email',
    DUCK_AUTOFILL_URL: 'https://duckduckgo.com/email',
    fetch: async () => ({ ok: true, text: async () => '{}' }),
    fetchIcloudHideMyEmail: async (options) => {
      icloudOptions.push(options);
      return 'fresh@icloud.example.com';
    },
    getCloudflareTempEmailAddressFromResponse: () => '',
    getCloudflareTempEmailConfig: () => ({ baseUrl: '', adminAuth: '', domain: '' }),
    getState: async () => ({}),
    ensureMail2925AccountForFlow: async () => {
      throw new Error('should not allocate mail2925 account');
    },
    joinCloudflareTempEmailUrl: () => '',
    normalizeCloudflareDomain: () => '',
    normalizeCloudflareTempEmailAddress: () => '',
    normalizeEmailGenerator: (value) => String(value || '').trim().toLowerCase(),
    isGeneratedAliasProvider: () => false,
    reuseOrCreateTab: async () => {},
    sendToContentScript: async () => {
      throw new Error('should not use duck generator');
    },
    setEmailState: async () => {},
    throwIfStopped: () => {},
  });

  const state = {
    emailGenerator: 'icloud',
    icloudFetchMode: 'always_new',
    mailProvider: 'gmail',
    accountIdentifierType: 'phone',
    accountIdentifier: '+447780579093',
    signupPhoneNumber: '+447780579093',
  };
  const email = await helpers.fetchGeneratedEmail(state, {
    generator: 'icloud',
    preserveAccountIdentity: true,
  });

  assert.equal(email, 'fresh@icloud.example.com');
  assert.equal(icloudOptions.length, 1);
  assert.equal(icloudOptions[0].generateNew, true);
  assert.equal(icloudOptions[0].preserveAccountIdentity, true);
  assert.equal(icloudOptions[0].source, 'generated:icloud');
  assert.equal(icloudOptions[0].state.accountIdentifierType, 'phone');
  assert.equal(icloudOptions[0].state.signupPhoneNumber, '+447780579093');
  assert.equal(icloudOptions[0].state.emailGenerator, 'icloud');
});
