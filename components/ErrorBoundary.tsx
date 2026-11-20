import React from 'react';
import {
  Alert,
  Clipboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getLastCorrelationId } from '@/services/apiClient';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  correlationId?: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      hasError: true,
      errorMessage: msg,
      correlationId: getLastCorrelationId(),
    };
  }

  handleCopy = () => {
    const ref = this.state.correlationId ?? 'unknown';
    Clipboard.setString(ref);
    Alert.alert('Copied', 'Reference ID copied to clipboard');
  };

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '', correlationId: undefined });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          {this.props.fallbackTitle ?? 'Something went wrong'}
        </Text>
        <Text style={styles.message}>{this.state.errorMessage}</Text>
        {this.state.correlationId && (
          <Text style={styles.ref}>Reference: {this.state.correlationId}</Text>
        )}
        <View style={styles.actions}>
          {this.state.correlationId && (
            <TouchableOpacity style={styles.btn} onPress={this.handleCopy}>
              <Text style={styles.btnText}>Copy reference</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={this.handleReset}>
            <Text style={[styles.btnText, styles.btnPrimaryText]}>Try again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 8 },
  ref: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 12 },
  btn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#D1D5DB',
  },
  btnPrimary: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  btnText: { fontSize: 14, color: '#374151' },
  btnPrimaryText: { color: '#fff' },
});
