import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { DocumentList } from '@/components/documents/DocumentList';

export default function DocumentsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'My Documents', headerBackTitle: '' }} />
      <DocumentList
        allowUpload
        emptyMessage="No documents uploaded yet. Tap + to add your first document."
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
