import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DocumentDto, documentService } from '@/services/documentService';
import { DocumentCategoryBadge } from './DocumentCategoryBadge';
import { DocumentStatusBadge } from './DocumentStatusBadge';

interface DocumentCardProps {
  document: DocumentDto;
  onDownload?: (doc: DocumentDto) => void;
  onAddVersion?: (doc: DocumentDto) => void;
  onDelete?: (doc: DocumentDto) => void;
  onPress?: (doc: DocumentDto) => void;
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function DocumentCard({ document: doc, onDownload, onAddVersion, onDelete, onPress }: DocumentCardProps) {
  const [downloading, setDownloading] = useState(false);

  const canDownload =
    doc.scanStatus !== 'INFECTED' && doc.scanStatus !== 'PENDING' && doc.status !== 'DELETED';

  const handleDownload = async () => {
    if (!canDownload) return;
    setDownloading(true);
    try {
      const { url } = await documentService.download(doc.id);
      await Linking.openURL(url);
      onDownload?.(doc);
    } catch {
      Alert.alert('Download Failed', 'Could not open the document. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Document',
      `Delete "${doc.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await documentService.delete(doc.id);
              onDelete?.(doc);
            } catch {
              Alert.alert('Error', 'Failed to delete document.');
            }
          },
        },
      ],
    );
  };

  const metaParts: string[] = [];
  if (doc.currentVersionFilename) metaParts.push(doc.currentVersionFilename);
  if (doc.fileSizeBytes) metaParts.push(formatBytes(doc.fileSizeBytes));
  if (doc.versionCount > 1) metaParts.push(`v${doc.versionCount}`);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(doc)}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.badgeRow}>
        <DocumentCategoryBadge category={doc.category} />
        <DocumentStatusBadge status={doc.status} expiryWarning={doc.expiryWarning} />
      </View>

      <Text style={styles.title} numberOfLines={2}>{doc.title}</Text>

      {metaParts.length > 0 && (
        <Text style={styles.meta} numberOfLines={1}>
          {metaParts.join('  •  ')}
        </Text>
      )}

      {doc.expiresAt && (
        <Text style={[styles.expiry, doc.expiryWarning && styles.expiryWarn]}>
          Expires {formatDate(doc.expiresAt)}
        </Text>
      )}

      {doc.scanStatus === 'INFECTED' && (
        <Text style={styles.infected}>⚠ Virus detected — download blocked</Text>
      )}

      {doc.scanStatus === 'PENDING' && (
        <View style={styles.scanRow}>
          <ActivityIndicator size="small" color="#6B7280" />
          <Text style={styles.scanText}> Virus scan in progress…</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, !canDownload && styles.btnDisabled]}
          onPress={handleDownload}
          disabled={!canDownload || downloading}
        >
          {downloading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="download-outline" size={14} color={canDownload ? '#fff' : '#9CA3AF'} />
          )}
          <Text style={[styles.btnText, !canDownload && styles.btnTextDisabled]}>
            {downloading ? 'Opening…' : 'Download'}
          </Text>
        </TouchableOpacity>

        {onAddVersion && (
          <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => onAddVersion(doc)}>
            <Ionicons name="add-outline" size={14} color="#374151" />
            <Text style={styles.btnTextSecondary}>New Version</Text>
          </TouchableOpacity>
        )}

        {onDelete && (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 3,
  },
  meta: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 3,
  },
  expiry: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  expiryWarn: {
    color: '#B45309',
    fontWeight: '500',
  },
  infected: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
    marginBottom: 4,
  },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  scanText: {
    fontSize: 12,
    color: '#6B7280',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  btnDisabled: {
    backgroundColor: '#E5E7EB',
  },
  btnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  btnTextDisabled: {
    color: '#9CA3AF',
  },
  btnSecondary: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  btnTextSecondary: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  deleteBtn: {
    marginLeft: 'auto',
    padding: 6,
  },
});

export default DocumentCard;
