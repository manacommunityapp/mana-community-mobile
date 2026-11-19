import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DocumentDto, DocumentCategory } from '@/services/documentService';
import { useDocumentList } from '@/hooks/useDocumentList';
import { DocumentCard } from './DocumentCard';
import { DocumentUploadSheet } from './DocumentUploadSheet';

interface DocumentListProps {
  entityType?: string;
  entityId?: string | number;
  category?: DocumentCategory;
  allowUpload?: boolean;
  defaultCategory?: DocumentCategory;
  emptyMessage?: string;
}

export function DocumentList({
  entityType,
  entityId,
  category,
  allowUpload = false,
  defaultCategory,
  emptyMessage = 'No documents found.',
}: DocumentListProps) {
  const { documents, loading, error, reload } = useDocumentList({
    entityType,
    entityId,
    category,
  });
  const [uploadVisible, setUploadVisible] = useState(false);
  const [docs, setDocs] = useState<DocumentDto[]>(documents);

  // Sync state with hook
  React.useEffect(() => {
    setDocs(documents);
  }, [documents]);

  const handleUploaded = (doc: DocumentDto) => {
    setDocs((prev) => [doc, ...prev]);
    setUploadVisible(false);
  };

  const handleDelete = (deleted: DocumentDto) => {
    setDocs((prev) => prev.filter((d) => d.id !== deleted.id));
  };

  if (loading && docs.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={reload}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={docs}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <DocumentCard
            document={item}
            onAddVersion={allowUpload ? () => {} : undefined}
            onDelete={allowUpload ? handleDelete : undefined}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={reload} tintColor="#2563EB" />
        }
        contentContainerStyle={docs.length === 0 ? styles.emptyContainer : styles.listContent}
      />

      {allowUpload && (
        <>
          <TouchableOpacity style={styles.fab} onPress={() => setUploadVisible(true)}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>

          <DocumentUploadSheet
            visible={uploadVisible}
            onClose={() => setUploadVisible(false)}
            entityType={entityType}
            entityId={entityId}
            defaultCategory={defaultCategory ?? category}
            onUploaded={handleUploaded}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flexGrow: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#2563EB',
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});

export default DocumentList;
