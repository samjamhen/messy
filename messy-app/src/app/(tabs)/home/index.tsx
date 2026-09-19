import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { useFocusEffect } from 'expo-router';
import SignIn from '@/components/sign-in';
import { getSession, subscribeSession } from '@/services/session';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { reviewsApi, type Review } from '@/services/reviews';

export default function HomeScreen() {
  const colors = useTheme();
  const session = useSyncExternalStore(subscribeSession, getSession, () => null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const latest = useRef(0);
  const load = useCallback(async () => {
    const request = ++latest.current;
    setLoading(true);
    setError(false);
    if (!session) setReviews([]);
    try {
      const result = await reviewsApi.list();
      if (request === latest.current) setReviews(result.items);
    } catch {
      if (request === latest.current) setError(true);
    } finally {
      if (request === latest.current) setLoading(false);
    }
  }, [session]);
  useFocusEffect(useCallback(() => {
    void load();
    return () => { latest.current++; };
  }, [load]));

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={reviews}
        keyExtractor={review => review.id}
        contentContainerStyle={styles.content}
        refreshing={loading}
        onRefresh={load}
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText type="title">Messy</ThemedText>
            <View style={styles.row}>
              <ThemedText type="subtitle">Recent reviews</ThemedText>
              <Pressable accessibilityRole="button" accessibilityLabel="Refresh reviews" disabled={loading} onPress={load} style={styles.button}>
                <ThemedText type="linkPrimary">Refresh</ThemedText>
              </Pressable>
            </View>
            <ThemedText themeColor="textSecondary">See what people are saying.</ThemedText>
            <SignIn />
            {error && (
              <View accessibilityRole="alert" style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText>Couldn't load reviews. Please try again.</ThemedText>
                <Pressable accessibilityRole="button" onPress={load} style={styles.button}>
                  <ThemedText type="linkPrimary">Try again</ThemedText>
                </Pressable>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={loading ? <ActivityIndicator accessibilityLabel="Loading reviews" color={colors.text} /> : !error ? (
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText>No reviews yet</ThemedText>
            <ThemedText themeColor="textSecondary">Reviews will appear here once they're added.</ThemedText>
          </View>
        ) : null}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.row}>
              <ThemedText type="smallBold" style={styles.subject}>{item.restaurantName ?? item.subjectId}</ThemedText>
              <ThemedText accessibilityLabel={`${item.rating} out of 5 stars`}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</ThemedText>
            </View>
            <ThemedText>{item.body}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{item.authorId} · {new Date(item.createdAt).toLocaleDateString()}</ThemedText>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 110, width: '100%', maxWidth: 800, alignSelf: 'center', gap: 16 },
  header: { gap: 12, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  card: { padding: 20, borderRadius: 16, gap: 12 },
  subject: { flexShrink: 1 },
  button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
});
