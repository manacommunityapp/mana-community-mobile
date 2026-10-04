import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { vendorCommerceService } from '@/services/vendorCommerceService';

export default function CreateProductScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [subCategory, setSubCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  const [hsnCode, setHsnCode] = useState('');

  // Variants array
  const [variants, setVariants] = useState([
    { variantName: 'Standard Pack', sku: 'SKU-' + Math.floor(1000 + Math.random() * 9000), packSize: '1 KG', mrp: '', vendorCost: '', defaultCommunityPrice: '', initialStock: '100' }
  ]);

  const addVariant = () => {
    setVariants(prev => [
      ...prev,
      { variantName: '', sku: 'SKU-' + Math.floor(1000 + Math.random() * 9000), packSize: '', mrp: '', vendorCost: '', defaultCommunityPrice: '', initialStock: '50' }
    ]);
  };

  const removeVariant = (idx: number) => {
    setVariants(prev => prev.filter((_, i) => i !== idx));
  };

  const updateVariant = (idx: number, field: string, val: string) => {
    setVariants(prev => prev.map((v, i) => i === idx ? { ...v, [field]: val } : v));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please provide a product title.');
      return;
    }
    setLoading(true);
    try {
      await vendorCommerceService.createProduct({
        name: name.trim(),
        category,
        subCategory: subCategory.trim() || undefined,
        brand: brand.trim() || undefined,
        description: description.trim() || undefined,
        hsnCode: hsnCode.trim() || undefined,
        variants: variants.map(v => ({
          variantName: v.variantName.trim() || 'Default Pack',
          sku: v.sku.trim(),
          packSize: v.packSize.trim() || '1 Unit',
          mrp: parseFloat(v.mrp || '100'),
          vendorCost: parseFloat(v.vendorCost || '75'),
          defaultCommunityPrice: parseFloat(v.defaultCommunityPrice || '85'),
          initialStock: parseInt(v.initialStock || '0'),
        })),
      });
      Alert.alert('Product Saved!', 'Catalog product and variants created.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch {
      Alert.alert('Error', 'Could not save product.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Add Catalog Product', headerBackTitle: 'Back' }} />
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <Text style={s.sectionTitle}>Product Details</Text>
        <TextInput style={s.input} placeholder="Product Name (e.g. Tata Salt)" placeholderTextColor={COLORS.textMuted} value={name} onChangeText={setName} />
        
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <TextInput style={s.input} placeholder="Brand (e.g. Tata)" placeholderTextColor={COLORS.textMuted} value={brand} onChangeText={setBrand} />
          </View>
          <View style={{ flex: 1 }}>
            <TextInput style={s.input} placeholder="HSN Code (e.g. 25010010)" placeholderTextColor={COLORS.textMuted} value={hsnCode} onChangeText={setHsnCode} />
          </View>
        </View>

        <TextInput style={[s.input, { height: 60 }]} placeholder="Description / Sourcing notes..." placeholderTextColor={COLORS.textMuted} value={description} onChangeText={setDescription} multiline />

        <View style={s.variantHeader}>
          <Text style={s.sectionTitle}>Product Variants ({variants.length})</Text>
          <TouchableOpacity style={s.addVarBtn} onPress={addVariant}>
            <Ionicons name="add" size={16} color={COLORS.primary} />
            <Text style={s.addVarText}>Add Variant</Text>
          </TouchableOpacity>
        </View>

        {variants.map((v, idx) => (
          <View key={idx} style={s.varCard}>
            <View style={s.varTop}>
              <Text style={s.varIndex}>Variant #{idx + 1}</Text>
              {variants.length > 1 && (
                <TouchableOpacity onPress={() => removeVariant(idx)}>
                  <Ionicons name="trash-outline" size={16} color="#DC2626" />
                </TouchableOpacity>
              )}
            </View>

            <View style={s.row}>
              <View style={{ flex: 2 }}>
                <TextInput style={s.input} placeholder="Pack Size (e.g. 1 KG)" placeholderTextColor={COLORS.textMuted} value={v.packSize} onChangeText={val => updateVariant(idx, 'packSize', val)} />
              </View>
              <View style={{ flex: 3 }}>
                <TextInput style={s.input} placeholder="SKU (e.g. TS-01KG)" placeholderTextColor={COLORS.textMuted} value={v.sku} onChangeText={val => updateVariant(idx, 'sku', val)} />
              </View>
            </View>

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>MRP (₹)</Text>
                <TextInput style={s.input} placeholder="28" placeholderTextColor={COLORS.textMuted} value={v.mrp} onChangeText={val => updateVariant(idx, 'mrp', val)} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Cost (₹)</Text>
                <TextInput style={s.input} placeholder="19" placeholderTextColor={COLORS.textMuted} value={v.vendorCost} onChangeText={val => updateVariant(idx, 'vendorCost', val)} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Community (₹)</Text>
                <TextInput style={s.input} placeholder="22" placeholderTextColor={COLORS.textMuted} value={v.defaultCommunityPrice} onChangeText={val => updateVariant(idx, 'defaultCommunityPrice', val)} keyboardType="numeric" />
              </View>
            </View>

            <View style={{ width: '50%' }}>
              <Text style={s.label}>Initial Stock</Text>
              <TextInput style={s.input} placeholder="100" placeholderTextColor={COLORS.textMuted} value={v.initialStock} onChangeText={val => updateVariant(idx, 'initialStock', val)} keyboardType="numeric" />
            </View>
          </View>
        ))}

        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Product to Catalog</Text>}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 8 },
  label: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 2 },
  input: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.text, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8 },
  variantHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  addVarBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  addVarText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  varCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 4, marginBottom: 8 },
  varTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  varIndex: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
