(function attachBackgroundCookieCleanup(root, factory) {
  root.MultiPageCookieCleanup = factory();
})(typeof self !== 'undefined' ? self : globalThis, function createCookieCleanupModule() {
  function normalizeCookieDomain(domain) {
    return String(domain || '').trim().replace(/^\.+/, '').toLowerCase();
  }

  function normalizeDomainList(domains = []) {
    if (!Array.isArray(domains)) {
      return [];
    }
    const seen = new Set();
    const normalized = [];
    for (const item of domains) {
      const domain = normalizeCookieDomain(item);
      if (!domain || seen.has(domain)) continue;
      seen.add(domain);
      normalized.push(domain);
    }
    return normalized;
  }

  function shouldClearCookieByDomains(cookie, clearDomains = []) {
    const domain = normalizeCookieDomain(cookie?.domain);
    if (!domain) return false;
    return clearDomains.some((target) => (
      domain === target || domain.endsWith(`.${target}`)
    ));
  }

  function buildCookieRemovalUrl(cookie) {
    const host = normalizeCookieDomain(cookie?.domain);
    const rawPath = String(cookie?.path || '/');
    const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    return `https://${host}${path}`;
  }

  function buildCookieIdentityKey(cookie, fallbackStoreId = '') {
    return [
      cookie?.storeId || fallbackStoreId || '',
      cookie?.domain || '',
      cookie?.path || '',
      cookie?.name || '',
      cookie?.partitionKey ? JSON.stringify(cookie.partitionKey) : '',
    ].join('|');
  }

  function getDefaultErrorMessage(error) {
    return error?.message || String(error || '未知错误');
  }

  async function collectTargetCookies(chromeApi, options = {}) {
    if (!chromeApi?.cookies?.getAll) {
      return {
        cookies: [],
        queryCount: 0,
        storeCount: 0,
      };
    }

    const clearDomains = normalizeDomainList(options.clearDomains || []);
    const scanDomains = normalizeDomainList(options.scanDomains || []);
    const stores = chromeApi.cookies.getAllCookieStores
      ? await chromeApi.cookies.getAllCookieStores()
      : [{ id: undefined }];
    const result = [];
    const seen = new Set();
    let queryCount = 0;

    for (const store of stores) {
      const storeId = store?.id;
      if (scanDomains.length > 0) {
        for (const domain of scanDomains) {
          const query = storeId ? { storeId, domain } : { domain };
          queryCount += 1;
          const batch = await chromeApi.cookies.getAll(query);
          for (const cookie of batch || []) {
            if (!shouldClearCookieByDomains(cookie, clearDomains)) continue;
            const key = buildCookieIdentityKey(cookie, storeId);
            if (seen.has(key)) continue;
            seen.add(key);
            result.push(cookie);
          }
        }
      } else {
        const query = storeId ? { storeId } : {};
        queryCount += 1;
        const batch = await chromeApi.cookies.getAll(query);
        for (const cookie of batch || []) {
          if (!shouldClearCookieByDomains(cookie, clearDomains)) continue;
          const key = buildCookieIdentityKey(cookie, storeId);
          if (seen.has(key)) continue;
          seen.add(key);
          result.push(cookie);
        }
      }
    }

    return {
      cookies: result,
      queryCount,
      storeCount: stores.length,
    };
  }

  async function removeTargetCookies(chromeApi, cookies = [], options = {}) {
    const list = Array.isArray(cookies) ? cookies : [];
    if (!chromeApi?.cookies?.remove || list.length === 0) {
      return {
        attemptedCount: list.length,
        removedCount: 0,
      };
    }

    const concurrency = Math.min(
      20,
      Math.max(1, Math.floor(Number(options.removeConcurrency) || 1))
    );
    const getErrorMessage = typeof options.getErrorMessage === 'function'
      ? options.getErrorMessage
      : getDefaultErrorMessage;
    const warnLabel = String(options.warnLabel || 'cookie-cleanup').trim();
    const tryRemoveCookie = async (cookie) => {
      const details = {
        url: buildCookieRemovalUrl(cookie),
        name: cookie.name,
      };
      if (cookie.storeId) {
        details.storeId = cookie.storeId;
      }
      if (cookie.partitionKey) {
        details.partitionKey = cookie.partitionKey;
      }

      try {
        const removeResult = await chromeApi.cookies.remove(details);
        return Boolean(removeResult);
      } catch (error) {
        console.warn(`[MultiPage:${warnLabel}] remove cookie failed`, {
          domain: cookie?.domain,
          name: cookie?.name,
          message: getErrorMessage(error),
        });
        return false;
      }
    };

    if (concurrency === 1) {
      let removedCount = 0;
      for (const cookie of list) {
        if (await tryRemoveCookie(cookie)) {
          removedCount += 1;
        }
      }
      return {
        attemptedCount: list.length,
        removedCount,
      };
    }

    let removedCount = 0;
    let cursor = 0;
    const workers = new Array(Math.min(concurrency, list.length)).fill(null).map(async () => {
      while (cursor < list.length) {
        const nextIndex = cursor;
        cursor += 1;
        const cookie = list[nextIndex];
        if (await tryRemoveCookie(cookie)) {
          removedCount += 1;
        }
      }
    });
    await Promise.all(workers);
    return {
      attemptedCount: list.length,
      removedCount,
    };
  }

  async function cleanupCookies(chromeApi, options = {}) {
    const clearOrigins = Array.isArray(options.clearOrigins)
      ? options.clearOrigins.filter((origin) => typeof origin === 'string' && origin.trim())
      : [];
    const skipBrowsingDataWhenNoMatch = Boolean(options.skipBrowsingDataWhenNoMatch);
    const collected = await collectTargetCookies(chromeApi, options);
    const removed = await removeTargetCookies(chromeApi, collected.cookies, options);
    const matchedCount = collected.cookies.length;

    let browsingDataInvoked = false;
    let browsingDataError = null;
    const shouldRunBrowsingDataFallback = Boolean(chromeApi?.browsingData?.removeCookies)
      && clearOrigins.length > 0
      && (matchedCount > 0 || !skipBrowsingDataWhenNoMatch);

    if (shouldRunBrowsingDataFallback) {
      try {
        browsingDataInvoked = true;
        await chromeApi.browsingData.removeCookies({
          since: 0,
          origins: clearOrigins,
        });
      } catch (error) {
        browsingDataError = error;
      }
    }

    return {
      matchedCount,
      attemptedCount: removed.attemptedCount,
      removedCount: removed.removedCount,
      queryCount: collected.queryCount,
      storeCount: collected.storeCount,
      browsingDataInvoked,
      browsingDataError,
    };
  }

  return {
    normalizeCookieDomain,
    shouldClearCookieByDomains,
    buildCookieRemovalUrl,
    collectTargetCookies,
    removeTargetCookies,
    cleanupCookies,
  };
});
