import { Image as ExpoImage, ImageProps as ExpoImageProps, ImageContentFit } from 'expo-image';
import { ImageSourcePropType, ImageStyle, StyleProp } from 'react-native';

const RESIZE_MAP: Record<string, ImageContentFit> = {
  cover: 'cover',
  contain: 'contain',
  stretch: 'fill',
  center: 'none',
};

type CachedImageProps = {
  source: ImageSourcePropType | { uri: string } | string | number;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  accessibilityLabel?: string;
  onError?: () => void;
};

export function CachedImage({ source, style, resizeMode = 'cover', accessibilityLabel, onError }: CachedImageProps) {
  let src: ExpoImageProps['source'];
  if (typeof source === 'string') {
    src = { uri: source };
  } else if (typeof source === 'number') {
    src = source;
  } else if (source && 'uri' in source) {
    src = { uri: (source as { uri: string }).uri };
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
