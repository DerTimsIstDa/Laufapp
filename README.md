# Laufapp

Prototyp einer Lauf-App mit Gamification. Reines HTML/CSS/JS, kein Build-Step,
kein Backend. Läufe liegen im `localStorage` des Browsers.

## Starten

Ein lokaler Server ist nötig – die App nutzt ES-Module und einen Service
Worker, beides funktioniert nicht über `file://`.

```bash
npx serve .
```

Danach die angezeigte `http://localhost:…`-Adresse öffnen. Alternativ
`python -m http.server 8000`.

## XP- und Level-System

- **10 XP pro Kilometer** (auf ganze XP gerundet)
- **Aufstieg von Level N auf N+1: `40 + 20 × N` XP** – linear, kein Cap
- Gesamt-XP bis Level L: `(L-1) × (10L + 40)`

| Level | Kosten für den Aufstieg | Gesamt-XP ab hier |
|------:|------------------------:|------------------:|
| 1 → 2 |                      60 |                 0 |
| 2 → 3 |                      80 |                60 |
| 3 → 4 |                     100 |               140 |
| 4 → 5 |                     120 |               240 |

Gesamt-XP = XP aus Läufen + Bonus-XP aus freigeschalteten Achievements.

Weder XP-Stand noch Achievements werden **gespeichert** – beides wird immer aus
den Läufen berechnet. Dadurch bleibt alles konsistent, wenn ein Lauf gelöscht
oder eine Regel angepasst wird.

## Tests

```bash
node --test
```

94 Tests im Ordner `tests/`, ausgeführt vom eingebauten Testrunner von Node —
keine Abhängigkeiten, kein Framework, nichts zu installieren.

| Datei | prüft |
|---|---|
| `tests/xp.test.mjs` | XP pro km, Aufstiegskosten, jede Levelgrenze bis 5000 |
| `tests/geo.test.mjs` | Haversine gegen bekannte Strecken, alle GPS-Filtergrenzen |
| `tests/titles.test.mjs` | feste Stufen, endlose Legenden, `nextTitle` bis Level 3000 |
| `tests/achievements.test.mjs` | jede Bedingung knapp darunter und darauf |
| `tests/tracker.test.mjs` | Start/Pause/Beenden, Fehlerfälle, Geolocation-Attrappe |

Getestet wird das Verhalten an den **Grenzen**: 4 gegen 5 Läufe, 49,9 gegen
50 km, 13 gegen 14 Tage Pause, 06:59 gegen 07:00 Uhr, +19 % gegen +20 %. Ein
Test, der nur den Normalfall prüft, fängt keine Regression.

`tests/helpers.mjs` enthält die Attrappe für `navigator.geolocation`. Damit
lassen sich Positionsfolgen einspeisen, ohne echtes GPS — inklusive
abgelehnter Freigabe und Timeout.

Die App selbst läuft im Browser, die Tests laufen in Node. Möglich ist das,
weil `xp.js`, `geo.js`, `achievements.js` und `titles.js` weder DOM noch
Storage anfassen. `tracker.js` liest `navigator.geolocation` erst beim Start,
nicht beim Laden — genau deshalb lässt es sich unterschieben.

## Live-Tracking (GPS)

Start/Pause/Beenden im Abschnitt „Lauf aufzeichnen". Die App liest Positionen
über `navigator.geolocation.watchPosition`, summiert die Strecke und legt beim
Beenden automatisch einen Lauf an (Distanz, Datum, Startzeit, Dauer,
`source: 'gps'`). Startzeit und Dauer füllen nebenbei die Bedingungen für
Frühaufsteher, Nachteule und Neue Bestzeit.

Rohe GPS-Punkte sind unbrauchbar, ohne sie zu filtern (`DEFAULT_FILTER` in
`js/geo.js`):

- **Genauigkeit** schlechter als 30 m → Punkt verworfen
- **Bewegung** unter 5 m → Jitter im Stand, zählt nicht. Der Bezugspunkt bleibt
  stehen, die Strecke wird beim nächsten größeren Schritt vollständig
  mitgezählt – es geht nichts verloren.
- **Sprünge** über 10 m/s (36 km/h) → Messfehler, verworfen

Während einer Pause wird `watchPosition` abgemeldet und der letzte Bezugspunkt
verworfen; eine Fahrt in der Pause landet also nicht in der Strecke.

Grenzen, die im Browser nicht zu umgehen sind:

- Braucht **HTTPS oder localhost**. Über eine andere Adresse ist der Start-Knopf
  deaktiviert.
- Ein `wakeLock` hält den Bildschirm an, solange der Browser das erlaubt.
  Sperrt sich das Handy trotzdem, drosselt das System die Positionsupdates –
  eine echte Hintergrund-Aufzeichnung wie native Apps ist nicht möglich.
- Die Strecke ist Luftlinie zwischen Messpunkten. Bei engen Kurven misst das
  minimal zu kurz.

Der Streckenverlauf wird **nicht** gespeichert, nur das Ergebnis. Für eine Karte
später müsste `tracker.js` die akzeptierten Punkte mit herausgeben –
`reduceTrack()` in `js/geo.js` kann eine solche Punktfolge bereits verarbeiten.

## Achievements

13 Stück, definiert in `js/achievements.js`. Meilensteine (Anzahl Läufe,
Gesamtdistanz, Serien) und Herausforderungen (Tageszeit, Bestzeit, Comeback,
Distanz-Durchbruch). Sie werden bei jedem Render automatisch geprüft; die
Bonus-XP fließen sofort in Level und Titel ein.

Auslegungen, die in der Spezifikation offen waren:

- **Eiserner Wille** = längste Spanne von mindestens 30 Tagen, in der nie länger
  als 7 Tage pausiert wurde (`longestWeeklyStreakDays`).
- **Neue Bestzeit** = ein Lauf unterbietet die eigene beste Dauer auf 5 oder
  10 km. Zugeordnet wird mit ±0,5 km Toleranz (`PR_TOLERANCE_KM`).
- **Der lange Atem** = ein Lauf ist mindestens 20 % länger als der bis dahin
  längste; braucht also mindestens zwei Läufe.

## Titel

Definiert in `js/titles.js`: Level 1 Neuling, 5 Läufer, 15 Ausdauerläufer,
30 Veteran, 80 Elite, danach alle 50 Level `Legende I`, `Legende II`, … –
endlos.

## Struktur

```
index.html          Markup
css/style.css       Layout (bewusst schlicht)
js/xp.js            XP-/Level-Logik – pur, kein DOM, kein Storage
js/achievements.js  Achievement-Definitionen + Auswertung – ebenfalls pur
js/titles.js        Titel zum Level – ebenfalls pur
js/geo.js           Haversine, GPS-Filter, Pace/Zeit-Formatierung – ebenfalls pur
js/tracker.js       Live-Aufzeichnung: watchPosition, Pausen, Wake Lock
js/storage.js       Laden/Speichern der Läufe im localStorage
js/app.js           Formular, Rendering, Verdrahtung
manifest.json       PWA-Manifest
sw.js               Service Worker (App-Shell-Cache)
icons/icon.svg      App-Icon
tests/              Node-Tests, laufen mit `node --test`
```

## Erweiterung später

**Neues Achievement:** einen Eintrag in `ACHIEVEMENTS` (`js/achievements.js`)
ergänzen – `id`, `name`, `description`, `xp`, `category`, `check(stats)` und
optional `progress(stats)` für den Zähler in der Übersicht. Reicht die
vorhandene Statistik nicht, ein Feld in `buildRunStats()` ergänzen. Anzeige und
XP-Verrechnung laufen automatisch mit.

**Neuer Titel:** Eintrag in `BASE_TITLES` (`js/titles.js`), aufsteigend
sortiert; für die endlosen Stufen `ENDLESS_START_LEVEL` / `ENDLESS_STEP`.

Beim Ändern der App-Dateien `CACHE_VERSION` in `sw.js` hochzählen, sonst
liefert der Service Worker den alten Stand aus.
