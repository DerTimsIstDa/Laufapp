# FunRun – Leitfaden & Roadmap

> **Stand: 2026-08-21** · Grundlage: `KONTEXT.md` (Stand `funrun-v56`, 62 Trophäen, 27 Übungen)
>
> **Fortschritt: A1, A2, A3, A4, B1, B2, B3, B4, C1, C2, C3 und C4 sind
> erledigt und committet** – siehe §5.
>
> **Die Reihenfolge ist am 2026-08-21 neu geordnet.** Ziel ist jetzt
> ausdrücklich: *die App benutzen, ausbauen später.* **C15, C8 und C10 sind
> erledigt**, der nächste Punkt ist **C11** (Jahresrückblick) – der aber
> saisonal ist, siehe §5. Die verbliebenen
> unsichtbaren Punkte stehen vertagt in §5, jeder mit der Bedingung, die ihn
> wieder aufweckt.
>
> Diese Datei beantwortet drei Fragen: **Was gibt es?**, **Was ist schwach?**,
> **Was fehlt?** – und in welcher Reihenfolge das angegangen wird.
> `KONTEXT.md` beschreibt den Ist-Zustand, diese Datei den Weg nach vorn.

**Wichtiger Vorbehalt:** Die Erstfassung dieses Plans war aus `KONTEXT.md`
abgeleitet, nicht aus dem Quellcode. Was seither erledigt wurde (Block A, B1,
B2, B3, B4, C1–C4, C8, C10, C15), ist am Code geprüft. Alles **Offene** ist es nicht – Punkte, die
vor der Umsetzung eine Prüfung brauchen, sind mit **[prüfen]** markiert. Wer sie
ohne Prüfung als Fakt weitergibt, baut auf Sand.

**Und der Vorbehalt hat sich bewährt:** C3 forderte einen Fortschrittsbalken an
den Trophäen – den gab es zu dem Zeitpunkt längst, an 55 von 62. Schlimmer:
`KONTEXT.md` §7 sagte das seit Commit `28b277a` wörtlich („Trophäen mit
`progress()`: 55 von 62"). Die beiden Dateien lagen nebeneinander und
widersprachen sich, und niemand hat hingesehen. Wer C3 ungeprüft eingeplant
hätte, hätte einen halben Tag für etwas veranschlagt, das zu 90 % fertig war.
**Vor jedem offenen Punkt: erst den Code fragen, dann planen** – und wenn schon
nicht den Code, dann wenigstens die andere Datei.

**Aufwandsskala:** **S** = eine Sitzung (< 2 h) · **M** = ein halber bis ganzer
Tag · **L** = mehrere Sitzungen, braucht vorher eine eigene Skizze.

---

## 0. Wo wir stehen

**Block A ist vollständig abgeschlossen.** Aus Block B sind B1, B2, B3 und B4
erledigt, aus Block C die Punkte C1 bis C4, C8, C10 und C15. Alles davon ist
committet.

```
A. Hygiene              B. Struktur               C. Produkt (hier sind
   ✅ A1 CSS geklärt       ✅ B1 app.js geteilt       wir gerade)
   ✅ A2 README            ✅ B2 Speicherfehler       ✅ C1 Sicherungs-
   ✅ A3 Testzahl          ✅ B3 Testlücken             erinnerung
   ✅ A4 APP_SHELL         ✅ B4 history.js gemessen  ✅ C3 Trophäen-
                           ⏸ B4b, B1-Rest,              Fortschritt
                              B2b, B5 vertagt      ✅ C2 Notiz & Gefühl
                                                   ✅ C4 Wetter
                                                   ✅ C15 Audio-Ansagen
                                                   ✅ C8 Kilometer-Splits
                                                   ✅ C10 Helles Schema
                                                    ○ C5–C14 offen

D. Politur (aus der Sichtprüfung, §4b)
   ✅ D1 Akzent   ✅ D2 Hinweisbanner   ✅ D3 Symbole   ✅ D4 Sprache
   ⬅ D5 Kachel-Waise   ○ D6–D8 offen
```

**B1 ist in der kleinen Variante umgesetzt**: Trainingsformular und Statistik
liegen jetzt in `js/views/`, dazu die Markup-Verweise und die Formatierung.
`app.js` ist von 4.132 auf **3.091 Zeilen** geschrumpft, ein Viertel weniger.
Das Ergebnis samt der Frage, ob der Rest folgen soll, steht in §3.

**C3 war zu 90 % schon gebaut.** Der Balken hing an 55 von 62 Trophäen, seit
dem Commit, der den Trophäen-Tab eingeführt hat. Offen waren die sieben, bei
denen ein Balken lügen würde – Pace läuft nach unten, das Ziel des langen Atems
wandert mit. Fünf davon zeigen jetzt eine Zeile statt eines Balkens, zwei
bleiben mit Begründung leer. Das Ergebnis steht in §4.

**C2 ist erledigt** – Notiz und Gefühl stehen im Formular und in der
Detailansicht. Zwei Fehler zeigte dabei wieder erst der Browser, nicht die
Testsuite; einer davon hätte ein Gefühl in den falschen Lauf geschrieben.
Beide sind jetzt von Tests abgedeckt, die keine Feldliste kennen und deshalb
von allein mitwachsen. Das Ergebnis steht in §4.

**C4 ist erledigt** – vier Kästchen am Formular, ohne Netz und ohne fremden
Dienst. Die Kästchen aus C2 sind dabei zur gemeinsamen Bauart geworden. Zum
ersten Mal in dieser Reihe **kein Fehler, den erst der Browser fand**: die zwei
Wächter aus C2 haben die Lücke vorher gemeldet. Das Ergebnis steht in §4.

**B4 ist gemessen, und die Antwort ist unbequem.** Die Grenze lautete: unter
50 ms ist es kein Problem und der Punkt wird gestrichen. Gemessen wurden bei
**200 Läufen und 600 Übungen 314 ms** – auf einem Rechner, nicht auf einem
Telefon. Der Punkt wird also nicht gestrichen, sondern bekommt einen
Nachfolger: **B4b**. Zwei Annahmen der alten Beschreibung waren dabei falsch;
was daraus wurde, steht in §3.

**Gemessen wurde allerdings mit erfundenen Läufen.** Wie viele Tim wirklich
hat, steht nirgends – und genau davon hängt ab, ob B4b eine Frage ist oder
keine. Deshalb steht der Punkt in §5 vertagt, mit dem Nachsehen als Bedingung.

**C15 ist erledigt** – die App sagt jetzt jeden Kilometer an. Der erste Punkt,
den man **während** des Laufens hat statt danach, und zugleich der erste, den
ich nicht zu Ende prüfen kann: ob die Stimme neben Musik durchkommt und bei
gesperrtem Bildschirm noch spricht, entscheidet das Telefon. Das Ergebnis
steht in §4.

**C8 ist erledigt – aber anders, als der Punkt es beschrieb.** „Die Daten
liegen bereits vor" stimmte nicht: In der gespeicherten Strecke stehen nur
Koordinaten, keine Zeiten. Aufgezeichnet wird jetzt beim Laufen statt
hinterher gerechnet. **Der Preis: nur neue Läufe bekommen Splits.** Das
Ergebnis steht in §4.

**C10 ist erledigt – und die Vorarbeit war nur halb getan.** „Alle Werte
hängen schon an Custom Properties" stimmte für 38 Werte; **23 weitere Farben
standen daneben mitten im Regelwerk**, und genau die machen ein Umschalten
unmöglich. Sie sind jetzt Token, und ein Test lässt keine 24. mehr durch. Das
Ergebnis steht in §4.

**Block D ist neu und kommt vor C11.** Acht Punkte aus einer Sichtprüfung der
laufenden App bei 390×844 – nichts davon stand vorher in einer der beiden
Dateien, und **kein Test der Suite hätte einen davon gefunden**. Das ist der
Unterschied zu A bis C: die kamen aus dem Lesen des Codes, dieser kommt aus
dem Ansehen des Ergebnisses. Die acht stehen in §4b.

**D1 ist erledigt – und der Kontrast war der eigentliche Fund.** Der
vorgeschlagene Outline-Knopf hätte im hellen Schema 4,34:1 gehabt, unter den
4,5:1. Der Kommentar im hellen Block nannte die Zahlen für `--bg` und
`--surface`, nicht für `--sunken` – und auf der sitzen Übungskarte und
Trophäenkachel. Das Ergebnis steht in §4b.

**Danach ist C11 dran** – aber der ist saisonal: ein Jahresrückblick im
August wirkt nicht. Wer im August weiterbauen will, nimmt besser **C5**
(Läufe filtern) oder **C7** (Trainingsplan-Vorlagen). Die Reihenfolge in §5
sagt es genauer.

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
| Notiz und Gefühl (1–5) zum Lauf | `validation.js`, `storage.js`, `app.js` | neu (C2); wird noch nirgends ausgewertet |
| Wetter zum Lauf: vier Kästchen | `validation.js`, `storage.js`, `app.js` | neu (C4); ohne Netz, wird noch nirgends ausgewertet |
| Ansage bei jedem Kilometer | `speech.js`, `app.js` | neu (C15); **am Gerät ungeprüft** – siehe §4 |
| Kilometer-Splits mit Balken | `tracker.js`, `app.js` | neu (C8); **nur für ab jetzt aufgezeichnete Läufe** |
| Helles und dunkles Farbschema, dem Gerät folgend | `css/style.css`, `app.js`, `storage.js` | neu (C10); Kontraste nachgemessen, alle über 4,5:1 |

### 1.2 Gamification

| Funktion | Träger | Reifegrad |
|---|---|---|
| XP: 10 pro km, 3 pro Übung/Tag, 15 pro Einheit, 100 pro Zielwoche | `xp.js`, `exercise-log.js`, `training.js`, `goal.js` | rund, gut getestet |
| Level & Aufstiegskosten `40 + 20×N` | `xp.js` | rund |
| Titel und 6 Rang-Abzeichen, endlos ab Level 80 | `titles.js` | rund |
| 62 Trophäen in 3 Kategorien | `achievements.js` | rund, wächst stetig |
| Stand jeder offenen Trophäe: Balken (55) oder Zeile (5) | `achievements.js`, `app.js` | rund seit C3; zwei zeigen bewusst nichts |
| Freischaltdaten per Replay | `history.js` | richtig, aber **zu langsam** – 314 ms bei 200 Läufen und 600 Übungen, gemessen (B4). Behebung als B4b |

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
| Der laufende Zeitraum ist im Balkendiagramm hervorgehoben | `stats.js`, `app.js` | neu (D1) |

### 1.5 Drumherum

| Funktion | Träger | Reifegrad |
|---|---|---|
| Export/Import als JSON, Legacy-Format wird gelesen | `transfer.js` | rund |
| Erinnerung an die Sicherung nach 30 Tagen | `transfer.js`, `storage.js` | neu (C1) |
| Warnung bei fehlgeschlagenem Speichern | `storage.js`, `app.js` | neu (B2) |
| Teilen-Karte 1080×1350 auf Canvas | `share-card.js` | rund |
| PWA: Installierbar, App-Shell-Cache, Update-Hinweis | `sw.js`, `pwa.js` | rund; `APP_SHELL` seit A4 testgeprüft, `CACHE_VERSION` weiterhin von Hand; seit D2 einzeilig und höchstens einer gleichzeitig |
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

**Stand:** B1, B2, B3 und B4 ✅ erledigt · **B4b** ist als Nächstes dran,
B2b und B5 danach.

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

### ✅ B4 · `history.js` gemessen · `tools/mess-history.mjs`

Die Grenze stand vorher fest: **unter ~50 ms ist es kein Problem und der Punkt
wird gestrichen.** Er wird nicht gestrichen.

Gemessen mit `node tools/mess-history.mjs`, Node 24 auf einem Windows-Rechner.
Das Skript liegt im Baum, weil die Antwort an der Zahl der Läufe hängt und die
wächst – eine Messung, die nur aufgeschrieben wurde, ist ab dem nächsten Jahr
eine Behauptung.

```
achievementUnlockDates() – nur Läufe
     n         ms   ms/Lauf   gegen die halbe Größe
   100       21,6     0,216   –
   200       73,9     0,369   3,41×
   500      449,3     0,899   6,08×
  1000    1.772,9     1,773   3,95×
  2000    7.020,0     3,510   3,96×

… mit Übungen, drei pro Tag
   200 Läufe +   600 Übungen:    314 ms
   500 Läufe + 1.500 Übungen:  1.898 ms
  1000 Läufe + 3.000 Übungen:  7.487 ms
```

**Der Faktor 4 je Verdopplung ist O(n²), sauber und ohne Ausreisser.** Die
50-ms-Grenze fällt schon zwischen 100 und 200 Läufen – und das auf einem
Rechner. **Ein Telefon rechnet drei- bis zehnmal langsamer**; die 314 ms von
oben sind dort eine bis drei Sekunden.

**Zum Vergleich, damit klar ist, wo es *nicht* klemmt:** der Jetzt-Zustand,
`evaluateAchievements()`, braucht bei 2.000 Läufen **7 ms**. Die Anzeige der
Trophäen ist billig. Teuer ist ausschliesslich das Durchspielen der Historie
für die Freischalt-*Daten*.

#### Zwei Annahmen dieses Punkts waren falsch

Beide standen hier ungeprüft – genau die Sorte, vor der der Kopf dieser Datei
warnt.

1. **„Es läuft bei jedem Rendern."** Nein. `achievementUnlockDates()` wird nur
   aus `renderTrophies()` gerufen, und das passiert nur, wenn der
   Trophäen-Bereich offen ist (`setView()` und die Schlusszeilen von
   `render()`). Im Code steht sogar der Kommentar dazu: *„Erst beim Ansehen
   aufbauen."* **Der Punkt ist damit kleiner als beschrieben** – wer die
   Trophäen nie öffnet, merkt nichts. Er ist trotzdem echt: solange der
   Bereich offen ist, läuft es bei jedem Speichern erneut.
2. **„Bei 200 Läufen ist das unauffällig."** Nein – 74 ms nur mit Läufen, 314 ms
   mit Übungen dazu. Die Zahl war geraten, und sie war um eine Grössenordnung
   zu optimistisch.

#### Die billigste Abhilfe wurde geprüft und fällt aus

Naheliegend wäre: abbrechen, sobald jede Trophäe ihr Datum hat. Das Skript
misst auch das – und es trägt nicht:

```
  500 Läufe + 1.500 Übungen: 46 von 62 freigeschaltet – letzte bei Schritt 1750 von 2000
  2000 Läufe +     0 Übungen: 37 von 62 freigeschaltet – letzte bei Schritt  250 von 2000
```

Die Abbruchbedingung wäre „alle 62 gefunden", und die tritt **nie** ein: es
bleiben immer welche offen. Im zweiten Fall wären 87 % der Arbeit umsonst und
liessen sich sparen – nur weiss der Abbruch das nicht. **Gut, dass gemessen
wurde, statt es einzubauen.**

### B4b · Die Historie beheben · **M** · `js/history.js`, `js/achievements.js`

Aus der Messung entstanden. Drei Wege, vom billigsten zum saubersten:

| Weg | Aufwand | Was es bringt | Was es kostet |
|---|--:|---|---|
| **Merken statt neu rechnen** | S | Das Wiederholen fällt weg – bei jedem Speichern mit offenem Trophäen-Bereich. **Das erste Öffnen bleibt langsam.** | Fast nichts. Ein Zwischenspeicher, der verfällt, sobald sich Läufe oder Übungen ändern. |
| **Nur die offenen weiterverfolgen** | M | Jeder Schritt prüft nur noch, was noch nicht freigeschaltet ist. Spart in der Praxis viel, aber die Kostenklasse bleibt O(n²). | Wenig. Die Monotonie-Annahme wird nicht angetastet – im Gegenteil, sie wird ausgenutzt. |
| **`buildRunStats()` fortschreiben** | M–L | O(n) statt O(n²). Aus sieben Sekunden werden Millisekunden. | Das, wovor der Modulkommentar warnt: gut zwei Dutzend Kennzahlen von Hand fortschreiben, jede eine mögliche Abweichung vom Neuberechnen. |

**Empfehlung: die ersten beiden, in dieser Reihenfolge, und dann neu messen.**
Der dritte Weg berührt das Modul, dessen Monotonie-Annahme die Freischaltdaten
trägt – dort etwas von Hand fortzuschreiben, was heute abgeleitet wird, ist
genau die Sorte Änderung, die man erst bemerkt, wenn ein Datum falsch ist.

**Bedingung an jede Fassung:** `tools/mess-history.mjs` vorher und nachher
laufen lassen und beide Zahlen in diesen Abschnitt schreiben. Eine Optimierung
ohne Nachmessung ist eine Hoffnung.

### B5 · Barrierefreiheit stichprobenhaft prüfen · **M** · `index.html`, `css/style.css`

Der Kontrast (4,5:1) ist als Regel gesetzt – gut. Offen: Tastaturbedienbarkeit
der Tabs, `aria-live` für XP-/Level-Aufstiege (die App verkündet Freischaltungen
über `render({announceUnlocks})` – wird das auch vorgelesen?), Fokus-Sichtbarkeit
auf dem dunklen Hintergrund, `prefers-reduced-motion` für Animationen. **[prüfen]**

---

## 4. Block C – Produkt (hier stehen wir)

Ideen, nach Verhältnis von Nutzen zu Aufwand sortiert. Alles hier ist optional –
FunRun ist heute schon eine vollständige App.

**Stand:** C1 bis C4, C8, C10 und C15 ✅ erledigt · der Rest offen. Der
nächste Punkt der Reihenfolge ist **C11** – saisonal, siehe §5.

**Seit dem 2026-08-21 gibt dieser Block den Takt vor**, nicht mehr Block B –
die Reihenfolge in §5 ist auf „benutzen zuerst" umgestellt. Die Sortierung
unten nach Aufwand bleibt, weil sie beim Abschätzen hilft; welcher Punkt dran
ist, entscheidet aber §5.

### Naheliegend (hoher Nutzen, kleiner Aufwand)

| # | Idee | Aufwand | Module |
|---|---|--:|---|
| ✅ C1 | **Erinnerung an die Sicherung.** Erledigt – siehe unten. | S | `transfer.js`, `storage.js`, `index.html`, `app.js` |
| ✅ C2 | **Notiz und Gefühl pro Lauf.** Erledigt – siehe unten. | S | `validation.js`, `storage.js`, `app.js`, `index.html` |
| ✅ C3 | **Trophäen-Fortschritt anzeigen.** Erledigt – siehe unten. Der Balken war zu 90 % schon da. | S | `achievements.js`, `app.js`, `css/style.css` |
| ✅ C4 | **Wetter zum Lauf – manuell.** Erledigt – siehe unten. | S | `validation.js`, `storage.js`, `app.js`, `index.html` |
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

#### ✅ C3 · Trophäen-Fortschritt anzeigen

**Zuerst der Befund, weil er den Punkt umschreibt:** Der Fortschrittsbalken war
längst da. `createTrophyProgress()` in `app.js` und eine `progress(stats)`-Funktion
an **55 der 62** Trophäen, seit dem Commit, der den Trophäen-Tab eingeführt hat
(`8c9308c`). Aufwand deshalb **S** statt **M** – der Punkt war zu 90 % erledigt,
bevor er begonnen wurde.

**Und es stand sogar geschrieben.** `KONTEXT.md` §7 führt seit `28b277a` die
Zeile „Trophäen mit `progress()`: 55 von 62". Diese Datei behauptete daneben,
es gebe keinen Fortschritt. Der C3-Eintrag stammt aus der Erstfassung, aus
einer Zeit vor jener Zeile, und wurde nie gegengelesen. **Zwei Dateien, die
denselben Stand beschreiben, driften auseinander, sobald nur eine gepflegt
wird** – genau der Fall, gegen den §9 in `KONTEXT.md` antritt, nur zwischen
Roadmap und Kontext statt zwischen README und Code.

**Offen waren die sieben ohne Balken** – und die waren es aus gutem Grund:

- **Eine Pace läuft nach unten.** `flott-unterwegs`, `zuegig`, `unter-fuenf`,
  `tempo-im-intervall`: bei „5,8 von 6,0" stünde der Balken fast am Ende, wäre
  aber schon erfüllt. Bei 7:00 min/km auf ein Ziel von 6:00 stünde er über 100 %.
- **Beim langen Atem wandert das Ziel mit** (120 % des bisher längsten Laufs).
  Der Balken stünde für immer bei 83 % und bewegte sich nie – einer, der sich
  nicht bewegt, sagt nichts.

**Gebaut:** ein zweites, schmaleres Feld `standing(stats)` neben `progress`, das
statt eines Balkens eine Zeile liefert: `Beste Pace: 6:15 · nötig: unter 6:00
min/km`, `Längster Lauf: 10,00 · nötig: ab 12,00 km`. Fünf der sieben haben es
jetzt. Gerendert von `createTrophyStanding()` in `app.js`, Klasse
`.trophy-standing` im selben Rasterfeld wie der Balken.

**Zwei bleiben leer, und das ist die Entscheidung, nicht die Lücke:**

- `neue-bestzeit` – an einem Rekord gibt es nichts zu zählen. Er fällt in dem
  Moment, in dem er fällt.
- `comeback` – 14 Tage Pause. Ein Fortschritt wäre die Aufforderung, länger
  nicht zu laufen. Eine Lauf-App, die zum Nichtlaufen gratuliert, hat sich
  vertan.

Beides steht als Kommentar über `ACHIEVEMENTS`, damit die nächste Runde nicht
wieder danach sucht.

**Entscheidungen, die beim Bauen anfielen:**

- **Die Einheit steht einmal, hinten am Ziel.** Erst hieß es „Beste Pace: 6:15
  min/km · nötig: unter 6:00 min/km". Am Telefon nachgemessen: zwei Zeilen. Ohne
  das erste `min/km`: eine. Gleiche Aussage, halber Platz.
- **`current: null` ist nicht `0`.** Wer keinen Lauf mit Dauer hat, steht nicht
  bei 0:00 min/km. Dort steht „noch kein Wert".
- **Der Faktor 1,2 steht jetzt an einer Stelle** (`LONG_RUN_FACTOR`). Vorher
  stand er nur in `buildRunStats`. Sobald ihn auch die Anzeige braucht, sind es
  zwei Zahlen, die auseinanderlaufen können – und dann zeigt die Kachel eine
  Ziellinie, die nicht die Bedingung ist. Ein Test hält beide zusammen: er
  nimmt die **angezeigte** Zahl und prüft, dass genau sie die Trophäe auslöst.

**Der Fehler, den wieder erst der Browser zeigte** – `node --test` war grün:
ohne einen einzigen Lauf stand beim langen Atem „nötig: ab 0,00 km". Das Ziel
hängt am längsten Lauf, und ohne Lauf ist es null. Jetzt gibt `standing` in dem
Fall `target: null` zurück und die Zeile hört nach dem Stand auf. **Zum dritten
Mal in dieser Roadmap:** die Testsuite prüft die Rechnung, nicht die Zeile, die
daraus wird.

**Der Test, der den Punkt in Zukunft offenhält:** eine neue Trophäe ohne Balken
und ohne Zeile macht die Suite rot – die Ausnahmeliste hat genau zwei Einträge.
Nachgeprüft, dass er anschlägt: ein `standing` entfernt → rot, zurück → grün.
Dazu ein zweiter, der kein Ziel von `0` durchlässt. 887 → **895 Tests**.

#### ✅ C2 · Notiz und Gefühl pro Lauf

**Gebaut:** ein Textfeld über die ganze Formularbreite und fünf Chips für
„Wie war's?". Beides optional. In der Detailansicht steht das Gefühl als Zahl
mit Wort („4 – gut") zwischen den Kennzahlen, die Notiz als eigene Zeile
darunter.

**Entscheidungen, die beim Bauen anfielen:**

- **Fünf Sprossen.** Drei sind zu grob – gut/geht/schlecht sagt nichts über
  einen Verlauf. Sieben täuschen eine Genauigkeit vor, die ein Gefühl nicht
  hat.
- **Radiofelder, kein Schieberegler.** Ein Regler legt Zwischenwerte nahe, die
  es nicht gibt. Eine 3,5 wird abgelehnt: wer sie zulässt, kann später nicht
  mehr sagen, was er gezählt hat. Sichtbar sind es Chips, darunter liegen echte
  Radiofelder – damit Tastatur und Vorlesehilfe die Gruppe als **eine** Frage
  mit fünf Antworten begreifen.
- **Die Beschriftungen stehen in `validation.js`**, neben der Skala, nicht in
  der Anzeige. Was eine 2 bedeutet, gehört zur Bedeutung des Werts und nicht zu
  seiner Darstellung – wer später auswertet, braucht dieselbe Zuordnung.
- **200 Zeichen für die Notiz**, dieselbe Grenze wie bei der Notiz an einer
  Trainingseinheit. Nicht weil die eine von der anderen abhinge, sondern damit
  sich zwei Notizfelder in derselben App gleich verhalten. Und weil alles im
  `localStorage` liegt: nach den GPS-Spuren ist ein Freitextfeld ohne Grenze
  die zweite Stelle, an der das Fach volläuft.
- **Die Einheit steht einmal.** Aus C3 mitgenommen und hier gleich angewandt.

**Regel 2 aus §6 ist mitgezogen:** ein Roundtrip-Test hält fest, dass Notiz und
Gefühl Export und Import überstehen. Ohne das wären sie genau dann weg, wenn
jemand seine Daten wiederherstellt – der Fehler, den niemand mehr rechtzeitig
bemerkt.

**Zwei Fehler, die wieder erst der Browser zeigte** – `node --test` war beide
Male grün:

1. **`addRun` kannte die neuen Felder nicht.** `validateRun` liess sie durch,
   `updateRun` behielt sie, aber beim *Anlegen* fielen sie heraus: kein Fehler,
   keine Meldung, der Lauf wurde gespeichert – nur ohne Notiz. Beide Funktionen
   zählen die Felder einzeln auf, statt den geprüften Lauf zu übernehmen; das
   ist richtig so, denn nur dadurch verschwindet ein geleertes Feld auch
   wirklich. Der Preis ist, dass ein neues Feld an **drei** Stellen gepflegt
   werden muss und beim Vergessen stillschweigend verlorengeht.
2. **Der `value`-Setzer einer Radiogruppe hakt nur an, er hakt nie ab.** Ein
   Wert, den es nicht gibt – und `undefined` ist so einer –, lässt die Gruppe
   unverändert. Beim Wechsel von einem Lauf mit Gefühl auf einen ohne blieb das
   alte Häkchen stehen und wäre beim Speichern in den falschen Lauf gewandert.

**Der Test, der Fehler 1 in Zukunft verhindert**, kennt keine Feldliste: er
fragt `validateRun`, was ein Lauf haben darf, und prüft, dass `addRun` und
`updateRun` jedes dieser Felder behalten. Damit wächst er von allein mit.
Gegengeprüft, dass er anschlägt: eine Zeile aus `addRun` entfernt → rot,
zurück → grün. 913 Tests.

**Fehler 2 bleibt ungeprüft** – er steckt in `app.js`, und dort gibt es keine
Tests. Das ist kein Versehen, sondern der offene Rest von **B1**: siehe §3.

#### ✅ C4 · Wetter zum Lauf

**Gebaut:** vier Kästchen unter der Gefühlsskala – Sonne, Wolken, Regen,
Schnee, jedes mit eigenem Symbol. Optional, danach in der Detailansicht.

**Entscheidungen, die beim Bauen anfielen:**

- **Diese vier und nicht Wind.** Die vier schliessen einander aus: jeder Lauf
  fällt in genau eins. Wind tut das nicht – es kann sonnig *und* windig sein.
  Eine Auswahl, bei der zwei Antworten gleichzeitig stimmen, ist später nicht
  auswertbar. Wind gehört in die Notiz oder in eine eigene Angabe.
- **Gespeichert wird der Wert, nicht die Beschriftung.** „Sonne" lässt sich
  umbenennen, `'sonne'` steht dann immer noch in jedem alten Lauf.
- **Die Kästchen aus C2 sind zur gemeinsamen Bauart geworden**
  (`.choice-scale`). Zwei Reihen, die verschieden aussehen, wären zwei Fragen,
  die sich verschieden anfühlen, obwohl sie dasselbe tun. Die Spaltenzahl kommt
  von aussen, alles andere ist geteilt.
- **Symbole von Hand, keine Emoji.** Emoji sehen auf jedem Gerät anders aus,
  und die App hat sonst keine. Die vier liegen im selben Symbolvorrat wie die
  Stoppuhr-Symbole.

**Der Test, der die zwei Hälften zusammenhält:** Die Auswahl steht zweimal da –
als Liste in `validation.js` und als Markup in `index.html`. Läuft eines dem
anderen davon, gibt es **keinen Fehler**: es fehlt nur ein Kästchen, oder ein
Symbol bleibt leer. Ein `<use>` auf eine `id`, die es nicht gibt, zeichnet
nichts – an der Stelle ist einfach Luft. Der Test prüft beide Richtungen und
dass jedes genannte Symbol definiert *und* geholt wird. Gegengeprüft, dass er
anschlägt: eine Symbol-`id` verdreht → rot.

**Zum ersten Mal in dieser Reihe kein Fund im Browser.** Nach C1, C3 und C2
war das hier der erste Punkt, bei dem die Testsuite den Fehler vor dem Browser
hatte: die zwei Wächter aus C2 meldeten die fehlende Zeile in `addRun`, sobald
`weather` in ihrer Vorlage stand. Der Browser-Durchgang bestätigte nur noch.
**Das ist kein Zufall, sondern der Ertrag der Wächter** – und zugleich das
Argument für B1: was `app.js` selbst tut, prüft weiterhin niemand.

920 → **925 Tests**.

### Mittelfristig

| # | Idee | Aufwand | Module |
|---|---|--:|---|
| C6 | **Eigene Übungen anlegen.** `exercises.js` ist heute fest verdrahtet. Nutzerübungen brauchen einen eigenen Speichertopf und eine ID-Strategie, die nicht mit den festen kollidiert (z. B. Präfix `user:`). | M | `exercises.js`, `storage.js` (`laufapp.custom-exercises.v1`) |
| C7 | **Trainingsplan-Vorlagen.** „5 km in 8 Wochen", „10 km Grundlage". Erzeugt fertige Sessions in die Zukunft. Hoher wahrgenommener Wert, weil es die leere Planungsseite füllt. | M | `training.js`, neues `plan-templates.js` |
| ✅ C8 | **Segmente & Splits.** Erledigt – siehe unten. Die Begründung des Punkts war falsch: die Daten lagen **nicht** vor. | M | `tracker.js`, `app.js`, `validation.js`, `storage.js` |
| C9 | **Höhenmeter.** `watchPosition` liefert `altitude`. Ungenau (leicht ±10 m), aber über einen Lauf gemittelt brauchbar. **Ehrlich: GPS-Höhe ohne Barometer ist wackelig** – lieber als „ungefähr" beschriften als Präzision vortäuschen. | M | `geo.js`, `tracker.js`, `route.js` |
| ✅ C10 | **Helles Farbschema.** Erledigt – siehe unten. „Die Vorarbeit ist getan" stimmte zur Hälfte. | M | `css/style.css`, `app.js`, `storage.js`, `index.html` |
| C11 | **Jahresrückblick.** Eine Seite „2026 in Zahlen" mit Teilen-Karte. Saisonal, aber emotional der stärkste Moment einer Lauf-App. | M | `stats.js`, `share-card.js` |
| ✅ C15 | **Audio-Ansagen während des Laufs.** Erledigt – siehe unten. | M | `speech.js` (neu), `app.js`, `storage.js`, `index.html` |

#### ✅ C10 · Helles Farbschema

**Gebaut:** drei Zustände – dem Gerät folgen (Vorgabe), ausdrücklich hell,
ausdrücklich dunkel. Die Wahl steht im Profil, wirkt sofort und überlebt das
Schliessen. Die Systemleiste des Telefons färbt sich mit.

**Der Befund zuerst:** „Alle Werte hängen schon an Custom Properties – die
Vorarbeit ist getan." Für 38 Werte stimmte das. Daneben standen **23 weitere
Farben** mitten im Regelwerk – und ausgerechnet die sind es, an denen ein
Umschalten scheitert. Ein weisses `rgba(255, 255, 255, 0.07)` als aufgesetzte
Fläche ist auf Weiss schlicht unsichtbar, und **niemand bemerkt es, solange
niemand umschaltet.** Alle 23 sind jetzt Token.

**Der Akzent wird dunkler, nicht durchsichtiger.** `#c4f000` auf Weiss sind
1,4:1 – als Schrift unlesbar, als Fläche ausgewaschen. Im hellen Schema steht
deshalb `#5a7600`. Das kostet den Neon-Charakter, und das ist der Preis dafür,
dass die App bei Sonne draussen lesbar bleibt. **Wer den Neon-Look will,
bleibt bei Dunkel** – deshalb wird nichts erzwungen, sondern gewählt.

**Im Browser nachgemessen statt behauptet** – alle Werte im hellen Schema:

| Paar | Kontrast |
|---|--:|
| Text auf Grund | 16,6:1 |
| Fliesstext auf Grund | 9,0:1 |
| gedämpft auf Grund | 5,6:1 |
| schwach auf Grund | 4,6:1 |
| Akzent auf Grund | 4,8:1 |
| Akzent auf einer Karte | 5,2:1 |
| Schrift auf dem Akzent | 5,2:1 |

Jeder Wert über den 4,5:1 der WCAG-Stufe AA – die Untergrenze, die im dunklen
Schema schon als Regel am `--dim` steht.

**Entscheidungen, die beim Bauen anfielen:**

- **Kein reines Weiss als Grund** (`#f4f5f2`). Draussen bei Sonne blendet es,
  und genau dort wird diese Fassung gebraucht. Die Karten sind weiss, der
  Grund darunter nicht – so bleibt die Schichtung sichtbar, die im dunklen
  Schema über die Helligkeit läuft.
- **Der Medienblock trägt ein `:not([data-theme="dark"])`.** Ohne das würde
  eine ausdrückliche Entscheidung für Dunkel auf einem hellen System
  überstimmt.
- **Einen eigenen Dark-Block braucht es nicht.** Das `:not()` schliesst den
  Medienblock bereits aus, und dann gilt wieder das `:root` von oben. Er wäre
  eine Regel, die nichts tut – erst geschrieben, dann nachgedacht, dann
  gelöscht.
- **`'system'` entfernt das Merkmal, statt eines zu setzen.** Nur *ohne*
  `data-theme` greift die Medienabfrage. Ein `data-theme="system"` wäre ein
  Wert, den kein Selektor kennt, und die App bliebe stumm dunkel.
- **Eigener Speichertopf** (`laufapp.display.v1`), nicht im Export: Eine
  Sicherung beschreibt die Läufe, nicht die Vorlieben dieses einen Geräts. Wer
  auf dem Telefon dunkel und am Rechner hell will, soll das dürfen.

**Der Test, der C10 am Leben hält:** Er verbietet **jede** Farbe ausserhalb der
Token-Blöcke. Ohne ihn wandert bei der nächsten Funktion wieder ein
`rgba(255,255,255,…)` ins Regelwerk, und das helle Schema verrottet Zeile für
Zeile, ohne dass etwas rot wird. Dazu drei weitere: keine Farbe darf ihre
**einzige** Definition im hellen Block haben, das helle Schema darf keine
Grössen anfassen, und es muss jede Farbe des dunklen überschreiben.
Gegengeprüft, dass der erste anschlägt.

**Und ein Fehler, den zum fünften Mal erst der Browser zeigte – diesmal ein
bereits dokumentierter.** `const THEME_COLORS` stand beim
Farbschema-Abschnitt statt beim übrigen Modulzustand. `init()` läuft am
Modulanfang und griff darauf zu, bevor die Deklaration initialisiert war:
**ReferenceError für die ganze App.** Exakt der Fehler aus C1, dort in diesem
Dokument aufgeschrieben, hier wiederholt.

Bitterer noch: Beim **Messen** fiel er nicht auf. Die Kontrastmessung liest
die CSS-Variablen und braucht die App gar nicht – grüne Zahlen über einer
toten Seite. Aufgefallen ist er erst, als das Klicken auf „Hell" nichts tat.
**Eine Messung, die auch an einer kaputten App gelingt, misst nicht, was man
glaubt.**

969 → **981 Tests**.

#### ✅ C8 · Kilometer-Splits

**Zuerst der Befund, weil er den Punkt umschreibt:** „Die Daten liegen bereits
vor – es fehlt nur die Auswertung." Das stimmte nicht. In `track` stehen
**ausschliesslich Koordinaten**; der Zeitstempel jeder Position wird in
`tracker.js` verworfen, sobald die Strecke daraus gewachsen ist
(`track.push({ lat, lon })`), und `normalizeTrack()` in `route.js` würde
alles Weitere ohnehin abstreifen. Aus einer gespeicherten Spur lässt sich kein
Split rechnen: Man weiss, **wo** der Kilometer lag, aber nicht **wann**.

**Zwei Wege standen offen:**

| Weg | Kosten | Nutzt alten Läufen? |
|---|---|---|
| An jeden der bis zu 500 Punkte eine Zeit hängen | 500 Zahlen je Lauf, geändertes Datenformat, Export/Import mitziehen | **Nein** – alte Spuren haben auch dann keine Zeiten |
| Die Übergänge beim Laufen mitschreiben | **eine** Zahl je Kilometer | Nein |

Der zweite gewinnt: genauer, ein Bruchteil des Platzes, und da **keiner der
beiden** alten Läufen hilft, kostet der Verzicht nichts. Gebaut ist er in
`tracker.js` – der weiss Strecke und Uhr ohnehin und ist die einzige Stelle,
die den Übergang überhaupt sehen kann.

**Der Preis, offen benannt:** Läufe, die vor heute aufgezeichnet wurden, haben
keine Splits und bekommen auch keine. Von Hand eingetragene und mit der
Stoppuhr erfasste Läufe ebenso wenig – ohne Strecke gibt es keine Kilometer.
Die Detailansicht blendet den Abschnitt dann aus, statt eine leere Liste zu
zeigen.

**Entscheidungen, die beim Bauen anfielen:**

- **Der Tracker ist ab jetzt die einzige Stelle, die Kilometer zählt.** Die
  Ansagen aus C15 zählten bis eben nebenher selbst; sie lesen jetzt dieselbe
  Liste. Zwei Zähler wären zwei Stellen, die sich irgendwann widersprechen –
  angesagt würde dann etwas anderes, als hinterher in der Detailansicht steht.
  **Das war ein Umbau an C15, einen Punkt nach dessen Fertigstellung.** Er
  gehört trotzdem hierher: Erst mit den Splits gab es überhaupt eine zweite
  Quelle.
- **Ein Sprung wird nachgetragen, nicht übersprungen.** Fehlten Einträge,
  verschöben sich alle folgenden Nummern und der fünfte Kilometer stünde an
  vierter Stelle. Die übersprungenen bekommen den Schnitt.
- **Ein einziger Unsinn kippt die ganze Liste** (in `validateRun`). Eine Liste
  mit Lücken hätte falsche Kilometernummern, und die sind schlimmer als gar
  keine Splits.
- **Beim Balken heisst lang schnell, nicht langsam.** Er zeigt das Tempo, nicht
  die verbrauchte Zeit: Der schnellste Kilometer bekommt den vollen Balken.
  Andersherum wäre der *langsamste* Kilometer der längste Neonstreifen – und
  Neongrün ist in dieser App vier Dingen vorbehalten, die alle etwas
  Erreichtes meinen. Den schlechtesten Kilometer damit auszuzeichnen, hiesse
  die eigene Farbregel gegen sich selbst zu wenden.
- **Die Splits überleben das Bearbeiten**, wie die Route: Das Formular kennt
  sie nicht und darf sie deshalb nicht wegwerfen. Der Wächter aus C2 musste
  dafür eine Ausnahmeliste bekommen – benannt und begründet, nicht stillschweigend.

**Im Browser geprüft**, mit angehaltener Uhr und einem Punkt je Sekunde: drei
Kilometer in 5:00, 6:00 und 4:30 ergeben **genau** `[300, 360, 270]`, und die
Ansagen sagen dieselben Zahlen. Die zwei Sekunden Verzug aus C15 sind damit
weg – nicht weil etwas genauer rechnet, sondern weil beide dieselbe Zahl
lesen.

955 → **969 Tests**.

#### ✅ C15 · Ansagen während des Laufs

**Gebaut:** „Ein Kilometer. 5 Minuten 42." bei jedem vollen Kilometer, über
die im Browser eingebaute Sprachausgabe. Ein Schalter in der
Aufzeichnungs-Karte, voreingestellt an, sein Stand überlebt das Schliessen.

**Entscheidungen, die beim Bauen anfielen:**

- **Ausgeschrieben statt in Ziffern.** Eine Sprachausgabe liest die „1" als
  *eins Kilometer* und die „5:42" als Uhrzeit vor. Im Text steht deshalb
  „Ein Kilometer" und „5 Minuten 42".
- **Ein Sprung wird zusammengefasst.** Kommt die Strecke nach einem Tunnel von
  1,2 auf 3,4 km, wird einmal „3 Kilometer" gesagt statt zweimal
  hintereinander. Angesagt wird der Schnitt über die dazugekommenen Kilometer
  – die Zeit für den übersprungenen weiss ohnehin niemand.
- **Unter einer Minute je Kilometer wird nichts behauptet.** Das wäre ein
  GPS-Sprung und kein Tempo.
- **Der Schalter steht nur dort, wo er wirkt:** ohne GPS keine Strecke, also
  kein Kilometer; ohne Sprachausgabe im Browser wäre er ein Versprechen, das
  niemand einlöst. In beiden Fällen ist die Zeile ausgeblendet.
- **Zwei Hälften in einem Modul.** *Was* gesagt wird, ist pure Rechnung und
  einzeln prüfbar; *dass* es gesagt wird, fasst den Browser an und ist dünn
  gehalten. Getrennte Dateien wären zweimal vierzig Zeilen gewesen – dieselbe
  Sache, in zwei Karteikarten.

**Der Speicherplatz, der zur Falle wurde:** Der Schalterstand liegt im selben
Eintrag wie die Aufzeichnungsart – beides beschreibt, wie *dieses Gerät*
aufzeichnet, und beides gehört nicht in die Exportdatei. Damit teilen sich
zwei Schalter einen Platz, und wer nur seinen eigenen Wert hineinschreibt,
löscht den anderen. Ohne Fehler, ohne Meldung. Gelesen und geschrieben wird
jetzt im Ganzen; ein Test wacht darüber, und es ist gegengeprüft, dass er
anschlägt. **Dieselbe Fehlerart wie bei C2** – nur eine Ebene tiefer.

**Am Gerät geprüft, mit angehaltener Uhr und gefütterter GPS-Attrappe:**

| gelaufen | angesagt |
|---|---|
| Kilometer 1 in 5:00 | „Ein Kilometer. 5 Minuten 2." |
| Kilometer 2 in 6:00 | „2 Kilometer. 6 Minuten." |

Die zwei Sekunden sind die Wartezeit auf den nächsten GPS-Punkt: Die
Kilometermarke fällt zwischen zwei Meldungen, gemerkt wird sie bei der
nächsten. Wegrechnen liesse sich das nur, indem man den Zeitpunkt schätzt –
und eine geschätzte Zahl anzusagen ist schlechter, als zwei Sekunden zu spät
zu sein.

**Eine kleine Ungereimtheit bleibt:** Die Anzeige rundet auf zwei
Nachkommastellen, die Ansage nicht. Bei 2,997 km steht „3,00" auf dem
Schirm, angesagt wird aber erst bei echten 3,000 – ein, zwei Sekunden später.
Andersherum wäre es eine Ansage über einen Kilometer, der noch fünf Meter
fehlt. **Bewusst so gelassen.**

#### ⚠️ Was an C15 offen bleibt – und nur Tim prüfen kann

Der erste Punkt dieser Roadmap, den ich **nicht zu Ende prüfen kann**. Alles
oben lief gegen Attrappen. Was ein Telefon daraus macht, steht auf einem
anderen Blatt:

1. **Kommt die Ansage neben Musik durch?** iOS und Android mischen
   Sprachausgabe und Wiedergabe unterschiedlich – von „leiser drehen und
   sprechen" bis „gar nicht".
2. **Spricht sie bei gesperrtem Bildschirm?** Derselbe Vorbehalt wie beim Ton
   der Intervall-Stoppuhr: Irgendwann hört das Betriebssystem auf, uns
   Rechenzeit zu geben. Der Wake Lock hilft, solange der Bildschirm an ist.
3. **Klingt die Stimme brauchbar?** Die Sprachausgabe nimmt, was das Gerät an
   deutschen Stimmen mitbringt. Auf manchen Geräten ist das eine
   Wetterdurchsage aus dem Jahr 2010.

**Bis das an einem echten Lauf geprüft ist, gilt der Punkt als gebaut, nicht
als bestätigt.** Wer die Zeile in §1.1 anders liest, liest sie falsch.

### Groß / später

> **C15 stand bis zum 2026-08-21 hier und ist nach „Mittelfristig" gezogen.**
> Er war der einzige **M** in einer Liste von **L**, und die Überschrift
> „gross/später" hat ihn kleiner aussehen lassen, als er ist – ausgerechnet
> den Punkt, der beim tatsächlichen Laufen am meisten bringt. Eine Sortierung
> nach Aufwand darf keine Sortierung nach Wichtigkeit vortäuschen.

| # | Idee | Aufwand | Bemerkung |
|---|---|--:|---|
| C12 | **Kartenansicht der Route** | L | Braucht Kartenkacheln → externe Abhängigkeit + Netzwerk. **Widerspricht dem Prinzip „keine Abhängigkeiten".** Nur machen, wenn dieses Prinzip bewusst aufgegeben wird. Die SVG-Route ohne Karte ist der ehrlichere Kompromiss. |
| C13 | **Geräteübergreifende Synchronisierung** | L | Braucht ein Backend. Ändert das Projekt fundamental (Konten, Datenschutz, Betriebskosten, DSGVO). **Meine Einschätzung: nicht machen.** Der Export/Import deckt 90 % des Bedarfs zu 1 % der Kosten. |
| C14 | **Import aus Strava / Garmin / GPX** | L→M | GPX-Import allein ist **M** und braucht kein Konto – nur einen XML-Parser für eine Datei, die der Nutzer selbst hochlädt. Das ist die 80/20-Variante und passt zur Architektur. Volle API-Anbindung wäre L und bricht die Abhängigkeitsfreiheit. |

---

## 4b. Block D · Politur

**Warum „4b" und nicht „5":** Die Abschnittsnummern dieses Dokuments werden
überall zitiert – in `KONTEXT.md` §8, in den Commit-Rümpfen, in den Regeln
weiter unten („die Häkchen-Runde nach §6"). Ein neuer `## 5.` hätte §5, §6 und
§7 um eins verschoben und jede dieser Verweisungen still falsch gemacht. Die
Datei kennt für Nachzügler bereits die Buchstaben-Endung – `B2b`, `B4b` –,
und dieselbe Regel gilt hier für einen ganzen Block.

**Woher die Punkte kommen:** aus einer Sichtprüfung der laufenden App bei
390×844 mit 56 Läufen, 90 Übungseinträgen und fünf geplanten Einheiten. Sie
standen vorher in keiner der beiden Dateien. Das ist der Unterschied zu Block
A bis C: die kamen aus dem Lesen des Codes, dieser kommt aus dem Ansehen des
Ergebnisses. **Kein Test der Suite hätte einen dieser acht Punkte gefunden** –
`styles.test.mjs` prüft Markup und Regeln, nicht, ob etwas gut aussieht.

Jeder Punkt wurde vor der Behebung am laufenden Stand nachgemessen; wo die
Messung etwas anderes ergab als die Beschreibung, steht es im Ergebnis.

| # | Was | Aufwand | Stand |
|---|---|--:|---|
| D1 | Der Akzent ist inflationär | M | ✅ |
| D2 | Zwei Hinweisbanner fressen den halben ersten Bildschirm | S | ✅ |
| D3 | Ein buntes Emoji in einer monochromen App | S | ✅ |
| D4 | Sprachbruch: „Achievements" neben „Trophäen" | S | ✅ |
| D5 | Kachel-Waise in der Statistik | S | ⬜ |
| D6 | Zeilenumbruch in der Pace-Kachel | S | ⬜ |
| D7 | „Statistik" und „Gesamtstatistik" sind nicht unterscheidbar | S | ⬜ |
| D8 | Filterchips im Trophäen-Tab | S | ⬜ |

**Stand: 4 von 8 erledigt.** Als Nächstes D5.

### ✅ D1 · Der Akzent ist inflationär · `css/style.css`, `js/app.js`, `js/stats.js`

Der Kopfkommentar von `css/style.css` reserviert Neongrün für vier Dinge:
Fortschritt, freigeschaltete Trophäen, die aufgezeichnete Strecke und die
primäre Aktion. Auf dem Statistik-Bildschirm waren **14 grüne Flächen**
gezählt worden. Drei Stellen brechen die Regel:

- `.trophy.unlocked` füllt die ganze Kachel mit `--accent-soft`. Bei 40 von 62
  freigeschalteten Trophäen ist die Tönung der Normalzustand und trägt keine
  Information mehr.
- Der „Erledigt"-Knopf ist vollflächig `--accent` – bei 27 Übungen
  untereinander 27 neongrüne Blöcke.
- Die Balken unter „Distanz im Verlauf" sind alle gleich grün, ohne Betonung
  der laufenden Woche.

**Ergebnis.** Alle drei behoben. Auf der Statistik-Karte stehen statt **13**
grünen Flächen (12 Balken + Umschalter) noch **2**: der aktive Umschalter und
der Balken der laufenden Woche.

**Der Kontrast war der eigentliche Fund.** Der vorgeschlagene Outline-Knopf –
Rahmen in `--accent-line`, Schrift in `--accent` – **reisst im hellen Schema
die 4,5:1**: `#5a7600` auf `--sunken` (`#e9ebe5`) sind gemessene **4,34:1**,
und der Knopf ist 13 px. Der Kommentar im hellen Block nannte 4,7:1 und 5,2:1
– beides stimmt, aber für `--bg` und `--surface`. Die eingesenkte Fläche stand
nicht in der Liste, und genau auf ihr sitzen Übungskarte und Trophäenkachel.

Deshalb gibt es `--accent-text` (`#547000` hell, `#c4f000` dunkel): **4,73:1**
gemessen. Dasselbe Muster wie `--danger-text`, nur andersherum – Rot muss im
Dunklen heller werden, Grün im Hellen dunkler. `.trophy-xp` und
`.trophy-date` haben es mitbekommen; sie sassen auf derselben Fläche und
hatten dasselbe Problem, nur bisher unbemerkt.

**Abweichung vom Vorschlag:** Die Balken sind `--dim`, nicht `--fill-track`.
Die Spur darunter ist `--sunken`, und `--fill-track` ist eine durchscheinende
Aufhellung für `--surface` – auf `--sunken` bleibt davon fast nichts sichtbar.
`--dim` ist der Grauwert, den `.trophy-bar` für dieselbe Rolle schon benutzt.

**Ein Test dieses Punkts war zuerst falsch gruen.** Er suchte im Stylesheet
nach einer Regel über zwei Zeilen und schrieb das Zeilenende als `
` hin.
Git steht hier auf `core.autocrlf=true`: im Repo liegt LF, im
Arbeitsverzeichnis CRLF. Im Arbeitsverzeichnis war der Test grün, in einem
frisch ausgecheckten Worktree rot – und rot wäre auch jeder Klon gewesen.
Aufgefallen ist es erst beim Durchprüfen aller acht Commits einzeln, was
Block A als Gewohnheit hinterlassen hat.

Behoben an der Wurzel: `lies()` in `tests/helpers.mjs` vereinheitlicht die
Zeilenenden, und **kein Test liest diese Dateien mehr selbst**. Das ist die
zweite Falle dieser Art nach der aus B1 (ein Test mit festem Dateipfad wird
beim Verschieben nicht rot, sondern findet nichts). Beide haben dieselbe
Form: ein Test, der grün ist, weil er nicht findet, wonach er sucht.

**Welcher Balken der laufende ist, rechnet `stats.js`**, nicht die Anzeige.
Naheliegend wäre „der letzte" gewesen; das stimmt fast immer und genau dann
nicht, wenn jemand einen Lauf auf morgen datiert – `runsInPeriod()` lässt
solche Läufe bewusst stehen. `buildBuckets()` führt deshalb `isCurrent` mit.
Zwei Tests halten genau diesen Fall fest.

### ✅ D2 · Zwei Hinweisbanner fressen den halben ersten Bildschirm · `index.html`, `js/app.js`, `js/pwa.js`

Update- und Installationshinweis stehen im Markup **vor** den Bereichen und
hängen damit über allen fünf Tabs. Gemessen bei 390×844: **70 px + 90 px**,
und im Trophäen-Tab begann die erste Trophäe erst bei **y = 429**.

**Ergebnis.** Beide sind einzeilig (63 px bzw. 70 px), und es steht höchstens
einer da. Die erste Trophäe beginnt jetzt bei **y = 245** – 184 px gewonnen.

**Die Vorrangregel liegt in `pwa.js`, nicht in der Anzeige.**
`shouldShowInstallHint()` hat zwei Bedingungen dazubekommen: `updateReady`
und `view`. Der Update-Hinweis sticht, weil er der einzige Weg aus einer
hängenden alten Fassung ist – der Installationsvorschlag gilt morgen genauso.
**Der Update-Hinweis bleibt über allen fünf Tabs**; nur der
Installationshinweis ist an den Start-Tab gebunden. Ein Test hält
ausdrücklich fest, dass er nicht ebenfalls gebunden wird.

**Was dabei verloren ging, und warum.** Die Begründung neben dem Titel („Als
installierte App bleiben deine Läufe zuverlässiger erhalten") ist weg. Bei
390 px hat die Textzeile **278 px**; der Titel allein braucht **205**, mit
Begründung wären es **340** – also wieder zwei Zeilen. Beides zusammen ging
nicht. Der Titel ist die Aufforderung und damit der Zweck des Hinweises; die
Begründung steht jetzt im `title`-Attribut und im README.

**Der Speicherhinweis wurde nicht mitgekürzt.** Er meldet einen Verlust statt
eines Vorschlags und trägt eine wechselnde Meldung – da ist die zweite Zeile
keine Verschwendung. Ein Test hält diese Ausnahme fest, damit sie nicht beim
nächsten Aufräumen mitgeht.

### ✅ D3 · Ein buntes Emoji in einer monochromen App · `index.html`, `js/app.js`, `js/views/`

`einplanen.textContent = '📅'` rendert als farbiges System-Emoji.

**Ergebnis.** Zwei neue Symbole in der Sammlung – `icon-calendar-plus` und
`icon-pencil` –, dazu `createIcon()` in `js/views/dom.js`. Beide tragen
`aria-hidden`, das `aria-label` bleibt am Knopf.

**Es waren vier Stellen, nicht zwei.** Der Punkt nannte den Kalender und den
Stift daneben; denselben Stift tragen aber auch die Lauf-Liste und der
Trainingsplan. Nur einen zu ersetzen hätte einen Stift in drei Ausführungen
hinterlassen – schlimmer als vorher. Alle drei sind jetzt dasselbe Symbol.

**Der Kalender stand schon im Haus.** Der Training-Tab zeichnete genau diese
Geometrie inline. Statt sie ein zweites Mal hinzuschreiben, steht sie einmal
in der Sammlung, und Tab wie Knopf holen sie von dort. Ein Test hält fest,
dass der Tab sie nicht wieder selbst zeichnet.

**Geprüft, nicht angenommen:** Beide Symbole zeichnen wirklich etwas – im
Browser gemessen, `getBBox()` liefert 16×16 bzw. 15,5×15,5 im 24er-Feld. Ein
`<use>` auf eine unbekannte `id` bleibt sonst stumm leer, und das sieht man
nicht. Ein Test prüft jede benutzte `id` gegen die Definitionen.

**Der Strich ist 1,7 statt 1,8** wie in der Tab-Leiste: auf 20 px wirkt
derselbe Strich schwerer als auf 22.

### ✅ D4 · Sprachbruch: „Achievements" neben „Trophäen" · `index.html`

Eine Sache, zwei Namen, auf demselben Bildschirm.

**Ergebnis.** Ein Wort. Die Suche über das ganze Projekt ergab **genau eine**
Stelle, die der Nutzer liest – `index.html`, die XP-Aufschlüsselung auf dem
Start-Tab. Alle übrigen 30 Treffer sind Bezeichner und Kommentare
(`evaluateAchievements`, `achievements.js`, `renderAchievements`) und bleiben
unangetastet.

**`README.md` brauchte nichts:** dort kam das Wort kein einziges Mal vor. Der
Punkt vermutete es, der Code widerlegte es.

**Vier Tests statt einem**, weil ein Wort leicht wieder hereinrutscht: einer
prüft den sichtbaren Text des Markups, einer die Zeichenketten der Module
(Beschriftungen entstehen zur Laufzeit), einer ist die Gegenprobe, dass
„Trophäen" überhaupt noch dasteht, und einer hält ausdrücklich fest, dass die
**Exports weiter `Achievement` heißen dürfen** – sonst nimmt sie das nächste
Aufräumen mit, quer durch acht Dateien und für null sichtbaren Gewinn.

### D5 · Kachel-Waise in der Statistik · `css/style.css`, `js/app.js`

Bei ungerader Kachelzahl bleibt die letzte allein in der Zeile stehen.

### D6 · Zeilenumbruch in der Pace-Kachel · `css/style.css`, `js/app.js`

Zahl und Einheit stehen im selben Schriftgrad.

### D7 · „Statistik" und „Gesamtstatistik" sind nicht unterscheidbar · `css/style.css`, `js/app.js`

Gleiche Labels, gleiche Kacheln, gleiche Reihenfolge.

### D8 · Filterchips im Trophäen-Tab · `css/style.css`

Drei Chips brechen zufällig um.

---

## 5. Empfohlene Reihenfolge

**Am 2026-08-21 neu geordnet, nach einer Frage von Tim: „Was genau ist der
Mehrwert von dem allen?"** Die Antwort auf die Gegenfrage war: *die App
benutzen, und irgendwann danach ausbauen.* Danach richtet sich diese Liste
jetzt – und zwar ausdrücklich, statt sie weiter Punkt für Punkt abzuarbeiten,
nur weil sie so dastand.

**Was das ändert:** Von zwölf erledigten Punkten waren **sechs für den Nutzer
unsichtbar** (A2, A3, A4, B1, B3, B4). Das war zur Hälfte richtig – ohne A1
bis A4 und B2 stünde hier ein Baustellenschild – und zur Hälfte eine
Investition, die sich nur bei fortgesetzter Entwicklung auszahlt. Die
verbleibenden unsichtbaren Punkte wandern deshalb nach hinten, hinter eine
klare Linie, mit der Bedingung, die sie wieder aufweckt.

### Erledigt

| Schritt | Was | Aufwand | Stand |
|--:|---|--:|---|
| 1 | **A1** CSS committen oder verwerfen | S | ✅ erledigt |
| 2 | **A3** Testzahl feststellen, **A4** APP_SHELL-Test | S+S | ✅ erledigt |
| 3 | **A2** README auf Stand | M | ✅ erledigt |
| 4 | **B2** Speicher-Fehlerpfade härten | M | ✅ erledigt |
| 5 | **C1** Export-Erinnerung | S | ✅ erledigt |
| 6 | **B3** Testlücken der jungen Module | M | ✅ erledigt |
| 7 | **B1** app.js entflechten – **kleine Variante** | M | ✅ erledigt |
| 8 | **C3** Trophäen-Fortschritt | S | ✅ erledigt |
| 9 | **C2** Notiz & Gefühl | S | ✅ erledigt |
| 10 | **C4** Wetter | S | ✅ erledigt |
| 11 | **B4** history.js messen | S | ✅ erledigt |

### Jetzt: was man beim Laufen merkt

| Schritt | Was | Aufwand | Warum hier |
|--:|---|--:|---|
| 12 | **C15** Audio-Ansagen während des Laufs | M | ✅ erledigt – **aber am Gerät ungeprüft**, siehe §4 |
| 13 | **C8** Kilometer-Splits | M | ✅ erledigt – **nur für ab jetzt aufgezeichnete Läufe**, siehe §4 |
| 14 | **C10** Helles Farbschema | M | ✅ erledigt |
| 15 | **C7** Trainingsplan-Vorlagen · **C6** eigene Übungen · **C5** Läufe filtern · **C14** GPX-Import | M je | ⬅ **als Nächstes, nach Bedarf.** **C5 erst, wenn die Lauf-Liste unübersichtlich wird** – das hängt an einer Zahl, die niemand kennt (siehe unten) |
| 16 | **C11** Jahresrückblick | M | Emotional der stärkste Moment einer Lauf-App – aber **saisonal**. Im August gebaut, wirkt er im August nicht. **Ab November**, dann trifft er auf ein volles Jahr |

### Politur – Block D

Acht Punkte aus einer Sichtprüfung der laufenden App. Sie stehen hier als
eigene Liste und nicht zwischen den C-Punkten, weil sie eine andere Sorte
Arbeit sind: keine neue Funktion, sondern das Aufräumen dessen, was die
vorhandenen anrichten, wenn sie zu fünfzigst auf einem Bildschirm stehen.
**Reihenfolge ist Absicht** – D1 räumt den Akzent auf, und D7 setzt danach
wieder Hierarchie hinzu. Andersherum hätte D1 sie gleich wieder eingerissen.

| Schritt | Was | Aufwand | Stand |
|--:|---|--:|---|
| D1 | Der Akzent ist inflationär | M | ✅ erledigt |
| D2 | Zwei Hinweisbanner über allen Tabs | S | ✅ erledigt |
| D3 | Buntes Emoji in monochromer App | S | ✅ erledigt |
| D4 | „Achievements" neben „Trophäen" | S | ✅ erledigt |
| D5 | Kachel-Waise in der Statistik | S | ⬅ **als Nächstes** |
| D6 | Zeilenumbruch in der Pace-Kachel | S | offen |
| D7 | Statistik ≠ Gesamtstatistik | S | offen |
| D8 | Filterchips im Trophäen-Tab | S | offen |

### Später: erst beim Ausbauen

Nichts davon ist verworfen, alles davon ist **vertagt**. Jeder Punkt hat eine
Bedingung, die ihn wieder aufweckt – ohne die wandert er nur von Liste zu
Liste.

| Was | Aufwand | Wacht auf, wenn … |
|---|--:|---|
| **B4b** Historie beheben | M | … die Lauf-Zahl es rechtfertigt. **Ungeklärt:** gemessen wurde mit erfundenen Läufen, Tims echte Zahl steht nirgends. Bei 40 Läufen sind es ~10 ms und der Punkt ist egal; bei 400 eine Sekunde auf dem Telefon. **Zuerst nachsehen, dann entscheiden** |
| **B1** (Rest) app.js weiter entflechten | L | … das Bauen anfängt wehzutun. Die Kennzahl steht schon da: dreimal in Folge grüne Tests bei kaputter Oberfläche |
| **B2b** GPS-Fehlerpfade am Gerät | M | … eine GPS-Aufzeichnung tatsächlich schiefgeht |
| **B5** Barrierefreiheit | M | … jemand anders die App benutzt als Tim |

**Die ehrliche Einordnung dazu:** B1 ist der einzige der vier, der beim Bauen
Geld spart statt es zu kosten. Wer die C-Punkte oben in Folge baut, wird ihn
irgendwann brauchen – die drei Fehler in Folge, die nur der Browser fand, sind
die Rechnung dafür. Aber **erst dann**, und nicht als Vorleistung.

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
| 14 | – | `102107b` | Haekchen-Runde nach B1 |
| 15 | – | `bb66779` | Nach dem Push nachgezogen: der Hinweis auf den ausstehenden Push |
| 16 | C3 | `414b55c` | Stand statt Balken, wo ein Balken luegen wuerde |
| 17 | – | `351d5ad` | Haekchen-Runde nach C3 – und was sie zutage foerderte |
| 18 | C2 | `12fd1cf` | Notiz und Gefuehl zu jedem Lauf |
| 19 | – | `38e484d` | Haekchen-Runde nach C2 |
| 20 | C4 | `20aaed8` | Wetter zum Antippen statt aus dem Netz |
| 21 | – | `962de24` | Haekchen-Runde nach C4 |
| 22 | B4 | `8dda88e` | Ein Werkzeug, das die Historie misst |
| 23 | – | `1bd1388` | Haekchen-Runde nach B4 – die Messung als Ergebnis |
| 24 | – | `849813d` | Die Reihenfolge neu geordnet: benutzen zuerst |
| 25 | C15 | `18c4106` | Ansagen waehrend des Laufs |
| 26 | – | `24b6b5c` | Haekchen-Runde nach C15 |
| 27 | C8 | `b58687b` | Kilometer-Splits – aufgezeichnet statt nachgerechnet |
| 28 | – | `278bb04` | Haekchen-Runde nach C8 |
| 29 | C10 | `29eddae` | Ein helles Farbschema – und die Vorarbeit, die angeblich getan war |

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
| 2026-08-21 | **C3** umgesetzt. Der Punkt war zu 90 % schon gebaut – Balken an 55 von 62 Trophäen seit `8c9308c`, und `KONTEXT.md` §7 sagte das seit `28b277a` wörtlich, während diese Datei das Gegenteil behauptete. Offen waren die sieben, bei denen ein Balken lügt; fünf haben jetzt eine Zeile (`standing`), zwei bleiben mit Begründung leer. §0/§1.2/§4/§5 nachgezogen, Aufwand von M auf S korrigiert. 887 → 895 Tests, `sw` v50 → v51. Nächste Punkte: **C2** und **C4**. |
| 2026-08-21 | **C2** umgesetzt: Notiz und Gefühl pro Lauf. §1.1 um eine Zeile ergänzt, §0/§4/§5 nachgezogen. Zwei Fehler fand wieder nur der Browser – der zweite hätte ein Gefühl in den falschen Lauf geschrieben. 895 → 913 Tests, `sw` v51 → v52. Nächster Punkt: **C4**. |
| 2026-08-21 | **C10** umgesetzt: helles Farbschema, dem Gerät folgend, mit Wahl im Profil. §1.1 um eine Zeile ergänzt, §0/§4/§5 nachgezogen. 969 → 981 Tests, `sw` v55 → v56. |
| 2026-08-21 | **Der dritte Punkt in Folge, dessen Prämisse nicht hielt** – nach B4 und C8 jetzt C10: „die Vorarbeit ist getan" galt für 38 Werte, während 23 Farben daneben im Regelwerk standen. Dreimal dasselbe Muster: ein Satz, der beim Schreiben plausibel klang und nie am Code geprüft wurde. Der Unterschied diesmal: Ein Test hält die Prämisse ab jetzt wahr, statt sie nur zu berichtigen. |
| 2026-08-21 | **Zum fünften Mal ein Fehler, den nur der Browser zeigte – und diesmal ein wiederholter.** `THEME_COLORS` in der temporalen Todeszone, exakt der C1-Fehler, der in diesem Dokument steht. Dass er trotz Aufschreibens wiederkam, ist das Argument für einen Test statt einer Notiz. Dazu die eigentliche Lehre: Die Kontrastmessung war grün, weil sie CSS-Variablen liest und die App nicht braucht. **Eine Messung, die auch an einer kaputten App gelingt, misst nicht, was man glaubt.** |
| 2026-08-21 | **C11 ist in §5 nach hinten gerückt.** Ein Jahresrückblick, im August gebaut, wirkt im August nicht – das stand schon als „saisonal" im Punkt, wurde beim Ordnen aber trotzdem vor die alltäglicheren Punkte gesetzt. Jetzt trägt er ein Datum statt eines Adjektivs: ab November. |
| 2026-08-21 | **C8** umgesetzt: Kilometer-Splits. §1.1 um eine Zeile ergänzt, §0/§4/§5 nachgezogen. 955 → 969 Tests, `sw` v54 → v55. Nächster Punkt: **C10**. |
| 2026-08-21 | **Die Begründung von C8 war falsch, und zwar entscheidend.** „Die Daten liegen bereits vor" – nein: in der gespeicherten Strecke stehen nur Koordinaten, keine Zeiten. Aus einer alten Spur ist kein Split zu holen. Nach B4 der zweite Punkt, dessen Prämisse den Kontakt mit dem Code nicht überlebt hat. Beide Male stand die Prämisse ungeprüft da; beide Male hätte ein Blick in eine Datei genügt. |
| 2026-08-21 | Aus C8 mitgenommen: **Die Splits haben C15 einen Zähler weggenommen.** Bis dahin zählten Ansage und Aufzeichnung unabhängig voneinander Kilometer. Das ist ein Umbau an einem Punkt, der einen Schritt vorher fertig gemeldet wurde – und richtig so: Erst mit den Splits gab es eine zweite Quelle, und zwei Quellen für dieselbe Zahl sind eine zu viel. |
| 2026-08-21 | **C15** umgesetzt: Ansagen bei jedem Kilometer. Neues Modul `speech.js` mit Testdatei und `APP_SHELL`-Eintrag. §1.1 um eine Zeile ergänzt, §0/§4/§5 nachgezogen. 927 → 954 Tests, `sw` v53 → v54. Nächster Punkt: **C8**. |
| 2026-08-21 | **Der erste Punkt, den ich nicht zu Ende prüfen kann.** Ob die Stimme neben Musik durchkommt, bei gesperrtem Bildschirm spricht und brauchbar klingt, entscheidet das Telefon – dafür gibt es keine Attrappe. Der Punkt gilt als gebaut, nicht als bestätigt; die drei offenen Fragen stehen ausformuliert in §4. |
| 2026-08-21 | **Dieselbe Fehlerart wie bei C2, eine Ebene tiefer:** Der neue Schalter teilt sich seinen Speicherplatz mit der Aufzeichnungsart, und wer nur seinen eigenen Wert hineinschreibt, löscht den anderen – ohne Fehler, ohne Meldung. Diesmal vorher gesehen statt hinterher: gelesen und geschrieben wird im Ganzen, ein Test wacht darüber, und es ist gegengeprüft, dass er anschlägt. |
| 2026-08-21 | **Die Reihenfolge in §5 ist neu geordnet** – nach Tims Frage „Was genau ist der Mehrwert von dem allen?". Die Antwort war: die App benutzen, ausbauen später. §5 hat jetzt drei Teile statt einer Liste: erledigt, was man beim Laufen merkt, und – hinter einer Linie – das Vertagte, jedes mit der Bedingung, die es wieder aufweckt. Ohne solche Bedingung wandert ein Punkt nur von Liste zu Liste. |
| 2026-08-21 | Die Frage war berechtigt: **sechs der zwölf erledigten Punkte waren für den Nutzer unsichtbar** (A2, A3, A4, B1, B3, B4). Zur Hälfte richtig – ohne A1–A4 und B2 stünde hier ein Baustellenschild –, zur Hälfte eine Investition, die sich nur bei fortgesetzter Entwicklung auszahlt. Das gehört benannt und nicht weggeredet. |
| 2026-08-21 | **C15 ist von „Gross / später" nach „Mittelfristig" gezogen.** Er war der einzige M zwischen lauter L, und die Überschrift hat ausgerechnet den Punkt kleiner aussehen lassen, der beim Laufen am meisten bringt. Eine Sortierung nach Aufwand darf keine nach Wichtigkeit vortäuschen. |
| 2026-08-21 | **B4** gemessen – und die Grenze klar gerissen: 314 ms bei 200 Läufen und 600 Übungen statt der gesetzten 50 ms, auf einem Rechner. Der Punkt wird nicht gestrichen, sondern bekommt mit **B4b** einen Nachfolger. Das Messskript liegt als `tools/mess-history.mjs` im Baum, damit die Antwort nachprüfbar bleibt, wenn die Zahl der Läufe wächst. |
| 2026-08-21 | **Zwei Annahmen der B4-Beschreibung waren falsch.** „Läuft bei jedem Rendern" – nein, nur bei offenem Trophäen-Bereich, und im Code steht sogar der Kommentar dazu. „Bei 200 Läufen unauffällig" – nein, um eine Grössenordnung daneben. Der Punkt war also gleichzeitig kleiner *und* schlimmer, als er dastand. Beides hätte ein Blick in den Code gezeigt; genau dafür steht die Regel im Kopf. |
| 2026-08-21 | Die naheliegende billige Abhilfe für B4b – abbrechen, sobald alle Trophäen ihr Datum haben – wurde **mitgemessen und fällt aus**: es bleiben immer 16 bis 25 Trophäen offen, die Abbruchbedingung tritt nie ein. Eine halbe Stunde Messen hat einen Tag Einbau gespart. |
| 2026-08-21 | **C4** umgesetzt: Wetter zum Antippen. §1.1 um eine Zeile ergänzt, §0/§4/§5 nachgezogen. Die Kästchen aus C2 sind zur gemeinsamen Bauart geworden. 913 → 925 Tests, `sw` v52 → v53. Nächster Punkt: **B4**. |
| 2026-08-21 | **Der Offline-Modus ist geprüft und funktioniert** – die Frage stand seit B1 offen. Der erste Versuch schlug fehl, weil der „Aktualisieren"-Knopf den Offline-Speicher zuerst *löscht* und neu aufbaut: wer danach sofort in den Flugmodus geht, hat nichts. Zweiter Versuch mit einer Viertelminute Netz dazwischen: die App startet ohne Verbindung. **Der Knopf trägt diesen Preis nirgends an – die App sagt bis heute nicht, ob sie offline bereit ist.** Kein Roadmap-Punkt, aber notiert. |
| 2026-08-21 | **Zum dritten Mal in Folge grüne Tests, kaputte Oberfläche.** Nach C1 und C3 jetzt C2. Das ist kein Zufall mehr, sondern die Kennzahl von B1: solange `app.js` untestbar ist, sagt eine grüne Suite über die Oberfläche nichts. Der Punkt steht in §3 und wird mit jedem Mal teurer. |
| 2026-08-21 | Der Vorbehalt im Kopf hat sich zum ersten Mal ausgezahlt und steht jetzt schärfer da: **vor jedem offenen Punkt erst den Code fragen.** C3 hätte sonst einen halben Tag für etwas veranschlagt, das fast fertig war. |
| 2026-08-21 | Aus B1 mitgenommen, weil es dreimal passierte: Tests, die im Quelltext nach einer Regel suchen, dürfen keinen festen Dateipfad tragen – sie werden beim Verschieben nicht rot, sondern finden nichts und bleiben grün. Der Warnhinweis dazu steht bei B1 in §3. |
| 2026-08-22 | **Block D angelegt** (§4b) – acht Punkte aus einer Sichtprüfung der laufenden App bei 390×844. Als `4b` nummeriert und nicht als neues `5`, weil §5, §6 und §7 überall zitiert werden und ein Verschieben jede dieser Verweisungen still falsch gemacht hätte; die Datei kennt die Buchstaben-Endung von `B2b` und `B4b` bereits. **Der Anlass ist neu:** A bis C kamen aus dem Lesen des Codes, D kommt aus dem Ansehen des Ergebnisses – kein Test der Suite hätte einen dieser acht Punkte gefunden. |
| 2026-08-22 | **D1** umgesetzt: der Akzent ist wieder die Ausnahme. Statistik-Karte von 13 auf 2 grüne Flächen. **Dabei einen Kontrastfehler gefunden, den es schon gab:** `--accent` als Schrift auf `--sunken` sind im hellen Schema 4,34:1 – der Kommentar im hellen Block nannte 4,7:1 und 5,2:1, aber für `--bg` und `--surface`. Neu ist `--accent-text` (4,73:1 gemessen). 981 → 993 Tests, `sw` v56 → v57. |
| 2026-08-22 | **D2** umgesetzt: beide Hinweise einzeilig, höchstens einer gleichzeitig, der Installationshinweis nur im Start-Tab. Erste Trophäe von y=429 auf y=245. **Die Begründung neben dem Titel ist dabei entfallen** – bei 390 px hat die Zeile 278 px, der Titel braucht 205, mit Begründung wären es 340. Sie steht jetzt im `title` und im README. §1.5 nachgezogen. 993 → 1002 Tests, `sw` v57 → v58. |
| 2026-08-22 | **D3** umgesetzt: die Zeichen an den Knöpfen sind Inline-SVG mit `currentColor`. **Es waren vier Stellen, nicht zwei** – denselben Stift trugen auch Lauf-Liste und Trainingsplan, und nur einen zu ersetzen hätte drei verschiedene Stifte hinterlassen. Der Kalender stand schon als Geometrie im Training-Tab und steht jetzt einmal in der Sammlung statt zweimal. 1002 → 1008 Tests, `sw` v58 → v59. |
| 2026-08-22 | **D4** umgesetzt: „Achievements" heißt im sichtbaren Text jetzt „Trophäen". **Es war genau ein Wort** – alle übrigen 30 Treffer sind Bezeichner und Kommentare und bleiben. Das `README.md` brauchte nichts: dort kam das Wort nie vor, anders als der Punkt vermutete. 1008 → 1012 Tests, `sw` v59 → v60. |
