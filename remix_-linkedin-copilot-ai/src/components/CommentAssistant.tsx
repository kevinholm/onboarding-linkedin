import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Sparkles, Loader2, Copy, Check, Send, RotateCcw, Zap, MousePointer2, Info, UserCheck } from 'lucide-react';
import { generateLinkedInComment, LinkedInTone, LinkedInTwist, Expertise, CommentResponse, ExecutiveContext } from '../services/gemini';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CommentAssistantProps {
  context: ExecutiveContext;
  prefilledText?: string;
  onClearPrefill?: () => void;
}

export default function CommentAssistant({ context, prefilledText, onClearPrefill }: CommentAssistantProps) {
  const [postText, setPostText] = useState('');
  const [tone, setTone] = useState<LinkedInTone>('insightful');
  const [twist, setTwist] = useState<LinkedInTwist>('none');
  const [result, setResult] = useState<CommentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTime, setLoadingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [copied, setCopied] = useState(false);
  const [inserted, setInserted] = useState(false);
  const [refinement, setRefinement] = useState('');
  const [competencies, setCompetencies] = useState<Expertise[]>([]);
  const [selectedExpertiseIds, setSelectedExpertiseIds] = useState<string[]>([]);
  
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefilledText) {
      setPostText(prefilledText);
      if (onClearPrefill) onClearPrefill();
    }
  }, [prefilledText]);

  useEffect(() => {
    const saved = localStorage.getItem('linkedin_competencies');
    if (saved) {
      setCompetencies(JSON.parse(saved));
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Listen for simulator events
  useEffect(() => {
    const handleSimulateComment = (e: any) => {
      if (e.detail && e.detail.text) {
        setPostText(e.detail.text);
      }
    };
    window.addEventListener('linkedin-copilot-simulate-comment', handleSimulateComment);
    return () => window.removeEventListener('linkedin-copilot-simulate-comment', handleSimulateComment);
  }, []);

  // Auto-generate when postText is updated from simulator or extension
  useEffect(() => {
    if (postText && postText.length > 20 && !result && !loading) {
      const timeout = setTimeout(() => {
        handleGenerate();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [postText]);

  const handleGenerate = async (isRefinement = false) => {
    if (!postText) return;
    setLoading(true);
    setLoadingTime(0);
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setLoadingTime(prev => prev + 1);
    }, 1000);

    try {
      const selectedExpertises = competencies.filter(c => selectedExpertiseIds.includes(c.id));
      
      const response = await generateLinkedInComment(
        postText, 
        tone, 
        selectedExpertises.length > 0 ? selectedExpertises : undefined,
        twist,
        context,
        isRefinement ? refinement : undefined,
        isRefinement ? result?.comment : undefined
      );
      setResult(response);
      if (isRefinement) setRefinement('');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const toggleExpertise = (id: string) => {
    setSelectedExpertiseIds(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      if (prev.length >= 3) return prev; // Limit to 3
      return [...prev, id];
    });
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.comment);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = () => {
    if (!result) return;
    const event = new CustomEvent('linkedin-copilot-insert', { detail: result.comment });
    window.dispatchEvent(event);
    setInserted(true);
    setTimeout(() => setInserted(false), 2000);
  };

  const tones: { value: LinkedInTone; label: string }[] = [
    { value: 'insightful', label: 'Indsigtsfuld' },
    { value: 'professional', label: 'Professionel' },
    { value: 'challenging', label: 'Udfordrende' },
    { value: 'casual', label: 'Uformel' },
  ];

  const twists: { value: LinkedInTwist; label: string }[] = [
    { value: 'none', label: 'Ingen' },
    { value: 'humor', label: 'Humor' },
    { value: 'self-insight', label: 'Selvindsigt' },
    { value: 'irony', label: 'Ironi' },
    { value: 'self-irony', label: 'Selvironi' },
    { value: 'provocation', label: 'Provokation' },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 max-w-7xl mx-auto p-4 md:p-6">
      {/* Left Column: Input & Context */}
      <div className="xl:col-span-5 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            Thought Leader Copilot
          </h2>
          <p className="text-sm text-zinc-500">
            Skab autentiske kommentarer med faglig dybde og et personligt twist.
          </p>
        </div>

        <div className="space-y-4 bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Aktiv Profil</p>
              <p className="text-xs font-bold text-zinc-900 truncate">
                {context.levels.join(' & ')} | {context.industries[0]}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Indsæt opslagets tekst</label>
            <textarea
              className="w-full min-h-[120px] p-3 text-sm rounded-xl bg-zinc-50 border border-zinc-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
              placeholder="Kopier teksten fra LinkedIn opslaget her..."
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Grundtone</label>
              <select 
                value={tone}
                onChange={(e) => setTone(e.target.value as LinkedInTone)}
                className="w-full p-2 text-xs rounded-lg border border-zinc-200 bg-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                {tones.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-amber-500" />
                Personligt Twist
              </label>
              <select 
                value={twist}
                onChange={(e) => setTwist(e.target.value as LinkedInTwist)}
                className="w-full p-2 text-xs rounded-lg border border-zinc-200 bg-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                {twists.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={() => handleGenerate(false)}
            disabled={loading || !postText}
            className="flex items-center justify-center gap-2 w-full py-3 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 disabled:opacity-50 transition-all shadow-lg shadow-zinc-200"
          >
            {loading && !result ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {result ? 'Opdater kommentar' : 'Generer Første Bud'}
              </>
            )}
          </button>
        </div>

        {/* Action Buttons: Expertise Kartotek */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
              Faglige Triggers (Vælg op til 3)
            </label>
            <span className="text-[10px] font-bold text-zinc-400">{selectedExpertiseIds.length}/3</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {competencies.map((c) => (
              <button
                key={c.id}
                onClick={() => toggleExpertise(c.id)}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-xl border text-left transition-all group",
                  selectedExpertiseIds.includes(c.id)
                    ? "bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-200 shadow-sm" 
                    : "bg-white border-zinc-200 text-zinc-600 hover:border-blue-100 hover:bg-blue-50/30"
                )}
              >
                <div className={cn(
                  "w-2 h-2 rounded-full transition-all shrink-0",
                  selectedExpertiseIds.includes(c.id) ? "bg-blue-600 scale-125" : "bg-zinc-300 group-hover:bg-blue-400"
                )} />
                <span className="text-[11px] font-semibold truncate">{c.name}</span>
              </button>
            ))}
          </div>
          {selectedExpertiseIds.length > 0 && !result && (
            <p className="text-[10px] text-blue-500 animate-pulse font-medium">
              Auto-generering aktiveret: Indsæt tekst for at starte.
            </p>
          )}
        </div>
      </div>

      {/* Right Column: Result & Refinement */}
      <div className="xl:col-span-7">
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden flex flex-col h-full min-h-[550px]">
          {/* Header */}
          <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Thought Leader Output</span>
            </div>
            <button 
              onClick={() => {
                setResult(null);
                setPostText('');
                setSelectedExpertiseIds([]);
              }}
              className="p-2 hover:bg-zinc-200 rounded-lg text-zinc-400 transition-colors"
              title="Ryd alt"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 overflow-y-auto relative space-y-6">
            <AnimatePresence mode="wait">
              {!result && !loading && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40"
                >
                  <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center">
                    <MessageSquare className="w-8 h-8 text-zinc-300" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-zinc-900">Klar til at sparre</p>
                    <p className="text-xs text-zinc-500 max-w-[200px]">Vælg dine triggers og indsæt et opslag for at starte.</p>
                  </div>
                </motion.div>
              )}

              {loading && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-xs font-bold text-blue-600 animate-pulse">Positionerer dig som Thought Leader... ({loadingTime}s)</p>
                    <p className="text-[10px] text-zinc-400 italic">Skaber autentisk dybde og personligt twist</p>
                  </div>
                </div>
              )}

              {result && (
                <motion.div
                  key={result.comment}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* The actual comment box */}
                  <div className="p-6 bg-blue-50/30 border border-blue-100 rounded-2xl relative group shadow-sm">
                    <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        Din kommentar (3-5 afsnit)
                      </div>
                      <span className="text-[9px] bg-blue-100 px-2 py-0.5 rounded-full">Klar til optimering</span>
                    </div>
                    <textarea
                      className="w-full min-h-[200px] bg-transparent prose prose-zinc max-w-none text-zinc-800 leading-relaxed text-[15px] font-medium whitespace-pre-wrap outline-none border-none resize-none"
                      value={result.comment}
                      onChange={(e) => setResult({ ...result, comment: e.target.value })}
                      placeholder="Rediger din kommentar her..."
                    />
                  </div>

                  {/* The reasoning box */}
                  <div className="p-5 bg-zinc-50 border border-zinc-100 rounded-2xl">
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Strategisk Vinkel
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed italic">
                      {result.reasoning}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer: Refinement & Actions */}
          <div className="p-4 border-t border-zinc-100 bg-zinc-50/50 space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Gør den mere provokerende? Tilføj mere selvironi? Spørg her..."
                className="w-full p-3 pr-12 rounded-xl bg-white border border-zinc-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner"
                value={refinement}
                onChange={(e) => setRefinement(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate(true)}
              />
              <button
                onClick={() => handleGenerate(true)}
                disabled={!refinement || loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={copyToClipboard}
                disabled={!result}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-zinc-200 rounded-xl text-sm font-bold hover:bg-zinc-50 transition-all group disabled:opacity-50"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900" />}
                {copied ? 'Kopieret!' : 'Kopier'}
              </button>
              <button
                onClick={handleInsert}
                disabled={!result}
                className="flex-[1.5] flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
              >
                {inserted ? <Check className="w-4 h-4" /> : <MousePointer2 className="w-4 h-4" />}
                {inserted ? 'Indsat!' : 'Indsæt i LinkedIn'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
