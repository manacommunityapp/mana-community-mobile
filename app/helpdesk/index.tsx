import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';

interface SmartTicket {
  id: string;
  ticketNumber: string;
  title: string;
  category: string;
  location: string;
  priority: 'EMERGENCY' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED';
  assignedTo?: string;
  sla: string;
  createdAt: string;
}

const INITIAL_TICKETS: SmartTicket[] = [
  {
    id: 't-1',
    ticketNumber: 'TKT-2026-4412',
    title: 'Master Bathroom tap leaking continuously',
    category: 'Plumbing',
    location: 'Tower A, Flat 1204',
    priority: 'HIGH',
    status: 'ASSIGNED',
    assignedTo: 'Mahesh (Plumber)',
    sla: 'SLA: 2 hrs remaining',
    createdAt: 'Today, 10:30 AM',
  },
  {
    id: 't-2',
    ticketNumber: 'TKT-2026-4398',
    title: 'Corridor Light fused outside flat A-1204',
    category: 'Electrical',
    location: 'Tower A, 12th Floor Corridor',
    priority: 'MEDIUM',
    status: 'RESOLVED',
    assignedTo: 'Sanjay (Electrician)',
    sla: 'Resolved in 45 mins',
    createdAt: 'Yesterday',
  },
];

export default function SmartHelpdeskScreen() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SmartTicket[]>(INITIAL_TICKETS);
  const [isCreateModal, setIsCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [detectedCategory, setDetectedCategory] = useState<string | null>(null);
  const [detectedPriority, setDetectedPriority] = useState<'EMERGENCY' | 'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto classification heuristic
  const handleDescriptionChange = (text: string) => {
    setDescription(text);
    const lower = text.toLowerCase();
    if (lower.includes('flood') || lower.includes('gas leak') || lower.includes('fire') || lower.includes('spark')) {
      setDetectedCategory('Critical Safety');
      setDetectedPriority('EMERGENCY');
    } else if (lower.includes('leak') || lower.includes('pipe') || lower.includes('tap') || lower.includes('flush')) {
      setDetectedCategory('Plumbing');
      setDetectedPriority('HIGH');
    } else if (lower.includes('power') || lower.includes('electricity') || lower.includes('light') || lower.includes('fuse')) {
      setDetectedCategory('Electrical');
      setDetectedPriority('MEDIUM');
    } else if (lower.includes('lift') || lower.includes('elevator')) {
      setDetectedCategory('Elevator / Lift');
      setDetectedPriority('HIGH');
    } else {
      setDetectedCategory(null);
      setDetectedPriority('MEDIUM');
    }
  };

  const handleCreateTicket = () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Required', 'Please enter a title and description.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const newTicket: SmartTicket = {
        id: `t-${Date.now()}`,
        ticketNumber: `TKT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        title,
        category: detectedCategory || 'General Maintenance',
        location: `Tower ${user?.tower || 'A'}, Flat ${user?.flatNumber || '101'}`,
        priority: detectedPriority,
        status: 'OPEN',
        sla: 'SLA: 4 hrs target',
        createdAt: 'Just now',
      };
      setTickets([newTicket, ...tickets]);
      setIsCreateModal(false);
      setTitle('');
      setDescription('');
      setDetectedCategory(null);
      Alert.alert('✅ Ticket Created', 'Your service request has been logged and assigned.');
    }, 800);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Top Header & Stats ── */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{tickets.filter((t) => t.status !== 'RESOLVED').length}</Text>
            <Text style={styles.statLabel}>Active Tickets</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: '#059669' }]}>
              {tickets.filter((t) => t.status === 'RESOLVED').length}
            </Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: '#4F46E5' }]}>96.8%</Text>
            <Text style={styles.statLabel}>SLA Met</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.newTicketBtn}
          onPress={() => setIsCreateModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={18} color="#FFFFFF" />
          <Text style={styles.newTicketBtnText}>File Smart Ticket</Text>
        </TouchableOpacity>
      </View>

      {/* ── Ticket List ── */}
      <Text style={styles.sectionTitle}>My Maintenance Tickets</Text>
      <View style={{ gap: SPACING.md }}>
        {tickets.map((ticket) => {
          const isEmergency = ticket.priority === 'EMERGENCY';
          const isResolved = ticket.status === 'RESOLVED';
          return (
            <View key={ticket.id} style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <Text style={styles.ticketNum}>{ticket.ticketNumber}</Text>
                <View
                  style={[
                    styles.badge,
                    isEmergency ? styles.badgeEmergency : isResolved ? styles.badgeResolved : styles.badgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      isEmergency ? styles.textEmergency : isResolved ? styles.textResolved : styles.textActive,
                    ]}
                  >
                    {ticket.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.ticketTitle}>{ticket.title}</Text>
              <Text style={styles.ticketCategory}>
                🔧 {ticket.category} &bull; {ticket.location}
              </Text>

              {ticket.assignedTo && (
                <View style={styles.assignedBox}>
                  <Ionicons name="person-circle-outline" size={16} color="#4F46E5" />
                  <Text style={styles.assignedText}>Assigned: {ticket.assignedTo}</Text>
                </View>
              )}

              <View style={styles.ticketFooter}>
                <Text style={styles.slaText}>⏱ {ticket.sla}</Text>
                <Text style={styles.dateText}>{ticket.createdAt}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* ── Create Ticket Modal ── */}
      <Modal visible={isCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>File Smart Helpdesk Ticket</Text>
            <Text style={styles.modalSubtitle}>AI auto-classifies category & urgency as you type.</Text>

            <TextInput
              style={styles.input}
              placeholder="Title (e.g. Master bedroom AC dripping water)"
              placeholderTextColor={COLORS.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
              placeholder="Describe the issue in detail..."
              placeholderTextColor={COLORS.textMuted}
              value={description}
              onChangeText={handleDescriptionChange}
              multiline
            />

            {/* AI Classification Tag */}
            {detectedCategory && (
              <View style={styles.aiTagBox}>
                <Ionicons name="sparkles" size={16} color="#4F46E5" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiTagTitle}>Detected: {detectedCategory}</Text>
                  <Text style={styles.aiTagPriority}>Priority: {detectedPriority}</Text>
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsCreateModal(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmTicketBtn}
                onPress={handleCreateTicket}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmTicketText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  statsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: SPACING.md },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: COLORS.border },
  newTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
  },
  newTicketBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  ticketCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketNum: { fontSize: 11, fontFamily: 'monospace', fontWeight: '700', color: COLORS.textMuted },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.sm },
  badgeEmergency: { backgroundColor: '#FEE2E2' },
  textEmergency: { color: '#DC2626', fontSize: 10, fontWeight: '800' },
  badgeResolved: { backgroundColor: '#D1FAE5' },
  textResolved: { color: '#059669', fontSize: 10, fontWeight: '800' },
  badgeActive: { backgroundColor: '#EDE9FE' },
  textActive: { color: '#6D28D9', fontSize: 10, fontWeight: '800' },
  ticketTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: SPACING.xs },
  ticketCategory: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  assignedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
    gap: 6,
  },
  assignedText: { fontSize: 11, color: '#6D28D9', fontWeight: '600' },
  ticketFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.md, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  slaText: { fontSize: 11, color: '#D97706', fontWeight: '600' },
  dateText: { fontSize: 11, color: COLORS.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  modalContent: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, ...SHADOWS.md },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  modalSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, marginBottom: SPACING.md },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 13,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  aiTagBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  aiTagTitle: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },
  aiTagPriority: { fontSize: 11, color: '#6366F1' },
  modalActions: { flexDirection: 'row', gap: SPACING.md },
  cancelBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  confirmTicketBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: '#4F46E5', alignItems: 'center' },
  confirmTicketText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
