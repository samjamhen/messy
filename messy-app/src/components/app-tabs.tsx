import { router } from 'expo-router';
import { Tabs, TabList, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const colors = useTheme();
  return <Pressable {...props} accessibilityRole="tab" accessibilityState={{ selected: !!isFocused }}
    style={[styles.tab, { backgroundColor: isFocused ? colors.backgroundElement : 'transparent' }]}>
    <Text style={{ color: isFocused ? colors.text : colors.textSecondary, fontWeight: isFocused ? '700' : '400' }}>{children}</Text>
  </Pressable>;
}

export default function AppTabs() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  return <Tabs style={{ flex: 1, backgroundColor: colors.background }}>
    <TabSlot style={{ flex: 1 }} />
    <TabList style={[styles.bar, { borderTopColor: colors.backgroundElement, paddingBottom: Math.max(insets.bottom, 12), paddingLeft: Math.max(insets.left, 8), paddingRight: Math.max(insets.right, 8) }]}>
      <TabTrigger name="home" href="/home" asChild><TabButton>Home</TabButton></TabTrigger>
      <TabTrigger name="search" href="/search" asChild><TabButton>Search</TabButton></TabTrigger>
      <View style={styles.action}><Pressable accessibilityRole="button" accessibilityLabel="Add a review" onPress={() => router.push('/review/new')} style={styles.plus}><Text style={styles.plusText}>+</Text></Pressable></View>
      <TabTrigger name="map" href="/map" asChild><TabButton>Map</TabButton></TabTrigger>
      <TabTrigger name="profile" href="/profile" asChild><TabButton>Profile</TabButton></TabTrigger>
    </TabList>
  </Tabs>;
}
const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, borderTopWidth: 1 },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  action: { flex: 1, alignItems: 'center' },
  plus: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#BA432D', alignItems: 'center', justifyContent: 'center' },
  plusText: { color: '#fff', fontSize: 32, lineHeight: 38 },
});
