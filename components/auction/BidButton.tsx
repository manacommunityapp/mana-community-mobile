import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { COLORS } from '@/constants/config';
import { getBidIncrements } from '@/hooks/useAuctionLive';
import type { BidResult } from '@/hooks/useAuctionLive';

interface BidButtonProps {
  currentBid:   number;
  minNextBid:   number;
  isPlacingBid: boolean;
  auctionEnded: boolean;
  isWinning:    boolean;
  onBid:        (amount: number) => Promise<BidResult>;
}

export function BidButton({
  currentBid, minNextBid, isPlacingBid, auctionEnded, isWinning, onBid,
}: BidButtonProps) {
  const [customMode,  setCustomMode]  = useState(false);
  const [customInput, setCustomInput] = useState('');

  const increments = getBidIncrements(currentBid);
  // Quick-bid amounts: currentBid + each increment
  const quickAmounts = increments.map((inc) => currentBid + inc);

  const handleQuickBid = useCallback(async (amount: number) => {
    const result = await onBid(amount);
    handleResult(result, amount);
  }, [onBid]);

  const handleCustomBid = useCallback(async () => {
    const amount = Number(customInput.replace(/[^0-9]/g, ''));
    if (!amount) {
      Alert.alert('Invalid Amount', 'Please enter a valid bid amount.');
      return;
    }
    if (amount < minNextBid) {
      Alert.alert(
        'Bid Too Low',
        `Minimum bid is ₹${minNextBid.toLocaleString('en-IN')}.`,
      );
      return;
    }
    const result = await onBid(amount);
    handleResult(result, amount);
    if (result === 'success') {
      setCustomInput('');
      setCustomMode(false);
    }
  }, [customInput, minNextBid, onBid]);

  function handleResult(result: BidResult, amount: number) {
    switch (result) {
      case 'below_minimum':
        Alert.alert('Bid Too Low', `Minimum bid is ₹${minNextBid.toLocaleString('en-IN')}.`);
        break;
      case 'outbid':
        Alert.alert('Outbid!', 'Someone placed a higher bid just before yours. Try again.');
        break;
      case 'error':
        Alert.alert('Error', 'Failed to place bid. Please try again.');
        break;
    }
  }

  if (auctionEnded) {
    return (
      <View style={s.endedWrap}>
        <Text style={s.endedText}>🔒 Auction has ended</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Status banner */}
      {isWinning && (
        <View style={s.winningBanner}>
          <Text style={s.winningBannerText}>🏆 You're the highest bidder!</Text>
        </View>
      )}

      {/* Minimum bid hint */}
      <Text style={s.minHint}>
        Minimum next bid: <Text style={s.minHintAmount}>₹{minNextBid.toLocaleString('en-IN')}</Text>
      </Text>

      {!customMode ? (
        <>
          {/* Quick-bid chips */}
          <View style={s.quickRow}>
            {quickAmounts.slice(0, 3).map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[s.quickBtn, isWinning && s.quickBtnDisabled]}
                onPress={() => handleQuickBid(amount)}
                disabled={isPlacingBid || isWinning}
                activeOpacity={0.8}
              >
                {isPlacingBid
                  ? <ActivityIndicator size="small" color="#fff" />
                  : (
                    <>
                      <Text style={s.quickBtnLabel}>Bid</Text>
                      <Text style={s.quickBtnAmount}>₹{amount.toLocaleString('en-IN')}</Text>
                    </>
                  )
                }
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom amount toggle */}
          <TouchableOpacity
            style={s.customToggle}
            onPress={() => setCustomMode(true)}
            disabled={isPlacingBid}
          >
            <Text style={s.customToggleText}>Enter custom amount</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {/* Custom bid input */}
          <View style={s.customRow}>
            <View style={s.customInputWrap}>
              <Text style={s.rupee}>₹</Text>
              <TextInput
                style={s.customInput}
                value={customInput}
                onChangeText={setCustomInput}
                placeholder={minNextBid.toLocaleString('en-IN')}
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                autoFocus
                maxLength={9}
              />
            </View>
            <TouchableOpacity
              style={[s.customBidBtn, isPlacingBid && s.customBidBtnDisabled]}
              onPress={handleCustomBid}
              disabled={isPlacingBid}
              activeOpacity={0.85}
            >
              {isPlacingBid
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.customBidBtnText}>Place Bid</Text>
              }
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={s.customToggle}
            onPress={() => { setCustomMode(false); setCustomInput(''); }}
          >
            <Text style={s.customToggleText}>← Quick bid instead</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:          { gap: 10, padding: 16, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  winningBanner:      { backgroundColor: '#D1FAE5', borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  winningBannerText:  { color: '#065F46', fontWeight: '700', fontSize: 14 },
  minHint:            { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
  minHintAmount:      { fontWeight: '700', color: COLORS.text },
  quickRow:           { flexDirection: 'row', gap: 8 },
  quickBtn:           { flex: 1, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', gap: 2 },
  quickBtnDisabled:   { backgroundColor: COLORS.border },
  quickBtnLabel:      { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '500' },
  quickBtnAmount:     { color: '#fff', fontSize: 14, fontWeight: '800' },
  customToggle:       { alignItems: 'center', paddingVertical: 4 },
  customToggleText:   { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  customRow:          { flexDirection: 'row', gap: 10 },
  customInputWrap:    { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#F5F3FF' },
  rupee:              { fontSize: 18, fontWeight: '700', color: COLORS.primary, marginRight: 4 },
  customInput:        { flex: 1, fontSize: 20, fontWeight: '800', color: COLORS.primary, paddingVertical: 12 },
  customBidBtn:       { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center' },
  customBidBtnDisabled: { opacity: 0.6 },
  customBidBtnText:   { color: '#fff', fontWeight: '800', fontSize: 14 },
  endedWrap:          { padding: 16, alignItems: 'center', backgroundColor: '#F3F4F6', borderTopWidth: 1, borderTopColor: COLORS.border },
  endedText:          { fontSize: 15, fontWeight: '600', color: COLORS.textMuted },
});
