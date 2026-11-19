import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sportsOpsService, TournamentMerchandise, MerchandiseOrder } from '../../services/sportsOpsService';

export default function MerchandiseScreen() {
  const [tab, setTab] = useState<'shop' | 'orders'>('shop');
  const [tournamentId, setTournamentId] = useState('1');
  const [items, setItems] = useState<TournamentMerchandise[]>([]);
  const [orders, setOrders] = useState<MerchandiseOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const loadItems = () => {
    const tid = parseInt(tournamentId);
    if (!tid) return;
    setLoading(true);
    sportsOpsService.listMerchandise(tid).then(setItems).finally(() => setLoading(false));
  };
  const loadOrders = () => {
    setLoading(true);
    sportsOpsService.myMerchandiseOrders().then(setOrders).finally(() => setLoading(false));
  };

  useEffect(() => { if (tab === 'shop') loadItems(); else loadOrders(); }, [tab, tournamentId]);

  const order = async (item: TournamentMerchandise) => {
    try {
      await sportsOpsService.orderMerchandise(item.id, 1);
      Alert.alert('Success', `Ordered ${item.itemName}`);
      loadItems();
    } catch {
      Alert.alert('Error', 'Order failed. Item may be out of stock.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.heading}>Merchandise</Text>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'shop' && styles.tabActive]} onPress={() => setTab('shop')}>
          <Text style={[styles.tabTxt, tab === 'shop' && styles.tabActiveTxt]}>Shop</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'orders' && styles.tabActive]} onPress={() => setTab('orders')}>
          <Text style={[styles.tabTxt, tab === 'orders' && styles.tabActiveTxt]}>My Orders</Text>
        </TouchableOpacity>
      </View>
      {tab === 'shop' && (
        <View style={styles.inputRow}>
          <TextInput style={styles.input} value={tournamentId} onChangeText={setTournamentId}
            keyboardType="numeric" placeholder="Tournament ID" placeholderTextColor="#94a3b8" />
        </View>
      )}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
      ) : tab === 'shop' ? (
        items.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyTxt}>No merchandise available.</Text></View>
        ) : (
          <FlatList
            data={items}
            numColumns={2}
            keyExtractor={i => String(i.id)}
            contentContainerStyle={{ padding: 12 }}
            columnWrapperStyle={{ gap: 10 }}
            renderItem={({ item }) => (
              <View style={styles.itemCard}>
                <Text style={styles.itemName}>{item.itemName}</Text>
                <Text style={styles.itemPrice}>₹{item.price}</Text>
                <Text style={[styles.stock, { color: item.stockQty > 0 ? '#16a34a' : '#dc2626' }]}>
                  {item.stockQty > 0 ? `${item.stockQty} left` : 'Sold out'}
                </Text>
                {item.isAvailable && (
                  <TouchableOpacity style={styles.orderBtn} onPress={() => order(item)}>
                    <Text style={styles.orderTxt}>Order</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          />
        )
      ) : (
        orders.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyTxt}>No orders yet.</Text></View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={o => String(o.id)}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item: o }) => (
              <View style={styles.orderCard}>
                <Text style={styles.orderTitle}>Order #{o.id}</Text>
                <Text style={styles.orderDetail}>{o.quantity} × ₹{o.unitPrice} = <Text style={{ fontWeight: '700' }}>₹{o.totalAmount}</Text></Text>
                <Text style={styles.orderDate}>{new Date(o.createdAt).toLocaleDateString()}</Text>
              </View>
            )}
          />
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 22, fontWeight: '800', color: '#0f172a', padding: 20, paddingBottom: 8 },
  tabs: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#f1f5f9', borderRadius: 10, padding: 4, marginBottom: 8 },
  tabBtn: { flex: 1, padding: 8, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabTxt: { fontWeight: '600', color: '#64748b', fontSize: 14 },
  tabActiveTxt: { color: '#2563eb' },
  inputRow: { paddingHorizontal: 16, marginBottom: 8 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 10, fontSize: 14, color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTxt: { color: '#94a3b8', fontSize: 15 },
  itemCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, marginBottom: 10 },
  itemName: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  itemPrice: { fontSize: 18, fontWeight: '800', color: '#2563eb', marginBottom: 4 },
  stock: { fontSize: 12, fontWeight: '600', marginBottom: 10 },
  orderBtn: { backgroundColor: '#2563eb', borderRadius: 8, padding: 8, alignItems: 'center' },
  orderTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  orderCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  orderTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  orderDetail: { fontSize: 13, color: '#64748b', marginTop: 2 },
  orderDate: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
});
