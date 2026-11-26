# 🏐 Volleyball Scout

Eine einfache App (React Native + Expo) zum Mitschreiben von Volleyballspielen:
Spieler mit Nummer anlegen, Aufstellung festlegen, Punkte und Fehler mit einem Tipp eintragen –
die App kümmert sich automatisch um **Aufschlag, Rotation, Libero, Satz- und Spielende**.

## Tablet-Version für Android 5 (dieser Branch: `tablet-android5`)

Dieser Branch ist eine Variante für ein altes Tablet mit **Android 5.1** (JTY F888, MediaTek MT6580, 32-Bit-ARM).
Der Hauptbranch nutzt Expo SDK 58 und braucht mindestens Android 7. Hier läuft die App deshalb auf
**Expo SDK 49** (React Native 0.72, React 18), der letzten Expo-Version mit Android 5 (minSdk 21).
Der App-Code ist derselbe, nur die Paketversionen sind älter.

- Expo Go gibt es für Android 5 nicht. Die App kommt nur als APK aufs Tablet.
- Zum Bauen braucht es **JDK 17**: Gradle 8.0.1 (aus SDK 49) läuft nicht mit Java 21.
- Der C++-Teil wird nur für `armeabi-v7a` gebaut, die Architektur des Tablets.
- Das Tablet kennt die Emojis 🏐 und 🛡 nicht. Die App zeigt dort ⚪ und 🙌 (siehe `icons` in `src/theme.ts`).

```powershell
npx expo prebuild --platform android --clean
cd android
$env:JAVA_HOME = "$env:USERPROFILE\.jdks\jdk-17.0.21.1+2"
.\gradlew.bat assembleRelease -PreactNativeArchitectures=armeabi-v7a
adb install -r app\build\outputs\apk\release\app-release.apk
```

**Fehler `ninja: error: manifest 'build.ninja' still dirty after 100 tries`:** Der Projektpfad ist zu lang
(ninja aus SDK 49 kann keine Pfade über 260 Zeichen lesen). Dann das Projekt auf einen Laufwerksbuchstaben legen
und von dort bauen, danach wieder lösen:

```powershell
subst V: "C:\Pfad\zum\Projekt"
cd V:\android
.\gradlew.bat assembleRelease -PreactNativeArchitectures=armeabi-v7a
subst V: /D
```

**Änderungen vom Hauptbranch übernehmen:** den Hauptbranch hier hineinmergen. Bei Konflikten in
`package.json` und `package-lock.json` die SDK-49-Versionen behalten, danach `npm install` und
`npx expo install --check`. Neue Bibliotheken aus dem Hauptbranch müssen eine SDK-49-Version haben.

**Tablet nur für die App nutzen:** Einstellungen → Sicherheit → *Bildschirmfixierung* einschalten.
Dann die App öffnen, die Übersichtstaste (Quadrat) drücken und auf der App-Karte die Stecknadel antippen.
Lösen: Zurück- und Übersichtstaste gleichzeitig gedrückt halten.

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

**Lokal (Android-SDK und JDK 17 nötig – das React-Native-Gradle-Plugin verlangt genau Java 17):**

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
