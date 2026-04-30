import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Star, Loader2, ExternalLink, MessageSquarePlus, Crown, Check, Info, AlertCircle, Linkedin, Globe, Languages, Copy, Plus, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExecutiveContext, searchThoughtLeaders, generateBooleanSearch } from '../services/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Leader {
  id: string;
  name: string;
  headline: string;
  reason: string;
  topics: string[];
  connectionStatus: 'none' | 'pending' | 'connected';
  lastPostDate: string;
  industry: string;
  isFavorite?: boolean;
}

interface ThoughtLeaderDiscoveryProps {
  context: ExecutiveContext;
}

export default function ThoughtLeaderDiscovery({ context }: ThoughtLeaderDiscoveryProps) {
  const [domain, setDomain] = useState(context.industries[0] || '');
  const [country, setCountry] = useState(context.preferredCountry || 'Denmark');
  const [language, setLanguage] = useState(context.preferredLanguage || 'Danish');
  const [loading, setLoading] = useState(false);
  const [booleanString, setBooleanString] = useState('');
  const [leaders, setLeaders] = useState<Leader[]>(() => {
    const saved = localStorage.getItem('linkedin_thought_leaders');
    return saved ? JSON.parse(saved) : [];
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'industry'>('newest');

  useEffect(() => {
    const handleUpdate = () => {
      const saved = localStorage.getItem('linkedin_thought_leaders');
      if (saved) setLeaders(JSON.parse(saved));
    };
    window.addEventListener('thought-leaders-updated', handleUpdate);
    return () => window.removeEventListener('thought-leaders-updated', handleUpdate);
  }, []);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const saveLeaders = (updated: Leader[]) => {
    setLeaders(updated);
    localStorage.setItem('linkedin_thought_leaders', JSON.stringify(updated));
  };

  const handleSearch = async () => {
    if (!domain) return;
    setLoading(true);
    try {
      const results = await searchThoughtLeaders(domain, context, country);
      const newLeaders: Leader[] = results.map((r, i) => ({
        id: `${Date.now()}-${i}`,
        ...r,
        connectionStatus: 'none',
        isFavorite: false
      }));
      saveLeaders([...newLeaders, ...leaders].slice(0, 50));
      showFeedback(`Fandt ${newLeaders.length} relevante profiler via Google Search`);
    } catch (error) {
      console.error(error);
      showFeedback("Kunne ikke hente profiler. Prøv igen.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBoolean = async () => {
    if (!domain) return;
    setLoading(true);
    try {
      const str = await generateBooleanSearch(domain, context, country);
      setBooleanString(str);
      showFeedback("Boolean search string genereret!");
    } catch (error) {
      showFeedback("Kunne ikke generere søgestreng.");
    } finally {
      setLoading(false);
    }
  };

  const copyBoolean = () => {
    navigator.clipboard.writeText(booleanString);
    showFeedback("Søgestreng kopieret!");
  };

  const handleDirectLinkedInSearch = () => {
    if (!domain) return;
    const keywords = booleanString || domain;
    const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}&origin=FACETED_SEARCH&locationContext=%5B%22${encodeURIComponent(country)}%22%5D`;
    window.open(searchUrl, '_blank');
  };

  const toggleFavorite = (id: string) => {
    const updated = leaders.map(l => 
      l.id === id ? { ...l, isFavorite: !l.isFavorite } : l
    );
    saveLeaders(updated);
    const leader = updated.find(l => l.id === id);
    showFeedback(leader?.isFavorite ? `${leader.name} tilføjet til favoritter` : `${leader.name} fjernet fra favoritter`);
  };

  const sortedLeaders = [...leaders].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.lastPostDate).getTime() - new Date(a.lastPostDate).getTime();
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'industry') return a.industry.localeCompare(b.industry);
    return 0;
  });

  const handleConnect = (id: string) => {
    saveLeaders(leaders.map(l => l.id === id ? { ...l, connectionStatus: 'pending' } : l));
    showFeedback("Forbindelsesanmodning sendt (simuleret)");
  };

  const handleAnalyzeStyle = (name: string) => {
    showFeedback(`Analyserer ${name}s skrivestil for at optimere din Copilot...`);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-zinc-900">
          <Search className="w-8 h-8 text-zinc-900" />
          Executive Discovery
        </h2>
        <p className="text-zinc-500">
          Find de mest indflydelsesrige stemmer i din branche for at lære af deres stil og udvide din indflydelse.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-bold text-amber-900">Vigtig information om dataadgang</p>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Dette værktøj bruger offentligt tilgængelige data via Google Search til at finde profiler. Da vi ikke har direkte adgang til din private LinkedIn-konto, kan vi ikke se din nuværende forbindelsesstatus eller dine private beskeder. "Seneste opslag" er et estimat baseret på søgeresultater.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <Globe className="w-3 h-3" /> Land
            </label>
            <select 
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full p-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <option value="Denmark">Danmark</option>
              <option value="Norway">Norge</option>
              <option value="Sweden">Sverige</option>
              <option value="Germany">Tyskland</option>
              <option value="United Kingdom">Storbritannien</option>
              <option value="United States">USA</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <Languages className="w-3 h-3" /> Sprog
            </label>
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full p-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <option value="Danish">Dansk</option>
              <option value="English">Engelsk</option>
              <option value="German">Tysk</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <Search className="w-3 h-3" /> Domæne
            </label>
            <input
              type="text"
              placeholder="F.eks. Bæredygtighed..."
              className="w-full p-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSearch}
            disabled={loading || !domain}
            className="flex-1 min-w-[200px] py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            Find via AI & Google
          </button>
          <button
            onClick={handleGenerateBoolean}
            disabled={loading || !domain}
            className="flex-1 min-w-[200px] py-4 bg-white border border-zinc-200 text-zinc-900 rounded-2xl font-bold hover:bg-zinc-50 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <Zap className="w-5 h-5 text-amber-500" />
            Generer Boolean Search
          </button>
        </div>

        {booleanString && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Din Boolean Search String</span>
              <button onClick={copyBoolean} className="text-zinc-400 hover:text-zinc-900 transition-colors">
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <code className="block p-3 bg-white border border-zinc-200 rounded-xl text-xs font-mono break-all">
              {booleanString}
            </code>
            <button
              onClick={handleDirectLinkedInSearch}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              <Linkedin className="w-4 h-4" />
              Søg på LinkedIn med denne streng
            </button>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-zinc-900 text-white px-6 py-3 rounded-full text-xs font-bold fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] shadow-2xl flex items-center gap-2"
          >
            <Crown className="w-3 h-3 text-amber-400" />
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {sortedLeaders.map((leader, index) => (
            <motion.div
              key={leader.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <button 
                    onClick={() => toggleFavorite(leader.id)}
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                      leader.isFavorite ? "bg-amber-50 text-amber-400" : "bg-zinc-50 text-zinc-300 hover:bg-zinc-100"
                    )}
                  >
                    <Star className={cn("w-6 h-6", leader.isFavorite && "fill-current")} />
                  </button>
                  <div className="flex flex-col items-end gap-1">
                    <button 
                      onClick={() => window.open(`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(leader.name)}`, '_blank')}
                      className="p-2 hover:bg-zinc-50 rounded-full text-zinc-400 hover:text-zinc-900 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <span className="text-[9px] font-bold text-zinc-400 bg-zinc-50 px-2 py-0.5 rounded-full">
                      Sidste opslag: {new Date(leader.lastPostDate).toLocaleDateString('da-DK')}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-zinc-900 text-lg">{leader.name}</h3>
                  <p className="text-xs text-zinc-500 font-medium line-clamp-1">{leader.headline}</p>
                </div>

                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Info className="w-3 h-3 text-zinc-400" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Hvorfor følge</span>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    {leader.reason}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {leader.topics.map(topic => (
                    <span key={topic} className="px-2 py-1 bg-white border border-zinc-200 text-zinc-500 text-[9px] font-bold rounded-md uppercase tracking-wider">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <button 
                  onClick={() => handleConnect(leader.id)}
                  disabled={leader.connectionStatus !== 'none'}
                  className={cn(
                    "w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                    leader.connectionStatus === 'none' 
                      ? "bg-zinc-900 text-white hover:bg-zinc-800" 
                      : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                  )}
                >
                  {leader.connectionStatus === 'none' ? (
                    <>
                      <UserPlus className="w-3 h-3" />
                      Forbind
                    </>
                  ) : (
                    <>
                      <Check className="w-3 h-3" />
                      Anmodning sendt
                    </>
                  )}
                </button>
                <button 
                  onClick={() => handleAnalyzeStyle(leader.name)}
                  className="w-full py-3 bg-white border border-zinc-200 text-zinc-900 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquarePlus className="w-3 h-3" />
                  Analyser stil
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {leaders.length === 0 && !loading && (
        <div className="py-20 text-center space-y-4 opacity-30">
          <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto">
            <Search className="w-10 h-10 text-zinc-300" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-zinc-900">Ingen søgeresultater endnu</p>
            <p className="text-xs text-zinc-500">Indtast et domæne for at finde de førende profiler i din branche.</p>
          </div>
        </div>
      )}
    </div>
  );
}
