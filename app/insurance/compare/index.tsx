import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { InsuranceScreen, DisclosureBanner } from '@/components/insurance/InsuranceUI';
import { buildComparison } from '@/constants/insurance';
import { useInsuranceShortlist } from '@/hooks/useInsuranceShortlist';
import { THEME } from '@/constants/theme';
import { FONTS } from '@/constants/config';

const LABEL_W = 130;
const VALUE_W = 160;

export default function CompareScreen() {
  const { items: shortlist } = useInsuranceShortlist();
  const rows = buildComparison(shortlist);

  return (
    <InsuranceScreen title="Compare Products" scroll={false}>
      <ScrollView>
        <DisclosureBanner extra="Comparison data is sourced from the insurer's published documents. Always read the policy wording before purchasing." />
        {!shortlist.length ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Nothing to compare</Text>
            <Text style={s.emptyBody}>Add products to your compare list from the catalogue screens.</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              {/* Header row */}
              <View style={[s.row, s.headerRow]}>
                <View style={s.labelCell}><Text style={s.headerLabel}>Attribute</Text></View>
                {shortlist.map((item) => (
                  <View key={item.productVersionId} style={s.valueCell}>
                    <Text style={s.headerProduct} numberOfLines={2}>{item.name}</Text>
                    <Text style={s.headerInsurer} numberOfLines={1}>{item.insurerName}</Text>
                  </View>
                ))}
              </View>
              {/* Data rows */}
              {rows.map((row, i) => (
                <View key={row.label} style={[s.row, i % 2 === 0 ? s.rowEven : s.rowOdd]}>
                  <View style={s.labelCell}>
                    <Text style={[s.rowLabel, row.differs && s.diffLabel]}>{row.label}</Text>
                    {row.differs && <Text style={s.diffBadge}>Differs</Text>}
                  </View>
                  {row.values.map((v, j) => (
                    <View key={j} style={s.valueCell}>
                      <Text style={s.valueText}>{v}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        )}
        <Text style={s.disclaimer}>
          This comparison is informational only. Premiums, coverage and claim outcomes are determined by the insurer
          and its authorised intermediary, not by Mana Community. Always read the full policy wording before purchasing.
        </Text>
      </ScrollView>
    </InsuranceScreen>
  );
}

const s = StyleSheet.create({
  empty: { padding: 32, alignItems: 'center' },
  emptyTitle: { fontFamily: FONTS.displaySemi, fontSize: 16, color: THEME.textPrimary, marginBottom: 6 },
  emptyBody: { fontFamily: FONTS.regular, fontSize: 13, color: THEME.textSecondary, textAlign: 'center' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: THEME.border },
  headerRow: { backgroundColor: THEME.indigoLight },
  rowEven: { backgroundColor: THEME.surface },
  rowOdd: { backgroundColor: THEME.surfaceMuted },
  labelCell: { width: LABEL_W, padding: 10, justifyContent: 'center' },
  valueCell: { width: VALUE_W, padding: 10, justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: THEME.border },
  headerLabel: { fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.textSecondary },
  headerProduct: { fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.textPrimary },
  headerInsurer: { fontFamily: FONTS.regular, fontSize: 11, color: THEME.textSecondary },
  rowLabel: { fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.textPrimary },
  diffLabel: { color: THEME.brand },
  diffBadge: { fontFamily: FONTS.bold, fontSize: 10, color: THEME.brand, marginTop: 2 },
  valueText: { fontFamily: FONTS.regular, fontSize: 12, color: THEME.textPrimary },
  disclaimer: { fontFamily: FONTS.regular, fontSize: 11, color: THEME.textMuted, padding: 16, lineHeight: 16, fontStyle: 'italic' },
});