import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/context/ThemeContext';

interface StitchBackgroundProps extends ViewProps {
  children?: React.ReactNode;
  /** Whether to show the top decorative ambient light radial/linear glow (from Stitch design) */
  showGlow?: boolean;
}

/**
 * StitchBackground
 * Implements the authentic Google Stitch lavender-white background with subtle ambient glow
 * Palette tokens:
 * - background / surface: #FAF8FF
 * - surface-container-low: #F2F3FF
 * - ambient glow: #2FE0AA (tertiary-fixed-dim/20) to #DBE1FF (primary-fixed/30)
 */
export const StitchBackground: React.FC<StitchBackgroundProps> = ({
  children,
  showGlow = true,
  style,
  ...props
}) => {
  const { palette, isDark } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: palette.appBg }, style]} {...props}>
      {/* Background base vertical subtle gradient */}
      <LinearGradient
        colors={isDark ? ['#06081A', '#0B0F2E'] : ['#FAF8FF', '#F2F3FF', '#FAF8FF']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative ambient blurred glow top-right from Stitch CSS design */}
      {showGlow && !isDark && (
        <>
          <View style={styles.topRightGlowWrapper} pointerEvents="none">
            <LinearGradient
              colors={['rgba(47, 224, 170, 0.18)', 'rgba(219, 225, 255, 0.28)', 'rgba(250, 248, 255, 0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.topRightGlow}
            />
          </View>
          <View style={styles.bottomLeftGlowWrapper} pointerEvents="none">
            <LinearGradient
              colors={['rgba(219, 225, 255, 0.22)', 'rgba(47, 224, 170, 0.08)', 'rgba(250, 248, 255, 0)']}
              start={{ x: 0.2, y: 0.2 }}
              end={{ x: 1, y: 1 }}
              style={styles.bottomLeftGlow}
            />
          </View>
        </>
      )}

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  topRightGlowWrapper: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    overflow: 'hidden',
  },
  topRightGlow: {
    flex: 1,
    borderRadius: 110,
  },
  bottomLeftGlowWrapper: {
    position: 'absolute',
    bottom: 60,
    left: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
    overflow: 'hidden',
  },
  bottomLeftGlow: {
    flex: 1,
    borderRadius: 120,
  },
});

export default StitchBackground;
