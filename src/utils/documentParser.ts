import * as pdfjsLib from 'pdfjs-dist';
import type { DocumentData, DocumentPage } from '../types';

// Set up PDF.js worker
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.0.379'}/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('PDF.js worker setup note:', e);
  }
}

export async function parseUploadedFile(file: File): Promise<DocumentData> {
  const fileName = file.name;
  const isPdf = file.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
  const isMd = fileName.toLowerCase().endsWith('.md');
  const isTxt = fileName.toLowerCase().endsWith('.txt');
  const isJson = fileName.toLowerCase().endsWith('.json');

  if (isPdf) {
    return parsePdfFile(file);
  } else if (isMd || isTxt || isJson) {
    return parseTextFile(file, isMd ? 'markdown' : 'text');
  } else {
    // Default fallback to text parser
    return parseTextFile(file, 'text');
  }
}

async function parsePdfFile(file: File): Promise<DocumentData> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  const pages: DocumentPage[] = [];
  let fullRawText = '';

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
      .trim();

    fullRawText += `\n--- Page ${pageNum} ---\n${pageText}`;

    // Render page to canvas data URL for instant crisp visual viewing
    let canvasDataUrl: string | undefined;
    try {
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        } as any).promise;
        canvasDataUrl = canvas.toDataURL('image/png');
      }
    } catch (err) {
      console.warn(`Could not render PDF page ${pageNum} to canvas:`, err);
    }

    const firstLine = pageText.split('\n')[0]?.slice(0, 40) || `Page ${pageNum}`;

    pages.push({
      pageNumber: pageNum,
      title: firstLine,
      content: pageText || `Page ${pageNum} (visual content only)`,
      canvasDataUrl,
    });
  }

  const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

  return {
    id: `doc-${Date.now()}`,
    title: cleanTitle,
    fileName: file.name,
    fileType: 'pdf',
    pages,
    totalPages,
    rawText: fullRawText.trim(),
    uploadedAt: new Date().toISOString(),
  };
}

async function parseTextFile(file: File, fileType: 'markdown' | 'text'): Promise<DocumentData> {
  const text = await file.text();
  return parseRawTextContent(text, file.name, fileType);
}

export function parseRawTextContent(
  text: string,
  fileName: string = 'Study Notes',
  fileType: 'markdown' | 'text' = 'markdown'
): DocumentData {
  // Split into pages/sections by explicit page break '---', '===', or major headings '# '
  let sections: string[] = [];

  if (text.includes('\n---\n') || text.includes('\n___\n')) {
    sections = text.split(/\n(?:---|_{3,})\n/);
  } else if (text.includes('\n# ')) {
    // Split by top-level Markdown headers
    const parts = text.split(/(?=\n# [^\n]+)/);
    sections = parts.filter((p) => p.trim().length > 0);
  } else {
    // Split roughly every 400 words or 2500 characters if no breaks exist
    const paragraphs = text.split(/\n\s*\n/);
    let currentChunk = '';
    for (const p of paragraphs) {
      if ((currentChunk + '\n\n' + p).length > 1800 && currentChunk.length > 0) {
        sections.push(currentChunk);
        currentChunk = p;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n\n' + p : p;
      }
    }
    if (currentChunk) sections.push(currentChunk);
  }

  if (sections.length === 0) {
    sections = [text];
  }

  const pages: DocumentPage[] = sections.map((sec, idx) => {
    const pageNum = idx + 1;
    // Extract heading
    const headingMatch = sec.match(/^#+ (.*)$/m);
    const title = headingMatch ? headingMatch[1] : `Section ${pageNum}`;
    return {
      pageNumber: pageNum,
      title,
      content: sec.trim(),
    };
  });

  const cleanTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

  return {
    id: `doc-${Date.now()}`,
    title: cleanTitle,
    fileName,
    fileType,
    pages,
    totalPages: pages.length,
    rawText: text,
    uploadedAt: new Date().toISOString(),
  };
}
