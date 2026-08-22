# FunRun – Projektkontext (Gedächtnisdatei)

> **Stand: 2026-08-22** · Repo-Ordner `Laufapp` · Branch `master` · `sw.js` `CACHE_VERSION = funrun-v64`
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
   zugehörige Testdatei. `js/app.js` ist seit B1 3.409 statt 4.184 Zeilen, aber
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
css/style.css         ~88 KB, alle Werte als Custom Properties oben
js/*.js               26 Module (siehe §3)
js/views/*.js         3 Ansichten – DOM und Interaktion, seit B1
tests/*.test.mjs      27 Testdateien + helpers.mjs
tools/mess-history.mjs  Messwerkzeug, kein Teil der App (siehe §7)
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
| `js/app.js` | 3409 | Verdrahtung und die noch nicht herausgelösten Bereiche | Start, Läufe, Übungen, Trophäen, Profil, Intervall, Teilen, Export |
| `js/views/training.js` | 498 | Trainingsformular, Planliste, Löschrückfrage | irgendetwas am Trainingsplan |
| `js/views/stats.js` | 454 | Profil-Kennzahlen, Aktivitätsraster, Pace-Verlauf, Bestzeiten, Trophäen-Übersicht | irgendetwas an der Statistik im Profil |
| `js/views/dom.js` | 270 | die `getElementById`-Verweise (`el`), `SVG_NS`, `createSvg`, `createIcon` | ein neues Element im Markup, ein neues Symbol am Knopf |
| `js/format.js` | 113 | rein: Zahlen, Daten, Zeiten in Anzeigeform | eine neue Formatierung |
| `js/storage.js` | 786 | Laden/Speichern/Ändern aller Datentöpfe | neues persistiertes Feld, neuer Datentopf |
| `js/achievements.js` | 997 | Trophäen-Definitionen + `buildRunStats()` | neue Trophäe, neue Kennzahl für Bedingungen, Stand einer offenen Trophäe |
| `js/training.js` | 590 | geplante Einheiten, Intervall-Vorgaben, Abgleich mit Läufen | Trainingsplan, Plantreue-XP |
| `js/stats.js` | 569 | Summen, Serien, Zeitreihen (mit `isCurrent`), Aktivitätsraster, Pace-Trend, Bestzeiten | Statistik, Diagramme |
| `js/validation.js` | 455 | Prüfung aller Eingaben, `parseNumber`, `parsePace` | neues Eingabefeld, neue Grenze |
| `js/exercises.js` | 297 | Übungsbibliothek (fest) + Filter | Übung ergänzen/ändern |
| `js/transfer.js` | 348 | Export-/Importformat | Datenformat erweitern |
| `js/tracker.js` | 295 | Live-Aufzeichnung über `watchPosition` | GPS-Aufzeichnung |
| `js/share-card.js` | 252 | Teilen-Karte auf Canvas (1080×1350) | Teilen-Bild |
| `js/exercise-log.js` | 239 | erledigte Übungen: Zähler, Tageslimit, XP | Übungs-Häkchen |
| `js/route.js` | 165 | GPS-Strecke → SVG-Koordinaten | Routenanzeige |
| `js/geo.js` | 158 | Haversine, GPS-Filter, Pace-/Zeitformatierung | Streckenberechnung, Formatierung |
| `js/stopwatch.js` | 151 | Aufzeichnung ohne GPS, gleiche Form wie `tracker.js` | Stoppuhr |
| `js/exercise-plan.js` | 129 | für einen Tag vorgenommene Übungen | Tagesplan Übungen |
| `js/titles.js` | 114 | Titel + Abzeichen zum Level | neuer Rang |
| `js/beep.js` | 109 | Töne für die Intervall-Stoppuhr (WebAudio) | Signaltöne |
| `js/speech.js` | 182 | Ansagen beim Laufen: was gesagt wird (pur) + Sprachausgabe | Ansagetext, Schrittweite |
| `js/interval.js` | 107 | Phasenberechnung Belastung/Pause | Intervall-Ablauf |
| `js/pwa.js` | 114 | Installationshinweis (wann er weicht), eigene Caches erkennen | Update-/Installlogik |
| `js/xp.js` | 84 | XP und Level – die Kernformel | XP-Regeln |
| `js/goal.js` | 79 | Wochenziel: erreichte Wochen, Bonus-XP | Wochenziel |
| `js/history.js` | 78 | Freischaltdaten (Replay, O(n²) – **teuer**, siehe §6) | „freigeschaltet am" |
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

> **Falle bei den Zeilenenden** (seit D1). Git steht hier auf
> `core.autocrlf=true`: im Repo liegt LF, im Arbeitsverzeichnis CRLF. Ein
> Test, der im Quelltext nach einer Regel über **zwei Zeilen** sucht und das
> Zeilenende als `
` hinschreibt, ist grün im Arbeitsverzeichnis und rot in
> jedem frischen Klon. Deshalb liest kein Test die Quelldateien mehr selbst –
> `lies()` aus `tests/helpers.mjs` vereinheitlicht sie. **Neue Testdatei:
> `lies()` benutzen, nicht `readFileSync`.**

> **Falle beim Verschieben von Code.** Ein Test, der einen festen Dateipfad
> trägt und im Quelltext nach einer Regel sucht, wird beim Umzug der Regel
> **nicht rot** – er findet nichts und bleibt grün. Bei B1 wäre das zweimal
> passiert. Deshalb liest `quelltextDerModule()` aus `tests/helpers.mjs` `js/`
> rekursiv, und kein Test in `styles.test.mjs` nennt mehr eine einzelne Datei.
> **Nach jedem Verschieben: `grep` auf den Funktionsnamen in `tests/`.**
>
> Beide Fallen haben dieselbe Form: **ein Test, der grün ist, weil er nicht
> findet, wonach er sucht.** Wer einen Test schreibt, der im Quelltext sucht,
> prüft einmal, ob er auch rot wird.

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

**`speech.js`** `ANNOUNCE_STEP_KM=1` · `nextAnnouncement(state, previous)` ·
`announcementText(km, proKmMs)` · `isVoiceSupported()` · `isVoiceOn()` ·
`setVoiceOn(v)` · `unlockVoice()` · `speak(text)` · `cancelSpeech()`

**`geo.js`** `EARTH_RADIUS_KM` · `DEFAULT_FILTER` · `haversineKm(a,b)` ·
`evaluateSegment(prev, next, filter)` · `reduceTrack(points, filter)` ·
`paceMinPerKm(km, elapsedMs)` · `runPaceMinPerKm(run)` ·
`formatDuration(ms)` · `formatPace(minPerKm)`

**`validation.js`** `MAX_DISTANCE_KM=1000` · `MAX_DURATION_MINUTES=1440` ·
`MAX_NAME_LENGTH=30` · `MAX_WEEKLY_GOAL=14` · `MIN_PACE_MIN_PER_KM=2` ·
`MAX_PACE_MIN_PER_KM=30` · `MAX_RUN_NOTE_LENGTH=200` · `FEELINGS` ·
`feelingLabel(v)` · `WEATHERS` · `weatherLabel(v)` · `parseNumber(v)` ·
`isValidIsoDate(v)` ·
`normalizeName(v)` · `normalizeWeeklyGoal(v)` · `parsePace(v)` ·
`parseDurationSeconds(v)` · `isValidTimeOfDay(v)` · `validateRun(input)` ·
`firstErrorMessage(result)`

**`storage.js`** `setStorageErrorHandler(fn)` · `loadRuns` · `saveRuns` · `addRun` · `updateRun` · `removeRun` ·
`replaceRuns` · `loadExerciseLog` · `saveExerciseLog` · `addExerciseEntry` ·
`replaceExerciseLog` · `loadSessions` · `saveSessions` · `addSession` ·
`updateSession` · `removeSession` · `replaceSessions` · `loadExercisePlan` ·
`saveExercisePlan` · `loadProfile` · `saveProfile` · `loadGpsPreference` ·
`saveGpsPreference` · `loadLastExport` · `saveLastExport(isoDate)`

**`stats.js`** `buildStats(runs,{todayIso})` ·
`distanceByWeek/ByMonth(runs,{limit=12,todayIso})` – die Eimer tragen seit D1
`isCurrent`, und **genau einer** ist es. Nicht „der letzte": ein auf morgen
datierter Lauf schiebt einen Eimer dahinter, und `runsInPeriod()` lässt solche
Läufe bewusst stehen ·
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
`INSTALL_HINT_VIEW='start'` · `CACHE_PREFIX='funrun-'` ·
`LEGACY_CACHE_PREFIXES=['laufapp-']` · `isStandalone` ·
`wasInstallHintDismissed` · `rememberInstallHintDismissed` ·
`shouldShowInstallHint({standalone,dismissed,updateReady=false,view='start'})` ·
`ownCacheNames` · `ownRegistrations`
Seit D2 hat `shouldShowInstallHint` zwei Bedingungen mehr: **der Update-Hinweis
sticht** (`updateReady`), und der Installationshinweis steht **nur im
Start-Tab** (`view`). Beide haben Vorgaben, damit ein Aufruf ohne sie nicht
stillschweigend „nie zeigen" bedeutet. Der Update-Hinweis selbst bleibt an
keinen Bereich gebunden – er ist der einzige Weg aus einer hängenden alten
Fassung.

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
`round(v)` (2 Stellen) · `r1(v)` (1 Stelle) · `splitUnit(text)` – zerlegt einen
fertigen Anzeigewert am **letzten** Leerzeichen in `[Zahl, Einheit]`, für die
Statistik-Kacheln (D6: die Einheit steht kleiner). Trägt nur, weil der
Tausendertrenner im Deutschen ein Punkt ist – bei einer Sprache mit Leerzeichen
wäre hier nachzusehen.

**`views/dom.js`** `el` · `SVG_NS` · `createSvg(tag, attribute, text?)` ·
`createIcon(id)` – ein `<svg><use href="#id">` aus der Symbolsammlung oben in
`index.html`, immer `aria-hidden`; die Beschriftung bleibt als `aria-label` am
Knopf. Seit D3, weil an vier Knöpfen Zeichen standen (`📅`, `✎`) und das erste
als farbiges System-Emoji rendert.

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

### `js/app.js` – Orientierung (145 Funktionen, alle modulintern)

`app.js` trägt Kommentarmarken der Form `/* ---- Bereich */`. **Danach greifen,
nicht nach Zeilennummern** – die stimmen nach der nächsten Änderung nicht mehr,
die Marke schon:

```bash
grep -n '^/\* -' js/app.js
```

Stand nach Block D (Zeilennummern als Richtwert, Marken als Anker):

| Marke | ab Zeile | Funktionen (Auswahl) |
|---|--:|---|
| (Kopf, ohne Marke) | 1 | `recorder`, `isRecording`, `verdrahtung`, `init` |
| `Bereiche` | 438 | `bindTabs`, `setView` |
| `Begrüßung` | 492 | `renderGreeting` |
| `Heute geplant` | 513 | `renderToday`, `createTodaySession`, `createTodayItem` |
| `Übungen` | 611 | `renderExercises`, `createExerciseCard`, `createCountEditor`, `handleCountCorrection`, `handlePlan/handleUnplan` |
| `Trophäen` | 1080 | `renderTrophies`, `renderTrophyFilter`, `createTrophyTile`, `createTrophyProgress`, `createTrophyStanding` |
| `Farbschema` | 1254 | `setupTheme`, `applyTheme`, `applyThemeColor` |
| `Profil` | 1313 | `renderProfile`, `fillProfileForm`, `handleProfileSubmit`, `renderGoal` |
| `Intervall-Stoppuhr` | 1460 | `setupQuickInterval`, `startIntervalRun`, `renderIntervalScreen`, `finishIntervalRun`, `saveIntervalRun` |
| `Teilen` | 1918 | `setupShare`, `handleShare`, `buildShareData`, `downloadCard` |
| `Speicher-Warnung` | 2134 | `showStorageError` |
| `Installationshinweis` | 2162 | `maybeShowInstallHint`, `dismissInstallHint` |
| `Aktualisieren` | 2189 | `handleRefresh`, `clearOwnCaches`, `unregisterOwnServiceWorkers` |
| `Events` | 2226 | `handleSubmit`, `showWarnings`, `handleListClick` |
| `Detailansicht` | 2331 | `toggleDetail`, `renderDetail`, `createRouteSvg`, `createRouteMarker` |
| `Bearbeiten` | 2527 | `startEditing`, `stopEditing`, `renderFormMode` |
| `Sichern` | 2580 | `renderExportReminder`, `handleExport`, `handleImportFile`, `buildImportSummary`, `handleImportApply` |
| `Tracking` | 2741 | `setTrackGps`, `handleTrackStart/Pause/Stop/Discard` |
| `Tastensperre` | 2854 | `setLocked`, `bindUnlockHold`, `pollUnlockHold` |
| `Anzeige` | 2967 | nur `render({announceUnlocks})` |
| `Statistik` | 2994 | `setStatsPeriod`, `renderPeriodStats`, `renderChart`, `createChartRow`, `renderTracking`, `renderProgress`, `renderAchievements`, `renderRuns`, `createRunItem`, `fillDeleteConfirm`, `showError`, `registerServiceWorker`, `markUpdateReady`, `maybeShowUpdateHint` |

> **Achtung, die letzte Marke lügt.** `Statistik` ist die letzte im File und
> begrenzt deshalb nichts – alles ab Zeile 2994 bis zum Ende steht unter ihr,
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
| `laufapp.recording.v1` | `{ gps: boolean, voice: boolean }` – Aufzeichnungsart (Voreinstellung **false**) und Ansagen beim Laufen (Voreinstellung **true**). ⚠️ **Zwei Schalter, ein Eintrag:** gelesen und geschrieben wird im Ganzen, sonst löscht einer den anderen. Wandert **nicht** in die Exportdatei |
| `laufapp.export.v1` | `{ lastExport: "JJJJ-MM-TT" }` – Tag der letzten Sicherung. Wandert **nicht** in die Exportdatei: beschreibt die Gewohnheit des Browsers, nicht die Daten |
| `laufapp.display.v1` | `{ theme: 'system' | 'light' | 'dark' }` – gewähltes Farbschema, Vorgabe **system**. Wandert **nicht** in die Exportdatei: eine Sicherung beschreibt die Läufe, nicht die Vorlieben eines Geräts |
| `laufapp.installHint.dismissed` | Installationsbanner weggeklickt |

### Objekte

```js
Run = {
  id, distanceKm, date,          // Pflicht; date = 'JJJJ-MM-TT'
  timeOfDay?,                    // 'HH:MM'
  durationMinutes?, paceMinPerKm?,
  note?,                         // Freitext, max. 200 Zeichen (MAX_RUN_NOTE_LENGTH)
  feeling?,                      // 1–5, die Skala steht als FEELINGS in validation.js
  weather?,                      // 'sonne' | 'wolken' | 'regen' | 'schnee' (WEATHERS)
  source?,                       // 'gps' | 'manual'
  interval?,                     // bei Intervall-Läufen
  track?,                        // [[lat, lon], …] max. 500 Punkte, 5 Nachkommastellen
  splits?                        // Sekunden je vollem Kilometer, in Reihenfolge
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
behält aber `id`, `source` und `track`.

⚠️ **In `track` stehen keine Zeiten.** Nur `[lat, lon]`; der Zeitstempel jeder
Position wird verworfen, sobald die Strecke daraus gewachsen ist, und
`normalizeTrack()` streift alles Weitere ab. **Aus einer gespeicherten Spur
lässt sich nichts Zeitliches nachrechnen** – man weiss, *wo* etwas war, nicht
*wann*. Deshalb schreibt `tracker.js` die Kilometer-Übergänge live in
`splits` (C8). Wer das nächste Mal „die Daten liegen doch schon vor" denkt:
hier nachlesen.

⚠️ **Ein neues Feld am Lauf gehört an drei Stellen**: `validateRun()`,
`addRun()` **und** `updateRun()`. Die beiden Speicherfunktionen zählen die
Felder einzeln auf, statt den geprüften Lauf zu übernehmen – nur so
verschwindet ein geleertes Feld auch wirklich. Wer eine Stelle vergisst,
bekommt keinen Fehler: der Lauf wird gespeichert, nur eben ohne das Feld.
Genau das ist bei C2 passiert. Zwei Tests in `storage.test.mjs` wachen
seitdem darüber, und sie kennen keine Feldliste – sie fragen `validateRun`.
Bei C4 haben sie sich gleich bewährt: `weather` in ihre Vorlage eintragen
genügte, die fehlende Zeile in `addRun` meldeten sie von allein.

⚠️ **Und eine Auswahl steht zweimal da**: als Liste in `validation.js` und als
Markup in `index.html` (`FEELINGS`, `WEATHERS`). Läuft eines dem anderen
davon, gibt es keinen Fehler – es fehlt nur ein Kästchen, oder ein `<use>` auf
eine unbekannte `id` zeichnet nichts. Tests in `styles.test.mjs` halten beide
Richtungen zusammen. `updateSession()` behält `id` und
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

⚠️ **Die Historie ist teuer** (gemessen bei B4, `node tools/mess-history.mjs`):
`achievementUnlockDates()` kostet O(n²) – **314 ms bei 200 Läufen und 600
Übungen**, sieben Sekunden bei 1.000 Läufen, gemessen auf einem Rechner; ein
Telefon ist drei- bis zehnmal langsamer. Gerufen wird sie nur aus
`renderTrophies()`, also **nur bei offenem Trophäen-Bereich** – dort aber bei
jedem Speichern erneut. Der Jetzt-Zustand (`evaluateAchievements()`) ist mit
7 ms bei 2.000 Läufen dagegen billig. **Wer hier etwas anfasst, misst vorher
und nachher.** Die Behebung steht als B4b in der Roadmap.

**Jede offene Trophäe zeigt ihren Stand** (`achievements.js`): entweder
`progress(stats)` – ein Zähler, der zum Ziel hochläuft und als Balken erscheint –
oder `standing(stats)` für die Fälle, in denen ein Balken lügen würde: eine Pace
läuft nach unten, das Ziel des langen Atems wandert mit dem Stand mit. Ein Test
lässt eine neue Trophäe ohne beides nicht durch; die Ausnahmeliste hat genau
zwei Einträge (`neue-bestzeit`, `comeback`) und ist über `ACHIEVEMENTS`
begründet. `current: null` heißt „noch nichts gemessen" und ist nicht `0`.

⚠️ **`--sunken` ist die Falle im hellen Schema.** Die Kommentare an `--accent`
und `--dim` nennen Kontrastzahlen, die stimmen – aber für `--bg` (`#f4f5f2`)
und `--surface` (`#ffffff`). Auf der **eingesenkten** Fläche (`#e9ebe5`) reissen
beide die 4,5:1, und genau dort sitzen Übungskarte, Trophäenkachel und Chip.
Gemessen: `--accent` **4,34:1**, `--dim` **4,15:1**. In Block D dreimal
aufgetreten, jedes Mal an einer anderen Farbe. Daraus folgt:

- **Akzent als Schrift ist `--accent-text`** (`#547000` hell, `#c4f000` dunkel),
  nie `--accent`. Gemessene 4,73:1. Dieselbe Bauart wie `--danger-text`, nur
  andersherum: Rot muss im Dunklen heller werden, Grün im Hellen dunkler.
- **Etwas zurücktreten lassen geht über Gewicht oder Grösse, nicht über
  `--dim`.** `--dim` ist auf `--sunken` schon zu schwach; `--muted` mit
  `font-weight: 400` erreicht dasselbe bei 5,1:1.
- **Vor jeder neuen Farbe auf `--sunken`: nachmessen.** Kein Test fängt das –
  `styles.test.mjs` liest Regeln, es rechnet keine Kontraste.

⚠️ **Farben gehören ausschliesslich in die Token-Blöcke** von `css/style.css`
(`:root` und die zwei hellen). Eine Farbe mitten im Regelwerk lässt sich nicht
umschalten – sie bleibt im hellen Schema stehen, wo sie hingehörte, als alles
dunkel war, und **niemand bemerkt es, solange niemand umschaltet.** Vor C10
standen dort 23 solche Werte. Ein Test in `styles.test.mjs` lässt keinen 24.
mehr durch. Neue Farbe heisst: neues Token in `:root`, Gegenstück im hellen
Block.

**Zahleneingaben sind `type="text"` + `inputmode`**, nie `type="number"` –
sonst frisst der Browser „0,4". Gelesen wird ausschließlich mit `parseNumber()`
(nimmt Komma und Punkt, liefert `null` statt 0 bei Leerstring).

**CSS**: alle Werte als Custom Properties oben in `style.css`. Felder hängen an
`--field-height`, `--field-pad-x`, `--field-pad-y`, `--label-gap`, `--field-gap`
und werden **nie pro Formular nachjustiert**; Mindesthöhe 44 px. `.field` ist ein
Raster, das die Zeilen von `.fields` erbt (subgrid), damit nebeneinander stehende
Felder trotz unterschiedlich langer Beschriftungen auf einer Höhe stehen.
Akzentfarbe Neongrün `#c4f000`, Hintergrund `#0d0f12`, Textkontrast mind. 4,5:1.

**Das `.stat-grid` rechnet, es zählt nicht** (seit D5/D7). Die letzte Kachel
soll nie allein neben einem Loch stehen, und die Kachelzahl ist nicht fest –
Woche hat 5, Gesamtstand 8. Zu bedenken sind **drei** Dinge, und jedes ist
schon einmal danebengegangen:

1. Das Raster ist ab `40em` **dreispaltig**. Zweispaltig steht die letzte
   Kachel bei ungerader Anzahl allein, dreispaltig bei Rest 1.
2. Eine Kachel, die eine ganze Zeile belegt (`.stat-lead`), **dreht die
   Parität um** – dann gilt gerade statt ungerade bzw. Rest 2 statt Rest 1.
3. Jede Regel, die eine andere zurücknimmt, braucht **dieselbe Spezifität**.
   Das `:not(.stat-lead)` an den vier `--lead`-Regeln trägt kein Bedeutung,
   sondern Gewicht.

**Wer hier etwas ändert, misst im Browser für 1 bis 12 Kacheln bei beiden
Breiten nach.** Kein Test sieht ein Loch – `styles.test.mjs` liest Selektoren,
es rechnet kein Layout.

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

## 7. Aktueller Stand (2026-08-22)

- **Trophäen: 62** – 30 Meilensteine, 18 Herausforderungen, 14 Übungen
- **Übungen: 27** in 5 Kategorien (`warmup`, `drills`, `kraft`, `mobility`, `regeneration`)
- **Bereiche/Tabs: 5** – `start`, `exercises`, `training`, `trophies`, `profile`
  (`data-view` / `#view-…` in `index.html`)
- **Tests: 1039** in 27 Dateien (`node --test`, alle grün)
- **Trophäen mit Anzeige: 60 von 62** – 55 mit Balken (`progress()`), 5 mit
  Zeile (`standing()`, seit C3). Ohne beides nur `neue-bestzeit` und
  `comeback`; warum, steht als Kommentar über `ACHIEVEMENTS`. Trophäen-XP
  gesamt: **5055**
- **Module: 29** – 26 in `js/`, 3 in `js/views/`
- **Werkzeuge: 1** – `tools/mess-history.mjs` (kein Teil der App: nicht in
  `APP_SHELL`, keine Testdatei; siehe den Dateikopf dort)
- **`js/app.js`: 3409 Zeilen**, 145 Funktionen (vor B1: **4184**, danach 3091)
- **`sw.js`: `funrun-v64`**
- Letzte Commits (neueste zuerst, Stand des Repos):
  1. Filterchips untereinander statt zufaellig umgebrochen
  2. Die wichtigste Zahl sieht aus wie die wichtigste Zahl
  3. Die Einheit steht kleiner als die Zahl
  4. Keine Kachel bleibt allein in ihrer Zeile
  5. Eine Sache traegt einen Namen

### Roadmap-Block A, B1–B4, C1–C4, C8, C10, C15 und **Block D vollständig** sind committet

Die Änderungen aus A1, A2, A4, B1, B2, B3, B4, C1 bis C4, C8, C10 und C15
liegen seit dem 2026-08-21 auf `master`, **Block D (D1 bis D8) seit dem
2026-08-22**; `dertimsistda.github.io` liefert immer den letzten Stand von
`master`. Das Arbeitsverzeichnis ist sauber.

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
| – | `102107b` | Häkchen-Runde nach B1 |
| – | `bb66779` | §7 sagte „noch nicht gepusht", nachdem gepusht war |
| C3 | `414b55c` | `standing()` für fünf Trophäen ohne sinnvollen Balken; `CACHE_VERSION` auf v51 |
| – | `351d5ad` | Häkchen-Runde nach C3; Roadmap und Kontext widersprachen sich |
| C2 | `12fd1cf` | Notiz und Gefühl am Lauf; `FEELINGS` in `validation.js`; `CACHE_VERSION` auf v52 |
| – | `38e484d` | Häkchen-Runde nach C2; die Drei-Stellen-Regel in §5 |
| C4 | `20aaed8` | Wetter am Lauf; `WEATHERS` und vier Symbole; `.choice-scale` geteilt; `CACHE_VERSION` auf v53 |
| – | `962de24` | Häkchen-Runde nach C4 |
| B4 | `8dda88e` | `tools/mess-history.mjs`; kein Produktivcode, `sw` bleibt v53 |
| – | `1bd1388` | Häkchen-Runde nach B4 |
| – | `849813d` | Reihenfolge neu geordnet: benutzen zuerst, ausbauen später |
| C15 | `18c4106` | `js/speech.js` neu samt Testdatei und `APP_SHELL`; `CACHE_VERSION` auf v54 |
| – | `24b6b5c` | Häkchen-Runde nach C15 |
| C8 | `b58687b` | `splits` in `tracker.js`, `validation.js`, `storage.js`; `CACHE_VERSION` auf v55 |
| – | `278bb04` | Häkchen-Runde nach C8; die track-Warnung in §5 |
| C10 | `29eddae` | 23 Farben zu Token gemacht, helles Schema, `laufapp.display.v1`; `CACHE_VERSION` auf v56 |
| D1 | `3a6fa86` | Akzent nur noch für das Besondere; `--accent-text`, `isCurrent` in `stats.js`; v57 |
| D2 | `c4837b7` | Hinweise einzeilig, höchstens einer; `shouldShowInstallHint` erweitert; v58 |
| D3 | `65c97e8` | `createIcon()`; zwei Symbole statt vier Zeichen; v59 |
| D4 | `56d5308` | „Achievements" → „Trophäen" im sichtbaren Text; v60 |
| D5 | `45976c6` | Keine allein stehende Kachel im `.stat-grid`; v61 |
| D6 | `658d84e` | `splitUnit()`; Einheit kleiner als die Zahl; v62 |
| D7 | `8acdf02` | Leitkachel in der Gesamtstatistik; v63 |
| D8 | `1a22355` | Filterchips untereinander; `chip-count`; v64 |

`css/style.css` steckte in A1 und B2 und wurde auf beide Commits aufgeteilt –
die gelöschte Regel in A1, die `.storage-hint`-Regel in B2. Jeder Commit ist
für sich grün geprüft (706 / 706 / 711 / 725 / – / 749 / – / 802 / – / – / 883 /
885 / 887 Tests), damit ein späteres `git bisect` nicht in einem kaputten Stand
landet. Die Striche sind die reinen Dokument-Commits – dort ändert sich keine
Testzahl.

**Block D ebenso** (993 / 1002 / 1008 / 1012 / 1016 / 1026 / 1032 / 1039), und
zwar **in einem frisch ausgecheckten Worktree** statt im Arbeitsverzeichnis.
Das hat sich sofort ausgezahlt: ein Test aus D1 war im Arbeitsverzeichnis grün
und im Worktree rot (Zeilenenden, siehe §3). Ohne die Runde wäre er in acht
Commits mitgereist und bei jedem Klon rot gewesen. **Im Arbeitsverzeichnis zu
prüfen genügt nicht** – dort steht, was man selbst geschrieben hat, nicht, was
Git ausliefert.

**B1 hat drei Commits statt einem.** Das ist keine Ausnahme von „ein Punkt =
ein Commit", sondern stand so im Punkt: einen Bereich pro Commit, nach jedem
die Seite im Browser öffnen. Genau so ist es gelaufen.

**Nächster Punkt laut Roadmap §5: C7, C6, C5 oder C14** – nach Bedarf, kein
Zwang zur Reihenfolge. **C11** (Jahresrückblick) ist gebaut sinnvoll, aber
saisonal: ab November. Details in `ROADMAP.md` §4 und §5.

> **Diese Zeile stand seit dem 2026-08-21 auf „C3"**, während C3 an
> demselben Tag erledigt wurde und danach noch sechs weitere Punkte folgten.
> Sie ist die einzige Stelle in §7, die keine Zahl ist und deshalb von keiner
> Nachzähl-Runde erwischt wurde. Wer hier etwas ändert: diese Zeile mit.

**Aus B3 mitzunehmen:** `beep.js` und `wake-lock.js` hatten bis dahin gar keine
Testdatei – Regel 3 aus `ROADMAP.md` §6 war bei beiden nur zur Hälfte befolgt
(`APP_SHELL` ja, Testdatei nein). Beim Anlegen neuer Module in B1 gilt beides.
Ausserdem steht in `js/interval.js` ein nachweislich unerreichbarer Zweig
(`phaseProgress: phaseSeconds === 0 ? 1 : …`); er wurde bewusst stehen
gelassen, weil B3 reine Testarbeit war.

**Hinweis zum Ordner:** Das Repo liegt seit dem 2026-08-22 unter
`C:\Users\tino2\Projekte\Laufapp` – **nicht mehr unter OneDrive**. Der Umzug
geschah als frischer `git clone`, nicht als Verschieben: der alte Stand war
sauber und vollständig gepusht, damit schleppt ein Klon nichts mit, was in
`.git/` schon angeknackst gewesen sein könnte. Der alte Ordner ist gelöscht.

Der Grund, falls jemand das Repo je zurückschieben will: OneDrive
synchronisiert dateiweise und kann eine Git-interne Datei gelockt halten,
während Git sie schreibt. Git legt Objekte und Refs als „schreiben, dann
umbenennen" an – trifft der Sync genau dieses Fenster, bleibt eine
`index.lock` stehen oder ein Objekt halb geschrieben. Dazu kommt „Dateien bei
Bedarf": ein Platzhalter sieht für Git aus wie eine vorhandene Datei.
**Ein Git-Repo gehört nicht in einen synchronisierten Ordner.**

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
| 2026-08-21 | **C3** umgesetzt: `standing()` für die fünf Trophäen, bei denen ein Fortschrittsbalken lügen würde. Neu in §6 die Regel, dass jede offene Trophäe einen Stand zeigt; §3 und §4 mit neuen Zeilenzahlen und Marken. 887 → **895 Tests**, `sw` v50 → v51. |
| 2026-08-21 | **C10** umgesetzt: helles Farbschema. Neu in §5 der Schlüssel `laufapp.display.v1` und in §6 die Regel, dass Farben nur in den Token-Blöcken stehen. 969 → **981 Tests**, `sw` v55 → v56. |
| 2026-08-21 | **C8** umgesetzt: Kilometer-Splits. Neu in §5 das Feld `splits` am `Run` **und** die Warnung, dass in `track` keine Zeiten stehen – aus einer gespeicherten Spur ist nichts Zeitliches nachzurechnen. 954 → **969 Tests**, `sw` v54 → v55. |
| 2026-08-21 | Die neue Warnung in §5 steht dort, weil die Roadmap das Gegenteil behauptete: „Die Daten liegen bereits vor – es fehlt nur die Auswertung." Nach B4 der zweite Punkt, dessen Prämisse den Kontakt mit dem Code nicht überlebt hat. Diese Datei hatte die Antwort die ganze Zeit – `track?  // [[lat, lon], …]` –, nur stand nicht dabei, was daraus folgt. |
| 2026-08-21 | **C15** umgesetzt: Ansagen bei jedem Kilometer. Neu in §3 und §4 das Modul `speech.js`, in §5 der zweite Schalter im Aufzeichnungs-Eintrag samt Warnung. 925 → **954 Tests in 27 Dateien**, `sw` v53 → v54. |
| 2026-08-21 | **Erster Punkt, der am Gerät ungeprüft bleibt.** Ob die Sprachausgabe neben Musik durchkommt und bei gesperrtem Bildschirm spricht, lässt sich hier nicht feststellen – dafür gibt es keine Attrappe. Steht ausformuliert in `ROADMAP.md` §4. Wer die Zeile in der Bestandsaufnahme als „fertig geprüft" liest, liest sie falsch. |
| 2026-08-21 | **Die Roadmap-Reihenfolge ist neu geordnet**: „benutzen zuerst, ausbauen später". Für diese Datei ändert das nichts am Inhalt, aber am Zusammenhang – wer hier nachschlägt, was als Nächstes dran ist, findet es in `ROADMAP.md` §5, und die Liste ist jetzt dreigeteilt: erledigt, jetzt, vertagt. Vertagte Punkte tragen die Bedingung, die sie wieder aufweckt. |
| 2026-08-21 | **B4** gemessen: die Historie kostet O(n²) und reisst die gesetzte 50-ms-Grenze schon zwischen 100 und 200 Läufen. Neu in §6 die Warnung mit den Zahlen, in §7 der Werkzeug-Eintrag. Kein Produktivcode, `sw` bleibt v53. |
| 2026-08-21 | **C4** umgesetzt: Wetter am Lauf. Neu in §4 `WEATHERS` und `weatherLabel()`, in §5 das Feld am `Run` und die zweite Warnung: eine Auswahl steht zweimal da, in der Liste und im Markup. 913 → **925 Tests**, `sw` v52 → v53. |
| 2026-08-21 | **Offline geprüft und in Ordnung** – die Frage stand seit B1 offen. Der erste Versuch schlug fehl, weil „Aktualisieren" den Offline-Speicher erst löscht und neu aufbaut; wer sofort danach offline geht, hat nichts. Mit einer Viertelminute Netz dazwischen startet die App ohne Verbindung. Der Knopf trägt diesen Preis nirgends an. |
| 2026-08-21 | **C2** umgesetzt: Notiz und Gefühl am Lauf. Neu in §4 `MAX_RUN_NOTE_LENGTH`, `FEELINGS` und `feelingLabel()`; in §5 die zwei Felder am `Run` **und** die Warnung, dass ein neues Feld an drei Stellen gehört. 895 → **913 Tests**, `sw` v51 → v52. |
| 2026-08-21 | Die Warnung in §5 steht dort, weil genau dieser Fehler passiert ist: `addRun()` kannte die neuen Felder nicht, und nichts hat es gemeldet – der Lauf wurde gespeichert, nur ohne Notiz. Diese Datei nannte bis dahin nur `updateRun()`, und das war die halbe Wahrheit. |
| 2026-08-21 | **Diese Datei hatte recht und wurde überstimmt.** §7 führte seit `28b277a` die Zeile „Trophäen mit `progress()`: 55 von 62" – währenddessen stand C3 in der Roadmap als offener Punkt für M Aufwand. Niemand hat die beiden Dateien nebeneinandergelegt. Für die Roadmap ist daraus eine Regel geworden (erst den Code, sonst wenigstens die andere Datei); hier steht sie als Erinnerung, dass eine gepflegte Zahl nichts nützt, wenn sie keiner liest. |
| 2026-08-22 | **D1** umgesetzt (Roadmap-Block D, neu in `ROADMAP.md` §4b): der Akzent ist wieder die Ausnahme. Neu in §6 die Regel zu `--accent-text` – `--accent` als Schrift auf `--sunken` sind im hellen Schema 4,34:1 und reissen die 4,5:1. Der Kommentar im hellen Block nannte 4,7:1 und 5,2:1, aber für `--bg` und `--surface`; die eingesenkte Fläche stand nicht in der Liste. 981 → **993 Tests**, `sw` v56 → v57. |
| 2026-08-22 | **D2** umgesetzt: die zwei Hinweise über der Tab-Ebene sind einzeilig, und es steht höchstens einer da. Der Installationshinweis ist an den Start-Tab gebunden, der Update-Hinweis bleibt über allen fünf – er ist der einzige Weg aus einer hängenden alten Fassung. Die Regel steht als `shouldShowInstallHint()` in `pwa.js` und ist dort geprüft. 993 → **1002 Tests**, `sw` v57 → v58. |
| 2026-08-22 | **D3** umgesetzt: `createIcon()` neu in §4 (`js/views/dom.js`). Die Zeichen `U+1F4C5` und `U+270E` an vier Knöpfen sind Inline-SVG aus der Symbolsammlung in `index.html`; sie erben ihre Farbe über `currentColor` und folgen damit beiden Schemata. 1002 → **1008 Tests**, `sw` v58 → v59. |
| 2026-08-22 | **D4** umgesetzt: eine Sache, ein Name. Nur Text, den der Nutzer liest – `achievements.js`, die Exports und die Bezeichner bleiben. Ein Test hält das ausdrücklich fest, damit die Umbenennung nicht beim nächsten Aufräumen quer durch acht Dateien weiterläuft. 1008 → **1012 Tests**, `sw` v59 → v60. |
| 2026-08-22 | **D5** umgesetzt: keine allein stehende Kachel mehr im `.stat-grid`. Reines CSS, kein JavaScript. Zu merken: **das Raster ist ab `40em` dreispaltig**, und dort steht die letzte Kachel bei Rest 1 allein, nicht bei ungerade – zwei Regeln, und die zweite muss die erste mit `grid-column: auto` zurücknehmen. 1012 → **1016 Tests**, `sw` v60 → v61. |
| 2026-08-22 | **D6** umgesetzt: neu in §3/§4 `splitUnit()` in `format.js`. Die Einheit steht kleiner als die Zahl, damit die Pace-Kachel nicht umbricht. **Zu merken:** die Trennung am letzten Leerzeichen trägt nur, weil `Intl.NumberFormat` im Deutschen den Punkt als Tausendertrenner setzt. 1016 → **1026 Tests**, `sw` v61 → v62. |
| 2026-08-22 | **D7** umgesetzt: Leitkachel in der Gesamtstatistik. **Zu merken:** eine Kachel, die eine ganze Zeile belegt, dreht die Waisen-Regel aus D5 um – und das `:not(.stat-lead)` an den vier Regeln trägt Gewicht, nicht Bedeutung. Ohne es gewinnt die Rücknahme. 1026 → **1032 Tests**, `sw` v62 → v63. |
| 2026-08-22 | **D8** umgesetzt, **Block D abgeschlossen**. §6 neu gefasst: nicht nur der Akzent, sondern `--sunken` selbst ist die Falle im hellen Schema – `--accent` (4,34:1) und `--dim` (4,15:1) reissen beide die 4,5:1, während ihre Kommentare Zahlen für `--bg` und `--surface` nennen. Dreimal in einem Block aufgetreten, jedes Mal an einer anderen Farbe. 1032 → **1039 Tests**, `sw` v63 → v64. |
| 2026-08-22 | **Pflegerunde nach §10 am Ende der Sitzung.** §3: sieben Zeilenzahlen am Code nachgezählt und korrigiert. **Vier davon waren schon vor Block D falsch** – `tracker.js` 249 → **295** (seit C8), `stopwatch.js` 147 → 151, `speech.js` 175 → **182** (seit C15), dazu `stats.js`. Dieselbe Drift wie bei `storage.js` in B1, nur drei Dateien weiter: die Zeilenzahl wird beim Bauen nie mitgezogen, weil sie niemandem wehtut. |
| 2026-08-22 | §2 hatte drei falsche Zahlen und **widersprach §7**: „25 Module" gegen 26, „26 Testdateien" gegen 27, „~61 KB" gegen 88. §7 stand richtig, weil es bei jedem Commit angefasst wird; §2 wird nur angefasst, wenn eine Datei dazukommt – und dann vergisst man die Zahl daneben. `tools/` fehlte im Dateibaum ganz, seit B4. |
| 2026-08-22 | **§7 sagte seit dem 2026-08-21 „Nächster Punkt: C3"** – C3 wurde am selben Tag erledigt, sechs Punkte folgten danach. Die Zeile ist die einzige in §7, die keine Zahl ist, und wurde deshalb von keiner Nachzähl-Runde erwischt. Jetzt steht der echte Stand da und ein Hinweis, sie mitzuziehen. |
| 2026-08-22 | **Block D (D1–D8)** eingearbeitet: §3 um `isCurrent` und die Hinweis-Vorrangregel, §4 um `createIcon()`, `splitUnit()`, `INSTALL_HINT_VIEW` und die erweiterte `shouldShowInstallHint`-Signatur, §6 um die `--sunken`-Kontrastfalle und die Rechenregeln des `.stat-grid`, §7 um acht Commit-Zeilen. §5 blieb unberührt – Block D hat kein persistiertes Feld angefasst. 981 → **1039 Tests**, `sw` v56 → **v64**. |
| 2026-08-22 | Neu in §3 die **Zeilenenden-Falle**: ein Test, der im Quelltext über zwei Zeilen sucht und das Zeilenende als `\n` hinschreibt, ist bei `autocrlf` grün im Arbeitsverzeichnis und rot in jedem Klon. Zusammen mit der Falle aus B1 dieselbe Form – **ein Test, der grün ist, weil er nicht findet, wonach er sucht**. Gefunden hat es nur die Grünprüfung jedes Commits im frischen Worktree; im Arbeitsverzeichnis zu prüfen genügt dafür nicht. |
| 2026-08-22 | **Das Repo ist aus OneDrive heraus umgezogen** nach `C:\Users\tino2\Projekte\Laufapp`. §7 führte den Umzug seit der Erstfassung als „steht aus"; jetzt steht dort der neue Pfad und der Grund, damit ihn niemand rückgängig macht. Umgesetzt als frischer Klon, weil `master` sauber und gepusht war – Umzugsrisiko damit null. |
