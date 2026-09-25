import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SignIn from '@/components/sign-in';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export default function SignInScreen() {
  const colors = useTheme();
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28 }}>
        <View style={{ gap: 24, width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          <ThemedText type="title">Messy</ThemedText>
          <ThemedText type="subtitle">Good food. Your people.</ThemedText>
          <ThemedText themeColor="textSecondary">Create an account or sign in to discover restaurants and share your reviews.</ThemedText>
          <SignIn />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
