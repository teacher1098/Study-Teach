import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Send, Sparkles, StopCircle, Radio } from 'lucide-react';
import type { ConnectionState } from '../types';

interface AudioVisualizerProps {
  connectionState: ConnectionState;
  isMicActive: boolean;
  isAiSpeaking: boolean;
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  onToggleMic: () => void;
  onInterrupt: () => void;
  onSendText: (text: string) => void;
  micAnalyser: AnalyserNode | null;
  outputAnalyser: AnalyserNode | null;
  onRequestDiagram: () => void;
  onRequestSimulator: () => void;
  onRequestQuiz: () => void;
}

const VOICES = ['Zephyr', 'Kore', 'Puck', 'Fenrir', 'Charon'];

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  connectionState,
  isMicActive,
  isAiSpeaking,
  selectedVoice,
  onVoiceChange,
  onToggleMic,
  onInterrupt,
  onSendText,
  micAnalyser,
  outputAnalyser,
  onRequestDiagram,
  onRequestSimulator,
  onRequestQuiz,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [inputText, setInputText] = useState('');

  // Dual waveform / frequency visualizer loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const bufferLength = 32;
    const micDataArray = new Uint8Array(bufferLength);
    const outputDataArray = new Uint8Array(bufferLength);

    const render = () => {
      animId = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Get frequency data
      if (micAnalyser && isMicActive) {
        micAnalyser.getByteFrequencyData(micDataArray);
      } else {
        micDataArray.fill(0);
      }

      if (outputAnalyser && isAiSpeaking) {
        outputAnalyser.getByteFrequencyData(outputDataArray);
      } else {
        outputDataArray.fill(0);
      }

      const barCount = 36;
      const barWidth = Math.max(2, (width / barCount) - 3);
      const centerY = height / 2;

      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + 3) + 4;
        const normalizedIndex = Math.floor((i / barCount) * bufferLength);

        const micVal = isMicActive ? (micDataArray[normalizedIndex] || 0) / 255.0 : 0;
        const outVal = isAiSpeaking ? (outputDataArray[normalizedIndex] || 0) / 255.0 : 0;

        // Combine or display dominant
        const isModelDominant = isAiSpeaking;
        const activeLevel = Math.max(micVal, outVal);

        // Ambient idle breathing wave if connected but silent
        const idleWave = connectionState === 'connected' || connectionState === 'listening'
          ? Math.sin(Date.now() / 400 + i * 0.3) * 0.12 + 0.12
          : 0.05;

        const effectiveLevel = Math.max(activeLevel, idleWave);
        const barHeight = Math.max(4, effectiveLevel * (height * 0.8));

        // Color theme:
        // Model speaking: emerald / indigo gradient
        // User speaking: cyan / blue gradient
        // Idle: muted zinc
        let barColor = '#3f3f46'; // zinc-700
        if (isModelDominant && outVal > 0.1) {
          barColor = i % 2 === 0 ? '#10b981' : '#6366f1'; // Emerald/Indigo
        } else if (isMicActive && micVal > 0.1) {
          barColor = i % 2 === 0 ? '#06b6d4' : '#3b82f6'; // Cyan/Blue
        } else if (connectionState === 'connected') {
          barColor = '#52525b'; // zinc-600
        }

        ctx.fillStyle = barColor;
        ctx.beginPath();
        // Draw centered rounded capsule
        const yTop = centerY - barHeight / 2;
        ctx.roundRect(x, yTop, barWidth, barHeight, 2);
        ctx.fill();
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [micAnalyser, outputAnalyser, isMicActive, isAiSpeaking, connectionState]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendText(inputText.trim());
    setInputText('');
  };

  const getStatusLabel = () => {
    switch (connectionState) {
      case 'speaking':
        return { text: 'Lyra Speaking...', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      case 'listening':
        return { text: 'Listening to Mic...', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' };
      case 'connected':
        return { text: 'Gemini 3.8 Live Ready', color: 'text-zinc-300 bg-zinc-800/80 border-zinc-700' };
      case 'connecting':
        return { text: 'Connecting Live Voice...', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
      case 'error':
        return { text: 'Voice Reconnecting', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
      default:
        return { text: 'Voice Idle', color: 'text-zinc-400 bg-zinc-900 border-zinc-800' };
    }
  };

  const status = getStatusLabel();

  return (
    <div className="border-t border-zinc-800/90 bg-zinc-950/95 backdrop-blur-md p-3.5 space-y-3">
      {/* Quick Tool Trigger Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-[11px]">
        <span className="text-zinc-500 shrink-0 font-medium mr-1">Direct Ask:</span>
        <button
          onClick={onRequestDiagram}
          className="px-2.5 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 text-cyan-300 border border-zinc-800 hover:border-cyan-500/40 transition shrink-0 flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Diagram Page</span>
        </button>
        <button
          onClick={onRequestSimulator}
          className="px-2.5 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 text-indigo-300 border border-zinc-800 hover:border-indigo-500/40 transition shrink-0 flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>Interactive Simulator</span>
        </button>
        <button
          onClick={onRequestQuiz}
          className="px-2.5 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 text-emerald-300 border border-zinc-800 hover:border-emerald-500/40 transition shrink-0 flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>Quiz Me</span>
        </button>
      </div>

      {/* Main Visualizer Bar */}
      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 shadow-inner">
        {/* Big Mic Button */}
        <button
          onClick={onToggleMic}
          className={`relative p-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center shrink-0 ${
            isMicActive
              ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/25 ring-2 ring-cyan-400/50'
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
          }`}
          title={isMicActive ? 'Mute Microphone' : 'Enable Real-time Voice'}
        >
          {isMicActive ? <Mic className="w-5 h-5 animate-pulse" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* Live Audio Spectrum Canvas */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${status.color}`}
              >
                {status.text}
              </span>
              {isAiSpeaking && (
                <button
                  onClick={onInterrupt}
                  className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition flex items-center gap-1"
                  title="Interrupt AI Voice"
                >
                  <StopCircle className="w-3 h-3" />
                  <span>Interrupt</span>
                </button>
              )}
            </div>

            {/* Voice persona selector */}
            <div className="flex items-center gap-1 text-[11px] text-zinc-400">
              <span className="text-[10px] text-zinc-500">Voice:</span>
              <select
                value={selectedVoice}
                onChange={(e) => onVoiceChange(e.target.value)}
                className="bg-zinc-950 text-zinc-300 border border-zinc-800 rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:border-cyan-500"
              >
                {VOICES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Canvas Waveform */}
          <div className="w-full h-8 bg-zinc-950/70 rounded-lg overflow-hidden border border-zinc-800/60 px-2 flex items-center">
            <canvas ref={canvasRef} width={280} height={32} className="w-full h-full" />
          </div>
        </div>
      </div>

      {/* Text input stream fallback */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Speak or type a question to your Socratic companion..."
          className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-xs rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-cyan-500/50"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 rounded-lg transition shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
