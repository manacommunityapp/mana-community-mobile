import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Platform, Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { THEME, FONTS, SHADOWS } from '@/constants/config';
import { financeExtService } from '@/services/financeExtService';

function ExportCard({
  title,
  subtitle,
  onExport,
  loading,
  xml,
  error,
}: {
  title: string;
  subtitle: string;
  onExport: () => void;
  loading: boolean;
  xml: string;
  error: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    Clipboard.setString(xml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      <Text style={s.cardSub}>{subtitle}</Text>

      <TouchableOpacity
        style={[s.exportBtn, loading && { opacity: 0.6 }]}
        onPress={onExport}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="download-outline" size={16} color="#FFFFFF" />
            <Text style={s.exportBtnText}>Export XML</Text>
          </>
        )}
      </TouchableOpacity>

      {error ? (
        <View style={s.errorBanner}>
          <Ionicons name="alert-circle" size={14} color={THEME.lossDark} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : null}

      {xml ? (
        <View style={s.xmlContainer}>
          <View style={s.xmlHeader}>
            <Text style={s.xmlLabel}>XML Preview</Text>
            <TouchableOpacity onPress={handleCopy} style={s.copyBtn}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={14} color={THEME.brandDark} />
              <Text style={s.copyBtnText}>{copied ? 'Copied!' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={s.xmlScroll} nestedScrollEnabled>
            <Text style={s.xmlText}>
              {xml.length > 300 ? xml.substring(0, 300) + '\n... (full XML)' : xml}
            </Text>
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

export default function TallyExportScreen() {
  const router = useRouter();

  const [salesFrom, setSalesFrom] = useState('');
  const [salesTo, setSalesTo] = useState('');
  const [salesXml, setSalesXml] = useState('');
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState('');

  const [receiptFrom, setReceiptFrom] = useState('');
  const [receiptTo, setReceiptTo] = useState('');
  const [receiptXml, setReceiptXml] = useState('');
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState('');

  const handleSalesExport = async () => {
    if (!salesFrom || !salesTo) { setSalesError('Please enter From and To dates.'); return; }
    setSalesLoading(true); setSalesError('');
    try {
      const xml = await financeExtService.exportSalesVouchersXml(salesFrom, salesTo);
      setSalesXml(xml || '<ENVELOPE><!-- No data --></ENVELOPE>');
    } catch (err: any) {
      setSalesError(err?.message || 'Export failed. Check your connection.');
    } finally {
      setSalesLoading(false);
    }
  };

  const handleReceiptExport = async () => {
    if (!receiptFrom || !receiptTo) { setReceiptError('Please enter From and To dates.'); return; }
    setReceiptLoading(true); setReceiptError('');
    try {
      const xml = await financeExtService.exportReceiptVouchersXml(receiptFrom, receiptTo);
      setReceiptXml(xml || '<ENVELOPE><!-- No data --></ENVELOPE>');
    } catch (err: any) {
      setReceiptError(err?.message || 'Export failed. Check your connection.');
    } finally {
      setReceiptLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Tally Export</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Sales Vouchers */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Sales Vouchers (Invoices)</Text>
          <Text style={s.cardSub}>Export maintenance invoices as Tally Sales Vouchers</Text>
          <View style={s.dateRow}>
            <View style={s.dateField}>
              <Text style={s.dateLabel}>From Date</Text>
              <TextInput
                style={s.dateInput}
                value={salesFrom}
                onChangeText={setSalesFrom}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={THEME.textMuted}
              />
            </View>
            <View style={s.dateField}>
              <Text style={s.dateLabel}>To Date</Text>
              <TextInput
                style={s.dateInput}
                value={salesTo}
                onChangeText={setSalesTo}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={THEME.textMuted}
              />
            </View>
          </View>
          <TouchableOpacity
            style={[s.exportBtn, salesLoading && { opacity: 0.6 }]}
            onPress={handleSalesExport}
            disabled={salesLoading}
          >
            {salesLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                <Text style={s.exportBtnText}>Export Sales XML</Text>
              </>
            )}
          </TouchableOpacity>
          {salesError ? (
            <View style={s.errorBanner}>
              <Ionicons name="alert-circle" size={14} color={THEME.lossDark} />
              <Text style={s.errorText}>{salesError}</Text>
            </View>
          ) : null}
          {salesXml ? (
            <XmlPreview xml={salesXml} />
          ) : null}
        </View>

        {/* Receipt Vouchers */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Receipt Vouchers (Payments)</Text>
          <Text style={s.cardSub}>Export collected payments as Tally Receipt Vouchers</Text>
          <View style={s.dateRow}>
            <View style={s.dateField}>
              <Text style={s.dateLabel}>From Date</Text>
              <TextInput
                style={s.dateInput}
                value={receiptFrom}
                onChangeText={setReceiptFrom}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={THEME.textMuted}
              />
            </View>
            <View style={s.dateField}>
              <Text style={s.dateLabel}>To Date</Text>
              <TextInput
                style={s.dateInput}
                value={receiptTo}
                onChangeText={setReceiptTo}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={THEME.textMuted}
              />
            </View>
          </View>
          <TouchableOpacity
            style={[s.exportBtn, receiptLoading && { opacity: 0.6 }]}
            onPress={handleReceiptExport}
            disabled={receiptLoading}
          >
            {receiptLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                <Text style={s.exportBtnText}>Export Receipt XML</Text>
              </>
            )}
          </TouchableOpacity>
          {receiptError ? (
            <View style={s.errorBanner}>
              <Ionicons name="alert-circle" size={14} color={THEME.lossDark} />
              <Text style={s.errorText}>{receiptError}</Text>
            </View>
          ) : null}
          {receiptXml ? (
            <XmlPreview xml={receiptXml} />
          ) : null}
        </View>

        {/* Import instructions */}
        <View style={s.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={THEME.indigo} />
          <View style={{ flex: 1 }}>
            <Text style={s.infoTitle}>How to import into TallyPrime</Text>
            <Text style={s.infoText}>
              1. Copy the XML above{'\n'}
              2. Save as a .xml file on your computer{'\n'}
              3. Open TallyPrime → Gateway of Tally{'\n'}
              4. Press Alt+O → Import Data → Transactions{'\n'}
              5. Select the saved XML file
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function XmlPreview({ xml }: { xml: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    Clipboard.setString(xml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <View style={s.xmlContainer}>
      <View style={s.xmlHeader}>
        <Text style={s.xmlLabel}>XML Preview</Text>
        <TouchableOpacity onPress={handleCopy} style={s.copyBtn}>
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={14} color={THEME.brandDark} />
          <Text style={s.copyBtnText}>{copied ? 'Copied!' : 'Copy'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={s.xmlScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
        <Text style={s.xmlText}>
          {xml.length > 300 ? xml.substring(0, 300) + '\n... (full XML copied to clipboard)' : xml}
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.surfaceMuted,
  },
  headerTitle: {
    flex: 1, textAlign: 'center', fontSize: 17,
    fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.displayBold,
  },
  content: { padding: 16, gap: 14 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: THEME.border, padding: 16, gap: 12, ...SHADOWS.card,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  cardSub: { fontSize: 12, color: THEME.textSecondary, fontFamily: FONTS.regular, marginTop: -6 },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateField: { flex: 1, gap: 4 },
  dateLabel: { fontSize: 12, fontWeight: '600', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  dateInput: {
    backgroundColor: THEME.surfaceMuted, borderRadius: 10, borderWidth: 1, borderColor: THEME.border,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 13, color: THEME.textPrimary, fontFamily: FONTS.regular,
  },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: THEME.indigo, borderRadius: 10, paddingVertical: 11,
  },
  exportBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: FONTS.bold },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: THEME.lossLight, borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: THEME.lossBorder,
  },
  errorText: { flex: 1, fontSize: 12, color: THEME.lossDark, fontFamily: FONTS.medium },
  xmlContainer: {
    backgroundColor: '#0F172A', borderRadius: 10, overflow: 'hidden',
  },
  xmlHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#1E293B',
  },
  xmlLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', fontFamily: FONTS.semiBold },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copyBtnText: { fontSize: 11, fontWeight: '600', color: THEME.brand, fontFamily: FONTS.semiBold },
  xmlScroll: { maxHeight: 180, padding: 12 },
  xmlText: { fontSize: 11, color: '#E2E8F0', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', lineHeight: 16 },
  infoCard: {
    flexDirection: 'row', gap: 10,
    backgroundColor: THEME.indigoLight, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: THEME.border,
  },
  infoTitle: { fontSize: 13, fontWeight: '700', color: THEME.indigo, fontFamily: FONTS.semiBold, marginBottom: 4 },
  infoText: { fontSize: 12, color: THEME.textSecondary, fontFamily: FONTS.regular, lineHeight: 18 },
});
