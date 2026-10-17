import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Alert, Animated
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { healthService } from "@/services/healthService";
import { HealthAppointmentDto } from "@/types/health";

type RoomState = "CONNECTING" | "CONNECTED" | "ENDED";

export default function VideoRoomScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const router = useRouter();

  const [roomState, setRoomState] = useState<RoomState>("CONNECTING");
  const [appointment, setAppointment] = useState<HealthAppointmentDto | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    healthService.getAppointments().then(appts => {
      const found = appts.find(a => a.id === appointmentId);
      if (found) setAppointment(found);
    });

    // Simulate connection
    const connectTimer = setTimeout(() => {
      setRoomState("CONNECTED");
    }, 2000);

    return () => {
      clearTimeout(connectTimer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [appointmentId]);

  useEffect(() => {
    if (roomState === "CONNECTED") {
      timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
      startPulse();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [roomState]);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleEndCall = () => {
    Alert.alert(
      "End Consultation?",
      "Are you sure you want to end this video consultation?",
      [
        { text: "Continue", style: "cancel" },
        {
          text: "End Call",
          style: "destructive",
          onPress: () => {
            setRoomState("ENDED");
            if (timerRef.current) clearInterval(timerRef.current);
          }
        }
      ]
    );
  };

  if (roomState === "ENDED") {
    return (
      <View style={styles.endedContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.endedContent}>
          <View style={styles.endedIconWrap}>
            <Ionicons name="videocam-off" size={44} color="#0D9488" />
          </View>
          <Text style={styles.endedTitle}>Consultation Ended</Text>
          <Text style={styles.endedDuration}>Duration: {formatTime(elapsed)}</Text>

          <View style={styles.postCallActions}>
            <Text style={styles.postCallHeading}>Next Steps</Text>

            <TouchableOpacity
              style={styles.postActionBtn}
              onPress={() => {
                router.replace(`/health/appointments/${appointmentId}`);
              }}
            >
              <View style={styles.postActionIcon}>
                <Ionicons name="document-text" size={20} color="#0D9488" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.postActionTitle}>View Prescription</Text>
                <Text style={styles.postActionSub}>Doctor may have issued a prescription</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.postActionBtn}
              onPress={() => router.push("/health/labs")}
            >
              <View style={styles.postActionIcon}>
                <Ionicons name="flask" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.postActionTitle}>Book Lab Tests</Text>
                <Text style={styles.postActionSub}>If lab tests were recommended</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.postActionBtn}
              onPress={() => router.push("/health/pharmacy")}
            >
              <View style={styles.postActionIcon}>
                <Ionicons name="medkit" size={20} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.postActionTitle}>Order Medicines</Text>
                <Text style={styles.postActionSub}>Doorstep delivery from prescription</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.homeBtn} onPress={() => router.push("/health")}>
            <Text style={styles.homeBtnText}>Back to Health Hub</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Doctor View (Main) */}
      <View style={styles.doctorFrame}>
        {roomState === "CONNECTING" ? (
          <View style={styles.connectingWrap}>
            <Ionicons name="hourglass" size={40} color="#CCFBF1" />
            <Text style={styles.connectingText}>Connecting to secure room…</Text>
            <Text style={styles.connectingSub}>End-to-end encrypted consultation</Text>
          </View>
        ) : (
          <View style={styles.connectedWrap}>
            <Animated.View style={[styles.docAvatarRing, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.docAvatar}>
                <Ionicons name="person" size={52} color="#0D9488" />
              </View>
            </Animated.View>
            <Text style={styles.docName}>{appointment?.doctorName ?? "Doctor"}</Text>
            <Text style={styles.docSpec}>{appointment?.doctorSpecialty ?? "Specialist"}</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE • {formatTime(elapsed)}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Self View (PIP) */}
      <View style={styles.selfView}>
        {cameraOff ? (
          <View style={styles.cameraOffPip}>
            <Ionicons name="videocam-off" size={18} color="#FFFFFF" />
          </View>
        ) : (
          <View style={styles.selfAvatar}>
            <Ionicons name="person" size={22} color="#94A3B8" />
          </View>
        )}
        <Text style={styles.selfLabel}>You</Text>
      </View>

      {/* Top Bar */}
      {roomState === "CONNECTED" && (
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <View style={styles.encryptedBadge}>
              <Ionicons name="lock-closed" size={11} color="#0D9488" />
              <Text style={styles.encryptedText}>Encrypted</Text>
            </View>
          </View>
          <Text style={styles.topBarTime}>{formatTime(elapsed)}</Text>
          <View style={styles.topBarRight} />
        </View>
      )}

      {/* Bottom Controls */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.controlBtn, muted && styles.controlBtnActive]}
          onPress={() => setMuted(v => !v)}
        >
          <Ionicons
            name={muted ? "mic-off" : "mic"}
            size={22}
            color={muted ? "#DC2626" : "#FFFFFF"}
          />
          <Text style={[styles.controlLabel, muted && { color: "#DC2626" }]}>
            {muted ? "Unmute" : "Mute"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, cameraOff && styles.controlBtnActive]}
          onPress={() => setCameraOff(v => !v)}
        >
          <Ionicons
            name={cameraOff ? "videocam-off" : "videocam"}
            size={22}
            color={cameraOff ? "#DC2626" : "#FFFFFF"}
          />
          <Text style={[styles.controlLabel, cameraOff && { color: "#DC2626" }]}>
            {cameraOff ? "Start Cam" : "Camera"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlBtn}
          onPress={() => Alert.alert("Chat", "In-consultation chat is available in the full build.")}
        >
          <Ionicons name="chatbubble-ellipses" size={22} color="#FFFFFF" />
          <Text style={styles.controlLabel}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, styles.endBtn]}
          onPress={handleEndCall}
        >
          <Ionicons name="call" size={22} color="#FFFFFF" />
          <Text style={[styles.controlLabel, { color: "#FFFFFF" }]}>End</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },

  // Doctor frame
  doctorFrame: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
  },

  connectingWrap: { alignItems: "center", gap: 12 },
  connectingText: { color: "#CCFBF1", fontSize: 16, fontWeight: "700" },
  connectingSub: { color: "#64748B", fontSize: 12 },

  connectedWrap: { alignItems: "center", gap: 12 },
  docAvatarRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: "#0D9488",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(13,148,136,0.1)",
  },
  docAvatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#CCFBF1",
    justifyContent: "center",
    alignItems: "center",
  },
  docName: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  docSpec: { color: "#94A3B8", fontSize: 13 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(13,148,136,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#10B981" },
  liveText: { color: "#34D399", fontSize: 12, fontWeight: "700" },

  // PIP self-view
  selfView: {
    position: "absolute",
    top: 56,
    right: 16,
    width: 80,
    height: 100,
    borderRadius: 12,
    backgroundColor: "#1E293B",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
    gap: 4,
  },
  selfAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#334155", justifyContent: "center", alignItems: "center" },
  cameraOffPip: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#374151", justifyContent: "center", alignItems: "center" },
  selfLabel: { color: "#94A3B8", fontSize: 10 },

  // Top bar
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: "rgba(15,23,42,0.6)",
  },
  topBarLeft: { flex: 1 },
  topBarRight: { flex: 1 },
  encryptedBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(13,148,136,0.15)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start" },
  encryptedText: { fontSize: 10, color: "#0D9488", fontWeight: "600" },
  topBarTime: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },

  // Bottom controls
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    paddingVertical: 24,
    paddingBottom: 40,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
  },
  controlBtn: { alignItems: "center", gap: 6, paddingHorizontal: 16 },
  controlBtnActive: {},
  controlLabel: { color: "#94A3B8", fontSize: 11, fontWeight: "600" },
  endBtn: { backgroundColor: "#DC2626", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30 },

  // Ended state
  endedContainer: { flex: 1, backgroundColor: "#F8FAFC" },
  endedContent: { flex: 1, padding: 24, gap: 20, paddingTop: 60 },
  endedIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#CCFBF1", justifyContent: "center", alignItems: "center", alignSelf: "center" },
  endedTitle: { fontSize: 22, fontWeight: "800", color: "#0F172A", textAlign: "center" },
  endedDuration: { fontSize: 14, color: "#64748B", textAlign: "center" },

  postCallActions: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#E2E8F0", gap: 12 },
  postCallHeading: { fontSize: 15, fontWeight: "800", color: "#0F172A", marginBottom: 4 },
  postActionBtn: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  postActionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" },
  postActionTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  postActionSub: { fontSize: 11, color: "#94A3B8", marginTop: 2 },

  homeBtn: { backgroundColor: "#0D9488", paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  homeBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
});
