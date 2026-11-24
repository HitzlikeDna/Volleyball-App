import type { MatchEvent, Player } from '../types';
import { RALLY_KINDS } from './rallyKinds';

export type Lookup = (id: string | null | undefined) => Player | undefined;

export function playerLabel(p: Player | undefined): string {
  if (!p) return '';
  return p.name ? `#${p.number} ${p.name}` : `#${p.number}`;
}

/** Kurzbeschreibung eines Ereignisses, z. B. für den Rückgängig-Knopf. */
export function describeEvent(ev: MatchEvent, lookup: Lookup): string {
  switch (ev.type) {
    case 'setStart':
      return 'Satzbeginn';
    case 'rally': {
      const p = lookup(ev.playerId);
      return `${RALLY_KINDS[ev.kind].label}${p ? ` ${playerLabel(p)}` : ''}`;
    }
    case 'sub':
      return `Wechsel ${lookup(ev.inId)?.number ?? '?'} für ${lookup(ev.outId)?.number ?? '?'}`;
    case 'timeout':
      return ev.team === 'us' ? 'Auszeit (wir)' : 'Auszeit (Gegner)';
  }
}
