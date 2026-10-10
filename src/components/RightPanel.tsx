import React, { useState } from 'react';
import {
  Sparkles,
  MessageSquare,
  Award,
  Sliders,
  FileCode,
  Layers,
  History,
  Bot,
  User,
} from 'lucide-react';
import type {
  MindmapData,
  SimulatorData,
  QuizCardData,
  SocraticNoteData,
  TranscriptMessage,
  ConnectionState,
} from '../types';
import { MermaidViewer } from './MermaidViewer';
import { SimulatorCard } from './SimulatorCard';
import { QuizCard } from './QuizCard';
import { SocraticNotesFeed } from './SocraticNotesFeed';
import { AudioVisualizer } from './AudioVisualizer';

interface RightPanelProps {
  mindmaps: MindmapData[];
  simulators: SimulatorData[];
  quizzes: QuizCardData[];
  socraticNotes: SocraticNoteData[];
  transcript: TranscriptMessage[];
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
  onNavigatePage?: (pageNum: number) => void;
}

type TabType = 'artifacts' | 'notes' | 'quizzes' | 'simulators';

export const RightPanel: React.FC<RightPanelProps> = ({
  mindmaps,
  simulators,
  quizzes,
  socraticNotes,
  transcript,
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
  onNavigatePage,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('artifacts');
  const [notesSubView, setNotesSubView] = useState<'all' | 'notes' | 'chat'>('all');

  const totalArtifactsCount = mindmaps.length + simulators.length + quizzes.length;

  return (
    <div className="h-full flex flex-col bg-zinc-950 overflow-hidden">
      {/* Top Tab Bar (Notion/Linear style) */}
      <div className="h-14 border-b border-zinc-800/80 px-4 flex items-center justify-between bg-zinc-900/60 backdrop-blur shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {/* Artifacts Tab */}
          <button
            onClick={() => setActiveTab('artifacts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'artifacts'
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Artifacts</span>
            {totalArtifactsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-mono font-semibold">
                {totalArtifactsCount}
              </span>
            )}
          </button>

          {/* Socratic Notes & Transcript Tab */}
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'notes'
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
            <span>Dialogue & Notes</span>
            {socraticNotes.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-mono font-semibold">
                {socraticNotes.length}
              </span>
            )}
          </button>

          {/* Quizzes Tab */}
          <button
            onClick={() => setActiveTab('quizzes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'quizzes'
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span>Quizzes</span>
            {quizzes.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-semibold">
                {quizzes.length}
              </span>
            )}
          </button>

          {/* Simulators Tab */}
          <button
            onClick={() => setActiveTab('simulators')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'simulators'
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            <span>Simulators</span>
            {simulators.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-mono font-semibold">
                {simulators.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: ALL ARTIFACTS & VISUALIZERS */}
        {activeTab === 'artifacts' && (
          <div className="space-y-5">
            {totalArtifactsCount === 0 ? (
              <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30 my-8">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400 mx-auto mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-zinc-200">Live Visual Workspace Ready</h4>
                <p className="text-xs text-zinc-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
                  While you converse with Gemini 3.8 Live, background tools will automatically pop up conceptual diagrams, interactive formula simulators, and 3-tier quizzes here without interrupting your conversation.
                </p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button
                    onClick={onRequestDiagram}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-cyan-300 border border-zinc-700 transition"
                  >
                    Diagram Page
                  </button>
                  <button
                    onClick={onRequestSimulator}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-indigo-300 border border-zinc-700 transition"
                  >
                    Generate Simulator
                  </button>
                  <button
                    onClick={onRequestQuiz}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-emerald-300 border border-zinc-700 transition"
                  >
                    Quiz Me
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Render latest mindmaps */}
                {mindmaps.map((mm, idx) => (
                  <MermaidViewer key={mm.id} data={mm} isLatest={idx === 0} />
                ))}

                {/* Render simulators */}
                {simulators.map((sim, idx) => (
                  <SimulatorCard key={sim.id} data={sim} isLatest={idx === 0} />
                ))}

                {/* Render quizzes */}
                {quizzes.map((quiz, idx) => (
                  <QuizCard key={quiz.id} data={quiz} isLatest={idx === 0} />
                ))}
              </>
            )}
          </div>
        )}

        {/* TAB 2: SOCRATIC NOTES & TRANSCRIPT */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            {/* Sub-selector */}
            <div className="flex items-center justify-between bg-zinc-900/60 p-1 rounded-lg border border-zinc-800 text-xs">
              <button
                onClick={() => setNotesSubView('all')}
                className={`flex-1 py-1 rounded font-medium transition ${
                  notesSubView === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Combined View
              </button>
              <button
                onClick={() => setNotesSubView('notes')}
                className={`flex-1 py-1 rounded font-medium transition ${
                  notesSubView === 'notes' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Key Notes ({socraticNotes.length})
              </button>
              <button
                onClick={() => setNotesSubView('chat')}
                className={`flex-1 py-1 rounded font-medium transition ${
                  notesSubView === 'chat' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Live Dialogue ({transcript.length})
              </button>
            </div>

            {/* Socratic structured notes */}
            {(notesSubView === 'all' || notesSubView === 'notes') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 px-1">
                  <span>Socratic Notes & Insights</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Streamed live</span>
                </div>
                <SocraticNotesFeed notes={socraticNotes} onPageClick={onNavigatePage} />
              </div>
            )}

            {/* Transcript stream */}
            {(notesSubView === 'all' || notesSubView === 'chat') && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 px-1">
                  <span>Spoken Transcript Stream</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Bidirectional</span>
                </div>

                {transcript.length === 0 ? (
                  <div className="p-6 text-center border border-zinc-800/80 rounded-xl bg-zinc-950/40 text-xs text-zinc-500">
                    Live speech transcripts will appear here when speaking via mic.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {transcript.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-xl border text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-zinc-900 border-zinc-800 text-zinc-200 ml-6'
                            : 'bg-zinc-950 border-zinc-800/90 text-zinc-300 mr-6'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono text-zinc-500">
                          {msg.role === 'user' ? (
                            <>
                              <User className="w-3 h-3 text-cyan-400" />
                              <span className="text-cyan-400">Student</span>
                            </>
                          ) : (
                            <>
                              <Bot className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Lyra (Gemini 3.8 Live)</span>
                            </>
                          )}
                          <span>·</span>
                          <span>{msg.timestamp}</span>
                        </div>
                        <p>{msg.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: QUIZ ARENA */}
        {activeTab === 'quizzes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-zinc-300">3-Tier Mastery Quizzes</h4>
              <button
                onClick={onRequestQuiz}
                className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition"
              >
                + New Quiz Question
              </button>
            </div>

            {quizzes.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/40">
                <Award className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <h4 className="text-sm font-medium text-zinc-300">No Quizzes Generated Yet</h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                  Click the button above or tell Lyra "Quiz me on this page" to challenge yourself with 3-tier difficulty questions.
                </p>
              </div>
            ) : (
              quizzes.map((quiz, idx) => (
                <QuizCard key={quiz.id} data={quiz} isLatest={idx === 0} />
              ))
            )}
          </div>
        )}

        {/* TAB 4: SIMULATORS */}
        {activeTab === 'simulators' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-zinc-300">Interactive Formula Simulators</h4>
              <button
                onClick={onRequestSimulator}
                className="text-xs px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 transition"
              >
                + New Simulator
              </button>
            </div>

            {simulators.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/40">
                <Sliders className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <h4 className="text-sm font-medium text-zinc-300">No Calculation Models Created</h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                  Say "Simulate this formula" or click above to build an interactive calculator with real-time sliders and dynamic graphs.
                </p>
              </div>
            ) : (
              simulators.map((sim, idx) => (
                <SimulatorCard key={sim.id} data={sim} isLatest={idx === 0} />
              ))
            )}
          </div>
        )}
      </div>

      {/* Prominent Audio Visualizer / Mic Toggle Bar at Bottom */}
      <AudioVisualizer
        connectionState={connectionState}
        isMicActive={isMicActive}
        isAiSpeaking={isAiSpeaking}
        selectedVoice={selectedVoice}
        onVoiceChange={onVoiceChange}
        onToggleMic={onToggleMic}
        onInterrupt={onInterrupt}
        onSendText={onSendText}
        micAnalyser={micAnalyser}
        outputAnalyser={outputAnalyser}
        onRequestDiagram={onRequestDiagram}
        onRequestSimulator={onRequestSimulator}
        onRequestQuiz={onRequestQuiz}
      />
    </div>
  );
};
