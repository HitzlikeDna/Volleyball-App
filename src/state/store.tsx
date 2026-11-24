import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';

import { replay, type MatchState } from '../logic/match';
import type { Match, MatchConfig, MatchEvent, Player } from '../types';

const STORAGE_KEY = 'volleyball-app:v1';

export interface AppState {
  loaded: boolean;
  players: Player[];
  match: Match | null;
  history: Match[];
}

export type Action =
  | { type: 'hydrate'; state: Partial<AppState> }
  | { type: 'addPlayer'; player: Player }
  | { type: 'updatePlayer'; player: Player }
  | { type: 'deletePlayer'; id: string }
  | { type: 'newMatch'; opponent: string; config: MatchConfig }
  | { type: 'event'; event: MatchEvent }
  | { type: 'undo' }
  | { type: 'finishMatch' }
  | { type: 'deleteHistory'; id: string };

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function eventPlayerIds(ev: MatchEvent): string[] {
  switch (ev.type) {
    case 'setStart':
      return [...ev.lineup, ...(ev.liberoId ? [ev.liberoId] : [])];
    case 'sub':
      return [ev.inId, ev.outId];
    case 'rally':
      return ev.playerId ? [ev.playerId] : [];
    default:
      return [];
  }
}

function withRoster(match: Match, ids: string[], players: Player[]): Match {
  const missing = ids.filter((id) => !match.roster.some((p) => p.id === id));
  if (!missing.length) return match;
  const add = players.filter((p) => missing.includes(p.id));
  return { ...match, roster: [...match.roster, ...add] };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'hydrate':
      return { ...state, ...action.state, loaded: true };

    case 'addPlayer':
      return { ...state, players: sortPlayers([...state.players, action.player]) };

    case 'updatePlayer': {
      const players = sortPlayers(state.players.map((p) => (p.id === action.player.id ? action.player : p)));
      const match = state.match && {
        ...state.match,
        roster: state.match.roster.map((p) => (p.id === action.player.id ? action.player : p)),
      };
      return { ...state, players, match };
    }

    case 'deletePlayer':
      return { ...state, players: state.players.filter((p) => p.id !== action.id) };

    case 'newMatch': {
      const history = state.match && state.match.events.length ? [archive(state.match), ...state.history] : state.history;
      return {
        ...state,
        history,
        match: { id: newId(), opponent: action.opponent, createdAt: Date.now(), config: action.config, events: [], roster: [] },
      };
    }

    case 'event': {
      if (!state.match) return state;
      const match = withRoster(
        { ...state.match, events: [...state.match.events, action.event] },
        eventPlayerIds(action.event),
        state.players,
      );
      return { ...state, match };
    }

    case 'undo': {
      if (!state.match || !state.match.events.length) return state;
      return { ...state, match: { ...state.match, events: state.match.events.slice(0, -1) } };
    }

    case 'finishMatch': {
      if (!state.match) return state;
      const history = state.match.events.length ? [archive(state.match), ...state.history] : state.history;
      return { ...state, match: null, history };
    }

    case 'deleteHistory':
      return { ...state, history: state.history.filter((m) => m.id !== action.id) };
  }
}

function archive(match: Match): Match {
  return { ...match, finishedAt: match.finishedAt ?? Date.now() };
}

function sortPlayers(players: Player[]): Player[] {
  return [...players].sort((a, b) => a.number - b.number);
}

const initialState: AppState = { loaded: false, players: [], match: null, history: [] };

interface StoreValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  /** Berechneter Stand des laufenden Spiels. */
  matchState: MatchState | null;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const saved = raw ? (JSON.parse(raw) as Partial<AppState>) : {};
        dispatch({ type: 'hydrate', state: saved });
      })
      .catch(() => dispatch({ type: 'hydrate', state: {} }));
  }, []);

  useEffect(() => {
    if (!state.loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const { players, match, history } = state;
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ players, match, history })).catch(() => {});
    }, 200);
  }, [state]);

  const matchState = useMemo(() => (state.match ? replay(state.match) : null), [state.match]);

  const value = useMemo(() => ({ state, dispatch, matchState }), [state, matchState]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore muss innerhalb von StoreProvider verwendet werden');
  return ctx;
}

/** Liefert einen Spieler aus dem Match-Kader oder der Teamliste. */
export function usePlayerLookup(match: Match | null) {
  const { state } = useStore();
  return useMemo(() => {
    const map = new Map<string, Player>();
    for (const p of state.players) map.set(p.id, p);
    if (match) for (const p of match.roster) map.set(p.id, p);
    return (id: string | null | undefined) => (id ? map.get(id) : undefined);
  }, [state.players, match]);
}
