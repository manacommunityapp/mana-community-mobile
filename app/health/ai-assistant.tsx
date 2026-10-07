import React, { useState } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { healthService } from "@/services/healthService";
import { AiTriageResponse } from "@/types/health";

export default function AiAssistantScreen() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [result, setResult] = useState<AiTriageResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const res = await healthService.triageSymptom(input);
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.disclaimerCard}>
          <Ionicons name="information-circle" size={18} color="#0F766E" />
          <Text style={styles.disclaimerText}>
            <strong>Safe Non-Diagnostic Assistant:</strong> Mana AI does not diagnose illnesses. It helps identify relevant medical specialties and community doctors for clinical care.
          </Text>
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Describe your symptoms or questions:</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Persistent dry cough for 3 days and mild fever..."
            multiline
            value={input}
            onChangeText={setInput}
          />
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleAnalyze}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Get Care Guidance</Text>
            )}
          </TouchableOpacity>
        </View>

        {result && (
          <View style={[styles.resultCard, result.isEmergency && styles.emergencyCard]}>
            {result.isEmergency && (
              <View style={styles.emergencyBadge}>
                <Ionicons name="warning" size={16} color="#DC2626" />
                <Text style={styles.emergencyBadgeText}>Emergency Warning</Text>
              </View>
            )}
            <Text style={styles.specHeader}>Recommended Specialty: {result.recommendedSpecialty}</Text>
            <Text style={styles.guidance}>{result.guidanceText}</Text>

            {result.redFlags.length > 0 && (
              <View style={styles.flagsBox}>
                <Text style={styles.flagsTitle}>Watch For Red Flags:</Text>
                {result.redFlags.map((f, i) => (
                  <Text key={i} style={styles.flagItem}>• {f}</Text>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.findDoctorBtn}
              onPress={() => router.push("/health/doctors")}
            >
              <Text style={styles.findDoctorBtnText}>Find {result.recommendedSpecialty} Doctors →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },
  disclaimerCard: { backgroundColor: "#F0FDFA", borderWidth: 1, borderColor: "#99F6E4", padding: 12, borderRadius: 12, flexDirection: "row", gap: 10, alignItems: "center" },
  disclaimerText: { fontSize: 11, color: "#115E59", flex: 1 },
  inputCard: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", gap: 10 },
  inputLabel: { fontSize: 14, fontWeight: "bold", color: "#111827" },
  input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, padding: 12, height: 90, textAlignVertical: "top", fontSize: 14 },
  submitBtn: { backgroundColor: "#0D9488", padding: 12, borderRadius: 12, alignItems: "center" },
  submitBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14 },
  resultCard: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#99F6E4", gap: 10 },
  emergencyCard: { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  emergencyBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  emergencyBadgeText: { color: "#DC2626", fontWeight: "bold", fontSize: 13 },
  specHeader: { fontSize: 15, fontWeight: "bold", color: "#0F766E" },
  guidance: { fontSize: 13, color: "#374151", lineHeight: 18 },
  flagsBox: { backgroundColor: "#F9FAFB", padding: 10, borderRadius: 10, gap: 4 },
  flagsTitle: { fontSize: 12, fontWeight: "bold", color: "#DC2626" },
  flagItem: { fontSize: 11, color: "#4B5563" },
  findDoctorBtn: { backgroundColor: "#0D9488", padding: 12, borderRadius: 10, alignItems: "center", marginTop: 6 },
  findDoctorBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 13 }
});