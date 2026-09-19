import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import type { Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppMap from '@/components/app-map';
import PlaceAutocomplete from '@/components/place-autocomplete';
import { ThemedText } from '@/components/themed-text';
import { INITIAL_MAP_REGION } from '@/constants/map';
import { useTheme } from '@/hooks/use-theme';
import { fetchRestaurants, type Restaurant } from '@/services/restaurants';

export default function MapScreen() {
  const colors = useTheme();
  const region = useRef<Region>(INITIAL_MAP_REGION);
  const request = useRef<AbortController | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const getRegion = useCallback(() => region.current, []);

  const selectPlace = useCallback((place: Restaurant) => {
    setSelectedPlace(place);
    setSelected(place);
    region.current = { latitude: place.latitude, longitude: place.longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 };
  }, []);

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
        <PlaceAutocomplete getRegion={getRegion} onSelect={selectPlace} onSearch={(text) => void search(text)} />
        {error ? <ThemedText accessibilityRole="alert" type="small">{error}</ThemedText> : null}
        {!loading && !error && searched && restaurants.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">No restaurants found here. Try another name or area.</ThemedText>
        ) : null}
      </View>

      <View style={styles.mapArea}>
        <AppMap
          restaurants={selectedPlace && !restaurants.some((restaurant) => restaurant.id === selectedPlace.id) ? [...restaurants, selectedPlace] : restaurants}
          selected={selected}
          onRegionChange={(nextRegion) => { region.current = nextRegion; }}
          onSelect={setSelected}
        />
        <Pressable accessibilityRole="button" onPress={() => void search('')} style={[styles.areaButton, { backgroundColor: colors.background }]}>
          {loading ? <ActivityIndicator size="small" /> : <ThemedText type="smallBold">Search this area</ThemedText>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, gap: 14 },
  mapArea: { flex: 1 },
  areaButton: { position: 'absolute', top: 12, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 5 },
});
