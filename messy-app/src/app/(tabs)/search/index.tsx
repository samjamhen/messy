import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export default function SearchScreen() {
  const colors = useTheme();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 24, width: '100%', maxWidth: 800, alignSelf: 'center' }}>
        <ThemedText type="title">Search</ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
}
