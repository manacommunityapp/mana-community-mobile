import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

export type SupportedBrand =
  | 'whatsapp'
  | 'amazon'
  | 'upi'
  | 'googlepay'
  | 'applepay'
  | 'fedex'
  | 'ups'
  | 'dhl';

export interface BrandIconProps {
  brand: SupportedBrand;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function UpiLogo({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M10 36L24 12H30L16 36H10Z" fill="#097939" />
      <Path d="M22 36L36 12H39L25 36H22Z" fill="#ED752E" />
    </Svg>
  );
}

export function BrandIcon({ brand, size = 18, color, style }: BrandIconProps) {
  switch (brand) {
    case 'whatsapp':
      return <FontAwesome6 name="whatsapp" size={size} color={color || '#25D366'} style={style} />;
    case 'amazon':
      return <FontAwesome6 name="amazon" size={size} color={color || '#FF9900'} style={style} />;
    case 'upi':
      return (
        <View style={style}>
          <UpiLogo size={size} />
        </View>
      );
    case 'googlepay':
      return <FontAwesome6 name="google-pay" size={size} color={color || '#4285F4'} style={style} />;
    case 'applepay':
      return <FontAwesome6 name="apple-pay" size={size} color={color || '#000000'} style={style} />;
    case 'fedex':
      return <FontAwesome6 name="fedex" size={size} color={color || '#4D148C'} style={style} />;
    case 'ups':
      return <FontAwesome6 name="ups" size={size} color={color || '#351C15'} style={style} />;
    case 'dhl':
      return <FontAwesome6 name="dhl" size={size} color={color || '#D40511'} style={style} />;
    default:
      return null;
  }
}

export function getBrandIconForText(
  text?: string,
  size = 16,
  style?: StyleProp<ViewStyle>
): React.ReactNode | null {
  if (!text) return null;
  const s = text.toLowerCase();
  if (s.includes('amazon') || s.includes('amzn')) {
    return <BrandIcon brand="amazon" size={size} style={style} />;
  }
  if (s.includes('whatsapp') || s.includes('wa.me')) {
    return <BrandIcon brand="whatsapp" size={size} style={style} />;
  }
  if (s.includes('upi') || s.includes('bhim') || s.includes('phonepe') || s.includes('paytm')) {
    return <BrandIcon brand="upi" size={size} style={style} />;
  }
  if (s.includes('google pay') || s.includes('gpay')) {
    return <BrandIcon brand="googlepay" size={size} style={style} />;
  }
  if (s.includes('apple pay')) {
    return <BrandIcon brand="applepay" size={size} style={style} />;
  }
  if (s.includes('fedex')) {
    return <BrandIcon brand="fedex" size={size} style={style} />;
  }
  if (s.includes('ups')) {
    return <BrandIcon brand="ups" size={size} style={style} />;
  }
  if (s.includes('dhl')) {
    return <BrandIcon brand="dhl" size={size} style={style} />;
  }
  return null;
}
