import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import type { Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppMap from '@/components/app-map';
import { ThemedText } from '@/components/themed-text';
import { INITIAL_MAP_REGION } from '@/constants/map';
import { useTheme } from '@/hooks/use-theme';
import { fetchRestaurants, type Restaurant } from '@/services/restaurants';

export default function MapScreen() {
  const colors = useTheme();
  const { height } = useWindowDimensions();
  const region = useRef<Region>(INITIAL_MAP_REGION);
  const request = useRef<AbortController | null>(null);
  const [query, setQuery] = useState('');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (text: string) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(null);
    setSelected(null);
    try {
      const results = await fetchRestaurants(region.current, text, controller.signal);
      if (!controller.signal.aborted) {
        setRestaurants(results);
        setSearched(true);
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : 'Could not load restaurants.');
        setRestaurants([]);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void search('');
    return () => request.current?.abort();
  }, [search]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <ThemedText type="title">Map</ThemedText>
        <View style={styles.searchRow}>
          <TextInput
            accessibilityLabel="Search restaurants"
            autoCapitalize="none"
            returnKeyType="search"
            placeholder="Search restaurants in this area"
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => void search(query)}
            style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Search restaurants in this area" onPress={() => void search(query)} style={styles.searchButton}>
            <ThemedText style={styles.buttonText}>Search</ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={styles.mapArea}>
        <AppMap
          restaurants={restaurants}
          selected={selected}
          onRegionChange={(nextRegion) => { region.current = nextRegion; }}
          onSelect={setSelected}
        />
        <Pressable accessibilityRole="button" onPress={() => void search(query)} style={[styles.areaButton, { backgroundColor: colors.background }]}>
          <ThemedText type="smallBold">Search this area</ThemedText>
        </Pressable>
      </View>

      <View style={[styles.results, { backgroundColor: colors.background, height: Math.min(320, Math.max(180, height * 0.32)) }]}>
        <View style={styles.resultsHeader}>
          <ThemedText type="smallBold">Restaurants</ThemedText>
          {loading ? <ActivityIndicator size="small" /> : <ThemedText type="small" themeColor="textSecondary">{restaurants.length} found</ThemedText>}
        </View>
        {error ? <ThemedText style={styles.message}>{error}</ThemedText> : null}
        {!loading && !error && searched && restaurants.length === 0 ? (
          <ThemedText style={styles.message}>No restaurants found here. Try another name or area.</ThemedText>
        ) : null}
        <FlatList
          data={restaurants}
          keyExtractor={(restaurant) => restaurant.id}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator
          renderItem={({ item: restaurant }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => setSelected(restaurant)}
              style={[styles.result, { borderBottomColor: colors.backgroundElement, backgroundColor: selected?.id === restaurant.id ? colors.backgroundSelected : colors.background }]}
            >
              <ThemedText>{restaurant.name}</ThemedText>
              {restaurant.address ? <ThemedText type="small" themeColor="textSecondary">{restaurant.address}</ThemedText> : null}
            </Pressable>
          )}
        />
        <ThemedText type="small" themeColor="textSecondary" style={styles.attribution}>Restaurant results from Google Maps</ThemedText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, gap: 14 },
  searchRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, borderRadius: 12, paddingHorizontal: 14, height: 44, fontSize: 15 },
  searchButton: { backgroundColor: '#208AEF', borderRadius: 12, paddingHorizontal: 16, height: 44, justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  mapArea: { flex: 1 },
  areaButton: { position: 'absolute', top: 12, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 5 },
  results: { paddingHorizontal: 20, paddingTop: 12 },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  list: { flex: 1 },
  result: { paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  message: { paddingVertical: 12 },
  attribution: { fontSize: 11, paddingVertical: 7 },
});
