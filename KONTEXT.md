# FunRun – Projektkontext (Gedächtnisdatei)

> **Stand: 2026-08-21** · Repo-Ordner `Laufapp` · Branch `master` · `sw.js` `CACHE_VERSION = funrun-v50`
>
> **Diese Datei ist das Gedächtnis des Projekts.** Sie ersetzt das Einlesen des
> Quellcodes beim Start eines neuen Chats. Wird sie nicht gepflegt, ist sie
> schlimmer als nichts – siehe [Pflege dieser Datei](#pflege-dieser-datei).

---

## 0. Anleitung für Claude (zuerst lesen)

1. **Nicht das ganze Projekt einlesen.** Diese Datei enthält Struktur, API,
   Datenmodell und Regeln. Sie genügt für Planung, Beratung und Diskussion.
2. **Erst konkret werden, dann Dateien laden.** Für eine Änderung nur die
   Dateien lesen, die die Modulkarte (§3) für das Anliegen nennt – plus die
   zugehörige Testdatei. `js/app.js` ist seit B1 3.091 statt 4.132 Zeilen, aber
   immer noch zu lang zum Am-Stück-Lesen: dort gezielt nach Funktionsnamen oder
   Kommentarmarken aus §4 greifen. Die Ansichten unter `js/views/` sind klein
   genug, um ganz gelesen zu werden.
3. **Was hier steht, gilt als wahr, ist aber ein Schnappschuss.** Zahlen
   (Trophäenanzahl, Cache-Version, Zeilenzahlen) können veraltet sein. Wenn
   eine Zahl für die Aufgabe entscheidend ist: nachzählen statt vertrauen.
4. **Das `README.md` im Repo ist die Erklär-Datei für Menschen** (Begründungen,
   Design-Entscheidungen). Diese Datei ist die Arbeitsdatei für Claude. Bei
   Widerspruch gilt der Code; bekannte Abweichungen stehen in §9.
5. **Am Ende jeder Arbeitssitzung diese Datei aktualisieren** (§10).

---

## 1. Steckbrief

| | |
|---|---|
| Name | **FunRun** (hieß bis v25 „Laufapp") |
| Was | Lauf-App mit Gamification: Läufe erfassen, XP/Level, Trophäen, Übungen, Trainingsplan, Intervall-Stoppuhr |
| Technik | reines HTML/CSS/ES-Module. **Kein Build-Step, kein Framework, kein Backend, keine Abhängigkeiten** |
| Daten | ausschließlich `localStorage` im Browser des Nutzers |
| Repo | `https://github.com/DerTimsIstDa/Laufapp.git`, Branch `master` |
| Live | `https://dertimsistda.github.io/Laufapp/` (GitHub Pages aus `master`, ~1 min nach Push) |
| Lokal starten | `npx serve .` bzw. `python -m http.server 8000` – **nicht** über `file://` (ES-Module + Service Worker) |
| Tests | `node --test` – Node-eigener Runner, Ordner `tests/`, keine Installation nötig |
| Sprache | Oberfläche, Code-Kommentare und Commit-Messages auf **Deutsch** |

**Namens-Falle:** Sichtbar heißt alles „FunRun". Ordnername, Git-Repo und
**alle `localStorage`-Schlüssel behalten `laufapp`** – ein Umbenennen der
Schlüssel wäre für jedes bestehende Gerät Datenverlust. Nie „aufräumen".

---

## 2. Dateibaum (ohne `.git`)

```
index.html            Markup, alle fünf Bereiche in einem Dokument
manifest.json         PWA-Manifest
sw.js                 Service Worker, App-Shell-Cache (CACHE_VERSION hochzählen!)
README.md             Erklärungen und Begründungen für Menschen
KONTEXT.md            diese Datei
css/style.css         ~61 KB, alle Werte als Custom Properties oben
js/*.js               25 Module (siehe §3)
js/views/*.js         3 Ansichten – DOM und Interaktion, seit B1
tests/*.test.mjs      26 Testdateien + helpers.mjs
icons/icon-*.png      App-Icons (192, 512, maskable-512, 180)
icons/badges/*.png    6 Rang-Abzeichen: neuling, laeufer, ausdauerlaeufer,
                      veteran, elite, legende
```

## 3. Modulkarte – „wo muss ich hin?"

Grundprinzip: **alle Module außer `app.js`, `js/views/*`, `storage.js`,
`tracker.js`, `stopwatch.js` und `wake-lock.js` sind pur** – kein DOM, kein
Storage. Deshalb laufen die Tests in Node.

**Seit B1 gilt: „die App" ist nicht mehr `app.js`.** Wer eine Anzeige sucht,
schaut zuerst unter `js/views/`, dann in `app.js`. Wer Code sucht, der rechnet,
schaut nie in beide.

| Datei | Zeilen | Zuständig für | Anfassen wenn … |
|---|--:|---|---|
| `js/app.js` | 3091 | Verdrahtung und die noch nicht herausgelösten Bereiche | Start, Läufe, Übungen, Trophäen, Profil, Intervall, Teilen, Export |
| `js/views/training.js` | 498 | Trainingsformular, Planliste, Löschrückfrage | irgendetwas am Trainingsplan |
| `js/views/stats.js` | 422 | Profil-Kennzahlen, Aktivitätsraster, Pace-Verlauf, Bestzeiten, Trophäen-Übersicht | irgendetwas an der Statistik im Profil |
| `js/views/dom.js` | 242 | die `getElementById`-Verweise (`el`), `SVG_NS`, `createSvg` | ein neues Element im Markup |
| `js/format.js` | 85 | rein: Zahlen, Daten, Zeiten in Anzeigeform | eine neue Formatierung |
| `js/storage.js` | 653 | Laden/Speichern/Ändern aller Datentöpfe | neues persistiertes Feld, neuer Datentopf |
| `js/achievements.js` | 936 | Trophäen-Definitionen + `buildRunStats()` | neue Trophäe, neue Kennzahl für Bedingungen |
| `js/training.js` | 590 | geplante Einheiten, Intervall-Vorgaben, Abgleich mit Läufen | Trainingsplan, Plantreue-XP |
| `js/stats.js` | 551 | Summen, Serien, Zeitreihen, Aktivitätsraster, Pace-Trend, Bestzeiten | Statistik, Diagramme |
| `js/validation.js` | 325 | Prüfung aller Eingaben, `parseNumber`, `parsePace` | neues Eingabefeld, neue Grenze |
| `js/exercises.js` | 297 | Übungsbibliothek (fest) + Filter | Übung ergänzen/ändern |
| `js/transfer.js` | 348 | Export-/Importformat | Datenformat erweitern |
| `js/tracker.js` | 249 | Live-Aufzeichnung über `watchPosition` | GPS-Aufzeichnung |
| `js/share-card.js` | 252 | Teilen-Karte auf Canvas (1080×1350) | Teilen-Bild |
| `js/exercise-log.js` | 239 | erledigte Übungen: Zähler, Tageslimit, XP | Übungs-Häkchen |
| `js/route.js` | 165 | GPS-Strecke → SVG-Koordinaten | Routenanzeige |
| `js/geo.js` | 158 | Haversine, GPS-Filter, Pace-/Zeitformatierung | Streckenberechnung, Formatierung |
| `js/stopwatch.js` | 147 | Aufzeichnung ohne GPS, gleiche Form wie `tracker.js` | Stoppuhr |
| `js/exercise-plan.js` | 129 | für einen Tag vorgenommene Übungen | Tagesplan Übungen |
| `js/titles.js` | 114 | Titel + Abzeichen zum Level | neuer Rang |
| `js/beep.js` | 109 | Töne für die Intervall-Stoppuhr (WebAudio) | Signaltöne |
| `js/interval.js` | 107 | Phasenberechnung Belastung/Pause | Intervall-Ablauf |
| `js/pwa.js` | 94 | Installationshinweis, eigene Caches erkennen | Update-/Installlogik |
| `js/xp.js` | 84 | XP und Level – die Kernformel | XP-Regeln |
| `js/goal.js` | 79 | Wochenziel: erreichte Wochen, Bonus-XP | Wochenziel |
| `js/history.js` | 78 | Freischaltdaten, Titel-Historie (Replay, O(n²)) | „freigeschaltet am" |
| `js/lock.js` | 56 | Tastensperre: Halte-Fortschritt, Sperrregeln | Sperre |
| `js/wake-lock.js` | 42 | Bildschirm wach halten | Wake Lock |

Zu **jedem reinen Modul** gibt es `tests/<name>.test.mjs` – seit B3 auch zu
`beep.js` und `wake-lock.js`, seit B1 zu `format.js`. `app.js` und `js/views/*`
fassen das DOM an und laden in Node nicht; für sie gibt es zwei Tests, die den
**Quelltext** lesen statt ihn auszuführen:

- `tests/imports.test.mjs` prüft jeden Import-Pfad und jeden importierten Namen
  gegen den Dateibaum. Ohne Build-Step fiele ein Tippfehler dort sonst erst im
  Browser auf.
- `tests/styles.test.mjs` prüft CSS- und Markup-Regeln, die Node nicht ausführen
  kann, und sucht Code-Regeln im Quelltext **aller** Module.

> **Falle beim Verschieben von Code.** Ein Test, der einen festen Dateipfad
> trägt und im Quelltext nach einer Regel sucht, wird beim Umzug der Regel
> **nicht rot** – er findet nichts und bleibt grün. Bei B1 wäre das zweimal
> passiert. Deshalb liest `quelltextDerModule()` aus `tests/helpers.mjs` `js/`
> rekursiv, und kein Test in `styles.test.mjs` nennt mehr eine einzelne Datei.
> **Nach jedem Verschieben: `grep` auf den Funktionsnamen in `tests/`.**

---

## 4. Öffentliche API (Exports) – das ersetzt das Lesen der Dateien

**`xp.js`** `XP_PER_KM=10` · `xpForDistance(km)` · `xpToAdvance(level)` ·
`totalXpForLevel(level)` · `levelForXp(totalXp)` · `getProgress(totalXp)` ·
`totalXpFromRuns(runs)`

**`titles.js`** `BASE_TITLES` · `ENDLESS_START_LEVEL=80` · `ENDLESS_STEP=50` ·
`ELITE_BADGE` · `LEGEND_BADGE` · `titleForLevel(l)` · `badgeForLevel(l)` ·
`badgeSrc(badge)` · `nextTitle(l)`

**`achievements.js`** `ACHIEVEMENTS` · `ACHIEVEMENT_CATEGORIES` ·
`buildRunStats(runs)` · `evaluateAchievements(runs, exerciseLog=[])` ·
`achievementsByCategory(evaluated)` · `achievementXp(evaluated)`

**`geo.js`** `EARTH_RADIUS_KM` · `DEFAULT_FILTER` · `haversineKm(a,b)` ·
`evaluateSegment(prev, next, filter)` · `reduceTrack(points, filter)` ·
`paceMinPerKm(km, elapsedMs)` · `runPaceMinPerKm(run)` ·
`formatDuration(ms)` · `formatPace(minPerKm)`

**`validation.js`** `MAX_DISTANCE_KM=1000` · `MAX_DURATION_MINUTES=1440` ·
`MAX_NAME_LENGTH=30` · `MAX_WEEKLY_GOAL=14` · `MIN_PACE_MIN_PER_KM=2` ·
`MAX_PACE_MIN_PER_KM=30` · `parseNumber(v)` · `isValidIsoDate(v)` ·
`normalizeName(v)` · `normalizeWeeklyGoal(v)` · `parsePace(v)` ·
`parseDurationSeconds(v)` · `isValidTimeOfDay(v)` · `validateRun(input)` ·
`firstErrorMessage(result)`

**`storage.js`** `setStorageErrorHandler(fn)` · `loadRuns` · `saveRuns` · `addRun` · `updateRun` · `removeRun` ·
`replaceRuns` · `loadExerciseLog` · `saveExerciseLog` · `addExerciseEntry` ·
`replaceExerciseLog` · `loadSessions` · `saveSessions` · `addSession` ·
`updateSession` · `removeSession` · `replaceSessions` · `loadExercisePlan` ·
`saveExercisePlan` · `loadProfile` · `saveProfile` · `loadGpsPreference` ·
`saveGpsPreference` · `loadLastExport` · `saveLastExport(isoDate)`

**`stats.js`** `buildStats(runs,{todayIso})` · `distanceByWeek/ByMonth(runs,{limit=12,todayIso})` ·
`runsInPeriod(runs,{period,todayIso})` · `ACTIVITY_WEEKS=18` ·
`ACTIVITY_LEVELS=[5,10,15]` · `activityCalendar(...)` ·
`PACE_TREND_MIN_POINTS=3` · `paceTrend(runs,{limit=12})` ·
`BEST_TIME_DISTANCES=[5,8,10,12,15,21.1]` · `BEST_TIME_TOLERANCE_KM=0.1` ·
`bestTimes(...)` · `weekStart(iso)` · `localIsoDate(date)`

**`training.js`** `XP_PER_SESSION=15` · `FULFILL_RATIO=0.8` · `MAX_SEGMENTS=12` ·
`MAX_REPEATS=50` · `MAX_NOTE_LENGTH=200` · `SESSION_TYPES` · `SEGMENT_KINDS` ·
`MIN_PHASE_SECONDS=5` · `MAX_PHASE_SECONDS=3600` ·
`DEFAULT_INTERVAL={workSeconds:60,restSeconds:60,repeats:8}` ·
`isIntervalType` · `isRestType` · `validateInterval` · `intervalTotalSeconds` ·
`describeInterval` · `clock(seconds)` · `typeLabel` · `segmentLabel` ·
`validateSession` · `normalizeSessions` · `sessionDistanceKm` ·
`sessionDurationMinutes` · `describeSession` · `plannedInAdvance` ·
`matchPlan(sessions, runs, {today})` · `planXp` · `buildPlanStats`

**`exercise-log.js`** `XP_PER_EXERCISE=3` · `MAX_EXERCISE_COUNT=999` ·
`normalizeEntries` · `countsByExercise` · `totalCompletions` · `xpEarningCount` ·
`exerciseXp` · `awardsXp(entries,id,date)` · `doneOnDay` ·
`setExerciseCount(entries,id,target,{date,createId})` · `buildExerciseStats`

**`exercise-plan.js`** `MAX_PLANNED_PER_DAY=12` · `normalizePlan` · `plannedOn` ·
`upcomingPlan` · `isPlanned` · `hasRoomOn` · `planExercise` · `unplanExercise`

**`exercises.js`** `ALL_CATEGORIES='alle'` · `CATEGORIES` · `EXERCISES` ·
`findCategory` · `filterExercises` · `countByCategory`

**`goal.js`** `XP_PER_GOAL_WEEK=100` · `goalWeeks(runs,{weeklyGoal,goalSince,todayIso})` ·
`reachedGoalWeeks` · `goalXp`

**`history.js`** `replayHistory(runs, exerciseLog=[])` ·
`achievementUnlockDates(runs, exerciseLog=[])`

**`route.js`** `MIN_POINTS=2` · `DEFAULT_VIEWPORT={width:320,height:200,padding:12}` ·
`normalizeTrack` · `hasDrawableRoute` · `projectTrack` · `thinTrack(track,500)` ·
`toStorageTrack(track,500)`

**`transfer.js`** `EXPORT_FORMAT='funrun-export'` ·
`LEGACY_EXPORT_FORMATS=['laufapp-export']` · `EXPORT_VERSION=1` · `buildExport` ·
`serializeExport` · `exportFileName(date)` · `parseImport(text)` ·
`EXPORT_REMINDER_DAYS=30` · `exportReminder({lastExport, runCount, todayIso})`

**`interval.js`** `WORK` · `REST` · `PHASE_LABEL` · `phaseAt(interval, elapsedMs)` ·
`summarize(interval, elapsedMs)`

**`lock.js`** `UNLOCK_HOLD_MS=2000` · `holdProgress` · `isHoldComplete` ·
`canLock({status,locked})` · `controlsEnabled` · `shouldReleaseLock`

**`pwa.js`** `INSTALL_HINT_KEY='laufapp.installHint.dismissed'` ·
`CACHE_PREFIX='funrun-'` · `LEGACY_CACHE_PREFIXES=['laufapp-']` ·
`isStandalone` · `wasInstallHintDismissed` · `rememberInstallHintDismissed` ·
`shouldShowInstallHint` · `ownCacheNames` · `ownRegistrations`

**`beep.js`** `isSoundOn` · `setSoundOn` · `unlock()` · `beepWork` · `beepRest` ·
`beepFinish`

**`share-card.js`** `CARD_WIDTH=1080` · `CARD_HEIGHT=1350` · `CARD_COLORS` ·
`drawShareCard(canvas, data)` · `inhaltsHoehe(...)`

**`tracker.js`** `createTracker({onUpdate,onError,filter})`
**`stopwatch.js`** `createStopwatch({onUpdate})`
**`wake-lock.js`** `createWakeLock(isActive)`

**`format.js`** `numberFormat` · `distanceFormat` · `dateFormat` ·
`monthFormat` · `shortMonthFormat` · `weekdayFormat` · `todayIso()` ·
`toIsoDate(date)` · `toTimeOfDay(date)` · `formatDate(isoDate)` ·
`formatDays(count)` · `formatMonth("JJJJ-MM")` · `formatAveragePace(minPerKm)` ·
`round(v)` (2 Stellen) · `r1(v)` (1 Stelle)

**`views/dom.js`** `el` · `SVG_NS` · `createSvg(tag, attribute, text?)`

**`views/training.js`** `connectTrainingView(verdrahtung)` ·
`setupSessionForm()` · `resetSessionForm()` · `renderTraining()` ·
`STATUS_TEXT`

**`views/stats.js`** `renderTrophySummary(achievements)` ·
`renderProfileStats(runs)` · `renderActivity(runs)` · `renderPaceTrend(runs)` ·
`renderBestTimes(runs)` · `setupHeatmap()` · `buildStatBlocks(werte)`

> **Wie die Ansichten an den Zustand kommen.** Nicht per Import – der wäre der
> Wert zum Ladezeitpunkt, und `runs`/`sessions` werden bei jeder Änderung neu
> zugewiesen. `views/stats.js` liest nur und bekommt die Läufe als Parameter.
> `views/training.js` schreibt auch, und ihre Handler feuern lange nach dem
> Rendern; sie bekommt einmal in `init()` ein Objekt mit `getRuns`,
> `getSessions`, `setSessions` und `render`. **Wächst dieses Objekt bei der
> nächsten Ansicht deutlich, ist der Schnitt falsch gelegt.**

### `js/app.js` – Orientierung (135 Funktionen, alle modulintern)

`app.js` trägt Kommentarmarken der Form `/* ---- Bereich */`. **Danach greifen,
nicht nach Zeilennummern** – die stimmen nach der nächsten Änderung nicht mehr,
die Marke schon:

```bash
grep -n '^/\* -' js/app.js
```

Stand nach B1 (Zeilennummern als Richtwert, Marken als Anker):

| Marke | ab Zeile | Funktionen (Auswahl) |
|---|--:|---|
| (Kopf, ohne Marke) | 1 | `recorder`, `isRecording`, `verdrahtung`, `init` |
| `Bereiche` | 367 | `bindTabs`, `setView` |
| `Begrüßung` | 417 | `renderGreeting` |
| `Heute geplant` | 438 | `renderToday`, `createTodaySession`, `createTodayItem` |
| `Übungen` | 536 | `renderExercises`, `createExerciseCard`, `createCountEditor`, `handleCountCorrection`, `handlePlan/handleUnplan` |
| `Trophäen` | 1002 | `renderTrophies`, `renderTrophyFilter`, `createTrophyTile` |
| `Profil` | 1113 | `renderProfile`, `fillProfileForm`, `handleProfileSubmit`, `renderGoal` |
| `Intervall-Stoppuhr` | 1260 | `setupQuickInterval`, `startIntervalRun`, `renderIntervalScreen`, `finishIntervalRun`, `saveIntervalRun` |
| `Teilen` | 1718 | `setupShare`, `handleShare`, `buildShareData`, `downloadCard` |
| `Speicher-Warnung` | 1934 | `showStorageError` |
| `Installationshinweis` | 1962 | `maybeShowInstallHint`, `dismissInstallHint` |
| `Aktualisieren` | 1987 | `handleRefresh`, `clearOwnCaches`, `unregisterOwnServiceWorkers` |
| `Events` | 2024 | `handleSubmit`, `showWarnings`, `handleListClick` |
| `Detailansicht` | 2099 | `toggleDetail`, `renderDetail`, `createRouteSvg`, `createRouteMarker` |
| `Bearbeiten` | 2236 | `startEditing`, `stopEditing`, `renderFormMode` |
| `Sichern` | 2286 | `renderExportReminder`, `handleExport`, `handleImportFile`, `buildImportSummary`, `handleImportApply` |
| `Tracking` | 2447 | `setTrackGps`, `handleTrackStart/Pause/Stop/Discard` |
| `Tastensperre` | 2546 | `setLocked`, `bindUnlockHold`, `pollUnlockHold` |
| `Anzeige` | 2659 | nur `render({announceUnlocks})` |
| `Statistik` | 2686 | `setStatsPeriod`, `renderPeriodStats`, `renderChart`, `renderTracking`, `renderProgress`, `renderAchievements`, `renderRuns`, `createRunItem`, `fillDeleteConfirm`, `showError`, `registerServiceWorker`, `markUpdateReady`, `maybeShowUpdateHint` |

> **Achtung, die letzte Marke lügt.** `Statistik` ist die letzte im File und
> begrenzt deshalb nichts – alles von Zeile 2686 bis zum Ende steht unter ihr,
> auch die Lauf-Liste, die Fehleranzeige und der Service-Worker. Wer dort etwas
> sucht und beim Namen der Marke stehen bleibt, sucht am falschen Ort. (Das war
> schon vor B1 so; hier steht es zum ersten Mal.)

**Nicht mehr hier** (seit B1): Trainingsformular und Planliste →
`js/views/training.js` · Profil-Statistik, Aktivitätsraster, Pace-Verlauf,
Bestzeiten → `js/views/stats.js` · `el` und `createSvg` → `js/views/dom.js` ·
Formatierung → `js/format.js`.

---

## 5. Datenmodell

### `localStorage`-Schlüssel (alle mit Präfix `laufapp.`)

| Schlüssel | Inhalt |
|---|---|
| `laufapp.runs.v1` | Läufe |
| `laufapp.exercises.v1` | erledigte Übungen (Log) |
| `laufapp.training.v1` | geplante Einheiten (Sessions) |
| `laufapp.exercise-plan.v1` | für Tage vorgenommene Übungen |
| `laufapp.profile.v1` | `{ name, weeklyGoal, goalSince }` |
| `laufapp.recording.v1` | `{ gps: boolean }` – zuletzt gewählte Aufzeichnungsart, Voreinstellung **false** |
| `laufapp.export.v1` | `{ lastExport: "JJJJ-MM-TT" }` – Tag der letzten Sicherung. Wandert **nicht** in die Exportdatei: beschreibt die Gewohnheit des Browsers, nicht die Daten |
| `laufapp.installHint.dismissed` | Installationsbanner weggeklickt |

### Objekte

```js
Run = {
  id, distanceKm, date,          // Pflicht; date = 'JJJJ-MM-TT'
  timeOfDay?,                    // 'HH:MM'
  durationMinutes?, paceMinPerKm?,
  source?,                       // 'gps' | 'manual'
  interval?,                     // bei Intervall-Läufen
  track?                         // [[lat, lon], …] max. 500 Punkte, 5 Nachkommastellen
}

ExerciseEntry = { id, exerciseId, date /* Kalendertag */, at /* Zeitstempel */ }

Session = { id, date, type, segments: [], createdAt, interval?, note? }
// type: easy | long | tempo | interval | rest (SESSION_TYPES)
// Achtung: das sind die IDs. Dauerlauf/Long Run/Tempolauf/Intervalle/Ruhetag
// sind nur die Beschriftungen.

Export = {
  format: 'funrun-export', version: 1, exportedAt, runCount,
  runs: [], exerciseLog: [], sessions: []
}
```

`validateRun()` verwirft unbekannte Felder. `updateRun()` baut den Lauf neu auf,
behält aber `id`, `source` und `track`. `updateSession()` behält `id` und
`createdAt`.

---

## 6. Regeln und Konstanten, die im Kopf sein müssen

**XP / Level**
- 10 XP pro km · Aufstieg N→N+1 kostet `40 + 20×N` · Gesamt bis Level L: `(L-1)×(10L+40)`
- Übung: **3 XP je Übung und Kalendertag** (Zähler wächst öfter, XP nicht)
- eingehaltene Trainingseinheit: **15 XP**, nur wenn `createdAt <= date`
- erreichte Zielwoche: **100 XP**
- **Nichts davon wird gespeichert** – XP, Level und Trophäen werden bei jedem
  Rendern neu aus Läufen, Übungslog und Plan abgeleitet.

**Trainingsabgleich** – Einheit erfüllt ab 80 % des Ziels (`FULFILL_RATIO`);
ein Lauf erfüllt höchstens eine Einheit; Ruhetag verbraucht keinen Lauf.

**GPS-Filter** (`DEFAULT_FILTER` in `geo.js`): Genauigkeit > 30 m verworfen ·
Bewegung < 5 m ignoriert (Bezugspunkt bleibt stehen) · Sprünge > 10 m/s verworfen.

**Serien** (`stats.js`): Tage/Wochen mit mindestens einem Lauf; laufende Serie
überlebt einen Tag bzw. eine Woche Pause; „heute" kommt immer als `todayIso`
herein, nie aus der Systemuhr – nur so testbar.

**Monotonie-Annahme** (`history.js`): jede Trophäenbedingung, die einmal erfüllt
war, bleibt erfüllt. Ein Test wacht darüber. Eine nicht-monotone Bedingung würde
die Freischaltdaten zerstören.

**Zahleneingaben sind `type="text"` + `inputmode`**, nie `type="number"` –
sonst frisst der Browser „0,4". Gelesen wird ausschließlich mit `parseNumber()`
(nimmt Komma und Punkt, liefert `null` statt 0 bei Leerstring).

**CSS**: alle Werte als Custom Properties oben in `style.css`. Felder hängen an
`--field-height`, `--field-pad-x`, `--field-pad-y`, `--label-gap`, `--field-gap`
und werden **nie pro Formular nachjustiert**; Mindesthöhe 44 px. `.field` ist ein
Raster, das die Zeilen von `.fields` erbt (subgrid), damit nebeneinander stehende
Felder trotz unterschiedlich langer Beschriftungen auf einer Höhe stehen.
Akzentfarbe Neongrün `#c4f000`, Hintergrund `#0d0f12`, Textkontrast mind. 4,5:1.

**Service Worker**: `CACHE_VERSION` in `sw.js` bei **jeder** Änderung an
App-Dateien hochzählen. Cache-Befüllung mit `cache: 'reload'`. Nur eigene Caches
(`funrun-`, `laufapp-`) anfassen – auf `github.io` teilen sich alle Projekte den
Origin. **`APP_SHELL` wird seit v46 von `tests/pwa.test.mjs` gegen den echten
Dateibaum geprüft** – eine vergessene Datei fällt jetzt beim Testen auf und
nicht erst offline.

**Schreibfehler werden gemeldet, nicht geschluckt** (seit v46). Alle Töpfe
laufen in `storage.js` durch das interne `schreibe()`. Schlägt ein
`localStorage.setItem` fehl, ruft es die Stelle auf, die `app.js` beim Start mit
`setStorageErrorHandler()` hinterlegt hat; die zeigt `#storage-hint` an.
`saveRuns`, `saveExerciseLog` und `saveSessions` geben zusätzlich `boolean`
zurück. **Neue Speicherfunktionen niemals direkt `localStorage.setItem`
aufrufen** – sonst verschwindet ihr Fehler wieder unbemerkt auf der Konsole.

---

## 7. Aktueller Stand (2026-08-21)

- **Trophäen: 62** – 30 Meilensteine, 18 Herausforderungen, 14 Übungen
- **Übungen: 27** in 5 Kategorien (`warmup`, `drills`, `kraft`, `mobility`, `regeneration`)
- **Bereiche/Tabs: 5** – `start`, `exercises`, `training`, `trophies`, `profile`
  (`data-view` / `#view-…` in `index.html`)
- **Tests: 887** in 26 Dateien (`node --test`, alle grün)
- **Trophäen mit `progress()`: 55 von 62** · Trophäen-XP gesamt: **5055**
- **Module: 28** – 25 in `js/`, 3 in `js/views/`
- **`js/app.js`: 3091 Zeilen**, 135 Funktionen (vor B1: 4132)
- **`sw.js`: `funrun-v50`**
- Letzte Commits (neueste zuerst, Stand des Repos):
  1. app.js entflechten: die Statistik heraus
  2. app.js entflechten: das Trainingsformular heraus
  3. app.js entflechten: Markup-Verweise und Formatierung heraus
  4. Doku-Commit kann nicht in der eigenen Tabelle stehen
  5. Kontext und Roadmap auf den Stand nach dem Push

### Roadmap-Block A, B1, B2, B3 und C1 sind committet

Die Änderungen aus A1, A2, A4, B1, B2, B3 und C1 liegen seit dem 2026-08-21 auf
`master` und sind gepusht; `dertimsistda.github.io` liefert immer den letzten
Stand von `master`. Das Arbeitsverzeichnis ist sauber.

> **Zur Tabelle:** Der Commit, der diese Zeilen schreibt, kann nicht in ihr
> stehen – er entsteht erst danach. Die Doku-Commits (`1134dca`, `af9b35f`, …)
> sind deshalb immer einen Schritt unvollständig, und das ist kein Fehler,
> sondern die Natur der Sache. Wer den wirklich letzten Stand braucht, fragt
> `git log`, nicht diese Datei.

| Roadmap | Commit | Was |
|---|---|---|
| A1 | `e99b96a` | Tote CSS-Regel `.stat dd.stat-note` entfernt |
| A2 | `56ecd94` | README auf Stand gebracht (573 → 815 Zeilen) |
| A4 | `09217d2` | `APP_SHELL` gegen den Dateibaum geprüft (5 Tests) |
| B2 | `28b277a` | Schreibfehler werden gemeldet statt geschluckt; `CACHE_VERSION` auf v46 |
| – | `1134dca` | `KONTEXT.md` und `ROADMAP.md` auf den Stand nach dem Push |
| C1 | `ddb579b` | Erinnerung an die Sicherung nach 30 Tagen; `CACHE_VERSION` auf v47 |
| – | `af9b35f` | Häkchen-Runde nach C1 nachgeholt (§7-Tabelle, §8 Schritt 9) |
| B3 | `a18a661` | Testlücken der jungen Module; neue Dateien für `beep.js` und `wake-lock.js` |
| – | `63fe111` | `KONTEXT.md`, `ROADMAP.md` und `README.md` auf den Stand nach B3 |
| – | `411098f` | §6-Ausnahme: ein Doku-Commit kann nicht in der eigenen Tabelle stehen |
| B1 | `061d0ba` | `js/format.js` und `js/views/dom.js`; `tests/imports.test.mjs` neu; `CACHE_VERSION` auf v48 |
| B1 | `2378c00` | `js/views/training.js`; `CACHE_VERSION` auf v49 |
| B1 | `96bfbf2` | `js/views/stats.js`; `quelltextDerModule()` in `helpers.mjs`; `CACHE_VERSION` auf v50 |

`css/style.css` steckte in A1 und B2 und wurde auf beide Commits aufgeteilt –
die gelöschte Regel in A1, die `.storage-hint`-Regel in B2. Jeder Commit ist
für sich grün geprüft (706 / 706 / 711 / 725 / – / 749 / – / 802 / – / – / 883 /
885 / 887 Tests), damit ein späteres `git bisect` nicht in einem kaputten Stand
landet. Die Striche sind die reinen Dokument-Commits – dort ändert sich keine
Testzahl.

**B1 hat drei Commits statt einem.** Das ist keine Ausnahme von „ein Punkt =
ein Commit", sondern stand so im Punkt: einen Bereich pro Commit, nach jedem
die Seite im Browser öffnen. Genau so ist es gelaufen.

**Nächster Punkt laut Roadmap §5: C3** – ein Fortschrittsbalken an den
Trophäen. Nach drei Commits, die für den Nutzer nichts geändert haben, ist
wieder etwas Sichtbares dran. Details in `ROADMAP.md` §4.

**Aus B3 mitzunehmen:** `beep.js` und `wake-lock.js` hatten bis dahin gar keine
Testdatei – Regel 3 aus `ROADMAP.md` §6 war bei beiden nur zur Hälfte befolgt
(`APP_SHELL` ja, Testdatei nein). Beim Anlegen neuer Module in B1 gilt beides.
Ausserdem steht in `js/interval.js` ein nachweislich unerreichbarer Zweig
(`phaseProgress: phaseSeconds === 0 ? 1 : …`); er wurde bewusst stehen
gelassen, weil B3 reine Testarbeit war.

**Hinweis zum Ordner:** Das Repo liegt unter OneDrive
(`C:\Users\tino2\OneDrive\Desktop\Laufapp`). OneDrive und `.git` vertragen sich
schlecht – die Synchronisierung kann Git-interne Dateien anfassen, während Git
sie schreibt. Ein Umzug nach `C:\Users\tino2\Projekte\Laufapp` steht aus.

---

## 8. Arbeitsablauf – Checkliste für jede Änderung

1. Betroffenes **pures Modul** ändern, nicht `app.js`, wenn es sich rechnen lässt.
2. **Test in `tests/…` ergänzen oder anpassen** – geprüft wird an den Grenzen
   (4 gegen 5 Läufe, 49,9 gegen 50 km, 06:59 gegen 07:00).
3. Anzeige in `app.js` verdrahten.
4. `node --test` grün.
5. **`CACHE_VERSION` in `sw.js` hochzählen.** Wird das vergessen, sieht Tim auf
   dem Handy die alte Version und sucht den Fehler im falschen Code.
6. Neue Datei? → in `APP_SHELL` in `sw.js` eintragen.
7. `README.md` **und diese Datei** nachziehen (§10).
8. Commit auf Deutsch, **ohne Umlaute** (bisheriger Stil), Betreffzeile knapp,
   Rumpf erklärt **warum** – nicht was. Dann `git push`, Pages zieht nach ~1 min.
9. **Kam die Änderung aus `ROADMAP.md`? Dann die Häkchen-Runde drehen.** Ein
   erledigter Punkt steht dort an sechs Stellen – die Liste steht in
   `ROADMAP.md` §6. Nur §5 abzuhaken reicht nicht: dann widerspricht sich das
   Dokument, und ein Plan, dem man nicht traut, ist keiner mehr.

**Nie tun:** abgeleitete Werte (XP, Level, Trophäenstatus, Plantreue) speichern ·
`localStorage`-Schlüssel umbenennen · eine Chart-Bibliothek einbauen ·
`type="number"` verwenden · fremde Caches auf `github.io` leeren.

---

## 9. Bekannte Abweichungen: README ↔ Code

**Erledigt am 2026-08-21.** Das `README.md` wurde vollständig auf den Stand des
Codes gebracht; alle Zahlen wurden dabei am Code nachgezählt, nicht aus dieser
Datei übernommen. Die früher hier verzeichnete Drift (17 statt 62 Trophäen, 464
statt der damals 706 Tests, fehlende Abschnitte zu Intervall-Stoppuhr, Wochenziel,
Teilen-Karte, Bestzeiten, Aktivitätsraster, Pace-Verlauf und Profilname) besteht
nicht mehr.

**Bei Widerspruch gilt weiterhin der Code.** Wer hier eine neue Abweichung
findet, trägt sie ein, statt sie stillschweigend zu umgehen.

**Fehler, der in dieser Datei selbst steckte** (korrigiert am 2026-08-21): §5
führte die Session-Typen als `dauerlauf | longrun | tempo | intervalle |
ruhetag`. Das sind die *Beschriftungen*. Die IDs im Code sind
`easy | long | tempo | interval | rest`. Ein Vergleich auf die falschen Werte
wirft keinen Fehler – die Bedingung greift nur nie.

---

## 10. Pflege dieser Datei

**Wann aktualisieren:** am Ende jeder Arbeitssitzung, in der sich etwas an
Struktur, API, Datenmodell, Regeln oder Zahlen geändert hat. Ein bloßer
Bugfix in einer Render-Funktion braucht keinen Eintrag.

**Was aktualisieren, kurz die Runde drehen:**
- **Zuerst:** Kam die Arbeit aus `ROADMAP.md`? Dann dort die Häkchen-Runde nach
  §6 drehen – sechs Stellen, nicht nur die Reihenfolge-Tabelle.
- Kopfzeile: Datum und `CACHE_VERSION`
- §3 bei neuem/entferntem Modul · §4 bei neuen oder geänderten Exports
- §5 bei neuem Feld oder Schlüssel · §6 bei neuer Regel oder Konstante
- §7 immer: Zahlen und die letzten fünf Commit-Betreffs
- §11 Zeile ergänzen

**Prompt für den Anfang eines neuen Chats:**
> „`KONTEXT.md` liegt im Projektkontext. Nutz sie als Gedächtnis, lies den
> Quellcode nur gezielt für die Dateien, um die es geht. Am Ende der Sitzung
> aktualisierst du sie."

**Prompt am Ende einer Sitzung:**
> „Aktualisiere `KONTEXT.md` nach §10 auf den heutigen Stand.“

---

## 11. Änderungsverlauf dieser Datei

| Datum | Änderung |
|---|---|
| 2026-08-21 | Erstfassung: Stand nach „Aktivitaetsraster und Pace-Verlauf", `sw v44`, 62 Trophäen, 27 Übungen |
| 2026-08-21 | Roadmap-Sitzung: `sw v46`, 725 Tests in 22 Dateien, `setStorageErrorHandler` in §4/§6, §7 um die uncommitteten Änderungen erweitert, §9 erledigt. **Korrigiert:** Session-Typen in §5 standen als Beschriftungen statt als IDs. |
| 2026-08-21 | A1, A2, A4 und B2 committet und gepusht. §7: Warnblock „noch nicht committet" durch die vier Commits ersetzt, Commit-Liste nachgezogen. Beim Committen fiel auf, dass das README noch 706 Tests nannte statt 725 – die drei betroffenen Tabellenzeilen wurden in Commit `56ecd94` mitkorrigiert. |
| 2026-08-21 | **C1** umgesetzt: Erinnerung an die Sicherung. Neu in §4 `exportReminder()` und `loadLastExport`/`saveLastExport`, in §5 der Schlüssel `laufapp.export.v1`. `sw v47`, 749 Tests. |
| 2026-08-21 | §7 nachgezogen: C1 und `1134dca` in der Commit-Tabelle ergänzt, Live-Stand auf `ddb579b` korrigiert (stand noch auf `28b277a`). |
| 2026-08-21 | §8 um Schritt 9 und §10 um die Häkchen-Runde ergänzt: ein erledigter Roadmap-Punkt muss an sechs Stellen markiert werden, nicht nur in der Reihenfolge-Tabelle. |
| 2026-08-21 | **B3** umgesetzt: Testlücken der jungen Module. Neue Testdateien für `beep.js` und `wake-lock.js` – beide standen bis dahin ungeprüft im Baum. 749 → **802 Tests in 24 Dateien**. Kein Produktivcode, `sw v47` bleibt. |
| 2026-08-21 | §7 nachgezogen: `63fe111` ergänzt. Der gepflegte Live-Hash ist entfallen – er war ab dem jeweils nächsten Commit falsch und musste dreimal hintereinander korrigiert werden. Pages liefert ohnehin den letzten Stand von `master`. |
| 2026-08-21 | **B1** umgesetzt, kleine Variante, drei Commits. Neu: §3 mit vier Modulen (`format.js`, `views/{dom,training,stats}.js`) und dem Hinweis, dass „die App" nicht mehr `app.js` ist; §4 um die vier APIs und die Erklärung, wie die Ansichten an den Zustand kommen; §7 mit neuen Zahlen. Die `app.js`-Orientierung in §4 ist neu geschrieben: sie hängt jetzt an den Kommentarmarken statt an Zeilennummern, weil die nach jeder Änderung falsch sind. 802 → 887 Tests, `sw` v47 → v50. |
| 2026-08-21 | Beim Nachzählen für B1 aufgefallen: §3 führte `storage.js` mit **602** Zeilen, tatsächlich sind es **653** – die Fehlerbehandlung aus B2 war nie in die Modulkarte nachgetragen worden. Korrigiert. Alle übrigen 21 Zeilenzahlen stimmten. Genau die Drift, gegen die A2 antrat, nur eine Datei weiter. |
| 2026-08-21 | Ebenfalls beim Nachzählen aufgefallen und in §4 vermerkt: `Statistik` ist die **letzte** Kommentarmarke in `app.js` und begrenzt deshalb nichts – Lauf-Liste, Fehleranzeige und Service-Worker stehen mit unter ihr. Das war schon vor B1 so und stand nirgends. |
| 2026-08-21 | Nach dem Push nachgezogen: §7 sagte „noch nicht gepusht" – seit `102107b` auf `origin/master` stimmt das nicht mehr. Genau die Sorte Satz, die nur so lange wahr ist, bis jemand den nächsten Schritt tut; deshalb steht hier weiterhin kein Live-Hash. |
