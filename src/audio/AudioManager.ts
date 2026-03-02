import { CONFIG } from '../config';
import type { GameState } from '../state/GameState';
import { clamp, lerp } from '../utils/math';

const AC = CONFIG.audio;

/**
 * Procedural ambient audio engine.
 *
 * Four layers — drone, harmonic pad, shimmer, tension — are generated
 * entirely via the Web Audio API (no audio files). An intensity value
 * (0 = peaceful, 1 = maximum danger) drives real-time parameter changes
 * that shift the soundscape from meditative ASMR to dark and tense.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;
  private currentIntensity = 0;

  // --- Drone layer ---
  private drone: OscillatorNode | null = null;
  private droneLFO: OscillatorNode | null = null;
  private droneLFOGain: GainNode | null = null;
  private droneGain: GainNode | null = null;

  // --- Pad layer ---
  private padOscillators: OscillatorNode[] = [];
  private padGain: GainNode | null = null;

  // --- Shimmer layer ---
  private shimmerSource: AudioBufferSourceNode | null = null;
  private shimmerFilter: BiquadFilterNode | null = null;
  private shimmerGain: GainNode | null = null;

  // --- Melody layer ---
  private melodyOsc: OscillatorNode | null = null;
  private melodyEnvelope: GainNode | null = null;
  private melodyFilter: BiquadFilterNode | null = null;
  private melodyGain: GainNode | null = null;
  private melodyNoteIndex = 0;
  private nextNoteTime = 0;

  // --- Tension layer ---
  private tensionOscillators: OscillatorNode[] = [];
  private tensionLFO: OscillatorNode | null = null;
  private tensionLFOGain: GainNode | null = null;
  private tensionGain: GainNode | null = null;

  // ─────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────

  get isReady(): boolean {
    return this.initialized;
  }

  /** Must be called from a user-gesture handler (click / tap). */
  init(): void {
    if (this.initialized) return;

    try {
      this.ctx = new AudioContext();
    } catch {
      // Browser doesn't support Web Audio — silently degrade
      return;
    }

    // If the context starts suspended, try to resume
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    // Master output
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = AC.masterVolume;
    this.masterGain.connect(this.ctx.destination);

    this.buildDrone();
    this.buildPad();
    this.buildMelody();
    this.buildShimmer();
    this.buildTension();

    // Suspend/resume on tab visibility
    document.addEventListener('visibilitychange', this.handleVisibility);

    this.initialized = true;
  }

  dispose(): void {
    if (!this.ctx) return;
    document.removeEventListener('visibilitychange', this.handleVisibility);

    this.drone?.stop();
    this.droneLFO?.stop();
    this.padOscillators.forEach((o) => o.stop());
    this.melodyOsc?.stop();
    this.shimmerSource?.stop();
    this.tensionOscillators.forEach((o) => o.stop());
    this.tensionLFO?.stop();

    this.ctx.close().catch(() => {});
    this.ctx = null;
    this.initialized = false;
  }

  // ─────────────────────────────────────────────────────────
  // Per-frame update
  // ─────────────────────────────────────────────────────────

  update(state: GameState, netKarmaRate: number): void {
    if (!this.initialized || !this.ctx) return;

    // Resume context if it got suspended (e.g., mobile background)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const target = this.calculateIntensity(state, netKarmaRate);
    const speed =
      target > this.currentIntensity
        ? AC.intensity.attackSpeed
        : AC.intensity.releaseSpeed;
    this.currentIntensity = lerp(
      this.currentIntensity,
      target,
      Math.min(1, speed * (1 / 60)),
    );

    this.applyIntensity(this.currentIntensity);
    this.scheduleMelody(this.currentIntensity);
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        clamp(volume, 0, 1),
        this.ctx.currentTime,
        0.05,
      );
    }
  }

  // ─────────────────────────────────────────────────────────
  // Intensity calculation
  // ─────────────────────────────────────────────────────────

  private calculateIntensity(
    state: GameState,
    netKarmaRate: number,
  ): number {
    if (!state.isAlive) return AC.intensity.deathIntensity;

    let danger = 0;
    const ai = AC.intensity;

    if (state.needs.hunger < ai.hungerThreshold) {
      danger +=
        ((ai.hungerThreshold - state.needs.hunger) / ai.hungerThreshold) *
        ai.hungerWeight;
    }
    if (state.needs.shelter < ai.shelterThreshold) {
      danger +=
        ((ai.shelterThreshold - state.needs.shelter) / ai.shelterThreshold) *
        ai.shelterWeight;
    }
    if (state.needs.health < ai.healthThreshold) {
      danger +=
        ((ai.healthThreshold - state.needs.health) / ai.healthThreshold) *
        ai.healthWeight;
    }
    if (netKarmaRate < 0) {
      danger +=
        Math.min(1, Math.abs(netKarmaRate) / ai.karmaRateDivisor) *
        ai.karmaRateWeight;
    }

    return clamp(danger, 0, 1);
  }

  // ─────────────────────────────────────────────────────────
  // Apply intensity to all audio parameters
  // ─────────────────────────────────────────────────────────

  private applyIntensity(t: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const sm = 0.15; // smoothing time constant

    // --- Drone ---
    if (this.drone && this.droneGain && this.droneLFOGain) {
      this.drone.frequency.setTargetAtTime(
        lerp(AC.drone.baseFreq, AC.drone.dangerFreq, t),
        now,
        sm,
      );
      this.droneGain.gain.setTargetAtTime(
        lerp(AC.drone.baseVolume, AC.drone.dangerVolume, t),
        now,
        sm,
      );
      this.droneLFOGain.gain.setTargetAtTime(
        lerp(AC.drone.lfoBaseDepth, AC.drone.lfoDangerDepth, t),
        now,
        sm,
      );
    }

    // --- Pad ---
    if (this.padGain && this.padOscillators.length > 0) {
      this.padGain.gain.setTargetAtTime(
        lerp(AC.pad.baseVolume, AC.pad.dangerVolume, t),
        now,
        sm,
      );
      // Detune all oscillators
      const detune = t * AC.pad.maxDetuneCents;
      this.padOscillators.forEach((osc, i) => {
        // Alternate +/- detuning, with extra shift on minor 3rd (index 1)
        const sign = i % 2 === 0 ? 1 : -1;
        let d = detune * sign;
        if (i === 1) {
          // Flatten the minor 3rd for more dissonance
          osc.frequency.setTargetAtTime(
            AC.pad.frequencies[1] + t * AC.pad.dissonanceShift,
            now,
            sm,
          );
        }
        osc.detune.setTargetAtTime(d, now, sm);
      });
    }

    // --- Melody ---
    if (this.melodyGain && this.melodyFilter) {
      this.melodyGain.gain.setTargetAtTime(
        lerp(AC.melody.baseVolume, AC.melody.dangerVolume, t),
        now,
        sm,
      );
      // Darken the melody tone as intensity rises
      this.melodyFilter.frequency.setTargetAtTime(
        lerp(4000, 1200, t),
        now,
        sm,
      );
    }

    // --- Shimmer ---
    if (this.shimmerFilter && this.shimmerGain) {
      this.shimmerFilter.frequency.setTargetAtTime(
        lerp(AC.shimmer.baseFilterCutoff, AC.shimmer.dangerFilterCutoff, t),
        now,
        sm,
      );
      this.shimmerGain.gain.setTargetAtTime(
        lerp(AC.shimmer.baseVolume, AC.shimmer.dangerVolume, t),
        now,
        sm,
      );
    }

    // --- Tension (crossfade from 0) ---
    if (this.tensionGain && this.tensionLFO && this.tensionLFOGain) {
      this.tensionGain.gain.setTargetAtTime(
        t * AC.tension.maxVolume,
        now,
        sm,
      );
      this.tensionLFO.frequency.setTargetAtTime(
        lerp(AC.tension.lfoBaseRate, AC.tension.lfoDangerRate, t),
        now,
        sm,
      );
      // Wobble depth increases with intensity
      this.tensionLFOGain.gain.setTargetAtTime(
        lerp(1, 6, t),
        now,
        sm,
      );
    }
  }

  // ─────────────────────────────────────────────────────────
  // Layer builders
  // ─────────────────────────────────────────────────────────

  private buildDrone(): void {
    const ctx = this.ctx!;

    // Main drone oscillator
    this.drone = ctx.createOscillator();
    this.drone.type = 'sine';
    this.drone.frequency.value = AC.drone.baseFreq;

    // LFO → modulates drone frequency
    this.droneLFO = ctx.createOscillator();
    this.droneLFO.type = 'sine';
    this.droneLFO.frequency.value = AC.drone.lfoRate;

    this.droneLFOGain = ctx.createGain();
    this.droneLFOGain.gain.value = AC.drone.lfoBaseDepth;

    this.droneLFO.connect(this.droneLFOGain);
    this.droneLFOGain.connect(this.drone.frequency);

    // Output gain
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = AC.drone.baseVolume;

    this.drone.connect(this.droneGain);
    this.droneGain.connect(this.masterGain!);

    this.drone.start();
    this.droneLFO.start();
  }

  private buildPad(): void {
    const ctx = this.ctx!;

    this.padGain = ctx.createGain();
    this.padGain.gain.value = AC.pad.baseVolume;
    this.padGain.connect(this.masterGain!);

    this.padOscillators = AC.pad.frequencies.map((freq) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.connect(this.padGain!);
      osc.start();
      return osc;
    });
  }

  private buildMelody(): void {
    const ctx = this.ctx!;

    // Persistent oscillator — we change its frequency for each note
    this.melodyOsc = ctx.createOscillator();
    this.melodyOsc.type = 'sine';
    this.melodyOsc.frequency.value = AC.melody.peaceNotes[0];

    // Per-note envelope (gain ramps for attack/decay/release)
    this.melodyEnvelope = ctx.createGain();
    this.melodyEnvelope.gain.value = 0; // silent until first note

    // Gentle lowpass to soften the tone
    this.melodyFilter = ctx.createBiquadFilter();
    this.melodyFilter.type = 'lowpass';
    this.melodyFilter.frequency.value = 4000;
    this.melodyFilter.Q.value = 0.7;

    // Master volume for the melody layer
    this.melodyGain = ctx.createGain();
    this.melodyGain.gain.value = AC.melody.baseVolume;

    this.melodyOsc.connect(this.melodyEnvelope);
    this.melodyEnvelope.connect(this.melodyFilter);
    this.melodyFilter.connect(this.melodyGain);
    this.melodyGain.connect(this.masterGain!);

    this.melodyOsc.start();
    this.nextNoteTime = ctx.currentTime + 0.5; // first note after short delay
  }

  /**
   * Schedule the next melodic note when the time comes.
   * Picks notes from the pentatonic scale (peaceful) or mixes in
   * dark chromatic tones as intensity rises.
   */
  private scheduleMelody(intensity: number): void {
    if (!this.ctx || !this.melodyOsc || !this.melodyEnvelope) return;

    const now = this.ctx.currentTime;
    if (now < this.nextNoteTime) return;

    // Pick a note — blend peace and dark scales based on intensity
    const mc = AC.melody;
    const peaceNotes = mc.peaceNotes;
    const darkNotes = mc.darkNotes;

    let freq: number;
    // At low intensity, always use peaceful pentatonic.
    // As intensity rises, increasingly chance of a dark note.
    if (Math.random() < intensity * 0.6 && darkNotes.length > 0) {
      // Dark note — random pick
      freq = darkNotes[Math.floor(Math.random() * darkNotes.length)];
    } else {
      // Stepwise motion: move ±1-3 steps from current index
      const maxStep = 1 + Math.floor(Math.random() * 3);
      const direction = Math.random() < 0.5 ? -1 : 1;
      this.melodyNoteIndex = clamp(
        this.melodyNoteIndex + direction * maxStep,
        0,
        peaceNotes.length - 1,
      );
      freq = peaceNotes[this.melodyNoteIndex];
    }

    // Schedule note envelope: attack → sustain → release
    const attackEnd = now + mc.attackTime;
    const decayEnd = attackEnd + mc.decayTime;
    const releaseStart = decayEnd + 0.15;
    const releaseEnd = releaseStart + mc.releaseTime;

    this.melodyOsc.frequency.setTargetAtTime(freq, now, 0.01);

    const env = this.melodyEnvelope.gain;
    env.cancelScheduledValues(now);
    env.setValueAtTime(0, now);
    env.linearRampToValueAtTime(1, attackEnd);
    env.linearRampToValueAtTime(mc.sustainLevel, decayEnd);
    env.setValueAtTime(mc.sustainLevel, releaseStart);
    env.linearRampToValueAtTime(0, releaseEnd);

    // Schedule next note
    const interval = lerp(mc.baseInterval, mc.dangerInterval, intensity);
    // Add slight human-feel variation (±15%)
    const jitter = 1 + (Math.random() - 0.5) * 0.3;
    this.nextNoteTime = now + interval * jitter;
  }

  private buildShimmer(): void {
    const ctx = this.ctx!;

    // Procedural noise buffer
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * AC.shimmer.bufferDuration;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.shimmerSource = ctx.createBufferSource();
    this.shimmerSource.buffer = buffer;
    this.shimmerSource.loop = true;

    // Lowpass filter
    this.shimmerFilter = ctx.createBiquadFilter();
    this.shimmerFilter.type = 'lowpass';
    this.shimmerFilter.frequency.value = AC.shimmer.baseFilterCutoff;
    this.shimmerFilter.Q.value = 1;

    this.shimmerGain = ctx.createGain();
    this.shimmerGain.gain.value = AC.shimmer.baseVolume;

    this.shimmerSource.connect(this.shimmerFilter);
    this.shimmerFilter.connect(this.shimmerGain);
    this.shimmerGain.connect(this.masterGain!);

    this.shimmerSource.start();
  }

  private buildTension(): void {
    const ctx = this.ctx!;

    this.tensionGain = ctx.createGain();
    this.tensionGain.gain.value = 0; // silent until intensity > 0
    this.tensionGain.connect(this.masterGain!);

    // LFO for tension wobble
    this.tensionLFO = ctx.createOscillator();
    this.tensionLFO.type = 'sine';
    this.tensionLFO.frequency.value = AC.tension.lfoBaseRate;

    this.tensionLFOGain = ctx.createGain();
    this.tensionLFOGain.gain.value = 1;

    this.tensionLFO.connect(this.tensionLFOGain);

    // Tension oscillators
    this.tensionOscillators = AC.tension.frequencies.map((freq, i) => {
      const osc = ctx.createOscillator();
      // First osc (tritone) = sawtooth filtered, second (sub) = sine
      osc.type = i === 0 ? 'sawtooth' : 'sine';
      osc.frequency.value = freq;

      // Connect LFO to frequency
      this.tensionLFOGain!.connect(osc.frequency);

      if (i === 0) {
        // Filter the sawtooth to soften it
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 300;
        filter.Q.value = 2;
        osc.connect(filter);
        filter.connect(this.tensionGain!);
      } else {
        osc.connect(this.tensionGain!);
      }

      osc.start();
      return osc;
    });

    this.tensionLFO.start();
  }

  // ─────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────

  private handleVisibility = (): void => {
    if (!this.ctx) return;
    if (document.hidden) {
      this.ctx.suspend().catch(() => {});
    } else {
      this.ctx.resume().catch(() => {});
    }
  };
}
