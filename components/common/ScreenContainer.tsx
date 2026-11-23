import React from 'react';
import {
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { useAppTheme } from '@/context/ThemeContext';
import { StitchBackground } from './StitchBackground';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: Edge[];
  showGlow?: boolean;
}

/**
 * ScreenContainer
 * Wraps any screen in the official Google Stitch background & ambient glow,
 * honoring the Stitch lavender-white (#FAF8FF) surface palette and edge insets.
 */
export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  style,
  contentStyle,
  edges = ['top'],
  showGlow = true,
}) => {
  const { isDark } = useAppTheme();

  return (
    <StitchBackground showGlow={showGlow} style={[styles.root, style]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView edges={edges} style={[styles.safeArea, contentStyle]}>
        {children}
      </SafeAreaView>
    </StitchBackground>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
});

export default ScreenContainer;
