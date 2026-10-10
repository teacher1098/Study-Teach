import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, XCircle, HelpCircle, Lightbulb, RotateCcw, Award } from 'lucide-react';
import type { QuizCardData, DifficultyTier } from '../types';

interface QuizCardProps {
  data: QuizCardData;
  isLatest?: boolean;
}

const tierMeta: Record<DifficultyTier, { label: string; bg: string; text: string; border: string }> = {
  easy: {
    label: 'Level 1 · Easy Concept Check',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  medium: {
    label: 'Level 2 · Medium Application',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  hard: {
    label: 'Level 3 · Hard Synthesis & Analysis',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
  },
};

export const QuizCard: React.FC<QuizCardProps> = ({ data, isLatest }) => {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showHint, setShowHint] = useState<boolean>(false);

  const tier = tierMeta[data.tier] || tierMeta.medium;
  const isAnswered = selectedAnswer !== null;
  const isCorrect = selectedAnswer === data.correctIndex;

  const handleSelect = (idx: number) => {
    if (isAnswered) return;
    setSelectedAnswer(idx);

    if (idx === data.correctIndex) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'],
        });
      } catch (e) {
        // Safe fallback
      }
    }
  };

  const handleReset = () => {
    setSelectedAnswer(null);
    setShowHint(false);
  };

  return (
    <div
      className={`rounded-xl border transition-all duration-200 overflow-hidden bg-zinc-900/90 ${
        isLatest ? 'border-emerald-500/40 shadow-lg shadow-emerald-500/5' : 'border-zinc-800'
      }`}
    >
      {/* Header with tier badge */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-zinc-800 text-zinc-300">
            <Award className="w-3.5 h-3.5" />
          </div>
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${tier.bg} ${tier.text} ${tier.border}`}
          >
            {tier.label}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {data.hint && !isAnswered && (
            <button
              onClick={() => setShowHint(!showHint)}
              className="text-xs text-zinc-400 hover:text-amber-300 p-1.5 rounded hover:bg-zinc-800 transition flex items-center gap-1"
              title="Show hint"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span className="text-[11px]">Hint</span>
            </button>
          )}

          {isAnswered && (
            <button
              onClick={handleReset}
              className="text-xs text-zinc-400 hover:text-zinc-200 p-1.5 rounded hover:bg-zinc-800 transition flex items-center gap-1"
              title="Try again"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[11px]">Reset</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Question Title */}
        <h4 className="text-sm font-medium text-zinc-100 leading-snug">
          {data.question}
        </h4>

        {/* Hint Accordion */}
        {showHint && data.hint && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold">Socratic Hint:</span>
              <p>{data.hint}</p>
            </div>
          </div>
        )}

        {/* Options Grid */}
        <div className="space-y-2">
          {data.options.map((option, idx) => {
            const letter = String.fromCharCode(65 + idx);
            let optionStyles = 'border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800/60 hover:border-zinc-700 text-zinc-300';
            let icon = null;

            if (isAnswered) {
              if (idx === data.correctIndex) {
                optionStyles = 'border-emerald-500 bg-emerald-950/30 text-emerald-100 ring-1 ring-emerald-500/50';
                icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
              } else if (idx === selectedAnswer) {
                optionStyles = 'border-rose-500 bg-rose-950/30 text-rose-100 ring-1 ring-rose-500/50';
                icon = <XCircle className="w-4 h-4 text-rose-400 shrink-0" />;
              } else {
                optionStyles = 'border-zinc-800/40 bg-zinc-950/30 opacity-40 text-zinc-500';
              }
            }

            return (
              <button
                key={idx}
                disabled={isAnswered}
                onClick={() => handleSelect(idx)}
                className={`w-full p-3 rounded-lg border text-left text-xs transition-all flex items-center justify-between gap-3 ${optionStyles}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-md bg-zinc-800/80 font-mono text-[11px] font-semibold flex items-center justify-center text-zinc-400 shrink-0">
                    {letter}
                  </span>
                  <span className="font-medium leading-relaxed">{option}</span>
                </div>
                {icon}
              </button>
            );
          })}
        </div>

        {/* Instant Feedback Explanation */}
        {isAnswered && (
          <div
            className={`p-3.5 rounded-lg border text-xs leading-relaxed animate-in fade-in duration-200 ${
              isCorrect
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                : 'bg-zinc-950 border-zinc-800 text-zinc-300'
            }`}
          >
            <div className="flex items-center gap-1.5 font-semibold mb-1">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Spot on! Great intuition.</span>
                </>
              ) : (
                <>
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span>Not quite. Let's inspect the concept:</span>
                </>
              )}
            </div>
            <p className="text-zinc-300">{data.explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
};
