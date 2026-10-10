import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, Type, type LiveServerMessage } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const apiKey = process.env.GEMINI_API_KEY || '';

const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const tools = [
  {
    functionDeclarations: [
      {
        name: 'render_mindmap',
        description: 'Generate and render a conceptual mindmap, flowchart, or diagram related to the current topic.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Title of the mindmap or diagram' },
            diagramType: { type: Type.STRING, description: 'graph, mindmap, sequence, or class' },
            mermaidSyntax: { type: Type.STRING, description: 'Valid Mermaid.js syntax for the diagram (e.g. graph TD\n  A[Concept] --> B[Subconcept])' },
            summary: { type: Type.STRING, description: 'Brief 1-sentence takeaway of the diagram' },
          },
          required: ['title', 'mermaidSyntax', 'summary'],
        },
      },
      {
        name: 'render_simulator',
        description: 'Create an interactive calculation simulator with sliders and formula computation for the student to experiment with.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Simulator title' },
            description: { type: Type.STRING, description: 'What this simulator demonstrates' },
            formula: { type: Type.STRING, description: 'Mathematical formula displayed (e.g. F = m * a)' },
            variables: {
              type: Type.ARRAY,
              description: 'Configurable input variables with sliders',
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: 'Identifier (e.g. m, a)' },
                  label: { type: Type.STRING, description: 'Display label (e.g. Mass)' },
                  min: { type: Type.NUMBER, description: 'Minimum slider value' },
                  max: { type: Type.NUMBER, description: 'Maximum slider value' },
                  defaultVal: { type: Type.NUMBER, description: 'Default starting value' },
                  unit: { type: Type.STRING, description: 'Unit of measure (e.g. kg, m/s^2)' },
                  step: { type: Type.NUMBER, description: 'Step size for slider' },
                },
                required: ['name', 'label', 'min', 'max', 'defaultVal', 'unit'],
              },
            },
            computeExpression: {
              type: Type.STRING,
              description: 'JavaScript expression to calculate output using variable names (e.g., m * a)',
            },
            outputLabel: { type: Type.STRING, description: 'Label for the result (e.g. Net Force)' },
            outputUnit: { type: Type.STRING, description: 'Unit for the output (e.g. N)' },
            explanation: { type: Type.STRING, description: 'Explanation of how the variables interact' },
          },
          required: ['title', 'description', 'formula', 'variables', 'computeExpression', 'outputLabel', 'outputUnit'],
        },
      },
      {
        name: 'create_quiz',
        description: 'Generate an auto-graded 3-tier difficulty quiz card (easy, medium, or hard) with instant feedback.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            tier: { type: Type.STRING, description: "Difficulty level: 'easy', 'medium', or 'hard'" },
            question: { type: Type.STRING, description: 'The quiz question' },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Array of 4 answer options',
            },
            correctIndex: { type: Type.INTEGER, description: '0-based index of the correct answer' },
            explanation: { type: Type.STRING, description: 'Explanation shown after answering' },
            hint: { type: Type.STRING, description: 'Helpful hint for the student' },
          },
          required: ['tier', 'question', 'options', 'correctIndex', 'explanation'],
        },
      },
      {
        name: 'add_socratic_note',
        description: 'Add a structured Socratic note to the student study stream (takeaway, question to ponder, key formula, or insight).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING, description: 'Short title of the note' },
            noteType: { type: Type.STRING, description: "One of: 'takeaway', 'question', 'insight', 'formula'" },
            content: { type: Type.STRING, description: 'Clear, insightful content' },
          },
          required: ['headline', 'noteType', 'content'],
        },
      },
      {
        name: 'highlight_page',
        description: 'Focus student attention on a specific concept on the document page.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            pageNumber: { type: Type.INTEGER, description: 'Page number' },
            keyConceptSummary: { type: Type.STRING, description: 'Key concept or section heading to emphasize' },
          },
          required: ['pageNumber', 'keyConceptSummary'],
        },
      },
    ],
  },
];

// REST API for initial document analysis
app.post('/api/document/analyze', async (req, res) => {
  try {
    const { title, textContent } = req.body;
    if (!textContent || typeof textContent !== 'string') {
      return res.status(400).json({ error: 'Missing document text content' });
    }

    const prompt = `Analyze this uploaded study document ("${title || 'Study Material'}"):
Content snippet / summary:
${textContent.slice(0, 10000)}

Provide a structured study guide JSON response with:
1. "overview": A concise 2-sentence summary of the main subject.
2. "keyConcepts": An array of 4-6 primary concept names or takeaways.
3. "suggestedQuestions": An array of 3 thought-provoking Socratic questions to discuss.
4. "initialMindmap": A valid mermaid graph definition (e.g. graph TD\n  Root["${title}"] --> C1["Concept 1"]\n  Root --> C2["Concept 2"])
5. "initialQuiz": A 3-tier difficulty quiz card { "tier": "easy", "question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "...", "hint": "..." }
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error analyzing document:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze document' });
  }
});

// REST API for generating on-demand artifacts
app.post('/api/artifact/generate', async (req, res) => {
  try {
    const { type, topic, context, tier } = req.body;

    if (type === 'mindmap') {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Create a comprehensive conceptual mindmap in Mermaid.js syntax for: "${topic}".
Context from document:
${(context || '').slice(0, 3000)}

Return JSON with:
{
  "title": "Title of Mindmap",
  "mermaidSyntax": "graph TD\\n  A[...] --> B[...]",
  "summary": "1 sentence description"
}
Ensure the mermaid syntax is clean, syntactically valid with graph TD or mindmap, uses plain alphanumeric node IDs and clean labels.`,
        config: { responseMimeType: 'application/json' },
      });
      return res.json(JSON.parse(response.text || '{}'));
    }

    if (type === 'simulator') {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Create an interactive calculation simulator for this concept: "${topic}".
Context: ${(context || '').slice(0, 3000)}

Return JSON matching this schema:
{
  "title": "Simulator title",
  "description": "What it models",
  "formula": "e.g. F = m * a or P = V * I or E = m * c^2",
  "variables": [
    {
      "name": "varName",
      "label": "Display Label",
      "min": 1,
      "max": 100,
      "defaultVal": 10,
      "unit": "kg",
      "step": 1
    }
  ],
  "computeExpression": "JavaScript expression using the variable names, e.g. varName1 * varName2",
  "outputLabel": "Output Label",
  "outputUnit": "Units",
  "explanation": "Why this happens as sliders move"
}`,
        config: { responseMimeType: 'application/json' },
      });
      return res.json(JSON.parse(response.text || '{}'));
    }

    if (type === 'quiz') {
      const chosenTier = tier || 'medium';
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Create a high quality ${chosenTier}-tier multiple choice quiz question for topic "${topic}".
Context: ${(context || '').slice(0, 3000)}

Return JSON:
{
  "tier": "${chosenTier}",
  "question": "Clear, challenging question testing understanding",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctIndex": 0,
  "explanation": "Comprehensive explanation of why the correct answer is right and why others are wrong",
  "hint": "Guiding clue without giving away the answer"
}`,
        config: { responseMimeType: 'application/json' },
      });
      return res.json(JSON.parse(response.text || '{}'));
    }

    res.status(400).json({ error: 'Unknown artifact type' });
  } catch (error: any) {
    console.error('Error generating artifact:', error);
    res.status(500).json({ error: error.message || 'Failed to generate artifact' });
  }
});

// REST API for text chat / socratic question fallback
app.post('/api/chat', async (req, res) => {
  try {
    const { message, documentTitle, documentContent, currentPage, history } = req.body;
    const systemPrompt = `You are Lyra, an encouraging, elite Socratic tutor and study companion.
The student has uploaded: "${documentTitle || 'Document'}".
Active Page: ${currentPage || 1}.
Document Excerpt:
${(documentContent || '').slice(0, 6000)}

Rules:
- Explain clearly with Socratic depth, warm tone, intuitive analogies.
- Keep responses concise, direct, and structured.
- If relevant, include a brief Socratic question to guide the student deeper.`;

    const chatHistory = (history || []).map((h: any) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }],
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        { role: 'user', parts: [{ text: `System Instructions: ${systemPrompt}` }] },
        ...chatHistory,
        { role: 'user', parts: [{ text: message }] },
      ],
    });

    res.json({ reply: response.text || '' });
  } catch (error: any) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: error.message || 'Failed to chat' });
  }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/live' });

wss.on('connection', (clientWs: WebSocket) => {
  let liveSession: any = null;
  let currentDocTitle = 'Study Document';
  let isConnecting = false;

  const cleanupSession = async () => {
    if (liveSession) {
      try {
        if (typeof liveSession.close === 'function') {
          liveSession.close();
        }
      } catch (e) {
        console.error('Error closing live session:', e);
      }
      liveSession = null;
    }
  };

  const initLiveSession = async (docTitle: string, docExcerpt: string, voiceName: string = 'Zephyr') => {
    if (isConnecting) return;
    isConnecting = true;
    await cleanupSession();

    try {
      currentDocTitle = docTitle || 'Study Document';
      const systemInstruction = `You are Lyra, a world-class, encouraging Socratic tutor and real-time study companion powered by Gemini 3.8 Live.
The student is studying: "${currentDocTitle}".
Study document content excerpt:
${docExcerpt ? docExcerpt.slice(0, 8000) : 'The student has uploaded this study material.'}

IMPORTANT TEACHING BEHAVIORS:
1. Speak in a natural, lively, concise, warm conversational tone. Keep spoken voice replies brief (2-4 sentences at a time) so the conversation is interactive and bidirectional.
2. Socratic approach: ask thought-provoking questions, verify understanding, and break complex concepts into intuitive physical or real-world mental models.
3. PARALLEL BACKGROUND TOOL CALLING: While you speak, proactively call client tools to enhance the student's visual and interactive experience:
   - Call \`render_mindmap\` when explaining concepts with structure, workflows, or hierarchies.
   - Call \`render_simulator\` when formulas, mathematical models, or physical relationships are discussed so the student can drag sliders and test variables in real-time.
   - Call \`create_quiz\` when testing understanding with an easy, medium, or hard multiple choice challenge.
   - Call \`add_socratic_note\` to record key takeaways, golden rules, or questions to ponder.
   - Call \`highlight_page\` when referring to a specific page or section of their document.
4. When you call a tool, continue speaking naturally to explain what you've just brought up! Do not hesitate or remain silent.
5. If the student interrupts you by speaking, immediately adapt to their query.`;

      liveSession = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceName || 'Zephyr',
              },
            },
          },
          systemInstruction,
          tools: tools as any,
        },
        callbacks: {
          onmessage: async (message: LiveServerMessage) => {
            if (clientWs.readyState !== WebSocket.OPEN) return;

            // Handle audio output
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts && parts.length > 0) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'audio',
                      audio: part.inlineData.data,
                    })
                  );
                }
                if (part.text) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'transcript',
                      role: 'model',
                      text: part.text,
                    })
                  );
                }
              }
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }

            // Handle turn complete
            if (message.serverContent?.turnComplete) {
              clientWs.send(JSON.stringify({ type: 'turn_complete' }));
            }

            // Handle tool calling
            if (message.toolCall?.functionCalls && message.toolCall.functionCalls.length > 0) {
              const functionResponses: any[] = [];
              for (const call of message.toolCall.functionCalls) {
                clientWs.send(
                  JSON.stringify({
                    type: 'tool_call',
                    name: call.name,
                    args: call.args,
                    id: call.id,
                  })
                );

                functionResponses.push({
                  id: call.id,
                  name: call.name,
                  response: {
                    status: 'success',
                    rendered: true,
                    timestamp: new Date().toISOString(),
                  },
                });
              }

              // Send tool responses back to the Live session so voice flow continues without delay
              if (liveSession && typeof liveSession.sendToolResponse === 'function') {
                try {
                  liveSession.sendToolResponse({ functionResponses });
                } catch (err) {
                  console.error('Error sending tool response to Live session:', err);
                }
              }
            }
          },
          onclose: () => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'session_closed' }));
            }
          },
          onerror: (err: any) => {
            console.error('Live API Session error:', err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'error',
                  message: err?.message || 'Live session error',
                })
              );
            }
          },
        },
      });

      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: 'session_ready',
            voiceName,
            model: 'gemini-3.8-live',
          })
        );
      }
    } catch (err: any) {
      console.error('Failed to connect to Gemini 3.8 Live:', err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: 'error',
            message: err?.message || 'Failed to initialize Gemini 3.8 Live session',
          })
        );
      }
    } finally {
      isConnecting = false;
    }
  };

  clientWs.on('message', async (data: Buffer | string) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'init') {
        await initLiveSession(msg.documentTitle, msg.documentContent, msg.voiceName);
        return;
      }

      if (msg.type === 'reset') {
        await cleanupSession();
        clientWs.send(JSON.stringify({ type: 'session_reset_complete' }));
        return;
      }

      if (msg.type === 'audio' && msg.data) {
        if (liveSession && typeof liveSession.sendRealtimeInput === 'function') {
          liveSession.sendRealtimeInput({
            audio: {
              data: msg.data,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        }
        return;
      }

      if (msg.type === 'text' && msg.text) {
        if (liveSession && typeof liveSession.sendRealtimeInput === 'function') {
          liveSession.sendRealtimeInput({
            text: msg.text,
          });
        }
        return;
      }
    } catch (err: any) {
      console.error('Error handling client message:', err);
    }
  });

  clientWs.on('close', () => {
    cleanupSession();
  });
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(port, () => {
    console.log(`Server running at http://localhost:${port} in ${isDev ? 'dev' : 'production'} mode`);
  });
}

startServer();
