# FunRun – Leitfaden & Roadmap

> **Stand: 2026-08-21** · Grundlage: `KONTEXT.md` (Stand `funrun-v46`, 62 Trophäen, 27 Übungen)
>
> **Fortschritt: A1, A2, A3, A4 und B2 sind erledigt, committet und gepusht**
> – siehe §5. Der nächste Punkt ist **C1** (Export-Erinnerung).
>
> Diese Datei beantwortet drei Fragen: **Was gibt es?**, **Was ist schwach?**,
> **Was fehlt?** – und in welcher Reihenfolge das angegangen wird.
> `KONTEXT.md` beschreibt den Ist-Zustand, diese Datei den Weg nach vorn.

**Wichtiger Vorbehalt:** Dieser Plan ist aus `KONTEXT.md` abgeleitet, nicht aus
dem Quellcode. Punkte, die eine Prüfung am Code brauchen, sind mit **[prüfen]**
markiert. Wer sie ohne Prüfung als Fakt weitergibt, baut auf Sand.

**Aufwandsskala:** **S** = eine Sitzung (< 2 h) · **M** = ein halber bis ganzer
Tag · **L** = mehrere Sitzungen, braucht vorher eine eigene Skizze.

---

## 0. Der kürzeste Weg durch dieses Dokument

Wenn nur eine Stunde Zeit ist: **§2 Block A**, Punkt A1 und A2. Das sind die
beiden Dinge, die bei Nichtstun teurer werden statt billiger.

Reihenfolge insgesamt:

```
A. Hygiene (jetzt)      → B. Struktur (danach)   → C. Produkt (dann)
   uncommittetes CSS       app.js entflechten       neue Funktionen
   README-Drift            Testlücken schließen     aus §4
   Testzahl klären         Fehlerpfade absichern
```

---

## 1. Bestandsaufnahme – was FunRun heute kann

Gruppiert nach dem, was der Nutzer erlebt, nicht nach Dateien.

### 1.1 Läufe erfassen

| Funktion | Träger | Reifegrad |
|---|---|---|
| Lauf manuell eintragen (Distanz, Datum, Uhrzeit, Dauer, Pace) | `validation.js`, `storage.js` | rund |
| GPS-Aufzeichnung live über `watchPosition` | `tracker.js`, `geo.js` | rund, aber Fehlerpfade dünn **[prüfen]** |
| Stoppuhr ohne GPS | `stopwatch.js` | rund |
| Intervall-Stoppuhr mit Phasen, Tönen, runder Ansicht | `interval.js`, `beep.js` | jung (zuletzt repariert) |
| Tastensperre während der Aufzeichnung | `lock.js` | rund |
| Bildschirm wach halten | `wake-lock.js` | rund |
| Route als SVG aus der GPS-Spur | `route.js` | rund, max. 500 Punkte |
| Lauf bearbeiten / löschen | `storage.js`, `app.js` | rund |

### 1.2 Gamification

| Funktion | Träger | Reifegrad |
|---|---|---|
| XP: 10 pro km, 3 pro Übung/Tag, 15 pro Einheit, 100 pro Zielwoche | `xp.js`, `exercise-log.js`, `training.js`, `goal.js` | rund, gut getestet |
| Level & Aufstiegskosten `40 + 20×N` | `xp.js` | rund |
| Titel und 6 Rang-Abzeichen, endlos ab Level 80 | `titles.js` | rund |
| 62 Trophäen in 3 Kategorien | `achievements.js` | rund, wächst stetig |
| Freischaltdaten per Replay | `history.js` | rund, aber **O(n²)** – siehe B4 |

### 1.3 Training & Übungen

| Funktion | Träger | Reifegrad |
|---|---|---|
| Trainingsplan: Einheiten planen, 5 Typen | `training.js` | rund |
| Plantreue-Abgleich ab 80 % Zielerfüllung | `training.js` | rund |
| Übungsbibliothek: 27 Übungen, 5 Kategorien | `exercises.js` | fest verdrahtet, siehe C6 |
| Übungen abhaken, Tageslimit, Zähler korrigieren | `exercise-log.js` | rund |
| Tagesplan für Übungen | `exercise-plan.js` | rund |

### 1.4 Auswertung

| Funktion | Träger | Reifegrad |
|---|---|---|
| Summen, Serien (Tage/Wochen), Zeitreihen nach Woche/Monat | `stats.js` | rund |
| Aktivitätsraster (18 Wochen) | `stats.js`, `app.js` | jung |
| Pace-Verlauf | `stats.js`, `app.js` | jung |
| Bestzeiten über 6 Standarddistanzen | `stats.js` | jung |
| Wochenziel + Bonus | `goal.js` | rund |

### 1.5 Drumherum

| Funktion | Träger | Reifegrad |
|---|---|---|
| Export/Import als JSON, Legacy-Format wird gelesen | `transfer.js` | rund |
| Teilen-Karte 1080×1350 auf Canvas | `share-card.js` | rund |
| PWA: Installierbar, App-Shell-Cache, Update-Hinweis | `sw.js`, `pwa.js` | rund, aber manuell (A2) |
| Profil: Name, Wochenziel | `storage.js` | minimal |

**Das architektonische Tafelsilber:** 20 von 24 Modulen sind pur – kein DOM,
kein Storage. Deshalb laufen die Tests ohne Browser, ohne Framework, ohne
Installation. Diese Eigenschaft ist der Grund, warum das Projekt trotz
fehlendem Build-Step wartbar ist. **Jede Änderung, die sie aufweicht, ist ein
Rückschritt – auch wenn sie kurzfristig bequem ist.**

---

## 2. Block A – Hygiene (jetzt, vor allem anderen)

Das sind keine Features. Das sind die Dinge, die im Weg stehen.

### ✅ A1 · Uncommittetes CSS klären · `css/style.css`

`KONTEXT.md` §7 meldet: `style.css` ist nach dem letzten Commit verändert
(Datei 2026-08-21, Commit 2026-08-16). Fünf Tage nicht committete Arbeit an
einer 61-KB-Datei ist der klassische Weg, versehentlich etwas zu verlieren oder
später nicht mehr zu wissen, warum eine Regel dort steht.

**Befund:** Der gesamte Unterschied war **eine gelöschte CSS-Regel**,
`.stat dd.stat-note`, sieben Zeilen. Alle anderen App-Dateien waren
byte-identisch mit dem Commit. Die Klasse `stat-note` kommt im ganzen Projekt
nicht mehr vor – weder in `index.html` noch in `app.js` noch in den Tests. Es
war toter Code, vermutlich beim Umbau der Profil-Statistik übrig geblieben.

**Ergebnis:** Löschung behalten. `CACHE_VERSION` mitgezogen, obwohl die Regel
keine Wirkung hatte – die Regel aus §6 ist absolut formuliert, und Ausnahmen
sind der Anfang vom Vergessen.

**Commit:** `e99b96a`. `css/style.css` steckte auch in B2 und wurde auf die
beiden Commits aufgeteilt – hier nur die gelöschte Regel.

### ✅ A2 · README auf Stand bringen · `README.md`

`KONTEXT.md` §9 listet die Drift: „17 Achievements" statt 62, „464 Tests" mit
unklarer Zahl, kein Wort zu Intervall-Stoppuhr, Wochenziel, Teilen-Karte,
Bestzeiten, Aktivitätsraster, Pace-Verlauf, Profilname; die Struktur-Liste kennt
vier existierende Module nicht.

**Warum das mehr als Kosmetik ist:** Ein README, dem man nicht trauen kann, ist
schlechter als keins – es kostet jeden Leser (auch dich in sechs Monaten) die
Zeit, die Lüge erst zu entdecken. Und es ist die einzige Datei, die ein Fremder
sieht, wenn er auf das GitHub-Repo stößt.

**Ergebnis:** 573 → 815 Zeilen. Alle Zahlen am Code nachgezählt: 62 Trophäen
(nicht 17), 706 Tests (nicht 464), 14 Übungs-Trophäen (nicht 4), 24 Module
(nicht 21). Neue Abschnitte für Wochenziel, Intervall-Vorgabe,
Intervall-Stoppuhr, Stoppuhr ohne GPS, Übungs-Tagesplan, Teilen-Karte,
Aktivitätsraster, Pace-Verlauf, Bestzeiten und Profilname, dazu Tabellen der
Speicherschlüssel und der XP-Quellen. Ein Prüfskript gleicht jede genannte
Datei, Konstante, Testdatei und jedes Modul gegen den Code ab.

**Nebenbefund:** `KONTEXT.md` §5 führte die Session-Typen als
Beschriftungen (`dauerlauf`, `longrun` …) statt als IDs (`easy`, `long` …).
Korrigiert.

### ✅ A3 · Tatsächliche Testzahl feststellen · `tests/`

**Ergebnis:** **706 Tests in 22 Dateien**, alle grün – nicht 464 in 17 Dateien.
Nach den Arbeiten an A4 und B2 sind es **725**. In README und `KONTEXT.md`
eingetragen.

### ✅ A4 · `CACHE_VERSION`-Disziplin absichern · `tests/`, `sw.js`

Schritt 5 der Checkliste (`CACHE_VERSION` hochzählen) ist der Schritt, den man
am leichtesten vergisst und dessen Vergessen am teuersten ist: Man sucht den
Fehler auf dem Handy im falschen Code.

**Ergebnis:** Fünf Tests in `tests/pwa.test.mjs` (dort steht schon der Block,
der `sw.js` als Quelltext prüft – keine neue Datei nötig). Der Test liest die
Verzeichnisse statt einer gepflegten Liste und wächst deshalb von selbst mit:

- jedes Modul in `js/` steht in `APP_SHELL`
- jedes Icon und Abzeichen steht drin
- `./`, `index.html`, `style.css`, `manifest.json` stehen drin
- kein Eintrag zeigt ins Leere (`addAll()` ist alles oder nichts – ein
  Tippfehler verhindert, dass überhaupt etwas gecacht wird)
- kein Eintrag steht doppelt

Gegengeprüft: eine Testdatei in `js/` angelegt → Test wird rot, Datei entfernt
→ wieder grün. `APP_SHELL` war zum Zeitpunkt der Prüfung vollständig.

**Nicht gemacht:** der Git-Pre-Commit-Hook. Hooks werden nicht mit dem Repo
geteilt und müssten auf jedem Rechner von Hand eingerichtet werden – für ein
Ein-Personen-Projekt mehr Aufwand als Nutzen. Der Test läuft dagegen immer.

---

## 3. Block B – Struktur (nach Block A)

### B1 · `js/app.js` entflechten · **L** · `js/app.js` → neue Module

**Das Problem:** 4.092 Zeilen, 176 Funktionen, alle modulintern. `KONTEXT.md`
selbst sagt: „dort **nie** komplett lesen". Eine Datei, die man nicht mehr lesen
kann, ist eine Datei, in der Fehler wohnen können, ohne gefunden zu werden. Und
sie ist der einzige Ort, für den es keine Tests gibt – weil DOM.

**Was zu tun ist, in dieser Reihenfolge:**

1. **Nichts umschreiben, sondern zuerst aufteilen.** `app.js` in
   `js/views/*.js` zerlegen, entlang der Bereiche aus §4 von `KONTEXT.md`:
   `views/runs.js`, `views/training.js`, `views/exercises.js`,
   `views/trophies.js`, `views/profile.js`, `views/interval.js`,
   `views/share.js`, `views/transfer-ui.js`, `views/pwa-ui.js`. Übrig bleibt
   `app.js` als Verdrahtung: `init`, `bindTabs`, `setView`, `render`.
   Reines Verschieben, keine Logikänderung.
2. **Dabei zeigt sich, was noch Rechnen ist.** Jede Zeile in `app.js`, die
   rechnet statt anzuzeigen, gehört in ein pures Modul. Das ist der eigentliche
   Gewinn – nicht die kleineren Dateien, sondern die zusätzlich testbare Logik.
3. **`APP_SHELL` in `sw.js` nachziehen**, `CACHE_VERSION` hoch.

**Risiko, offen benannt:** Das ist der gefährlichste Punkt der ganzen Roadmap.
Ohne Build-Step bedeutet jede neue Datei einen zusätzlichen HTTP-Request beim
ersten Laden und einen Eintrag in `APP_SHELL`. Zehn neue Module heißt zehn
Chancen, einen Import-Pfad zu vertippen – und der Fehler zeigt sich erst zur
Laufzeit im Browser, nicht in `node --test`. **Deshalb: in mehreren Commits,
einen Bereich pro Commit, nach jedem Commit die Live-Seite öffnen.** Nicht an
einem Abend durchziehen.

**Alternative, falls das zu groß wirkt:** Nur die zwei größten Bereiche
herauslösen (Training-Formular ~430 Zeilen, Statistik/Visualisierung ~400
Zeilen). Das nimmt ein Fünftel der Datei weg bei einem Bruchteil des Risikos.
**Meine Empfehlung: mit dieser Variante anfangen**, und erst nach der Erfahrung
entscheiden, ob der Rest folgt.

### ✅ B2 · Fehlerpfade beim Speichern härten · `storage.js`, `app.js`

**Befund:** Alle sechs Speicherfunktionen hatten bereits ein `try/catch` – sie
**schluckten den Fehler aber still** und legten ihn nur auf die Konsole. Auf
einem Handy sieht die niemand. Der Speicher ist voll, der gerade beendete Lauf
ist weg, und die App tut, als sei nichts gewesen. Für eine App, in der eine
Stunde Laufen in einem einzigen `setItem` steckt, ist das der schlimmste
mögliche Ausgang.

**Was gebaut wurde:**

1. **Eine zentrale Schreibstelle** in `storage.js`: alle Töpfe laufen durch
   `schreibe()` bzw. `entferne()`, statt sechsmal leicht verschieden zu
   behandeln. Es gibt jetzt genau **ein** `localStorage.setItem` in der Datei.
2. **`setStorageErrorHandler(fn)`** – `app.js` hinterlegt beim Start eine
   Meldestelle. Absichtlich nur eine: zwei Melder hiessen zwei Meldungen für
   einen Fehler.
3. **`#storage-hint`** – ein Hinweis in Warnrot (`--danger`, der einzige
   Hinweis der App, der nicht neongrün ist) mit `role="alert"`. Der Text hängt
   am Grund: ein voller Speicher lässt sich durch Exportieren und Aufräumen
   beheben, ein gesperrter (Privatmodus) nicht.
4. **`saveRuns`, `saveExerciseLog`, `saveSessions` geben `boolean` zurück.**
   Bisher gaben sie `undefined` zurück – kein Bruch für bestehende Aufrufer.

**Feinheiten, die dabei auffielen:**

- Ein „Speicher voll" heisst in Chrome, Firefox und Safari verschieden
  (`QuotaExceededError`, `NS_ERROR_DOM_QUOTA_REACHED`, `code 22`, `code 1014`).
  Wer keine der Kennungen trägt, gilt als anderer Fehler – sonst schickte die
  Meldung Nutzer im Privatmodus Läufe löschen, was dort nichts hilft.
- Der Hinweis merkt sich **nicht**, dass er weggeklickt wurde. Das liesse sich
  nur dort ablegen, wo gerade nichts mehr ankommt.
- Eine kaputte Meldestelle darf den Aufrufer nicht mitreissen – ein Fehler beim
  Anzeigen der Fehlermeldung wäre ein besonders dummer Weg, Daten zu verlieren.
- `addRun()` gibt die Liste auch dann zurück, wenn nicht geschrieben wurde.
  Sonst wäre der Lauf im Speicher verloren **und** aus der Anzeige verschwunden.

**Tests:** +9 in `tests/storage.test.mjs`, +4 in `tests/styles.test.mjs`. Die
Attrappe in `tests/helpers.mjs` kann jetzt `failWrites()`.

**Nebenprodukt:** ein Test, der prüft, dass **jede in `app.js` per
`getElementById` angefragte ID im Markup existiert**. Das ist der erste Test
überhaupt, der `app.js` gegen etwas abgleicht – bisher war die Datei völlig
ungeprüft. Gegengeprüft: ID im HTML verfälscht → Test wird rot.

**Nicht gemacht:** die beiden anderen Fragen aus dem ursprünglichen Punkt –
verweigerte Standortfreigabe und eingefrorener Tab unter iOS. Beide lassen sich
in Node nicht nachstellen und brauchen einen Test am echten Gerät. Bleiben
offen, siehe B2b.

### B2b · GPS-Fehlerpfade am Gerät prüfen · **M** · `tracker.js`, `app.js` · **[prüfen]**

Was aus B2 übrig blieb und nur auf dem Handy zu beantworten ist:

- Was passiert bei verweigerter Standortfreigabe? Sieht der Nutzer eine
  verständliche Meldung oder passiert scheinbar nichts?
- Was, wenn iOS Safari den Tab im Hintergrund einfriert? Bleibt der laufende
  Lauf erhalten, oder ist er beim Zurückkommen weg?
- Wie voll ist der `localStorage` nach hundert GPS-Läufen tatsächlich? Die
  Rechnung sagt ~3 KB je Lauf – das wären erst bei einigen tausend Läufen
  kritisch. Einmal nachmessen, statt zu schätzen.

### B3 · Testabdeckung der jungen Module prüfen · **M** · `tests/`

`interval.js`, `beep.js`, `share-card.js`, `stopwatch.js` und die neuen
Statistik-Funktionen (`activityCalendar`, `paceTrend`, `bestTimes`) sind die
jüngsten Teile. Nach der Regel „geprüft wird an den Grenzen" gehört geprüft:
Pace-Trend mit exakt 2 vs. 3 Punkten (`PACE_TREND_MIN_POINTS`), Bestzeit bei
genau 0,1 km Toleranz, Intervall-Phase exakt am Umschaltpunkt, Raster über
Jahreswechsel. **[prüfen]** ob das schon existiert.

### B4 · `history.js` O(n²) beobachten · **S (messen) / M (beheben)** · `js/history.js`

`replayHistory()` spielt für jeden Lauf alle Trophäenbedingungen erneut durch.
Bei 200 Läufen ist das unauffällig, bei 2.000 nicht mehr – und es läuft bei
**jedem** Rendern.

**Jetzt:** nur messen. Ein Skript, das 2.000 synthetische Läufe erzeugt und die
Laufzeit misst. Liegt sie unter ~50 ms, ist das kein Problem und der Punkt wird
gestrichen. **Nicht optimieren, bevor gemessen wurde** – vorzeitige Optimierung
würde hier ausgerechnet das Modul verkomplizieren, dessen Monotonie-Annahme die
Freischaltdaten trägt.

### B5 · Barrierefreiheit stichprobenhaft prüfen · **M** · `index.html`, `css/style.css`

Der Kontrast (4,5:1) ist als Regel gesetzt – gut. Offen: Tastaturbedienbarkeit
der Tabs, `aria-live` für XP-/Level-Aufstiege (die App verkündet Freischaltungen
über `render({announceUnlocks})` – wird das auch vorgelesen?), Fokus-Sichtbarkeit
auf dem dunklen Hintergrund, `prefers-reduced-motion` für Animationen. **[prüfen]**

---

## 4. Block C – Produkt (danach)

Ideen, nach Verhältnis von Nutzen zu Aufwand sortiert. Alles hier ist optional –
FunRun ist heute schon eine vollständige App.

### Naheliegend (hoher Nutzen, kleiner Aufwand)

| # | Idee | Aufwand | Module |
|---|---|--:|---|
| C1 | **Automatischer Export als Erinnerung.** Ein Hinweis im Profil, wenn der letzte Export mehr als 30 Tage her ist. Die Daten liegen ausschließlich im `localStorage` eines Browsers – ein geleerter Cache, und alles ist weg. Das ist das größte reale Risiko der App. | S | `transfer.js`, `storage.js` (neuer Schlüssel `laufapp.export.v1`) |
| C2 | **Notiz und Gefühl pro Lauf.** Ein Freitextfeld und eine 1–5-Skala („wie war's?"). Öffnet später Auswertungen („Läufe, bei denen es sich gut anfühlte, waren im Schnitt 40 s/km langsamer"). | S | `validation.js`, `storage.js`, `app.js` |
| C3 | **Trophäen-Fortschritt anzeigen.** Statt nur offen/erfüllt: „78 / 100 km". Der stärkste Gamification-Hebel überhaupt – ein sichtbarer Fortschrittsbalken zieht deutlich mehr als ein verschlossenes Feld. Braucht pro Trophäe eine `progress(stats)`-Funktion neben der Bedingung. | M | `achievements.js`, `app.js` |
| C4 | **Wetter zum Lauf – manuell.** Vier Symbole zum Antippen. Kein API-Aufruf, keine Abhängigkeit, kein Backend. Passt zur Architektur. | S | `validation.js`, `app.js` |
| C5 | **Läufe filtern und suchen.** Nach Zeitraum, Distanzbereich, Quelle (GPS/manuell), Intervall. Wird ab ein paar hundert Läufen unverzichtbar. | M | `stats.js` oder neues `filter.js`, `app.js` |

### Mittelfristig

| # | Idee | Aufwand | Module |
|---|---|--:|---|
| C6 | **Eigene Übungen anlegen.** `exercises.js` ist heute fest verdrahtet. Nutzerübungen brauchen einen eigenen Speichertopf und eine ID-Strategie, die nicht mit den festen kollidiert (z. B. Präfix `user:`). | M | `exercises.js`, `storage.js` (`laufapp.custom-exercises.v1`) |
| C7 | **Trainingsplan-Vorlagen.** „5 km in 8 Wochen", „10 km Grundlage". Erzeugt fertige Sessions in die Zukunft. Hoher wahrgenommener Wert, weil es die leere Planungsseite füllt. | M | `training.js`, neues `plan-templates.js` |
| C8 | **Segmente & Splits.** Kilometer-Splits aus der GPS-Spur berechnen und anzeigen. Die Daten liegen bereits vor – es fehlt nur die Auswertung. Das ist die Funktion, die ernsthafte Läufer erwarten. | M | `geo.js`, `stats.js`, `app.js` |
| C9 | **Höhenmeter.** `watchPosition` liefert `altitude`. Ungenau (leicht ±10 m), aber über einen Lauf gemittelt brauchbar. **Ehrlich: GPS-Höhe ohne Barometer ist wackelig** – lieber als „ungefähr" beschriften als Präzision vortäuschen. | M | `geo.js`, `tracker.js`, `route.js` |
| C10 | **Helles Farbschema.** Alle Werte hängen schon an Custom Properties – die Vorarbeit ist getan. `prefers-color-scheme` plus manueller Schalter. | M | `css/style.css` |
| C11 | **Jahresrückblick.** Eine Seite „2026 in Zahlen" mit Teilen-Karte. Saisonal, aber emotional der stärkste Moment einer Lauf-App. | M | `stats.js`, `share-card.js` |

### Groß / später

| # | Idee | Aufwand | Bemerkung |
|---|---|--:|---|
| C12 | **Kartenansicht der Route** | L | Braucht Kartenkacheln → externe Abhängigkeit + Netzwerk. **Widerspricht dem Prinzip „keine Abhängigkeiten".** Nur machen, wenn dieses Prinzip bewusst aufgegeben wird. Die SVG-Route ohne Karte ist der ehrlichere Kompromiss. |
| C13 | **Geräteübergreifende Synchronisierung** | L | Braucht ein Backend. Ändert das Projekt fundamental (Konten, Datenschutz, Betriebskosten, DSGVO). **Meine Einschätzung: nicht machen.** Der Export/Import deckt 90 % des Bedarfs zu 1 % der Kosten. |
| C14 | **Import aus Strava / Garmin / GPX** | L→M | GPX-Import allein ist **M** und braucht kein Konto – nur einen XML-Parser für eine Datei, die der Nutzer selbst hochlädt. Das ist die 80/20-Variante und passt zur Architektur. Volle API-Anbindung wäre L und bricht die Abhängigkeitsfreiheit. |
| C15 | **Audio-Ansagen während des Laufs** | M | „1 Kilometer, 5:42." Über `SpeechSynthesis` – im Browser eingebaut, keine Abhängigkeit. Passt zu `beep.js`. Praktisch der größte Zugewinn beim tatsächlichen Laufen. |

---

## 5. Empfohlene Reihenfolge

| Schritt | Was | Aufwand | Stand |
|--:|---|--:|---|
| 1 | **A1** CSS committen oder verwerfen | S | ✅ erledigt |
| 2 | **A3** Testzahl feststellen, **A4** APP_SHELL-Test | S+S | ✅ erledigt |
| 3 | **A2** README auf Stand | M | ✅ erledigt |
| 4 | **B2** Speicher-Fehlerpfade härten | M | ✅ erledigt |
| — | **committen und pushen** | S | ✅ erledigt |
| 5 | **C1** Export-Erinnerung | S | ⬅ **als Nächstes** |
| 6 | **B3** Testlücken der jungen Module | M | offen |
| 7 | **B1** app.js entflechten – **kleine Variante** (Training + Statistik) | M | offen |
| 8 | **C3** Trophäen-Fortschritt | M | offen |
| 9 | **C2** Notiz & Gefühl, **C4** Wetter | S+S | offen |
| 10 | **B4** history.js messen | S | offen |
| 11 | **B2b** GPS-Fehlerpfade am Gerät prüfen | M | offen |
| 12 | danach frei nach Lust: C5, C8, C10, C15 | – | offen |

### Die vier Commits – erledigt am 2026-08-21

Ein Punkt = ein Commit (§6, Regel 1). So sind sie gefallen:

| # | Roadmap | Commit | Betreff |
|--:|---|---|---|
| 1 | A1 | `e99b96a` | Tote Regel fuer stat-note entfernt |
| 2 | A2 | `56ecd94` | README auf den Stand des Codes gebracht |
| 3 | A4 | `09217d2` | APP_SHELL gegen den Dateibaum pruefen |
| 4 | B2 | `28b277a` | Fehlgeschlagenes Speichern wird sichtbar |

`css/style.css` wurde **sauber getrennt**: die gelöschte Regel in Commit 1,
die `.storage-hint`-Regel in Commit 4. Interaktives `git add -p` war dafür
nicht nötig – der Hunk lässt sich als gefilterter Patch mit
`git apply --cached` in den Index legen, das Ergebnis ist identisch. Der oben
befürchtete Kompromiss ("Regel einen Commit zu früh im Baum") war also nicht
nötig. **Für den nächsten Fall gemerkt:** eine Datei in zwei Commits zu
trennen kostet nichts, auch ohne interaktives Git.

`KONTEXT.md` und `ROADMAP.md` kamen mit Commit 4 in die Versionierung –
beide beschreiben denselben Stand und liefen sonst auseinander.

**Gegengeprüft, statt es anzunehmen:**

- Jeder der vier Commits ist für sich grün (706 / 706 / 711 / 725 Tests),
  geprüft in einem temporären Worktree. Ohne das taugt ein späteres
  `git bisect` nichts.
- Der `APP_SHELL`-Test schlägt wirklich an: Datei in `js/` angelegt → rot,
  entfernt → grün.

**Dabei aufgefallen:** A3 oben behauptet, die 725 seien "in README und
`KONTEXT.md` eingetragen". In `KONTEXT.md` ja – im README standen noch 706
und die Tabellenzeilen für `styles` (38), `storage` (34) und `pwa` (24), also
der Stand vor A4 und B2. Genau die Drift, gegen die A2 antritt. In Commit 2
mitkorrigiert: 725 als Kopfzahl, 43 / 43 / 29 in der Tabelle, Tabelle neu
absteigend sortiert. Die Tabellensumme stimmt jetzt mit `node --test` überein.

**Die Logik dahinter:** Erst das, was bei Nichtstun teurer wird (A1, A2). Dann
das, was Datenverlust verhindert (B2, C1) – denn eine Lauf-App, die Läufe
verliert, hat keine zweite Chance. Dann Struktur, solange die App klein genug
ist, dass Umbauen noch billig ist (B1). Neue Funktionen zuletzt, weil sie auf
allem darüber aufsetzen.

**Was ich weglassen würde:** C12 (Karte) und C13 (Sync). Beide brechen das
Prinzip, das dieses Projekt trägt – keine Abhängigkeiten, kein Backend. Der
Gewinn rechtfertigt den Bruch nicht.

---

## 6. Regeln für jede Änderung aus dieser Roadmap

Zusätzlich zur Checkliste in `KONTEXT.md` §8:

1. **Ein Punkt = ein Commit.** Keine Sammel-Commits über mehrere Roadmap-Punkte.
2. **Vor dem Anfangen den Punkt hier abhaken**, nach dem Push `KONTEXT.md` §7
   und §11 nachziehen.
3. **Bei jedem neuen persistierten Feld:** `transfer.js` mitziehen, sonst geht
   das Feld beim Export/Import verloren. Das ist der Fehler, den man erst
   bemerkt, wenn jemand seine Daten wiederherstellt.
4. **Bei jedem neuen Modul:** Testdatei anlegen *und* `APP_SHELL` in `sw.js`
   ergänzen. Beides, nicht eins.
5. **[prüfen]-Punkte** werden am Code verifiziert, bevor sie eingeplant werden.

---

## 7. Änderungsverlauf

| Datum | Änderung |
|---|---|
| 2026-08-21 | Erstfassung, abgeleitet aus `KONTEXT.md` (Stand `funrun-v44`) |
| 2026-08-21 | A1, A2, A4 und B2 committet und gepusht (`e99b96a` … `28b277a`). Kopf, §2 (A1), §5-Tabelle und der Commit-Block auf den Stand danach gezogen. `css/style.css` sauber getrennt statt zusammengelegt. Nächster Punkt: **C1**. |
