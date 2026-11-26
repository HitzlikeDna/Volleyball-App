import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COURT_LAYOUT, POSITION_LABELS } from '../logic/match';
import { colors, icons } from '../theme';
import type { Player } from '../types';

export interface CourtProps {
  /** Spieler je Position (Index 0 = Position I). */
  slots: (Player | undefined)[];
  onPressSlot?: (index: number) => void;
  /** Position, die gerade aufschlägt (zeigt einen Ball). */
  serverIndex?: number | null;
  /** Positionen, auf denen der Libero steht. */
  liberoIndex?: number | null;
  selectedIndex?: number | null;
  emptyLabel?: string;
  compact?: boolean;
}

export function Court({
  slots,
  onPressSlot,
  serverIndex,
  liberoIndex,
  selectedIndex,
  emptyLabel = 'frei',
  compact,
}: CourtProps) {
  return (
    <View style={styles.court}>
      <View style={styles.net}>
        <Text style={styles.netText}>NETZ</Text>
      </View>
      {COURT_LAYOUT.map((row, r) => (
        <View key={r} style={[styles.row, r === 0 && styles.frontRow]}>
          {row.map((index) => {
            const player = slots[index];
            const isLibero = liberoIndex === index;
            const isServer = serverIndex === index;
            const isSelected = selectedIndex === index;
            return (
              <Pressable
                key={index}
                disabled={!onPressSlot}
                onPress={() => onPressSlot?.(index)}
                accessibilityRole={onPressSlot ? 'button' : undefined}
                accessibilityLabel={`Position ${POSITION_LABELS[index]}${player ? `: Nummer ${player.number} ${player.name}` : ''}`}
                style={({ pressed }) => [styles.slot, compact && styles.slotCompact, pressed && styles.pressed]}
              >
                <View
                  style={[
                    styles.token,
                    compact && styles.tokenCompact,
                    !player && styles.tokenEmpty,
                    isLibero && styles.tokenLibero,
                    isSelected && styles.tokenSelected,
                  ]}
                >
                  {player ? (
                    <Text style={[styles.number, compact && styles.numberCompact, isLibero && styles.numberLibero]}>
                      {player.number}
                    </Text>
                  ) : (
                    <Text style={styles.plus}>+</Text>
                  )}
                  {isServer && (
                    <View style={styles.ball}>
                      <Text style={styles.ballText}>{icons.ball}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.name} numberOfLines={1}>
                  {player ? player.name || '–' : emptyLabel}
                </Text>
                <Text style={styles.pos}>{POSITION_LABELS[index]}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  court: {
    backgroundColor: colors.court,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: colors.courtLine,
    overflow: 'hidden',
    paddingBottom: 6,
  },
  net: {
    height: 22,
    backgroundColor: colors.net,
    alignItems: 'center',
    justifyContent: 'center',
  },
  netText: { color: '#CBD5E1', fontSize: 10, fontWeight: '800', letterSpacing: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 6 },
  frontRow: {
    borderBottomWidth: 2,
    borderBottomColor: colors.courtLine,
    borderStyle: 'dashed',
    backgroundColor: colors.courtDark,
  },
  slot: { flex: 1, alignItems: 'center', paddingVertical: 6, paddingHorizontal: 2 },
  slotCompact: { paddingVertical: 2 },
  token: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  tokenCompact: { width: 46, height: 46, borderRadius: 23 },
  tokenEmpty: { backgroundColor: 'rgba(255,255,255,0.4)', borderStyle: 'dashed', borderColor: '#fff' },
  tokenLibero: { backgroundColor: colors.libero, borderColor: '#fff' },
  tokenSelected: { borderColor: colors.us, borderWidth: 4, transform: [{ scale: 1.08 }] },
  number: { fontSize: 22, fontWeight: '900', color: colors.text },
  numberCompact: { fontSize: 18 },
  numberLibero: { color: '#fff' },
  plus: { fontSize: 26, color: '#fff', fontWeight: '700' },
  ball: {
    position: 'absolute',
    right: -8,
    bottom: -6,
    backgroundColor: colors.serve,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ballText: { fontSize: 13 },
  name: { marginTop: 4, fontSize: 12, fontWeight: '700', color: '#fff', maxWidth: 100 },
  pos: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
