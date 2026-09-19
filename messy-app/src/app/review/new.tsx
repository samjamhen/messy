import { useCallback, useRef, useState } from 'react';
import { router } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PlaceAutocomplete from '@/components/place-autocomplete';
import SignIn from '@/components/sign-in';
import { ThemedText } from '@/components/themed-text';
import { INITIAL_MAP_REGION } from '@/constants/map';
import { useTheme } from '@/hooks/use-theme';
import type { Restaurant } from '@/services/restaurants';
import { ReviewApiError, reviewsApi, type Review } from '@/services/reviews';
import { getAccessToken, SignInRequired } from '@/services/session';

export default function NewReviewScreen() {
  const colors = useTheme();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Review | null>(null);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  const submission = useRef<{ fingerprint: string; id: string } | null>(null);
  const getRegion = useCallback(() => INITIAL_MAP_REGION, []);
  function close() {
    if (router.canDismiss()) router.dismiss();
    else router.replace('/home');
  }
  function cancel() {
    if (locked.current) return;
    if (!saved && (rating || body.trim())) {
      if (Platform.OS === 'web') { if (window.confirm('Discard this review?')) close(); }
      else Alert.alert('Discard review?', 'Your draft will be lost.', [{ text: 'Keep writing', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: close }]);
    } else close();
  }
  async function submit() {
    if (locked.current || !restaurant || !rating || !body.trim()) return;
    locked.current = true; setSaving(true); setError(null);
    try {
      const token = await getAccessToken();
      const fingerprint = JSON.stringify([restaurant.id, rating, body.trim()]);
      if (submission.current?.fingerprint !== fingerprint) submission.current = { fingerprint, id: randomUUID() };
      const stored = await reviewsApi.resolveRestaurant(restaurant.id, token);
      const review = await reviewsApi.create({ restaurantId: stored.id, rating, body: body.trim(), clientRequestId: submission.current.id }, token);
      setSaved(review);
    } catch (cause) {
      setError(cause instanceof SignInRequired ? cause.message : cause instanceof ReviewApiError ?
        cause.status === 401 ? 'Your session expired. Sign in again to post your review.' :
        cause.status === 400 ? 'This place could not be reviewed. Please select a restaurant and try again.' :
        cause.status === 409 ? 'This submission has changed. Check your review before trying again.' :
        'Could not post your review. Your draft is safe—please try again.' : 'Could not connect. Your draft is safe—please try again.');
    } finally { locked.current = false; setSaving(false); }
  }
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.row}>
          <Pressable accessibilityRole="button" disabled={saving} onPress={cancel} style={styles.button}><ThemedText>{saved ? 'Close' : 'Cancel'}</ThemedText></Pressable>
          <ThemedText type="small" themeColor="textSecondary">{saved ? 'REVIEW POSTED' : restaurant ? '02 / YOUR REVIEW' : '01 / THE RESTAURANT'}</ThemedText>
        </View>
        {saved ? <View style={styles.section}>
          <Text style={styles.eyebrow}>A TASTE WORTH SHARING</Text>
          <ThemedText type="title">Review posted.</ThemedText>
          <ThemedText type="subtitle">{saved.restaurantName ?? restaurant?.name}</ThemedText>
          <Text style={styles.stars}>{'★'.repeat(saved.rating)}{'☆'.repeat(5 - saved.rating)}</Text>
          <ThemedText>{saved.body}</ThemedText>
          <Pressable accessibilityRole="button" style={styles.submit} onPress={() => { router.dismissAll(); router.replace('/home'); }}><Text style={styles.submitText}>See recent reviews</Text></Pressable>
        </View> : !restaurant ? <View style={styles.section}>
          <Text style={styles.eyebrow}>YOUR NEXT ENTRY</Text>
          <ThemedText type="title">Where did you eat?</ThemedText>
          <ThemedText themeColor="textSecondary">Find the restaurant. Tell the story.</ThemedText>
          <PlaceAutocomplete getRegion={getRegion} restaurantsOnly onSelect={place => { setRestaurant(place); setError(null); }} />
        </View> : <>
          <View style={[styles.restaurant, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.monogram}><Text style={styles.monogramText}>{restaurant.name.slice(0, 1).toUpperCase()}</Text></View>
            <View style={{ flex: 1, gap: 6 }}>
              <ThemedText type="subtitle">{restaurant.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{restaurant.address}</ThemedText>
              <Pressable accessibilityRole="button" disabled={saving} onPress={() => setRestaurant(null)} style={styles.button}><ThemedText type="linkPrimary">Change restaurant</ThemedText></Pressable>
            </View>
          </View>
          <View style={styles.section}>
            <Text style={styles.eyebrow}>MAKE IT MESSY</Text>
            <ThemedText type="title">How was it?</ThemedText>
            <View accessibilityRole="radiogroup" accessibilityLabel="Your rating" style={styles.rating}>
              {[1, 2, 3, 4, 5].map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`${value} out of 5 stars`} accessibilityState={{ checked: rating === value, disabled: saving }} disabled={saving} onPress={() => setRating(value)} style={styles.starButton}>
                <Text style={[styles.stars, { color: value <= rating ? '#BA432D' : colors.textSecondary }]}>{value <= rating ? '★' : '☆'}</Text>
              </Pressable>)}
            </View>
            <ThemedText type="small" themeColor="textSecondary">{rating ? `${rating} of 5 stars` : 'Tap a star to rate your visit'}</ThemedText>
            <TextInput accessibilityLabel="Your review" placeholder="The first bite, the atmosphere, the dish you'd come back for…" placeholderTextColor={colors.textSecondary}
              multiline textAlignVertical="top" maxLength={5000} editable={!saving} value={body} onChangeText={setBody}
              style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement }]} />
            <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'right' }}>{body.length} / 5000</ThemedText>
            <SignIn disabled={saving} />
            {error ? <ThemedText accessibilityRole="alert">{error}</ThemedText> : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Post review" accessibilityState={{ disabled: saving || !rating || !body.trim(), busy: saving }} disabled={saving || !rating || !body.trim()} onPress={() => void submit()} style={[styles.submit, (saving || !rating || !body.trim()) && { opacity: 0.5 }]}>
              {saving ? <ActivityIndicator color="#fff" accessibilityLabel="Posting review" /> : <Text style={styles.submitText}>Post review</Text>}
            </Pressable>
          </View>
        </>}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 40, gap: 28, maxWidth: 680, width: '100%', alignSelf: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  section: { gap: 18 }, button: { minHeight: 44, justifyContent: 'center' },
  eyebrow: { color: '#BA432D', fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  restaurant: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16, borderRadius: 20 },
  monogram: { width: 64, height: 80, borderRadius: 10, backgroundColor: '#BA432D', justifyContent: 'center', alignItems: 'center' },
  monogramText: { color: '#fff', fontSize: 38, fontWeight: '700' },
  rating: { flexDirection: 'row', gap: 4 }, starButton: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  stars: { fontSize: 38, color: '#BA432D' }, input: { borderRadius: 16, padding: 18, fontSize: 17, lineHeight: 26, minHeight: 180 },
  submit: { minHeight: 54, borderRadius: 16, backgroundColor: '#BA432D', alignItems: 'center', justifyContent: 'center', padding: 12 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
