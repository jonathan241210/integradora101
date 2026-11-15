/* Único módulo de red del portal (web-009). Script clásico: expone ArcaApi.
   Solo lecturas públicas: sin cookies y sin cabeceras de sesión. */
(function (root) {
  'use strict';

  var TIMEOUT_MS = 10000;
  var DEFAULT_BASE = '/api/v1';

  function baseUrl() {
    var doc = root.document;
    var meta = doc && doc.querySelector ? doc.querySelector('meta[name="arca-api-base"]') : null;
    var value = meta && meta.getAttribute ? String(meta.getAttribute('content') || '').trim() : '';
    if (!value) return DEFAULT_BASE;
    return value.replace(/\/+$/, '') || DEFAULT_BASE;
  }

  function buildQuery(params) {
    var query = new root.URLSearchParams();
    Object.keys(params || {}).forEach(function (key) {
      var value = params[key];
      if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
    });
    var text = query.toString();
    return text ? '?' + text : '';
  }

  function request(path, params, shape) {
    if (typeof root.fetch !== 'function' || typeof root.AbortController !== 'function' || typeof root.URLSearchParams !== 'function') {
      return Promise.resolve({ ok: false, reason: 'network' });
    }

    var controller = new root.AbortController();
    var timedOut = false;
    var timer = setTimeout(function () {
      timedOut = true;
      controller.abort();
    }, TIMEOUT_MS);

    return Promise.resolve()
      .then(function () {
        return root.fetch(baseUrl() + path + buildQuery(params), {
          method: 'GET',
          headers: { Accept: 'application/json' },
          credentials: 'omit',
          signal: controller.signal
        });
      })
      .then(function (response) {
        if (!response || !response.ok) return { ok: false, reason: 'http' };
        return response.json().then(function (body) {
          var data = body && typeof body === 'object' ? body.data : undefined;
          var valid = shape === 'list' ? Array.isArray(data) : (data !== null && typeof data === 'object' && !Array.isArray(data));
          if (!valid) return { ok: false, reason: 'invalid' };
          var meta = body.meta && typeof body.meta === 'object' ? body.meta : {};
          return { ok: true, data: data, meta: meta };
        }, function () {
          return { ok: false, reason: 'invalid' };
        });
      })
      .catch(function () {
        return { ok: false, reason: timedOut ? 'timeout' : 'network' };
      })
      .then(function (result) {
        clearTimeout(timer);
        return result;
      });
  }

  root.ArcaApi = {
    getNews: function (options) {
      var opts = options || {};
      return request('/news', { page: opts.page, limit: opts.limit }, 'list');
    },
    getEvents: function (options) {
      var opts = options || {};
      return request('/events', { limit: opts.limit }, 'list');
    },
    getNewsItem: function (id) {
      var text = String(id);
      if (!/^[1-9]\d*$/.test(text)) return Promise.resolve({ ok: false, reason: 'bad-id' });
      return request('/news/' + text, null, 'item');
    },
    getSpecies: function () {
      return request('/published-species', null, 'list');
    },
    getMemories: function (options) {
      var opts = options || {};
      return request('/memories', { limit: opts.limit }, 'list');
    }
  };
})(globalThis);
