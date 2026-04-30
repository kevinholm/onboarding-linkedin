import React, { useState, useEffect, useRef } from 'react';
import { 
  PenTool, Sparkles, Loader2, Copy, Check, RotateCcw, FileText, Edit3, 
  Search, ChevronDown, ChevronUp, Save, Calendar, Image as ImageIcon, 
  Video, File, Layout, Eye, Trash2, Plus, Clock, X, BarChart3, Layers, HelpCircle, Send
} from 'lucide-react';
import { generateLinkedInPost, deepResearchPost, refineLinkedInPost, LinkedInTone, ExecutiveContext, LinkedInPostType } from '../services/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';
import LinkedInPreview from './LinkedInPreview';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Attachment {
  id: string;
  type: 'image' | 'video' | 'pdf';
  url: string;
  name: string;
}

interface Draft {
  id: string;
  topic: string;
  content: string;
  tone: LinkedInTone;
  highlights: any;
  attachments: Attachment[];
  updatedAt: string;
  scheduledDate?: string;
}

interface PostGeneratorProps {
  context: ExecutiveContext;
  prefilledTopic?: string;
  onClearPrefill?: () => void;
}

export default function PostGenerator({ context, prefilledTopic, onClearPrefill }: PostGeneratorProps) {
  const [topic, setTopic] = useState(prefilledTopic || '');
  const [tone, setTone] = useState<LinkedInTone>('professional');
  const [activeView, setActiveView] = useState<'editor' | 'plan' | 'preview'>('editor');
  const [drafts, setDrafts] = useState<Draft[]>(() => {
    const saved = localStorage.getItem('linkedin_drafts');
    return saved ? JSON.parse(saved) : [];
  });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [postType, setPostType] = useState<LinkedInPostType>('standard');
  const [useEmojisInText, setUseEmojisInText] = useState(false);
  const [useEmojisInBullets, setUseEmojisInBullets] = useState(false);
  const [includeHashtags, setIncludeHashtags] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingType, setPendingType] = useState<'image' | 'video' | 'pdf' | null>(null);

  useEffect(() => {
    if (prefilledTopic) {
      setTopic(prefilledTopic);
      if (onClearPrefill) onClearPrefill();
    }
  }, [prefilledTopic]);
  const [mode, setMode] = useState<'scratch' | 'rewrite'>('scratch');
  const [result, setResult] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showHighlights, setShowHighlights] = useState(false);
  const [selectedHighlights, setSelectedHighlights] = useState<{
    industries: string[];
    subIndustries: string[];
    specialties: string[];
    niches: string[];
    keywords: string[];
  }>({
    industries: [],
    subIndustries: [],
    specialties: [],
    niches: [],
    keywords: []
  });

  const parseResult = (text: string) => {
    // Look for markers like "Slide 1:", "Slide 2:", or "Afsnit 1:", "Spørgsmål:"
    const slideRegex = /(Slide \d+:|Afsnit \d+:|Spørgsmål:|Valgmulighed \d+:|Instruktion:)/gi;
    const parts = text.split(slideRegex);
    
    if (parts.length <= 1) return [{ type: 'content' as const, text }];

    const resultParts: { type: 'content' | 'instruction'; label?: string; text: string }[] = [];
    let currentLabel = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part) continue;

      if (part.match(slideRegex)) {
        currentLabel = part;
      } else {
        resultParts.push({
          type: currentLabel.toLowerCase().includes('instruktion') ? 'instruction' : 'content',
          label: currentLabel,
          text: part
        });
        currentLabel = '';
      }
    }

    return resultParts;
  };

  const saveDraft = (isScheduled = false) => {
    const newDraft: Draft = {
      id: Date.now().toString(),
      topic,
      content: result,
      tone,
      highlights: selectedHighlights,
      attachments,
      updatedAt: new Date().toISOString(),
      scheduledDate: isScheduled ? scheduledDate : undefined
    };

    const updatedDrafts = [newDraft, ...drafts.filter(d => d.id !== newDraft.id)];
    setDrafts(updatedDrafts);
    localStorage.setItem('linkedin_drafts', JSON.stringify(updatedDrafts));
    setFeedback(isScheduled ? 'Opslag planlagt!' : 'Kladde gemt!');
    setTimeout(() => setFeedback(null), 3000);
  };

  const loadDraft = (draft: Draft) => {
    setTopic(draft.topic);
    setResult(draft.content);
    setTone(draft.tone);
    setSelectedHighlights(draft.highlights);
    setAttachments(draft.attachments);
    setScheduledDate(draft.scheduledDate || '');
    setActiveView('editor');
  };

  const deleteDraft = (id: string) => {
    const updated = drafts.filter(d => d.id !== id);
    setDrafts(updated);
    localStorage.setItem('linkedin_drafts', JSON.stringify(updated));
  };

  const addAttachment = (type: 'image' | 'video' | 'pdf') => {
    setPendingType(type);
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'image' ? 'image/*' : type === 'video' ? 'video/*' : '.pdf';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && pendingType) {
      const url = URL.createObjectURL(file);
      const newAtt: Attachment = { 
        id: Date.now().toString(), 
        type: pendingType, 
        url, 
        name: file.name 
      };
      setAttachments([...attachments, newAtt]);
      setPendingType(null);
      e.target.value = ''; // Reset input
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id));
  };

  const toggleHighlight = (category: keyof typeof selectedHighlights, value: string) => {
    setSelectedHighlights(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(v => v !== value)
        : [...prev[category], value]
    }));
  };

  const handleGenerate = async () => {
    if (!topic) return;
    setLoading(true);
    try {
      const post = await generateLinkedInPost(topic, tone, mode, context, 'Danish', selectedHighlights, {
        type: postType,
        useEmojisInText,
        useEmojisInBullets,
        includeHashtags
      });
      setResult(post || '');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleShowExample = () => {
    const examples: Record<LinkedInPostType, string> = {
      standard: `Executive Hook: Vi leder ikke længere efter ledere. Vi leder efter arkitekter af psykologisk tryghed.

I en verden præget af radikal usikkerhed er den vigtigste valuta ikke længere strategi, men tillid. Som leder er din opgave ikke at have alle svarene, men at skabe et rum, hvor de rigtige spørgsmål tør blive stillet.

Her er 3 ting jeg har lært om at bygge high-performance teams:
• Radikal gennemsigtighed trumfer poleret kommunikation.
• Fejl skal fejres som læringspunkter, ikke straffes.
• Din sårbarhed som leder er din største styrke.

Hvad er din erfaring med at skabe tryghed i din ledergruppe? Lad os tage debatten i kommentarsporet.

#Leadership #ExecutiveInsights #Trust #Strategy`,
      poll: `Spørgsmål: Hvad er den største barriere for digital transformation i din optik?

Valgmulighed 1: Manglende teknisk forståelse i bestyrelsen
Valgmulighed 2: Kulturel modstand i organisationen
Valgmulighed 3: Forældede legacy-systemer
Valgmulighed 4: Manglende strategisk fokus

Instruktion: Dette er en poll. Husk at følge op på resultaterne med et uddybende opslag i næste uge.`,
      carousel: `Slide 1: 5 Strategier til at vinde i 2026
Slide 2: Strategi 1: AI-First Integration. Det handler ikke om værktøjer, men om mindset.
Slide 3: Strategi 2: Talent-Centricity. De bedste talenter vælger de bedste kulturer.
Slide 4: Strategi 3: Agil Kapitalallokering. Flyt ressourcerne derhen hvor værdien skabes hurtigst.
Slide 5: Strategi 4: Bæredygtighed som konkurrencefordel. ESG er ikke længere et 'nice-to-have'.
Slide 6: Strategi 5: Personligt Thought Leadership. Din stemme er virksomhedens stærkeste brand.
Slide 7: Hvilken strategi prioriterer du højest? Swipe til højre for at læse mere.`
    };

    setResult(examples[postType]);
    setTopic(postType === 'standard' ? 'Lederskab og tillid' : postType === 'poll' ? 'Digital Transformation' : 'Strategi 2026');
  };

  const handleDeepResearch = async () => {
    if (!result && !topic) return;
    setIsResearching(true);
    try {
      const currentContent = result || topic;
      const optimized = await deepResearchPost(currentContent, context);
      setResult(optimized || '');
      setIsEditing(true); // Switch to editing mode to see the result clearly
    } catch (error) {
      console.error(error);
    } finally {
      setIsResearching(false);
    }
  };

  const handleRefine = async () => {
    if (!result || !refinementPrompt) return;
    setLoading(true);
    try {
      const refined = await refineLinkedInPost(result, refinementPrompt, context);
      setResult(refined || '');
      setRefinementPrompt('');
      setIsEditing(true);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tones: { value: LinkedInTone; label: string }[] = [
    { value: 'professional', label: 'Professionel' },
    { value: 'insightful', label: 'Indsigtsfuld' },
    { value: 'challenging', label: 'Udfordrende' },
    { value: 'casual', label: 'Uformel' },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <PenTool className="w-8 h-8 text-blue-600" />
            Executive Post Generator
          </h2>
          <p className="text-zinc-500">
            Skriv autoritære opslag fra bunden eller omskriv eksisterende indhold til perfektion.
          </p>
        </div>

        <div className="flex p-1 bg-zinc-100 rounded-2xl">
          <button
            onClick={() => setActiveView('editor')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
              activeView === 'editor' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            <PenTool className="w-4 h-4" />
            Editor
          </button>
          <button
            onClick={() => setActiveView('preview')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
              activeView === 'preview' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button
            onClick={() => setActiveView('plan')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
              activeView === 'plan' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            <Calendar className="w-4 h-4" />
            Content Plan
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeView === 'editor' && (
          <motion.div
            key="editor"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Controls */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
                {/* Mode Selector */}
                <div className="flex p-1 bg-zinc-100 rounded-xl">
                  <button
                    onClick={() => setMode('scratch')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all",
                      mode === 'scratch' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                    )}
                  >
                    <FileText className="w-3 h-3" />
                    Fra bunden
                  </button>
                  <button
                    onClick={() => setMode('rewrite')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all",
                      mode === 'rewrite' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                    )}
                  >
                    <Edit3 className="w-3 h-3" />
                    Omskriv
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Opslagstype</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setPostType('standard')}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                        postType === 'standard' ? "bg-zinc-900 border-zinc-900 text-white shadow-md" : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                      )}
                    >
                      <FileText className="w-4 h-4" />
                      <span className="text-[10px] font-bold">Standard</span>
                    </button>
                    <button
                      onClick={() => setPostType('poll')}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                        postType === 'poll' ? "bg-zinc-900 border-zinc-900 text-white shadow-md" : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                      )}
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span className="text-[10px] font-bold">Poll</span>
                    </button>
                    <button
                      onClick={() => setPostType('carousel')}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                        postType === 'carousel' ? "bg-zinc-900 border-zinc-900 text-white shadow-md" : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                      )}
                    >
                      <Layers className="w-4 h-4" />
                      <span className="text-[10px] font-bold">Karrusel</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    {mode === 'scratch' ? 'Hvad vil du skrive om?' : 'Indsæt det eksisterende opslag'}
                  </label>
                  <textarea
                    className="w-full min-h-[150px] p-4 text-sm rounded-2xl bg-zinc-50 border border-zinc-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                    placeholder={mode === 'scratch' ? "F.eks. 'Vigtigheden af psykologisk tryghed i ledergrupper'..." : "Indsæt teksten her..."}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>

                {/* Media Attachments */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Vedhæft medier</label>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileChange}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => addAttachment('image')} className="flex items-center gap-2 px-3 py-2 bg-zinc-50 border border-zinc-100 rounded-xl text-[10px] font-bold text-zinc-600 hover:bg-zinc-100 transition-all">
                      <ImageIcon className="w-3 h-3" />
                      Billede
                    </button>
                    <button onClick={() => addAttachment('video')} className="flex items-center gap-2 px-3 py-2 bg-zinc-50 border border-zinc-100 rounded-xl text-[10px] font-bold text-zinc-600 hover:bg-zinc-100 transition-all">
                      <Video className="w-3 h-3" />
                      Video
                    </button>
                    <button onClick={() => addAttachment('pdf')} className="flex items-center gap-2 px-3 py-2 bg-zinc-50 border border-zinc-100 rounded-xl text-[10px] font-bold text-zinc-600 hover:bg-zinc-100 transition-all">
                      <File className="w-3 h-3" />
                      PDF/Slides
                    </button>
                  </div>
                  {attachments.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {attachments.map(att => (
                        <div key={att.id} className="relative group rounded-lg overflow-hidden border border-zinc-200 bg-zinc-50 p-2 flex items-center gap-2">
                          <div className="w-8 h-8 bg-zinc-200 rounded flex items-center justify-center shrink-0">
                            {att.type === 'image' && <ImageIcon className="w-4 h-4 text-zinc-500" />}
                            {att.type === 'video' && <Video className="w-4 h-4 text-zinc-500" />}
                            {att.type === 'pdf' && <File className="w-4 h-4 text-zinc-500" />}
                          </div>
                          <span className="text-[10px] font-medium truncate flex-1">{att.name}</span>
                          <button onClick={() => removeAttachment(att.id)} className="p-1 text-zinc-400 hover:text-red-500">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Vælg tone</label>
                  <div className="grid grid-cols-2 gap-2">
                    {tones.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setTone(t.value)}
                        className={cn(
                          "px-3 py-2 rounded-xl text-xs font-semibold border transition-all",
                          tone === t.value
                            ? "bg-blue-600 border-blue-600 text-white shadow-md"
                            : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300"
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Styling Options */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Styling & Indhold</label>
                  <div className="space-y-2">
                    <button 
                      onClick={() => setUseEmojisInText(!useEmojisInText)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                        useEmojisInText ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-200 text-zinc-600"
                      )}
                    >
                      <span className="text-[11px] font-bold">1-3 Smileys i teksten</span>
                      <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center", useEmojisInText ? "bg-white border-white" : "border-zinc-300")}>
                        {useEmojisInText && <Check className="w-3 h-3 text-zinc-900" />}
                      </div>
                    </button>
                    <button 
                      onClick={() => setUseEmojisInBullets(!useEmojisInBullets)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                        useEmojisInBullets ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-200 text-zinc-600"
                      )}
                    >
                      <span className="text-[11px] font-bold">Emojis som punkter</span>
                      <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center", useEmojisInBullets ? "bg-white border-white" : "border-zinc-300")}>
                        {useEmojisInBullets && <Check className="w-3 h-3 text-zinc-900" />}
                      </div>
                    </button>
                    <button 
                      onClick={() => setIncludeHashtags(!includeHashtags)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                        includeHashtags ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-200 text-zinc-600"
                      )}
                    >
                      <span className="text-[11px] font-bold">Inkluder 2-4 hashtags</span>
                      <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center", includeHashtags ? "bg-white border-white" : "border-zinc-300")}>
                        {includeHashtags && <Check className="w-3 h-3 text-zinc-900" />}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Highlights Selector */}
                <div className="space-y-3 pt-2">
                  <button 
                    onClick={() => setShowHighlights(!showHighlights)}
                    className="w-full flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100 hover:bg-zinc-100 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-zinc-400" />
                      <span className="text-xs font-bold text-zinc-700">Vælg elementer at fremhæve</span>
                    </div>
                    {showHighlights ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <AnimatePresence>
                    {showHighlights && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-4 px-2"
                      >
                        {[
                          { label: 'Brancher', key: 'industries' as const, items: context.industries },
                          { label: 'Underbrancher', key: 'subIndustries' as const, items: context.subIndustries },
                          { label: 'Specialer', key: 'specialties' as const, items: context.specialties },
                          { label: 'Nicher', key: 'niches' as const, items: context.niches },
                          { label: 'Søgeord', key: 'keywords' as const, items: context.keywords },
                        ].map((section) => (
                          section.items.length > 0 && (
                            <div key={section.key} className="space-y-2">
                              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">{section.label}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {section.items.map(item => (
                                  <button
                                    key={item}
                                    onClick={() => toggleHighlight(section.key, item)}
                                    className={cn(
                                      "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all",
                                      selectedHighlights[section.key].includes(item)
                                        ? "bg-zinc-900 text-white border-zinc-900"
                                        : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                                    )}
                                  >
                                    {item}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleGenerate}
                    disabled={loading || isResearching || !topic}
                    className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-zinc-200"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    {mode === 'scratch' ? 'Generer Executive Post' : 'Optimer Opslag'}
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleDeepResearch}
                      disabled={loading || isResearching || (!result && !topic)}
                      className="py-4 bg-blue-50 text-blue-700 border border-blue-100 rounded-2xl font-bold hover:bg-blue-100 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {isResearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      Deep Research
                    </button>

                    <button
                      onClick={handleShowExample}
                      disabled={loading || isResearching}
                      className="py-4 bg-zinc-100 text-zinc-600 border border-zinc-200 rounded-2xl font-bold hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
                    >
                      <HelpCircle className="w-4 h-4" />
                      Se Eksempel
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Output */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden flex flex-col h-full min-h-[500px]">
                <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Færdigt Opslag</span>
                  <div className="flex items-center gap-2">
                    {result && (
                      <button 
                        onClick={() => saveDraft()}
                        className="p-2 hover:bg-zinc-200 rounded-lg text-zinc-600 transition-colors flex items-center gap-2 text-[10px] font-bold"
                      >
                        <Save className="w-4 h-4" />
                        Gem Kladde
                      </button>
                    )}
                    {result && (
                      <button 
                        onClick={() => setResult('')}
                        className="p-2 hover:bg-zinc-200 rounded-lg text-zinc-400 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 p-8 overflow-y-auto">
                  <AnimatePresence mode="wait">
                    {!result && !loading && (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                        <PenTool className="w-12 h-12 text-zinc-300" />
                        <p className="text-sm font-medium">Dit indhold genereres her.</p>
                      </div>
                    )}

                    {loading && (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        <p className="text-xs font-bold text-blue-600 animate-pulse uppercase tracking-widest">Ghostwriteren arbejder...</p>
                      </div>
                    )}

                    {isResearching && (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        <p className="text-xs font-bold text-blue-600 animate-pulse uppercase tracking-widest">Dybdegående research i gang...</p>
                      </div>
                    )}

                    {result && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex p-1 bg-zinc-100 rounded-lg">
                            <button
                              onClick={() => setIsEditing(false)}
                              className={cn(
                                "px-3 py-1.5 rounded-md text-[10px] font-bold transition-all",
                                !isEditing ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                              )}
                            >
                              Visning
                            </button>
                            <button
                              onClick={() => setIsEditing(true)}
                              className={cn(
                                "px-3 py-1.5 rounded-md text-[10px] font-bold transition-all",
                                isEditing ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                              )}
                            >
                              Rediger
                            </button>
                          </div>
                        </div>

                        {isEditing ? (
                          <textarea
                            className="w-full min-h-[400px] p-6 text-sm rounded-2xl bg-zinc-50 border border-zinc-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none font-medium leading-relaxed"
                            value={result}
                            onChange={(e) => setResult(e.target.value)}
                            placeholder="Rediger dit opslag her..."
                          />
                        ) : (
                          <div className="space-y-6">
                            {parseResult(result).map((part, idx) => (
                              <div key={idx} className={cn(
                                "p-6 rounded-2xl border relative group",
                                part.type === 'instruction' 
                                  ? "bg-amber-50 border-amber-100 text-amber-800 text-xs italic" 
                                  : "bg-white border-zinc-100 text-zinc-800 shadow-sm"
                              )}>
                                {part.label && (
                                  <div className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-40">
                                    {part.label}
                                  </div>
                                )}
                                <div className={cn(
                                  "whitespace-pre-wrap font-medium leading-relaxed",
                                  part.type === 'instruction' ? "text-amber-700" : "text-sm"
                                )}>
                                  {part.text}
                                </div>
                                {part.type === 'content' && (
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(part.text);
                                      setCopied(true);
                                      setTimeout(() => setCopied(false), 2000);
                                    }}
                                    className="absolute top-4 right-4 p-2 hover:bg-zinc-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    <Copy className="w-4 h-4 text-zinc-400" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="p-4 border-t border-zinc-100 bg-zinc-50/50 space-y-3">
                  <AnimatePresence>
                    {feedback && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-zinc-900 text-white text-[10px] font-bold rounded-full shadow-xl z-50 flex items-center gap-2"
                      >
                        <Check className="w-3 h-3 text-amber-400" />
                        {feedback}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {result && (
                    <div className="relative mb-2">
                      <input
                        type="text"
                        placeholder="Forfin med AI (f.eks. 'Gør den kortere', 'Mere provokerende')..."
                        className="w-full p-3 pr-12 rounded-xl bg-white border border-zinc-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner"
                        value={refinementPrompt}
                        onChange={(e) => setRefinementPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                      />
                      <button
                        onClick={handleRefine}
                        disabled={!refinementPrompt || loading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input 
                        type="datetime-local" 
                        className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={() => saveDraft(true)}
                      disabled={!result || !scheduledDate}
                      className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                      <Clock className="w-4 h-4" />
                      Planlæg
                    </button>
                  </div>
                  <button
                    onClick={copyToClipboard}
                    disabled={!result}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-bold hover:bg-zinc-50 transition-all disabled:opacity-50"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                    {copied ? 'Kopieret!' : 'Kopier til LinkedIn'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeView === 'preview' && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm"
          >
            <LinkedInPreview 
              text={result} 
              authorName={context.levels.join(' & ') || 'Executive'}
              authorHeadline={context.industries[0] || 'Executive Thought Leader'}
              attachments={attachments}
            />
          </motion.div>
        )}

        {activeView === 'plan' && (
          <motion.div
            key="plan"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {drafts.length === 0 && (
                <div className="col-span-full py-20 text-center space-y-4 bg-white rounded-3xl border border-dashed border-zinc-200">
                  <Calendar className="w-12 h-12 text-zinc-200 mx-auto" />
                  <p className="text-zinc-400 font-medium">Ingen gemte kladder eller planlagte opslag endnu.</p>
                </div>
              )}
              {drafts.map(draft => (
                <div key={draft.id} className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-md transition-all space-y-4 group">
                  <div className="flex items-start justify-between">
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      draft.scheduledDate ? "bg-blue-50 text-blue-600" : "bg-zinc-100 text-zinc-500"
                    )}>
                      {draft.scheduledDate ? 'Planlagt' : 'Kladde'}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => loadDraft(draft)} className="p-2 hover:bg-zinc-50 rounded-lg text-zinc-400 hover:text-zinc-900">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteDraft(draft.id)} className="p-2 hover:bg-zinc-50 rounded-lg text-zinc-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-sm line-clamp-1">{draft.topic}</h4>
                    <p className="text-xs text-zinc-500 line-clamp-3 leading-relaxed">{draft.content}</p>
                  </div>
                  <div className="pt-4 border-t border-zinc-50 flex items-center justify-between text-[10px] font-bold text-zinc-400">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {draft.scheduledDate ? new Date(draft.scheduledDate).toLocaleString('da-DK') : new Date(draft.updatedAt).toLocaleDateString('da-DK')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Layout className="w-3 h-3" />
                      {draft.attachments.length} medier
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
