import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Court } from '../components/Court';
import { Button, confirm, SectionTitle, Sheet } from '../components/ui';
import { describeEvent, playerLabel } from '../logic/describe';
import {
  ballSituation,
  courtPlayers,
  currentServer,
  isTiebreakSideSwitch,
  nextServer,
  POSITION_LABELS,
  replay,
  type SetState,
} from '../logic/match';
import { isKindAvailable, RALLY_KINDS, THEM_KINDS, US_KINDS } from '../logic/rallyKinds';
import { usePlayerLookup, useStore } from '../state/store';
import { colors, radius } from '../theme';
import type { MatchEvent, RallyKind, Team } from '../types';

const MAX_TIMEOUTS = 2;
const MAX_SUBS = 6;

export function LiveMatchScreen({ onNextSet, onEditLineup }: { onNextSet: () => void; onEditLineup: () => void }) {
  const { state, dispatch, matchState } = useStore();
  const match = state.match!;
  const ms = matchState!;
  const set = ms.current!;
  const lookup = usePlayerLookup(match);

  const [pending, setPending] = useState<RallyKind | null>(null);
  const [sheet, setSheet] = useState<'sub' | 'timeout' | 'more' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const showToast = (text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  };

  const court = courtPlayers(set);
  const liberoIndex = set.liberoId ? court.indexOf(set.liberoId) : -1;
  const server = currentServer(set);
  const playing = ms.phase === 'playing';
  const situation = ballSituation(ms, match.config);
  const setterIndex = set.lineup.findIndex((id) => lookup(id)?.role === 'Zuspiel');

  const send = (event: MatchEvent) => {
    const next = replay({ ...match, events: [...match.events, event] });
    dispatch({ type: 'event', event });
    if (event.type !== 'rally') return;
    const s = next.current!;
    const last = s.rallies[s.rallies.length - 1];
    if (!last) return;
    if (s.winner) return; // Satzende wird als Banner angezeigt
    if (isTiebreakSideSwitch(s)) showToast('🔄 Seitenwechsel im Entscheidungssatz!');
    else if (last.rotated) showToast(`↻ Side-Out – Rotation! Aufschlag: ${playerLabel(lookup(currentServer(s)))}`);
  };

  const onKind = (kind: RallyKind) => {
    const info = RALLY_KINDS[kind];
    if (info.player === 'pick') setPending(kind);
    else send({ type: 'rally', kind, playerId: info.player === 'server' ? server : null });
  };

  const lastEvent = match.events[match.events.length - 1];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Scoreboard
          set={set}
          opponent={match.opponent}
          setsWon={ms.setsWon}
          history={ms.sets.filter((s) => s.winner).map((s) => `${s.scoreUs}:${s.scoreThem}`)}
          situation={situation}
        />

        <View style={styles.metaRow}>
          <Text style={styles.meta}>Rotation {(set.rotations % 6) + 1}</Text>
          {setterIndex >= 0 && <Text style={styles.meta}>Zuspiel auf {POSITION_LABELS[setterIndex]}</Text>}
          <Text style={styles.meta}>
            Wechsel {set.subs.length}/{MAX_SUBS}
          </Text>
        </View>

        <Court
          slots={court.map((id) => lookup(id))}
          serverIndex={set.serving === 'us' ? 0 : null}
          liberoIndex={liberoIndex >= 0 ? liberoIndex : null}
          compact
        />

        <View style={[styles.serveInfo, { backgroundColor: set.serving === 'us' ? colors.usSoft : colors.themSoft }]}>
          {set.serving === 'us' ? (
            <Text style={styles.serveText}>
              🏐 <Text style={styles.bold}>Wir schlagen auf:</Text> {playerLabel(lookup(server))}
            </Text>
          ) : (
            <Text style={styles.serveText}>
              🛡️ <Text style={styles.bold}>Annahme.</Text> Bei Punkt rotieren wir – dann schlägt {playerLabel(lookup(nextServer(set)))} auf.
            </Text>
          )}
        </View>

        {playing ? (
          <>
            <ActionGroup
              title="Punkt für uns"
              color={colors.us}
              kinds={US_KINDS}
              serving={set.serving}
              variant="us"
              onPress={onKind}
            />
            <ActionGroup
              title={`Punkt für ${match.opponent}`}
              color={colors.them}
              kinds={THEM_KINDS}
              serving={set.serving}
              variant="them"
              onPress={onKind}
            />
          </>
        ) : (
          <SetOverBanner
            phase={ms.phase}
            set={set}
            setsWon={ms.setsWon}
            winner={ms.winner}
            onNextSet={onNextSet}
            onFinish={() => dispatch({ type: 'finishMatch' })}
          />
        )}
      </ScrollView>

      <View style={styles.toolbar}>
        <ToolButton
          icon="↶"
          label="Zurück"
          sub={lastEvent ? describeEvent(lastEvent, lookup) : undefined}
          disabled={!lastEvent}
          onPress={() => dispatch({ type: 'undo' })}
        />
        <ToolButton icon="⇄" label="Wechsel" disabled={!playing} onPress={() => setSheet('sub')} />
        <ToolButton
          icon="⏱"
          label="Auszeit"
          sub={`${set.timeouts.us} : ${set.timeouts.them}`}
          disabled={!playing}
          onPress={() => setSheet('timeout')}
        />
        <ToolButton icon="⋯" label="Mehr" onPress={() => setSheet('more')} />
      </View>

      {toast && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      {/* Spielerauswahl nach Antippen einer Aktion */}
      <Sheet
        visible={pending !== null}
        title={pending ? `${RALLY_KINDS[pending].label} – wer?` : ''}
        onClose={() => setPending(null)}
      >
        <Text style={styles.sheetHelp}>Tippe auf den Spieler auf dem Feld.</Text>
        <Court
          slots={court.map((id) => lookup(id))}
          liberoIndex={liberoIndex >= 0 ? liberoIndex : null}
          onPressSlot={(i) => {
            const kind = pending!;
            setPending(null);
            send({ type: 'rally', kind, playerId: court[i] });
          }}
        />
        <Button
          title="Ohne Spieler eintragen"
          variant="secondary"
          style={{ marginTop: 12 }}
          onPress={() => {
            const kind = pending!;
            setPending(null);
            send({ type: 'rally', kind, playerId: null });
          }}
        />
      </Sheet>

      <SubSheet visible={sheet === 'sub'} set={set} onClose={() => setSheet(null)} onSub={(outId, inId) => {
        setSheet(null);
        send({ type: 'sub', outId, inId });
        showToast(`⇄ #${lookup(inId)?.number} kommt für #${lookup(outId)?.number}`);
      }} />

      <Sheet visible={sheet === 'timeout'} title="Auszeit" onClose={() => setSheet(null)}>
        <View style={{ gap: 10 }}>
          {(['us', 'them'] as Team[]).map((team) => (
            <Button
              key={team}
              title={team === 'us' ? 'Auszeit für uns' : `Auszeit für ${match.opponent}`}
              subtitle={`${set.timeouts[team]} von ${MAX_TIMEOUTS} genommen`}
              variant={team}
              disabled={set.timeouts[team] >= MAX_TIMEOUTS}
              onPress={() => {
                setSheet(null);
                send({ type: 'timeout', team });
                showToast(`⏱ Auszeit ${team === 'us' ? 'für uns' : match.opponent} (${set.timeouts[team] + 1}/${MAX_TIMEOUTS})`);
              }}
            />
          ))}
        </View>
      </Sheet>

      <Sheet visible={sheet === 'more'} title="Optionen" onClose={() => setSheet(null)}>
        <View style={{ gap: 10 }}>
          <Button
            title="Aufstellung korrigieren"
            subtitle={set.rallies.length ? 'Nur vor dem ersten Ballwechsel möglich' : 'Spieler oder Aufschlag ändern'}
            variant="secondary"
            disabled={set.rallies.length > 0 || !playing}
            onPress={() => {
              setSheet(null);
              onEditLineup();
            }}
          />
          <Button
            title="Spiel beenden"
            subtitle="Wird in der Statistik gespeichert"
            variant="secondary"
            onPress={() =>
              confirm('Spiel beenden?', 'Das Spiel wird abgeschlossen und in der Historie gespeichert.', () => {
                setSheet(null);
                dispatch({ type: 'finishMatch' });
              }, 'Beenden')
            }
          />
        </View>
      </Sheet>
    </View>
  );
}

function Scoreboard({
  set,
  opponent,
  setsWon,
  history,
  situation,
}: {
  set: SetState;
  opponent: string;
  setsWon: Record<Team, number>;
  history: string[];
  situation: ReturnType<typeof ballSituation>;
}) {
  return (
    <View style={styles.board}>
      <View style={styles.boardTop}>
        <Text style={styles.boardSet}>
          Satz {set.number}
          {set.isTiebreak ? ' · Entscheidungssatz' : ''} · bis {set.target}
        </Text>
        {situation && (
          <View style={[styles.situation, { backgroundColor: situation.team === 'us' ? colors.us : colors.them }]}>
            <Text style={styles.situationText}>
              {situation.type} {situation.team === 'us' ? 'Wir' : opponent}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.boardRow}>
        <TeamScore name="Wir" score={set.scoreUs} sets={setsWon.us} serving={set.serving === 'us'} color={colors.us} />
        <Text style={styles.colon}>:</Text>
        <TeamScore name={opponent} score={set.scoreThem} sets={setsWon.them} serving={set.serving === 'them'} color={colors.them} />
      </View>
      {history.length > 0 && <Text style={styles.history}>Sätze: {history.join('  ·  ')}</Text>}
    </View>
  );
}

function TeamScore({ name, score, sets, serving, color }: { name: string; score: number; sets: number; serving: boolean; color: string }) {
  return (
    <View style={styles.teamScore}>
      <Text style={styles.teamName} numberOfLines={1}>
        {serving ? '🏐 ' : ''}
        {name}
      </Text>
      <Text style={[styles.score, { color: '#fff' }]}>{score}</Text>
      <View style={[styles.setsPill, { backgroundColor: color }]}>
        <Text style={styles.setsText}>Sätze {sets}</Text>
      </View>
    </View>
  );
}

function ActionGroup({
  title,
  color,
  kinds,
  serving,
  variant,
  onPress,
}: {
  title: string;
  color: string;
  kinds: RallyKind[];
  serving: Team;
  variant: 'us' | 'them';
  onPress: (k: RallyKind) => void;
}) {
  return (
    <View style={styles.group}>
      <SectionTitle style={{ color }}>{title}</SectionTitle>
      <View style={styles.grid}>
        {kinds.map((k) => {
          const info = RALLY_KINDS[k];
          return (
            <Button
              key={k}
              title={info.label}
              subtitle={info.player === 'server' ? 'Aufschläger' : info.hint}
              variant={variant}
              disabled={!isKindAvailable(k, serving)}
              onPress={() => onPress(k)}
              style={styles.gridItem}
            />
          );
        })}
      </View>
    </View>
  );
}

function SetOverBanner({
  phase,
  set,
  setsWon,
  winner,
  onNextSet,
  onFinish,
}: {
  phase: string;
  set: SetState;
  setsWon: Record<Team, number>;
  winner: Team | null;
  onNextSet: () => void;
  onFinish: () => void;
}) {
  const matchOver = phase === 'matchOver';
  const won = matchOver ? winner === 'us' : set.winner === 'us';
  return (
    <View style={[styles.banner, { backgroundColor: won ? colors.usSoft : colors.themSoft, borderColor: won ? colors.us : colors.them }]}>
      <Text style={styles.bannerEmoji}>{won ? '🎉' : '💪'}</Text>
      <Text style={styles.bannerTitle}>
        {matchOver
          ? `Spiel ${won ? 'gewonnen' : 'verloren'} ${setsWon.us}:${setsWon.them}`
          : `Satz ${set.number} ${won ? 'gewonnen' : 'verloren'} ${set.scoreUs}:${set.scoreThem}`}
      </Text>
      <Text style={styles.bannerText}>
        {matchOver ? 'Die Statistik findest du im Tab „Statistik“.' : `Stand nach Sätzen ${setsWon.us}:${setsWon.them}`}
      </Text>
      {matchOver ? (
        <Button title="Spiel abschließen" onPress={onFinish} style={{ alignSelf: 'stretch', marginTop: 12 }} />
      ) : (
        <Button title={`Aufstellung Satz ${set.number + 1}`} onPress={onNextSet} style={{ alignSelf: 'stretch', marginTop: 12 }} />
      )}
      <Text style={[styles.bannerText, { marginTop: 8 }]}>Vertippt? Mit „Zurück“ unten wird der letzte Punkt entfernt.</Text>
    </View>
  );
}

function ToolButton({
  icon,
  label,
  sub,
  disabled,
  onPress,
}: {
  icon: string;
  label: string;
  sub?: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tool, disabled && { opacity: 0.35 }, pressed && { opacity: 0.6 }]}
    >
      <Text style={styles.toolIcon}>{icon}</Text>
      <Text style={styles.toolLabel}>{label}</Text>
      {sub ? (
        <Text style={styles.toolSub} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </Pressable>
  );
}

function SubSheet({
  visible,
  set,
  onClose,
  onSub,
}: {
  visible: boolean;
  set: SetState;
  onClose: () => void;
  onSub: (outId: string, inId: string) => void;
}) {
  const { state } = useStore();
  const lookup = usePlayerLookup(state.match);
  const [outIndex, setOutIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) setOutIndex(null);
  }, [visible]);

  const bench = state.players.filter((p) => !set.lineup.includes(p.id) && p.id !== set.liberoId);
  const outId = outIndex !== null ? set.lineup[outIndex] : null;

  return (
    <Sheet visible={visible} title="Spielerwechsel" onClose={onClose}>
      <Text style={styles.sheetHelp}>
        {outId ? `Wer kommt für ${playerLabel(lookup(outId))}?` : '1. Wer geht raus? Tippe auf den Spieler.'}
      </Text>
      <Court slots={set.lineup.map((id) => lookup(id))} onPressSlot={setOutIndex} selectedIndex={outIndex} compact />
      {outId && (
        <View style={{ gap: 8, marginTop: 12 }}>
          {bench.map((p) => (
            <Pressable key={p.id} onPress={() => onSub(outId, p.id)} style={({ pressed }) => [styles.benchItem, pressed && { opacity: 0.7 }]}>
              <Text style={styles.benchNumber}>#{p.number}</Text>
              <Text style={styles.benchName}>{p.name}</Text>
              <Text style={styles.benchRole}>{p.role}</Text>
            </Pressable>
          ))}
          {bench.length === 0 && <Text style={styles.sheetHelp}>Keine Spieler auf der Bank.</Text>}
        </View>
      )}
      {set.subs.length >= MAX_SUBS && (
        <Text style={[styles.sheetHelp, { color: colors.them, marginTop: 8 }]}>Achtung: bereits {set.subs.length} Wechsel in diesem Satz.</Text>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, paddingBottom: 110, gap: 10 },
  board: { backgroundColor: colors.header, borderRadius: 16, padding: 12 },
  boardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 },
  boardSet: { color: '#94A3B8', fontWeight: '700', fontSize: 12 },
  situation: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  situationText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  boardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamScore: { flex: 1, alignItems: 'center' },
  teamName: { color: '#E2E8F0', fontWeight: '700', fontSize: 15, maxWidth: '100%' },
  score: { fontSize: 54, fontWeight: '900', fontVariant: ['tabular-nums'] },
  colon: { color: '#475569', fontSize: 40, fontWeight: '900' },
  setsPill: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999 },
  setsText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  history: { color: '#94A3B8', textAlign: 'center', marginTop: 8, fontSize: 12 },
  metaRow: { flexDirection: 'row', justifyContent: 'center', gap: 14, flexWrap: 'wrap' },
  meta: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  serveInfo: { borderRadius: radius, padding: 10 },
  serveText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  bold: { fontWeight: '800' },
  group: { marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridItem: { flexBasis: '48%', flexGrow: 1 },
  banner: { borderRadius: 16, borderWidth: 2, padding: 16, alignItems: 'center' },
  bannerEmoji: { fontSize: 36 },
  bannerTitle: { fontSize: 20, fontWeight: '900', color: colors.text, marginTop: 4, textAlign: 'center' },
  bannerText: { color: colors.muted, marginTop: 4, textAlign: 'center' },
  toolbar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 6,
  },
  tool: { flex: 1, alignItems: 'center', paddingVertical: 4, paddingHorizontal: 2 },
  toolIcon: { fontSize: 20, color: colors.text },
  toolLabel: { fontSize: 12, fontWeight: '700', color: colors.text },
  toolSub: { fontSize: 10, color: colors.muted, maxWidth: '100%' },
  toast: {
    position: 'absolute',
    bottom: 76,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(15, 30, 61, 0.95)',
    padding: 12,
    borderRadius: radius,
  },
  toastText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  sheetHelp: { color: colors.muted, marginBottom: 10 },
  benchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
  },
  benchNumber: { fontWeight: '900', fontSize: 18, color: colors.primary, width: 44 },
  benchName: { flex: 1, fontWeight: '700', color: colors.text, fontSize: 16 },
  benchRole: { color: colors.muted },
});
