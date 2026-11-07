import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  matrix: number[][]; // 3x9 grid
  ticketId: number;
  ticketHash: string;
  calledNumbers: Set<number>;
  dabbedNumbers: Set<number>;
  onToggleDab: (num: number) => void;
  onClaim: (claimType: string) => void;
}

export const KittyPartyHousieTicketView: React.FC<Props> = ({
  matrix,
  ticketId,
  ticketHash,
  calledNumbers,
  dabbedNumbers,
  onToggleDab,
  onClaim,
}) => {
  return (
    <View style={styles.ticketContainer}>
      <View style={styles.ticketHeader}>
        <Text style={styles.ticketTitle}>Ticket #{ticketId}</Text>
        <Text style={styles.ticketHash}>{ticketHash.substring(0, 8)}...</Text>
      </View>

      {/* 3x9 Matrix Grid */}
      <View style={styles.grid}>
        {matrix.map((row, rIdx) => (
          <View key={`row-${rIdx}`} style={styles.row}>
            {row.map((val, cIdx) => {
              const isDabbed = dabbedNumbers.has(val);
              const isCalled = val > 0 && calledNumbers.has(val);

              return (
                <TouchableOpacity
                  key={`cell-${rIdx}-${cIdx}`}
                  style={[
                    styles.cell,
                    val === 0 && styles.emptyCell,
                    isDabbed && styles.dabbedCell,
                    !isDabbed && isCalled && styles.calledCell,
                  ]}
                  disabled={val === 0}
                  onPress={() => onToggleDab(val)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.cellText,
                      isDabbed && styles.dabbedText,
                      !isDabbed && isCalled && styles.calledText,
                    ]}
                  >
                    {val > 0 ? val : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Claim Buttons */}
      <View style={styles.claimsRow}>
        {[
          { type: 'EARLY_FIVE', label: 'Early 5' },
          { type: 'FOUR_CORNERS', label: '4 Corners' },
          { type: 'TOP_LINE', label: 'Top Line' },
          { type: 'MIDDLE_LINE', label: 'Mid Line' },
          { type: 'BOTTOM_LINE', label: 'Bot Line' },
          { type: 'FULL_HOUSE', label: 'Full House' },
        ].map((c) => (
          <TouchableOpacity
            key={c.type}
            style={styles.claimButton}
            onPress={() => onClaim(c.type)}
            activeOpacity={0.8}
          >
            <Text style={styles.claimText}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  ticketContainer: {
    backgroundColor: '#FAF5FF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 2,
    borderColor: '#E9D5FF',
    marginBottom: 16,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B21A8',
  },
  ticketHash: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#9CA3AF',
  },
  grid: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#F3F4F6',
  },
  emptyCell: {
    backgroundColor: '#FAFAFA',
  },
  dabbedCell: {
    backgroundColor: '#DB2777',
  },
  calledCell: {
    backgroundColor: '#DCFCE7',
  },
  cellText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1F2937',
  },
  dabbedText: {
    color: '#FFFFFF',
  },
  calledText: {
    color: '#166534',
  },
  claimsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  claimButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C084FC',
  },
  claimText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7E22CE',
  },
});
