import { useEffect, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { createProfile, getProfileState, getServerProfileState, loadProfile, subscribeProfile } from '@/services/profile';

export default function ProfileOnboarding({ disabled }: { disabled: boolean }) {
  const colors = useTheme();
  const state = useSyncExternalStore(subscribeProfile, getProfileState, getServerProfileState);
  const [name, setName] = useState('');
  useEffect(() => { void loadProfile(); }, []);
  if (state.status === 'ready') return <ThemedText type="small">Signed in as {state.profile?.displayName}</ThemedText>;
  if (state.status === 'idle' || state.status === 'loading') return <ActivityIndicator accessibilityLabel="Loading your profile" />;
  if (state.status === 'error') return <View style={{ gap: 8 }}>
    <ThemedText accessibilityRole="alert">{state.error}</ThemedText>
    <Pressable accessibilityRole="button" disabled={disabled} onPress={() => void loadProfile()} style={{ minHeight: 44, justifyContent: 'center' }}>
      <ThemedText type="linkPrimary">Retry profile setup</ThemedText>
    </Pressable>
  </View>;
  return <View style={{ gap: 12 }}>
    <ThemedText type="subtitle">Welcome to Messy</ThemedText>
    <ThemedText>Choose a public display name to finish setting up your profile.</ThemedText>
    <TextInput accessibilityLabel="Display name" placeholder="Your display name" value={name} onChangeText={setName}
      maxLength={100} editable={!disabled} autoCapitalize="words" placeholderTextColor={colors.textSecondary}
      style={{ color: colors.text, backgroundColor: colors.backgroundElement, padding: 16, borderRadius: 12, fontSize: 17 }} />
    <Pressable accessibilityRole="button" disabled={disabled || !name.trim()} onPress={() => void createProfile(name)}
      style={{ minHeight: 44, justifyContent: 'center', opacity: disabled || !name.trim() ? 0.5 : 1 }}>
      <ThemedText type="linkPrimary">Create profile</ThemedText>
    </Pressable>
  </View>;
}
