import React, { useState, useEffect } from 'react';
import { 
  PenTool, 
  MessageSquare, 
  Search, 
  Briefcase, 
  Users, 
  BarChart3, 
  Monitor,
  ChevronRight,
  Menu,
  X,
  Linkedin,
  Settings as SettingsIcon,
  Crown,
  Sparkles
} from 'lucide-react';
import PostGenerator from './components/PostGenerator';
import CommentAssistant from './components/CommentAssistant';
import ThoughtLeaderDiscovery from './components/ThoughtLeaderDiscovery';
import CompetencyManager from './components/CompetencyManager';
import NetworkExpander from './components/NetworkExpander';
import ProfileAnalyzer from './components/ProfileAnalyzer';
import ProfileSettings from './components/ProfileSettings';
import ProfileOptimizer from './components/ProfileOptimizer';
import { ExecutiveContext, ExecutiveLevel } from './services/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Tab = 'post' | 'comment' | 'discovery' | 'competencies' | 'network' | 'analysis' | 'profil' | 'optimizer';

const DEFAULT_CONTEXT: ExecutiveContext = {
  levels: ['CEO'],
  titles: { 'CEO': ['CEO', 'Adm. Direktør'] },
  industries: [],
  subIndustries: [],
  specialties: [],
  niches: [],
  keywords: [],
  targetAudience: []
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('profil');
  const [prefilledTopic, setPrefilledTopic] = useState('');
  const [prefilledCommentText, setPrefilledCommentText] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [context, setContext] = useState<ExecutiveContext>(DEFAULT_CONTEXT);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  useEffect(() => {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "DIN_GEMINI_API_NØGLE_HER" || key === "") {
      setApiKeyMissing(true);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('executive_context');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration check for old context format
        let finalContext: ExecutiveContext;

        if (parsed.level && !parsed.levels) {
          finalContext = {
            levels: [parsed.level],
            titles: { [parsed.level]: [parsed.level] },
            industries: [parsed.industry || ''],
            subIndustries: [],
            specialties: [],
            niches: [parsed.niche || ''],
            keywords: [],
            targetAudience: Array.isArray(parsed.targetAudience) ? parsed.targetAudience : (parsed.targetAudience ? [parsed.targetAudience] : [])
          };
        } else if (parsed.industry && !parsed.industries) {
          // Migration for previous multi-level format
          finalContext = {
            ...parsed,
            industries: [parsed.industry],
            subIndustries: [],
            specialties: [],
            niches: [parsed.niche],
            keywords: [],
            targetAudience: Array.isArray(parsed.targetAudience) ? parsed.targetAudience : (parsed.targetAudience ? [parsed.targetAudience] : [])
          };
        } else {
          finalContext = {
            ...DEFAULT_CONTEXT,
            ...parsed,
            levels: Array.isArray(parsed.levels) ? parsed.levels : DEFAULT_CONTEXT.levels,
            industries: Array.isArray(parsed.industries) ? parsed.industries : DEFAULT_CONTEXT.industries,
            targetAudience: Array.isArray(parsed.targetAudience) ? parsed.targetAudience : (parsed.targetAudience ? [parsed.targetAudience] : [])
          };
        }
        setContext(finalContext);
      } catch (e) {
        console.error("Failed to parse context", e);
        setContext(DEFAULT_CONTEXT);
      }
    }
  }, []);

  useEffect(() => {
    const handleInsert = (e: any) => {
      const text = e.detail;
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'INSERT_COMMENT',
              text: text
            });
          }
        });
      }
    };

    const handleCreatePost = (e: any) => {
      setPrefilledTopic(e.detail.text);
      setActiveTab('post');
    };

    window.addEventListener('linkedin-copilot-insert', handleInsert);
    window.addEventListener('linkedin-copilot-create-post', handleCreatePost);

    // Listen for messages from Chrome Extension
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      const handleChromeMessage = (message: any) => {
        if (message.type === 'LINKEDIN_POST_TEXT') {
          setPrefilledCommentText(message.text);
          setActiveTab('comment');
        } else if (message.type === 'LINKEDIN_REWRITE_POST') {
          setPrefilledTopic(message.text);
          setActiveTab('post');
        } else if (message.type === 'ADD_THOUGHT_LEADER') {
          const newLeader = {
            id: `${Date.now()}`,
            name: message.data.name,
            headline: message.data.headline,
            reason: 'Tilføjet direkte fra LinkedIn',
            topics: [],
            connectionStatus: 'connected',
            lastPostDate: new Date().toISOString().split('T')[0],
            industry: 'LinkedIn Import',
            isFavorite: true
          };
          
          const saved = localStorage.getItem('linkedin_thought_leaders');
          const leaders = saved ? JSON.parse(saved) : [];
          const updated = [newLeader, ...leaders].slice(0, 50);
          localStorage.setItem('linkedin_thought_leaders', JSON.stringify(updated));
          
          // Trigger a re-render of Discovery if it's open
          window.dispatchEvent(new CustomEvent('thought-leaders-updated'));
          
          setActiveTab('discovery');
        }
      };
      chrome.runtime.onMessage.addListener(handleChromeMessage);
      return () => {
        window.removeEventListener('linkedin-copilot-insert', handleInsert);
        window.removeEventListener('linkedin-copilot-create-post', handleCreatePost);
        chrome.runtime.onMessage.removeListener(handleChromeMessage);
      };
    }

    return () => {
      window.removeEventListener('linkedin-copilot-insert', handleInsert);
      window.removeEventListener('linkedin-copilot-create-post', handleCreatePost);
    };
  }, []);

  const saveContext = (newContext: ExecutiveContext) => {
    setContext(newContext);
    localStorage.setItem('executive_context', JSON.stringify(newContext));
  };

  const tabs: { id: Tab; label: string; icon: any; description: string; premium?: boolean }[] = [
    { 
      id: 'post', 
      label: 'Executive Post', 
      icon: PenTool, 
      description: 'Ghostwriter til autoritære opslag',
      premium: true
    },
    { 
      id: 'comment', 
      label: 'Thought Leader Kommentering', 
      icon: MessageSquare, 
      description: 'Autentiske kommentarer med twist',
      premium: true
    },
    { 
      id: 'discovery', 
      label: 'Find Thought Leaders', 
      icon: Search, 
      description: 'Opdag indflydelsesrige stemmer' 
    },
    { 
      id: 'competencies', 
      label: 'Kompetence Mapping', 
      icon: Briefcase, 
      description: 'Administrer dine faglige nicher' 
    },
    { 
      id: 'network', 
      label: 'Udvid Netværk', 
      icon: Users, 
      description: 'Find og forbind med domæne-eksperter',
      premium: true
    },
    { 
      id: 'analysis', 
      label: '360Brew Analyse', 
      icon: BarChart3, 
      description: 'Profilanalyse og optimering' 
    },
    { 
      id: 'optimizer', 
      label: 'Profil Optimering', 
      icon: Sparkles, 
      description: 'CV-baseret LinkedIn optimering',
      premium: true
    },
    { 
      id: 'profil', 
      label: 'Executive Profil', 
      icon: SettingsIcon, 
      description: 'Definer dit niveau og domæne' 
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col lg:flex-row">
      {apiKeyMissing && (
        <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-6">
            <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto">
              <Sparkles className="w-10 h-10 text-amber-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Mangler API Nøgle</h2>
              <p className="text-zinc-500">
                For at bruge Executive Copilot skal du indsætte din Gemini API nøgle i filen <code className="bg-zinc-100 px-1 rounded">.env</code>.
              </p>
            </div>
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 text-left space-y-3">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Hurtig guide:</p>
              <ol className="text-sm text-zinc-600 space-y-2 list-decimal ml-4">
                <li>Åbn filen <code className="font-bold">.env</code> i din projektmappe.</li>
                <li>Indsæt din nøgle i stedet for <code className="text-amber-600">DIN_GEMINI_API_NØGLE_HER</code>.</li>
                <li>Gem filen og kør <code className="bg-zinc-200 px-1 rounded font-bold">npm run build</code>.</li>
                <li>Genindlæs udvidelsen i Chrome.</li>
              </ol>
            </div>
            <p className="text-[10px] text-zinc-400">
              Når du har gjort dette, skal du genindlæse udvidelsen i Chrome.
            </p>
          </div>
        </div>
      )}
      {/* Sidebar Navigation */}
      <aside className={cn(
        "bg-white border-r border-zinc-200 w-full lg:w-80 flex-shrink-0 transition-all duration-300 z-50 flex flex-col",
        isMobileMenuOpen ? "fixed inset-0" : "relative"
      )}>
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center shadow-lg shadow-zinc-100">
              <Crown className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tight text-zinc-900">Executive</h1>
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Thought Leader Copilot</p>
            </div>
          </div>
          <button 
            className="lg:hidden p-2 hover:bg-zinc-100 rounded-lg"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto flex-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setIsMobileMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl transition-all group relative",
                activeTab === tab.id 
                  ? "bg-zinc-900 text-white shadow-xl shadow-zinc-200" 
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
              )}
            >
              <tab.icon className={cn(
                "w-5 h-5 transition-transform group-hover:scale-110",
                activeTab === tab.id ? "text-amber-400" : "text-zinc-400"
              )} />
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold leading-none">{tab.label}</p>
                  {tab.premium && <Crown className="w-3 h-3 text-amber-500" />}
                </div>
                <p className="text-[10px] text-zinc-400 mt-1 font-medium">{tab.description}</p>
              </div>
              {activeTab === tab.id && (
                <ChevronRight className="w-4 h-4 ml-auto text-amber-400" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-zinc-100 bg-white/80 backdrop-blur-sm mt-auto">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 border border-zinc-100">
            <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center overflow-hidden">
              <img 
                src={context.profileImageUrl || `https://picsum.photos/seed/${context.name || 'executive'}/100/100`} 
                alt="Profile" 
                referrerPolicy="no-referrer" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold truncate">{context.name || context.levels.join(' & ') || 'Executive'}</p>
              <p className="text-[10px] text-zinc-500 truncate">{context.headline || context.industries[0] || 'Executive'}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {(context.levels || []).map(l => (
              <span key={l} className="px-2 py-0.5 bg-white border border-zinc-200 rounded-md text-[8px] font-bold text-zinc-500 uppercase">{l}</span>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'post' && <PostGenerator context={context} prefilledTopic={prefilledTopic} onClearPrefill={() => setPrefilledTopic('')} />}
            {activeTab === 'comment' && (
              <CommentAssistant 
                context={context} 
                prefilledText={prefilledCommentText} 
                onClearPrefill={() => setPrefilledCommentText('')} 
              />
            )}
            {activeTab === 'discovery' && <ThoughtLeaderDiscovery context={context} />}
            {activeTab === 'competencies' && <CompetencyManager />}
            {activeTab === 'network' && <NetworkExpander context={context} />}
            {activeTab === 'analysis' && <ProfileAnalyzer context={context} />}
            {activeTab === 'optimizer' && <ProfileOptimizer context={context} onSave={saveContext} />}
            {activeTab === 'profil' && <ProfileSettings context={context} onSave={saveContext} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
