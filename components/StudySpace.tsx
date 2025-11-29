
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, FileText, Save, Clock, Search, BookOpen, PenLine } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  lastModified: number;
}

const StudySpace: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Initial Load
  useEffect(() => {
    const saved = localStorage.getItem('jarvis_study_notes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNotes(parsed);
        if (parsed.length > 0) {
           setActiveNoteId(parsed[0].id);
        }
      } catch (e) {
        console.error('Failed to load notes', e);
      }
    } else {
      // Create a welcome note if empty
      const welcome: Note = {
        id: 'welcome',
        title: 'Project Alpha Research',
        content: '# Research Objectives\n\n1. Analyze magnetic confinement stability.\n2. Optimize plasma injector flow rates.\n\nData collected so far indicates a 15% increase in efficiency when the torus rotation speed matches the harmonic resonance of the core.',
        lastModified: Date.now()
      };
      setNotes([welcome]);
      setActiveNoteId(welcome.id);
    }
  }, []);

  // Persistence
  useEffect(() => {
    localStorage.setItem('jarvis_study_notes', JSON.stringify(notes));
  }, [notes]);

  const activeNote = notes.find(n => n.id === activeNoteId);

  const handleCreate = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'Untitled Note',
      content: '',
      lastModified: Date.now()
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newNotes = notes.filter(n => n.id !== id);
    setNotes(newNotes);
    if (activeNoteId === id) {
      setActiveNoteId(newNotes.length > 0 ? newNotes[0].id : null);
    }
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(n => 
      n.id === id ? { ...n, ...updates, lastModified: Date.now() } : n
    ));
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-full bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden backdrop-blur-md relative shadow-lg">
       {/* Background Grid */}
       <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>

       {/* Sidebar: File List */}
       <div className="w-64 bg-slate-950/80 border-r border-slate-800 flex flex-col shrink-0 z-10">
          <div className="p-4 border-b border-slate-800">
             <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2 text-sky-500 font-tech tracking-wider text-sm">
                 <BookOpen size={16} /> DATA_LOGS
               </div>
               <button 
                 onClick={handleCreate}
                 className="p-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors shadow-[0_0_10px_rgba(2,132,199,0.4)]"
                 title="New Note"
               >
                 <Plus size={16} />
               </button>
             </div>
             <div className="relative">
               <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
               <input 
                 type="text" 
                 placeholder="Search logs..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full bg-slate-900 border border-slate-700 rounded-full py-1.5 pl-9 pr-3 text-xs text-slate-300 focus:outline-none focus:border-sky-500/50 transition-colors"
               />
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
             {filteredNotes.map(note => (
               <div 
                 key={note.id}
                 onClick={() => setActiveNoteId(note.id)}
                 className={`group relative p-3 rounded-lg cursor-pointer border transition-all ${
                   activeNoteId === note.id 
                     ? 'bg-sky-500/10 border-sky-500/30 text-sky-100' 
                     : 'bg-transparent border-transparent hover:bg-slate-800/50 hover:border-slate-700 text-slate-400'
                 }`}
               >
                  <div className="flex items-start justify-between">
                     <div className="flex items-center gap-2 overflow-hidden">
                        <FileText size={14} className={activeNoteId === note.id ? 'text-sky-400' : 'text-slate-600'} />
                        <span className="text-sm font-medium truncate">{note.title || 'Untitled'}</span>
                     </div>
                     <button 
                       onClick={(e) => handleDelete(note.id, e)}
                       className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-all p-1"
                     >
                       <Trash2 size={12} />
                     </button>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[10px] opacity-60 font-mono">
                     <Clock size={10} />
                     {new Date(note.lastModified).toLocaleDateString()} {new Date(note.lastModified).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
               </div>
             ))}
             
             {filteredNotes.length === 0 && (
               <div className="p-4 text-center text-slate-600 text-xs font-mono">
                 NO DATA FOUND
               </div>
             )}
          </div>
       </div>

       {/* Main Editor Area */}
       <div className="flex-1 flex flex-col min-w-0 bg-slate-900/30 relative z-0">
          {activeNote ? (
             <>
               {/* Note Header */}
               <div className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50">
                  <input 
                    type="text" 
                    value={activeNote.title}
                    onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
                    className="bg-transparent text-lg font-bold text-slate-200 placeholder-slate-600 focus:outline-none w-full"
                    placeholder="Enter File Name..."
                  />
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono shrink-0">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                     AUTO-SAVED
                  </div>
               </div>

               {/* Text Editor */}
               <textarea 
                 value={activeNote.content}
                 onChange={(e) => updateNote(activeNote.id, { content: e.target.value })}
                 className="flex-1 w-full bg-transparent p-6 text-sm lg:text-base text-slate-300 font-mono leading-relaxed resize-none focus:outline-none selection:bg-sky-500/30"
                 placeholder="Begin data entry..."
                 spellCheck={false}
               />
               
               {/* Status Bar */}
               <div className="h-8 border-t border-slate-800 bg-slate-950 flex items-center px-4 gap-4 text-[10px] text-slate-500 font-mono">
                  <span>CHARS: {activeNote.content.length}</span>
                  <span>LINES: {activeNote.content.split('\n').length}</span>
                  <div className="flex-1"></div>
                  <span className="text-sky-500/50">SECURE_STORAGE_ENCRYPTED</span>
               </div>
             </>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                <PenLine size={48} className="mb-4 opacity-20" />
                <p className="font-tech tracking-widest text-sm">SELECT A FILE TO EDIT</p>
             </div>
          )}
       </div>
    </div>
  );
};

export default StudySpace;
