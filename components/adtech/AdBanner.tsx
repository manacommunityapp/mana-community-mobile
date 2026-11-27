import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, RADIUS, SPACING } from '@/constants/config';
import { adtechService } from '@/services/adtechService';
import type { AdResponse } from '@/types/adtech';

interface AdBannerProps {
  placementId: string;
  userId: string;
  societyId: string;
  city: string;
  flatType: string;
}

export function AdBanner({
  placementId,
  userId,
  societyId,
  city,
  flatType,
}: AdBannerProps) {
  const [loading, setLoading] = useState(true);
  const [ad, setAd] = useState<AdResponse | null>(null);
  const impressionFiredRef = useRef(false);

  const loadAd = useCallback(async () => {
    setLoading(true);
    impressionFiredRef.current = false;
    try {
      const response = await adtechService.requestAd({
        placementId,
        userId,
        societyId,
        city,
        flatType,
      });
      if (!response) {
        setAd(null);
        setLoading(false);
        return;
      }
      const delay = response.budgetPacingDelayMs ?? 0;
      if (delay > 0) {
        setTimeout(() => {
          setAd(response);
          setLoading(false);
        }, delay);
      } else {
        setAd(response);
        setLoading(false);
      }
    } catch {
      setAd(null);
      setLoading(false);
    }
  }, [placementId, userId, societyId, city, flatType]);

  useEffect(() => {
    void loadAd();
  }, [loadAd]);

  const handleImageLoad = useCallback(() => {
    if (!impressionFiredRef.current && ad) {
      impressionFiredRef.current = true;
      void adtechService.fireImpression({
        impressionId: ad.impressionId,
        campaignId: ad.campaignId,
        userId,
        societyId,
        placementId,
        firedAt: new Date().toISOString(),
      });
    }
  }, [ad, userId, societyId, placementId]);

  const handleCtaPress = useCallback(() => {
    if (!ad) return;
    void adtechService.fireClick(ad.impressionId, ad.campaignId);
    void Linking.openURL(ad.creative.ctaUrl);
  }, [ad]);

  if (loading) {
    return (
      <View style={styles.skeleton}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  if (!ad) return null;

  const { creative, freqCapRemaining } = ad;

  return (
    <View style={styles.card}>
      <View style={styles.mediaWrap}>
        <Image
          source={{ uri: creative.assetUrl }}
          style={styles.bannerImage}
          resizeMode="cover"
          onLoad={handleImageLoad}
        />
        {creative.brandName ? (
          <View style={styles.brandBadge}>
            <Text style={styles.brandText}>{creative.brandName}</Text>
          </View>
        ) : null}
        <View style={styles.adBadge}>
          <Text style={styles.adBadgeText}>
            {freqCapRemaining === 1 ? 'Ad · Last today' : 'Ad'}
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        {creative.headline ? (
          <Text style={styles.headline} numberOfLines={1}>
            {creative.headline}
          </Text>
        ) : null}
        <TouchableOpacity style={styles.ctaButton} onPress={handleCtaPress}>
          <Text style={styles.ctaText}>{creative.ctaText ?? 'Learn More'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    height: 180,
    borderRadius: RADIUS.lg ?? 12,
    backgroundColor: COLORS.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.sm ?? 8,
  },
  card: {
    borderRadius: RADIUS.lg ?? 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
    marginVertical: SPACING.sm ?? 8,
  },
  mediaWrap: {
    position: 'relative',
    height: 170,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  brandBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  brandText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
  },
  adBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  adBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    gap: 8,
  },
  headline: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  ctaButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
