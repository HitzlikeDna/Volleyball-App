import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Court } from '../components/Court';
import { Button, Card, Chip, confirm, SectionTitle, Sheet } from '../components/ui';
import { courtPlayers, POSITION_LABELS } from '../logic/match';
import { useStore } from '../state/store';
import { colors, radius } from '../theme';
import type { Player, Team } from '../types';

type Slots = (string | null)[];

/** Hinweise, wenn typische Gegenüber-Positionen nicht eingehalten werden. */
function lineupHints(slots: Slots, byId: Map<string, Player>): string[] {
  const hints: string[] = [];
  const indicesOf = (pred: (p: Player) => boolean) =>
    slots.flatMap((id, i) => (id && byId.get(id) && pred(byId.get(id)!) ? [i] : []));
  const opposite = (a: number, b: number) => Math.abs(a - b) === 3;

  for (const role of ['Mitte', 'Außen'] as const) {
    const idx = indicesOf((p) => p.role === role);
    if (idx.length === 2 && !opposite(idx[0], idx[1])) {
      hints.push(
        `Die beiden ${role === 'Mitte' ? 'Mittelblocker' : 'Außenangreifer'} stehen meist gegenüber (I↔IV, II↔V, III↔VI), damit immer einer vorne ist.`,
      );
    }
  }
  const setter = indicesOf((p) => p.role === 'Zuspiel');
  const opp = indicesOf((p) => p.role === 'Diagonal');
  if (setter.length === 1 && opp.length === 1 && !opposite(setter[0], opp[0])) {
    hints.push('Zuspieler und Diagonalangreifer stehen normalerweise gegenüber.');
  }
  return hints;
}

export function LineupScreen({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const { state, dispatch, matchState } = useStore();
  const match = state.match!;
  const sets = matchState?.sets ?? [];
  const current = matchState?.current ?? null;
  // Korrektur eines laufenden Satzes ohne Ballwechsel oder neuer Satz
  const correcting = !!current && !current.winner;
  const reference = correcting ? current : sets[sets.length - 1];
  const setNumber = correcting ? current!.number : sets.length + 1;

  const byId = useMemo(() => new Map(state.players.map((p) => [p.id, p])), [state.players]);
  const valid = (id: string | null | undefined) => (id && byId.has(id) ? id : null);

  const [slots, setSlots] = useState<Slots>(() => {
    const base = reference?.startLineup ?? [];
    return Array.from({ length: 6 }, (_, i) => valid(base[i]));
  });
  const [serving, setServing] = useState<Team>(() => {
    if (correcting) return current!.firstServe;
    if (!reference) return 'us';
    // Im nächsten Satz wechselt der erste Aufschlag.
    return reference.firstServe === 'us' ? 'them' : 'us';
  });
  const [liberoId, setLiberoId] = useState<string | null>(() => {
    if (reference) return valid(reference.liberoId);
    return state.players.find((p) => p.role === 'Libero')?.id ?? null;
  });
  const [liberoForManual, setLiberoForManual] = useState<string[] | null>(() =>
    reference ? reference.liberoFor.filter((id) => byId.has(id)) : null,
  );
  const [pickSlot, setPickSlot] = useState<number | null>(null);

  const filled = slots.filter(Boolean) as string[];
  const complete = filled.length === 6;
  const libero = liberoId && !filled.includes(liberoId) ? liberoId : null;
  const liberoFor = (liberoForManual ?? filled.filter((id) => byId.get(id)?.role === 'Mitte')).filter((id) =>
    filled.includes(id),
  );
  const hints = lineupHints(slots, byId);

  const available = state.players.filter((p) => !filled.includes(p.id) && p.id !== libero);

  const assign = (playerId: string | null) => {
    if (pickSlot === null) return;
    setSlots((s) => s.map((id, i) => (i === pickSlot ? playerId : id)));
    setPickSlot(null);
  };

  const start = () => {
    dispatch({ type: 'event', event: { type: 'setStart', lineup: filled, serving, liberoId: libero, liberoFor: libero ? liberoFor : [] } });
    onDone();
  };

  const previewCourt = courtPlayers({ lineup: slots.map((s) => s ?? ''), liberoId: libero, liberoFor, serving });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Aufstellung Satz {setNumber}</Text>
          <Text style={styles.subtitle}>gegen {match.opponent}</Text>
        </View>
        {onCancel && <Button title="Zurück" variant="secondary" compact onPress={onCancel} />}
      </View>

      <Text style={styles.help}>Tippe auf eine Position, um einen Spieler einzusetzen. Position I schlägt auf.</Text>

      <Court
        slots={slots.map((id) => (id ? byId.get(id) : undefined))}
        onPressSlot={setPickSlot}
        serverIndex={serving === 'us' ? 0 : null}
        emptyLabel="wählen"
      />

      <Card style={styles.mt}>
        <SectionTitle>Erster Aufschlag</SectionTitle>
        <View style={styles.chips}>
          <Chip label="🏐 Wir" selected={serving === 'us'} onPress={() => setServing('us')} color={colors.us} />
          <Chip label={`🏐 ${match.opponent}`} selected={serving === 'them'} onPress={() => setServing('them')} color={colors.them} />
        </View>
        <Text style={styles.small}>
          {serving === 'us'
            ? 'Spieler auf Position I schlägt zuerst auf.'
            : 'Holen wir den ersten Punkt, rotieren wir und Position II schlägt auf.'}
        </Text>
      </Card>

      <Card style={styles.mt}>
        <SectionTitle>Libero (optional)</SectionTitle>
        <View style={styles.chips}>
          <Chip label="Kein Libero" selected={!libero} onPress={() => setLiberoId(null)} />
          {state.players
            .filter((p) => !filled.includes(p.id))
            .map((p) => (
              <Chip
                key={p.id}
                label={`#${p.number} ${p.name}`}
                selected={libero === p.id}
                onPress={() => setLiberoId(p.id)}
                color={colors.libero}
              />
            ))}
        </View>
        {libero && (
          <>
            <Text style={[styles.small, { marginTop: 12, marginBottom: 8 }]}>
              Libero kommt automatisch für diese Spieler, sobald sie hinten stehen (nicht beim eigenen Aufschlag):
            </Text>
            <View style={styles.chips}>
              {filled.map((id) => {
                const p = byId.get(id)!;
                const on = liberoFor.includes(id);
                return (
                  <Chip
                    key={id}
                    label={`#${p.number} ${p.name}`}
                    selected={on}
                    color={colors.libero}
                    onPress={() => setLiberoForManual(on ? liberoFor.filter((x) => x !== id) : [...liberoFor, id])}
                  />
                );
              })}
            </View>
            {complete && (
              <Text style={[styles.small, { marginTop: 8 }]}>
                Zum Start steht der Libero auf{' '}
                {previewCourt.includes(libero) ? `Position ${POSITION_LABELS[previewCourt.indexOf(libero)]}` : 'der Bank'}.
              </Text>
            )}
          </>
        )}
      </Card>

      {hints.length > 0 && (
        <Card style={[styles.mt, styles.hintCard]}>
          {hints.map((h) => (
            <Text key={h} style={styles.hintText}>
              💡 {h}
            </Text>
          ))}
        </Card>
      )}

      <RotationInfo />

      <Button title={complete ? 'Satz starten' : `Noch ${6 - filled.length} Spieler wählen`} disabled={!complete} onPress={start} style={styles.mt} />
      {!onCancel && sets.length === 0 && (
        <Button
          title="Spiel verwerfen"
          variant="ghost"
          style={{ marginTop: 6 }}
          onPress={() => confirm('Spiel verwerfen?', 'Das Spiel wurde noch nicht begonnen.', () => dispatch({ type: 'finishMatch' }), 'Verwerfen')}
        />
      )}

      <Sheet visible={pickSlot !== null} title={`Position ${pickSlot !== null ? POSITION_LABELS[pickSlot] : ''}`} onClose={() => setPickSlot(null)}>
        {pickSlot !== null && slots[pickSlot] && (
          <Button title="Position leeren" variant="secondary" onPress={() => assign(null)} style={{ marginBottom: 12 }} />
        )}
        <View style={styles.pickList}>
          {available.map((p) => (
            <Pressable key={p.id} onPress={() => assign(p.id)} style={({ pressed }) => [styles.pickItem, pressed && { opacity: 0.7 }]}>
              <View style={[styles.badge, p.role === 'Libero' && { backgroundColor: colors.libero }]}>
                <Text style={styles.badgeText}>{p.number}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pickName}>{p.name || 'Ohne Namen'}</Text>
                <Text style={styles.small}>{p.role}</Text>
              </View>
            </Pressable>
          ))}
          {available.length === 0 && <Text style={styles.small}>Alle Spieler sind bereits eingesetzt.</Text>}
        </View>
      </Sheet>
    </ScrollView>
  );
}

function RotationInfo() {
  const [open, setOpen] = useState(false);
  return (
    <Card style={styles.mt}>
      <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button">
        <Text style={styles.infoTitle}>{open ? '▾' : '▸'} So funktioniert die Rotation</Text>
      </Pressable>
      {open && (
        <View style={{ marginTop: 8, gap: 6 }}>
          <Text style={styles.infoText}>• Vorne stehen IV – III – II, hinten V – VI – I. Position I schlägt auf.</Text>
          <Text style={styles.infoText}>• Punkt bei eigenem Aufschlag: gleicher Aufschläger, keine Rotation.</Text>
          <Text style={styles.infoText}>
            • Punkt bei gegnerischem Aufschlag (Side-Out): Wir bekommen den Aufschlag und rotieren im Uhrzeigersinn – II geht auf I, I auf
            VI, VI auf V usw.
          </Text>
          <Text style={styles.infoText}>• Punkt für den Gegner: Er schlägt auf, wir rotieren nicht.</Text>
          <Text style={styles.infoText}>• Die App rotiert das alles automatisch – du trägst nur ein, wie der Ballwechsel endete.</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 26, fontWeight: '900', color: colors.text },
  subtitle: { color: colors.muted },
  help: { color: colors.muted, marginVertical: 12 },
  mt: { marginTop: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  small: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 6 },
  hintCard: { backgroundColor: '#FFF7E6', borderColor: '#F5D08A', gap: 6 },
  hintText: { color: colors.text, lineHeight: 20 },
  infoTitle: { fontWeight: '800', color: colors.primary, fontSize: 15 },
  infoText: { color: colors.text, lineHeight: 20 },
  pickList: { gap: 8, paddingBottom: 8 },
  pickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    padding: 10,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontWeight: '900', fontSize: 17 },
  pickName: { fontSize: 16, fontWeight: '700', color: colors.text },
});
