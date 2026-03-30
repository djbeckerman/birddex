// ── Spirit Bird trait dimensions ─────────────────────────────────────────────
// bold       — daring, decisive, drawn to extremes
// patient    — still, waiting, acts with perfect timing
// social     — community-minded, expressive, warm
// independent— self-directed, content alone, self-knowing
// creative   — curious, playful, adaptive, expressive
// observant  — strategic, analytical, precise, perceptive

export interface SpiritBirdTraits {
  bold: number;
  patient: number;
  social: number;
  independent: number;
  creative: number;
  observant: number;
}

export interface SpiritBirdDef {
  speciesCode: string;
  comName: string;
  sciName: string;
  /** CSS color for the radial glow on the reveal screen */
  glowColor: string;
  /** 3–4 sentence personality description — horoscope meets nature documentary */
  personality: string;
  traits: SpiritBirdTraits;
}

export const SPIRIT_BIRDS: SpiritBirdDef[] = [
  {
    speciesCode: 'perfal',
    comName: 'Peregrine Falcon',
    sciName: 'Falco peregrinus',
    glowColor: '#5080a0',
    traits: { bold: 5, patient: 2, social: 1, independent: 4, creative: 2, observant: 4 },
    personality:
      "Your Spirit Bird is the Peregrine Falcon. Like you, the Peregrine doesn't settle for the easy path — you're drawn to extremes, to the highest vantage point and the fastest descent. When you commit to something, you move with absolute precision and unflinching confidence. Others may not always keep pace, but they always admire where you've been.",
  },
  {
    speciesCode: 'grbher3',
    comName: 'Great Blue Heron',
    sciName: 'Ardea herodias',
    glowColor: '#7890a8',
    traits: { bold: 1, patient: 5, social: 1, independent: 5, creative: 2, observant: 5 },
    personality:
      "Your Spirit Bird is the Great Blue Heron. Patient and self-possessed, you've mastered the art of stillness in a world that never stops moving. You don't need company to feel complete — your depth comes from within, and you act with perfect precision when the moment is right. Those who mistake your quietude for passivity quickly learn otherwise.",
  },
  {
    speciesCode: 'annhum',
    comName: "Anna's Hummingbird",
    sciName: 'Calypte anna',
    glowColor: '#b040a0',
    traits: { bold: 4, patient: 1, social: 3, independent: 2, creative: 5, observant: 2 },
    personality:
      "Your Spirit Bird is Anna's Hummingbird. Don't let the scale fool you — you are a force of nature in concentrated form, fierce and tireless in pursuit of what you love. You're drawn irresistibly to beauty, and you bring electric intensity to everything you touch. No one in the room carries more energy, and somehow you make it all look effortless.",
  },
  {
    speciesCode: 'rethaw',
    comName: 'Red-tailed Hawk',
    sciName: 'Buteo jamaicensis',
    glowColor: '#c07830',
    traits: { bold: 4, patient: 3, social: 3, independent: 2, creative: 1, observant: 5 },
    personality:
      "Your Spirit Bird is the Red-tailed Hawk. From your wide vantage point, you perceive what others miss — the long arc, the larger pattern, the move three steps ahead. You carry a quiet authority that makes others look to you naturally, and you protect what matters with fierce loyalty. The open sky is where you belong.",
  },
  {
    speciesCode: 'calqua',
    comName: 'California Quail',
    sciName: 'Callipepla californica',
    glowColor: '#988050',
    traits: { bold: 2, patient: 3, social: 5, independent: 1, creative: 3, observant: 3 },
    personality:
      "Your Spirit Bird is the California Quail. You understand something the solitary birds never will: life is richer when shared. Your warmth holds communities together, and your calm, grounded presence is the anchor in any group you're part of. You find joy not in the spotlight but in the steady rhythm of belonging — knowing where home is and who is in it.",
  },
  {
    speciesCode: 'grhowl',
    comName: 'Great Horned Owl',
    sciName: 'Bubo virginianus',
    glowColor: '#806840',
    traits: { bold: 2, patient: 5, social: 1, independent: 5, creative: 3, observant: 5 },
    personality:
      "Your Spirit Bird is the Great Horned Owl. You see in the dark — not metaphorically, but with genuine perception of what others cannot sense. You are powerful in your silence, choosing words deliberately and only speaking when it matters. Those lucky enough to know you well discover reserves of wisdom they never expected to find.",
  },
  {
    speciesCode: 'brnpel',
    comName: 'Brown Pelican',
    sciName: 'Pelecanus occidentalis',
    glowColor: '#6880a0',
    traits: { bold: 4, patient: 2, social: 4, independent: 2, creative: 2, observant: 3 },
    personality:
      "Your Spirit Bird is the Brown Pelican. Graceful in a way that belies your size, you've learned that the best way forward is sometimes the boldest dive. You bounce back from hard landings with remarkable ease — resilience is your defining quality. You work beautifully alongside others and have a gift for making hard things look entirely natural.",
  },
  {
    speciesCode: 'wesblu',
    comName: 'Western Bluebird',
    sciName: 'Sialia mexicana',
    glowColor: '#3878c0',
    traits: { bold: 2, patient: 3, social: 5, independent: 1, creative: 4, observant: 2 },
    personality:
      "Your Spirit Bird is the Western Bluebird. You carry a rare gift: you make the world a little warmer just by being in it. Home matters deeply to you — not just a place, but a feeling, a network of people who light up when you walk in. Your gentle, optimistic spirit is not naivety; it is a quiet, persistent form of courage.",
  },
  {
    speciesCode: 'amecro',
    comName: 'American Crow',
    sciName: 'Corvus brachyrhynchos',
    glowColor: '#505868',
    traits: { bold: 3, patient: 2, social: 3, independent: 3, creative: 5, observant: 4 },
    personality:
      "Your Spirit Bird is the American Crow. You are always thinking, always adapting, always finding the angle no one else spotted. Where others see a dead end, you see a puzzle worth solving. Your curiosity is boundless and your resourcefulness legendary — and unlike most, you remember everything.",
  },
  {
    speciesCode: 'snoegr',
    comName: 'Snowy Egret',
    sciName: 'Egretta thula',
    glowColor: '#a0b8c8',
    traits: { bold: 2, patient: 4, social: 2, independent: 4, creative: 3, observant: 5 },
    personality:
      "Your Spirit Bird is the Snowy Egret. You move through the world with elegant intention that others can't quite replicate. Precision matters to you — not perfectionism, but deep satisfaction in doing things the right way, with care. You find beauty in stillness, and you've learned that the most powerful moves are often the quietest ones.",
  },
  {
    speciesCode: 'blkpho',
    comName: 'Black Phoebe',
    sciName: 'Sayornis nigricans',
    glowColor: '#405868',
    traits: { bold: 1, patient: 5, social: 1, independent: 5, creative: 2, observant: 5 },
    personality:
      "Your Spirit Bird is the Black Phoebe. You need no audience to do your best work. Content in solitude and endlessly patient, you observe the world with quiet, sharp attention that misses nothing. You have an independence of spirit that isn't aloofness — it's self-knowledge. You know exactly who you are without needing anyone to confirm it.",
  },
  {
    speciesCode: 'coohaw',
    comName: "Cooper's Hawk",
    sciName: 'Accipiter cooperii',
    glowColor: '#a05840',
    traits: { bold: 5, patient: 3, social: 2, independent: 4, creative: 3, observant: 4 },
    personality:
      "Your Spirit Bird is the Cooper's Hawk. Where others see a maze, you see a path. You navigate complexity with startling agility, thinking ahead and adjusting in real time. You're quick, strategic, and surprisingly subtle for how decisive you can be. People underestimate you once. They don't make that mistake twice.",
  },
  {
    speciesCode: 'brnowl',
    comName: 'Barn Owl',
    sciName: 'Tyto alba',
    glowColor: '#c8a850',
    traits: { bold: 1, patient: 4, social: 2, independent: 4, creative: 4, observant: 5 },
    personality:
      "Your Spirit Bird is the Barn Owl. You move through the world with unusual softness — not fragility, but genuine attunement. You hear what others can't and sense what isn't being said. You offer a rare gift: the experience of being truly listened to. In the dark places that unsettle others, you are perfectly at ease, guided by inner knowing.",
  },
  {
    speciesCode: 'osprey',
    comName: 'Osprey',
    sciName: 'Pandion haliaetus',
    glowColor: '#3888a0',
    traits: { bold: 3, patient: 4, social: 2, independent: 4, creative: 2, observant: 5 },
    personality:
      "Your Spirit Bird is the Osprey. You are not afraid to get in the water. When you commit to something, you commit completely — no circling from a safe distance. Your focus is extraordinary and your results speak for themselves. You build impressive things, and you build them to last. The dive is never reckless; it is always exactly calculated.",
  },
  {
    speciesCode: 'wesmea',
    comName: 'Western Meadowlark',
    sciName: 'Sturnella neglecta',
    glowColor: '#d0b020',
    traits: { bold: 3, patient: 2, social: 5, independent: 1, creative: 5, observant: 2 },
    personality:
      "Your Spirit Bird is the Western Meadowlark. You were built to be heard, and what you have to say is worth hearing. Your expressive nature isn't performance — it's genuine warmth that you simply can't contain. Wherever you go, you bring a quality of aliveness that reminds people why they're here. The world is measurably better for your voice in it.",
  },
  {
    speciesCode: 'comrav',
    comName: 'Common Raven',
    sciName: 'Corvus corax',
    glowColor: '#5048d0',
    traits: { bold: 3, patient: 3, social: 2, independent: 4, creative: 5, observant: 5 },
    personality:
      "Your Spirit Bird is the Common Raven. You think in dimensions others haven't discovered yet. Your intelligence isn't just clever — it has depth, playfulness, and an almost mystical quality that leaves people wondering what you're seeing that they're not. You love a good puzzle, and you love the rare person who can keep up. Few can. You've made your peace with that.",
  },
];

// ── Quiz questions ────────────────────────────────────────────────────────────

export interface QuizChoice {
  text: string;
  traits: Partial<SpiritBirdTraits>;
}

export interface QuizQuestion {
  id: string;
  biome: 'coastal' | 'mountain' | 'desert' | 'forest';
  prompt: string;
  choices: [QuizChoice, QuizChoice, QuizChoice];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    biome: 'coastal',
    prompt: 'The tide is pulling. You feel drawn to...',
    choices: [
      { text: 'The horizon beyond the fog',    traits: { bold: 2, independent: 1 } },
      { text: 'The warmth of the rocks below', traits: { patient: 2, observant: 1 } },
      { text: 'The rhythm of the waves',        traits: { creative: 2, social: 1 } },
    ],
  },
  {
    id: 'q2',
    biome: 'mountain',
    prompt: 'The summit is near. You choose to...',
    choices: [
      { text: 'Push higher into the unknown',      traits: { bold: 2, independent: 1 } },
      { text: 'Glide along the ridgeline',          traits: { observant: 2, patient: 1 } },
      { text: 'Descend into the sheltered valley', traits: { social: 2, patient: 1 } },
    ],
  },
  {
    id: 'q3',
    biome: 'desert',
    prompt: 'The desert is still. What holds your attention?',
    choices: [
      { text: 'The shadow that moves differently', traits: { observant: 2, independent: 1 } },
      { text: 'The single bloom of color',          traits: { creative: 2, observant: 1 } },
      { text: 'The vast emptiness itself',           traits: { patient: 2, independent: 1 } },
    ],
  },
  {
    id: 'q4',
    biome: 'forest',
    prompt: "Light filters through the canopy. You're drawn to...",
    choices: [
      { text: 'The highest branch where the light is strongest', traits: { bold: 2, creative: 1 } },
      { text: 'The hidden nest tucked in the hollow',            traits: { patient: 2, social: 1 } },
      { text: 'The chorus of unseen voices',                     traits: { social: 2, creative: 1 } },
    ],
  },
];

// ── Matching algorithm ────────────────────────────────────────────────────────

export function computeSpiritBird(answers: number[]): SpiritBirdDef {
  const scores: SpiritBirdTraits = {
    bold: 0, patient: 0, social: 0, independent: 0, creative: 0, observant: 0,
  };

  answers.forEach((choiceIdx, qIdx) => {
    const choice = QUIZ_QUESTIONS[qIdx]?.choices[choiceIdx];
    if (!choice) return;
    (Object.keys(choice.traits) as (keyof SpiritBirdTraits)[]).forEach((t) => {
      scores[t] += choice.traits[t] ?? 0;
    });
  });

  const KEYS: (keyof SpiritBirdTraits)[] = ['bold', 'patient', 'social', 'independent', 'creative', 'observant'];

  function mag(v: SpiritBirdTraits) {
    return Math.sqrt(KEYS.reduce((s, k) => s + v[k] ** 2, 0));
  }

  function cosine(a: SpiritBirdTraits, b: SpiritBirdTraits) {
    const dot = KEYS.reduce((s, k) => s + a[k] * b[k], 0);
    const m = mag(a) * mag(b);
    return m ? dot / m : 0;
  }

  let best = -1;
  let winners: SpiritBirdDef[] = [];

  SPIRIT_BIRDS.forEach((bird) => {
    const score = cosine(scores, bird.traits);
    if (score > best + 0.001) {
      best = score;
      winners = [bird];
    } else if (Math.abs(score - best) <= 0.001) {
      winners.push(bird);
    }
  });

  return winners[Math.floor(Math.random() * winners.length)];
}
