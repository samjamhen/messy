import type { Region } from 'react-native-maps';

export type Restaurant = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
  formattedAddress?: string;
};

type PlacesResponse = {
  places?: GooglePlace[];
  error?: { message?: string };
};

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
const FIELD_MASK = 'places.id,places.displayName,places.location,places.formattedAddress';

export async function fetchRestaurants(region: Region, search: string, signal?: AbortSignal): Promise<Restaurant[]> {
  if (!API_KEY) {
    throw new Error('Add EXPO_PUBLIC_GOOGLE_PLACES_API_KEY to .env.local, then restart Expo.');
  }

  const latitudeDelta = Math.min(Math.max(region.latitudeDelta, 0.005), 0.12);
  const longitudeDelta = Math.min(Math.max(region.longitudeDelta, 0.005), 0.16);
  const name = search.trim();
  const radius = Math.min(5000, Math.max(500, Math.hypot(
    latitudeDelta * 111_000 / 2,
    longitudeDelta * 111_000 * Math.cos(region.latitude * Math.PI / 180) / 2,
  )));

  const endpoint = name ? 'searchText' : 'searchNearby';
  const body = name ? {
    textQuery: name,
    includedType: 'restaurant',
    strictTypeFiltering: true,
    pageSize: 20,
    locationBias: { circle: { center: { latitude: region.latitude, longitude: region.longitude }, radius } },
  } : {
    includedTypes: ['restaurant'],
    maxResultCount: 20,
    rankPreference: 'DISTANCE',
    locationRestriction: { circle: { center: { latitude: region.latitude, longitude: region.longitude }, radius } },
  };

  const response = await fetch(`https://places.googleapis.com/v1/places:${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
    signal,
  });
  const data: PlacesResponse = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message ?? `Google Places request failed (${response.status}).`);
  }

  return (data.places ?? []).flatMap((place) => {
    const latitude = place.location?.latitude;
    const longitude = place.location?.longitude;
    if (!place.id || !place.displayName?.text || latitude === undefined || longitude === undefined) return [];
    return [{
      id: place.id,
      name: place.displayName.text,
      latitude,
      longitude,
      address: place.formattedAddress,
    }];
  });
}
