import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { groupBuyingService } from '../../../services/groupBuyingService';
import { DemandPool, VendorOffer } from '../../../types/groupBuying';

export default function DemandDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [demand, setDemand] = useState<DemandPool | null>(null);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => {
    loadDemand();
  }, [id]);

  const loadDemand = async () => {
    if (!id) return;
    try {
      const data = await groupBuyingService.getDemandById(id);
      setDemand(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async () => {
    if (!demand) return;
    try {
      await groupBuyingService.upvoteDemand(demand.id);
      setDemand(prev => prev ? {
        ...prev,
        upvotes: prev.hasUpvoted ? prev.upvotes - 1 : prev.upvotes + 1,
        hasUpvoted: !prev.hasUpvoted,
        interestedResidents: prev.hasUpvoted ? (prev.interestedResidents || 1) - 1 : (prev.interestedResidents || 0) + 1,
      } : null);
    } catch (e) {
      Alert.alert('Error', 'Could not upvote demand');
    }
  };

  const handleAcceptOffer = async (offer: VendorOffer) => {
    if (!demand) return;
    Alert.alert(
      'Convert to Community Deal',
      `Form a collective group deal with ${offer.vendorName} at ₹${offer.pricePerUnit}/unit?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept & Launch Deal',
          onPress: async () => {
            try {
              setAcceptingId(offer.id);
              const deal = await groupBuyingService.acceptVendorOffer(demand.id, offer.id);
              Alert.alert('Success!', 'Group deal created from community demand.', [
                {
                  text: 'View Deal',
                  onPress: () => router.replace(`/group-buying/${deal.id}` as any),
                },
              ]);
            } catch (e) {
              Alert.alert('Error', 'Failed to accept vendor offer');
            } finally {
              setAcceptingId(null);
            }
          },
        },
      ]
    );
  };

  if (loading || !demand) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Demand & Vendor Offers',
          headerBackTitle: 'Demands',
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Hero Product Banner */}
        {demand.imageUrl && (
          <Image source={{ uri: demand.imageUrl }} style={styles.heroImage} />
        )}

        {/* Demand Info Header */}
        <View style={styles.card}>
          <View style={styles.badgeRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{demand.category}</Text>
            </View>
            <View style={[styles.statusBadge, demand.status === 'VENDOR_BIDDING' ? styles.biddingBadge : styles.gatheringBadge]}>
              <Text style={styles.statusText}>
                {demand.status === 'VENDOR_BIDDING' ? '3 Vendor Bids Live' : 'Gathering Demand'}
              </Text>
            </View>
          </View>

          <Text style={styles.title}>{demand.productName}</Text>
          <Text style={styles.description}>{demand.description}</Text>

          <View style={styles.metaDivider} />

          {/* Aggregated Community Request Metrics */}
          <Text style={styles.sectionHeading}>Pooled Community Demand</Text>
          <View style={styles.gridStats}>
            <View style={styles.statBox}>
              <Ionicons name="people" size={20} color="#059669" />
              <Text style={styles.statNumber}>{demand.interestedResidents}</Text>
              <Text style={styles.statLabel}>Interested Residents</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="cart" size={20} color="#0284c7" />
              <Text style={styles.statNumber}>{demand.expectedQuantity}</Text>
              <Text style={styles.statLabel}>Expected Units</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="pricetag" size={20} color="#d97706" />
              <Text style={styles.statNumber}>₹{demand.preferredPriceMin}–₹{demand.preferredPriceMax}</Text>
              <Text style={styles.statLabel}>Target Price Range</Text>
            </View>
          </View>

          {demand.preferredBrands && demand.preferredBrands.length > 0 && (
            <View style={styles.brandRow}>
              <Text style={styles.brandLabel}>Preferred Brands: </Text>
              <View style={styles.brandPills}>
                {demand.preferredBrands.map((b, i) => (
                  <View key={i} style={styles.brandPill}>
                    <Text style={styles.brandPillText}>{b}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.upvoteButton, demand.hasUpvoted && styles.upvotedButton]}
            onPress={handleUpvote}
          >
            <Ionicons
              name={demand.hasUpvoted ? 'thumbs-up' : 'thumbs-up-outline'}
              size={18}
              color={demand.hasUpvoted ? '#ffffff' : '#059669'}
            />
            <Text style={[styles.upvoteText, demand.hasUpvoted && styles.upvotedText]}>
              {demand.hasUpvoted ? `Joined Demand (${demand.upvotes})` : `I Want This Too (${demand.upvotes})`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Vendor Competition & Selection Engine */}
        <View style={styles.vendorSection}>
          <View style={styles.vendorHeaderRow}>
            <View>
              <Text style={styles.vendorSectionTitle}>Community Vendor Selection Engine</Text>
              <Text style={styles.vendorSectionSubtitle}>
                Ranked by multi-criteria composite score (Price, Quality, On-time & Fulfillment rates)
              </Text>
            </View>
          </View>

          {demand.vendorOffers && demand.vendorOffers.length > 0 ? (
            demand.vendorOffers.map((offer, idx) => {
              const isBest = offer.scoring?.isBestValue;
              return (
                <View
                  key={offer.id}
                  style={[
                    styles.offerCard,
                    isBest ? styles.bestOfferCard : styles.standardOfferCard,
                  ]}
                >
                  {isBest && (
                    <View style={styles.bestValueRibbon}>
                      <Ionicons name="trophy" size={14} color="#ffffff" />
                      <Text style={styles.bestValueRibbonText}>
                        COMMUNITY BEST VALUE (Score: {offer.scoring?.compositeScore}/100)
                      </Text>
                    </View>
                  )}

                  <View style={styles.offerHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.vendorNameRow}>
                        <Text style={styles.vendorName}>{offer.vendorName}</Text>
                        {offer.isVerified && (
                          <MaterialCommunityIcons name="check-decagram" size={18} color="#059669" />
                        )}
                      </View>
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={14} color="#f59e0b" />
                        <Text style={styles.ratingText}>{offer.vendorRating.toFixed(1)} Rating</Text>
                        <Text style={styles.metaDot}>•</Text>
                        <Text style={styles.deliveryDaysText}>Delivery: {offer.estimatedDeliveryDays} days</Text>
                      </View>
                    </View>

                    <View style={styles.priceContainer}>
                      <Text style={styles.offerPrice}>₹{offer.pricePerUnit}</Text>
                      <Text style={styles.offerUnit}>/ unit</Text>
                      <Text style={styles.offerMoq}>MOQ: {offer.moq} units</Text>
                    </View>
                  </View>

                  {/* Multi-Criteria Reliability Matrix */}
                  <View style={styles.reliabilityMatrix}>
                    <View style={styles.matrixItem}>
                      <Text style={styles.matrixValue}>{offer.fulfillmentRate}%</Text>
                      <Text style={styles.matrixLabel}>Fulfillment</Text>
                    </View>
                    <View style={styles.matrixItem}>
                      <Text style={styles.matrixValue}>{offer.onTimeRate}%</Text>
                      <Text style={styles.matrixLabel}>On-Time</Text>
                    </View>
                    <View style={styles.matrixItem}>
                      <Text style={styles.matrixValue}>{offer.cancellationRate}%</Text>
                      <Text style={styles.matrixLabel}>Cancellation</Text>
                    </View>
                    <View style={styles.matrixItem}>
                      <Text style={styles.matrixValue}>{offer.qualityScore}/5</Text>
                      <Text style={styles.matrixLabel}>Quality</Text>
                    </View>
                  </View>

                  {/* Score Breakdown Bar */}
                  {offer.scoring && (
                    <View style={styles.scoreBarContainer}>
                      <View style={styles.scoreBarHeader}>
                        <Text style={styles.scoreBarTitle}>Match Score Breakdown</Text>
                        <Text style={styles.scoreBarValue}>{offer.scoring.compositeScore}% Match</Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${offer.scoring.compositeScore}%`,
                              backgroundColor: isBest ? '#059669' : '#64748b',
                            },
                          ]}
                        />
                      </View>
                    </View>
                  )}

                  {offer.notes && (
                    <Text style={styles.offerNotes}>“{offer.notes}”</Text>
                  )}

                  {/* Action Button */}
                  <TouchableOpacity
                    style={[
                      styles.acceptButton,
                      isBest ? styles.bestAcceptButton : styles.secondaryAcceptButton,
                    ]}
                    disabled={acceptingId === offer.id}
                    onPress={() => handleAcceptOffer(offer)}
                  >
                    {acceptingId === offer.id ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons
                          name="flash"
                          size={16}
                          color={isBest ? '#ffffff' : '#059669'}
                        />
                        <Text
                          style={[
                            styles.acceptButtonText,
                            !isBest && styles.secondaryAcceptButtonText,
                          ]}
                        >
                          {isBest ? 'Select Best Value & Launch' : 'Select This Offer'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          ) : (
            <View style={styles.noOffersCard}>
              <Ionicons name="storefront-outline" size={40} color="#94a3b8" />
              <Text style={styles.noOffersTitle}>Bidding in Progress</Text>
              <Text style={styles.noOffersText}>
                Mana has broadcast this demand to verified suppliers. Offers will appear here shortly with algorithmic Best Value ranking.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 40 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroImage: { width: '100%', height: 200, resizeMode: 'cover' },
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  categoryBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  biddingBadge: { backgroundColor: '#ecfdf5' },
  gatheringBadge: { backgroundColor: '#fef3c7' },
  statusText: { fontSize: 12, fontWeight: '700', color: '#059669' },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  description: { fontSize: 14, color: '#64748b', lineHeight: 20 },
  metaDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 14 },
  sectionHeading: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 10 },
  gridStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  statBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statNumber: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  statLabel: { fontSize: 10, color: '#64748b', marginTop: 2, textAlign: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' },
  brandLabel: { fontSize: 12, fontWeight: '600', color: '#475569' },
  brandPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  brandPill: { backgroundColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  brandPillText: { fontSize: 11, color: '#334155', fontWeight: '600' },
  upvoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#059669',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 8,
  },
  upvotedButton: { backgroundColor: '#059669' },
  upvoteText: { fontSize: 14, fontWeight: '700', color: '#059669' },
  upvotedText: { color: '#ffffff' },
  vendorSection: { marginTop: 20, paddingHorizontal: 16 },
  vendorHeaderRow: { marginBottom: 12 },
  vendorSectionTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  vendorSectionSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  offerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  bestOfferCard: {
    borderColor: '#059669',
    borderWidth: 2,
    backgroundColor: '#ffffff',
  },
  standardOfferCard: {
    borderColor: '#e2e8f0',
    borderWidth: 1,
  },
  bestValueRibbon: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 12,
    gap: 6,
  },
  bestValueRibbonText: { color: '#ffffff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  offerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  vendorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vendorName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  metaDot: { fontSize: 12, color: '#94a3b8' },
  deliveryDaysText: { fontSize: 12, color: '#64748b' },
  priceContainer: { alignItems: 'flex-end' },
  offerPrice: { fontSize: 22, fontWeight: '800', color: '#059669' },
  offerUnit: { fontSize: 11, color: '#64748b' },
  offerMoq: { fontSize: 11, fontWeight: '600', color: '#d97706', marginTop: 2 },
  reliabilityMatrix: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 12,
  },
  matrixItem: { alignItems: 'center' },
  matrixValue: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  matrixLabel: { fontSize: 10, color: '#64748b', marginTop: 1 },
  scoreBarContainer: { marginTop: 12 },
  scoreBarHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  scoreBarTitle: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  scoreBarValue: { fontSize: 11, fontWeight: '700', color: '#059669' },
  progressBarBg: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  offerNotes: { fontSize: 12, color: '#475569', fontStyle: 'italic', marginTop: 10 },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
    gap: 6,
  },
  bestAcceptButton: { backgroundColor: '#059669' },
  secondaryAcceptButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#059669',
  },
  acceptButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  secondaryAcceptButtonText: { color: '#059669' },
  noOffersCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  noOffersTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginTop: 8 },
  noOffersText: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 6, lineHeight: 18 },
});
