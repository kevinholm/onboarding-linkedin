import React, { useState, useEffect } from 'react';
import { Users, Search, Send, UserPlus, ShieldCheck, Crown, Briefcase, Loader2, ExternalLink, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExecutiveContext, Expertise, ExecutiveLevel } from '../services/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Prospect {
  id: string;
  name: string;
  headline: string;
  company: string;
  matchReason: string;
  matchScore: number;
  strategy: string;
  level: string;
}

interface NetworkExpanderProps {
  context: ExecutiveContext;
}

export default function NetworkExpander({ context }: NetworkExpanderProps) {
  const [domain, setDomain] = useState(context.industries[0] || '');
  const [isSearching, setIsSearching] = useState(false);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [selectedExpertises, setSelectedExpertises] = useState<string[]>([]);
  const [availableExpertises, setAvailableExpertises] = useState<Expertise[]>([]);
  const [targetLevels, setTargetLevels] = useState<ExecutiveLevel[]>(context.levels);

  useEffect(() => {
    const saved = localStorage.getItem('linkedin_competencies');
    if (saved) {
      setAvailableExpertises(JSON.parse(saved));
    }
  }, []);

  const handleSearch = () => {
    setIsSearching(true);
    
    // Construct Boolean Search Query
    const levelQuery = targetLevels.length > 0 
      ? `(${targetLevels.map(l => {
          const selectedTitles = context.titles[l] || [];
          if (selectedTitles.length > 0) {
            return `(${selectedTitles.map(t => `"${t}"`).join(' OR ')})`;
          }
          // Fallback to broad level query if no titles selected
          if (l === 'CEO') return '(CEO OR MD OR "Managing Director" OR "Adm. Direktør")';
          if (l === 'Board') return '(Board OR "Bestyrelsesmedlem" OR Chairman)';
          if (l === 'C-level') return '(CFO OR CTO OR COO OR CMO OR CHRO OR CPO OR CIO OR CSO OR CDO OR CCO)';
          return `("${l}")`;
        }).join(' OR ')})`
      : `(${context.levels.join(' OR ')})`;
    
    const domainQuery = [
      ...context.industries,
      ...context.subIndustries,
      ...context.niches
    ].filter(Boolean).map(d => `"${d}"`).join(' OR ');

    const triggers = selectedExpertises.map(id => `"${availableExpertises.find(e => e.id === id)?.name}"`).join(' OR ');
    const fullQuery = `${levelQuery} AND (${domainQuery || `"${domain}"`}) ${triggers ? `AND (${triggers})` : ''}`;

    // Simulate AI search based on domain, expertises and target level
    setTimeout(() => {
      const mockProspects: Prospect[] = [
        {
          id: '1',
          name: 'Anders Hemmingsen',
          headline: 'Group CEO | Digital Transformation Strategist',
          company: 'Nordic Enterprise Solutions',
          matchReason: `Matcher din profil og dine triggers inden for ${selectedExpertises.map(id => availableExpertises.find(e => e.id === id)?.name).join(', ') || context.niches[0] || 'dit domæne'}.`,
          matchScore: 98,
          level: 'CEO',
          strategy: 'Fokusér på jeres fælles interesse for skalering af AI-infrastruktur. Nævn hans seneste opslag om "The Future of SaaS".'
        },
        {
          id: '2',
          name: 'Sarah Jenkins',
          headline: 'Board Member & Strategic Advisor',
          company: 'Global Tech Partners',
          matchReason: `Relevant som Board kontakt. Har stærk historik inden for ${context.industries[0] || 'din branche'}.`,
          matchScore: 94,
          level: 'Board',
          strategy: `Positionér dig som en visionær leder der forstår de langsigtede konsekvenser af ${context.niches[0] || 'din niche'}. Spørg ind til hendes perspektiv på governance.`
        }
      ];
      setProspects(mockProspects);
      setIsSearching(false);
    }, 1500);
  };

  const openLinkedInSearch = () => {
    const levelQuery = targetLevels.length > 0 
      ? `(${targetLevels.map(l => {
          const selectedTitles = context.titles[l] || [];
          if (selectedTitles.length > 0) {
            return `(${selectedTitles.map(t => `"${t}"`).join(' OR ')})`;
          }
          if (l === 'CEO') return '(CEO OR MD OR "Managing Director" OR "Adm. Direktør")';
          if (l === 'Board') return '(Board OR "Bestyrelsesmedlem" OR Chairman)';
          if (l === 'C-level') return '(CFO OR CTO OR COO OR CMO OR CHRO OR CPO OR CIO OR CSO OR CDO OR CCO)';
          return `("${l}")`;
        }).join(' OR ')})`
      : `(${context.levels.join(' OR ')})`;
    
    const domainQuery = [
      ...context.industries,
      ...context.subIndustries,
      ...context.niches
    ].filter(Boolean).map(d => `"${d}"`).join(' OR ');

    const triggers = selectedExpertises.map(id => `"${availableExpertises.find(e => e.id === id)?.name}"`).join(' OR ');
    const fullQuery = `${levelQuery} AND (${domainQuery || `"${domain}"`}) ${triggers ? `AND (${triggers})` : ''}`;
    window.open(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(fullQuery)}`, '_blank');
  };

  const toggleLevel = (level: ExecutiveLevel) => {
    setTargetLevels(prev => 
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const toggleExpertise = (id: string) => {
    setSelectedExpertises(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-zinc-900">
            <Users className="w-8 h-8" />
            Executive Network Expander
          </h2>
          <p className="text-zinc-500">Find og forbind med ligesindede ledere og beslutningstagere.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Domæne / Branche</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="Søg efter branche eller niche..."
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
              />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Målniveau (Vælg flere)</label>
            <div className="flex flex-wrap gap-2">
              {(['PE/VC/FO', 'Board', 'CEO', 'C-level', 'VP/SVP/Director', 'Head of'] as ExecutiveLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => toggleLevel(level)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-bold border transition-all uppercase tracking-wider",
                    targetLevels.includes(level) 
                      ? "bg-zinc-900 border-zinc-900 text-white shadow-md" 
                      : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Briefcase className="w-3 h-3" />
              Filtrer efter faglige triggers
            </label>
            <button className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-1 hover:underline">
              <Plus className="w-3 h-3" />
              Tilføj midlertidig
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableExpertises.map((exp) => (
              <button
                key={exp.id}
                onClick={() => toggleExpertise(exp.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-bold border transition-all",
                  selectedExpertises.includes(exp.id)
                    ? "bg-amber-50 border-amber-200 text-amber-700 shadow-sm"
                    : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                )}
              >
                {exp.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSearch}
            disabled={isSearching || !domain}
            className="flex-1 bg-zinc-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-zinc-200"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyserer netværksmuligheder...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Find Executive Prospects
              </>
            )}
          </button>
          <button
            onClick={openLinkedInSearch}
            className="px-6 bg-white border border-zinc-200 text-zinc-900 rounded-2xl font-bold hover:bg-zinc-50 transition-all flex items-center justify-center gap-2"
            title="Åbn søgning direkte på LinkedIn"
          >
            <ExternalLink className="w-5 h-5" />
            Åbn på LinkedIn
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {prospects.map((prospect, index) => (
            <motion.div
              key={prospect.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center">
                        <Users className="w-7 h-7 text-zinc-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-zinc-900">{prospect.name}</h3>
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                            <Crown className="w-3 h-3" />
                            {prospect.level}
                          </div>
                        </div>
                        <p className="text-sm text-zinc-500 font-medium">{prospect.headline}</p>
                        <p className="text-xs text-zinc-400">{prospect.company}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-zinc-900">{prospect.matchScore}%</div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Match Score</div>
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="w-4 h-4 text-zinc-900" />
                      <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">AI Begrundelse</span>
                    </div>
                    <p className="text-sm text-zinc-600 leading-relaxed">{prospect.matchReason}</p>
                  </div>

                  <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Outreach Strategi</span>
                    </div>
                    <p className="text-sm text-amber-900/80 leading-relaxed italic">"{prospect.strategy}"</p>
                  </div>

                  <div className="flex gap-3">
                    <button className="flex-1 bg-zinc-900 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all">
                      <UserPlus className="w-4 h-4" />
                      Forbind
                    </button>
                    <button className="flex-1 bg-white border border-zinc-200 text-zinc-900 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-50 transition-all">
                      <Send className="w-4 h-4" />
                      Personlig Besked
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
