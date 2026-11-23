import { useRef, useEffect } from 'react';
import { Image, View, Animated, StyleSheet, ImageStyle, ViewStyle, StyleProp } from 'react-native';
import { useAdaptiveImage } from '@/hooks/useAdaptiveImage';
import { resolveImageUrl, getImageHeaders } from '@/utils/imageUrlUtils';

interface Props {
  uri: string;
  reducedUri?: string;
  placeholderColor?: string;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  headers?: Record<string, string>;
}

function appendQuality(uri: string, quality: 'full' | 'reduced'): string {
  if (quality === 'reduced' && !uri.includes('?')) return `${uri}?q=50&w=400`;
  return uri;
}

export function AdaptiveImage({ uri, reducedUri, placeholderColor = '#E2E8F0', style, containerStyle }: Props) {
  const quality = useAdaptiveImage();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    opacity.setValue(0);
  }, [uri, quality, opacity]);

  if (quality === 'placeholder') {
    return <View style={[style as ViewStyle, { backgroundColor: placeholderColor }, containerStyle]} />;
  }

  const rawTargetUri =
    quality === 'reduced'
      ? (reducedUri ?? appendQuality(uri, 'reduced'))
      : uri;
  const resolvedUri = resolveImageUrl(rawTargetUri);
  const authHeaders = headers ?? getImageHeaders(resolvedUri);

  return (
    <View style={containerStyle}>
      <Animated.Image
        source={{ uri: resolvedUri, ...(authHeaders ? { headers: authHeaders } : {}) }}
        style={[style, { opacity }]}
        onLoad={() =>
          Animated.timing(opacity, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }).start()
        }
        resizeMode="cover"
      />
    </View>
  );
}
