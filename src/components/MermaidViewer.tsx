import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { ZoomIn, ZoomOut, RotateCcw, Copy, Check, Maximize2, Minimize2, FileCode } from 'lucide-react';
import type { MindmapData } from '../types';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter, system-ui, sans-serif',
  themeVariables: {
    darkMode: true,
    background: '#18181b',
    primaryColor: '#3b82f6',
    primaryTextColor: '#f4f4f5',
    primaryBorderColor: '#60a5fa',
    lineColor: '#71717a',
    secondaryColor: '#10b981',
    tertiaryColor: '#8b5cf6',
  },
});

interface MermaidViewerProps {
  data: MindmapData;
  isLatest?: boolean;
}

export const MermaidViewer: React.FC<MermaidViewerProps> = ({ data, isLatest }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      try {
        setRenderError(null);
        const uniqueId = `mermaid-${data.id.replace(/[^a-zA-Z0-9]/g, '')}-${Math.random().toString(36).slice(2, 7)}`;
        
        // Clean up syntax if necessary
        let cleanedSyntax = data.mermaidSyntax.trim();
        // Remove markdown codeblock fences if present
        if (cleanedSyntax.startsWith('```mermaid')) {
          cleanedSyntax = cleanedSyntax.replace(/^```mermaid\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedSyntax.startsWith('```')) {
          cleanedSyntax = cleanedSyntax.replace(/^```\w*\s*/, '').replace(/\s*```$/, '');
        }

        const { svg } = await mermaid.render(uniqueId, cleanedSyntax);
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err: any) {
        console.warn('Mermaid render error:', err);
        if (isMounted) {
          setRenderError(err?.message || 'Diagram could not be rendered as Mermaid syntax');
        }
      }
    };

    renderDiagram();
    return () => {
      isMounted = false;
    };
  }, [data.mermaidSyntax, data.id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(data.mermaidSyntax);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`rounded-xl border transition-all duration-200 overflow-hidden bg-zinc-900/90 ${
        isLatest ? 'border-cyan-500/40 shadow-lg shadow-cyan-500/5' : 'border-zinc-800'
      } ${isFullscreen ? 'fixed inset-4 z-50 flex flex-col bg-zinc-950 border-zinc-700' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
            <FileCode className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-100 leading-tight">{data.title}</h4>
            <p className="text-xs text-zinc-400 line-clamp-1">{data.summary}</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1.5 text-zinc-400">
          <button
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
            className="p-1.5 rounded hover:text-zinc-200 hover:bg-zinc-800 text-xs transition"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-zinc-400 w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
            className="p-1.5 rounded hover:text-zinc-200 hover:bg-zinc-800 text-xs transition"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1.5 rounded hover:text-zinc-200 hover:bg-zinc-800 text-xs transition"
            title="Reset zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <div className="w-[1px] h-3.5 bg-zinc-800 mx-1" />
          <button
            onClick={handleCopy}
            className="p-1.5 rounded hover:text-zinc-200 hover:bg-zinc-800 text-xs transition flex items-center gap-1"
            title="Copy Mermaid Syntax"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded hover:text-zinc-200 hover:bg-zinc-800 text-xs transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Diagram Canvas Body */}
      <div
        ref={containerRef}
        className={`relative overflow-auto p-4 flex items-center justify-center min-h-[220px] bg-zinc-950/60 ${
          isFullscreen ? 'flex-1' : 'max-h-[460px]'
        }`}
      >
        {renderError ? (
          <div className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-left">
            <div className="text-xs font-mono text-amber-400 mb-2">Diagram Source (Syntax Preview):</div>
            <pre className="text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap bg-zinc-950 p-3 rounded border border-zinc-800/80">
              {data.mermaidSyntax}
            </pre>
            <p className="text-[11px] text-zinc-500 mt-2">
              Note: Syntax fallback mode active while real-time parser aligns formatting.
            </p>
          </div>
        ) : (
          <div
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
            className="transition-transform duration-150 flex items-center justify-center w-full [&_svg]:max-w-full [&_svg]:h-auto select-none"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 border-t border-zinc-800/60 bg-zinc-900/40 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
        <span>Mermaid.js Concept Map</span>
        <span>Generated parallel to voice</span>
      </div>
    </div>
  );
};
