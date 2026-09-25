import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
// On web this route completes the popup; on native AuthSession consumes the deep link.
import * as WebBrowser from 'expo-web-browser';
WebBrowser.maybeCompleteAuthSession();
export default function OAuthCallback() {
  return <ThemedView style={{ flex: 1, padding: 32 }}><ThemedText>Completing sign-in…</ThemedText></ThemedView>;
}
