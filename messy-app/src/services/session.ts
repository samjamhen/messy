import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

type Session = { accessToken: string; expiresAt: number };
const key = 'messy.auth0.session';
let session: Session | null = null;
let loaded: Promise<void> | undefined;
const listeners = new Set<() => void>();
export const subscribeSession = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const getSession = () => session;
export async function saveSession(next: Session | null) {
  if (Platform.OS !== 'web') {
    if (next) await SecureStore.setItemAsync(key, JSON.stringify(next));
    else await SecureStore.deleteItemAsync(key);
  }
  session = next;
  listeners.forEach(listener => listener());
}
export async function loadSession() {
  loaded ??= (async () => {
    if (Platform.OS === 'web') return;
    try {
      const stored = await SecureStore.getItemAsync(key);
      const value = stored ? JSON.parse(stored) : null;
      if (typeof value?.accessToken === 'string' && value.expiresAt > Date.now() + 30_000) {
        session = value;
        listeners.forEach(listener => listener());
      }
    } catch { /* A missing or unreadable keychain entry requires sign-in. */ }
  })();
  await loaded;
}
export class SignInRequired extends Error {
  constructor() { super('Please sign in to continue. Your review is still here.'); }
}
export async function getAccessToken() {
  await loadSession();
  if (!session || session.expiresAt <= Date.now() + 30_000) {
    if (session) await saveSession(null);
    throw new SignInRequired();
  }
  return session.accessToken;
}
