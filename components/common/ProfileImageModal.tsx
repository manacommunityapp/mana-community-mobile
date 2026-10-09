import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CachedImage } from '@/components/common/CachedImage';
import { COLORS, RADIUS, FONTS, getInitials } from '@/constants/config';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export interface ProfileImageModalProps {
  visible: boolean;
  onClose: () => void;
  imageUrl?: string | null;
  name?: string;
  subtitle?: string;
}

export function ProfileImageModal({
  visible,
  onClose,
  imageUrl,
  name,
  subtitle,
}: ProfileImageModalProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (visible) {
      setHasError(false);
    }
  }, [visible, imageUrl]);

  if (!visible) return null;

  const validUrl =
    !hasError &&
    !!imageUrl &&
    typeof imageUrl === 'string' &&
    imageUrl.trim().length > 0 &&
    !imageUrl.includes('null') &&
    !imageUrl.includes('undefined');

  const displayName = name || 'Profile Photo';
  const initials = getInitials(displayName);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        {/* Tap outside to dismiss */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdropTouchArea} />
        </TouchableWithoutFeedback>

        {/* Modal Card Content */}
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerInfo}>
              <Text style={styles.name} numberOfLines={1}>
                {displayName}
              </Text>
              {!!subtitle && (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
              accessibilityLabel="Close profile photo preview"
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Photo Canvas */}
          <View style={styles.imageCanvas}>
            {validUrl ? (
              <CachedImage
                source={imageUrl}
                style={styles.image}
                resizeMode="contain"
                onError={() => setHasError(true)}
              />
            ) : (
              <LinearGradient
                colors={['#4338CA', '#4F46E5', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.fallbackContainer}
              >
                <View style={styles.fallbackCircle}>
                  <Text style={styles.fallbackInitials}>{initials}</Text>
                </View>
                <Text style={styles.fallbackText}>No photo available</Text>
              </LinearGradient>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdropTouchArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: '100%',
    maxWidth: Math.min(SCREEN_W - 32, 420),
    backgroundColor: '#1E1B4B',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.5,
        shadowRadius: 28,
      },
      android: {
        elevation: 18,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  headerInfo: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: FONTS?.bold || 'System',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '500',
    marginTop: 2,
    fontFamily: FONTS?.regular || 'System',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageCanvas: {
    width: '100%',
    height: Math.min(SCREEN_W * 0.88, SCREEN_H * 0.55),
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  fallbackCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  fallbackInitials: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  fallbackText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
});
