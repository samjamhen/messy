import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';

import { INITIAL_MAP_REGION } from '@/constants/map';
import type { Restaurant } from '@/services/restaurants';

type Props = {
  restaurants: Restaurant[];
  selected: Restaurant | null;
  onRegionChange: (region: Region) => void;
  onSelect: (restaurant: Restaurant) => void;
};

export default function AppMap({ restaurants, selected, onRegionChange, onSelect }: Props) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (selected) {
      mapRef.current?.animateToRegion({
        latitude: selected.latitude,
        longitude: selected.longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      }, 350);
    }
  }, [selected]);

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_GOOGLE}
      style={styles.map}
      initialRegion={INITIAL_MAP_REGION}
      onRegionChangeComplete={onRegionChange}
      showsCompass
      showsScale
    >
      {restaurants.map((restaurant) => (
        <Marker
          key={restaurant.id}
          coordinate={{ latitude: restaurant.latitude, longitude: restaurant.longitude }}
          title={restaurant.name}
          description={restaurant.address}
          onPress={() => onSelect(restaurant)}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, width: '100%' },
});
