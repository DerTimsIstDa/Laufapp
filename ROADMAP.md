# FunRun – Leitfaden & Roadmap

> **Stand: 2026-08-21** · Grundlage: `KONTEXT.md` (Stand `funrun-v50`, 62 Trophäen, 27 Übungen)
>
> **Fortschritt: A1, A2, A3, A4, B1, B2, B3 und C1 sind erledigt und
> committet** – siehe §5. Der nächste Punkt ist **C3** (Trophäen-Fortschritt).
>
> Diese Datei beantwortet drei Fragen: **Was gibt es?**, **Was ist schwach?**,
> **Was fehlt?** – und in welcher Reihenfolge das angegangen wird.
> `KONTEXT.md` beschreibt den Ist-Zustand, diese Datei den Weg nach vorn.

**Wichtiger Vorbehalt:** Die Erstfassung dieses Plans war aus `KONTEXT.md`
abgeleitet, nicht aus dem Quellcode. Was seither erledigt wurde (Block A, B1,
B2, B3, C1), ist am Code geprüft. Alles **Offene** ist es nicht – Punkte, die vor
der Umsetzung eine Prüfung brauchen, sind mit **[prüfen]** markiert. Wer sie ohne
Prüfung als Fakt weitergibt, baut auf Sand.

**Aufwandsskala:** **S** = eine Sitzung (< 2 h) · **M** = ein halber bis ganzer
Tag · **L** = mehrere Sitzungen, braucht vorher eine eigene Skizze.

---

## 0. Wo wir stehen

**Block A ist vollständig abgeschlossen.** Aus Block B sind B1, B2 und B3
erledigt, aus Block C der Punkt C1. Alles davon ist committet.

```
A. Hygiene              B. Struktur               C. Produkt (hier sind
   ✅ A1 CSS geklärt       ✅ B1 app.js geteilt       wir gerade)
   ✅ A2 README            ✅ B2 Speicherfehler       ✅ C1 Sicherungs-
   ✅ A3 Testzahl          ✅ B3 Testlücken             erinnerung
   ✅ A4 APP_SHELL         ○ B4, B5, B2b            ⬅ C3 Trophäen-
                                                      Fortschritt
                                                    ○ C2, C4–C15 offen
```

**B1 ist in der kleinen Variante umgesetzt**: Trainingsformular und Statistik
liegen jetzt in `js/views/`, dazu die Markup-Verweise und die Formatierung.
`app.js` ist von 4.132 auf **3.091 Zeilen** geschrumpft, ein Viertel weniger.
Das Ergebnis samt der Frage, ob der Rest folgen soll, steht in §3.

**Der nächste Punkt ist C3** – ein Fortschrittsbalken an den Trophäen. Nach
drei Schritten an der Struktur ist das wieder etwas, das man sieht.

Die vollständige Reihenfolge mit Stand steht in **§5**.

---

## 1. Bestandsaufnahme – was FunRun heute kann

Gruppiert nach dem, was der Nutzer erlebt, nicht nach Dateien.

### 1.1 Läufe erfassen

| Funktion | Träger | Reifegrad |
|---|---|---|
| Lauf manuell eintragen (Distanz, Datum, Uhrzeit, Dauer, Pace) | `validation.js`, `storage.js` | rund |
| GPS-Aufzeichnung live über `watchPosition` | `tracker.js`, `geo.js` | rund; Speicherfehler werden gemeldet (B2), GPS-Fehlerpfade offen (B2b) |
| Stoppuhr ohne GPS | `stopwatch.js` | rund |
| Intervall-Stoppuhr mit Phasen, Tönen, runder Ansicht | `interval.js`, `beep.js` | rund; seit B3 beide testgeprüft |
| Tastensperre während der Aufzeichnung | `lock.js` | rund |
| Bildschirm wach halten | `wake-lock.js` | rund; Fehlerpfade seit B3 geprüft |
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
| Aktivitätsraster (18 Wochen) | `stats.js`, `app.js` | rund; Jahreswechsel seit B3 geprüft |
| Pace-Verlauf | `stats.js`, `app.js` | rund; Wochen/Monats-Grenze seit B3 geprüft |
| Bestzeiten über 6 Standarddistanzen | `stats.js` | rund, Toleranzgrenze geprüft |
| Wochenziel + Bonus | `goal.js` | rund |

### 1.5 Drumherum

| Funktion | Träger | Reifegrad |
|---|---|---|
| Export/Import als JSON, Legacy-Format wird gelesen | `transfer.js` | rund |
| Erinnerung an die Sicherung nach 30 Tagen | `transfer.js`, `storage.js` | neu (C1) |
| Warnung bei fehlgeschlagenem Speichern | `storage.js`, `app.js` | neu (B2) |
| Teilen-Karte 1080×1350 auf Canvas | `share-card.js` | rund |
| PWA: Installierbar, App-Shell-Cache, Update-Hinweis | `sw.js`, `pwa.js` | rund; `APP_SHELL` seit A4 testgeprüft, `CACHE_VERSION` weiterhin von Hand |
| Profil: Name, Wochenziel | `storage.js` | minimal |

**Das architektonische Tafelsilber:** 20 von 28 Modulen sind pur – kein DOM,
kein Storage. Deshalb laufen die Tests ohne Browser, ohne Framework, ohne
Installation. Diese Eigenschaft ist der Grund, warum das Projekt trotz
fehlendem Build-Step wartbar ist. **Jede Änderung, die sie aufweicht, ist ein
Rückschritt – auch wenn sie kurzfristig bequem ist.**

> **Zur Zahl:** Vor B1 stand hier „20 von 24". Die Module sind jetzt 28, weil
> B1 vier neue angelegt hat – drei davon fassen das DOM an. Rein gewonnen hat
> nur `format.js`. Der Anteil sieht damit schlechter aus, der Zustand ist es
> nicht: dieselbe DOM-Logik liegt jetzt in vier lesbaren Dateien statt in einer
> von 4.132 Zeilen, und mit `format.js` ist zum ersten Mal etwas aus `app.js`
> testbar geworden. **Wer diesen Anteil als Kennzahl liest, misst das Falsche.**

---

## 2. ✅ Block A – Hygiene (abgeschlossen)

Das waren keine Features, sondern die Dinge, die im Weg standen. **Alle vier
Punkte sind erledigt, committet und gepusht** – die Abschnitte hier bleiben als
Protokoll stehen, damit nachvollziehbar ist, was gefunden und entschieden
wurde.

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

## 3. Block B – Struktur

**Stand:** B1, B2 und B3 ✅ erledigt · B2b, B4, B5 offen. Keiner der drei steht
als Nächstes an – die Reihenfolge geht erst über C3, C2 und C4 (siehe §5).

### ✅ B1 · `js/app.js` entflechten · `js/app.js` → `js/views/`, `js/format.js`

**Das Problem war:** 4.132 Zeilen, alle Funktionen modulintern. `KONTEXT.md`
selbst sagte: „dort **nie** komplett lesen". Eine Datei, die man nicht mehr lesen
kann, ist eine Datei, in der Fehler wohnen können, ohne gefunden zu werden. Und
sie war der einzige Ort, für den es keine Tests gab – weil DOM.

**Umgesetzt wurde die kleine Variante**, in drei Commits, nach jedem ein
Browser-Durchlauf:

| Datei | Zeilen | Was |
|---|--:|---|
| `js/format.js` | 85 | rein: Intl-Formatierer, `todayIso`, `formatDate`, `round`, `r1`, `formatDays`, `formatMonth`, `formatAveragePace` |
| `js/views/dom.js` | 242 | die `getElementById`-Verweise, `SVG_NS`, `createSvg` |
| `js/views/training.js` | 498 | Trainingsformular, Planliste, Löschrückfrage |
| `js/views/stats.js` | 422 | Profil-Kennzahlen, Aktivitätsraster, Pace-Verlauf, Bestzeiten, Trophäen-Übersicht |

`app.js`: **4.132 → 3.091 Zeilen**, ein Viertel weniger. Reines Verschieben –
geändert wurden nur die Stellen, die auf gemeinsamen Zustand zugreifen.

**Wie die Ansichten an den Zustand kommen.** Nicht per Import: ein Import wäre
der Wert zum Ladezeitpunkt, und `runs` und `sessions` werden bei jeder Änderung
neu zugewiesen. Stattdessen zwei Wege, je nach Bedarf:

- `views/stats.js` **liest nur** und bekommt die Läufe als Parameter. Ihr
  einziger Klick-Handler kommt ohne sie aus.
- `views/training.js` **schreibt auch**, und ihre Handler feuern lange nach dem
  Rendern. Sie bekommt einmal in `init()` ein Objekt mit Zugriffsfunktionen
  (`getRuns`, `getSessions`, `setSessions`, `render`).

**Regel für den Rest:** Wächst dieses Objekt bei einer weiteren Ansicht deutlich,
holt sich die Ansicht zu viel aus `app.js` – dann ist der Schnitt falsch gelegt.

**Der eigentliche Gewinn war nicht die kleinere Datei, sondern das Getestete.**
`format.js` ist rein und hat jetzt eine Testdatei; dabei kamen zwei Verhalten
ans Licht, die vorher niemand kannte: `round(1.005)` ergibt **1** und nicht 1,01,
weil `1.005 * 100` als Gleitkommazahl knapp unter der Hälfte liegt, und
`formatMonth` schreibt **„Aug. 2026" mit Punkt**, weil de-DE so abkürzt.

**Das Risiko war richtig benannt, die Abwehr fehlte.** Ein vertippter
Import-Pfad fällt ohne Build-Step erst im Browser auf. Deshalb gibt es jetzt
`tests/imports.test.mjs`: liest die Importe aller Module aus dem Quelltext und
prüft Pfad **und** Namen gegen den Dateibaum. Gegengeprüft mit einem erfundenen
Namen und einem falschen Pfad – beide werden rot.

**Was dabei dreimal schiefging und beim nächsten Mal nicht mehr soll:** Drei
Tests suchten Regeln in `js/app.js`, weil das bis dahin dieselbe Datei war wie
„die App". Nach dem Verschieben suchten sie in der falschen Datei. Der
Pace-Verlauf-Test wurde rot und fiel auf – die beiden anderen (`APP_SHELL` liest
`js/` nicht rekursiv, `getElementById` steht nicht mehr in `app.js`) wären
**stillschweigend grün geblieben**, weil sie nichts mehr gefunden hätten. Seither
steht `quelltextDerModule()` in `tests/helpers.mjs` und liest `js/` rekursiv.

> **Für jede weitere Aufteilung:** Nach dem Verschieben `grep` auf den
> Funktionsnamen in `tests/` – findet sich dort ein fest verdrahteter Dateipfad,
> ist der Test nach dem Umzug wertlos, ohne rot zu werden.

**Soll der Rest folgen?** Die Erfahrung sagt: ja, aber nicht als Nächstes. Die
drei Schritte gingen glatt, und die beiden Ansichten sind jetzt lesbar. Die
verbleibenden 3.091 Zeilen sind aber immer noch mehr, als sich am Stück lesen
lässt – der nächste Kandidat wäre der Übungen-Bereich (~580 Zeilen), danach
Intervall-Schirm und Lauf-Liste. Erst kommen jedoch drei sichtbare Punkte aus
Block C: nach drei Commits ohne jede Änderung für den Nutzer ist das dran.

**Nicht mitgemacht:** `paceScale()` und `formatTrendPoint()` in `views/stats.js`
rechnen und wären als reine Funktionen testbar. Sie hängen aber an der
Diagramm-Geometrie direkt darüber, und der Punkt hieß „kleine Variante". Wer den
Rest von B1 angeht, nimmt sie mit.

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

### ✅ B3 · Testabdeckung der jungen Module prüfen · `tests/`

**Befund zuerst, denn er war anders als vermutet.** Von den vier genannten
Grenzen waren zwei längst geprüft – die Bestzeit bei genau 0,1 km Toleranz und
die Intervall-Phase exakt am Umschaltpunkt. Der Verdacht aus dem ursprünglichen
Punkt war also zur Hälfte falsch, und ohne das **[prüfen]** wären hier
Doppelungen entstanden.

**Die eigentliche Lücke lag woanders: zwei Module hatten überhaupt keine
Testdatei.** `beep.js` (109 Zeilen) und `wake-lock.js` (42 Zeilen) standen seit
ihrer Entstehung ungeprüft im Baum – nicht schwach getestet, sondern gar nicht.
Regel 3 aus §6 („bei jedem neuen Modul: Testdatei anlegen *und* `APP_SHELL`
ergänzen") war bei beiden nur zur Hälfte befolgt worden. Genau das ist der
Grund, warum diese Regel „beides, nicht eins" sagt: die `APP_SHELL`-Hälfte
fällt sofort auf, weil die App sonst offline nicht startet. Die Test-Hälfte
fällt nie auf.

**Was gebaut wurde – 749 → 802 Tests, 22 → 24 Dateien:**

| Datei | neu | was jetzt geprüft ist |
|---|--:|---|
| `tests/beep.test.mjs` | +19 | ganze Datei neu |
| `tests/wake-lock.test.mjs` | +13 | ganze Datei neu |
| `tests/stats.test.mjs` | +7 | Wochen/Monats-Grenze, Jahreswechsel in beiden Ansichten |
| `tests/interval.test.mjs` | +5 | letzte Zehntelsekunde, entartete Vorgaben |
| `tests/stopwatch.test.mjs` | +5 | doppelte Pause, Fortsetzen zur Unzeit, Rundung |
| `tests/share-card.test.mjs` | +4 | Balken über 100 %, ungerade Kachelzahl |

**Kein Produktivcode angefasst.** `js/` ist byte-identisch mit dem Stand davor,
`CACHE_VERSION` bleibt auf `funrun-v47`: keine Datei aus `APP_SHELL` hat sich
geändert, es gibt also nichts, was ein Handy neu laden müsste. Schritt 5 der
Checkliste ist hier ausnahmsweise wirklich gegenstandslos – nicht, weil die
Änderung klein war, sondern weil sie die ausgelieferte App nicht berührt.

**Was in `beep.js` zu prüfen war und warum es lohnte:**

- Der `AudioContext` liegt in einer Modulvariablen und wird genau einmal
  erzeugt. Ein Test mit anderem Ausgangszustand (kein Web Audio, gesperrtes
  Audio) muss das Modul deshalb frisch laden – über eine eindeutige
  Import-Adresse, `../js/beep.js?frisch=3`. Der einzige Ort im Projekt, an dem
  der Modul-Cache umgangen wird.
- **Die Rampe darf nie bei 0 beginnen.** `exponentialRampToValueAtTime(0, …)`
  wirft im Browser – in Node fiele das nie auf, weil dort niemand rampt. Der
  Test hält den Wert `0.0001` fest, der genau deshalb dort steht.
- Ein suspendierter Kontext erzeugt gar nicht erst Oszillatoren. Das ist der
  iOS-Fall vor der ersten Nutzeraktion.
- Ein `AudioContext`-Konstruktor, der wirft, darf die App nicht mitreissen.

**Was in `wake-lock.js` zu prüfen war:** die drei Wege, auf denen das Ding auf
echten Geräten scheitert – kein `navigator.wakeLock` (jeder ältere Browser),
ein abgelehnter Lock (Akkusparmodus), ein Fehler beim Freigeben. Dazu die
Rückkehr in den Tab: der Lock wird nur zurückgeholt, **wenn noch aufgezeichnet
wird**. Fiele diese Bedingung weg, hielte die App den Bildschirm nach jedem
beendeten Lauf wach.

**Nebenbefund, nicht behoben:** In `phaseAt()` steht
`phaseProgress: phaseSeconds === 0 ? 1 : imPhase / phaseSeconds`. Die
Bedingung ist **unerreichbar**. Eine Phase der Länge 0 wird nie betreten: bei
`restSeconds === 0` ist `imZyklus < workSeconds` immer wahr, bei
`workSeconds === 0` immer falsch, und sind beide 0, greift der Ende-Zweig
davor. Der Zweig ist toter Code. Er wurde **stehen gelassen** – B3 ist
Testarbeit, und eine Änderung an `phaseAt()` gehört nicht in einen Commit, der
nur Tests anlegt. Stattdessen steht die Invariante jetzt als Test da („eine
Phase der Länge null kommt nie an die Reihe"): wer die Phasenlogik ändert,
wird rot, statt still ein `NaN` in die Anzeige zu schreiben.

**Gegengeprüft, statt es anzunehmen.** Jeder neue Testblock wurde gegen eine
absichtlich verfälschte Stelle im Quelltext laufen gelassen – ein Test, der
nicht rot wird, wenn der Code kaputtgeht, prüft nichts. Rot wurden: `!erlaubt`
aus `tone()` entfernt · Rampe auf 0 gesetzt · `suspended`-Prüfung entfernt ·
`lock = null` im `release()` gestrichen · `isActive()` aus dem
Sichtbarkeitswechsel gestrichen · `PACE_TREND_WEEK_SPAN` von 12 auf 11 ·
Monatsjahr fest verdrahtet · Rasterbeginn um einen Tag verschoben ·
Prozent-Deckel der Teilen-Karte entfernt · Phasengrenze von `<` auf `<=` ·
`status !== 'paused'`-Wächter aus `resume()` entfernt.

**Dabei fiel auch die eine Stelle auf, an der die Gegenprobe zuerst log:** der
NaN-Test für `phaseProgress` blieb grün, obwohl der Schutz entfernt war – weil
er den Ende-Zweig traf und nicht den Ternär. Erst das führte zum Nebenbefund
oben. Ohne Gegenprobe stünde hier ein Test, der nichts prüft, und niemand
wüsste vom toten Zweig.

**Nicht gemacht:** `app.js` bleibt ungeprüft. Das ist keine Nachlässigkeit,
sondern der Punkt, den **B1** angeht – solange die Datei 4.092 Zeilen DOM ist,
lässt sich daran in Node nichts prüfen ausser dem, was `styles.test.mjs` schon
gegen den Quelltext abgleicht.

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

## 4. Block C – Produkt (hier stehen wir)

Ideen, nach Verhältnis von Nutzen zu Aufwand sortiert. Alles hier ist optional –
FunRun ist heute schon eine vollständige App.

**Stand:** C1 ✅ erledigt · C2 bis C15 offen. Der nächste Punkt der Reihenfolge
ist **C3**.

### Naheliegend (hoher Nutzen, kleiner Aufwand)

| # | Idee | Aufwand | Module |
|---|---|--:|---|
| ✅ C1 | **Erinnerung an die Sicherung.** Erledigt – siehe unten. | S | `transfer.js`, `storage.js`, `index.html`, `app.js` |
| C2 | **Notiz und Gefühl pro Lauf.** Ein Freitextfeld und eine 1–5-Skala („wie war's?"). Öffnet später Auswertungen („Läufe, bei denen es sich gut anfühlte, waren im Schnitt 40 s/km langsamer"). | S | `validation.js`, `storage.js`, `app.js` |
| C3 | **Trophäen-Fortschritt anzeigen.** Statt nur offen/erfüllt: „78 / 100 km". Der stärkste Gamification-Hebel überhaupt – ein sichtbarer Fortschrittsbalken zieht deutlich mehr als ein verschlossenes Feld. Braucht pro Trophäe eine `progress(stats)`-Funktion neben der Bedingung. | M | `achievements.js`, `app.js` |
| C4 | **Wetter zum Lauf – manuell.** Vier Symbole zum Antippen. Kein API-Aufruf, keine Abhängigkeit, kein Backend. Passt zur Architektur. | S | `validation.js`, `app.js` |
| C5 | **Läufe filtern und suchen.** Nach Zeitraum, Distanzbereich, Quelle (GPS/manuell), Intervall. Wird ab ein paar hundert Läufen unverzichtbar. | M | `stats.js` oder neues `filter.js`, `app.js` |

#### ✅ C1 · Erinnerung an die Sicherung

**Gebaut:** `exportReminder({lastExport, runCount, todayIso})` in
`transfer.js` – pur und ohne Uhr, damit sich jede Grenze prüfen lässt, ohne die
Systemzeit zu stellen. `loadLastExport`/`saveLastExport` in `storage.js` unter
`laufapp.export.v1`. Der Hinweis steht in der Karte „Daten sichern".

**Abweichung von der Idee oben:** nicht im Profil, sondern bei den
Sicherungs-Knöpfen. Die Abhilfe ist der Knopf direkt darunter; ein Hinweis,
dessen Abhilfe einen Tab weiter liegt, wird weggeklickt statt befolgt. Der
Start-Tab ist ausserdem der zuerst sichtbare.

**Entscheidungen, die beim Bauen anfielen:**

- **Ohne Läufe wird nicht erinnert.** Ein Hinweis, der zum Sichern von nichts
  auffordert, ist der schnellste Weg, dass er künftig übersehen wird.
- **Ein Import zählt als Sicherung** – in dem Moment existiert nachweislich
  eine Datei mit genau diesen Daten. Genommen wird der Tag des Imports, nicht
  das `exportedAt` aus der Datei: wer eine halbjährige Sicherung einliest,
  bekäme sonst sofort die Erinnerung, obwohl er gerade das Richtige getan hat.
- **Regel 3 (§6) greift hier bewusst nicht.** Der Tag wandert *nicht* in die
  Exportdatei. Er beschreibt nicht die Daten, sondern die Gewohnheit dieses
  einen Browsers – eine Datei, die ihn mitbrächte, erzählte einem frisch
  eingerichteten Gerät, es habe vor drei Tagen gesichert.
- Der Hinweis lässt sich **nicht wegklicken**. Er verschwindet, sobald
  exportiert wurde, und das ist der einzige Zustand, in dem er nichts mehr zu
  sagen hat.

**Zwei Fehler, die erst der Browser zeigte** – `node --test` war zu dem
Zeitpunkt grün:

1. `let lastExport` stand bei der Anzeige statt beim übrigen Modulzustand.
   `init()` läuft am Modulanfang und griff darauf zu, bevor die Deklaration
   initialisiert war – `ReferenceError`, und zwar für die **ganze App**, nicht
   nur für die Erinnerung.
2. Der Aufruf `renderExportReminder()` landete in `toggleDetail()` statt in
   `render()`, weil die Zeilenfolge `renderDetail(); renderRuns();` an beiden
   Stellen steht.

**Lehre daraus:** eine grüne Testsuite sagt über `app.js` weiterhin fast
nichts. Das ist genau der Punkt, den **B1** angeht.

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
| 5 | **C1** Export-Erinnerung | S | ✅ erledigt |
| 6 | **B3** Testlücken der jungen Module | M | ✅ erledigt |
| 7 | **B1** app.js entflechten – **kleine Variante** (Training + Statistik) | M | ✅ erledigt |
| 8 | **C3** Trophäen-Fortschritt | M | ⬅ **als Nächstes** |
| 9 | **C2** Notiz & Gefühl, **C4** Wetter | S+S | offen |
| 10 | **B4** history.js messen | S | offen |
| 11 | **B2b** GPS-Fehlerpfade am Gerät prüfen | M | offen |
| 12 | danach frei nach Lust: C5, C8, C10, C15 | – | offen |

### Die Commits – erledigt am 2026-08-21

Ein Punkt = ein Commit (§6, Regel 1). So sind sie gefallen:

| # | Roadmap | Commit | Betreff |
|--:|---|---|---|
| 1 | A1 | `e99b96a` | Tote Regel fuer stat-note entfernt |
| 2 | A2 | `56ecd94` | README auf den Stand des Codes gebracht |
| 3 | A4 | `09217d2` | APP_SHELL gegen den Dateibaum pruefen |
| 4 | B2 | `28b277a` | Fehlgeschlagenes Speichern wird sichtbar |
| 5 | – | `1134dca` | Kontext und Roadmap auf den Stand nach dem Push |
| 6 | C1 | `ddb579b` | Erinnerung an die Sicherung nach dreissig Tagen |
| 7 | – | `af9b35f` | Haekchen-Runde nach C1 nachgeholt |
| 8 | B3 | `a18a661` | Testluecken der jungen Module geschlossen |
| 9 | – | `63fe111` | Kontext und Roadmap auf den Stand nach dem Push |
| 10 | – | `411098f` | Doku-Commit kann nicht in der eigenen Tabelle stehen |
| 11 | B1 | `061d0ba` | app.js entflechten: Markup-Verweise und Formatierung heraus |
| 12 | B1 | `2378c00` | app.js entflechten: das Trainingsformular heraus |
| 13 | B1 | `96bfbf2` | app.js entflechten: die Statistik heraus |

**B1 hat drei Commits statt einem** – das ist keine Ausnahme von Regel 1 in §6,
sondern stand so im Punkt selbst: einen Bereich pro Commit, nach jedem Commit
die Seite im Browser öffnen. Genau so ist es gelaufen.

**Zahlendreher in `061d0ba`:** Die Nachricht sagt „4184 -> 3903 Zeilen". Richtig
ist **4.184 → 3.907** – die vier Zeilen, die der Dateikopf danach noch bekam,
sind nicht mitgezählt. Der Commit steht, die Zahl hier ist die geprüfte.

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
2. **Bei jedem neuen persistierten Feld:** `transfer.js` mitziehen, sonst geht
   das Feld beim Export/Import verloren. Das ist der Fehler, den man erst
   bemerkt, wenn jemand seine Daten wiederherstellt.
3. **Bei jedem neuen Modul:** Testdatei anlegen *und* `APP_SHELL` in `sw.js`
   ergänzen. Beides, nicht eins.
4. **[prüfen]-Punkte** werden am Code verifiziert, bevor sie eingeplant werden.

### Wenn ein Punkt fertig ist – die Häkchen-Runde

Ein erledigter Punkt steht an **sechs** Stellen in diesem Dokument. Wer nur die
offensichtliche abhakt, hinterlässt ein Dokument, das sich selbst widerspricht –
und das ist schlimmer als gar kein Häkchen, weil man ihm dann nicht mehr traut.

Die Runde, in dieser Reihenfolge:

| # | Wo | Was |
|--:|---|---|
| 1 | **§5 Reihenfolge** | Zeile auf `✅ erledigt`, und den ⬅ **als Nächstes**-Pfeil eine Zeile weiterschieben |
| 2 | **Der Punkt selbst** (§2/§3/§4) | `✅` vor die Überschrift, Aufwand raus, **Ergebnis** statt Vorhaben schreiben – was gefunden wurde, was entschieden wurde, was bewusst *nicht* gemacht wurde |
| 3 | **Die Block-Überschrift** | War es der letzte offene Punkt des Blocks? Dann `✅` und „(abgeschlossen)". Sonst die Stand-Zeile darunter anpassen |
| 4 | **§0 Wo wir stehen** | Schaubild und „nächster Punkt" nachziehen |
| 5 | **§1 Bestandsaufnahme** | Neue Funktion als Zeile ergänzen, geänderte Reifegrade anpassen |
| 6 | **§7 Änderungsverlauf** | Eine Zeile, was sich geändert hat |

Danach `KONTEXT.md` §7 (Zahlen, Commits) und §11 (Verlauf).

**Die eine Ausnahme:** Der Doku-Commit, der die Runde festhält, kann nicht in
der eigenen Tabelle stehen – er entsteht erst danach. Diese Zeile trägt die
*nächste* Runde nach, oder gar niemand. Keinen Live-Hash pflegen: GitHub Pages
liefert ohnehin immer den letzten Stand von `master`, und ein Hash in einer
Datei ist ab dem nächsten Commit falsch. Wer den echten Stand braucht, fragt
`git log`.

**Warum das eine Liste ist und keine gute Absicht:** Bei der letzten Runde
wurden §5 und die Einzelpunkte abgehakt, aber §0, die Block-Überschriften und
§1 blieben stehen – das Dokument behauptete oben noch, Block A stünde bevor,
während unten fünf Häkchen standen. Erledigtes zu markieren ist keine
Fleißaufgabe, sondern der halbe Zweck dieser Datei.

---

## 7. Änderungsverlauf

| Datum | Änderung |
|---|---|
| 2026-08-21 | Erstfassung, abgeleitet aus `KONTEXT.md` (Stand `funrun-v44`) |
| 2026-08-21 | Nachgezogen nach dem Push: Kopf auf `funrun-v47`, Commit-Tabelle um `1134dca` und C1 (`ddb579b`) ergänzt, §1 um Speicher-Warnung und Sicherungs-Erinnerung erweitert, GPS-Zeile auf den heutigen Stand gebracht. |
| 2026-08-21 | **Häkchen-Runde nachgeholt:** §0 neu geschrieben (behauptete noch, Block A stünde bevor), Block-Überschriften in §2/§3/§4 mit Stand versehen, falscher A2-Verweis in §1.5 korrigiert. Die Runde steht jetzt als Regel in §6 – sechs Stellen, damit sie nicht wieder halb gemacht wird. |
| 2026-08-21 | A1, A2, A4 und B2 committet und gepusht (`e99b96a` … `28b277a`). Kopf, §2 (A1), §5-Tabelle und der Commit-Block auf den Stand danach gezogen. `css/style.css` sauber getrennt statt zusammengelegt. Nächster Punkt: **C1**. |
| 2026-08-21 | **C1** umgesetzt und gepusht. §4 um den Ergebnisabschnitt ergänzt, §5-Tabelle nachgezogen. Nächster Punkt: **B3**. |
| 2026-08-21 | **B3** umgesetzt. §3 um den Ergebnisabschnitt ergänzt, §0/§1/§5 nachgezogen. Der Punkt war zur Hälfte falsch gestellt: zwei der vier genannten Grenzen waren längst geprüft, dafür hatten `beep.js` und `wake-lock.js` gar keine Testdatei. 749 → 802 Tests. Nächster Punkt: **B1**. |
| 2026-08-21 | Nachgezogen: `63fe111` in der Commit-Tabelle. §6 um die Ausnahme erweitert – ein Doku-Commit kann nicht in der eigenen Tabelle stehen, und ein Live-Hash in einer Datei ist ab dem nächsten Commit falsch. |
| 2026-08-21 | **B1** umgesetzt, kleine Variante, in drei Commits (`061d0ba`, `2378c00`, `96bfbf2`). `app.js` 4.132 → 3.091 Zeilen; neu sind `js/format.js` und `js/views/{dom,training,stats}.js`. §3 komplett neu geschrieben (Ergebnis statt Vorhaben, samt der Frage, ob der Rest folgt), §0 mit neuem Schaubild, §1.5 mit der Einordnung der Modul-Zahl, §5-Tabelle und Commit-Block nachgezogen. §1 bekam **keine** neue Zeile: B1 hat für den Nutzer nichts geändert, und eine Zeile dafür wäre eine Behauptung. 802 → 887 Tests, `sw` v47 → v50. Nächster Punkt: **C3**. |
| 2026-08-21 | Aus B1 mitgenommen, weil es dreimal passierte: Tests, die im Quelltext nach einer Regel suchen, dürfen keinen festen Dateipfad tragen – sie werden beim Verschieben nicht rot, sondern finden nichts und bleiben grün. Der Warnhinweis dazu steht bei B1 in §3. |
