import { router } from 'expo-router';
import { Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
export default function NewReviewScreen() {
  const colors = useTheme();
  function close() {
    if (router.canDismiss()) {
      router.dismiss();
    } else {
      router.replace('/home');
    }
  }
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView contentContainerStyle={{ padding: 24, gap: 24 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close review" onPress={close} hitSlop={12} style={{ minWidth: 64, minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}><ThemedText>Close</ThemedText></Pressable>
      <ThemedText type="title">Add a review</ThemedText>
    </ScrollView>
  </SafeAreaView>;
}
