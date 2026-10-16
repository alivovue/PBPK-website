import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError, request } from '../src/api/client.js';
import { routes, withQuery } from '../src/api/routes.js';

function intercept(t, handler) {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  t.after(() => { globalThis.fetch = original; });
}

test('public catalogue uses the existing GET route without an authorization header', async (t) => {
  intercept(t, async (url, options) => {
    assert.equal(url, '/api/v1/characters?rarity=Legendary&offset=0&limit=100');
    assert.equal(options.method, 'GET');
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.body, undefined);
    return Response.json([{ id: 'godzilla', owned: false }]);
  });
  const data = await request(withQuery(routes.characters.list, { rarity: 'Legendary', offset: 0, limit: 100 }));
  assert.deepEqual(data, [{ id: 'godzilla', owned: false }]);
});

test('private reads forward bearer tokens and preserve false query filters', async (t) => {
  intercept(t, async (url, options) => {
    assert.equal(url, '/api/v1/player/me/characters?owned=false');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    return Response.json([]);
  });
  assert.deepEqual(await request(withQuery(routes.player.characters, { owned: false, rarity: null }), { token: 'test-token' }), []);
});

test('sign-in sends credentials only to the existing authentication endpoint', async (t) => {
  intercept(t, async (url, options) => {
    assert.equal(url, '/api/v1/account/login');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(options.body), { username: 'learner', password: 'test-password' });
    return Response.json({ access_token: 'test-token', token_type: 'bearer' });
  });
  const data = await request(routes.account.login, { method: 'POST', body: { username: 'learner', password: 'test-password' } });
  assert.equal(data.access_token, 'test-token');
});

test('HTTP errors retain status and backend detail for authentication and retry handling', async (t) => {
  intercept(t, async () => Response.json({ detail: 'Invalid credentials' }, { status: 401 }));
  await assert.rejects(request(routes.account.me), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 401);
    assert.equal(error.message, 'Invalid credentials');
    return true;
  });
});

test('validation errors remain readable when backend detail is an array', async (t) => {
  const detail = [{ loc: ['query', 'limit'], msg: 'Invalid limit' }];
  intercept(t, async () => Response.json({ detail }, { status: 422 }));
  await assert.rejects(request(routes.characters.list), (error) => {
    assert.equal(error.status, 422);
    assert.equal(typeof error.message, 'string');
    assert.deepEqual(error.detail, detail);
    return true;
  });
});

test('unreachable servers and non-JSON responses produce errors instead of mock data', async (t) => {
  intercept(t, async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(request(routes.ranks), (error) => error instanceof ApiError && error.status === 0);
  globalThis.fetch = async () => new Response('<html>Proxy error</html>', { status: 502 });
  await assert.rejects(request(routes.ranks), (error) => error instanceof ApiError && error.status === 502);
});

test('cancellation is passed through so abandoned views cannot surface request errors', async (t) => {
  const controller = new AbortController();
  controller.abort();
  intercept(t, async (_url, options) => {
    assert.equal(options.signal, controller.signal);
    options.signal.throwIfAborted();
  });
  await assert.rejects(request(routes.ranks, { signal: controller.signal }), { name: 'AbortError' });
});

test('character IDs cannot alter the route and empty query values are omitted', () => {
  assert.equal(routes.characters.detail('a/b?c=1'), '/characters/a%2Fb%3Fc%3D1');
  assert.equal(withQuery(routes.characters.list, { rarity: '', owned: undefined }), '/characters');
});
