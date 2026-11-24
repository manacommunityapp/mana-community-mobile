import React from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { SearchResultDto } from '@/services/searchService';
import { MODULE_ICON, MODULE_LABEL, MODULE_BG } from '@/constants/searchModules';
import { COLORS, RADIUS, SPACING } from '@/constants/config';
import { resolveImageUrl } from '@/utils/imageUrlUtils';

interface SearchResultCardProps {
  result: SearchResultDto;
  onPress: (result: SearchResultDto) => void;
}

export function SearchResultCard({ result, onPress }: SearchResultCardProps) {
  const icon = MODULE_ICON[result.module] ?? '📄';
  const label = MODULE_LABEL[result.module] ?? result.module;
  const bg = MODULE_BG[result.module] ?? '#F3F4F6';
  const tags = result.tags?.slice(0, 3) ?? [];

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(result)} activeOpacity={0.7}>
      {/* Thumbnail */}
      {result.imageUrl ? (
        <Image source={{ uri: resolveImageUrl(result.imageUrl) }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.iconThumbnail, { backgroundColor: bg }]}>
          <Text style={styles.iconEmoji}>{icon}</Text>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Module chip */}
        <View style={styles.chip}>
          <Text style={styles.chipText}>{icon} {label}</Text>
        </View>

        <Text style={styles.title} numberOfLines={1}>{result.title}</Text>

        {result.subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>{result.subtitle}</Text>
        ) : null}

        {result.description ? (
          <Text style={styles.description} numberOfLines={2}>{result.description}</Text>
        ) : null}

        {tags.length > 0 && (
          <View style={styles.tags}>
            {tags.map((t) => (
              <View key={t} style={styles.tag}>
                <Text style={styles.tagText}>{t}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    marginRight: 12,
    flexShrink: 0,
  },
  iconThumbnail: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  chipText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 4,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 99,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 10,
    color: '#64748B',
  },
});
