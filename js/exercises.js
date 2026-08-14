/**
 * Übungsbibliothek für Läufer.
 *
 * Feste, kuratierte Daten – keine Nutzereingabe, keine Persistenz. Pur und
 * ohne DOM, damit sich Inhalt und Filter prüfen lassen.
 *
 * Die Angaben sind allgemeine Richtwerte aus dem Lauftraining, keine
 * medizinische Beratung. Bei Schmerzen gehört das abgeklärt, nicht gedehnt.
 */

/** @typedef {'mobility'|'drills'|'kraft'|'warmup'|'regeneration'} CategoryId */

export const ALL_CATEGORIES = 'alle';

/** @type {{ id: CategoryId, label: string, description: string, ordered?: boolean }[]} */
export const CATEGORIES = [
  {
    id: 'warmup',
    label: 'Aufwärmen',
    description: 'Kurze Reihe vor dem Lauf, in dieser Reihenfolge.',
    ordered: true,
  },
  {
    id: 'drills',
    label: 'Lauftechnik',
    description: 'Kurze Läufe für sauberen Schritt und Frequenz.',
  },
  {
    id: 'kraft',
    label: 'Kraft',
    description: 'Zwei Einheiten pro Woche reichen für den Anfang.',
  },
  {
    id: 'mobility',
    label: 'Dehnen',
    description: 'Ruhig halten, nicht wippen, nie in den Schmerz.',
  },
  {
    id: 'regeneration',
    label: 'Regeneration',
    description: 'Nach dem Lauf oder an freien Tagen.',
  },
];

/** @type {{ id: string, name: string, category: CategoryId, instruction: string, dose: string }[]} */
export const EXERCISES = [
  // --- Aufwärmen: als Abfolge gedacht ------------------------------------
  {
    id: 'warm-traben',
    name: 'Lockeres Traben',
    category: 'warmup',
    instruction:
      'Sehr langsam loslaufen, nur um Kreislauf und Muskulatur auf Betriebstemperatur zu bringen. Du solltest dich dabei mühelos unterhalten können.',
    dose: '5 Minuten',
  },
  {
    id: 'warm-beinpendel',
    name: 'Beinpendel',
    category: 'warmup',
    instruction:
      'An einer Wand abstützen und ein Bein locker vor und zurück schwingen lassen, danach seitlich. Der Oberkörper bleibt ruhig.',
    dose: '15 Schwünge je Richtung und Bein',
  },
  {
    id: 'warm-hueftkreisen',
    name: 'Hüftkreisen',
    category: 'warmup',
    instruction:
      'Hände in die Hüfte, große Kreise mit dem Becken beschreiben, nach der Hälfte die Richtung wechseln.',
    dose: '10 Kreise je Richtung',
  },
  {
    id: 'warm-kniehebe-leicht',
    name: 'Kniehebelauf, leicht',
    category: 'warmup',
    instruction:
      'Zwanzig Meter locker mit angehobenen Knien, nur bis Hüfthöhe und ohne Tempo. Es geht um die Bewegung, nicht um Anstrengung.',
    dose: '2 × 20 Meter',
  },
  {
    id: 'warm-steigerung',
    name: 'Kurze Steigerung',
    category: 'warmup',
    instruction:
      'Einmal gleichmäßig auf dein geplantes Lauftempo beschleunigen und wieder ausrollen. Danach kann der Lauf beginnen.',
    dose: '1 × 60 Meter',
  },

  // --- Lauftechnik --------------------------------------------------------
  {
    id: 'drill-kniehebelauf',
    name: 'Kniehebelauf',
    category: 'drills',
    instruction:
      'Knie bis auf Hüfthöhe anheben, Bodenkontakt so kurz wie möglich halten, Arme aktiv mitführen. Oberkörper bleibt aufrecht.',
    dose: '3 × 20 Meter',
  },
  {
    id: 'drill-anfersen',
    name: 'Anfersen',
    category: 'drills',
    instruction:
      'Fersen zum Gesäß ziehen, der Oberschenkel bleibt dabei senkrecht. Hohe Frequenz ist wichtiger als große Schritte.',
    dose: '3 × 20 Meter',
  },
  {
    id: 'drill-skipping',
    name: 'Skipping',
    category: 'drills',
    instruction:
      'Aus dem Kniehebelauf heraus bei jedem Schritt kurz abdrücken, sodass ein kleiner Sprung entsteht. Landung über den Vorfuß.',
    dose: '3 × 20 Meter',
  },
  {
    id: 'drill-fussgelenkslauf',
    name: 'Fußgelenkslauf',
    category: 'drills',
    instruction:
      'Nur über die Fußgelenke abrollen, die Knie bleiben fast gestreckt. Sehr kurze, sehr schnelle Schritte.',
    dose: '3 × 20 Meter',
  },
  {
    id: 'drill-steigerungslauf',
    name: 'Steigerungslauf',
    category: 'drills',
    instruction:
      'Über die Strecke gleichmäßig vom lockeren Trab auf etwa neunzig Prozent steigern, dann auslaufen lassen. Nicht sprinten.',
    dose: '4 × 100 Meter',
  },

  // --- Kraft --------------------------------------------------------------
  {
    id: 'kraft-ausfallschritt',
    name: 'Ausfallschritte',
    category: 'kraft',
    instruction:
      'Großer Schritt nach vorn, das hintere Knie Richtung Boden senken, das vordere Knie bleibt über dem Fuß. Kontrolliert zurückdrücken.',
    dose: '3 × 10 je Seite',
  },
  {
    id: 'kraft-kniebeuge',
    name: 'Kniebeugen',
    category: 'kraft',
    instruction:
      'Füße schulterbreit, Gesäß nach hinten schieben wie zum Hinsetzen. Knie zeigen in Fußrichtung, der Rücken bleibt gerade.',
    dose: '3 × 15',
  },
  {
    id: 'kraft-wadenheben',
    name: 'Wadenheben',
    category: 'kraft',
    instruction:
      'Mit dem Vorfuß auf einer Stufe stehen, die Fersen langsam absenken und wieder hochdrücken. Oben kurz halten.',
    dose: '3 × 20',
  },
  {
    id: 'kraft-plank',
    name: 'Plank',
    category: 'kraft',
    instruction:
      'Unterarmstütz, Körper bildet eine Linie von Kopf bis Ferse. Bauch fest, Becken weder durchhängen noch hochschieben.',
    dose: '3 × 40 Sekunden',
  },
  {
    id: 'kraft-beckenheben',
    name: 'Einbeiniges Beckenheben',
    category: 'kraft',
    instruction:
      'Rückenlage, ein Bein gestreckt anheben und das Becken mit dem Standbein hochdrücken. Oben kurz halten, langsam ablegen.',
    dose: '3 × 12 je Seite',
  },
  {
    id: 'kraft-seitstuetz',
    name: 'Seitstütz',
    category: 'kraft',
    instruction:
      'Auf dem Unterarm seitlich abstützen, Becken anheben, Körper in einer Linie. Schulter liegt über dem Ellbogen.',
    dose: '3 × 30 Sekunden je Seite',
  },

  // --- Dehnen -------------------------------------------------------------
  {
    id: 'mob-wadendehnung',
    name: 'Wadendehnung',
    category: 'mobility',
    instruction:
      'Im Ausfallschritt an einer Wand abstützen, hinteres Bein gestreckt, Ferse bleibt am Boden. Der Zug gehört in die Wade.',
    dose: '2 × 30 Sekunden je Seite',
  },
  {
    id: 'mob-hueftbeuger',
    name: 'Hüftbeuger-Dehnung',
    category: 'mobility',
    instruction:
      'Im Kniestand das Becken nach vorn schieben, Oberkörper aufrecht, Gesäß anspannen. Nicht ins Hohlkreuz ausweichen.',
    dose: '2 × 30 Sekunden je Seite',
  },
  {
    id: 'mob-itband',
    name: 'IT-Band-Dehnung',
    category: 'mobility',
    instruction:
      'Im Stand das zu dehnende Bein hinter das andere kreuzen, Oberkörper zur Gegenseite neigen und die Hüfte nach außen schieben.',
    dose: '2 × 30 Sekunden je Seite',
  },
  {
    id: 'mob-oberschenkel-hinten',
    name: 'Oberschenkelrückseite',
    category: 'mobility',
    instruction:
      'Ferse vorn aufsetzen, Fußspitze anziehen und aus der Hüfte nach vorn beugen. Der Rücken bleibt gerade.',
    dose: '2 × 30 Sekunden je Seite',
  },
  {
    id: 'mob-gesaess',
    name: 'Gesäßdehnung',
    category: 'mobility',
    instruction:
      'In Rückenlage den Knöchel auf das gegenüberliegende Knie legen und den Oberschenkel zu dir ziehen.',
    dose: '2 × 30 Sekunden je Seite',
  },
  {
    id: 'mob-brustwirbel',
    name: 'Brustwirbelsäule öffnen',
    category: 'mobility',
    instruction:
      'Im Vierfüßlerstand eine Hand an den Hinterkopf, den Ellbogen zur Decke drehen und dem Blick folgen.',
    dose: '10 Drehungen je Seite',
  },

  // --- Regeneration -------------------------------------------------------
  {
    id: 'reg-auslaufen',
    name: 'Auslaufen',
    category: 'regeneration',
    instruction:
      'Nach dem Lauf nicht abrupt stehen bleiben, sondern sehr locker weitertraben, bis der Puls sinkt.',
    dose: '5 bis 10 Minuten',
  },
  {
    id: 'reg-foam-oberschenkel',
    name: 'Foam Rolling Oberschenkel',
    category: 'regeneration',
    instruction:
      'Langsam über die Rolle fahren, an empfindlichen Stellen kurz verweilen und ruhig weiteratmen. Kein Pressen.',
    dose: '60 Sekunden je Seite',
  },
  {
    id: 'reg-foam-waden',
    name: 'Foam Rolling Waden',
    category: 'regeneration',
    instruction:
      'Unterschenkel auf die Rolle legen, langsam von der Achillessehne bis unters Knie rollen.',
    dose: '60 Sekunden je Seite',
  },
  {
    id: 'reg-beine-hoch',
    name: 'Beine hochlegen',
    category: 'regeneration',
    instruction:
      'Rückenlage, Beine an der Wand hoch, Arme locker ablegen und ruhig atmen.',
    dose: '5 Minuten',
  },
  {
    id: 'reg-stretching',
    name: 'Lockeres Stretching',
    category: 'regeneration',
    instruction:
      'Alle großen Muskelgruppen einmal sanft durchdehnen, ohne zu ziehen. Nach dem Lauf ist die Muskulatur warm.',
    dose: 'insgesamt 5 Minuten',
  },
];

/** Kategorie zu einer Id, oder undefined. */
export function findCategory(categoryId) {
  return CATEGORIES.find((category) => category.id === categoryId);
}

/**
 * Übungen einer Kategorie, in der hinterlegten Reihenfolge.
 * `ALL_CATEGORIES` oder eine unbekannte Id liefern alles.
 */
export function filterExercises(categoryId) {
  if (categoryId === ALL_CATEGORIES || !findCategory(categoryId)) return [...EXERCISES];
  return EXERCISES.filter((exercise) => exercise.category === categoryId);
}

/** Anzahl je Kategorie, für die Filterknöpfe. */
export function countByCategory() {
  const zaehler = new Map(CATEGORIES.map((category) => [category.id, 0]));

  for (const exercise of EXERCISES) {
    zaehler.set(exercise.category, (zaehler.get(exercise.category) ?? 0) + 1);
  }

  return zaehler;
}
