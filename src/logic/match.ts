import type { Match, MatchConfig, MatchEvent, RallyKind, Team } from '../types';
import { RALLY_KINDS } from './rallyKinds';

/*
 * Positionen im Volleyball (Blick vom eigenen Feld zum Netz):
 *
 *        N E T Z
 *   [ IV ] [ III ] [ II ]    <- vordere Reihe
 *   [ V  ] [ VI  ] [ I  ]    <- hintere Reihe, I = Aufschläger
 *
 * In den Arrays steht Index 0 für Position I, Index 5 für Position VI.
 *
 * Rotation (im Uhrzeigersinn) passiert, wenn wir den Aufschlag zurückgewinnen
 * ("Side-Out"): II -> I, I -> VI, VI -> V, V -> IV, IV -> III, III -> II.
 */

export const POSITION_LABELS = ['I', 'II', 'III', 'IV', 'V', 'VI'];

/** Reihenfolge der Positionen für die Darstellung des Feldes (oben = Netz). */
export const COURT_LAYOUT: number[][] = [
  [3, 2, 1], // IV, III, II
  [4, 5, 0], // V, VI, I
];

const BACK_ROW = new Set([0, 4, 5]);

export function isBackRow(index: number): boolean {
  return BACK_ROW.has(index);
}

/** Dreht die Aufstellung einmal im Uhrzeigersinn. */
export function rotate<T>(lineup: T[]): T[] {
  return lineup.map((_, i) => lineup[(i + 1) % lineup.length]);
}

export interface RallyRecord {
  kind: RallyKind;
  winner: Team;
  playerId: string | null;
  /** Wer hat aufgeschlagen (nur wenn wir aufgeschlagen haben). */
  serverId: string | null;
  serving: Team;
  /** Spielstand nach dem Ballwechsel. */
  scoreUs: number;
  scoreThem: number;
  /** Haben wir nach diesem Ballwechsel rotiert? */
  rotated: boolean;
}

export interface SubRecord {
  outId: string;
  inId: string;
  scoreUs: number;
  scoreThem: number;
}

export interface SetState {
  /** 1-basiert. */
  number: number;
  target: number;
  isTiebreak: boolean;
  startLineup: string[];
  /** Die sechs Stammspieler auf Position I–VI (ohne Libero-Tausch). */
  lineup: string[];
  firstServe: Team;
  serving: Team;
  liberoId: string | null;
  liberoFor: string[];
  scoreUs: number;
  scoreThem: number;
  rotations: number;
  subs: SubRecord[];
  timeouts: Record<Team, number>;
  rallies: RallyRecord[];
  winner: Team | null;
}

export type MatchPhase = 'lineup' | 'playing' | 'setOver' | 'matchOver';

export interface MatchState {
  sets: SetState[];
  setsWon: Record<Team, number>;
  current: SetState | null;
  phase: MatchPhase;
  winner: Team | null;
}

export function isTiebreakSet(setNumber: number, config: MatchConfig): boolean {
  return config.setsToWin > 1 && setNumber === config.setsToWin * 2 - 1;
}

export function setTarget(setNumber: number, config: MatchConfig): number {
  return isTiebreakSet(setNumber, config) ? config.tiebreakPoints : config.pointsPerSet;
}

/** Gewinner eines Satzes: Zielpunktzahl erreicht und mindestens 2 Punkte Vorsprung. */
export function setWinnerFor(scoreUs: number, scoreThem: number, target: number): Team | null {
  if (scoreUs >= target && scoreUs - scoreThem >= 2) return 'us';
  if (scoreThem >= target && scoreThem - scoreUs >= 2) return 'them';
  return null;
}

/**
 * Wer steht gerade wirklich auf dem Feld – inklusive Libero.
 * Der Libero ersetzt einen seiner Spieler, sobald dieser in der hinteren Reihe
 * steht. Ausnahme: Der Spieler muss auf Position I aufschlagen (Libero darf
 * nicht aufschlagen).
 */
export function courtPlayers(set: Pick<SetState, 'lineup' | 'liberoId' | 'liberoFor' | 'serving'>): string[] {
  const result = [...set.lineup];
  if (!set.liberoId) return result;
  for (const i of [4, 5, 0]) {
    const id = set.lineup[i];
    if (!set.liberoFor.includes(id)) continue;
    if (i === 0 && set.serving === 'us') continue;
    result[i] = set.liberoId;
    break; // nur ein Libero gleichzeitig
  }
  return result;
}

/** Spieler auf Position I, wenn wir aufschlagen. */
export function currentServer(set: SetState): string | null {
  return set.serving === 'us' ? courtPlayers(set)[0] : null;
}

/** Wer schlägt bei uns als Nächstes auf, wenn wir den Aufschlag zurückholen? */
export function nextServer(set: SetState): string {
  return set.serving === 'us' ? set.lineup[0] : set.lineup[1];
}

function newSet(number: number, ev: Extract<MatchEvent, { type: 'setStart' }>, config: MatchConfig): SetState {
  return {
    number,
    target: setTarget(number, config),
    isTiebreak: isTiebreakSet(number, config),
    startLineup: [...ev.lineup],
    lineup: [...ev.lineup],
    firstServe: ev.serving,
    serving: ev.serving,
    liberoId: ev.liberoId,
    liberoFor: [...ev.liberoFor],
    scoreUs: 0,
    scoreThem: 0,
    rotations: 0,
    subs: [],
    timeouts: { us: 0, them: 0 },
    rallies: [],
    winner: null,
  };
}

/** Wendet einen Ballwechsel an und liefert den Satzgewinner (falls der Satz jetzt vorbei ist). */
function applyRally(set: SetState, kind: RallyKind, playerId: string | null): Team | null {
  const info = RALLY_KINDS[kind];
  const winner = info.winner;
  const serving = set.serving;
  const serverId = currentServer(set);
  let rotated = false;

  if (winner === 'us') {
    set.scoreUs += 1;
    if (serving === 'them') {
      // Side-Out: Aufschlagrecht zurück -> im Uhrzeigersinn rotieren.
      set.lineup = rotate(set.lineup);
      set.rotations += 1;
      set.serving = 'us';
      rotated = true;
    }
  } else {
    set.scoreThem += 1;
    set.serving = 'them';
  }

  set.rallies.push({
    kind,
    winner,
    playerId: info.player === 'server' ? serverId : playerId,
    serverId,
    serving,
    scoreUs: set.scoreUs,
    scoreThem: set.scoreThem,
    rotated,
  });

  set.winner = setWinnerFor(set.scoreUs, set.scoreThem, set.target);
  return set.winner;
}

function applySub(set: SetState, outId: string, inId: string) {
  const idx = set.lineup.indexOf(outId);
  if (idx === -1 || set.lineup.includes(inId)) return;
  set.lineup = set.lineup.map((id) => (id === outId ? inId : id));
  set.liberoFor = set.liberoFor.map((id) => (id === outId ? inId : id));
  set.subs.push({ outId, inId, scoreUs: set.scoreUs, scoreThem: set.scoreThem });
}

/** Berechnet den kompletten Spielstand aus der Ereignisliste. */
export function replay(match: Pick<Match, 'events' | 'config'>): MatchState {
  const sets: SetState[] = [];
  const setsWon: Record<Team, number> = { us: 0, them: 0 };
  let current: SetState | null = null;
  let matchWinner: Team | null = null;

  for (const ev of match.events) {
    if (matchWinner) break;

    if (ev.type === 'setStart') {
      if (current && !current.winner) {
        // Aufstellung des laufenden Satzes wird ersetzt.
        sets.pop();
      }
      current = newSet(sets.length + 1, ev, match.config);
      sets.push(current);
      continue;
    }

    if (!current || current.winner) continue;

    switch (ev.type) {
      case 'rally': {
        const setWinner = applyRally(current, ev.kind, ev.playerId);
        if (setWinner) {
          setsWon[setWinner] += 1;
          if (setsWon[setWinner] >= match.config.setsToWin) matchWinner = setWinner;
        }
        break;
      }
      case 'sub':
        applySub(current, ev.outId, ev.inId);
        break;
      case 'timeout':
        current.timeouts[ev.team] += 1;
        break;
    }
  }

  let phase: MatchPhase;
  if (matchWinner) phase = 'matchOver';
  else if (!current) phase = 'lineup';
  else if (current.winner) phase = 'setOver';
  else phase = 'playing';

  return { sets, setsWon, current, phase, winner: matchWinner };
}

/** Satzball / Matchball für eine Mannschaft? */
export function ballSituation(state: MatchState, config: MatchConfig): { team: Team; type: 'Satzball' | 'Matchball' } | null {
  const set = state.current;
  if (!set || set.winner) return null;
  for (const team of ['us', 'them'] as Team[]) {
    const us = set.scoreUs + (team === 'us' ? 1 : 0);
    const them = set.scoreThem + (team === 'them' ? 1 : 0);
    if (setWinnerFor(us, them, set.target) === team) {
      const isMatch = state.setsWon[team] + 1 >= config.setsToWin;
      return { team, type: isMatch ? 'Matchball' : 'Satzball' };
    }
  }
  return null;
}

/** Seitenwechsel im Entscheidungssatz, sobald eine Mannschaft 8 Punkte hat. */
export function isTiebreakSideSwitch(set: SetState): boolean {
  if (!set.isTiebreak) return false;
  const last = set.rallies[set.rallies.length - 1];
  if (!last) return false;
  const switchAt = Math.ceil(set.target / 2);
  const max = Math.max(last.scoreUs, last.scoreThem);
  const prevMax = last.winner === 'us' ? Math.max(last.scoreUs - 1, last.scoreThem) : Math.max(last.scoreUs, last.scoreThem - 1);
  return max === switchAt && prevMax < switchAt;
}
