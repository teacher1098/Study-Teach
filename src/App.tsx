/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  RefreshCw,
  FolderOpen,
  Info,
  ShieldCheck,
  Zap,
  LogOut,
} from 'lucide-react';
import type {
  DocumentData,
  MindmapData,
  SimulatorData,
  QuizCardData,
  SocraticNoteData,
  TranscriptMessage,
  ConnectionState,
} from './types';
import { AudioStreamPlayer, AudioRecorder } from './utils/audio';
import { DocumentViewer } from './components/DocumentViewer';
import { RightPanel } from './components/RightPanel';
import { LoginScreen, SessionData } from './components/LoginScreen';

export default function App() {
  // Theme state: dark mode default as requested
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // User Session state (Gatekeeper with localStorage persistence)
  const [session, setSession] = useState<SessionData | null>(() => {
    try {
      const saved = localStorage.getItem('study_companion_session');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse saved session from localStorage:', e);
    }
    return null;
  });

  // Document state (ZERO DEFAULT DATA on initial load)
  const [currentDocument, setCurrentDocument] = useState<DocumentData | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeHighlight, setActiveHighlight] = useState<{ page: number; concept: string } | null>(null);

  // Artifacts state
  const [mindmaps, setMindmaps] = useState<MindmapData[]>([]);
  const [simulators, setSimulators] = useState<SimulatorData[]>([]);
  const [quizzes, setQuizzes] = useState<QuizCardData[]>([]);
  const [socraticNotes, setSocraticNotes] = useState<SocraticNoteData[]>([]);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);

  // Voice & Audio states
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const [selectedVoice, setSelectedVoice] = useState<string>('Zephyr');

  // Audio utility instances
  const audioPlayerRef = useRef<AudioStreamPlayer | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Analysers for canvas visualizer
  const [micAnalyser, setMicAnalyser] = useState<AnalyserNode | null>(null);
  const [outputAnalyser, setOutputAnalyser] = useState<AnalyserNode | null>(null);

  // Initialize audio player
  useEffect(() => {
    audioPlayerRef.current = new AudioStreamPlayer();
    setOutputAnalyser(audioPlayerRef.current.getAnalyser());

    audioRecorderRef.current = new AudioRecorder();

    return () => {
      audioPlayerRef.current?.close();
      audioRecorderRef.current?.stop();
      wsRef.current?.close();
    };
  }, []);

  // Check if AI is currently playing audio
  useEffect(() => {
    const interval = setInterval(() => {
      if (audioPlayerRef.current) {
        const isPlaying = audioPlayerRef.current.isPlaying();
        setIsAiSpeaking(isPlaying);
        if (isPlaying) {
          setConnectionState('speaking');
        } else if (isMicActive) {
          setConnectionState('listening');
        } else if (wsRef.current?.readyState === WebSocket.OPEN) {
          setConnectionState('connected');
        }
      }
    }, 150);

    return () => clearInterval(interval);
  }, [isMicActive]);

  // Connect to backend WebSocket
  const connectWebSocket = useCallback((docTitle: string, docExcerpt: string, voice: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'init',
          documentTitle: docTitle,
          documentContent: docExcerpt,
          voiceName: voice,
        })
      );
      return;
    }

    setConnectionState('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/live`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to Gemini 3.8 Live WebSocket server');
      setConnectionState('connected');
      ws.send(
        JSON.stringify({
          type: 'init',
          documentTitle: docTitle,
          documentContent: docExcerpt,
          voiceName: voice,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'session_ready') {
          setConnectionState('connected');
        }

        // Live Voice Output (24kHz PCM)
        if (msg.type === 'audio' && msg.audio) {
          audioPlayerRef.current?.enqueueChunk(msg.audio);
          setIsAiSpeaking(true);
          setConnectionState('speaking');
        }

        // Interruption
        if (msg.type === 'interrupted') {
          audioPlayerRef.current?.interrupt();
          setIsAiSpeaking(false);
          setConnectionState(isMicActive ? 'listening' : 'connected');
        }

        // Transcripts
        if (msg.type === 'transcript') {
          const newMsg: TranscriptMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            role: msg.role || 'model',
            text: msg.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setTranscript((prev) => [...prev, newMsg]);
        }

        // Parallel Background Tool Executions from Gemini 3.8 Live
        if (msg.type === 'tool_call') {
          handleToolCall(msg.name, msg.args);
        }

        if (msg.type === 'turn_complete') {
          if (!audioPlayerRef.current?.isPlaying()) {
            setIsAiSpeaking(false);
            setConnectionState(isMicActive ? 'listening' : 'connected');
          }
        }

        if (msg.type === 'error') {
          console.warn('Live API event:', msg.message);
          setConnectionState('error');
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket connection error:', err);
      setConnectionState('error');
    };

    ws.onclose = () => {
      console.log('Live WebSocket closed');
      setConnectionState('disconnected');
    };
  }, [isMicActive]);

  // Handle Parallel Background Tools called by Gemini 3.8 Live
  const handleToolCall = (name: string, args: any) => {
    const timestamp = new Date().toISOString();

    if (name === 'render_mindmap') {
      const newMindmap: MindmapData = {
        id: `mm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: args.title || 'Concept Hierarchy',
        diagramType: args.diagramType || 'graph',
        mermaidSyntax: args.mermaidSyntax,
        summary: args.summary || 'Parallel visual mindmap generated during conversation',
        createdAt: timestamp,
      };
      setMindmaps((prev) => [newMindmap, ...prev]);
    } else if (name === 'render_simulator') {
      const newSim: SimulatorData = {
        id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: args.title || 'Interactive Calculator',
        description: args.description || 'Live formula model',
        formula: args.formula || '',
        variables: args.variables || [],
        computeExpression: args.computeExpression || '',
        outputLabel: args.outputLabel || 'Result',
        outputUnit: args.outputUnit || '',
        explanation: args.explanation || '',
        createdAt: timestamp,
      };
      setSimulators((prev) => [newSim, ...prev]);
    } else if (name === 'create_quiz') {
      const newQuiz: QuizCardData = {
        id: `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tier: args.tier || 'medium',
        question: args.question || 'Concept check',
        options: args.options || [],
        correctIndex: args.correctIndex ?? 0,
        explanation: args.explanation || '',
        hint: args.hint,
        createdAt: timestamp,
      };
      setQuizzes((prev) => [newQuiz, ...prev]);
    } else if (name === 'add_socratic_note') {
      const newNote: SocraticNoteData = {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        headline: args.headline || 'Study Note',
        noteType: args.noteType || 'takeaway',
        content: args.content || '',
        pageNumber: currentPage,
        createdAt: timestamp,
      };
      setSocraticNotes((prev) => [newNote, ...prev]);
    } else if (name === 'highlight_page') {
      if (args.pageNumber) {
        setCurrentPage(args.pageNumber);
      }
      if (args.keyConceptSummary) {
        setActiveHighlight({
          page: args.pageNumber || currentPage,
          concept: args.keyConceptSummary,
        });
      }
    }
  };

  /**
   * CRITICAL REQUIREMENT: State Reset on New Upload
   * 1. Automatically purge and clear all previous session history, past artifact tabs, cached notes, and generated mini-apps.
   * 2. Reset the voice session and slide index to page 1.
   * 3. Re-initialize the assistant context specifically for the newly uploaded file without retaining baggage from previous topic.
   */
  const handleNewDocumentUpload = (newDoc: DocumentData) => {
    // 1. Purge all past artifact tabs, cached notes, generated mini-apps, and transcripts
    setMindmaps([]);
    setSimulators([]);
    setQuizzes([]);
    setSocraticNotes([]);
    setTranscript([]);
    setActiveHighlight(null);

    // 2. Reset slide index to page 1
    setCurrentPage(1);
    setCurrentDocument(newDoc);

    // 3. Reset voice session and re-initialize assistant context specifically for newly uploaded file
    audioPlayerRef.current?.interrupt();

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'reset' }));
      wsRef.current.send(
        JSON.stringify({
          type: 'init',
          documentTitle: newDoc.title,
          documentContent: newDoc.rawText.slice(0, 10000),
          voiceName: selectedVoice,
        })
      );
    } else {
      connectWebSocket(newDoc.title, newDoc.rawText.slice(0, 10000), selectedVoice);
    }

    // Trigger initial high-level document analysis in background for instant study guide
    fetch('/api/document/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newDoc.title,
        textContent: newDoc.rawText.slice(0, 8000),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.initialMindmap) {
          setMindmaps([
            {
              id: `mm-init-${Date.now()}`,
              title: `${newDoc.title} · Core Architecture`,
              diagramType: 'graph',
              mermaidSyntax: data.initialMindmap,
              summary: data.overview || 'Initial structural overview of the uploaded material',
              createdAt: new Date().toISOString(),
            },
          ]);
        }
        if (data.initialQuiz) {
          setQuizzes([
            {
              id: `quiz-init-${Date.now()}`,
              tier: data.initialQuiz.tier || 'easy',
              question: data.initialQuiz.question,
              options: data.initialQuiz.options,
              correctIndex: data.initialQuiz.correctIndex,
              explanation: data.initialQuiz.explanation,
              hint: data.initialQuiz.hint,
              createdAt: new Date().toISOString(),
            },
          ]);
        }
        if (data.keyConcepts && Array.isArray(data.keyConcepts)) {
          const notes: SocraticNoteData[] = data.keyConcepts.map((kc: string, i: number) => ({
            id: `note-kc-${Date.now()}-${i}`,
            headline: `Concept ${i + 1}: ${kc}`,
            noteType: 'insight',
            content: `Core pillar of ${newDoc.title}. Socratic inquiry available via Gemini Live.`,
            pageNumber: 1,
            createdAt: new Date().toISOString(),
          }));
          setSocraticNotes(notes);
        }
      })
      .catch((err) => {
        console.warn('Initial doc analysis background notice:', err);
      });
  };

  // Toggle Microphone
  const handleToggleMic = async () => {
    if (isMicActive) {
      audioRecorderRef.current?.stop();
      setIsMicActive(false);
      setConnectionState(wsRef.current?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected');
    } else {
      // If no document uploaded yet, connect with default study context
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        connectWebSocket(
          currentDocument?.title || 'General Academic Companion',
          currentDocument?.rawText.slice(0, 10000) || 'Student study workspace ready.',
          selectedVoice
        );
      }

      const started = await audioRecorderRef.current?.start((base64Pcm: string) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'audio',
              data: base64Pcm,
            })
          );
        }
      });

      if (started) {
        setIsMicActive(true);
        setMicAnalyser(audioRecorderRef.current?.getAnalyser() || null);
        setConnectionState('listening');
      }
    }
  };

  // Interrupt AI Spoken Response
  const handleInterrupt = () => {
    audioPlayerRef.current?.interrupt();
    setIsAiSpeaking(false);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupted' }));
    }
  };

  // Voice Persona change
  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
    if (currentDocument && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'init',
          documentTitle: currentDocument.title,
          documentContent: currentDocument.rawText.slice(0, 10000),
          voiceName: voice,
        })
      );
    }
  };

  // Send Text Input fallback to WebSocket / Chat
  const handleSendText = (text: string) => {
    const userMsg: TranscriptMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setTranscript((prev) => [...prev, userMsg]);

    // Send through Live WebSocket if open
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'text', text }));
    } else {
      // Fallback to REST chat endpoint
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          documentTitle: currentDocument?.title || 'General Companion',
          documentContent: currentDocument?.rawText || '',
          currentPage,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.reply) {
            setTranscript((prev) => [
              ...prev,
              {
                id: `rep-${Date.now()}`,
                role: 'model',
                text: data.reply,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]);
          }
        })
        .catch(console.error);
    }
  };

  // Quick Action: Request Diagram for active page
  const handleRequestDiagram = () => {
    const activePage = currentDocument?.pages.find((p) => p.pageNumber === currentPage);
    const topic = activePage?.title || currentDocument?.title || 'Academic Concept';
    const context = activePage?.content || currentDocument?.rawText || '';

    fetch('/api/artifact/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'mindmap',
        topic: `Concept breakdown of ${topic}`,
        context,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.mermaidSyntax) {
          const newMap: MindmapData = {
            id: `mm-req-${Date.now()}`,
            title: data.title || topic,
            mermaidSyntax: data.mermaidSyntax,
            summary: data.summary || `Mindmap for page ${currentPage}`,
            createdAt: new Date().toISOString(),
          };
          setMindmaps((prev) => [newMap, ...prev]);
        }
      })
      .catch(console.error);
  };

  // Quick Action: Request Simulator for active page
  const handleRequestSimulator = () => {
    const activePage = currentDocument?.pages.find((p) => p.pageNumber === currentPage);
    const topic = activePage?.title || currentDocument?.title || 'Physical or Mathematical Model';
    const context = activePage?.content || currentDocument?.rawText || '';

    fetch('/api/artifact/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'simulator',
        topic,
        context,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.variables && data.computeExpression) {
          const newSim: SimulatorData = {
            id: `sim-req-${Date.now()}`,
            title: data.title,
            description: data.description,
            formula: data.formula,
            variables: data.variables,
            computeExpression: data.computeExpression,
            outputLabel: data.outputLabel,
            outputUnit: data.outputUnit,
            explanation: data.explanation,
            createdAt: new Date().toISOString(),
          };
          setSimulators((prev) => [newSim, ...prev]);
        }
      })
      .catch(console.error);
  };

  // Quick Action: Request Quiz for active page
  const handleRequestQuiz = () => {
    const activePage = currentDocument?.pages.find((p) => p.pageNumber === currentPage);
    const topic = activePage?.title || currentDocument?.title || 'Concept Mastery';
    const context = activePage?.content || currentDocument?.rawText || '';
    const tiers: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
    const chosenTier = tiers[Math.floor(Math.random() * tiers.length)];

    fetch('/api/artifact/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'quiz',
        topic,
        context,
        tier: chosenTier,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.question && data.options) {
          const newQuiz: QuizCardData = {
            id: `quiz-req-${Date.now()}`,
            tier: data.tier || chosenTier,
            question: data.question,
            options: data.options,
            correctIndex: data.correctIndex,
            explanation: data.explanation,
            hint: data.hint,
            createdAt: new Date().toISOString(),
          };
          setQuizzes((prev) => [newQuiz, ...prev]);
        }
      })
      .catch(console.error);
  };

  // Handle Logout
  const handleLogout = useCallback(() => {
    try {
      localStorage.removeItem('study_companion_session');
    } catch (e) {
      console.warn('Failed to clear session from localStorage:', e);
    }
    audioRecorderRef.current?.stop();
    audioPlayerRef.current?.interrupt();
    setIsMicActive(false);
    setIsAiSpeaking(false);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionState('disconnected');
    setSession(null);
  }, []);

  // Gatekeeper: If user is not authenticated, show clean login / access key gatekeeper screen
  if (!session) {
    return (
      <LoginScreen
        onLoginSuccess={(newSession) => setSession(newSession)}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
      />
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${isDarkMode ? 'dark bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
      {/* Top Application Header */}
      <header className="h-13 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 via-indigo-500 to-emerald-400 p-0.5 flex items-center justify-center shadow-md shadow-cyan-500/10">
              <div className="w-full h-full bg-zinc-950 rounded-[6px] flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white tracking-tight">Lyra</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  Gemini 3.8 Live
                </span>
              </div>
            </div>
          </div>
          <div className="hidden md:block h-3.5 w-[1px] bg-zinc-800" />
          <span className="hidden md:inline text-xs text-zinc-400 font-medium">
            Live AI Study & Teaching Companion
          </span>
        </div>

        {/* Right side global actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active User Identifier Badge */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-300 bg-zinc-900/90 px-2.5 py-1 rounded-lg border border-zinc-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-mono text-[11px] max-w-[130px] truncate text-zinc-300" title={session.identifier}>
              {session.identifier}
            </span>
          </div>

          {/* Socratic Mode Badge */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono bg-zinc-900 px-2.5 py-1 rounded-full border border-zinc-800">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span>Multimodal Socratic Loop</span>
          </div>

          {/* Dark / Light Mode Switch */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition"
            title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Small 'Log out' button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950/40 text-zinc-300 hover:text-rose-300 border border-zinc-800 hover:border-rose-800/50 text-xs font-medium transition cursor-pointer"
            title="Log out of current session"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-xs">Log out</span>
          </button>
        </div>
      </header>

      {/* Main Two-Column Split Layout */}
      {/* Left Panel: 60% Document Viewer */}
      {/* Right Panel: 40% Live Interaction Workspace */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left Panel: 60% on desktop */}
        <div className="w-full lg:w-[60%] h-[55vh] lg:h-full flex flex-col min-h-0">
          <DocumentViewer
            document={currentDocument}
            currentPage={currentPage}
            connectionState={connectionState}
            activeHighlight={activeHighlight}
            onPageChange={(p) => setCurrentPage(p)}
            onNewDocumentUpload={handleNewDocumentUpload}
          />
        </div>

        {/* Right Panel: 40% on desktop */}
        <div className="w-full lg:w-[40%] h-[45vh] lg:h-full flex flex-col min-h-0 border-t lg:border-t-0 lg:border-l border-zinc-800/90">
          <RightPanel
            mindmaps={mindmaps}
            simulators={simulators}
            quizzes={quizzes}
            socraticNotes={socraticNotes}
            transcript={transcript}
            connectionState={connectionState}
            isMicActive={isMicActive}
            isAiSpeaking={isAiSpeaking}
            selectedVoice={selectedVoice}
            onVoiceChange={handleVoiceChange}
            onToggleMic={handleToggleMic}
            onInterrupt={handleInterrupt}
            onSendText={handleSendText}
            micAnalyser={micAnalyser}
            outputAnalyser={outputAnalyser}
            onRequestDiagram={handleRequestDiagram}
            onRequestSimulator={handleRequestSimulator}
            onRequestQuiz={handleRequestQuiz}
            onNavigatePage={(p) => setCurrentPage(p)}
          />
        </div>
      </main>
    </div>
  );
}
