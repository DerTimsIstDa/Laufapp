# FunRun

Prototyp einer Lauf-App mit Gamification. Reines HTML/CSS/JS, kein Build-Step,
kein Backend. Läufe liegen im `localStorage` des Browsers.

Die App hiess bis Version 25 „Laufapp". Umbenannt wurde alles Sichtbare und
die Konfiguration; **Ordner, Git-Repo und die `localStorage`-Schlüssel behalten
den alten Namen** – ein Umbenennen der Schlüssel wäre für jedes bestehende
Gerät ein Datenverlust.

**Live: https://dertimsistda.github.io/Laufapp/**

Auf dem Handy öffnen und installieren – siehe [Aufs Handy bringen](#aufs-handy-bringen).

## Starten

Ein lokaler Server ist nötig – die App nutzt ES-Module und einen Service
Worker, beides funktioniert nicht über `file://`.

```bash
npx serve .
```

Danach die angezeigte `http://localhost:…`-Adresse öffnen. Alternativ
`python -m http.server 8000`.

## Aufs Handy bringen

Zum Aufzeichnen echter Läufe muss die App auf dem Telefon liegen. Dafür braucht
sie **HTTPS** – Geolocation und Service Worker gibt es sonst nicht. `localhost`
ist die einzige Ausnahme, und die hilft unterwegs nicht.

Es ist reines HTML/CSS/JS ohne Build-Step, also genügt jeder Hoster, der
statische Dateien ausliefert. Der Ordner wird unverändert hochgeladen.

**Schnellster Weg – Netlify Drop:** [app.netlify.com/drop](https://app.netlify.com/drop)
öffnen, den Projektordner ins Fenster ziehen. Ergibt sofort eine
HTTPS-Adresse, ohne Konto. Gut zum Ausprobieren.

**Eingerichteter Weg – GitHub Pages:** Läuft bereits unter
https://dertimsistda.github.io/Laufapp/, gespeist aus dem `master`-Branch.
Ein `git push` aktualisiert die Seite nach etwa einer Minute. Alle Pfade im
Projekt sind relativ, der Unterordner macht also keine Probleme.

```bash
git push
```

**Installieren:** Adresse auf dem Handy öffnen. Android/Chrome bietet
„App installieren" an, unter iOS/Safari geht es über *Teilen → Zum
Home-Bildschirm*. Danach startet sie ohne Browserleiste und funktioniert auch
offline.

Nach einer Aktualisierung liefert der Service Worker zunächst noch den alten
Stand aus – erst der zweite Aufruf zeigt die neue Version. Das ist gewollt
(so funktioniert sie offline) und der Grund, warum `CACHE_VERSION` in `sw.js`
bei jeder Änderung hochgezählt werden muss. Sobald die neue Fassung bereitliegt,
erscheint oben ein Hinweis mit **Neu laden**; wer nicht warten will, drückt
**Aktualisieren**.

Der Hinweis hält sich zurück, solange aufgezeichnet wird – ein Neuladen mitten
im Lauf wäre der teuerste Moment. Er kommt nach, sobald die Aufzeichnung endet.

**Beim Befüllen des Caches wird der HTTP-Cache umgangen** (`cache: 'reload'`).
GitHub Pages liefert alles mit `max-age=600`; ohne das landen bis zu zehn
Minuten alte Dateien neben frischen im selben Cache. Das Ergebnis war einmal
neues HTML mit altem JavaScript – die Oberfläche zeigte Tabs, die nichts taten.

**Installationshinweis:** Läuft die App in einem Browser-Tab statt vom
Startbildschirm, erscheint einmalig ein Banner mit dem Hinweis, sie zu
installieren – dort überleben die Daten zuverlässiger. Weggeklickt kommt es
nicht wieder; gemerkt wird das unter `laufapp.installHint.dismissed`.

**Aktualisieren-Knopf** oben rechts: leert den Zwischenspeicher, meldet den
Service Worker ab und lädt neu. Eingetragene Läufe liegen im `localStorage`
und bleiben unberührt.

Dabei werden bewusst **nur die eigenen** Caches und Registrierungen angefasst
(Präfix `funrun-` bzw. Scope des eigenen Verzeichnisses). Auf `github.io`
teilen sich alle Projekte eines Kontos denselben Origin – ein pauschales
Leeren würde einem Nachbarprojekt den Cache wegräumen.

Als eigen gilt auch das alte Präfix `laufapp-` (`LEGACY_CACHE_PREFIXES`).
Sonst bliebe der Cache von vor der Umbenennung für immer auf dem Gerät liegen.

⚠️ **Die Daten hängen an der Adresse.** Der `localStorage` gehört zur Domain –
ein Wechsel von Netlify zu GitHub Pages nimmt die Läufe nicht mit, und auf dem
Handy fängst du ohnehin bei null an. Dafür gibt es Export und Import: auf dem
alten Gerät exportieren, auf dem neuen importieren.

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

Gesamt-XP = XP aus Läufen + XP aus abgehakten Übungen + Bonus-XP aus
freigeschalteten Achievements + Bonus-XP aus Plantreue. Die Aufteilung steht
im Fortschrittsbereich.

Weder XP-Stand noch Achievements werden **gespeichert** – beides wird immer aus
den Läufen, den abgehakten Übungen und dem Plan berechnet. Dadurch bleibt alles
konsistent, wenn ein Lauf gelöscht oder eine Regel angepasst wird.

## Bereiche

Eine Tab-Leiste am unteren Rand führt durch fünf Bereiche:

- **Start** – alles Bisherige: Fortschritt, Aufzeichnung, Eintragen,
  Achievements als kompakte Liste, Statistik, Lauf-Liste, Sicherung
- **Übungen** – kuratierte Übungsbibliothek mit Filter, siehe unten
- **Training** – eigene Einheiten auf ein Datum planen und der Abgleich mit
  den tatsächlichen Läufen, siehe unten
- **Trophäen** – alle Achievements als grosse Kacheln, freigeschaltete mit
  Datum, offene mit Fortschrittsbalken sofern die Bedingung einen Zähler hat
- **Profil** – Titel und Level gross mit XP-Balken bis zum nächsten Level,
  darunter eine Trophäen-Übersicht je Gruppe, die Titel-Historie und eine
  Zusammenfassung der Gesamtstatistik

In der Leiste heisst der dritte Bereich nur **Training** – fünf Beschriftungen
müssen auf 360 px nebeneinander passen. Die volle Bezeichnung „Training
erstellen" steht in der Überschrift.

### Übungen

27 Übungen in fünf Kategorien, fest hinterlegt in `js/exercises.js`: Aufwärmen,
Lauftechnik, Kraft, Dehnen, Regeneration. Jede mit Anleitung und Richtwert für
Dauer oder Wiederholungen. Die Bibliothek selbst ist unveränderlich; was der
Nutzer beisteuert, sind die Häkchen darunter (siehe „Übungen abhaken").

Zwei Eigenheiten:

- **Aufwärmen ist eine Reihenfolge**, keine Sammlung. Die Kategorie trägt
  `ordered: true`, ihre Übungen werden nummeriert und bekommen eine
  Akzentkante.
- **Ein unbekannter Filter zeigt alles** statt nichts. Eine leere Seite wäre
  die schlechtere Antwort auf einen Tippfehler.

Die Angaben sind allgemeine Richtwerte aus dem Lauftraining, keine
medizinische Beratung – das steht auch in der App.

### Übungen abhaken

Jede Übung hat einen **Erledigt**-Knopf. Ein Tipp legt einen Eintrag an
(Übungs-Id, Kalendertag, Zeitstempel) – eigene Datenstruktur unter
`laufapp.exercises.v1`, getrennt von den Läufen.

Dabei laufen **zwei Zahlen unabhängig voneinander**, und die darf man nicht
verwechseln:

- Der **Zähler** („12× gemacht") wächst bei jedem Tipp, auch mehrfach am
  selben Tag.
- **XP gibt es nur einmal je Übung und Kalendertag**, 3 XP pro Paar. Sonst
  liesse sich das Level durch Dauerklicken hochtreiben. Der zweite Tipp am
  selben Tag sagt das auch offen: „heute schon gezählt, XP gibt es morgen
  wieder".

Die Übungs-XP fliessen wie Lauf- und Achievement-XP ins Level ein. Die
Aufteilung steht im Fortschrittsbereich.

Vier Achievements in der Kategorie **Übungen**: Erste Übung (1), Dranbleiber
(10), Übungsroutine (50) und Vielseitig – letzteres verlangt mindestens eine
Übung aus **jeder** der fünf Kategorien, vier reichen nicht.

Gerechnet wird in `js/exercise-log.js`, pur und ohne DOM. Einträge zu
Übungen, die es in der Bibliothek nicht mehr gibt, zählen weiter mit, tragen
aber zu keiner Kategorie bei – sonst ginge der Zähler nach einer Änderung an
der Bibliothek verloren.

### Zähler von Hand korrigieren

Der Stift an einer Übung öffnet ein Zahlenfeld direkt auf der Karte. Weil es
keinen gespeicherten Zähler gibt – die Zahl **ist** die Anzahl der Einträge –
muss eine Korrektur Einträge entfernen oder ergänzen:

- **Verringern** entfernt die *neuesten* Einträge. Das entspricht dem
  Rückgängigmachen der letzten Tipps und lässt alte Freischaltdaten in Ruhe.
- **Erhöhen** legt Einträge mit dem heutigen Datum an. Damit greift die
  Tagesgrenze weiterhin: eine Korrektur von 9 auf 30 bringt drei XP, nicht
  63.

Fällt der Zähler dabei unter eine Achievement-Schwelle, **verliert das
Achievement seinen Status** – es wird wie alles andere bei jedem Rendern neu
abgeleitet, nichts ist eingefroren.

Ein leeres Eingabefeld gilt **nicht** als Null. `Number('')` ist 0, und ohne
diese Prüfung hätte ein versehentlich geleertes Feld beim Übernehmen den
ganzen Zähler gelöscht. Eine ausdrücklich eingetragene 0 löscht sehr wohl.

Trophäen und Profil werden erst beim Ansehen berechnet, nicht bei jeder
Änderung. Grund ist `js/history.js`.

### Training erstellen

Im Tab **Training** lassen sich einzelne Einheiten auf ein Datum anlegen: Art
(Dauerlauf, Long Run, Tempolauf, Intervalle, Ruhetag), beliebig viele
Abschnitte mit Wiederholungen, Distanz und Dauer, dazu eine Notiz. Gespeichert
wird unter `laufapp.training.v1`, gerechnet wird in `js/training.js`, pur und
ohne DOM.

Der Abgleich mit den echten Läufen wird wie alles andere **bei jeder Anzeige
neu gerechnet** und nicht gespeichert. Eine Einheit gilt als eingehalten, wenn
ein Lauf desselben Tages mindestens 80 % des Ziels erreicht
(`FULFILL_RATIO`); ohne Abschnitte reicht jeder Lauf an dem Tag.

Drei Regeln, die nicht offensichtlich sind:

- **Eine eingehaltene Einheit bringt 15 XP** (`XP_PER_SESSION`), aber nur, wenn
  sie vor dem Lauftag im Plan stand (`createdAt` <= `date`). Sonst liessen sich
  zu vorhandenen Läufen nachträglich beliebig viele Bonus-XP erfinden. Die
  Liste sagt das auch offen: „nachträglich geplant, deshalb keine Bonus-XP".
- **Ein Lauf erfüllt höchstens eine Einheit.** Stehen an einem Tag mehrere im
  Plan, bekommt die anspruchsvollste den längsten Lauf.
- Ein **Ruhetag** verbraucht keinen Lauf und bringt nie XP. Wer an einem
  Ruhetag läuft, hat ihn verpasst.

Beim Bearbeiten bleiben `id` und `createdAt` erhalten – sonst liesse sich eine
nachträglich angelegte Einheit durch einmaliges Ändern in eine „vorher
geplante" verwandeln.

### Zeitpunkte statt nur Zustände

Die App leitet sonst immer nur den Jetzt-Zustand ab. Für „freigeschaltet am"
und die Titel-Historie braucht es Zeitpunkte, und die spielt `js/history.js`
durch: Lauf für Lauf wird die Vorgeschichte neu bewertet und festgehalten,
wann eine Bedingung zum ersten Mal griff.

Das funktioniert nur, weil **alle Bedingungen monoton** sind – was einmal
erfüllt war, bleibt es beim Hinzufügen weiterer Läufe. Serien und Rekorde sind
Maxima über die Historie, Zähler wachsen nur. Ein Test prüft diese Annahme
ausdrücklich; fiele sie, wären Freischaltdaten nicht mehr eindeutig.

Der Durchlauf kostet O(n²). Bei ein paar hundert Läufen ist das ein
Wimpernschlag, und die Alternative wären dreizehn handgeschriebene
Fortschreibungen, die mit jeder neuen Regel wieder auseinanderlaufen.

## Statistik

Eigene Sektion mit Gesamtdistanz, Anzahl Läufe, Ø Distanz pro Lauf, längstem
Lauf samt Datum sowie aktueller und längster Serie — jeweils in Tagen und in
Wochen. Darunter ein Balkendiagramm der Distanz je Woche oder Monat,
umschaltbar, begrenzt auf die letzten 12 Einheiten.

Die Balken sind reines CSS (`div`-Breite in Prozent des größten Werts), keine
Chart-Bibliothek und kein Canvas.

Gerechnet wird in `js/stats.js`, pur und ohne DOM:

- **Serien** zählen Tage bzw. Wochen mit mindestens einem Lauf. Mehrere Läufe
  am selben Tag zählen einmal.
- Eine **aktuelle** Serie überlebt einen Tag Pause — sonst stünde sie jeden
  Morgen auf 0, bis man wieder losgelaufen ist. Nach zwei Tagen ohne Lauf ist
  sie vorbei. Bei Wochen gilt dasselbe mit einer Woche Nachsicht.
- Der heutige Tag kommt als Parameter herein (`todayIso`), nicht aus der
  Systemuhr. Nur deshalb lässt sich „aktuelle Serie" überhaupt testen.
- **Wochen ohne Lauf erscheinen mit 0** statt zu fehlen. Sonst würde das
  Diagramm eine Pause verschlucken und den Verlauf schönen.
- Wochen beginnen montags, die Nummerierung folgt ISO 8601.

## Daten bearbeiten und sichern

**Bearbeiten:** Der Stift an einem Lauf lädt ihn ins Formular. Distanz, Datum,
Startzeit und Dauer lassen sich ändern; `id` und die GPS-Markierung bleiben
erhalten. Geleerte Felder verschwinden auch wirklich aus dem Datensatz.

**Löschen** fragt nach: das × wechselt die Zeile in eine Rückfrage, gelöscht
wird erst nach dem zweiten Klick.

**Export/Import** im Abschnitt „Daten sichern". Der Export ist die einzige
Sicherung und der einzige Weg auf ein anderes Gerät. Format:

```json
{
  "format": "funrun-export", "version": 1, "exportedAt": "…", "runCount": 2,
  "runs": [ … ], "exerciseLog": [ … ], "sessions": [ … ]
}
```

Erledigte Übungen und der Trainingsplan gehören mit hinein, sonst wäre der
Export kein vollständiges Abbild. Sicherungen von vor diesen Bereichen haben
die Felder nicht – dann kommen sie als leere Listen zurück.

Dateien mit der alten Kennung `laufapp-export` werden weiterhin angenommen
(`LEGACY_EXPORT_FORMATS`) – eine Sicherung, die die App selbst geschrieben hat,
darf sie nicht ablehnen.

Der Import **ersetzt** den Bestand und fragt vorher nach, mit Angabe, wie
viele Läufe, Übungen und geplante Einheiten gefunden wurden und wie viele
ersetzt werden. `parseImport()` in
`js/transfer.js` prüft die Datei stufenweise und meldet jeden Fehlerfall im
Klartext statt abzustürzen: kein JSON, fremdes Format, neuere Dateiversion,
fehlende Lauf-Liste, leere Liste. Einzelne kaputte Einträge brechen den Import
nicht ab — sie werden übersprungen und gezählt. Erst wenn kein einziger Lauf
lesbar ist, gilt die Datei als unbrauchbar. Eine nackte JSON-Liste von Läufen
wird ebenfalls angenommen, damit von Hand zusammengestellte Dateien
funktionieren.

Jeder Weg in den Speicher läuft über `validateRun()` in `js/validation.js` —
Formular wie Import. Unbekannte Felder aus einer Importdatei werden dabei
verworfen.

### Zahlenfelder sind `type="text"`

Alle Zahleneingaben – Distanz, Dauer, die Abschnitte einer Einheit und die
Zähler-Korrektur – sind bewusst **kein** `type="number"`. Der Browser
akzeptiert dort nur den Punkt als Dezimaltrennzeichen und verwirft „0,4"
schon beim Tippen; auf einer deutschen Tastatur ist das aber die normale
Schreibweise. Die Zifferntastatur auf dem Handy kommt stattdessen über
`inputmode`.

Gelesen wird überall mit `parseNumber()` aus `js/validation.js`, nie mit
`Number()` oder `parseFloat()` — es nimmt Komma wie Punkt und liefert für
Leerstring und Buchstabensalat `null`. Das ist der Unterschied, auf den es
ankommt: `Number('')` ist 0, und eine 0 würde einen Zähler löschen statt eine
Rückfrage auszulösen.

## Gestaltung

Dunkel, reduziert, sportlich. Alle Werte stehen als Custom Properties oben in
`css/style.css` – Farben, Abstandsskala, Rundungen. Wer etwas ändern will,
ändert dort einen Token statt dreißig Regeln.

- **Hintergrund** `#0d0f12`, Karten und Flächen in abgestuften Grautönen
- **Neongrün** `#c4f000` als einziger Akzent, bewusst sparsam: Fortschritt,
  freigeschaltete Achievements, Streckenlinie, primäre Aktion. Käme es überall
  vor, hebt es nichts mehr hervor.
- **Text** weiß für Überschriften und Werte, helles Grau für Fließtext

Der Level-/XP-Bereich ist der Blickfang: Levelzahl in 52 px Neon, breiter
Fortschrittsbalken, alles Weitere tritt zurück.

Freigeschaltete Achievements bekommen Neonrahmen, getönte Fläche und einen
gefüllten Haken; offene bleiben grau auf dunkler Fläche. Der Unterschied läuft
über Fläche und Farbe, **nicht** über unleserlichen Text – jede Textfarbe hält
mindestens 4,5:1 Kontrast (WCAG AA), auch die gedimmte.

Mobile first: die Grundregeln gelten fürs Handy, eine Medienabfrage ab 40 rem
erweitert für breitere Schirme. Bei grobem Zeiger wachsen Icon-Knöpfe auf
44 px Kantenlänge.

**Eingabefelder hängen an eigenen Tokens** (`--field-height`, `--field-pad-x`,
`--field-pad-y`, `--label-gap`, `--field-gap`) und werden nirgends pro Formular
nachjustiert. Datum, Uhrzeit und Auswahl bringen je eigene Innenteile mit und
wären sonst unterschiedlich hoch; die Mindesthöhe von 44 px zieht sie auf ein
Mass und ist zugleich das Fingerziel. `line-height` steht dort fest bei 1.25,
sonst macht die 1.55 des `body` ein Textfeld höher als ein Datumsfeld. Ein Test
in `tests/styles.test.mjs` wacht darüber.

Keine Schriftart wird nachgeladen – der Systemfont-Stack landet auf Android bei
Roboto, auf iOS bei SF Pro, beide modern und ohne Ladezeit oder Drittanbieter.

## Tests

```bash
node --test
```

464 Tests im Ordner `tests/`, ausgeführt vom eingebauten Testrunner von Node —
keine Abhängigkeiten, kein Framework, nichts zu installieren.

| Datei | prüft |
|---|---|
| `tests/xp.test.mjs` | XP pro km, Aufstiegskosten, jede Levelgrenze bis 5000 |
| `tests/geo.test.mjs` | Haversine gegen bekannte Strecken, alle GPS-Filtergrenzen |
| `tests/titles.test.mjs` | feste Stufen, endlose Legenden, `nextTitle` bis Level 3000 |
| `tests/achievements.test.mjs` | jede Bedingung knapp darunter und darauf |
| `tests/tracker.test.mjs` | Start/Pause/Beenden, Fehlerfälle, Geolocation-Attrappe |
| `tests/validation.test.mjs` | Pflicht- und Optionalfelder, erfundene Kalendertage |
| `tests/transfer.test.mjs` | Export-Roundtrip, kaputte und halbe Importdateien |
| `tests/storage.test.mjs` | Anlegen/Ändern/Löschen/Ersetzen, Neuberechnung danach |
| `tests/stats.test.mjs` | Summen, Serien mit Lücken, Wochen-/Monatsraster |
| `tests/route.test.mjs` | Projektion, Seitenverhältnis, Geraden, Ausdünnen |
| `tests/pwa.test.mjs` | Installationshinweis, Trennung eigener und fremder Caches |
| `tests/lock.test.mjs` | Halte-Fortschritt, Sperrregeln, Freigabe im Notfall |
| `tests/history.test.mjs` | Freischaltdaten, Titel-Historie, Monotonie-Annahme |
| `tests/exercises.test.mjs` | Vollständigkeit der Übungsdaten, Filter, Zählung |
| `tests/exercise-log.test.mjs` | Tageslimit, Zähler, Kategorien für Vielseitig |
| `tests/training.test.mjs` | Abschnitte, Abgleich mit Läufen, Plantreue und XP |
| `tests/styles.test.mjs` | CSS- und Markup-Regeln, die Node nicht ausführen kann |

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

### Tastensperre

Während der Aufzeichnung gibt es einen **Sperren**-Knopf gegen Berührungen in
der Hosentasche. Gesperrt reagieren Pause, Beenden und Verwerfen nicht mehr,
und der Rest der Seite wird auf `inert` gesetzt – eine Sperre, unter der man
noch Läufe löschen kann, wäre keine. **Die Aufzeichnung läuft normal weiter**,
Statuszeile und Zähler ebenfalls.

Entsperrt wird durch **zwei Sekunden Halten**. Eine Taschenberührung wandert
und dauert Millisekunden; ein Druck, der zwei Sekunden am selben Punkt bleibt,
kommt dabei praktisch nicht vor. Der Knopf füllt sich sichtbar mit, Loslassen
setzt zurück.

Zwei Details, die nicht offensichtlich sind:

- Getaktet über `setInterval`, nicht über `requestAnimationFrame`. rAF steht
  still, sobald die Seite nicht gezeichnet wird – dann liesse sich die Sperre
  nicht mehr öffnen.
- Beim Loslassen wird die tatsächlich verstrichene Zeit noch einmal geprüft.
  Wurde der Takt zwischendurch gedrosselt, hätte man sonst lange genug
  gehalten und bliebe trotzdem gesperrt.

Endet die Aufzeichnung von aussen – etwa weil die Standortfreigabe entzogen
wurde – fällt die Sperre mit, sonst bliebe die Bedienung tot.

Grenzen, die im Browser nicht zu umgehen sind:

- Braucht **HTTPS oder localhost**. Über eine andere Adresse ist der Start-Knopf
  deaktiviert.
- Ein `wakeLock` hält den Bildschirm an, solange der Browser das erlaubt.
  Sperrt sich das Handy trotzdem, drosselt das System die Positionsupdates –
  eine echte Hintergrund-Aufzeichnung wie native Apps ist nicht möglich.
- Die Strecke ist Luftlinie zwischen Messpunkten. Bei engen Kurven misst das
  minimal zu kurz.

Der Streckenverlauf wird als `track` am Lauf mitgespeichert – siehe
[Routenanzeige](#routenanzeige).

## Routenanzeige

Ein Klick auf einen Lauf in der Liste öffnet die Detailansicht: Kennzahlen des
Laufs und darunter die aufgezeichnete Strecke als Linienzug in einem SVG.
Kein Kartenhintergrund, keine Chart- oder Karten-Bibliothek. Start und Ziel
sind als Punkte markiert, Start grün, Ziel hell.

Läufe ohne Aufzeichnung – von Hand eingetragene und alle aus der Zeit vor
diesem Feature – zeigen stattdessen „Keine GPS-Daten für diesen Lauf."

`js/route.js` rechnet, pur und ohne DOM:

- **Flache Projektion mit Längengrad-Korrektur.** Ohne Kartenhintergrund
  braucht es keine echte Kartenprojektion, aber ein Längengrad ist auf 52° Nord
  nur etwa 61 % so lang wie ein Breitengrad. Ohne die Korrektur mit
  `cos(Breite)` würde eine Ost-West-Runde in die Breite gezogen.
- **Eine Skala für beide Achsen**, der Rest wird zentriert. Liegen alle Punkte
  auf einer Geraden, hat eine Achse keine Ausdehnung – dann bestimmt allein die
  andere die Skala, statt durch null zu teilen.
- Norden liegt oben: die y-Achse wird negiert, weil Bildschirmkoordinaten nach
  unten wachsen.
- Das `viewBox` ist 320 × 200; dasselbe Verhältnis steht als `aspect-ratio` im
  CSS. Sonst würde `preserveAspectRatio` die Zeichnung einpassen und links und
  rechts leere Ränder lassen.

**Gespeichert wird ausgedünnt:** höchstens 500 Punkte je Lauf als
`[[lat, lon], …]` mit fünf Nachkommastellen (gut ein Meter). Eine Stunde
Aufzeichnung sind schnell ein paar tausend Punkte, und der `localStorage` fasst
nur wenige Megabyte. Anfang und Ende bleiben beim Ausdünnen erhalten. Eine
1,6-km-Runde mit 161 Punkten braucht so knapp 3 KB.

Die Route überlebt Bearbeiten, Export und Import. Das Formular kann sie nicht
ändern, deshalb trägt `updateRun()` sie unverändert weiter – wie `source`.

## Achievements

17 Stück in drei Kategorien, definiert in `js/achievements.js`: acht
Meilensteine (Anzahl Läufe, Gesamtdistanz, Serien), fünf Herausforderungen
(Tageszeit, Bestzeit, Comeback, Distanz-Durchbruch) und vier für Übungen. Sie
werden bei jedem Render automatisch geprüft; die Bonus-XP fließen sofort in
Level und Titel ein.

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
css/style.css       Gestaltung; alle Werte als Tokens ganz oben
js/xp.js            XP-/Level-Logik – pur, kein DOM, kein Storage
js/achievements.js  Achievement-Definitionen + Auswertung – ebenfalls pur
js/titles.js        Titel zum Level – ebenfalls pur
js/geo.js           Haversine, GPS-Filter, Pace/Zeit-Formatierung – ebenfalls pur
js/validation.js    Prüfung der Lauf-Eingaben – ebenfalls pur
js/transfer.js      Export-/Importformat – ebenfalls pur
js/stats.js         Summen, Durchschnitte, Serien, Zeitreihen – ebenfalls pur
js/route.js         GPS-Strecke auf Zeichenflächen-Koordinaten – ebenfalls pur
js/pwa.js           Installationshinweis, eigene Caches erkennen – ebenfalls pur
js/lock.js          Tastensperre: Halte-Fortschritt und Sperrregeln – ebenfalls pur
js/history.js       Freischaltdaten und Titel-Historie – ebenfalls pur
js/exercises.js     Übungsbibliothek und Filter – feste Daten, ebenfalls pur
js/exercise-log.js  Erledigte Übungen: Zähler, Tageslimit, XP – ebenfalls pur
js/training.js      Geplante Einheiten, Abgleich mit den Läufen – ebenfalls pur
js/tracker.js       Live-Aufzeichnung: watchPosition, Pausen, Wake Lock
js/storage.js       Laden/Speichern/Ändern der Läufe im localStorage
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
