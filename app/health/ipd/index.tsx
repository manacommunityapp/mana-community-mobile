import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { RADIUS, SHADOWS, FONTS } from "@/constants/config";
import { WardType, IpdAdmissionDto } from "@/types/health";

const DEPARTMENTS = [
  "General Medicine", "Cardiology", "Orthopedics", "Neurology",
  "Gynecology", "Pediatrics", "Oncology", "Gastroenterology",
  "Urology", "Nephrology", "Pulmonology", "ENT"
];

const WARD_OPTIONS: { type: WardType; label: string; desc: string; price: string; icon: string; color: string; bg: string }[] = [
  { type: "GENERAL", label: "General Ward", desc: "Shared 6-bed bay with nursing care.", price: "₹1,200/day", icon: "people", color: "#374151", bg: "#F9FAFB" },
  { type: "SEMI_PRIVATE", label: "Semi-Private", desc: "2-bed room with attached bath.", price: "₹2,500/day", icon: "bed", color: "#0D9488", bg: "#F0FDFA" },
  { type: "PRIVATE", label: "Private Room", desc: "Single-occupancy room, attendant cot.", price: "₹4,500/day", icon: "home", color: "#2563EB", bg: "#EFF6FF" },
  { type: "ICU", label: "ICU / Critical", desc: "24x7 monitoring, ventilator support.", price: "₹8,000+/day", icon: "pulse", color: "#DC2626", bg: "#FEF2F2" },
];

const HOSPITALS = [
  "Apollo Hospital", "Fortis Healthcare", "Max Super Specialty",
  "AIIMS", "Manipal Hospital", "Narayana Health", "Community General Hospital"
];

export default function IpdAdmissionScreen() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [department, setDepartment] = useState("");
  const [hospital, setHospital] = useState("");
  const [patientName, setPatientName] = useState("");
  const [admissionReason, setAdmissionReason] = useState("");
  const [wardType, setWardType] = useState<WardType>("GENERAL");
  const [expectedDate, setExpectedDate] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [admission, setAdmission] = useState<IpdAdmissionDto | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!patientName.trim() || !department || !hospital || !contactPhone.trim()) {
      Alert.alert("Missing Info", "Patient name, department, hospital and contact phone are required.");
      return;
    }
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 900));
      const fakeAdmission: IpdAdmissionDto = {
        id: String(Date.now()),
        admissionUuid: crypto.randomUUID?.() ?? "ipd-uuid",
        patientName,
        hospitalName: hospital,
        department,
        admissionReason,
        wardType,
        status: "REQUESTED",
        expectedAdmissionDate: expectedDate,
        attendingDoctorName: doctorName,
        requestedAt: new Date().toISOString(),
      };
      setAdmission(fakeAdmission);
    } catch {
      Alert.alert("Error", "Could not submit IPD request. Please call the hospital directly.");
    } finally {
      setLoading(false);
    }
  };

  if (admission) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={52} color="#FFFFFF" />
            <Text style={styles.successTitle}>Admission Request Submitted</Text>
            <Text style={styles.successSub}>The hospital will confirm within 2–4 hours</Text>
          </View>

          <View style={styles.summaryCard}>
            {[
              ["Patient", admission.patientName],
              ["Hospital", admission.hospitalName],
              ["Department", admission.department],
              ["Ward", admission.wardType],
              ["Reason", admission.admissionReason || "—"],
              ["Status", "REQUESTED — Pending Hospital Confirmation"],
            ].map(([k, v]) => (
              <View key={k} style={styles.summaryRow}>
                <Text style={styles.summaryKey}>{k}</Text>
                <Text style={styles.summaryVal}>{v}</Text>
              </View>
            ))}
          </View>

          <View style={styles.nextStepsCard}>
            <Text style={styles.nextStepsTitle}>Next Steps</Text>
            {["Hospital coordinator will call within 4 hrs", "Carry ID proof and doctor's referral", "Pre-admission tests may be required", "Insurance pre-authorization if applicable"].map((s, i) => (
              <View key={i} style={styles.nextRow}>
                <View style={styles.nextNum}>
                  <Text style={styles.nextNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.nextText}>{s}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Back to Health</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Step Indicator */}
      <View style={styles.stepRow}>
        {[1, 2, 3].map(s => (
          <View key={s} style={styles.stepItem}>
            <View style={[styles.stepCircle, step >= s && styles.stepCircleActive]}>
              <Text style={[styles.stepNum, step >= s && styles.stepNumActive]}>{s}</Text>
            </View>
            <Text style={[styles.stepLabel, step >= s && styles.stepLabelActive]}>
              {s === 1 ? "Dept & Hospital" : s === 2 ? "Patient Info" : "Ward & Date"}
            </Text>
            {s < 3 && <View style={[styles.stepConnector, step > s && styles.stepConnectorActive]} />}
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {step === 1 && (
          <>
            <Text style={styles.sectionTitle}>Select Department</Text>
            <View style={styles.deptGrid}>
              {DEPARTMENTS.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.deptChip, department === d && styles.deptChipActive]}
                  onPress={() => setDepartment(d)}
                >
                  <Text style={[styles.deptChipText, department === d && styles.deptChipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Select Hospital</Text>
            {HOSPITALS.map(h => (
              <TouchableOpacity
                key={h}
                style={[styles.hospitalCard, hospital === h && styles.hospitalCardActive]}
                onPress={() => setHospital(h)}
              >
                <Ionicons name="business" size={18} color={hospital === h ? "#0D9488" : "#6B7280"} />
                <Text style={[styles.hospitalName, hospital === h && styles.hospitalNameActive]}>{h}</Text>
                {hospital === h && <Ionicons name="checkmark-circle" size={18} color="#0D9488" />}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.nextBtn, (!department || !hospital) && styles.nextBtnDisabled]}
              onPress={() => setStep(2)}
              disabled={!department || !hospital}
            >
              <Text style={styles.nextBtnText}>Next: Patient Info →</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Patient Full Name *</Text>
              <TextInput style={styles.input} value={patientName} onChangeText={setPatientName} placeholder="Name as on ID" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reason for Admission *</Text>
              <TextInput style={[styles.input, styles.inputMultiline]} value={admissionReason} onChangeText={setAdmissionReason} placeholder="Diagnosis or reason (e.g. knee replacement surgery)" multiline numberOfLines={3} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Attending Doctor Name</Text>
              <TextInput style={styles.input} value={doctorName} onChangeText={setDoctorName} placeholder="Doctor who referred / will treat" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contact Phone *</Text>
              <TextInput style={styles.input} value={contactPhone} onChangeText={setContactPhone} placeholder="+91 XXXXX XXXXX" keyboardType="phone-pad" />
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.prevBtn} onPress={() => setStep(1)}>
                <Text style={styles.prevBtnText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextBtn, { flex: 2 }, (!patientName || !contactPhone) && styles.nextBtnDisabled]}
                onPress={() => setStep(3)}
                disabled={!patientName || !contactPhone}
              >
                <Text style={styles.nextBtnText}>Next: Ward & Date →</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.sectionTitle}>Ward Preference</Text>
            {WARD_OPTIONS.map(w => (
              <TouchableOpacity
                key={w.type}
                style={[styles.wardCard, wardType === w.type && styles.wardCardActive]}
                onPress={() => setWardType(w.type)}
              >
                <View style={[styles.wardIcon, { backgroundColor: w.bg }]}>
                  <Ionicons name={w.icon as any} size={22} color={w.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.wardLabel}>{w.label}</Text>
                  <Text style={styles.wardDesc}>{w.desc}</Text>
                  <Text style={[styles.wardPrice, { color: w.color }]}>{w.price}</Text>
                </View>
                {wardType === w.type && <Ionicons name="checkmark-circle" size={20} color="#0D9488" />}
              </TouchableOpacity>
            ))}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Expected Admission Date</Text>
              <TextInput style={styles.input} value={expectedDate} onChangeText={setExpectedDate} placeholder="DD/MM/YYYY" />
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.prevBtn} onPress={() => setStep(2)}>
                <Text style={styles.prevBtnText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { flex: 2 }, loading && styles.nextBtnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>{loading ? "Submitting…" : "Submit Admission Request"}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  stepRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  stepItem: { flexDirection: "row", alignItems: "center", flex: 1, gap: 6 },
  stepCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#E2E8F0", justifyContent: "center", alignItems: "center" },
  stepCircleActive: { backgroundColor: "#0D9488" },
  stepNum: { fontSize: 11, fontWeight: "bold", color: "#94A3B8", fontFamily: FONTS.bold },
  stepNumActive: { color: "#FFFFFF" },
  stepLabel: { fontSize: 9, color: "#94A3B8", fontFamily: FONTS.regular },
  stepLabelActive: { color: "#0D9488", fontWeight: "600" },
  stepConnector: { flex: 1, height: 2, backgroundColor: "#E2E8F0", marginHorizontal: 4 },
  stepConnectorActive: { backgroundColor: "#0D9488" },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 32 },
  sectionTitle: { fontSize: 15, fontWeight: "bold", color: "#0F172A", fontFamily: FONTS.displayBold },
  deptGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  deptChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF" },
  deptChipActive: { backgroundColor: "#0D9488", borderColor: "#0D9488" },
  deptChipText: { fontSize: 12, fontWeight: "600", color: "#374151", fontFamily: FONTS.medium },
  deptChipTextActive: { color: "#FFFFFF" },
  hospitalCard: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: RADIUS.sm, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  hospitalCardActive: { borderColor: "#0D9488", backgroundColor: "#F0FDFA" },
  hospitalName: { flex: 1, fontSize: 13, fontWeight: "600", color: "#374151", fontFamily: FONTS.medium },
  hospitalNameActive: { color: "#0D9488" },
  inputGroup: { gap: 4 },
  inputLabel: { fontSize: 13, fontWeight: "600", color: "#374151", fontFamily: FONTS.semiBold },
  input: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: RADIUS.sm, padding: 12, fontSize: 13, color: "#0F172A", fontFamily: FONTS.regular },
  inputMultiline: { minHeight: 72, textAlignVertical: "top" },
  wardCard: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: RADIUS.squircle, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, ...SHADOWS.card },
  wardCardActive: { borderColor: "#0D9488", borderWidth: 2, backgroundColor: "#F0FDFA" },
  wardIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  wardLabel: { fontSize: 14, fontWeight: "bold", color: "#0F172A", fontFamily: FONTS.bold },
  wardDesc: { fontSize: 12, color: "#475569", marginTop: 1, fontFamily: FONTS.regular },
  wardPrice: { fontSize: 12, fontWeight: "700", marginTop: 2, fontFamily: FONTS.semiBold },
  btnRow: { flexDirection: "row", gap: 10 },
  nextBtn: { flex: 1, backgroundColor: "#0D9488", padding: 14, borderRadius: RADIUS.squircle, alignItems: "center", justifyContent: "center" },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 13, fontFamily: FONTS.bold },
  prevBtn: { flex: 1, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", padding: 14, borderRadius: RADIUS.squircle, alignItems: "center", justifyContent: "center" },
  prevBtnText: { color: "#374151", fontWeight: "600", fontSize: 13, fontFamily: FONTS.medium },
  submitBtn: { backgroundColor: "#0D9488", padding: 14, borderRadius: RADIUS.squircle, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  submitBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 13, fontFamily: FONTS.bold },
  // success
  successCard: { backgroundColor: "#0D9488", borderRadius: RADIUS.xl, padding: 28, alignItems: "center", gap: 8, ...SHADOWS.md },
  successTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold", fontFamily: FONTS.displayBold },
  successSub: { color: "#CCFBF1", fontSize: 13, fontFamily: FONTS.medium },
  summaryCard: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.squircle, padding: 16, gap: 10, ...SHADOWS.card },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryKey: { fontSize: 12, color: "#64748B", fontWeight: "600", width: 90, fontFamily: FONTS.semiBold },
  summaryVal: { fontSize: 12, color: "#0F172A", flex: 1, fontFamily: FONTS.medium },
  nextStepsCard: { backgroundColor: "#F0FDFA", borderRadius: RADIUS.squircle, padding: 16, gap: 10, borderWidth: 1, borderColor: "#CCFBF1" },
  nextStepsTitle: { fontSize: 14, fontWeight: "bold", color: "#0F766E", marginBottom: 4, fontFamily: FONTS.bold },
  nextRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  nextNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#0D9488", justifyContent: "center", alignItems: "center", marginTop: 1 },
  nextNumText: { color: "#FFFFFF", fontSize: 11, fontWeight: "bold", fontFamily: FONTS.bold },
  nextText: { flex: 1, fontSize: 13, color: "#065F46", fontFamily: FONTS.regular },
  backBtn: { padding: 14, alignItems: "center" },
  backBtnText: { color: "#0D9488", fontWeight: "600", fontSize: 14, fontFamily: FONTS.semiBold },
});
