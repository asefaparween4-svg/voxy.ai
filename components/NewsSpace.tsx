
import React, { useState } from 'react';
import { Newspaper, Globe, Search, RefreshCw, ArrowRight, Radio, ExternalLink, Zap, Microscope, Briefcase, Cpu, Image as ImageIcon } from 'lucide-react';
import { ProjectionData, ProjectionType } from '../types';

interface NewsArticle {
  title: string;
  source: string;
  url: string;
  summary: string;
  time: string;
  imageUrl?: string;
}

interface NewsSpaceProps {
  currentProjection: ProjectionData | null;
  onRequestNews: (query: string) => void;
  onAnalyze: (article: NewsArticle) => void;
  isLive: boolean;
}

const CATEGORIES = [
  { id: 'global', label: 'GLOBAL HEADLINES', icon: Globe, query: 'Use Google Search to find top global news headlines from major sources like Reuters, AP, BBC, Al Jazeera, New York Times.' },
  { id: 'local', label: 'LOCAL INTEL', icon: Radio, query: 'Use Google Search to find top local news headlines near the user from reputable local news outlets.' },
  { id: 'tech', label: 'TECHNOLOGY', icon: Cpu, query: 'Use Google Search to find the latest technology and AI news from major tech publications like TechCrunch, Wired, The Verge, Ars Technica.' },
  { id: 'science', label: 'SCIENCE', icon: Microscope, query: 'Use Google Search to find the latest scientific discoveries and research news from top journals and science news outlets.' },
  { id: 'business', label: 'MARKETS', icon: Briefcase, query: 'Use Google Search to find the latest global business and stock market news from Bloomberg, FT, WSJ, CNBC.' },
];

const NewsSpace: React.FC<NewsSpaceProps> = ({ currentProjection, onRequestNews, onAnalyze, isLive }) => {
  const [activeCategory, setActiveCategory] = useState('global');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract articles if valid projection
  const articles: NewsArticle[] = (currentProjection?.type === ProjectionType.NEWS_FEED && Array.isArray(currentProjection.data)) 
    ? currentProjection.data 
    : [];

  const handleCategoryClick = (catId: string, query: string) => {
    setActiveCategory(catId);
    if (isLive) {
      onRequestNews(query);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && isLive) {
      onRequestNews(`Use Google Search to find news about: ${searchQuery} from reputable sources.`);
      setActiveCategory('custom');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden backdrop-blur-md relative shadow-lg">
       {/* Background Grid */}
       <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
       <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/10 via-transparent to-sky-900/10 pointer-events-none"></div>

       {/* Header */}
       <div className="p-4 border-b border-slate-800 bg-slate-900/90 z-20 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div>
             <div className="flex items-center gap-2 text-emerald-500 font-tech tracking-wider text-lg mb-1">
                <Newspaper size={20} /> GLOBAL_INTEL_FEED
             </div>
             <div className="text-[10px] text-slate-500 font-mono">
                REAL-TIME AGGREGATION PROTOCOL // {isLive ? 'ONLINE' : 'OFFLINE'}
             </div>
          </div>

          <form onSubmit={handleSearch} className="relative w-full md:w-64">
             <input 
               type="text" 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               placeholder="Search specific topics..."
               className="w-full bg-slate-800 border border-slate-700 rounded-full py-1.5 pl-4 pr-10 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
             />
             <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-emerald-400">
                <Search size={14} />
             </button>
          </form>
       </div>

       {/* Categories Bar */}
       <div className="flex items-center gap-2 p-2 border-b border-slate-800 bg-slate-900/50 overflow-x-auto scrollbar-hide z-20">
          {CATEGORIES.map(cat => (
             <button
               key={cat.id}
               onClick={() => handleCategoryClick(cat.id, cat.query)}
               disabled={!isLive}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-tech tracking-wider transition-all whitespace-nowrap ${
                 activeCategory === cat.id 
                 ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                 : 'bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'
               } ${!isLive ? 'opacity-50 cursor-not-allowed' : ''}`}
             >
                <cat.icon size={12} />
                {cat.label}
             </button>
          ))}
          {!isLive && <span className="text-[10px] text-rose-500 ml-2 font-mono animate-pulse">CONNECT TO FETCH DATA</span>}
       </div>

       {/* Main Content Area */}
       <div className="flex-1 overflow-y-auto p-4 z-10 relative">
          {articles.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {articles.map((article, idx) => (
                   <div 
                     key={idx} 
                     className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all group flex flex-col h-full animate-[fadeIn_0.5s_ease-out]"
                     style={{ animationDelay: `${idx * 0.1}s` }}
                   >
                      {article.imageUrl && (
                          <div className="h-32 w-full overflow-hidden relative border-b border-slate-800">
                              <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                          </div>
                      )}

                      <div className="p-4 flex-1">
                         <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono text-emerald-500 uppercase px-1.5 py-0.5 bg-emerald-500/10 rounded">{article.source}</span>
                            <span className="text-[10px] text-slate-500">{article.time}</span>
                         </div>
                         <h3 className="text-sm font-bold text-slate-200 mb-2 leading-snug group-hover:text-emerald-400 transition-colors line-clamp-2">
                            {article.title}
                         </h3>
                         <p className="text-xs text-slate-400 line-clamp-3 mb-4 leading-relaxed">
                            {article.summary}
                         </p>
                      </div>
                      
                      {/* Actions */}
                      <div className="p-3 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between gap-2">
                         <button 
                           onClick={() => onAnalyze(article)}
                           className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 py-1.5 rounded text-[10px] font-tech transition-colors border border-transparent hover:border-emerald-500/30"
                         >
                            <Zap size={12} /> DEEP DIVE
                         </button>
                         <a 
                           href={article.url} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="p-1.5 text-slate-500 hover:text-emerald-400 transition-colors"
                           title="Open Source"
                         >
                            <ExternalLink size={14} />
                         </a>
                      </div>
                   </div>
                ))}
             </div>
          ) : (
             <div className="h-full flex flex-col items-center justify-center text-slate-600">
                <div className="relative mb-4">
                   <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse"></div>
                   <Globe size={64} className="relative z-10 text-slate-700" />
                </div>
                <h3 className="font-tech text-lg text-slate-500 tracking-widest mb-1">NO INTELLIGENCE LOADED</h3>
                <p className="text-xs font-mono text-slate-600 max-w-xs text-center">
                   {isLive ? "Select a category above to initialize news aggregation stream." : "Establish connection to Jarvis Core to access global feeds."}
                </p>
             </div>
          )}
       </div>
    </div>
  );
};

export default NewsSpace;
