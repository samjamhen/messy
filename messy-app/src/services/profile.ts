import { getAccessToken, getSession, saveSession, subscribeSession } from './session';

export type Profile = { id: string; displayName: string; bio: string };
type State = { status: 'idle' | 'loading' | 'missing' | 'ready' | 'error'; profile?: Profile; error?: string };
const empty: State = { status: 'idle' };
let state = empty;
let session = getSession();
let pending: Promise<void> | undefined;
const listeners = new Set<() => void>();
export const getProfileState = () => state;
export const getServerProfileState = () => empty;
export const subscribeProfile = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
function publish(next: State) { state = next; listeners.forEach(listener => listener()); }
subscribeSession(() => {
  if (session === getSession()) return;
  session = getSession();
  pending = undefined;
  publish(empty);
});

async function request(token: string, displayName?: string): Promise<Profile | null> {
  const base = process.env.EXPO_PUBLIC_REVIEW_API_URL;
  if (!base) throw new Error('The profile service is not configured.');
  const response = await fetch(`${base.replace(/\/$/, '')}/users/me`, {
    method: displayName === undefined ? 'GET' : 'PUT',
    headers: { Authorization: `Bearer ${token}`, ...(displayName === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(displayName === undefined ? {} : { body: JSON.stringify({ displayName }) }),
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 401) {
    if (getSession()?.accessToken === token) await saveSession(null);
    throw new Error('Your session expired. Please sign in again.');
  }
  if (response.status === 404 && displayName === undefined) return null;
  if (!response.ok) throw new Error('Could not save or load your profile. Please try again.');
  return response.json();
}

export function loadProfile(): Promise<void> {
  if (pending) return pending;
  if (!session || state.status === 'ready' || state.status === 'missing') return Promise.resolve();
  return run();
}

export function createProfile(displayName: string): Promise<void> {
  const name = displayName.trim();
  if (!name || name.length > 100) return Promise.reject(new Error('Choose a display name between 1 and 100 characters.'));
  if (pending) return pending;
  return run(name);
}

function run(displayName?: string): Promise<void> {
  const owner = session;
  publish({ status: 'loading' });
  const operation = (async () => {
    try {
      const token = await getAccessToken();
      if (getSession() !== owner) return;
      // Recheck before creating: a previous timed-out save may have succeeded.
      let profile = await request(token);
      if (!profile && displayName !== undefined && getSession() === owner) profile = await request(token, displayName);
      if (getSession() === owner) publish(profile ? { status: 'ready', profile } : { status: 'missing' });
    } catch (cause) {
      if (getSession() === owner) publish({ status: 'error', error: cause instanceof Error ? cause.message : 'Could not load your profile. Please try again.' });
    }
  })();
  pending = operation;
  void operation.finally(() => { if (pending === operation) pending = undefined; });
  return operation;
}
