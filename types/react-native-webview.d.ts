// Minimal type shim for react-native-webview
declare module 'react-native-webview' {
  import { Component } from 'react';
  import { ViewStyle, StyleProp } from 'react-native';

  export interface WebViewProps {
    source?: { uri?: string; html?: string; headers?: Record<string, string> };
    style?: StyleProp<ViewStyle>;
    onLoad?: () => void;
    onError?: (event: unknown) => void;
    onMessage?: (event: { nativeEvent: { data: string } }) => void;
    injectedJavaScript?: string;
    javaScriptEnabled?: boolean;
    domStorageEnabled?: boolean;
    allowsFullscreenVideo?: boolean;
    mediaPlaybackRequiresUserAction?: boolean;
    scrollEnabled?: boolean;
    [key: string]: unknown;
  }

  export class WebView extends Component<WebViewProps> {}
}
