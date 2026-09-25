const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

// Render the route declaration with controlled session/profile snapshots.
// Respect Protected guards when enumerating reachable screens.
function routes({ restored = true, session = null, status = 'idle' } = {}) {
  const Stack = Object.assign(() => {}, { Protected: 'protected', Screen: 'screen' });
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  const modules = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: { useEffect: () => {}, useState: () => [restored], useSyncExternalStore: (_, snapshot) => snapshot() },
    'expo-router': { Stack, ThemeProvider: 'theme' },
    'expo-splash-screen': { preventAutoHideAsync: () => {} },
    'react-native': { useColorScheme: () => 'light', View: 'view', ActivityIndicator: 'spinner' },
    '@/components/animated-icon': { AnimatedSplashOverlay: 'splash' },
    '@/services/session': { getSession: () => session },
    '@/services/profile': { getProfileState: () => ({ status }) },
  };
  const code = ts.transpileModule(readFileSync(require.resolve('../src/app/_layout.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(code, { exports, require: name => modules[name] });
  const names = [];
  function visit(node) {
    if (!node) return;
    if (Array.isArray(node)) return node.forEach(visit);
    if (node.type === 'protected' && !node.props.guard) return;
    if (node.type === 'screen') names.push(node.props.name);
    visit(node.props?.children);
  }
  visit(exports.default());
  return names;
}
test('restoration never exposes app content', () => {
  assert.deepEqual(routes({ restored: false }), []);
});
test('signed-out users can only access authentication routes', () => {
  assert.deepEqual(routes(), ['sign-in', 'oauth']);
});
test('missing, loading and failed profiles cannot access tabs or review deep links', () => {
  for (const status of ['idle', 'missing', 'loading', 'error']) {
    assert.deepEqual(routes({ session: {}, status }), ['sign-in', 'oauth']);
  }
});
test('completed onboarding unlocks app routes and removes the login screen', () => {
  assert.deepEqual(routes({ session: {}, status: 'ready' }), ['index', '(tabs)', 'review/new', 'oauth']);
});
test('sign-out blocks app routes even if a stale profile snapshot exists', () => {
  assert.deepEqual(routes({ status: 'ready' }), ['sign-in', 'oauth']);
});
