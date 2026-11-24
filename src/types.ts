export type Team = 'us' | 'them';

export type PlayerRole = 'Außen' | 'Mitte' | 'Diagonal' | 'Zuspiel' | 'Libero' | 'Universal';

export const PLAYER_ROLES: PlayerRole[] = ['Außen', 'Mitte', 'Diagonal', 'Zuspiel', 'Libero', 'Universal'];

export interface Player {
  id: string;
  number: number;
  name: string;
  role: PlayerRole;
}

/**
 * Wie ein Ballwechsel endete. Der Gewinner ergibt sich aus der Art
 * (siehe RALLY_KINDS in logic/rallyKinds.ts).
 */
export type RallyKind =
  // Punkt für uns
  | 'ace'
  | 'kill'
  | 'block'
  | 'oppError'
  // Punkt für den Gegner
  | 'serveError'
  | 'receiveError'
  | 'attackError'
  | 'blocked'
  | 'ownError'
  | 'oppPoint';

export interface MatchConfig {
  /** Gewinnsätze: 3 = "Best of 5", 2 = "Best of 3". */
  setsToWin: number;
  pointsPerSet: number;
  tiebreakPoints: number;
}

/**
 * Ein Spiel wird als Liste von Ereignissen gespeichert. Der aktuelle Stand
 * (Punkte, Rotation, Aufschlag …) wird daraus berechnet. Dadurch ist
 * "Rückgängig" einfach das Entfernen des letzten Ereignisses.
 */
export type MatchEvent =
  | {
      type: 'setStart';
      /** Spieler-IDs auf Position I bis VI (Index 0 = Position I = Aufschläger). */
      lineup: string[];
      serving: Team;
      liberoId: string | null;
      /** Spieler, für die der Libero in der hinteren Reihe einwechselt. */
      liberoFor: string[];
    }
  | { type: 'rally'; kind: RallyKind; playerId: string | null }
  | { type: 'sub'; outId: string; inId: string }
  | { type: 'timeout'; team: Team };

export interface Match {
  id: string;
  opponent: string;
  createdAt: number;
  finishedAt?: number;
  config: MatchConfig;
  events: MatchEvent[];
  /** Kopie der beteiligten Spieler, damit Statistiken auch später noch Namen haben. */
  roster: Player[];
}
