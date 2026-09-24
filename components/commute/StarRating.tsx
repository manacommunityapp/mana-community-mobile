import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface Props {
  rating: number;
  onRate?: (score: number) => void;
  size?: number;
  readonly?: boolean;
}

export function StarRating({ rating, onRate, size = 28, readonly = false }: Props) {
  return (
    <View style={s.row}>
      {[1, 2, 3, 4, 5].map(star => {
        const filled = star <= Math.round(rating);
        const StarView = readonly ? View : TouchableOpacity;
        return (
          <StarView
            key={star}
            onPress={!readonly && onRate ? () => onRate(star) : undefined}
            style={{ padding: 2 }}
          >
            <Text style={{ fontSize: size, opacity: filled ? 1 : 0.25 }}>
              ⭐
            </Text>
          </StarView>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
