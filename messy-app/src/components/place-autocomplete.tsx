import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import type { Region } from 'react-native-maps';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { fetchPlaceSuggestions, fetchSelectedPlace, type PlaceSuggestion } from '@/services/place-autocomplete';
import type { Restaurant } from '@/services/restaurants';

type Props = { getRegion: () => Region; onSelect: (place: Restaurant) => void; onSearch: (query: string) => void };

export default function PlaceAutocomplete({ getRegion, onSelect, onSearch }: Props) {
  const colors = useTheme();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const request = useRef<AbortController | null>(null);
  const session = useRef<string | null>(null);

  useEffect(() => {
    if (!editing || query.trim().length < 2) return;
    const controller = new AbortController();
    request.current = controller;
    // Session identifiers group predictions with the final Place Details call.
    session.current ??= `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    const token = session.current;
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await fetchPlaceSuggestions(query.trim(), getRegion(), token, controller.signal);
        if (!controller.signal.aborted) {
          setSuggestions(results);
          setSearched(true);
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not search places.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [query, editing, getRegion]);

  useEffect(() => () => { request.current?.abort(); }, []);

  function changeQuery(text: string) {
    request.current?.abort();
    setQuery(text);
    setEditing(true);
    setSuggestions([]);
    setError(null);
    setLoading(false);
    setSearched(false);
    if (!text.trim()) session.current = null;
  }

  async function selectPlace(suggestion: PlaceSuggestion) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const token = session.current;
    if (!token) return;
    session.current = null;
    setEditing(false);
    setSuggestions([]);
    setLoading(true);
    setError(null);
    Keyboard.dismiss();
    try {
      const place = await fetchSelectedPlace(suggestion.id, token, controller.signal);
      if (!controller.signal.aborted) {
        setQuery(place.name);
        onSelect(place);
      }
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not select this place.');
    } finally {
      if (!controller.signal.aborted) {
        session.current = null;
        setLoading(false);
      }
    }
  }

  function submitSearch() {
    request.current?.abort();
    session.current = null;
    setEditing(false);
    setSuggestions([]);
    setLoading(false);
    setError(null);
    setSearched(false);
    Keyboard.dismiss();
    onSearch(query.trim());
  }

  return (
    <View style={styles.container}>
      <View style={[styles.row, { backgroundColor: colors.backgroundElement }]}>
        <TextInput
          accessibilityLabel="Search places"
          placeholder="Search restaurants, places or addresses"
          placeholderTextColor={colors.textSecondary}
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={submitSearch}
          value={query}
          onChangeText={changeQuery}
          onFocus={() => { if (!editing) changeQuery(query); }}
          style={[styles.input, { color: colors.text }]}
        />
        {loading ? <ActivityIndicator accessibilityLabel="Loading places" size="small" /> : null}
        {query ? <Pressable accessibilityRole="button" accessibilityLabel="Clear place search" onPress={() => changeQuery('')} style={styles.clear}><ThemedText>×</ThemedText></Pressable> : null}
      </View>
      {editing && suggestions.length > 0 ? (
        <ScrollView keyboardShouldPersistTaps="handled" style={[styles.suggestions, { backgroundColor: colors.background }]}>
          {suggestions.map((suggestion) => (
            <Pressable key={suggestion.id} accessibilityRole="button" onPress={() => void selectPlace(suggestion)} style={[styles.suggestion, { borderBottomColor: colors.backgroundElement }]}>
              <ThemedText type="smallBold">{suggestion.title}</ThemedText>
              {suggestion.subtitle ? <ThemedText type="small" themeColor="textSecondary">{suggestion.subtitle}</ThemedText> : null}
            </Pressable>
          ))}
          <ThemedText type="small" themeColor="textSecondary" style={styles.message}>Google Maps</ThemedText>
        </ScrollView>
      ) : null}
      {editing && searched && !loading && !error && suggestions.length === 0 ? <ThemedText type="small" style={styles.message}>No places found. Try another name or address.</ThemedText> : null}
      {error ? <ThemedText accessibilityRole="alert" type="small" style={styles.message}>{error}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingRight: 8 },
  input: { flex: 1, minWidth: 0, paddingHorizontal: 14, height: 44, fontSize: 15 },
  clear: { minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  suggestions: { maxHeight: 220, borderRadius: 12 },
  suggestion: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  message: { paddingHorizontal: 14, paddingVertical: 8 },
});
