import type { RallyKind, Team } from '../types';

export interface RallyKindInfo {
  kind: RallyKind;
  label: string;
  /** Kurzform für Tabellen. */
  short: string;
  hint?: string;
  winner: Team;
  /**
   * - 'server': wird automatisch dem aktuellen Aufschläger zugeordnet
   * - 'pick':   Spieler wird nach dem Antippen ausgewählt
   * - 'none':   keinem eigenen Spieler zugeordnet
   */
  player: 'server' | 'pick' | 'none';
  /** Nur möglich, wenn diese Mannschaft aufschlägt. */
  requiresServing?: Team;
  /** Zählt als eigener Fehler in der Statistik. */
  isError?: boolean;
}

export const RALLY_KINDS: Record<RallyKind, RallyKindInfo> = {
  ace: { kind: 'ace', label: 'Ass', short: 'Ass', winner: 'us', player: 'server', requiresServing: 'us' },
  kill: { kind: 'kill', label: 'Angriff', short: 'Angr', hint: 'Angriffspunkt', winner: 'us', player: 'pick' },
  block: { kind: 'block', label: 'Block', short: 'Block', hint: 'Blockpunkt', winner: 'us', player: 'pick' },
  oppError: { kind: 'oppError', label: 'Gegnerfehler', short: 'GF', hint: 'Fehler des Gegners', winner: 'us', player: 'none' },

  serveError: {
    kind: 'serveError',
    label: 'Aufschlagfehler',
    short: 'AF',
    winner: 'them',
    player: 'server',
    requiresServing: 'us',
    isError: true,
  },
  receiveError: {
    kind: 'receiveError',
    label: 'Annahmefehler',
    short: 'AnF',
    hint: 'Aufschlag nicht angenommen',
    winner: 'them',
    player: 'pick',
    requiresServing: 'them',
    isError: true,
  },
  attackError: {
    kind: 'attackError',
    label: 'Angriffsfehler',
    short: 'AgF',
    hint: 'Aus / ins Netz',
    winner: 'them',
    player: 'pick',
    isError: true,
  },
  blocked: { kind: 'blocked', label: 'Geblockt', short: 'Gebl', hint: 'Wir wurden geblockt', winner: 'them', player: 'pick', isError: true },
  ownError: {
    kind: 'ownError',
    label: 'Eigenfehler',
    short: 'EF',
    hint: 'Netz, Übertritt, Doppel …',
    winner: 'them',
    player: 'pick',
    isError: true,
  },
  oppPoint: { kind: 'oppPoint', label: 'Punkt Gegner', short: 'PG', hint: 'Gegner-Angriff, -Ass …', winner: 'them', player: 'none' },
};

export const US_KINDS: RallyKind[] = ['ace', 'kill', 'block', 'oppError'];
export const THEM_KINDS: RallyKind[] = ['serveError', 'ownError', 'blocked', 'receiveError', 'attackError', 'oppPoint'];

export function isKindAvailable(kind: RallyKind, serving: Team): boolean {
  const req = RALLY_KINDS[kind].requiresServing;
  return !req || req === serving;
}
