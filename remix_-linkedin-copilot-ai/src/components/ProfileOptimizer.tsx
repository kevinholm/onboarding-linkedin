import React, { useState } from 'react';
import { FileText, Upload, Sparkles, Check, Copy, AlertCircle, Loader2, Award, Briefcase, User, ListChecks } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExecutiveContext, optimizeLinkedInProfile, OptimizedProfile } from '../services/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ProfileOptimizerProps {
  context: ExecutiveContext;
  onSave: (context: ExecutiveContext) => void;
}

export default function ProfileOptimizer({ context, onSave }: ProfileOptimizerProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedData, setOptimizedData] = useState<OptimizedProfile | null>(null);
  const [cvInput, setCvInput] = useState(context.cvText || '');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleOptimize = async () => {
    if (!cvInput) return;
    setIsOptimizing(true);
    try {
      // Save CV text to context first
      onSave({ ...context, cvText: cvInput });
      const results = await optimizeLinkedInProfile({ ...context, cvText: cvInput });
      setOptimizedData(results);
    } catch (error) {
      console.error('Optimization error:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <div className="space-y-2">
        <h2 className="text-4xl font-black tracking-tight text-zinc-900">360Brew Profil Optimering</h2>
        <p className="text-zinc-500 text-lg">Upload dit CV og få AI-genererede, SEO-optimerede tekster til din LinkedIn profil.</p>
      </div>

      {/* CV Upload / Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[40px] border border-zinc-200 p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900">Dit CV Grundlag</h3>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-zinc-500">Indsæt teksten fra dit CV herunder. AI'en bruger dette sammen med din executive profil til at skabe de bedste forslag.</p>
            <textarea
              value={cvInput}
              onChange={(e) => setCvInput(e.target.value)}
              placeholder="Indsæt CV tekst her..."
              className="w-full h-64 p-6 rounded-3xl border border-zinc-200 bg-zinc-50 outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-sm font-medium leading-relaxed"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleOptimize}
              disabled={isOptimizing || !cvInput}
              className="px-8 py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center gap-2 shadow-xl shadow-zinc-200"
            >
              {isOptimizing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 text-amber-400" />}
              Generer 360Brew Optimering
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-900 rounded-[32px] p-6 text-white space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-amber-400">LinkedIn Guide</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-xs text-zinc-400">Headline</span>
                <span className="text-xs font-bold">220 tegn</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-xs text-zinc-400">Om / Summary</span>
                <span className="text-xs font-bold">2.600 tegn</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-xs text-zinc-400">Erfaring (Beskrivelse)</span>
                <span className="text-xs font-bold">2.000 tegn</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-xs text-zinc-400">Kompetencer (I alt)</span>
                <span className="text-xs font-bold">50 stk</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-zinc-200 p-6 space-y-4">
            <h4 className="text-sm font-bold text-zinc-900">Strategisk Tip</h4>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Brug dine valgte <strong>Boolean Keywords</strong> i både din Headline og dine Erfaringsafsnit. Det øger din synlighed for researchers markant.
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {optimizedData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            {/* Headline Section */}
            <div className="bg-zinc-900 rounded-[40px] p-10 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 blur-[100px] rounded-full -mr-32 -mt-32" />
              <div className="space-y-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Award className="w-6 h-6 text-amber-400" />
                    <h4 className="text-xl font-bold">Optimeret Headline</h4>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/10">
                    Max 220 tegn
                  </span>
                </div>
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 group relative">
                  <p className="text-2xl font-black leading-tight text-amber-50 pr-12">{optimizedData.headline}</p>
                  <button 
                    onClick={() => copyToClipboard(optimizedData.headline, 'headline')}
                    className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-xl transition-all text-zinc-400 hover:text-white"
                  >
                    {copiedField === 'headline' ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-zinc-500 italic">Længde: {optimizedData.headline.length} / 220 tegn</p>
              </div>
            </div>

            {/* About Section */}
            <div className="bg-white rounded-[40px] border border-zinc-200 p-10 shadow-sm space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5 text-zinc-900" />
                  </div>
                  <h4 className="text-xl font-bold text-zinc-900">Om / Summary</h4>
                </div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50 px-3 py-1 rounded-full border border-zinc-100">
                  Max 2600 tegn
                </span>
              </div>
              <div className="p-8 bg-zinc-50 rounded-[32px] border border-zinc-100 relative group">
                <div className="prose prose-zinc max-w-none">
                  <p className="text-zinc-700 leading-relaxed whitespace-pre-wrap text-sm font-medium">{optimizedData.about}</p>
                </div>
                <button 
                  onClick={() => copyToClipboard(optimizedData.about, 'about')}
                  className="absolute top-6 right-6 p-2 hover:bg-zinc-200 rounded-xl transition-all text-zinc-400 hover:text-zinc-900"
                >
                  {copiedField === 'about' ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-zinc-400 italic">Længde: {optimizedData.about.length} / 2600 tegn</p>
            </div>

            {/* Experience Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-zinc-900" />
                </div>
                <h4 className="text-xl font-bold text-zinc-900">Erfaringsafsnit (Top 3)</h4>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {optimizedData.experience.map((exp, idx) => (
                  <div key={idx} className="bg-white rounded-[40px] border border-zinc-200 p-8 shadow-sm space-y-6 relative group">
                    <div className="flex items-center justify-between">
                      <h5 className="text-lg font-black text-zinc-900">{exp.title}</h5>
                      <button 
                        onClick={() => copyToClipboard(`${exp.title}\n\n${exp.description}`, `exp-${idx}`)}
                        className="p-2 hover:bg-zinc-100 rounded-xl transition-all text-zinc-400 hover:text-zinc-900"
                      >
                        {copiedField === `exp-${idx}` ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-zinc-600 text-sm leading-relaxed whitespace-pre-wrap font-medium">{exp.description}</p>
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Fremhævede kompetencer til dette afsnit:</p>
                      <div className="flex flex-wrap gap-2">
                        {exp.skills.map((skill, sIdx) => (
                          <span key={sIdx} className="px-3 py-1 bg-zinc-100 text-zinc-600 text-[10px] font-bold rounded-lg border border-zinc-200">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Skills & Certifications */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white rounded-[40px] border border-zinc-200 p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center">
                    <ListChecks className="w-5 h-5 text-zinc-900" />
                  </div>
                  <h4 className="text-xl font-bold text-zinc-900">Prioriterede Skills</h4>
                </div>
                <div className="space-y-2">
                  {optimizedData.skills.map((skill, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-2xl border border-zinc-100">
                      <span className="w-6 h-6 bg-zinc-900 text-white text-[10px] font-bold rounded-lg flex items-center justify-center">{idx + 1}</span>
                      <span className="text-sm font-bold text-zinc-700">{skill}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-[40px] border border-zinc-200 p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center">
                    <Award className="w-5 h-5 text-zinc-900" />
                  </div>
                  <h4 className="text-xl font-bold text-zinc-900">Certificeringer & Kurser</h4>
                </div>
                <div className="space-y-4">
                  <p className="text-xs text-zinc-500">Disse vil styrke din profil yderligere inden for dine valgte domæner:</p>
                  <div className="space-y-2">
                    {optimizedData.certifications.map((cert, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-amber-50 rounded-2xl border border-amber-100">
                        <Check className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-bold text-amber-900">{cert}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
