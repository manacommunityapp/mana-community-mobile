import { AccessibilityProps } from 'react-native';

export function a11yButton(label: string, hint?: string): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: 'button',
    accessibilityLabel: label,
    ...(hint ? { accessibilityHint: hint } : {}),
  };
}

export function a11yHeader(label: string): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: 'header',
    accessibilityLabel: label,
  };
}

export function a11yImage(label: string): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: 'image',
    accessibilityLabel: label,
  };
}

export function a11yTab(label: string, selected: boolean): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: 'tab',
    accessibilityLabel: label,
    accessibilityState: { selected },
  };
}

export function a11yLink(label: string): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: 'link',
    accessibilityLabel: label,
  };
}

export function a11yAlert(label: string): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: 'alert',
    accessibilityLabel: label,
  };
}
