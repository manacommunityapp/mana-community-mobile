import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import {
  societyFinanceService,
  SocietyVendorBillFullDto,
  CreateVendorBillFullDto,
  VendorBillStatus,
  PayVendorBillDto,
} from '@/services/societyFinanceService';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<VendorBillStatus, { bg: string; text: string; label: string; icon: string }> = {
  DRAFT:          { bg: '#F1F5F9', text: '#64748B', label: 'Draft',         icon: 'create-outline' },
  RECEIVED:       { bg: '#FEF3C7', text: '#D97706', label: 'Received',      icon: 'document-text-outline' },
  APPROVED:       { bg: '#DCFCE7', text: '#15803D', label: 'Approved',      icon: 'checkmark-circle-outline' },
  PARTIALLY_PAID: { bg: '#E0E7FF', text: '#4338CA', label: 'Part Paid',     icon: 'hourglass-outline' },
  PAID:           { bg: '#F0FDF4', text: '#166534', label: 'Paid',          icon: 'checkmark-done-circle-outline' },
  OVERDUE:        { bg: '#FEE2E2', text: '#B91C1C', label: 'Overdue',       icon: 'alert-circle-outline' },
  DISPUTED:       { bg: '#FFF7ED', text: '#C2410C', label: 'Disputed',      icon: 'warning-outline' },
};

const AGING_COLOR = (days: number) => {
  if (days === 0) return '#10B981';
  if (days <= 15) return '#F59E0B';
  if (days <= 30) return '#EF4444';
  return '#B91C1C';
};

function fmt(n: number) { return '₹' + Math.abs(n).toLocaleString('en-IN'); }

const VENDOR_CATEGORIES = [
  'Security Services', 'Housekeeping & Waste', 'Lift & Escalator AMC',
  'Electricity & Power', 'Plumbing & Civil Works', 'Landscaping & Horticulture',
  'Fire Safety & Compliance', 'CCTV & Access Control', 'Legal & Audit Fees', 'Other',
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function VendorBillsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [payModal, setPayModal] = useState<SocietyVendorBillFullDto | null>(null);
  const [detailBill, setDetailBill] = useState<SocietyVendorBillFullDto | null>(null);

  // Create Form
  const [vendorId, setVendorId] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [lineAmt, setLineAmt] = useState('');
  const [lineDesc, setLineDesc] = useState('');
  const [tdsRate, setTdsRate] = useState('2');

  // Pay Form
  const [payAmount, setPayAmount] = useState('');
  const [payUtr, setPayUtr] = useState('');
  const [payMethod, setPayMethod] = useState<'NEFT_RTGS' | 'CHEQUE' | 'UPI' | 'CASH'>('NEFT_RTGS');

  // ── Queries ──
  const { data: bills = [], isLoading, refetch } = useQuery({
    queryKey: ['vendor-bills', statusFilter],
    queryFn: () => societyFinanceService.getVendorBills(statusFilter),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['society-vendors'],
    queryFn: societyFinanceService.getVendors,
  });

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: societyFinanceService.createVendorBill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-bills'] });
      setCreateModalVisible(false);
      resetForm();
      Alert.alert('Bill Registered', 'Vendor bill has been logged and is pending approval.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to create vendor bill.'),
  });

  const approveMutation = useMutation({
    mutationFn: ({ billId, approverName }: { billId: string; approverName: string }) =>
      societyFinanceService.approveVendorBill(billId, approverName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-bills'] });
      Alert.alert('Approved', 'Vendor bill approved and cleared for payment.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to approve.'),
  });

  const payMutation = useMutation({
    mutationFn: societyFinanceService.payVendorBill,
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-bills'] });
      queryClient.invalidateQueries({ queryKey: ['society-gl'] });
      setPayModal(null);
      resetPayForm();
      Alert.alert(
        'Payment Recorded',
        `₹${updated.paidAmount.toLocaleString('en-IN')} disbursed.\nGL entry auto-posted (Dr Payables / Cr Bank).`
      );
    },
    onError: (err: any) => Alert.alert('Payment Error', err?.message || 'Failed to record payment.'),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const resetForm = () => {
    setVendorId(''); setBillNumber(''); setDescription('');
    setLineAmt(''); setLineDesc(''); setTdsRate('2');
  };
  const resetPayForm = () => { setPayAmount(''); setPayUtr(''); setPayMethod('NEFT_RTGS'); };

  const handleCreate = () => {
    if (!vendorId || !billNumber.trim() || !description.trim() || !lineAmt) {
      Alert.alert('Required Fields', 'Please fill vendor, bill number, description and amount.');
      return;
    }
    const dto: CreateVendorBillFullDto = {
      vendorId,
      billNumber: billNumber.trim(),
      billDate,
      dueDate,
      description: description.trim(),
      lineItems: [{ description: lineDesc || description.trim(), amount: parseFloat(lineAmt) || 0, gstRate: 18 }],
      tdsRate: parseFloat(tdsRate) || 2,
    };
    createMutation.mutate(dto);
  };

  const handlePay = () => {
    if (!payModal) return;
    if (!payUtr.trim()) { Alert.alert('Required', 'Please enter the UTR / reference number.'); return; }
    const amount = parseFloat(payAmount) || payModal.balanceDue;
    const dto: PayVendorBillDto = {
      billId: payModal.id,
      amount,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: payMethod,
      utrReference: payUtr.trim(),
    };
    payMutation.mutate(dto);
  };

  // ── Computed ──
  const filtered = useMemo(() => {
    if (statusFilter === 'ALL') return bills;
    return bills.filter(b => b.status === statusFilter);
  }, [bills, statusFilter]);

  const totalPayable = useMemo(() => bills.reduce((s, b) => s + (b.balanceDue || 0), 0), [bills]);
  const overdueCount = useMemo(() => bills.filter(b => b.agingDays > 30 && b.status !== 'PAID').length, [bills]);
  const pendingApproval = useMemo(() => bills.filter(b => b.status === 'RECEIVED').length, [bills]);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <View style={s.container}>
      {/* ── Summary Chips ── */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.summaryRow}
      >
        <View style={s.summaryChip}>
          <Text style={s.summaryLabel}>Total Payable</Text>
          <Text style={s.summaryVal}>{fmt(totalPayable)}</Text>
        </View>
        <View style={[s.summaryChip, { borderColor: '#FCA5A5' }]}>
          <Text style={s.summaryLabel}>Overdue (30d+)</Text>
          <Text style={[s.summaryVal, { color: '#DC2626' }]}>{overdueCount} bills</Text>
        </View>
        <View style={[s.summaryChip, { borderColor: '#FCD34D' }]}>
          <Text style={s.summaryLabel}>Pending Approval</Text>
          <Text style={[s.summaryVal, { color: '#D97706' }]}>{pendingApproval} bills</Text>
        </View>
      </ScrollView>

      {/* ── Search + Create Bar ── */}
      <View style={s.barRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsRow}>
          {['ALL', 'RECEIVED', 'APPROVED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'].map(st => (
            <TouchableOpacity
              key={st}
              style={[s.tabChip, statusFilter === st && s.tabChipActive]}
              onPress={() => setStatusFilter(st)}
            >
              <Text style={[s.tabChipText, statusFilter === st && s.tabChipTextActive]}>
                {st === 'PARTIALLY_PAID' ? 'Part Paid' : st}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={s.createBtn} onPress={() => setCreateModalVisible(true)}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={s.createBtnText}>New Bill</Text>
        </TouchableOpacity>
      </View>

      {/* ── Bill List ── */}
      <ScrollView
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {isLoading && !refreshing ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="receipt-outline" size={48} color="#CBD5E1" />
            <Text style={s.emptyTitle}>No Bills Found</Text>
            <Text style={s.emptySub}>Register incoming vendor invoices here.</Text>
          </View>
        ) : (
          filtered.map(bill => {
            const cfg = STATUS_CONFIG[bill.status];
            return (
              <TouchableOpacity key={bill.id} style={s.billCard} activeOpacity={0.8} onPress={() => setDetailBill(bill)}>
                {/* Header row */}
                <View style={s.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.vendorName} numberOfLines={1}>{bill.vendorName}</Text>
                    <Text style={s.billMeta}>{bill.billNumber} · Due {bill.dueDate}</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon as any} size={11} color={cfg.text} />
                    <Text style={[s.statusText, { color: cfg.text }]}>{cfg.label}</Text>
                  </View>
                </View>

                <Text style={s.billDesc} numberOfLines={2}>{bill.description}</Text>

                {/* Amount row */}
                <View style={s.amtRow}>
                  <View>
                    <Text style={s.amtLabel}>Gross + GST</Text>
                    <Text style={s.amtVal}>{fmt(bill.grossAmount + bill.gstAmount)}</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={s.amtLabel}>TDS Deducted</Text>
                    <Text style={[s.amtVal, { color: '#7C3AED' }]}>- {fmt(bill.tdsDeducted)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.amtLabel}>Net Payable</Text>
                    <Text style={[s.amtVal, { color: bill.balanceDue > 0 ? '#DC2626' : '#10B981' }]}>
                      {bill.balanceDue > 0 ? fmt(bill.balanceDue) : 'Settled ✓'}
                    </Text>
                  </View>
                </View>

                {/* Aging badge */}
                {bill.status !== 'PAID' && bill.agingDays > 0 && (
                  <View style={[s.agingPill, { backgroundColor: AGING_COLOR(bill.agingDays) + '18' }]}>
                    <Text style={[s.agingText, { color: AGING_COLOR(bill.agingDays) }]}>
                      {bill.agingDays}d aging
                    </Text>
                  </View>
                )}

                {/* Action buttons */}
                <View style={s.cardActions}>
                  {bill.status === 'RECEIVED' && (
                    <TouchableOpacity
                      style={s.approveBtn}
                      onPress={() => approveMutation.mutate({ billId: bill.id, approverName: user?.name || 'Treasurer' })}
                    >
                      <Ionicons name="checkmark-circle-outline" size={14} color="#15803D" />
                      <Text style={s.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                  )}
                  {(bill.status === 'APPROVED' || bill.status === 'PARTIALLY_PAID' || bill.status === 'OVERDUE') && (
                    <TouchableOpacity
                      style={s.payBtn}
                      onPress={() => { setPayModal(bill); setPayAmount(String(bill.balanceDue)); }}
                    >
                      <Ionicons name="flash-outline" size={14} color="#FFFFFF" />
                      <Text style={s.payBtnText}>Record Payment</Text>
                    </TouchableOpacity>
                  )}
                  {bill.status === 'PAID' && (
                    <View style={s.paidBadge}>
                      <Ionicons name="checkmark-done" size={13} color="#166534" />
                      <Text style={s.paidBadgeText}>UTR: {bill.paymentUtr?.slice(-8)}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ── Create Vendor Bill Modal ── */}
      <Modal visible={createModalVisible} animationType="slide" transparent onRequestClose={() => setCreateModalVisible(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Register Vendor Bill</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.fieldLabel}>Select Vendor</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
                {vendors.map(v => (
                  <TouchableOpacity
                    key={v.id}
                    style={[s.vendorChip, vendorId === v.id && s.vendorChipActive]}
                    onPress={() => setVendorId(v.id)}
                  >
                    <Text style={[s.vendorChipText, vendorId === v.id && s.vendorChipTextActive]} numberOfLines={1}>
                      {v.vendorName.split(' ').slice(0, 2).join(' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={s.fieldLabel}>Vendor Bill Number</Text>
              <TextInput style={s.input} placeholder="e.g. APEX/2026/OCT/09" placeholderTextColor="#94A3B8"
                value={billNumber} onChangeText={setBillNumber} />

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Bill Date</Text>
                  <TextInput style={s.input} placeholder="YYYY-MM-DD" placeholderTextColor="#94A3B8"
                    value={billDate} onChangeText={setBillDate} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Due Date</Text>
                  <TextInput style={s.input} placeholder="YYYY-MM-DD" placeholderTextColor="#94A3B8"
                    value={dueDate} onChangeText={setDueDate} />
                </View>
              </View>

              <Text style={s.fieldLabel}>Description / Scope of Work</Text>
              <TextInput style={[s.input, { minHeight: 60, textAlignVertical: 'top' }]}
                placeholder="e.g. Monthly security deployment Oct 2026"
                placeholderTextColor="#94A3B8" multiline
                value={description} onChangeText={setDescription} />

              <Text style={s.fieldLabel}>Line Item Description</Text>
              <TextInput style={s.input} placeholder="e.g. Guard wages 12 × 26 days"
                placeholderTextColor="#94A3B8" value={lineDesc} onChangeText={setLineDesc} />

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Gross Amount (₹)</Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor="#94A3B8"
                    keyboardType="numeric" value={lineAmt} onChangeText={setLineAmt} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>TDS Rate (%)</Text>
                  <TextInput style={s.input} placeholder="2" placeholderTextColor="#94A3B8"
                    keyboardType="numeric" value={tdsRate} onChangeText={setTdsRate} />
                </View>
              </View>

              {/* Preview */}
              {lineAmt !== '' && (
                <View style={s.previewBox}>
                  {(() => {
                    const gross = parseFloat(lineAmt) || 0;
                    const gst = Math.round(gross * 0.18);
                    const tds = Math.round(gross * (parseFloat(tdsRate) || 2) / 100);
                    return (
                      <>
                        <View style={s.previewRow}><Text style={s.previewLbl}>Gross</Text><Text style={s.previewVal}>{fmt(gross)}</Text></View>
                        <View style={s.previewRow}><Text style={s.previewLbl}>+ GST 18%</Text><Text style={s.previewVal}>{fmt(gst)}</Text></View>
                        <View style={s.previewRow}><Text style={s.previewLbl}>- TDS {tdsRate}%</Text><Text style={[s.previewVal, { color: '#7C3AED' }]}>- {fmt(tds)}</Text></View>
                        <View style={[s.previewRow, { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 6, marginTop: 4 }]}>
                          <Text style={[s.previewLbl, { fontWeight: 'bold' }]}>Net Payable</Text>
                          <Text style={[s.previewVal, { fontWeight: 'bold', color: COLORS.primary }]}>{fmt(gross + gst - tds)}</Text>
                        </View>
                      </>
                    );
                  })()}
                </View>
              )}

              <TouchableOpacity style={s.confirmBtn} onPress={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? <ActivityIndicator color="#FFFFFF" /> : (
                  <Text style={s.confirmBtnText}>Register Bill</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Record Payment Modal ── */}
      <Modal visible={!!payModal} animationType="slide" transparent onRequestClose={() => setPayModal(null)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Record Payment</Text>
              <TouchableOpacity onPress={() => setPayModal(null)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {payModal && (
              <>
                <View style={s.payInfoBox}>
                  <Text style={s.payInfoVendor}>{payModal.vendorName}</Text>
                  <Text style={s.payInfoBill}>{payModal.billNumber} · Balance Due: {fmt(payModal.balanceDue)}</Text>
                </View>

                <Text style={s.fieldLabel}>Payment Amount (₹)</Text>
                <TextInput style={s.input} keyboardType="numeric" placeholderTextColor="#94A3B8"
                  placeholder={String(payModal.balanceDue)} value={payAmount}
                  onChangeText={setPayAmount} />

                <Text style={s.fieldLabel}>Payment Method</Text>
                <View style={s.methodsRow}>
                  {(['NEFT_RTGS', 'CHEQUE', 'UPI', 'CASH'] as const).map(m => (
                    <TouchableOpacity
                      key={m}
                      style={[s.methodChip, payMethod === m && s.methodChipActive]}
                      onPress={() => setPayMethod(m)}
                    >
                      <Text style={[s.methodChipText, payMethod === m && s.methodChipTextActive]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.fieldLabel}>UTR / Reference Number</Text>
                <TextInput style={s.input} placeholder="e.g. HDFCR52026101700001" placeholderTextColor="#94A3B8"
                  value={payUtr} onChangeText={setPayUtr} autoCapitalize="characters" />

                <View style={s.glNote}>
                  <Ionicons name="information-circle-outline" size={14} color="#3B82F6" />
                  <Text style={s.glNoteText}>
                    GL auto-post: Dr Vendor Payables / Cr Operating Bank
                  </Text>
                </View>

                <TouchableOpacity style={s.confirmBtn} onPress={handlePay} disabled={payMutation.isPending}>
                  {payMutation.isPending ? <ActivityIndicator color="#FFFFFF" /> : (
                    <Text style={s.confirmBtnText}>Confirm Disbursement & Post GL</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Detail Modal ── */}
      <Modal visible={!!detailBill} animationType="fade" transparent onRequestClose={() => setDetailBill(null)}>
        <View style={s.overlay}>
          <View style={[s.sheet, { maxHeight: '75%' }]}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Bill Detail</Text>
              <TouchableOpacity onPress={() => setDetailBill(null)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {detailBill && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1E293B' }}>{detailBill.vendorName}</Text>
                {detailBill.vendorGstin && <Text style={{ fontSize: 11, color: '#64748B' }}>GSTIN: {detailBill.vendorGstin}</Text>}

                <View style={s.detailSection}>
                  <Text style={s.detailSectionTitle}>Bill Info</Text>
                  <View style={s.detailRow}><Text style={s.detailKey}>Bill No.</Text><Text style={s.detailVal}>{detailBill.billNumber}</Text></View>
                  <View style={s.detailRow}><Text style={s.detailKey}>Bill Date</Text><Text style={s.detailVal}>{detailBill.billDate}</Text></View>
                  <View style={s.detailRow}><Text style={s.detailKey}>Due Date</Text><Text style={s.detailVal}>{detailBill.dueDate}</Text></View>
                  <View style={s.detailRow}><Text style={s.detailKey}>Description</Text><Text style={s.detailVal}>{detailBill.description}</Text></View>
                </View>

                <View style={s.detailSection}>
                  <Text style={s.detailSectionTitle}>Amounts</Text>
                  <View style={s.detailRow}><Text style={s.detailKey}>Gross</Text><Text style={s.detailVal}>{fmt(detailBill.grossAmount)}</Text></View>
                  <View style={s.detailRow}><Text style={s.detailKey}>+ GST</Text><Text style={s.detailVal}>{fmt(detailBill.gstAmount)}</Text></View>
                  <View style={s.detailRow}><Text style={s.detailKey}>- TDS</Text><Text style={[s.detailVal, { color: '#7C3AED' }]}>- {fmt(detailBill.tdsDeducted)}</Text></View>
                  <View style={s.detailRow}><Text style={[s.detailKey, { fontWeight: 'bold' }]}>Net Payable</Text><Text style={[s.detailVal, { fontWeight: 'bold', color: COLORS.primary }]}>{fmt(detailBill.netPayable)}</Text></View>
                  <View style={s.detailRow}><Text style={s.detailKey}>Paid</Text><Text style={[s.detailVal, { color: '#10B981' }]}>{fmt(detailBill.paidAmount)}</Text></View>
                  <View style={s.detailRow}><Text style={s.detailKey}>Balance Due</Text><Text style={[s.detailVal, { color: detailBill.balanceDue > 0 ? '#DC2626' : '#10B981', fontWeight: 'bold' }]}>{detailBill.balanceDue > 0 ? fmt(detailBill.balanceDue) : 'Nil'}</Text></View>
                </View>

                {detailBill.approvedBy && (
                  <View style={s.detailSection}>
                    <Text style={s.detailSectionTitle}>Approval</Text>
                    <View style={s.detailRow}><Text style={s.detailKey}>Approved by</Text><Text style={s.detailVal}>{detailBill.approvedBy}</Text></View>
                    <View style={s.detailRow}><Text style={s.detailKey}>Approved on</Text><Text style={s.detailVal}>{detailBill.approvedAt}</Text></View>
                  </View>
                )}

                {detailBill.paymentUtr && (
                  <View style={s.detailSection}>
                    <Text style={s.detailSectionTitle}>Payment</Text>
                    <View style={s.detailRow}><Text style={s.detailKey}>Method</Text><Text style={s.detailVal}>{detailBill.paymentMethod}</Text></View>
                    <View style={s.detailRow}><Text style={s.detailKey}>UTR / Ref</Text><Text style={s.detailVal}>{detailBill.paymentUtr}</Text></View>
                    <View style={s.detailRow}><Text style={s.detailKey}>Payment Date</Text><Text style={s.detailVal}>{detailBill.paymentDate}</Text></View>
                    <View style={s.glNote}>
                      <Ionicons name="checkmark-circle-outline" size={14} color="#10B981" />
                      <Text style={[s.glNoteText, { color: '#065F46' }]}>GL entries auto-posted to General Ledger</Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  summaryRow: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, gap: 8 },
  summaryChip: {
    backgroundColor: '#FFFFFF', borderRadius: RADIUS.md, padding: 12,
    borderWidth: 1, borderColor: '#E2E8F0', minWidth: 120, ...SHADOWS.sm,
  },
  summaryLabel: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  summaryVal: { fontSize: 17, fontWeight: '800', color: '#1E293B', marginTop: 2 },
  barRow: { flexDirection: 'row', alignItems: 'center', paddingRight: SPACING.md, marginTop: 12 },
  tabsRow: { paddingHorizontal: SPACING.md, gap: 6 },
  tabChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
  },
  tabChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabChipText: { fontSize: 11.5, color: '#64748B', fontWeight: '600' },
  tabChipTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: RADIUS.md, marginLeft: 8,
  },
  createBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  list: { padding: SPACING.md, paddingBottom: 60 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  billCard: {
    backgroundColor: '#FFFFFF', borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.sm, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  vendorName: { fontSize: 15, fontWeight: '700', color: '#1E293B', flex: 1 },
  billMeta: { fontSize: 11, color: '#64748B', marginTop: 1 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10,
  },
  statusText: { fontSize: 10.5, fontWeight: 'bold' },
  billDesc: { fontSize: 12.5, color: '#475569', marginTop: 6, marginBottom: 10 },
  amtRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10,
  },
  amtLabel: { fontSize: 10, color: '#94A3B8', marginBottom: 2 },
  amtVal: { fontSize: 13.5, fontWeight: '700', color: '#1E293B' },
  agingPill: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, marginTop: 8,
  },
  agingText: { fontSize: 10.5, fontWeight: 'bold' },
  cardActions: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 10,
    marginTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8,
  },
  approveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  approveBtnText: { fontSize: 12, fontWeight: '700', color: '#15803D' },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  payBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  paidBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  paidBadgeText: { fontSize: 11, color: '#166534', fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: SPACING.lg, maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 36 : SPACING.lg,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 12 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  fieldLabel: { fontSize: 12.5, fontWeight: '600', color: '#475569', marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: RADIUS.md, padding: SPACING.sm, fontSize: 14, color: '#1E293B',
  },
  vendorChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', maxWidth: 140,
  },
  vendorChipActive: { backgroundColor: COLORS.primary + '15', borderColor: COLORS.primary },
  vendorChipText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  vendorChipTextActive: { color: COLORS.primary },
  previewBox: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: RADIUS.md, padding: 12, marginTop: 12,
  },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  previewLbl: { fontSize: 12, color: '#64748B' },
  previewVal: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  payInfoBox: {
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: 12,
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 4,
  },
  payInfoVendor: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  payInfoBill: { fontSize: 12, color: '#64748B', marginTop: 2 },
  methodsRow: { flexDirection: 'row', gap: 8, marginVertical: 4, flexWrap: 'wrap' },
  methodChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
  },
  methodChipActive: { backgroundColor: COLORS.primary + '15', borderColor: COLORS.primary },
  methodChipText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  methodChipTextActive: { color: COLORS.primary, fontWeight: 'bold' },
  glNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EFF6FF', padding: 10, borderRadius: 8, marginTop: 10,
  },
  glNoteText: { fontSize: 11.5, color: '#1D4ED8', flex: 1 },
  confirmBtn: {
    backgroundColor: COLORS.primary, padding: SPACING.md, borderRadius: RADIUS.md,
    alignItems: 'center', marginTop: 16,
  },
  confirmBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  detailSection: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  detailSectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  detailKey: { fontSize: 12.5, color: '#64748B' },
  detailVal: { fontSize: 12.5, color: '#1E293B', fontWeight: '500', textAlign: 'right', flex: 1, marginLeft: 12 },
});
