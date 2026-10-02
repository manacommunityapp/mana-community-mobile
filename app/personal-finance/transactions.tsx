import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Share,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import {
  personalFinanceService,
  PersonalTransactionDto,
  CreatePersonalTransactionDto,
  TransactionType,
} from '@/services/personalFinanceService';

const TYPE_COLORS = {
  INCOME: '#10B981',
  EXPENSE: '#EF4444',
  TRANSFER: '#6366F1',
};

const POPULAR_TAGS = ['#tax-deductible', '#reimbursable', '#medical', '#vacation2026', '#family', '#dining'];

interface SplitRow {
  categoryId: string;
  categoryName: string;
  amount: string;
}

function formatCurrency(amount: number): string {
  return '₹' + Math.abs(amount).toLocaleString('en-IN');
}

export default function PersonalFinanceTransactions() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterTag, setFilterTag] = useState<string>('ALL');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('ALL');
  const [filterAccountId, setFilterAccountId] = useState<string>('ALL');

  // AI Quick-Entry State
  const [aiText, setAiText] = useState('');
  const [aiParsing, setAiParsing] = useState(false);

  // New Transaction Form State
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [receiptUrls, setReceiptUrls] = useState<string[]>([]);

  // Split Transaction State
  const [isSplit, setIsSplit] = useState(false);
  const [splitRows, setSplitRows] = useState<SplitRow[]>([]);

  // Batch Import CSV text state
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);

  const {
    data: transactions = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['personal-finance-transactions'],
    queryFn: () => personalFinanceService.getTransactions(),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['personal-finance-accounts'],
    queryFn: personalFinanceService.getAccounts,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['personal-finance-categories'],
    queryFn: personalFinanceService.getCategories,
  });

  const createMutation = useMutation({
    mutationFn: personalFinanceService.createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['personal-finance-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['personal-finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['personal-finance-budgets'] });
      setModalVisible(false);
      resetForm();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to record transaction');
    },
  });

  const resetForm = () => {
    setType('EXPENSE');
    setAmount('');
    setDescription('');
    setAccountId(accounts[0]?.id || '');
    setToAccountId('');
    setCategoryId(categories[0]?.id || '');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setSelectedTags([]);
    setCustomTagInput('');
    setReceiptUrls([]);
    setIsSplit(false);
    setSplitRows([]);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // AI Fast Parse Action
  const handleAiParse = async () => {
    if (!aiText.trim()) {
      Alert.alert('Empty Input', 'Please type a transaction sentence (e.g. "Spent 350 at Starbucks on Coffee")');
      return;
    }
    setAiParsing(true);
    try {
      const parsed = await personalFinanceService.parseNaturalLanguageText(aiText.trim());
      setType(parsed.type || 'EXPENSE');
      setAmount(parsed.amount ? String(parsed.amount) : '');
      setDescription(parsed.description || aiText.trim());
      if (parsed.accountId) setAccountId(parsed.accountId);
      if (parsed.categoryId) setCategoryId(parsed.categoryId);
      if (parsed.date) setDate(parsed.date);
      setAiText('');
      setModalVisible(true);
    } catch {
      Alert.alert('Parse Error', 'Could not parse text automatically. You can enter details manually.');
    } finally {
      setAiParsing(false);
    }
  };

  // Multi-Photo Receipt Picker
  const handlePickReceipt = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Media library access is needed to attach receipts.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uris = result.assets.map(a => a.uri);
      setReceiptUrls(prev => [...prev, ...uris]);
    }
  };

  const handleRemoveReceipt = (index: number) => {
    setReceiptUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Tags toggle
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(prev => prev.filter(t => t !== tag));
    } else {
      setSelectedTags(prev => [...prev, tag]);
    }
  };

  const addCustomTag = () => {
    let t = customTagInput.trim();
    if (!t) return;
    if (!t.startsWith('#')) t = '#' + t;
    if (!selectedTags.includes(t)) {
      setSelectedTags(prev => [...prev, t]);
    }
    setCustomTagInput('');
  };

  // Split management
  const addSplitRow = () => {
    const defaultCat = categories[0];
    setSplitRows(prev => [
      ...prev,
      {
        categoryId: defaultCat?.id || 'cat-1',
        categoryName: defaultCat?.name || 'General',
        amount: '',
      },
    ]);
  };

  const updateSplitRow = (index: number, field: keyof SplitRow, val: string) => {
    setSplitRows(prev => {
      const next = [...prev];
      if (field === 'categoryId') {
        const cat = categories.find(c => c.id === val);
        next[index] = { ...next[index], categoryId: val, categoryName: cat?.name || '' };
      } else {
        next[index] = { ...next[index], [field]: val };
      }
      return next;
    });
  };

  const removeSplitRow = (index: number) => {
    setSplitRows(prev => prev.filter((_, i) => i !== index));
  };

  const totalSplitAmount = splitRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const remainingSplitBalance = (parseFloat(amount) || 0) - totalSplitAmount;

  // CSV Export
  const handleExportCSV = async () => {
    if (transactions.length === 0) {
      Alert.alert('No Data', 'No transactions found to export.');
      return;
    }
    const headers = 'Date,Type,Amount,Category,Account,To Account,Description,Tags,Notes\n';
    const rows = transactions
      .map(t =>
        `"${t.date}","${t.type}",${t.amount},"${t.categoryName}","${t.accountName}","${t.toAccountName || ''}","${t.description.replace(/"/g, '""')}","${(t.tags || '').replace(/"/g, '""')}","${(t.notes || '').replace(/"/g, '""')}"`
      )
      .join('\n');

    try {
      await Share.share({
        message: headers + rows,
        title: 'Transactions_Ledger.csv',
      });
    } catch {
      Alert.alert('Export Failed', 'Unable to share CSV ledger.');
    }
  };

  // Batch CSV Import
  const handleBatchImport = async () => {
    if (!csvText.trim()) {
      Alert.alert('Empty Input', 'Please paste CSV rows to import.');
      return;
    }
    setImporting(true);
    try {
      const lines = csvText.trim().split('\n');
      const parsed: CreatePersonalTransactionDto[] = [];
      const defaultAcc = accounts[0]?.id || 'acc-1';
      const defaultCat = categories[0]?.id || 'cat-1';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || (i === 0 && line.toLowerCase().includes('amount'))) continue;
        const parts = line.split(',').map(s => s.replace(/^["']|["']$/g, '').trim());
        if (parts.length >= 2) {
          const firstNum = parseFloat(parts[0]);
          let amt = 0;
          let desc = 'Imported Transaction';
          let txnType: TransactionType = 'EXPENSE';
          let txnDate = new Date().toISOString().split('T')[0];

          if (!isNaN(firstNum)) {
            amt = firstNum;
            desc = parts[1] || 'Imported Entry';
          } else {
            txnDate = parts[0];
            const secondNum = parseFloat(parts[1]);
            if (!isNaN(secondNum)) {
              amt = secondNum;
              desc = parts[2] || 'Imported Entry';
            } else {
              txnType = parts[1].toUpperCase() === 'INCOME' ? 'INCOME' : 'EXPENSE';
              amt = parseFloat(parts[2]) || 100;
              desc = parts[3] || 'Imported Entry';
            }
          }

          if (amt > 0) {
            parsed.push({
              type: txnType,
              amount: amt,
              description: desc,
              date: txnDate,
              accountId: defaultAcc,
              categoryId: defaultCat,
            });
          }
        }
      }

      if (parsed.length === 0) {
        Alert.alert('Parsing Error', 'Could not parse any valid transaction rows.');
        return;
      }

      const res = await personalFinanceService.batchImportTransactions(parsed);
      queryClient.invalidateQueries({ queryKey: ['personal-finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['personal-finance-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['personal-finance-accounts'] });
      setImportModalVisible(false);
      setCsvText('');
      Alert.alert('Import Complete', `Successfully imported ${res.importedCount} transactions.`);
    } catch (ex: any) {
      Alert.alert('Import Failed', ex?.message || 'Error parsing or importing CSV.');
    } finally {
      setImporting(false);
    }
  };

  const handleSave = () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required', 'Please enter a description.');
      return;
    }
    const acc = accountId || accounts[0]?.id;
    if (!acc) {
      Alert.alert('Required', 'Please select an account.');
      return;
    }

    let splitDetailsStr: string | undefined = undefined;
    if (isSplit && splitRows.length > 0) {
      if (Math.abs(remainingSplitBalance) > 0.01) {
        Alert.alert('Split Mismatch', `Split amounts must sum to ₹${num}. Remaining: ₹${remainingSplitBalance.toFixed(2)}`);
        return;
      }
      splitDetailsStr = JSON.stringify(
        splitRows.map(r => ({
          categoryId: r.categoryId,
          categoryName: r.categoryName,
          amount: parseFloat(r.amount) || 0,
        }))
      );
    }

    createMutation.mutate({
      type,
      amount: num,
      description: description.trim(),
      accountId: acc,
      toAccountId: type === 'TRANSFER' ? toAccountId : undefined,
      categoryId: type !== 'TRANSFER' ? (categoryId || categories[0]?.id) : undefined,
      date,
      notes: notes.trim() || undefined,
      tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined,
      splitDetails: splitDetailsStr,
      receiptUrl: receiptUrls.length > 0 ? receiptUrls[0] : undefined,
      receiptUrls: receiptUrls.length > 0 ? receiptUrls : undefined,
    });
  };

  // Filtered transactions
  const filtered = transactions.filter((t) => {
    if (filterType !== 'ALL' && t.type !== filterType) return false;
    if (filterTag !== 'ALL' && (!t.tags || !t.tags.toLowerCase().includes(filterTag.toLowerCase()))) return false;
    if (filterCategoryId !== 'ALL' && t.categoryId !== filterCategoryId) return false;
    if (filterAccountId !== 'ALL' && t.accountId !== filterAccountId && t.toAccountId !== filterAccountId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchCat = t.categoryName.toLowerCase().includes(q);
      const matchAcc = t.accountName.toLowerCase().includes(q);
      const matchTag = t.tags && t.tags.toLowerCase().includes(q);
      if (!matchDesc && !matchCat && !matchAcc && !matchTag) return false;
    }
    return true;
  });

  if (isLoading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading ledger...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── AI Fast-Entry Bar (P3.5) ── */}
      <View style={styles.aiBarWrap}>
        <View style={styles.aiInputBox}>
          <Ionicons name="sparkles" size={16} color="#8B5CF6" />
          <TextInput
            style={styles.aiInput}
            placeholder='AI Fast-Entry: "Spent 450 at Starbucks on Coffee"'
            placeholderTextColor="#94A3B8"
            value={aiText}
            onChangeText={setAiText}
            onSubmitEditing={handleAiParse}
            returnKeyType="go"
          />
          {aiParsing ? (
            <ActivityIndicator size="small" color="#8B5CF6" />
          ) : (
            <TouchableOpacity style={styles.aiParseBtn} onPress={handleAiParse}>
              <Text style={styles.aiParseBtnText}>Parse</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Search & Action Bar ── */}
      <View style={styles.topBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions or tags..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV} activeOpacity={0.7}>
          <Ionicons name="share-outline" size={18} color={COLORS.primary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.importBtn} onPress={() => setImportModalVisible(true)} activeOpacity={0.7}>
          <Ionicons name="cloud-upload-outline" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Type & Tag Filter Chips ── */}
      <View style={{ marginBottom: 4 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: 6 }}>
          {['ALL', 'EXPENSE', 'INCOME', 'TRANSFER'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filterType === f && styles.filterChipActive]}
              onPress={() => setFilterType(f)}
            >
              <Text style={[styles.filterChipText, filterType === f && styles.filterChipTextActive]}>
                {f === 'ALL' ? 'All Types' : f}
              </Text>
            </TouchableOpacity>
          ))}
          {['#tax-deductible', '#reimbursable', '#medical', '#vacation2026'].map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[styles.filterChip, filterTag === tag && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' }]}
              onPress={() => setFilterTag(filterTag === tag ? 'ALL' : tag)}
            >
              <Text style={[styles.filterChipText, filterTag === tag && { color: '#FFFFFF', fontWeight: 'bold' }]}>
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Transaction List ── */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="receipt-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Transactions Found</Text>
            <Text style={styles.emptySub}>Try adjusting your filters or use the AI Quick-Entry above.</Text>
          </View>
        ) : (
          filtered.map((txn) => {
            const hasSplit = !!txn.splitDetails;
            const txnTags = txn.tags ? txn.tags.split(',').filter(Boolean) : [];
            const hasReceipts = !!txn.receiptUrl || (txn.receiptUrls && txn.receiptUrls.length > 0);

            return (
              <View key={txn.id} style={styles.txnCard}>
                <View style={[styles.txnIconWrap, { backgroundColor: (txn.categoryColor || '#64748B') + '22' }]}>
                  <Ionicons name={(txn.categoryIcon || 'receipt-outline') as any} size={20} color={txn.categoryColor || '#64748B'} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.txnDesc} numberOfLines={1}>{txn.description}</Text>
                  <View style={styles.txnMetaRow}>
                    <Text style={styles.txnMetaText}>{txn.accountName}</Text>
                    {txn.toAccountName ? <Text style={styles.txnMetaText}> ➔ {txn.toAccountName}</Text> : null}
                    <Text style={styles.txnMetaDot}>•</Text>
                    <Text style={styles.txnMetaText}>{txn.categoryName}</Text>
                  </View>

                  {/* Badges: Split & Tags */}
                  <View style={styles.badgeRow}>
                    {hasSplit && (
                      <View style={styles.splitBadge}>
                        <Ionicons name="git-branch-outline" size={10} color="#6366F1" />
                        <Text style={styles.splitBadgeText}>Split</Text>
                      </View>
                    )}
                    {txnTags.map((tg, i) => (
                      <View key={i} style={styles.tagBadge}>
                        <Text style={styles.tagBadgeText}>{tg}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Multi-Photo Receipt Indicator */}
                  {hasReceipts && (
                    <TouchableOpacity
                      style={styles.receiptIndicator}
                      onPress={() => setSelectedReceipt(txn.receiptUrl || (txn.receiptUrls && txn.receiptUrls[0]) || null)}
                    >
                      <Ionicons name="images-outline" size={12} color={COLORS.primary} />
                      <Text style={styles.receiptIndicatorText}>
                        {txn.receiptUrls && txn.receiptUrls.length > 1 ? `${txn.receiptUrls.length} Receipts` : 'Receipt Attached'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.txnAmount, { color: TYPE_COLORS[txn.type] }]}>
                    {txn.type === 'INCOME' ? '+' : txn.type === 'TRANSFER' ? '' : '-'}{formatCurrency(txn.amount)}
                  </Text>
                  <Text style={styles.txnDate}>{txn.date}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── Add Floating Button ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          resetForm();
          setModalVisible(true);
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* ── Record Transaction Modal ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Transaction</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Type Switcher */}
              <View style={styles.typeRow}>
                {(['EXPENSE', 'INCOME', 'TRANSFER'] as TransactionType[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, type === t && { backgroundColor: TYPE_COLORS[t], borderColor: TYPE_COLORS[t] }]}
                    onPress={() => setType(t)}
                  >
                    <Text style={[styles.typeBtnText, type === t && { color: '#FFFFFF', fontWeight: 'bold' }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Amount */}
              <Text style={styles.inputLabel}>Amount (₹)</Text>
              <TextInput
                style={[styles.input, { fontSize: 20, fontWeight: 'bold' }]}
                placeholder="0.00"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />

              {/* Description */}
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Grocery store, dinner, salary"
                placeholderTextColor="#94A3B8"
                value={description}
                onChangeText={setDescription}
              />

              {/* Account Selector */}
              <Text style={styles.inputLabel}>{type === 'TRANSFER' ? 'From Account' : 'Account'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                {accounts.map((acc) => (
                  <TouchableOpacity
                    key={acc.id}
                    style={[styles.chip, (accountId || accounts[0]?.id) === acc.id && styles.chipActive]}
                    onPress={() => setAccountId(acc.id)}
                  >
                    <Text style={[styles.chipText, (accountId || accounts[0]?.id) === acc.id && styles.chipTextActive]}>
                      {acc.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* To Account (for Transfers) */}
              {type === 'TRANSFER' && (
                <View>
                  <Text style={styles.inputLabel}>To Account</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                    {accounts.filter(a => a.id !== (accountId || accounts[0]?.id)).map((acc) => (
                      <TouchableOpacity
                        key={acc.id}
                        style={[styles.chip, toAccountId === acc.id && styles.chipActive]}
                        onPress={() => setToAccountId(acc.id)}
                      >
                        <Text style={[styles.chipText, toAccountId === acc.id && styles.chipTextActive]}>
                          {acc.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Category Selector (if not Split & not Transfer) */}
              {type !== 'TRANSFER' && !isSplit && (
                <View>
                  <Text style={styles.inputLabel}>Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                    {categories.filter(c => c.type === type).map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.chip, (categoryId || categories[0]?.id) === cat.id && styles.chipActive]}
                        onPress={() => setCategoryId(cat.id)}
                      >
                        <Text style={[styles.chipText, (categoryId || categories[0]?.id) === cat.id && styles.chipTextActive]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Split Transaction Engine Toggle (P3.5) */}
              {type === 'EXPENSE' && (
                <View style={styles.splitToggleWrap}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="git-branch-outline" size={18} color="#6366F1" />
                    <Text style={styles.splitToggleTitle}>Split across multiple categories</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.splitSwitch, isSplit && styles.splitSwitchActive]}
                    onPress={() => {
                      setIsSplit(!isSplit);
                      if (!isSplit && splitRows.length === 0) {
                        setSplitRows([
                          { categoryId: categories[0]?.id || 'cat-1', categoryName: categories[0]?.name || 'Category 1', amount: '' },
                          { categoryId: categories[1]?.id || 'cat-2', categoryName: categories[1]?.name || 'Category 2', amount: '' },
                        ]);
                      }
                    }}
                  >
                    <Text style={[styles.splitSwitchText, isSplit && { color: '#FFFFFF' }]}>
                      {isSplit ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Split Rows Section */}
              {isSplit && type === 'EXPENSE' && (
                <View style={styles.splitSection}>
                  <View style={styles.splitHeaderRow}>
                    <Text style={styles.splitSubhead}>Split Allocations</Text>
                    <Text style={[styles.splitRemaining, remainingSplitBalance === 0 ? { color: '#10B981' } : { color: '#EF4444' }]}>
                      Remaining: ₹{remainingSplitBalance.toFixed(2)}
                    </Text>
                  </View>

                  {splitRows.map((row, idx) => (
                    <View key={idx} style={styles.splitRowItem}>
                      <View style={{ flex: 1 }}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                          {categories.filter(c => c.type === 'EXPENSE').map(c => (
                            <TouchableOpacity
                              key={c.id}
                              style={[styles.splitCatChip, row.categoryId === c.id && styles.splitCatChipActive]}
                              onPress={() => updateSplitRow(idx, 'categoryId', c.id)}
                            >
                              <Text style={[styles.splitCatChipText, row.categoryId === c.id && { color: '#FFFFFF', fontWeight: 'bold' }]}>
                                {c.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                        <TextInput
                          style={styles.splitAmtInput}
                          placeholder="Amount (₹)"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          value={row.amount}
                          onChangeText={(v) => updateSplitRow(idx, 'amount', v)}
                        />
                      </View>
                      {splitRows.length > 1 && (
                        <TouchableOpacity style={styles.splitDeleteBtn} onPress={() => removeSplitRow(idx)}>
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  <TouchableOpacity style={styles.addSplitRowBtn} onPress={addSplitRow}>
                    <Ionicons name="add" size={16} color={COLORS.primary} />
                    <Text style={styles.addSplitRowText}>Add Category Split</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Tags & Bookmarking Chips (P3.5) */}
              <Text style={styles.inputLabel}>Tags & Labels</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                {POPULAR_TAGS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tagChip, selectedTags.includes(tag) && styles.tagChipActive]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={[styles.tagChipText, selectedTags.includes(tag) && styles.tagChipTextActive]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.customTagRow}>
                <TextInput
                  style={styles.customTagInput}
                  placeholder="Custom tag (e.g. #trip, #gift)"
                  placeholderTextColor="#94A3B8"
                  value={customTagInput}
                  onChangeText={setCustomTagInput}
                  onSubmitEditing={addCustomTag}
                />
                <TouchableOpacity style={styles.addTagBtn} onPress={addCustomTag}>
                  <Text style={styles.addTagBtnText}>Add</Text>
                </TouchableOpacity>
              </View>

              {/* Multi-Photo Receipt Picker (P3.5) */}
              <Text style={styles.inputLabel}>Receipt Attachments</Text>
              {receiptUrls.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                  {receiptUrls.map((uri, idx) => (
                    <View key={idx} style={styles.multiReceiptItem}>
                      <Image source={{ uri }} style={styles.receiptThumbnail} />
                      <TouchableOpacity style={styles.multiRemoveBtn} onPress={() => handleRemoveReceipt(idx)}>
                        <Ionicons name="close" size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
              <TouchableOpacity style={styles.attachBtn} onPress={handlePickReceipt}>
                <Ionicons name="camera-outline" size={18} color={COLORS.primary} />
                <Text style={styles.attachBtnText}>
                  {receiptUrls.length > 0 ? '+ Add More Receipt Photos' : 'Attach Bill / Receipt Photos'}
                </Text>
              </TouchableOpacity>

              {/* Date */}
              <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="2026-10-01"
                placeholderTextColor="#94A3B8"
                value={date}
                onChangeText={setDate}
              />

              {/* Notes */}
              <Text style={styles.inputLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                placeholder="Additional details, reimbursement notes..."
                placeholderTextColor="#94A3B8"
                multiline
                value={notes}
                onChangeText={setNotes}
              />

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Transaction</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Batch CSV Import Modal ── */}
      <Modal visible={importModalVisible} animationType="slide" transparent onRequestClose={() => setImportModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📥 Batch CSV Statement Import</Text>
              <TouchableOpacity onPress={() => setImportModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.importFormatHint}>
              Paste CSV rows or statement entries. Format:
              \n<Text style={{ fontFamily: 'Courier', fontWeight: 'bold' }}>Date, Amount, Description</Text>
            </Text>

            <TextInput
              style={[styles.input, { height: 140, textAlignVertical: 'top', fontFamily: 'Courier', fontSize: 12 }]}
              placeholder={`2026-10-01, 1500, Grocery Store\n2026-10-02, 450, Coffee Shop\n2026-10-03, 95000, Salary Deposit`}
              placeholderTextColor="#94A3B8"
              multiline
              value={csvText}
              onChangeText={setCsvText}
            />

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: '#10B981' }]}
              onPress={handleBatchImport}
              disabled={importing}
            >
              {importing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Parse & Import to Ledger</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Receipt Preview Modal ── */}
      <Modal visible={!!selectedReceipt} transparent animationType="fade" onRequestClose={() => setSelectedReceipt(null)}>
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewClose} onPress={() => setSelectedReceipt(null)}>
            <Ionicons name="close-circle" size={32} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedReceipt && <Image source={{ uri: selectedReceipt }} style={styles.previewImage} resizeMode="contain" />}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },
  aiBarWrap: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  aiInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F3FF',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    height: 44,
  },
  aiInput: { flex: 1, fontSize: 13, color: '#4C1D95' },
  aiParseBtn: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  aiParseBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  topBar: { flexDirection: 'row', padding: SPACING.md, gap: 8, alignItems: 'center' },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 42,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1E293B' },
  exportBtn: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  importBtn: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBar: { maxHeight: 44 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  filterChipTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  listContent: { padding: SPACING.md, paddingBottom: 90 },
  txnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  txnIconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  txnDesc: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  txnMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  txnMetaText: { fontSize: 12, color: '#64748B' },
  txnMetaDot: { marginHorizontal: 4, color: '#94A3B8' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  splitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  splitBadgeText: { fontSize: 10, color: '#6366F1', fontWeight: 'bold' },
  tagBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagBadgeText: { fontSize: 10, color: '#7E22CE', fontWeight: 'bold' },
  receiptIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  receiptIndicatorText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  txnAmount: { fontSize: 15, fontWeight: 'bold' },
  txnDate: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  emptyWrap: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 4, paddingHorizontal: 30 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.md },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  typeBtnText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginTop: SPACING.sm, marginBottom: 4 },
  importFormatHint: { fontSize: 12, color: '#64748B', marginBottom: SPACING.sm, lineHeight: 18 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    fontSize: 14,
    color: '#1E293B',
    marginBottom: SPACING.xs,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: '#475569' },
  chipTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  splitToggleWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
  },
  splitToggleTitle: { fontSize: 13, fontWeight: 'bold', color: '#4338CA' },
  splitSwitch: {
    backgroundColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  splitSwitchActive: { backgroundColor: '#6366F1' },
  splitSwitchText: { fontSize: 11, fontWeight: 'bold', color: '#475569' },
  splitSection: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginTop: SPACING.xs,
  },
  splitHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  splitSubhead: { fontSize: 12, fontWeight: 'bold', color: '#475569' },
  splitRemaining: { fontSize: 12, fontWeight: 'bold' },
  splitRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  splitCatChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 4,
  },
  splitCatChipActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  splitCatChipText: { fontSize: 11, color: '#475569' },
  splitAmtInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
    color: '#1E293B',
  },
  splitDeleteBtn: { padding: 4 },
  addSplitRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  addSplitRowText: { fontSize: 12, color: COLORS.primary, fontWeight: 'bold' },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: '#F3E8FF',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  tagChipActive: { backgroundColor: '#7E22CE', borderColor: '#7E22CE' },
  tagChipText: { fontSize: 12, color: '#7E22CE', fontWeight: '500' },
  tagChipTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  customTagRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  customTagInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    height: 36,
    fontSize: 12,
    color: '#1E293B',
  },
  addTagBtn: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: RADIUS.md,
  },
  addTagBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  multiReceiptItem: { position: 'relative', marginRight: 8 },
  receiptThumbnail: { width: 56, height: 56, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: '#CBD5E1' },
  multiRemoveBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: SPACING.sm,
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginVertical: 4,
  },
  attachBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  saveBtn: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  previewClose: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  previewImage: { width: '90%', height: '80%' },
});
