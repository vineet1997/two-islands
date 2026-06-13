/** Synthesized ambient surf — brown noise through a slow-breathing lowpass. On by default. */
export function createAmbient(startOn = false) {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let on = startOn;

  const init = () => {
    ctx = new AudioContext();
    const len = ctx.sampleRate * 6;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 420;
    lp.Q.value = 0.4;

    // slow swell: LFO modulating gain like waves arriving
    const swell = ctx.createGain();
    swell.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 0.3;
    lfo.connect(lfoAmt).connect(swell.gain);

    master = ctx.createGain();
    master.gain.value = 0;
    src.connect(lp).connect(swell).connect(master).connect(ctx.destination);
    src.start();
    lfo.start();
  };

  // ramp the master gain to match the current on-state
  const apply = () => {
    if (!ctx) init();
    ctx!.resume();
    const t = ctx!.currentTime;
    master!.gain.cancelScheduledValues(t);
    master!.gain.linearRampToValueAtTime(on ? 0.12 : 0, t + 1.2);
  };

  return {
    isOn(): boolean {
      return on;
    },
    toggle(): boolean {
      on = !on;
      apply();
      return on;
    },
    /** browsers block audio until a gesture — call once on first interaction
     *  to honour the default-on state */
    unlock(): void {
      if (on) apply();
    },
  };
}
