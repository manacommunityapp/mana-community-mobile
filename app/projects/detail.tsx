import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getProjectById, advanceProjectStage, type CommunityProjectDto } from '@/services/projectsService';

const STAGES = ['PROPOSAL','VOTING','APPROVED','PLANNING','PROCUREMENT','IN_PROGRESS','QUALITY_CHECK','COMPLETED'];

const STAGE_COLOR: Record<string, string> = {
  PROPOSAL:'#78909c',VOTING:'#7b1fa2',APPROVED:'#1976d2',PLANNING:'#f57c00',
  PROCUREMENT:'#e64a19',IN_PROGRESS:'#388e3c',QUALITY_CHECK:'#0097a7',COMPLETED:'#2e7d32',
};

function fmt(n: number) {
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + 'Cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(2) + 'L';
  return '₹' + n.toLocaleString('en-IN');
}

const TABS = ['Overview','Budget','Milestones','Vendor','Expenses','Documents','Approvals'];

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<CommunityProjectDto | null>(null);
  const [tab, setTab] = useState('Overview');
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    if (id) getProjectById(id).then(setProject);
  }, [id]);

  async function handleAdvance() {
    if (!project) return;
    setAdvancing(true);
    const updated = await advanceProjectStage(project.id);
    if (updated) setProject(updated);
    setAdvancing(false);
  }

  if (!project) return <ActivityIndicator style={{ flex:1 }} size='large' color='#1565c0' />;

  const stageIdx = STAGES.indexOf(project.status);
  const color = STAGE_COLOR[project.status] ?? '#1565c0';

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: color }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={s.headerContent}>
          <Text style={s.headerTitle} numberOfLines={2}>{project.title}</Text>
          <Text style={s.headerStatus}>{project.status.replace('_', ' ')}</Text>
        </View>
      </View>

      {/* Lifecycle Progress Bar */}
      <View style={s.lifeline}>
        {STAGES.map((st, i) => (
          <View key={st} style={s.stageStep}>
            <View style={[s.stageDot, {
              backgroundColor: i <= stageIdx ? color : '#e0e0e0',
              borderColor: i === stageIdx ? color : 'transparent',
            }]}>
              {i < stageIdx && <Text style={s.stageDotCheck}>✓</Text>}
              {i === stageIdx && <Text style={s.stageDotActive}>{i + 1}</Text>}
            </View>
            {i < STAGES.length - 1 && <View style={[s.stageLine, { backgroundColor: i < stageIdx ? color : '#e0e0e0' }]} />}
          </View>
        ))}
      </View>

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && { borderBottomColor: color }]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && { color }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView style={s.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {tab === 'Overview' && (
          <View>
            <Text style={s.sectionTitle}>Project Overview</Text>
            <Text style={s.desc}>{project.description}</Text>
            <View style={s.infoGrid}>
              <InfoRow label='Category' value={project.category} />
              <InfoRow label='Priority' value={project.priority} />
              <InfoRow label='Project Manager' value={project.projectManager} />
              <InfoRow label='Target Completion' value={project.targetCompletionDate} />
              {project.startDate && <InfoRow label='Start Date' value={project.startDate} />}
              {project.governanceResolutionId && <InfoRow label='Resolution ID' value={project.governanceResolutionId} />}
            </View>
            {project.residentVotesTotal && (
              <View style={s.voteBox}>
                <Text style={s.voteTitle}>Resident Vote Result</Text>
                <Text style={s.voteFor}>✅ For: {project.residentVotesFor} votes</Text>
                <Text style={s.voteAgainst}>❌ Against: {project.residentVotesAgainst} votes</Text>
                <Text style={s.voteTotal}>Total: {project.residentVotesTotal} voters</Text>
              </View>
            )}
          </View>
        )}

        {tab === 'Budget' && (
          <View>
            <Text style={s.sectionTitle}>Budget Breakdown</Text>
            <View style={s.budgetCard}>
              <BudgetRow label='Approved Budget' value={fmt(project.budget.approvedBudget)} color='#1565c0' />
              <BudgetRow label='Amount Spent' value={fmt(project.budget.spent)} color='#e53935' />
              <BudgetRow label='Committed' value={fmt(project.budget.committed)} color='#f57c00' />
              <BudgetRow label='Remaining' value={fmt(project.budget.remaining)} color='#388e3c' />
              <BudgetRow label='Contingency' value={project.budget.contingencyPercent + '%'} color='#546e7a' />
              <BudgetRow label='Funding Source' value={project.budget.fundingSource.replace(/_/g,' ')} color='#546e7a' />
              <BudgetRow label='Approved By' value={project.budget.approvedBy} color='#546e7a' />
            </View>
            <View style={s.utilizationBar}>
              <View style={[s.utilizationFill, { width: `${Math.min(project.budget.utilizationPercent, 100)}%` as any }]} />
            </View>
            <Text style={s.utilizationText}>{project.budget.utilizationPercent}% budget utilized</Text>
          </View>
        )}

        {tab === 'Milestones' && (
          <View>
            <Text style={s.sectionTitle}>Milestones ({project.milestones.filter(m=>m.status==='COMPLETED').length}/{project.milestones.length} done)</Text>
            {project.milestones.map(m => {
              const mcolor = m.status === 'COMPLETED' ? '#388e3c' : m.status === 'IN_PROGRESS' ? '#f57c00' : m.status === 'DELAYED' ? '#e53935' : '#90a4ae';
              return (
                <View key={m.id} style={s.milestoneCard}>
                  <View style={[s.msBadge, { backgroundColor: mcolor + '22' }]}>
                    <Text style={[s.msBadgeText, { color: mcolor }]}>{m.status}</Text>
                  </View>
                  <Text style={s.msTitle}>{m.title}</Text>
                  <Text style={s.msDesc}>{m.description}</Text>
                  <View style={s.msMeta}>
                    <Text style={s.msMetaText}>Due: {m.dueDate}</Text>
                    {m.completedDate && <Text style={s.msMetaText}>Done: {m.completedDate}</Text>}
                  </View>
                  <View style={s.msProgressBg}>
                    <View style={[s.msProgressFill, { width: `${m.progressPercent}%` as any, backgroundColor: mcolor }]} />
                  </View>
                  <Text style={s.msProgressText}>{m.progressPercent}%</Text>
                </View>
              );
            })}
          </View>
        )}

        {tab === 'Vendor' && (
          <View>
            <Text style={s.sectionTitle}>Assigned Vendor</Text>
            {project.vendor ? (
              <View style={s.vendorCard}>
                <Text style={s.vendorName}>{project.vendor.vendorName}</Text>
                <InfoRow label='Category' value={project.vendor.category} />
                <InfoRow label='Contact' value={project.vendor.contactPerson} />
                <InfoRow label='Phone' value={project.vendor.phone} />
                {project.vendor.gstin && <InfoRow label='GSTIN' value={project.vendor.gstin} />}
                <InfoRow label='Contract Value' value={fmt(project.vendor.contractValue)} />
                <InfoRow label='Contract Period' value={project.vendor.contractStartDate + ' to ' + project.vendor.contractEndDate} />
                {project.vendor.warrantyMonths && <InfoRow label='Warranty' value={project.vendor.warrantyMonths + ' months'} />}
                <InfoRow label='TDS %' value={project.vendor.tdsPercent + '%'} />
                {project.vendor.rating && <InfoRow label='Rating' value={'⭐ ' + project.vendor.rating + '/5'} />}
              </View>
            ) : (
              <Text style={s.emptyText}>No vendor assigned yet. Proceed to Procurement stage to select vendor.</Text>
            )}
          </View>
        )}

        {tab === 'Expenses' && (
          <View>
            <Text style={s.sectionTitle}>Expense Register</Text>
            {project.expenses.length === 0 ? (
              <Text style={s.emptyText}>No expenses recorded yet.</Text>
            ) : project.expenses.map(e => (
              <View key={e.id} style={s.expenseCard}>
                <View style={s.expenseTopRow}>
                  <Text style={s.expenseCategory}>{e.category.replace(/_/g,' ')}</Text>
                  <Text style={s.expenseAmount}>{fmt(e.amount)}</Text>
                </View>
                <Text style={s.expenseDesc}>{e.description}</Text>
                <Text style={s.expenseMeta}>{e.date} • {e.paymentMode} • {e.paymentRef}</Text>
                {e.invoiceNumber && <Text style={s.expenseMeta}>Invoice: {e.invoiceNumber}</Text>}
                <Text style={s.expenseMeta}>Approved by: {e.approvedBy}</Text>
              </View>
            ))}
            <View style={s.expenseTotalRow}>
              <Text style={s.expenseTotalLabel}>Total Spent</Text>
              <Text style={s.expenseTotalValue}>{fmt(project.budget.spent)}</Text>
            </View>
          </View>
        )}

        {tab === 'Documents' && (
          <View>
            <Text style={s.sectionTitle}>Documents</Text>
            {project.documents.map(d => (
              <View key={d.id} style={s.docCard}>
                <Text style={s.docType}>{d.type}</Text>
                <Text style={s.docName}>{d.name}</Text>
                <Text style={s.docMeta}>{d.uploadedDate} • {d.fileSize} • Uploaded by {d.uploadedBy}</Text>
              </View>
            ))}
          </View>
        )}

        {tab === 'Approvals' && (
          <View>
            <Text style={s.sectionTitle}>Approval & Governance Trail</Text>
            <View style={s.approvalCard}>
              <Text style={s.approvalLabel}>Resident Vote</Text>
              <Text style={s.approvalValue}>{project.residentVotesFor ?? 'N/A'} For / {project.residentVotesAgainst ?? 'N/A'} Against</Text>
            </View>
            {project.governanceProposalId && (
              <View style={s.approvalCard}>
                <Text style={s.approvalLabel}>Governance Proposal</Text>
                <Text style={s.approvalValue}>{project.governanceProposalId}</Text>
              </View>
            )}
            {project.governanceResolutionId && (
              <View style={s.approvalCard}>
                <Text style={s.approvalLabel}>Resolution Reference</Text>
                <Text style={s.approvalValue}>{project.governanceResolutionId}</Text>
              </View>
            )}
            <View style={s.approvalCard}>
              <Text style={s.approvalLabel}>Budget Approved By</Text>
              <Text style={s.approvalValue}>{project.budget.approvedBy}</Text>
            </View>
            <View style={s.approvalCard}>
              <Text style={s.approvalLabel}>Budget Approval Date</Text>
              <Text style={s.approvalValue}>{project.budget.approvedDate || 'Pending'}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Advance Stage Button */}
      {project.status !== 'COMPLETED' && (
        <View style={s.advanceBar}>
          <Text style={s.advanceHint}>Next: {STAGES[stageIdx + 1]?.replace(/_/g,' ')}</Text>
          <TouchableOpacity
            style={[s.advanceBtn, { backgroundColor: color }]}
            onPress={handleAdvance}
            disabled={advancing}
          >
            <Text style={s.advanceBtnText}>{advancing ? 'Advancing...' : 'Advance Stage →'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

function BudgetRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={[s.infoValue, { color, fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  header: { paddingTop: 48, paddingBottom: 20, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'flex-start' },
  backBtn: { marginRight: 12, marginTop: 2 },
  backText: { fontSize: 22, color: '#fff' },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerStatus: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  lifeline: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12, backgroundColor: '#fff', elevation: 2 },
  stageStep: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  stageDot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  stageDotCheck: { color: '#fff', fontSize: 10, fontWeight: '700' },
  stageDotActive: { color: '#fff', fontSize: 9, fontWeight: '700' },
  stageLine: { flex: 1, height: 2 },
  tabBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, color: '#78909c', fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  desc: { fontSize: 14, color: '#546e7a', lineHeight: 22, marginBottom: 16 },
  infoGrid: { gap: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  infoLabel: { fontSize: 13, color: '#78909c' },
  infoValue: { fontSize: 13, color: '#1a1a1a', fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  voteBox: { backgroundColor: '#e8f5e9', borderRadius: 12, padding: 14, marginTop: 16 },
  voteTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  voteFor: { fontSize: 13, color: '#388e3c', marginBottom: 4 },
  voteAgainst: { fontSize: 13, color: '#e53935', marginBottom: 4 },
  voteTotal: { fontSize: 12, color: '#546e7a' },
  budgetCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 2, marginBottom: 12 },
  utilizationBar: { height: 10, backgroundColor: '#e0e0e0', borderRadius: 5, marginBottom: 4 },
  utilizationFill: { height: 10, borderRadius: 5, backgroundColor: '#1565c0' },
  utilizationText: { fontSize: 12, color: '#546e7a', textAlign: 'center' },
  milestoneCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  msBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginBottom: 6 },
  msBadgeText: { fontSize: 10, fontWeight: '700' },
  msTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  msDesc: { fontSize: 12, color: '#546e7a', marginBottom: 8 },
  msMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  msMetaText: { fontSize: 11, color: '#78909c' },
  msProgressBg: { height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, marginBottom: 2 },
  msProgressFill: { height: 4, borderRadius: 2 },
  msProgressText: { fontSize: 10, color: '#78909c', textAlign: 'right' },
  vendorCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 2 },
  vendorName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#90a4ae', textAlign: 'center', marginTop: 32 },
  expenseCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  expenseTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  expenseCategory: { fontSize: 10, color: '#7b1fa2', fontWeight: '700', backgroundColor: '#f3e5f5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  expenseAmount: { fontSize: 15, fontWeight: '700', color: '#e53935' },
  expenseDesc: { fontSize: 13, color: '#1a1a1a', marginBottom: 4 },
  expenseMeta: { fontSize: 11, color: '#78909c' },
  expenseTotalRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginTop: 8, elevation: 2 },
  expenseTotalLabel: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  expenseTotalValue: { fontSize: 16, fontWeight: '700', color: '#e53935' },
  docCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  docType: { fontSize: 10, color: '#1565c0', fontWeight: '700', backgroundColor: '#e3f2fd', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 6 },
  docName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  docMeta: { fontSize: 11, color: '#78909c' },
  approvalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  approvalLabel: { fontSize: 12, color: '#78909c', marginBottom: 4 },
  approvalValue: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  advanceBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 8, borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  advanceHint: { fontSize: 12, color: '#78909c' },
  advanceBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  advanceBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});