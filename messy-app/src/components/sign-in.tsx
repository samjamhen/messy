import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { ThemedText } from './themed-text';
import ProfileOnboarding from './profile-onboarding';
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
  const [signupRequest, , signupAsync] = AuthSession.useAuthRequest({
    clientId: clientId ?? '', redirectUri, responseType: AuthSession.ResponseType.Code,
    scopes: ['openid', 'profile'], usePKCE: true,
    extraParams: { audience: audience ?? '', prompt: 'login', screen_hint: 'signup' },
  }, discovery);
  useEffect(() => { void loadSession(); }, []);
  async function signIn(signup = false) {
    const activeRequest = signup ? signupRequest : request;
    if (!activeRequest || !discovery || !clientId || locked.current) return;
    locked.current = true; setBusy(true); setError(null);
    try {
      if (Constants.appOwnership === 'expo') throw new Error('Please use the Messy development build to sign in or create an account.');
      const result = await (signup ? signupAsync() : promptAsync());
      if (result.type === 'cancel') return;
      if (result.type === 'dismiss') {
        console.warn('[Auth0] Sign-in browser closed before returning a result.');
        throw new Error(`Auth0 closed sign-in before it completed. Check that Allowed Callback URLs includes ${redirectUri}.`);
      }
      if (result.type === 'error') {
        console.error('[Auth0] Sign-in request failed:', result.error?.message ?? 'Unknown browser authentication error');
        throw new Error(result.error?.message ?? 'Auth0 could not start sign-in. Please try again.');
      }
      if (result.type !== 'success' || !result.params.code) {
        const authError = result.type === 'success'
          ? result.params.error_description ?? result.params.error
          : undefined;
        console.error('[Auth0] Sign-in returned without an authorization code:', authError ?? 'No details provided');
        throw new Error(authError ?? 'Sign-in did not complete. Please try again.');
      }
      const token = await AuthSession.exchangeCodeAsync({ clientId, code: result.params.code, redirectUri,
        extraParams: { code_verifier: activeRequest.codeVerifier! } }, discovery);
      if (!token.accessToken || !token.expiresIn) throw new Error('No API session was returned. Please try again.');
      await saveSession({ accessToken: token.accessToken, expiresAt: Date.now() + token.expiresIn * 1000 });
    } catch (cause) {
      console.error('[Auth0] Sign-in failed:', cause instanceof Error ? cause.message : 'Unknown error');
      setError(cause instanceof Error ? cause.message : 'Could not sign in.');
    }
    finally { locked.current = false; setBusy(false); }
  }
  return <View style={{ gap: 8 }}>
    {session ? <ProfileOnboarding key={session.accessToken} disabled={disabled} /> : null}
    {!configured ? <ThemedText type="small" themeColor="textSecondary">Sign-in is temporarily unavailable. Please try again later.</ThemedText> :
      <Pressable accessibilityRole="button" disabled={disabled || busy || (!session && !request)} onPress={() => {
        if (session) void saveSession(null).catch(() => setError('Could not sign out. Please try again.'));
        else void signIn();
      }} style={{ minHeight: 44, justifyContent: 'center' }}>
        {busy ? <ActivityIndicator accessibilityLabel="Signing in" /> : <ThemedText type="linkPrimary">{session ? 'Sign out' : 'Sign in'}</ThemedText>}
      </Pressable>}
    {configured && !session ? <Pressable accessibilityRole="button" disabled={disabled || busy || !signupRequest}
      onPress={() => void signIn(true)} style={{ minHeight: 48, borderRadius: 12, backgroundColor: '#BA432D', justifyContent: 'center', alignItems: 'center', opacity: busy ? 0.5 : 1 }}>
      <ThemedText style={{ color: '#fff' }}>Create an account</ThemedText>
    </Pressable> : null}
    {error ? <ThemedText accessibilityRole="alert" type="small">{error}</ThemedText> : null}
  </View>;
}
