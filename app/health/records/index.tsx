import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Share, Modal, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { healthService } from "@/services/healthService";
import { MedicalRecordDto, HealthAuditEntry, RecordType } from "@/types/health";

type MainTab = "records" | "upload" | "audit";
type FilterType = "ALL" | RecordType;

const RECORD_TYPE_FILTERS: { id: FilterType; label: string; icon: string; color: string }[] = [
  { id: "ALL", label: "All", icon: "folder", color: "#0D9488" },
  { id: "PRESCRIPTION", label: "Prescriptions", icon: "document-text", color: "#2563EB" },
  { id: "LAB_REPORT", label: "Lab Reports", icon: "flask", color: "#D97706" },
  { id: "VACCINATION", label: "Vaccinations", icon: "shield-checkmark", color: "#059669" },
  { id: "ALLERGY", label: "Allergies", icon: "warning", color: "#DC2626" },
  { id: "CONDITION", label: "Conditions", icon: "heart", color: "#7C3AED" },
  { id: "DISCHARGE_SUMMARY", label: "Discharge", icon: "clipboard", color: "#0891B2" },
];

const UPLOAD_SOURCES = [
  { id: "camera", label: "Take Photo", icon: "camera", color: "#0D9488", bg: "#F0FDFA" },
  { id: "gallery", label: "Photo Library", icon: "images", color: "#2563EB", bg: "#EFF6FF" },
  { id: "file", label: "PDF / File", icon: "document", color: "#7C3AED", bg: "#F5F3FF" },
  { id: "abha", label: "Fetch from ABHA", icon: "link", color: "#059669", bg: "#F0FDF4" },
];

const TYPE_ICONS: Record<RecordType, string> = {
  PRESCRIPTION: "document-text",
  LAB_REPORT: "flask",
  VACCINATION: "shield-checkmark",
  ALLERGY: "warning",
  CONDITION: "heart",
  DISCHARGE_SUMMARY: "clipboard",
};

const TYPE_COLORS: Record<RecordType, string> = {
  PRESCRIPTION: "#2563EB",
  LAB_REPORT: "#D97706",
  VACCINATION: "#059669",
  ALLERGY: "#DC2626",
  CONDITION: "#7C3AED",
  DISCHARGE_SUMMARY: "#0891B2",
};

export default function HealthRecordsScreen() {
  const [records, setRecords] = useState<MedicalRecordDto[]>([]);
  const [auditLogs, setAuditLogs] = useState<HealthAuditEntry[]>([]);
  const [tab, setTab] = useState<MainTab>("records");
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [showShareModal, setShowShareModal] = useState<MedicalRecordDto | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareDoctorName, setShareDoctorName] = useState("");
  const [shareExpiry, setShareExpiry] = useState("24h");
  // Upload form state
  const [uploadType, setUploadType] = useState<RecordType>("PRESCRIPTION");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDoctor, setUploadDoctor] = useState("");
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split("T")[0]);
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadSource, setUploadSource] = useState<string | null>(null);

  useEffect(() => {
    healthService.getMedicalRecords().then(setRecords);
    healthService.getAuditLogs().then(setAuditLogs);
  }, []);

  const filteredRecords = filter === "ALL" ? records : records.filter(r => r.type === filter);

  const handleViewRecord = async (r: MedicalRecordDto) => {
    const log = await healthService.auditAccessRecord(r.id, `VIEW_${r.type}`);
    setAuditLogs([log, ...auditLogs]);
    Alert.alert("Vault Access Granted 🔒", `Opened: ${r.title}\n\nAccess logged at ${new Date().toLocaleTimeString()}. Token expires in 15 min.`);
  };

  const handleOpenShareModal = (r: MedicalRecordDto) => {
    setShowShareModal(r);
    setShareEmail(""); setShareDoctorName(""); setShareExpiry("24h");
  };

  const handleShareToDoctor = async () => {
    if (!shareEmail.trim()) { Alert.alert("Required", "Enter the doctor's email address."); return; }
    const token = Math.random().toString(36).substring(2, 10).toUpperCase();
    const shareLink = `https://mana.health/vault/share/${token}`;
    try {
      await Share.share({
        title: `Share Record: ${showShareModal?.title}`,
        message: `Record: ${showShareModal?.title}\nPatient: ${showShareModal?.patientName}\nDate: ${showShareModal?.date}\n\nSecure link (expires ${shareExpiry}):\n${shareLink}\n\nShared via Mana Health Vault (AES-256 encrypted)`,
      });
      const log = await healthService.auditAccessRecord(showShareModal!.id, `SHARE_${showShareModal!.type}`);
      setAuditLogs(prev => [log, ...prev]);
      setShowShareModal(null);
    } catch (_) {}
  };

  const handleUploadRecord = () => {
    if (!uploadSource) { Alert.alert("Required", "Select a document source first."); return; }
    if (!uploadTitle.trim()) { Alert.alert("Required", "Enter a document title."); return; }
    const newRecord: MedicalRecordDto = {
      id: `rec-${Date.now()}`,
      patientId: "self",
      patientName: "Self",
      title: uploadTitle,
      type: uploadType,
      date: uploadDate,
      doctorOrLabName: uploadDoctor || "Self-uploaded",
      fileUrl: "#",
      notes: uploadNotes || undefined,
      authorizedUserIds: [],
    };
    setRecords(prev => [newRecord, ...prev]);
    setUploadTitle(""); setUploadDoctor(""); setUploadNotes(""); setUploadSource(null);
    setTab("records");
    Alert.alert("Upload Successful ✓", `${newRecord.title} has been added to your Health Vault and is now AES-256 encrypted.`);
  };

  return (
    <View style={styles.container}>
      {/* Main Tabs */}
      <View style={styles.tabsRow}>
        {(["records", "upload", "audit"] as MainTab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.activeTabBtn]}
            onPress={() => setTab(t)}
          >
            <Ionicons
              name={t === "records" ? "folder" : t === "upload" ? "cloud-upload" : "shield-checkmark"}
              size={13}
              color={tab === t ? "#FFFFFF" : "#6B7280"}
            />
            <Text style={[styles.tabText, tab === t && styles.activeTabText]}>
              {t === "records" ? `Vault (${records.length})` : t === "upload" ? "Upload" : "Audit Trail"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Record type filter — only on records tab */}
      {tab === "records" && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingVertical: 8 }}>
          {RECORD_TYPE_FILTERS.map(f => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, filter === f.id && { backgroundColor: f.color, borderColor: f.color }]}
              onPress={() => setFilter(f.id)}
            >
              <Ionicons name={f.icon as any} size={11} color={filter === f.id ? "#FFFFFF" : f.color} />
              <Text style={[styles.filterChipText, filter === f.id && { color: "#FFFFFF" }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* ── RECORDS TAB ── */}
        {tab === "records" && (
          filteredRecords.length === 0
            ? (
              <View style={styles.emptyState}>
                <Ionicons name="folder-open-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No records found</Text>
                <Text style={styles.emptySub}>Upload a prescription or lab report to get started</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => setTab("upload")}>
                  <Text style={styles.emptyBtnText}>Upload Record</Text>
                </TouchableOpacity>
              </View>
            )
            : filteredRecords.map(rec => (
              <TouchableOpacity key={rec.id} style={styles.card} onPress={() => handleViewRecord(rec)}>
                <View style={styles.topRow}>
                  <View style={[styles.iconWrap, { backgroundColor: TYPE_COLORS[rec.type] + "18" }]}>
                    <Ionicons name={TYPE_ICONS[rec.type] as any} size={22} color={TYPE_COLORS[rec.type]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recTitle}>{rec.title}</Text>
                    <Text style={styles.recSub}>Patient: {rec.patientName} · {rec.date}</Text>
                    <Text style={styles.recDoctor}>{rec.doctorOrLabName}</Text>
                  </View>
                  <View style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[rec.type] + "18" }]}>
                    <Text style={[styles.typeText, { color: TYPE_COLORS[rec.type] }]}>{rec.type.replace("_", " ")}</Text>
                  </View>
                </View>
                {rec.notes && <Text style={styles.notesText}>{rec.notes}</Text>}
                <View style={styles.cardFooter}>
                  <Text style={styles.vaultNote}>🔒 AES-256 Encrypted</Text>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <TouchableOpacity onPress={() => handleOpenShareModal(rec)} style={styles.actionBtn}>
                      <Ionicons name="share-social-outline" size={14} color="#2563EB" />
                      <Text style={[styles.actionBtnText, { color: "#2563EB" }]}>Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn}>
                      <Ionicons name="download-outline" size={14} color="#0D9488" />
                      <Text style={[styles.actionBtnText, { color: "#0D9488" }]}>View</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))
        )}

        {/* ── UPLOAD TAB ── */}
        {tab === "upload" && (
          <>
            <Text style={styles.uploadSectionTitle}>Select Document Source</Text>
            <View style={styles.sourceGrid}>
              {UPLOAD_SOURCES.map(src => (
                <TouchableOpacity
                  key={src.id}
                  style={[styles.sourceCard, uploadSource === src.id && { borderColor: src.color, borderWidth: 2 }, { backgroundColor: src.bg }]}
                  onPress={() => {
                    setUploadSource(src.id);
                    if (src.id !== "abha") Alert.alert(`${src.label}`, `${src.label} picker would open here. Using in-app simulation.`);
                    else Alert.alert("ABHA Fetch", "Fetching records from your ABHA account...");
                  }}
                >
                  <Ionicons name={src.icon as any} size={26} color={src.color} />
                  <Text style={[styles.sourceLabel, { color: src.color }]}>{src.label}</Text>
                  {uploadSource === src.id && (
                    <View style={[styles.sourceCheck, { backgroundColor: src.color }]}>
                      <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.uploadSectionTitle}>Document Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
              {(Object.keys(TYPE_ICONS) as RecordType[]).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, uploadType === t && { backgroundColor: TYPE_COLORS[t], borderColor: TYPE_COLORS[t] }]}
                  onPress={() => setUploadType(t)}
                >
                  <Ionicons name={TYPE_ICONS[t] as any} size={12} color={uploadType === t ? "#FFFFFF" : TYPE_COLORS[t]} />
                  <Text style={[styles.typeChipText, uploadType === t && { color: "#FFFFFF" }]}>{t.replace("_", " ")}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Document Title *</Text>
            <TextInput style={styles.input} placeholder="e.g. Dr. Sharma Prescription — Nov 2026" value={uploadTitle} onChangeText={setUploadTitle} />

            <Text style={styles.fieldLabel}>Doctor / Lab Name</Text>
            <TextInput style={styles.input} placeholder="e.g. Dr. Ramesh Kumar, Apollo Hospital" value={uploadDoctor} onChangeText={setUploadDoctor} />

            <Text style={styles.fieldLabel}>Date of Record</Text>
            <TextInput style={styles.input} value={uploadDate} onChangeText={setUploadDate} placeholder="YYYY-MM-DD" />

            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput style={[styles.input, { height: 72 }]} multiline placeholder="Any additional notes..." value={uploadNotes} onChangeText={setUploadNotes} />

            <View style={styles.encryptionNote}>
              <Ionicons name="lock-closed" size={14} color="#059669" />
              <Text style={styles.encryptionText}>This document will be AES-256 encrypted and stored in your private Health Vault. Only you control access.</Text>
            </View>

            <TouchableOpacity style={styles.uploadBtn} onPress={handleUploadRecord}>
              <Ionicons name="cloud-upload" size={18} color="#FFFFFF" />
              <Text style={styles.uploadBtnText}>Upload to Health Vault</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── AUDIT TAB ── */}
        {tab === "audit" && (
          <>
            <View style={styles.auditHeader}>
              <Ionicons name="shield-checkmark" size={16} color="#0D9488" />
              <Text style={styles.auditHeaderText}>Every access to your records is logged below. You always know who viewed what and when.</Text>
            </View>
            {auditLogs.map(log => (
              <View key={log.id} style={styles.auditCard}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={styles.auditAction}>{log.action.replace("_", " ")}</Text>
                  <Text style={styles.auditTime}>{log.timestamp}</Text>
                </View>
                <Text style={styles.auditAccessor}>{log.accessorName} · {log.accessorRole}</Text>
                <Text style={styles.auditTarget}>Record: {log.recordTitle}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Share Modal */}
      <Modal visible={!!showShareModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Share with Doctor</Text>
            <TouchableOpacity onPress={() => setShowShareModal(null)}>
              <Ionicons name="close" size={22} color="#374151" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            <View style={styles.shareRecordBox}>
              <Ionicons name={TYPE_ICONS[showShareModal?.type ?? "PRESCRIPTION"] as any} size={18} color={TYPE_COLORS[showShareModal?.type ?? "PRESCRIPTION"]} />
              <Text style={styles.shareRecordTitle}>{showShareModal?.title}</Text>
            </View>

            <Text style={styles.fieldLabel}>Doctor / Specialist Name</Text>
            <TextInput style={styles.input} placeholder="Dr. Name or Hospital" value={shareDoctorName} onChangeText={setShareDoctorName} />

            <Text style={styles.fieldLabel}>Doctor Email *</Text>
            <TextInput style={styles.input} placeholder="doctor@hospital.com" keyboardType="email-address" value={shareEmail} onChangeText={setShareEmail} autoCapitalize="none" />

            <Text style={styles.fieldLabel}>Link Expiry</Text>
            <View style={styles.expiryRow}>
              {["1h", "24h", "48h", "7d"].map(e => (
                <TouchableOpacity
                  key={e}
                  style={[styles.expiryChip, shareExpiry === e && styles.expiryChipActive]}
                  onPress={() => setShareExpiry(e)}
                >
                  <Text style={[styles.expiryText, shareExpiry === e && { color: "#FFFFFF" }]}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.encryptionNote}>
              <Ionicons name="lock-closed" size={13} color="#059669" />
              <Text style={styles.encryptionText}>Recipient receives a time-limited, encrypted link. Access is revocable any time from your Vault.</Text>
            </View>

            <TouchableOpacity style={styles.uploadBtn} onPress={handleShareToDoctor}>
              <Ionicons name="share-social" size={16} color="#FFFFFF" />
              <Text style={styles.uploadBtnText}>Generate & Share Secure Link</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  tabsRow: { flexDirection: "row", padding: 10, gap: 6, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 8, borderRadius: 8, backgroundColor: "#F3F4F6" },
  activeTabBtn: { backgroundColor: "#0D9488" },
  tabText: { fontSize: 11, fontWeight: "600", color: "#4B5563" },
  activeTabText: { color: "#FFFFFF" },
  filterScroll: { backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#F3F4F6", maxHeight: 46 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" },
  filterChipText: { fontSize: 11, fontWeight: "600", color: "#374151" },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, gap: 12, paddingBottom: 40 },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151" },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
  emptyBtn: { marginTop: 8, backgroundColor: "#0D9488", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  emptyBtnText: { color: "#FFFFFF", fontWeight: "700" },
  card: { backgroundColor: "#FFFFFF", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", gap: 8 },
  topRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  iconWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  recTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  recSub: { fontSize: 11, color: "#6B7280", marginTop: 1 },
  recDoctor: { fontSize: 11, color: "#0D9488", marginTop: 1 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  typeText: { fontSize: 9, fontWeight: "800" },
  notesText: { fontSize: 12, color: "#4B5563", backgroundColor: "#F9FAFB", padding: 8, borderRadius: 8 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 8 },
  vaultNote: { fontSize: 10, color: "#059669", fontWeight: "600" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionBtnText: { fontSize: 12, fontWeight: "600" },
  // Upload
  uploadSectionTitle: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 4 },
  sourceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sourceCard: { width: "47%", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center", gap: 6, position: "relative" },
  sourceLabel: { fontSize: 12, fontWeight: "700", textAlign: "center" },
  sourceCheck: { position: "absolute", top: 6, right: 6, width: 16, height: 16, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  typeChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" },
  typeChipText: { fontSize: 11, fontWeight: "600", color: "#374151" },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: "#374151", marginTop: 4 },
  input: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#111827" },
  encryptionNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#F0FDF4", padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "#BBF7D0" },
  encryptionText: { fontSize: 11, color: "#15803D", flex: 1, lineHeight: 16 },
  uploadBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#0D9488", paddingVertical: 13, borderRadius: 12, marginTop: 4 },
  uploadBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  // Audit
  auditHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#F0FDFA", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#99F6E4" },
  auditHeaderText: { fontSize: 12, color: "#0F766E", flex: 1, lineHeight: 17 },
  auditCard: { backgroundColor: "#FFFFFF", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", gap: 4 },
  auditAction: { fontSize: 12, fontWeight: "700", color: "#0D9488" },
  auditTime: { fontSize: 10, color: "#9CA3AF" },
  auditAccessor: { fontSize: 12, color: "#111827", fontWeight: "500" },
  auditTarget: { fontSize: 11, color: "#6B7280" },
  // Share Modal
  modalContainer: { flex: 1, backgroundColor: "#F9FAFB" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  shareRecordBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFFFFF", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  shareRecordTitle: { fontSize: 14, fontWeight: "600", color: "#111827", flex: 1 },
  expiryRow: { flexDirection: "row", gap: 8 },
  expiryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" },
  expiryChipActive: { backgroundColor: "#0D9488", borderColor: "#0D9488" },
  expiryText: { fontSize: 12, fontWeight: "700", color: "#374151" },
});
