# 🏐 Volleyball Scout

Eine einfache App (React Native + Expo) zum Mitschreiben von Volleyballspielen:
Spieler mit Nummer anlegen, Aufstellung festlegen, Punkte und Fehler mit einem Tipp eintragen –
die App kümmert sich automatisch um **Aufschlag, Rotation, Libero, Satz- und Spielende**.

## Funktionen

**Team**
- Spieler mit Trikotnummer, Name und Position (Außen, Mitte, Diagonal, Zuspiel, Libero, Universal)
- Doppelte Nummern werden verhindert

**Aufstellung**
- Spieler per Antippen auf Position I–VI setzen (Feldansicht mit Netz oben)
- Wer schlägt zuerst auf? Ab Satz 2 automatisch abwechselnd, Aufstellung vom letzten Satz vorausgefüllt
- Optionaler Libero: kommt automatisch für die Mittelblocker, sobald sie hinten stehen (nicht beim eigenen Aufschlag)
- Hinweise, wenn z. B. die beiden Mittelblocker nicht gegenüber stehen
- Kurze Erklärung „So funktioniert die Rotation“

**Spiel**
- Großer Spielstand mit Aufschlag-Anzeige, Satzball/Matchball, Satzergebnissen
- **Punkt für uns:** Ass, Angriff, Block, Gegnerfehler
- **Punkt für den Gegner:** Aufschlagfehler, Eigenfehler (Netz, Übertritt …), Geblockt, Annahmefehler, Angriffsfehler, Punkt Gegner
- Nach dem Antippen wählst du den Spieler direkt auf dem Feld aus. Ass und Aufschlagfehler werden automatisch dem Aufschläger zugeordnet.
- Nur sinnvolle Knöpfe sind aktiv (z. B. kein „Ass“, wenn der Gegner aufschlägt)
- **Automatische Rotation:** Holen wir den Aufschlag zurück (Side-Out), rotiert die Mannschaft im Uhrzeigersinn und die App zeigt, wer jetzt aufschlägt
- Spielerwechsel, Auszeiten (2 pro Satz), Seitenwechsel-Hinweis im Entscheidungssatz
- „Zurück“ macht die letzte Eingabe rückgängig – auch über ein Satzende hinweg

**Statistik**
- Punkte, Side-Out-Quote, Breakpunkt-Quote, längste Serie
- Wie haben wir gepunktet / wie hat der Gegner gepunktet
- Tabelle pro Spieler (Aufschläge, Ass, Fehler, Angriffe, Blocks, +/−), gesamt oder pro Satz
- Ballwechsel-Verlauf pro Satz
- Beendete Spiele bleiben gespeichert

Alle Daten werden lokal auf dem Gerät gespeichert.

## Starten

Voraussetzung: [Node.js](https://nodejs.org) (LTS).

```bash
npm install
npx expo start
```

- **Auf dem Handy:** App **Expo Go** installieren (App Store / Google Play) und den QR-Code im Terminal scannen.
- **Im Browser:** im Terminal `w` drücken (oder `npm run web`).
- **Android-Emulator / iOS-Simulator:** `a` bzw. `i` drücken.

### Android-APK bauen

**In der Cloud (Expo-Konto nötig):** `npx eas-cli@latest build -p android --profile preview`

**Lokal (Android-SDK + JDK 17+ nötig):**

```bash
npx expo prebuild --platform android      # erzeugt den Ordner android/ (nicht im Git)
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a
# -> android/app/build/outputs/apk/release/app-release.apk
```

Die APK aufs Handy kopieren, antippen und „Installation aus unbekannten Quellen“ erlauben.
Hinweis: Die so gebaute APK ist mit dem Debug-Schlüssel signiert – gut zum Selbst-Installieren, nicht für den Play Store.

## Entwicklung

```bash
npm test            # Unit-Tests (Rotation, Punkte, Sätze, Libero, Statistik)
npm run typecheck   # TypeScript prüfen
```

### Aufbau

```
App.tsx                    Tab-Leiste: Team · Spiel · Statistik
src/
  types.ts                 Datentypen (Spieler, Spiel, Ereignisse)
  logic/
    match.ts               Rotation, Aufschlag, Satz-/Spielende, Libero
    rallyKinds.ts          Arten von Ballwechsel-Enden (Ass, Eigenfehler …)
    stats.ts               Statistik-Berechnung
  state/store.tsx          App-Zustand + Speicherung (AsyncStorage)
  screens/                 Team, Neues Spiel, Aufstellung, Live-Spiel, Statistik
  components/              Feld (Court) und UI-Bausteine
```

Ein Spiel wird als Liste von Ereignissen gespeichert (Satzbeginn, Ballwechsel, Wechsel, Auszeit).
Der aktuelle Stand wird daraus berechnet – deshalb ist „Rückgängig“ einfach das Entfernen des letzten Ereignisses.

### Rotation in Kürze

```
        N E T Z
   [ IV ] [ III ] [ II ]
   [ V  ] [ VI  ] [ I  ]   ← I schlägt auf
```

- Punkt bei **eigenem** Aufschlag → gleicher Aufschläger, keine Rotation
- Punkt bei **gegnerischem** Aufschlag → wir rotieren im Uhrzeigersinn (II → I, I → VI, VI → V, V → IV, IV → III, III → II)
- Punkt für den **Gegner** → Gegner schlägt auf, wir rotieren nicht
