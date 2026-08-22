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

**Er erscheint nur im Start-Tab und nur, wenn kein Update ansteht.** Beide
Hinweise stehen im Markup vor den Bereichen und hängen damit über allen fünf
Tabs; mit je drei Zeilen Fließtext waren das 160 px, bevor der erste Inhalt
anfing – im Trophäen-Tab begann die Liste erst darunter. Jetzt ist jeder
einzeilig, und von beiden steht höchstens einer da. **Wenn einer weichen
muss, dann dieser:** der Update-Hinweis ist der einzige Weg aus einer
hängenden alten Fassung, der Installationsvorschlag gilt morgen genauso. Die
Regel steht als `shouldShowInstallHint()` in `pwa.js` und ist dort geprüft.

Die Begründung („dort überleben die Daten zuverlässiger") steht nicht mehr
neben dem Titel: bei 390 px hat die Zeile 278 px, der Titel braucht 205, und
mit Begründung wären es 340 und damit wieder zwei Zeilen. Sie steht als
`title` am Banner und hier.

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

Gesamt-XP setzen sich aus vier Quellen zusammen:

| Quelle | XP | Modul |
|---|--:|---|
| gelaufener Kilometer | 10 | `js/xp.js` |
| abgehakte Übung, je Übung und Kalendertag | 3 | `js/exercise-log.js` |
| eingehaltene Trainingseinheit | 15 | `js/training.js` |
| erreichte Zielwoche | 100 | `js/goal.js` |
| freigeschaltete Trophäe | 10–600 | `js/achievements.js` |

Die Aufteilung steht im Fortschrittsbereich.

Weder XP-Stand noch Trophäen werden **gespeichert** – alles wird immer aus den
Läufen, den abgehakten Übungen, dem Plan und dem Wochenziel berechnet. Dadurch
bleibt alles konsistent, wenn ein Lauf gelöscht oder eine Regel angepasst wird.

## Bereiche

Eine Tab-Leiste am unteren Rand führt durch fünf Bereiche:

- **Start** – alles Bisherige: Fortschritt, Aufzeichnung, Eintragen,
  Trophäen als kompakte Liste, Statistik, Lauf-Liste, Sicherung
- **Übungen** – kuratierte Übungsbibliothek mit Filter, Häkchen und Tagesplan,
  siehe unten
- **Training** – eigene Einheiten auf ein Datum planen, der Abgleich mit den
  tatsächlichen Läufen und die Intervall-Stoppuhr, siehe unten
- **Trophäen** – alle Trophäen als grosse Kacheln, freigeschaltete mit
  Datum, offene mit Fortschrittsbalken oder – wo ein Balken in die Irre
  führte – mit dem Stand als Zeile
- **Profil** – Name, Titel und Level gross mit XP-Balken bis zum nächsten
  Level, Wochenziel, Trophäen-Übersicht je Gruppe, Titel-Historie,
  Gesamtstatistik, Aktivitätsraster, Pace-Verlauf, Bestzeiten und die
  Teilen-Karte

In der Leiste heisst der dritte Bereich nur **Training** – fünf Beschriftungen
müssen auf 360 px nebeneinander passen. Die volle Bezeichnung „Training
erstellen" steht in der Überschrift.

### Übungen

27 Übungen in fünf Kategorien, fest hinterlegt in `js/exercises.js`: Aufwärmen
(5), Lauftechnik (5), Kraft (6), Dehnen (6), Regeneration (5). Jede mit
Anleitung und Richtwert für Dauer oder Wiederholungen. Die Bibliothek selbst ist
unveränderlich; was der Nutzer beisteuert, sind die Häkchen darunter (siehe
„Übungen abhaken") und der Tagesplan.

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

Die Übungs-XP fliessen wie Lauf- und Trophäen-XP ins Level ein. Die
Aufteilung steht im Fortschrittsbereich.

**14 Trophäen** hängen an den Übungen – von „Erste Übung" (1) über
„Hundertfach" (100) und „Eine Woche am Stück" bis „Zwei volle Reihen".
„Vielseitig" verlangt mindestens eine Übung aus **jeder** der fünf Kategorien,
vier reichen nicht.

Gerechnet wird in `js/exercise-log.js`, pur und ohne DOM. Einträge zu
Übungen, die es in der Bibliothek nicht mehr gibt, zählen weiter mit, tragen
aber zu keiner Kategorie bei – sonst ginge der Zähler nach einer Änderung an
der Bibliothek verloren.

### Übungen für einen Tag vornehmen

Neben dem Häkchen steht ein zweiter Knopf: eine Übung lässt sich für einen Tag
**vornehmen**. Gespeichert wird das unter `laufapp.exercise-plan.v1`, gerechnet
in `js/exercise-plan.js`.

Das ist bewusst vom Protokoll getrennt: dort steht, was **gemacht** wurde, hier,
was gemacht werden **soll**. Beide teilen sich nur die `exerciseId`.

- **Ein Vorhaben bringt nie XP.** Die Belohnung hängt am Erledigen – wer sich
  etwas vornimmt, hat noch nichts geleistet.
- **Höchstens 12 Übungen je Tag** (`MAX_PLANNED_PER_DAY`). Kein technischer
  Zwang, sondern eine Bremse: ein Tag mit dreissig Vorhaben ist kein Plan mehr.
- Der Tagesplan erscheint **in der Reihenfolge der Bibliothek**, nicht in der
  Eingabereihenfolge. Die Aufwärmreihe ist als Abfolge gedacht und soll auch
  dann stimmen, wenn sie kreuz und quer eingeplant wurde.
- **Vergangene Tage fallen aus der Übersicht.** Was gestern vorgenommen war,
  ist entweder gemacht oder vorbei, und beides steht woanders. Gespeichert
  bleiben sie trotzdem.

### Zähler von Hand korrigieren

Der Stift an einer Übung öffnet ein Zahlenfeld direkt auf der Karte. Weil es
keinen gespeicherten Zähler gibt – die Zahl **ist** die Anzahl der Einträge –
muss eine Korrektur Einträge entfernen oder ergänzen:

- **Verringern** entfernt die *neuesten* Einträge. Das entspricht dem
  Rückgängigmachen der letzten Tipps und lässt alte Freischaltdaten in Ruhe.
- **Erhöhen** legt Einträge mit dem heutigen Datum an. Damit greift die
  Tagesgrenze weiterhin: eine Korrektur von 9 auf 30 bringt drei XP, nicht
  63.

Fällt der Zähler dabei unter eine Trophäen-Schwelle, **verliert die Trophäe
ihren Status** – sie wird wie alles andere bei jedem Rendern neu abgeleitet,
nichts ist eingefroren.

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

Abschnitte tragen eine Rolle: **Einlaufen, Belastung, Trabpause, Auslaufen**
(`SEGMENT_KINDS`). Höchstens 12 Abschnitte je Einheit, höchstens 50
Wiederholungen je Abschnitt.

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

### Intervalle haben eine eigene Vorgabe

Eine Einheit vom Typ **Intervalle** wird nicht über Abschnitte beschrieben,
sondern über drei Zahlen: Belastung in Sekunden, Pause in Sekunden,
Wiederholungen (`DEFAULT_INTERVAL` = 60 s / 60 s / 8×). Generische Abschnitte
könnten dasselbe ausdrücken, aber niemand tippt zwanzig Abschnitte, um
„8 × 400 m mit 1 min Trabpause" zu sagen.

Grenzen: eine Phase dauert mindestens 5 und höchstens 3600 Sekunden
(`MIN_PHASE_SECONDS`, `MAX_PHASE_SECONDS`).

### Intervall-Stoppuhr

Aus jeder Intervall-Einheit lässt sich ein Training direkt starten – eine runde
Vollbildansicht mit der laufenden Phase, der Restzeit, der Runde und dem, was
als Nächstes kommt.

Gerechnet wird in `js/interval.js`, pur und ohne Zustand: aus der Vorgabe und
der verstrichenen Zeit ergibt sich, welche Phase gerade läuft. Kein Timer im
Modul – wer die Uhr stellt, ist `app.js`. Genau deshalb lässt sich der ganze
Ablauf in Node prüfen, Sekunde für Sekunde.

- Der Ablauf ist **Belastung, Pause, Belastung, Pause …** und endet nach der
  letzten Pause. Die zählt mit: wer acht Runden plant, hat acht Pausen geplant.
- Die Restzeit wird **aufgerundet**. Solange auch nur eine Zehntelsekunde übrig
  ist, steht dort noch eine 1 und nicht schon die 0.
- **Angebrochene Runden zählen nicht.** Wer bei Runde sechs von acht aufhört,
  hat fünf geschafft. Die Zeit dagegen zählt so, wie sie gelaufen wurde.

Am Ende lässt sich das Training als Lauf speichern – mit der Pace der
Belastungsphasen, nicht der Gesamtzeit. Fünf Trophäen hängen daran
(„Intervall-Einsteiger", „Intervall-Routine", „Hundert Runden",
„Fünf Stunden unterwegs", „Tempo im Intervall").

**Signaltöne** kommen aus `js/beep.js` über Web Audio – hoch für die Belastung,
tief für die Pause, drei Töne aufwärts zum Schluss. Kein Sinuston braucht eine
Datei, die geladen, gecacht und mitgeliefert werden müsste. Die Töne werden
ein- und ausgeblendet statt hart geschaltet: ein abrupt beginnender Ton knackt,
und das Knacken ist lauter als der Ton.

Auf iOS startet ein `AudioContext` gesperrt und darf erst durch eine
Nutzeraktion aufwachen – deshalb `unlock()`, aufgerufen aus dem Klick auf
**Start**. Sperrt sich der Bildschirm trotzdem, hört das Betriebssystem
irgendwann auf, uns Rechenzeit zu geben; dagegen ist von hier aus nichts
auszurichten.

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
Wimpernschlag, und die Alternative wären zweiundsechzig handgeschriebene
Fortschreibungen, die mit jeder neuen Regel wieder auseinanderlaufen.

### Notiz und Gefühl

Zu jedem Lauf lassen sich zwei Dinge festhalten, die kein Messgerät liefert:
eine **Notiz** (200 Zeichen) und ein **Gefühl** auf einer Skala von 1 bis 5 –
*mies, zäh, geht so, gut, stark*. Beides ist optional und steht danach in der
Detailansicht.

Warum genau fünf: Drei Stufen sind zu grob, um einen Verlauf zu zeigen; sieben
täuschen eine Genauigkeit vor, die ein Gefühl nicht hat. Und warum Chips statt
eines Schiebereglers: Ein Regler legt Zwischenwerte nahe, die es nicht gibt.
Eine 3,5 wird abgelehnt – wer sie zulässt, kann später nicht mehr sagen, was
er gezählt hat.

Die Beschriftungen stehen als `FEELINGS` in `js/validation.js`, nicht in der
Anzeige. Was eine 2 bedeutet, gehört zur Bedeutung des Werts, nicht zu seiner
Darstellung: eine spätere Auswertung („Läufe, bei denen es sich gut anfühlte")
braucht dieselbe Zuordnung.

### Wetter

Vier Kästchen darunter: **Sonne, Wolken, Regen, Schnee**. Kein Abruf im Netz —
eine Wetter-Schnittstelle wäre genauer und würde drei Dinge kosten, die dieses
Projekt tragen: eine Abhängigkeit, eine Netzverbindung und einen Schlüssel, der
irgendwo liegen muss. Vier Kästchen kosten nichts und beantworten dieselbe
Frage gut genug.

**Warum diese vier und nicht Wind:** Sie schliessen einander aus — jeder Lauf
fällt in genau eins. Wind tut das nicht; es kann sonnig *und* windig sein. Eine
Auswahl, bei der zwei Antworten gleichzeitig stimmen, lässt sich später nicht
auswerten. Wind gehört deshalb in die Notiz.

Gespeichert wird der Wert (`'sonne'`), nicht die Beschriftung („Sonne") — die
lässt sich dann umbenennen, ohne alte Läufe anzufassen. Die Symbole liegen im
selben Vorrat wie die der Stoppuhr; Emoji wären es nicht geworden, weil sie auf
jedem Gerät anders aussehen.

**Ausgewertet wird noch nichts.** Notiz, Gefühl und Wetter werden erfasst,
gespeichert und angezeigt – mehr nicht. Das ist Absicht: eine Auswertung über
drei Läufe wäre Zahlenspielerei.

### Kilometer-Splits

Nach einem aufgezeichneten Lauf zeigt die Detailansicht **jeden Kilometer
einzeln** — mit Zeit und Balken. Der Balken misst gegen den eigenen besten
Kilometer, und **lang heisst schnell**: Er zeigt das Tempo, nicht die
verbrauchte Zeit. Andersherum wäre der langsamste Kilometer der längste
Neonstreifen, und Neongrün gehört in dieser App vier Dingen, die alle etwas
Erreichtes meinen.

⚠️ **Nur für Läufe, die ab jetzt aufgezeichnet werden.** Der Grund steht im
Datenmodell: In der gespeicherten Strecke stehen **nur Koordinaten, keine
Zeiten** — der Zeitstempel jeder Position wird verworfen, sobald die Distanz
daraus gewachsen ist. Aus einer alten Spur lässt sich kein Split rechnen: Man
weiss, *wo* der Kilometer lag, aber nicht *wann*.

Statt an jeden der bis zu 500 Streckenpunkte eine Zeit zu hängen, schreibt die
Aufzeichnung die Kilometer-Übergänge live mit — eine Zahl je Kilometer statt
500. Beides hilft alten Läufen nicht; das eine kostet ein Fünfhundertstel des
Platzes. Von Hand eingetragene und mit der Stoppuhr erfasste Läufe haben
ebenfalls keine Splits, weil sie keine Strecke haben.

### Ansagen beim Laufen

Bei jedem vollen Kilometer sagt die App **„Ein Kilometer. 5 Minuten 42."** —
über die Sprachausgabe, die jeder Browser mitbringt. Keine Audiodatei, keine
Abhängigkeit, dasselbe Prinzip wie bei den Signaltönen der Intervall-Stoppuhr.

Der Schalter steht in der Aufzeichnungs-Karte und **nur dort, wo er wirkt**:
Ohne GPS gibt es keine Strecke und damit keinen Kilometer anzusagen; kennt der
Browser keine Sprachausgabe, wäre er ein Versprechen, das niemand einlöst. In
beiden Fällen ist die Zeile ausgeblendet.

Ausgeschrieben statt in Ziffern, weil eine Sprachausgabe die „1" als *eins
Kilometer* und die „5:42" als Uhrzeit vorliest. Ein GPS-Sprung wird zu einer
Ansage zusammengefasst — zwei im selben Atemzug wären Lärm. Und unter einer
Minute je Kilometer wird gar kein Tempo genannt: Das wäre ein Sprung und kein
Laufen.

⚠️ **Was hier niemand prüfen konnte:** ob die Ansage neben laufender Musik
durchkommt, ob sie bei gesperrtem Bildschirm noch gesprochen wird und wie die
Stimme des jeweiligen Geräts klingt. Das entscheidet das Betriebssystem, und
dafür gibt es keine Attrappe. Der Vorbehalt ist derselbe wie beim Ton der
Intervall-Stoppuhr.

## Wochenziel

Im Profil lässt sich ein **Ziel von Läufen pro Woche** setzen (höchstens 14,
`MAX_WEEKLY_GOAL`). Der Stand der laufenden Woche steht als Ring darüber. Jede
erreichte Woche bringt **100 XP** (`XP_PER_GOAL_WEEK`), gerechnet in
`js/goal.js`.

Zum Profil gehört auch ein **Name** (höchstens 30 Zeichen, `MAX_NAME_LENGTH`) –
er begrüßt auf der Startseite und steht auf der Teilen-Karte.

Gezählt wird ab `goalSince`, dem Tag, an dem das aktuelle Ziel gesetzt wurde.
Ohne diese Grenze liesse sich der Bonus beliebig ernten: Ziel auf 1 stellen, und
jede jemals gelaufene Woche zahlte rückwirkend aus. Dasselbe Problem löst
`training.js` mit `createdAt` – ein Vorhaben zählt nur, wenn es vorher feststand.

Die Kehrseite: **wer das Ziel ändert, fängt von vorn an zu zählen.** Das ist
gewollt. Ein Ziel im Nachhinein zu senken und dafür bezahlt zu werden wäre keine
Zielerfüllung, sondern Buchhaltung.

Die laufende Woche zählt mit, sobald das Ziel erreicht ist, und nicht erst am
Sonntag. Auf den Bonus bis Wochenende zu warten wäre die schlechtere Rückmeldung.

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

### Aktivitätsraster

Im Profil: **18 Wochen** als Raster mit sieben Zeilen, ein Feld je Tag, von
hell nach neon eingefärbt. Vier Stufen über „kein Lauf", getrennt bei 5, 10 und
15 km (`ACTIVITY_LEVELS`): bis 5 km ein normaler Feierabendlauf, bis 10 km eine
ordentliche Runde, bis 15 km ein langer, darüber ein sehr langer. Gezählt wird
die **Summe des Tages** – zweimal 5 km sind ein 10-km-Tag.

Die Liste beginnt am Montag der ersten gezeigten Woche und endet am Sonntag der
laufenden, ist also immer ein Vielfaches von sieben und lässt sich ohne Rechnung
spaltenweise füllen. Tage nach heute sind als `future` ausgezeichnet: sie halten
das Raster rechteckig, sind aber keine Aussage.

### Pace-Verlauf

Eine Linie der Ø-Pace je Zeitraum. Gebündelt wird nach **Wochen**, solange die
Läufe in ein Vierteljahr passen, sonst nach **Monaten** – zwölf Wochenpunkte
sind lesbar, fünfzig sind ein Zaun.

- **Unter drei Punkten wird nichts gezeichnet** (`PACE_TREND_MIN_POINTS`). Zwei
  Punkte sind keine Entwicklung, sondern ein Vergleich – und als Linie gezeichnet
  behaupten sie eine Richtung, die die Daten nicht hergeben.
- **Zeiträume ohne Lauf fallen heraus** statt auf 0 zu gehen. Eine Pace von null
  wäre kein langsamer Zeitraum, sondern gar keiner.
- Der Durchschnitt ist **nach Strecke gewichtet** – zwanzig Kilometer in 6:00
  wiegen schwerer als zwei in 5:00.

### Bestzeiten

Schnellste Zeit über 5, 8, 10, 12, 15 und 21,1 km (`BEST_TIME_DISTANCES`).

Zugeordnet wird mit **100 m Toleranz** (`BEST_TIME_TOLERANCE_KM`). Gespeicherte
Strecken sind reine Punktlisten ohne Zeitstempel (siehe `route.js`) –
Kilometer-Splits lassen sich daraus nicht rekonstruieren. Eine Bestzeit kann
deshalb nur aus der Gesamtzeit eines Laufs kommen, der ohnehin fast genau so
lang war. Hundert Meter sind der Spielraum, den eine GPS-Aufzeichnung von
5,00 km üblicherweise streut; wer 5,3 km gelaufen ist, hat keine 5-km-Zeit
gestellt, sondern eine über 5,3 km.

Gewertet wird nur, was auch gemessen wurde: ein Lauf ohne Dauer und ohne Pace
bringt keine Zeit ein. Bei gleicher Zeit gewinnt der **frühere** Lauf – die
Bestzeit ist dann dort gefallen und wird nicht später noch einmal vergeben.

## Teilen-Karte

Im Profil erzeugt **Teilen** ein Bild im Hochformat (1080 × 1350, wie es
Messenger und Stories erwarten) mit Name, Abzeichen, Titel, Fortschrittsbalken
und Kennzahlen. Zur Wahl stehen vier Zuschnitte: **einzelner Lauf, Gesamt,
Woche, Monat**. Gezeichnet wird auf ein Canvas in `js/share-card.js`, in
denselben Farben wie die App – die Karte soll wiedererkennbar sein.

Der XP-Text unter dem Balken bleibt weg. Auf einer Karte, die an Freunde geht,
ist „noch 53 XP bis Level 6" eine Zahl ohne Bedeutung – der Balken zeigt
dasselbe und braucht keine Erklärung.

Das Modul kennt kein DOM ausser dem Canvas: was gezeichnet wird, kommt als
fertige Daten herein. Damit lässt sich die Aufteilung prüfen, ohne einen Browser
zu starten.

## Daten bearbeiten und sichern

**Bearbeiten:** Der Stift an einem Lauf lädt ihn ins Formular. Distanz, Datum,
Startzeit, Dauer, Notiz, Gefühl und Wetter lassen sich ändern; `id`, die
GPS-Markierung und die Strecke bleiben erhalten. Geleerte Felder verschwinden
auch wirklich aus dem Datensatz.

⚠️ **Für alle, die hier ein Feld ergänzen wollen:** `addRun()` und
`updateRun()` in `js/storage.js` zählen die Felder eines Laufs **einzeln
auf**, statt den geprüften Lauf zu übernehmen. Das ist der Preis dafür, dass
ein geleertes Feld wirklich verschwindet. Wer eine der beiden Stellen
vergisst, bekommt keinen Fehler – der Lauf wird gespeichert, nur ohne das
Feld. Zwei Tests in `tests/storage.test.mjs` wachen darüber; sie fragen
`validateRun`, was ein Lauf haben darf, und wachsen deshalb von allein mit.

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

**Erinnerung an die Sicherung.** Ist die letzte Sicherung mehr als 30 Tage her
– oder gab es noch nie eine –, steht über den beiden Knöpfen ein Hinweis. Er
sitzt bewusst dort und nicht im Profil: die Abhilfe ist der Knopf direkt
darunter, und ein Hinweis, dessen Abhilfe einen Tab weiter liegt, wird
weggeklickt statt befolgt. Ohne einen einzigen Lauf erscheint er nicht – ein
Hinweis, der zum Sichern von nichts auffordert, bringt sich selbst um die
Wirkung. Ob er fällig ist, entscheidet `exportReminder()` in `js/transfer.js`,
pur und ohne Uhr; der Tag steht unter `laufapp.export.v1`.

Ein **Import zählt als Sicherung**: in dem Moment existiert nachweislich eine
Datei mit genau diesen Daten. Genommen wird dabei der Tag des Imports, nicht
das `exportedAt` aus der Datei – wer eine halbjährige Sicherung einliest,
bekäme sonst sofort die Erinnerung, obwohl er gerade das Richtige getan hat.
Der Tag selbst wandert **nicht** in die Exportdatei: er beschreibt nicht die
Daten, sondern die Gewohnheit dieses einen Browsers.

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

Alle Zahleneingaben – Distanz, Dauer, die Abschnitte einer Einheit, die
Intervall-Vorgabe und die Zähler-Korrektur – sind bewusst **kein**
`type="number"`. Der Browser akzeptiert dort nur den Punkt als
Dezimaltrennzeichen und verwirft „0,4" schon beim Tippen; auf einer deutschen
Tastatur ist das aber die normale Schreibweise. Die Zifferntastatur auf dem
Handy kommt stattdessen über `inputmode`.

Gelesen wird überall mit `parseNumber()` aus `js/validation.js`, nie mit
`Number()` oder `parseFloat()` — es nimmt Komma wie Punkt und liefert für
Leerstring und Buchstabensalat `null`. Das ist der Unterschied, auf den es
ankommt: `Number('')` ist 0, und eine 0 würde einen Zähler löschen statt eine
Rückfrage auszulösen.

### Was gespeichert wird

Alle Schlüssel tragen weiterhin das Präfix `laufapp.` – siehe ganz oben.

| Schlüssel | Inhalt |
|---|---|
| `laufapp.runs.v1` | Läufe |
| `laufapp.exercises.v1` | erledigte Übungen |
| `laufapp.training.v1` | geplante Einheiten |
| `laufapp.exercise-plan.v1` | für Tage vorgenommene Übungen |
| `laufapp.profile.v1` | Name, Wochenziel, `goalSince` |
| `laufapp.recording.v1` | zuletzt gewählte Aufzeichnungsart |
| `laufapp.export.v1` | Tag der letzten Sicherung |
| `laufapp.installHint.dismissed` | Installationsbanner weggeklickt |

## Gestaltung

Dunkel, reduziert, sportlich. Alle Werte stehen als Custom Properties oben in
`css/style.css` – Farben, Abstandsskala, Rundungen. Wer etwas ändern will,
ändert dort einen Token statt dreißig Regeln.

- **Hintergrund** `#0d0f12`, Karten und Flächen in abgestuften Grautönen
### Hell und dunkel

Die App kennt beide Schemata und folgt standardmässig dem Gerät. Im Profil
lässt sich das überstimmen: **Wie das Gerät · Hell · Dunkel**. Die Wahl gilt
sofort, überlebt das Schliessen und bleibt auf diesem Gerät — sie wandert
nicht in die Exportdatei, denn eine Sicherung beschreibt die Läufe, nicht die
Vorlieben eines Telefons.

⚠️ **Im hellen Schema ist der Akzent kein Neongrün.** `#c4f000` auf Weiss sind
1,4:1 — als Schrift unlesbar, als Fläche ausgewaschen. Dort steht `#5a7600`.
Das kostet den Neon-Charakter, und es ist der Preis dafür, dass die App bei
Sonne draussen lesbar bleibt. **Wer den Neon-Look will, wählt Dunkel** —
deshalb wird nichts erzwungen.

Alle Kontraste im hellen Schema sind nachgemessen und liegen über den 4,5:1
der WCAG-Stufe AA: Text 16,6:1 · Fliesstext 9,0:1 · gedämpft 5,6:1 · schwach
4,6:1 · Akzent auf dem Grund 4,8:1 · Schrift auf dem Akzent 5,2:1.

⚠️ **Für alle, die hier Farben ergänzen:** Sie gehören **ausschliesslich** in
die Token-Blöcke ganz oben in `css/style.css`. Eine Farbe mitten im Regelwerk
lässt sich nicht umschalten und bleibt im hellen Schema stehen, wo sie
hingehörte, als alles dunkel war — und niemand bemerkt es, solange niemand
umschaltet. Ein Test lässt keine durch.

- **Neongrün** `#c4f000` als einziger Akzent im dunklen Schema, bewusst sparsam: Fortschritt,
  freigeschaltete Trophäen, Streckenlinie, primäre Aktion. Käme es überall
  vor, hebt es nichts mehr hervor.
- **Text** weiß für Überschriften und Werte, helles Grau für Fließtext

Der Level-/XP-Bereich ist der Blickfang: Levelzahl in 52 px Neon, breiter
Fortschrittsbalken, alles Weitere tritt zurück.

Freigeschaltete Trophäen bekommen Neonrahmen, getönte Fläche und einen
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

Nebeneinander stehende Felder stehen auf einer Höhe, auch wenn die
Beschriftungen unterschiedlich lang sind: `.field` ist ein Raster, das die
Zeilen von `.fields` per `subgrid` erbt. Ohne das rutscht ein Feld mit
zweizeiliger Beschriftung gegen sein Nachbarfeld.

Keine Schriftart wird nachgeladen – der Systemfont-Stack landet auf Android bei
Roboto, auf iOS bei SF Pro, beide modern und ohne Ladezeit oder Drittanbieter.

## Tests

```bash
node --test
```

**1026 Tests in 27 Dateien** im Ordner `tests/`, ausgeführt vom eingebauten
Testrunner von Node — keine Abhängigkeiten, kein Framework, nichts zu
installieren.

| Datei | Tests | prüft |
|---|--:|---|
| `tests/styles.test.mjs` | 90 | CSS- und Markup-Regeln, die Node nicht ausführen kann; Auswahlreihen gegen ihre Datenquelle; keine Farbe ausserhalb der Token |
| `tests/achievements.test.mjs` | 89 | jede Bedingung knapp darunter und darauf, und dass jede offene Trophäe ihren Stand zeigt |
| `tests/stats.test.mjs` | 82 | Summen, Serien mit Lücken, Raster, Pace-Verlauf, Bestzeiten |
| `tests/validation.test.mjs` | 80 | Pflicht- und Optionalfelder, erfundene Kalendertage, Gefühlsskala, Wetter, Splits |
| `tests/transfer.test.mjs` | 69 | Export-Roundtrip, kaputte und halbe Importdateien |
| `tests/storage.test.mjs` | 64 | Anlegen/Ändern/Löschen/Ersetzen, Neuberechnung, volles Fach, kein Feld geht verloren |
| `tests/imports.test.mjs` | 62 | jeder Import-Pfad und -Name gegen den Dateibaum |
| `tests/training.test.mjs` | 59 | Abschnitte, Intervall-Vorgabe, Abgleich, Plantreue und XP |
| `tests/exercise-log.test.mjs` | 37 | Tageslimit, Zähler, Kategorien für Vielseitig |
| `tests/route.test.mjs` | 33 | Projektion, Seitenverhältnis, Geraden, Ausdünnen |
| `tests/pwa.test.mjs` | 33 | Installationshinweis, Cache-Trennung, `APP_SHELL` vollständig |
| `tests/geo.test.mjs` | 32 | Haversine gegen bekannte Strecken, alle GPS-Filtergrenzen |
| `tests/tracker.test.mjs` | 32 | Start/Pause/Beenden, Fehlerfälle, Geolocation-Attrappe, Kilometer-Splits |
| `tests/format.test.mjs` | 31 | Zahlen, Daten, Zeiten – auch die Rundung genau auf der Hälfte |
| `tests/speech.test.mjs` | 23 | Wann angesagt wird und was – Kilometergrenze, GPS-Sprung, Sprachausgabe-Attrappe |
| `tests/interval.test.mjs` | 22 | Phasenwechsel, Restzeit, angebrochene Runden |
| `tests/exercise-plan.test.mjs` | 20 | Tagesgrenze, Reihenfolge, Doppelte |
| `tests/exercises.test.mjs` | 20 | Vollständigkeit der Übungsdaten, Filter, Zählung |
| `tests/lock.test.mjs` | 20 | Halte-Fortschritt, Sperrregeln, Freigabe im Notfall |
| `tests/beep.test.mjs` | 19 | Tonfolgen, Ein- und Ausblenden, gesperrtes Audio auf iOS |
| `tests/history.test.mjs` | 18 | Freischaltdaten, Titel-Historie, Monotonie-Annahme |
| `tests/share-card.test.mjs` | 18 | Aufteilung und Höhenberechnung der Karte |
| `tests/stopwatch.test.mjs` | 18 | Start/Pause/Beenden ohne GPS, gleiche Form wie `tracker` |
| `tests/goal.test.mjs` | 15 | Zielwochen ab `goalSince`, laufende Woche, Bonus-XP |
| `tests/xp.test.mjs` | 15 | XP pro km, Aufstiegskosten, jede Levelgrenze bis 5000 |
| `tests/wake-lock.test.mjs` | 13 | Anfordern, Freigeben, Rückkehr in den Tab |
| `tests/titles.test.mjs` | 12 | feste Stufen, endlose Legenden, `nextTitle` bis Level 3000 |

Getestet wird das Verhalten an den **Grenzen**: 4 gegen 5 Läufe, 49,9 gegen
50 km, 13 gegen 14 Tage Pause, 06:59 gegen 07:00 Uhr, +19 % gegen +20 %. Ein
Test, der nur den Normalfall prüft, fängt keine Regression.

`tests/helpers.mjs` enthält die Attrappe für `navigator.geolocation`. Damit
lassen sich Positionsfolgen einspeisen, ohne echtes GPS — inklusive
abgelehnter Freigabe und Timeout. Die Attrappen für Web Audio (`beep.js`) und
`navigator.wakeLock` stehen dagegen in ihrer eigenen Testdatei: sie werden nur
an einer Stelle gebraucht, und eine geteilte Attrappe für einen einzigen Nutzer
ist ein Umweg.

`beep.js` merkt sich seinen `AudioContext` in einer Modulvariablen. Ein Test,
der einen anderen Ausgangszustand braucht — kein Web Audio, gesperrtes Audio —
lädt das Modul deshalb über eine eindeutige Import-Adresse
(`../js/beep.js?frisch=3`) noch einmal frisch. Das ist der einzige Ort im
Projekt, an dem der Modul-Cache umgangen wird.

Die App selbst läuft im Browser, die Tests laufen in Node. Möglich ist das,
weil **alle Module ausser `app.js`, `js/views/*`, `storage.js`, `tracker.js`,
`stopwatch.js` und `wake-lock.js` pur sind** – kein DOM, kein Storage. `tracker.js` liest
`navigator.geolocation` erst beim Start, nicht beim Laden — genau deshalb lässt
es sich unterschieben.

## Aufzeichnen

Im Abschnitt „Lauf aufzeichnen" stehen **zwei Wege** zur Wahl, und die Wahl
wird gemerkt (`laufapp.recording.v1`, Voreinstellung: ohne GPS):

- **Mit GPS** – Strecke und Zeit, siehe unten.
- **Ohne GPS** – reine Zeitnahme über `js/stopwatch.js`. Nach aussen dieselbe
  Form wie der Tracker: `start`, `pause`, `resume`, `stop`, `discard`,
  `getState`. Nur so lässt sich in `app.js` umschalten, ohne Bedienung,
  Tastensperre und Anzeige zu verdoppeln. Die Streckenfelder gibt es auch hier,
  sie bleiben nur bei `null`. **Es wird kein Standort abgefragt** – deshalb
  fragt das Betriebssystem auf diesem Weg auch nie nach der Freigabe.

Beide halten über `js/wake-lock.js` den Bildschirm wach. Beim GPS-Tracking
schläft sonst die Ortung mit dem Bildschirm ein, bei der Stoppuhr verliert man
die Zeit aus dem Blick — deshalb liegt es an einer Stelle und nicht zweimal
daneben. Fehlschläge sind kein Grund abzubrechen: im Akkusparmodus gibt das
Betriebssystem den Lock einfach nicht her.

### Live-Tracking (GPS)

Die App liest Positionen über `navigator.geolocation.watchPosition`, summiert
die Strecke und legt beim Beenden automatisch einen Lauf an (Distanz, Datum,
Startzeit, Dauer, `source: 'gps'`). Startzeit und Dauer füllen nebenbei die
Bedingungen für Frühaufsteher, Nachteule und Neue Bestzeit.

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

- Das GPS braucht **HTTPS oder localhost**. Über eine andere Adresse ist der
  Start-Knopf deaktiviert. Die Stoppuhr läuft überall.
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

Läufe ohne Aufzeichnung – von Hand eingetragene, mit der Stoppuhr erfasste und
alle aus der Zeit vor diesem Feature – zeigen stattdessen „Keine GPS-Daten für
diesen Lauf."

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

## Trophäen

**62 Stück in drei Kategorien**, definiert in `js/achievements.js`:

| Kategorie | Anzahl | worum es geht |
|---|--:|---|
| Meilensteine | 30 | Anzahl Läufe, Gesamtdistanz, Serien, Intervall-Runden, Gesamtzeit |
| Herausforderungen | 18 | Tageszeit, Tempo, Bestzeit, Comeback, Distanz-Durchbruch |
| Übungen | 14 | Zähler, Übungstage, Serien, Kategorien-Abdeckung |

Zusammen **5055 Bonus-XP**. Sie werden bei jedem Render automatisch geprüft; die
XP fliessen sofort in Level und Titel ein.

**60 der 62 zeigen, wie weit es noch ist** – und zwar auf zwei Arten, weil eine
nicht reicht:

- **55 mit Balken** (`progress(stats)`): ein Zähler, der zum Ziel hochläuft.
  „78 / 100 km".
- **5 mit einer Zeile** (`standing(stats)`): „Beste Pace: 6:15 · nötig: unter
  6:00 min/km". Für die Fälle, in denen ein Balken schlicht falsch wäre. Eine
  Pace läuft **nach unten** – bei „5,8 von 6,0" stünde der Balken fast am Ende
  und wäre doch schon erfüllt, bei 7:00 auf ein Ziel von 6:00 stünde er über
  100 %. Und beim **langen Atem** wächst das Ziel mit dem Stand mit (120 % des
  längsten Laufs): der Balken stünde für immer bei 83 % und bewegte sich nie.

**Zwei zeigen nichts, mit Absicht.** An einer **Bestzeit** gibt es nichts zu
zählen – sie fällt in dem Moment, in dem sie fällt. Und beim **Comeback**
(14 Tage Pause) wäre ein Fortschrittsbalken die Aufforderung, länger nicht zu
laufen. Eine Lauf-App, die zum Nichtlaufen gratuliert, hat sich vertan.

Auslegungen, die in der Spezifikation offen waren:

- **Eiserner Wille** = längste Spanne von mindestens 30 Tagen, in der nie länger
  als 7 Tage pausiert wurde (`longestWeeklyStreakDays`).
- **Neue Bestzeit** = ein Lauf unterbietet die eigene beste Dauer auf 5 oder
  10 km (`PR_DISTANCES_KM`). Zugeordnet wird mit ±0,5 km Toleranz
  (`PR_TOLERANCE_KM`) – grosszügiger als bei den Bestzeiten im Profil, weil hier
  die persönliche Verbesserung zählt und nicht die Vergleichbarkeit der Marke.
- **Der lange Atem** = ein Lauf ist mindestens 20 % länger als der bis dahin
  längste; braucht also mindestens zwei Läufe.
- **Tempo-Trophäen** werten nur Läufe ab 3 km (`PACE_MIN_DISTANCE_KM`). Die
  Stufen liegen bei 6:00, 5:30 und 5:00 min/km. Ein schneller Kilometer ist
  kein Tempolauf.
- **Schneller geworden** verlangt eine Verbesserung um mindestens 0:30 min/km
  (`PACE_IMPROVEMENT_MIN`) gegenüber der früheren Ø-Pace.

## Titel

Definiert in `js/titles.js`: Level 1 Neuling, 5 Läufer, 15 Ausdauerläufer,
30 Veteran, 80 Elite, danach alle 50 Level `Legende I`, `Legende II`, … –
endlos. Die erste Legenden-Stufe beginnt damit bei Level 130.

Zu jedem Titel gehört ein **Abzeichen** aus `icons/badges/`, aufsteigend von
Bronze bis zum Kronen-Schild. Die Zuordnung steht ausschliesslich in
`titles.js` (`badge` je Stufe, dazu `badgeForLevel()` und `badgeSrc()`) – die
Anzeigestellen fragen nur ab. Es gibt sechs Bilder, aber endlos viele
Legenden-Stufen: alle teilen sich das Kronen-Abzeichen, unterschieden werden
sie durch die römische Ziffer im Text. Ein Test prüft, dass das Bild nur dort
wechselt, wo auch der Titel wechselt.

Gezeigt wird es an drei Stellen: klein in der Titel-Pille im Fortschritts-
bereich, gross über dem Rang im Profil und auf der Teilen-Karte. Die Grafiken
bringen Plastik und Glanz schon mit, deshalb setzt das CSS nur Grösse und
Abstand – kein Rahmen, keine Tönung. Sie sind der einzige Ort in der App mit
voller Farbigkeit.

## Struktur

28 Module: 25 in `js/`, 3 in `js/views/`. Alle sind pur – kein DOM, kein
Storage – ausser den unten mit `*` markierten.

Die Ansichten unter `js/views/` gibt es seit dem Umbau, der `app.js` von 4.132
auf 3.091 Zeilen gebracht hat. Der Gedanke dahinter: eine Datei, die man nicht
mehr am Stück lesen kann, ist eine Datei, in der Fehler wohnen können, ohne
gefunden zu werden. Herausgelöst sind bisher das Trainingsformular und die
Statistik – die grössten zwei Brocken. Der Rest folgt, wenn er sich lohnt, nicht
weil eine Liste abgearbeitet werden will.

```
index.html            Markup, alle fünf Bereiche in einem Dokument
css/style.css         Gestaltung; alle Werte als Tokens ganz oben
manifest.json         PWA-Manifest
sw.js                 Service Worker (App-Shell-Cache)

js/app.js             Verdrahtung und die noch nicht herausgelösten Bereiche *
js/views/dom.js       Die Verweise aufs Markup, einmal gesucht *
js/views/training.js  Trainingsformular, Planliste, Löschrückfrage *
js/views/stats.js     Statistik, Aktivitätsraster, Pace-Verlauf, Bestzeiten *
js/storage.js         Laden/Speichern/Ändern aller Datentöpfe *
js/tracker.js         Live-Aufzeichnung: watchPosition, Pausen *
js/stopwatch.js       Aufzeichnung ohne GPS, gleiche Form wie tracker *
js/wake-lock.js       Bildschirm wach halten *

js/xp.js              XP-/Level-Logik – die Kernformel
js/titles.js          Titel und Abzeichen zum Level
js/achievements.js    Trophäen-Definitionen + Auswertung
js/history.js         Freischaltdaten – teuer, siehe „Was langsam ist"
js/goal.js            Wochenziel: erreichte Wochen und Bonus-XP
js/stats.js           Summen, Serien, Zeitreihen, Raster, Pace-Verlauf, Bestzeiten
js/geo.js             Haversine, GPS-Filter, Pace-/Zeitformatierung
js/format.js          Zahlen, Daten und Zeiten in Anzeigeform
js/route.js           GPS-Strecke auf Zeichenflächen-Koordinaten
js/validation.js      Prüfung aller Eingaben
js/transfer.js        Export-/Importformat
js/training.js        Geplante Einheiten, Intervall-Vorgaben, Abgleich
js/interval.js        Phasenberechnung Belastung/Pause
js/beep.js            Signaltöne für die Intervall-Stoppuhr (Web Audio)
js/speech.js          Ansagen beim Laufen: der Text (pur) und die Sprachausgabe *
js/exercises.js       Übungsbibliothek und Filter – feste Daten
js/exercise-log.js    Erledigte Übungen: Zähler, Tageslimit, XP
js/exercise-plan.js   Für einen Tag vorgenommene Übungen
js/share-card.js      Zeichnet die Teilen-Karte aufs Canvas
js/lock.js            Tastensperre: Halte-Fortschritt und Sperrregeln
js/pwa.js             Installationshinweis, eigene Caches erkennen

icons/icon-*.png      App-Icon; die maskable-Fassung hat Rand für Androids Zuschnitt
icons/badges/         Rang-Abzeichen zu den Titeln, 160 px hoch
tests/                Node-Tests, laufen mit `node --test`
tools/                Messwerkzeuge – kein Teil der App, nicht im Offline-Cache
```

`* = fasst DOM, Storage oder Browser-APIs an und läuft deshalb nicht in Node.`

## Was langsam ist

Eine Zahl, damit niemand raten muss: **die Freischaltdaten der Trophäen**
(„freigeschaltet am 14.08.") werden berechnet, indem die gesamte Historie noch
einmal durchgespielt wird – Lauf für Lauf, jedes Mal alle Bedingungen neu. Das
kostet quadratisch:

| Daten | Zeit |
|---|--:|
| 200 Läufe | 74 ms |
| 200 Läufe + 600 Übungen | 314 ms |
| 1.000 Läufe + 3.000 Übungen | 7,5 s |

Gemessen mit `node tools/mess-history.mjs` auf einem Windows-Rechner; ein
Telefon rechnet drei- bis zehnmal langsamer.

**Wo es sich bemerkbar macht:** nur im Trophäen-Bereich. Er ist der einzige
Aufrufer, und er wird bewusst erst beim Ansehen aufgebaut. Solange er offen
ist, läuft die Rechnung allerdings bei jedem Speichern erneut. Alles andere –
XP, Level, welche Trophäen erfüllt sind – kostet bei 2.000 Läufen **7 ms**.
Teuer ist ausschliesslich die Frage *wann*, nicht die Frage *ob*.

Warum es überhaupt so gebaut ist: Alle Bedingungen sind monoton – was einmal
erfüllt war, bleibt erfüllt. Deshalb genügt ein Durchspielen, und es braucht
keine zwei Dutzend handgeschriebene Fortschreibungen, die mit jeder neuen
Trophäe wieder auseinanderlaufen. Der Preis dafür steht in der Tabelle. Die
Behebung ist als **B4b** in `ROADMAP.md` geplant, samt Auflage: vorher und
nachher messen.

## Erweiterung später

**Neue Trophäe:** einen Eintrag in `ACHIEVEMENTS` (`js/achievements.js`)
ergänzen – `id`, `name`, `description`, `xp`, `category`, `check(stats)` und
**eines von beiden**: `progress(stats)` für den Balken oder `standing(stats)`
für die Zeile, wenn ein Balken in die Irre führen würde. Reicht die vorhandene
Statistik nicht, ein Feld in `buildRunStats()` ergänzen. Anzeige und
XP-Verrechnung laufen automatisch mit.

⚠️ **Ohne beides wird die Testsuite rot.** Die Ausnahmeliste hat genau zwei
Einträge, und die sind über `ACHIEVEMENTS` begründet. Wer eine dritte Trophäe
stumm lassen will, muss die Begründung dazuschreiben – nicht nur die Liste
verlängern.

⚠️ Die Bedingung **muss monoton sein** – was einmal erfüllt war, muss erfüllt
bleiben. Sonst zerfallen die Freischaltdaten (siehe „Zeitpunkte statt nur
Zustände"). Ein Test wacht darüber.

**Neuer Titel:** Eintrag in `BASE_TITLES` (`js/titles.js`), aufsteigend
sortiert; für die endlosen Stufen `ENDLESS_START_LEVEL` / `ENDLESS_STEP`.

**Neue Datei:** in `APP_SHELL` in `sw.js` eintragen, sonst fehlt sie offline.

Beim Ändern der App-Dateien `CACHE_VERSION` in `sw.js` hochzählen, sonst
liefert der Service Worker den alten Stand aus.
