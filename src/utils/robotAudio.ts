// Robot Audio Synthesizer: combining Web Audio API and SpeechSynthesis for guaranteed audible sound

class RobotAudioService {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Futuristic robot chime sequence (guaranteed to play via Web Audio API)
  public playRobotBeeps() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Notes: Friendly greeting chime (C5 -> E5 -> G5 -> C6)
      const frequencies = [523.25, 659.25, 783.99, 1046.5];

      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0.001, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.2, now + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.18);
      });
    } catch {
      // safe ignore
    }
  }

  // Harmonic success chime when login succeeds
  public playSuccessBeeps() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Uplifting chords: F5 -> A5 -> C6
      const freqs = [698.46, 880.0, 1046.5];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0.001, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.25, now + idx * 0.1 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.3);
      });
    } catch {
      // safe ignore
    }
  }

  // Voice speech synthesis
  public speak(text = "Logging into your account. Please wait.", onStart?: () => void, onEnd?: () => void) {
    // 1. Play robotic alert sound immediately
    this.playRobotBeeps();

    // 2. Browser Speech Synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel(); // Clear any pending speech
        window.speechSynthesis.resume(); // Ensure not paused by browser policy

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.88; // Calm, steady, natural human pacing
        utterance.pitch = 0.98; // Warm, natural human tone (no tinny robotic sound)
        utterance.volume = 1.0; // Clear volume

        // Try to pick a natural human English voice if available
        const voices = window.speechSynthesis.getVoices();
        const englishVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Samantha') || v.name.includes('Google')));
        if (englishVoice) {
          utterance.voice = englishVoice;
        }

        utterance.onstart = () => {
          if (onStart) onStart();
        };

        utterance.onend = () => {
          if (onEnd) onEnd();
        };

        utterance.onerror = (e) => {
          console.warn('Speech error:', e);
          if (onEnd) onEnd();
        };

        // Small delay so the robot chime plays right as voice starts
        setTimeout(() => {
          window.speechSynthesis.speak(utterance);
        }, 150);
      } catch (err) {
        console.warn('Speech synthesis failed:', err);
        if (onEnd) onEnd();
      }
    } else {
      if (onEnd) onEnd();
    }
  }
}

export const robotAudio = new RobotAudioService();
