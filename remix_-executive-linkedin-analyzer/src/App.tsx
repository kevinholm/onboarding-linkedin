/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { 
  Search, 
  ShieldCheck, 
  User, 
  Image as ImageIcon, 
  FileText, 
  Briefcase, 
  TrendingUp, 
  Award,
  ChevronRight,
  Loader2,
  AlertCircle,
  ExternalLink,
  Database,
  X,
  RefreshCw,
  Zap,
  Download,
  Save,
  Type as TypeIcon,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Target,
  CheckCircle2,
  History,
  Info,
  ArrowRight,
  Clock,
  List
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { suneTestData, marcusTestData, danielTestData, balderTestData, andersTestData } from './testData';

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set up PDF.js worker
if (typeof window !== 'undefined') {
  const workerUrl = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).toString();
  console.log('Setting up PDF.js worker with URL:', workerUrl);
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
}

// Types for the analysis result
interface SkillItem {
  id: string;
  name: string;
  endorsements?: number;
  type: 'core' | 'related';
}

const CATEGORY_ORDER = [
  'profileImage',
  'coverImage',
  'headline',
  'top',
  'about',
  'experience',
  'search',
  'proof',
  'brew'
];

interface SortableSkillItemProps {
  skill: SkillItem;
  index: number;
  isRegistered: boolean;
  onToggleType: () => void;
  onRemove: () => void;
  onToggleSelection: () => void;
  isSelected: boolean;
}

const SortableSkillItem = ({ 
  skill, 
  index, 
  isRegistered, 
  onToggleType, 
  onRemove, 
  onToggleSelection, 
  isSelected 
}: SortableSkillItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: skill.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.3 : 1
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`group flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-all border border-transparent ${isDragging ? 'border-emerald-500/50 bg-white/10 shadow-2xl' : 'hover:border-white/5'}`}
    >
      <div 
        {...attributes} 
        {...listeners} 
        className="cursor-grab active:cursor-grabbing p-1 opacity-0 group-hover:opacity-30 hover:opacity-100 transition-opacity"
      >
        <List className="w-3.5 h-3.5" />
      </div>
      <span className="text-[10px] font-mono opacity-20 w-4 text-right">{index + 1}</span>
      <div 
        onClick={onToggleType}
        className={`w-2 h-2 rounded-full shrink-0 cursor-pointer ${
          skill.type === 'core' 
            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' 
            : !isRegistered ? 'bg-red-500/40' : 'bg-white/20'
        }`} 
        title={skill.type === 'core' ? 'Kernekompetence' : 'Relateret kompetence'}
      />
      <span className={`text-[11px] flex-1 truncate ${
        skill.type === 'core' ? 'font-medium text-white/90' : 'text-white/50'
      } ${!isRegistered ? 'italic' : ''}`}>
        {skill.name}
        {!isRegistered && <span className="ml-2 text-[8px] text-red-500/60 uppercase font-bold tracking-tighter">Mangler</span>}
      </span>
      <button 
        onClick={onToggleSelection}
        className={`p-1.5 rounded-md transition-all ${isSelected ? 'bg-emerald-500/20 text-emerald-400 opacity-100' : 'opacity-0 group-hover:opacity-40 hover:opacity-100 text-white/40'}`}
        title="Fremhæv i profiltekst"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
      </button>
      <button 
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-40 hover:opacity-100 hover:text-red-400 transition-all p-1"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
};

interface SkillsStrategy {
  currentSkills: {
    about: string[];
    experience: string[];
    skillsSection: SkillItem[];
  };
  suggestedCoreSkills: string[];
  suggestedRelatedSkills: { [coreSkill: string]: string[] };
}

interface AnalysisLogEntry {
  timestamp: string;
  type: 'delta' | 'full';
  changedFields: string[];
  scoreBefore: number;
  scoreAfter: number;
  explanation?: string;
}

interface ProfileData {
  name: string;
  linkedinUrl: string;
  headline: string;
  about: string;
  profileImage: string | null;
  coverImage: string | null;
  experienceRaw: string;
  educationRaw: string;
  skillsRaw: string;
  recommendationsRaw: string;
  lastResult?: AnalysisResult | null;
  editableHeadlines?: string[];
  editableAboutTexts?: string[];
  editableAboutTexts_da?: string[];
  editableAboutTexts_en?: string[];
  editableExperienceTemplates?: ExperienceTemplate[][];
  editableExperienceTemplates_da?: ExperienceTemplate[][];
  editableExperienceTemplates_en?: ExperienceTemplate[][];
  selectedAboutIndex?: number | null;
  editableSkillsList?: SkillItem[];
  selectedSkillsForRewrite?: string[];
  cvText?: string | null;
  cvFileName?: string | null;
  pronouns?: string;
  lastAnalyzedSnapshot?: {
    headline: string;
    about: string;
    experienceRaw: string;
    educationRaw: string;
    skillsRaw: string;
    recommendationsRaw: string;
    profileImage: string | null;
    coverImage: string | null;
    linkedinUrl: string;
    pronouns: string;
  } | null;
  analysisLog?: AnalysisLogEntry[];
}

interface ScoreBreakdown {
  category: string;
  score: number;
  maxScore: number;
  label: string;
}

interface AuditFinding {
  category: string;
  label: string;
  rating: number; // 0-5
  findings: string[];
  criteria: string[]; // The criteria used for this specific assessment
}

interface ImprovementSuggestion {
  title: string;
  action: string;
  example?: string;
}

interface AboutVersion {
  title: string;
  text: string;
  skills: string[];
}

interface ExperienceTemplate {
  company: string;
  role: string;
  currentText: string;
  optimizedText: string;
  deficiencies: string[];
  improvementSuggestions: string[];
  skills: string[];
  useOptimized?: boolean;
}

interface ImprovementCategory {
  category: string;
  label: string;
  status: 'Perfekt' | 'Godkendt' | 'Forbedring påkrævet';
  score: number;
  maxScore: number;
  intro: string;
  suggestions: ImprovementSuggestion[];
  headlineProposals?: string[];
  headlineProposals_en?: string[];
  aboutVersions?: AboutVersion[];
  aboutVersions_en?: AboutVersion[];
  experienceTemplates?: ExperienceTemplate[];
  experienceTemplates_en?: ExperienceTemplate[];
  searchKeywords?: {
    pillar: string;
    missingKeywords: string[];
    recommendations: string[];
  }[];
  hardSkillsToImplement?: string[];
}

interface AnalysisResult {
  totalScore: number;
  strongest: string;
  middle: string;
  weakest: string;
  impact: string[];
  breakdown: ScoreBreakdown[];
  auditReport: AuditFinding[];
  improvementPlan: ImprovementCategory[];
  logicExplanation: {
    searchability: string;
    credibility: string;
  };
  skillsStrategy: SkillsStrategy;
  fullPrioritizedList: SkillItem[];
  deltaExplanation?: string;
}

export default function App() {
  // Profile Slots State
  const [activeProfileIndex, setActiveProfileIndex] = useState(() => {
    try {
      const saved = localStorage.getItem('exec_app_state_v2');
      if (saved) {
        const state = JSON.parse(saved);
        if (state.activeProfileIndex !== undefined) return state.activeProfileIndex;
      }
    } catch (e) {
      console.error('Failed to parse activeProfileIndex from localStorage', e);
    }
    return 0;
  });

  const [profiles, setProfiles] = useState<ProfileData[]>(() => {
    try {
      const saved = localStorage.getItem('exec_app_state_v2');
      if (saved) {
        const state = JSON.parse(saved);
        if (Array.isArray(state.profiles) && state.profiles.length === 5) {
          return state.profiles;
        }
      }
    } catch (e) {
      console.error('Failed to parse profiles from localStorage', e);
    }
    
    const emptyProfile: ProfileData = {
      name: '',
      linkedinUrl: '',
      headline: '',
      about: '',
      profileImage: null,
      coverImage: null,
      experienceRaw: '',
      educationRaw: '',
      skillsRaw: '',
      recommendationsRaw: '',
      lastResult: null,
      analysisLog: [],
      editableHeadlines: [],
      editableAboutTexts: [],
      editableExperienceTemplates: [],
      selectedAboutIndex: null,
      editableSkillsList: [],
      selectedSkillsForRewrite: [],
      cvText: null,
      cvFileName: null,
      pronouns: ''
    };
    
    return [
      { ...emptyProfile, name: 'Egen Profil' },
      { ...suneTestData, name: 'Sune' },
      { ...marcusTestData, name: 'Marcus' },
      { ...andersTestData, name: 'Anders' },
      { ...balderTestData, name: 'Balder' }
    ];
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'audit' | 'improvement'>('overview');
  const [selectedAboutIndex, setSelectedAboutIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [storageError, setStorageError] = useState<boolean>(false);
  const [targetLanguage, setTargetLanguage] = useState<'da' | 'en'>('da');
  const [showAnalysisHistory, setShowAnalysisHistory] = useState(false);
  const [lastAnalysisDelta, setLastAnalysisDelta] = useState<AnalysisLogEntry | null>(null);
  const [showDeltaModal, setShowDeltaModal] = useState(false);
  const [analyzingFields, setAnalyzingFields] = useState<string[]>([]);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  
  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      top: <ShieldCheck className="w-5 h-5" />,
      profileImage: <User className="w-5 h-5" />,
      coverImage: <ImageIcon className="w-5 h-5" />,
      headline: <TypeIcon className="w-5 h-5" />,
      about: <FileText className="w-5 h-5" />,
      experience: <Briefcase className="w-5 h-5" />,
      search: <TrendingUp className="w-5 h-5" />,
      proof: <Award className="w-5 h-5" />,
      brew: <Database className="w-5 h-5" />
    };
    return iconMap[category] || <ShieldCheck className="w-5 h-5" />;
  };
  
  const [editableHeadlines, setEditableHeadlines] = useState<string[]>([]);
  const [editableHeadlines_da, setEditableHeadlines_da] = useState<string[]>([]);
  const [editableHeadlines_en, setEditableHeadlines_en] = useState<string[]>([]);
  const [editableAboutTexts, setEditableAboutTexts] = useState<string[]>([]);
  const [editableAboutTexts_da, setEditableAboutTexts_da] = useState<string[]>([]);
  const [editableAboutTexts_en, setEditableAboutTexts_en] = useState<string[]>([]);
  const [editableExperienceTemplates, setEditableExperienceTemplates] = useState<ExperienceTemplate[][]>([]);
  const [editableExperienceTemplates_da, setEditableExperienceTemplates_da] = useState<ExperienceTemplate[][]>([]);
  const [editableExperienceTemplates_en, setEditableExperienceTemplates_en] = useState<ExperienceTemplate[][]>([]);
  const [editableSkillsList, setEditableSkillsList] = useState<SkillItem[]>([]);
  const [selectedSkillsForRewrite, setSelectedSkillsForRewrite] = useState<string[]>([]);
  const lastLoadedIndexRef = useRef(activeProfileIndex);

  const getSkillNameOnly = (name: string) => {
    return name.replace(/\s*\(\d+\)\s*$/, '').trim().toLowerCase();
  };

  const isSkillRegistered = (skillName: string) => {
    if (!result?.skillsStrategy?.currentSkills?.skillsSection) return false;
    const searchName = getSkillNameOnly(skillName);
    return result.skillsStrategy.currentSkills.skillsSection.some(
      cs => getSkillNameOnly(cs.name) === searchName
    );
  };

  const hasUnanalyzedChanges = () => {
    if (!currentProfile.lastAnalyzedSnapshot) return true;
    return (
      currentProfile.headline !== currentProfile.lastAnalyzedSnapshot.headline ||
      currentProfile.about !== currentProfile.lastAnalyzedSnapshot.about ||
      currentProfile.experienceRaw !== currentProfile.lastAnalyzedSnapshot.experienceRaw ||
      currentProfile.educationRaw !== currentProfile.lastAnalyzedSnapshot.educationRaw ||
      currentProfile.skillsRaw !== currentProfile.lastAnalyzedSnapshot.skillsRaw ||
      currentProfile.recommendationsRaw !== currentProfile.lastAnalyzedSnapshot.recommendationsRaw ||
      currentProfile.profileImage !== currentProfile.lastAnalyzedSnapshot.profileImage ||
      currentProfile.coverImage !== currentProfile.lastAnalyzedSnapshot.coverImage ||
      currentProfile.linkedinUrl !== currentProfile.lastAnalyzedSnapshot.linkedinUrl
    );
  };

  // Sync global states with current profile when switching
  useEffect(() => {
    const profile = profiles[activeProfileIndex];
    setResult(profile.lastResult || null);
    setEditableHeadlines(profile.editableHeadlines || []);
    setEditableAboutTexts(profile.editableAboutTexts || []);
    setEditableAboutTexts_da(profile.editableAboutTexts_da || []);
    setEditableAboutTexts_en(profile.editableAboutTexts_en || []);
    setEditableExperienceTemplates(profile.editableExperienceTemplates || []);
    setEditableExperienceTemplates_da(profile.editableExperienceTemplates_da || []);
    setEditableExperienceTemplates_en(profile.editableExperienceTemplates_en || []);
    setEditableSkillsList(profile.editableSkillsList || []);
    setSelectedAboutIndex(profile.selectedAboutIndex ?? null);
    setSelectedSkillsForRewrite(profile.selectedSkillsForRewrite || []);
    lastLoadedIndexRef.current = activeProfileIndex;
  }, [activeProfileIndex]);

  // Sync global states back to current profile when they change
  useEffect(() => {
    // Only update if we have an active profile and some data to save
    // AND we are not in the middle of switching (lastLoadedIndexRef matches)
    if (lastLoadedIndexRef.current !== activeProfileIndex) return;

    setProfiles(prev => {
      const current = prev[activeProfileIndex];
      // Avoid unnecessary updates if data is identical
      if (
        current.lastResult === result &&
        current.editableHeadlines === editableHeadlines &&
        current.editableAboutTexts === editableAboutTexts &&
        current.editableAboutTexts_da === editableAboutTexts_da &&
        current.editableAboutTexts_en === editableAboutTexts_en &&
        current.editableExperienceTemplates === editableExperienceTemplates &&
        current.editableExperienceTemplates_da === editableExperienceTemplates_da &&
        current.editableExperienceTemplates_en === editableExperienceTemplates_en &&
        current.editableSkillsList === editableSkillsList &&
        current.selectedAboutIndex === selectedAboutIndex &&
        current.selectedSkillsForRewrite === selectedSkillsForRewrite
      ) {
        return prev;
      }
      const next = [...prev];
      next[activeProfileIndex] = {
        ...current,
        lastResult: result,
        editableHeadlines,
        editableAboutTexts,
        editableAboutTexts_da,
        editableAboutTexts_en,
        editableExperienceTemplates,
        editableExperienceTemplates_da,
        editableExperienceTemplates_en,
        editableSkillsList,
        selectedAboutIndex,
        selectedSkillsForRewrite
      };
      return next;
    });
  }, [result, editableHeadlines, editableAboutTexts, editableExperienceTemplates, editableSkillsList, selectedAboutIndex, selectedSkillsForRewrite, activeProfileIndex]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      setEditableSkillsList((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const moveSkill = (index: number, direction: 'up' | 'down') => {
    const newList = [...editableSkillsList];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newList.length) return;
    [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
    setEditableSkillsList(newList);
  };

  const removeSkill = (id: string) => {
    setEditableSkillsList(prev => prev.filter(s => s.id !== id));
  };

  const toggleSkillType = (id: string) => {
    setEditableSkillsList(prev => prev.map(s => s.id === id ? { ...s, type: s.type === 'core' ? 'related' : 'core' } : s));
  };

  const addSkill = (name: string, type: 'core' | 'related' = 'related') => {
    if (editableSkillsList.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      setSuccessMessage(`"${name}" findes allerede på listen`);
      return;
    }
    if (editableSkillsList.length >= 100) {
      setError('Du kan højst have 100 kompetencer.');
      return;
    }
    const newSkill: SkillItem = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      type
    };
    setEditableSkillsList(prev => [...prev, newSkill]);
    setSuccessMessage(`"${name}" tilføjet som ${type === 'core' ? 'kernekompetence' : 'relateret kompetence'}`);
  };

  const [newSkillName, setNewSkillName] = useState('');

  const toggleSkillSelection = (name: string) => {
    setSelectedSkillsForRewrite(prev => 
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    );
  };

  // Persistence Effect
  useEffect(() => {
    const saveData = (forcePrune = false) => {
      setIsSaving(true);
      try {
        let profilesToSave = profiles;
        if (forcePrune) {
          // Prune results from all profiles except the active one to save space if storage is full
          profilesToSave = profiles.map((p, idx) => 
            idx === activeProfileIndex 
              ? p 
              : { 
                  ...p, 
                  lastResult: null, 
                  editableHeadlines: [], 
                  editableAboutTexts: [], 
                  editableExperienceTemplates: [] 
                }
          );
          console.warn('Storage quota exceeded. Pruned non-active profile results to save space.');
        }

        const state = {
          profiles: profilesToSave,
          activeProfileIndex
        };
        localStorage.setItem('exec_app_state_v2', JSON.stringify(state));
        setLastSaved(new Date());
        setStorageError(false);
      } catch (e) {
        if (!forcePrune) {
          // Try again with pruning
          saveData(true);
        } else {
          console.error('Failed to save to localStorage even after pruning', e);
          setStorageError(true);
        }
      } finally {
        // Artificial delay for visual feedback
        setTimeout(() => setIsSaving(false), 500);
      }
    };

    const timeoutId = setTimeout(() => saveData(), 1000);

    // Ensure save on window close
    const handleBeforeUnload = () => {
      saveData();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [profiles, activeProfileIndex]);

  const handleHeadlineChange = (index: number, value: string) => {
    const newHeadlines = [...editableHeadlines];
    newHeadlines[index] = value;
    setEditableHeadlines(newHeadlines);
  };

  const handleAboutChange = (index: number, value: string) => {
    const newAbouts = [...editableAboutTexts];
    newAbouts[index] = value;
    setEditableAboutTexts(newAbouts);
  };

  const handleExperienceChange = (vIdx: number, tIdx: number, field: keyof ExperienceTemplate, value: any) => {
    const newTemplates = [...editableExperienceTemplates];
    if (!newTemplates[vIdx]) newTemplates[vIdx] = [];
    newTemplates[vIdx][tIdx] = { ...newTemplates[vIdx][tIdx], [field]: value };
    setEditableExperienceTemplates(newTemplates);
  };

  const applyHeadline = (index: number) => {
    updateCurrentProfile({ headline: editableHeadlines[index] });
    setSuccessMessage('Headline opdateret');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const applyAboutAndExperience = (index: number) => {
    const aboutText = editableAboutTexts[index];
    const templates = editableExperienceTemplates[index];
    
    if (!aboutText || !templates) return;

    // Construct experience raw text from templates based on selection
    const experienceRaw = templates.map(t => {
      const text = t.useOptimized ? t.optimizedText : t.currentText;
      return `${t.role} | ${t.company}\n\n${text}`;
    }).join('\n\n---\n\n');

    updateCurrentProfile({ 
      about: aboutText,
      experienceRaw: experienceRaw
    });

    setSuccessMessage('Ændringer gemt på profilen');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const downloadExperience = (index: number) => {
    const templates = editableExperienceTemplates[index];
    if (!templates) return;

    const content = templates.map(t => {
      const text = t.useOptimized ? t.optimizedText : t.currentText;
      return `${t.role} | ${t.company}\n\n${text}`;
    }).join('\n\n---\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LinkedIn_Erfaring_Optimeret.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadFullProfile = () => {
    if (!result || selectedAboutIndex === null) return;
    
    const profile = profiles[activeProfileIndex];
    const about = editableAboutTexts[selectedAboutIndex];
    const experiences = editableExperienceTemplates[selectedAboutIndex];
    
    let content = `LINKEDIN FULL PROFILE EXPORT - 360BREW\n`;
    content += `========================================\n\n`;
    content += `NAVN: ${profile.name}\n`;
    content += `LINKEDIN URL: ${profile.linkedinUrl}\n\n`;
    content += `HEADLINE:\n`;
    content += `---------\n`;
    content += `${profile.headline}\n\n`;
    content += `OM-SEKTION:\n`;
    content += `-----------\n`;
    content += `${about}\n\n`;
    content += `ERFARING:\n`;
    content += `---------\n`;
    
    experiences.forEach(exp => {
      content += `VIRKSOMHED: ${exp.company}\n`;
      content += `ROLLE: ${exp.role}\n`;
      const text = exp.useOptimized ? exp.optimizedText : exp.currentText;
      content += `BESKRIVELSE:\n${text}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `full-linkedin-profile-${profile.name || 'user'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const [showReanalyzePrompt, setShowReanalyzePrompt] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState<'current' | 'all' | null>(null);

  const currentProfile = profiles[activeProfileIndex];

  const updateCurrentProfile = (updates: Partial<ProfileData>) => {
    setProfiles(prev => {
      const next = [...prev];
      next[activeProfileIndex] = { ...next[activeProfileIndex], ...updates };
      return next;
    });
  };

  const switchProfile = (index: number) => {
    if (index === activeProfileIndex) return;
    setActiveProfileIndex(index);
    setError(null);
  };

  const clearCurrentProfile = () => {
    // Using a custom modal would be better, but for now we'll stick to confirm as per guidelines (though guidelines say avoid window.confirm, I'll use a simple state-based one if possible, or just keep it simple)
    // Actually, guidelines say: "Do NOT use confirm(), window.confirm(), alert() or window.alert() in the code. The code is running in an iframe and the user will NOT see the confirmation dialog or alerts. Instead, use custom modal UI for these."
    // I should fix the existing window.confirm.
    setShowClearConfirm('current');
  };

  const clearAllProfiles = () => {
    setShowClearConfirm('all');
  };

  const clearAllResults = () => {
    setProfiles(prev => prev.map(p => ({
      ...p,
      lastResult: null,
      editableHeadlines: [],
      editableAboutTexts: [],
      editableExperienceTemplates: []
    })));
    setResult(null);
    setSuccessMessage('Alle analyse-resultater er ryddet for at frigøre plads.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const executeClear = () => {
    if (showClearConfirm === 'current') {
      updateCurrentProfile({
        name: profiles[activeProfileIndex].name || `Profil ${activeProfileIndex + 1}`,
        linkedinUrl: '',
        headline: '',
        about: '',
        profileImage: null,
        coverImage: null,
        experienceRaw: '',
        educationRaw: '',
        skillsRaw: '',
        recommendationsRaw: ''
      });
      setResult(null);
      setEditableHeadlines([]);
      setEditableAboutTexts([]);
      setEditableExperienceTemplates([]);
    } else if (showClearConfirm === 'all') {
      const emptyProfile: ProfileData = {
        name: '',
        linkedinUrl: '',
        headline: '',
        about: '',
        profileImage: null,
        coverImage: null,
        experienceRaw: '',
        educationRaw: '',
        skillsRaw: '',
        recommendationsRaw: ''
      };
      setProfiles([
        { ...emptyProfile, name: 'Profil 1' },
        { ...emptyProfile, name: 'Profil 2' },
        { ...emptyProfile, name: 'Profil 3' },
        { ...emptyProfile, name: 'Profil 4' },
        { ...emptyProfile, name: 'Profil 5' }
      ]);
      setResult(null);
      setActiveProfileIndex(0);
    }
    setShowClearConfirm(null);
  };

  // Helper to count endorsements in raw LinkedIn skills text
  const countSkillEndorsements = (text: string): number => {
    if (!text) return 0;
    // Look for patterns like "12 anerkendelser" or "12 endorsements"
    const matches = text.match(/(\d+)\s+(anerkendelser|endorsements)/gi);
    if (!matches) return 0;
    
    return matches.reduce((acc, curr) => {
      const num = parseInt(curr.split(/\s+/)[0], 10);
      return acc + (isNaN(num) ? 0 : num);
    }, 0);
  };

  // Helper to clean raw LinkedIn skills text
  const cleanLinkedInSkills = (text: string) => {
    if (!text) return "";
    // If it doesn't look like raw LinkedIn data (contains "Anerkend"), just return it
    if (!text.includes("Anerkend") && !text.includes("anerkendelser")) return text;

    const lines = text.split('\n');
    const cleanedSkills: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Skip empty lines or metadata lines
      if (!line || 
          line.startsWith("Anerkend") || 
          line.includes("anerkendelser") || 
          line.includes("kolleger hos") ||
          line.includes("fælles forbindelse") ||
          line === "Anerkend") {
        continue;
      }
      // If it's a clean line, it's likely a skill
      if (line.length > 1 && line.length < 50) {
        cleanedSkills.push(line);
      }
    }
    return Array.from(new Set(cleanedSkills)).join(", ");
  };

  // Helper to clean raw LinkedIn experience text
  const cleanLinkedInExperience = (text: string) => {
    if (!text) return "";
    // Remove "logo" text and other common artifacts
    return text
      .replace(/-logo/g, '')
      .replace(/·/g, '|')
      .split('\n')
      .filter(line => !line.includes("Se alle") && !line.includes("Vis mere"))
      .join('\n');
  };

  const restoreAllProfiles = () => {
    const emptyProfile: ProfileData = {
      name: 'Egen Profil',
      linkedinUrl: '',
      headline: '',
      about: '',
      profileImage: null,
      coverImage: null,
      experienceRaw: '',
      educationRaw: '',
      skillsRaw: '',
      recommendationsRaw: ''
    };
    const defaultProfiles: ProfileData[] = [
      emptyProfile,
      { ...suneTestData, name: 'Sune' },
      { ...marcusTestData, name: 'Marcus' },
      { ...andersTestData, name: 'Anders' },
      { ...balderTestData, name: 'Balder' }
    ];
    setProfiles(defaultProfiles);
    setActiveProfileIndex(0);
    setResult(null);
    setEditableHeadlines([]);
    setEditableAboutTexts([]);
    setEditableExperienceTemplates([]);
    setSuccessMessage('Alle profiler er gendannet (1 tom + 4 test-profiler).');
  };

  const loadTestData = () => {
    const testDataMap = [null, suneTestData, marcusTestData, andersTestData, balderTestData];
    const selectedTestData = testDataMap[activeProfileIndex];
    
    if (selectedTestData) {
      updateCurrentProfile({
        linkedinUrl: selectedTestData.linkedinUrl || '',
        headline: selectedTestData.headline || '',
        about: selectedTestData.about || '',
        experienceRaw: selectedTestData.experienceRaw || '',
        educationRaw: selectedTestData.educationRaw || '',
        skillsRaw: selectedTestData.skillsRaw || '',
        recommendationsRaw: selectedTestData.recommendationsRaw || '',
        profileImage: selectedTestData.profileImage || null,
        coverImage: selectedTestData.coverImage || null,
        lastAnalyzedSnapshot: null // Force full analysis on fresh data
      });
      
      setSuccessMessage(`Testdata indlæst for ${profiles[activeProfileIndex].name}`);
    } else if (activeProfileIndex === 0) {
      setSuccessMessage('Profil 1 er din egen tomme profil.');
    }
  };

  const resizeImage = (base64Str: string, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to 70% quality JPEG
      };
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'profileImage' | 'coverImage') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        // Downscale to save space and prevent QuotaExceededError
        // Profile images can be smaller, cover images need a bit more width
        const maxWidth = field === 'coverImage' ? 1200 : 600;
        const maxHeight = field === 'coverImage' ? 400 : 600;
        
        const resized = await resizeImage(base64, maxWidth, maxHeight);
        console.log(`Image uploaded and resized for ${field} in profile ${activeProfileIndex + 1}`);
        updateCurrentProfile({ [field]: resized });
        setSuccessMessage(`${field === 'profileImage' ? 'Profilbillede' : 'Coverbillede'} opdateret og gemt`);
        setTimeout(() => setSuccessMessage(null), 3000);
        // Clear input value so the same file can be uploaded again
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (field: 'profileImage' | 'coverImage') => {
    updateCurrentProfile({ [field]: null });
    setSuccessMessage(`${field === 'profileImage' ? 'Profilbillede' : 'Coverbillede'} fjernet`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setSuccessMessage(`Uploader og læser CV: ${file.name}...`);

    try {
      let text = '';
      if (file.type === 'application/pdf') {
        console.log('Reading PDF file...');
        const arrayBuffer = await file.arrayBuffer();
        try {
          const pdf = await pdfjsLib.getDocument({ 
            data: arrayBuffer,
            cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
            cMapPacked: true,
          }).promise;
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map((item: any) => item.str);
            fullText += strings.join(' ') + '\n';
          }
          text = fullText;
        } catch (pdfErr) {
          console.error('PDF.js Error:', pdfErr);
          if (pdfErr instanceof Error && pdfErr.message.includes('worker')) {
            throw new Error('PDF-læseren kunne ikke starte. Prøv venligst at genindlæse siden eller brug et andet format (Word/Tekst).');
          }
          throw pdfErr;
        }
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else {
        // Assume plain text for other formats
        text = await file.text();
      }

      if (text.trim().length < 50) {
        throw new Error('CV-teksten virker for kort eller kunne ikke læses korrekt.');
      }

      updateCurrentProfile({ 
        cvText: text,
        cvFileName: file.name
      });
      
      setSuccessMessage(`CV indlæst succesfuldt: ${file.name}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('CV Upload Error:', err);
      setError(`Kunne ikke læse CV: ${err instanceof Error ? err.message : 'Ukendt fejl'}`);
    } finally {
      setIsAnalyzing(false);
      if (cvInputRef.current) cvInputRef.current.value = '';
    }
  };

  const removeCV = () => {
    updateCurrentProfile({ cvText: null, cvFileName: null });
    setSuccessMessage('CV fjernet');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const resultsRef = useRef<HTMLDivElement>(null);

  const rewriteImprovementPlan = async (lang: 'da' | 'en') => {
    if (!result) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const apiKey = typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined;
      if (!apiKey) throw new Error('Gemini API key is missing.');
      
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `Du er en Senior Executive Auditor. 
Du skal nu OVERSÆTTE og OPTIMERE den eksisterende forbedringsplan til ${lang === 'da' ? 'DANSK' : 'ENGELSK'}.

VIGTIGT: 
1. Du skal KUN returnere 'aboutVersions' og 'experienceTemplates'.
2. Overhold alle FORMATERINGSKRAV (Hook, CAPS, Bullets, CTA).
3. Brug de samme kompetencer som i den oprindelige plan.

JSON STRUKTUR:
{
  "aboutVersions": [
    { "title": "...", "text": "...", "skills": ["..."] }
  ],
  "experienceTemplates": [
    { "company": "...", "role": "...", "currentText": "...", "optimizedText": "...", "deficiencies": ["..."], "improvementSuggestions": ["..."], "skills": ["..."] }
  ]
}`;

      const prompt = `Her er den nuværende analyse og forbedringsplan:
${JSON.stringify({
  about: result.improvementPlan.find(c => c.category === 'about'),
  experience: result.improvementPlan.find(c => c.category === 'experience')
})}

Generer nu en tilsvarende plan på ${lang === 'da' ? 'DANSK' : 'ENGELSK'} der følger alle 360Brew standarder.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: { 
          systemInstruction,
          temperature: 0,
          responseMimeType: "application/json"
        }
      });

      if (!response.text) throw new Error('AI returnerede et tomt svar.');
      
      const jsonMatch = response.text.match(/```json\n([\s\S]*?)\n```/) || 
                       response.text.match(/```([\s\S]*?)```/) ||
                       [null, response.text];
      const data = JSON.parse(jsonMatch[1] || response.text);
      
      if (data.headlineProposals) {
        setEditableHeadlines(data.headlineProposals);
        if (lang === 'da') setEditableHeadlines_da(data.headlineProposals);
        else setEditableHeadlines_en(data.headlineProposals);
      }
      
      if (data.aboutVersions) {
        const texts = data.aboutVersions.map((v: any) => v.text);
        setEditableAboutTexts(texts);
        if (lang === 'da') setEditableAboutTexts_da(texts);
        else setEditableAboutTexts_en(texts);
        
        const templates = (data.experienceTemplates || []).map((t: any) => ({ ...t, useOptimized: true }));
        const expTemplates = data.aboutVersions.map(() => [...templates]);
        setEditableExperienceTemplates(expTemplates);
        if (lang === 'da') setEditableExperienceTemplates_da(expTemplates);
        else setEditableExperienceTemplates_en(expTemplates);
        
        // Update the main result object as well to keep it in sync
        setResult(prev => {
          if (!prev) return null;
          const newPlan = prev.improvementPlan.map(cat => {
            if (cat.category === 'about') return { ...cat, aboutVersions: data.aboutVersions };
            if (cat.category === 'experience') return { ...cat, experienceTemplates: data.experienceTemplates };
            return cat;
          });
          return { ...prev, improvementPlan: newPlan };
        });
      }
    } catch (err) {
      console.error("Rewrite error:", err);
      setError("Kunne ikke skifte sprog automatisk. Prøv at køre analysen igen.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLanguageSwitch = async (lang: 'da' | 'en') => {
    if (lang === targetLanguage || isAnalyzing) return;
    
    const prevLang = targetLanguage;
    setTargetLanguage(lang);
    
    // Check if we already have the data for this language
    const hasData = lang === 'da' 
      ? editableAboutTexts_da.length > 0 
      : editableAboutTexts_en.length > 0;
      
    if (hasData) {
      if (lang === 'da') {
        setEditableHeadlines(editableHeadlines_da);
        setEditableAboutTexts(editableAboutTexts_da);
        setEditableExperienceTemplates(editableExperienceTemplates_da);
      } else {
        setEditableHeadlines(editableHeadlines_en);
        setEditableAboutTexts(editableAboutTexts_en);
        setEditableExperienceTemplates(editableExperienceTemplates_en);
      }
      
      // Also update the result object to reflect the switched language data
      setResult(prev => {
        if (!prev) return null;
        const newPlan = prev.improvementPlan.map(cat => {
          if (cat.category === 'about') {
            return { ...cat, aboutVersions: cat.aboutVersions?.map((v, i) => ({ ...v, text: lang === 'da' ? editableAboutTexts_da[i] : editableAboutTexts_en[i] })) };
          }
          // Note: experience templates are more complex to sync back perfectly without storing the full objects
          return cat;
        });
        return { ...prev, improvementPlan: newPlan };
      });
    } else if (result) {
      await rewriteImprovementPlan(lang);
    }
  };

  const resetAnalysisHistory = () => {
    updateCurrentProfile({ analysisLog: [] });
    setIsConfirmingReset(false);
  };

  const analyzeProfile = async (isFullAudit: boolean = false) => {
    if (!currentProfile.headline || !currentProfile.about || !currentProfile.experienceRaw) {
      setError('Udfyld venligst Headline, Om og din Erfaring (kopier gerne direkte fra LinkedIn).');
      return;
    }

    const scoreBefore = result?.totalScore || 0;
    console.log(`Starting analysis with gemini-3.1-flash-lite-preview (${isFullAudit ? 'Full Audit' : 'Delta Update'})...`);
    setIsAnalyzing(true);
    setError(null);
    // Bevare nuværende tab hvis vi opdaterer
    if (!result) setActiveTab('overview');

    try {
      const apiKey = typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined;
      if (!apiKey) {
        throw new Error('Gemini API key is missing. Please check your environment variables.');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Determine what changed
      const changedFields: string[] = [];
      if (currentProfile.lastAnalyzedSnapshot && !isFullAudit) {
        if (currentProfile.headline !== currentProfile.lastAnalyzedSnapshot.headline) changedFields.push('Headline');
        if (currentProfile.about !== currentProfile.lastAnalyzedSnapshot.about) changedFields.push('Om-tekst');
        if (currentProfile.experienceRaw !== currentProfile.lastAnalyzedSnapshot.experienceRaw) changedFields.push('Erfaring');
        if (currentProfile.educationRaw !== currentProfile.lastAnalyzedSnapshot.educationRaw) changedFields.push('Uddannelse');
        if (currentProfile.skillsRaw !== currentProfile.lastAnalyzedSnapshot.skillsRaw) changedFields.push('Kompetencer');
        if (currentProfile.recommendationsRaw !== currentProfile.lastAnalyzedSnapshot.recommendationsRaw) changedFields.push('Anbefalinger');
        if (currentProfile.profileImage !== currentProfile.lastAnalyzedSnapshot.profileImage) changedFields.push('Profilbillede');
        if (currentProfile.coverImage !== currentProfile.lastAnalyzedSnapshot.coverImage) changedFields.push('Coverbillede');
        if (currentProfile.linkedinUrl !== currentProfile.lastAnalyzedSnapshot.linkedinUrl) changedFields.push('LinkedIn URL');
        if (currentProfile.pronouns !== currentProfile.lastAnalyzedSnapshot.pronouns) changedFields.push('Pronominer');
      }

      const isDelta = changedFields.length > 0 && !isFullAudit;
      setAnalyzingFields(isDelta ? changedFields : ['Komplet Profil Survey']);
      
      const deltaContext = isDelta 
        ? `\n\nDETEKTEREDE ÆNDRINGER SIDEN SIDST: ${changedFields.join(', ')}. Fokuser primært på at gen-analysere disse områder og deres betydning for den samlede score.`
        : '';

      const systemInstruction = `Du er en Senior Executive Auditor. Din bibel er "Guide til opdatering af LinkedIn-profil". 
Vurder profilen EKSTREMT kritisk og objektivt baseret på 360Brew-algoritmerne. 

${isFullAudit ? 'DO A FULL FRESH AUDIT: Ignorer tidligere resultater hvis de findes, og lav en helt ny 100% grundig vurdering af alle tværgående sammenhænge (især 360Brew alignment).' : 'ULTRA-FAST DELTA-ANALYSE: Hvis du modtager tidligere resultater, skal du bruge dem som reference og kun opdatere de dele der er påvirket af ændringer. Du skal bevare de eksisterende scorer for alle felter du IKKE analyserer direkte, medmindre ændringen har en voldsom afledt effekt.'}${deltaContext}

VIGTIGT VED DELTA-ANALYSE:
Hvis du ændrer den samlede score markant (> 5 point) baseret på små ændringer (f.eks. kun et billede), skal du forklare HVORFOR i feltet 'deltaExplanation'. Er det fordi den nye ændring låser op for en bonus (f.eks. Executive Signal), eller fordi den tidligere score var fejlbehæftet? Vær ærlig.

VIGTIGT: Du skal generere alle forslag og tekster på BÅDE DANSK OG ENGELSK.
- For 'about' kategorien skal du returnere 'aboutVersions' (Dansk) og 'aboutVersions_en' (Engelsk).
- For 'experience' kategorien skal du returnere 'experienceTemplates' (Dansk) og 'experienceTemplates_en' (Engelsk).
- Headline forslag skal også være på begge sprog (flet dem ind i headlineProposals).

VIGTIGE REGLER OM SCORING OG AUDIT:
1. DETERMINISTISK & KRITISK SCORING: Du skal være objektiv, men streng. En score på 100/100 er "Elite" og kræver absolut perfektion. Du må IKKE give fuld score som standard.
2. "FOLLOWED ADVICE" BONUS: Hvis brugerens nuværende tekst følger din tidligere struktur (Hook, CAPS, Bullets, CTA) 100%, kan du give høj score, men træk stadig point hvis indholdet mangler substans eller målbare resultater.
3. MAX POINT kriterier (Vær streng her):
   - Headline: 10/10 hvis strukturen [Niveau] | [Branche] | [Keywords] | [One-liner] er fulgt TIL PUNKT OG PRIKKE.
   - About: 15/15 hvis 4-linjers Hook (med blank linje 2), CAPS-overskrifter, Bullets, CTA og Kompetence-liste er til stede OG teksten er fængslende.
   - Experience: 15/15 hvis HVER ENESTE rolle har 4-linjers Hook, CAPS-overskrifter (ANSVAR, RESULTATER, SCOPE) og MÅLBARE resultater (tal, %, valuta). Hvis blot én rolle mangler tal, kan scoren MAX være 12/15.
   - Profile Image: 5/5 KUN hvis det er et professionelt billede (vasket baggrund, god belysning, øjenkontakt, smil) og overholder alle tekniske krav. Du SKAL validere at personen på profilbilledet stemmer overens med personens navn og valgte pronominer. Hvis der er en tydelig uoverensstemmelse (f.eks. et billede af en mand på en profil med navnet "Mette" og pronominer "She/Her"), skal dette betragtes som en KRITISK FEJL. Det giver automatisk 0/5 i profileImage og påvirker Executive Signal (MAX 1/5 i top).
   - Cover Image: 5/5 KUN hvis det indeholder en personlig one-liner, der er direkte relateret til branchen, nicher, kernekompetencer eller søgeord. Branding af virksomhedslogo eller brug af standard corporate one-liners er positivt og giver god score (3-4/5), men aldrig MAX point.
   - Top (Executive Signal): 5/5 KUN hvis Profilbillede, Coverbillede og Headline alle har opnået MAX point, OG URL'en er ren (optimeret). Hvis URL'en IKKE er optimeret, kan denne kategori MAX få 3/5. Denne kategori skal afspejle et samlet "Executive" førstehåndsindtryk.
4. Vær kritisk overfor manglende data: Træk point hvis der mangler elementer (f.eks. ingen tal i resultater, ingen CTA, forkert Hook-struktur). 
5. KOMPETENCE-SCORING: For at opnå 25/25 i 'brew' (360Brew Alignment), SKAL profilen have 90-100 strategisk valgte kompetencer. Hvis der er under 50, skal scoren være under 10/25.
6. LINKEDIN TAKSONOMI: Du SKAL sikre dig, at alle foreslåede kompetencer findes i LinkedIns officielle taksonomi. 

VÆGTET POINTFORDELING (Total 100p):
1. profileImage (Profilbillede): 5p.
2. coverImage (Coverbillede): 5p.
3. headline (Headline): 10p.
4. top (Executive Signal): 5p.
5. about (Om-sektion): 15p.
6. experience (Erfaring): 15p.
7. search (Søgbarhed): 10p. (Vurder om de rigtige keywords er til stede i Headline, About og Experience).
8. proof (Troværdighed): 10p. (Vurder anbefalinger, anerkendelser og målbare resultater).
9. brew (360Brew Alignment): 25p.
   - Her vurderes den strategiske brug af kompetencer (100 stk målet) og konsistensen på tværs af hele profilen.

VURDERING AF COVERBILLEDE (DETALJER):
1. BRANDING VS. PERSONLIGT: Virksomhedslogo og standard slogans er gode til at vise tilhørsforhold, men for en "Elite" lederprofil skal coverbilledet også kommunikere personlig autoritet og niche. Derfor kræves en personlig, fagligt relevant one-liner for 5/5.
2. KONTAKTINFO: Det er en stærk anbefaling (især hvis man søger headhunter-kontakt/salg) at have diskret kontaktinfo direkte i billedet.
3. PLACERING: Det anbefales at placere kontaktinfo nede i højre side (set i forhold til profilbilledets placering), så det er tydeligt men ikke dominerende. Giv dette som forbedringsforslag til de fleste, men træk ikke point hvis det mangler, så længe de øvrige 5/5 kriterier er mødt.

VIGTIGT OM SCORING:
- En profil med 100/100 skal være fejlfri. Hvis du finder blot én forbedringsmulighed i din auditReport, kan den samlede score IKKE være 100.
- Vær ærlig. Hvis en profil er "God", skal den have 70-80. Hvis den er "Elite", skal den have 90+. 100 er forbeholdt de absolut bedste.

CV INTEGRATION & KONSISTENS (KRITISK):
1. BRUG CV DATA: Hvis der er vedhæftet et CV, SKAL du bruge dette som den primære kilde til at optimere 'aboutVersions' og 'experienceTemplates'. CV'et indeholder ofte flere detaljer og resultater end LinkedIn-profilen.
2. 360BREW KONSISTENS: De 10-15 valgte KERNEKOMPETENCER skal optræde naturligt i BÅDE Om-sektionen (About), Erfaringerne (Experience) og Kompetence-listen. Dette er afgørende for 360Brew-algoritmen.
3. NATURLIG INTEGRATION: Kompetencerne skal ikke bare listes; de skal væves ind i beskrivelserne af ansvar og resultater, hvor det giver mening.

KOMPETENCE-STRATEGI (360BREW HIERARKI):
1. Konverter den rå liste af kompetencer til formatet: [Navn] (hvis der er anbefalinger, så tilføj: ([Antal])). Du SKAL inkludere ABSOLUT ALLE kompetencer fra den rå liste i 'skillsSection', især dem med anerkendelser. Hvis brugeren har 50 kompetencer på LinkedIn, skal alle 50 være i 'skillsSection'.
2. Identificer nuværende brug af kompetencer på tværs af: Om-tekst, Erfaring (seneste 2-3 afsnit) og Kompetence-sektionen.
3. Du SKAL generere en 'fullPrioritizedList' med PRÆCIS 100 kompetencer i følgende hierarkiske rækkefølge:
   - Rank 1-2: TOP KERNEKOMPETENCER (De 2 absolut vigtigste).
   - Rank 3-10: KERNEKOMPETENCER (8 stk).
   - Rank 11-15: YDERLIGERE KERNEKOMPETENCER (5 stk).
   - Rank 16-100: RELATERBARE KOMPETENCER (85 stk):
       - Rank 16-25: Relateret direkte til TOP 2 (8-10 stk).
       - Rank 26-32: Relateret direkte til de næste 8 kernekompetencer (5-7 stk).
       - Rank 33-100: Relevante kompetencer og søgeord der understøtter profilen generelt.
4. NATURLIG INTEGRATION (KRITISK):
   - Du SKAL bruge de 10-15 kernekompetencer (Rank 1-15) naturligt i dine forslag til Om-tekst (About) og Erfaring (Experience).
   - Brug også relevante synonymer/relaterede kompetencer fra Rank 16-32, især hvor de understøtter TOP 2 eller de efterfølgende 8.
5. Vurderingen af 'brew' (360Brew Alignment) skal baseres på denne balance og konsistens.
6. VIGTIGT: Navnene i 'fullPrioritizedList' skal matche navnene i 'skillsSection' (inklusive anerkendelser i parentes) for de kompetencer, brugeren allerede har.

JSON OUTPUT KRAV FOR IMPROVEMENTPLAN:
1. Dine forslag SKAL altid være 10/10 eksempler på 360Brew-standarden.
2. Alle 'aboutVersions' og 'experienceTemplates' i din improvementPlan SKAL følge de nedenstående FORMATERINGSKRAV.
3. Du SKAL returnere et 'skillsStrategy' objekt og en 'fullPrioritizedList' (array af 100 SkillItem objekter).

JSON STRUKTUR FOR SKILLS:
"skillsStrategy": {
  "currentSkills": {
    "about": ["skill1", "skill2"],
    "experience": ["skill1", "skill3"],
    "skillsSection": [{"id": "1", "name": "Skill (5)", "endorsements": 5, "type": "core"}]
  },
  "suggestedCoreSkills": ["Core1", "Core2"],
  "suggestedRelatedSkills": {
    "Core1": ["Rel1", "Rel2"],
    "Core2": ["Rel3", "Rel4"]
  }
},
"fullPrioritizedList": [
  {"id": "s1", "name": "Core1", "type": "core"},
  {"id": "s2", "name": "Rel1", "type": "related"}
  ... (op til 100 stk i prioriteret rækkefølge)
]
kunne kopiere direkte for at opnå max point.

FORMATERINGSKRAV (KRITISK):
1. Headline: [Niveau] | [Branche] | [Keywords] | [One-liner]. Max 220 anslag.
2. Om-sektion (About): 
   - SKAL starte med et stærkt HOOK på præcis 4 linjer.
   - HOOK EKSEMPEL (Linje 2 er blank):
     Linje 1: [Stærk åbningsreplik med keywords]
     Linje 2: 
     Linje 3: [Nysgerrighedsskabende opfølgning]
     Linje 4: [Linguistisk Hook / Curiosity Gap: En sætning der tvinger læseren til at klikke "Se mere" uden eksplicit at sige "Læs mere herunder". F.eks. "Men de største resultater kom fra en uventet kilde...", "Her er de 3 principper, der ændrede alt...", "Det startede med en udfordring, de fleste overser..."]
   - Sætningerne i Hooket SKAL skabe et "curiosity gap", der gør det umuligt ikke at klikke på "Se mere". Undgå floskler som "Læs mere herunder".
   - SKAL have 2 linjeskift (\n\n) efter Hooket før resten af teksten starter.
   - SKAL have 2 linjeskift (\n\n) INDEN hver CAPS-overskrift.
   - SKAL bruge CAPS-overskrifter (f.eks. HVAD JEG GØR, MIN BAGGRUND, RESULTATER).
   - Hver sektion SKAL have 1-2 linjers prosa efterfulgt af 3-5 konkrete punkter (bullets).
   - SKAL afsluttes med en klar CTA (Call to Action).
   - SKAL afsluttes med en sektion: "KOMPETENCER: [Kompetence 1] | [Kompetence 2] ... (5-7 stk)".
   - Max 2600 anslag totalt.
   - Alle dine 3 'aboutVersions' og 3 'aboutVersions_en' SKAL overholde disse krav 100% og repræsentere 15/15 point.
3. Erfaring: 
   - DU SKAL opdele erfaringsafsnittet i individuelle roller.
   - Hver rolle SKAL starte med sit eget HOOK (samme 4-linjers struktur med blank linje som i Om-sektionen).
   - Brug derefter CAPS-overskrifter (ANSVAR, RESULTATER, SCOPE).
   - Resultater SKAL være målbare (tal, %, valuta).
   - Max 2000 anslag pr. rolle.
   - Dine 'optimizedText' forslag SKAL repræsentere 15/15 point og integrere de 10-15 kernekompetencer naturligt.
   - Indarbejd relevante søgeord og kompetencer naturligt i teksten.

STRUKTUR FOR IMPROVEMENTPLAN:
- "top", "profileImage", "coverImage": "suggestions" (array af objekter).
- "headline": "headlineProposals" (array af PRÆCIS 3 strings på DANSK) OG "headlineProposals_en" (array af PRÆCIS 3 strings på ENGELSK).
- "about": "aboutVersions" (array af PRÆCIS 3 objekter på DANSK) OG "aboutVersions_en" (array af PRÆCIS 3 objekter på ENGELSK).
- "experience": "experienceTemplates" (array for DANSK) OG "experienceTemplates_en" (array for ENGELSK) for ABSOLUT SAMTLIGE roller i brugerens profil - du må IKKE udelade nogen, uanset hvor gamle de er. Hvis der er 10 roller, skal der være 10 objekter pr. sprog. Hvert objekt SKAL have:
    - "company": (Virksomhedsnavn)
    - "role": (Jobtitel)
    - "currentText": (Den FULDE nuværende tekst fra brugerens profil for denne specifikke rolle. DU MÅ IKKE FORKORTE DENNE TEKST. Den skal være 100% identisk med kilden.)
    - "optimizedText": (Den foreslåede optimerede tekst. Brug CAPS-overskrifter som ANSVAR, RESULTATER, SCOPE. Resultater skal være målbare. Integrer de 15 kernekompetencer naturligt.)
    - "deficiencies": (array af strings med hvad der mangler i den nuværende tekst)
    - "improvementSuggestions": (array af strings med konkrete forslag til hvordan man forbedrer denne sektion)
    - "skills": (array af 5-7 relevante kompetencer for denne rolle)

Returner et JSON objekt med: totalScore, strongest, middle, weakest, impact, breakdown, auditReport, improvementPlan, logicExplanation.
Du SKAL inkludere alle 9 kategorier i BÅDE breakdown og auditReport i den rækkefølge de er angivet under VÆGTET POINTFORDELING.`;

      const skillsContext = selectedSkillsForRewrite.length > 0 
        ? `\n\nBRUGEREN ØNSKER AT FREMHÆVE FØLGENDE KOMPETENCER: ${selectedSkillsForRewrite.join(', ')}. Sørg for at disse er integreret naturligt i alle 'aboutVersions' og 'optimizedText' forslag.`
        : '';

      const previousAnalysisContext = currentProfile.lastResult 
        ? (isFullAudit 
            ? `\n\nTIDLIGERE SCORE VAR: ${currentProfile.lastResult.totalScore}. Lav en frisk vurdering nu.`
            : `\n\nTIDLIGERE ANALYSE (BRUG SOM REFERENCE FOR GENBRUG): ${JSON.stringify(currentProfile.lastResult)}`)
        : '';

      const parts: any[] = [
        { text: `ANALYSER DENNE LINKEDIN PROFIL OG GENERER EN KOMPLET FORBEDRINGSPLAN.${skillsContext}${previousAnalysisContext}
        
        VIGTIGT: Du SKAL inkludere SAMTLIGE erhvervserfaringer (Experience roles) som findes i profilen. Hvis brugeren har haft 5 jobs, skal du generere 5 'experienceTemplates' objekter. Du må IKKE kun tage den seneste. Dette er et absolut krav.
        
        PROFIL DATA:
        NAVN: ${currentProfile.name}
        PRONOMINER: ${currentProfile.pronouns || 'Ikke angivet'}
        LINKEDIN URL: ${currentProfile.linkedinUrl}
        HEADLINE: ${currentProfile.headline}
        OM-TEKST: ${currentProfile.about}
        ERFARING: ${currentProfile.experienceRaw}
        UDDANNELSE: ${currentProfile.educationRaw}
        KOMPETENCER: ${currentProfile.skillsRaw}
        ANBEFALINGER: ${currentProfile.recommendationsRaw}
        ${currentProfile.cvText ? `\n\nVEDHÆFTET CV DATA (Brug dette til at optimere både Om-tekst, erfaringsafsnit og kompetence-strategi):\n${currentProfile.cvText}` : ''}` }
      ];

      if (currentProfile.profileImage) {
        parts.push({ inlineData: { mimeType: "image/jpeg", data: currentProfile.profileImage.split(',')[1] } });
        parts.push({ text: "Profilbillede til vurdering." });
      }
      if (currentProfile.coverImage) {
        parts.push({ inlineData: { mimeType: "image/jpeg", data: currentProfile.coverImage.split(',')[1] } });
        parts.push({ text: "Coverbillede til vurdering." });
      }

      console.log("AI request sent (Ultra Fast Delta), waiting for response...");
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: { parts },
        config: { 
          systemInstruction,
          temperature: 0,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              totalScore: { type: Type.NUMBER, description: "Samlet score ud af 100" },
              strongest: { type: Type.STRING, description: "Navnet på den stærkeste kategori" },
              middle: { type: Type.STRING, description: "Navnet på den gennemsnitlige kategori" },
              weakest: { type: Type.STRING, description: "Navnet på den svageste kategori" },
              impact: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "4 punkter om hvad en opdatering vil betyde"
              },
              breakdown: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    score: { type: Type.NUMBER, description: "Vægtet score (f.eks. 16/20 eller 8/10)" },
                    maxScore: { type: Type.NUMBER, description: "Max vægtet score for kategorien" },
                    label: { type: Type.STRING }
                  },
                  required: ["category", "score", "maxScore", "label"]
                }
              },
              auditReport: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    label: { type: Type.STRING },
                    rating: { type: Type.NUMBER, description: "0-5 stars" },
                    findings: { type: Type.ARRAY, items: { type: Type.STRING } },
                    criteria: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["category", "label", "rating", "findings", "criteria"]
                }
              },
              improvementPlan: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    label: { type: Type.STRING },
                    status: { type: Type.STRING, enum: ['Perfekt', 'Godkendt', 'Forbedring påkrævet'] },
                    score: { type: Type.NUMBER },
                    maxScore: { type: Type.NUMBER },
                    intro: { type: Type.STRING },
                    suggestions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          action: { type: Type.STRING },
                          example: { type: Type.STRING }
                        },
                        required: ["title", "action"]
                      }
                    },
                    headlineProposals: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Kun for 'headline' kategorien. PRÆCIS 3 strings på DANSK."
                    },
                    headlineProposals_en: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Kun for 'headline' kategorien. PRÆCIS 3 strings på ENGELSK."
                    },
                    aboutVersions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          text: { type: Type.STRING },
                          skills: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["title", "text", "skills"]
                      },
                      description: "Kun for 'about' kategorien. SKAL indeholde PRÆCIS 3 forskellige versioner på DANSK."
                    },
                    aboutVersions_en: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          text: { type: Type.STRING },
                          skills: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["title", "text", "skills"]
                      },
                      description: "Kun for 'about' kategorien. SKAL indeholde PRÆCIS 3 forskellige versioner på ENGELSK."
                    },
                    experienceTemplates: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          company: { type: Type.STRING },
                          role: { type: Type.STRING },
                          currentText: { type: Type.STRING },
                          optimizedText: { type: Type.STRING },
                          deficiencies: { type: Type.ARRAY, items: { type: Type.STRING } },
                          improvementSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                          skills: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["company", "role", "currentText", "optimizedText", "deficiencies", "improvementSuggestions", "skills"]
                      },
                      description: "Kun for 'experience' kategorien. SKAL indeholde alle roller på DANSK."
                    },
                    experienceTemplates_en: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          company: { type: Type.STRING },
                          role: { type: Type.STRING },
                          currentText: { type: Type.STRING },
                          optimizedText: { type: Type.STRING },
                          deficiencies: { type: Type.ARRAY, items: { type: Type.STRING } },
                          improvementSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                          skills: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["company", "role", "currentText", "optimizedText", "deficiencies", "improvementSuggestions", "skills"]
                      },
                      description: "Kun for 'experience' kategorien. SKAL indeholde alle roller på ENGELSK."
                    }
                  },
                  required: ["category", "label", "status", "score", "maxScore", "intro", "suggestions"]
                }
              },
              logicExplanation: {
                type: Type.OBJECT,
                properties: {
                  searchability: { type: Type.STRING },
                  credibility: { type: Type.STRING }
                },
                required: ["searchability", "credibility"]
              },
              skillsStrategy: {
                type: Type.OBJECT,
                properties: {
                  currentSkills: {
                    type: Type.OBJECT,
                    properties: {
                      about: { type: Type.ARRAY, items: { type: Type.STRING } },
                      experience: { type: Type.ARRAY, items: { type: Type.STRING } },
                      skillsSection: { 
                        type: Type.ARRAY, 
                        items: { 
                          type: Type.OBJECT,
                          properties: {
                            id: { type: Type.STRING },
                            name: { type: Type.STRING, description: "Navnet på kompetencen. Hvis der er anbefalinger, så tilføj dem i parentes, f.eks. 'Projektledelse (12)'. Hvis 0 anbefalinger, så bare 'Projektledelse'." },
                            endorsements: { type: Type.NUMBER },
                            type: { type: Type.STRING }
                          },
                          required: ["id", "name", "type"]
                        } 
                      }
                    },
                    required: ["about", "experience", "skillsSection"]
                  },
                  suggestedCoreSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                  suggestedRelatedSkills: { type: Type.OBJECT }
                },
                required: ["currentSkills", "suggestedCoreSkills", "suggestedRelatedSkills"]
              },
              fullPrioritizedList: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING, description: "Navnet på kompetencen. Hvis der er anbefalinger, så tilføj dem i parentes, f.eks. 'Projektledelse (12)'. Hvis 0 anbefalinger, så bare 'Projektledelse'." },
                    endorsements: { type: Type.NUMBER },
                    type: { type: Type.STRING }
                  },
                  required: ["id", "name", "type"]
                }
              },
              deltaExplanation: { type: Type.STRING, description: "Forklaring på hvorfor scoren har ændret sig (især ved delta-analyse)." }
            },
            required: ["totalScore", "strongest", "middle", "weakest", "impact", "breakdown", "auditReport", "improvementPlan", "logicExplanation", "skillsStrategy", "fullPrioritizedList"]
          }
        }
      });

      console.log("AI response received:", response);

      if (!response.text) {
        throw new Error('AI returnerede et tomt svar.');
      }

      let data: AnalysisResult;
      try {
        // Strip markdown code blocks if present
        const jsonMatch = response.text.match(/```json\n([\s\S]*?)\n```/) || 
                         response.text.match(/```([\s\S]*?)```/) ||
                         [null, response.text];
        const rawJson = jsonMatch[1] || response.text;
        
        data = JSON.parse(rawJson) as AnalysisResult;
      } catch (parseError) {
        console.error('JSON Parse Error:', response.text);
        throw new Error('Kunne ikke læse AI-svaret. Prøv igen.');
      }
      
      // Helper to clean text fields within the data object
      const deepClean = (obj: any): any => {
        if (typeof obj === 'string') {
          // Replace literal "\n" strings with actual newlines if the AI double-escaped them
          return obj.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
        }
        if (Array.isArray(obj)) return obj.map(deepClean);
        if (obj !== null && typeof obj === 'object') {
          const newObj: any = {};
          for (const key in obj) {
            newObj[key] = deepClean(obj[key]);
          }
          return newObj;
        }
        return obj;
      };

      data = deepClean(data);

      const logEntry: AnalysisLogEntry = {
        timestamp: new Date().toISOString(),
        type: isFullAudit ? 'full' : 'delta',
        changedFields: isDelta ? changedFields : ['Komplet Audit'],
        scoreBefore,
        scoreAfter: data.totalScore,
        explanation: data.deltaExplanation
      };
      
      // Update the snapshots for future delta detection
      updateCurrentProfile({
        lastResult: data,
        lastAnalyzedSnapshot: {
          headline: currentProfile.headline,
          about: currentProfile.about,
          experienceRaw: currentProfile.experienceRaw,
          educationRaw: currentProfile.educationRaw,
          skillsRaw: currentProfile.skillsRaw,
          recommendationsRaw: currentProfile.recommendationsRaw,
          profileImage: currentProfile.profileImage,
          coverImage: currentProfile.coverImage,
          linkedinUrl: currentProfile.linkedinUrl,
          pronouns: currentProfile.pronouns || ''
        },
        analysisLog: [...(currentProfile.analysisLog || []), logEntry]
      });
      
      setLastAnalysisDelta(logEntry);
      if (logEntry.type === 'delta') setShowDeltaModal(true);
      
      // Initialize editable states from the new result
      const headlineCat = data.improvementPlan.find(c => c.category === 'headline');
      const aboutCat = data.improvementPlan.find(c => c.category === 'about');
      
      if (headlineCat) {
        if (headlineCat.headlineProposals) {
          setEditableHeadlines_da(headlineCat.headlineProposals);
          if (targetLanguage === 'da') setEditableHeadlines(headlineCat.headlineProposals);
        }
        if (headlineCat.headlineProposals_en) {
          setEditableHeadlines_en(headlineCat.headlineProposals_en);
          if (targetLanguage === 'en') setEditableHeadlines(headlineCat.headlineProposals_en);
        }
      }
      
      if (aboutCat) {
        if (aboutCat.aboutVersions) {
          const texts_da = aboutCat.aboutVersions.map(v => v.text);
          setEditableAboutTexts_da(texts_da);
          if (targetLanguage === 'da') setEditableAboutTexts(texts_da);
        }
        if (aboutCat.aboutVersions_en) {
          const texts_en = aboutCat.aboutVersions_en.map(v => v.text);
          setEditableAboutTexts_en(texts_en);
          if (targetLanguage === 'en') setEditableAboutTexts(texts_en);
        }
      }

      const expCat = data.improvementPlan.find(c => c.category === 'experience');
      if (expCat) {
        if (expCat.experienceTemplates) {
          const templates_da = expCat.experienceTemplates.map(t => ({ ...t, useOptimized: true }));
          const wrapped_da = (aboutCat?.aboutVersions || [null, null, null]).map(() => [...templates_da]);
          setEditableExperienceTemplates_da(wrapped_da);
          if (targetLanguage === 'da') setEditableExperienceTemplates(wrapped_da);
        }
        if (expCat.experienceTemplates_en) {
          const templates_en = expCat.experienceTemplates_en.map(t => ({ ...t, useOptimized: true }));
          const wrapped_en = (aboutCat?.aboutVersions_en || [null, null, null]).map(() => [...templates_en]);
          setEditableExperienceTemplates_en(wrapped_en);
          if (targetLanguage === 'en') setEditableExperienceTemplates(wrapped_en);
        }
      }

      setSelectedAboutIndex(0);

      if (data.fullPrioritizedList) {
        setEditableSkillsList(data.fullPrioritizedList);
      }

      setResult(data);
      setSuccessMessage(isFullAudit ? "Fuld profil-audit gennemført!" : "Målrettet profil-opdatering gennemført!");
      
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      console.error(err);
      setError(`Der opstod en fejl: ${err instanceof Error ? err.message : 'Ukendt fejl'}. Prøv evt. uden billeder eller med mindre tekst.`);
    } finally {
      setIsAnalyzing(false);
      setAnalyzingFields([]);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white/20 relative overflow-hidden">
      {/* Background Graphics */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[150px] rounded-full animate-pulse delay-700" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.03)_0%,transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />
        
        {/* Subtle Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[110] px-6 md:px-8 py-3 md:py-4 bg-emerald-500 text-black font-bold rounded-full shadow-2xl flex items-center gap-3 w-[calc(100%-2rem)] md:w-auto max-w-max text-center justify-center"
          >
            <ShieldCheck className="w-5 h-5" />
            {successMessage}
          </motion.div>
        )}

        {showReanalyzePrompt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0A0A0A] border border-white/10 p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-2xl"
            >
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-light">Opdater analysen?</h3>
              <p className="text-sm text-white/40 leading-relaxed">
                Du har nu opdateret din profil. Vil du køre en ny analyse for at se hvordan ændringerne påvirker din samlede score?
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    setShowReanalyzePrompt(false);
                    analyzeProfile();
                  }}
                  className="w-full py-4 bg-white text-black rounded-xl font-bold uppercase tracking-widest hover:bg-white/90 transition-all"
                >
                  Ja, opdater nu
                </button>
                <button 
                  onClick={() => setShowReanalyzePrompt(false)}
                  className="w-full py-4 bg-white/5 text-white/60 rounded-xl font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Nej tak, jeg fortsætter
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showClearConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClearConfirm(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-[#111] border border-white/10 p-8 rounded-3xl max-w-sm w-full shadow-2xl space-y-6"
            >
              <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center">
                <AlertCircle className="text-red-500 w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Er du helt sikker?</h3>
                <p className="text-white/40 text-sm leading-relaxed">
                  {showClearConfirm === 'current' 
                    ? 'Dette vil rydde alle data for den nuværende profil-slot. Handlingen kan ikke fortrydes.' 
                    : 'Dette vil rydde data for ALLE 5 profil-slots. Du starter helt forfra.'}
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowClearConfirm(null)}
                  className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs uppercase tracking-widest transition-all"
                >
                  Annuller
                </button>
                <button 
                  onClick={executeClear}
                  className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs uppercase tracking-widest transition-all font-bold"
                >
                  Ryd Data
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <header className="border-b border-white/10 py-4 md:py-6 px-4 md:px-8 flex justify-between items-center sticky top-0 bg-[#050505]/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 md:w-8 md:h-8 bg-white rounded-sm flex items-center justify-center">
            <ShieldCheck className="text-black w-3 h-3 md:w-5 md:h-5" />
          </div>
          <span className="text-xs md:text-sm font-semibold tracking-[0.2em] uppercase">Executive Analytics</span>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4 mr-4">
            {storageError ? (
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2 text-red-500 text-[8px] uppercase tracking-widest bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                  <X className="w-3 h-3" />
                  <span>Lager Fyldt / Fejl</span>
                </div>
                <span className="text-[7px] text-red-400/60 uppercase tracking-widest">Prøv 'Ryd Resultater' for at frigøre plads</span>
              </div>
            ) : isSaving ? (
              <div className="flex items-center gap-2 text-emerald-500 text-[8px] uppercase tracking-widest animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Gemmer...</span>
              </div>
            ) : lastSaved ? (
              <div className="flex items-center gap-2 text-white/30 text-[8px] uppercase tracking-widest">
                <ShieldCheck className="w-3 h-3" />
                <span>Alt Gemt Lokalt</span>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-6">
            {/* Profile Switcher */}
            <div className="flex flex-col items-end gap-1">
              <span className="hidden md:block text-[8px] uppercase tracking-[0.2em] opacity-30 mr-2">Vælg Profil Slot</span>
              <div className="flex items-center bg-white/5 rounded-lg p-1 border border-white/10">
                {[0, 1, 2, 3, 4].map((idx) => (
                  <button
                    key={idx}
                    onClick={() => switchProfile(idx)}
                    className={`px-2 md:px-4 py-1.5 md:py-2 rounded-md text-[9px] md:text-[10px] uppercase tracking-widest transition-all relative flex flex-col items-center gap-1 ${
                      activeProfileIndex === idx 
                        ? 'bg-white text-black font-bold shadow-lg shadow-white/10' 
                        : 'text-white/40 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className="max-w-[40px] md:max-w-none truncate">{profiles[idx].name || (idx + 1)}</span>
                    {profiles[idx].headline && (
                      <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <nav className="hidden md:flex gap-6 text-[10px] uppercase tracking-widest">
              <button onClick={() => setResult(null)} className="opacity-40 hover:opacity-100 transition-opacity">Formular</button>
              <div className="h-4 w-px bg-white/10" />
              <button onClick={clearAllResults} className="text-amber-400/40 hover:text-amber-400 transition-opacity">Ryd Resultater</button>
              <button onClick={clearCurrentProfile} className="text-red-400/40 hover:text-red-400 transition-opacity">Ryd Slot</button>
              <button onClick={clearAllProfiles} className="text-red-500/40 hover:text-red-500 transition-opacity font-bold">Ryd Alle</button>
            </nav>

            <button 
              onClick={() => window.open(window.location.href, '_blank')}
              className="md:hidden flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-full text-[8px] uppercase tracking-widest"
            >
              <ExternalLink className="w-3 h-3" />
              Preview
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-20">
        <div className={`${result ? 'flex flex-col' : 'grid lg:grid-cols-2'} gap-20`}>
          {/* Left Column: Form */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className={`${result ? 'w-full max-w-3xl mx-auto' : 'space-y-12'}`}
          >
            <div>
              <h1 className="text-4xl md:text-7xl font-light leading-[0.9] tracking-tighter mb-8">
                Executive <br />
                <span className="italic font-serif">LinkedIn</span> <br />
                Builder.
              </h1>
              <p className="text-white/60 text-lg max-w-md leading-relaxed">
                Indtast din profilinformation manuelt for at få den mest præcise strategiske analyse.
              </p>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest opacity-40">LinkedIn Profil URL (Valgfri)</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20" />
                    <input 
                      type="text" 
                      value={currentProfile.linkedinUrl}
                      onChange={(e) => updateCurrentProfile({ linkedinUrl: e.target.value })}
                      placeholder="https://www.linkedin.com/in/dit-navn/"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-6 focus:outline-none focus:border-white/30 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest opacity-40">Coverbillede (LinkedIn format 4:1)</label>
                  <div className="flex flex-col items-center justify-center aspect-[4/1] bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/10 transition-all overflow-hidden relative group">
                    {currentProfile.coverImage ? (
                      <div className="relative w-full h-full group">
                        <img src={currentProfile.coverImage} className="w-full h-full object-cover" alt="Cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-all">
                          <button 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); coverInputRef.current?.click(); }}
                            className="text-[10px] uppercase tracking-widest hover:text-white transition-colors"
                          >
                            Skift Cover
                          </button>
                          <button 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeImage('coverImage'); }}
                            className="bg-red-500/20 hover:bg-red-500/40 text-red-400 px-3 py-1 rounded text-[8px] uppercase tracking-widest transition-all"
                          >
                            Fjern
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="flex flex-col items-center gap-2 w-full h-full justify-center"
                        onClick={() => coverInputRef.current?.click()}
                      >
                        <ImageIcon className="w-6 h-6 opacity-20" />
                        <span className="text-[8px] uppercase tracking-widest opacity-20">Upload Cover (1584 x 396)</span>
                      </div>
                    )}
                    <input 
                      ref={coverInputRef}
                      key={`cover-${activeProfileIndex}`} 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleImageUpload(e, 'coverImage')} 
                    />
                  </div>
                </div>

                <div className="flex gap-6 items-start">
                  <div className="space-y-2 w-32">
                    <label className="text-[10px] uppercase tracking-widest opacity-40">Profilbillede</label>
                    <div className="flex flex-col items-center justify-center aspect-square bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/10 transition-all overflow-hidden relative group">
                      {currentProfile.profileImage ? (
                        <div className="relative w-full h-full group">
                          <img src={currentProfile.profileImage} className="w-full h-full object-cover" alt="Profile" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-all">
                            <button 
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); profileInputRef.current?.click(); }}
                              className="text-[10px] uppercase tracking-widest hover:text-white transition-colors"
                            >
                              Skift
                            </button>
                            <button 
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeImage('profileImage'); }}
                              className="bg-red-500/20 hover:bg-red-500/40 text-red-400 px-3 py-1 rounded text-[8px] uppercase tracking-widest transition-all"
                            >
                              Fjern
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="flex flex-col items-center justify-center w-full h-full"
                          onClick={() => profileInputRef.current?.click()}
                        >
                          <ImageIcon className="w-6 h-6 opacity-20" />
                        </div>
                      )}
                      <input 
                        ref={profileInputRef}
                        key={`profile-${activeProfileIndex}`} 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleImageUpload(e, 'profileImage')} 
                      />
                      <input 
                        ref={cvInputRef}
                        key={`cv-${activeProfileIndex}`}
                        type="file" 
                        accept=".pdf,.doc,.docx,.txt" 
                        className="hidden" 
                        onChange={handleCVUpload} 
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-2 pt-6">
                    <p className="text-[10px] leading-relaxed opacity-40 italic">
                      Tip: AI'en vurderer den tekniske kvalitet af det fulde billede. Sørg for at dine billeder er skarpe og i høj opløsning for at opnå en høj score.
                    </p>
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest opacity-40">Profil Navn</label>
                    <input 
                      type="text" 
                      value={currentProfile.name}
                      onChange={(e) => updateCurrentProfile({ name: e.target.value })}
                      placeholder="F.eks. Marcus"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 focus:outline-none focus:border-white/30 transition-all font-bold text-white uppercase tracking-wider text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest opacity-40">Pronominer (Pronouns)</label>
                    <select 
                      value={currentProfile.pronouns || ''}
                      onChange={(e) => updateCurrentProfile({ pronouns: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 focus:outline-none focus:border-white/30 transition-all text-xs font-medium text-white appearance-none"
                    >
                      <option value="" className="bg-[#111]">Vælg (Valgfrit som på LinkedIn)</option>
                      <option value="She/Her" className="bg-[#111]">She/Her</option>
                      <option value="He/Him" className="bg-[#111]">He/Him</option>
                      <option value="They/Them" className="bg-[#111]">They/Them</option>
                      <option value="Custom" className="bg-[#111]">Custom / Andet</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase tracking-widest opacity-40">Headline</label>
                    <span className={`text-[8px] font-mono ${currentProfile.headline.length > 220 ? 'text-red-400' : 'text-white/30'}`}>
                      {currentProfile.headline.length} / 220
                    </span>
                  </div>
                  <input 
                    type="text" 
                    value={currentProfile.headline}
                    onChange={(e) => updateCurrentProfile({ headline: e.target.value })}
                    placeholder="F.eks. CEO | Strategic Leader | Board Member"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 focus:outline-none focus:border-white/30 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase tracking-widest opacity-40">Om (Summary)</label>
                    <span className={`text-[8px] font-mono ${currentProfile.about.length > 2600 ? 'text-red-400' : 'text-white/30'}`}>
                      {currentProfile.about.length} / 2600
                    </span>
                  </div>
                  <textarea 
                    value={currentProfile.about}
                    onChange={(e) => updateCurrentProfile({ about: e.target.value })}
                    placeholder="Din professionelle pitch..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 focus:outline-none focus:border-white/30 transition-all min-h-[150px] resize-none"
                  />
                </div>
              </div>

              {/* Experience */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest opacity-40">Erfaring (Kopier direkte fra LinkedIn)</label>
                <textarea 
                  value={currentProfile.experienceRaw}
                  onChange={(e) => updateCurrentProfile({ experienceRaw: e.target.value })}
                  placeholder="Indsæt din fulde erhvervserfaring her..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 focus:outline-none focus:border-white/30 transition-all min-h-[250px] resize-none text-sm leading-relaxed"
                />
              </div>

              {/* Education & Skills */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest opacity-40">Uddannelse (Kopier direkte fra LinkedIn)</label>
                  <textarea 
                    value={currentProfile.educationRaw}
                    onChange={(e) => updateCurrentProfile({ educationRaw: e.target.value })}
                    placeholder="Indsæt din uddannelseshistorik her..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 focus:outline-none focus:border-white/30 transition-all min-h-[120px] resize-none text-sm leading-relaxed"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest opacity-40">Kompetencer (Kopier direkte fra LinkedIn)</label>
                  <textarea 
                    value={currentProfile.skillsRaw}
                    onChange={(e) => updateCurrentProfile({ skillsRaw: e.target.value })}
                    placeholder="Indsæt dine kompetencer her..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 focus:outline-none focus:border-white/30 transition-all min-h-[100px] resize-none text-sm leading-relaxed"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest opacity-40">Anbefalinger (Social Proof - Kopier fra LinkedIn)</label>
                  <textarea 
                    value={currentProfile.recommendationsRaw}
                    onChange={(e) => updateCurrentProfile({ recommendationsRaw: e.target.value })}
                    placeholder="Indsæt modtagne anbefalinger her..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 focus:outline-none focus:border-white/30 transition-all min-h-[100px] resize-none text-sm leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {result && !isAnalyzing ? (
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <button 
                        onClick={() => analyzeProfile(false)}
                        disabled={isAnalyzing}
                        className={`flex-1 rounded-xl py-5 font-semibold uppercase tracking-widest active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-[10px] ${
                          hasUnanalyzedChanges() 
                            ? 'bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400' 
                            : 'bg-white/10 hover:bg-white/20 border border-white/20 text-white'
                        }`}
                      >
                        <Zap className={`w-4 h-4 ${hasUnanalyzedChanges() ? 'animate-pulse text-yellow-500 fill-yellow-500' : 'text-white/40'}`} />
                        Hurtig Opdatering
                      </button>
                      <button 
                        onClick={() => analyzeProfile(true)}
                        disabled={isAnalyzing}
                        className="flex-1 bg-white text-black rounded-xl py-5 font-semibold uppercase tracking-widest hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-[10px]"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Fuld Audit (360Brew)
                      </button>
                    </div>
                    <p className="text-[9px] text-center opacity-40 uppercase tracking-widest leading-relaxed">
                      Vælg 'Hurtig' for nylige rettelser, eller 'Fuld' for en dybdegående 360-graders gennemsgang.
                    </p>
                  </div>
                ) : (
                  <button 
                    onClick={() => analyzeProfile(true)}
                    disabled={isAnalyzing}
                    className="w-full bg-white text-black rounded-xl py-5 font-semibold uppercase tracking-widest hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analyserer...
                      </>
                    ) : (
                      <>
                        Kør Analyse
                        <ChevronRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                )}
              </div>

              <button 
                onClick={loadTestData}
                className="w-full bg-white/5 border border-white/10 text-white/40 hover:text-white/100 hover:bg-white/10 py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest"
              >
                <Database className="w-3 h-3" />
                Indlæs / Gendan Testdata ({['Egen Profil', 'Sune', 'Marcus', 'Anders', 'Balder'][activeProfileIndex]})
              </button>

              <button 
                onClick={restoreAllProfiles}
                className="w-full bg-red-500/5 border border-red-500/10 text-red-400/40 hover:text-red-400/100 hover:bg-red-500/10 py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest"
              >
                <RefreshCw className="w-3 h-3" />
                Gendan Alle 5 Profiler til Standard
              </button>

              {successMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs"
                >
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <p className="font-medium">{successMessage}</p>
                </motion.div>
              )}

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs"
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-bold uppercase tracking-widest text-[10px]">Fejl opstået</p>
                    <p className="leading-relaxed">{error}</p>
                    {error.includes('quota') && (
                      <p className="text-[10px] opacity-60 mt-2">Dette skyldes typisk for meget data i browserens hukommelse. Prøv knappen 'Ryd Resultater' øverst til højre.</p>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Right Column: Results */}
          <div ref={resultsRef} className={`${result ? 'w-full' : 'lg:sticky lg:top-32 h-fit'}`}>
            <AnimatePresence mode="wait">
              {!result && !isAnalyzing && (
                <motion.div 
                  key="placeholder"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="aspect-square border border-white/10 rounded-3xl flex flex-col items-center justify-center p-12 text-center relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                  <Search className="w-12 h-12 mb-6 opacity-10" />
                  <p className="text-sm uppercase tracking-[0.3em] opacity-20">Venter på data</p>
                </motion.div>
              )}

              {isAnalyzing && !result && (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="aspect-square border border-white/10 rounded-3xl flex flex-col items-center justify-center p-12 text-center"
                >
                  <div className="relative w-32 h-32 mb-12">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 border-2 border-white/5 border-t-white/40 rounded-full"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-10 h-10 animate-spin opacity-20" />
                    </div>
                  </div>
                  <h3 className="text-xl font-light mb-2">Analyserer Executive Signal</h3>
                  <p className="text-[10px] uppercase tracking-[0.3em] opacity-40 animate-pulse">Vurderer ledelsestyngde og markedsværdi...</p>
                </motion.div>
              )}

              {result && (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-12 relative ${isAnalyzing ? 'opacity-60 grayscale-[0.5] pointer-events-none' : ''}`}
                >
                  {isAnalyzing && (
                    <div className="absolute top-4 right-8 flex flex-col items-end gap-2 z-50">
                      <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
                        <Loader2 className="w-3 h-3 animate-spin opacity-40" />
                        <span className="text-[8px] uppercase tracking-widest opacity-40">Opdaterer analyse...</span>
                      </div>
                      {analyzingFields.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex flex-wrap justify-end gap-1 max-w-[200px]"
                        >
                          {analyzingFields.map((f, i) => (
                            <span key={i} className="text-[7px] uppercase tracking-tighter px-1.5 py-0.5 bg-yellow-500/10 text-yellow-500/60 border border-yellow-500/20 rounded">
                              {f}
                            </span>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-4 md:gap-8 mb-6 md:mb-8 border-b border-white/10 overflow-x-auto no-scrollbar">
                    {(['overview', 'audit', 'improvement'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3 md:pb-4 text-[9px] md:text-[10px] uppercase tracking-[0.2em] transition-all relative whitespace-nowrap ${
                          activeTab === tab ? 'text-white opacity-100' : 'text-white/40 hover:opacity-100'
                        }`}
                      >
                        {tab === 'overview' ? 'Overblik' : tab === 'audit' ? 'Audit' : 'Forbedring'}
                        {activeTab === tab && (
                          <motion.div 
                            layoutId="activeTab"
                            className="absolute bottom-0 left-0 right-0 h-[1px] bg-white"
                          />
                        )}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {activeTab === 'overview' && (
                      <motion.div 
                        key="overview"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-12"
                      >
                        <div className="flex justify-between items-end">
                          <div>
                            <h2 className="text-[10px] uppercase tracking-[0.3em] opacity-40 mb-3">Executive Score</h2>
                            <div className="flex items-baseline gap-2">
                              <span className="text-6xl md:text-8xl font-light tracking-tighter">{result.totalScore}</span>
                              <span className="text-2xl opacity-10">/100</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-4">
                            <button
                              onClick={downloadFullProfile}
                              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] uppercase tracking-widest transition-all"
                            >
                              <Download className="w-3 h-3" />
                              Download Fuld Profil (.txt)
                            </button>
                            {(currentProfile.analysisLog?.length || 0) > 0 && (
                              <button
                                onClick={() => setShowAnalysisHistory(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] uppercase tracking-widest transition-all text-yellow-400"
                              >
                                <History className="w-3 h-3" />
                                Vis Change Log
                              </button>
                            )}
                            <div className="text-right">
                              <div className="text-[10px] uppercase tracking-[0.2em] opacity-40 mb-2">Status</div>
                              <div className={`text-xs font-medium uppercase tracking-widest px-4 py-2 rounded-full border ${
                                result.totalScore >= 80 ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' :
                                result.totalScore >= 60 ? 'border-amber-500/20 text-amber-400 bg-amber-500/5' :
                                'border-red-500/20 text-red-400 bg-red-500/5'
                              }`}>
                                {result.totalScore >= 80 ? 'Elite Profil' : result.totalScore >= 60 ? 'Godt Fundament' : 'Kritisk Optimering'}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-8">
                          <div className="flex justify-between items-end">
                            <h3 className="text-[10px] uppercase tracking-[0.2em] opacity-30">Kategorinedbrydning</h3>
                            <span className="text-[10px] opacity-20 italic">Baseret på 9 executive parametre</span>
                          </div>
                          <div className="grid gap-6">
                            {[...result.breakdown]
                              .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category))
                              .map((item, idx) => (
                                <div key={idx} className="group">
                                <div className="flex justify-between items-center mb-3">
                                  <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity">
                                      {getCategoryIcon(item.category)}
                                    </div>
                                    <span className="text-xs font-medium opacity-70">{item.label}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xs font-light">{item.score}</span>
                                    <span className="text-[10px] opacity-20 ml-1">/ {item.maxScore}</span>
                                  </div>
                                </div>
                                <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(item.score / item.maxScore) * 100}%` }}
                                    transition={{ duration: 1.2, delay: 0.1 + idx * 0.1, ease: "circOut" }}
                                    className={`h-full ${
                                      item.score / item.maxScore >= 0.8 ? 'bg-white' : 
                                      item.score / item.maxScore >= 0.5 ? 'bg-white/40' : 
                                      'bg-red-500/40'
                                    }`}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8 pt-12 border-t border-white/10">
                          <div className="space-y-4 p-6 bg-white/[0.02] rounded-2xl border border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="w-4 h-4 opacity-40" />
                              <h3 className="text-[10px] uppercase tracking-[0.2em] opacity-30">Søgbarhedsanalyse</h3>
                            </div>
                            <p className="text-[11px] text-white/60 leading-relaxed italic">"{result.logicExplanation.searchability}"</p>
                          </div>
                          <div className="space-y-4 p-6 bg-white/[0.02] rounded-2xl border border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                              <Award className="w-4 h-4 opacity-40" />
                              <h3 className="text-[10px] uppercase tracking-[0.2em] opacity-30">Troværdighedsvurdering</h3>
                            </div>
                            <p className="text-[11px] text-white/60 leading-relaxed italic">"{result.logicExplanation.credibility}"</p>
                          </div>
                        </div>

                        <div className="space-y-6 pt-12 border-t border-white/10">
                          <h3 className="text-[10px] uppercase tracking-[0.2em] opacity-30">Strategisk Impact ved Optimering</h3>
                          <div className="grid gap-4">
                            {result.impact.map((text, i) => (
                              <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/40 shrink-0" />
                                <p className="text-[11px] text-white/70 leading-relaxed">{text}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'audit' && (
                      <motion.div 
                        key="audit"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                      >
                        <div className="flex justify-between items-end mb-6">
                          <h3 className="text-[10px] uppercase tracking-[0.2em] opacity-30">Dybdegående Audit</h3>
                          <div className="flex gap-2 text-[8px] uppercase tracking-widest opacity-40">
                            <span>0: Kritisk</span>
                            <span>•</span>
                            <span>5: Excellent</span>
                          </div>
                        </div>

                        {[...result.auditReport]
                          .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category))
                          .map((item, idx) => {
                              const Icon = getCategoryIcon(item.category);
                          
                          const getRatingColor = (rating: number) => {
                            if (rating <= 1) return 'bg-red-500';
                            if (rating <= 2) return 'bg-orange-500';
                            if (rating <= 3) return 'bg-yellow-500';
                            if (rating <= 4) return 'bg-green-400';
                            return 'bg-green-700';
                          };

                          const ratingColor = getRatingColor(item.rating);

                          return (
                            <div key={idx} className="p-8 bg-white/5 rounded-3xl border border-white/5 space-y-8">
                              <div className="flex flex-col md:flex-row justify-between gap-6">
                                <div className="space-y-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center opacity-60">
                                      {Icon}
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-medium uppercase tracking-widest">{item.label}</h4>
                                      <p className="text-[10px] opacity-30 mt-1">Rating: {item.rating} / 5</p>
                                    </div>
                                  </div>
                                  <div className="flex gap-1.5">
                                    {[...Array(5)].map((_, i) => {
                                      const starValue = i + 1;
                                      const isFull = item.rating >= starValue;
                                      const isHalf = item.rating > i && item.rating < starValue;
                                      
                                      return (
                                        <div key={i} className="relative w-8 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                          {isFull && (
                                            <div className={`absolute inset-0 ${ratingColor}`} />
                                          )}
                                          {isHalf && (
                                            <div 
                                              className={`absolute inset-y-0 left-0 ${ratingColor}`} 
                                              style={{ width: '50%' }} 
                                            />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="md:w-1/2">
                                  <h5 className="text-[9px] uppercase tracking-widest opacity-30 mb-3">Vurderingskriterier</h5>
                                  <div className="flex flex-wrap gap-2">
                                    {item.criteria.map((c, cIdx) => (
                                      <span key={cIdx} className="text-[9px] px-2 py-1 bg-white/5 border border-white/10 rounded-md opacity-60">
                                        {c}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4 pt-6 border-t border-white/5">
                                <h5 className="text-[9px] uppercase tracking-widest opacity-30">Observationer</h5>
                                <ul className="grid md:grid-cols-2 gap-4">
                                  {item.findings.map((finding, fIdx) => (
                                    <li key={fIdx} className="text-[11px] text-white/50 flex items-start gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                                      <div className="mt-1.5 w-1 h-1 rounded-full bg-white/20 shrink-0" />
                                      {finding}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}

                    {activeTab === 'improvement' && (
                      <motion.div 
                        key="improvement"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-24"
                      >
                        <div className="flex justify-between items-end mb-12">
                          <h3 className="text-[10px] uppercase tracking-[0.2em] opacity-30">Forbedringsplan & Profil-Editor</h3>
                          <div className="flex gap-4 text-[8px] uppercase tracking-widest opacity-40">
                            <span className="text-emerald-400">Perfekt</span>
                            <span>•</span>
                            <span className="text-blue-400">Godkendt</span>
                            <span>•</span>
                            <span className="text-amber-400">Forbedring påkrævet</span>
                          </div>
                        </div>

                        {/* CV Upload Section */}
                        <div className="space-y-12 border-l border-white/5 pl-10 relative">
                          <div className="absolute -left-[5px] top-0 w-[9px] h-[9px] rounded-full bg-blue-500/40" />
                          
                          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                            <div className="space-y-3">
                              <h4 className="text-sm font-medium uppercase tracking-widest text-white/80 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-400" />
                                CV Optimering (Valgfrit)
                              </h4>
                              <p className="text-[11px] text-white/40 max-w-xl">
                                Vedhæft dit CV for at give AI'en mere kontekst. Dette bruges til at sikre, at dine optimerede tekster og kompetencer afspejler din fulde erhvervserfaring og resultater.
                              </p>
                            </div>
                            <div className="flex gap-3">
                              {currentProfile.cvFileName ? (
                                <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-400" />
                                    <span className="text-[10px] font-medium text-white/80">{currentProfile.cvFileName}</span>
                                  </div>
                                  <button 
                                    onClick={removeCV}
                                    className="p-1 hover:text-red-400 transition-colors"
                                    title="Fjern CV"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => cvInputRef.current?.click()}
                                  className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white/80 text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-white/10 transition-all"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Vedhæft CV (PDF/Word)
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Kompetence-strategi Section */}
                        {result.skillsStrategy && (
                          <div className="space-y-12 border-l border-white/5 pl-10 relative">
                            <div className="absolute -left-[5px] top-0 w-[9px] h-[9px] rounded-full bg-emerald-500/40" />
                            
                            <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                              <div className="space-y-3">
                                <h4 className="text-sm font-medium uppercase tracking-widest text-white/80 flex items-center gap-2">
                                  <Target className="w-4 h-4 text-emerald-400" />
                                  Kompetence-strategi (360Brew)
                                </h4>
                                <div className="flex items-center gap-3">
                                  <span className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm ${
                                    editableSkillsList.length >= 90 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                    editableSkillsList.length >= 50 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                    'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  }`}>
                                    {editableSkillsList.length} / 100 KOMPETENCER
                                  </span>
                                  <span className="text-[9px] opacity-30 font-mono tracking-tighter">MÅL: 90-100 FOR MAX POINT</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-3">
                                {selectedSkillsForRewrite.length > 0 && (
                                  <button 
                                    onClick={analyzeProfile}
                                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-black text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-emerald-400 transition-all shadow-[0_10px_20px_rgba(16,185,129,0.2)]"
                                  >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                                    Genskriv profil med {selectedSkillsForRewrite.length} valgte
                                  </button>
                                )}
                                <div className="flex-1 max-w-2xl text-right">
                                  <p className="text-[12px] text-white/50 leading-relaxed italic font-serif">
                                    "Strategisk brug af 100 kompetencer er nøglen til synlighed. Vi anbefaler 10-15 kernekompetencer suppleret af 85-90 relaterbare synonymer."
                                  </p>
                                </div>
                              </div>

                              <div className="grid md:grid-cols-2 gap-12">
                              {/* Current & Suggested */}
                              <div className="space-y-8">
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center">
                                    <h5 className="text-[9px] uppercase tracking-widest opacity-30">
                                      Nuværende Kompetencer ({result.skillsStrategy.currentSkills.skillsSection.length} i alt)
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                      {result.skillsStrategy.currentSkills.skillsSection.map((s, i) => (
                                        <span key={i} className="text-[10px] px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg opacity-80 flex items-center gap-2">
                                          {s.name} {s.endorsements && s.endorsements > 0 ? `(${s.endorsements})` : ''}
                                        </span>
                                      ))}
                                      {result.skillsStrategy.currentSkills.skillsSection.length === 0 && (
                                        <span className="text-[10px] opacity-20 italic">Ingen kompetencer fundet på profilen.</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-6 p-6 bg-white/[0.02] rounded-2xl border border-white/5">
                                  <h5 className="text-[9px] uppercase tracking-widest opacity-30">Anbefalede Kernekompetencer (10-15 stk)</h5>
                                  <div className="flex flex-wrap gap-2">
                                    {result.skillsStrategy.suggestedCoreSkills.map((s, i) => {
                                      const isRegistered = isSkillRegistered(s);
                                      const inPrioritizedList = editableSkillsList.some(es => getSkillNameOnly(es.name) === getSkillNameOnly(s));
                                      
                                      return (
                                        <button 
                                          key={i} 
                                          onClick={() => !inPrioritizedList && addSkill(s, 'core')}
                                          className={`text-[10px] px-3 py-1.5 border rounded-lg transition-all flex items-center gap-2 group ${
                                            inPrioritizedList 
                                              ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400/50 cursor-default' 
                                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                          }`}
                                        >
                                          {!isRegistered && <Plus className="w-3 h-3 opacity-40 group-hover:opacity-100" />}
                                          {s}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  
                                  <div className="pt-4 border-t border-white/5 space-y-4">
                                    <h5 className="text-[9px] uppercase tracking-widest opacity-30">Relaterbare Kompetencer (Synonymer)</h5>
                                    <div className="space-y-4">
                                      {Object.entries(result.skillsStrategy.suggestedRelatedSkills as Record<string, string[]>).map(([core, related], i) => (
                                        <div key={i} className="space-y-2">
                                          <span className="text-[8px] uppercase tracking-widest opacity-20 block">Til: {core}</span>
                                          <div className="flex flex-wrap gap-2">
                                            {related.map((rs, ri) => {
                                              const isRegistered = isSkillRegistered(rs);
                                              const inPrioritizedList = editableSkillsList.some(es => getSkillNameOnly(es.name) === getSkillNameOnly(rs));
                                              
                                              return (
                                                <button 
                                                  key={ri} 
                                                  onClick={() => !inPrioritizedList && addSkill(rs, 'related')}
                                                  className={`text-[10px] px-2 py-1 border rounded-md transition-all flex items-center gap-1.5 group ${
                                                    inPrioritizedList
                                                      ? 'bg-white/5 border-white/5 text-white/20 cursor-default'
                                                      : 'bg-white/5 border-white/10 text-white/60 hover:opacity-100 hover:border-white/20'
                                                  }`}
                                                >
                                                  {!isRegistered && <Plus className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100" />}
                                                  {rs}
                                                </button>
                                              )
                                            })}
                                        </div>
                                      </div>
                                    ))}
                                    </div>
                                  </div>

                              {/* Prioritized List Manager */}
                              <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                  <h5 className="text-[9px] uppercase tracking-widest opacity-30">Din Prioriterede Liste ({editableSkillsList.length}/100)</h5>
                                  <div className="flex gap-2">
                                    <input 
                                      type="text" 
                                      placeholder="Tilføj kompetence..."
                                      value={newSkillName}
                                      onChange={(e) => setNewSkillName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newSkillName) {
                                          addSkill(newSkillName);
                                          setNewSkillName('');
                                        }
                                      }}
                                      className="text-[10px] bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-white/20 w-32"
                                    />
                                    <button 
                                      onClick={() => {
                                        if (newSkillName) {
                                          addSkill(newSkillName);
                                          setNewSkillName('');
                                        }
                                      }}
                                      className="p-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                 <div className="bg-white/[0.02] rounded-3xl border border-white/5 overflow-hidden max-h-[700px] flex flex-col">
                                  <div className="p-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                                    <span className="text-[8px] uppercase tracking-widest opacity-30">Træk og slip ffor at prioritere (100 kompetencer)</span>
                                    <div className="flex gap-4 text-[8px] uppercase tracking-widest opacity-40">
                                      <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Kerne</span>
                                      <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-white/20" /> Relateret</span>
                                      <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500/40" /> Mangler</span>
                                    </div>
                                  </div>
                                  <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                    <DndContext 
                                      sensors={sensors}
                                      collisionDetection={closestCenter}
                                      onDragEnd={handleDragEnd}
                                    >
                                      <SortableContext 
                                        items={editableSkillsList}
                                        strategy={verticalListSortingStrategy}
                                      >
                                        {editableSkillsList.map((skill, sIdx) => {
                                          const isRegistered = isSkillRegistered(skill.name);
                                          
                                          // Hierarchy Labels
                                          let label = null;
                                          if (sIdx === 0) label = "TOP KERNEKOMPETENCER (2)";
                                          else if (sIdx === 2) label = "KERNEKOMPETENCER (8)";
                                          else if (sIdx === 10) label = "YDERLIGERE KERNEKOMPETENCER (5)";
                                          else if (sIdx === 15) label = "RELATERBARE KOMPETENCER (85)";
                                          
                                          return (
                                            <React.Fragment key={skill.id}>
                                              {label && (
                                                <div className="px-3 pt-6 pb-2 first:pt-2">
                                                  <span className="text-[7px] font-bold uppercase tracking-[0.2em] text-emerald-400/40 border-b border-emerald-500/10 pb-1 block">
                                                    {label}
                                                  </span>
                                                </div>
                                              )}
                                              <SortableSkillItem 
                                                skill={skill} 
                                                index={sIdx} 
                                                isRegistered={isRegistered}
                                                onToggleType={() => toggleSkillType(skill.id)}
                                                onRemove={() => removeSkill(skill.id)}
                                                onToggleSelection={() => toggleSkillSelection(skill.name)}
                                                isSelected={selectedSkillsForRewrite.includes(skill.name)}
                                              />
                                            </React.Fragment>
                                          );
                                        })}
                                      </SortableContext>
                                    </DndContext>
                                    {editableSkillsList.length === 0 && (
                                      <div className="py-12 text-center space-y-2 opacity-20">
                                        <Target className="w-8 h-8 mx-auto" />
                                        <p className="text-[10px] uppercase tracking-widest">Ingen kompetencer tilføjet endnu</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <p className="text-[9px] opacity-20 italic text-center mt-6">
                          Tip: Klik på prikken for at skifte mellem Kerne og Relateret. Brug pilene til at rangere.
                        </p>
                      </div>
                    )}

                        {result.improvementPlan
                          .filter(c => c.category !== 'experience')
                          .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category))
                          .map((category, idx) => (
                            <div key={idx} id={`category-${category.category}`} className="space-y-12 border-l border-white/5 pl-10 relative">
                              <div className="absolute -left-[5px] top-0 w-[9px] h-[9px] rounded-full bg-white/20" />
                              
                              <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                                <div className="space-y-3">
                                  <h4 className="text-sm font-medium uppercase tracking-widest text-white/80">{category.label}</h4>
                                  <div className="flex items-center gap-3">
                                    <span className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm ${
                                      category.status === 'Perfekt' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                      category.status === 'Godkendt' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                      'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    }`}>
                                      {category.status}
                                    </span>
                                    <span className="text-[9px] opacity-30 font-mono tracking-tighter">{category.score} / {category.maxScore} POINT</span>
                                  </div>
                                </div>
                                <div className="flex-1 max-w-2xl">
                                  <p className="text-[12px] text-white/50 leading-relaxed italic font-serif">
                                    "{category.intro}"
                                  </p>
                                </div>
                              </div>

                              <div className="grid gap-10">
                                {/* Headline Proposals */}
                                {(category.category === 'headline' || 
                                  category.label.toLowerCase().includes('headline')) && 
                                 editableHeadlines.length > 0 && (
                                  <div className="space-y-6">
                                    <h5 className="text-[9px] uppercase tracking-widest opacity-30">Vælg og rediger din Headline</h5>
                                    <div className="grid gap-6">
                                      {editableHeadlines.map((prop, pIdx) => (
                                        <div key={pIdx} className="group relative bg-white/[0.02] rounded-3xl border border-white/5 p-8 space-y-4 hover:border-white/10 transition-all">
                                            <div className="flex justify-between items-center">
                                              <div className="space-y-1">
                                                <span className="text-[9px] uppercase tracking-widest opacity-30 block">Forslag {pIdx + 1}</span>
                                                <div className="flex items-center gap-2">
                                                  <span className={`text-[8px] font-mono ${prop.length > 220 ? 'text-red-400' : 'text-white/30'}`}>
                                                    {prop.length} / 220 anslag
                                                  </span>
                                                  {prop.length > 220 && (
                                                    <span className="text-[8px] text-red-400 italic">For lang til LinkedIn</span>
                                                  )}
                                                </div>
                                              </div>
                                              <div className="flex gap-2">
                                                <button 
                                                  onClick={() => {
                                                    setSuccessMessage('Kladde gemt');
                                                    setTimeout(() => setSuccessMessage(null), 3000);
                                                  }}
                                                  className="text-[9px] font-bold uppercase tracking-widest px-4 py-2 bg-white/5 text-white/60 rounded-lg hover:bg-white/10 transition-all"
                                                >
                                                  Gem Kladde
                                                </button>
                                                <button 
                                                  onClick={() => {
                                                    applyHeadline(pIdx);
                                                    setShowReanalyzePrompt(true);
                                                  }}
                                                  className="text-[9px] font-bold uppercase tracking-widest px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition-all"
                                                >
                                                  Anvend på profil
                                                </button>
                                                <button 
                                                  onClick={() => applyHeadline(pIdx)}
                                                  className="text-[9px] font-bold uppercase tracking-widest px-4 py-2 bg-white/5 text-white/60 rounded-lg hover:bg-white/10 transition-all"
                                                >
                                                  Gem
                                                </button>
                                                <button 
                                                  onClick={() => navigator.clipboard.writeText(prop)}
                                                  className="p-2 bg-white/5 rounded-lg hover:bg-white/10 opacity-40 hover:opacity-100 transition-all"
                                                >
                                                  <Database className="w-3 h-3" />
                                                </button>
                                              </div>
                                            </div>
                                          <textarea 
                                            value={prop}
                                            onChange={(e) => handleHeadlineChange(pIdx, e.target.value)}
                                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-6 text-sm font-medium text-white/90 focus:outline-none focus:border-white/20 transition-all resize-none h-24 leading-relaxed shadow-inner"
                                            placeholder="Skriv din headline her..."
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* About Versions */}
                                {(category.category === 'about' || 
                                  category.label.toLowerCase().includes('om-sektion') || 
                                  category.label.toLowerCase().includes('om sektion')) && category.aboutVersions && (
                                    <div className="space-y-12">
                                      {/* Top Menu for Version Selection */}
                                      <div className="space-y-6">
                                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                          <p className="text-[9px] uppercase tracking-widest opacity-30">Vælg din foretrukne strategi for Om-sektionen</p>
                                          <div className="flex bg-white/5 p-1 rounded-full border border-white/10">
                                            <button 
                                              onClick={() => handleLanguageSwitch('da')}
                                              disabled={isAnalyzing}
                                              className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${targetLanguage === 'da' ? 'bg-white text-black' : 'text-white/40 hover:text-white/60'} ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                              Dansk
                                            </button>
                                            <button 
                                              onClick={() => handleLanguageSwitch('en')}
                                              disabled={isAnalyzing}
                                              className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${targetLanguage === 'en' ? 'bg-white text-black' : 'text-white/40 hover:text-white/60'} ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                              English
                                            </button>
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap bg-white/5 p-2 rounded-[32px] border border-white/10 gap-2">
                                          {category.aboutVersions.map((ver, vIdx) => (
                                            <button
                                              key={vIdx}
                                              onClick={() => setSelectedAboutIndex(vIdx)}
                                              className={`flex-1 min-w-[140px] md:min-w-[180px] py-3 md:py-5 px-4 md:px-8 rounded-[20px] md:rounded-[24px] text-[9px] md:text-[11px] font-bold uppercase tracking-[0.15em] transition-all flex flex-col items-center gap-1 md:gap-2 group ${
                                                selectedAboutIndex === vIdx 
                                                  ? 'bg-white text-black shadow-[0_20px_40px_rgba(255,255,255,0.1)] scale-[1.02]' 
                                                  : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                                              }`}
                                            >
                                              <span className={`text-[8px] uppercase tracking-[0.2em] ${selectedAboutIndex === vIdx ? 'opacity-40' : 'opacity-20'}`}>Strategi {vIdx + 1}</span>
                                              {ver.title}
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      {selectedAboutIndex !== null && (
                                        <motion.div 
                                          initial={{ opacity: 0, y: 20 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          className="space-y-16"
                                        >
                                          {/* Trin 1.5: Current Comparison */}
                                          <div className="space-y-6">
                                            <h5 className="text-[9px] uppercase tracking-widest opacity-30">Sammenligning: Nuværende vs. Anbefalet</h5>
                                            <div className="grid md:grid-cols-2 gap-8">
                                              <div className="space-y-4">
                                                <div className="flex items-center justify-between px-4">
                                                  <p className="text-[10px] uppercase tracking-[0.2em] opacity-40 font-bold">Din nuværende tekst</p>
                                                </div>
                                                <div className="p-8 bg-white/[0.02] rounded-3xl border border-white/5 font-serif text-[14px] text-white/40 leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto custom-scrollbar shadow-inner">
                                                  {currentProfile.about || "Ingen tekst fundet."}
                                                </div>
                                              </div>
                                              <div className="space-y-4">
                                                <div className="flex items-center justify-between px-4">
                                                  <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400/80 font-bold">Systemets anbefaling ({category.aboutVersions[selectedAboutIndex].title})</p>
                                                </div>
                                                <div className="p-8 bg-emerald-500/[0.02] rounded-3xl border border-emerald-500/10 font-sans text-[14px] text-white/80 leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto custom-scrollbar shadow-inner">
                                                  {editableAboutTexts[selectedAboutIndex]}
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Trin 2: Edit About */}
                                          <div className="space-y-6">
                                            <h5 className="text-[9px] uppercase tracking-widest opacity-30">Trin 2: Tilpas din Om-sektion</h5>
                                            <div className="p-6 md:p-10 bg-white/[0.02] rounded-3xl md:rounded-[40px] border border-white/5 space-y-6 md:space-y-8 shadow-2xl">
                                              <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-4">
                                                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                  <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">Live Editor: {category.aboutVersions[selectedAboutIndex].title}</span>
                                                    <span className={`text-[8px] font-mono ${editableAboutTexts[selectedAboutIndex].length > 2600 ? 'text-red-400' : 'text-white/30'}`}>
                                                      {editableAboutTexts[selectedAboutIndex].length} / 2600 anslag
                                                    </span>
                                                  </div>
                                                </div>
                                                <div className="flex gap-4">
                                                  {selectedSkillsForRewrite.length > 0 && (
                                                    <button 
                                                      onClick={analyzeProfile}
                                                      className="flex items-center gap-2 px-6 py-2 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-widest rounded-full border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                                                    >
                                                      <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                                                      Genskriv med {selectedSkillsForRewrite.length} valgte
                                                    </button>
                                                  )}
                                                  <button 
                                                    onClick={() => {
                                                      applyAboutAndExperience(selectedAboutIndex);
                                                      setSuccessMessage('Kladde gemt');
                                                      setTimeout(() => setSuccessMessage(null), 3000);
                                                    }}
                                                    className="px-6 py-2 bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-white/20 transition-all"
                                                  >
                                                    Gem Kladde
                                                  </button>
                                                  <button 
                                                    onClick={() => navigator.clipboard.writeText(editableAboutTexts[selectedAboutIndex])}
                                                    className="p-3 bg-white/5 rounded-full hover:bg-white/10 opacity-40 hover:opacity-100 transition-all"
                                                  >
                                                    <Database className="w-4 h-4" />
                                                  </button>
                                                </div>
                                              </div>
                                              <textarea 
                                                value={editableAboutTexts[selectedAboutIndex]}
                                                onChange={(e) => handleAboutChange(selectedAboutIndex, e.target.value)}
                                                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-8 text-[15px] text-white/90 whitespace-pre-wrap leading-[1.8] font-sans focus:outline-none focus:border-white/20 transition-all min-h-[600px] resize-y shadow-inner"
                                                placeholder="Skriv din om-sektion her..."
                                              />
                                              <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-end gap-8">
                                                <div className="space-y-4 flex-1">
                                                  <p className="text-[9px] uppercase tracking-widest opacity-30">Anbefalede Kompetencer til denne version</p>
                                                  <div className="flex flex-wrap gap-2">
                                                    {category.aboutVersions[selectedAboutIndex].skills.map((s, sIdx) => (
                                                      <span key={sIdx} className="px-3 py-1.5 bg-white/5 rounded-lg text-[10px] text-white/40 border border-white/5">
                                                        {s}
                                                      </span>
                                                    ))}
                                                  </div>
                                                </div>
                                                <div className="flex gap-4">
                                                  <button 
                                                    onClick={() => {
                                                      applyAboutAndExperience(selectedAboutIndex);
                                                      setShowReanalyzePrompt(true);
                                                      const el = document.getElementById('experience-section');
                                                      el?.scrollIntoView({ behavior: 'smooth' });
                                                    }}
                                                    className="px-10 py-4 bg-emerald-500 text-black text-[11px] font-bold uppercase tracking-widest rounded-full hover:scale-105 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                                                  >
                                                    Anvend på profil & Gå til Erfaring
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Trin 3: Linked Experience */}
                                        <div id="experience-section" className="space-y-12 pt-24 border-t border-white/5">
                                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                                            <div className="space-y-2">
                                              <h5 className="text-[10px] uppercase tracking-[0.3em] text-emerald-400 font-bold">Trin 3: Optimering af din erfaring</h5>
                                              <p className="text-[11px] text-white/30 font-serif italic max-w-md">Vi har analyseret samtlige af dine roller og optimeret dem til at understøtte din valgte strategi.</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-4">
                                              <div className="flex bg-white/5 p-1 rounded-full border border-white/10">
                                                <button 
                                                  onClick={() => handleLanguageSwitch('da')}
                                                  disabled={isAnalyzing}
                                                  className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${targetLanguage === 'da' ? 'bg-white text-black' : 'text-white/40 hover:text-white/60'} ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                  Dansk
                                                </button>
                                                <button 
                                                  onClick={() => handleLanguageSwitch('en')}
                                                  disabled={isAnalyzing}
                                                  className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${targetLanguage === 'en' ? 'bg-white text-black' : 'text-white/40 hover:text-white/60'} ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                  English
                                                </button>
                                              </div>
                                              <div className="flex items-center gap-4">
                                                <span className="text-[8px] px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 uppercase tracking-widest">Auto-matchet</span>
                                                <button 
                                                  onClick={() => {
                                                    applyAboutAndExperience(selectedAboutIndex);
                                                    setShowReanalyzePrompt(true);
                                                    setSuccessMessage('Alle ændringer er anvendt på din profil');
                                                    setTimeout(() => setSuccessMessage(null), 3000);
                                                  }}
                                                  className="px-8 py-3 bg-emerald-500 text-black text-[11px] font-bold uppercase tracking-[0.15em] rounded-full hover:scale-105 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center gap-3"
                                                >
                                                  <Zap className="w-4 h-4" />
                                                  Anvend alt på profil
                                                </button>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="grid gap-20">
                                            {editableExperienceTemplates[selectedAboutIndex]?.map((temp, tIdx) => (
                                              <div key={tIdx} className="p-6 md:p-16 bg-white/[0.02] rounded-3xl md:rounded-[64px] border border-white/5 space-y-8 md:space-y-16 relative overflow-hidden group transition-all hover:bg-white/[0.03] hover:border-white/10 shadow-2xl">
                                                <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500/20" />
                                                
                                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 md:gap-10 px-0 md:px-4">
                                                  <div className="flex items-center gap-4 md:gap-8">
                                                    <div className="w-12 h-12 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                                      <Briefcase className="w-6 h-6 md:w-10 md:h-10 opacity-30" />
                                                    </div>
                                                    <div className="space-y-3">
                                                      <div className="flex items-center gap-3">
                                                        <span className="px-3 py-1 bg-white/5 rounded-full text-[9px] font-bold text-white/40 border border-white/10">ROLLE #{tIdx + 1}</span>
                                                      </div>
                                                      <div className="flex flex-wrap items-center gap-4">
                                                        <input 
                                                          value={temp.role}
                                                          onChange={(e) => handleExperienceChange(selectedAboutIndex, tIdx, 'role', e.target.value)}
                                                          className="bg-transparent border-b border-white/5 text-lg md:text-2xl font-medium text-white/90 focus:outline-none focus:border-emerald-500/50 pb-1 min-w-[200px] md:min-w-[250px]"
                                                        />
                                                        <span className="text-[12px] opacity-20 font-serif italic">hos</span>
                                                        <input 
                                                          value={temp.company}
                                                          onChange={(e) => handleExperienceChange(selectedAboutIndex, tIdx, 'company', e.target.value)}
                                                          className="bg-transparent border-b border-white/5 text-sm opacity-40 uppercase tracking-[0.3em] focus:outline-none focus:border-emerald-500/50 pb-1 min-w-[150px] md:min-w-[200px]"
                                                        />
                                                      </div>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-4">
                                                    <button 
                                                      onClick={() => {
                                                        setSuccessMessage('Kladde gemt');
                                                        setTimeout(() => setSuccessMessage(null), 3000);
                                                      }}
                                                      className="px-6 py-3 bg-white/5 text-white/40 text-[10px] uppercase tracking-widest font-bold rounded-full hover:bg-white/10 transition-all border border-white/10"
                                                    >
                                                      Gem Kladde
                                                    </button>
                                                    <button 
                                                      onClick={() => handleExperienceChange(selectedAboutIndex, tIdx, 'useOptimized', !temp.useOptimized)}
                                                      className={`px-8 py-3 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all shadow-xl ${
                                                        temp.useOptimized 
                                                          ? 'bg-emerald-500 text-black' 
                                                          : 'bg-white/5 text-white/40 border border-white/10'
                                                      }`}
                                                    >
                                                      {temp.useOptimized ? 'Valgt' : 'Vælg denne'}
                                                    </button>
                                                  </div>
                                                </div>
                                                
                                                <div className="grid lg:grid-cols-2 gap-8 md:gap-12">
                                                  {/* Current Description */}
                                                  <div className="space-y-6">
                                                    <div className="flex justify-between items-center px-4">
                                                      <h6 className="text-[10px] uppercase tracking-[0.2em] opacity-40 font-bold">Din nuværende beskrivelse</h6>
                                                      <span className="text-[8px] opacity-20 italic">Oprindelig tekst</span>
                                                    </div>
                                                    <div className="bg-white/[0.01] border border-white/5 rounded-[40px] p-8 md:p-12 min-h-[300px] text-[14px] text-white/30 leading-relaxed font-serif italic whitespace-pre-wrap opacity-60 max-h-[500px] overflow-y-auto custom-scrollbar shadow-inner">
                                                      {temp.currentText || "Ingen nuværende beskrivelse fundet."}
                                                    </div>
                                                  </div>

                                                  {/* Optimized Description */}
                                                  <div className="space-y-6">
                                                    <div className="flex justify-between items-center px-4">
                                                      <h6 className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-bold">360Brew Optimering</h6>
                                                      <div className="flex gap-2">
                                                        {selectedSkillsForRewrite.length > 0 && (
                                                          <button 
                                                            onClick={analyzeProfile}
                                                            className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-widest rounded-full border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                                                          >
                                                            <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                                                            Genskriv
                                                          </button>
                                                        )}
                                                        <button 
                                                          onClick={() => {
                                                            setSuccessMessage('Ændring gemt');
                                                            setTimeout(() => setSuccessMessage(null), 3000);
                                                          }}
                                                          className="p-2 bg-white/5 rounded-lg hover:bg-white/10 opacity-40 hover:opacity-100 transition-all"
                                                        >
                                                           <Save className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button 
                                                          onClick={() => navigator.clipboard.writeText(temp.optimizedText)}
                                                          className="p-2 bg-white/5 rounded-lg hover:bg-white/10 opacity-40 hover:opacity-100 transition-all"
                                                        >
                                                          <Database className="w-3.5 h-3.5" />
                                                        </button>
                                                      </div>
                                                    </div>
                                                    <textarea 
                                                      value={temp.optimizedText}
                                                      onChange={(e) => handleExperienceChange(selectedAboutIndex, tIdx, 'optimizedText', e.target.value)}
                                                      className="w-full bg-emerald-500/[0.03] border border-emerald-500/10 rounded-[40px] p-8 md:p-12 text-[14px] md:text-[16px] text-white/90 whitespace-pre-wrap leading-[1.8] font-sans focus:outline-none focus:border-emerald-500/30 transition-all min-h-[500px] resize-y shadow-inner"
                                                      placeholder="Den optimerede tekst dukker op her..."
                                                    />
                                                  </div>
                                                </div>

                                                <div className="grid md:grid-cols-2 gap-12 pt-12 border-t border-white/5">
                                                  <div className="space-y-6 p-8 bg-amber-500/[0.02] rounded-[32px] border border-amber-500/5">
                                                    <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400/80 font-bold">Identificerede Mangler</p>
                                                    <div className="space-y-4">
                                                      {temp.deficiencies.map((def, dIdx) => (
                                                        <div key={dIdx} className="flex items-start gap-4">
                                                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500/40 mt-2 shrink-0" />
                                                          <p className="text-[12px] text-white/40 leading-relaxed">{def}</p>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </div>
                                                  <div className="space-y-6 p-8 bg-blue-500/[0.02] rounded-[32px] border border-blue-500/5">
                                                    <p className="text-[10px] uppercase tracking-[0.2em] text-blue-400/80 font-bold">Forslag til Forbedring</p>
                                                    <div className="space-y-4">
                                                      {temp.improvementSuggestions.map((sug, sIdx) => (
                                                        <div key={sIdx} className="flex items-start gap-4">
                                                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500/40 mt-2 shrink-0" />
                                                          <p className="text-[12px] text-white/40 leading-relaxed">{sug}</p>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* Recommended Skills for this role */}
                                                {temp.skills && temp.skills.length > 0 && (
                                                  <div className="pt-10 border-t border-white/5 space-y-6">
                                                    <p className="text-[10px] uppercase tracking-[0.2em] opacity-30 font-bold">Anbefalede Kompetencer til denne rolle</p>
                                                    <div className="flex flex-wrap gap-3">
                                                      {temp.skills.map((skill, sIdx) => (
                                                        <span key={sIdx} className="px-5 py-2.5 bg-white/5 rounded-2xl text-[11px] text-white/50 border border-white/5 hover:bg-white/10 transition-all cursor-default">
                                                          {skill}
                                                        </span>
                                                      ))}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>

                                          <div className="flex flex-col items-center gap-16 pt-32 pb-32">
                                            <div className="flex flex-col md:flex-row justify-center items-center gap-8">
                                              <button 
                                                onClick={() => {
                                                  applyAboutAndExperience(selectedAboutIndex);
                                                  setShowReanalyzePrompt(true);
                                                  setSuccessMessage('Alle ændringer er anvendt på din profil');
                                                  setTimeout(() => setSuccessMessage(null), 3000);
                                                }}
                                                className="px-20 py-8 bg-emerald-500 text-black text-[14px] font-bold uppercase tracking-[0.25em] rounded-full hover:scale-105 transition-all shadow-[0_0_60px_rgba(16,185,129,0.4)] flex items-center gap-5"
                                              >
                                                <Zap className="w-6 h-6" />
                                                ANVEND ALT PÅ PROFIL
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </div>
                                )}

                                {/* Search Keywords */}
                                {category.category === 'search' && category.searchKeywords && (
                                  <div className="space-y-8">
                                    <h5 className="text-[9px] uppercase tracking-widest opacity-30">De 4 Søjler: Strategisk Keyword Analyse</h5>
                                    <div className="grid md:grid-cols-2 gap-6">
                                      {category.searchKeywords.map((sk, skIdx) => (
                                        <div key={skIdx} className="p-8 bg-white/[0.02] rounded-3xl border border-white/5 space-y-6">
                                          <p className="text-[11px] font-medium text-white/80 uppercase tracking-widest">{sk.pillar}</p>
                                          <div className="space-y-4">
                                            <div>
                                              <p className="text-[8px] uppercase tracking-widest text-amber-400/60 mb-3">Kritiske Mangler</p>
                                              <div className="flex flex-wrap gap-2">
                                                {sk.missingKeywords.map((m, mIdx) => (
                                                  <span key={mIdx} className="px-2 py-1 bg-amber-500/5 text-amber-400/60 text-[9px] rounded border border-amber-500/10">
                                                    {m}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                            <div>
                                              <p className="text-[8px] uppercase tracking-widest text-emerald-400/60 mb-2">Anbefalet Implementering</p>
                                              <p className="text-[11px] text-white/30 leading-relaxed font-serif italic">"{sk.recommendations.join(", ")}"</p>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Standard Suggestions */}
                                {category.category !== 'about' && 
                                 category.category !== 'search' && 
                                 category.category !== 'experience' && 
                                 !category.label.toLowerCase().includes('om-sektion') && 
                                 !category.label.toLowerCase().includes('om sektion') && (
                                  <div className="grid md:grid-cols-2 gap-6">
                                    {category.suggestions.map((suggestion, sIdx) => (
                                      <div key={sIdx} className="p-8 bg-white/[0.02] rounded-3xl border border-white/5 space-y-4">
                                        <h5 className="text-[11px] font-semibold text-white/80 uppercase tracking-widest">{suggestion.title}</h5>
                                        <p className="text-[11px] text-white/40 leading-relaxed">{suggestion.action}</p>
                                        {suggestion.example && (
                                          <div className="mt-4 p-5 bg-black/40 rounded-2xl border border-white/5">
                                            <span className="text-[8px] uppercase tracking-widest opacity-20 block mb-3">Eksempel på implementering</span>
                                            <p className="text-[11px] font-mono text-emerald-400/80 leading-relaxed">{suggestion.example}</p>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        
                        {/* Final Extraction Button at the very bottom of the tab */}
                        <div className="flex justify-center pt-24 pb-40 border-t border-white/5">
                          <button 
                            onClick={downloadFullProfile}
                            className="px-16 py-8 bg-white/5 text-white/40 text-[13px] font-bold uppercase tracking-[0.2em] rounded-full hover:bg-white/10 transition-all border border-white/10 flex items-center gap-6 group shadow-2xl"
                          >
                            <FileText className="w-6 h-6 opacity-30 group-hover:opacity-100 transition-opacity" />
                            EKSTRAHER ALT (WORD/TEKST)
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-40 border-t border-white/10 py-20 px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="max-w-xs">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
                <ShieldCheck className="text-black w-4 h-4" />
              </div>
              <span className="text-xs font-semibold tracking-[0.2em] uppercase">Executive Analytics</span>
            </div>
            <p className="text-[11px] leading-relaxed opacity-40 uppercase tracking-widest">
              Specialiseret analyseværktøj til C-level og ledelsesprofiler. 
              Baseret på LinkedIn Recruiter logik og executive search standarder.
            </p>
          </div>
          <div className="flex gap-20">
            <div className="space-y-4">
              <h4 className="text-[10px] uppercase tracking-[0.2em] opacity-30">Ressourcer</h4>
              <ul className="text-xs space-y-2 opacity-60">
                <li><a href="#" className="hover:opacity-100">Whitepaper</a></li>
                <li><a href="#" className="hover:opacity-100">Executive Guide</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] uppercase tracking-[0.2em] opacity-30">Legal</h4>
              <ul className="text-xs space-y-2 opacity-60">
                <li><a href="#" className="hover:opacity-100">Privacy</a></li>
                <li><a href="#" className="hover:opacity-100">Terms</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-20 pt-8 border-t border-white/5 flex justify-between items-center text-[10px] opacity-20 uppercase tracking-[0.2em]">
          <span>© 2024 Executive Analytics</span>
          <span>Bygget til LinkedIn Executives</span>
        </div>
      </footer>
      {/* Modification Summary Modal (Delta Log) */}
      <AnimatePresence>
        {showDeltaModal && lastAnalysisDelta && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-8"
            >
              <div className="flex justify-between items-start">
                <div className="bg-yellow-500/10 p-3 rounded-2xl border border-yellow-500/20">
                  <Zap className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                </div>
                <button onClick={() => setShowDeltaModal(false)} className="opacity-40 hover:opacity-100 transition-opacity">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-light tracking-tight">Analyse Gennemført</h3>
                <p className="text-sm opacity-40 leading-relaxed uppercase tracking-widest text-[10px]">Målrettet opdatering færdig</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                  <p className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Tidligere Score</p>
                  <p className="text-3xl font-light">{lastAnalysisDelta.scoreBefore}</p>
                </div>
                <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                  <p className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Ny Score</p>
                  <p className="text-3xl font-light flex items-center gap-3">
                    {lastAnalysisDelta.scoreAfter}
                    <span className={`text-sm ${lastAnalysisDelta.scoreAfter > lastAnalysisDelta.scoreBefore ? 'text-emerald-400' : 'text-red-400'}`}>
                      {lastAnalysisDelta.scoreAfter > lastAnalysisDelta.scoreBefore ? '+' : ''}
                      {lastAnalysisDelta.scoreAfter - lastAnalysisDelta.scoreBefore}
                    </span>
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-widest opacity-40 flex items-center gap-2">
                  <List className="w-3 h-3" />
                  Analyserede Ændringer
                </p>
                <div className="flex flex-wrap gap-2">
                  {lastAnalysisDelta.changedFields.map((f, i) => (
                    <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-white/60">
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {lastAnalysisDelta.explanation && (
                <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-2">
                  <p className="text-[10px] uppercase tracking-widest opacity-40 flex items-center gap-2">
                    <Info className="w-3 h-3" />
                    AI Forklaring
                  </p>
                  <p className="text-[11px] leading-relaxed opacity-60 italic">
                    "{lastAnalysisDelta.explanation}"
                  </p>
                </div>
              )}

              <button 
                onClick={() => setShowDeltaModal(false)}
                className="w-full bg-white text-black py-4 rounded-xl font-bold uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Gå til Analyse
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Complete Change Log / History Modal */}
      <AnimatePresence>
        {showAnalysisHistory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="bg-[#0a0a0a] border-l border-white/10 h-full max-w-lg w-full fixed right-0 top-0 shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <History className="w-6 h-6 text-yellow-400" />
                  <div>
                    <h3 className="text-xl font-light">Change Log</h3>
                    <p className="text-[10px] uppercase tracking-widest opacity-40">Historik over dine analyser</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentProfile.analysisLog && currentProfile.analysisLog.length > 0 && (
                    <div className="flex items-center gap-2">
                      <AnimatePresence mode="wait">
                        {isConfirmingReset ? (
                          <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-1.5"
                          >
                            <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Slet alt?</span>
                            <button 
                              onClick={resetAnalysisHistory}
                              className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-md hover:bg-red-600 transition-colors uppercase font-bold"
                            >
                              Ja
                            </button>
                            <button 
                              onClick={() => setIsConfirmingReset(false)}
                              className="text-[10px] opacity-40 hover:opacity-100 uppercase font-bold"
                            >
                              Nej
                            </button>
                          </motion.div>
                        ) : (
                          <motion.button 
                            key="trash-btn"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsConfirmingReset(true)}
                            className="p-3 bg-red-500/10 text-red-400 rounded-full hover:bg-red-500/20 transition-all group"
                            title="Nulstil historik"
                          >
                            <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                  <button onClick={() => {
                    setShowAnalysisHistory(false);
                    setIsConfirmingReset(false);
                  }} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-12">
                {[...(currentProfile.analysisLog || [])].reverse().map((entry, idx) => (
                  <div key={idx} className="relative pl-8 border-l border-white/5 pb-12 last:pb-0">
                    <div className="absolute left-[-5px] top-0 w-[9px] h-[9px] rounded-full bg-white/20" />
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] uppercase tracking-widest opacity-30 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {new Date(entry.timestamp).toLocaleString('da-DK')}
                        </p>
                        <span className={`px-2 py-0.5 rounded text-[8px] uppercase tracking-widest ${
                          entry.type === 'full' ? 'bg-white text-black' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        }`}>
                          {entry.type === 'full' ? 'Fuld Audit' : 'Hurtig Opdatering'}
                        </span>
                      </div>
                      
                      <div className="flex items-baseline gap-4">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-light">{entry.scoreAfter}</span>
                          <span className="text-[10px] opacity-20">/100</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="opacity-40">{entry.scoreBefore}</span>
                          <ArrowRight className="w-3 h-3 opacity-20" />
                          <span className={`${entry.scoreAfter > entry.scoreBefore ? 'text-emerald-400' : entry.scoreAfter < entry.scoreBefore ? 'text-red-400' : 'opacity-40'}`}>
                            {entry.scoreAfter > entry.scoreBefore ? '+' : ''}{entry.scoreAfter - entry.scoreBefore}p
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {entry.changedFields.map((f, i) => (
                          <span key={i} className="text-[9px] opacity-40 bg-white/5 px-2 py-0.5 rounded italic">
                            {f}
                          </span>
                        ))}
                      </div>

                      {entry.explanation && (
                        <p className="text-[10px] opacity-40 leading-relaxed border-l border-white/10 pl-3 py-1">
                          "{entry.explanation}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {(!currentProfile.analysisLog || currentProfile.analysisLog.length === 0) && (
                  <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                    <History className="w-12 h-12 opacity-10" />
                    <p className="text-xs opacity-20 max-w-xs uppercase tracking-widest leading-relaxed">Der er endnu ingen historik for denne profil.</p>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-white/10 bg-white/[0.02]">
                <p className="text-[10px] opacity-30 uppercase tracking-widest leading-relaxed">
                  Historik hjælper dig med at se værdien af hver rettelse over tid.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

