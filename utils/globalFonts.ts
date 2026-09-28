import { Text, TextInput } from 'react-native';
import type { TextStyle } from 'react-native';
import { FONTS } from '@/constants/config';

/**
 * Returns the correct font file name for a given weight.
 * On Android, fontWeight alone does NOT resolve custom font variants —
 * you must set fontFamily explicitly to the exact loaded font name.
 */
export function fontForWeight(weight?: TextStyle['fontWeight'], display = false): string {
  if (display) {
    switch (weight) {
      case '800': case '900': case 'bold': return FONTS.displayEB;
      case '700': return FONTS.displayBold;
      case '600': return FONTS.displaySemi;
      default: return FONTS.displayReg;
    }
  }
  switch (weight) {
    case '700': case '800': case '900': case 'bold': return FONTS.bold;
    case '600': return FONTS.semiBold;
    case '500': return FONTS.medium;
    default: return FONTS.regular;
  }
}

export function setupGlobalFonts() {
  const base: TextStyle = { fontFamily: FONTS.regular };
  const tp = (Text as any).defaultProps ?? {};
  (Text as any).defaultProps = { ...tp, style: tp.style ? [base, tp.style] : base };
  const tip = (TextInput as any).defaultProps ?? {};
  (TextInput as any).defaultProps = { ...tip, style: tip.style ? [base, tip.style] : base };
}
