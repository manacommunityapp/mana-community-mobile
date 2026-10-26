import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SHADOWS, FONTS } from '@/constants/config';
import { homeServicesService } from '@/services/homeServicesService';

interface RateServiceModalProps {
  visible: boolean;
  bookingId: string;
  providerName: string;
  category: string;
  onClose: () => void;
  onSuccess: () => void;
}

const RATING_LABELS = ['', 'Poor', 'Needs Improvement', 'Average', 'Good Service', 'Excellent Work!'];
const RATING_EMOJI = ['', '😟', '😐', '🙂', '😊', '🤩'];

export function RateServiceModal({
  visible,
  bookingId,
  providerName,
  category,
  onClose,
  onSuccess,
}: RateServiceModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await homeServicesService.rateBooking(bookingId, rating, comment);
      Alert.alert('Review Submitted', 'Thank you for rating your service experience!');
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.modalAccent} />
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>⭐ Rate Service Experience</Text>
              <Text style={styles.sub}>👤 {providerName} • 🏷️ {category}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.ratingEmojiCircle}>
            <Text style={styles.ratingEmoji}>{RATING_EMOJI[rating]}</Text>
          </View>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} style={styles.starBtn}>
                <Text style={styles.starEmoji}>
                  {star <= rating ? '⭐' : '☆'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>

          <TextInput
            style={styles.input}
            multiline
            numberOfLines={3}
            placeholder="📝 Feedback on quality, cleanliness, punctuality..."
            placeholderTextColor="#94A3B8"
            value={comment}
            onChangeText={setComment}
          />

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <LinearGradient
                colors={['#4F46E5', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGrad}
              >
                <Text style={styles.submitText}>✅ Submit Review</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  modalAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#F59E0B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: { fontSize: 16, fontFamily: FONTS.displayEB, color: '#0F172A' },
  sub: { fontSize: 12, fontFamily: FONTS.regular, color: '#64748B', marginTop: 3 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E8E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  ratingEmojiCircle: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#FFFBEB',
    borderWidth: 2,
    borderColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  ratingEmoji: { fontSize: 28 },

  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: 6 },
  starBtn: { padding: 4 },
  starEmoji: { fontSize: 28 },
  ratingLabel: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: '#4F46E5',
    marginBottom: 14,
  },

  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    padding: 14,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: '#0F172A',
    textAlignVertical: 'top',
    height: 80,
    marginBottom: 16,
  },

  btnRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E8E8F0',
    alignItems: 'center',
  },
  cancelText: { fontSize: 13, fontFamily: FONTS.semiBold, color: '#64748B' },
  submitBtn: { flex: 2, borderRadius: 14, overflow: 'hidden' },
  submitGrad: { paddingVertical: 12, alignItems: 'center' },
  submitText: { fontSize: 13, fontFamily: FONTS.bold, color: '#FFFFFF' },
});
