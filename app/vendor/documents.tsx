import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { DocumentList } from '@/components/documents/DocumentList';

export default function VendorDocumentsScreen() {
  const { vendorId } = useLocalSearchParams<{ vendorId?: string }>();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'KYC Documents', headerBackTitle: '' }} />
      <DocumentList
        entityType="VENDOR"
        entityId={vendorId}
        allowUpload
        defaultCategory="VENDOR_KYC"
        emptyMessage="No KYC documents uploaded yet. Tap + to add your first document."
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
});
