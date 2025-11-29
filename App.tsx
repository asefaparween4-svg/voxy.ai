
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type, GenerateContentResponse } from '@google/genai';
import { Mic, MicOff, Power, Volume2, Cpu, MessageSquare, Download, Monitor, LayoutDashboard, Keyboard, Camera, CameraOff, Eye, Globe, Newspaper, BookOpen, Image as ImageIcon, GraduationCap } from 'lucide-react';
import AudioVisualizer from './components/AudioVisualizer';
import ProjectionDisplay from './components/ProjectionDisplay';
import ChatPanel from './components/ChatPanel';
import StudySpace from './components/StudySpace';
import NewsSpace from './components/NewsSpace';
import KnowledgeSpace from './components/KnowledgeSpace';
import { ProjectionData, ProjectionType, ChatMessage } from './types';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from './utils/audio';

// --- Constants ---
const LIVE_MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';
// Upgraded to Pro model for high-level math and reasoning
const TEXT_MODEL_NAME = 'gemini-3-pro-preview';

// --- Performance Settings ---
const VIDEO_FRAME_RATE_MS = 500; // Send a frame every 500ms (2 FPS) to prevent lag
const JPEG_QUALITY = 0.5; // Compress images to reduce bandwidth

// --- Startup Projection (The "Jarvis Engine") ---
const STARTUP_PROJECTION: ProjectionData = {
  title: "ARC REACTOR MK-V",
  type: ProjectionType.HOLOGRAM_3D,
  description: "Magnetic Confinement Core - High Energy Output Simulation",
  data: {
    elements: [
       // Central Core (Glowing Sphere)
       { shape: 'sphere', position: [0, 0, 0], scale: [0.8, 0.8, 0.8], rotation: [0, 0, 0], color: '#e0f2fe', opacity: 0.9, label: 'PLASMA CORE', animation: { type: 'oscillate', axis: 'y', amplitude: 2, speed: 4 } },
       
       // Inner Stabilizer Ring (Rotating Fast)
       { shape: 'torus', position: [0, 0, 0], scale: [1.2, 1.2, 1.2], rotation: [0, 0, 0], color: '#38bdf8', opacity: 0.8, animation: { type: 'rotate', axis: 'z', speed: 2 } },
       
       // Outer Stabilizer Ring (Rotating Slow Counter)
       { shape: 'torus', position: [0, 0, 0], scale: [1.8, 1.8, 1.8], rotation: [1.57, 0, 0], color: '#0ea5e9', opacity: 0.6, label: 'MAGNETIC RING', animation: { type: 'rotate', axis: 'y', speed: -1 } },
       
       // Magnetic Containment Pillars (Vertical Cylinders)
       { shape: 'cylinder', position: [2, 0, 0], scale: [0.3, 1.5, 0.3], rotation: [0, 0, 0], color: '#7dd3fc', opacity: 0.7, label: 'INJECTOR' },
       { shape: 'cylinder', position: [-2, 0, 0], scale: [0.3, 1.5, 0.3], rotation: [0, 0, 0], color: '#7dd3fc', opacity: 0.7 },
       { shape: 'cylinder', position: [0, 0, 2], scale: [0.3, 1.5, 0.3], rotation: [0, 0, 0], color: '#7dd3fc', opacity: 0.7 },
       { shape: 'cylinder', position: [0, 0, -2], scale: [0.3, 1.5, 0.3], rotation: [0, 0, 0], color: '#7dd3fc', opacity: 0.7 },

       // Top/Bottom Caps (Cones)
       { shape: 'cone', position: [0, 2.5, 0], scale: [1, 0.5, 1], rotation: [0, 0, 0], color: '#0369a1', opacity: 0.4 },
       { shape: 'cone', position: [0, -2.5, 0], scale: [1, 0.5, 1], rotation: [3.14, 0, 0], color: '#0369a1', opacity: 0.4 },

       // Energy Field Particles (Flowing Up)
       { shape: 'cylinder', position: [0, 0, 0], scale: [2.5, 3, 2.5], rotation: [0, 0, 0], color: '#ffffff', opacity: 0.05, animation: { type: 'flow' } },
       
       // Base Gear
       { shape: 'gear', position: [0, -3, 0], scale: [1, 2.5, 2.5], rotation: [1.57, 0, 0], color: '#1e293b', opacity: 0.8, teeth: 24, label: 'DRIVE GEAR', animation: { type: 'rotate', axis: 'y', speed: 0.5 } },

       // External Oscillating Spring
       { shape: 'spring', position: [0, 0, 0], scale: [2.2, 2.0, 2.2], rotation: [0, 0, 0], color: '#f0abfc', opacity: 0.7, coils: 12, label: 'DAMPENER', animation: { type: 'oscillate', axis: 'y', amplitude: 30, speed: 2 } }
    ]
  }
};

// --- Tool Definition ---
const projectContentTool: FunctionDeclaration = {
  name: 'project_content',
  description: 'Project visual content to the user screen. Use this to show charts, lists, stats, images, technical blueprints (SVG), 3D holographic models, or news feeds.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { 
        type: Type.STRING, 
        description: 'Title of the projection' 
      },
      type: { 
        type: Type.STRING, 
        enum: ['chart_bar', 'chart_line', 'list', 'stat_card', 'text_summary', 'image', 'technical_svg', 'hologram_3d', 'news_feed'],
        description: 'Type of visualization' 
      },
      data: { 
        type: Type.STRING, 
        description: 'JSON stringified data. For "news_feed", array of {title, source, url, summary, time, imageUrl?}. For hologram_3d: JSON object with "elements" array.' 
      },
      description: {
        type: Type.STRING,
        description: 'Short subtitle or context for the visual'
      }
    },
    required: ['title', 'type', 'data']
  }
};

const SYSTEM_INSTRUCTION = `You are Jarvis, a Universal Knowledge Engine & Advanced Research Assistant. 
You possess the combined capabilities of a deep research AI (like Perplexity), a conversational genius (like ChatGPT), a mechanical engineer, and a Computational Math Engine (like Wolfram Alpha).

CORE PROTOCOL - UNIVERSAL KNOWLEDGE:
- You have **FULL, UNRESTRICTED ACCESS** to the internet via Google Search.
- **Act like Perplexity:** When asked a complex question, perform a "Deep Search". Look up multiple sources, synthesize the information, and provide a comprehensive answer with citations.
- **Act like ChatGPT:** Maintain a natural, fluid conversation. Be creative, empathetic, and witty.
- **Always cite your sources** when retrieving information from the web.

COMPUTATIONAL & MATH PROTOCOL:
- You are an **EXPERT MATHEMATICIAN**. You can solve Calculus, Linear Algebra, Differential Equations, Statistics, and Physics problems.
- **Step-by-Step Logic**: When solving a problem, always break it down into clear steps. Explain the principle being used (e.g., "Using the Chain Rule...").
- **Show Working**: Display the intermediate steps of the calculation.
- **Verification**: Double-check your final answer for accuracy.
- **Formatting**: Use clean, structured text for math equations (e.g., "x^2 + y^2 = r^2").

ACADEMIC & TEACHING PROTOCOL:
- If a user asks for a PPT Outline: Project a 'list' where items are slide titles and descriptions.
- If a user asks about Elements/Isotopes: Provide detailed atomic data. Use 'stat_card' or 'technical_svg' to show atomic structures if possible.
- If acting as a Tutor: Be Socratic. Don't just give answers; explain the 'Why' and 'How'.

NEWS PROTOCOL:
- If a user asks for "News" (Global, Local, Tech, etc.):
  1. Use Google Search to find the most recent, top-rated headlines matching the category.
  2. **Prioritize reputable, high-authority sources** (e.g., Reuters, AP, BBC, New York Times, Washington Post, Al Jazeera, Bloomberg, Financial Times).
  3. Use \`project_content\` with type **'news_feed'**.
  4. The data format must be a JSON array: \`[{ "title": "...", "source": "...", "url": "...", "summary": "Short 1-sentence summary", "time": "2 hours ago", "imageUrl": "URL of image if available" }, ...]\`.

VISUALIZATION CAPABILITIES:
1. **3D HOLOGRAMS ('hologram_3d')**: 
   - Use this for interactive 3D Diagrams and CAD models.
   - **Labeling**: Use 'label' property. 
   - **Primitives**: 'cube', 'sphere', 'cylinder', 'cone', 'torus', 'ring'.
   - **Mechanical Parts**: 'gear' (teeth param), 'spring' (coils param).
   - **Physics**: Use 'animation' for rotation, oscillation, compression, flow.

2. **TECHNICAL BLUEPRINTS ('technical_svg')**:
   - Use this for schematic views or wiring diagrams.

3. **DATA & LISTS**:
   - 'chart_line', 'chart_bar', 'list', 'stat_card'.

LANGUAGE PROTOCOL:
- **STRICT ENFORCEMENT**: You are programmed to communicate **ONLY** in English.
- **INPUT VALIDATION**: If a user asks a question or makes a statement in a language other than English, you must **REFUSE** to answer the query itself. Instead, politely reply: "I am designed to process commands and queries in English only. Please restate your request in English."
- Do not translate the user's non-English query.
- Do not attempt to answer the user's non-English query in English.
- Simply request English input.

INTERACTION MODES:
The user can speak or text. If they ask to "see" something, project it immediately.
If asked about current events, stock prices, or news, USE GOOGLE SEARCH immediately.`;

// Helper for Video Preview
const VideoPreview = ({ stream }: { stream: MediaStream | null }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted className="w-full h-full object-cover opacity-80" />;
};

const App: React.FC = () => {
  // State
  const [isLive, setIsLive] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [currentProjection, setCurrentProjection] = useState<ProjectionData | null>(STARTUP_PROJECTION);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error' | 'processing'>('disconnected');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // View State (Dashboard/Study/News/Knowledge)
  const [currentView, setCurrentView] = useState<'dashboard' | 'study' | 'news' | 'knowledge'>('dashboard');
  const [activeTab, setActiveTab] = useState<'visual' | 'chat' | 'study' | 'news' | 'knowledge'>('chat'); // Mobile Tab
  
  // Refs for Audio & Session
  const sessionRef = useRef<Promise<any> | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const audioStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Refs for Video
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoIntervalRef = useRef<number | null>(null);

  // Refs for Chat
  const currentInputTransRef = useRef<string>('');
  const currentOutputTransRef = useRef<string>('');

  // --- Load Chat History ---
  useEffect(() => {
    const saved = localStorage.getItem('jarvis_chat_history');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load chat history', e);
      }
    }
  }, []);

  // --- Save Chat History ---
  useEffect(() => {
    localStorage.setItem('jarvis_chat_history', JSON.stringify(messages));
  }, [messages]);

  // --- Audio Setup ---
  const initializeAudioContexts = () => {
    if (!inputContextRef.current) {
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputAnalyserRef.current = inputContextRef.current.createAnalyser();
    }
    if (!outputContextRef.current) {
      outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputAnalyserRef.current = outputContextRef.current.createAnalyser();
      // Connect analyser to destination for visualization
      outputAnalyserRef.current.connect(outputContextRef.current.destination);
    }
  };

  // --- Video Frame Processor ---
  const startVideoProcessing = () => {
    if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);

    videoIntervalRef.current = window.setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (!video || !canvas || !isVideoOn || !isLive || !sessionRef.current) return;
      if (video.readyState !== 4) return; // Wait for enough data

      // Draw video to canvas (scale down for performance if needed)
      // Maintaining a reasonable resolution (e.g., 640px width) helps performance
      const scale = 0.5; 
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64
        const base64Data = canvas.toDataURL('image/jpeg', JPEG_QUALITY).split(',')[1];
        
        sessionRef.current?.then(session => {
          session.sendRealtimeInput({
            media: {
              mimeType: 'image/jpeg',
              data: base64Data
            }
          });
        });
      }
    }, VIDEO_FRAME_RATE_MS);
  };

  const stopMedia = () => {
    // Stop Audio
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioSourceNodeRef.current) {
      audioSourceNodeRef.current.disconnect();
      audioSourceNodeRef.current = null;
    }
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    // Stop Video
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(t => t.stop());
      videoStreamRef.current = null;
    }
  };

  // --- Live API Handlers ---
  const connectToLiveAPI = async () => {
    if (!process.env.API_KEY) {
      console.warn("API Key is missing. Check process.env.API_KEY");
      setStatus('error');
      return;
    }

    try {
      setStatus('connecting');
      initializeAudioContexts();
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Get Audio Stream
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = audioStream;

      const sessionPromise = ai.live.connect({
        model: LIVE_MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [
            { functionDeclarations: [projectContentTool] },
            { googleSearch: {} }, 
            { googleMaps: {} }    
          ],
          inputAudioTranscription: {}, 
          outputAudioTranscription: {}, 
        },
        callbacks: {
          onopen: () => {
            console.log('Session opened');
            setStatus('connected');
            setIsLive(true);

            // Setup Input Streaming
            if (!inputContextRef.current || !audioStreamRef.current) return;
            
            const source = inputContextRef.current.createMediaStreamSource(audioStreamRef.current);
            audioSourceNodeRef.current = source;
            
            // Analyser for visualization
            if (inputAnalyserRef.current) {
               source.connect(inputAnalyserRef.current);
            }

            // Processor for sending audio data
            const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              if (!isMicOn) return; // Mute logic
              
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              
              sessionRef.current?.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputContextRef.current.destination);

            // If Video was requested before connection, start processing
            if (isVideoOn) {
               startVideoProcessing();
            }
          },
          onmessage: async (msg: LiveServerMessage) => {
            // 1. Handle Transcriptions (Chat)
            let hasTranscriptionUpdate = false;
            
            if (msg.serverContent?.inputTranscription) {
              const text = msg.serverContent.inputTranscription.text;
              if (text) {
                currentInputTransRef.current += text;
                hasTranscriptionUpdate = true;
              }
            }
            
            if (msg.serverContent?.outputTranscription) {
              const text = msg.serverContent.outputTranscription.text;
              if (text) {
                currentOutputTransRef.current += text;
                hasTranscriptionUpdate = true;
              }
            }

            // 1.5 Handle Grounding (Search Results)
            const serverContentAny = msg.serverContent as any;
            if (serverContentAny?.groundingMetadata?.groundingChunks) {
              const chunks = serverContentAny.groundingMetadata.groundingChunks;
              const sources = chunks
                .map((c: any) => {
                   if (c.web?.uri) return { title: c.web.title, url: c.web.uri };
                   if (c.maps?.webUri) return { title: c.maps.title, url: c.maps.webUri }; 
                   return null;
                })
                .filter(Boolean);
                
              if (sources.length > 0) {
                 setMessages(prev => {
                   const newMsgs = [...prev];
                   const last = newMsgs[newMsgs.length - 1];
                   if (last && last.role === 'model') {
                     const existingUrls = new Set(last.sources?.map(s => s.url) || []);
                     const mergedSources = [...(last.sources || [])];
                     
                     sources.forEach((s: any) => {
                       if (!existingUrls.has(s.url)) {
                         mergedSources.push(s);
                         existingUrls.add(s.url);
                       }
                     });
                     
                     last.sources = mergedSources;
                   }
                   return newMsgs;
                 });
              }
            }

            // Update UI with partials or finalize on turn complete
            if (hasTranscriptionUpdate || msg.serverContent?.turnComplete) {
              setMessages(prev => {
                const newMessages = [...prev];
                
                // Update or Add User Message
                if (currentInputTransRef.current) {
                  const lastMsg = newMessages[newMessages.length - 1];
                  if (lastMsg && lastMsg.role === 'user' && !lastMsg.text.endsWith('\n[DONE]')) {
                    lastMsg.text = currentInputTransRef.current;
                  } else {
                    if (newMessages.length === 0 || newMessages[newMessages.length - 1].role !== 'user') {
                       newMessages.push({ role: 'user', text: currentInputTransRef.current });
                    } else {
                       newMessages[newMessages.length - 1].text = currentInputTransRef.current;
                    }
                  }
                }

                // Update or Add Model Message
                if (currentOutputTransRef.current) {
                  const lastMsg = newMessages[newMessages.length - 1];
                  if (lastMsg && lastMsg.role === 'model') {
                    lastMsg.text = currentOutputTransRef.current;
                  } else {
                    newMessages.push({ role: 'model', text: currentOutputTransRef.current });
                  }
                }

                return newMessages;
              });

              if (msg.serverContent?.turnComplete) {
                 if (currentInputTransRef.current) currentInputTransRef.current = '';
                 if (currentOutputTransRef.current) currentOutputTransRef.current = '';
              }
            }

            // 2. Handle Tool Calls
            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                if (fc.name === 'project_content') {
                  try {
                    const data = typeof fc.args.data === 'string' ? JSON.parse(fc.args.data) : fc.args.data;
                    const projection: ProjectionData = {
                      title: fc.args.title as string,
                      type: fc.args.type as ProjectionType,
                      description: fc.args.description as string,
                      data: data
                    };
                    setCurrentProjection(projection);
                    
                    // Switch view based on projection type
                    if (fc.args.type === 'news_feed') {
                        setCurrentView('news');
                        setActiveTab('news');
                    } else {
                        setCurrentView('dashboard');
                        setActiveTab('visual');
                    }
                    
                    sessionRef.current?.then(session => {
                      session.sendToolResponse({
                        functionResponses: [{
                          id: fc.id,
                          name: fc.name,
                          response: { result: 'Projection displayed successfully to user.' }
                        }]
                      });
                    });
                  } catch (e) {
                    console.error('Error parsing projection data', e);
                    // Fallback for string SVG data
                    if (fc.args.type === 'technical_svg' && typeof fc.args.data === 'string') {
                         const projection: ProjectionData = {
                          title: fc.args.title as string,
                          type: ProjectionType.TECHNICAL_SVG,
                          description: fc.args.description as string,
                          data: fc.args.data
                        };
                        setCurrentProjection(projection);
                        setCurrentView('dashboard');
                        setActiveTab('visual');
                        
                        sessionRef.current?.then(session => {
                          session.sendToolResponse({
                            functionResponses: [{
                              id: fc.id,
                              name: fc.name,
                              response: { result: 'Projection displayed successfully to user.' }
                            }]
                          });
                        });
                    }
                  }
                }
              }
            }

            // 3. Handle Audio Output
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputContextRef.current && outputAnalyserRef.current) {
              try {
                const audioCtx = outputContextRef.current;
                const audioData = base64ToUint8Array(base64Audio);
                
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioCtx.currentTime);
                
                const audioBuffer = await decodeAudioData(audioData, audioCtx);
                const source = audioCtx.createBufferSource();
                source.buffer = audioBuffer;
                
                source.connect(outputAnalyserRef.current);
                
                source.addEventListener('ended', () => {
                  sourcesRef.current.delete(source);
                });

                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);

              } catch (err) {
                console.error('Error decoding audio', err);
              }
            }

            // 4. Handle Interruption
            if (msg.serverContent?.interrupted) {
              console.log('Interrupted');
              sourcesRef.current.forEach(s => {
                try { s.stop(); } catch(e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              currentOutputTransRef.current = ''; 
            }
          },
          onclose: () => {
            console.log('Session closed');
            setStatus('disconnected');
            setIsLive(false);
          },
          onerror: (err) => {
            console.error('Session error', err);
            setStatus('error');
            setIsLive(false);
          }
        }
      });
      
      sessionPromise.catch(e => {
          console.error("Connection failed async", e);
          setStatus('error');
      });

      sessionRef.current = sessionPromise;

    } catch (e) {
      console.error('Connection failed', e);
      setStatus('error');
    }
  };

  const disconnect = async () => {
    if (sessionRef.current) {
      try {
        const session = await sessionRef.current;
        session.close();
      } catch (e) {
        console.error("Error closing session", e);
      }
      sessionRef.current = null;
    }
    stopMedia();
    setIsLive(false);
    setStatus('disconnected');
    setIsVideoOn(false);
  };

  const toggleMic = () => {
    setIsMicOn(prev => !prev);
  };

  const toggleCamera = async () => {
    if (isVideoOn) {
      // Turn Off
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(t => t.stop());
        videoStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
        videoIntervalRef.current = null;
      }
      setIsVideoOn(false);
    } else {
      // Turn On
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsVideoOn(true);
        if (isLive) {
          startVideoProcessing();
        }
      } catch (e) {
        console.error("Camera access denied", e);
      }
    }
  };

  const sendTextMessage = async (text: string) => {
    // 1. Add User Message to UI immediately
    const newUserMsg: ChatMessage = { role: 'user', text: text };
    setMessages(prev => [...prev, newUserMsg]);

    // 2. Clear input is handled by ChatPanel, but we need to ensure processing starts

    if (isLive && sessionRef.current) {
        // EXISTING LIVE SESSION LOGIC
        sessionRef.current.then(session => {
            if (session && typeof session.send === 'function') {
                session.send({
                    clientContent: {
                        turns: [{ role: 'user', parts: [{ text: text }] }],
                        turnComplete: true
                    }
                });
            }
        });
    } else {
        // NEW REST API LOGIC (Fast Text Mode Fallback)
        try {
            setStatus('processing');
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Construct History - Filter out empty messages
            const history = messages
                .filter(m => m.text)
                .map(m => ({
                    role: m.role,
                    parts: [{ text: m.text }]
                }));

            const response = await ai.models.generateContent({
                model: TEXT_MODEL_NAME, 
                config: {
                    systemInstruction: SYSTEM_INSTRUCTION,
                    tools: [
                        { functionDeclarations: [projectContentTool] },
                        { googleSearch: {} } // Enable search for text mode too
                    ]
                },
                contents: [...history, { role: 'user', parts: [{ text }] }]
            });

            const modelText = response.text || '';
            
            // Handle Tool Calls for Visuals
            const functionCalls = response.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
                 for (const fc of functionCalls) {
                     if (fc.name === 'project_content') {
                         const data = typeof fc.args.data === 'string' ? JSON.parse(fc.args.data) : fc.args.data;
                         const projection: ProjectionData = {
                             title: fc.args.title as string,
                             type: fc.args.type as ProjectionType,
                             description: fc.args.description as string,
                             data: data
                         };
                         setCurrentProjection(projection);
                         // View switching logic
                         if (fc.args.type === 'news_feed') {
                            setCurrentView('news');
                            setActiveTab('news');
                         } else {
                            setCurrentView('dashboard');
                            setActiveTab('visual');
                         }
                     }
                 }
            }

            if (modelText) {
                setMessages(prev => [...prev, { 
                  role: 'model', 
                  text: modelText, 
                  sources: getSourcesFromGrounding(response.candidates?.[0]) 
                }]);
            }
            setStatus('disconnected');

        } catch (error) {
            console.error("Text Gen Error", error);
            setMessages(prev => [...prev, { role: 'model', text: "Error: Unable to process request. Please check connection." }]);
            setStatus('error');
        }
    }
  };

  // Helper to extract sources from REST response
  const getSourcesFromGrounding = (candidate: any) => {
    const chunks = candidate?.groundingMetadata?.groundingChunks;
    if (!chunks) return undefined;
    return chunks.map((c: any) => {
        if (c.web?.uri) return { title: c.web.title, url: c.web.uri };
        return null;
    }).filter(Boolean);
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('jarvis_chat_history');
  };

  const fetchNews = (query: string = "Search for the latest top 5 global news headlines right now from major international newspapers") => {
    // Explicitly mentioning the tool requirement in the message text helps the model decide to use it.
    sendTextMessage(`${query} using Google Search, and display the results as a 'news_feed' projection.`);
  };

  const analyzeArticle = (article: {title: string, url: string}) => {
    sendTextMessage(`Perform a deep research analysis on this article: "${article.title}" (${article.url}). What are the key implications, factual background, and future outlook?`);
  };

  const downloadSession = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let content = `# JARVIS RESEARCH SESSION\nDate: ${new Date().toLocaleString()}\n\n`;

    if (currentProjection) {
      content += `## LATEST VISUALIZATION: ${currentProjection.title}\n`;
      content += `Type: ${currentProjection.type}\n`;
      content += `Description: ${currentProjection.description || 'N/A'}\n`;
      content += `Data:\n\`\`\`json\n${JSON.stringify(currentProjection.data, null, 2)}\n\`\`\`\n\n`;
    }

    content += `## TRANSCRIPT\n\n`;
    if (messages.length === 0) {
      content += `(No conversation recorded)\n`;
    } else {
      messages.forEach(msg => {
        const role = msg.role === 'user' ? 'OPERATOR' : 'JARVIS';
        content += `**${role}**: ${msg.text}\n`;
        if (msg.sources && msg.sources.length > 0) {
          content += `> Sources: ${msg.sources.map(s => `[${s.title}](${s.url})`).join(', ')}\n`;
        }
        content += `\n`;
      });
    }

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jarvis_session_${timestamp}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    return () => {
      stopMedia();
    };
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <ProjectionDisplay projection={currentProjection} />;
      case 'study':
        return <StudySpace />;
      case 'news':
        return <NewsSpace 
                 currentProjection={currentProjection} 
                 onRequestNews={fetchNews} 
                 onAnalyze={analyzeArticle}
                 isLive={isLive}
               />;
      case 'knowledge':
        return <KnowledgeSpace onInteract={sendTextMessage} isLive={isLive} />;
      default:
        return <ProjectionDisplay projection={currentProjection} />;
    }
  };

  return (
    <div className="h-[100dvh] bg-[#050505] text-slate-200 flex flex-col font-sans overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#050505] to-[#050505]">
      
      {/* Hidden Elements for Video Processing */}
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* --- HUD Header --- */}
      <header className="h-14 lg:h-16 border-b border-slate-800 flex items-center justify-between px-4 lg:px-6 bg-[#050505]/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-sky-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(2,132,199,0.5)]">
            <Cpu size={20} />
          </div>
          <h1 className="text-lg lg:text-xl font-tech tracking-wider text-white">JARVIS <span className="text-sky-500 text-xs lg:text-sm">UNIVERSAL ENGINE</span></h1>
        </div>
        
        {/* DESKTOP VIEW TOGGLE */}
        <div className="hidden lg:flex bg-slate-900 rounded-lg p-1 gap-1 border border-slate-800">
             <button
               onClick={() => setCurrentView('dashboard')}
               className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-tech tracking-wider transition-all ${
                 currentView === 'dashboard' 
                 ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-[0_0_10px_rgba(14,165,233,0.1)]' 
                 : 'text-slate-500 hover:text-slate-300'
               }`}
             >
                <LayoutDashboard size={14} /> DASHBOARD
             </button>
             <button
               onClick={() => setCurrentView('news')}
               className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-tech tracking-wider transition-all ${
                 currentView === 'news' 
                 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                 : 'text-slate-500 hover:text-slate-300'
               }`}
             >
                <Newspaper size={14} /> NEWS
             </button>
             <button
               onClick={() => setCurrentView('knowledge')}
               className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-tech tracking-wider transition-all ${
                 currentView === 'knowledge' 
                 ? 'bg-pink-500/10 text-pink-400 border border-pink-500/30 shadow-[0_0_10px_rgba(236,72,153,0.1)]' 
                 : 'text-slate-500 hover:text-slate-300'
               }`}
             >
                <GraduationCap size={14} /> ACADEMIA
             </button>
             <button
               onClick={() => setCurrentView('study')}
               className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-tech tracking-wider transition-all ${
                 currentView === 'study' 
                 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]' 
                 : 'text-slate-500 hover:text-slate-300'
               }`}
             >
                <BookOpen size={14} /> STUDY
             </button>
        </div>
        
        <div className="flex items-center gap-2 lg:gap-4">
          <div className="hidden md:flex items-center gap-2 text-[10px] text-slate-500 font-mono border border-slate-800 rounded-full px-3 py-1 bg-slate-900">
             <Globe size={12} className="text-sky-500" />
             <span>CONNECTED: GOOGLE_SEARCH, ACADEMIA</span>
          </div>

          <button 
             onClick={downloadSession}
             className="text-slate-500 hover:text-sky-400 hover:bg-slate-800 p-2 rounded-lg transition-colors hidden sm:block"
             title="Download Session Report"
          >
             <Download size={20} />
          </button>
          
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
             <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]' : status === 'processing' ? 'bg-yellow-500 animate-ping' : status === 'error' ? 'bg-rose-600' : 'bg-slate-500'}`} />
             <span className="text-[10px] lg:text-xs font-mono uppercase text-slate-400 hidden sm:inline">{status}</span>
          </div>
        </div>
      </header>

      {/* --- Main Workspace --- */}
      <main className="flex-1 overflow-hidden min-h-0 relative">
        
        {/* DESKTOP DASHBOARD GRID */}
        <div className="hidden lg:grid grid-cols-12 gap-6 h-full p-6">
          <div className="col-span-8 h-full min-h-0 relative">
             {renderContent()}
          </div>

          <div className="col-span-4 flex flex-col gap-4 h-full min-h-0">
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 backdrop-blur-sm shrink-0">
                <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                    <div className="text-[10px] text-sky-500 font-tech mb-1 flex items-center gap-1"><Mic size={10} /> AUDIO_INPUT_WAVEFORM</div>
                    <AudioVisualizer isActive={isLive && isMicOn} analyser={inputAnalyserRef.current} color="#38bdf8" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] text-rose-500 font-tech mb-1 flex items-center gap-1"><Volume2 size={10} /> AI_CORE_OUTPUT</div>
                    <AudioVisualizer isActive={isLive} analyser={outputAnalyserRef.current} color="#fb7185" />
                  </div>
                </div>
                
                {isVideoOn && (
                  <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-slate-700 shadow-inner">
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                      <span className="text-[8px] font-mono bg-black/50 px-1 rounded text-red-400">REC</span>
                    </div>
                    <VideoPreview stream={videoStreamRef.current} />
                    <div className="absolute inset-0 border border-white/10 rounded-lg pointer-events-none"></div>
                    <div className="absolute bottom-2 right-2 text-[8px] font-mono text-slate-500">CAM_01</div>
                  </div>
                )}
            </div>

            <div className="flex-1 min-h-0 flex flex-col gap-4 relative">
                <div className="flex-1 min-h-0">
                  <ChatPanel 
                    messages={messages} 
                    onSendMessage={sendTextMessage}
                    onClearChat={clearChat}
                    isLive={isLive}
                  />
                </div>
                
                <div className="h-16 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between px-6 shrink-0 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center gap-2">
                      <button
                        onClick={toggleMic}
                        disabled={!isLive}
                        className={`p-3 rounded-full transition-all duration-300 ${
                          !isLive ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-500' :
                          isMicOn ? 'bg-sky-500/10 text-sky-400 border border-sky-500/50 shadow-[0_0_10px_rgba(56,189,248,0.2)]' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
                      </button>
                      
                      <button
                        onClick={toggleCamera}
                        className={`p-3 rounded-full transition-all duration-300 ${
                          isVideoOn ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {isVideoOn ? <Camera size={20} /> : <CameraOff size={20} />}
                      </button>
                  </div>

                  <button
                    onClick={isLive ? disconnect : connectToLiveAPI}
                    className={`flex items-center gap-3 px-6 py-2 rounded-lg font-tech tracking-wider transition-all duration-300 ${
                      isLive 
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500/30' 
                        : 'bg-sky-600 text-white hover:bg-sky-500 shadow-[0_0_20px_rgba(2,132,199,0.4)]'
                    }`}
                  >
                    <Power size={18} />
                    {isLive ? 'TERMINATE' : 'INITIALIZE'}
                  </button>
                </div>
            </div>
          </div>
        </div>

        {/* MOBILE LAYOUT (Stacked) */}
        <div className="lg:hidden h-full flex flex-col relative">
            <div className="flex-1 overflow-hidden relative">
              {activeTab === 'visual' ? (
                <div className="w-full h-full p-2">
                  <ProjectionDisplay projection={currentProjection} />
                </div>
              ) : activeTab === 'study' ? (
                <div className="w-full h-full p-2">
                  <StudySpace />
                </div>
              ) : activeTab === 'news' ? (
                <div className="w-full h-full p-2">
                   <NewsSpace 
                     currentProjection={currentProjection} 
                     onRequestNews={fetchNews} 
                     onAnalyze={analyzeArticle}
                     isLive={isLive}
                   />
                </div>
              ) : activeTab === 'knowledge' ? (
                 <div className="w-full h-full p-2">
                   <KnowledgeSpace onInteract={sendTextMessage} isLive={isLive} />
                 </div>
              ) : (
                <div className="w-full h-full p-2 flex flex-col gap-2">
                    <div className="h-16 bg-slate-900/50 rounded-lg flex items-center gap-2 p-2 border border-slate-800">
                      <div className="flex-1 h-full"><AudioVisualizer isActive={isLive && isMicOn} analyser={inputAnalyserRef.current} color="#38bdf8" /></div>
                      <div className="flex-1 h-full"><AudioVisualizer isActive={isLive} analyser={outputAnalyserRef.current} color="#fb7185" /></div>
                    </div>
                    
                    {isVideoOn && (
                      <div className="h-32 bg-black rounded-lg overflow-hidden border border-slate-700 relative shrink-0">
                        <VideoPreview stream={videoStreamRef.current} />
                        <div className="absolute top-1 left-2 text-[8px] text-red-500 animate-pulse font-mono">REC</div>
                      </div>
                    )}

                    <div className="flex-1 min-h-0">
                      <ChatPanel 
                        messages={messages} 
                        onSendMessage={sendTextMessage}
                        onClearChat={clearChat}
                        isLive={isLive}
                      />
                    </div>
                </div>
              )}
            </div>

           {/* Bottom Toolbar */}
           <div className="h-16 bg-slate-950 border-t border-slate-800 flex items-center justify-around px-2 shrink-0 z-50 safe-area-bottom">
              <button 
                onClick={() => setActiveTab('visual')}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg ${activeTab === 'visual' ? 'text-sky-400' : 'text-slate-500'}`}
              >
                <Monitor size={18} />
                <span className="text-[8px] font-tech tracking-wider">VISUALS</span>
              </button>

              <button 
                onClick={() => setActiveTab('news')}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg ${activeTab === 'news' ? 'text-emerald-400' : 'text-slate-500'}`}
              >
                <Newspaper size={18} />
                <span className="text-[8px] font-tech tracking-wider">NEWS</span>
              </button>
              
              <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-full border border-slate-800 -translate-y-4 shadow-lg shadow-black/50">
                 <button 
                   onClick={toggleMic}
                   className={`p-3 rounded-full ${isMicOn ? 'bg-sky-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                 >
                   {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
                 </button>
                 <button 
                   onClick={isLive ? disconnect : connectToLiveAPI}
                   className={`p-3 rounded-full ${isLive ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-700 text-slate-400'}`}
                 >
                   <Power size={20} />
                 </button>
              </div>

               <button 
                onClick={() => setActiveTab('knowledge')}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg ${activeTab === 'knowledge' ? 'text-pink-400' : 'text-slate-500'}`}
              >
                <GraduationCap size={18} />
                <span className="text-[8px] font-tech tracking-wider">ACADEMIA</span>
              </button>

              <button 
                onClick={() => setActiveTab('chat')}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg ${activeTab === 'chat' ? 'text-sky-400' : 'text-slate-500'}`}
              >
                <MessageSquare size={18} />
                <span className="text-[8px] font-tech tracking-wider">COMMS</span>
              </button>
           </div>
        </div>

      </main>
    </div>
  );
};

export default App;
