import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Chip, SectionTitle } from '../components/ui';
import { useStore } from '../state/store';
import { colors, radius } from '../theme';

const SETS_OPTIONS = [
  { value: 3, label: '3 Gewinnsätze', hint: 'max. 5 Sätze' },
  { value: 2, label: '2 Gewinnsätze', hint: 'max. 3 Sätze' },
  { value: 1, label: '1 Satz', hint: 'Training' },
];
const POINTS_OPTIONS = [25, 21, 15];

export function NewMatchScreen({ onGoToTeam }: { onGoToTeam: () => void }) {
  const { state, dispatch } = useStore();
  const [opponent, setOpponent] = useState('');
  const [setsToWin, setSetsToWin] = useState(3);
  const [points, setPoints] = useState(25);

  const enoughPlayers = state.players.length >= 6;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Neues Spiel</Text>

      {!enoughPlayers && (
        <Card style={styles.warn}>
          <Text style={styles.warnTitle}>Erst das Team anlegen</Text>
          <Text style={styles.warnText}>
            Für eine Aufstellung brauchst du mindestens 6 Spieler. Aktuell: {state.players.length}.
          </Text>
          <Button title="Zum Team" variant="secondary" compact onPress={onGoToTeam} style={{ marginTop: 10 }} />
        </Card>
      )}

      <Card>
        <SectionTitle>Gegner</SectionTitle>
        <TextInput
          value={opponent}
          onChangeText={setOpponent}
          placeholder="z. B. TV Musterstadt"
          style={styles.input}
          maxLength={30}
        />

        <SectionTitle style={styles.mt}>Spielmodus</SectionTitle>
        <View style={styles.chips}>
          {SETS_OPTIONS.map((o) => (
            <Chip key={o.value} label={`${o.label} · ${o.hint}`} selected={setsToWin === o.value} onPress={() => setSetsToWin(o.value)} />
          ))}
        </View>

        <SectionTitle style={styles.mt}>Punkte pro Satz</SectionTitle>
        <View style={styles.chips}>
          {POINTS_OPTIONS.map((p) => (
            <Chip key={p} label={String(p)} selected={points === p} onPress={() => setPoints(p)} />
          ))}
        </View>
        {setsToWin > 1 && (
          <Text style={styles.hint}>
            Entscheidungssatz (Satz {setsToWin * 2 - 1}) bis {Math.min(15, points)} Punkte. Jeder Satz braucht 2 Punkte Vorsprung.
          </Text>
        )}
      </Card>

      <Button
        title="Weiter zur Aufstellung"
        disabled={!enoughPlayers}
        style={styles.mt}
        onPress={() =>
          dispatch({
            type: 'newMatch',
            opponent: opponent.trim() || 'Gegner',
            config: { setsToWin, pointsPerSet: points, tiebreakPoints: Math.min(15, points) },
          })
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '900', color: colors.text, marginBottom: 12 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 17,
    color: colors.text,
  },
  mt: { marginTop: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hint: { color: colors.muted, marginTop: 10, fontSize: 13, lineHeight: 18 },
  warn: { marginBottom: 12, backgroundColor: '#FFF7E6', borderColor: '#F5D08A' },
  warnTitle: { fontWeight: '800', fontSize: 16, color: colors.text },
  warnText: { color: colors.muted, marginTop: 4 },
});
