import React from 'react';
import { BookOpen, HelpCircle, Sparkles, Sigma, Copy, Check } from 'lucide-react';
import type { SocraticNoteData } from '../types';

interface SocraticNotesFeedProps {
  notes: SocraticNoteData[];
  onPageClick?: (page: number) => void;
}

const noteTypeConfig = {
  takeaway: {
    label: 'Key Takeaway',
    icon: BookOpen,
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
  },
  question: {
    label: 'Socratic Inquiry',
    icon: HelpCircle,
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
  },
  insight: {
    label: 'Core Insight',
    icon: Sparkles,
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
  },
  formula: {
    label: 'Math / Principle',
    icon: Sigma,
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
  },
};

export const SocraticNotesFeed: React.FC<SocraticNotesFeedProps> = ({ notes, onPageClick }) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (notes.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/40">
        <Sparkles className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
        <h4 className="text-sm font-medium text-zinc-300">No Socratic Notes Recorded Yet</h4>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
          As Lyra discusses concepts via Gemini 3.8 Live, key takeaways, principles, and Socratic questions will automatically stream here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => {
        const config = noteTypeConfig[note.noteType] || noteTypeConfig.takeaway;
        const Icon = config.icon;

        return (
          <div
            key={note.id}
            className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:border-zinc-700/80 transition-all duration-150 group"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded-md ${config.bg} ${config.text}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className={`text-[11px] font-semibold ${config.text}`}>
                  {config.label}
                </span>
                {note.pageNumber && (
                  <button
                    onClick={() => onPageClick?.(note.pageNumber!)}
                    className="text-[10px] font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded transition"
                  >
                    p. {note.pageNumber}
                  </button>
                )}
              </div>

              <button
                onClick={() => handleCopy(note.id, `${note.headline}\n${note.content}`)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition text-xs"
                title="Copy note"
              >
                {copiedId === note.id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <h4 className="text-xs font-semibold text-zinc-100 mb-1">{note.headline}</h4>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">{note.content}</p>
          </div>
        );
      })}
    </div>
  );
};
