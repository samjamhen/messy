import type { Region } from 'react-native-maps';
import type { Restaurant } from './restaurants';

export type PlaceSuggestion = { id: string; title: string; subtitle: string };

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

function headers() {
  if (!API_KEY) throw new Error('Add EXPO_PUBLIC_GOOGLE_PLACES_API_KEY to .env.local, then restart Expo.');
  return { 'Content-Type': 'application/json', 'X-Goog-Api-Key': API_KEY };
}

export async function fetchPlaceSuggestions(input: string, region: Region, sessionToken: string, signal: AbortSignal, restaurantsOnly = false): Promise<PlaceSuggestion[]> {
  const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: headers(),
    signal,
    body: JSON.stringify({
      input,
      ...(restaurantsOnly ? { includedPrimaryTypes: ['restaurant'] } : {}),
      sessionToken,
      locationBias: { circle: {
        center: { latitude: region.latitude, longitude: region.longitude },
        radius: Math.min(50000, Math.max(1000, region.latitudeDelta * 111000 / 2)),
      } },
    }),
  });
  const data: {
    error?: { message?: string };
    suggestions?: { placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
    } }[];
  } = await response.json();
  if (!response.ok) throw new Error(data.error?.message ?? 'Could not load place suggestions.');
  return (data.suggestions ?? []).flatMap(({ placePrediction: place }) => {
    const title = place?.structuredFormat?.mainText?.text ?? place?.text?.text;
    return place?.placeId && title ? [{ id: place.placeId, title, subtitle: place.structuredFormat?.secondaryText?.text ?? '' }] : [];
  });
}

export async function fetchSelectedPlace(id: string, sessionToken: string, signal: AbortSignal): Promise<Restaurant> {
  const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}?sessionToken=${encodeURIComponent(sessionToken)}`, {
    headers: { ...headers(), 'X-Goog-FieldMask': 'id,displayName,formattedAddress,location' },
    signal,
  });
  const data: {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    error?: { message?: string };
  } = await response.json();
  if (!response.ok) throw new Error(data.error?.message ?? 'Could not load this place.');
  const latitude = data.location?.latitude;
  const longitude = data.location?.longitude;
  if (!data.id || !data.displayName?.text || latitude === undefined || longitude === undefined) {
    throw new Error('This place does not have a map location. Try another place.');
  }
  return { id: data.id, name: data.displayName.text, address: data.formattedAddress, latitude, longitude };
}
