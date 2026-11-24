import type { RallyKind } from '../types';
import type { MatchState, SetState } from './match';
import { RALLY_KINDS } from './rallyKinds';

export type KindCounts = Record<RallyKind, number>;

export interface PlayerStats {
  playerId: string;
  counts: KindCounts;
  /** Anzahl eigener Aufschläge. */
  serves: number;
  /** Ass + Angriff + Block */
  points: number;
  /** Alle eigenen Fehler. */
  errors: number;
  plusMinus: number;
}

export interface TeamStats {
  counts: KindCounts;
  pointsUs: number;
  pointsThem: number;
  /** Ballwechsel mit eigenem Aufschlag / davon gewonnen (Breakpunkte). */
  servedRallies: number;
  breakPoints: number;
  /** Ballwechsel mit gegnerischem Aufschlag / davon gewonnen (Side-Out). */
  receivedRallies: number;
  sideOuts: number;
  /** Längste Punkteserie in Folge. */
  longestRunUs: number;
  longestRunThem: number;
  players: PlayerStats[];
}

export function emptyCounts(): KindCounts {
  return Object.fromEntries(Object.keys(RALLY_KINDS).map((k) => [k, 0])) as KindCounts;
}

const POINT_KINDS: RallyKind[] = ['ace', 'kill', 'block'];

export function computeStats(state: MatchState, setNumber?: number): TeamStats {
  const sets: SetState[] = setNumber ? state.sets.filter((s) => s.number === setNumber) : state.sets;
  const counts = emptyCounts();
  const players = new Map<string, PlayerStats>();
  const player = (id: string) => {
    let p = players.get(id);
    if (!p) {
      p = { playerId: id, counts: emptyCounts(), serves: 0, points: 0, errors: 0, plusMinus: 0 };
      players.set(id, p);
    }
    return p;
  };

  let pointsUs = 0;
  let pointsThem = 0;
  let servedRallies = 0;
  let breakPoints = 0;
  let receivedRallies = 0;
  let sideOuts = 0;
  let longestRunUs = 0;
  let longestRunThem = 0;

  for (const set of sets) {
    let run = 0;
    let runTeam: string | null = null;
    for (const r of set.rallies) {
      counts[r.kind] += 1;
      if (r.winner === 'us') pointsUs += 1;
      else pointsThem += 1;

      if (r.serving === 'us') {
        servedRallies += 1;
        if (r.winner === 'us') breakPoints += 1;
        if (r.serverId) player(r.serverId).serves += 1;
      } else {
        receivedRallies += 1;
        if (r.winner === 'us') sideOuts += 1;
      }

      if (r.winner === runTeam) run += 1;
      else {
        runTeam = r.winner;
        run = 1;
      }
      if (runTeam === 'us') longestRunUs = Math.max(longestRunUs, run);
      else longestRunThem = Math.max(longestRunThem, run);

      if (r.playerId) {
        const p = player(r.playerId);
        p.counts[r.kind] += 1;
        if (POINT_KINDS.includes(r.kind)) p.points += 1;
        if (RALLY_KINDS[r.kind].isError) p.errors += 1;
      }
    }
  }

  for (const p of players.values()) p.plusMinus = p.points - p.errors;

  return {
    counts,
    pointsUs,
    pointsThem,
    servedRallies,
    breakPoints,
    receivedRallies,
    sideOuts,
    longestRunUs,
    longestRunThem,
    players: [...players.values()],
  };
}

export function percent(part: number, total: number): string {
  if (!total) return '–';
  return `${Math.round((part / total) * 100)} %`;
}
