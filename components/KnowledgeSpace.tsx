
import React, { useState } from 'react';
import { GraduationCap, Presentation, Mic2, Atom, BookOpen, Send, Sparkles, FileText, Layers, Lightbulb, Calculator, Sigma } from 'lucide-react';

interface KnowledgeSpaceProps {
  onInteract: (prompt: string) => void;
  isLive: boolean;
}

const MODULES = [
  { id: 'ppt', label: 'PPT ARCHITECT', icon: Presentation, desc: 'Generate outlines & slide content' },
  { id: 'math', label: 'MATH ENGINE', icon: Calculator, desc: 'Solve Calculus, Algebra & Physics' },
  { id: 'science', label: 'SCIENCE & ISOTOPES', icon: Atom, desc: 'Detailed element & physics analysis' },
  { id: 'speech', label: 'SPEECH & ARTICLES', icon: FileText, desc: 'Write speeches, essays & reports' },
  { id: 'tutor', label: 'EXPERT TUTOR', icon: Lightbulb, desc: 'Clear doubts & study concepts' },
];

const KnowledgeSpace: React.FC<KnowledgeSpaceProps> = ({ onInteract, isLive }) => {
  const [activeModule, setActiveModule] = useState('ppt');
  
  // Form States
  const [pptTopic, setPptTopic] = useState('');
  const [pptSlides, setPptSlides] = useState(10);
  const [speechTopic, setSpeechTopic] = useState('');
  const [speechType, setSpeechType] = useState('Informative');
  const [scienceQuery, setScienceQuery] = useState('');
  const [tutorQuery, setTutorQuery] = useState('');
  const [mathQuery, setMathQuery] = useState('');

  const handlePptGen = () => {
    if (!isLive) return;
    onInteract(`Generate a comprehensive ${pptSlides}-slide Presentation Outline on "${pptTopic}". 
    Format it as a 'list' projection where each item is a Slide Title followed by bullet points. 
    Include speaker notes for the first slide.`);
  };

  const handleSpeechGen = () => {
    if (!isLive) return;
    onInteract(`Write a high-quality ${speechType} speech/article about "${speechTopic}". 
    Include a strong opening hook, detailed body paragraphs, and a compelling conclusion. 
    Format the output as a 'text_summary' projection.`);
  };

  const handleScienceGen = () => {
    if (!isLive) return;
    onInteract(`Provide a detailed scientific analysis of "${scienceQuery}". 
    If it is an element, list its Atomic Number, Mass, Electron Configuration, and ALL known Isotopes with their stability. 
    If it is a concept, explain the underlying physics/chemistry. 
    Use the 'technical_svg' projection to show a diagram if applicable, otherwise use 'stat_card' for data.`);
  };

  const handleMathSolve = () => {
    if (!isLive) return;
    onInteract(`Solve this math problem step-by-step: "${mathQuery}".
    Show all working, explain the logic/theorem used, and perform the final calculation. 
    Use clear text formatting for equations.`);
  };

  const handleTutorAsk = () => {
    if (!isLive) return;
    onInteract(`Act as an Expert Professor. I have a doubt: "${tutorQuery}". 
    Explain this concept simply, then provide an analogy, and finally ask me a question to check my understanding. 
    Do NOT give a long lecture, be interactive.`);
  };

  return (
    <div className="flex h-full bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden backdrop-blur-md relative shadow-lg flex-col md:flex-row">
       {/* Background Grid */}
       <div className="absolute inset-0 bg-[linear-gradient(rgba(244,114,182,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(244,114,182,0.03)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none"></div>
       <div className="absolute inset-0 bg-gradient-to-tr from-pink-900/10 via-transparent to-indigo-900/10 pointer-events-none"></div>

       {/* Sidebar Navigation */}
       <div className="w-full md:w-64 bg-slate-900/90 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col z-10 shrink-0">
          <div className="p-6 border-b border-slate-800">
             <div className="flex items-center gap-2 text-pink-400 font-tech tracking-wider text-lg">
                <GraduationCap size={24} /> ACADEMIA
             </div>
             <div className="text-[10px] text-slate-500 font-mono mt-1">
                KNOWLEDGE ENGINE V4.0
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
             {MODULES.map(mod => (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 group ${
                    activeModule === mod.id 
                    ? 'bg-pink-500/10 border-pink-500/50 text-pink-300 shadow-[0_0_10px_rgba(236,72,153,0.2)]' 
                    : 'border-transparent text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                  }`}
                >
                   <div className={`p-2 rounded-md ${activeModule === mod.id ? 'bg-pink-500 text-white' : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'}`}>
                      <mod.icon size={18} />
                   </div>
                   <div>
                      <div className="text-xs font-bold font-tech tracking-wide">{mod.label}</div>
                      <div className="text-[9px] font-mono opacity-70 hidden lg:block">{mod.desc}</div>
                   </div>
                </button>
             ))}
          </div>
       </div>

       {/* Main Content Area */}
       <div className="flex-1 p-6 lg:p-10 relative overflow-y-auto">
          
          {!isLive && (
             <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-slate-500">
                <BookOpen size={48} className="mb-4 opacity-50" />
                <p className="font-tech text-sm tracking-widest">ESTABLISH CONNECTION TO ACCESS KNOWLEDGE BASE</p>
             </div>
          )}

          {activeModule === 'ppt' && (
             <div className="max-w-2xl mx-auto space-y-8 animate-[fadeIn_0.5s_ease-out]">
                <div className="text-center space-y-2">
                   <h2 className="text-2xl font-bold text-white font-tech tracking-widest flex items-center justify-center gap-3">
                      <Presentation className="text-pink-500" /> PPT ARCHITECT
                   </h2>
                   <p className="text-slate-400 text-sm font-mono">Generates structured slide decks, outlines, and speaker notes.</p>
                </div>

                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 space-y-6">
                   <div className="space-y-2">
                      <label className="text-xs text-pink-400 font-mono uppercase tracking-wider">Presentation Topic</label>
                      <input 
                        type="text" 
                        value={pptTopic}
                        onChange={(e) => setPptTopic(e.target.value)}
                        placeholder="e.g., The Future of Artificial Intelligence (English)" 
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 focus:border-pink-500/50 focus:outline-none transition-colors"
                      />
                   </div>
                   
                   <div className="space-y-2">
                      <label className="text-xs text-pink-400 font-mono uppercase tracking-wider">Number of Slides</label>
                      <div className="flex items-center gap-4">
                         <input 
                           type="range" 
                           min="5" max="20" 
                           value={pptSlides} 
                           onChange={(e) => setPptSlides(parseInt(e.target.value))}
                           className="flex-1 accent-pink-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                         />
                         <span className="text-xl font-bold font-mono text-white w-12 text-center">{pptSlides}</span>
                      </div>
                   </div>

                   <button 
                     onClick={handlePptGen}
                     disabled={!pptTopic}
                     className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg font-bold text-white tracking-widest hover:shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                   >
                      <Layers size={18} /> GENERATE OUTLINE
                   </button>
                </div>
             </div>
          )}

          {activeModule === 'math' && (
             <div className="max-w-2xl mx-auto space-y-8 animate-[fadeIn_0.5s_ease-out]">
                <div className="text-center space-y-2">
                   <h2 className="text-2xl font-bold text-white font-tech tracking-widest flex items-center justify-center gap-3">
                      <Sigma className="text-pink-500" /> COMPUTATIONAL ENGINE
                   </h2>
                   <p className="text-slate-400 text-sm font-mono">Solves complex Calculus, Algebra, Statistics & Physics problems.</p>
                </div>

                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 space-y-6">
                   <div className="space-y-2">
                      <label className="text-xs text-pink-400 font-mono uppercase tracking-wider">Math Problem / Equation</label>
                      <textarea 
                        value={mathQuery}
                        onChange={(e) => setMathQuery(e.target.value)}
                        placeholder="e.g., Solve integral of x^2 * sin(x) dx..." 
                        className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 focus:border-pink-500/50 focus:outline-none transition-colors resize-none leading-relaxed"
                      />
                   </div>
                   
                   <button 
                     onClick={handleMathSolve}
                     disabled={!mathQuery}
                     className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg font-bold text-white tracking-widest hover:shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                   >
                      <Calculator size={18} /> SOLVE & EXPLAIN
                   </button>
                </div>
             </div>
          )}

          {activeModule === 'speech' && (
             <div className="max-w-2xl mx-auto space-y-8 animate-[fadeIn_0.5s_ease-out]">
                <div className="text-center space-y-2">
                   <h2 className="text-2xl font-bold text-white font-tech tracking-widest flex items-center justify-center gap-3">
                      <Mic2 className="text-pink-500" /> SPEECH WRITER
                   </h2>
                   <p className="text-slate-400 text-sm font-mono">Drafts articles, essays, and public speeches with tone control.</p>
                </div>

                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 space-y-6">
                   <div className="space-y-2">
                      <label className="text-xs text-pink-400 font-mono uppercase tracking-wider">Topic / Title</label>
                      <input 
                        type="text" 
                        value={speechTopic}
                        onChange={(e) => setSpeechTopic(e.target.value)}
                        placeholder="e.g., Climate Change Solutions (English)" 
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 focus:border-pink-500/50 focus:outline-none transition-colors"
                      />
                   </div>
                   
                   <div className="space-y-2">
                      <label className="text-xs text-pink-400 font-mono uppercase tracking-wider">Style & Tone</label>
                      <div className="grid grid-cols-3 gap-2">
                         {['Informative', 'Persuasive', 'Motivational', 'Academic', 'Casual', 'Debate'].map(type => (
                            <button
                              key={type}
                              onClick={() => setSpeechType(type)}
                              className={`py-2 text-xs font-mono rounded border transition-all ${
                                speechType === type 
                                ? 'bg-pink-500/20 border-pink-500 text-pink-300' 
                                : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'
                              }`}
                            >
                               {type}
                            </button>
                         ))}
                      </div>
                   </div>

                   <button 
                     onClick={handleSpeechGen}
                     disabled={!speechTopic}
                     className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg font-bold text-white tracking-widest hover:shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                   >
                      <FileText size={18} /> DRAFT CONTENT
                   </button>
                </div>
             </div>
          )}

          {activeModule === 'science' && (
             <div className="max-w-2xl mx-auto space-y-8 animate-[fadeIn_0.5s_ease-out]">
                <div className="text-center space-y-2">
                   <h2 className="text-2xl font-bold text-white font-tech tracking-widest flex items-center justify-center gap-3">
                      <Atom className="text-pink-500" /> SCIENCE DATABASE
                   </h2>
                   <p className="text-slate-400 text-sm font-mono">Deep dive into elements, isotopes, and physical phenomena.</p>
                </div>

                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 space-y-6">
                   <div className="space-y-2">
                      <label className="text-xs text-pink-400 font-mono uppercase tracking-wider">Element or Concept</label>
                      <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                           type="text" 
                           value={scienceQuery}
                           onChange={(e) => setScienceQuery(e.target.value)}
                           placeholder="e.g., Uranium-235... (English Only)" 
                           className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 pl-10 text-slate-200 focus:border-pink-500/50 focus:outline-none transition-colors"
                        />
                      </div>
                   </div>
                   
                   <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                      <h3 className="text-xs font-bold text-slate-400 mb-2">AVAILABLE DATASETS:</h3>
                      <div className="flex flex-wrap gap-2">
                         {['Atomic Structure', 'Isotope Stability', 'Decay Chains', 'Thermodynamics', 'Chemical Bonds'].map(tag => (
                            <span key={tag} className="px-2 py-1 bg-slate-800 rounded text-[10px] text-slate-400 font-mono">{tag}</span>
                         ))}
                      </div>
                   </div>

                   <button 
                     onClick={handleScienceGen}
                     disabled={!scienceQuery}
                     className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg font-bold text-white tracking-widest hover:shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                   >
                      <Sparkles size={18} /> ANALYZE DATA
                   </button>
                </div>
             </div>
          )}

          {activeModule === 'tutor' && (
             <div className="max-w-2xl mx-auto space-y-8 animate-[fadeIn_0.5s_ease-out]">
                <div className="text-center space-y-2">
                   <h2 className="text-2xl font-bold text-white font-tech tracking-widest flex items-center justify-center gap-3">
                      <Lightbulb className="text-pink-500" /> EXPERT TUTOR
                   </h2>
                   <p className="text-slate-400 text-sm font-mono">Interactive teaching, doubt clearing, and Socratic learning.</p>
                </div>

                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 space-y-6">
                   <div className="space-y-4">
                      <label className="text-xs text-pink-400 font-mono uppercase tracking-wider">What do you want to learn?</label>
                      <textarea 
                        value={tutorQuery}
                        onChange={(e) => setTutorQuery(e.target.value)}
                        placeholder="e.g., Explain the Theory of Relativity... (English Only)" 
                        className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 focus:border-pink-500/50 focus:outline-none transition-colors resize-none leading-relaxed"
                      />
                   </div>

                   <button 
                     onClick={handleTutorAsk}
                     disabled={!tutorQuery}
                     className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg font-bold text-white tracking-widest hover:shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                   >
                      <Send size={18} /> ASK EXPERT
                   </button>
                   
                   <div className="text-center">
                      <p className="text-[10px] text-slate-500 font-mono">Response will appear in main communication panel.</p>
                   </div>
                </div>
             </div>
          )}

       </div>
    </div>
  );
};

function SearchIcon({ className, size }: { className?: string, size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  );
}

export default KnowledgeSpace;
