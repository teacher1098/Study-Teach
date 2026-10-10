/**
 * Real-time Audio Streaming Utility for Gemini 3.8 Live API
 * Handles 16kHz raw PCM mic capture and 24kHz gapless playback with interruption support
 */

export class AudioStreamPlayer {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private nextStartTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private isMuted: boolean = false;

  constructor() {
    // Lazy initialize on first user interaction to satisfy browser autoplay policies
  }

  private initContext() {
    try {
      if (!this.audioCtx && typeof window !== 'undefined') {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          try {
            this.audioCtx = new AudioCtxClass({ sampleRate: 24000 });
          } catch {
            this.audioCtx = new AudioCtxClass();
          }
          this.analyser = this.audioCtx.createAnalyser();
          this.analyser.fftSize = 64;
          this.analyser.smoothingTimeConstant = 0.8;
          this.analyser.connect(this.audioCtx.destination);
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('AudioContext init note:', e);
    }
  }

  public getAnalyser(): AnalyserNode | null {
    this.initContext();
    return this.analyser;
  }

  public enqueueChunk(base64Pcm: string) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.audioCtx || !this.analyser) return;

    try {
      const binaryString = atob(base64Pcm);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert 16-bit PCM little endian to Float32
      const numSamples = Math.floor(len / 2);
      const int16Array = new Int16Array(bytes.buffer, bytes.byteOffset, numSamples);
      const float32Array = new Float32Array(numSamples);
      for (let i = 0; i < numSamples; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = this.audioCtx.createBuffer(1, numSamples, 24000);
      audioBuffer.copyToChannel(float32Array, 0);

      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.analyser);

      const currentTime = this.audioCtx.currentTime;
      // Gapless scheduling
      const startTime = Math.max(currentTime, this.nextStartTime);
      source.start(startTime);
      this.nextStartTime = startTime + audioBuffer.duration;

      this.activeSources.push(source);
      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
      };
    } catch (e) {
      console.error('Error decoding/scheduling audio chunk:', e);
    }
  }

  public interrupt() {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Source might have already stopped
      }
    }
    this.activeSources = [];
    if (this.audioCtx) {
      this.nextStartTime = this.audioCtx.currentTime;
    } else {
      this.nextStartTime = 0;
    }
  }

  public isPlaying(): boolean {
    return this.activeSources.length > 0;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.interrupt();
    }
  }

  public close() {
    this.interrupt();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
    }
    this.audioCtx = null;
    this.analyser = null;
  }
}

export class AudioRecorder {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isRecording: boolean = false;
  private onAudioChunk: ((base64: string) => void) | null = null;

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public async start(onAudioChunk: (base64: string) => void): Promise<boolean> {
    if (this.isRecording) return true;
    this.onAudioChunk = onAudioChunk;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      // 16kHz for Gemini Live input
      this.audioCtx = new AudioCtxClass({ sampleRate: 16000 });
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.source = this.audioCtx.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;
      this.source.connect(this.analyser);

      // ScriptProcessor for 16kHz PCM chunks
      this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1);
      this.processor.onaudioprocess = (e) => {
        if (!this.isRecording || !this.onAudioChunk) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Convert Int16Array to base64
        const uint8 = new Uint8Array(pcm16.buffer);
        let binary = '';
        const len = uint8.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        const base64 = btoa(binary);
        this.onAudioChunk(base64);
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioCtx.destination);
      this.isRecording = true;
      return true;
    } catch (err) {
      console.error('Failed to start audio recording:', err);
      this.stop();
      return false;
    }
  }

  public stop() {
    this.isRecording = false;
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
    }
    this.audioCtx = null;
    this.analyser = null;
    this.onAudioChunk = null;
  }

  public active(): boolean {
    return this.isRecording;
  }
}
