import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  InsuranceScreen, StateView, DisclosureBanner, Card, Button, SandboxBadge,
} from '@/components/insurance/InsuranceUI';
import { insuranceService } from '@/services/insuranceService';
import { sortCatalogue, categoryFromParam, categoryLabel } from '@/constants/insurance';
import { useInsuranceShortlist, MAX_SHORTLIST } from '@/hooks/useInsuranceShortlist';
import { THEME } from '@/constants/theme';
import { FONTS, RADIUS } from '@/constants/config';
import type { CatalogueItem } from '@/types/insurance';

type SortKey = 'NAME' | 'INSURER';

function ProductCard({ item, onToggle, shortlisted, maxed }: {
  item: CatalogueItem;
  onToggle: () => void;
  shortlisted: boolean;
  maxed: boolean;
}) {
  return (
    <Card>
      <SandboxBadge label={item.dataSource === 'SANDBOX' ? 'SANDBOX — not a real product' : null} />
      <Text style={s.productName}>{item.name}</Text>
      <Text style={s.insurer}>{item.insurerName}</Text>
      {!!item.irdaiRegistrationNo && (
        <Text style={s.meta}>IRDAI Reg: {item.irdaiRegistrationNo}</Text>
      )}
      {!!item.verifiedAt && (
        <Text style={s.meta}>Data verified: {new Date(item.verifiedAt).toLocaleDateString('en-IN')}</Text>
      )}
      <View style={s.links}>
        {!!item.brochureUrl && (
          <TouchableOpacity onPress={() => Linking.openURL(item.brochureUrl!)} accessibilityRole="link" accessibilityLabel="View brochure">
            <Text style={s.link}>📄 Brochure</Text>
          </TouchableOpacity>
        )}
        {!!item.policyWordingUrl && (
          <TouchableOpacity onPress={() => Linking.openURL(item.policyWordingUrl!)} accessibilityRole="link" accessibilityLabel="View policy wording">
            <Text style={s.link}>📋 Policy Wording</Text>
          </TouchableOpacity>
        )}
      </View>
      {!!item.partnerDisclosure && <Text style={s.disclosure}>{item.partnerDisclosure}</Text>}
      <Button
        label={shortlisted ? '✓ Remove from compare' : maxed ? 'Compare list full (max 4)' : '+ Add to compare'}
        variant={shortlisted ? 'danger' : 'secondary'}
        onPress={onToggle}
        disabled={!shortlisted && maxed}
      />
    </Card>
  );
}

export default function CatalogueScreen() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category: string }>();
  const cat = categoryFromParam(category);
  const [sort, setSort] = useState<SortKey>('NAME');
  const { items: shortlist, toggle, has } = useInsuranceShortlist();

  const q = useQuery({
    queryKey: ['ins-catalogue', cat],
    queryFn: () => insuranceService.catalogue(cat!),
    enabled: !!cat,
    staleTime: 120_000,
  });

  const sorted = q.data ? sortCatalogue(q.data, sort) : [];
  const title = cat ? categoryLabel(cat) : 'Insurance';

  return (
    <InsuranceScreen title={title}>
      <DisclosureBanner />

      {shortlist.length >= 2 && (
        <Button label={`Compare ${shortlist.length} products`} onPress={() => router.push('/insurance/compare' as any)} />
      )}

      {/* Sort chips */}
      <View style={s.sortRow}>
        <Text style={s.sortLabel}>Sort by:</Text>
        {(['NAME', 'INSURER'] as SortKey[]).map((k) => (
          <TouchableOpacity
            key={k}
            style={[s.chip, sort === k && s.chipActive]}
            onPress={() => setSort(k)}
            accessibilityRole="radio"
            accessibilityState={{ checked: sort === k }}
          >
            <Text style={[s.chipText, sort === k && s.chipActiveText]}>{k === 'NAME' ? 'Name' : 'Insurer'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!cat ? (
        <StateView kind="empty" title="Unknown category" message="Please go back and select a valid category." />
      ) : q.isLoading ? (
        <StateView kind="loading" message="Fetching products…" />
      ) : q.isError ? (
        <StateView kind="error" onRetry={() => q.refetch()} />
      ) : !sorted.length ? (
        <StateView kind="empty" title="No products available" message="No verified insurance products are currently listed for this category." />
      ) : (
        sorted.map((item) => (
          <ProductCard
            key={item.productVersionId}
            item={item}
            shortlisted={has(item.productVersionId)}
            maxed={!has(item.productVersionId) && shortlist.length >= MAX_SHORTLIST}
            onToggle={() => toggle(item)}
          />
        ))
      )}
    </InsuranceScreen>
  );
}

const s = StyleSheet.create({
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sortLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.textSecondary },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: THEME.surfaceMuted, borderWidth: 1, borderColor: THEME.border },
  chipActive: { backgroundColor: THEME.brand, borderColor: THEME.brand },
  chipText: { fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.textPrimary },
  chipActiveText: { color: '#fff' },
  productName: { fontFamily: FONTS.displaySemi, fontSize: 15, color: THEME.textPrimary, marginBottom: 2 },
  insurer: { fontFamily: FONTS.regular, fontSize: 13, color: THEME.textSecondary, marginBottom: 4 },
  meta: { fontFamily: FONTS.regular, fontSize: 12, color: THEME.textMuted, marginBottom: 2 },
  links: { flexDirection: 'row', gap: 16, marginVertical: 8 },
  link: { fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.brand, textDecorationLine: 'underline' },
  disclosure: { fontFamily: FONTS.regular, fontSize: 11, color: THEME.textSecondary, fontStyle: 'italic', marginBottom: 8 },
});