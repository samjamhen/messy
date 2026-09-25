const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

function setup(respond) {
  let session = { accessToken: 'first' };
  const listeners = [];
  const calls = [];
  const auth = {
    getSession: () => session,
    getAccessToken: async () => { if (!session) throw Error('Sign in required'); return session.accessToken; },
    subscribeSession: callback => listeners.push(callback),
    saveSession: async next => { session = next; listeners.forEach(callback => callback()); },
  };
  const exports = {};
  const code = ts.transpileModule(readFileSync(require.resolve('../src/services/profile.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(code, { exports, require: () => auth, AbortSignal,
    process: { env: { EXPO_PUBLIC_REVIEW_API_URL: 'https://api.example' } },
    fetch: async (url, options) => { calls.push({ url, ...options }); return respond(options); },
  });
  return { api: exports, auth, calls };
}
const profile = { id: 'auth0|1', displayName: 'Sam', bio: 'Keep this bio' };
const response = (status, value) => ({ status, ok: status < 400, json: async () => value });

test('returning users load their existing profile without writing', async () => {
  const { api, calls } = setup(() => response(200, profile));
  await api.loadProfile();
  await api.createProfile('Different name');
  assert.equal(api.getProfileState().profile, profile);
  assert.ok(calls.every(call => call.method === 'GET'));
});
test('new users create a trimmed profile with bearer auth and no client user ID', async () => {
  const { api, calls } = setup(options => options.method === 'GET' ? response(404) : response(200, profile));
  await api.loadProfile();
  assert.equal(api.getProfileState().status, 'missing');
  await api.createProfile(' Sam ');
  const write = calls.find(call => call.method === 'PUT');
  assert.deepEqual(JSON.parse(write.body), { displayName: 'Sam' });
  assert.equal(write.headers.Authorization, 'Bearer first');
  assert.equal(api.getProfileState().status, 'ready');
});
test('network failures can retry without another login', async () => {
  let failed = true;
  const { api } = setup(() => { if (failed) throw Error('Offline'); return response(200, profile); });
  await api.loadProfile();
  assert.equal(api.getProfileState().status, 'error');
  failed = false;
  await api.loadProfile();
  assert.equal(api.getProfileState().status, 'ready');
});
test('late profile responses cannot restore a signed-out user', async () => {
  let resolve;
  let started;
  const requested = new Promise(done => { started = done; });
  const { api, auth } = setup(() => new Promise(done => { resolve = done; started(); }));
  const pending = api.loadProfile();
  await requested;
  await auth.saveSession(null);
  resolve(response(200, profile));
  await pending;
  assert.equal(api.getProfileState().status, 'idle');
});
test('unauthorized response clears the session', async () => {
  const { api, auth } = setup(() => response(401));
  await api.loadProfile();
  assert.equal(auth.getSession(), null);
  assert.equal(api.getProfileState().status, 'idle');
});
test('retry after an ambiguous save finds the existing profile without another write', async () => {
  let exists = false;
  const { api, calls } = setup(options => {
    if (options.method === 'PUT') { exists = true; throw Error('Connection lost'); }
    return exists ? response(200, profile) : response(404);
  });
  await api.loadProfile();
  await api.createProfile('Sam');
  assert.equal(api.getProfileState().status, 'error');
  await api.loadProfile();
  assert.equal(api.getProfileState().status, 'ready');
  assert.equal(calls.filter(call => call.method === 'PUT').length, 1);
});
