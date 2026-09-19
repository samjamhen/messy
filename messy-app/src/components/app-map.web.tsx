// Maps are native-only; keep the native library out of the web bundle.
import type { Region } from 'react-native-maps';
import type { Restaurant } from '@/services/restaurants';

type Props = {
  restaurants: Restaurant[];
  selected: Restaurant | null;
  onRegionChange: (region: Region) => void;
  onSelect: (restaurant: Restaurant) => void;
};

export default function AppMap(_props: Props) {
  return null;
}
