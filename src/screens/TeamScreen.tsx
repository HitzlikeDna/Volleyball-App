import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Chip, confirm, SectionTitle, Sheet } from '../components/ui';
import { newId, useStore } from '../state/store';
import { colors, radius } from '../theme';
import { PLAYER_ROLES, type Player, type PlayerRole } from '../types';

export function TeamScreen() {
  const { state, dispatch } = useStore();
  const [editing, setEditing] = useState<Player | 'new' | null>(null);

  return (
    <View style={styles.container}>
      <FlatList
        data={state.players}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Kader</Text>
            <Text style={styles.subtitle}>
              {state.players.length} Spieler · mindestens 6 für eine Aufstellung
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Card>
            <Text style={styles.emptyTitle}>Noch keine Spieler</Text>
            <Text style={styles.emptyText}>
              Trage deine Spieler mit Trikotnummer ein. Die Position (z. B. Mitte oder Libero) hilft später bei der Aufstellung.
            </Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => setEditing(item)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
            <View style={[styles.badge, item.role === 'Libero' && { backgroundColor: colors.libero }]}>
              <Text style={styles.badgeText}>{item.number}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name || 'Ohne Namen'}</Text>
              <Text style={styles.role}>{item.role}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
      />
      <View style={styles.footer}>
        <Button title="+ Spieler hinzufügen" onPress={() => setEditing('new')} />
      </View>

      <PlayerForm
        key={editing === 'new' ? 'new' : (editing?.id ?? 'none')}
        player={editing === 'new' ? null : editing}
        visible={editing !== null}
        existing={state.players}
        onClose={() => setEditing(null)}
        onSave={(p) => {
          dispatch({ type: editing === 'new' ? 'addPlayer' : 'updatePlayer', player: p });
          setEditing(null);
        }}
        onDelete={(p) =>
          confirm('Spieler löschen?', `#${p.number} ${p.name} wird aus dem Kader entfernt.`, () => {
            dispatch({ type: 'deletePlayer', id: p.id });
            setEditing(null);
          }, 'Löschen')
        }
      />
    </View>
  );
}

function PlayerForm({
  player,
  visible,
  existing,
  onClose,
  onSave,
  onDelete,
}: {
  player: Player | null;
  visible: boolean;
  existing: Player[];
  onClose: () => void;
  onSave: (p: Player) => void;
  onDelete: (p: Player) => void;
}) {
  const [number, setNumber] = useState(player ? String(player.number) : '');
  const [name, setName] = useState(player?.name ?? '');
  const [role, setRole] = useState<PlayerRole>(player?.role ?? 'Außen');

  const num = Number(number);
  const numberValid = number.trim() !== '' && Number.isInteger(num) && num >= 0 && num <= 99;
  const duplicate = numberValid && existing.some((p) => p.number === num && p.id !== player?.id);
  const error = number.trim() === '' ? null : !numberValid ? 'Nummer 0–99' : duplicate ? `Nummer ${num} ist schon vergeben` : null;

  const save = () => {
    if (!numberValid || duplicate) return;
    onSave({ id: player?.id ?? newId(), number: num, name: name.trim(), role });
  };

  return (
    <Sheet visible={visible} title={player ? `Spieler #${player.number}` : 'Neuer Spieler'} onClose={onClose}>
      <View style={styles.formRow}>
        <View style={{ width: 90 }}>
          <SectionTitle>Nummer</SectionTitle>
          <TextInput
            value={number}
            onChangeText={(t) => setNumber(t.replace(/[^0-9]/g, '').slice(0, 2))}
            keyboardType="number-pad"
            placeholder="7"
            style={[styles.input, styles.inputNumber]}
            autoFocus={!player}
          />
        </View>
        <View style={{ flex: 1 }}>
          <SectionTitle>Name</SectionTitle>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Vorname"
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={save}
          />
        </View>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}

      <SectionTitle style={{ marginTop: 16 }}>Position</SectionTitle>
      <View style={styles.chips}>
        {PLAYER_ROLES.map((r) => (
          <Chip key={r} label={r} selected={role === r} onPress={() => setRole(r)} color={r === 'Libero' ? colors.libero : colors.primary} />
        ))}
      </View>

      <Button title="Speichern" onPress={save} disabled={!numberValid || duplicate} style={{ marginTop: 20 }} />
      {player && <Button title="Spieler löschen" variant="ghost" onPress={() => onDelete(player)} style={{ marginTop: 8 }} />}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, gap: 8, paddingBottom: 100 },
  header: { marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', color: colors.text },
  subtitle: { color: colors.muted, marginTop: 2 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  emptyText: { color: colors.muted, marginTop: 6, lineHeight: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  role: { fontSize: 13, color: colors.muted },
  chevron: { fontSize: 24, color: colors.muted },
  footer: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  formRow: { flexDirection: 'row', gap: 12 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 17,
    color: colors.text,
  },
  inputNumber: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  error: { color: colors.them, marginTop: 8, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
