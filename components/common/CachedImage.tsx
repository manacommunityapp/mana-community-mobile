import { Image as ExpoImage, ImageProps as ExpoImageProps, ImageContentFit } from 'expo-image';
import { ImageSourcePropType, ImageStyle, StyleProp } from 'react-native';
import { resolveImageUrl, getImageHeaders } from '@/utils/imageUrlUtils';

const RESIZE_MAP: Record<string, ImageContentFit> = {
  cover: 'cover',
  contain: 'contain',
  stretch: 'fill',
  center: 'none',
};

type CachedImageProps = {
  source: ImageSourcePropType | { uri: string; headers?: Record<string, string> } | string | number;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  accessibilityLabel?: string;
  onError?: () => void;
};

export function CachedImage({ source, style, resizeMode = 'cover', accessibilityLabel, onError }: CachedImageProps) {
  let src: ExpoImageProps['source'];
  if (typeof source === 'string') {
    const uri = resolveImageUrl(source);
    const headers = getImageHeaders(uri);
    src = headers ? { uri, headers } : { uri };
  } else if (typeof source === 'number') {
    src = source;
  } else if (source && typeof source === 'object' && 'uri' in source) {
    const rawUri = (source as { uri: string }).uri;
    const uri = resolveImageUrl(rawUri);
    const headers = (source as any).headers || getImageHeaders(uri);
    src = headers ? { ...(source as object), uri, headers } : { ...(source as object), uri };
  } else {
    src = source as ExpoImageProps['source'];
  }

  return (
    <ExpoImage
      source={src}
      style={style}
      contentFit={RESIZE_MAP[resizeMode] || 'cover'}
      transition={200}
      cachePolicy="memory-disk"
      accessibilityLabel={accessibilityLabel}
      onError={onError}
    />
  );
}
