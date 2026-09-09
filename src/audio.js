// Web Audio API Retro 16-bit Synth Sound Generator
class SoundManager {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.bgmPlaying = false;
        this.bgmTimer = null;
        this.currentStep = 0;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopBgm();
        } else if (this.bgmPlaying) {
            this.startBgm();
        }
        return this.isMuted;
    }

    playTone(freq, type, duration, startTime = 0, gainValue = 0.15) {
        if (this.isMuted || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

            gain.gain.setValueAtTime(gainValue, this.ctx.currentTime + startTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + startTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(this.ctx.currentTime + startTime);
            osc.stop(this.ctx.currentTime + startTime + duration);
        } catch (e) {
            console.warn(e);
        }
    }

    playNoise(duration, gainVal = 0.1) {
        if (this.isMuted || !this.ctx) return;
        try {
            const bufferSize = this.ctx.sampleRate * duration;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 1000;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start();
            noise.stop(this.ctx.currentTime + duration);
        } catch (e) {
            console.warn(e);
        }
    }

    // Sound FX: Light Attack / Jab
    playJab() {
        if (this.isMuted || !this.ctx) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
    }

    // Sound FX: Heavy Attack / Kick
    playHeavy() {
        if (this.isMuted || !this.ctx) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);

        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);

        this.playNoise(0.1, 0.15);
    }

    // Sound FX: Special / Dive Kick
    playSpecial() {
        if (this.isMuted || !this.ctx) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.25);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.26);

        this.playNoise(0.2, 0.18);
    }

    // Sound FX: Hit Impact
    playHit() {
        if (this.isMuted || !this.ctx) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.13);

        this.playNoise(0.12, 0.25);
    }

    // Sound FX: Block / Clank
    playBlock() {
        if (this.isMuted || !this.ctx) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
    }

    // Sound FX: Jump
    playJump() {
        if (this.isMuted || !this.ctx) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(450, now + 0.12);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.13);
    }

    // Sound FX: Round Bell
    playRoundStart() {
        if (this.isMuted || !this.ctx) return;
        this.init();
        const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        freqs.forEach((f, idx) => {
            setTimeout(() => {
                this.playTone(f, 'square', 0.15, 0, 0.18);
            }, idx * 100);
        });
    }

    // Sound FX: Knockout (K.O.)
    playKO() {
        if (this.isMuted || !this.ctx) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.8);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.85);

        this.playNoise(0.5, 0.3);
    }

    // Retro 16-bit Synth BGM loop
    startBgm() {
        this.bgmPlaying = true;
        if (this.isMuted) return;
        this.init();
        this.stopBgm();

        const bassNotes = [110, 110, 130.81, 146.83, 110, 110, 98.0, 123.47]; // A2, C3, D3, G2, B2
        const melodyNotes = [
            440, 0, 523.25, 0, 587.33, 523.25, 440, 0,
            659.25, 0, 587.33, 0, 523.25, 0, 392, 440
        ];
        
        let step = 0;
        const stepIntervalMs = 135; // ~111 BPM 16th notes

        this.bgmTimer = setInterval(() => {
            if (this.isMuted || !this.bgmPlaying || !this.ctx) return;

            // Bassline
            const bass = bassNotes[Math.floor(step / 2) % bassNotes.length];
            if (step % 2 === 0) {
                this.playTone(bass, 'sawtooth', 0.12, 0, 0.06);
            }

            // Lead Synth
            const lead = melodyNotes[step % melodyNotes.length];
            if (lead > 0) {
                this.playTone(lead, 'square', 0.09, 0, 0.05);
            }

            // Snare / Hi-hat retro beat
            if (step % 4 === 2) {
                this.playNoise(0.05, 0.04);
            } else if (step % 2 === 0) {
                this.playNoise(0.02, 0.02);
            }

            step = (step + 1) % 64;
        }, stepIntervalMs);
    }

    stopBgm() {
        if (this.bgmTimer) {
            clearInterval(this.bgmTimer);
            this.bgmTimer = null;
        }
    }
}

window.soundManager = new SoundManager();
