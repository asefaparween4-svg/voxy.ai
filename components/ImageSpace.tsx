
import React, { useState } from 'react';
import { Image, Download, Sparkles, Loader2, Aperture, Settings2, ImageIcon, Layers } from 'lucide-react';

interface ImageSpaceProps {
  onGenerate: (prompt: string, aspectRatio: string) => Promise<void>;
  generatedImage: string | null;
  isGenerating: boolean;
}

const ASPECT_RATIOS = [
  { id: '1:1', label: 'SQUARE (1:1)', icon: SquareIcon },
  { id: '16:9', label: 'LANDSCAPE (16:9)', icon: LandscapeIcon },
  { id: '9:16', label: 'PORTRAIT (9:16)', icon: PortraitIcon },
  { id: '4:3', label: 'CLASSIC (4:3)', icon: LandscapeIcon },
  { id: '3:4', label: 'VERTICAL (3:4)', icon: PortraitIcon },
];

function SquareIcon({ className }: { className?: string }) {
  return <div className={`border-2 border-current rounded-sm w-4 h-4 ${className}`} />;
}
function LandscapeIcon({ className }: { className?: string }) {
  return <div className={`border-2 border-current rounded-sm w-5 h-3 ${className}`} />;
}
function PortraitIcon({ className }: { className?: string }) {
  return <div className={`border-2 border-current rounded-sm w-3 h-5 ${className}`} />;
}

const ImageSpace: React.FC<ImageSpaceProps> = ({ onGenerate, generatedImage, isGenerating }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isGenerating) {
      await onGenerate(prompt, aspectRatio);
    }
  };

  return (
    <div className="flex h-full bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden backdrop-blur-md relative shadow-lg flex-col lg:flex-row">
       {/* Background Grid */}
       <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
       <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-transparent to-sky-900/10 pointer-events-none"></div>

       {/* Sidebar Controls */}
       <div className="w-full lg:w-80 bg-slate-900/90 border-b lg:border-b-0 lg:border-r border-slate-800 p-6 flex flex-col z-10 shrink-0">
          <div className="flex items-center gap-2 text-purple-400 font-tech tracking-wider text-lg mb-6">
             <Aperture size={24} className="animate-[spin_10s_linear_infinite]" /> 
             IMAGEN_CORE
          </div>

          <form onSubmit={handleGenerate} className="flex flex-col gap-6 flex-1">
             <div className="space-y-2">
                <label className="text-xs font-mono text-slate-500 uppercase tracking-widest">Prompt Protocol</label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the visual output..."
                  className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/50 resize-none font-sans leading-relaxed"
                />
             </div>

             <div className="space-y-2">
                <label className="text-xs font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2">
                   <Settings2 size={12} /> Aspect Ratio
                </label>
                <div className="grid grid-cols-2 gap-2">
                   {ASPECT_RATIOS.map(ratio => (
                      <button
                        key={ratio.id}
                        type="button"
                        onClick={() => setAspectRatio(ratio.id)}
                        className={`flex items-center gap-2 p-2 rounded border text-xs font-mono transition-all ${
                           aspectRatio === ratio.id 
                           ? 'bg-purple-500/20 border-purple-500 text-purple-300' 
                           : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:bg-slate-800'
                        }`}
                      >
                         <ratio.icon /> {ratio.id}
                      </button>
                   ))}
                </div>
             </div>

             <div className="mt-auto pt-6 border-t border-slate-800">
                <button 
                  type="submit"
                  disabled={!prompt.trim() || isGenerating}
                  className={`w-full py-3 rounded-lg font-tech tracking-wider text-sm flex items-center justify-center gap-2 transition-all ${
                     isGenerating 
                     ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                     : 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                  }`}
                >
                   {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                   {isGenerating ? 'RENDERING...' : 'GENERATE VISUAL'}
                </button>
             </div>
          </form>
       </div>

       {/* Main Viewport */}
       <div className="flex-1 relative flex items-center justify-center bg-black/40 p-4 lg:p-8 overflow-hidden">
          {generatedImage ? (
             <div className="relative group max-w-full max-h-full">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-sky-500 rounded-lg opacity-20 group-hover:opacity-40 blur transition-opacity"></div>
                <div className="relative border border-slate-700 bg-slate-900 rounded-lg overflow-hidden shadow-2xl">
                   <img 
                     src={generatedImage} 
                     alt="Generated Output" 
                     className="max-h-[70vh] w-auto object-contain"
                   />
                   
                   {/* Overlay Actions */}
                   <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a 
                        href={generatedImage} 
                        download={`imagen-${Date.now()}.png`}
                        className="p-2 bg-slate-900/80 backdrop-blur text-slate-300 hover:text-white rounded-lg border border-slate-700 hover:border-purple-500 transition-colors flex items-center gap-2"
                      >
                         <Download size={16} /> <span className="text-xs font-mono">SAVE_OUTPUT</span>
                      </a>
                   </div>
                </div>
                
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="text-[10px] font-mono text-purple-400 bg-slate-900/80 px-2 py-1 rounded border border-purple-500/30">
                       MODEL: GEMINI-NANO-BANANA-PRO [2K]
                    </span>
                </div>
             </div>
          ) : (
             <div className="text-center text-slate-600 flex flex-col items-center">
                <div className="w-24 h-24 mb-6 rounded-full border border-dashed border-slate-700 flex items-center justify-center relative">
                   <div className="absolute inset-0 bg-purple-500/5 rounded-full animate-pulse"></div>
                   <ImageIcon size={32} className="opacity-50" />
                </div>
                <h3 className="font-tech text-xl text-slate-500 tracking-widest mb-2">VISUAL SYNTHESIS READY</h3>
                <p className="text-sm font-mono text-slate-600 max-w-md">
                   Enter parameters to initialize high-fidelity image generation sequence.
                </p>
             </div>
          )}

          {/* Loading Overlay */}
          {isGenerating && (
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                <div className="relative">
                   <div className="w-16 h-16 border-4 border-slate-800 border-t-purple-500 rounded-full animate-spin"></div>
                   <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                   </div>
                </div>
                <div className="mt-4 text-purple-400 font-tech tracking-widest text-sm animate-pulse">
                   SYNTHESIZING PIXELS...
                </div>
             </div>
          )}
       </div>
    </div>
  );
};

export default ImageSpace;
