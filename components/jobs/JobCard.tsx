import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { formatDistanceToNow, isPast } from 'date-fns';
import { COLORS } from '@/constants/config';
import type { JobDto } from '@/types/api';

export const JOB_CATEGORY_META: Record<string, { emoji: string; label: string }> = {
  HOME_REPAIRS: { emoji: '🔧', label: 'Home Repairs'  },
  CLEANING:     { emoji: '🧹', label: 'Cleaning'      },
  CHILDCARE:    { emoji: '👶', label: 'Childcare'     },
  TUTORING:     { emoji: '🎓', label: 'Tutoring'      },
  PET_CARE:     { emoji: '🐾', label: 'Pet Care'      },
  TRANSPORT:    { emoji: '🚗', label: 'Transport'     },
  TECH_HELP:    { emoji: '💻', label: 'Tech Help'     },
  COOKING:      { emoji: '🍳', label: 'Cooking'       },
  FITNESS:      { emoji: '💪', label: 'Fitness'       },
  MOVING:       { emoji: '📦', label: 'Moving Help'   },
  GARDEN:       { emoji: '🌿', label: 'Garden'        },
  CREATIVE:     { emoji: '🎨', label: 'Creative'      },
  ERRANDS:      { emoji: '🛒', label: 'Errands'       },
  OTHER:        { emoji: '💼', label: 'Other'         },
};

export const JOB_TYPE_LABEL: Record<string, string> = {
  ONE_TIME:  'One-time',  RECURRING: 'Recurring',
  PART_TIME: 'Part-time', FULL_TIME: 'Full-time',
};

function payLabel(job: JobDto): string {
  if (job.payType === 'VOLUNTEER') return '🤝 Volunteer';
  if (job.payType === 'NEGOTIABLE') return '💬 Negotiable';
  if (job.payAmount == null) return job.payType === 'HOURLY' ? '₹/hr' : '₹ Fixed';
  return job.payType === 'HOURLY'
    ? `₹${job.payAmount}/hr`
    : `₹${job.payAmount.toLocaleString('en-IN')}`;
}

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  OPEN:    { label: 'Hiring',  bg: '#D1FAE5', color: '#065F46' },
  FILLED:  { label: 'Filled',  bg: '#FEF3C7', color: '#92400E' },
  CLOSED:  { label: 'Closed',  bg: '#F3F4F6', color: COLORS.textMuted },
  EXPIRED: { label: 'Expired', bg: '#FEE2E2', color: COLORS.error },
};

interface JobCardProps {
  job:      JobDto;
  compact?: boolean;
}

export function JobCard({ job, compact = false }: JobCardProps) {
  const router = useRouter();
  const meta   = JOB_CATEGORY_META[job.category] ?? JOB_CATEGORY_META.OTHER;
  const status = STATUS_STYLE[job.status] ?? STATUS_STYLE.OPEN;

  return (
    <TouchableOpacity
      style={[c.card, compact && c.cardCompact]}
      onPress={() => router.push(`/jobs/${job.id}`)}
      activeOpacity={0.85}
    >
      {/* Header row */}
      <View style={c.header}>
        <View style={c.categoryBadge}>
          <Text style={c.categoryEmoji}>{meta.emoji}</Text>
        </View>
        <View style={c.headerText}>
          <Text style={c.title} numberOfLines={2}>{job.title}</Text>
          <Text style={c.poster}>
            {job.posterName}{job.posterFlat ? ` · ${job.posterFlat}` : ''}
          </Text>
        </View>
        <View style={[c.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[c.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      {/* Description preview */}
      {!compact && (
        <Text style={c.description} numberOfLines={2}>{job.description}</Text>
      )}

      {/* Tags row */}
      <View style={c.tags}>
        <View style={c.tag}>
          <Text style={c.tagText}>{meta.label}</Text>
        </View>
        <View style={c.tag}>
          <Text style={c.tagText}>{JOB_TYPE_LABEL[job.jobType] ?? job.jobType}</Text>
        </View>
        <View style={[c.tag, c.payTag]}>
          <Text style={[c.tagText, c.payText]}>{payLabel(job)}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={c.footer}>
        {job.location && (
          <Text style={c.footerItem}>📍 {job.location}</Text>
        )}
        <Text style={c.footerItem}>
          👥 {job.applicationCount} applicant{job.applicationCount !== 1 ? 's' : ''}
        </Text>
        <Text style={c.footerItem}>
          🕐 {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
        </Text>
        {job.hasApplied && (
          <View style={c.appliedBadge}>
            <Text style={c.appliedText}>
              {job.myApplicationStatus === 'ACCEPTED' ? '✅ Accepted'
               : job.myApplicationStatus === 'REJECTED' ? '❌ Rejected'
               : '⏳ Applied'}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const c = StyleSheet.create({
  card:          { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: COLORS.border },
  cardCompact:   { padding: 11, gap: 8 },
  header:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  categoryBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  categoryEmoji: { fontSize: 22 },
  headerText:    { flex: 1, gap: 3 },
  title:         { fontSize: 15, fontWeight: '700', color: COLORS.text, lineHeight: 20 },
  poster:        { fontSize: 12, color: COLORS.textMuted },
  statusBadge:   { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', flexShrink: 0 },
  statusText:    { fontSize: 11, fontWeight: '700' },
  description:   { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  tags:          { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag:           { backgroundColor: '#F3F4F6', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  tagText:       { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  payTag:        { backgroundColor: '#EEF2FF' },
  payText:       { color: COLORS.primary, fontWeight: '700' },
  footer:        { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  footerItem:    { fontSize: 11, color: COLORS.textMuted },
  appliedBadge:  { backgroundColor: '#EEF2FF', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  appliedText:   { fontSize: 11, fontWeight: '700', color: COLORS.primary },
});
