import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { jewelleryService, JewelleryWishlistItem } from '@/services/jewelleryService';

export default function JewelleryWishlistScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: wishlist = [], isLoading, refetch } = useQuery({
    queryKey: ['jewellery-wishlist'],
    queryFn: jewelleryService.getWishlist,
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => jewelleryService.removeFromWishlist(productId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jewellery-wishlist'] }),
    onError: () => Alert.alert('Error', 'Failed to remove from wishlist.'),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {wishlist.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="heart-outline" size={56} color="#C7D2FE" />
          <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
          <Text style={styles.emptySub}>Save jewellery you love to view later and get price alerts.</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/jewellery')}>
            <Text style={styles.browseBtnText}>Browse Jewellery</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={wishlist}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item }: { item: JewelleryWishlistItem }) => (
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.cardLeft}
                onPress={() => router.push(`/jewellery/${item.productId}`)}
              >
                {item.product?.imageUrls?.[0] ? (
                  <Image source={{ uri: item.product.imageUrls[0] }} style={styles.productImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="diamond-outline" size={24} color="#C7D2FE" />
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cardBody}
                onPress={() => router.push(`/jewellery/${item.productId}`)}
              >
                <Text style={styles.productName} numberOfLines={2}>{item.product?.name}</Text>
                <Text style={styles.vendorName}>{item.product?.vendorName}</Text>
                {item.product?.purity && (
                  <Text style={styles.purity}>{item.product.purity}</Text>
                )}
                <Text style={styles.price}>
                  ₹{item.product?.totalPrice?.toLocaleString('en-IN')}
                </Text>
              </TouchableOpacity>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.tryOnBtn}
                  onPress={() =>
                    router.push({ pathname: '/jewellery/try-on', params: { productId: item.productId } })
                  }
                >
                  <Ionicons name="camera-outline" size={14} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() =>
                    Alert.alert('Remove from Wishlist?', item.product?.name, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => removeMutation.mutate(item.productId) },
                    ])
                  }
                >
                  <Ionicons name="heart" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FDF8F0' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: SPACING.md },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  emptySub: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  browseBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.md, marginTop: 8 },
  browseBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  card: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg, marginBottom: 12,
    borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', ...SHADOWS.sm,
  },
  cardLeft: {},
  productImage: { width: 96, height: 110, resizeMode: 'cover' },
  imagePlaceholder: { width: 96, height: 110, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF9EC' },
  cardBody: { flex: 1, padding: 10, justifyContent: 'center' },
  productName: { fontSize: 13, fontWeight: '700', color: '#0F172A', lineHeight: 18, marginBottom: 2 },
  vendorName: { fontSize: 11, color: '#64748B', marginBottom: 2 },
  purity: { fontSize: 10, color: '#B45309', fontWeight: '600', marginBottom: 4 },
  price: { fontSize: 14, fontWeight: '900', color: '#B45309' },
  cardActions: { justifyContent: 'space-between', padding: 10, alignItems: 'center' },
  tryOnBtn: {
    backgroundColor: COLORS.primaryLight, padding: 8, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.primaryMid,
  },
  removeBtn: {
    backgroundColor: '#FEF2F2', padding: 8, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: '#FECACA',
  },
});
