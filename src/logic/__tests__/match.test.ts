import type { MatchConfig, MatchEvent, RallyKind } from '../../types';
import { ballSituation, courtPlayers, isTiebreakSideSwitch, nextServer, replay, rotate } from '../match';
import { computeStats } from '../stats';

const config: MatchConfig = { setsToWin: 3, pointsPerSet: 25, tiebreakPoints: 15 };
// Position I..VI
const LINEUP = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];

const start = (serving: 'us' | 'them', extra: Partial<Extract<MatchEvent, { type: 'setStart' }>> = {}): MatchEvent => ({
  type: 'setStart',
  lineup: LINEUP,
  serving,
  liberoId: null,
  liberoFor: [],
  ...extra,
});
const rally = (kind: RallyKind, playerId: string | null = null): MatchEvent => ({ type: 'rally', kind, playerId });
const many = (n: number, kind: RallyKind): MatchEvent[] => Array.from({ length: n }, () => rally(kind));

describe('rotate', () => {
  it('dreht im Uhrzeigersinn: II -> I, I -> VI, III -> II', () => {
    const r = rotate(LINEUP);
    expect(r[0]).toBe('p2'); // Spieler von II steht jetzt auf I (Aufschlag)
    expect(r[5]).toBe('p1'); // Spieler von I steht jetzt auf VI
    expect(r[1]).toBe('p3'); // III -> II
    expect(r[3]).toBe('p5'); // V -> IV
  });

  it('ist nach 6 Rotationen wieder am Anfang', () => {
    let l = LINEUP;
    for (let i = 0; i < 6; i++) l = rotate(l);
    expect(l).toEqual(LINEUP);
  });
});

describe('replay – Aufschlag und Rotation', () => {
  it('rotiert nicht, wenn wir beim eigenen Aufschlag punkten', () => {
    const s = replay({ config, events: [start('us'), rally('kill', 'p3'), rally('ace')] });
    expect(s.current!.lineup).toEqual(LINEUP);
    expect(s.current!.serving).toBe('us');
    expect(s.current!.scoreUs).toBe(2);
    // Ass wird automatisch dem Aufschläger zugeordnet
    expect(s.current!.rallies[1].playerId).toBe('p1');
  });

  it('rotiert beim Side-Out (Punkt bei gegnerischem Aufschlag)', () => {
    const s = replay({ config, events: [start('them'), rally('kill', 'p4')] });
    expect(s.current!.lineup).toEqual(rotate(LINEUP));
    expect(s.current!.serving).toBe('us');
    expect(s.current!.rotations).toBe(1);
    expect(s.current!.rallies[0].rotated).toBe(true);
  });

  it('gibt den Aufschlag ab, wenn der Gegner punktet – ohne Rotation', () => {
    const s = replay({ config, events: [start('us'), rally('serveError')] });
    expect(s.current!.serving).toBe('them');
    expect(s.current!.lineup).toEqual(LINEUP);
    expect(s.current!.scoreThem).toBe(1);
    expect(s.current!.rallies[0].playerId).toBe('p1');
  });

  it('nextServer zeigt, wer nach dem Side-Out aufschlägt', () => {
    const s = replay({ config, events: [start('them')] });
    expect(nextServer(s.current!)).toBe('p2');
  });
});

describe('replay – Sätze und Spiel', () => {
  it('beendet einen Satz bei 25 mit 2 Punkten Vorsprung', () => {
    const s = replay({ config, events: [start('us'), ...many(25, 'kill')] });
    expect(s.current!.winner).toBe('us');
    expect(s.phase).toBe('setOver');
    expect(s.setsWon.us).toBe(1);
  });

  it('spielt bei 24:24 weiter bis 2 Punkte Vorsprung', () => {
    const events = [start('us'), ...many(24, 'kill'), ...many(24, 'oppPoint'), rally('oppError')];
    let s = replay({ config, events });
    expect(s.current!.scoreUs).toBe(25);
    expect(s.current!.winner).toBeNull();
    s = replay({ config, events: [...events, rally('oppError')] });
    expect(s.current!.winner).toBe('us');
  });

  it('Entscheidungssatz geht bis 15 mit Seitenwechsel bei 8', () => {
    const events: MatchEvent[] = [];
    for (let i = 0; i < 4; i++) {
      events.push(start('us'), ...many(25, i % 2 === 0 ? 'kill' : 'oppPoint'));
    }
    events.push(start('us'), ...many(7, 'kill'));
    let s = replay({ config, events });
    expect(s.current!.number).toBe(5);
    expect(s.current!.isTiebreak).toBe(true);
    expect(s.current!.target).toBe(15);
    expect(isTiebreakSideSwitch(s.current!)).toBe(false);

    events.push(rally('kill'));
    s = replay({ config, events });
    expect(isTiebreakSideSwitch(s.current!)).toBe(true);

    events.push(...many(7, 'kill'));
    s = replay({ config, events });
    expect(s.phase).toBe('matchOver');
    expect(s.winner).toBe('us');
    expect(s.setsWon).toEqual({ us: 3, them: 2 });
  });

  it('erkennt Satzball und Matchball', () => {
    let s = replay({ config, events: [start('us'), ...many(24, 'kill')] });
    expect(ballSituation(s, config)).toEqual({ team: 'us', type: 'Satzball' });

    const twoSets = [start('us'), ...many(25, 'kill'), start('us'), ...many(25, 'kill'), start('us'), ...many(24, 'kill')];
    s = replay({ config, events: twoSets });
    expect(ballSituation(s, config)).toEqual({ team: 'us', type: 'Matchball' });
  });

  it('ignoriert Ballwechsel nach Satzende', () => {
    const s = replay({ config, events: [start('us'), ...many(25, 'kill'), rally('kill')] });
    expect(s.current!.scoreUs).toBe(25);
  });
});

describe('Libero', () => {
  // p3 (III) und p6 (VI) sind Mittelblocker
  const withLibero = start('them', { liberoId: 'L', liberoFor: ['p3', 'p6'] });

  it('ersetzt den Mittelblocker in der hinteren Reihe', () => {
    const s = replay({ config, events: [withLibero] });
    const court = courtPlayers(s.current!);
    expect(court[5]).toBe('L'); // VI
    expect(court[2]).toBe('p3'); // III vorne bleibt
  });

  it('Mittelblocker schlägt selbst auf, Libero kommt nach Aufschlagverlust zurück', () => {
    // 4 Side-Outs: p6 wandert von VI über V, IV ... ; p3 wandert von III -> II -> I
    let events: MatchEvent[] = [withLibero, rally('kill'), rally('oppPoint'), rally('kill')];
    let s = replay({ config, events });
    // nach 2 Rotationen steht p3 auf I und wir schlagen auf
    expect(s.current!.lineup[0]).toBe('p3');
    expect(courtPlayers(s.current!)[0]).toBe('p3');

    events = [...events, rally('oppPoint')];
    s = replay({ config, events });
    // Gegner schlägt auf -> Libero ersetzt p3 auf Position I
    expect(courtPlayers(s.current!)[0]).toBe('L');
  });

  it('zählt den Libero nie als Aufschläger', () => {
    const events: MatchEvent[] = [withLibero];
    for (let i = 0; i < 12; i++) events.push(rally('kill'), rally('oppPoint'));
    const s = replay({ config, events });
    for (const r of s.current!.rallies) expect(r.serverId).not.toBe('L');
  });
});

describe('Wechsel und Auszeit', () => {
  it('tauscht den Spieler auf seiner Position', () => {
    const s = replay({ config, events: [start('us'), { type: 'sub', outId: 'p4', inId: 'p7' }, { type: 'timeout', team: 'us' }] });
    expect(s.current!.lineup[3]).toBe('p7');
    expect(s.current!.subs).toHaveLength(1);
    expect(s.current!.timeouts.us).toBe(1);
  });

  it('übernimmt die Libero-Zuordnung beim Wechsel', () => {
    const s = replay({
      config,
      events: [start('us', { liberoId: 'L', liberoFor: ['p3', 'p6'] }), { type: 'sub', outId: 'p6', inId: 'p9' }],
    });
    expect(s.current!.liberoFor).toEqual(['p3', 'p9']);
  });
});

describe('Statistik', () => {
  it('zählt Punkte, Fehler und Side-Out-Quote', () => {
    const s = replay({
      config,
      events: [start('them'), rally('kill', 'p4'), rally('ace'), rally('serveError'), rally('blocked', 'p3'), rally('block', 'p3')],
    });
    const st = computeStats(s);
    expect(st.pointsUs).toBe(3);
    expect(st.pointsThem).toBe(2);
    expect(st.receivedRallies).toBe(3);
    expect(st.sideOuts).toBe(2);
    expect(st.servedRallies).toBe(2);
    expect(st.breakPoints).toBe(1);

    const p3 = st.players.find((p) => p.playerId === 'p3')!;
    expect(p3.counts.block).toBe(1);
    expect(p3.counts.blocked).toBe(1);
    expect(p3.plusMinus).toBe(0);

    // Nach dem ersten Side-Out steht p2 auf I und schlägt auf (Ass + Aufschlagfehler)
    const p2 = st.players.find((p) => p.playerId === 'p2')!;
    expect(p2.counts.ace).toBe(1);
    expect(p2.counts.serveError).toBe(1);
    expect(p2.serves).toBe(2);
  });
});
