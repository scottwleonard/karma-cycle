export const CONFIG = {
  karma: {
    baseRate: 0.5,
    lifeTimeScaling: 60,
    soulMultiplierCoeff: 0.01,
    deathPenalty: 0.75,
  },
  needs: {
    hunger: {
      baseDrain: 0.8,
      drainScaling: 0.12,
      feedAmount: 30,
      feedCost: 10,
      feedCostScaling: 0.1,
      lowThreshold: 20,
      karmaDebuff: 0.5,
      healthDrain: 2,
    },
    shelter: {
      baseDrain: 0.5,
      drainScaling: 0.06,
      repairAmount: 30,
      repairCost: 15,
      repairCostScaling: 0.05,
      lowThreshold: 20,
      karmaDebuff: 0.3,
      healthDrain: 1,
    },
    health: {
      regenRate: 0.3,
      regenThreshold: 50,
      lowThreshold: 10,
      karmaDebuff: 0.8,
    },
  },
  wealth: {
    baseRate: 3.0,
  },
  karmaBank: {
    coefficient: 0.005, // bankMultiplier = 1 + sqrt(bankedKarma) * coefficient
  },
  rebirth: {
    multiplierBase: 0.5,
    bonusTimeScale: 300,
  },
  enlightenment: {
    awakeningKarma: 10_000,
    bodhiKarma: 50_000,
    nirvanaKarma: 200_000,
    challengeDuration: 300,
  },
  save: {
    autoSaveIntervalMs: 30000,
    maxOfflineHours: 8,
  },
  audio: {
    masterVolume: 0.35,
    drone: {
      baseFreq: 65,
      dangerFreq: 55,
      baseVolume: 0.015,
      dangerVolume: 0.04,
      lfoRate: 0.3,
      lfoBaseDepth: 2,
      lfoDangerDepth: 8,
    },
    pad: {
      frequencies: [130.81, 155.56, 196.0, 233.08] as readonly number[],
      baseVolume: 0.01,
      dangerVolume: 0.008,
      maxDetuneCents: 8,
      dissonanceShift: -3,
    },
    shimmer: {
      bufferDuration: 4,
      baseFilterCutoff: 8000,
      dangerFilterCutoff: 800,
      baseVolume: 0.006,
      dangerVolume: 0.025,
    },
    melody: {
      // C minor pentatonic across octaves 3–5 (peaceful)
      peaceNotes: [
        130.81, 155.56, 174.61, 196.0, 233.08, // C3 Eb3 F3 G3 Bb3
        261.63, 311.13, 349.23, 392.0, 466.16, // C4 Eb4 F4 G4 Bb4
        523.25, // C5
      ] as readonly number[],
      // Darker chromatic tones mixed in at high intensity
      darkNotes: [
        116.54, 138.59, 185.0, 246.94, // Bb2 Db3 Gb3 B3
        277.18, 369.99, 493.88, // Db4 Gb4 B4
      ] as readonly number[],
      baseVolume: 0.09,
      dangerVolume: 0.07,
      baseInterval: 0.6, // ~100 BPM at peace
      dangerInterval: 0.375, // ~160 BPM at danger
      phraseMin: 3, // min notes per phrase
      phraseMax: 7, // max notes per phrase
      phraseRestMin: 1.5, // min beats of silence between phrases
      phraseRestMax: 2.5, // max beats of silence between phrases
      motifRepeatChance: 0.3, // chance to repeat previous phrase transposed
      attackTime: 0.03,
      decayTime: 0.15,
      sustainLevel: 0.35,
      releaseTime: 0.3,
    },
    tension: {
      frequencies: [92, 35] as readonly number[],
      maxVolume: 0.1,
      lfoBaseRate: 0.5,
      lfoDangerRate: 3.0,
    },
    intensity: {
      hungerThreshold: 60,
      hungerWeight: 0.3,
      shelterThreshold: 60,
      shelterWeight: 0.3,
      healthThreshold: 30,
      healthWeight: 0.3,
      karmaRateDivisor: 5,
      karmaRateWeight: 0.1,
      deathIntensity: 0.8,
      attackSpeed: 2.0,
      releaseSpeed: 0.5,
    },
  },
  display: {
    referenceWidth: 1080,
    referenceHeight: 1920,
    bgColor: 0x0a0a2e,
    karmaColor: 0xffd700,
    wealthColor: 0x00cc66,
    hungerColor: 0xff8c00,
    shelterColor: 0x20b2aa,
    healthColor: 0xdc143c,
    panelColor: 0x1a1a4e,
    panelAlpha: 0.85,
  },
} as const;
