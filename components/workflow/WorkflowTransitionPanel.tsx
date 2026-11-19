import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';
import { useWorkflowTransitions } from '@/hooks/useWorkflowTransitions';
import { workflowService, AllowedTransition, TransitionHistoryEntry } from '@/services/workflowService';

interface Props {
  workflowId: string;
  entityId: string | number;
  currentStatus: string;
  onStatusChanged?: (newStatus: string) => void;
  compact?: boolean;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function HistoryItem({ entry }: { entry: TransitionHistoryEntry }) {
  return (
    <View style={styles.historyItem}>
      <View style={styles.historyRow}>
        <Text style={styles.historyTransition}>
          {entry.fromStatus?.replace(/_/g, ' ') ?? '—'} → {entry.toStatus?.replace(/_/g, ' ')}
        </Text>
        <Text style={styles.historyRole}>{entry.actorRole}</Text>
      </View>
      <Text style={styles.historyDate}>{formatDate(entry.transitionedAt)}</Text>
      {!!entry.reason && (
        <Text style={styles.historyReason}>"{entry.reason}"</Text>
      )}
    </View>
  );
}

function TransitionButton({
  transition,
  workflowId,
  entityId,
  currentStatus,
  onDone,
}: {
  transition: AllowedTransition;
  workflowId: string;
  entityId: string | number;
  currentStatus: string;
  onDone: (newStatus: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const execute = async () => {
    if (transition.reasonRequired && !reason.trim()) {
      Alert.alert('Reason Required', 'Please enter a reason to proceed.');
      return;
    }
    setLoading(true);
    try {
      const result = await workflowService.executeTransition(
        workflowId,
        entityId,
        currentStatus,
        transition.toStatus,
        reason.trim() || undefined,
      );
      setReason('');
      setExpanded(false);
      onDone(result.newStatus);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Transition failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePress = () => {
    if (transition.reasonRequired) {
      setExpanded((v) => !v);
    } else {
      execute();
    }
  };

  return (
    <View style={styles.transitionCard}>
      <TouchableOpacity
        style={styles.transitionButton}
        onPress={handlePress}
        disabled={loading}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#2563EB" />
        ) : (
          <Text style={styles.transitionLabel}>{transition.displayLabel}</Text>
        )}
        {transition.reasonRequired && !loading && (
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="#6B7280"
          />
        )}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.reasonContainer}>
          <TextInput
            style={styles.reasonInput}
            placeholder="Enter reason (required)…"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            value={reason}
            onChangeText={setReason}
          />
          <TouchableOpacity
            style={[styles.confirmButton, !reason.trim() && styles.confirmButtonDisabled]}
            onPress={execute}
            disabled={loading || !reason.trim()}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.confirmButtonText}>Confirm</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export function WorkflowTransitionPanel({
  workflowId,
  entityId,
  currentStatus,
  onStatusChanged,
  compact = false,
}: Props) {
  const { transitions, history, loading, error, reload } = useWorkflowTransitions(
    workflowId,
    entityId,
    currentStatus,
  );
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const visibleHistory = showAll ? history : history.slice(0, 5);

  const handleStatusChanged = (newStatus: string) => {
    onStatusChanged?.(newStatus);
    reload();
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Status</Text>
        <WorkflowStatusBadge status={currentStatus} size="md" />
      </View>

      {loading && (
        <ActivityIndicator size="small" color="#2563EB" style={styles.loader} />
      )}

      {!!error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {!loading && transitions.length > 0 && (
        <View style={styles.transitionsSection}>
          <Text style={styles.sectionTitle}>Available Actions</Text>
          {transitions.map((t) => (
            <TransitionButton
              key={t.toStatus}
              transition={t}
              workflowId={workflowId}
              entityId={entityId}
              currentStatus={currentStatus}
              onDone={handleStatusChanged}
            />
          ))}
        </View>
      )}

      {!compact && history.length > 0 && (
        <View style={styles.historySection}>
          <TouchableOpacity
            style={styles.historySectionHeader}
            onPress={() => setHistoryExpanded((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionTitle}>History</Text>
            <Ionicons
              name={historyExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#6B7280"
            />
          </TouchableOpacity>

          {historyExpanded && (
            <View>
              <FlatList
                data={visibleHistory}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => <HistoryItem entry={item} />}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
              {history.length > 5 && (
                <TouchableOpacity
                  style={styles.showMoreButton}
                  onPress={() => setShowAll((v) => !v)}
                >
                  <Text style={styles.showMoreText}>
                    {showAll ? 'Show less' : `Show ${history.length - 5} more`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  loader: {
    marginVertical: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginBottom: 8,
  },
  transitionsSection: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  transitionCard: {
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  transitionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
  },
  transitionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E40AF',
  },
  reasonContainer: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
    minHeight: 72,
    textAlignVertical: 'top',
  },
  confirmButton: {
    marginTop: 8,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  historySection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  historySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyItem: {
    paddingVertical: 8,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTransition: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    flexShrink: 1,
  },
  historyRole: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  historyDate: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  historyReason: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  showMoreButton: {
    marginTop: 8,
    alignItems: 'center',
  },
  showMoreText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '500',
  },
});

export default WorkflowTransitionPanel;
