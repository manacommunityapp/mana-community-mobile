import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { governanceService } from '@/services/governanceService';
import type { ResolutionDto, VaultDocumentDto } from '@/types/governance';

type VaultMainTab = 'RESOLUTIONS' | 'DOCUMENTS';
type DocumentCategory = 'ALL' | 'BYLAWS' | 'AUDIT' | 'MINUTES' | 'LEGAL' | 'FORMS';

export default function VaultScreen() {
  const [mainTab, setMainTab] = useState<VaultMainTab>('RESOLUTIONS');
  const [docCategory, setDocCategory] = useState<DocumentCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResolution, setSelectedResolution] = useState<ResolutionDto | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<VaultDocumentDto | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);

  // Queries
  const { data: resolutions = [], isLoading: resolutionsLoading, refetch: refetchResolutions, isRefetching: isRefetchingRes } = useQuery({
    queryKey: ['governanceResolutions', searchQuery],
    queryFn: () => governanceService.getResolutions(searchQuery),
  });

  const { data: documents = [], isLoading: docsLoading, refetch: refetchDocs, isRefetching: isRefetchingDocs } = useQuery({
    queryKey: ['governanceVault', docCategory, searchQuery],
    queryFn: () => governanceService.getVaultDocuments(docCategory === 'ALL' ? undefined : docCategory, searchQuery),
  });

  const isLoading = resolutionsLoading || docsLoading;
  const isRefetching = isRefetchingRes || isRefetchingDocs;

  const onRefresh = () => {
    refetchResolutions();
    refetchDocs();
  };

  const handleOpenDocPreview = (doc: VaultDocumentDto) => {
    setSelectedDocument(doc);
    setPreviewModalVisible(true);
  };

  const handleDownloadDocument = (doc: VaultDocumentDto) => {
    Alert.alert(
      'Document Download',
      `Downloading verified copy of "${doc.title}" (${doc.fileSize}).\nDigital Seal Verified ✓`,
      [{ text: 'OK' }]
    );
  };

  const handleShareResolution = (res: ResolutionDto) => {
    Share.share({
      title: res.title,
      message: `📜 *Mana Community Official Resolution*\n${res.resolutionNumber}: ${res.title}\nStatus: ${res.status}\nPassed: ${res.passedDate}\nFor: ${res.votingSummary.totalPercentageFor}%\nRead full text on Mana Governance Vault.`,
    });
  };

  return (
    <View style={styles.container}>
      {/* ── Top Main Switcher ─────────────────────────────────────── */}
      <View style={styles.mainTabHeader}>
        <TouchableOpacity
          style={[styles.mainTabBtn, mainTab === 'RESOLUTIONS' && styles.mainTabBtnActive]}
          onPress={() => setMainTab('RESOLUTIONS')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="ribbon-outline"
            size={16}
            color={mainTab === 'RESOLUTIONS' ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={[styles.mainTabBtnText, mainTab === 'RESOLUTIONS' && styles.mainTabBtnTextActive]}>
            Passed Resolutions Board
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainTabBtn, mainTab === 'DOCUMENTS' && styles.mainTabBtnActive]}
          onPress={() => setMainTab('DOCUMENTS')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="folder-outline"
            size={16}
            color={mainTab === 'DOCUMENTS' ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={[styles.mainTabBtnText, mainTab === 'DOCUMENTS' && styles.mainTabBtnTextActive]}>
            Digital Statutory Vault
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Search Bar ────────────────────────────────────────────── */}
      <View style={styles.searchBarWrapper}>
        <Ionicons name="search" size={16} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={
            mainTab === 'RESOLUTIONS'
              ? 'Search resolutions by ID, title or keyword...'
              : 'Search bylaws, audits, NOCs, forms...'
          }
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Document Sub-Category Bar (When viewing vault documents) ─ */}
      {mainTab === 'DOCUMENTS' && (
        <View style={styles.categoryBarWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {(
              [
                { key: 'ALL', label: 'All Documents' },
                { key: 'BYLAWS', label: '📘 Bylaws' },
                { key: 'AUDIT', label: '📊 Audits' },
                { key: 'MINUTES', label: '📝 AGM Minutes' },
                { key: 'LEGAL', label: '⚖️ Legal & NOCs' },
                { key: 'FORMS', label: '📄 Forms' },
              ] as const
            ).map((cat) => {
              const isSel = docCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.categoryChip, isSel && styles.categoryChipSelected]}
                  onPress={() => setDocCategory(cat.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.categoryChipText, isSel && styles.categoryChipTextSelected]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Content Area ──────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : mainTab === 'RESOLUTIONS' ? (
          /* ── RESOLUTIONS LEGAL BOARD ───────────────────────────── */
          resolutions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No Resolutions Found</Text>
              <Text style={styles.emptySubtitle}>No passed resolutions matching your query.</Text>
            </View>
          ) : (
            resolutions.map((res) => {
              const isExpanded = selectedResolution?.id === res.id;
              return (
                <View key={res.id} style={styles.resolutionCard}>
                  {/* Resolution Header */}
                  <View style={styles.resCardHeader}>
                    <View style={styles.resBadgeRow}>
                      <View style={styles.resNumberBadge}>
                        <Ionicons name="ribbon" size={12} color="#1E40AF" />
                        <Text style={styles.resNumberText}>{res.resolutionNumber}</Text>
                      </View>
                      <View
                        style={[
                          styles.resStatusBadge,
                          res.status === 'COMPLETED'
                            ? styles.resStatusCompleted
                            : styles.resStatusInImpl,
                        ]}
                      >
                        <Text
                          style={[
                            styles.resStatusText,
                            { color: res.status === 'COMPLETED' ? '#059669' : '#D97706' },
                          ]}
                        >
                          {res.status.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.resTitle}>{res.title}</Text>

                    <View style={styles.resMetaRow}>
                      <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} />
                      <Text style={styles.resMetaText}>{res.meetingReference}</Text>
                    </View>

                    {res.approvedBudget && (
                      <View style={styles.budgetRow}>
                        <Ionicons name="cash-outline" size={14} color="#059669" />
                        <Text style={styles.budgetText}>Approved Budget: {res.approvedBudget}</Text>
                      </View>
                    )}
                  </View>

                  {/* Voting Tally Breakdown */}
                  <View style={styles.tallyBox}>
                    <View style={styles.tallyHeader}>
                      <Text style={styles.tallyTitle}>General Body Vote Tally</Text>
                      <Text style={styles.tallyResult}>
                        {res.votingSummary.totalPercentageFor}% Supermajority FOR
                      </Text>
                    </View>
                    <View style={styles.tallyBarTrack}>
                      <View
                        style={[
                          styles.tallyBarFor,
                          { width: `${res.votingSummary.totalPercentageFor}%` as any },
                        ]}
                      />
                      <View
                        style={[
                          styles.tallyBarAgainst,
                          {
                            width: `${(
                              (res.votingSummary.againstVotes /
                                (res.votingSummary.forVotes +
                                  res.votingSummary.againstVotes +
                                  res.votingSummary.abstained)) *
                              100
                            ).toFixed(1)}%` as any,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.tallyFooter}>
                      <Text style={styles.tallyVoteText}>
                        🟢 For: {res.votingSummary.forVotes}
                      </Text>
                      <Text style={styles.tallyVoteText}>
                        🔴 Against: {res.votingSummary.againstVotes}
                      </Text>
                      <Text style={styles.tallyVoteText}>
                        ⚪ Abstained: {res.votingSummary.abstained}
                      </Text>
                    </View>
                  </View>

                  {/* Key Provisions */}
                  <View style={styles.provisionsBox}>
                    <Text style={styles.provisionsHeading}>Key Enacted Provisions & Directives:</Text>
                    {res.keyProvisions.map((provision, idx) => (
                      <View key={idx} style={styles.provisionItem}>
                        <Ionicons name="checkmark-circle" size={14} color="#2563EB" />
                        <Text style={styles.provisionText}>{provision}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Legal Seal and Presiding Officer Signature */}
                  <View style={styles.legalSealBox}>
                    <View style={styles.sealStampWrap}>
                      <Ionicons name="shield-checkmark" size={16} color="#059669" />
                      <Text style={styles.sealStampText}>SEAL VERIFIED</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.officerName}>Presiding Officer: {res.presidingOfficer}</Text>
                      {res.legalBindingStatement && (
                        <Text style={styles.bindingStatement}>{res.legalBindingStatement}</Text>
                      )}
                    </View>
                  </View>

                  {/* Actions Footer */}
                  <View style={styles.resCardFooter}>
                    <TouchableOpacity
                      style={styles.resActionBtn}
                      onPress={() => handleShareResolution(res)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="share-social-outline" size={15} color={COLORS.primary} />
                      <Text style={styles.resActionBtnText}>Share Resolution</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.resActionBtn}
                      onPress={() =>
                        Alert.alert(
                          'Certified Resolution Copy',
                          `Downloading legally attested copy of ${res.resolutionNumber}...`
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Ionicons name="download-outline" size={15} color={COLORS.primary} />
                      <Text style={styles.resActionBtnText}>Download Attested PDF</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )
        ) : (
          /* ── STATUTORY DIGITAL VAULT ───────────────────────────── */
          documents.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="folder-open-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No Documents Found</Text>
              <Text style={styles.emptySubtitle}>No documents match your filter or search query.</Text>
            </View>
          ) : (
            documents.map((doc) => (
              <View key={doc.id} style={styles.docCard}>
                <View style={styles.docIconCircle}>
                  <Ionicons
                    name={
                      doc.category === 'BYLAWS'
                        ? 'book-outline'
                        : doc.category === 'AUDIT'
                        ? 'bar-chart-outline'
                        : doc.category === 'MINUTES'
                        ? 'reader-outline'
                        : doc.category === 'LEGAL'
                        ? 'shield-outline'
                        : 'document-text-outline'
                    }
                    size={22}
                    color={COLORS.primary}
                  />
                </View>

                <View style={styles.docInfoCol}>
                  <View style={styles.docHeaderRow}>
                    <View style={styles.docCategoryBadge}>
                      <Text style={styles.docCategoryText}>{doc.category}</Text>
                    </View>
                    {doc.digitalSealVerified && (
                      <View style={styles.verifiedSealBadge}>
                        <Ionicons name="checkmark-circle" size={12} color="#059669" />
                        <Text style={styles.verifiedSealText}>Certified</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.docTitle}>{doc.title}</Text>

                  <View style={styles.docMetaRow}>
                    <Text style={styles.docMetaItem}>📦 {doc.fileSize}</Text>
                    <Text style={styles.docMetaDot}>·</Text>
                    <Text style={styles.docMetaItem}>📅 Updated {doc.lastUpdated}</Text>
                  </View>
                </View>

                <View style={styles.docActionCol}>
                  <TouchableOpacity
                    style={styles.docActionCircleBtn}
                    onPress={() => handleOpenDocPreview(doc)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="eye-outline" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.docActionCircleBtn, { marginTop: 6 }]}
                    onPress={() => handleDownloadDocument(doc)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="download-outline" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>

      {/* ── Document Preview Modal ───────────────────────────────── */}
      <Modal visible={previewModalVisible} transparent animationType="slide" onRequestClose={() => setPreviewModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewTitle}>{selectedDocument?.title}</Text>
                <Text style={styles.previewSubtitle}>
                  {selectedDocument?.fileFormat} · {selectedDocument?.fileSize} · Verified Society Record
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPreviewModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Document Mock Viewer Body */}
            <View style={styles.documentViewerBox}>
              <Ionicons name="document-text" size={48} color={COLORS.primary} style={{ marginBottom: 12 }} />
              <Text style={styles.viewerDocTitle}>{selectedDocument?.title}</Text>
              <Text style={styles.viewerCertNote}>
                Certified Digital Copy with SHA-256 Society Stamp
              </Text>
              <View style={styles.viewerSealBadge}>
                <Ionicons name="shield-checkmark" size={16} color="#059669" />
                <Text style={styles.viewerSealText}>Authenticity Attested by Managing Committee</Text>
              </View>
            </View>

            <View style={styles.previewFooterBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setPreviewModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSubmit]}
                onPress={() => {
                  setPreviewModalVisible(false);
                  if (selectedDocument) handleDownloadDocument(selectedDocument);
                }}
              >
                <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                <Text style={styles.modalBtnSubmitText}>Save Offline PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  mainTabHeader: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  mainTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  mainTabBtnActive: {
    borderBottomColor: COLORS.primary,
  },
  mainTabBtnText: {
    fontSize: 13,
    fontFamily: 'DMSans-Medium',
    color: COLORS.textMuted,
  },
  mainTabBtnTextActive: {
    color: COLORS.primary,
    fontFamily: 'DMSans-Bold',
    fontWeight: 'bold',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  categoryBarWrapper: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
  },
  categoryScroll: {
    paddingHorizontal: SPACING.md,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
  },
  categoryChipSelected: {
    backgroundColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontFamily: 'DMSans-Medium',
    color: COLORS.textSecondary,
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 32,
    marginTop: 40,
    ...SHADOWS.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  resolutionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.md,
  },
  resCardHeader: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  resBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resNumberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  resNumberText: {
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
    color: '#1E40AF',
  },
  resStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  resStatusCompleted: {
    backgroundColor: '#D1FAE5',
  },
  resStatusInImpl: {
    backgroundColor: '#FEF3C7',
  },
  resStatusText: {
    fontSize: 10,
    fontFamily: 'DMSans-Bold',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  resTitle: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 6,
  },
  resMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  resMetaText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  budgetText: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: '#059669',
  },
  tallyBox: {
    backgroundColor: '#F8FAFC',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tallyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tallyTitle: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
  },
  tallyResult: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: '#059669',
  },
  tallyBarTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 6,
  },
  tallyBarFor: {
    height: '100%',
    backgroundColor: '#059669',
  },
  tallyBarAgainst: {
    height: '100%',
    backgroundColor: '#DC2626',
  },
  tallyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tallyVoteText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  provisionsBox: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  provisionsHeading: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  provisionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  provisionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 17,
  },
  legalSealBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    padding: SPACING.md,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
  },
  sealStampWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  sealStampText: {
    fontSize: 9,
    fontFamily: 'DMSans-Bold',
    color: '#065F46',
    fontWeight: 'bold',
  },
  officerName: {
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
    color: '#166534',
  },
  bindingStatement: {
    fontSize: 10,
    color: '#166534',
    marginTop: 2,
    lineHeight: 14,
  },
  resCardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
  },
  resActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    gap: 6,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  resActionBtnText: {
    fontSize: 12,
    fontFamily: 'DMSans-Medium',
    color: COLORS.primary,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    ...SHADOWS.sm,
  },
  docIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docInfoCol: {
    flex: 1,
  },
  docHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  docCategoryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  docCategoryText: {
    fontSize: 9,
    fontFamily: 'DMSans-Bold',
    color: COLORS.textMuted,
  },
  verifiedSealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  verifiedSealText: {
    fontSize: 9,
    fontFamily: 'DMSans-Bold',
    color: '#059669',
  },
  docTitle: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
    lineHeight: 18,
  },
  docMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  docMetaItem: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  docMetaDot: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  docActionCol: {
    alignItems: 'center',
  },
  docActionCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '80%',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  previewTitle: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
  },
  previewSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  documentViewerBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.md,
  },
  viewerDocTitle: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  viewerCertNote: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  viewerSealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    gap: 6,
  },
  viewerSealText: {
    fontSize: 11,
    fontFamily: 'DMSans-Medium',
    color: '#059669',
  },
  previewFooterBtns: {
    flexDirection: 'row',
    gap: 12,
    marginTop: SPACING.sm,
  },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  modalBtnCancel: {
    backgroundColor: '#F1F5F9',
  },
  modalBtnCancelText: {
    color: COLORS.textSecondary,
    fontFamily: 'DMSans-Medium',
  },
  modalBtnSubmit: {
    backgroundColor: COLORS.primary,
  },
  modalBtnSubmitText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
  },
});
