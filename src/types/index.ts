export type DifficultyTier = 'easy' | 'medium' | 'hard';

export interface QuizCardData {
  id: string;
  tier: DifficultyTier;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hint?: string;
  userAnswer?: number;
  isCorrect?: boolean;
  createdAt: string;
}

export interface SimulatorVariable {
  name: string;
  label: string;
  min: number;
  max: number;
  defaultVal: number;
  unit: string;
  step?: number;
}

export interface SimulatorData {
  id: string;
  title: string;
  description: string;
  formula: string;
  variables: SimulatorVariable[];
  computeExpression: string;
  outputLabel: string;
  outputUnit: string;
  explanation: string;
  createdAt: string;
}

export interface MindmapData {
  id: string;
  title: string;
  diagramType?: string;
  mermaidSyntax: string;
  summary: string;
  createdAt: string;
}

export interface SocraticNoteData {
  id: string;
  headline: string;
  noteType: 'takeaway' | 'question' | 'insight' | 'formula';
  content: string;
  pageNumber?: number;
  createdAt: string;
}

export interface DocumentPage {
  pageNumber: number;
  title?: string;
  content: string;
  canvasDataUrl?: string;
  highlights?: string[];
}

export interface DocumentData {
  id: string;
  title: string;
  fileName: string;
  fileType: 'pdf' | 'markdown' | 'text' | 'notes';
  pages: DocumentPage[];
  totalPages: number;
  rawText: string;
  uploadedAt: string;
}

export interface TranscriptMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: string;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error';
