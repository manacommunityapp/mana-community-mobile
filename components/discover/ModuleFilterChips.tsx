import React from 'react';
import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { MODULE_CONFIGS, MODULE_ICON, MODULE_LABEL } from '@/constants/searchModules';
import { SPACING } from '@/constants/config';

const PRIMARY = '#7C3AED';

interface ModuleFilterChipsProps {
  activeModules: string[];
  onToggle: (module: string) => void;
  onClearAll: () => void;
  facets?: Record<string, number>;
}

export function ModuleFilterChips({ activeModules, onToggle, onClearAll, facets }: ModuleFilterChipsProps) {
  const allActive = activeModules.length === 0;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* All chip */}
      <TouchableOpacity
        style={[styles.chip, allActive && styles.chipActive]}
        onPress={onClearAll}
      >
        <Text style={[styles.chipText, allActive && styles.chipTextActive]}>All</Text>
      </TouchableOpacity>

      {MODULE_CONFIGS.map((m) => {
        const isActive = activeModules.includes(m.value);
        const count = facets?.[m.value];
        return (
          <TouchableOpacity
            key={m.value}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onToggle(m.value)}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {m.icon} {m.label}{count != null && count > 0 ? ` · ${count}` : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
});
