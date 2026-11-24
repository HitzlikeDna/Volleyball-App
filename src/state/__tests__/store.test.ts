jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { replay } from '../../logic/match';
import type { Player } from '../../types';
import { reducer, type AppState } from '../store';

const players: Player[] = Array.from({ length: 8 }, (_, i) => ({
  id: `p${i + 1}`,
  number: i + 1,
  name: `Spieler ${i + 1}`,
  role: 'Universal',
}));

const base: AppState = { loaded: true, players, match: null, history: [] };
const config = { setsToWin: 3, pointsPerSet: 25, tiebreakPoints: 15 };

function startedMatch(): AppState {
  let s = reducer(base, { type: 'newMatch', opponent: 'TV Test', config });
  s = reducer(s, {
    type: 'event',
    event: { type: 'setStart', lineup: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'], serving: 'us', liberoId: null, liberoFor: [] },
  });
  return s;
}

describe('store reducer', () => {
  it('sortiert Spieler nach Nummer', () => {
    const s = reducer({ ...base, players: [] }, { type: 'addPlayer', player: { ...players[4], number: 12 } });
    const s2 = reducer(s, { type: 'addPlayer', player: { ...players[0], number: 3 } });
    expect(s2.players.map((p) => p.number)).toEqual([3, 12]);
  });

  it('übernimmt eingesetzte Spieler in den Kader des Spiels', () => {
    const s = startedMatch();
    expect(s.match!.roster.map((p) => p.id).sort()).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
  });

  it('macht den letzten Ballwechsel rückgängig', () => {
    let s = startedMatch();
    s = reducer(s, { type: 'event', event: { type: 'rally', kind: 'kill', playerId: 'p4' } });
    expect(replay(s.match!).current!.scoreUs).toBe(1);
    s = reducer(s, { type: 'undo' });
    expect(replay(s.match!).current!.scoreUs).toBe(0);
  });

  it('archiviert ein beendetes Spiel, verwirft aber ein leeres', () => {
    const empty = reducer(reducer(base, { type: 'newMatch', opponent: 'X', config }), { type: 'finishMatch' });
    expect(empty.history).toHaveLength(0);
    expect(empty.match).toBeNull();

    const s = reducer(startedMatch(), { type: 'finishMatch' });
    expect(s.match).toBeNull();
    expect(s.history).toHaveLength(1);
    expect(s.history[0].finishedAt).toBeDefined();
  });

  it('behält gelöschte Spieler in der Statistik eines Spiels', () => {
    let s = startedMatch();
    s = reducer(s, { type: 'deletePlayer', id: 'p1' });
    expect(s.players.find((p) => p.id === 'p1')).toBeUndefined();
    expect(s.match!.roster.find((p) => p.id === 'p1')).toBeDefined();
  });
});
