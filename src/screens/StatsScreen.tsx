import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, confirm, SectionTitle } from '../components/ui';
import { playerLabel } from '../logic/describe';
import { replay } from '../logic/match';
import { RALLY_KINDS, THEM_KINDS, US_KINDS } from '../logic/rallyKinds';
import { computeStats, percent, type PlayerStats } from '../logic/stats';
import { usePlayerLookup, useStore } from '../state/store';
import { colors, radius } from '../theme';
import type { Match, RallyKind } from '../types';

const TABLE_COLUMNS: { key: RallyKind | 'serves' | 'plusMinus'; label: string }[] = [
  { key: 'serves', label: 'Aufs.' },
  { key: 'ace', label: 'Ass' },
  { key: 'serveError', label: 'AF' },
  { key: 'kill', label: 'Angr' },
  { key: 'attackError', label: 'AgF' },
  { key: 'block', label: 'Block' },
  { key: 'blocked', label: 'Gebl' },
  { key: 'receiveError', label: 'AnF' },
  { key: 'ownError', label: 'EF' },
  { key: 'plusMinus', label: '+/−' },
];

export function StatsScreen() {
  const { state, dispatch } = useStore();
  const matches = useMemo(() => [...(state.match ? [state.match] : []), ...state.history], [state.match, state.history]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const match = matches.find((m) => m.id === selectedId) ?? matches[0];

  if (!match) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Statistik</Text>
        <Card>
          <Text style={styles.emptyTitle}>Noch keine Spiele</Text>
          <Text style={styles.muted}>Sobald du ein Spiel einträgst, siehst du hier Punkte, Fehler und Werte pro Spieler.</Text>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Statistik</Text>
      {matches.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {matches.map((m) => (
            <Chip
              key={m.id}
              label={`${m === state.match ? '● ' : ''}${m.opponent} · ${formatDate(m.createdAt)}`}
              selected={m.id === match.id}
              onPress={() => setSelectedId(m.id)}
            />
          ))}
        </ScrollView>
      )}
      <MatchStats
        key={match.id}
        match={match}
        isCurrent={match === state.match}
        onDelete={() =>
          confirm('Spiel löschen?', `Spiel gegen ${match.opponent} endgültig löschen?`, () => {
            dispatch({ type: 'deleteHistory', id: match.id });
            setSelectedId(null);
          }, 'Löschen')
        }
      />
    </ScrollView>
  );
}

function MatchStats({ match, isCurrent, onDelete }: { match: Match; isCurrent: boolean; onDelete: () => void }) {
  const ms = useMemo(() => replay(match), [match]);
  const lookup = usePlayerLookup(match);
  const [setFilter, setSetFilter] = useState<number | null>(null);
  const stats = useMemo(() => computeStats(ms, setFilter ?? undefined), [ms, setFilter]);
  const filteredSet = setFilter ? ms.sets.find((s) => s.number === setFilter) : null;

  const players = [...stats.players].sort((a, b) => (lookup(a.playerId)?.number ?? 0) - (lookup(b.playerId)?.number ?? 0));
  const maxUs = Math.max(1, ...US_KINDS.map((k) => stats.counts[k]));
  const maxThem = Math.max(1, ...THEM_KINDS.map((k) => stats.counts[k]));

  return (
    <View style={{ gap: 12 }}>
      <Card>
        <Text style={styles.matchTitle}>Wir – {match.opponent}</Text>
        <Text style={styles.muted}>
          {formatDate(match.createdAt)} · {isCurrent ? 'läuft' : 'beendet'}
        </Text>
        <Text style={styles.result}>
          {ms.setsWon.us} : {ms.setsWon.them}
        </Text>
        {ms.sets.length > 0 && (
          <Text style={[styles.muted, { textAlign: 'center' }]}>
            {ms.sets.map((s) => `${s.scoreUs}:${s.scoreThem}`).join('  ·  ')}
          </Text>
        )}
      </Card>

      {ms.sets.length > 1 && (
        <View style={styles.chips}>
          <Chip label="Gesamt" selected={setFilter === null} onPress={() => setSetFilter(null)} />
          {ms.sets.map((s) => (
            <Chip key={s.number} label={`Satz ${s.number}`} selected={setFilter === s.number} onPress={() => setSetFilter(s.number)} />
          ))}
        </View>
      )}

      <View style={styles.tiles}>
        <Tile label="Punkte" value={`${stats.pointsUs} : ${stats.pointsThem}`} />
        <Tile label="Side-Out" value={percent(stats.sideOuts, stats.receivedRallies)} hint={`${stats.sideOuts}/${stats.receivedRallies} bei Annahme`} />
        <Tile label="Breakpunkte" value={percent(stats.breakPoints, stats.servedRallies)} hint={`${stats.breakPoints}/${stats.servedRallies} bei Aufschlag`} />
        <Tile label="Längste Serie" value={`${stats.longestRunUs} : ${stats.longestRunThem}`} />
      </View>

      <Card>
        <SectionTitle>So haben wir gepunktet</SectionTitle>
        {US_KINDS.map((k) => (
          <Bar key={k} label={RALLY_KINDS[k].label} value={stats.counts[k]} max={maxUs} color={colors.us} />
        ))}
        <SectionTitle style={{ marginTop: 14 }}>So hat der Gegner gepunktet</SectionTitle>
        {THEM_KINDS.map((k) => (
          <Bar key={k} label={RALLY_KINDS[k].label} value={stats.counts[k]} max={maxThem} color={colors.them} />
        ))}
      </Card>

      <Card style={{ paddingHorizontal: 0 }}>
        <SectionTitle style={{ paddingHorizontal: 14 }}>Spieler</SectionTitle>
        {players.length === 0 ? (
          <Text style={[styles.muted, { paddingHorizontal: 14 }]}>Noch keine Aktionen einem Spieler zugeordnet.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View style={{ paddingHorizontal: 14 }}>
              <View style={[styles.tr, styles.thead]}>
                <Text style={[styles.th, styles.nameCol]}>Spieler</Text>
                {TABLE_COLUMNS.map((c) => (
                  <Text key={c.key} style={[styles.th, styles.numCol]}>
                    {c.label}
                  </Text>
                ))}
              </View>
              {players.map((p) => (
                <PlayerRow key={p.playerId} stats={p} name={playerLabel(lookup(p.playerId)) || '?'} />
              ))}
            </View>
          </ScrollView>
        )}
        <Text style={[styles.legend, { paddingHorizontal: 14 }]}>
          Aufs. = Aufschläge · AF = Aufschlagfehler · Angr = Angriffspunkt · AgF = Angriffsfehler · Gebl = geblockt · AnF =
          Annahmefehler · EF = Eigenfehler · +/− = Punkte minus Fehler
        </Text>
      </Card>

      {filteredSet && filteredSet.rallies.length > 0 && (
        <Card>
          <SectionTitle>Verlauf Satz {filteredSet.number}</SectionTitle>
          {[...filteredSet.rallies].reverse().map((r, i) => (
            <View key={i} style={styles.logRow}>
              <Text style={styles.logScore}>
                {r.scoreUs}:{r.scoreThem}
              </Text>
              <View style={[styles.logDot, { backgroundColor: r.winner === 'us' ? colors.us : colors.them }]} />
              <Text style={styles.logText} numberOfLines={1}>
                {RALLY_KINDS[r.kind].label}
                {r.playerId ? ` · ${playerLabel(lookup(r.playerId))}` : ''}
              </Text>
              {r.rotated && <Text style={styles.logRot}>↻</Text>}
            </View>
          ))}
        </Card>
      )}

      {!isCurrent && <Button title="Spiel löschen" variant="ghost" onPress={onDelete} />}
    </View>
  );
}

function PlayerRow({ stats, name }: { stats: PlayerStats; name: string }) {
  return (
    <View style={styles.tr}>
      <Text style={[styles.td, styles.nameCol]} numberOfLines={1}>
        {name}
      </Text>
      {TABLE_COLUMNS.map((c) => {
        const value = c.key === 'serves' ? stats.serves : c.key === 'plusMinus' ? stats.plusMinus : stats.counts[c.key];
        const isPm = c.key === 'plusMinus';
        return (
          <Text
            key={c.key}
            style={[
              styles.td,
              styles.numCol,
              value === 0 && !isPm && { color: '#CBD5E1' },
              isPm && { fontWeight: '900', color: value > 0 ? colors.us : value < 0 ? colors.them : colors.muted },
            ]}
          >
            {isPm && value > 0 ? `+${value}` : value}
          </Text>
        );
      })}
    </View>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
      {hint && <Text style={styles.tileHint}>{hint}</Text>}
    </View>
  );
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <View style={styles.barRow} accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.barLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.barTrack}>
        {value > 0 && <View style={[styles.barFill, { width: `${(value / max) * 100}%`, backgroundColor: color }]} />}
      </View>
      <Text style={styles.barValue}>{value}</Text>
    </View>
  );
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40, gap: 12 },
  title: { fontSize: 28, fontWeight: '900', color: colors.text },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 6 },
  muted: { color: colors.muted, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  matchTitle: { fontSize: 20, fontWeight: '900', color: colors.text },
  result: { fontSize: 44, fontWeight: '900', color: colors.text, textAlign: 'center', marginTop: 4 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  tileLabel: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  tileValue: { color: colors.text, fontWeight: '900', fontSize: 24, marginTop: 2 },
  tileHint: { color: colors.muted, fontSize: 11 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  barLabel: { width: 118, color: colors.text, fontSize: 14 },
  barTrack: { flex: 1, height: 10, justifyContent: 'center' },
  barFill: { height: 10, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  barValue: { width: 28, textAlign: 'right', fontWeight: '800', color: colors.text },
  tr: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.bg, paddingVertical: 8 },
  thead: { borderBottomColor: colors.border },
  th: { fontSize: 12, fontWeight: '800', color: colors.muted },
  td: { fontSize: 14, color: colors.text, fontWeight: '600' },
  nameCol: { width: 120 },
  numCol: { width: 46, textAlign: 'center', fontVariant: ['tabular-nums'] },
  legend: { color: colors.muted, fontSize: 11, marginTop: 10, lineHeight: 16 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  logScore: { width: 48, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  logDot: { width: 8, height: 8, borderRadius: 4 },
  logText: { flex: 1, color: colors.text },
  logRot: { color: colors.primary, fontWeight: '900' },
});
