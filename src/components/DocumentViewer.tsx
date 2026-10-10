import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Sparkles,
  BookOpen,
  ArrowRight,
  Layers,
  RotateCcw,
  Check,
  FilePlus2,
  Search,
} from 'lucide-react';
import type { DocumentData, ConnectionState } from '../types';
import { parseUploadedFile, parseRawTextContent } from '../utils/documentParser';

interface DocumentViewerProps {
  document: DocumentData | null;
  currentPage: number;
  connectionState: ConnectionState;
  activeHighlight?: { page: number; concept: string } | null;
  onPageChange: (newPage: number) => void;
  onNewDocumentUpload: (newDoc: DocumentData) => void;
}

const SAMPLE_TOPICS = [
  {
    title: 'Quantum Mechanics: Superposition & Decoherence',
    fileName: 'quantum_physics.md',
    content: `# Chapter 1: Foundations of Quantum State Superposition

## 1.1 The Mathematical Formalism of Qubits
In classical computation, a bit exists strictly in state 0 or 1. In quantum computing, a state vector $|\\psi\\rangle$ exists as a linear superposition:
$$|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle$$
where $\\alpha$ and $\\beta$ are complex probability amplitudes satisfying the normalization constraint:
$$|\\alpha|^2 + |\\beta|^2 = 1$$

### Key Physical Principles:
1. **Measurement Collapse:** Upon projective measurement in the computational basis, $|\\psi\\rangle$ collapses stochastically to state $|0\\rangle$ with probability $|\\alpha|^2$, or $|1\\rangle$ with probability $|\\beta|^2$.
2. **Phase Coherence:** The relative phase $\\phi$ between amplitudes determines quantum interference, which constructive algorithms (like Grover or Shor) exploit.

---

# Chapter 2: Quantum Decoherence & Noise Channels

## 2.1 Environmental Entanglement
Quantum decoherence represents the non-unitary loss of phase information when an open quantum system interacts with thermal environmental degrees of freedom.

The characteristic decoherence timescale $T_2$ is constrained by both the longitudinal relaxation time $T_1$ and pure dephasing $T_\\phi$:
$$\\frac{1}{T_2} = \\frac{1}{2T_1} + \\frac{1}{T_\\phi}$$

### Socratic Checkpoint:
- Why does quantum error correction require syndrome measurement rather than direct state cloning?
- Consider the No-Cloning Theorem: unitary operators cannot replicate an arbitrary unknown quantum state $|\\psi\\rangle$.`,
  },
  {
    title: 'Biochemistry: Enzyme Kinetics & Michaelis-Menten',
    fileName: 'enzyme_kinetics.md',
    content: `# Section 1: The Steady-State Model of Enzyme Catalysis

## 1.1 Reaction Mechanism
Enzyme-substrate interactions proceed through an intermediate complex:
$$E + S \\underset{k_{-1}}{\\overset{k_1}{\\rightleftharpoons}} ES \\xrightarrow{k_{cat}} E + P$$

Under the Briggs-Haldane steady-state approximation, the rate of formation of $[ES]$ matches its rate of breakdown:
$$\\frac{d[ES]}{dt} = k_1 [E][S] - (k_{-1} + k_{cat})[ES] \\approx 0$$

### The Michaelis Constant ($K_m$):
$$K_m = \\frac{k_{-1} + k_{cat}}{k_1}$$
$K_m$ represents the substrate concentration at which the reaction velocity $v$ is exactly half of the maximal velocity $V_{max}$.

---

# Section 2: Catalytic Efficiency & Lineweaver-Burk Plots

## 2.1 Double-Reciprocal Transformation
To determine kinetic constants experimentally, researchers linearize the Michaelis-Menten equation:
$$\\frac{1}{v} = \\left(\\frac{K_m}{V_{max}}\\right) \\frac{1}{[S]} + \\frac{1}{V_{max}}$$

- **Y-intercept:** $1 / V_{max}$
- **X-intercept:** $-1 / K_m$
- **Slope:** $K_m / V_{max}$

### Catalytic Perfection:
The specificity constant $k_{cat} / K_m$ measures catalytic efficiency, capped by diffusion rates around $10^8 - 10^9 \\, \\text{M}^{-1}\\text{s}^{-1}$.`,
  },
  {
    title: 'Neural Networks: Backpropagation & Gradient Descent',
    fileName: 'neural_backprop.md',
    content: `# Part 1: Forward Propagation & Objective Loss

## 1.1 Multi-Layer Perceptron Forward Graph
Consider a multi-layer neural network with weight tensors $W^{(l)}$ and bias vectors $b^{(l)}$:
$$z^{(l)} = W^{(l)} a^{(l-1)} + b^{(l)}$$
$$a^{(l)} = \\sigma(z^{(l)})$$
where $\\sigma$ is a non-linear activation function such as ReLU or GELU.

The scalar objective cost $L$ measures discrepancy against ground-truth labels $y$:
$$L = \\frac{1}{2} \\|a^{(L)} - y\\|^2$$

---

# Part 2: Reverse-Mode Automatic Differentiation

## 2.1 The Chain Rule Gradient Flow
In backpropagation, errors propagate upstream via the local Jacobian:
$$\\delta^{(l)} = \\frac{\\partial L}{\\partial z^{(l)}} = \\left( (W^{(l+1)})^T \\delta^{(l+1)} \\right) \\odot \\sigma'(z^{(l)})$$

Gradient updates with learning rate $\\eta$:
$$W^{(l)} \\leftarrow W^{(l)} - \\eta \\, \\delta^{(l)} (a^{(l-1)})^T$$

### Optimization Pitfalls:
- Vanishing Gradients when $\\sigma'$ saturates (e.g. sigmoid tails)
- Exploding Gradients mitigated by gradient norm clipping.`,
  },
];

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  currentPage,
  connectionState,
  activeHighlight,
  onPageChange,
  onNewDocumentUpload,
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [jumpPageInput, setJumpPageInput] = useState<string>('');
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
  const [pastedText, setPastedText] = useState<string>('');
  const [pastedTitle, setPastedTitle] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to top when page changes
  useEffect(() => {
    if (pageContainerRef.current) {
      pageContainerRef.current.scrollTop = 0;
    }
  }, [currentPage]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setIsUploading(true);
    try {
      const parsed = await parseUploadedFile(file);
      onNewDocumentUpload(parsed);
    } catch (err) {
      console.error('File parsing error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleLoadSample = (sample: typeof SAMPLE_TOPICS[0]) => {
    const parsed = parseRawTextContent(sample.content, sample.fileName, 'markdown');
    parsed.title = sample.title;
    onNewDocumentUpload(parsed);
  };

  const handlePasteSubmit = () => {
    if (!pastedText.trim()) return;
    const title = pastedTitle.trim() || 'Pasted Study Material';
    const parsed = parseRawTextContent(pastedText, title, 'markdown');
    parsed.title = title;
    onNewDocumentUpload(parsed);
    setShowPasteModal(false);
    setPastedText('');
    setPastedTitle('');
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPageInput, 10);
    if (!isNaN(pageNum) && document && pageNum >= 1 && pageNum <= document.totalPages) {
      onPageChange(pageNum);
      setJumpPageInput('');
    }
  };

  const getConnectionPill = () => {
    switch (connectionState) {
      case 'speaking':
        return {
          label: 'Gemini 3.8 Live · Speaking',
          dot: 'bg-emerald-400 animate-ping',
          bg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
        };
      case 'listening':
        return {
          label: 'Gemini 3.8 Live · Listening',
          dot: 'bg-cyan-400 animate-pulse',
          bg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
        };
      case 'connected':
        return {
          label: 'Gemini 3.8 Live · Ready',
          dot: 'bg-emerald-400',
          bg: 'bg-zinc-800 text-zinc-300 border-zinc-700',
        };
      case 'connecting':
        return {
          label: 'Connecting Voice Session...',
          dot: 'bg-amber-400 animate-pulse',
          bg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        };
      case 'error':
        return {
          label: 'Voice Standby',
          dot: 'bg-rose-400',
          bg: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
        };
      default:
        return {
          label: 'Voice Disconnected',
          dot: 'bg-zinc-500',
          bg: 'bg-zinc-900 text-zinc-400 border-zinc-800',
        };
    }
  };

  const statusPill = getConnectionPill();
  const activePageData = document?.pages.find((p) => p.pageNumber === currentPage);

  return (
    <div className="h-full flex flex-col bg-zinc-950 border-r border-zinc-800/90 select-text">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.md,.txt,.json"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Top Status & Navigation Bar */}
      <div className="h-14 border-b border-zinc-800/80 px-4 flex items-center justify-between bg-zinc-900/60 backdrop-blur z-10 shrink-0">
        {/* Left: Document Info or Connection Pill */}
        <div className="flex items-center gap-3 min-w-0">
          {document ? (
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-semibold text-zinc-100 truncate max-w-[200px] lg:max-w-[300px]">
                  {document.title}
                </h3>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {document.fileType.toUpperCase()} · {document.totalPages} Pages
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-zinc-600" />
              <span className="text-xs font-medium text-zinc-400">No Document Loaded</span>
            </div>
          )}

          {/* Status Pill */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${statusPill.bg} transition-all`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusPill.dot}`} />
            <span>{statusPill.label}</span>
          </div>
        </div>

        {/* Right: Controls & Upload New */}
        <div className="flex items-center gap-2">
          {document && (
            <>
              {/* Zoom controls */}
              <div className="hidden md:flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-zinc-400">
                <button
                  onClick={() => setZoom((z) => Math.max(50, z - 15))}
                  className="p-1 hover:text-zinc-200 hover:bg-zinc-800 rounded transition"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono px-1 w-10 text-center text-zinc-300">
                  {zoom}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(200, z + 15))}
                  className="p-1 hover:text-zinc-200 hover:bg-zinc-800 rounded transition"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoom(100)}
                  className="p-1 hover:text-zinc-200 hover:bg-zinc-800 rounded transition"
                  title="Reset 100%"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Page navigation */}
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-zinc-300">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => onPageChange(currentPage - 1)}
                  className="p-1 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-300 rounded transition"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <form onSubmit={handleJumpSubmit} className="flex items-center">
                  <input
                    type="text"
                    value={jumpPageInput}
                    onChange={(e) => setJumpPageInput(e.target.value)}
                    placeholder={`${currentPage}`}
                    className="w-7 text-center font-mono text-xs bg-transparent text-zinc-100 placeholder-zinc-400 focus:outline-none"
                  />
                  <span className="text-[11px] font-mono text-zinc-500 pr-1">
                    /{document.totalPages}
                  </span>
                </form>

                <button
                  disabled={currentPage >= document.totalPages}
                  onClick={() => onPageChange(currentPage + 1)}
                  className="p-1 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-300 rounded transition"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {/* New Upload / Switch Document Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 hover:border-zinc-700 transition text-xs font-medium flex items-center gap-1.5 shadow-sm"
            title="Upload a new document (will reset session cleanly)"
          >
            <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">{document ? 'Switch Document' : 'Upload File'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        ref={pageContainerRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex-1 overflow-auto p-4 sm:p-6 flex flex-col items-center relative"
      >
        {/* ZERO DEFAULT DATA: Initial Empty Dropzone State */}
        {!document && (
          <div className="my-auto w-full max-w-xl text-center space-y-6">
            <div
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 transition-all duration-200 flex flex-col items-center justify-center ${
                isDragging
                  ? 'border-cyan-500 bg-cyan-500/5 scale-[1.01]'
                  : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400 mb-4 shadow-lg shadow-cyan-500/5">
                <UploadCloud className="w-8 h-8" />
              </div>

              <h2 className="text-lg font-semibold text-zinc-100 mb-1">
                Upload your PDF, lecture slides, or chapter notes to begin
              </h2>
              <p className="text-xs text-zinc-400 max-w-md mx-auto mb-6 leading-relaxed">
                Drag and drop your study material here. Gemini 3.8 Live will instantly ingest the context,
                anchor Socratic dialogue to your pages, and trigger interactive diagrams and simulations in real time.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                >
                  <FilePlus2 className="w-4 h-4" />
                  <span>Browse Document (PDF, MD, TXT)</span>
                </button>
                <button
                  onClick={() => setShowPasteModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs transition border border-zinc-700 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Paste Text or Notes</span>
                </button>
              </div>

              <div className="flex items-center gap-4 text-[11px] text-zinc-500 mt-6 font-mono">
                <span>Supports: PDF</span>
                <span>•</span>
                <span>Markdown (.md)</span>
                <span>•</span>
                <span>Plain Text (.txt)</span>
              </div>
            </div>

            {/* Quick Presets (Only loaded if user clicks) */}
            <div className="pt-2">
              <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Or load an instant academic study topic:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left">
                {SAMPLE_TOPICS.map((topic, i) => (
                  <button
                    key={i}
                    onClick={() => handleLoadSample(topic)}
                    className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-left transition group"
                  >
                    <span className="text-[10px] font-mono text-cyan-400 block mb-1">
                      Topic 0{i + 1}
                    </span>
                    <h4 className="text-xs font-medium text-zinc-200 group-hover:text-white line-clamp-2 leading-snug">
                      {topic.title}
                    </h4>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loaded Document Viewer */}
        {document && activePageData && (
          <div
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
            }}
            className="w-full max-w-3xl transition-transform duration-100 pb-12"
          >
            {/* Socratic Highlight Banner */}
            {activeHighlight && activeHighlight.page === currentPage && (
              <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-zinc-900 to-indigo-950/40 border border-cyan-500/40 text-xs text-cyan-200 flex items-center justify-between shadow-lg shadow-cyan-500/10 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="font-semibold text-white">Live Focus:</span>
                  <span className="text-cyan-200">{activeHighlight.concept}</span>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                  Page {currentPage}
                </span>
              </div>
            )}

            {/* Document Page Canvas / Content Box */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 shadow-2xl overflow-hidden min-h-[600px] flex flex-col">
              {/* Page Sub-header */}
              <div className="px-6 py-3 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-400 font-mono">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-zinc-200 font-medium">
                    {activePageData.title || `Page ${currentPage}`}
                  </span>
                </div>
                <span>
                  Page {currentPage} of {document.totalPages}
                </span>
              </div>

              {/* Page Content Body */}
              <div className="p-6 sm:p-8 flex-1">
                {activePageData.canvasDataUrl ? (
                  /* Render crisp PDF Canvas Image */
                  <div className="flex justify-center">
                    <img
                      src={activePageData.canvasDataUrl}
                      alt={`Document Page ${currentPage}`}
                      className="max-w-full h-auto rounded shadow-sm border border-zinc-800"
                    />
                  </div>
                ) : (
                  /* Render Formatted Markdown / Notes Page */
                  <div className="prose prose-invert prose-sm max-w-none space-y-4 text-zinc-200 leading-relaxed font-sans">
                    {activePageData.content.split('\n\n').map((paragraph, pIdx) => {
                      if (paragraph.startsWith('# ')) {
                        return (
                          <h1
                            key={pIdx}
                            className="text-xl font-bold text-white border-b border-zinc-800 pb-2 mt-4 first:mt-0 tracking-tight"
                          >
                            {paragraph.replace('# ', '')}
                          </h1>
                        );
                      }
                      if (paragraph.startsWith('## ')) {
                        return (
                          <h2
                            key={pIdx}
                            className="text-base font-semibold text-cyan-300 mt-4 tracking-tight"
                          >
                            {paragraph.replace('## ', '')}
                          </h2>
                        );
                      }
                      if (paragraph.startsWith('### ')) {
                        return (
                          <h3 key={pIdx} className="text-sm font-semibold text-zinc-200 mt-3">
                            {paragraph.replace('### ', '')}
                          </h3>
                        );
                      }
                      if (paragraph.startsWith('$$')) {
                        return (
                          <div
                            key={pIdx}
                            className="my-3 p-3 bg-zinc-950/80 border border-zinc-800 rounded-lg text-center font-mono text-xs text-indigo-300 overflow-x-auto"
                          >
                            {paragraph.replace(/\$\$/g, '')}
                          </div>
                        );
                      }
                      if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                        const items = paragraph.split('\n');
                        return (
                          <ul key={pIdx} className="list-disc pl-5 space-y-1 text-xs text-zinc-300">
                            {items.map((it, iIdx) => (
                              <li key={iIdx}>{it.replace(/^[-*]\s*/, '')}</li>
                            ))}
                          </ul>
                        );
                      }
                      return (
                        <p key={pIdx} className="text-xs text-zinc-300 leading-relaxed font-sans">
                          {paragraph}
                        </p>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Paste Text Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-white">Paste Study Material / Notes</h3>
            <p className="text-xs text-zinc-400">
              Paste lecture notes, textbook excerpts, or syllabus text. Use <code className="text-cyan-400">---</code> or <code className="text-cyan-400"># Heading</code> to divide into pages.
            </p>

            <input
              type="text"
              value={pastedTitle}
              onChange={(e) => setPastedTitle(e.target.value)}
              placeholder="Document Title (e.g. Neuroscience Chapter 4)"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
            />

            <textarea
              rows={8}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="# Introduction to Synaptic Transmission&#10;&#10;Action potentials trigger neurotransmitter vesicle fusion...&#10;&#10;---&#10;&#10;# Postsynaptic Potentials&#10;&#10;Ionotropic vs metabotropic receptor dynamics..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-100 font-mono placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePasteSubmit}
                disabled={!pastedText.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-black disabled:opacity-40 transition"
              >
                Load Material
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
