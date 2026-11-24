import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSegments } from 'expo-router';
import { useRoleSwitcher } from '@/hooks/useRoleSwitcher';
import { COLORS } from '@/constants/config';

/**
 * Chips for every workspace the user can open (Resident Home, Admin, Sports Admin…).
 * Renders nothing for single-workspace users. Drop it at the top of any portal screen
 * so multi-role users can always get back to the resident home.
 */
export default function WorkspaceSwitcherBar() {
  const { availablePortals, hasMultiplePortals, switchToRole } = useRoleSwitcher();
  const segments = useSegments() as string[];

  if (!hasMultiplePortals) return null;

  const currentGroup = segments[0];
  const isActive = (route: string) => route.split('/').filter(Boolean)[0] === currentGroup;

  return (
    <View style={s.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
        {availablePortals.map((p) => {
          const active = isActive(p.route);
          return (
            <TouchableOpacity
              key={p.route}
              style={[s.chip, active && s.chipActive]}
              onPress={() => !active && switchToRole(p.role)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Ionicons name={p.icon as any} size={14} color={active ? COLORS.white : COLORS.primary} />
              <Text style={[s.label, active && s.labelActive]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingTop: 8, paddingBottom: 4 },
  row: { paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    backgroundColor: COLORS.primaryLight, borderWidth: 1, borderColor: COLORS.primaryMid,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  labelActive: { color: COLORS.white },
});
