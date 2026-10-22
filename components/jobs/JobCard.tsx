import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import type { JobDto } from '@/types/api';

export const JOB_CATEGORY_META: Record<string, { emoji: string; label: string; bg: string; color: string }> = {
  HOME_REPAIRS: { emoji: '🔧', label: 'Home Repairs', bg: '#EFF6FF', color: '#2563EB' },
  CLEANING:     { emoji: '🧹', label: 'Cleaning',     bg: '#ECFDF5', color: '#059669' },
  CHILDCARE:    { emoji: '👶', label: 'Childcare',    bg: '#FDF2F8', color: '#DB2777' },
  TUTORING:     { emoji: '🎓', label: 'Tutoring',     bg: '#EEF2FF', color: '#4F46E5' },
  PET_CARE:     { emoji: '🐾', label: 'Pet Care',     bg: '#FFFBEB', color: '#D97706' },
  TRANSPORT:    { emoji: '🚗', label: 'Transport',    bg: '#F0F9FF', color: '#0284C7' },
  TECH_HELP:    { emoji: '💻', label: 'Tech Help',    bg: '#F5F3FF', color: '#7C3AED' },
  COOKING:      { emoji: '🍳', label: 'Cooking',      bg: '#FFF7ED', color: '#EA580C' },
  FITNESS:      { emoji: '💪', label: 'Fitness',      bg: '#F0FDF4', color: '#16A34A' },
  MOVING:       { emoji: '📦', label: 'Moving Help',  bg: '#FEF3C7', color: '#B45309' },
  GARDEN:       { emoji: '🌿', label: 'Garden',       bg: '#ECFDF5', color: '#047857' },
  CREATIVE:     { emoji: '🎨', label: 'Creative',     bg: '#FDF4FF', color: '#C026D3' },
  ERRANDS:      { emoji: '🛒', label: 'Errands',      bg: '#FEF2F2', color: '#DC2626' },
  OTHER:        { emoji: '💼', label: 'Community',    bg: '#F1F5F9', color: '#475569' },
};

export const JOB_TYPE_LABEL: Record<string, string> = {
  ONE_TIME:  'One-time',
  RECURRING: 'Recurring',
  PART_TIME: 'Part-time',
  FULL_TIME: 'Full-time',
  CONTRACT:  'Contract',
};

function payLabel(job: JobDto): string {
  if (job.payType === 'VOLUNTEER') return '🤝 Volunteer';
  if (job.payType === 'NEGOTIABLE') return '💬 Negotiable';
  if (job.payAmount == null) return job.payType === 'HOURLY' ? '₹/hr' : '₹ Fixed';
  return job.payType === 'HOURLY'
    ? `₹${job.payAmount}/hr`
    : `₹${job.payAmount.toLocaleString('en-IN')}`;
}

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  OPEN:    { label: 'Active',  bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
  FILLED:  { label: 'Filled',  bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
  CLOSED:  { label: 'Closed',  bg: '#F1F5F9', color: '#64748B', border: '#E2E8F0' },
  EXPIRED: { label: 'Expired', bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
};

interface JobCardProps {
  job:      JobDto;
  compact?: boolean;
}

export function JobCard({ job, compact = false }: JobCardProps) {
  const router = useRouter();
  const meta   = (job.category && JOB_CATEGORY_META[job.category]) ? JOB_CATEGORY_META[job.category] : JOB_CATEGORY_META.OTHER;
  const status = (job.status && STATUS_STYLE[job.status]) ? STATUS_STYLE[job.status] : STATUS_STYLE.OPEN;

  const poster = job.postedByName || job.posterName || 'Neighbor';
  const flat = job.postedByFlat || job.posterFlat;

  return (
    <TouchableOpacity
      style={[c.card, compact && c.cardCompact]}
      onPress={() => router.push(`/jobs/${job.id}`)}
      activeOpacity={0.88}
    >
      {/* Top row: Category icon, titles, status pill */}
      <View style={c.header}>
        <View style={[c.categoryBadge, { backgroundColor: meta.bg }]}>
          <Text style={c.categoryEmoji}>{meta.emoji}</Text>
        </View>

        <View style={c.headerText}>
          <Text style={c.title} numberOfLines={compact ? 1 : 2}>{job.title}</Text>
          <View style={c.posterRow}>
            <Ionicons name="person-circle-outline" size={13} color={COLORS.textMuted} />
            <Text style={c.poster} numberOfLines={1}>
              {poster}{flat ? ` • ${flat}` : ''}
            </Text>
          </View>
        </View>

        <View style={[c.statusBadge, { backgroundColor: status.bg, borderColor: status.border }]}>
          <Text style={[c.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      {/* Description snippet */}
      {!compact && job.description ? (
        <Text style={c.description} numberOfLines={2}>{job.description}</Text>
      ) : null}

      {/* Tags row: Type, Pay, Category */}
      <View style={c.tags}>
        <View style={[c.tag, c.payTag]}>
          <Ionicons name="wallet-outline" size={12} color={COLORS.primary} style={{ marginRight: 3 }} />
          <Text style={[c.tagText, c.payText]}>{payLabel(job)}</Text>
        </View>

        <View style={c.tag}>
          <Text style={c.tagText}>
            {(job.jobType && JOB_TYPE_LABEL[job.jobType]) ? JOB_TYPE_LABEL[job.jobType] : (job.jobType || 'One-time')}
          </Text>
        </View>

        <View style={c.tag}>
          <Text style={c.tagText}>{meta.label}</Text>
        </View>
      </View>

      {/* Footer Divider & Metadata */}
      <View style={c.footerDivider} />
      <View style={c.footer}>
        <View style={c.metaItem}>
          <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
          <Text style={c.footerText} numberOfLines={1}>{job.location || 'Within Society'}</Text>
        </View>

        <View style={c.metaItem}>
          <Ionicons name="people-outline" size={12} color={COLORS.textMuted} />
          <Text style={c.footerText}>
            {job.applicationCount ?? job.applicantCount ?? 0} applied
          </Text>
        </View>

        <View style={c.metaItem}>
          <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
          <Text style={c.footerText}>
            {job.createdAt || job.postedAt
              ? formatDistanceToNow(new Date(job.createdAt || job.postedAt!), { addSuffix: true })
              : 'Recently'}
          </Text>
        </View>

        {job.hasApplied && (
          <View style={c.appliedBadge}>
            <Text style={c.appliedText}>
              {job.myApplicationStatus === 'ACCEPTED' ? '✓ Accepted'
               : job.myApplicationStatus === 'REJECTED' ? '✕ Not Selected'
               : '⏳ Applied'}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const c = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 15,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  cardCompact: {
    padding: 12,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  categoryBadge: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },
  posterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  poster: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderWidth: 1,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
  description: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
    fontFamily: FONTS.regular,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  tagText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    fontFamily: FONTS.medium,
  },
  payTag: {
    backgroundColor: '#EEF2FF',
    borderColor: '#E0E7FF',
  },
  payText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
  footerDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
  },
  footerText: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: FONTS.regular,
  },
  appliedBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  appliedText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
});

