import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { MatchScreen } from './src/screens/MatchScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { TeamScreen } from './src/screens/TeamScreen';
import { StoreProvider, useStore } from './src/state/store';
import { colors } from './src/theme';

type Tab = 'team' | 'match' | 'stats';

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: 'team', icon: '👥', label: 'Team' },
  { key: 'match', icon: '🏐', label: 'Spiel' },
  { key: 'stats', icon: '📊', label: 'Statistik' },
];

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Main />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

function Main() {
  const { state } = useStore();
  const [tab, setTab] = useState<Tab | null>(null);

  // Starttab einmalig nach dem Laden: läuft ein Spiel oder gibt es ein Team -> Spiel, sonst Team.
  useEffect(() => {
    if (state.loaded && tab === null) setTab(state.match || state.players.length >= 6 ? 'match' : 'team');
  }, [state.loaded, tab, state.match, state.players.length]);

  const active: Tab = tab ?? 'team';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <View style={styles.appBar}>
        <Text style={styles.appTitle}>🏐 Volleyball Scout</Text>
      </View>
      <View style={styles.content}>
        {!state.loaded ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : active === 'team' ? (
          <TeamScreen />
        ) : active === 'match' ? (
          <MatchScreen onGoToTeam={() => setTab('team')} />
        ) : (
          <StatsScreen />
        )}
      </View>
      <SafeAreaView edges={['bottom']} style={styles.tabBar}>
        <View style={styles.tabRow}>
          {TABS.map((t) => {
            const selected = active === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={styles.tab}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.tabIcon, !selected && styles.tabIconOff]}>{t.icon}</Text>
                <Text style={[styles.tabLabel, selected && styles.tabLabelOn]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.header },
  appBar: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.header },
  appTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  content: { flex: 1, backgroundColor: colors.bg },
  tabBar: { backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
  tabRow: { flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabIcon: { fontSize: 22 },
  tabIconOff: { opacity: 0.45 },
  tabLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: 2 },
  tabLabelOn: { color: colors.primary },
});
