import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { ThemedText } from './themed-text';
import { getSession, loadSession, saveSession, subscribeSession } from '@/services/session';

WebBrowser.maybeCompleteAuthSession();
const domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN;
const clientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID;
const audience = process.env.EXPO_PUBLIC_AUTH0_AUDIENCE;
const configured = !!(domain && clientId && audience);
const discovery = domain ? { authorizationEndpoint: `https://${domain}/authorize`, tokenEndpoint: `https://${domain}/oauth/token` } : null;

export default function SignIn({ disabled = false }: { disabled?: boolean }) {
  const session = useSyncExternalStore(subscribeSession, getSession, () => null);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'messyapp', path: 'oauth' });
  const [request, , promptAsync] = AuthSession.useAuthRequest({
    clientId: clientId ?? '', redirectUri, responseType: AuthSession.ResponseType.Code,
    scopes: ['openid', 'profile'], usePKCE: true, extraParams: { audience: audience ?? '', prompt: 'login' },
  }, discovery);
  useEffect(() => { void loadSession(); }, []);
  async function signIn() {
    if (!request || !discovery || !clientId || locked.current) return;
    locked.current = true; setBusy(true); setError(null);
    try {
      if (Constants.appOwnership === 'expo') throw new Error('Sign-in needs a development build. You can still preview the review screen in Expo Go.');
      const result = await promptAsync();
      if (result.type === 'cancel' || result.type === 'dismiss') return;
      if (result.type !== 'success' || !result.params.code) throw new Error('Sign-in did not complete. Please try again.');
      const token = await AuthSession.exchangeCodeAsync({ clientId, code: result.params.code, redirectUri,
        extraParams: { code_verifier: request.codeVerifier! } }, discovery);
      if (!token.accessToken || !token.expiresIn) throw new Error('No API session was returned. Please try again.');
      await saveSession({ accessToken: token.accessToken, expiresAt: Date.now() + token.expiresIn * 1000 });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not sign in.'); }
    finally { locked.current = false; setBusy(false); }
  }
  return <View style={{ gap: 8 }}>
    {!configured ? <ThemedText type="small" themeColor="textSecondary">Sign-in is not available yet. You can choose a restaurant and draft your review.</ThemedText> :
      <Pressable accessibilityRole="button" disabled={disabled || busy || (!session && !request)} onPress={() => {
        if (session) void saveSession(null).catch(() => setError('Could not sign out. Please try again.'));
        else void signIn();
      }} style={{ minHeight: 44, justifyContent: 'center' }}>
        {busy ? <ActivityIndicator accessibilityLabel="Signing in" /> : <ThemedText type="linkPrimary">{session ? 'Sign out' : 'Sign in with Auth0'}</ThemedText>}
      </Pressable>}
    {error ? <ThemedText accessibilityRole="alert" type="small">{error}</ThemedText> : null}
  </View>;
}
