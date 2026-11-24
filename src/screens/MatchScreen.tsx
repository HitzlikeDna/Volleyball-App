import React, { useState } from 'react';

import { useStore } from '../state/store';
import { LineupScreen } from './LineupScreen';
import { LiveMatchScreen } from './LiveMatchScreen';
import { NewMatchScreen } from './NewMatchScreen';

/** Wählt je nach Spielphase den passenden Bildschirm. */
export function MatchScreen({ onGoToTeam }: { onGoToTeam: () => void }) {
  const { state, matchState } = useStore();
  const [lineupOpen, setLineupOpen] = useState(false);

  if (!state.match || !matchState) return <NewMatchScreen onGoToTeam={onGoToTeam} />;

  if (matchState.phase === 'lineup') {
    return <LineupScreen onDone={() => setLineupOpen(false)} />;
  }

  if (lineupOpen) {
    return <LineupScreen onDone={() => setLineupOpen(false)} onCancel={() => setLineupOpen(false)} />;
  }

  return <LiveMatchScreen onNextSet={() => setLineupOpen(true)} onEditLineup={() => setLineupOpen(true)} />;
}
