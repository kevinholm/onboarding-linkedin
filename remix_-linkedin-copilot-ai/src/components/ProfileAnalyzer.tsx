import React, { useState } from 'react';
import { BarChart3, Search, Loader2, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { analyzeLinkedInProfile, ProfileAnalysis, ExecutiveContext } from '../services/gemini';
import { motion, AnimatePresence } from 'motion/react';

interface ProfileAnalyzerProps {
  context: ExecutiveContext;
}

export default function ProfileAnalyzer({ context }: ProfileAnalyzerProps) {
  const [profileData, setProfileData] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProfileAnalysis | null>(null);

  const handleAnalyze = async () => {
    if (!profileData) return;
    setLoading(true);
    try {
      const analysis = await analyzeLinkedInProfile(profileData, context);
      setResult(analysis);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          360Brew Profilanalyse
        </h2>
        <p className="text-zinc-500">
          Analyser din egen eller andres profiler for at se, hvor stærkt de står som Thought Leaders.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Side */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Indsæt profil-data</label>
              <p className="text-[10px] text-zinc-400 italic mb-2">Kopier Headline, About og Erfaring fra LinkedIn.</p>
              <textarea
                className="w-full min-h-[300px] p-4 text-sm rounded-2xl bg-zinc-50 border border-zinc-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                placeholder="Indsæt tekst her..."
                value={profileData}
                onChange={(e) => setProfileData(e.target.value)}
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={loading || !profileData}
              className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              Start 360Brew Analyse
            </button>
          </div>
        </div>

        {/* Result Side */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {!result && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30 border-2 border-dashed border-zinc-200 rounded-3xl p-12">
                <BarChart3 className="w-16 h-16 text-zinc-300" />
                <p className="text-sm font-medium">Resultaterne vises her efter analysen.</p>
              </div>
            )}

            {loading && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 bg-white border border-zinc-200 rounded-3xl p-12 shadow-sm">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                <div className="space-y-2">
                  <p className="text-lg font-bold text-zinc-900 animate-pulse">Analyserer 360Brew parametre...</p>
                  <p className="text-xs text-zinc-500">Tjekker Headline, About og Erfaring for Thought Leadership potentiale.</p>
                </div>
              </div>
            )}

            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                {/* Score Card */}
                <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-lg flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-zinc-900">360Brew Score</h3>
                    <p className="text-sm text-zinc-500">Baseret på din Thought Leader profilering</p>
                  </div>
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-zinc-100" />
                      <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * result.score) / 100} className="text-blue-600 transition-all duration-1000" />
                    </svg>
                    <span className="absolute text-2xl font-black text-zinc-900">{result.score}</span>
                  </div>
                </div>

                {/* Detailed Critique */}
                <div className="grid grid-cols-1 gap-4">
                  <CritiqueItem title="Headline" content={result.critique.headline} />
                  <CritiqueItem title="About" content={result.critique.about} />
                  <CritiqueItem title="Experience" content={result.critique.experience} />
                </div>

                {/* Recommendations */}
                <div className="bg-zinc-900 p-8 rounded-3xl text-white space-y-6">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                    <h3 className="text-lg font-bold">Anbefalinger til optimering</h3>
                  </div>
                  <div className="space-y-3">
                    {result.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-3 group">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-blue-500 transition-colors">
                          <span className="text-[10px] font-bold">{i + 1}</span>
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed group-hover:text-white transition-colors">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function CritiqueItem({ title, content }: { title: string, content: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-2">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-blue-500" />
        <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">{title}</h4>
      </div>
      <p className="text-sm text-zinc-700 leading-relaxed">{content}</p>
    </div>
  );
}
