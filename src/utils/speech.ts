/**
 * Browser-native Speech Recognition (STT) and Speech Synthesis (TTS)
 * Enables complete, zero-backend interactive voice on static hosts (like GitHub Pages).
 */

export class BrowserSpeechRecognizer {
  private recognition: any = null;
  private isListening: boolean = false;
  private onResultCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private onEndCallback: (() => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript.trim() && this.onResultCallback) {
            this.onResultCallback(finalTranscript.trim(), true);
          } else if (interimTranscript.trim() && this.onResultCallback) {
            this.onResultCallback(interimTranscript.trim(), false);
          }
        };

        this.recognition.onerror = (event: any) => {
          console.warn('Browser SpeechRecognition event:', event.error);
          if (event.error !== 'no-speech' && this.onErrorCallback) {
            this.onErrorCallback(event.error);
          }
        };

        this.recognition.onend = () => {
          // If meant to keep listening, restart smoothly
          if (this.isListening) {
            try {
              this.recognition?.start();
            } catch {
              this.isListening = false;
              this.onEndCallback?.();
            }
          } else {
            this.onEndCallback?.();
          }
        };
      }
    }
  }

  public isSupported(): boolean {
    return this.recognition !== null;
  }

  public start(
    onResult: (text: string, isFinal: boolean) => void,
    onEnd?: () => void,
    onError?: (error: string) => void
  ): boolean {
    if (!this.recognition) return false;
    this.onResultCallback = onResult;
    this.onEndCallback = onEnd || null;
    this.onErrorCallback = onError || null;
    this.isListening = true;

    try {
      this.recognition.start();
      return true;
    } catch (err: any) {
      if (err.name === 'InvalidStateError') {
        // Already started
        return true;
      }
      console.warn('SpeechRecognition start notice:', err);
      return false;
    }
  }

  public stop() {
    this.isListening = false;
    try {
      this.recognition?.stop();
    } catch (_) {}
  }
}

export class BrowserSpeechSynthesizer {
  private isSpeaking: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
    }
  }

  private loadVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public speak(
    text: string,
    voicePreference: string = 'Puck',
    onStart?: () => void,
    onEnd?: () => void
  ) {
    if (!this.isSupported()) return;

    this.stop(); // Stop any currently active speech

    // Remove markdown symbols and codeblocks for clean natural vocalization
    const cleanText = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\$\$[\s\S]*?\$\$/g, '')
      .replace(/\$[^$]*\$/g, '')
      .replace(/[*#_~`]/g, '')
      .trim();

    if (!cleanText) {
      onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Pick voice
    const available = this.voices.length > 0 ? this.voices : window.speechSynthesis.getVoices();
    const isFemalePreferred = voicePreference.toLowerCase() === 'aoede' || voicePreference.toLowerCase() === 'kore';

    let matchedVoice = available.find((v) => {
      const vName = v.name.toLowerCase();
      if (isFemalePreferred) {
        return vName.includes('female') || vName.includes('samantha') || vName.includes('victoria') || vName.includes('zira');
      } else {
        return vName.includes('male') || vName.includes('daniel') || vName.includes('david') || vName.includes('george');
      }
    });

    if (!matchedVoice) {
      matchedVoice = available.find((v) => v.lang.startsWith('en')) || available[0];
    }

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      onStart?.();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      onEnd?.();
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      this.isSpeaking = false;
      this.currentUtterance = null;
      onEnd?.();
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  public stop() {
    this.isSpeaking = false;
    this.currentUtterance = null;
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
    }
  }

  public getSpeakingState(): boolean {
    return this.isSpeaking;
  }
}
