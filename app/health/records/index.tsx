import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { healthService } from "@/services/healthService";
import { MedicalRecordDto, HealthAuditEntry } from "@/types/health";

export default function HealthRecordsScreen() {
  const [records, setRecords] = useState<MedicalRecordDto[]>([]);
  const [auditLogs, setAuditLogs] = useState<HealthAuditEntry[]>([]);
  const [tab, setTab] = useState<"records" | "audit">("records");

  useEffect(() => {
    healthService.getMedicalRecords().then(setRecords);
    healthService.getAuditLogs().then(setAuditLogs);
  }, []);

  const handleViewRecord = async (r: MedicalRecordDto) => {
    const log = await healthService.auditAccessRecord(r.id, `VIEW_${r.type}`);
    setAuditLogs([log, ...auditLogs]);
    Alert.alert(
      "Encrypted Vault Access Granted",
      `Opened ${r.title}. Short-lived token generated. Access logged in audit trail at ${new Date().toLocaleTimeString()}.`
    );
  };

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "records" && styles.activeTabBtn]}
          onPress={() => setTab("records")}
        >
          <Text style={[styles.tabText, tab === "records" && styles.activeTabText]}>📁 Health Vault ({records.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "audit" && styles.activeTabBtn]}
          onPress={() => setTab("audit")}
        >
          <Text style={[styles.tabText, tab === "audit" && styles.activeTabText]}>🛡️ Access Audit Trail ({auditLogs.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {tab === "records" ? (
          records.map(rec => (
            <TouchableOpacity
              key={rec.id}
              style={styles.card}
              onPress={() => handleViewRecord(rec)}
            >
              <View style={styles.topRow}>
                <View style={styles.iconWrap}>
                  <Ionicons name="document-text" size={24} color="#0D9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recTitle}>{rec.title}</Text>
                  <Text style={styles.recSub}>Patient: {rec.patientName} • {rec.date}</Text>
                  <Text style={styles.recDoctor}>Provider: {rec.doctorOrLabName}</Text>
                </View>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{rec.type}</Text>
                </View>
              </View>
              {rec.notes && <Text style={styles.notesText}>{rec.notes}</Text>}
              <View style={styles.cardFooter}>
                <Text style={styles.vaultNote}>🔒 AES-256 Encrypted Private Storage</Text>
                <Text style={styles.viewLink}>View Document →</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          auditLogs.map(log => (
            <View key={log.id} style={styles.auditCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={styles.auditAction}>{log.action}</Text>
                <Text style={styles.auditTime}>{log.timestamp}</Text>
              </View>
              <Text style={styles.auditAccessor}>{log.accessorName} ({log.accessorRole})</Text>
              <Text style={styles.auditTarget}>Record: {log.recordTitle}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  tabsRow: { flexDirection: "row", padding: 12, gap: 10, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8, backgroundColor: "#F3F4F6" },
  activeTabBtn: { backgroundColor: "#0D9488" },
  tabText: { fontSize: 12, fontWeight: "600", color: "#4B5563" },
  activeTabText: { color: "#FFFFFF" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  card: { backgroundColor: "#FFFFFF", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", gap: 8 },
  topRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#CCFBF1", justifyContent: "center", alignItems: "center" },
  recTitle: { fontSize: 15, fontWeight: "bold", color: "#111827" },
  recSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  recDoctor: { fontSize: 11, color: "#0D9488", marginTop: 1 },
  typeBadge: { backgroundColor: "#E0E7FF", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  typeText: { color: "#4338CA", fontSize: 10, fontWeight: "bold" },
  notesText: { fontSize: 12, color: "#4B5563", backgroundColor: "#F9FAFB", padding: 8, borderRadius: 8 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 8 },
  vaultNote: { fontSize: 10, color: "#059669", fontWeight: "600" },
  viewLink: { fontSize: 12, fontWeight: "bold", color: "#0D9488" },
  auditCard: { backgroundColor: "#FFFFFF", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", gap: 4 },
  auditAction: { fontSize: 12, fontWeight: "bold", color: "#0D9488" },
  auditTime: { fontSize: 10, color: "#9CA3AF" },
  auditAccessor: { fontSize: 12, color: "#111827", fontWeight: "500" },
  auditTarget: { fontSize: 11, color: "#6B7280" }
});